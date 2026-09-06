import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';
import { maybeBootstrapAdmin } from '@/lib/auth/bootstrap-admin';

// GET /api/admin/levels
// 公开读取
export async function GET() {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('levels')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

// PUT /api/admin/levels
// Admin 批量更新等级
// body: { levels: [{ level, min_xp, name_zh, name_en, icon, sort_order }] }
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    if (!session.profile || session.profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }
    await maybeBootstrapAdmin(session.user.id, session.user.email);

    const body = await request.json();
    const levels: Array<{
      level: number;
      min_xp: number;
      name_zh: string;
      name_en: string;
      icon: string;
      sort_order: number;
    }> = body?.levels || [];

    if (!Array.isArray(levels) || levels.length === 0) {
      return NextResponse.json({ success: false, error: 'levels must be a non-empty array' }, { status: 400 });
    }

    const client = getClient(session.accessToken);
    const now = Date.now();
    const updates = levels.map((l) => ({
      level: l.level,
      min_xp: l.min_xp,
      name_zh: l.name_zh,
      name_en: l.name_en,
      icon: l.icon,
      sort_order: l.sort_order,
      updated_at: now,
    }));

    const { error } = await client
      .from('levels')
      .upsert(updates, { onConflict: 'level' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: updates.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
