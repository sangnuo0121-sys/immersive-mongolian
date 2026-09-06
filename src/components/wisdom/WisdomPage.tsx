'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth, getAuthToken } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import {
  getMongolianArchiveImageSrc,
  getMongolianCultureImageSrc,
  getMongolianCultureContentImageSrc,
  getMongolianWisdomImageSrc,
} from '@/lib/mongolian-image-src';
import {
  Tent,
  RefreshCw,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Quote,
  Sprout,
  Mic,
  BookOpen,
  Upload,
  Music,
  Image as ImageIcon,
  Edit,
  Trash2,
  Play,
  Pause,
  Plus,
  Volume2,
  X,
  Clock,
  User as UserIcon,
  Filter,
  Type,
  ChevronDown,
  Check,
  Headphones,
  ScrollText,
  Compass,
  CircleDot,
  Tag,
  Calendar,
  Globe2,
} from 'lucide-react';
import { OralArchive, CultureArticle, WisdomQuote } from '@/types';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

// ============================================================================
// 设计主题常量（蒙古包内饰 · 萨满金 / 草原青 / 哈达蓝 / 敖包赭）
// ============================================================================

const THEME = {
  bg: 'bg-[#FAF7F0]',            // 毡毯奶白
  bgWarm: 'bg-[#F5EFE0]',         // 羊皮卷微黄
  gold: 'text-[#A0822C]',         // 萨满金（深）
  goldBg: 'bg-[#C8A24B]',         // 萨满金（亮）
  goldLine: 'border-[#C8A24B]',
  green: 'text-[#2E5547]',        // 草原青（深）
  greenBg: 'bg-[#3A6B5B]',        // 草原青（亮）
  blue: 'text-[#2C4470]',         // 哈达蓝（深）
  blueBg: 'bg-[#3F5D8E]',         // 哈达蓝（亮）
  ochre: 'text-[#7A3520]',        // 敖包赭（深）
  ochreBg: 'bg-[#A04A2C]',        // 敖包赭（亮）
  ink: 'text-[#2A2A2A]',          // 蒙古文墨色
  paper: 'text-[#3F3A2E]',        // 羊皮墨
};

// 哈达丝带彩条（蓝 / 白 / 黄 / 绿 / 红），挂于卡片顶部
function KhataRibbon({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1.5 w-full overflow-hidden rounded-full ${className}`}>
      <div className="flex-1 bg-[#3F5D8E]" />
      <div className="flex-1 bg-[#FAF7F0]" />
      <div className="flex-1 bg-[#C8A24B]" />
      <div className="flex-1 bg-[#3A6B5B]" />
      <div className="flex-1 bg-[#A04A2C]" />
    </div>
  );
}

// 奥云格日（ᠡᠯᠢᠭᠡ）云纹分隔线，纯 SVG inline
function CloudDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 my-4 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C8A24B]/60 to-[#C8A24B]/30" />
      <svg viewBox="0 0 60 16" className="w-12 h-3 text-[#C8A24B]/70" fill="currentColor" aria-hidden>
        <path d="M2 8 Q8 2 14 8 T26 8 T38 8 T50 8 T58 8" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="30" cy="8" r="1.6" />
        <circle cx="2" cy="8" r="1.2" />
        <circle cx="58" cy="8" r="1.2" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#C8A24B]/60 to-[#C8A24B]/30" />
    </div>
  );
}

// 圆角矩形卷轴框（带萨满金边角点缀）
function ScrollFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#C8A24B] rounded-tl-md" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#C8A24B] rounded-tr-md" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#C8A24B] rounded-bl-md" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#C8A24B] rounded-br-md" />
      {children}
    </div>
  );
}

// 蒙古文水印（淡金色背景大字）
function MongolianWatermark({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span
      className={`absolute pointer-events-none select-none font-bold text-[#C8A24B]/10 ${className}`}
      style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '0.3em' }}
      aria-hidden
    >
      {text}
    </span>
  );
}

