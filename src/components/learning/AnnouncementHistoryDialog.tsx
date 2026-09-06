'use client';

import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Trash2, Archive } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  TulagaStrip,
  CloudDivider,
  TypeIcon,
  Seal,
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

const STORAGE_KEY_HISTORY = 'mongolian-announcement-dismissed-history';

const TYPE_LABEL: Record<AnnouncementType, { zh: string; en: string }> = {
  info: { zh: '信息', en: 'Info' },
  warning: { zh: '提醒', en: 'Warning' },
  success: { zh: '喜讯', en: 'Success' },
  update: { zh: '更新', en: 'Update' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: Announcement[];
  allAnnouncements: Announcement[];
  onRestore: (id: string) => void;
}

export function AnnouncementHistoryDialog({
  open,
  onOpenChange,
  announcements,
  allAnnouncements,
  onRestore,
}: Props) {
  const { language } = useApp();
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistoryIds(parsed);
      }
    } catch {
      // ignore
    }
  }, [open]);

  const displayList: Announcement[] = [];
  const seen = new Set<string>();
  for (const a of announcements) {
    displayList.push(a);
    seen.add(a.id);
  }
  for (const id of historyIds) {
    if (seen.has(id)) continue;
    const found = allAnnouncements.find((a) => a.id === id);
    if (found) {
      displayList.push(found);
      seen.add(id);
    }
  }

  const handleClearHistory = () => {
    if (!confirm(t('确认清空所有公告历史记录？', 'Clear all announcement history?'))) return;
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      setHistoryIds([]);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl max-h-[85vh] overflow-hidden p-0 border-0 shadow-2xl"
        style={{ backgroundColor: MONGOLIAN_BASE.feltWhite }}
      >
        {/* 顶部盘肠回纹 */}
        <TulagaStrip height={10} />

        {/* 印章关闭按钮 */}
        <div className="absolute top-3 right-3 z-10">
          <Seal
            text="×"
            size={32}
            color="#7A1F1F"
            ariaLabel={t('关闭', 'Close')}
            onClick={() => onOpenChange(false)}
          />
        </div>

        <FeltTexture>
          <div className="overflow-y-auto max-h-[calc(85vh-50px)] p-6 sm:p-7">
            <DialogHeader className="mb-4 pr-12">
              <DialogTitle
                className="flex items-center gap-2.5"
                style={{ fontFamily: FONT_SERIF_STACK }}
              >
                <Archive
                  className="w-5 h-5"
                  style={{ color: MONGOLIAN_BASE.gerWood }}
                />
                <span style={{ color: MONGOLIAN_BASE.ink }}>
                  {t('羊皮书档案', 'Parchment Archive')}
                </span>
                <Badge
                  variant="outline"
                  className="ml-1"
                  style={{
                    borderColor: MONGOLIAN_BASE.gerWoodSoft,
                    color: MONGOLIAN_BASE.inkSoft,
                  }}
                >
                  {displayList.length}
                </Badge>
              </DialogTitle>
              <DialogDescription
                className="text-xs italic"
                style={{ color: MONGOLIAN_BASE.inkSoft }}
              >
                {t(
                  '这里记录你已经阅过的公告，可以随时再读。',
                  'Past announcements you have read. You can revisit anytime.'
                )}
              </DialogDescription>
            </DialogHeader>

            {/* 云纹分隔 */}
            <div className="mb-4 -mx-2">
              <CloudDivider height={12} color={MONGOLIAN_BASE.gerWoodSoft} />
            </div>

            {displayList.length === 0 ? (
              <div className="relative text-center py-12">
                <GerSilhouette
                  className="absolute inset-0 mx-auto"
                  color={MONGOLIAN_BASE.gerWood}
                  opacity={0.08}
                />
                <div className="relative">
                  <History
                    className="w-10 h-10 mx-auto mb-2.5"
                    style={{ color: MONGOLIAN_BASE.gerWoodSoft }}
                  />
                  <p
                    className="text-sm"
                    style={{
                      color: MONGOLIAN_BASE.inkSoft,
                      fontFamily: FONT_SERIF_STACK,
                    }}
                  >
                    {t('羊皮书上尚无记录', 'Parchment is blank')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {displayList.map((ann) => {
                  const type = ann.type as MongolianType;
                  const palette = MONGOLIAN_PALETTES[type] || MONGOLIAN_PALETTES.info;
                  const label = TYPE_LABEL[ann.type];
                  const isExpanded = expandedId === ann.id;
                  const isLong = ann.content.length > 120;
                  return (
                    <div
                      key={ann.id}
                      className="relative rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: '#FAF6EC',
                        borderColor: palette.decorSoft,
                      }}
                    >
                      {/* 顶部图拉嘎 */}
                      <TulagaStrip
                        color={palette.decor}
                        softColor={palette.decorSoft}
                        height={8}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
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
                                size={11}
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
                          <span
                            className="text-[10px] shrink-0 italic"
                            style={{ color: MONGOLIAN_BASE.gerWood }}
                          >
                            {new Date(
                              ann.published_at || ann.created_at
                            ).toLocaleDateString('zh-CN')}
                          </span>
                        </div>

                        <h4
                          className="text-sm font-bold mb-1.5 leading-snug"
                          style={{
                            color: palette.primaryDark,
                            fontFamily: FONT_SERIF_STACK,
                          }}
                        >
                          {ann.title}
                        </h4>

                        <p
                          className={`text-xs leading-relaxed whitespace-pre-wrap ${
                            isExpanded ? '' : 'line-clamp-3'
                          }`}
                          style={{ color: MONGOLIAN_BASE.inkSoft }}
                        >
                          {ann.content}
                        </p>

                        {isLong && (
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : ann.id)
                            }
                            className="text-[10px] mt-1 italic hover:underline"
                            style={{ color: palette.primary }}
                          >
                            {isExpanded ? t('收起', 'Collapse') : t('展开全文', 'Expand')}
                          </button>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-dashed" style={{ borderColor: palette.decorSoft }}>
                          <div className="flex items-center justify-between">
                            <div
                              className="text-[10px] italic"
                              style={{ color: MONGOLIAN_BASE.gerWood }}
                            >
                              {ann.created_by_name && (
                                <span>
                                  {t('由', 'By')}{' '}
                                  <span
                                    style={{
                                      fontFamily: FONT_SERIF_STACK,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {ann.created_by_name}
                                  </span>{' '}
                                  {t('记述', 'recorded')}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRestore(ann.id)}
                              className="h-6 px-2 text-[10px] hover:bg-[#E8DEC9]/40"
                              style={{ color: palette.primary }}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {t('再看一次', 'Show Again')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {historyIds.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-dashed flex justify-end" style={{ borderColor: MONGOLIAN_BASE.gerWoodSoft }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="text-xs hover:bg-transparent"
                      style={{ color: MONGOLIAN_BASE.inkSoft }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {t('清空羊皮书', 'Clear Parchment')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </FeltTexture>

        {/* 底部回纹 */}
        <TulagaStrip height={10} />
      </DialogContent>
    </Dialog>
  );
}
