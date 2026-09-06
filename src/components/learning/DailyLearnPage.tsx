'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { LearningTask, Word, XP_RULES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import { markWordLearned, getLearningProgress } from '@/lib/learning-progress';
import { selectDailyTasks, buildLearnedSet, pickDistractors, TaskSlot } from '@/lib/daily-task-selector';
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  RefreshCw,
  Target,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  Sprout,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCheck,
  Lightbulb,
  Star,
} from 'lucide-react';

type TaskKind = 'review' | 'new' | 'confusable';

const SESSION_KEY = 'mongolian-daily-session';

/** 持久化的会话快照 */
interface SessionSnapshot {
  date: string;
  taskIds: string[];
  taskKinds: Record<string, TaskKind>;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  xpEarned: number;
  completedTaskIds: string[];
  answerHistory: Record<string, { correct: boolean; answer: string }>;
  masteredIds: string[];
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSession(): SessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SessionSnapshot;
    if (snap.date !== getTodayKey()) return null;
    return snap;
  } catch {
    return null;
  }
}

function saveSession(snap: SessionSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch {}
}

function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** 4 种任务对应的视觉风格 */
const TASK_STYLE: Record<string, { bg: string; ring: string; text: string; gradient: string; label: { zh: string; en: string }; icon: any }> = {
  learn_word: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    gradient: 'from-emerald-400 to-green-500',
    label: { zh: '闪卡学习', en: 'Flashcard' },
    icon: BookOpen,
  },
  listening: {
    bg: 'bg-teal-50',
    ring: 'ring-teal-200',
    text: 'text-teal-700',
    gradient: 'from-teal-400 to-cyan-500',
    label: { zh: '听音辨义', en: 'Listening' },
    icon: Headphones,
  },
  review: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    gradient: 'from-amber-400 to-orange-500',
    label: { zh: '拼写巩固', en: 'Review' },
    icon: RefreshCw,
  },
  challenge: {
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    text: 'text-rose-700',
    gradient: 'from-rose-400 to-pink-500',
    label: { zh: '挑战辨析', en: 'Challenge' },
    icon: Target,
  },
};

const KIND_LABEL: Record<TaskKind, { zh: string; en: string }> = {
  review: { zh: '复习', en: 'Review' },
  new: { zh: '新词', en: 'New' },
  confusable: { zh: '易混', en: 'Tricky' },
};

const PASS_THRESHOLD = 0.6; // 正确率 ≥ 60% 才奖励完成 XP