// 草原三色横条（小分隔）
function SteppeLine({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1 w-12 overflow-hidden rounded-full ${className}`}>
      <div className="flex-1 bg-[#C8A24B]" />
      <div className="flex-1 bg-[#3A6B5B]" />
      <div className="flex-1 bg-[#3F5D8E]" />
    </div>
  );
}

// ============================================================================
// 登录提示弹窗（声音档案 / 文化传统共用，文化感更强）
// ============================================================================
function LoginPromptModal({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: 'archive' | 'article';
}) {
  const { t, language } = useApp();
  const router = useRouter();
  const isArchive = feature === 'archive';
  const titleZh = isArchive ? '登录后聆听天籁' : '登录后参与共建';
  const titleEn = isArchive ? 'Sign in to listen & contribute' : 'Sign in to publish & share';
  const descZh = isArchive
    ? '蒙古族老人、呼麦艺术家、长调歌手的珍贵声音档案，等您登录后聆听、上传、收藏。'
    : '从那达慕到敖包祭祀，从成吉思汗箴言到草原童谣，登录后您可以发布文章、贡献词条，与全球学习者共建蒙古文化数字档案。';
  const descEn = isArchive
    ? 'Precious oral archives from Mongolian elders, Khoomei artists, and Long Song singers await. Sign in to listen, upload, and curate.'
    : 'From Naadam to ovoo worship, from Genghis Khan\u2019s maxims to steppe nursery rhymes — sign in to publish, share, and help build the global digital archive of Mongolian culture.';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden border-0 p-0 bg-[#FAF7F0]">
        <KhataRibbon />
        <div className="px-6 pt-7 pb-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                isArchive
                  ? 'bg-gradient-to-br from-[#3A6B5B] to-[#2E5547]'
                  : 'bg-gradient-to-br from-[#C8A24B] to-[#A0822C]'
              } text-white`}
            >
              {isArchive ? <Headphones className="w-6 h-6" /> : <ScrollText className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-[#2A2A2A] leading-snug">
                {language === 'en' ? titleEn : titleZh}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-[#3F3A2E]/80 leading-relaxed">
                {language === 'en' ? descEn : descZh}
              </DialogDescription>
            </div>
          </div>
        </div>

        <CloudDivider className="mx-6" />

        <div className="px-6 py-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#3F3A2E]/70 hover:text-[#2A2A2A] hover:bg-[#F5EFE0]"
          >
            {t('稍后再说', 'Maybe later')}
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push('/login');
            }}
            className={`bg-gradient-to-r shadow-md ${
              isArchive
                ? 'from-[#3A6B5B] to-[#2E5547] hover:from-[#345E50] hover:to-[#244A3D]'
                : 'from-[#C8A24B] to-[#A0822C] hover:from-[#B8923F] hover:to-[#8E7024]'
            } text-white`}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t('立即登录', 'Sign in now')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 智慧语录 Tab — "每日智慧" 卷轴阅读
// ============================================================================
function WisdomQuotesTab() {
  const { t, wisdomQuotes, language } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedQuotes, setLikedQuotes] = useState<string[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  const currentQuote = wisdomQuotes[currentIndex];
  const isLiked = currentQuote ? likedQuotes.includes(currentQuote.id) : false;

  const goTo = (next: number) => {
    if (wisdomQuotes.length === 0) return;
    setShowAnimation(true);
    setTimeout(() => {
      setCurrentIndex(((next % wisdomQuotes.length) + wisdomQuotes.length) % wisdomQuotes.length);
      setShowAnimation(false);
    }, 280);
  };
  const nextQuote = () => goTo(currentIndex + 1);
  const prevQuote = () => goTo(currentIndex - 1);
  const randomQuote = () => {
    if (wisdomQuotes.length <= 1) return;
    setShowAnimation(true);
    setTimeout(() => {
      let n = currentIndex;
      while (n === currentIndex) n = Math.floor(Math.random() * wisdomQuotes.length);
      setCurrentIndex(n);
      setShowAnimation(false);
    }, 280);
  };

  const toggleLike = () => {
    if (!currentQuote) return;
    setLikedQuotes((prev) =>
      prev.includes(currentQuote.id)
        ? prev.filter((id) => id !== currentQuote.id)
        : [...prev, currentQuote.id]
    );
  };

  const shareQuote = () => {
    if (!currentQuote) return;
    const text = `"${currentQuote.translation[language]}"
${currentQuote.author ? `— ${currentQuote.author}` : ''}

#蒙古语学习 #Mongolian`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: t('蒙古智慧语录', 'Mongolian Wisdom'), text });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  if (wisdomQuotes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex w-16 h-16 rounded-full bg-[#C8A24B]/15 items-center justify-center mb-4">
          <Quote className="w-8 h-8 text-[#A0822C]" />
        </div>
        <p className="text-[#3F3A2E]/70">{t('暂无智慧语录', 'No wisdom quotes yet')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* 大画布卡片 */}
      <ScrollFrame className="max-w-2xl mx-auto mb-8">
        <Card className="overflow-hidden border-[#C8A24B]/30 shadow-xl bg-[#FAF7F0]">
          <KhataRibbon />

          <CardContent className="relative p-8 sm:p-10 bg-gradient-to-b from-[#FAF7F0] via-[#F5EFE0] to-[#FAF7F0]">
            <MongolianWatermark text="ᠪᠢᠴᠢᠭ" className="text-7xl top-4 right-4" />
            <MongolianWatermark text="ᠰᠢᠯᠢᠭ" className="text-7xl bottom-4 left-4" />

            {/* 顶部装饰：金色 Quote 图标 + 句号 */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C8A24B] to-[#A0822C] flex items-center justify-center shadow-md">
                <Quote className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* 蒙古文大图（pre-rendered SVG） */}
            <div className="relative min-h-[120px] flex items-center justify-center">
              <MongolianTextImage
                key={`current-quote-${currentQuote?.id || 'none'}-${currentQuote?.mongolian || ''}`}
                src={currentQuote?.id ? getMongolianWisdomImageSrc(currentQuote.id) : undefined}
                wordId={currentQuote?.id}
                type="wisdom"
                alt={currentQuote?.mongolian || ''}
                fallbackText={currentQuote?.mongolian || ''}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className={`mx-auto text-[#2A2A2A] w-10 h-auto ${showAnimation ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}
                imgClassName="w-full h-auto"
              />
            </div>

            <CloudDivider />

            {/* 双行翻译 */}
            <div className={`text-center space-y-2 mb-6 ${showAnimation ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
              <p className="text-xl text-[#2E5547] font-medium leading-relaxed">
                {currentQuote?.translation?.[language] || ''}
              </p>
              {language === 'zh' && currentQuote?.translation?.en && (
                <p className="text-sm text-[#3F3A2E]/55 italic">
                  {currentQuote.translation.en}
                </p>
              )}
              {language === 'en' && currentQuote?.translation?.zh && (
                <p className="text-sm text-[#3F3A2E]/55">
                  {currentQuote.translation.zh}
                </p>
              )}
            </div>

            {/* 作者出处 */}
            {currentQuote?.author && (
              <div className="flex items-center justify-center gap-2 text-sm text-[#A0822C]">
                <span className="block w-6 h-px bg-[#C8A24B]/60" />
                <span className="font-medium">— {currentQuote.author}</span>
                <span className="block w-6 h-px bg-[#C8A24B]/60" />
              </div>
            )}
          </CardContent>

          {/* 底部操作区 */}
          <div className="px-6 sm:px-8 pb-6 pt-2 bg-[#F5EFE0]">
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={prevQuote}
                className="border-[#3A6B5B]/30 text-[#2E5547] hover:bg-[#3A6B5B]/10 hover:border-[#3A6B5B]/50 rounded-full"
                aria-label="previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Button
                variant={isLiked ? 'default' : 'outline'}
                onClick={toggleLike}
                className={
                  isLiked
                    ? 'bg-[#A04A2C] hover:bg-[#7A3520] text-white rounded-full'
                    : 'border-[#A04A2C]/30 text-[#7A3520] hover:bg-[#A04A2C]/10 rounded-full'
                }
              >
                <Heart className={`w-4 h-4 mr-1.5 ${isLiked ? 'fill-current' : ''}`} />
                {t('收藏', 'Like')}
              </Button>

              <Button
                variant="outline"
                onClick={shareQuote}
                className="border-[#3F5D8E]/30 text-[#2C4470] hover:bg-[#3F5D8E]/10 rounded-full"
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                {t('分享', 'Share')}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={nextQuote}
                className="border-[#3A6B5B]/30 text-[#2E5547] hover:bg-[#3A6B5B]/10 hover:border-[#3A6B5B]/50 rounded-full"
                aria-label="next"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="mt-3 w-full text-[#A0822C] hover:text-[#A0822C] hover:bg-[#C8A24B]/10"
              onClick={randomQuote}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('随机换一句', 'Random Quote')}
            </Button>
          </div>
        </Card>
      </ScrollFrame>

      {/* 进度点 */}
      <div className="flex justify-center gap-1.5 mb-6 flex-wrap max-w-2xl mx-auto px-4">
        {wisdomQuotes.slice(0, 40).map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            aria-label={`quote ${index + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex
                ? 'w-8 bg-gradient-to-r from-[#C8A24B] to-[#3A6B5B]'
                : 'w-1.5 bg-[#C8A24B]/25 hover:bg-[#C8A24B]/50'
            }`}
          />
        ))}
        {wisdomQuotes.length > 40 && (
          <span className="text-xs text-[#3F3A2E]/50 ml-1">+{wisdomQuotes.length - 40}</span>
        )}
      </div>

      {/* 底部统计条 */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-6 text-sm text-[#2E5547]">
          <div className="flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-[#3A6B5B]" />
            <span>
              {t('已阅读', 'Read')} {currentIndex + 1} / {wisdomQuotes.length}{' '}
              {t('条', 'quotes')}
            </span>
          </div>
          {likedQuotes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#A04A2C] fill-current" />
              <span>
                {likedQuotes.length} {t('条收藏', 'liked')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 声音档案 Tab — "聆听天籁" 草原 + 波形
// ============================================================================
function OralArchiveTab() {
  const { t, language, oralArchives, refreshOralArchives } = useApp();
  const { isAdmin, isLoggedIn, user } = useAuth();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<{ id: string; ratio: number; x: number } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [editingArchive, setEditingArchive] = useState<OralArchive | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const draggingArchiveRef = useRef<OralArchive | null>(null);

  // 模拟波形（基于时长生成 12 个随机柱状）
  const waveformFor = (id: string) => {
    const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 16 }, (_, i) => {
      const v = Math.sin((seed + i) * 0.7) * 0.4 + Math.cos((seed + i * 2) * 0.3) * 0.3 + 0.5;
      return Math.max(0.2, Math.min(1, v));
    });
  };

  const handlePlay = (archive: OralArchive) => {
    if (playingId === archive.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(archive.audioUrl);
    audioRef.current = audio;
    setPlayingId(archive.id);
    audio.play().catch((err) => console.error('[WisdomPage] Audio playback failed:', err));
    audio.addEventListener('timeupdate', () => {
      if (!archive.durationSeconds) return;
      setProgressMap((m) => ({ ...m, [archive.id]: audio.currentTime / archive.durationSeconds! }));
    });
    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setProgressMap((m) => {
        const n = { ...m };
        delete n[archive.id];
        return n;
      });
      audioRef.current = null;
    });
    audio.addEventListener('error', () => {
      console.error('[WisdomPage] Audio error, URL:', archive.audioUrl?.substring(0, 60));
      setPlayingId(null);
      audioRef.current = null;
    });
  };

  // 跳转到指定进度（拖动 / 点击波形）
  const seekTo = (archive: OralArchive, ratio: number) => {
    if (!audioRef.current || !archive.durationSeconds) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    audioRef.current.currentTime = clamped * archive.durationSeconds;
    setProgressMap((m) => ({ ...m, [archive.id]: clamped }));
  };

  // 波形上 pointerdown — 启动拖动 / 点击跳转
  const handleWaveformPointerDown = (archive: OralArchive, e: React.PointerEvent) => {
    if (!archive.durationSeconds) return;
    const rect = waveformRefs.current[archive.id]?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    draggingArchiveRef.current = archive;
    setDraggingId(archive.id);
    setHoverTime(null);
    seekTo(archive, ratio);
    // 第一次拖动 = 自动开播
    if (playingId !== archive.id) handlePlay(archive);
    // 抓取指针，保证拖出手柄范围后仍能继续更新
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // 波形上 pointermove — 拖动中 / hover 时
  const handleWaveformPointerMove = (archive: OralArchive, e: React.PointerEvent) => {
    const rect = waveformRefs.current[archive.id]?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const x = e.clientX - rect.left;
    if (draggingId === archive.id) {
      seekTo(archive, ratio);
    } else {
      setHoverTime({ id: archive.id, ratio, x });
    }
  };

  // 波形上 pointerleave — 清掉 hover 浮窗
  const handleWaveformPointerLeave = (archive: OralArchive) => {
    if (hoverTime?.id === archive.id) setHoverTime(null);
  };

  // 全局 pointerup / pointermove 兜底（处理拖出手柄范围的情况）
  useEffect(() => {
    if (!draggingId) return;
    const handleMove = (e: PointerEvent) => {
      const archive = draggingArchiveRef.current;
      if (!archive || !archive.durationSeconds) return;
      const rect = waveformRefs.current[draggingId]?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(archive, ratio);
    };
    const handleUp = () => {
      setDraggingId(null);
      draggingArchiveRef.current = null;
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
     
  }, [draggingId]);

  // 组件卸载时停止
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('确定要删除这个音频吗？', 'Are you sure you want to delete this audio?'))) return;
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['x-session'] = token;
      const res = await fetch(`/api/wisdom/oral-archives?id=${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) refreshOralArchives();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getTitle = (item: OralArchive) => {
    if (language === 'zh') return item.title.zh || item.title.en;
    if (language === 'en') return item.title.en || item.title.zh;
    return item.title.mn || item.title.zh;
  };

  return (
    <div>
      {/* 顶部：标题 + 上传按钮 */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3A6B5B] to-[#2E5547] flex items-center justify-center shadow-sm">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2A2A2A] text-base leading-tight">
              {t('声音档案', 'Oral Archives')}
            </h3>
            <p className="text-xs text-[#3F3A2E]/60 leading-tight">
              {t('聆听蒙古长者的天籁之音', 'Hear the authentic voices of Mongolian elders')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (!isLoggedIn) {
              setShowLoginPrompt(true);
              return;
            }
            setShowUpload(true);
          }}
          className="bg-gradient-to-r from-[#3A6B5B] to-[#2E5547] hover:from-[#345E50] hover:to-[#244A3D] text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t('上传音频', 'Upload Audio')}
        </Button>
      </div>

      {/* 列表 */}
      {oralArchives.length === 0 ? (
        <Card className="bg-[#FAF7F0] border-[#C8A24B]/20 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-[#3A6B5B]/10 items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-[#3A6B5B]/60" />
            </div>
            <p className="text-[#3F3A2E]/70">{t('暂无声音档案', 'No oral archives yet')}</p>
            <p className="text-sm text-[#3F3A2E]/50 mt-1">
              {t('点击右上角上传长者音频', 'Click the top-right button to upload audio')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {oralArchives.map((archive) => {
            const isPlaying = playingId === archive.id;
            const progress = progressMap[archive.id] || 0;
            const waves = waveformFor(archive.id);
            return (
              <Card
                key={archive.id}
                className={`overflow-hidden transition-all bg-[#FAF7F0] ${
                  isPlaying
                    ? 'border-[#C8A24B] shadow-lg ring-1 ring-[#C8A24B]/40'
                    : 'border-[#C8A24B]/20 hover:border-[#C8A24B]/50 hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handlePlay(archive)}
                      className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-gradient-to-br from-[#C8A24B] to-[#A0822C] shadow-md'
                          : 'bg-[#3A6B5B]/15 hover:bg-[#3A6B5B]/25'
                      }`}
                      aria-label={isPlaying ? 'pause' : 'play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-[#2E5547] ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2A2A2A] truncate">{getTitle(archive)}</h3>
                      {archive.title.mn && (
                        <MongolianTextImage
                          key={`archive-${archive.id}-${archive.title.mn}`}
                          type="archive"
                          wordId={archive.id}
                          src={getMongolianArchiveImageSrc(archive.id)}
                          alt={archive.title.mn}
                          fallbackText={archive.title.mn}
                          loading="lazy"
                          srcKey={archive.id}
                          className="mt-1 w-6 h-auto"
                          imgClassName="w-full h-auto"
                        />
                      )}
                      <p className="text-sm text-[#3F3A2E]/70 mt-1 line-clamp-2">
                        {archive.description?.[language] ||
                          archive.description?.zh ||
                          archive.description?.en ||
                          ''}
                      </p>

                      {/* 波形 + 进度 + 拖动手柄（搏克手镯） */}
                      {archive.durationSeconds ? (
                        <div
                          ref={(el) => {
                            waveformRefs.current[archive.id] = el;
                          }}
                          className="relative mt-2.5 h-8 cursor-pointer select-none touch-none"
                          onPointerDown={(e) => handleWaveformPointerDown(archive, e)}
                          onPointerMove={(e) => handleWaveformPointerMove(archive, e)}
                          onPointerLeave={() => handleWaveformPointerLeave(archive)}
                          role="slider"
                          aria-label={t('音频进度', 'Audio progress')}
                          aria-valuemin={0}
                          aria-valuemax={archive.durationSeconds}
                          aria-valuenow={Math.floor((progress || 0) * archive.durationSeconds)}
                        >
                          {/* 波形柱 */}
                          <div className="flex items-center gap-1 h-full">
                            {waves.map((v, i) => {
                              const filled = i / waves.length <= progress;
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-full transition-colors ${
                                    filled
                                      ? isPlaying
                                        ? 'bg-[#C8A24B]'
                                        : 'bg-[#3A6B5B]'
                                      : 'bg-[#C8A24B]/20'
                                  }`}
                                  style={{ height: `${v * 100}%` }}
                                />
                              );
                            })}
                          </div>

                          {/* 拖动手柄 — 搏克手镯 + 草原青 + 白点图拉嘎 */}
                          {progress > 0 && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#3A6B5B] border-2 border-[#C8A24B] pointer-events-none transition-all ${
                                draggingId === archive.id
                                  ? 'w-6 h-6 shadow-[0_0_0_4px_rgba(200,162,75,0.25),0_2px_6px_rgba(0,0,0,0.18)]'
                                  : 'w-[18px] h-[18px] shadow-md'
                              }`}
                              style={{ left: `${progress * 100}%` }}
                              aria-hidden
                            >
                              {/* 中心白点 — 蒙古包天窗图拉嘎 */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}

                          {/* 拖动时显示时间浮窗 */}
                          {draggingId === archive.id && (
                            <div
                              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-[#3D2E1F] text-[#FAF7F0] text-[10px] font-mono rounded shadow-lg whitespace-nowrap pointer-events-none"
                              style={{ left: `${progress * 100}%` }}
                            >
                              {Math.floor((progress * archive.durationSeconds) / 60)}:
                              {String(Math.floor((progress * archive.durationSeconds) % 60)).padStart(2, '0')}
                              {' / '}
                              {Math.floor(archive.durationSeconds / 60)}:
                              {String(archive.durationSeconds % 60).padStart(2, '0')}
                            </div>
                          )}

                          {/* hover 时显示预览时间浮窗（仅未拖动时） */}
                          {!draggingId && hoverTime?.id === archive.id && (
                            <div
                              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-[#3D2E1F]/85 text-[#FAF7F0] text-[10px] font-mono rounded shadow whitespace-nowrap pointer-events-none"
                              style={{ left: `${hoverTime.x}px` }}
                            >
                              {Math.floor((hoverTime.ratio * archive.durationSeconds) / 60)}:
                              {String(Math.floor((hoverTime.ratio * archive.durationSeconds) % 60)).padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 没时长时只展示静态波形，不可拖动 */
                        <div className="mt-2.5 flex items-center gap-1 h-6">
                          {waves.map((v, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-full bg-[#C8A24B]/20"
                              style={{ height: `${v * 100}%` }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-[#3F3A2E]/60">
                        {archive.durationSeconds ? (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 border-[#C8A24B]/30 text-[#A0822C] bg-[#C8A24B]/5">
                            <Clock className="w-3 h-3 mr-1" />
                            {Math.floor(archive.durationSeconds / 60)}:
                            {String(archive.durationSeconds % 60).padStart(2, '0')}
                          </Badge>
                        ) : null}
                        {archive.uploaderName && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {archive.uploaderName}
                          </span>
                        )}
                      </div>
                    </div>
                    {(isAdmin || user?.id === archive.createdByUserId) && (
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingArchive(archive)}
                        >
                          <Edit className="w-3.5 h-3.5 text-[#3F3A2E]/50 hover:text-[#2E5547]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(archive.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#3F3A2E]/50 hover:text-[#A04A2C]" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showUpload && (
        <OralArchiveUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            refreshOralArchives();
          }}
        />
      )}
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} feature="archive" />
      {editingArchive && (
        <OralArchiveEditModal
          archive={editingArchive}
          onClose={() => setEditingArchive(null)}
          onSuccess={() => {
            setEditingArchive(null);
            refreshOralArchives();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// 文化传统 Tab — "草原文典" 网格 + 详情
// ============================================================================
const CULTURE_CATEGORIES: { key: string; zh: string; en: string }[] = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: '传统习俗', zh: '传统习俗', en: 'Customs' },
  { key: '历史人物', zh: '历史人物', en: 'History' },
  { key: '那达慕', zh: '那达慕', en: 'Naadam' },
  { key: '蒙古包', zh: '蒙古包', en: 'Yurt' },
  { key: '服饰', zh: '服饰', en: 'Dress' },
  { key: '饮食', zh: '饮食', en: 'Cuisine' },
  { key: '音乐舞蹈', zh: '音乐舞蹈', en: 'Music & Dance' },
];

function CultureArticlesTab() {
  const { t, language, cultureArticles, refreshCultureArticles } = useApp();
  const { isAdmin, isLoggedIn, user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [editingArticle, setEditingArticle] = useState<CultureArticle | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<CultureArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const getTitle = (item: CultureArticle) => {
    if (language === 'zh') return item.title.zh || item.title.en;
    if (language === 'en') return item.title.en || item.title.zh;
    return item.title.mn || item.title.zh;
  };

  // 分类筛选
  const filtered = useMemo(() => {
    if (activeCategory === 'all') return cultureArticles;
    return cultureArticles.filter((a) => a.category === activeCategory);
  }, [cultureArticles, activeCategory]);

  const availableCategories = useMemo(() => {
    const used = new Set(cultureArticles.map((a) => a.category).filter(Boolean));
    return CULTURE_CATEGORIES.filter((c) => c.key === 'all' || used.has(c.key));
  }, [cultureArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('确定要删除这篇文章吗？', 'Are you sure you want to delete this article?'))) return;
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['x-session'] = token;
      const res = await fetch(`/api/wisdom/culture-articles?id=${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) refreshCultureArticles();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (selectedArticle) {
    return (
      <ArticleDetailView
        article={selectedArticle}
        language={language}
        t={t}
        onBack={() => setSelectedArticle(null)}
        onEdit={() => {
          setEditingArticle(selectedArticle);
          setSelectedArticle(null);
        }}
        onDelete={() => {
          handleDelete(selectedArticle.id);
          setSelectedArticle(null);
        }}
      />
    );
  }

  return (
    <div>
      {/* 顶部：标题 + 上传 */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C8A24B] to-[#A0822C] flex items-center justify-center shadow-sm">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2A2A2A] text-base leading-tight">
              {t('文化传统', 'Culture & Tradition')}
            </h3>
            <p className="text-xs text-[#3F3A2E]/60 leading-tight">
              {t('从那达慕到敖包祭祀，品味草原文明', 'From Naadam to ovoo worship')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (!isLoggedIn) {
              setShowLoginPrompt(true);
              return;
            }
            setShowUpload(true);
          }}
          className="bg-gradient-to-r from-[#C8A24B] to-[#A0822C] hover:from-[#B8923F] hover:to-[#8E7024] text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t('发布文章', 'Publish Article')}
        </Button>
      </div>

      {/* 分类筛选胶囊 */}
      {availableCategories.length > 2 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          <Filter className="w-4 h-4 text-[#A0822C] shrink-0" />
          {availableCategories.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#C8A24B] text-white shadow-sm'
                    : 'bg-[#F5EFE0] text-[#3F3A2E]/70 hover:bg-[#C8A24B]/15 hover:text-[#A0822C]'
                }`}
              >
                {language === 'en' ? cat.en : cat.zh}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="bg-[#FAF7F0] border-[#C8A24B]/20 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-[#C8A24B]/10 items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[#A0822C]/60" />
            </div>
            <p className="text-[#3F3A2E]/70">
              {activeCategory === 'all'
                ? t('暂无文化文章', 'No culture articles yet')
                : t('该分类暂无文章', 'No articles in this category')}
            </p>
            <p className="text-sm text-[#3F3A2E]/50 mt-1">
              {t('点击右上角发布第一篇', 'Click top-right to publish the first article')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <Card
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group cursor-pointer overflow-hidden border-[#C8A24B]/20 hover:border-[#C8A24B]/50 hover:shadow-lg transition-all bg-[#FAF7F0]"
            >
              {/* 封面 */}
              {article.images && article.images[0] ? (
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5EFE0]">
                  <img
                    src={article.images[0]}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#F5EFE0] via-[#FAF7F0] to-[#F5EFE0] flex items-center justify-center relative">
                  <MongolianWatermark text="ᠪᠢᠴᠢᠭ" className="text-6xl" />
                  <ScrollText className="w-12 h-12 text-[#C8A24B]/30" />
                </div>
              )}

              <CardContent className="p-4">
                {/* 分类 + 操作 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  {article.category && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 border-[#3A6B5B]/30 text-[#2E5547] bg-[#3A6B5B]/5"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {article.category}
                    </Badge>
                  )}
                  {(isAdmin || user?.id === article.createdByUserId) && (
                    <div
                      className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingArticle(article)}
                      >
                        <Edit className="w-3 h-3 text-[#3F3A2E]/50 hover:text-[#2E5547]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="w-3 h-3 text-[#3F3A2E]/50 hover:text-[#A04A2C]" />
                      </Button>
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-[#2A2A2A] line-clamp-2 mb-1">{getTitle(article)}</h3>
                {article.title.mn && (
                  <MongolianTextImage
                    key={`culture-title-${article.id}-${article.title.mn}`}
                    type="culture"
                    wordId={article.id}
                    src={getMongolianCultureImageSrc(article.id)}
                    alt={article.title.mn}
                    fallbackText={article.title.mn}
                    loading="lazy"
                    srcKey={article.id}
                    className="text-[#A0822C] w-6 h-auto mb-2"
                    imgClassName="w-full h-auto"
                  />
                )}
                <p className="text-xs text-[#3F3A2E]/70 line-clamp-2">
                  {article.content?.[language] || article.content?.zh || article.content?.en || ''}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#C8A24B]/15 text-xs text-[#3F3A2E]/50">
                  {article.authorName ? (
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {article.authorName}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1 text-[#3A6B5B] font-medium group-hover:gap-1.5 transition-all">
                    {t('阅读', 'Read')}
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showUpload && (
        <CultureArticleUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            refreshCultureArticles();
          }}
        />
      )}
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        feature="article"
      />
      {editingArticle && (
        <CultureArticleEditModal
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onSuccess={() => {
            setEditingArticle(null);
            refreshCultureArticles();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// 文章详情 — 蒙古包内阅读：3 栏并列 + 字号调节 + 阅读进度
// ============================================================================
function ArticleDetailView({
  article,
  language,
  t,
  onBack,
  onEdit,
  onDelete,
}: {
  article: CultureArticle;
  language: string;
  t: (zh: string, en: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { isAdmin, user } = useAuth();
  const [fontScale, setFontScale] = useState(1);

  // 阅读进度
  const [scrollProgress, setScrollProgress] = useState(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max > 0 ? Math.min(1, el.scrollHeight / window.innerHeight / 2) : 0);
  };
  // 简化：基于元素可见度
  useEffect(() => {
    const onWinScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(1, window.scrollY / total) : 0);
    };
    window.addEventListener('scroll', onWinScroll);
    return () => window.removeEventListener('scroll', onWinScroll);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      {/* 顶部操作条 */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-[#2E5547] hover:bg-[#3A6B5B]/10"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('返回文典', 'Back to Library')}
        </Button>
        <div className="flex items-center gap-2">
          {/* 字号调节 */}
          <div className="flex items-center gap-1 bg-[#F5EFE0] rounded-full p-0.5">
            <button
              onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))}
              className="w-7 h-7 rounded-full hover:bg-white text-[#3F3A2E]/60 flex items-center justify-center transition"
              aria-label="decrease font"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] -mt-1.5">-</span>
            </button>
            <span className="text-xs text-[#3F3A2E]/60 px-1">
              {Math.round(fontScale * 100)}%
            </span>
            <button
              onClick={() => setFontScale((s) => Math.min(1.4, s + 0.1))}
              className="w-7 h-7 rounded-full hover:bg-white text-[#3F3A2E]/60 flex items-center justify-center transition"
              aria-label="increase font"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] -mt-1.5">+</span>
            </button>
          </div>
          {(isAdmin || user?.id === article.createdByUserId) && (
            <>
              <Button variant="outline" size="icon" onClick={onEdit} className="border-[#C8A24B]/30">
                <Edit className="w-4 h-4 text-[#A0822C]" />
              </Button>
              <Button variant="outline" size="icon" onClick={onDelete} className="border-[#A04A2C]/30">
                <Trash2 className="w-4 h-4 text-[#A04A2C]" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 阅读进度条 */}
      <div className="h-1 w-full bg-[#C8A24B]/15 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-[#C8A24B] via-[#3A6B5B] to-[#3F5D8E] transition-all duration-200"
          style={{ width: `${Math.max(8, scrollProgress * 100)}%` }}
        />
      </div>

      <ScrollFrame>
        <Card className="overflow-hidden border-[#C8A24B]/30 shadow-xl bg-[#FAF7F0]">
          <KhataRibbon />

          {/* 封面 */}
          {article.images && article.images[0] && (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F5EFE0]">
              <img src={article.images[0]} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#FAF7F0] to-transparent" />
            </div>
          )}

          <CardContent className="p-6 sm:p-8 relative">
            <MongolianWatermark text="ᠪᠢᠴᠢᠭ" className="text-8xl -top-4 right-2" />

            {/* 标题区 */}
            <div className="mb-5">
              {article.category && (
                <Badge
                  variant="outline"
                  className="mb-3 text-xs border-[#3A6B5B]/30 text-[#2E5547] bg-[#3A6B5B]/5"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {article.category}
                </Badge>
              )}
              {article.title.zh && (
                <h1 className="text-3xl font-bold text-[#2A2A2A] leading-tight">{article.title.zh}</h1>
              )}
              {article.title.en && (
                <p className="text-lg text-[#3F3A2E]/65 mt-1.5 italic">{article.title.en}</p>
              )}
              {article.title.mn && (
                <MongolianTextImage
                  key={`culture-detail-title-${article.id}-${article.title.mn}`}
                  type="culture"
                  wordId={article.id}
                  src={getMongolianCultureImageSrc(article.id)}
                  alt={article.title.mn}
                  fallbackText={article.title.mn}
                  loading="eager"
                  fetchPriority="high"
                  srcKey={article.id}
                  className="mt-3 w-8 h-auto"
                  imgClassName="w-full h-auto"
                />
              )}
            </div>

            <CloudDivider />

            {/* 3 栏内容：中 | 英 | 蒙 */}
            <div className="space-y-5" style={{ fontSize: `${fontScale * 100}%` }}>
              {article.content.zh && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#3A6B5B] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">中</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#2E5547]">
                      {t('中文', 'Chinese')}
                    </h3>
                  </div>
                  <p className="whitespace-pre-wrap text-[#3F3A2E] leading-relaxed">
                    {article.content.zh}
                  </p>
                </div>
              )}

              {article.content.en && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#3F5D8E] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">EN</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#2C4470]">
                      {t('英文', 'English')}
                    </h3>
                  </div>
                  <p className="whitespace-pre-wrap text-[#3F3A2E]/85 leading-relaxed italic">
                    {article.content.en}
                  </p>
                </div>
              )}

              {article.content.mn && (
                <div className="rounded-lg border border-[#C8A24B]/30 bg-gradient-to-br from-[#F5EFE0] to-[#FAF7F0] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[#C8A24B] flex items-center justify-center">
                      <Globe2 className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#A0822C]">
                      {t('蒙古语原文', 'Mongolian Original')}
                    </h3>
                    <span className="text-[10px] text-[#3F3A2E]/50">ᠮᠣᠩᠭᠣᠯ</span>
                  </div>
                  <div className="flex justify-center">
                    <MongolianTextImage
                      key={`culture-content-${article.id}-${article.content.mn.slice(0, 80)}`}
                      wordId={article.id}
                      src={getMongolianCultureContentImageSrc(article.id)}
                      alt={article.content.mn.slice(0, 80)}
                      fallbackText={article.content.mn}
                      type="cultureContent"
                      loading="lazy"
                      decoding="async"
                      className="text-[#2A2A2A] w-8 h-auto"
                      imgClassName="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 多图网格 */}
            {article.images && article.images.length > 1 && (
              <>
                <CloudDivider />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {article.images.slice(1).map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden bg-[#F5EFE0] border border-[#C8A24B]/20"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 作者落款 */}
            {article.authorName && (
              <div className="mt-8 pt-4 border-t border-[#C8A24B]/20 flex items-center justify-end gap-2 text-sm text-[#3F3A2E]/65">
                <span className="block w-8 h-px bg-[#C8A24B]/60" />
                <UserIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{article.authorName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollFrame>
    </div>
  );
}

// ============================================================================
// 上传/编辑模态框
// ============================================================================
function ModalShell({
  title,
  titleEn,
  step,
  totalSteps,
  stepLabelZh,
  stepLabelEn,
  onClose,
  children,
  footer,
  theme = 'gold',
}: {
  title: string;
  titleEn: string;
  step?: number;
  totalSteps?: number;
  stepLabelZh?: string;
  stepLabelEn?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  theme?: 'gold' | 'green';
}) {
  const accent = theme === 'green' ? 'from-[#3A6B5B] to-[#2E5547]' : 'from-[#C8A24B] to-[#A0822C]';
  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border-0 shadow-2xl bg-[#FAF7F0]">
        {/* 顶栏 */}
        <div className={`px-6 py-4 bg-gradient-to-r ${accent} text-white flex items-center justify-between flex-shrink-0`}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{title}</h2>
            <p className="text-xs text-white/75 truncate">{titleEn}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/15"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 步骤指示 */}
        {step && totalSteps && (
          <div className="px-6 py-2.5 bg-[#F5EFE0] border-b border-[#C8A24B]/15 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i + 1 <= step ? `w-8 ${theme === 'green' ? 'bg-[#3A6B5B]' : 'bg-[#C8A24B]'}` : 'w-3 bg-[#C8A24B]/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-[#3F3A2E]/60 font-medium">
              {step}/{totalSteps} · {stepLabelZh} / {stepLabelEn}
            </span>
          </div>
        )}

        {/* 主体 */}
        <CardContent className="p-6 flex-1 min-h-0 overflow-y-auto">{children}</CardContent>

        {/* 底部 */}
        <div className="px-6 py-4 bg-[#F5EFE0] border-t border-[#C8A24B]/15 flex justify-end gap-2 flex-shrink-0">
          {footer}
        </div>
      </Card>
    </div>
  );
}

// 通用输入框
function Field({
  label,
  labelEn,
  required,
  hint,
  children,
}: {
  label: string;
  labelEn: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-baseline gap-2 mb-1.5">
        <span className="text-sm font-medium text-[#2A2A2A]">{label}</span>
        {labelEn && <span className="text-xs text-[#3F3A2E]/50">{labelEn}</span>}
        {required && <span className="text-[#A04A2C] text-xs">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#3F3A2E]/50 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full bg-white border border-[#C8A24B]/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A24B] focus:ring-2 focus:ring-[#C8A24B]/15 transition';

// 声音档案上传
function OralArchiveUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useApp();
  const { isLoggedIn } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    titleZh: '',
    titleMn: '',
    titleEn: '',
    descriptionZh: '',
    uploaderName: '',
  });
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 20MB 上限，对齐 Supabase bucket fileSizeLimit
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      alert(
        t(
          `音频文件不能超过 20MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB），请压缩后重试`,
          `Audio file exceeds 20MB limit (current ${(file.size / 1024 / 1024).toFixed(1)}MB). Please compress and retry.`,
        ),
      );
      e.target.value = '';
      return;
    }
    setSelectedAudio(file);
    setAudioFileName(file.name);
    // 读时长
    const url = URL.createObjectURL(file);
    const a = new Audio(url);
    a.addEventListener('loadedmetadata', () => {
      setAudioDuration(Math.round(a.duration));
      URL.revokeObjectURL(url);
    });
  };

  const canNext = step === 1 ? formData.titleZh.trim() : true;
  const canSubmit = step === 1 ? false : step === 2 ? !!selectedAudio : true;

  const handleSubmit = async () => {
    if (!selectedAudio) {
      alert(t('请选择音频文件', 'Please select an audio file'));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('titleZh', formData.titleZh);
      fd.append('titleMn', formData.titleMn);
      fd.append('titleEn', formData.titleEn);
      fd.append('descriptionZh', formData.descriptionZh);
      fd.append('uploaderName', formData.uploaderName);
      fd.append('audioFile', selectedAudio);
      if (audioDuration) fd.append('durationSeconds', String(audioDuration));

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['x-session'] = token;
      const res = await fetch('/api/wisdom/oral-archives', { method: 'POST', headers, body: fd });
      let data;
      try {
        data = await res.json();
      } catch {
        alert(t('服务器响应异常', 'Server response error') + ` (HTTP ${res.status})`);
        setUploading(false);
        return;
      }
      if (data.success) onSuccess();
      else alert(data.error || t('上传失败', 'Upload failed'));
      setUploading(false);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(t('上传失败', 'Upload failed'));
      setUploading(false);
    }
  };

  return (
    <ModalShell
      title={t('上传声音档案', 'Upload Oral Archive')}
      titleEn="Share your voice with the steppe"
      step={step}
      totalSteps={2}
      stepLabelZh={step === 1 ? '填写信息' : '上传音频'}
      stepLabelEn={step === 1 ? 'Basic info' : 'Audio file'}
      theme="green"
      onClose={onClose}
      footer={
        <>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>
                {t('取消', 'Cancel')}
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canNext}
                className="bg-gradient-to-r from-[#3A6B5B] to-[#2E5547] text-white"
              >
                {t('下一步', 'Next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('上一步', 'Back')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={uploading || !isLoggedIn || !canSubmit}
                className="bg-gradient-to-r from-[#3A6B5B] to-[#2E5547] text-white"
              >
                {!isLoggedIn
                  ? t('请先登录', 'Please login first')
                  : uploading
                  ? t('上传中...', 'Uploading...')
                  : t('上传', 'Upload')}
              </Button>
            </>
          )}
        </>
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <Field label="中文标题" labelEn="Chinese Title *" required>
            <input
              className={inputClass}
              value={formData.titleZh}
              onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
              placeholder={t('如：蒙古族长调《辽阔的草原》', 'e.g. Mongolian Long Song')}
            />
          </Field>
          <Field label="蒙古语标题" labelEn="Mongolian Title">
            <input
              className={inputClass}
              value={formData.titleMn}
              onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })}
              placeholder={t('用蒙古文填写', 'In Mongolian script')}
            />
          </Field>
          <Field label="英文标题" labelEn="English Title">
            <input
              className={inputClass}
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
            />
          </Field>
          <Field label="描述" labelEn="Description" hint={t('介绍音频内容、演唱者、故事背景', 'Describe content, singer, story')}>
            <textarea
              className={inputClass}
              rows={3}
              value={formData.descriptionZh}
              onChange={(e) => setFormData({ ...formData, descriptionZh: e.target.value })}
            />
          </Field>
          <Field label="上传者" labelEn="Uploader">
            <input
              className={inputClass}
              value={formData.uploaderName}
              onChange={(e) => setFormData({ ...formData, uploaderName: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-[#3A6B5B]/30 bg-[#3A6B5B]/5 p-6 text-center">
            <Music className="w-12 h-12 mx-auto text-[#3A6B5B]/40 mb-3" />
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="block w-full text-sm text-[#3F3A2E]/70
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-[#3A6B5B] file:text-white
                hover:file:bg-[#2E5547] file:cursor-pointer"
            />
            <p className="text-xs text-[#3F3A2E]/55 mt-3">
              {t('支持 MP3、WAV、M4A 格式，最大 20MB', 'MP3, WAV, M4A up to 20MB')}
            </p>
          </div>

          {selectedAudio && (
            <div className="rounded-lg bg-[#F5EFE0] border border-[#C8A24B]/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3A6B5B] flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2A2A2A] truncate">{audioFileName}</p>
                <p className="text-xs text-[#3F3A2E]/60">
                  {audioDuration > 0
                    ? `${Math.floor(audioDuration / 60)}:${String(audioDuration % 60).padStart(2, '0')}`
                    : t('读取中...', 'Reading...')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedAudio(null);
                  setAudioFileName('');
                  setAudioDuration(0);
                }}
              >
                <Trash2 className="w-4 h-4 text-[#A04A2C]" />
              </Button>
            </div>
          )}

          <div className="rounded-lg bg-[#3A6B5B]/8 p-3 text-xs text-[#2E5547] leading-relaxed">
            <p className="font-semibold mb-1">{t('📌 上传建议', '📌 Tips for quality audio')}</p>
            <p>
              {t(
                '安静环境下录制、避免背景噪音；如为长调或呼麦，请保留完整段落以便学习者体会发声技巧。',
                'Record in a quiet environment. For Long Song or Khoomei, keep complete passages to help learners appreciate vocal techniques.'
              )}
            </p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// 声音档案编辑
function OralArchiveEditModal({
  archive,
  onClose,
  onSuccess,
}: {
  archive: OralArchive;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useApp();
  const [formData, setFormData] = useState({
    titleZh: archive.title.zh,
    titleMn: archive.title.mn,
    titleEn: archive.title.en,
    descriptionZh: archive.description?.zh || '',
    uploaderName: archive.uploaderName || '',
  });
  const [existingAudioUrl] = useState<string | null>(archive.audioUrl || null);
  const existingAudioKey = archive.audioKey || null;
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAudio(file);
      setAudioFileName(file.name);
      setRemoveExistingAudio(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('id', archive.id);
      fd.append('titleZh', formData.titleZh);
      fd.append('titleMn', formData.titleMn);
      fd.append('titleEn', formData.titleEn);
      fd.append('descriptionZh', formData.descriptionZh);
      fd.append('uploaderName', formData.uploaderName);

      if (selectedAudio) {
        fd.append('audioFile', selectedAudio);
        await sendPut(fd);
      } else if (removeExistingAudio) {
        fd.append('existingAudioKey', 'null');
        await sendPut(fd);
      } else {
        fd.append('existingAudioKey', existingAudioKey || '');
        await sendPut(fd);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('保存失败', 'Save failed'));
      setSaving(false);
    }
  };

  const sendPut = async (fd: FormData) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['x-session'] = token;
    const res = await fetch('/api/wisdom/oral-archives', { method: 'PUT', headers, body: fd });
    const data = await res.json();
    if (data.success) onSuccess();
    else alert(t('保存失败', 'Save failed'));
    setSaving(false);
  };

  const hasExistingAudio = existingAudioUrl && !removeExistingAudio;
  const hasNewAudio = selectedAudio !== null;

  return (
    <ModalShell
      title={t('编辑声音档案', 'Edit Oral Archive')}
      titleEn="Update oral archive"
      theme="green"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('取消', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#3A6B5B] to-[#2E5547] text-white"
          >
            {saving ? t('保存中...', 'Saving...') : t('保存', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="中文标题" labelEn="Chinese Title *">
          <input
            className={inputClass}
            value={formData.titleZh}
            onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
          />
        </Field>
        <Field label="蒙古语标题" labelEn="Mongolian Title">
          <input
            className={inputClass}
            value={formData.titleMn}
            onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })}
          />
        </Field>
        <Field label="英文标题" labelEn="English Title">
          <input
            className={inputClass}
            value={formData.titleEn}
            onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
          />
        </Field>
        <Field label="音频文件" labelEn="Audio File" hint={t('选择新音频将替换原有文件', 'New file replaces existing')}>
          <div className="space-y-2">
            {hasExistingAudio && !hasNewAudio && (
              <div className="rounded-lg bg-[#3A6B5B]/8 p-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#3A6B5B]" />
                <span className="text-sm text-[#2E5547] flex-1">{t('已有音频', 'Current audio')}</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingAudio(true)}
                  className="text-xs text-[#A04A2C] hover:underline"
                >
                  {t('移除', 'Remove')}
                </button>
              </div>
            )}
            {removeExistingAudio && !hasNewAudio && (
              <div className="rounded-lg bg-[#A04A2C]/10 p-3 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#A04A2C]" />
                <span className="text-sm text-[#7A3520] flex-1">{t('音频将被删除', 'Audio will be removed')}</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingAudio(false)}
                  className="text-xs text-[#3A6B5B] hover:underline"
                >
                  {t('保留', 'Keep')}
                </button>
              </div>
            )}
            {hasNewAudio && (
              <div className="rounded-lg bg-[#C8A24B]/10 p-3 flex items-center gap-2">
                <Music className="w-4 h-4 text-[#A0822C]" />
                <span className="text-sm text-[#A0822C] flex-1">{audioFileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAudio(null);
                    setAudioFileName('');
                  }}
                  className="text-xs text-[#A04A2C] hover:underline"
                >
                  {t('取消', 'Cancel')}
                </button>
              </div>
            )}
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="block w-full text-sm text-[#3F3A2E]/70
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-[#3A6B5B] file:text-white
                hover:file:bg-[#2E5547] file:cursor-pointer"
            />
          </div>
        </Field>
      </div>
    </ModalShell>
  );
}

// 文化文章上传
function CultureArticleUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useApp();
  const { isLoggedIn } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    titleZh: '',
    titleMn: '',
    titleEn: '',
    contentZh: '',
    contentMn: '',
    contentEn: '',
    category: '',
    authorName: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Step 1 只校验 titleZh（contentZh 留到 Step 2 输入）
  const canNextStep1 = formData.titleZh.trim().length > 0;
  // Step 2 校验 contentZh
  const canNextStep2 = formData.contentZh.trim().length > 0;
  const canSubmit = step === 3;

  const handleSubmit = async () => {
    if (!formData.titleZh || !formData.contentZh) {
      alert(t('请填写中文标题和内容', 'Please fill title and content'));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('titleZh', formData.titleZh);
      fd.append('titleMn', formData.titleMn);
      fd.append('titleEn', formData.titleEn);
      fd.append('contentZh', formData.contentZh);
      fd.append('contentMn', formData.contentMn);
      fd.append('contentEn', formData.contentEn);
      fd.append('category', formData.category);
      fd.append('authorName', formData.authorName);
      if (selectedImage && imagePreview) {
        fd.append('imageBase64', imagePreview);
        fd.append('imageType', selectedImage.type);
      }

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['x-session'] = token;
      const res = await fetch('/api/wisdom/culture-articles', { method: 'POST', headers, body: fd });
      const data = await res.json();
      if (data.success) onSuccess();
      else alert(data.error || t('发布失败', 'Publish failed'));
    } catch (error) {
      console.error('Publish failed:', error);
      alert(t('发布失败', 'Publish failed'));
    }
    setUploading(false);
  };

  return (
    <ModalShell
      title={t('发布文化文章', 'Publish Culture Article')}
      titleEn="Share a piece of Mongolian culture"
      step={step}
      totalSteps={3}
      stepLabelZh={['基础信息', '正文内容', '封面预览'][step - 1] || ''}
      stepLabelEn={['Basics', 'Content', 'Cover'][step - 1] || ''}
      theme="gold"
      onClose={onClose}
      footer={
        <>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('上一步', 'Back')}
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canNextStep1 : !canNextStep2}
              className="bg-gradient-to-r from-[#C8A24B] to-[#A0822C] text-white"
            >
              {t('下一步', 'Next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={uploading || !isLoggedIn || !canSubmit}
              className="bg-gradient-to-r from-[#C8A24B] to-[#A0822C] text-white"
            >
              {!isLoggedIn
                ? t('请先登录', 'Please login first')
                : uploading
                ? t('发布中...', 'Publishing...')
                : t('发布', 'Publish')}
            </Button>
          )}
          {step === 1 && <Button variant="outline" onClick={onClose}>{t('取消', 'Cancel')}</Button>}
        </>
      }
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="中文标题" labelEn="Chinese *" required>
              <input
                className={inputClass}
                value={formData.titleZh}
                onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
                placeholder={t('如：那达慕盛会的由来', 'e.g. Origins of Naadam')}
              />
            </Field>
            <Field label="蒙古语标题" labelEn="Mongolian">
              <input
                className={inputClass}
                value={formData.titleMn}
                onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })}
                placeholder="ᠨᠠᠳᠠᠮ"
              />
            </Field>
            <Field label="英文标题" labelEn="English">
              <input
                className={inputClass}
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="分类" labelEn="Category" hint={t('如：那达慕 / 蒙古包 / 服饰', 'e.g. Naadam / Yurt / Dress')}>
              <input
                className={inputClass}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </Field>
            <Field label="作者" labelEn="Author">
              <input
                className={inputClass}
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="中文正文" labelEn="Chinese Content *" required>
            <textarea
              className={inputClass}
              rows={6}
              value={formData.contentZh}
              onChange={(e) => setFormData({ ...formData, contentZh: e.target.value })}
              placeholder={t('详细介绍文化背景、典故、意义…', 'Describe the cultural background in detail…')}
            />
          </Field>
          <Field label="蒙古语正文" labelEn="Mongolian Content" hint={t('如有蒙古文原文请填写', 'Optional Mongolian original')}>
            <textarea
              className={inputClass}
              rows={3}
              value={formData.contentMn}
              onChange={(e) => setFormData({ ...formData, contentMn: e.target.value })}
              placeholder="ᠨᠠᠳᠠᠮ ᠦᠨᠡᠨ ᠰᠤᠷᠤᠯᠴᠠᠯ"
            />
          </Field>
          <Field label="英文正文" labelEn="English Content">
            <textarea
              className={inputClass}
              rows={4}
              value={formData.contentEn}
              onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
            />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Field label="封面图片" labelEn="Cover Image" hint={t('JPG、PNG，最大 5MB', 'JPG, PNG up to 5MB')}>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 border-2 border-dashed border-[#C8A24B]/40 rounded-lg overflow-hidden flex items-center justify-center bg-[#F5EFE0]">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#C8A24B]/40" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-[#3F3A2E]/70
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:bg-[#C8A24B] file:text-white
                    hover:file:bg-[#A0822C] file:cursor-pointer"
                />
                {selectedImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-[#A04A2C] hover:bg-[#A04A2C]/10"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    {t('移除图片', 'Remove Image')}
                  </Button>
                )}
              </div>
            </div>
          </Field>

          {/* 预览摘要 */}
          <div className="rounded-lg border border-[#C8A24B]/30 bg-[#F5EFE0] p-4 space-y-2 text-sm">
            <p className="text-[#A0822C] font-semibold mb-2 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {t('发布预览', 'Publish Preview')}
            </p>
            <p>
              <span className="text-[#3F3A2E]/60">{t('标题', 'Title')}:</span>{' '}
              <span className="text-[#2A2A2A] font-medium">
                {formData.titleZh || '—'}
              </span>
            </p>
            <p>
              <span className="text-[#3F3A2E]/60">{t('分类', 'Category')}:</span>{' '}
              <span className="text-[#2A2A2A]">
                {formData.category || '—'}
              </span>
            </p>
            <p>
              <span className="text-[#3F3A2E]/60">{t('作者', 'Author')}:</span>{' '}
              <span className="text-[#2A2A2A]">
                {formData.authorName || '—'}
              </span>
            </p>
            <p>
              <span className="text-[#3F3A2E]/60">{t('中文内容', 'Content')}:</span>{' '}
              <span className="text-[#2A2A2A] line-clamp-2">
                {formData.contentZh || '—'}
              </span>
            </p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// 文化文章编辑
function CultureArticleEditModal({
  article,
  onClose,
  onSuccess,
}: {
  article: CultureArticle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useApp();
  const [formData, setFormData] = useState({
    titleZh: article.title.zh,
    titleMn: article.title.mn,
    titleEn: article.title.en,
    contentZh: article.content.zh,
    contentMn: article.content.mn,
    contentEn: article.content.en,
    category: article.category || '',
    authorName: article.authorName || '',
  });
  const [existingImageUrl] = useState<string | null>(article.images?.[0] || null);
  const existingImageKeys = article.imageKeys || [];
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('id', article.id);
      fd.append('titleZh', formData.titleZh);
      fd.append('titleMn', formData.titleMn);
      fd.append('titleEn', formData.titleEn);
      fd.append('contentZh', formData.contentZh);
      fd.append('contentMn', formData.contentMn);
      fd.append('contentEn', formData.contentEn);
      fd.append('category', formData.category);
      fd.append('authorName', formData.authorName);

      if (selectedImage && imagePreview) {
        fd.append('imageBase64', imagePreview);
        fd.append('imageType', selectedImage.type);
      } else if (removeExistingImage) {
        fd.append('existingImageKeys', JSON.stringify([]));
      } else {
        fd.append('existingImageKeys', JSON.stringify(existingImageKeys));
      }

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['x-session'] = token;
      const res = await fetch('/api/wisdom/culture-articles', { method: 'PUT', headers, body: fd });
      const data = await res.json();
      if (data.success) onSuccess();
    } catch (error) {
      console.error('Save failed:', error);
    }
    setSaving(false);
  };

  const currentPreview = imagePreview || (removeExistingImage ? null : existingImageUrl);

  return (
    <ModalShell
      title={t('编辑文化文章', 'Edit Culture Article')}
      titleEn="Update culture article"
      theme="gold"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('取消', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#C8A24B] to-[#A0822C] text-white"
          >
            {saving ? t('保存中...', 'Saving...') : t('保存', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="中文标题" labelEn="Chinese Title *" required>
            <input
              className={inputClass}
              value={formData.titleZh}
              onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
            />
          </Field>
          <Field label="蒙古语标题" labelEn="Mongolian Title">
            <input
              className={inputClass}
              value={formData.titleMn}
              onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })}
            />
          </Field>
          <Field label="英文标题" labelEn="English Title">
            <input
              className={inputClass}
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
            />
          </Field>
        </div>
        <Field label="中文正文" labelEn="Chinese Content *" required>
          <textarea
            className={inputClass}
            rows={5}
            value={formData.contentZh}
            onChange={(e) => setFormData({ ...formData, contentZh: e.target.value })}
          />
        </Field>
        <Field label="蒙古语正文" labelEn="Mongolian Content">
          <textarea
            className={inputClass}
            rows={3}
            value={formData.contentMn}
            onChange={(e) => setFormData({ ...formData, contentMn: e.target.value })}
          />
        </Field>
        <Field label="英文正文" labelEn="English Content">
          <textarea
            className={inputClass}
            rows={4}
            value={formData.contentEn}
            onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="分类" labelEn="Category">
            <input
              className={inputClass}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </Field>
          <Field label="作者" labelEn="Author">
            <input
              className={inputClass}
              value={formData.authorName}
              onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
            />
          </Field>
        </div>
        <Field label="封面图片" labelEn="Cover Image" hint={t('选择新图片将替换原有图片', 'New image replaces existing')}>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed border-[#C8A24B]/30 rounded-lg overflow-hidden flex items-center justify-center bg-[#F5EFE0]">
              {currentPreview ? (
                <img src={currentPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-[#C8A24B]/40" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-[#3F3A2E]/70
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-medium file:bg-[#C8A24B] file:text-white
                  hover:file:bg-[#A0822C] file:cursor-pointer"
              />
              {existingImageUrl && !removeExistingImage && !selectedImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-[#A04A2C] hover:bg-[#A04A2C]/10"
                  onClick={() => setRemoveExistingImage(true)}
                >
                  {t('移除当前图片', 'Remove Current Image')}
                </Button>
              )}
              {removeExistingImage && !selectedImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-[#3A6B5B] hover:bg-[#3A6B5B]/10"
                  onClick={() => setRemoveExistingImage(false)}
                >
                  {t('恢复当前图片', 'Keep Current Image')}
                </Button>
              )}
              {selectedImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-[#A04A2C] hover:bg-[#A04A2C]/10"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                >
                  {t('取消新图片', 'Cancel New Image')}
                </Button>
              )}
            </div>
          </div>
        </Field>
      </div>
    </ModalShell>
  );
}

// ============================================================================
// 主页面
// ============================================================================
export function WisdomPage() {
  const { t } = useApp();

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      {/* 顶部 Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#3A6B5B] via-[#2E5547] to-[#244A3D] text-white">
        {/* 装饰：奥云格日 SVG 大底纹 */}
        <svg
          className="absolute -right-12 -top-8 w-72 h-72 text-[#C8A24B]/12 pointer-events-none"
          viewBox="0 0 200 200"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="100" cy="100" r="98" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M40 100 Q60 60 100 100 T160 100" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M40 100 Q60 140 100 100 T160 100" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <svg
          className="absolute -left-16 bottom-0 w-64 h-64 text-[#C8A24B]/8 pointer-events-none"
          viewBox="0 0 200 200"
          fill="currentColor"
          aria-hidden
        >
          <path d="M20 100 Q50 30 100 100 T180 100" stroke="currentColor" strokeWidth="3" fill="none" />
          <path d="M20 100 Q50 170 100 100 T180 100" stroke="currentColor" strokeWidth="3" fill="none" />
        </svg>

        <div className="max-w-4xl mx-auto px-4 pt-10 pb-8 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#C8A24B] to-[#A0822C] rounded-2xl mb-4 shadow-lg ring-2 ring-[#C8A24B]/30">
            <Tent className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">
            {t('文化中心', 'Cultural Center')}
          </h1>
          <p className="mt-2 text-white/85 text-sm sm:text-base">
            {t(
              '草原文化全景：千年智慧语录、珍贵声音档案、典藏文化篇章',
              'Steppe Culture: A millennium of wisdom quotes, oral archives, and cultural chronicles'
            )}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Quote className="w-3.5 h-3.5" />
              {t('语录', 'Quotes')}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" />
              {t('声音', 'Voices')}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="flex items-center gap-1">
              <ScrollText className="w-3.5 h-3.5" />
              {t('文典', 'Scrolls')}
            </span>
          </div>
        </div>
      </div>

      {/* 主体 Tabs */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10 pb-12">
        <Tabs defaultValue="wisdom" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#FAF7F0] border border-[#C8A24B]/25 shadow-sm p-1 rounded-2xl h-auto">
            <TabsTrigger
              value="wisdom"
              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#C8A24B] data-[state=active]:to-[#A0822C] data-[state=active]:text-white data-[state=active]:shadow-md text-[#3F3A2E]/70 hover:text-[#A0822C] transition"
            >
              <Quote className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">{t('智慧语录', 'Wisdom')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="oral"
              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#3A6B5B] data-[state=active]:to-[#2E5547] data-[state=active]:text-white data-[state=active]:shadow-md text-[#3F3A2E]/70 hover:text-[#2E5547] transition"
            >
              <Headphones className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">{t('声音档案', 'Voices')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="culture"
              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#3F5D8E] data-[state=active]:to-[#2C4470] data-[state=active]:text-white data-[state=active]:shadow-md text-[#3F3A2E]/70 hover:text-[#2C4470] transition"
            >
              <ScrollText className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">{t('文化文典', 'Scrolls')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wisdom" className="mt-0">
            <WisdomQuotesTab />
          </TabsContent>
          <TabsContent value="oral" className="mt-0">
            <OralArchiveTab />
          </TabsContent>
          <TabsContent value="culture" className="mt-0">
            <CultureArticlesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
