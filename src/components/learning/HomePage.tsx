'use client';

import { useApp } from '@/context/AppContext';
import { XP_RULES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { AnnouncementBoard } from '@/components/learning/AnnouncementBoard';
import Link from 'next/link';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import { getMongolianHeroImageSrc, getMongolianWisdomImageSrc } from '@/lib/mongolian-image-src';
import { VisitorCounter } from '@/components/common/VisitorCounter';
import { LevelGuide } from './LevelGuide';
import {
  SteppeHorizon,
  YurtSilhouette,
  KhataRibbon,
  CloudPattern,
  WolfTotem,
  MorinKhuur,
  ScrollFrame,
  SoyomboFlame,
  NaadamRing,
  MongolianVerticalWatermark,
} from './MongolianDecorations';
import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Trophy,
  Flame,
  Star,
  Zap,
  ArrowRight,
  Sparkles,
  Headphones,
  Brain,
  Target,
  Sprout,
  Upload,
  Mic,
  Lightbulb,
  ScrollText,
  Quote,
  Crown,
  Compass,
  CompassIcon,
  Tent,
  Music2,
} from 'lucide-react';

/**
 * 首页 - 沉浸式学蒙古语
 *
 * 设计理念：穿越蒙古草原的学习朝圣之路
 *
 * 区块顺序（自上而下）：
 * 1. Hero 草原天际线封面（保留原图）+ 哈达飘带 + 卷轴条 + 用户等级牌
 * 2. 等级 / 进度 / XP 三连珠（毡帐式、马上铸剑式草原驿站）
 * 3. 智慧语录（成吉思汗令牌形）+ 羊皮卷轴
 * 4. 七大学习驿站（带苍狼图腾 + 那达慕圆环）
 * 5. 文化三宝（马头琴 / 长调民歌 / 呼麦）
 * 6. 蒙古包贡献者号召
 * 7. 牧民档案（成就徽章 + 连续学习）
 * 8. XP 指南（哈达条形 + 5 色分类条）
 */

