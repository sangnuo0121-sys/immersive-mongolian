'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Star, Zap, ChevronDown, Shield, Globe2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useAuth } from '@/hooks/useAuth';

/**
 * 哈达丝带 — Header 顶部金色装饰条
 */
function KhataRibbon({ position = 'top' }: { position?: 'top' | 'bottom' }) {
  const isTop = position === 'top';
  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 ${
        isTop ? 'top-0' : 'bottom-0'
      } h-[3px] bg-gradient-to-r from-transparent via-[#C8A661] to-transparent`}
    />
  );
}

/**
 * 毡毯纹理背景 — 极淡的奶白暖色背景
 */
function FeltBackground() {
  return (
    <>
      {/* 奶白底色 */}
      <div className="absolute inset-0 bg-[#FAF7F0]" />
      {/* 毡毯纹理：极淡的圆点 + 暖色光晕 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 30%, rgba(200, 166, 97, 0.10) 0%, transparent 35%), radial-gradient(circle at 75% 70%, rgba(47, 93, 98, 0.08) 0%, transparent 35%)",
        }}
      />
      {/* 细横纹：模拟毡毯织线 */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #2F5D62 0px, #2F5D62 1px, transparent 1px, transparent 4px)",
        }}
      />
    </>
  );
}

/**
 * 蒙古文小标签（透明背景，斜置）
 */
function MongolianTag({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span
      className={`text-[10px] text-[#8B6F3D] font-medium select-none ${className}`}
      style={{ writingMode: 'vertical-rl', letterSpacing: '0.05em' }}
      lang="mn-Mong"
    >
      {text}
    </span>
  );
}

