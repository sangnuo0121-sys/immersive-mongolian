import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireOwnerOrAdmin } from '@/lib/auth/require-auth';
import {
  syncMongolianDisplayForRecord,
  markOldSvgAsOutdated,
} from '@/lib/mongolian-display';
import { transformWisdomQuote } from '@/lib/data/transforms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个智慧语录
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const { data, error } = await client
      .from('wisdom_quotes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`查询智慧语录失败: ${error.message}`);
    }
    
    // 转换字段格式
    const quote = transformWisdomQuote(data);

    return NextResponse.json({ success: true, data: quote });
  } catch (error: any) {
    console.error('GET wisdom quote error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 更新智慧语录
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    let client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }

    const { data: existing } = await client.from('wisdom_quotes').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);
    
    const body = await request.json();
    
    // 处理翻译字段
    let translationZh = body.translation_zh;
    let translationEn = body.translation_en;
    
    if (typeof body.translation === 'object' && body.translation !== null) {
      translationZh = body.translation.zh;
      translationEn = body.translation.en;
    }
    
    // 如果只有中文翻译，英文也用中文
    if (translationZh !== undefined && translationEn === undefined) {
      translationEn = translationZh;
    }
    if (translationEn !== undefined && translationZh === undefined) {
      translationZh = translationEn;
    }
    
    // 构建更新数据
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.mongolian !== undefined) updateData.mongolian = body.mongolian;
    if (translationZh !== undefined) updateData.translation_zh = translationZh;
    if (translationEn !== undefined) updateData.translation_en = translationEn;
    if (body.author !== undefined) updateData.author = body.author;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.audio !== undefined) updateData.audio_url = body.audio || null;
    
    const { data, error } = await client
      .from('wisdom_quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw new Error(`更新智慧语录失败: ${error.message}`);
    }

    // 同步：蒙古文变化 → 重新生成 SVG
    let mongolianCacheStale = false;
    let staleWordIds: string[] = [];
    if (body.mongolian !== undefined) {
      try {
        const syncResult = await syncMongolianDisplayForRecord('wisdom_quotes', id, {
          mongolian: data.mongolian,
        });
        mongolianCacheStale = syncResult.cacheStale === true;
        staleWordIds = syncResult.staleFields ?? [];
      } catch (syncErr) {
        console.warn(
          `[wisdom PUT] sync svg failed for ${id}:`,
          syncErr,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: transformWisdomQuote(data),
      mongolianCacheStale,
      staleWordIds,
    });
  } catch (error: any) {
    console.error('PUT wisdom quote error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 删除智慧语录
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    let client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }

    const { data: existing } = await client.from('wisdom_quotes').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);
    
    const { error } = await client
      .from('wisdom_quotes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除智慧语录失败: ${error.message}`);
    }

    // 同步：删除时清理 SVG 缓存
    try {
      await markOldSvgAsOutdated('wisdom_quotes', id);
    } catch (e) {
      console.warn(`[wisdom DELETE] markOldSvgAsOutdated failed for ${id}:`, e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE wisdom quote error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
