import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';
import { maybeBootstrapAdmin } from '@/lib/auth/bootstrap-admin';

// GET /api/announcements
// 公开读取：返回当前活跃的公告
// query: ?latest=true 时只返回最新一条（用于弹窗）；否则返回所有活跃公告
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get('latest') === 'true';

    const client = getClient();
    let query = client
      .from('announcements')
      .select('*')
      .lte('published_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('published_at', { ascending: false });

    if (latest) {
      query = query.limit(1);
    }

    const { data, error } = await query;

    if (error) {
      // 表不存在时返回空数组，不抛错
      if (error.code === 'PGRST205' || /relation.*does not exist/i.test(error.message || '')) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 过滤掉已过期的（API 端用 published_at <= now()，expires_at 用客户端或服务端再过滤一次）
    const now = Date.now();
    const filtered = (data || []).filter((a: any) => {
      if (!a.expires_at) return true;
      return new Date(a.expires_at).getTime() > now;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/announcements
// Admin 发布公告
// body: { title, content, type?, priority?, expires_at? }
export async function POST(request: NextRequest) {
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
    const title = (body?.title || '').trim();
    const content = (body?.content || '').trim();
    const type = body?.type || 'info';
    const priority = typeof body?.priority === 'number' ? body.priority : 0;
    const expiresAt = body?.expires_at || null;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }
    if (!['info', 'warning', 'success', 'update'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    const client = getClient(session.accessToken);
    const { data, error } = await client
      .from('announcements')
      .insert({
        title,
        content,
        type,
        priority,
        published_at: new Date().toISOString(),
        expires_at: expiresAt,
        created_by: session.user.id,
        created_by_name: session.profile.display_name || session.user.email,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
