"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { getAuthToken, useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Flame, ChevronRight } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
  rank: number;
  isCurrentUser?: boolean;
}

interface CalendarDay {
  date: string;
  xp: number;
}

interface UserXpData {
  totalXp: number;
  level: number;
  streakDays: number;
  progress: number;
  nextLevelXp: number;
}

interface LeaderboardSectionProps {
  /** 视觉变体: compact (学习页底部) | full (排行榜页面) */
  variant?: "compact" | "full";
  /** 限制排名显示数量 (仅 compact) */
  limit?: number;
  /** 是否显示"查看完整排行榜"按钮 (仅 compact) */
  showViewAllButton?: boolean;
  /** 自定义 className (仅 full 用于页面布局) */
  className?: string;
}

/**
 * 共享的排行榜 + 学习日历组件
 * 集成在 LearnPage 底部和 /leaderboard 页面使用
 */
export function LeaderboardSection({
  variant = "compact",
  limit = 5,
  showViewAllButton = true,
}: LeaderboardSectionProps) {
  const app = useApp();
  const { isLoggedIn, user } = useAuth();
  const t = (zh: string, en: string) => (app.language === "en" ? en : zh);

  const [activeTab, setActiveTab] = useState<"leaderboard" | "calendar" | "me">(
    isLoggedIn ? "leaderboard" : "me"
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [myXp, setMyXp] = useState<UserXpData | null>(null);
  const [loading, setLoading] = useState(false);

  function loadLocalXp() {
    // 从 app context 读取本地 XP（未登录时使用本地 addXP 累加值）
    const total = app.xpState?.totalXP ?? 0;
    const level = app.xpState?.level ?? 1;
    const streak = app.xpState?.streak ?? 0;
    setMyXp({
      totalXp: total,
      level,
      streakDays: streak,
      progress: 0,
      nextLevelXp: 0,
    });
  }

  async function loadLeaderboard() {
    try {
      const token = getAuthToken();
      const res = await fetch("/api/xp/leaderboard", {
        headers: token ? { "x-session": token } : {},
      });
      const data = await res.json();
      if (data.success) {
        const list: LeaderboardEntry[] = (data.data.entries || []).map(
          (e: any) => ({
            userId: e.userId,
            displayName: e.displayName,
            totalXp: e.totalXp,
            level: e.level,
            rank: e.rank,
            isCurrentUser: isLoggedIn && e.userId === user?.id,
          })
        );
        setEntries(list.slice(0, limit));
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
  }

  async function loadCalendar() {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/xp/calendar", {
        headers: token ? { "x-session": token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setDays(data.data.days || []);
      }
    } catch (err) {
      console.error("Failed to load calendar:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyXp() {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/xp/me", {
        headers: token ? { "x-session": token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setMyXp(data.data);
      }
    } catch (err) {
      console.error("Failed to load XP:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      void loadLeaderboard();
    } else {
      // 未登录时，主动加载本地 XP（基于本地 addXP 累加）
      loadLocalXp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === "calendar" && days.length === 0) {
      void loadCalendar();
    } else if (activeTab === "me" && !myXp) {
      void loadMyXp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isLoggedIn]);

  // Medal emoji for top 3
  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <Card className="border-stone-200/60 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-stone-200/60">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">
                {t("学习排行", "Leaderboard")}
              </h2>
              <p className="text-xs text-stone-500">
                {t("看看大家在蒙古语学习中的进展", "See everyone's progress")}
              </p>
            </div>
          </div>
          {showViewAllButton && (
            <Link
              href="/leaderboard"
              className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-0.5"
            >
              {t("查看完整", "View all")}
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pb-2">
          <TabButton
            active={activeTab === "leaderboard"}
            onClick={() => setActiveTab("leaderboard")}
            label={t("总榜", "Top")}
          />
          <TabButton
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
            label={t("学习日历", "Calendar")}
          />
          <TabButton
            active={activeTab === "me"}
            onClick={() => setActiveTab("me")}
            label={t("我的数据", "My Stats")}
            disabled={!isLoggedIn}
          />
        </div>
      </div>

      <CardContent className="p-4">
        {activeTab === "leaderboard" && (
          <LeaderboardList entries={entries} getMedal={getMedal} t={t} />
        )}
        {activeTab === "calendar" && (
          <CalendarView
            days={days}
            loading={loading}
            isLoggedIn={isLoggedIn}
            t={t}
          />
        )}
        {activeTab === "me" && (
          <MyStatsView
            myXp={myXp}
            loading={loading}
            isLoggedIn={isLoggedIn}
            t={t}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
        disabled
          ? "text-stone-300 cursor-not-allowed"
          : active
          ? "bg-amber-100 text-amber-800"
          : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {label}
    </button>
  );
}

function LeaderboardList({
  entries,
  getMedal,
  t,
}: {
  entries: LeaderboardEntry[];
  getMedal: (rank: number) => string | null;
  t: (zh: string, en: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        {t("暂无排行数据", "No leaderboard data yet")}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {entries.map((e) => {
        const medal = getMedal(e.rank);
        return (
          <div
            key={e.userId}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              e.isCurrentUser
                ? "bg-amber-50 border border-amber-200"
                : "hover:bg-stone-50"
            }`}
          >
            <div className="w-7 text-center text-sm font-bold text-stone-600">
              {medal || `#${e.rank}`}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium truncate ${
                  e.isCurrentUser ? "text-amber-800" : "text-stone-800"
                }`}
              >
                {e.displayName}
                {e.isCurrentUser && (
                  <span className="ml-1.5 text-xs text-amber-600">
                    {t("我", "You")}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500">
                {t("等级", "Level")} {e.level}
              </div>
            </div>
            <div className="text-sm font-bold text-amber-700">
              {e.totalXp} XP
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({
  days,
  loading,
  isLoggedIn,
  t,
}: {
  days: CalendarDay[];
  loading: boolean;
  isLoggedIn: boolean;
  t: (zh: string, en: string) => string;
}) {
  if (!isLoggedIn) {
    return (
      <div className="py-8 text-center">
        <Calendar className="w-10 h-10 mx-auto text-stone-300 mb-2" />
        <p className="text-sm text-stone-500">
          {t("登录后查看学习日历", "Log in to see your calendar")}
        </p>
        <Link href="/login" className="inline-block mt-3">
          <Button size="sm" variant="outline">
            {t("立即登录", "Sign in")}
          </Button>
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        {t("加载中...", "Loading...")}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        {t("暂无学习记录", "No study records yet")}
      </div>
    );
  }

  const maxXp = Math.max(1, ...days.map((d) => d.xp));
  const totalDays = days.length;
  const weeksCount = Math.ceil(totalDays / 7);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {Array.from({ length: 7 }, (_, dow) => (
            <div key={dow} className="flex gap-1">
              {Array.from({ length: weeksCount }, (_, w) => {
                const dayIdx = w * 7 + dow;
                const day = days[dayIdx];
                if (!day) return <div key={w} className="w-3 h-3" />;
                const intensity = day.xp / maxXp;
                return (
                  <div
                    key={w}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150"
                    title={`${day.date}: ${day.xp} XP`}
                    style={{
                      background:
                        day.xp === 0
                          ? "#E7E5E4"
                          : intensity > 0.75
                          ? "#B45309"
                          : intensity > 0.5
                          ? "#D97706"
                          : intensity > 0.25
                          ? "#F59E0B"
                          : "#FCD34D",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-500 mt-3">
        <span>{t("少", "Less")}</span>
        <div className="w-3 h-3 rounded-sm bg-stone-200" />
        <div className="w-3 h-3 rounded-sm bg-amber-300" />
        <div className="w-3 h-3 rounded-sm bg-amber-500" />
        <div className="w-3 h-3 rounded-sm bg-amber-600" />
        <div className="w-3 h-3 rounded-sm bg-amber-800" />
        <span>{t("多", "More")}</span>
      </div>
    </div>
  );
}

function MyStatsView({
  myXp,
  loading,
  isLoggedIn,
  t,
}: {
  myXp: UserXpData | null;
  loading: boolean;
  isLoggedIn: boolean;
  t: (zh: string, en: string) => string;
}) {
  // 未登录：仅当本地有 XP 数据时才展示
  if (!isLoggedIn) {
    if (myXp && myXp.totalXp > 0) {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-stone-50 to-amber-50 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">
              {t("本地经验值（未登录）", "Local XP (not logged in)")}
            </div>
            <div className="text-2xl font-bold text-stone-800">
              {myXp.totalXp}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs text-stone-500">
                {t("当前等级", "Level")}
              </div>
              <div className="text-lg font-bold text-stone-800">
                Lv {myXp.level}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs text-stone-500 flex items-center gap-1">
                <Flame className="w-3 h-3" /> {t("连续天数", "Streak")}
              </div>
              <div className="text-lg font-bold text-stone-800">
                {myXp.streakDays} {t("天", "days")}
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 text-center">
            {t("登录后数据将同步到云端", "Log in to sync data to cloud")}
          </p>
        </div>
      );
    }
    return (
      <div className="py-8 text-center">
        <Flame className="w-10 h-10 mx-auto text-stone-300 mb-2" />
        <p className="text-sm text-stone-500">
          {t("开始学习以获得经验值", "Start learning to earn XP")}
        </p>
        <Link href="/login" className="inline-block mt-3">
          <Button size="sm" variant="outline">
            {t("登录以同步", "Sign in to sync")}
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        {t("加载中...", "Loading...")}
      </div>
    );
  }

  if (!myXp) {
    return (
      <div className="py-8 text-center text-stone-400 text-sm">
        {t("暂无数据", "No data yet")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div>
          <div className="text-xs text-amber-700 font-medium">
            {t("总经验值", "Total XP")}
          </div>
          <div className="text-2xl font-bold text-amber-800">
            {myXp.totalXp}
          </div>
        </div>
        <Trophy className="w-8 h-8 text-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <div className="text-xs text-stone-500">{t("当前等级", "Level")}</div>
          <div className="text-lg font-bold text-stone-800">Lv {myXp.level}</div>
        </div>
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <div className="text-xs text-stone-500 flex items-center gap-1">
            <Flame className="w-3 h-3" /> {t("连续天数", "Streak")}
          </div>
          <div className="text-lg font-bold text-stone-800">
            {myXp.streakDays} {t("天", "days")}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-stone-600">
            {t("升级进度", "Progress to next level")}
          </span>
          <span className="text-stone-700 font-medium">
            {Math.round(myXp.progress * 100)}%
          </span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
            style={{ width: `${myXp.progress * 100}%` }}
          />
        </div>
        <div className="text-xs text-stone-400 mt-1 text-right">
          {t("下一级还需", "Need")} {myXp.nextLevelXp - myXp.totalXp} XP
        </div>
      </div>
    </div>
  );
}
