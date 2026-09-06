'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, X, History, ChevronRight, Eye } from 'lucide-react';
import { AnnouncementHistoryDialog } from './AnnouncementHistoryDialog';
import { AnnouncementDetailDialog } from './AnnouncementDetailDialog';
import {
  TulagaStrip,
  HanaFrame,
  CloudDivider,
  TypeIcon,
  TulagaHeader,
  GerSilhouette,
  FeltTexture,
  FONT_SERIF_STACK,
} from './mongolian-decorations';
import {
  MONGOLIAN_BASE,
  MONGOLIAN_PALETTES,
  type MongolianType,
} from '@/lib/mongolian-colors';
import type { Announcement, AnnouncementType } from '@/types/auth';

const STORAGE_KEY_DISMISSED = 'mongolian-announcement-dismissed';
const STORAGE_KEY_HISTORY = 'mongolian-announcement-dismissed-history';

function getDismissedAt(): { id: string; at: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.at === 'number') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function getDismissedHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function markDismissed(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY_DISMISSED,
      JSON.stringify({ id, at: Date.now() })
    );
    const history = getDismissedHistory();
    if (!history.includes(id)) {
      history.unshift(id);
      const trimmed = history.slice(0, 50);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
    }
  } catch {
    // ignore
  }
}

function isClosedByUser(announcement: Announcement): boolean {
  const dismissed = getDismissedAt();
  if (!dismissed) return false;
  if (dismissed.id !== announcement.id) return false;
  const publishedAt = announcement.published_at
    ? new Date(announcement.published_at).getTime()
    : new Date(announcement.created_at).getTime();
  return dismissed.at >= publishedAt;
}

const TYPE_LABEL: Record<AnnouncementType, { zh: string; en: string }> = {
  info: { zh: '信息', en: 'Info' },
  warning: { zh: '提醒', en: 'Warning' },
  success: { zh: '喜讯', en: 'Success' },
  update: { zh: '更新', en: 'Update' },
};