export function HomePage() {
  const {
    t,
    xpState,
    getLevelProgress,
    getRandomWisdomQuote,
    getLevelTitleInfo,
    getThemeLearnedCount,
    language,
    themes,
  } = useApp();
  const progress = getLevelProgress();
  const wisdomQuote = getRandomWisdomQuote();
  const levelTitle = getLevelTitleInfo(xpState.level);
  const [showLevelGuide, setShowLevelGuide] = useState(false);

  useEffect(() => {
    const handleOpenLevelGuide = () => setShowLevelGuide(true);
    window.addEventListener('openLevelGuide', handleOpenLevelGuide);
    return () => window.removeEventListener('openLevelGuide', handleOpenLevelGuide);
  }, []);

  // 已学主题数（学完即所有词都学过）
  const completedThemeCount = useMemo(
    () =>
      themes.filter((th) => {
        const { learned, total } = getThemeLearnedCount(th.id);
        return total > 0 && learned >= total;
      }).length,
    [themes, getThemeLearnedCount],
  );

  // 驿站主题色：与草原七站·驿站风一致
  const stationAccents = useMemo<
    Record<string, { ring: string; text: string; bar: string; chip: string; icon: string; chipText: { zh: string; en: string } }>
  >(
    () => ({
      'basic-conversation': {
        ring: 'from-sky-300 to-cyan-400',
        text: 'text-sky-700',
        bar: 'bg-gradient-to-r from-sky-400 to-cyan-400',
        chip: 'bg-sky-100 text-sky-700 ring-sky-200',
        icon: 'from-sky-400 to-cyan-500',
        chipText: { zh: '天', en: 'Sky' },
      },
      'food-journey': {
        ring: 'from-orange-300 to-rose-400',
        text: 'text-orange-700',
        bar: 'bg-gradient-to-r from-orange-400 to-rose-400',
        chip: 'bg-orange-100 text-orange-700 ring-orange-200',
        icon: 'from-orange-400 to-rose-500',
        chipText: { zh: '火', en: 'Fire' },
      },
      'family-members': {
        ring: 'from-pink-300 to-fuchsia-400',
        text: 'text-pink-700',
        bar: 'bg-gradient-to-r from-pink-400 to-fuchsia-400',
        chip: 'bg-pink-100 text-pink-700 ring-pink-200',
        icon: 'from-pink-400 to-fuchsia-500',
        chipText: { zh: '家', en: 'Home' },
      },
      'number-kingdom': {
        ring: 'from-indigo-300 to-purple-400',
        text: 'text-indigo-700',
        bar: 'bg-gradient-to-r from-indigo-400 to-purple-400',
        chip: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        icon: 'from-indigo-400 to-purple-500',
        chipText: { zh: '数', en: 'Num' },
      },
      'mongolian-culture': {
        ring: 'from-amber-300 to-yellow-400',
        text: 'text-amber-700',
        bar: 'bg-gradient-to-r from-amber-400 to-yellow-400',
        chip: 'bg-amber-100 text-amber-700 ring-amber-200',
        icon: 'from-amber-400 to-yellow-500',
        chipText: { zh: '文', en: 'Cult' },
      },
      'nature-exploration': {
        ring: 'from-emerald-300 to-green-400',
        text: 'text-emerald-700',
        bar: 'bg-gradient-to-r from-emerald-400 to-green-400',
        chip: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        icon: 'from-emerald-400 to-green-500',
        chipText: { zh: '野', en: 'Wild' },
      },
      'advanced-comprehensive': {
        ring: 'from-violet-300 to-indigo-400',
        text: 'text-violet-700',
        bar: 'bg-gradient-to-r from-violet-400 to-indigo-400',
        chip: 'bg-violet-100 text-violet-700 ring-violet-200',
        icon: 'from-violet-400 to-indigo-500',
        chipText: { zh: '成', en: 'Adv' },
      },
    }),
    []
  );

  // 文化三宝：马头琴 / 长调民歌 / 呼麦
  const cultureTreasures = useMemo(
    () => [
      {
        key: 'morin-khuur',
        title: t('马头琴', 'Morin Khuur'),
        desc: t(
          '草原上经典的传统弦乐，琴声辽阔悠远',
          'A traditional string instrument of the grasslands, its music vast and resounding.'
        ),
        Icon: MorinKhuur,
        accent: 'from-amber-500 to-orange-500',
        ring: 'ring-amber-200',
        bg: 'from-amber-50 to-orange-50',
      },
      {
        key: 'long-song',
        title: t('长调民歌', 'Mongolian Long Song'),
        desc: t(
          '草原上悠远的歌，旋律绵长婉转，咏颂天地风光',
          'Ethereal ballads of the grasslands, with lingering melodies praising nature.'
        ),
        Icon: Music2,
        accent: 'from-sky-500 to-cyan-500',
        ring: 'ring-sky-200',
        bg: 'from-sky-50 to-cyan-50',
      },
      {
        key: 'khoomei',
        title: t('呼麦', 'Khoomei'),
        desc: t(
          '独特的喉音艺术，一人双声，摹拟世间万籁',
          'A distinctive throat-singing craft. One voice produces dual tones, echoing sounds of nature.'
        ),
        Icon: Mic,
        accent: 'from-violet-500 to-indigo-500',
        ring: 'ring-violet-200',
        bg: 'from-violet-50 to-indigo-50',
      },
    ],
    [t]
  );

  // 牧民档案：连续学习 / 累计XP / 已学主题
  const herdsmanBadges = useMemo(
    () => [
      {
        title: t('连续学习', 'Streak'),
        value: `${xpState.streak}`,
        unit: t('天', 'days'),
        icon: Flame,
        accent: 'from-orange-500 to-rose-500',
        chip: 'bg-orange-100 text-orange-700 ring-orange-200',
      },
      {
        title: t('累计经验', 'Total XP'),
        value: `${xpState.totalXP}`,
        unit: 'XP',
        icon: Zap,
        accent: 'from-yellow-500 to-amber-500',
        chip: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
      },
      {
        title: t('已学主题', 'Themes'),
        value: `${completedThemeCount}`,
        unit: t('站', 'stations'),
        icon: Compass,
        accent: 'from-emerald-500 to-green-500',
        chip: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
      },
    ],
    [xpState.streak, xpState.totalXP, themes, t]
  );

  // 学习/贡献奖励
  const learnRewards = useMemo(
    () => [
      { action: t('学习单词', 'Learn Word'), xp: XP_RULES.learn_word, icon: BookOpen },
      { action: t('听力训练', 'Listening'), xp: XP_RULES.listening, icon: Headphones },
      { action: t('复习任务', 'Review'), xp: XP_RULES.review, icon: Brain },
      { action: t('练习挑战', 'Challenge'), xp: XP_RULES.challenge, icon: Target },
      { action: t('完成每日目标', 'Daily Goal'), xp: XP_RULES.complete_daily_goal, icon: Crown },
    ],
    [t]
  );

  const contributeRewards = useMemo(
    () => [
      { action: t('上传词条', 'Upload Word'), xp: XP_RULES.upload_word, icon: Upload },
      { action: t('上传音频', 'Upload Audio'), xp: XP_RULES.upload_audio, icon: Mic },
      { action: t('上传智慧语录', 'Upload Wisdom'), xp: XP_RULES.upload_wisdom, icon: Sparkles },
    ],
    [t]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-amber-50 pb-20 lg:pb-8">
      {/* ====================== Hero 草原天际线 ====================== */}
      <section className="relative h-[120vh] min-h-[600px] max-h-[1000px] overflow-hidden">
        {/* 封面图：保留原图 */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat sm:bg-center"
          style={{
            backgroundImage: `url('/images/mongolia-hero-v2.jpg')`,
            backgroundPosition: 'center 25%',
          }}
        />
        {/* 顶部哈达飘带 - 5 色 */}
        <KhataRibbon className="absolute top-0 left-0 right-0 z-30" />
        {/* 渐变蒙版 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        {/* 底部天空→草原过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-50/95 via-emerald-50/50 to-transparent z-10" />

        {/* 蒙古文竖排水印：ᠮᠣᠩᠭᠣᠯ (蒙古) */}
        <MongolianVerticalWatermark
          text="ᠮᠣᠩᠭᠣᠯ"
          className="absolute right-3 sm:right-6 top-16 sm:top-20 z-20 opacity-30 sm:opacity-40"
        />

        {/* 主标题 + 三连珠 + 等级进度卡 */}
        <div className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-center">
          {/* 居中标题 */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {t('探索蒙古语言的魅力', 'Explore the Beauty of Mongolian')}
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto drop-shadow-md px-2">
              {t(
                '沉浸在广袤草原的学习之旅，从基础对话到文化探索，成为真正的草原之子',
                'Immerse in the vast steppe journey — from basic dialogue to cultural exploration'
              )}
            </p>
          </div>

          {/* 三连珠：连续 / 等级 / 今日XP（毡帐式 / 哈达边框） */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {/* 连续学习 - 篝火橙 */}
            <div className="group flex items-center gap-2.5 bg-white/20 backdrop-blur-md pl-3 pr-4 py-2.5 rounded-full border border-orange-200/60 shadow-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center ring-2 ring-white/40">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-base">{xpState.streak}</span>
                <span className="text-white/80 text-[10px]">{t('天连续', 'day streak')}</span>
              </div>
            </div>
            {/* 等级牌 - 那达慕金 */}
            <div className="group flex items-center gap-2.5 bg-white/20 backdrop-blur-md pl-3 pr-4 py-2.5 rounded-full border border-yellow-200/60 shadow-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center ring-2 ring-white/40">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-base">
                  Lv.{xpState.level} · {language === 'zh' ? levelTitle.nameZh : levelTitle.nameEn}
                </span>
                <span className="text-white/80 text-[10px]">
                  {language === 'zh' ? levelTitle.nameEn : levelTitle.nameZh}
                </span>
              </div>
            </div>
            {/* 今日XP - 紫电 */}
            <div className="group flex items-center gap-2.5 bg-white/20 backdrop-blur-md pl-3 pr-4 py-2.5 rounded-full border border-violet-200/60 shadow-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center ring-2 ring-white/40">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-base">{xpState.dailyXP}</span>
                <span className="text-white/80 text-[10px]">{t('今日 XP', 'today XP')}</span>
              </div>
            </div>
          </div>

          {/* 等级进度卡：羊皮卷 + 哈达底色 */}
          <div className="max-w-md mx-auto bg-white/15 backdrop-blur-lg rounded-2xl p-5 border border-white/30 shadow-2xl relative overflow-hidden">
            {/* 卷轴条 */}
            <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-yellow-300/70 via-amber-300/70 to-orange-300/70 rounded-r-full" />
            <div className="absolute right-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-yellow-300/70 via-amber-300/70 to-orange-300/70 rounded-l-full" />
            <div className="flex items-center justify-center gap-3 mb-3 relative">
              <span className="text-3xl drop-shadow">{levelTitle.icon}</span>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {language === 'zh' ? levelTitle.nameZh : levelTitle.nameEn}
                </div>
                <p className="text-sm text-white/70">
                  {language === 'zh' ? levelTitle.nameEn : levelTitle.nameZh}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/85">{t('升级进度', 'Progress')}</span>
                <span className="font-bold text-yellow-200">
                  {progress.current} / {progress.needed} XP
                </span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden ring-1 ring-white/15">
                <div
                  className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 rounded-full transition-all duration-700 shadow-inner"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
            </div>

            <Link
              href="/learn"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg ring-1 ring-white/30"
            >
              <Compass className="w-5 h-5" />
              {t('启程学蒙古', 'Begin Your Journey')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====================== 公告栏 · 草原号角 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-4 sm:py-6 -mt-2 relative z-10">
        <AnnouncementBoard />
      </section>

      {/* ====================== 智慧语录 · 成吉思汗令牌 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-10 -mt-6 relative z-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Quote className="w-5 h-5 text-emerald-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {t('智慧语录', 'Wisdom Quotes')}
          </h2>
          <span className="text-sm text-slate-500">·</span>
          <span className="text-sm text-slate-500">
            {t('草原上的智者之声', 'Voices of the Steppe Sages')}
          </span>
        </div>

        <ScrollFrame className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-amber-200/70">
          <Card className="bg-transparent border-0 shadow-none">
            <CardContent className="p-5 sm:p-7">
              <div className="flex items-start gap-4">
                {/* 成吉思汗令牌 SoyomboFlame */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/40">
                    <SoyomboFlame className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center ring-2 ring-white">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* 蒙古文 */}
                  <div className="bg-white/60 rounded-xl p-3 mb-2 ring-1 ring-amber-200/50 relative overflow-hidden">
                    <MongolianVerticalWatermark
                      text="ᠰᠤᠷᠤᠯᠴᠠᠬᠤ"
                      className="absolute right-1 top-1 opacity-20"
                    />
                    <MongolianTextImage
                      key={`${wisdomQuote?.id || 'mongol'}-${wisdomQuote?.mongolian || 'ᠮᠣᠩᠭᠣᠯ'}`}
                      src={
                        wisdomQuote?.id
                          ? getMongolianWisdomImageSrc(wisdomQuote.id)
                          : getMongolianHeroImageSrc('mongol')
                      }
                      alt={wisdomQuote?.mongolian || 'ᠮᠣᠩᠭᠣᠯ'}
                      fallbackText={wisdomQuote?.mongolian || 'ᠮᠣᠩᠭᠣᠯ'}
                      wordId={wisdomQuote?.id ?? 'mongol'}
                      type={wisdomQuote?.id ? 'wisdom' : 'hero'}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      className="text-slate-900 w-8 h-auto"
                      imgClassName="w-full h-auto"
                    />
                  </div>
                  <p className="text-amber-900 font-medium leading-relaxed">
                    “{wisdomQuote?.translation?.[language] || ''}”
                  </p>
                  {wisdomQuote?.author && (
                    <p className="text-sm text-amber-700 mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-4 h-px bg-amber-400" />
                      — {wisdomQuote.author}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollFrame>
      </section>

      {/* ====================== 文化三宝 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:py-8 relative">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Music2 className="w-5 h-5 text-rose-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {t('文化三宝', 'Three Cultural Treasures')}
          </h2>
          <span className="text-sm text-slate-500">·</span>
          <span className="text-sm text-slate-500">
            {t('马头琴 · 长调民歌 · 呼麦', 'Morin Khuur · Long Song · Khoomei')}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {cultureTreasures.map(({ key, title, desc, Icon, accent, ring, bg }) => (
            <Card
              key={key}
              className={`relative overflow-hidden border-0 ring-1 ${ring} hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
              <CardContent className="relative p-5">
                {/* 文化符号插画 */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg ring-2 ring-white/50 mb-3 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                {/* 那达慕圆环装饰 */}
                <NaadamRing className="absolute -right-6 -bottom-6 w-20 h-20 opacity-20 group-hover:opacity-30 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ====================== 草原七站 · 学习主题 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2">
            <Tent className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              {t('草原七站', 'Seven Steppe Stations')}
            </h2>
            <span className="text-sm text-slate-500 hidden sm:inline">·</span>
            <span className="text-sm text-slate-500 hidden sm:inline">
              {t('驿驿相望 · 习习相承', 'Stations linked · Lessons passed down')}
            </span>
          </div>
          <Link
            href="/learn"
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium text-sm"
          >
            {t('查看全部', 'View All')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {themes.map((theme, idx) => {
            const accent =
              stationAccents[theme.id] || stationAccents['basic-conversation'];
            return (
              <Link key={theme.id} href={`/learn/${theme.id}`}>
                <Card className="relative h-full border-0 ring-1 ring-slate-200 hover:ring-emerald-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group">
                  {/* 5 色哈达顶条 */}
                  <div className="absolute top-0 left-0 right-0 flex h-1 opacity-90">
                    <div className="flex-1 bg-sky-400" />
                    <div className="flex-1 bg-yellow-300" />
                    <div className="flex-1 bg-emerald-400" />
                    <div className="flex-1 bg-rose-400" />
                    <div className="flex-1 bg-indigo-400" />
                  </div>
                  {/* 蒙古文水印 */}
                  <MongolianVerticalWatermark
                    text="ᠰᠤᠷᠤᠯᠴᠠᠬᠤ"
                    className="absolute right-1 top-2 opacity-15"
                  />
                  <CardContent className="p-4 pt-5 relative">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent.icon} flex items-center justify-center shadow-md ring-2 ring-white/50 text-xl`}
                      >
                        {theme.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ${accent.chip}`}
                          >
                            {language === 'en'
                              ? `Station ${String(idx + 1).padStart(2, '0')}`
                              : `驿站 ${String(idx + 1).padStart(2, '0')}`}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {language === 'en' ? accent.chipText.en : accent.chipText.zh}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight mt-0.5 truncate">
                          {language === 'zh' ? theme.name.zh : theme.name.en}
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {language === 'zh' ? theme.description.zh : theme.description.en}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ====================== 牧民档案 · 成就徽章 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Crown className="w-5 h-5 text-amber-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {t('牧民档案', 'Herdsman Profile')}
          </h2>
          <span className="text-sm text-slate-500">·</span>
          <span className="text-sm text-slate-500">
            {t('你走过的每一段路', 'Every step on the steppe')}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          {herdsmanBadges.map(({ title, value, unit, icon: Icon, accent, chip }) => (
            <Card
              key={title}
              className="relative overflow-hidden border-0 ring-1 ring-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-all group"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-md ring-2 ring-white group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-0.5">{title}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-800">
                      {value}
                    </span>
                    <span className="text-xs text-slate-500">{unit}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ${chip}`}
                >
                  {xpState.level >= 1 ? '✓' : '·'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ====================== 蒙古包贡献者号召 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Card className="relative overflow-hidden border-0 ring-1 ring-emerald-200/60 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
          {/* 顶部哈达 */}
          <KhataRibbon className="absolute top-0 left-0 right-0" />
          {/* 远山 + 蒙古包 + 云纹水印 */}
          <SteppeHorizon className="absolute bottom-0 left-0 right-0 h-32 opacity-50" />
          <YurtSilhouette className="absolute right-6 bottom-0 w-28 sm:w-36 opacity-30" />
          <CloudPattern className="absolute top-12 left-0 right-0 h-6 opacity-30" />

          <CardContent className="relative p-5 sm:p-7">
            <div className="flex items-start gap-4">
              {/* 苍狼图腾 */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/50 flex-shrink-0">
                <WolfTotem className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-emerald-900 mb-1.5 flex items-center gap-2">
                  {t('共建草原 · 智慧驿站', 'Build the Steppe Together')}
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                    {t('贡献者', 'Contributor')}
                  </span>
                </h3>
                <p className="text-sm text-emerald-800/80 leading-relaxed mb-3">
                  {t(
                    '上传词条、音频、智慧语录，你的一次分享，可能成为远方学子打开草原的第一把钥匙。',
                    'Upload a word, an audio clip, a wisdom quote — your share may be the very first key opening the steppe for a learner far away.'
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/corpus"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {t('上传词条', 'Upload Word')}
                  </Link>
                  <Link
                    href="/wisdom"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('分享智慧', 'Share Wisdom')}
                  </Link>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('openLevelGuide');
                      window.dispatchEvent(event);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition shadow-sm"
                  >
                    <ScrollText className="w-4 h-4" />
                    {t('等级图鉴', 'Level Guide')}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ====================== XP 指南 · 哈达条形分类 ====================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:py-8 mb-8 relative">
        <Card className="relative overflow-hidden border-0 ring-1 ring-slate-200 bg-gradient-to-br from-slate-50 via-amber-50/40 to-rose-50/40">
          {/* 顶部哈达 */}
          <KhataRibbon className="absolute top-0 left-0 right-0" />
          {/* 蒙古文水印 */}
          <MongolianVerticalWatermark
            text="ᠰᠤᠷᠤᠯᠴᠠᠬᠤ"
            className="absolute right-3 top-6 opacity-15"
          />

          <CardContent className="relative p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                {t('经验获取指南', 'XP Guide')}
              </h3>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">
                {t('如何在草原上快速成长', 'How to grow on the steppe')}
              </span>
            </div>

            {/* 学习奖励 */}
            <div className="mb-4">
              <p className="text-xs text-emerald-700 font-semibold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                {t('学习奖励', 'Learning Rewards')}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {learnRewards.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-white/70 rounded-xl ring-1 ring-emerald-100 hover:ring-emerald-300 hover:bg-white transition-all"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-200">
                        <item.icon className="w-3.5 h-3.5" />
                      </span>
                      {item.action}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-600 text-sm">
                      <Zap className="w-3.5 h-3.5 fill-amber-500" />+{item.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 贡献奖励 */}
            <div>
              <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />
                {t('贡献奖励', 'Contribution Rewards')}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {contributeRewards.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-white/70 rounded-xl ring-1 ring-amber-100 hover:ring-amber-300 hover:bg-white transition-all"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center ring-1 ring-amber-200">
                        <item.icon className="w-3.5 h-3.5" />
                      </span>
                      {item.action}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-rose-600 text-sm">
                      <Zap className="w-3.5 h-3.5 fill-rose-500" />+{item.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ====================== 访客计数 · 草原共同体 ====================== */}
      <section className="max-w-6xl mx-auto px-4 pb-6 sm:pb-8">
        <div className="max-w-md">
          <VisitorCounter />
        </div>
      </section>

      {/* 等级图鉴弹窗 */}
      {showLevelGuide && <LevelGuide onClose={() => setShowLevelGuide(false)} />}
    </div>
  );
}
