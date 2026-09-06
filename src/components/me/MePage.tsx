"use client";

/**
 * MePage —— 我的页面（草原与蒙古文化主题）
 *
 * 视觉语言：
 * - 色彩：草原绿（#5B9B5D）· 晴空蓝（#4A90E2）· 雪山白 · 暖驼色 · 那达慕金 · 蒙古袍靛
 * - 元素：蒙古包轮廓（毡帐渐变环）· 远山 SVG · 蒙古文竖排水印 · 哈达飘带 · 云纹
 *
 * 包含区块：
 * 1. Hero 顶部（草原天际线 + 蒙古文水印 + 标题）
 * 2. 用户卡片（头像 + 等级徽章 + XP 进度 + 连击）—— 未登录显示"登录/注册"CTA
 * 3. 快速入口（4 块：鸣谢 / 排行 / 收藏 / 徽章）+ 用户反馈入口
 * 4. 管理区（admin only）
 * 5. 账户区（登出）
 */

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Trophy,
  Bookmark,
  Award,
  LogOut,
  LogIn,
  Shield,
  Sparkles,
  Flame,
  ChevronRight,
  CircleUserRound,
  MessageSquareText,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { useAuth, getAuthToken } from "@/hooks/useAuth";
import { LEVEL_TITLES, type LevelTitle } from "@/types";
import { FeedbackDialog } from "@/components/common/FeedbackDialog";
import { Pencil, Check, X, Loader2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * 等级工具（本地同步版 · 从 LEVEL_TITLES 派生）
 * ───────────────────────────────────────────────────────────── */
function resolveLevel(totalXp: number): LevelTitle {
  // 从高到低，找到第一个 minXp <= totalXp 的等级
  for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TITLES[i].minXp) {
      return LEVEL_TITLES[i];
    }
  }
  return LEVEL_TITLES[0];
}

function resolveProgress(totalXp: number) {
  const current = resolveLevel(totalXp);
  const currentIdx = LEVEL_TITLES.findIndex((l) => l.level === current.level);
  const next = LEVEL_TITLES[currentIdx + 1] ?? current;
  const span = next.minXp - current.minXp;
  const within = Math.max(0, totalXp - current.minXp);
  const percent = span > 0 ? Math.min(100, (within / span) * 100) : 100;
  return {
    currentLevelMinXp: current.minXp,
    nextLevelMinXp: next.minXp,
    progressPercent: percent,
  };
}

/* ─────────────────────────────────────────────────────────────
 * 草原远山 SVG 装饰
 * ───────────────────────────────────────────────────────────── */
function SteppeHorizon() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 w-full h-32 opacity-60 pointer-events-none"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* 远山层 1（最深） */}
      <path
        d="M0 90 L60 70 L130 85 L210 55 L290 80 L360 60 L440 75 L520 50 L600 70 L690 45 L780 65 L870 40 L960 60 L1050 45 L1140 60 L1200 50 L1200 120 L0 120 Z"
        fill="rgb(75 130 95 / 0.4)"
      />
      {/* 远山层 2（中间） */}
      <path
        d="M0 100 L80 85 L170 95 L260 80 L350 92 L440 78 L540 88 L630 75 L720 90 L820 78 L910 88 L1000 75 L1100 88 L1200 80 L1200 120 L0 120 Z"
        fill="rgb(91 155 93 / 0.55)"
      />
      {/* 草原近景（最浅） */}
      <path
        d="M0 110 L120 100 L240 108 L360 98 L480 106 L600 96 L720 105 L840 95 L960 103 L1080 95 L1200 102 L1200 120 L0 120 Z"
        fill="rgb(110 180 110 / 0.7)"
      />
      {/* 蒙古包剪影（点缀） */}
      <g transform="translate(180 78)" fill="rgb(255 255 255 / 0.6)">
        <ellipse cx="0" cy="22" rx="14" ry="2" />
        <path d="M-12 22 Q-12 4 0 0 Q12 4 12 22 Z" />
        <rect x="-1" y="-2" width="2" height="6" fill="rgb(255 255 255 / 0.8)" />
      </g>
      <g transform="translate(880 70)" fill="rgb(255 255 255 / 0.55)">
        <ellipse cx="0" cy="22" rx="18" ry="2.5" />
        <path d="M-16 22 Q-16 2 0 -2 Q16 2 16 22 Z" />
        <rect x="-1" y="-4" width="2" height="6" fill="rgb(255 255 255 / 0.8)" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 哈达飘带（传统五色哈达简化版 · 横条渐变）
 * ───────────────────────────────────────────────────────────── */
