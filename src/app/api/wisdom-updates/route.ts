import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

// 获取所有系统智慧语录更新
export async function GET() {
  try {
    const client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const { data, error } = await client
      .from('wisdom_updates')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw new Error(`查询智慧语录更新失败: ${error.message}`);
    
    // 转换为前端格式
    const updates = (data || []).map((row: any) => ({
      id: row.id,
      mongolian: row.mongolian,
      translation: {
        zh: row.translation_zh,
        en: row.translation_en,
      },
      author: row.author,
      updatedAt: new Date(row.updated_at).getTime(),
    }));
    
    return NextResponse.json({ success: true, data: updates });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 批量保存系统智慧语录更新
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    const body = await request.json();
    
    // 支持单个或批量更新
    const updatesToSave = Array.isArray(body) ? body : [body];
    
    const now = new Date().toISOString();
    
    const records = updatesToSave.map((update: any) => ({
      id: update.id,
      mongolian: update.mongolian || null,
      translation_zh: update.translation?.zh || null,
      translation_en: update.translation?.en || null,
      author: update.author || null,
      updated_at: now,
    }));
    
    // 使用 upsert 插入或更新
    const { data, error } = await client
      .from('wisdom_updates')
      .upsert(records, { onConflict: 'id' })
      .select();
    
    if (error) throw new Error(`保存智慧语录更新失败: ${error.message}`);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
