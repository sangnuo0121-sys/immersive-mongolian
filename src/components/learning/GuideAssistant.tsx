'use client';

/**
 * 草原向导（Steppe Guide）—— 轻量级浮动助手
 *
 * 职责：
 *   1. 首次访问自动触发 4 步 Onboarding Tour
 *   2. 右下角常驻悬浮按钮（蒙古包 Tent 图标 + 哈达金边）
 *   3. 点开后弹出 320×480 面板：
 *      - 顶部：智能推荐卡片（基于规则引擎）
 *      - 中部：速查表（学习 / 文化 / 我的 三列）
 *      - 底部：进度小条（等级 / XP / 连续）
 *      - 页脚：重新显示引导 / 收起助手
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Tent,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Check,
  Megaphone,
} from 'lucide-react';
import {
  getRecommendation,
  getQuickLinks,
  type Recommendation,
  type GuideContext,
} from '@/lib/guide-rules';

const STORAGE_KEYS = {
  seenOnboarding: 'mongolian-guide-onboarding-seen',
  lastVisit: 'mongolian-guide-last-visit',
  visitedAlphabet: 'mongolian-guide-visited-alphabet',
  panelCollapsed: 'mongolian-guide-panel-collapsed',
  position: 'mongolian-guide-position-v2',
  legacyPosition: 'mongolian-guide-position',
};

// 浮动按钮尺寸
const BTN_SIZE = 56; // w-14 h-14
const SAFE_MARGIN = 12; // 距屏幕边最小距离
const DRAG_THRESHOLD = 5; // 像素，区分点击与拖动
// 移动端 BottomNav 占位高度（py-2 容器 + 图标/文字），再加视觉缓冲
const MOBILE_BOTTOM_NAV_HEIGHT = 104;
// Tailwind lg 断点，BottomNav 在此宽度以下展示
const MOBILE_BREAKPOINT = 1024;

const TONE_STYLES: Record<Recommendation['tone'], { bg: string; ring: string; cta: string; glow: string }> = {
  khata: {
    bg: 'from-sky-50 via-white to-sky-50',
    ring: 'ring-sky-200',
    cta: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-sky-200',
    glow: 'shadow-[0_0_24px_-4px_rgba(14,165,233,0.35)]',
  },
  steppe: {
    bg: 'from-emerald-50 via-white to-emerald-50',
    ring: 'ring-emerald-200',
    cta: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-200',
    glow: 'shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]',
  },
  gold: {
    bg: 'from-amber-50 via-white to-amber-50',
    ring: 'ring-amber-200',
    cta: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-200',
    glow: 'shadow-[0_0_24px_-4px_rgba(245,158,11,0.4)]',
  },
  suld: {
    bg: 'from-yellow-50 via-white to-yellow-50',
    ring: 'ring-yellow-300',
    cta: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-yellow-200',
    glow: 'shadow-[0_0_24px_-4px_rgba(234,179,8,0.4)]',
  },
  ember: {
    bg: 'from-orange-50 via-white to-rose-50',
    ring: 'ring-orange-200',
    cta: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-orange-200',
    glow: 'shadow-[0_0_24px_-4px_rgba(249,115,22,0.35)]',
  },
};

// ============================================================
// Onboarding Tour（4 步）
// ============================================================
type TourStep = {
  icon: React.ReactNode;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  cta?: { label: { zh: string; en: string }; href: string };
};

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Tent className="w-12 h-12" />,
    title: { zh: '欢迎来到草原', en: 'Welcome to the steppe' },
    description: {
      zh: '沉浸式学蒙古语，从字母到长调。让我带你 5 步走完。',
      en: 'Immersive Mongolian — from alphabet to long song. 5 steps to start.',
    },
  },
  {
    icon: <Megaphone className="w-12 h-12" />,
    title: { zh: '看看管理员公告', en: 'Check announcements' },
    description: {
      zh: '首页的"草原号角"会发布新词、活动、系统更新。进来第一件事先扫一眼。',
      en: 'The "Steppe Horn" on the home page shares new words, events and updates. Glance at it first.',
    },
    cta: { label: { zh: '去看公告', en: 'View announcements' }, href: '/' },
  },
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: { zh: '先认识蒙古文字', en: 'Meet the script' },
    description: {
      zh: '竖写、右起。22 个字母 + 7 个元音，是一切的基础。',
      en: 'Vertical, right-to-left. 22 letters + 7 vowels is the foundation.',
    },
    cta: { label: { zh: '去看字母', en: 'See alphabet' }, href: '/alphabet' },
  },
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: { zh: '每日学习', en: 'Daily learning' },
    description: {
      zh: '每天 10 个词 + 1 段听力 + 1 次复习，完成 +20 XP。',
      en: '10 words + 1 listening + 1 review daily, +20 XP.',
    },
    cta: { label: { zh: '打开今日', en: "Open today" }, href: '/learn/daily' },
  },
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: { zh: '文化三宝', en: 'Three cultural treasures' },
    description: {
      zh: '马头琴 / 长调 / 呼麦——声音档案里有一手录音。',
      en: 'Morin Khuur / Long Song / Khoomei — real recordings await.',
    },
    cta: { label: { zh: '去文化中心', en: 'Open culture' }, href: '/wisdom' },
  },
];

function OnboardingTour({
  open,
  onClose,
  language,
}: {
  open: boolean;
  onClose: () => void;
  language: 'zh' | 'en';
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  // 重置
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !step) return null;

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-[fadeIn_0.3s_ease-out]"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden bg-white shadow-2xl animate-[tourIn_0.4s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部哈达飘带装饰 */}
        <div className="h-2 bg-gradient-to-r from-sky-400 via-white to-sky-400" />
        <div className="h-1 bg-gradient-to-r from-sky-200 via-amber-200 to-sky-200" />

        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 内容 */}
        <div className="px-8 pt-10 pb-6 text-center">
          {/* 步骤指示 */}
          <div className="inline-flex items-center gap-1.5 mb-6 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
            <span className="text-amber-600">●</span>
            <span>
              {t('第', 'Step')} {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>

          {/* 图标 */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-100 ring-2 ring-amber-200/60 flex items-center justify-center text-sky-700 mb-5 shadow-inner">
            {step.icon}
          </div>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            {t(step.title.zh, step.title.en)}
          </h2>

          {/* 描述 */}
          <p className="text-sm leading-relaxed text-slate-600 mb-6 max-w-sm mx-auto">
            {t(step.description.zh, step.description.en)}
          </p>

          {/* CTA 跳转按钮（可选） */}
          {step.cta && !isLast && (
            <Link
              href={step.cta.href}
              onClick={() => {
                localStorage.setItem(STORAGE_KEYS.visitedAlphabet, 'true');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 transition-colors mb-4"
            >
              {t(step.cta.label.zh, step.cta.label.en)}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* 底部：进度点 + 操作 */}
        <div className="px-6 pb-6">
          {/* 进度点 */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? 'w-8 bg-gradient-to-r from-amber-400 to-amber-500'
                    : i < stepIndex
                    ? 'w-1.5 bg-emerald-400'
                    : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('上一步', 'Back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className={`flex-[2] h-11 rounded-xl bg-gradient-to-r ${
                isLast
                  ? 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                  : 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
              } text-white font-medium text-sm flex items-center justify-center gap-1 transition-colors shadow-md`}
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('开始学习', 'Start learning')}
                </>
              ) : (
                <>
                  {t('下一步', 'Next')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GuideAssistant 主组件
// ============================================================
export function GuideAssistant() {
  const { t, language, xpState, themes, getLevelProgress, getLevelTitleInfo, words } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [hasVisitedAlphabet, setHasVisitedAlphabet] = useState(false);
  const [lastVisitAt, setLastVisitAt] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasNewBadge, setHasNewBadge] = useState(false);
  // 拖动位置：相对视口左上角 (px)，null 表示使用默认（右下角）
  const [committedPos, setCommittedPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const pathname = usePathname();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startPointer: { x: number; y: number } | null;
    startContainer: { x: number; y: number } | null;
    pointerId: number | null;
  }>({
    isDragging: false,
    startPointer: null,
    startContainer: null,
    pointerId: null,
  });

  // 仅在客户端读取 localStorage + 写入访问时间戳
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMounted(true);

    const last = localStorage.getItem(STORAGE_KEYS.lastVisit);
    if (last) {
      const ts = Number(last);
      if (Number.isFinite(ts)) setLastVisitAt(ts);
    }
    // 写入本次访问时间
    localStorage.setItem(STORAGE_KEYS.lastVisit, String(Date.now()));

    const visited = localStorage.getItem(STORAGE_KEYS.visitedAlphabet) === 'true';
    setHasVisitedAlphabet(visited);

    // 读取保存的浮动按钮位置（v2 key；若有旧 key 残留则清理掉，让默认位置生效）
    if (localStorage.getItem(STORAGE_KEYS.legacyPosition)) {
      localStorage.removeItem(STORAGE_KEYS.legacyPosition);
    }
    const savedPos = localStorage.getItem(STORAGE_KEYS.position);
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (
          parsed &&
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          Number.isFinite(parsed.x) &&
          Number.isFinite(parsed.y)
        ) {
          // 重新校准到当前视口（防止屏幕尺寸变化导致越界）
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const clampedX = Math.max(SAFE_MARGIN, Math.min(parsed.x, vw - BTN_SIZE - SAFE_MARGIN));
          const clampedY = Math.max(SAFE_MARGIN, Math.min(parsed.y, vh - BTN_SIZE - SAFE_MARGIN));
          setCommittedPos({ x: clampedX, y: clampedY });
        }
      } catch {
        // 忽略损坏数据
      }
    }

    // 首次访问 → 触发引导
    const seen = localStorage.getItem(STORAGE_KEYS.seenOnboarding);
    if (!seen) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // 窗口尺寸变化时重定位（防止按钮越界）
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted || !committedPos) return;
    const handleResize = () => {
      setCommittedPos((pos) => {
        if (!pos) return pos;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newX = Math.max(SAFE_MARGIN, Math.min(pos.x, vw - BTN_SIZE - SAFE_MARGIN));
        const newY = Math.max(SAFE_MARGIN, Math.min(pos.y, vh - BTN_SIZE - SAFE_MARGIN));
        if (newX !== pos.x || newY !== pos.y) {
          const newPos = { x: newX, y: newY };
          localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(newPos));
          return newPos;
        }
        return pos;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted, committedPos]);

  // 访问 /alphabet → 标记已访问
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname === '/alphabet') {
      localStorage.setItem(STORAGE_KEYS.visitedAlphabet, 'true');
      setHasVisitedAlphabet(true);
    }
  }, [pathname]);

  // 引导完成
  const closeTour = useCallback(() => {
    setShowTour(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.seenOnboarding, String(Date.now()));
    }
  }, []);

  // 重新显示引导
  const restartTour = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.seenOnboarding);
    }
    setShowTour(true);
  }, []);

  // 重置按钮位置到默认（双击触发）
  const resetButtonPosition = useCallback(() => {
    setCommittedPos(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.position);
    }
  }, []);

  // 计算默认位置（屏幕右下角，含安全区）
  const computeDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 尝试读取 env(safe-area-inset-bottom)，读取失败时使用 0
    let safeBottom = 0;
    let safeRight = 0;
    try {
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.bottom = 'env(safe-area-inset-bottom)';
      probe.style.right = 'env(safe-area-inset-right)';
      probe.style.width = '0';
      probe.style.height = '0';
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe);
      safeBottom = parseFloat(computed.bottom) || 0;
      safeRight = parseFloat(computed.right) || 0;
      document.body.removeChild(probe);
    } catch {
      // ignore
    }
    const x = Math.max(SAFE_MARGIN, vw - BTN_SIZE - 16 - safeRight);
    // 移动端：默认位置抬高到底部导航上方，避免遮挡 BottomNav 中的"我的"
    const bottomOffset =
      vw < MOBILE_BREAKPOINT ? MOBILE_BOTTOM_NAV_HEIGHT + 28 : 16;
    const y = Math.max(SAFE_MARGIN, vh - BTN_SIZE - bottomOffset - safeBottom);
    return { x, y };
  }, []);

  // 拖动开始：在按钮 onPointerDown 中调用
  const handleButtonPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (showTour) return; // 引导期间禁用拖动
      // 仅响应主指针（避免多指/鼠标副键误触）
      if (!e.isPrimary) return;
      const container = containerRef.current;
      if (!container) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // 部分环境下 setPointerCapture 失败不阻塞流程
      }
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      dragRef.current = {
        isDragging: false,
        startPointer: { x: e.clientX, y: e.clientY },
        startContainer: { x: rect.left, y: rect.top },
        pointerId: e.pointerId,
      };
      setIsPressed(true);
    },
    [showTour]
  );

  // 拖动 + 结束：通过 window 监听（在 isDragging/isPressed 时挂载）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPressed) return;

    const handlePointerMove = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state.startPointer || !state.startContainer) return;
      const dx = e.clientX - state.startPointer.x;
      const dy = e.clientY - state.startPointer.y;
      // 超过阈值才进入拖动
      if (!state.isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        state.isDragging = true;
        setIsDragging(true);
        // 拖动时关闭面板（避免拖动过程中面板错位）
        setIsOpen(false);
        // 拖动时禁用过渡（更跟手）
        if (containerRef.current) {
          containerRef.current.style.transition = 'none';
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }
      }
      if (state.isDragging) {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newX = state.startContainer.x + dx;
        const newY = state.startContainer.y + dy;
        const clampedX = Math.max(SAFE_MARGIN, Math.min(newX, vw - BTN_SIZE - SAFE_MARGIN));
        const clampedY = Math.max(SAFE_MARGIN, Math.min(newY, vh - BTN_SIZE - SAFE_MARGIN));
        el.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state.startPointer) return;
      try {
        if (state.pointerId !== null) {
          (e.target as Element).releasePointerCapture?.(state.pointerId);
        }
      } catch {
        // ignore
      }
      if (state.isDragging && containerRef.current) {
        // 松手：水平贴边 + 持久化
        const rect = containerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const centerX = rect.left + BTN_SIZE / 2;
        const snappedX = centerX < vw / 2 ? SAFE_MARGIN : vw - BTN_SIZE - SAFE_MARGIN;
        const snappedY = Math.max(
          SAFE_MARGIN,
          Math.min(rect.top, window.innerHeight - BTN_SIZE - SAFE_MARGIN)
        );
        const newPos = { x: snappedX, y: snappedY };
        setCommittedPos(newPos);
        localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(newPos));
        // 恢复过渡，让贴边动画更顺滑
        containerRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0)`;
        containerRef.current.style.transition = '';
      } else {
        // 未触发拖动 → 恢复 transform 状态
        if (containerRef.current && committedPos) {
          containerRef.current.style.transform = `translate3d(${committedPos.x}px, ${committedPos.y}px, 0)`;
        }
      }
      // 清理
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setIsPressed(false);
      setIsDragging(false);
      dragRef.current = {
        isDragging: false,
        startPointer: null,
        startContainer: null,
        pointerId: null,
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isPressed, committedPos]);

  // 双击按钮 → 重置位置到默认
  const handleButtonDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      resetButtonPosition();
    },
    [resetButtonPosition]
  );

  // 单击按钮：仅在未发生拖动时切换面板
  const handleButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // 拖动期间屏蔽点击
      if (dragRef.current.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setIsOpen((o) => !o);
    },
    []
  );

  // 计算上下文
  const ctx: GuideContext = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastStudy = xpState.lastStudyDate?.slice(0, 10);
    const hasCompletedDaily = !!lastStudy && lastStudy === today;

    let themesCompletedCount = 0;
    let hasUnfinishedTheme = false;
    themes.forEach((theme) => {
      const themeWords = words.filter((w) => w.theme === theme.id);
      if (themeWords.length === 0) return;
      // 简化判断：暂时使用"是否有用户词"作为粗略信号
      // 实际项目中应使用 getThemeLearnedCount
      const learned = words.filter((w) => w.theme === theme.id && w.id).length;
      if (learned >= themeWords.length) themesCompletedCount += 1;
      else hasUnfinishedTheme = true;
    });

    return {
      hasVisitedAlphabet,
      hasCompletedDaily,
      hasUnfinishedTheme,
      themesCompletedCount,
      themesTotalCount: themes.length,
      lastVisitAt,
      totalXP: xpState.totalXP,
      streak: xpState.streak,
      level: xpState.level,
      language: (language as 'zh' | 'en') || 'zh',
    };
  }, [hasVisitedAlphabet, lastVisitAt, themes, words, xpState, language]);

  const recommendation = useMemo(() => getRecommendation(ctx), [ctx]);
  const quickLinks = useMemo(() => getQuickLinks(), []);
  const levelProgress = useMemo(() => getLevelProgress(), [getLevelProgress]);
  const levelTitle = useMemo(
    () => getLevelTitleInfo(xpState.level),
    [getLevelTitleInfo, xpState.level]
  );

  // 关闭面板时清除红点
  useEffect(() => {
    if (isOpen) setHasNewBadge(false);
  }, [isOpen]);

  // 在 AI 导师页面、登录页、注册页、管理后台不显示助手（避免干扰）
  const hiddenRoutes = ['/login', '/register', '/admin'];
  const shouldHide = hiddenRoutes.some((r) => pathname?.startsWith(r));

  // 计算面板相对按钮的展开方向（避开屏幕边）
  const getPanelPlacement = useCallback(() => {
    if (typeof window === 'undefined') {
      return { vertical: 'bottom-[68px]', horizontal: 'right-0' };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 按钮当前位置（committedPos 或默认右下角）
    let btnLeft: number;
    let btnTop: number;
    if (committedPos) {
      btnLeft = committedPos.x;
      btnTop = committedPos.y;
    } else {
      btnLeft = Math.max(SAFE_MARGIN, vw - BTN_SIZE - 16);
      const bottomOffset =
        vw < MOBILE_BREAKPOINT ? MOBILE_BOTTOM_NAV_HEIGHT + 12 : 16;
      btnTop = Math.max(SAFE_MARGIN, vh - BTN_SIZE - bottomOffset);
    }
    const btnCenterX = btnLeft + BTN_SIZE / 2;
    const btnCenterY = btnTop + BTN_SIZE / 2;
    // 水平：按钮靠左 → 面板从按钮左侧展开（向左）
    //      按钮靠右 → 面板从按钮右侧展开（默认 right-0）
    const horizontal = btnCenterX < vw / 2 ? 'left-0' : 'right-0';
    // 垂直：按钮靠上 → 面板在按钮下方；按钮靠下 → 面板在按钮上方
    const vertical = btnCenterY < vh / 2 ? 'top-[72px]' : 'bottom-[72px]';
    return { vertical, horizontal };
  }, [committedPos]);

  // SSR 阶段或被隐藏时，不渲染
  if (!mounted || shouldHide) return null;

  const style = TONE_STYLES[recommendation.tone];
  const RecIcon = recommendation.icon;
  const panelPlacement = getPanelPlacement();

  // 计算容器 transform：committedPos 时用绝对值；否则用 CSS 变量占位
  const containerTransform = committedPos
    ? `translate3d(${committedPos.x}px, ${committedPos.y}px, 0)`
    : undefined;

  return (
    <>
      {/* Onboarding Tour */}
      <OnboardingTour open={showTour} onClose={closeTour} language={ctx.language} />

      {/* 助手容器 - 浮动按钮 + 面板 */}
      <div
        ref={containerRef}
        className={`fixed z-50 select-none touch-none ${
          isDragging ? 'cursor-grabbing' : isPressed ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          // 默认定位：右下角 + 安全区；保存位置后用 transform
          left: committedPos ? 0 : 'auto',
          top: committedPos ? 0 : 'auto',
          right: committedPos ? 'auto' : 'max(1rem, env(safe-area-inset-right))',
          bottom: committedPos ? 'auto' : 'max(1rem, env(safe-area-inset-bottom))',
          transform: containerTransform,
          transition: isDragging
            ? 'none'
            : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {/* 面板（展开时显示） */}
        {isOpen && (
          <div
            className={`absolute ${panelPlacement.vertical} ${panelPlacement.horizontal} w-[320px] sm:w-[340px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white ring-1 ${style.ring} overflow-hidden animate-[panelIn_0.35s_cubic-bezier(0.16,1,0.3,1)]`}
            style={{
              boxShadow:
                '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 4px 12px -2px rgba(15, 23, 42, 0.12)',
              maxHeight: 'min(560px, calc(100vh - 120px))',
            }}
            role="dialog"
            aria-label="草原向导"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* 哈达飘带头部 */}
            <div className="relative h-1.5 bg-gradient-to-r from-sky-400 via-white to-sky-400" />
            <div className="h-1 bg-gradient-to-r from-sky-200 via-amber-200 to-sky-200" />

            <div className="px-4 pt-3 pb-2 flex items-center justify-between bg-gradient-to-b from-sky-50/40 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-200 flex items-center justify-center shadow-sm">
                  <Tent className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 leading-none">
                    {t('草原向导', 'Steppe Guide')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {t('智能推荐 · 进度速览', 'Smart tips · Progress')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 可滚动主体 */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(560px - 56px - 60px)' }}>
              {/* 推荐卡片 */}
              <div className="px-4 pt-3">
                <div
                  className={`relative rounded-xl bg-gradient-to-br ${style.bg} ring-1 ${style.ring} p-3.5 overflow-hidden`}
                >
                  {/* 装饰：右上角 emoji */}
                  <div className="absolute -top-2 -right-2 text-3xl opacity-20 pointer-events-none select-none">
                    {recommendation.emoji}
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`shrink-0 w-9 h-9 rounded-lg bg-white/80 backdrop-blur ring-1 ${style.ring} flex items-center justify-center ${style.glow}`}
                    >
                      <RecIcon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        {t('今天建议你做', "Today's suggestion")}
                      </div>
                      <div className="text-sm font-bold text-slate-800 leading-tight mb-1">
                        {t(recommendation.title.zh, recommendation.title.en)}
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed mb-2.5">
                        {t(recommendation.description.zh, recommendation.description.en)}
                      </div>
                      <Link
                        href={recommendation.cta.href}
                        onClick={() => setIsOpen(false)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${style.cta}`}
                      >
                        {t(recommendation.cta.label.zh, recommendation.cta.label.en)}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 速查表 */}
              <div className="px-4 pt-4 pb-3">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {t('功能速查', 'Quick links')}
                </div>
                <div className="space-y-2.5">
                  {quickLinks.map((group) => (
                    <div key={group.group}>
                      <div className="text-[10px] text-slate-400 mb-1 px-1">
                        {t(group.group, group.group)}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {group.links.map((link) => {
                          const LIcon = link.icon;
                          return (
                            <Link
                              key={`${group.group}-${link.href}-${link.label.zh}`}
                              href={link.href}
                              onClick={(e) => {
                                if (link.href === '#restart-tour') {
                                  e.preventDefault();
                                  restartTour();
                                  return;
                                }
                                setIsOpen(false);
                              }}
                              className="group flex flex-col items-center gap-0.5 p-2 rounded-lg bg-slate-50 hover:bg-gradient-to-br hover:from-sky-50 hover:to-emerald-50 ring-1 ring-slate-200/60 hover:ring-sky-200 transition-all"
                            >
                              <LIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-600 transition-colors" />
                              <div className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 leading-tight">
                                {t(link.label.zh, link.label.en)}
                              </div>
                              <div className="text-[9px] text-slate-400 group-hover:text-slate-500 leading-tight">
                                {t(link.hint.zh, link.hint.en)}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部进度条 */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/60 backdrop-blur">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{levelTitle.icon}</span>
                  <span className="text-[11px] font-bold text-slate-700">
                    Lv.{xpState.level} {t(levelTitle.nameZh, levelTitle.nameEn)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  🔥 {xpState.streak} {t('连击', 'streak')}
                </div>
              </div>
              <div className="relative h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-700"
                  style={{ width: `${Math.round(levelProgress.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                <span>{xpState.totalXP} XP</span>
                <span>
                  {levelProgress.needed} → Lv.{xpState.level + 1}
                </span>
              </div>
            </div>

            {/* 页脚：重新显示引导 */}
            <div className="border-t border-slate-200/60 px-3 pt-2 pb-3 bg-slate-50/50">
              <button
                type="button"
                onClick={restartTour}
                className="w-full px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-900 rounded-md flex items-center justify-center gap-1.5 transition-all border border-sky-200/60 hover:border-sky-300 hover:shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('重新显示新手引导', 'Restart onboarding tour')}
              </button>
            </div>
          </div>
        )}

        {/* 浮动按钮（蒙古包 + 哈达金边）- 可拖动 */}
        <button
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={handleButtonClick}
          onDoubleClick={handleButtonDoubleClick}
          className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 ring-2 ring-amber-200 flex items-center justify-center text-white ${
            isDragging
              ? 'scale-110 ring-amber-300'
              : isOpen
              ? 'rotate-12'
              : 'animate-[tentBob_3s_ease-in-out_infinite] hover:scale-105 active:scale-95'
          }`}
          style={{
            boxShadow: isDragging
              ? '0 16px 32px -4px rgba(245, 158, 11, 0.6), 0 0 0 6px rgba(255, 255, 255, 0.7)'
              : isOpen
              ? '0 8px 24px -4px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.6)'
              : '0 8px 24px -4px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.6)',
            transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
            touchAction: 'none', // 防止移动端触摸时页面滚动
          }}
          aria-label={
            isDragging
              ? t('拖动中…松手贴边', 'Dragging…release to snap')
              : isOpen
              ? t('关闭草原向导', 'Close guide')
              : t('打开草原向导（可拖动）', 'Open guide (draggable)')
          }
          title={t('长按或拖动可移动位置 · 双击重置', 'Drag to move · Double-click to reset')}
        >
          {/* 哈达飘带（顶部小三角） */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-sky-400 rotate-45 origin-bottom pointer-events-none" />
          {isOpen ? (
            <X className="w-6 h-6 pointer-events-none" />
          ) : (
            <Tent className="w-6 h-6 pointer-events-none" strokeWidth={2.2} />
          )}

          {/* 红点提示 */}
          {!isOpen && hasNewBadge && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse pointer-events-none" />
          )}

          {/* 拖动中提示气泡：首次拖动时显示，提示双击重置 */}
          {isDragging && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-800/90 text-white text-[10px] font-medium whitespace-nowrap pointer-events-none animate-[fadeIn_0.15s_ease-out]">
              {t('松手贴边 · 双击重置', 'Release to snap · Double-click to reset')}
            </div>
          )}
        </button>
      </div>

      {/* 全局 keyframes 动画（用 style 标签内联） */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tourIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tentBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}