export function Header() {
  const { language, setLanguage, t, xpState, getLevelProgress, getLevelTitleInfo } = useApp();
  const { isAdmin } = useAuth();

  const progress = getLevelProgress();
  const levelTitle = getLevelTitleInfo(xpState.level);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8DFC8]/60 shadow-[0_2px_12px_-4px_rgba(200,166,97,0.18)]">
      <div className="relative">
        <FeltBackground />
        <KhataRibbon position="top" />

        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Home */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 group">
                {/* 蒙古文 Logo — 金边圆环 + 蒙古文 ᠮᠣ */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#C8A661] to-[#A88B4D] flex items-center justify-center shadow-md ring-2 ring-[#FAF7F0] ring-offset-[1.5px] ring-offset-[#C8A661] transition-transform group-hover:scale-105">
                    <span
                      className="text-white text-lg sm:text-xl font-bold leading-none"
                      style={{ writingMode: 'vertical-rl' }}
                      lang="mn-Mong"
                    >
                      ᠮᠣ
                    </span>
                  </div>
                  {/* 顶部小金点（哈达结） */}
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C8A661] ring-1 ring-[#FAF7F0]" />
                </div>

                {/* 站名 + 双副标 */}
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-[#3D2E1F] text-sm sm:text-base truncate whitespace-nowrap tracking-wide">
                    {t('沉浸式学蒙古语', 'Immersive Mongolian')}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-[#8B6F3D] font-medium truncate whitespace-nowrap flex items-center gap-1.5">
                    <span>{t('探索草原文化', 'Explore Steppe Culture')}</span>
                    <span className="text-[#C8A661]">·</span>
                    <span className="font-mn text-[#8B6F3D]" lang="mn-Mong" style={{ fontSize: '11px' }}>
                      ᠮᠣᠩᠭᠣᠯ
                    </span>
                  </p>
                </div>
              </Link>
            </div>

            {/* XP & Stats */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
              {/* 连续学习 — 戈壁赭火焰 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help group">
                      <div className="relative">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#A64B2A] group-hover:scale-110 transition-transform" />
                        {xpState.streak > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#A64B2A] animate-pulse" />
                        )}
                      </div>
                      <span className="font-bold text-sm sm:text-base text-[#A64B2A]">{xpState.streak}</span>
                      <span className="hidden sm:inline text-xs text-[#8B6F3D]">{t('天', 'd')}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#3D2E1F] text-[#FAF7F0]">
                    <p>{t('连续学习', 'Streak')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* 等级 — 草原青徽章 + 蒙古文 Lv */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 bg-gradient-to-r from-[#2F5D62]/10 to-[#3F7D82]/10 border-[#2F5D62]/30 cursor-help px-1.5 sm:px-2.5 hover:from-[#2F5D62]/20 hover:to-[#3F7D82]/20 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C8A661] fill-[#C8A661]" />
                        <span className="font-bold text-[#2F5D62] text-xs sm:text-sm">Lv.{xpState.level}</span>
                        <span className="hidden md:inline text-base ml-0.5">{levelTitle.icon}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gradient-to-br from-[#FAF7F0] to-[#F0E8D0] border-[#C8A661]/40 p-3 max-w-xs">
                      <div className="text-center">
                        <p className="font-bold text-[#2F5D62] text-sm">
                          {language === 'zh' ? levelTitle.nameZh : levelTitle.nameEn}
                        </p>
                        <p className="text-xs text-[#8B6F3D] mt-0.5">
                          {language === 'zh' ? levelTitle.nameEn : levelTitle.nameZh}
                        </p>
                        <p className="text-xs text-[#5C4A33] mt-1.5">
                          {levelTitle.description[language]}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* XP 进度条 — 金色哈达 */}
                <div className="w-20 sm:w-28 hidden sm:block">
                  <div className="flex items-center justify-between text-[10px] text-[#8B6F3D] mb-0.5">
                    <span className="font-mono">{progress.current} XP</span>
                    <span className="font-mono opacity-60">{progress.needed} XP</span>
                  </div>
                  <div className="relative h-2 rounded-full overflow-hidden bg-[#2F5D62]/15">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C8A661] via-[#D4B574] to-[#C8A661] transition-all"
                      style={{ width: `${progress.progress * 100}%` }}
                    />
                    {/* 哈达丝带光泽 */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-b from-white/30 to-transparent transition-all"
                      style={{ width: `${progress.progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* 总经验值 — 蒙古文 XP 小标签 */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden sm:flex items-center gap-1 text-[#2F5D62] cursor-help">
                        <Zap className="w-4 h-4 text-[#C8A661] fill-[#C8A661]" />
                        <span className="font-bold text-sm font-mono">{xpState.totalXP}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3D2E1F] text-[#FAF7F0]">
                      <p>{t('总经验值', 'Total XP')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Admin 入口 — 金盾徽章 */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#A88B4D] bg-gradient-to-r from-[#C8A661]/15 to-[#A88B4D]/15 border border-[#C8A661]/40 rounded-full hover:from-[#C8A661]/25 hover:to-[#A88B4D]/25 hover:text-[#8B6F3D] transition-all shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {t('管理', 'Admin')}
                </Link>
              )}

              {/* 语言切换 — 双旗 + 苏力德装饰 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-[#3D2E1F] bg-[#FAF7F0] rounded-lg hover:bg-[#F0E8D0] transition-colors border border-[#C8A661]/40 shadow-sm">
                    {language === 'zh' ? (
                      <>
                        <span className="text-base leading-none">🇨🇳</span>
                        <span className="hidden sm:inline">中文</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base leading-none">🇺🇸</span>
                        <span className="hidden sm:inline">EN</span>
                      </>
                    )}
                    <Globe2 className="w-3.5 h-3.5 text-[#C8A661]" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#8B6F3D]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#FAF7F0] border-[#C8A661]/40">
                  <DropdownMenuItem
                    onClick={() => setLanguage('zh')}
                    className="cursor-pointer hover:bg-[#F0E8D0] focus:bg-[#F0E8D0]"
                  >
                    <span className="mr-2 text-base">🇨🇳</span>
                    <span>中文</span>
                    <span className="ml-auto text-[10px] text-[#8B6F3D]" lang="mn-Mong">
                      ᠬᠢᠲᠠᠳ
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLanguage('en')}
                    className="cursor-pointer hover:bg-[#F0E8D0] focus:bg-[#F0E8D0]"
                  >
                    <span className="mr-2 text-base">🇺🇸</span>
                    <span>English</span>
                    <span className="ml-auto text-[10px] text-[#8B6F3D]" lang="mn-Mong">
                      ᠠᠩᠭᠯᠢ
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* 底沿金色装饰线 */}
        <div className="relative h-[1px] bg-gradient-to-r from-transparent via-[#C8A661]/60 to-transparent" />
      </div>
    </header>
  );
}

/**
 * 升级弹窗 — 蒙古包穹顶 + 哈达丝带 + 金色光晕
 */
export function LevelUpModal() {
  const { showLevelUp, newLevel, hideLevelUp, t, getLevelTitleInfo, language } = useApp();
  const levelTitle = getLevelTitleInfo(newLevel);

  useEffect(() => {
    if (!showLevelUp) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideLevelUp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLevelUp, hideLevelUp]);

  if (!showLevelUp) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          hideLevelUp();
        }
      }}
    >
      <div
        className="relative bg-gradient-to-br from-[#FAF7F0] via-[#F5EDD8] to-[#E8D9B0] rounded-3xl p-8 text-center animate-in zoom-in duration-300 border-2 border-[#C8A661] shadow-2xl max-w-md w-full mx-4 cursor-default overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部金色光晕（哈达） */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-radial from-[#C8A661]/40 via-[#C8A661]/10 to-transparent rounded-full blur-2xl" />

        {/* 顶部哈达丝带 */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#A88B4D] via-[#C8A661] to-[#A88B4D]" />
        {/* 底部哈达丝带 */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#A88B4D] via-[#C8A661] to-[#A88B4D]" />

        {/* 蒙古文小字顶饰（已移除） */}
        <div className="relative z-10">
          {/* 等级图标（蒙古包穹顶） */}
          <div className="text-6xl mb-3 mt-1 animate-bounce">{levelTitle.icon}</div>

          <h2 className="text-2xl font-bold text-[#3D2E1F] mb-2 tracking-wide">
            {t('恭喜升级！', 'Level Up!')}
          </h2>

          <div className="flex items-center justify-center gap-2 mb-3">
            <Star className="w-8 h-8 text-[#C8A661] fill-[#C8A661]" />
            <span className="text-4xl font-bold text-[#2F5D62]">Level {newLevel}</span>
            <Star className="w-8 h-8 text-[#C8A661] fill-[#C8A661]" />
          </div>

          {/* 等级名 */}
          <div className="text-xl text-[#2F5D62] font-bold mb-1">
            {language === 'zh' ? levelTitle.nameZh : levelTitle.nameEn}
          </div>
          <div className="text-sm text-[#8B6F3D] mb-3 italic">
            {language === 'zh' ? levelTitle.nameEn : levelTitle.nameZh}
          </div>

          {/* 描述 */}
          <p className="text-[#3D2E1F] mb-6 leading-relaxed">
            {levelTitle.description[language]}
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={hideLevelUp}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#C8A661] to-[#A88B4D] text-white font-bold rounded-full hover:from-[#B8964F] hover:to-[#96773E] transition-all shadow-lg hover:shadow-xl text-lg cursor-pointer active:scale-95 touch-manipulation select-none"
            >
              {t('继续学习', 'Continue Learning')}
            </button>
            <button
              onClick={hideLevelUp}
              className="w-full px-4 py-2 text-[#8B6F3D] font-medium rounded-lg hover:bg-[#C8A661]/10 transition-colors text-sm cursor-pointer active:scale-95 touch-manipulation select-none"
            >
              {t('稍后处理', 'Later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * XP 增加动画提示 — 哈达飘带
 */
interface XPToastProps {
  amount: number;
  onComplete: () => void;
}

export function XPToast({ amount, onComplete }: XPToastProps) {
  return (
    <div
      className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300"
      onAnimationEnd={onComplete}
    >
      <div className="relative">
        {/* 主飘带 */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C8A661] via-[#D4B574] to-[#C8A661] text-white font-bold rounded-full shadow-lg border border-[#A88B4D]">
          <Zap className="w-5 h-5 fill-white" />
          <span className="font-mono">+{amount} XP</span>
        </div>
        {/* 顶部高光 */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none" />
        {/* 飘带尾（哈达飘尾） */}
        <div className="absolute -bottom-1 left-3 w-2 h-3 bg-[#A88B4D] rotate-12 rounded-b-sm" />
        <div className="absolute -bottom-1.5 left-5 w-1.5 h-2.5 bg-[#96773E] rotate-12 rounded-b-sm" />
      </div>
    </div>
  );
}
