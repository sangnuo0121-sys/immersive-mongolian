import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';
import { maybeBootstrapAdmin } from '@/lib/auth/bootstrap-admin';

// GET /api/admin/xp-rules
// 公开读取（所有人都能看规则）
export async function GET() {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('xp_rules')
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

// PUT /api/admin/xp-rules
// Admin 批量更新规则
// body: { rules: [{ id, value, description_zh, description_en, sort_order }] }
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
    const rules: Array<{
      id: string;
      value: number;
      description_zh: string;
      description_en: string;
      sort_order: number;
    }> = body?.rules || [];

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ success: false, error: 'rules must be a non-empty array' }, { status: 400 });
    }

    const client = getClient(session.accessToken);
    const now = Date.now();
    const updates = rules.map((r) => ({
      id: r.id,
      value: r.value,
      description_zh: r.description_zh,
      description_en: r.description_en,
      sort_order: r.sort_order,
      updated_at: now,
    }));

    const { error } = await client
      .from('xp_rules')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: updates.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
