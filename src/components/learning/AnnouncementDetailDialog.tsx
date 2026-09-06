'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import {
  GerCrown,
  TulagaStrip,
  HanaFrame,
  CloudDivider,
  TypeIcon,
  Seal,
  FeltTexture,
  FONT_SERIF_STACK,
} from './mongolian-decorations';
import {
  MONGOLIAN_BASE,
  MONGOLIAN_PALETTES,
  type MongolianType,
} from '@/lib/mongolian-colors';
import type { Announcement, AnnouncementType } from '@/types/auth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: Announcement[];
  initialId: string;
  onAfterClose?: (id: string) => void;
}

const TYPE_LABEL: Record<AnnouncementType, { zh: string; en: string }> = {
  info: { zh: '信息', en: 'Info' },
  warning: { zh: '提醒', en: 'Warning' },
  success: { zh: '喜讯', en: 'Success' },
  update: { zh: '更新', en: 'Update' },
};

export function AnnouncementDetailDialog({
  open,
  onOpenChange,
  announcements,
  initialId,
  onAfterClose,
}: Props) {
  const { language } = useApp();
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const [currentId, setCurrentId] = useState(initialId);

  useEffect(() => {
    if (open) setCurrentId(initialId);
  }, [initialId, open]);

  const { current, currentIndex, hasPrev, hasNext } = useMemo(() => {
    const idx = announcements.findIndex((a) => a.id === currentId);
    if (idx === -1) {
      return {
        current: announcements[0],
        currentIndex: 0,
        hasPrev: false,
        hasNext: announcements.length > 1,
      };
    }
    return {
      current: announcements[idx],
      currentIndex: idx,
      hasPrev: idx > 0,
      hasNext: idx < announcements.length - 1,
    };
  }, [announcements, currentId]);

  if (!current) return null;

  const type = current.type as MongolianType;
  const palette = MONGOLIAN_PALETTES[type] || MONGOLIAN_PALETTES.info;
  const label = TYPE_LABEL[current.type];

  const handlePrev = () => {
    if (hasPrev) setCurrentId(announcements[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (hasNext) setCurrentId(announcements[currentIndex + 1].id);
  };

  const handleClose = () => {
    if (onAfterClose) onAfterClose(current.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl max-h-[90vh] overflow-hidden p-0 border-0 shadow-2xl"
        style={{
          backgroundColor: MONGOLIAN_BASE.feltWhite,
        }}
      >
        <DialogTitle className="sr-only">
          {t('公告详情', 'Announcement details')} - {current.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('公告详情', 'Announcement details')}
        </DialogDescription>
        {/* 顶部：蒙古包穹顶 */}
        <div
          className="relative"
          style={{
            background: `linear-gradient(180deg, ${palette.decorSoft}30 0%, transparent 100%)`,
          }}
        >
          <GerCrown
            color={palette.decor}
            softColor={palette.decorSoft}
            className="opacity-50"
          />
          <TulagaStrip
            color={palette.decor}
            softColor={palette.decorSoft}
            height={10}
          />
        </div>

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
          <div className="overflow-y-auto max-h-[calc(90vh-110px)]">
            <div className="relative px-8 sm:px-10 py-6 sm:py-7">
              {/* 左右哈那骨架 */}
              <div className="absolute left-0 top-0 bottom-0 pointer-events-none opacity-40">
                <HanaFrame side="left" />
              </div>
              <div className="absolute right-0 top-0 bottom-0 pointer-events-none opacity-40">
                <HanaFrame side="right" />
              </div>

              <div className="relative">
                {/* 类型徽章 + 时间 + 紧急标签 */}
                <div className="flex items-center gap-2 mb-3 flex-wrap pr-12">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: palette.primary,
                      color: '#F5EFE3',
                      borderColor: palette.primaryDark,
                    }}
                  >
                    <TypeIcon
                      type={type}
                      size={14}
                      color="#F5EFE3"
                      softColor="#F5EFE3"
                    />
                    {t(label.zh, label.en)}
                  </span>
                  {current.priority >= 10 && (
                    <Badge
                      className="text-[10px] border-0"
                      style={{
                        backgroundColor: '#A02F2F',
                        color: '#F5EFE3',
                      }}
                    >
                      {t('紧急', 'Urgent')}
                    </Badge>
                  )}
                  {announcements.length > 1 && (
                    <span
                      className="text-xs ml-auto"
                      style={{ color: MONGOLIAN_BASE.gerWood }}
                    >
                      {t('第', 'No.')} {currentIndex + 1} / {announcements.length}
                    </span>
                  )}
                </div>

                {/* 标题 */}
                <h2
                  className="text-2xl sm:text-3xl font-bold leading-tight mb-3"
                  style={{
                    color: palette.primaryDark,
                    fontFamily: FONT_SERIF_STACK,
                  }}
                >
                  {current.title}
                </h2>

                {/* 元信息行 */}
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-xs"
                  style={{ color: MONGOLIAN_BASE.inkSoft }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(
                      current.published_at || current.created_at
                    ).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {current.expires_at && new Date(current.expires_at) > new Date() && (
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: palette.primary }}
                    >
                      · {t('有效至', 'Until')}{' '}
                      {new Date(current.expires_at).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                  {current.created_by_name && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {t('发布人', 'By')}: {current.created_by_name}
                    </span>
                  )}
                </div>

                {/* 云纹分隔 */}
                <div className="mb-4 -mx-2">
                  <CloudDivider
                    height={14}
                    color={palette.decorSoft}
                  />
                </div>

                {/* 内容（奶白毡毯纹理） */}
                <FeltTexture
                  className="rounded-lg p-5 sm:p-6 mb-5 border"
                  style={{
                    backgroundColor: 'rgba(255, 252, 245, 0.7)',
                    borderColor: palette.decorSoft,
                  }}
                >
                  <div
                    className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      color: MONGOLIAN_BASE.ink,
                      fontFamily: FONT_SERIF_STACK,
                    }}
                  >
                    {current.content}
                  </div>
                </FeltTexture>

                {/* 底部云纹 */}
                <div className="mb-5 -mx-2">
                  <CloudDivider
                    height={12}
                    color={palette.decor}
                  />
                </div>

                {/* 底部按钮：上/下一条 + 我知道了 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={!hasPrev}
                      className="h-9 px-3 text-xs bg-transparent"
                      style={{
                        borderColor: palette.decorSoft,
                        color: palette.primaryDark,
                        opacity: hasPrev ? 1 : 0.3,
                      }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      {t('上一条', 'Prev')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!hasNext}
                      className="h-9 px-3 text-xs bg-transparent"
                      style={{
                        borderColor: palette.decorSoft,
                        color: palette.primaryDark,
                        opacity: hasNext ? 1 : 0.3,
                      }}
                    >
                      {t('下一条', 'Next')}
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleClose}
                    className="font-bold px-6 h-10 border-0 shadow-md hover:shadow-lg transition-all"
                    style={{
                      backgroundColor: palette.primary,
                      color: '#F5EFE3',
                      fontFamily: FONT_SERIF_STACK,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {t('我知道了', 'Got it')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FeltTexture>

        {/* 底部：盘肠回纹 */}
        <TulagaStrip
          color={palette.decor}
          softColor={palette.decorSoft}
          height={10}
        />
      </DialogContent>
    </Dialog>
  );
}
