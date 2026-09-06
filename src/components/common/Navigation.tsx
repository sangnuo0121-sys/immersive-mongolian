'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import {
  BookOpen,
  Library,
  Tent,
  Home,
  User,
  Flame,
  Zap,
  Heart,
  ChevronRight,
  Sparkles,
  Shield,
  ScrollText,
} from 'lucide-react';

type NavMeta = {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  labelKey: 'home' | 'learn' | 'corpus' | 'wisdom' | 'me';
  /** 顶部小标签，章节用 */
  section: { zh: string; en: string; mn: string };
  /** 中文菜单名 */
  zh: string;
  /** 英文菜单名 */
  en: string;
  /** 蒙古文副标（菜单项下小字） */
  mn: string;
  /** 移动端底部导航用的短中文（≤2 字） */
  shortZh: string;
  /** 移动端底部导航用的短英文 */
  shortEn: string;
  /** 激活态强调色（哈达渐变） */
  accent: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';
};

const navItems: NavMeta[] = [
  {
    href: '/',
    icon: Home,
    labelKey: 'home',
    section: { zh: '起点', en: 'Origin', mn: 'ᠦᠯᠤᠰ' },
    zh: '首页',
    en: 'Home',
    mn: 'ᠦᠯᠤᠰ',
    shortZh: '首页',
    shortEn: 'Home',
    accent: 'emerald',
  },
  {
    href: '/learn',
    icon: BookOpen,
    labelKey: 'learn',
    section: { zh: '学问', en: 'Study', mn: 'ᠰᠤᠷᠭᠠᠭᠠᠨ' },
    zh: '学习中心',
    en: 'Learning',
    mn: 'ᠰᠤᠷᠭᠠᠭᠠᠨ',
    shortZh: '学习',
    shortEn: 'Learn',
    accent: 'sky',
  },
  {
    href: '/corpus',
    icon: Library,
    labelKey: 'corpus',
    section: { zh: '卷宗', en: 'Archive', mn: 'ᠪᠢᠴᠢᠭ' },
    zh: '词库中心',
    en: 'Archive',
    mn: 'ᠪᠢᠴᠢᠭ',
    shortZh: '词库',
    shortEn: 'Corpus',
    accent: 'amber',
  },
  {
    href: '/wisdom',
    icon: Tent,
    labelKey: 'wisdom',
    section: { zh: '经卷', en: 'Wisdom', mn: '' },
    zh: '文化中心',
    en: 'Culture',
    mn: '',
    shortZh: '文化',
    shortEn: 'Culture',
    accent: 'rose',
  },
  {
    href: '/me',
    icon: User,
    labelKey: 'me',
    section: { zh: '行旅', en: 'Journey', mn: 'ᠮᠡᠷᠭᠡᠯ' },
    zh: '我的',
    en: 'Profile',
    mn: 'ᠮᠡᠷᠭᠡᠯ',
    shortZh: '我的',
    shortEn: 'Me',
    accent: 'violet',
  },
];

