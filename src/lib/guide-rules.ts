/**
 * 草原向导 - 智能推荐规则引擎
 *
 * 优先级（高→低）：
 *   100  长时间未访问（≥ 7 天）→ 欢迎回来
 *    90  未访问字母表 → 推荐去字母表
 *    85  今日学习未完成 → 推每日任务
 *    80  连续天数 0 且有经验 → 重新点燃连续
 *    70  已完成至少 1 个驿站 → 推荐去文化中心
 *    50  默认 → 进入学习中心
 */

import type { LucideIcon } from 'lucide-react';
import {
  Hand,
  BookOpen,
  Target,
  Flame,
  Music2,
  Compass,
} from 'lucide-react';

export type Recommendation = {
  icon: LucideIcon;
  emoji: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  cta: { label: { zh: string; en: string }; href: string };
  priority: number;
  /** 用于高亮 CTA 的强调色 */
  tone: 'khata' | 'steppe' | 'gold' | 'suld' | 'ember';
};

export type GuideContext = {
  /** 是否访问过 /alphabet 页面 */
  hasVisitedAlphabet: boolean;
  /** 今日是否完成过学习（基于 lastStudyDate === 今天） */
  hasCompletedDaily: boolean;
  /** 是否有未完成的驿站（任意驿站 learned < total 且 total > 0） */
  hasUnfinishedTheme: boolean;
  /** 已完成的驿站数 */
  themesCompletedCount: number;
  /** 全部驿站数 */
  themesTotalCount: number;
  /** 上次访问时间戳（ms） */
  lastVisitAt: number | null;
  /** 当前总 XP */
  totalXP: number;
  /** 连续天数 */
  streak: number;
  /** 等级 */
  level: number;
  /** 当前语言 */
  language: 'zh' | 'en';
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getRecommendation(ctx: GuideContext): Recommendation {
  const lang = ctx.language;

  // 1. 长时间未访问 → 欢迎回来
  if (ctx.lastVisitAt) {
    const daysSince = Math.floor((Date.now() - ctx.lastVisitAt) / MS_PER_DAY);
    if (daysSince >= 7) {
      return {
        icon: Hand,
        emoji: '👋',
        title: { zh: '欢迎回到草原', en: 'Welcome back' },
        description: {
          zh: `你已经离开 ${daysSince} 天。等级仍是 ${ctx.level}，继续走吧。`,
          en: `${daysSince} days away. Still level ${ctx.level}. Carry on.`,
        },
        cta: { label: { zh: '继续学习', en: 'Continue' }, href: '/learn' },
        priority: 100,
        tone: 'gold',
      };
    }
  }

  // 2. 未访问字母表（覆盖：未完成每日之前）
  if (!ctx.hasVisitedAlphabet) {
    return {
      icon: BookOpen,
      emoji: '📖',
      title: { zh: '先看蒙古文字', en: 'Meet the script' },
      description: {
        zh: '5 分钟看完 22 个字母与书写规则，入门必备。',
        en: '5 min to learn 22 letters & writing rules.',
      },
      cta: { label: { zh: '打开字母表', en: 'Open alphabet' }, href: '/alphabet' },
      priority: 90,
      tone: 'khata',
    };
  }

  // 3. 今日学习未完成
  if (!ctx.hasCompletedDaily) {
    return {
      icon: Target,
      emoji: '🎯',
      title: { zh: '今日学习还没完成', en: 'Daily learning pending' },
      description: {
        zh: '10 个词 + 1 段听力 + 1 次复习，可获 +20 XP。',
        en: '10 words + 1 listening + 1 review for +20 XP.',
      },
      cta: { label: { zh: '去完成', en: 'Start now' }, href: '/learn/daily' },
      priority: 85,
      tone: 'steppe',
    };
  }

  // 4. 连续天数 0 但有经验 → 重新点燃
  if (ctx.streak === 0 && ctx.totalXP > 0) {
    return {
      icon: Flame,
      emoji: '🔥',
      title: { zh: '重新点燃连续学习', en: 'Rekindle your streak' },
      description: {
        zh: '连续 7 天额外 +30 XP，断过一次不代表重头开始。',
        en: '7-day streak = +30 bonus XP. One miss is not a reset.',
      },
      cta: { label: { zh: '开始今日', en: 'Start today' }, href: '/learn/daily' },
      priority: 80,
      tone: 'ember',
    };
  }

  // 5. 已完成至少 1 个驿站 → 推荐文化中心
  if (ctx.themesCompletedCount >= 1 && ctx.themesTotalCount > 0) {
    return {
      icon: Music2,
      emoji: '🎵',
      title: { zh: '去文化中心听一段', en: 'Visit culture center' },
      description: {
        zh: '马头琴 / 长调 / 呼麦——一手录音，听一段 +10 XP。',
        en: 'Morin Khuur / Long Song / Khoomei — listen for +10 XP.',
      },
      cta: { label: { zh: '去文化中心', en: 'Open culture' }, href: '/wisdom' },
      priority: 70,
      tone: 'suld',
    };
  }

  // 6. 还有未完成驿站 → 继续当前学习
  if (ctx.hasUnfinishedTheme) {
    return {
      icon: Compass,
      emoji: '🧭',
      title: { zh: '继续当前驿站', en: 'Resume current theme' },
      description: {
        zh: `还有 ${ctx.themesTotalCount - ctx.themesCompletedCount} 个驿站等着你。`,
        en: `${ctx.themesTotalCount - ctx.themesCompletedCount} themes await.`,
      },
      cta: { label: { zh: '进入学习中心', en: 'Open learn' }, href: '/learn' },
      priority: 60,
      tone: 'steppe',
    };
  }

  // 7. 默认
  return {
    icon: Compass,
    emoji: '🧭',
    title: { zh: '每天 10 分钟', en: '10 min a day' },
    description: {
      zh: '坚持一个月，能掌握日常对话的基础。',
      en: 'A month of consistency = basic conversation.',
    },
    cta: { label: { zh: '开始今日', en: 'Start today' }, href: '/learn/daily' },
    priority: 50,
    tone: 'steppe',
  };
}

/** 速查入口（Mini Help） */
export type QuickLink = {
  href: string;
  icon: LucideIcon;
  label: { zh: string; en: string };
  hint: { zh: string; en: string };
};

export function getQuickLinks(): { group: string; links: QuickLink[] }[] {
  return [
    {
      group: '学习',
      links: [
        { href: '/alphabet', icon: BookOpen, label: { zh: '字母表', en: 'Alphabet' }, hint: { zh: '22 字母', en: '22 letters' } },
        { href: '/learn/daily', icon: Target, label: { zh: '每日学习', en: 'Daily' }, hint: { zh: '今日任务', en: 'Today' } },
        { href: '/learn', icon: Compass, label: { zh: '7 驿站', en: '7 Themes' }, hint: { zh: '按主题', en: 'By topic' } },
      ],
    },
    {
      group: '文化',
      links: [
        { href: '/wisdom', icon: Music2, label: { zh: '声音档案', en: 'Voice' }, hint: { zh: '马头琴/长调', en: 'Audio' } },
        { href: '/wisdom', icon: BookOpen, label: { zh: '文化传统', en: 'Culture' }, hint: { zh: '风土人情', en: 'Customs' } },
        { href: '/wisdom', icon: BookOpen, label: { zh: '智慧语录', en: 'Wisdom' }, hint: { zh: '每日一句', en: 'Daily quote' } },
      ],
    },
    {
      group: '我的',
      links: [
        { href: '/corpus', icon: BookOpen, label: { zh: '词库', en: 'Corpus' }, hint: { zh: '查词/上传', en: 'Search/Add' } },
        { href: '/me', icon: Flame, label: { zh: '我的等级', en: 'My level' }, hint: { zh: 'XP/连击', en: 'XP/Streak' } },
        { href: '#restart-tour', icon: Compass, label: { zh: '引导', en: 'Guide' }, hint: { zh: '新手引导', en: 'Onboarding' } },
      ],
    },
  ];
}
