import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/auth/admin-client';
import { getXpRules, calculateLevelFromRules, getLevelTitleFromRules, getNextLevelProgressFromRules } from '@/lib/xp-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/xp/me
 * 获取当前登录用户的 XP / 等级 / streak + 全局 rules 和 levels
 */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: missing or invalid x-session header' },
      { status: 401 }
    );
  }

  try {
    const { rules, levels } = await getXpRules();
    const admin = getAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, email, display_name, total_xp, current_level, streak_days, last_study_date, daily_xp_today')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // 保险：若等级未及时更新（数据库脏数据），按 total_xp 重新计算
    const correctLevel = calculateLevelFromRules(profile.total_xp || 0, levels);
    if (correctLevel !== profile.current_level) {
      await admin.from('profiles').update({ current_level: correctLevel }).eq('id', profile.id);
      profile.current_level = correctLevel;
    }

    const title = getLevelTitleFromRules(profile.current_level || 1, levels);
    const progress = getNextLevelProgressFromRules(profile.total_xp || 0, levels);

    return NextResponse.json({
      success: true,
      data: {
        totalXp: profile.total_xp || 0,
        level: profile.current_level || 1,
        title,
        progress,
        streakDays: profile.streak_days || 0,
        lastStudyDate: profile.last_study_date,
        dailyXpToday: profile.daily_xp_today || 0,
        profile: {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
        },
        rules,
        levels,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