/* ============================================================
 * BottomNav（移动端底部导航，保留原样）
 * ============================================================ */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-amber-200/60 lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
                ${isActive
                  ? 'text-[#2F5D62] bg-amber-100/60'
                  : 'text-stone-400 hover:text-[#2F5D62]'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : ''}`} />
              <span className="text-[11px] font-medium tracking-wide">
                {t(item.shortZh, item.shortEn)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================
 * 蒙古文化装饰组件
 * ============================================================ */
function KhataRibbon({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-[3px] w-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #C8A661 18%, #E5C988 50%, #C8A661 82%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
}

function FeltBackground() {
  return (
    <>
      {/* 奶白毡毯底色 + 极淡织线 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #FAF7F0 0%, #F5F0E4 100%)',
        }}
      />
      {/* 极淡的横线纹（毡毯织线） */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #3D2E1F 0px, #3D2E1F 1px, transparent 1px, transparent 4px)',
        }}
      />
      {/* 顶部双光晕（哈达金 + 草原青） */}
      <div
        className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #C8A661 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-40 opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, #2F5D62 0%, transparent 60%)',
        }}
      />
    </>
  );
}

function YurtMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      {/* 金色外环 */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, #C8A661, #E5C988, #C8A661, #A88B4D, #C8A661)',
          padding: 2,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'linear-gradient(135deg, #2F5D62 0%, #1F4043 100%)',
          }}
        />
      </div>
      {/* 蒙古文 ᠮᠣ 字符 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-amber-200 font-bold"
          style={{
            writingMode: 'vertical-rl',
            fontSize: size * 0.42,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          ᠮᠣ
        </span>
      </div>
      {/* 顶部小金点（哈达结） */}
      <div
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-300"
        style={{ boxShadow: '0 0 4px rgba(232,201,136,0.8)' }}
      />
    </div>
  );
}

function AccentConfig(accent: NavMeta['accent']) {
  const map = {
    emerald: { from: '#2F5D62', to: '#1F4043', light: '#7BA8A6', glow: 'rgba(47,93,98,0.15)' },
    sky: { from: '#3B7BA9', to: '#1F5478', light: '#7FB0D1', glow: 'rgba(59,123,169,0.15)' },
    amber: { from: '#A88B4D', to: '#7A6332', light: '#D4B574', glow: 'rgba(168,139,77,0.15)' },
    rose: { from: '#A64B2A', to: '#7A3318', light: '#D4836A', glow: 'rgba(166,75,42,0.15)' },
    violet: { from: '#5B4A7C', to: '#3D2E5A', light: '#9384B5', glow: 'rgba(91,74,124,0.15)' },
  } as const;
  return map[accent];
}

/* ============================================================
 * Sidebar（桌面端侧边栏，蒙古文化主题重写）
 * ============================================================ */
export function Sidebar() {
  const pathname = usePathname();
  const { t, xpState, getLevelProgress, getLevelTitleInfo, language } = useApp();
  const { isLoggedIn, isAdmin, user, profile } = useAuth();
  const progress = getLevelProgress();
  const levelTitle = getLevelTitleInfo(xpState.level);
  const displayName =
    (profile?.display_name as string | undefined) ||
    user?.email ||
    '';
  const userInitial = (displayName[0] || '?').toUpperCase();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] flex-col overflow-hidden border-r border-amber-200/50 shadow-[2px_0_20px_-8px_rgba(0,0,0,0.08)] z-30">
      <FeltBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* ── 顶部哈达丝带 ── */}
        <KhataRibbon />

        {/* ── Logo 区 ── */}
        <div className="px-4 pt-4 pb-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <YurtMark size={44} />
            <div className="min-w-0 flex-1">
              <h1
                className="font-bold text-[13px] leading-tight truncate"
                style={{ color: '#3D2E1F' }}
              >
                {t('沉浸式学蒙古语', 'Immersive Mongolian')}
              </h1>
              <p
                className="text-[10px] mt-0.5 truncate"
                style={{ color: '#A88B4D' }}
              >
                {t('探索草原文化', 'Steppe Culture')}
              </p>
            </div>
          </Link>
        </div>

        {/* ── 金色分隔线 ── */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

        {/* ── 用户档案区 / 未登录引导 ── */}
        <div className="px-3 py-3">
          {isLoggedIn ? (
            <UserCard
              userInitial={userInitial}
              level={xpState.level}
              levelNameZh={levelTitle.nameZh}
              levelNameEn={levelTitle.nameEn}
              icon={levelTitle.icon}
              isAdmin={isAdmin}
              progress={progress.progress}
              current={progress.current}
              needed={progress.needed}
              t={t}
              language={language}
            />
          ) : (
            <GuestCard t={t} />
          )}
        </div>

        {/* ── 章节小标 ── */}
        <div className="px-4 pt-0.5 pb-1.5 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-amber-300/40 to-transparent" />
          <span
            className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: '#A88B4D' }}
          >
            {t('章节', 'Sections')}
          </span>
        </div>

        {/* ── 导航区 ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const acc = AccentConfig(item.accent);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl
                      transition-all duration-200 group
                      ${isActive
                        ? 'bg-gradient-to-r from-amber-50 to-amber-50/40 shadow-sm'
                        : 'hover:bg-amber-50/40'
                      }
                    `}
                  >
                    {/* 左侧金边（选中态） */}
                    <div
                      className={`
                        absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full
                        transition-all duration-200
                        ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}
                      `}
                      style={{
                        background: `linear-gradient(180deg, ${acc.from}, ${acc.to})`,
                        boxShadow: isActive ? `0 0 8px ${acc.glow}` : 'none',
                      }}
                    />
                    {/* 图标容器 */}
                    <div
                      className={`
                        relative shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                        transition-all duration-200
                      `}
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${acc.from}, ${acc.to})`
                          : 'rgba(168, 139, 77, 0.08)',
                        boxShadow: isActive ? `0 2px 8px ${acc.glow}` : 'none',
                      }}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-stone-500'}`}
                        strokeWidth={isActive ? 2.4 : 2}
                      />
                    </div>
                    {/* 文字 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-[12px] font-semibold truncate ${isActive ? '' : 'text-stone-700'}`}
                          style={isActive ? { color: acc.from } : {}}
                        >
                          {t(item.zh, item.en)}
                        </span>
                        {isActive && (
                          <ChevronRight
                            className="w-3 h-3 shrink-0"
                            style={{ color: acc.from }}
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <div
                        className="text-[9px] truncate mt-0.5"
                        style={{ color: '#A88B4D', opacity: 0.75 }}
                      >
                        {t(item.section.zh, item.section.en)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── 统计区 ── */}
        <div className="px-3 py-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div
              className="relative p-2 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(166,75,42,0.08), rgba(166,75,42,0.02))',
                border: '1px solid rgba(166,75,42,0.2)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Flame
                  className="w-3 h-3"
                  style={{ color: xpState.streak > 0 ? '#A64B2A' : '#9CA3AF' }}
                  fill={xpState.streak > 0 ? '#A64B2A' : 'none'}
                />
                <span
                  className="text-base font-bold leading-none"
                  style={{ color: xpState.streak > 0 ? '#A64B2A' : '#6B7280' }}
                >
                  {xpState.streak}
                </span>
                {xpState.streak > 0 && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-steppe-pulse"
                    style={{
                      background: '#A64B2A',
                      boxShadow: '0 0 6px #A64B2A',
                    }}
                  />
                )}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                {t('连续', 'Streak')}
              </div>
            </div>
            <div
              className="relative p-2 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(168,139,77,0.12), rgba(168,139,77,0.04))',
                border: '1px solid rgba(168,139,77,0.25)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" style={{ color: '#A88B4D' }} fill="#C8A661" />
                <span
                  className="text-base font-bold leading-none"
                  style={{ color: '#7A6332' }}
                >
                  {xpState.totalXP}
                </span>
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                {t('总经验', 'Total XP')}
              </div>
            </div>
          </div>
        </div>

        {/* ── 底部：金线 + 鸣谢 + 文化宣言 ── */}
        <KhataRibbon />
        <div className="px-3 py-2.5 flex flex-col gap-1.5">
          <Link
            href="/acknowledgements"
            className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-rose-600 transition-colors group"
          >
            <Heart
              className="w-3 h-3 group-hover:fill-rose-500 group-hover:scale-110 transition-all"
              style={{ color: '#A64B2A' }}
            />
            <span>{t('特别鸣谢', 'Acknowledgements')}</span>
          </Link>
          <div
            className="flex items-center gap-1.5 text-[9px]"
            style={{ color: '#A88B4D', opacity: 0.6 }}
          >
            <ScrollText className="w-2.5 h-2.5" />
            <span className="truncate">
              {t('千年文化，数字永续', 'Living Archive')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
 * UserCard（已登录用户卡）
 * ============================================================ */
function UserCard({
  userInitial,
  level,
  levelNameZh,
  levelNameEn,
  icon,
  isAdmin,
  progress,
  current,
  needed,
  t,
  language,
}: {
  userInitial: string;
  level: number;
  levelNameZh: string;
  levelNameEn: string;
  icon: string;
  isAdmin: boolean;
  progress: number;
  current: number;
  needed: number;
  t: (zh: string, en: string) => string;
  language: 'zh' | 'en';
}) {
  return (
    <div
      className="relative p-2.5 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(47,93,98,0.05), rgba(168,139,77,0.08))',
        border: '1px solid rgba(168,139,77,0.2)',
      }}
    >
      {/* 角部小金点装饰 */}
      <div
        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
        style={{ boxShadow: '0 0 4px #C8A661' }}
      />

      <div className="flex items-center gap-2 mb-2">
        {/* 头像 */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{
            background: 'linear-gradient(135deg, #2F5D62 0%, #1F4043 100%)',
            boxShadow: '0 2px 6px rgba(47,93,98,0.3)',
          }}
        >
          {userInitial}
        </div>
        {/* 等级 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm shrink-0">{icon}</span>
            <span
              className="text-[12px] font-bold leading-tight truncate"
              style={{ color: '#3D2E1F' }}
            >
              Lv.{level}{' '}
              {language === 'zh' ? levelNameZh : levelNameEn}
            </span>
            {isAdmin && (
              <span
                className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #C8A661, #A88B4D)',
                  color: 'white',
                }}
              >
                <Shield className="w-2 h-2 mr-0.5" />
                ADM
              </span>
            )}
          </div>
          <div
            className="text-[9px] mt-0.5 truncate"
            style={{ color: '#A88B4D' }}
          >
            {language === 'zh' ? levelNameEn : levelNameZh}
          </div>
        </div>
      </div>

      {/* 哈达风格 XP 进度条 */}
      <div className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(168,139,77,0.12)' }}
      >
        {/* 进度填充 */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(progress * 100, 0)}%`,
            background: 'linear-gradient(90deg, #C8A661 0%, #E5C988 50%, #C8A661 100%)',
            boxShadow: '0 0 6px rgba(200,166,97,0.4)',
          }}
        />
        {/* 哈达丝带高光 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'khataShine 3s linear infinite',
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px]" style={{ color: '#7A6332' }}>
          <Sparkles className="w-2.5 h-2.5 inline mr-0.5" style={{ color: '#C8A661' }} />
          {current}/{needed}
        </span>
        <span className="text-[9px]" style={{ color: '#A88B4D' }}>
          {t('到升级', 'next')}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
 * GuestCard（未登录引导）
 * ============================================================ */
function GuestCard({ t }: { t: (zh: string, en: string) => string }) {
  return (
    <div
      className="relative p-2.5 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(168,139,77,0.08), rgba(47,93,98,0.05))',
        border: '1px solid rgba(168,139,77,0.25)',
      }}
    >
      {/* 装饰角 */}
      <div
        className="absolute top-0 right-0 w-12 h-12 opacity-10"
        style={{
          background: 'radial-gradient(circle at top right, #C8A661, transparent 70%)',
        }}
      />

      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #2F5D62, #1F4043)',
            boxShadow: '0 2px 8px rgba(47,93,98,0.3)',
          }}
        >
          <Tent className="w-4 h-4 text-amber-200" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12px] font-bold leading-tight"
            style={{ color: '#3D2E1F' }}
          >
            {t('欢迎来到草原', 'Welcome')}
          </div>
          <div
            className="text-[9px] mt-0.5"
            style={{ color: '#A88B4D' }}
          >
            {t('登录开启学习之旅', 'Sign in to begin')}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2.5">
        <Link
          href="/login"
          className="flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, #2F5D62, #1F4043)',
            color: 'white',
            boxShadow: '0 2px 6px rgba(47,93,98,0.25)',
          }}
        >
          {t('登录', 'Sign in')}
        </Link>
        <Link
          href="/register"
          className="flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition-all border"
          style={{
            background: 'rgba(255,255,255,0.5)',
            color: '#2F5D62',
            borderColor: 'rgba(47,93,98,0.3)',
          }}
        >
          {t('注册', 'Register')}
        </Link>
      </div>
    </div>
  );
}
