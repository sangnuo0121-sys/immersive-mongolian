'use client';

import { useApp } from '@/context/AppContext';
import { Word } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { MongolianTextImage } from './MongolianTextImage';

function themeColor(theme: string): string {
  let hash = 0;
  for (const character of theme) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `#${(hash & 0xffffff).toString(16).padStart(6, '0')}`;
}

interface MongolianWordCardProps {
  word: Word;
  layout?: 'horizontal' | 'vertical';
  showExample?: boolean;
  showActions?: boolean;
  onLearn?: () => void;
  compact?: boolean;
}

export function MongolianWordCard({
  word,
  layout = 'vertical',
  showExample = false,
  showActions = true,
  onLearn,
  compact = false,
}: MongolianWordCardProps) {
  const { language, t, hasWordAudio, getFirstAudioUrl, getWordAudios } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isVertical = layout === 'vertical';
  const wordHasAudio = hasWordAudio(word.id);
  // 取优先级最高的 audio label：official > community（只取首个即可）
  const wordAudios = wordHasAudio ? getWordAudios(word.id) : [];
  const firstAudio = wordAudios[0];
  const hasOfficial = wordAudios.some(a => a.label === 'official');

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wordHasAudio) return;
    const audioUrl = getFirstAudioUrl(word.id);
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onerror = () => {
      setIsPlaying(false);
    };
    audioRef.current.play();
  };

  return (
    <Card
      className={`
        relative transition-all duration-300
        hover:shadow-lg hover:scale-[1.02]
        ${isVertical ? 'w-48' : 'w-full'}
        ${compact ? 'border-l-4' : ''}
      `}
      style={{
        borderLeftColor: word.theme ? themeColor(word.theme) : undefined,
        borderLeftWidth: compact ? '4px' : undefined,
        overflow: 'visible',
      }}
    >
      {hasOfficial && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 text-amber-700 text-[10px] font-medium rounded-full shadow-sm">
          <Sparkles className="w-3 h-3" />
          {t('官方', 'Official')}
        </div>
      )}
      <CardContent className={`p-4 ${isVertical ? 'flex flex-col items-center' : 'flex items-center gap-4'}`}>
        {/* 蒙古文 - 使用预渲染 SVG path 文件（稳定、跨浏览器） */}
        <MongolianTextImage
          key={`${word.id}-${word.mongolian}`}
          wordId={word.id}
          src={word.mongolianImageSrc}
          alt={word.mongolian}
          fallbackText={word.mongolian}
          loading="lazy"
          decoding="async"
          srcKey={word.id}
          className={isVertical ? 'mb-2 w-8 h-auto' : 'w-5 h-auto'}
          imgClassName="w-full h-auto"
        />

        {/* 拼音 */}
        {word.pinyin && (
          <div className="text-sm text-slate-500 font-mono">
            [{word.pinyin}]
          </div>
        )}

        {/* 翻译 */}
        <div className={`text-center ${isVertical ? 'mt-2' : ''}`}>
          <div className="text-lg font-semibold text-slate-700">
            {word.translation[language]}
          </div>
          <div className="text-xs text-slate-400">
            {language === 'zh' ? word.translation.en : word.translation.zh}
          </div>
        </div>

        {/* 例句 */}
        {showExample && word.example && (
          <div className={`mt-3 p-2 bg-slate-50 rounded-lg ${isVertical ? 'w-full' : ''}`}>
            <div className="text-xs text-slate-500 mb-1">
              {t('例句', 'Example')}
            </div>
            <MongolianTextImage
              key={`example-${word.id}-${word.example.mongolian}`}
              wordId={`example-${word.id}`}
              src={`/mongolian-rendered/words/example-${word.id}.svg`}
              alt={word.example.mongolian}
              fallbackText={word.example.mongolian}
              loading="lazy"
              decoding="async"
              srcKey={`example-${word.id}`}
              className="text-slate-700 w-6 h-auto"
              imgClassName="w-full h-auto"
            />
            <div className="text-xs text-slate-500 mt-1">
              {word.example.translation[language]}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {showActions && (
          <div className={`flex gap-2 mt-3 ${isVertical ? 'w-full justify-center' : ''}`}>
            {onLearn && (
              <button
                onClick={onLearn}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                {t('学习', 'Learn')}
              </button>
            )}
            {wordHasAudio ? (
              <button
                onClick={playAudio}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                {t('发音', 'Pronounce')}
              </button>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 text-slate-400 text-sm">
                <VolumeX className="w-4 h-4" />
                {t('暂无音频', 'No audio')}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 简洁版单词卡（用于列表展示）
export function WordCardCompact({ word }: { word: Word }) {
  const { language, t, hasWordAudio } = useApp();
  const wordHasAudio = hasWordAudio(word.id);

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <MongolianTextImage
          key={`${word.id}-${word.mongolian}`}
          wordId={word.id}
          src={word.mongolianImageSrc}
          alt={word.mongolian}
          fallbackText={word.mongolian}
          loading="lazy"
          decoding="async"
          srcKey={word.id}
          className="w-6 h-auto"
          imgClassName="w-full h-auto"
        />
        <div>
          <div className="font-medium text-slate-700">
            {word.translation[language]}
          </div>
          {word.pinyin && (
            <div className="text-xs text-slate-400">[{word.pinyin}]</div>
          )}
          {word.isUserUploaded && (
            <Badge variant="outline" className="mt-1 text-xs bg-blue-50 text-blue-600 border-blue-200">
              {t('用户', 'User')}
            </Badge>
          )}
        </div>
      </div>
      {wordHasAudio ? (
        <span className="text-emerald-500">
          <Volume2 className="w-5 h-5" />
        </span>
      ) : (
        <span className="text-slate-300">
          <VolumeX className="w-5 h-5" />
        </span>
      )}
    </div>
  );
}