function KhataRibbon() {
  return (
    <div className="h-1 w-full flex rounded-full overflow-hidden opacity-70" aria-hidden>
      <div className="flex-1 bg-sky-300" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-amber-300" />
      <div className="flex-1 bg-emerald-300" />
      <div className="flex-1 bg-rose-300" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 昵称行（草原游牧者式 · 暖驼金编辑）
 * ───────────────────────────────────────────────────────────── */
function NicknameRow({
  displayName,
  email,
  language,
  onSaved,
}: {
  displayName: string;
  email: string | null;
  language: 'zh' | 'en';
  onSaved: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setValue(displayName);
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError(language === 'zh' ? '昵称至少 2 个字符' : 'At least 2 characters');
      return;
    }
    if (trimmed.length > 30) {
      setError(language === 'zh' ? '昵称最多 30 个字符' : 'At most 30 characters');
      return;
    }
    if (trimmed === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session': token } : {}),
        },
        body: JSON.stringify({ display_name: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || (language === 'zh' ? '保存失败' : 'Save failed'));
        return;
      }
      await onSaved();
      setEditing(false);
    } catch {
      setError(language === 'zh' ? '网络错误，请稍后再试' : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      {/* 显示态 / 编辑态 */}
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={value}
            onChange={e => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !saving) save();
              if (e.key === 'Escape') cancel();
            }}
            disabled={saving}
            maxLength={30}
            autoFocus
            placeholder={language === 'zh' ? '设置你的草原昵称' : 'Your steppe name'}
            className={`flex-1 min-w-0 px-2.5 py-1.5 text-base sm:text-lg font-bold rounded-lg border-2 bg-stone-50 outline-none transition-colors disabled:opacity-50 ${
              error
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-emerald-300 focus:border-emerald-500'
            }`}
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center justify-center shadow-sm disabled:opacity-50 transition-all"
            aria-label={language === 'zh' ? '保存' : 'Save'}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-all disabled:opacity-50"
            aria-label={language === 'zh' ? '取消' : 'Cancel'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 min-h-[2.25rem]">
          <div className="text-base sm:text-lg font-bold text-stone-800 truncate">
            {displayName || (email?.split('@')[0] || 'U')}
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            aria-label={language === 'zh' ? '编辑昵称' : 'Edit nickname'}
            title={language === 'zh' ? '编辑昵称' : 'Edit nickname'}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 副标题：邮箱（脱敏）+ 已加入草原 */}
      {!editing && (
        <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 truncate">
          {email || (language === 'zh' ? '已加入草原' : 'Joined the steppe')}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="text-[11px] sm:text-xs text-rose-600 leading-tight">
          {error}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 等级徽章（圆形 + emoji + 圆形环）
 * ───────────────────────────────────────────────────────────── */
function LevelBadge({ level, nameZh, nameEn, language, icon }: {
  level: number;
  nameZh: string;
  nameEn: string;
  language: 'zh' | 'en';
  icon: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 flex items-center justify-center shadow-md ring-2 ring-white">
        <span className="text-2xl">{icon}</span>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
          {level}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-stone-500 leading-tight">
          {language === 'zh' ? '当前等级' : 'Level'}
        </span>
        <span className="text-sm font-bold text-stone-800 leading-tight">
          {language === 'zh' ? nameZh : nameEn}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 快速入口 4 块
 * ───────────────────────────────────────────────────────────── */
function QuickEntry({
  href,
  icon: Icon,
  titleZh,
  titleEn,
  descZh,
  descEn,
  color,
  language,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  color: string;
  language: 'zh' | 'en';
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col p-3 sm:p-4 bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="text-sm font-bold text-stone-800 leading-tight">
        {language === 'zh' ? titleZh : titleEn}
      </div>
      <div className="text-[11px] text-stone-500 leading-tight mt-0.5 line-clamp-1">
        {language === 'zh' ? descZh : descEn}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 主页面
 * ───────────────────────────────────────────────────────────── */
export function MePage() {
  const { language, xpState } = useApp();
  const { user, isLoggedIn, isAdmin, clearSession, profile, refresh } = useAuth();

  // 反馈弹窗状态
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const token = getAuthToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { 'x-session': token } : {},
      });
    } catch {
      // 即使 API 失败，也继续清理本地会话
    }
    clearSession();
  };

  // 等级信息
  const levelInfo = resolveLevel(xpState.totalXP);
  const levelProgress = resolveProgress(xpState.totalXP);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-stone-50 to-emerald-50/40 pb-24">
      {/* ─── Hero：草原天际线 ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-300 via-sky-200 to-emerald-200 h-44 sm:h-52">
        {/* 蒙古文竖排水印 */}
        <div
          className="absolute right-3 top-1 text-stone-800/15 font-mongolian select-none pointer-events-none"
          style={{
            writingMode: 'vertical-rl',
            fontSize: '88px',
            lineHeight: '1',
            letterSpacing: '0.05em',
          }}
          aria-hidden
        >
          ᠮᠣᠩᠭᠣᠯ
        </div>
        {/* 哈达飘带 */}
        <div className="absolute top-4 left-4 right-16">
          <KhataRibbon />
        </div>
        {/* 标题 */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          <div className="text-[10px] sm:text-xs text-stone-700/70 tracking-widest uppercase mb-1">
            {language === 'zh' ? 'ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ' : 'Mongolian Script'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-1">
            {language === 'zh' ? '我的' : 'Profile'}
          </h1>
          <p className="text-stone-700/80 text-xs sm:text-sm">
            {language === 'zh' ? '在草原，记录你与蒙古语的每一次相遇' : 'On the steppe, every encounter with Mongolian'}
          </p>
        </div>
        {/* 远山 */}
        <SteppeHorizon />
      </div>

      {/* ─── 内容区 ─── */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 sm:-mt-16 relative z-10 space-y-4 sm:space-y-5">

        {/* ─── 用户卡片 ─── */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-md p-4 sm:p-5">
          {isLoggedIn && user ? (
            <div className="space-y-4">
              {/* 头像 + 邮箱 + 等级 */}
              <div className="flex items-start gap-3">
                {/* 头像（毡帐式渐变环） */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-br from-emerald-300 via-amber-300 to-sky-300">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center text-2xl sm:text-3xl font-bold text-stone-700">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                  {/* 蒙古包装饰顶 */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-t-full bg-amber-500" />
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <NicknameRow
                    displayName={profile?.display_name || ''}
                    email={user.email}
                    language={language}
                    onSaved={refresh}
                  />
                  {/* 等级徽章 */}
                  <div className="mt-2">
                    <LevelBadge
                      level={levelInfo.level}
                      nameZh={levelInfo.nameZh}
                      nameEn={levelInfo.nameEn}
                      language={language}
                      icon={levelInfo.icon}
                    />
                  </div>
                </div>
              </div>

              {/* XP 进度条 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="font-semibold text-stone-700">{xpState.totalXP}</span>
                    <span>XP</span>
                  </span>
                  <span>
                    {language === 'zh' ? '下一级' : 'Next'} · {levelProgress.nextLevelMinXp} XP
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-400">
                  <span>{levelProgress.currentLevelMinXp} XP</span>
                  <span className="font-semibold text-emerald-600">
                    {levelProgress.progressPercent.toFixed(0)}%
                  </span>
                  <span>{levelProgress.nextLevelMinXp} XP</span>
                </div>
              </div>

              {/* 数据小条 */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-1 text-orange-500 mb-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-base font-bold text-stone-800">{xpState.streak}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 leading-tight">
                    {language === 'zh' ? '连击天数' : 'Streak'}
                  </div>
                </div>
                <div className="flex flex-col items-center text-center border-x border-stone-100">
                  <div className="flex items-center gap-1 text-amber-500 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-base font-bold text-stone-800">+{xpState.dailyXP}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 leading-tight">
                    {language === 'zh' ? '今日 XP' : 'Today'}
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-1 text-emerald-500 mb-0.5">
                    <Award className="w-3.5 h-3.5" />
                    <span className="text-base font-bold text-stone-800">{levelInfo.level}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 leading-tight">
                    {language === 'zh' ? '等级' : 'Level'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 未登录态 */
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center flex-shrink-0">
                  <CircleUserRound className="w-7 h-7 sm:w-8 sm:h-8 text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-stone-800">
                    {language === 'zh' ? '尚未加入' : 'Not signed in'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 leading-snug mt-0.5">
                    {language === 'zh'
                      ? '登录后可在云端同步你的等级、词条与连击'
                      : 'Sign in to sync level, words and streak'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {language === 'zh' ? '登录' : 'Sign in'}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition-all"
                >
                  {language === 'zh' ? '注册' : 'Register'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ─── 快速入口（4 块）─── */}
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
            <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-emerald-500 to-amber-500" />
            {language === 'zh' ? '探索' : 'Explore'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <QuickEntry
              href="/acknowledgements"
              icon={Heart}
              titleZh="鸣谢"
              titleEn="Credits"
              descZh="致敬贡献者"
              descEn="Contributors"
              color="bg-rose-50 text-rose-600"
              language={language}
            />
            <QuickEntry
              href="/leaderboard"
              icon={Trophy}
              titleZh="排行榜"
              titleEn="Ranking"
              descZh="查看学习排名"
              descEn="Top learners"
              color="bg-amber-50 text-amber-600"
              language={language}
            />
            <QuickEntry
              href="/corpus"
              icon={Bookmark}
              titleZh="我的词库"
              titleEn="My Words"
              descZh="浏览已学词条"
              descEn="Browse words"
              color="bg-emerald-50 text-emerald-600"
              language={language}
            />
            <QuickEntry
              href="/wisdom"
              icon={Sparkles}
              titleZh="智慧语录"
              titleEn="Wisdom"
              descZh="每日蒙古智慧"
              descEn="Daily wisdom"
              color="bg-sky-50 text-sky-600"
              language={language}
            />
          </div>
        </div>

        {/* ─── 用户反馈（提交 + 待解决）─── */}
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
            <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-emerald-500 to-sky-500" />
            {language === 'zh' ? '用户反馈' : 'Feedback'}
          </h2>
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="group w-full flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50 rounded-2xl border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <MessageSquareText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold text-stone-800 leading-tight">
                {language === 'zh' ? '用户反馈' : 'User Feedback'}
              </div>
              <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                {language === 'zh'
                  ? '提交建议 · 查看待解决反馈'
                  : 'Submit ideas · view open feedback'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* ─── 管理区（admin only）─── */}
        {isAdmin && (
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
              <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
              {language === 'zh' ? '管理' : 'Admin'}
            </h2>
            <Link
              href="/admin"
              className="group flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-2xl border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-stone-800 leading-tight">
                  {language === 'zh' ? '管理后台' : 'Admin Console'}
                </div>
                <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                  {language === 'zh' ? '词条 · 智慧 · 用户 · XP' : 'Words · Wisdom · Users · XP'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* ─── 账户区 ─── */}
        {isLoggedIn && (
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
              <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-stone-400 to-stone-500" />
              {language === 'zh' ? '账户' : 'Account'}
            </h2>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-3 sm:p-4 bg-white rounded-2xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-stone-800 leading-tight">
                  {language === 'zh' ? '退出登录' : 'Sign out'}
                </div>
                <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                  {language === 'zh' ? '从云端登出，本地进度保留' : 'Sign out · local progress kept'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
            </button>
          </div>
        )}

        {/* 底部云纹装饰 */}
        <div className="text-center pt-4 pb-2">
          <div className="inline-block text-stone-300 text-2xl select-none" aria-hidden>
            ☁ ༄ ☁
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {language === 'zh' ? '愿风带去你的问候' : 'May the wind carry your greetings'}
          </p>
        </div>
      </div>

      {/* 反馈弹窗 */}
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

export default MePage;
