'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import type { Announcement, AnnouncementType } from '@/types/auth';

// ─── 类型配置 ───────────────────────────────────────────
const typeConfig: Record<
  AnnouncementType,
  {
    icon: typeof Info;
    accent: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
    headerGradient: string;
    stripeFrom: string;
    stripeTo: string;
  }
> = {
  info: {
    icon: Info,
    accent: 'text-sky-700',
    border: 'border-sky-200',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
    badgeLabel: '信息',
    headerGradient: 'from-sky-50 to-white',
    stripeFrom: 'from-sky-500',
    stripeTo: 'to-sky-300',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'text-amber-700',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeLabel: '提醒',
    headerGradient: 'from-amber-50 to-white',
    stripeFrom: 'from-amber-500',
    stripeTo: 'to-amber-300',
  },
  success: {
    icon: CheckCircle,
    accent: 'text-emerald-700',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    badgeLabel: '喜讯',
    headerGradient: 'from-emerald-50 to-white',
    stripeFrom: 'from-emerald-500',
    stripeTo: 'to-emerald-300',
  },
  update: {
    icon: Sparkles,
    accent: 'text-purple-700',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    badgeLabel: '更新',
    headerGradient: 'from-purple-50 to-white',
    stripeFrom: 'from-purple-500',
    stripeTo: 'to-purple-300',
  },
};

// ─── localStorage 工具 ─────────────────────────────────
const DISMISSED_KEY = 'mongolian-announcement-dismissed';
const LEGACY_PREFIX = 'mongolian-announcement-dismissed-'; // 旧版按 id 独立存储的 key 前缀

interface DismissedInfo {
  id: string;
  at: number; // Date.now() when dismissed
}

/**
 * 清理旧版 localStorage key
 * 老版本用 `mongolian-announcement-dismissed-{id}` 永不过期地标记每条公告
 * 这会导致 shouldShow 永远判定为"已关闭"，刷新看不到弹窗
 * 启动时统一清理，强制用新格式的 `mongolian-announcement-dismissed`
 */
function cleanupLegacyDismissedKeys() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_PREFIX) && k !== 'mongolian-announcement-dismissed-history') {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function getDismissed(): DismissedInfo | null {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DismissedInfo;
  } catch {
    return null;
  }
}

function markDismissed(id: string) {
  try {
    const now = Date.now();
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ id, at: now })
    );
    // Also append to history list (dedup, most recent first, cap 50)
    const historyRaw = localStorage.getItem('mongolian-announcement-history');
    let history: { id: string; at: number }[] = [];
    try { history = historyRaw ? JSON.parse(historyRaw) : []; } catch { history = []; }
    if (!history.some((h) => h.id === id)) {
      history.unshift({ id, at: now });
      history = history.slice(0, 50);
      localStorage.setItem('mongolian-announcement-history', JSON.stringify(history));
    }
  } catch {
    // localStorage quota exceeded — ignore
  }
}

/**
 * 判断公告是否应该显示：
 * - 如果用户从未关闭过任何公告 → 显示
 * - 如果关闭的公告 id 不同 → 显示（新公告）
 * - 如果关闭的公告 id 相同，但关闭时间早于 published_at → 显示（管理员重新发布了）
 * - 否则 → 不显示
 */
function shouldShow(announcement: Announcement): boolean {
  const dismissed = getDismissed();
  if (!dismissed) return true;
  if (dismissed.id !== announcement.id) return true;
  // 同一条公告：检查关闭时间是否早于发布时间
  const publishedTs = announcement.published_at
    ? new Date(announcement.published_at).getTime()
    : 0;
  if (publishedTs > dismissed.at) return true;
  return false;
}

// ─── 组件 ──────────────────────────────────────────────
export function AnnouncementDialog() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 启动时先清理旧 localStorage key（让 shouldShow 强制重新评估）
    cleanupLegacyDismissedKeys();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/announcements', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: Announcement[] = json?.data || [];
        if (list.length === 0) return;

        const latest = list[0]; // 已按 priority DESC, published_at DESC 排序
        if (!shouldShow(latest)) return;

        setAnnouncement(latest);
        setOpen(true);
      } catch {
        // 静默失败
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    if (announcement) {
      markDismissed(announcement.id);
    }
    setOpen(false);
  };

  if (!announcement) return null;

  const config = typeConfig[announcement.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={`
          max-w-md sm:max-w-lg
          p-0 overflow-hidden
          border-2 ${config.border}
          bg-gradient-to-br ${config.headerGradient}
          shadow-2xl
        `}
      >
        {/* 顶部彩色条纹 */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${config.stripeFrom} ${config.stripeTo}`}
        />

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className={`
            absolute top-4 right-4 z-10
            h-8 w-8 rounded-full
            flex items-center justify-center
            bg-white/80 hover:bg-white
            ${config.accent} hover:text-stone-900
            shadow-sm border border-stone-200
            transition-all
          `}
          aria-label="关闭公告"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <DialogTitle className="sr-only">{announcement.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {announcement.content}
          </DialogDescription>

          {/* 头部：图标 + 类型徽章 + 标题 */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className={`
                shrink-0 h-12 w-12 rounded-full
                flex items-center justify-center
                ${config.badgeBg} ${config.badgeText}
                shadow-sm
              `}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                    inline-flex items-center px-2.5 py-0.5
                    rounded-full text-xs font-medium
                    ${config.badgeBg} ${config.badgeText}
                  `}
                >
                  {config.badgeLabel}
                </span>
                <span className="text-xs text-stone-500">
                  {announcement.published_at
                    ? new Date(announcement.published_at).toLocaleDateString(
                        'zh-CN'
                      )
                    : ''}
                </span>
              </div>
              <h2
                className={`text-xl sm:text-2xl font-bold ${config.accent} leading-tight`}
              >
                {announcement.title}
              </h2>
            </div>
          </div>

          {/* 内容（奶白毡毯纹理） */}
          <div
            className={`
              relative rounded-lg
              bg-white/70 backdrop-blur-sm
              border ${config.border}
              p-4 sm:p-5
              mb-6
            `}
          >
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {announcement.content}
            </p>
          </div>

          {/* 底部：发布者 + 关闭按钮 */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-stone-500">
              {announcement.created_by_name && (
                <span>发布者：{announcement.created_by_name}</span>
              )}
            </div>
            <Button
              onClick={handleClose}
              className={`
                ${config.badgeBg} ${config.badgeText} hover:opacity-90
                border ${config.border}
                font-medium px-6
              `}
              variant="outline"
            >
              我知道了
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
