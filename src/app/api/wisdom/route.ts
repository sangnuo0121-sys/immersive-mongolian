import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAuth, requireOwnerOrAdmin } from "@/lib/auth/require-auth";
import { syncMongolianDisplayForRecord } from '@/lib/mongolian-display';
import { transformWisdomQuote } from '@/lib/data/transforms';

// 获取所有智慧语录（全部从 Supabase 读取，不再区分系统/用户）
export async function GET(request: NextRequest) {
  try {
    let client: ReturnType<typeof getClient> | null = null;
    try {
      client = getClient();
    } catch (e) {
      console.warn('[Wisdom API] Supabase client unavailable:', e);
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    // 获取智慧语录
    const { data, error } = await client
      .from('wisdom_quotes')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[Wisdom API] Query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // 转换数据库字段为前端格式
    const quotes = (data || []).map((row: any) => transformWisdomQuote(row));
    
    return NextResponse.json({ success: true, data: quotes });
    
  } catch (error: any) {
    console.error('GET /api/wisdom error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 新增智慧语录
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    
    // 处理翻译字段（支持多种格式）
    let translationZh = '';
    let translationEn = '';
    
    if (typeof body.translation === 'object' && body.translation !== null) {
      translationZh = body.translation.zh || '';
      translationEn = body.translation.en || '';
    }
    if (!translationZh && typeof body.translation_zh === 'string') {
      translationZh = body.translation_zh;
    }
    if (!translationEn && typeof body.translation_en === 'string') {
      translationEn = body.translation_en;
    }
    
    // 如果只有一个翻译，两个字段都使用
    if (translationZh && !translationEn) translationEn = translationZh;
    if (translationEn && !translationZh) translationZh = translationEn;
    
    const record = {
      id: body.id || crypto.randomUUID(),
      mongolian: body.mongolian || '',
      translation_zh: translationZh,
      translation_en: translationEn,
      author: body.author || body.authorName || '',
      category: body.category || 'wisdom',
      audio_url: body.audio || body.audioUrl || null,
      is_user_uploaded: true,
      created_by_user_id: auth.userId,
      created_by_name: auth.email || 'User',
    };
    
    const { data, error } = await client
      .from('wisdom_quotes')
      .insert(record)
      .select();

    if (error) {
      console.error('Insert error:', error);
      throw new Error(`插入智慧语录失败: ${error.message}`);
    }

    // 同步：新增智慧语录后生成蒙古文 SVG
    const inserted = Array.isArray(data) ? data[0] : data;
    let mongolianCacheStale = false;
    let staleWordIds: string[] = [];
    if (inserted?.id) {
      try {
        const syncResult = await syncMongolianDisplayForRecord('wisdom_quotes', inserted.id, {
          mongolian: inserted.mongolian,
        });
        mongolianCacheStale = syncResult.cacheStale === true;
        staleWordIds = syncResult.staleFields ?? [];
      } catch (syncErr) {
        console.warn(
          `[wisdom POST] sync svg failed for ${inserted.id}:`,
          syncErr,
        );
      }
    }

    // 关键：返回前端类型（嵌套 translation、自动生成 mongolianImageSrc），
    // AppContext 才能用 result.data 直接替换本地 state。
    return NextResponse.json({
      success: true,
      data: transformWisdomQuote(inserted),
      mongolianCacheStale,
      staleWordIds,
    });
  } catch (error: any) {
    console.error('POST /api/wisdom error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