export function DailyLearnPage() {
  const { t, addXP, language, xpState, getLevelTitleInfo, words, hasWordAudio, getFirstAudioUrl, themes } = useApp();
  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [taskKinds, setTaskKinds] = useState<Record<string, TaskKind>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lastXP, setLastXP] = useState(0);
  const [showXPToast, setShowXPToast] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [answerHistory, setAnswerHistory] = useState<Record<string, { correct: boolean; answer: string }>>({});
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 初始化 / 恢复会话
  useEffect(() => {
    if (!isMounted || words.length === 0) return;

    const existing = loadSession();
    if (existing) {
      // 恢复：根据 saved taskIds 重新匹配 words
      const tasksRestored: LearningTask[] = existing.taskIds
        .map(id => words.find(w => w.id === id))
        .filter(Boolean)
        .map(word => ({ type: 'learn_word' as const, word: word!, completed: false, xpReward: 0 }));
      // 还原 type：从 taskKinds 重新决定（这里简化：根据 kind 推断 type）
      const withType = tasksRestored.map((t, i) => {
        const original = existing.taskIds[i];
        return { ...t, type: getTypeForKind(existing.taskKinds[original] || 'new') };
      });
      setTasks(withType);
      setTaskKinds(existing.taskKinds);
      setCurrentIndex(existing.currentIndex);
      setCorrectCount(existing.correctCount);
      setWrongCount(existing.wrongCount);
      setSkippedCount(existing.skippedCount);
      setXpEarned(existing.xpEarned);
      setCompletedTaskIds(existing.completedTaskIds);
      setAnswerHistory(existing.answerHistory);
      setMasteredIds(new Set(existing.masteredIds));
      if (existing.completedTaskIds.length >= tasksRestored.length && tasksRestored.length > 0) {
        setIsCompleted(true);
      }
      return;
    }

    // 全新生成
    const progress = getLearningProgress();
    const learnedSet = buildLearnedSet(progress.wordStatuses);
    const themeProgress: Record<string, { learned: number; total: number }> = {};
    for (const theme of themes) {
      const themeWords = words.filter(w => w.theme === theme.id);
      const learned = themeWords.filter(w => learnedSet.has(w.id)).length;
      themeProgress[theme.id] = { learned, total: themeWords.length };
    }
    const newTasks = selectDailyTasks({
      words,
      learnedIds: learnedSet,
      themeProgress,
      totalTasks: 10,
    });

    // 把"复习/新词/易混"打标存起来
    const kinds: Record<string, TaskKind> = {};
    const learnedSetNow = learnedSet; // 此时 learnedSet 是未包含本会话的
    newTasks.forEach(t => {
      kinds[t.word.id] = learnedSetNow.has(t.word.id) ? 'review' : 'new';
    });
    // 重新数：超过 30% 阈值的标 review
    const reviewCount = Math.floor(newTasks.length * 0.3);
    let reviewsAssigned = 0;
    const finalKinds: Record<string, TaskKind> = {};
    for (const t of newTasks) {
      if (learnedSetNow.has(t.word.id) && reviewsAssigned < reviewCount) {
        finalKinds[t.word.id] = 'review';
        reviewsAssigned++;
      } else {
        finalKinds[t.word.id] = 'new';
      }
    }
    // 易混 = 同样设为 new（v1 简化）

    setTasks(newTasks);
    setTaskKinds(finalKinds);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSkippedCount(0);
    setXpEarned(0);
    setCompletedTaskIds([]);
    setAnswerHistory({});
    setMasteredIds(new Set());
    setIsCompleted(false);
  }, [isMounted, words, themes]);

  // 持久化
  useEffect(() => {
    if (!isMounted || tasks.length === 0) return;
    const snap: SessionSnapshot = {
      date: getTodayKey(),
      taskIds: tasks.map(t => t.word.id),
      taskKinds,
      currentIndex,
      correctCount,
      wrongCount,
      skippedCount,
      xpEarned,
      completedTaskIds,
      answerHistory,
      masteredIds: Array.from(masteredIds),
    };
    saveSession(snap);
  }, [isMounted, tasks, taskKinds, currentIndex, correctCount, wrongCount, skippedCount, xpEarned, completedTaskIds, answerHistory, masteredIds]);

  // 自动聚焦输入框
  useEffect(() => {
    if (currentTask?.type === 'review' && inputRef.current && !showResult) {
      inputRef.current.focus();
    }
  }, [currentIndex, showResult]);

  // 键盘快捷键
  useEffect(() => {
    if (isCompleted || showResult) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // 输入框内不拦截
      const task = tasks[currentIndex];
      if (!task) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (task.type === 'listening' || task.type === 'learn_word') {
          playCurrentAudio();
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (task.type === 'review') handleConfirmReview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, isCompleted, showResult, tasks]);

  // 当前 task
  const currentTask = tasks[currentIndex] || null;
  const taskKind = currentTask ? (taskKinds[currentTask.word.id] || 'new') : 'new';
  const style = currentTask ? TASK_STYLE[currentTask.type] : TASK_STYLE.learn_word;
  const StyleIcon = style.icon;

  /** 根据 kind 决定默认 type（v1 简化：review/new 都用 learn_word, 偶尔 review） */
  function getTypeForKind(_kind: TaskKind): any {
    return 'learn_word';
  }

  /** 播放当前任务音频 */
  const playCurrentAudio = useCallback(() => {
    if (!currentTask) return;
    if (audioRef.current) audioRef.current.pause();
    const url = getFirstAudioUrl(currentTask.word.id);
    if (!url) {
      // 兜底：浏览器 TTS
      const u = new SpeechSynthesisUtterance(currentTask.word.mongolian);
      u.lang = 'mn-MN';
      u.rate = 0.85;
      u.onstart = () => setIsPlaying(true);
      u.onend = () => setIsPlaying(false);
      speechSynthesis.speak(u);
      return;
    }
    audioRef.current = new Audio(url);
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onerror = () => setIsPlaying(false);
    audioRef.current.play();
  }, [currentTask, getFirstAudioUrl]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  // 翻卡
  useEffect(() => {
    setCardFlipped(false);
    stopAudio();
  }, [currentIndex, stopAudio]);

  const handleConfirmReview = useCallback(() => {
    if (!currentTask || currentTask.type !== 'review') return;
    if (showResult) return;
    if (!userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() ===
      currentTask.word.translation[language].toLowerCase().trim();
    completeCurrent(correct, userAnswer);
  }, [currentTask, userAnswer, language, showResult]);

  const handleChallengeSelect = useCallback((option: string) => {
    if (!currentTask || showResult) return;
    const correct = option === currentTask.word.translation[language];
    completeCurrent(correct, option);
  }, [currentTask, showResult, language]);

  /** 完成任务（对/错都可） */
  function completeCurrent(correct: boolean, answer: string) {
    if (!currentTask) return;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      addXP(currentTask.type);
      markWordLearned(currentTask.word.id);
      setCorrectCount(c => c + 1);
      setXpEarned(x => x + currentTask.xpReward);
      setLastXP(currentTask.xpReward);
    } else {
      setWrongCount(c => c + 1);
    }
    setAnswerHistory(h => ({ ...h, [currentTask.word.id]: { correct, answer } }));
    setCompletedTaskIds(ids => [...ids, currentTask.word.id]);

    setTimeout(() => {
      setShowResult(false);
      setUserAnswer('');
      goNext();
    }, 1600);
  }

  function goNext() {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      finishSession();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setShowResult(false);
      setUserAnswer('');
    }
  }

  function handleSkip() {
    if (!currentTask) return;
    setSkippedCount(c => c + 1);
    setShowResult(false);
    setUserAnswer('');
    goNext();
  }

  function handleMarkMastered() {
    if (!currentTask) return;
    setMasteredIds(s => new Set(s).add(currentTask.word.id));
    markWordLearned(currentTask.word.id);
    addXP(currentTask.type);
    setXpEarned(x => x + currentTask.xpReward);
    setCorrectCount(c => c + 1);
    setLastXP(currentTask.xpReward);
    setCompletedTaskIds(ids => [...ids, currentTask.word.id]);
    setAnswerHistory(h => ({ ...h, [currentTask.word.id]: { correct: true, answer: '(mastered)' } }));
    setTimeout(() => {
      goNext();
    }, 800);
  }

  function finishSession() {
    setIsCompleted(true);
    // 答对率 < 60% 不给完成奖励
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? correctCount / totalAnswered : 0;
    if (accuracy >= PASS_THRESHOLD) {
      addXP('complete_daily_goal');
      setLastXP(XP_RULES.complete_daily_goal);
      setXpEarned(x => x + XP_RULES.complete_daily_goal);
    } else {
      setLastXP(0);
    }
  }

  function handleRestart() {
    clearSession();
    setTasks([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSkippedCount(0);
    setXpEarned(0);
    setCompletedTaskIds([]);
    setAnswerHistory({});
    setMasteredIds(new Set());
    setIsCompleted(false);
    setShowResult(false);
    setUserAnswer('');
  }

  // 干扰项（仅 challenge 用）
  const challengeOptions = useMemo(() => {
    if (!currentTask || currentTask.type !== 'challenge') return [];
    const distractors = pickDistractors(currentTask.word, words, 3);
    return [currentTask.word.translation[language], ...distractors.map(w => w.translation[language])]
      .map(v => ({ value: v, isCorrect: v === currentTask.word.translation[language] }))
      .sort(() => Math.random() - 0.5);
  }, [currentTask, words, language]);

  // loading 态
  if (!isMounted || (words.length === 0 && isMounted)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        {words.length === 0 ? (
          <Card className="max-w-md mx-auto border-amber-200 bg-amber-50">
            <CardContent className="p-8">
              <BookOpen className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-700 mb-2">
                {t('暂无学习内容', 'No Learning Content')}
              </h2>
              <p className="text-slate-500 mb-6">
                {t('词库中还没有词条，请先添加词条后再来学习。', 'The vocabulary is empty. Please add some words first.')}
              </p>
              <Button onClick={() => window.history.back()} className="bg-emerald-500 hover:bg-emerald-600">
                {t('返回', 'Go Back')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-emerald-600">{t('正在准备学习内容...', 'Preparing learning content...')}</span>
          </div>
        )}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-emerald-600">{t('正在准备学习内容...', 'Preparing learning content...')}</span>
        </div>
      </div>
    );
  }

  // 完成页
  if (isCompleted) {
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const passed = accuracy >= PASS_THRESHOLD * 100;
    const levelTitle = getLevelTitleInfo(xpState.level);
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 哈达飘带装饰 */}
        <div className="max-w-lg mx-auto">
          <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mb-2" />
          <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-300 to-transparent mb-6" />
        </div>

        <Card className="max-w-lg mx-auto bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300" />
          <CardContent className="p-8 text-center relative">
            {/* 等级大徽章 */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-yellow-200/40 rounded-full blur-xl" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-5xl shadow-lg ring-4 ring-yellow-200">
                {levelTitle.icon || '🎖️'}
              </div>
            </div>

            <h2 className="text-3xl font-bold text-amber-900 mb-1">
              {t('草原一日', 'A Day on the Steppe')}
            </h2>
            <p className="text-amber-700 text-xl font-bold mb-1">
              {language === 'zh' ? levelTitle.nameZh : levelTitle.nameEn}
            </p>
            <p className="text-amber-600/70 text-sm mb-6">
              {language === 'zh' ? levelTitle.nameEn : levelTitle.nameZh}
            </p>

            {/* 哈达带 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-300" />
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-300" />
            </div>

            {/* 评分 */}
            <div className={`text-2xl font-black mb-4 ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
              {passed
                ? t('✦ 完成今日修行 ✦', '✦ Quest Complete ✦')
                : t('继续努力，明天再战', 'Keep going, try again tomorrow')}
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-white/80 rounded-xl border border-emerald-200">
                <div className="text-3xl font-black text-emerald-600">{correctCount}</div>
                <div className="text-xs text-slate-500 mt-1">{t('答对', 'Correct')}</div>
              </div>
              <div className="p-4 bg-white/80 rounded-xl border border-rose-200">
                <div className="text-3xl font-black text-rose-500">{wrongCount}</div>
                <div className="text-xs text-slate-500 mt-1">{t('答错', 'Wrong')}</div>
              </div>
              <div className="p-4 bg-white/80 rounded-xl border border-amber-200">
                <div className="text-3xl font-black text-amber-500">{skippedCount}</div>
                <div className="text-xs text-slate-500 mt-1">{t('跳过', 'Skipped')}</div>
              </div>
              <div className="p-4 bg-white/80 rounded-xl border border-yellow-300">
                <div className="text-3xl font-black text-yellow-600">+{xpEarned}</div>
                <div className="text-xs text-slate-500 mt-1">{t('本次 XP', 'XP Earned')}</div>
              </div>
            </div>

            {/* 准确率进度条 */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{t('准确率', 'Accuracy')}</span>
                <span className="font-bold">{accuracy}% {passed ? '✓' : ''}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${passed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`}
                  style={{ width: `${accuracy}%` }}
                />
              </div>
              {!passed && (
                <p className="text-xs text-rose-500 mt-2">
                  {t('准确率 ≥ 60% 才能获得 +20 XP 完成奖励', 'Need ≥ 60% accuracy for +20 completion bonus')}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handleRestart}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('再来一次', 'Try Again')}
              </Button>
              <Link href="/learn" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow">
                  <Trophy className="w-4 h-4 mr-2" />
                  {t('继续探索', 'Keep Exploring')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-lg mx-auto mt-4">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-300 to-transparent mb-2" />
          <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </div>
      </div>
    );
  }

  const progress = (currentIndex / tasks.length) * 100;
  const totalAnswered = correctCount + wrongCount;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 100;
  const audioAvailable = currentTask ? hasWordAudio(currentTask.word.id) : false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/learn">
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-500" />
              {t('每日学习', 'Daily Learning')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('按 空格 播放 · ← 上一题 · Enter 确认', 'Space: play · ← prev · Enter: confirm')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm border-slate-200 text-slate-600">
            <Star className="w-3 h-3 mr-1 text-yellow-500" />+{xpEarned}
          </Badge>
          <Badge className={`text-sm px-3 py-1 ${accuracy >= 60 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
            {accuracy}%
          </Badge>
        </div>
      </div>

      {/* 进度条 + 任务点 */}
      <div className="mb-2">
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
          {tasks.map((t, i) => {
            const s = TASK_STYLE[t.type];
            return (
              <div
                key={t.word.id}
                className={`flex-1 transition-all ${completedTaskIds.includes(t.word.id)
                    ? `bg-gradient-to-r ${s.gradient}`
                    : i === currentIndex
                      ? `bg-gradient-to-r ${s.gradient} opacity-60`
                      : 'bg-slate-200'
                  }`}
                style={{ width: `${100 / tasks.length}%` }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
        <span>{currentIndex + 1} / {tasks.length}</span>
        <span>·</span>
        <span className={`${style.text} font-semibold`}>
          {t(style.label.zh, style.label.en)} · {t(KIND_LABEL[taskKind].zh, KIND_LABEL[taskKind].en)}
        </span>
        <span className="flex-1" />
        {currentTask?.word.theme && (
          <span className="text-slate-400 text-[10px] uppercase tracking-wider">
            {currentTask.word.theme}
          </span>
        )}
      </div>

      {/* 任务点 */}
      <div className="flex justify-center gap-1.5 mb-6">
        {tasks.map((t, i) => {
          const s = TASK_STYLE[t.type];
          const isDone = completedTaskIds.includes(t.word.id);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={t.word.id}
              onClick={() => {
                setCurrentIndex(i);
                setShowResult(false);
                setUserAnswer('');
              }}
              title={`${i + 1}. ${t.word.mongolian} (${s.label.zh})`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${isDone
                  ? `bg-gradient-to-r ${s.gradient}`
                  : isCurrent
                    ? `bg-gradient-to-r ${s.gradient} scale-150 ring-2 ring-offset-1 ${s.ring}`
                    : 'bg-slate-300'
                }`}
            />
          );
        })}
      </div>

      {/* 任务卡 */}
      {currentTask && (
        <Card className={`max-w-2xl mx-auto border-2 ${style.ring} shadow-xl overflow-hidden`}>
          {/* 顶部装饰条 */}
          <div className={`h-1.5 bg-gradient-to-r ${style.gradient}`} />

          <CardContent className={`p-6 sm:p-8 ${style.bg}`}>
            {/* 任务类型徽章 */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className={`${style.bg} ${style.ring} ${style.text} border`}>
                <StyleIcon className="w-3.5 h-3.5 mr-1" />
                {t(style.label.zh, style.label.en)}
              </Badge>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${taskKind === 'review' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                  {taskKind === 'review' ? <RefreshCw className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {t(KIND_LABEL[taskKind].zh, KIND_LABEL[taskKind].en)}
                </Badge>
                <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                  +{currentTask.xpReward} XP
                </Badge>
              </div>
            </div>

            {/* 蒙古文 + 音频 */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <MongolianTextImage
                  key={`${currentTask.word.id}-${currentTask.word.mongolian}`}
                  wordId={currentTask.word.id}
                  src={currentTask.word.mongolianImageSrc}
                  alt={currentTask.word.mongolian}
                  fallbackText={currentTask.word.mongolian}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  srcKey={currentTask.word.id}
                  className="inline-block w-20 sm:w-24 h-auto"
                  imgClassName="w-full h-auto"
                />
                {audioAvailable ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={isPlaying ? stopAudio : playCurrentAudio}
                    className={`${style.ring} ${style.text} hover:bg-white/60 rounded-full w-12 h-12`}
                    title={t('空格播放', 'Space to play')}
                  >
                    {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <VolumeX className="w-3 h-3" />
                    {t('无音频', 'No audio')}
                  </span>
                )}
              </div>
              {currentTask.word.pinyin && (
                <p className="text-base text-slate-500">[{currentTask.word.pinyin}]</p>
              )}
            </div>

            {/* 任务内容 */}
            {currentTask.type === 'learn_word' && (
              <div className="text-center">
                {!cardFlipped ? (
                  <>
                    <p className="text-sm text-slate-600 mb-3 flex items-center justify-center gap-1">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      {t('先在心里默念，再翻面', 'Read silently, then flip')}
                    </p>
                    <Button
                      onClick={() => setCardFlipped(true)}
                      className={`bg-gradient-to-r ${style.gradient} text-white shadow-md hover:scale-105 transition-transform`}
                      size="lg"
                    >
                      {t('翻面看翻译', 'Flip to reveal')}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-black text-emerald-600 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {currentTask.word.translation[language]}
                    </div>

                    {currentTask.word.example && (
                      <div className="text-left max-w-md mx-auto p-3 bg-white/60 rounded-lg border border-emerald-100 mb-4">
                        <p className="text-xs text-slate-500 mb-1">{t('例句', 'Example')}</p>
                        <p className="text-sm text-slate-700">{currentTask.word.example.translation[language] || currentTask.word.example.translation.zh || currentTask.word.example.translation.en}</p>
                      </div>
                    )}
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => completeCurrent(false, '')}
                        variant="outline"
                        className="border-rose-300 text-rose-600 hover:bg-rose-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('再看看', 'Review again')}
                      </Button>
                      <Button
                        onClick={() => completeCurrent(true, '')}
                        className={`bg-gradient-to-r ${style.gradient} text-white`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t('记住了', 'Got it')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentTask.type === 'listening' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">
                  {t('听发音，从四个选项中选正确翻译', 'Listen and pick the right translation')}
                </p>
                <Button
                  size="lg"
                  className={`mb-4 bg-gradient-to-r ${style.gradient} text-white shadow-md`}
                  onClick={playCurrentAudio}
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  {t('播放发音', 'Play Sound')}
                </Button>
                <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {challengeOptions.map((opt, idx) => {
                    const isTarget = opt.value === currentTask.word.translation[language];
                    return (
                      <button
                        key={idx}
                        onClick={() => handleChallengeSelect(opt.value)}
                        disabled={showResult}
                        className={`p-3 bg-white/80 border-2 rounded-xl text-sm font-semibold transition-all text-left ${showResult
                            ? isTarget
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-400'
                            : `border-${style.ring.replace('ring-', '')} hover:border-emerald-400 hover:bg-white text-slate-700`
                          }`}
                      >
                        <span className="inline-block w-5 h-5 mr-1 text-xs text-slate-400 align-middle">{idx + 1}</span>
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentTask.type === 'review' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  {t('拼出或输入这个蒙古语词的意思', 'Type the meaning of this word')}
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmReview()}
                  placeholder={t('输入翻译...', 'Type translation...')}
                  className={`w-full max-w-xs px-4 py-3 text-lg text-center border-2 ${style.ring} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3 bg-white/80`}
                  disabled={showResult}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleConfirmReview}
                    disabled={!userAnswer.trim() || showResult}
                    className={`bg-gradient-to-r ${style.gradient} text-white`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {t('确认 (Enter)', 'Confirm (Enter)')}
                  </Button>
                </div>
              </div>
            )}

            {currentTask.type === 'challenge' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">
                  {t('挑战：选出正确翻译（4 选 1）', 'Challenge: pick the right one (1/4)')}
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {challengeOptions.map((opt, idx) => {
                    const isTarget = opt.value === currentTask.word.translation[language];
                    return (
                      <button
                        key={idx}
                        onClick={() => handleChallengeSelect(opt.value)}
                        disabled={showResult}
                        className={`p-3 bg-white/80 border-2 rounded-xl text-sm font-semibold transition-all text-left ${showResult
                            ? isTarget
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-400'
                            : `border-rose-200 hover:border-rose-400 hover:bg-white text-slate-700`
                          }`}
                      >
                        <span className="inline-block w-5 h-5 mr-1 text-xs text-slate-400 align-middle">{idx + 1}</span>
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 结果反馈 */}
            {showResult && (
              <div className={`mt-5 p-4 rounded-xl text-center animate-in fade-in zoom-in-95 duration-300 ${isCorrect ? 'bg-emerald-100/80 border-2 border-emerald-300' : 'bg-rose-100/80 border-2 border-rose-300'}`}>
                {isCorrect ? (
                  <div>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-1 text-emerald-600" />
                    <p className="font-black text-emerald-700 text-lg">+{lastXP} XP</p>
                  </div>
                ) : (
                  <div>
                    <XCircle className="w-10 h-10 mx-auto mb-1 text-rose-500" />
                    <p className="font-black text-rose-700">{t('答错了', 'Wrong')}</p>
                    <p className="text-sm text-slate-700 mt-1">
                      {t('正确答案：', 'Answer:')} <span className="font-bold">{currentTask.word.translation[language]}</span>
                    </p>
                    {currentTask.word.pinyin && (
                      <p className="text-xs text-slate-500 mt-1">[{currentTask.word.pinyin}]</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 底部操作栏 */}
      <div className="max-w-2xl mx-auto mt-5 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="text-slate-600"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('上一题', 'Prev')}
        </Button>

        <div className="flex items-center gap-2">
          {currentTask && !masteredIds.has(currentTask.word.id) && !showResult && (
            <Button
              variant="outline"
              onClick={handleMarkMastered}
              size="sm"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              title={t('不再考这题，直接掌握', 'Skip as mastered')}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              {t('已掌握', 'Mastered')}
            </Button>
          )}
          {currentTask && !showResult && currentIndex < tasks.length - 1 && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              size="sm"
              className="text-slate-500"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              {t('跳过', 'Skip')}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={goNext}
          disabled={currentIndex === tasks.length - 1}
          className="text-slate-600"
          size="sm"
        >
          {t('下一题', 'Next')}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* XP Toast */}
      {showXPToast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 to-green-400 text-white font-bold rounded-full shadow-lg">
            <Sparkles className="w-5 h-5" />
            <span>+{lastXP} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}
