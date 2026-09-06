import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireOwnerOrAdmin } from '@/lib/auth/require-auth';
import {
  syncMongolianDisplayForRecord,
  markOldSvgAsOutdated,
  invalidateMongolianSvgCache,
} from '@/lib/mongolian-display';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个词条
import { transformWord } from '@/lib/data/word-transform';

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
      .from('words')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`查询词条失败: ${error.message}`);
    }
    
    // 转换字段格式
    const word = {
      id: data.id,
      mongolian: data.mongolian || '',
      pinyin: data.pinyin || '',
      translation: {
        zh: data.translation_zh || data.translation_en || '',
        en: data.translation_en || data.translation_zh || '',
      },
      theme: data.theme || 'basic-conversation',

      sortOrder: data.sort_order || 1,
      audio: data.audio_url || '',
      example: data.example_mongolian ? {
        mongolian: data.example_mongolian,
        translation: {
          zh: data.example_translation_zh || '',
          en: data.example_translation_en || '',
        },
      } : undefined,
      isUserUploaded: data.is_user_uploaded || false,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    };
    
    return NextResponse.json({ success: true, data: word });
  } catch (error: any) {
    console.error('GET word error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 更新词条
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

    // 先查出 created_by_user_id 用于权限判断
    const { data: existing } = await client.from('words').select('created_by_user_id').eq('id', id).single();
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
    if (body.pinyin !== undefined) updateData.pinyin = body.pinyin;
    if (translationZh !== undefined) updateData.translation_zh = translationZh;
    if (translationEn !== undefined) updateData.translation_en = translationEn;
    if (body.theme !== undefined) updateData.theme = body.theme;

    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
    if (body.audio !== undefined) updateData.audio_url = body.audio || null;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    
    // 处理例句
    if (body.example !== undefined) {
      updateData.example_mongolian = body.example?.mongolian || null;
      updateData.example_translation_zh = body.example?.translation?.zh || null;
      updateData.example_translation_en = body.example?.translation?.en || null;
    }
    
    const { data, error } = await client
      .from('words')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw new Error(`更新词条失败: ${error.message}`);
    }

    // 同步：蒙古文字段变了 → 重新生成 SVG
    const mongolianChanged =
      body.mongolian !== undefined ||
      (body.example !== undefined &&
        (body.example?.mongolian !== undefined || body.example === null));
    let mongolianCacheStale = false;
    let staleWordIds: string[] = [];
    if (mongolianChanged) {
      try {
        const syncResult = await syncMongolianDisplayForRecord('words', id, {
          mongolian: data.mongolian,
          example_mongolian: data.example_mongolian,
        });
        mongolianCacheStale = syncResult.cacheStale === true;
        staleWordIds = syncResult.staleFields ?? [];
      } catch (syncErr) {
        console.warn(`[words PUT] sync svg failed for ${id}:`, syncErr);
      }
    }

    // 转换字段格式：snake_case → 前端期望的 camelCase + 嵌套对象
    const word = transformWord(data);

    return NextResponse.json({
      success: true,
      data: word,
      mongolianCacheStale,
      staleWordIds,
    });
  } catch (error: any) {
    console.error('PUT word error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 删除词条
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

    // 先查出 created_by_user_id 用于权限判断
    const { data: existing } = await client.from('words').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);
    
    const { error } = await client
      .from('words')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除词条失败: ${error.message}`);
    }

    // 同步：删除时清理缓存文件 + 标记旧 SVG 为 outdated
    try {
      await invalidateMongolianSvgCache('words', id);
      await markOldSvgAsOutdated('words', id);
    } catch (e) {
      console.warn(`[words DELETE] sync cleanup failed for ${id}:`, e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE word error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
