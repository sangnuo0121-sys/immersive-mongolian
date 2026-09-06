"use client";

/**
 * XP Toast Host —— 蒙古文化主题 XP 获得提示
 *
 * 视觉：羊皮卷轴 + 蒙古文竖排 + 哈达金徽章 + 草原绿数字
 * 动效：顶部滑入 → 停留 3s → 淡出
 * 文案：根据 action 渲染对应的蒙古文化祝福
 *
 * 订阅 xp-toast-bus，AppContext.addXP 推入事件即弹出。
 */

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  subscribeXPToast,
  type XPToastItem,
  type XPAction,
} from '@/lib/xp-toast-bus';

/* ─────────────────────────────────────────────────────────────
 * 行为 → 蒙古文化祝福文案 + 图标 + 配色
 * ───────────────────────────────────────────────────────────── */
interface ActionCopy {
  zh: string;
  en: string;
  icon: string;
  // 配色：羊皮色（背景） + 卷轴色（边框） + 数字色
  bg: string;
  border: string;
  ring: string;
  digit: string;
}

const ACTION_COPY: Record<XPAction, ActionCopy> = {
  learn_word: {
    zh: '智慧之泉，源远流长',
    en: 'Wisdom flows from learning',
    icon: '📖',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-300',
    ring: 'ring-amber-200',
    digit: 'text-emerald-700',
  },
  listening: {
    zh: '风声入耳，语声入心',
    en: 'Wind in ears, words in heart',
    icon: '🎧',
    bg: 'from-sky-50 to-cyan-50',
    border: 'border-sky-300',
    ring: 'ring-sky-200',
    digit: 'text-sky-700',
  },
  review: {
    zh: '温故而知新',
    en: 'Review to discover anew',
    icon: '🔄',
    bg: 'from-stone-50 to-amber-50',
    border: 'border-stone-300',
    ring: 'ring-stone-200',
    digit: 'text-stone-700',
  },
  challenge: {
    zh: '骏马奔腾，无畏前行',
    en: 'Gallop like a steed',
    icon: '⚔️',
    bg: 'from-rose-50 to-orange-50',
    border: 'border-rose-300',
    ring: 'ring-rose-200',
    digit: 'text-rose-700',
  },
  word_challenge: {
    zh: '群狼之势，所向披靡',
    en: 'Wolf-pack prowess',
    icon: '🐺',
    bg: 'from-indigo-50 to-purple-50',
    border: 'border-indigo-300',
    ring: 'ring-indigo-200',
    digit: 'text-indigo-700',
  },
  daily_goal: {
    zh: '一日之功，草原增辉',
    en: "A day's work brightens the steppe",
    icon: '🌅',
    bg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-400',
    ring: 'ring-amber-300',
    digit: 'text-amber-700',
  },
  complete_daily_goal: {
    zh: '一日之功，草原增辉',
    en: "A day's work brightens the steppe",
    icon: '🌅',
    bg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-400',
    ring: 'ring-amber-300',
    digit: 'text-amber-700',
  },
  practice: {
    zh: '磨砺以须，功在不舍',
    en: 'Practice makes the herder',
    icon: '🛡️',
    bg: 'from-violet-50 to-fuchsia-50',
    border: 'border-violet-300',
    ring: 'ring-violet-200',
    digit: 'text-violet-700',
  },
  admin_adjust: {
    zh: '天恩眷顾，特赐此荣',
    en: 'A blessing from the steppe',
    icon: '🪶',
    bg: 'from-slate-50 to-zinc-50',
    border: 'border-slate-300',
    ring: 'ring-slate-200',
    digit: 'text-slate-700',
  },
  upload_word: {
    zh: '添砖加瓦，共建草原',
    en: 'Add a brick to the yurt',
    icon: '🏕️',
    bg: 'from-emerald-50 to-green-50',
    border: 'border-emerald-300',
    ring: 'ring-emerald-200',
    digit: 'text-emerald-700',
  },
  upload_audio: {
    zh: '留下风的声音',
    en: "Preserve the wind's voice",
    icon: '🎙️',
    bg: 'from-teal-50 to-cyan-50',
    border: 'border-teal-300',
    ring: 'ring-teal-200',
    digit: 'text-teal-700',
  },
  upload_wisdom: {
    zh: '智慧的火种，代代相传',
    en: 'A spark of wisdom, kindling ages',
    icon: '✨',
    bg: 'from-amber-50 to-yellow-100',
    border: 'border-yellow-400',
    ring: 'ring-yellow-300',
    digit: 'text-yellow-700',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 羊皮卷轴条（左/右卷轴柱）
 * ───────────────────────────────────────────────────────────── */
function ScrollCap({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className={`flex-shrink-0 w-3 sm:w-4 h-full bg-gradient-to-${
        side === 'left' ? 'r' : 'l'
      } from-amber-700 via-amber-600 to-amber-800 rounded-${
        side === 'left' ? 'l-lg' : 'r-lg'
      } shadow-inner flex flex-col items-center justify-around py-1.5`}
      aria-hidden
    >
      <div className="w-1 h-1 rounded-full bg-amber-900/60" />
      <div className="w-1 h-1 rounded-full bg-amber-900/60" />
      <div className="w-1 h-1 rounded-full bg-amber-900/60" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 单个 Toast
 * ───────────────────────────────────────────────────────────── */

// 兜底配色：遇到未注册 action 时使用（防止 copy.bg 访问 undefined 崩溃）
const FALLBACK_COPY: ActionCopy = {
  zh: '一水一石，皆成山河',
  en: 'Every step is a story',
  icon: '✦',
  bg: 'from-stone-50 to-slate-50',
  border: 'border-stone-300',
  ring: 'ring-stone-200',
  digit: 'text-stone-700',
};

function Toast({
  item,
  language,
  onDismiss,
}: {
  item: XPToastItem;
  language: 'zh' | 'en';
  onDismiss: (id: string) => void;
}) {
  const copy = ACTION_COPY[item.action] ?? FALLBACK_COPY;
  const duration = item.duration ?? 3000;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), duration);
    return () => clearTimeout(timer);
  }, [item.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        relative flex items-stretch w-[300px] sm:w-[360px] max-w-[92vw]
        bg-gradient-to-br ${copy.bg}
        border-2 ${copy.border} ring-1 ${copy.ring}
        rounded-xl shadow-xl
        animate-[xpSlideIn_0.32s_cubic-bezier(0.34,1.56,0.64,1)_both]
      `}
    >
      {/* 左侧卷轴 */}
      <ScrollCap side="left" />

      {/* 主内容 */}
      <div className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 relative">
        {/* 右上角关闭 */}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/60 hover:bg-white/90 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors"
          aria-label="close"
        >
          <X className="w-3 h-3" />
        </button>

        {/* 第一行：图标 + XP 数字 */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 ring-2 ring-white shadow-sm flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
            {copy.icon}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-black ${copy.digit} leading-none tabular-nums drop-shadow-sm`}>
              +{item.value}
            </span>
            <span className={`text-xs sm:text-sm font-bold ${copy.digit} opacity-80`}>
              XP
            </span>
          </div>
          {item.leveledUp && (
            <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold shadow-sm animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              {language === 'zh' ? '升级' : 'Lv Up'}
            </div>
          )}
        </div>

        {/* 第二行：蒙古文化祝福 */}
        <div className="text-[11px] sm:text-xs text-stone-700 font-medium leading-snug pl-0.5">
          {language === 'zh' ? copy.zh : copy.en}
        </div>

        {/* 蒙古文竖排小水印（右下角） */}
        <div
          className="absolute bottom-0.5 right-1.5 text-stone-700/15 font-mongolian select-none pointer-events-none"
          style={{ writingMode: 'vertical-rl', fontSize: '18px', lineHeight: 1 }}
          aria-hidden
        >
          ᠮᠣᠩᠭᠣᠯ
        </div>
      </div>

      {/* 右侧卷轴 */}
      <ScrollCap side="right" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 容器（订阅总线 + 队列管理 + 渲染）
 * ───────────────────────────────────────────────────────────── */
export function XPToastHost({ language }: { language: 'zh' | 'en' }) {
  const [items, setItems] = useState<XPToastItem[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeXPToast((item) => {
      setItems((prev) => {
        // 同 action 3s 内合并：累加 value
        const idx = prev.findIndex((p) => p.action === item.action);
        if (idx >= 0) {
          const merged = {
            ...prev[idx],
            value: prev[idx].value + item.value,
            leveledUp: prev[idx].leveledUp || item.leveledUp,
          };
          const next = [...prev];
          next[idx] = merged;
          return next;
        }
        // 最多同时 3 个
        const next = [...prev, item];
        return next.slice(-3);
      });
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes xpSlideIn {
          0% { transform: translateY(-100%) scale(0.92); opacity: 0; }
          60% { transform: translateY(6px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes xpSlideOut {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-40px) scale(0.95); opacity: 0; }
        }
      `}</style>
      <div
        className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 sm:gap-2.5 pointer-events-auto"
        aria-label="XP toasts"
      >
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <Toast item={item} language={language} onDismiss={handleDismiss} />
          </div>
        ))}
      </div>
    </>
  );
}

export default XPToastHost;
