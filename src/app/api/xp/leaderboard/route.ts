import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/auth/admin-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/xp/leaderboard
 *  query:
 *    - limit: 默认 50
 *    - period: 'all' | 'weekly' | 'monthly'  默认 all
 *  返回: 排行榜（按 total_xp 倒序）
 *   - all: 使用 profiles.total_xp
 *   - weekly/monthly: 累加 xp_history.created_at 在该区间内的 xp_delta
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
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const period = searchParams.get('period') || 'all';
    const admin = getAdminClient();

    if (period === 'all') {
      // 直接从 profiles 拉
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, display_name, total_xp, current_level, streak_days, last_study_date')
        .order('total_xp', { ascending: false })
        .limit(limit);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        data: {
          period,
          entries: (data || []).map((u: any, idx: number) => ({
            rank: idx + 1,
            userId: u.id,
            email: u.email,
            displayName: u.display_name,
            totalXp: u.total_xp || 0,
            level: u.current_level || 1,
            streakDays: u.streak_days || 0,
            lastStudyDate: u.last_study_date,
          })),
        },
      });
    }

    // weekly / monthly
    const now = new Date();
    const since = new Date();
    if (period === 'weekly') {
      since.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      since.setDate(now.getDate() - 30);
    } else {
      return NextResponse.json({ success: false, error: 'invalid period' }, { status: 400 });
    }
    const sinceIso = since.toISOString();

    const { data, error } = await admin
      .from('xp_history')
      .select('user_id, user_email, user_display_name, xp_delta, level_after, created_at')
      .gte('created_at', sinceIso);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 累加
    const map = new Map<string, any>();
    for (const row of data || []) {
      const k = row.user_id;
      if (!map.has(k)) {
        map.set(k, {
          userId: k,
          email: row.user_email,
          displayName: row.user_display_name,
          xpDelta: 0,
          lastLevel: row.level_after,
          lastActive: row.created_at,
        });
      }
      const v = map.get(k);
      v.xpDelta += row.xp_delta;
      if (row.level_after > (v.lastLevel || 0)) v.lastLevel = row.level_after;
      if (row.created_at > v.lastActive) v.lastActive = row.created_at;
    }

    const entries = Array.from(map.values())
      .sort((a, b) => b.xpDelta - a.xpDelta)
      .slice(0, limit)
      .map((u, idx) => ({
        rank: idx + 1,
        userId: u.userId,
        email: u.email,
        displayName: u.displayName,
        xpDelta: u.xpDelta,
        level: u.lastLevel || 1,
        lastActive: u.lastActive,
      }));

    return NextResponse.json({
      success: true,
      data: { period, since: sinceIso, entries },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