export function AnnouncementBoard() {
  const { language } = useApp();
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/announcements', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.success) {
          setAnnouncements(json.data || []);
        }
      } catch (e) {
        // 静默
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { active, closed } = useMemo(() => {
    const a: Announcement[] = [];
    const c: Announcement[] = [];
    for (const ann of announcements) {
      if (isClosedByUser(ann)) c.push(ann);
      else a.push(ann);
    }
    return { active: a, closed: c };
  }, [announcements, historyOpen]);

  const handleClose = (id: string) => {
    markDismissed(id);
    forceUpdate((n) => n + 1);
  };

  const handleOpenDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedId(id);
    setDetailOpen(true);
  };

  const handleDetailAfterClose = (id: string) => {
    markDismissed(id);
    forceUpdate((n) => n + 1);
  };

  const handleRestore = (id: string) => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = getDismissedAt();
      if (dismissed && dismissed.id === id) {
        localStorage.setItem(
          STORAGE_KEY_DISMISSED,
          JSON.stringify({ id: '', at: 0 })
        );
      }
    } catch {
      // ignore
    }
    forceUpdate((n) => n + 1);
  };

  if (loading) return null;
  if (announcements.length === 0) return null;

  return (
    <>
      <section
        className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
        id="announcements"
      >
        <div className="max-w-7xl mx-auto">
          <Card
            className="relative overflow-hidden border-0 shadow-lg"
            style={{
              backgroundColor: MONGOLIAN_BASE.feltWhite,
            }}
          >
            {/* 顶部装饰：盘肠回纹 + 三个金钉 */}
            <TulagaStrip height={12} />
            <div className="flex items-center justify-center gap-2 py-1.5 bg-[#F5EFE3]/60 border-b border-[#E8DEC9]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: MONGOLIAN_BASE.goldThread }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: MONGOLIAN_BASE.gerWood }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: MONGOLIAN_BASE.gerWoodSoft }}
              />
            </div>

            <FeltTexture>
              <CardContent className="p-5 sm:p-6">
                {/* 标题栏：图拉嘎 + 蒙古包议事厅 + 蒙文副标题 */}
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <TulagaHeader
                        size={26}
                        color={MONGOLIAN_BASE.gerWood}
                        className="shrink-0 mongolian-tulaga-breathe"
                      />
                      <div className="flex-1 min-w-0">
                        <h2
                          className="text-lg sm:text-xl font-bold leading-tight"
                          style={{
                            color: MONGOLIAN_BASE.ink,
                            fontFamily: FONT_SERIF_STACK,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {t('蒙古包议事厅', 'Yurt Council Hall')}
                        </h2>
                        <div
                          className="flex items-center gap-2 mt-0.5 text-[11px] sm:text-xs"
                          style={{ color: MONGOLIAN_BASE.inkSoft }}
                        >
                          <span
                            style={{
                              fontFamily: '"Noto Sans Mongolian", "Mongolian Baiti", serif',
                              fontSize: '0.95em',
                            }}
                          >
                            ᠰᠣᠨᠢᠨ ᠮᠡᠳᠡᠭᠡ
                          </span>
                          <span style={{ color: MONGOLIAN_BASE.gerWoodSoft }}>·</span>
                          <span className="italic">
                            {t('草原速报', 'Steppe Bulletin')}
                          </span>
                          {active.length > 0 && (
                            <>
                              <span style={{ color: MONGOLIAN_BASE.gerWoodSoft }}>·</span>
                              <Badge
                                className="h-4 px-1.5 text-[10px] border-0"
                                style={{
                                  backgroundColor: MONGOLIAN_BASE.goldThread,
                                  color: '#3A2E1F',
                                }}
                              >
                                {active.length} {t('新', 'new')}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryOpen(true)}
                    className="text-xs hover:bg-[#E8DEC9]/40 shrink-0"
                    style={{ color: MONGOLIAN_BASE.inkSoft }}
                  >
                    <History className="w-3.5 h-3.5 mr-1" />
                    {t('档案', 'Archive')}
                    {closed.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 h-4 px-1 text-[10px]"
                        style={{
                          borderColor: MONGOLIAN_BASE.gerWoodSoft,
                          color: MONGOLIAN_BASE.inkSoft,
                        }}
                      >
                        {closed.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* 顶部云纹分隔 */}
                <div className="mb-4 -mx-1">
                  <CloudDivider height={14} color={MONGOLIAN_BASE.gerWoodSoft} />
                </div>

                {/* 公告卡片 */}
                {active.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {active.map((ann) => {
                      const type = ann.type as MongolianType;
                      const palette = MONGOLIAN_PALETTES[type] || MONGOLIAN_PALETTES.info;
                      const label = TYPE_LABEL[ann.type];
                      return (
                        <div
                          key={ann.id}
                          onClick={() => handleOpenDetail(ann.id)}
                          className="group relative overflow-hidden rounded-lg border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                          style={{
                            background: `linear-gradient(135deg, ${MONGOLIAN_BASE.feltWhite} 0%, #F0E7D3 100%)`,
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenDetail(ann.id);
                            }
                          }}
                        >
                          {/* 左右哈那骨架 */}
                          <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                            <HanaFrame side="left" />
                          </div>
                          <div className="absolute right-0 top-0 bottom-0 pointer-events-none">
                            <HanaFrame side="right" />
                          </div>

                          {/* 顶部图拉嘎条 */}
                          <TulagaStrip
                            color={palette.decor}
                            softColor={palette.decorSoft}
                            height={10}
                            className="mongolian-tulaga-breathe"
                          />

                          <div className="px-5 py-4 relative">
                            {/* 头部：类型徽章 + 紧急 + 关闭按钮 */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border"
                                  style={{
                                    backgroundColor: palette.primary,
                                    color: '#F5EFE3',
                                    borderColor: palette.primaryDark,
                                  }}
                                >
                                  <TypeIcon
                                    type={type}
                                    size={12}
                                    color="#F5EFE3"
                                    softColor="#F5EFE3"
                                  />
                                  {t(label.zh, label.en)}
                                </span>
                                {ann.priority >= 10 && (
                                  <Badge
                                    className="h-4 px-1 text-[10px] border-0"
                                    style={{
                                      backgroundColor: '#A02F2F',
                                      color: '#F5EFE3',
                                    }}
                                  >
                                    {t('紧急', 'Urgent')}
                                  </Badge>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClose(ann.id);
                                }}
                                className="opacity-50 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5"
                                style={{ color: MONGOLIAN_BASE.inkSoft }}
                                aria-label={t('关闭', 'Close')}
                                title={t('关闭', 'Close')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 标题 */}
                            <h3
                              className="text-base font-bold leading-snug mb-2 line-clamp-2"
                              style={{
                                color: palette.primaryDark,
                                fontFamily: FONT_SERIF_STACK,
                              }}
                            >
                              {ann.title}
                            </h3>

                            {/* 内容预览 */}
                            <p
                              className="text-xs leading-relaxed line-clamp-3 mb-3"
                              style={{ color: MONGOLIAN_BASE.inkSoft }}
                            >
                              {ann.content}
                            </p>

                            {/* 底部云纹分隔 + 元信息 */}
                            <div className="mb-2">
                              <CloudDivider
                                height={10}
                                color={palette.decorSoft}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                              <div
                                className="flex items-center gap-1"
                                style={{ color: MONGOLIAN_BASE.gerWoodSoft }}
                              >
                                <Megaphone className="w-2.5 h-2.5" />
                                <span>
                                  {new Date(
                                    ann.published_at || ann.created_at
                                  ).toLocaleDateString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </span>
                              </div>
                              <span
                                className="inline-flex items-center gap-0.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: palette.primary }}
                              >
                                {t('查看完整', 'View')}
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // 无活跃公告
                  <div className="relative py-10 px-6 text-center">
                    <GerSilhouette
                      className="absolute inset-0 mx-auto"
                      color={MONGOLIAN_BASE.gerWood}
                      opacity={0.06}
                    />
                    <div className="relative">
                      <Megaphone
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: MONGOLIAN_BASE.gerWoodSoft }}
                      />
                      <p
                        className="text-sm"
                        style={{
                          color: MONGOLIAN_BASE.inkSoft,
                          fontFamily: FONT_SERIF_STACK,
                        }}
                      >
                        {t('草原一片宁静，暂无新消息', 'All quiet on the steppe')}
                      </p>
                      {closed.length > 0 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setHistoryOpen(true)}
                          className="mt-2 text-xs"
                          style={{ color: MONGOLIAN_BASE.gerWood }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {t(`查看 ${closed.length} 条历史公告`, `View ${closed.length} archived`)}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </FeltTexture>

            {/* 底部装饰回纹 */}
            <TulagaStrip height={10} />
          </Card>
        </div>
      </section>

      <AnnouncementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        announcements={active}
        initialId={selectedId || active[0]?.id || ''}
        onAfterClose={handleDetailAfterClose}
      />

      <AnnouncementHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        announcements={closed}
        allAnnouncements={announcements}
        onRestore={handleRestore}
      />
    </>
  );
}
