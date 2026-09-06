import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/auth/admin-client';
import {
  getXpRules,
  calculateLevelFromRules,
  getLevelTitleFromRules,
  getNextLevelProgressFromRules,
} from '@/lib/xp-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/xp/add
 *  增加 XP
 *  body: { action: string, sourceId?: string, sourceTable?: string, customDelta?: number }
 *  - action 必须是 xp_rules 表里的 id（也是默认规则的 id）
 *  - 若 customDelta 给定，则忽略规则，使用 customDelta
 *
 *  副作用：
 *   1. 更新 profiles.total_xp / current_level / streak_days / last_study_date / daily_xp_today
 *   2. 写入 xp_history 审计记录
 *   3. 触发连续学习天数（streak）更新
 */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: missing or invalid x-session header' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, sourceId, sourceTable, customDelta } = body || {};
    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    }

    const { rules, levels } = await getXpRules();
    const rule = rules.find((r) => r.id === action);
    let xpDelta: number;
    if (typeof customDelta === 'number' && Number.isFinite(customDelta)) {
      xpDelta = customDelta;
    } else if (rule) {
      xpDelta = rule.value;
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // 1) 拉取当前 profile
    const { data: profile, error: fetchErr } = await admin
      .from('profiles')
      .select('id, email, display_name, total_xp, current_level, streak_days, last_study_date, daily_xp_today')
      .eq('id', session.user.id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // 2) 计算 streak 和今日 XP
    const today = new Date();
    const todayDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const lastDate = profile.last_study_date as string | null;
    let streakDays = (profile.streak_days as number) || 0;
    let dailyXpToday = (profile.daily_xp_today as number) || 0;
    if (lastDate === todayDate) {
      // 同一天
    } else if (lastDate) {
      const last = new Date(lastDate);
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        streakDays = streakDays + 1;
        dailyXpToday = xpDelta;
      } else if (diffDays > 1) {
        streakDays = 1;
        dailyXpToday = xpDelta;
      } else {
        streakDays = 1;
        dailyXpToday = xpDelta;
      }
    } else {
      streakDays = 1;
      dailyXpToday = xpDelta;
    }

    // 3) 累计
    const newTotalXp = (profile.total_xp || 0) + xpDelta;
    const newLevel = calculateLevelFromRules(newTotalXp, levels);
    const prevLevel = profile.current_level || 1;
    const leveledUp = newLevel > prevLevel;

    // 4) 更新 profile
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        total_xp: newTotalXp,
        current_level: newLevel,
        streak_days: streakDays,
        last_study_date: todayDate,
        daily_xp_today: dailyXpToday,
      })
      .eq('id', session.user.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // 5) 写 xp_history
    const { error: histErr } = await admin.from('xp_history').insert({
      user_id: session.user.id,
      user_email: profile.email,
      user_display_name: profile.display_name,
      action,
      xp_delta: xpDelta,
      total_xp_after: newTotalXp,
      level_after: newLevel,
    });
    if (histErr) {
      // 不阻塞主流程
      console.error('[xp/add] history insert failed:', histErr.message);
    }

    const title = getLevelTitleFromRules(newLevel, levels);
    const progress = getNextLevelProgressFromRules(newTotalXp, levels);

    return NextResponse.json({
      success: true,
      data: {
        xpDelta,
        totalXp: newTotalXp,
        level: newLevel,
        leveledUp,
        prevLevel,
        title,
        progress,
        streakDays,
        dailyXpToday,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
