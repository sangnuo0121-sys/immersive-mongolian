import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/auth/admin-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/xp/calendar
 *  query:
 *   - days: 默认 90（返回最近 N 天）
 *  返回: { days: [{ date: 'YYYY-MM-DD', xp: number, count: number }] }
 *  基于 xp_history.created_at 聚合
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
    const days = Math.min(365, Math.max(7, Number(searchParams.get('days')) || 90));
    const admin = getAdminClient();

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const { data, error } = await admin
      .from('xp_history')
      .select('created_at, xp_delta')
      .eq('user_id', session.user.id)
      .gte('created_at', sinceIso);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 按天聚合
    const map = new Map<string, { xp: number; count: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { xp: 0, count: 0 });
    }
    for (const row of data || []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      if (!map.has(key)) continue;
      const v = map.get(key)!;
      v.xp += row.xp_delta;
      v.count += 1;
    }

    const arr = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, xp: v.xp, count: v.count }));

    // 计算 currentStreak（从今天往回数连续有学习的天数）
    let currentStreak = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].count > 0) currentStreak++;
      else break;
    }

    // 计算 bestStreak（整个时间段内最长连续天数）
    let bestStreak = 0;
    let temp = 0;
    for (const d of arr) {
      if (d.count > 0) { temp++; bestStreak = Math.max(bestStreak, temp); }
      else temp = 0;
    }

    // 计算 totalDays / totalXp / bestDay
    const totalDays = arr.filter(d => d.count > 0).length;
    const totalXp = arr.reduce((sum, d) => sum + d.xp, 0);
    const bestDay = arr.reduce((best, d) => d.xp > (best?.xp || 0) ? d : best, null as { date: string; xp: number } | null);

    return NextResponse.json({
      success: true,
      data: { days: arr, totalDays, totalXp, bestDay, currentStreak, bestStreak },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
