"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Flame, Calendar as CalIcon, Trophy, BookOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getAuthToken } from "@/hooks/useAuth";
// (动画用 Tailwind transition)

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

interface CalendarDay {
  date: string; // YYYY-MM-DD
  xp: number;
  count: number;
}

interface CalendarData {
  days: CalendarDay[];
  totalDays: number;
  totalXp: number;
  bestDay: { date: string; xp: number } | null;
  currentStreak: number;
  bestStreak: number;
}

function T(key: string, en: string, zh: string) {
  return useApp().language === "en" ? en : zh;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"leaderboard" | "calendar">("leaderboard");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const app = useApp();
  const t = (zh: string, en: string) => (app.language === "en" ? en : zh);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = getAuthToken();
      try {
        const [lbRes, calRes] = await Promise.all([
          fetch("/api/xp/leaderboard", { headers: { "x-session": token || "" } }),
          fetch("/api/xp/calendar", { headers: { "x-session": token || "" } }),
        ]);
        const lbData = await lbRes.json();
        const calData = await calRes.json();
        if (lbData.success) setEntries(lbData.data.entries || []);
        if (calData.success) setCalendar(calData.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 mb-2">
            {t("学习榜单", "Learning Leaderboard")}
          </h1>
          <p className="text-stone-600">
            {t("与所有学习者一起成长", "Grow together with all learners")}
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t("排行榜", "Leaderboard")}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalIcon className="h-4 w-4" />
              {t("学习日历", "Study Calendar")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            {loading ? (
              <div className="text-center py-12 text-stone-500">{t("加载中...", "Loading...")}</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                {t("还没有任何学习记录，快来开始吧！", "No records yet. Start your learning journey!")}
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <div
                    key={entry.userId}
                    className="transition-all duration-300 hover:scale-[1.01]"
                  >
                    <Card
                      className={`overflow-hidden border-2 transition-all ${
                        entry.isCurrentUser
                          ? "border-amber-400 bg-amber-50/50"
                          : "border-stone-200 bg-white/80"
                      }`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{
                            background: entry.rank === 1
                              ? "linear-gradient(135deg, #FFD700, #FFA500)"
                              : entry.rank === 2
                              ? "linear-gradient(135deg, #C0C0C0, #A8A8A8)"
                              : entry.rank === 3
                              ? "linear-gradient(135deg, #CD7F32, #8B4513)"
                              : "#F5F5F4",
                            color: entry.rank <= 3 ? "white" : "#78716C",
                          }}
                        >
                          {entry.rank <= 3 ? <Crown className="h-5 w-5" /> : entry.rank}
                        </div>
                        <Avatar className="h-10 w-10">
                          {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-amber-200 to-orange-300 text-stone-700">
                            {entry.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-800 truncate">
                              {entry.displayName}
                            </span>
                            {entry.isCurrentUser && (
                              <Badge variant="default" className="text-xs bg-amber-500">
                                {t("我", "You")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              <span>{t("等级", "Level")} {entry.level}</span>
                            </span>
                            {entry.streakDays > 0 && (
                              <span className="flex items-center gap-1 text-orange-500">
                                <Flame className="h-3 w-3" />
                                {entry.streakDays}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-amber-700">
                            {entry.totalXp}
                          </div>
                          <div className="text-xs text-stone-500">XP</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            {loading ? (
              <div className="text-center py-12 text-stone-500">{t("加载中...", "Loading...")}</div>
            ) : !calendar ? (
              <div className="text-center py-12 text-stone-500">
                {t("暂无学习记录", "No study records yet")}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    icon={<CalIcon className="h-5 w-5" />}
                    label={t("学习天数", "Study Days")}
                    value={calendar.totalDays}
                    color="from-blue-400 to-cyan-500"
                  />
                  <StatCard
                    icon={<Trophy className="h-5 w-5" />}
                    label={t("总 XP", "Total XP")}
                    value={calendar.totalXp}
                    color="from-amber-400 to-orange-500"
                  />
                  <StatCard
                    icon={<Flame className="h-5 w-5" />}
                    label={t("当前连续", "Current Streak")}
                    value={`${calendar.currentStreak} ${t("天", "d")}`}
                    color="from-orange-400 to-rose-500"
                  />
                  <StatCard
                    icon={<Crown className="h-5 w-5" />}
                    label={t("最佳连续", "Best Streak")}
                    value={`${calendar.bestStreak} ${t("天", "d")}`}
                    color="from-purple-400 to-pink-500"
                  />
                </div>

                <Card className="bg-white/80 border-stone-200">
                  <CardHeader>
                    <CardTitle className="text-stone-800">
                      {t("近 90 天学习热力图", "Last 90 Days Study Heatmap")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CalendarHeatmap days={calendar.days} />
                  </CardContent>
                </Card>

                {calendar.bestDay && (
                  <div className="text-sm text-stone-500 text-center">
                    {t("最佳单日：", "Best day:")}
                    <span className="font-semibold text-amber-600 ml-1">
                      {calendar.bestDay.date}
                    </span>
                    <span className="ml-1">
                      ({calendar.bestDay.xp} XP)
                    </span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="bg-white/80 border-stone-200">
      <CardContent className="p-4">
        <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${color} text-white mb-2`}>
          {icon}
        </div>
        <div className="text-2xl font-bold text-stone-800">{value}</div>
        <div className="text-xs text-stone-500 mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function CalendarHeatmap({ days }: { days: CalendarDay[] }) {
  const app = useApp();
  const t = (zh: string, en: string) => (app.language === "en" ? en : zh);

  // Group by week
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
