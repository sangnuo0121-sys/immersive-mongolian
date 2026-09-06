import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/auth/admin-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/xp/audit
 *  query:
 *    - userId?: 单用户筛选（管理员可看任何用户，普通用户只能查自己）
 *    - limit?: 默认 100，最大 500
 *    - offset?: 默认 0
 *  返回: { entries: [...], total, limit, offset }
 *  权限：管理员可查所有人，普通用户只能查自己
 */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || session.user.id;
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 100));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    const isAdmin = session.profile?.role === 'admin';
    if (!isAdmin && requestedUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: can only view your own audit' },
        { status: 403 }
      );
    }

    const admin = getAdminClient();
    const { data, error, count } = await admin
      .from('xp_history')
      .select('id, user_id, user_email, user_display_name, action, xp_delta, total_xp_after, level_after, created_at', { count: 'exact' })
      .eq('user_id', requestedUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        entries: (data || []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userEmail: r.user_email,
          userDisplayName: r.user_display_name,
          action: r.action,
          xpDelta: r.xp_delta,
          totalXpAfter: r.total_xp_after,
          levelAfter: r.level_after,
          createdAt: r.created_at,
        })),
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
