'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ThemeId, Word, ChallengeTask } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import { LeaderboardSection } from '@/components/common/LeaderboardSection';
import { SteppeHorizon, YurtSilhouette, CloudPattern, KhataRibbon, SoyomboFlame, NaadamRing, StationBadge } from '@/components/learning/MongolianDecorations';
import { 
  ArrowLeft, 
  BookOpen, 
  Headphones, 
  RefreshCw, 
  Target,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sprout,
  Volume2,
  VolumeX,
  Trophy,
  XCircle,
  Zap,
  AlertCircle,
  ScrollText,
  GraduationCap,
  Sparkles,
  ArrowRight,
  MapPin,
} from 'lucide-react';

// 主题色条（哈达色系，按 theme.id 映射）
const themeAccents: Record<string, string> = {
  'basic-conversation': 'bg-gradient-to-r from-sky-400 to-cyan-500',
  'food-journey': 'bg-gradient-to-r from-orange-400 to-rose-500',
  'family-members': 'bg-gradient-to-r from-pink-400 to-fuchsia-500',
  'number-kingdom': 'bg-gradient-to-r from-indigo-400 to-purple-500',
  'mongolian-culture': 'bg-gradient-to-r from-amber-400 to-yellow-500',
  'nature-exploration': 'bg-gradient-to-r from-emerald-400 to-green-500',
  'advanced-comprehensive': 'bg-gradient-to-r from-violet-500 to-indigo-600',
};

// 7 个草原主题站的视觉方案（驿站风）
//  - bg: 卡面背景（柔和主题色调渐变）
//  - ring: 边框/卷轴条色调
//  - iconBg: 大图标容器背景（主题色调渐变）
//  - iconText: 图标字符色
//  - progress: 进度条渐变
//  - statusBg / statusText: 状态 chip 配色
//  - mongolian: 蒙古文竖排水印
const themeStationStyles: Record<string, {
  bg: string; ring: string; iconBg: string; iconText: string;
  progress: string; statusBg: string; statusText: string;
  mongolian: string;
}> = {
  'basic-conversation': {
    bg: 'from-sky-50 via-white to-cyan-50',
    ring: 'from-sky-400 to-cyan-500',
    iconBg: 'from-sky-400 to-cyan-500',
    iconText: 'text-sky-50',
    progress: 'from-sky-400 to-cyan-500',
    statusBg: 'bg-sky-100',
    statusText: 'text-sky-700',
    mongolian: 'ᠶᠠᠷᠢᠯᠴᠠᠭ᠎ᠠ', // 对话
  },
  'food-journey': {
    bg: 'from-orange-50 via-white to-rose-50',
    ring: 'from-orange-400 to-rose-500',
    iconBg: 'from-orange-400 to-rose-500',
    iconText: 'text-rose-50',
    progress: 'from-orange-400 to-rose-500',
    statusBg: 'bg-orange-100',
    statusText: 'text-orange-700',
    mongolian: 'ᠢᠳᠡᠨ᠎ᠡ', // 美食
  },
  'family-members': {
    bg: 'from-pink-50 via-white to-fuchsia-50',
    ring: 'from-pink-400 to-fuchsia-500',
    iconBg: 'from-pink-400 to-fuchsia-500',
    iconText: 'text-pink-50',
    progress: 'from-pink-400 to-fuchsia-500',
    statusBg: 'bg-pink-100',
    statusText: 'text-pink-700',
    mongolian: 'ᠭᠡᠷ', // 家庭
  },
  'number-kingdom': {
    bg: 'from-indigo-50 via-white to-purple-50',
    ring: 'from-indigo-400 to-purple-500',
    iconBg: 'from-indigo-400 to-purple-500',
    iconText: 'text-indigo-50',
    progress: 'from-indigo-400 to-purple-500',
    statusBg: 'bg-indigo-100',
    statusText: 'text-indigo-700',
    mongolian: 'ᠲᠣᠭ᠎ᠠ', // 数字
  },
  'mongolian-culture': {
    bg: 'from-amber-50 via-white to-yellow-50',
    ring: 'from-amber-400 to-yellow-500',
    iconBg: 'from-amber-400 to-yellow-500',
    iconText: 'text-amber-50',
    progress: 'from-amber-400 to-yellow-500',
    statusBg: 'bg-amber-100',
    statusText: 'text-amber-700',
    mongolian: 'ᠮᠣᠩᠭᠣᠯ', // 蒙古
  },
  'nature-exploration': {
    bg: 'from-emerald-50 via-white to-green-50',
    ring: 'from-emerald-400 to-green-500',
    iconBg: 'from-emerald-400 to-green-500',
    iconText: 'text-emerald-50',
    progress: 'from-emerald-400 to-green-500',
    statusBg: 'bg-emerald-100',
    statusText: 'text-emerald-700',
    mongolian: 'ᠪᠠᠶ᠋ᠢᠭᠠᠯᠢ', // 自然探索
  },
  'advanced-comprehensive': {
    bg: 'from-violet-50 via-white to-indigo-50',
    ring: 'from-violet-500 to-indigo-600',
    iconBg: 'from-violet-500 to-indigo-600',
    iconText: 'text-violet-50',
    progress: 'from-violet-500 to-indigo-600',
    statusBg: 'bg-violet-100',
    statusText: 'text-violet-700',
    mongolian: 'ᠶᠡᠷᠦᠩᠬᠡᠶᠢᠯᠡᠯ', // 进阶综合
  },
};

const defaultStationStyle = themeStationStyles['basic-conversation'];

// 地图针小图标（无外部依赖）
const MapPinIcon = () => <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
import { getThemeProgress, markWordLearned, updateStreak, type LearningProgress, getLearningProgress } from '@/lib/learning-progress';
import { LevelGuide } from './LevelGuide';

// 统一模式类型
type StudyMode = 'learning' | 'listening' | 'review' | 'challenge';

interface LearnPageProps {
  themeId?: ThemeId;
  initialMode?: StudyMode;
}

export function LearnPage({ themeId, initialMode }: LearnPageProps) {
  const router = useRouter();
  
  // 获取主题学习进度的辅助函数
  const getThemeLearnedCount = (themeSlug: string): number => {
    const themeWordIds = words.filter(w => w.theme === themeSlug).map(w => w.id);
    return getThemeProgress(themeWordIds).learned;
  };
  const searchParams = useSearchParams();
  
  const { 
    t, 
    addXP, 
    language, 
    xpState, 
    getWordsByTheme, 
    getWordsWithAudio,
    wrongAnswers,
    recordWrongAnswer,
    removeWrongAnswer,
    getWrongAnswerWords,
    hasWordAudio,
    getFirstAudioUrl,
    words,
    themes
  } = useApp();
  
  // 模式状态 - 优先使用URL参数，其次使用初始值，最后默认learning
  const urlMode = searchParams.get('mode') as StudyMode | null;
  const [studyMode, setStudyMode] = useState<StudyMode>(
    urlMode || initialMode || 'learning'
  );
  
  // ========== 新增：模式选择引导相关状态 ==========
  const [hasSelectedMode, setHasSelectedMode] = useState(false);
  const [selectedModeHighlight, setSelectedModeHighlight] = useState<StudyMode | null>(null);
  const themeSectionRef = useRef<HTMLDivElement>(null);
  const [showLevelGuide, setShowLevelGuide] = useState(false);
  // 主题选择弹窗（点击 4 模式卡时弹出）
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themePickerMode, setThemePickerMode] = useState<StudyMode | null>(null);

  // 模式选择后自动滚动到主题区域
  const scrollToThemeSection = useCallback(() => {
    // 延迟确保DOM已更新
    setTimeout(() => {
      themeSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }, []);
  
  // 处理模式选择 - 主页弹"选主题"对话框；主题页直接带参跳转
  const handleModeSelect = (mode: StudyMode) => {
    if (!themeId) {
      // 在主页：先选模式、再弹主题选择
      setStudyMode(mode);
      setSelectedModeHighlight(mode);
      setHasSelectedMode(true);
      setThemePickerMode(mode);
      setThemePickerOpen(true);
    } else {
      // 在主题页，带模式参数导航
      router.push(`/learn/${themeId}?mode=${mode}`);
    }
  };

  // 打开主题选择弹窗
  const openThemePicker = (mode: StudyMode) => {
    setThemePickerMode(mode);
    setThemePickerOpen(true);
  };

  // 主题选择：跳转到对应主题 + 模式
  const handleThemePick = (pickedThemeId: string, pickedMode: StudyMode) => {
    setThemePickerOpen(false);
    setThemePickerMode(null);
    router.push(`/learn/${pickedThemeId}?mode=${pickedMode}`);
  };
  
  // 模式提示文案
  const getModeHintText = (mode: StudyMode, lang: 'zh' | 'en') => {
    const hints: Record<StudyMode, { zh: string; en: string }> = {
      learning: {
        zh: '你已选择"学习模式"，请继续选择一个学习主题',
        en: 'You selected "Learn Mode". Now choose a learning theme.',
      },
      listening: {
        zh: '你已选择"听力模式"，请继续选择一个学习主题',
        en: 'You selected "Listen Mode". Now choose a learning theme.',
      },
      review: {
        zh: '你已选择"复习模式"，请继续选择一个学习主题',
        en: 'You selected "Review Mode". Now choose a learning theme.',
      },
      challenge: {
        zh: '你已选择"挑战模式"，请继续选择一个学习主题',
        en: 'You selected "Challenge Mode". Now choose a learning theme.',
      },
    };
    return hints[mode][lang];
  };
  
  // 基础状态
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 听力模式状态
  const [listenScore, setListenScore] = useState(0);
  const [listenTotal, setListenTotal] = useState(0);
  const [listenOptions, setListenOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showListenResult, setShowListenResult] = useState(false);
  const [listenCompleted, setListenCompleted] = useState(false);
  const [listenRevealed, setListenRevealed] = useState(false);
  
  // 挑战模式状态 - 使用稳定的题目结构
  const [challengeTasks, setChallengeTasks] = useState<ChallengeTask[]>([]);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeTotal, setChallengeTotal] = useState(0);
  const [selectedChallengeAnswer, setSelectedChallengeAnswer] = useState<string | null>(null);
  const [showChallengeResult, setShowChallengeResult] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeInitialized, setChallengeInitialized] = useState(false);
  
  // 复习模式状态
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  
  // 获取当前主题的词条
  const currentTheme = themeId ? themes.find((th) => th.id === themeId) : null;
  const themeWords = themeId ? getWordsByTheme(themeId) : [];
  const wordsWithAudio = getWordsWithAudio();
  
  // 听力模式专用：只使用当前主题中有音频的词条
  const themeWordsWithAudio = useMemo(() => {
    return themeWords.filter(word => hasWordAudio(word.id));
  }, [themeWords, hasWordAudio]);
  
  // 根据模式获取当前词条
  const currentWord = useMemo(() => {
    if (studyMode === 'review' && reviewWords.length > 0) {
      return reviewWords[currentIndex] || null;
    }
    // 听力模式使用所有词条（有音频用音频，无音频用TTS）
    if (studyMode === 'listening') {
      return themeWords[currentIndex] || null;
    }
    return themeWords[currentIndex] || null;
  }, [studyMode, reviewWords, currentIndex, themeWords, themeWordsWithAudio]);
  
  // 根据模式获取词条列表（用于进度计算）
  const currentWords = useMemo(() => {
    if (studyMode === 'review' && reviewWords.length > 0) {
      return reviewWords;
    }
    // 听力模式使用所有词条
    if (studyMode === 'listening') {
      return themeWords;
    }
    return themeWords;
  }, [studyMode, reviewWords, themeWords, themeWordsWithAudio]);
  
  // 获取所有主题的词条数量
  const getThemeWordCount = (tid: ThemeId) => getWordsByTheme(tid).length;
  
  // 获取错题词条
  const getWrongWords = useCallback((mode: 'listening' | 'challenge'): Word[] => {
    return getWrongAnswerWords(mode);
  }, [getWrongAnswerWords]);
  
  // 初始化复习词条
  useEffect(() => {
    if (studyMode === 'review' && themeId) {
      const wrongList = getWrongWords('listening').concat(getWrongWords('challenge'));
      const uniqueWrongWords = wrongList.filter((w, i, arr) => 
        arr.findIndex(x => x.id === w.id) === i
      );
      // 如果有错题就显示错题，否则显示主题词条
      setReviewWords(uniqueWrongWords.length > 0 ? uniqueWrongWords : themeWords);
    }
  }, [studyMode, themeId, getWrongWords, themeWords]);
  
  // 重置状态当切换主题时
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setLearnedWords([]);
    setListenScore(0);
    setListenTotal(0);
    setListenCompleted(false);
    setChallengeScore(0);
    setChallengeTotal(0);
    setChallengeCompleted(false);
  }, [themeId]);
  
  // 生成听力题目选项（使用当前主题中有音频的词条）
  const generateListenOptions = useCallback(() => {
    if (!currentWord || themeWordsWithAudio.length < 4) return null;
    
    // 从当前主题有音频的词条中选择干扰项
    const wrongOptions = themeWordsWithAudio
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.translation[language]);
    
    const options = [...wrongOptions, currentWord.translation[language]]
      .sort(() => Math.random() - 0.5);
    
    return options;
  }, [currentWord, themeWordsWithAudio, language]);
  
  // 生成稳定的挑战题目列表 - 只在进入挑战模式时调用一次
  const generateChallengeTasks = useCallback((words: Word[], lang: 'zh' | 'en'): ChallengeTask[] => {
    if (words.length < 4) return [];
    
    // 打乱词序并取所有词作为题目
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    
    const tasks: ChallengeTask[] = shuffledWords.map((word, index) => {
      // 获取题目文本：根据语言选择翻译
      const promptText = lang === 'zh' 
        ? word.translation.zh 
        : (word.translation.en || word.translation.zh);
      
      // 生成选项：正确答案 + 3个干扰项
      const otherWords = words.filter(w => w.id !== word.id);
      const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...shuffledOthers, word].sort(() => Math.random() - 0.5);
      
      return {
        id: `task-${index}-${word.id}`,
        word,
        promptText,
        options,
        correctWordId: word.id,
      };
    });
    
    return tasks;
  }, []);
  
  // TTS 语音合成
  const playTTS = useCallback(() => {
    if (!currentWord) return;
    setIsPlaying(true);
    
    const text = currentWord.pinyin || currentWord.mongolian || '';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'mn-MN';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    const voices = speechSynthesis.getVoices();
    const mongolianVoice = voices.find(v => v.lang.startsWith('mn'));
    if (mongolianVoice) {
      utterance.voice = mongolianVoice;
    }
    
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, [currentWord]);

  // 播放音频 - 优先使用真实音频，否则使用 TTS
  const playAudio = useCallback(() => {
    if (!currentWord) return;
    
    // 优先使用真实音频
    if (hasWordAudio(currentWord.id)) {
      const audioUrl = getFirstAudioUrl(currentWord.id);
      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onplay = () => setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          playTTS();
        };
        audioRef.current.play();
        return;
      }
    }
    
    // 没有真实音频，使用 TTS
    playTTS();
  }, [currentWord, hasWordAudio, getFirstAudioUrl, playTTS]);
  
  // 停止音频
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };
  
  // 切换音频播放
  const toggleAudio = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };
  
  // 翻转卡片
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };
  
  // 标记为已学习
  const markAsLearned = () => {
    if (currentWord && !learnedWords.includes(currentWord.id)) {
      setLearnedWords([...learnedWords, currentWord.id]);
      addXP('learn_word');
      // 持久化学习进度到 localStorage
      markWordLearned(currentWord.id);
    }
    
    const words = studyMode === 'review' && reviewWords.length > 0 ? reviewWords : themeWords;
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };
  
  // 下一个词
  const nextWord = () => {
    const words = studyMode === 'review' && reviewWords.length > 0 ? reviewWords : themeWords;
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };
  
  // 上一词
  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };
  
  // 重新开始
  const restart = () => {
    setCurrentIndex(0);
    setLearnedWords([]);
    setIsFlipped(false);
    setListenScore(0);
    setListenTotal(0);
    setListenCompleted(false);
    setListenRevealed(false);
    setChallengeScore(0);
    setChallengeTotal(0);
    setChallengeCompleted(false);
    setSelectedChallengeAnswer(null);
    setShowChallengeResult(false);
    // 重新生成挑战题目
    if (themeWords.length >= 4) {
      const tasks = generateChallengeTasks(themeWords, language);
      setChallengeTasks(tasks);
    }
  };
  
  // 处理听力答案选择
  const handleListenAnswer = (answer: string) => {
    if (showListenResult || !currentWord) return;
    
    setSelectedAnswer(answer);
    setShowListenResult(true);
    setListenTotal(prev => prev + 1);
    
    const isCorrect = answer === currentWord.translation[language];
    if (isCorrect) {
      setListenScore(prev => prev + 1);
      addXP('listening');
      markWordLearned(currentWord.id);
    } else {
      recordWrongAnswer(currentWord.id, 'listening');
    }
    
    // 1.5秒后自动下一题
    setTimeout(() => {
      if (currentIndex < themeWordsWithAudio.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setListenCompleted(true);
      }
    }, 1500);
  };
  
  // 处理挑战答案选择 - 使用稳定的 challengeTasks
  const handleChallengeAnswer = (selectedWordId: string) => {
    if (showChallengeResult || !challengeTasks.length) return;
    
    const currentTask = challengeTasks[currentIndex];
    if (!currentTask) return;
    
    setSelectedChallengeAnswer(selectedWordId);
    setShowChallengeResult(true);
    setChallengeTotal(prev => prev + 1);
    
    const isCorrect = selectedWordId === currentTask.correctWordId;
    if (isCorrect) {
      setChallengeScore(prev => prev + 1);
      addXP('challenge');
      markWordLearned(currentTask.correctWordId);
    } else {
      recordWrongAnswer(currentTask.correctWordId, 'challenge');
    }
    
    // 1.5秒后自动下一题 - 只推进索引，不再重新生成
    setTimeout(() => {
      if (currentIndex < challengeTasks.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedChallengeAnswer(null);
        setShowChallengeResult(false);
      } else {
        setChallengeCompleted(true);
      }
    }, 1500);
  };
  
  // 听力模式：跟踪当前题目的 wordId，防止重复触发
  const [currentListenWordId, setCurrentListenWordId] = useState<string | null>(null);
  
  // 初始化选项和自动播放音频 - 只在新题目时触发
  useEffect(() => {
    if (studyMode === 'listening' && currentWord && currentWord.id !== currentListenWordId) {
      setCurrentListenWordId(currentWord.id);
      setSelectedAnswer(null);
      setShowListenResult(false);
      
      const options = generateListenOptions();
      if (options) {
        setListenOptions(options);
      }
      
      // 自动播放音频 - 延迟播放确保选项已生成
      const timer = setTimeout(() => {
        playAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [studyMode, currentWord, currentListenWordId, generateListenOptions, playAudio]);
  
  // 初始化挑战题目 - 只在进入挑战模式时生成一次
  useEffect(() => {
    if (studyMode === 'challenge' && themeWords.length >= 4 && !challengeInitialized) {
      // 生成稳定的挑战题目列表
      const tasks = generateChallengeTasks(themeWords, language);
      setChallengeTasks(tasks);
      setChallengeInitialized(true);
      setCurrentIndex(0);
    }
    // 当切换到非挑战模式时重置初始化状态
    if (studyMode !== 'challenge') {
      setChallengeInitialized(false);
    }
  }, [studyMode, themeWords, language, generateChallengeTasks, challengeInitialized]);
  
  // 切换模式并导航
  const handleModeSelectOriginal = (mode: StudyMode) => {
    if (!themeId) {
      // 在主页，选择模式后高亮但不导航
      setStudyMode(mode);
    } else {
      // 在主题页，带模式参数导航
      router.push(`/learn/${themeId}?mode=${mode}`);
    }
  };
  
  // 切换主题
  const handleThemeSelect = (selectedThemeId: ThemeId) => {
    router.push(`/learn/${selectedThemeId}?mode=${studyMode}`);
  };

  // 模式数据（草原生活主题）
  const modeConfigs = [
    {
      mode: 'learning' as StudyMode,
      icon: BookOpen,
      color: 'from-emerald-500 via-green-500 to-teal-500',
      desc: t('翻卡学习', 'Flip study'),
      labelZh: '牧人帐中',
      labelEn: 'In the Yurt',
      cultureNote: '羊皮卷 · 翻一翻',
      bgColor: 'bg-emerald-500',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-600',
      hoverBg: 'hover:bg-emerald-50'
    },
    {
      mode: 'listening' as StudyMode,
      icon: Headphones,
      color: 'from-sky-500 via-cyan-500 to-teal-500',
      desc: t('听音辨义', 'Listen'),
      labelZh: '风中听语',
      labelEn: 'Wind-borne',
      cultureNote: '耳机里 · 听一听',
      bgColor: 'bg-teal-500',
      borderColor: 'border-teal-200',
      textColor: 'text-teal-600',
      hoverBg: 'hover:bg-teal-50'
    },
    {
      mode: 'review' as StudyMode,
      icon: RefreshCw,
      color: 'from-lime-500 via-green-500 to-emerald-500',
      desc: t('重温旧词', 'Review'),
      labelZh: '故地重游',
      labelEn: 'Re-walk',
      cultureNote: '老路上 · 走一走',
      bgColor: 'bg-lime-500',
      borderColor: 'border-lime-200',
      textColor: 'text-lime-600',
      hoverBg: 'hover:bg-lime-50'
    },
    {
      mode: 'challenge' as StudyMode,
      icon: Target,
      color: 'from-amber-500 via-orange-500 to-rose-500',
      desc: t('四选一', 'Quiz'),
      labelZh: '那达慕大会',
      labelEn: 'Naadam',
      cultureNote: '擂台赛 · 拼一拼',
      bgColor: 'bg-amber-500',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-600',
      hoverBg: 'hover:bg-amber-50'
    },
  ];
  
  const modeLabels: Record<StudyMode, { zh: string; en: string }> = {
    learning: { zh: '学习模式', en: 'Learn Mode' },
    listening: { zh: '听力模式', en: 'Listen Mode' },
    review: { zh: '复习模式', en: 'Review Mode' },
    challenge: { zh: '挑战模式', en: 'Challenge Mode' },
  };
  
  // ========== 主页 - 模式选择和主题选择 ==========
  if (!themeId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        {/* 草原 Hero：天 - 远山 - 草原 */}
        <div className="relative rounded-2xl overflow-hidden mb-8 border border-emerald-100 shadow-sm">
          {/* 天空层 */}
          <div className="h-32 sm:h-40 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 relative">
            {/* 太阳 */}
            <div className="absolute top-4 right-8 w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 shadow-[0_0_30px_8px_rgba(251,191,36,0.4)]" />
            {/* 飞鸟 */}
            <div className="absolute top-7 left-1/3 text-slate-500/40 text-xl select-none">𓅔 𓅔</div>
            {/* 蒙古文水印 */}
            <div className="absolute right-3 top-3 bottom-3 flex flex-col-reverse text-amber-700/15 font-mongolian select-none pointer-events-none" style={{ writingMode: 'vertical-rl', fontSize: '20px', lineHeight: 1.1 }}>
              ᠰᠤᠷᠤᠯᠴᠠᠬᠤ
            </div>
            {/* 哈达飘带（顶部 5 色） */}
            <KhataRibbon className="absolute top-0 left-2 right-2 z-10" />
          </div>
          {/* 草原层 + 远山 */}
          <div className="h-14 sm:h-16 bg-gradient-to-b from-emerald-100 via-emerald-200 to-emerald-300 relative">
            <SteppeHorizon />
            <YurtSilhouette className="absolute bottom-1 left-6 sm:left-10 w-14 sm:w-20 h-auto opacity-90" />
            <YurtSilhouette className="absolute bottom-1 right-16 sm:right-24 w-10 sm:w-14 h-auto opacity-70" />
          </div>
          {/* 文案层 */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-amber-50 border-t border-amber-200/50 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 text-white">
                  <MapPin className="w-4 h-4" />
                </span>
                {t('学习中心', 'Learning Center')}
              </h1>
              <p className="text-emerald-700 text-sm mt-0.5">
                {t('穿越草原，习得蒙古语', 'Cross the steppe, master Mongolian')}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 bg-white/70 px-2.5 py-1 rounded-full border border-amber-200">
              <NaadamRing className="w-3.5 h-3.5" />
              <span>{t('欢迎，学习者', 'Welcome, learner')}</span>
            </div>
          </div>
        </div>

        {/* ===== 2 列布局: Card A 模式选择大卡 + Card B 字母表卡 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">

          {/* ============= Card A: 模式选择大卡 (占 2/3) ============= */}
          <div className="lg:col-span-2 relative">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 via-stone-50 to-sky-50">
              {/* 卷轴条 左 */}
              <div className="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 z-10" />
              {/* 卷轴条 右 */}
              <div className="absolute right-0 top-0 bottom-0 w-2 sm:w-2.5 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 z-10" />
              {/* 顶部哈达飘带 5 色 */}
              <div className="absolute top-0 left-2 right-2 sm:left-2.5 sm:right-2.5 flex h-1 opacity-80 z-10">
                <div className="flex-1 bg-sky-400" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-amber-400" />
                <div className="flex-1 bg-emerald-500" />
                <div className="flex-1 bg-rose-500" />
              </div>

              <CardContent className="relative p-4 sm:p-5 pl-5 sm:pl-6 pr-5 sm:pr-6">

                {/* 标题区 */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                    <BookOpen className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                      {t('单词学习', 'Word Learning')}
                      <span className="ml-1.5 text-xs sm:text-sm font-normal text-slate-500">
                        · {t('草原生活', 'Steppe Learning')}
                      </span>
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 italic">
                      {t('点击模式卡选择主题开始学习', 'Tap a mode to pick a theme')}
                    </p>
                  </div>
                </div>

                {/* 4 模式入口 2×2 网格 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-3 sm:mb-4">
                  {modeConfigs.map(({ mode, icon: Icon, color, desc, labelZh, labelEn, cultureNote }) => {
                    const isActive = studyMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => openThemePicker(mode)}
                        className={`
                          relative p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${color} text-white
                          hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md overflow-hidden text-left
                          ${isActive ? 'ring-2 ring-amber-400 ring-offset-1 shadow-lg' : 'opacity-95 hover:opacity-100'}
                        `}
                      >
                        {/* 顶部三色装饰条 */}
                        <div className="absolute top-0 left-0 right-0 flex h-0.5 opacity-80">
                          <div className="flex-1 bg-sky-200" />
                          <div className="flex-1 bg-yellow-200" />
                          <div className="flex-1 bg-emerald-300" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 sm:w-4 sm:h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-sm leading-tight">
                              {language === 'zh' ? labelZh : labelEn}
                            </div>
                            <div className="text-[9px] sm:text-[10px] opacity-90 mt-0.5 leading-tight">
                              {language === 'zh' ? cultureNote : desc}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 传统云纹分隔线 */}
                <div className="flex items-center gap-2 my-2.5 sm:my-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                  <CloudPattern className="w-10 h-2.5 sm:w-12 sm:h-3 text-amber-400 opacity-70" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                </div>

                {/* 每日学习 entry：朝阳下 · 启程 */}
                <Link
                  href="/learn/daily"
                  className="block group"
                  data-testid="daily-learn-entry"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 hover:from-amber-100 hover:to-rose-100 transition-all shadow-sm hover:shadow-md">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-rose-500" />
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 pl-4 sm:pl-5">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-md flex-shrink-0">
                        <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                          {t('每日学习', 'Daily Study')}
                        </div>
                        <div className="text-[11px] sm:text-xs text-orange-700 font-medium mt-0.5">
                          {t('朝阳下 · 启程', 'Sunrise · set out')}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </div>
                </Link>

                {/* 蒙古文水印 ᠰᠤᠷᠤᠯᠴᠠᠬᠤ (学习者) */}
                <div
                  className="absolute bottom-1.5 right-3 text-amber-900/10 font-mongolian select-none pointer-events-none hidden sm:block"
                  style={{ writingMode: 'vertical-rl', fontSize: '20px', lineHeight: 1 }}
                  aria-hidden
                >
                  ᠰᠤᠷᠤᠯᠴᠠᠬᠤ
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============= Card B: 字母表独立卡 (占 1/3) ============= */}
          <div className="relative">
            <Link href="/alphabet" className="block h-full">
              <Card className="relative overflow-hidden border-0 shadow-lg h-full bg-gradient-to-br from-sky-50 via-amber-50 to-orange-50 hover:shadow-xl transition-all">
                {/* 卷轴条 左 */}
                <div className="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5 bg-gradient-to-b from-sky-600 via-sky-500 to-sky-700 z-10" />
                {/* 卷轴条 右 */}
                <div className="absolute right-0 top-0 bottom-0 w-2 sm:w-2.5 bg-gradient-to-b from-sky-600 via-sky-500 to-sky-700 z-10" />
                {/* 顶部哈达飘带 5 色 */}
                <div className="absolute top-0 left-2 right-2 sm:left-2.5 sm:right-2.5 flex h-1 opacity-80 z-10">
                  <div className="flex-1 bg-sky-400" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-amber-400" />
                  <div className="flex-1 bg-emerald-500" />
                  <div className="flex-1 bg-rose-500" />
                </div>

                <CardContent className="relative p-4 sm:p-5 pl-5 sm:pl-6 pr-5 sm:pr-6 flex flex-col min-h-[440px] sm:min-h-[500px]">

                  {/* 标题区 */}
                  <div className="flex items-start gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-white text-sm sm:text-base font-mongolian leading-none mt-0.5">ᠮᠨ</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                        {t('字母表', 'Alphabet')}
                        <span className="ml-1.5 text-xs sm:text-sm font-normal text-slate-500">
                          · {t('蒙古文字根', 'Mongolian script')}
                        </span>
                      </h2>
                      <p className="text-[11px] sm:text-xs text-sky-700 font-medium mt-1">
                        {t('7 元音 · 15 辅音 · 书写规则', '7 vowels · 15 consonants · rules')}
                      </p>
                    </div>
                  </div>

                  {/* 7 元音预览 + 1 个辅音示例 */}
                  <div className="mb-3">
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mb-1.5">
                      {t('7 元音预览', '7 vowels preview')}
                    </p>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {[
                        { char: 'ᠠ', label: 'A' },
                        { char: 'ᠡ', label: 'E' },
                        { char: 'ᠢ', label: 'I' },
                        { char: 'ᠣ', label: 'O' },
                        { char: 'ᠤ', label: 'U' },
                        { char: 'ᠥ', label: 'Ö' },
                        { char: 'ᠦ', label: 'Ü' },
                        { char: 'ᠪ', label: 'B' },
                      ].map(({ char, label }) => (
                        <div
                          key={char}
                          className="aspect-square rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 border border-sky-200 flex flex-col items-center justify-center hover:from-sky-200 hover:to-blue-200 transition-all"
                        >
                          <span className="font-mongolian text-base sm:text-lg text-sky-800 leading-none">{char}</span>
                          <span className="text-[8px] sm:text-[9px] text-sky-600 font-bold mt-0.5">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-slate-500 mb-3 italic">
                    {t('+ 15 个辅音等你探索', '+ 15 consonants await')}
                  </p>

                  {/* CTA 按钮 (羊皮卷样式) */}
                  <div className="mt-auto">
                    <div className="relative w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 flex h-0.5 opacity-70">
                        <div className="flex-1 bg-sky-200" />
                        <div className="flex-1 bg-yellow-200" />
                        <div className="flex-1 bg-emerald-300" />
                      </div>
                      <span className="relative">{t('开启字母之旅', 'Begin alphabet journey')}</span>
                      <ChevronRight className="relative w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  {/* 蒙古文水印 ᠮᠣᠩᠭᠣᠯ (蒙古) */}
                  <div
                    className="absolute bottom-1.5 right-3 text-sky-900/10 font-mongolian select-none pointer-events-none hidden sm:block"
                    style={{ writingMode: 'vertical-rl', fontSize: '20px', lineHeight: 1 }}
                    aria-hidden
                  >
                    ᠮᠣᠩᠭᠣᠯ
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* ===== 等级图鉴 单独一行 ===== */}
        <div className="mb-6">
          <button
            onClick={() => setShowLevelGuide(true)}
            className="w-full text-left"
          >
            {/* 那达慕金 · 暖琥珀：成吉思汗令牌 / 优胜者披红的暖色荣耀色系，与紫色 AI 老师完全区分 */}
            <Card className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all border-0 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 flex h-0.5 opacity-90">
                <div className="flex-1 bg-amber-200" />
                <div className="flex-1 bg-orange-200" />
                <div className="flex-1 bg-rose-300" />
              </div>
              <CardContent className="p-3 sm:p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0 ring-1 ring-white/30">
                  <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    {t('等级图鉴', 'Level Guide')}
                  </h3>
                  <p className="text-white/85 text-[10px] sm:text-xs leading-tight mt-0.5">
                    {t('查看等级权益 · 9 级图鉴', 'View benefits · 9-level guide')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/85 flex-shrink-0" />
              </CardContent>
            </Card>
          </button>
        </div>

        {/* ===== 主题选择弹窗 (草原七站 · 驿站风) ===== */}
        <Dialog open={themePickerOpen} onOpenChange={setThemePickerOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 border-0 gap-0 overflow-hidden bg-gradient-to-b from-amber-50/60 via-white to-emerald-50/60">
            {/* 顶部 5 色哈达飘带 */}
            <div className="flex h-1.5">
              <div className="flex-1 bg-sky-400" />
              <div className="flex-1 bg-white" />
              <div className="flex-1 bg-amber-400" />
              <div className="flex-1 bg-emerald-500" />
              <div className="flex-1 bg-rose-500" />
            </div>

            {/* Header: 羊皮卷条 + 卷轴 */}
            <div className="relative px-4 sm:px-5 pt-4 sm:pt-5 pb-3 bg-gradient-to-b from-amber-50/80 to-transparent">
              {/* 卷轴条 左右 */}
              <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 rounded-r" />
              <div className="absolute right-0 top-2 bottom-2 w-1.5 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 rounded-l" />
              <DialogHeader className="px-2">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800">
                  <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span className="flex-1">{t('草原七站 · 启程', 'Seven Steppe Stations')}</span>
                  <span className="font-mongolian text-base sm:text-lg text-amber-700/70 leading-none mt-0.5 select-none">
                    ᠰᠢᠨ᠎ᠡ ᠵᠠᠰᠠᠯ
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 pl-10 sm:pl-11">
                  <span className="text-slate-500">{t('当前模式', 'Mode')}:</span>
                  <span className="font-bold text-emerald-700">
                    {themePickerMode ? getModeHintText(themePickerMode, language).split('·')[0].trim() : ''}
                  </span>
                  <span className="mx-1 text-slate-300">·</span>
                  <span className="text-slate-600">{t('择一站，开启你的蒙古之旅', 'Pick a station, begin your journey')}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* 主体：7 张驿站卡（垂直滚动列表） */}
            <div className="px-3 sm:px-4 py-2 space-y-2.5 max-h-[55vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                {themes.map((theme, idx) => {
                  const learned = getThemeLearnedCount(theme.id);
                  const total = getThemeWordCount(theme.id);
                  const progress = total > 0 ? Math.min(100, (learned / total) * 100) : 0;
                  const isDone = total > 0 && learned === total;
                  const isLoading = total === 0;
                  const style = themeStationStyles[theme.id] || defaultStationStyle;
                  return (
                    <div
                      key={theme.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleThemePick(theme.id, themePickerMode!)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleThemePick(theme.id, themePickerMode!);
                        }
                      }}
                      className="text-left group relative cursor-pointer select-none"
                    >
                      <Card className={`
                        relative overflow-hidden cursor-pointer
                        border-0 shadow-md hover:shadow-2xl
                        transition-all duration-300
                        group-hover:-translate-y-0.5
                        bg-gradient-to-br ${style.bg}
                        ring-1 ring-inset ring-white/60
                      `}>
                        {/* 左侧卷轴条（主题色调） */}
                        <div className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${style.ring} z-10`} />
                        {/* 右侧卷轴条（主题色调） */}
                        <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${style.ring} z-10`} />

                        {/* 蒙古文竖排水印 */}
                        <div
                          className="pointer-events-none absolute right-3 top-1 bottom-1 flex flex-col-reverse text-slate-400/12 font-mongolian select-none z-0"
                          style={{ writingMode: 'vertical-rl', fontSize: '22px', lineHeight: 1 }}
                          aria-hidden
                        >
                          {style.mongolian}
                        </div>

                        {/* 顶部 5 色哈达 */}
                        <div className="pointer-events-none absolute top-0 left-1.5 right-1.5 flex h-0.5 opacity-90 z-10">
                          <div className="flex-1 bg-sky-400" />
                          <div className="flex-1 bg-white" />
                          <div className="flex-1 bg-amber-400" />
                          <div className="flex-1 bg-emerald-500" />
                          <div className="flex-1 bg-rose-500" />
                        </div>

                        <CardContent className="relative p-3 sm:p-3.5 pl-4 sm:pl-5 pr-5 sm:pr-6 z-[1]">
                          {/* 横向布局：站号 + icon + 标题/描述 | 进度 */}
                          <div className="flex items-center gap-3">
                            {/* 站号 + icon */}
                            <div className={`
                              relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl
                              bg-gradient-to-br ${style.iconBg}
                              flex items-center justify-center
                              text-xl sm:text-2xl flex-shrink-0
                              shadow-lg group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300
                            `}>
                              <span className={`${style.iconText} drop-shadow pointer-events-none`}>
                                {theme.icon}
                              </span>
                              {/* 站号小角章 */}
                              <div className="pointer-events-none absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow ring-2 ring-white" style={{width:'18px',height:'18px'}}>
                                {idx + 1}
                              </div>
                            </div>

                            {/* 标题 + 描述 + 进度条 */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] leading-tight">
                                  {language === 'zh' ? theme.name.zh : theme.name.en}
                                </h3>
                                <span className={`
                                  text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0
                                  ${isLoading ? 'bg-slate-100 text-slate-500' : isDone ? 'bg-amber-100 text-amber-700' : `${style.statusBg} ${style.statusText}`}
                                `}>
                                  {isLoading
                                    ? t('加载中', 'loading')
                                    : isDone
                                      ? `✓ ${t('已完成', 'done')}`
                                      : t('启程中', 'en route')}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {language === 'zh' ? (theme.description?.zh || '') : (theme.description?.en || '')}
                              </p>
                              {/* 进度条 */}
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-white/70 overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full bg-gradient-to-r ${style.progress} rounded-full transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                  <YurtSilhouette className="w-5 h-2.5 text-slate-400/50 pointer-events-none" />
                                  <span className="text-[10px] text-slate-600 font-medium tabular-nums">
                                    <span className="font-bold text-slate-800">{learned}</span>
                                    <span className="text-slate-400">/</span>
                                    <span>{total}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 右侧箭头 */}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-700 transition-all flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
            </div>

            {/* 底部: 卷轴底纹 + 蒙古文 */}
            <div className="relative h-7 bg-gradient-to-t from-amber-100/50 to-transparent flex items-center justify-center border-t border-amber-200/40">
              <div className="flex items-center gap-2 text-amber-700/60">
                <CloudPattern className="w-12 h-2 text-amber-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase">
                  {t('沿着驿站，穿越草原', 'Stations across the steppe')}
                </span>
                <CloudPattern className="w-12 h-2 text-amber-400" />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* 等级图鉴弹窗 */}
        {showLevelGuide && (
          <LevelGuide onClose={() => setShowLevelGuide(false)} />
        )}

        {/* 学习排行 + 日历 */}
        <div className="mt-8">
          <LeaderboardSection />
        </div>

        {/* AI 老师快捷入口 */}
        <Link
          href="/ai"
          className="mt-8 block group relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 p-3.5 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -left-8 -bottom-8 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-lg font-bold text-white leading-tight truncate">
                    {language === 'zh' ? 'AI 老师在线' : 'AI Tutor Online'}
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-medium text-white">
                    <Sparkles className="w-2.5 h-2.5" />
                    {language === 'zh' ? '智能' : 'Smart'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-sm text-indigo-50 leading-snug line-clamp-1 sm:line-clamp-none">
                  {language === 'zh' ? 'AI 问答' : 'AI Q&A · Learn Mongolian'}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-full bg-white text-indigo-600 font-semibold text-xs sm:text-sm group-hover:gap-2.5 transition-all">
              <span>{language === 'zh' ? '开始' : 'Start'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // ========== 主题页 ==========
  
  // 空数据检查
  const hasListeningData = themeWords.length >= 1; // TTS作为fallback，只要有词条即可
  const hasChallengeData = themeWords.length >= 4;
  const hasReviewData = true; // 复习模式即使没有错题也能用主题词条

  // 听力模式 - 没有词条时显示空状态
  if (studyMode === 'listening' && !hasListeningData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Headphones className="w-6 h-6 text-teal-500" />
                {t('听力模式', 'Listen Mode')}
              </h1>
            </div>
          </div>
        </div>
        
        <Card className="max-w-md mx-auto mt-20 bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-teal-400" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {t('暂无词条', 'No Words Available')}
            </h2>
            <p className="text-slate-600 mb-6">
              {t('该主题暂无词条可供学习', 'This theme has no words available for learning')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => router.push(`/learn/${themeId}?mode=learning`)}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t('切换到学习模式', 'Switch to Learn Mode')}
              </Button>
              <Link href="/learn">
                <Button variant="outline" className="border-teal-200 text-teal-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('返回', 'Back')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 挑战模式 - 没有足够词条时显示空状态
  if (studyMode === 'challenge' && !hasChallengeData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-6 h-6 text-amber-500" />
                {t('挑战模式', 'Challenge Mode')}
              </h1>
            </div>
          </div>
        </div>
        
        <Card className="max-w-md mx-auto mt-20 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {t('词条数量不足', 'Not Enough Words')}
            </h2>
            <p className="text-slate-600 mb-6">
              {t('挑战模式需要至少4个词条', 'Challenge mode requires at least 4 words')}
            </p>
            <p className="text-amber-600 text-sm mb-6">
              {t('当前词条', 'Current words')}: {themeWords.length}
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => router.push(`/learn/${themeId}?mode=learning`)}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t('切换到学习模式', 'Switch to Learn Mode')}
              </Button>
              <Link href="/learn">
                <Button variant="outline" className="border-amber-200 text-amber-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('返回', 'Back')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 检查是否有词条
  if (currentWords.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {language === 'zh' ? currentTheme?.name.zh : currentTheme?.name.en}
              </h1>
            </div>
          </div>
        </div>
        
        <Card className="max-w-md mx-auto mt-20 bg-slate-50 border-slate-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {t('该主题暂无词条', 'No Words in This Theme')}
            </h2>
            <p className="text-slate-600 mb-6">
              {t('请选择其他主题开始学习', 'Please select another theme to start learning')}
            </p>
            <Link href="/learn">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('返回主题列表', 'Back to Theme List')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== 听力模式 ==========
  if (studyMode === 'listening') {
    if (listenCompleted || currentIndex >= currentWords.length) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-teal-500" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('听力练习完成！', 'Listening Practice Complete!')}
                </h2>
                <p className="text-4xl font-bold text-teal-600 mb-2">
                  {currentWords.length} {t('个词条', 'words')}
                </p>
                <p className="text-slate-600 mb-6">
                  {t('你已经完成了本次听力练习', 'You have completed this listening practice')}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => { restart(); setListenRevealed(false); }}
                    className="bg-teal-500 hover:bg-teal-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('再练一次', 'Practice Again')}
                  </Button>
                  <Link href="/learn">
                    <Button variant="outline" className="border-teal-200 text-teal-600">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('返回', 'Back')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Headphones className="w-6 h-6 text-teal-500" />
                {t('听力模式', 'Listen Mode')}
              </h1>
              <p className="text-sm text-teal-600">
                {language === 'zh' ? currentTheme?.name.zh : currentTheme?.name.en}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-teal-600 font-medium">
              {currentIndex + 1} / {currentWords.length}
            </span>
            <Button variant="outline" onClick={restart} className="border-teal-200 text-teal-600 hover:bg-teal-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('重新开始', 'Restart')}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-teal-100 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / currentWords.length) * 100}%` }}
          />
        </div>

        {/* 听力卡片 - 点击播放音频，点击空白显示意思 */}
        <Card 
          className="max-w-md mx-auto mb-8 bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200 cursor-pointer select-none active:scale-[0.98] transition-transform"
          onClick={() => {
            if (!listenRevealed) {
              setListenRevealed(true);
            }
          }}
        >
          <CardContent className="p-8 text-center">
            {/* 播放按钮 - 蒙古包内圈 + 银色大按钮 */}
            <div className="mb-6 flex items-center justify-center">
              <div className="relative">
                {/* 蒙古包外圈（云纹装饰） */}
                <CloudPattern className="absolute -inset-4 w-32 h-32 text-teal-300 opacity-50" />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                  size="lg"
                  className={`relative w-24 h-24 rounded-full ${isPlaying ? 'bg-gradient-to-br from-teal-300 to-cyan-400' : 'bg-gradient-to-br from-slate-200 via-white to-teal-200 hover:from-slate-100 hover:to-teal-100'} transition-colors shadow-2xl border-4 border-teal-400/60`}
                >
                  {isPlaying ? (
                    <VolumeX className="w-12 h-12 text-teal-800" />
                  ) : (
                    <Volume2 className="w-12 h-12 text-teal-700" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-teal-600 mt-3 text-sm">
              {isPlaying ? t('风中听语...', 'Wind-borne...') : t('点击蒙古包听音', 'Tap the yurt to listen')}
            </p>

            {/* 蒙古文展示 - 使用预渲染 SVG path 文件 */}
            <div className="mb-4">
              <MongolianTextImage
                key={`${currentWord?.id || 'no-word'}-${currentWord?.mongolian || ''}`}
                wordId={currentWord?.id}
                src={currentWord?.mongolianImageSrc}
                alt={currentWord?.mongolian || ''}
                fallbackText={currentWord?.mongolian || ''}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                srcKey={currentWord?.id}
                className="text-teal-800 w-8 h-auto mx-auto"
                imgClassName="w-full h-auto"
              />
            </div>

            {/* 拼音 */}
            <p className="text-lg text-teal-700 font-medium mb-4">
              {currentWord?.pinyin || ''}
            </p>

            {/* 意思区域 - 点击后显示 */}
            {!listenRevealed ? (
              <div className="mt-4 py-6 px-4 bg-white/60 rounded-xl border-2 border-dashed border-teal-300">
                <p className="text-teal-500 text-sm">
                  👆 {t('点击此处查看意思', 'Tap here to reveal meaning')}
                </p>
              </div>
            ) : (
              <div className="mt-4 py-4 px-4 bg-white rounded-xl border border-teal-200 animate-in fade-in duration-300">
                <p className="text-xl font-bold text-slate-800">
                  {language === 'zh' 
                    ? (currentWord?.translation?.zh || currentWord?.translation?.en || '')
                    : (currentWord?.translation?.en || currentWord?.translation?.zh || '')
                  }
                </p>
                {language === 'zh' && currentWord?.translation?.en && (
                  <p className="text-sm text-slate-500 mt-1">{currentWord.translation.en}</p>
                )}
                {language === 'en' && currentWord?.translation?.zh && (
                  <p className="text-sm text-slate-500 mt-1">{currentWord.translation.zh}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="max-w-md mx-auto flex gap-4 justify-center">
          {listenRevealed && (
            <>
              {currentIndex > 0 && (
                <Button
                  onClick={() => { setCurrentIndex(prev => prev - 1); setListenRevealed(false); }}
                  variant="outline"
                  className="border-teal-200 text-teal-600"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('上一个', 'Previous')}
                </Button>
              )}
              
              {currentIndex >= currentWords.length - 1 ? (
                <Button
                  onClick={() => {
                    markWordLearned(currentWord?.id || '');
                    addXP('listening');
                    router.push('/learn');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 flex-1"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t('完成学习', 'Finish Learning')}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    markWordLearned(currentWord?.id || '');
                    addXP('listening');
                    setCurrentIndex(prev => prev + 1);
                    setListenRevealed(false);
                  }}
                  className="bg-teal-500 hover:bg-teal-600 flex-1"
                >
                  {t('下一个', 'Next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </>
          )}
          
          {!listenRevealed && (
            <p className="text-teal-500 text-sm text-center">
              💡 {t('先听发音，再点击卡片查看意思', 'Listen first, then tap the card to see meaning')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ========== 挑战模式 ==========
  if (studyMode === 'challenge') {
    if (challengeCompleted || currentIndex >= currentWords.length) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('挑战完成！', 'Challenge Complete!')}
                </h2>
                <p className="text-4xl font-bold text-amber-600 mb-2">
                  {challengeScore} / {challengeTotal}
                </p>
                <p className="text-slate-600 mb-6">
                  {t('正确率', 'Accuracy')}: {challengeTotal > 0 ? Math.round((challengeScore / challengeTotal) * 100) : 0}%
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={restart}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('再挑战一次', 'Challenge Again')}
                  </Button>
                  <Link href="/learn">
                    <Button variant="outline" className="border-amber-200 text-amber-600">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('返回', 'Back')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // 获取当前题目
    const currentTask = challengeTasks[currentIndex];
    
    // 如果题目未准备好，显示加载状态
    if (!currentTask) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/learn">
                <Button variant="ghost" size="icon" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-6 h-6 text-amber-500" />
                  {t('挑战模式', 'Challenge Mode')}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-6 h-6 text-amber-500" />
                {t('挑战模式', 'Challenge Mode')}
              </h1>
              <p className="text-sm text-amber-600">
                {language === 'zh' ? currentTheme?.name.zh : currentTheme?.name.en}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-amber-600 font-medium">
              {t('得分', 'Score')}: {challengeScore}/{challengeTotal}
            </span>
            <Button variant="outline" onClick={restart} className="border-amber-200 text-amber-600 hover:bg-amber-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('重新开始', 'Restart')}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-amber-100 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / challengeTasks.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <Card className="max-w-md mx-auto mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6 text-center">
            <p className="text-amber-600 mb-4">{t('翻译是', 'Translation')}</p>
            <p className="text-3xl font-bold text-slate-800">
              {currentTask.promptText}
            </p>
          </CardContent>
        </Card>

        {/* Options - 使用稳定的题目选项 */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
          {currentTask.options.map((optionWord, index) => {
            const isSelected = selectedChallengeAnswer === optionWord.id;
            const isCorrect = optionWord.id === currentTask.correctWordId;
            const showColor = showChallengeResult && (isSelected || isCorrect);
            
            let bgColor = 'bg-white hover:bg-amber-50 border-amber-200';
            if (showColor) {
              if (isCorrect) {
                bgColor = 'bg-green-100 border-green-500';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-red-100 border-red-500';
              }
            }
            
            return (
              <Button
                key={`${currentTask.id}-option-${index}`}
                onClick={() => handleChallengeAnswer(optionWord.id)}
                disabled={showChallengeResult}
                className={`p-4 h-auto border-2 ${bgColor} transition-all`}
              >
                <div className="flex flex-col items-center gap-1">
                  <MongolianTextImage
                    key={`${optionWord.id}-${optionWord.mongolian}`}
                    wordId={optionWord.id}
                    src={optionWord.mongolianImageSrc}
                    alt={optionWord.mongolian}
                    fallbackText={optionWord.mongolian}
                    loading="lazy"
                    decoding="async"
                    srcKey={optionWord.id}
                    className="text-slate-700 w-6 h-auto"
                    imgClassName="w-full h-auto"
                  />
                  {optionWord.pinyin && (
                    <span className="text-xs text-amber-600">{optionWord.pinyin}</span>
                  )}
                </div>
                {showChallengeResult && isSelected && (
                  isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 ml-2 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 ml-2 text-red-500" />
                  )
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== 复习模式 ==========
  if (studyMode === 'review') {
    const reviewCompleted = currentIndex >= currentWords.length;
    
    if (reviewCompleted || currentWords.length === 0) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-to-r from-lime-50 to-green-50 border-lime-200">
              <CardContent className="p-8 text-center">
                <Zap className="w-16 h-16 mx-auto mb-4 text-lime-500" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('复习完成！', 'Review Complete!')}
                </h2>
                <p className="text-slate-600 mb-2">
                  {t('你已经复习了', 'You have reviewed')} {currentWords.length} {t('个词条', 'words')}
                </p>
                <p className="text-lime-600 text-sm mb-6">
                  {t('错题数量', 'Wrong answers')}: {getWrongWords('listening').length + getWrongWords('challenge').length}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => setCurrentIndex(0)}
                    className="bg-lime-500 hover:bg-lime-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('再复习一次', 'Review Again')}
                  </Button>
                  <Link href="/learn">
                    <Button variant="outline" className="border-lime-200 text-lime-600">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('返回', 'Back')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="icon" className="text-lime-600 hover:text-lime-700 hover:bg-lime-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-lime-500" />
                {t('复习模式', 'Review Mode')}
              </h1>
              <p className="text-sm text-lime-600">
                {language === 'zh' ? currentTheme?.name.zh : currentTheme?.name.en}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lime-600 font-medium">
              {currentIndex + 1} / {currentWords.length}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(0)}
              className="border-lime-200 text-lime-600 hover:bg-lime-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('重新开始', 'Restart')}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-lime-100 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / currentWords.length) * 100}%` }}
          />
        </div>

        {/* Word Card */}
        <div 
          className="max-w-md mx-auto cursor-pointer mb-8"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <Card className="border-lime-200 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center">
                {/* 蒙古文 - 使用预渲染 SVG path 文件 */}
                <MongolianTextImage
                  key={`flip-${currentWord?.id || 'no-word'}-${currentWord?.mongolian || ''}`}
                  wordId={currentWord?.id}
                  src={currentWord?.mongolianImageSrc}
                  alt={currentWord?.mongolian || ''}
                  fallbackText={currentWord?.mongolian || ''}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  srcKey={currentWord?.id}
                  className="mb-4 w-8 h-auto mx-auto"
                  imgClassName="w-full h-auto"
                />
                
                {/* 拼音 */}
                {currentWord?.pinyin && (
                  <div className="text-lg text-lime-600 mb-4 font-mono">
                    [{currentWord.pinyin}]
                  </div>
                )}
                
                {/* 翻译 */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700 mb-1">
                    {currentWord?.translation[language]}
                  </div>
                  <div className="text-lg text-slate-500">
                    {currentWord?.translation[language === 'zh' ? 'en' : 'zh']}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={prevWord}
            disabled={currentIndex === 0}
            className="border-lime-200 text-lime-600 hover:bg-lime-50"
          >
            {t('上一个', 'Previous')}
          </Button>
          
          {currentWord && hasWordAudio(currentWord.id) && (
            <Button
              variant="outline"
              onClick={toggleAudio}
              className="border-lime-200 text-lime-600 hover:bg-lime-50"
            >
              {isPlaying ? (
                <VolumeX className="w-5 h-5 mr-2" />
              ) : (
                <Volume2 className="w-5 h-5 mr-2" />
              )}
              {isPlaying ? t('停止', 'Stop') : t('播放', 'Play')}
            </Button>
          )}
          
          <Button
            size="lg"
            onClick={() => {
              addXP('review');
              setCurrentIndex(prev => prev + 1);
              setIsFlipped(false);
            }}
            className="bg-lime-500 hover:bg-lime-600"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {t('记住了', 'Got it!')}
          </Button>
          
          <Button
            variant="outline"
            onClick={nextWord}
            disabled={currentIndex >= currentWords.length - 1}
            className="border-lime-200 text-lime-600 hover:bg-lime-50"
          >
            {t('下一个', 'Next')}
          </Button>
        </div>
      </div>
    );
  }

  // ========== 学习模式 (默认) ==========
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/learn">
            <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {language === 'zh' ? currentTheme?.name.zh : currentTheme?.name.en}
            </h1>
            <p className="text-sm text-emerald-600">
              {currentIndex + 1} / {currentWords.length}
            </p>
          </div>
        </div>
        
        <Button variant="outline" onClick={restart} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('重新开始', 'Restart')}
        </Button>
      </div>

      {/* Progress Bar - 草原道路（远山+羊群+萨满火焰标记） */}
      <div className="relative h-3 bg-gradient-to-r from-sky-100 via-emerald-50 to-amber-50 rounded-full mb-8 overflow-hidden border border-emerald-200">
        <SteppeHorizon className="opacity-60" />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/80 via-green-500/80 to-amber-500/80 transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / currentWords.length) * 100}%` }}
        />
        {/* 羊群在 0% 位置 */}
        <div className="absolute inset-y-0 left-1 flex items-center text-[10px] select-none" style={{ transform: 'translateX(-4px)' }}>🐑</div>
        {/* 萨满火焰在 100% 位置 */}
        <div className="absolute inset-y-0 right-1 flex items-center text-amber-600" style={{ transform: 'translateX(4px)' }}>
          <SoyomboFlame className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Word Card - 羊皮卷 */}
      <div
        className="max-w-md mx-auto cursor-pointer mb-8"
        onClick={flipCard}
      >
        <div className="relative">
          {/* 卷轴左端 */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-32 bg-gradient-to-b from-amber-700 via-orange-700 to-amber-800 rounded-l-md shadow-md z-10" />
          {/* 卷轴右端 */}
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-32 bg-gradient-to-b from-amber-700 via-orange-700 to-amber-800 rounded-r-md shadow-md z-10" />
          <Card className="relative bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 border-amber-300 shadow-lg overflow-hidden">
            {/* 蒙古文水印 */}
            <div className="absolute right-2 top-2 bottom-2 flex flex-col-reverse text-amber-700/10 font-mongolian select-none pointer-events-none" style={{ writingMode: 'vertical-rl', fontSize: '14px', lineHeight: 1.1 }}>
              ᠰᠤᠷᠤᠯᠴᠠᠬᠤ
            </div>
            {/* 哈达飘带顶 */}
            <div className="absolute top-0 left-6 right-6 flex h-1 opacity-60">
              <div className="flex-1 bg-sky-300" />
              <div className="flex-1 bg-yellow-300" />
              <div className="flex-1 bg-emerald-400" />
            </div>
            <CardContent className="p-8">
              <div className="flex flex-col items-center">
                {/* 蒙古文 - 使用预渲染 SVG path 文件 */}
                <MongolianTextImage
                  key={`wordcard-${currentWord?.id || 'no-word'}-${currentWord?.mongolian || ''}`}
                  wordId={currentWord?.id}
                  src={currentWord?.mongolianImageSrc}
                  alt={currentWord?.mongolian || ''}
                  fallbackText={currentWord?.mongolian || ''}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  srcKey={currentWord?.id}
                  className="mb-4 w-8 h-auto mx-auto"
                  imgClassName="w-full h-auto"
                />

                {/* 拼音 */}
                {currentWord?.pinyin && (
                  <div className="text-lg text-emerald-700 mb-4 font-mono">
                    [{currentWord.pinyin}]
                  </div>
                )}

                <p className="text-amber-700/70 text-sm">
                  {t('点击羊皮卷查看翻译', 'Tap the scroll to translate')}
                </p>

                {/* 翻译 (翻转后显示) */}
                {isFlipped && (
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-emerald-800 mb-2">
                      {currentWord?.translation[language]}
                    </div>
                    <div className="text-lg text-slate-500">
                      {currentWord?.translation[language === 'zh' ? 'en' : 'zh']}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example */}
      {currentWord?.example && isFlipped && (
        <Card className="max-w-md mx-auto mb-8 bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600 mb-2">{t('例句', 'Example')}</p>
            <MongolianTextImage
              key={`example-${currentWord.id}-${currentWord.example.mongolian}`}
              wordId={`example-${currentWord.id}`}
              src={`/mongolian-rendered/words/example-${currentWord.id}.svg`}
              alt={currentWord.example.mongolian}
              fallbackText={currentWord.example.mongolian}
              loading="lazy"
              decoding="async"
              srcKey={`example-${currentWord.id}`}
              className="mb-1 text-slate-700 w-6 h-auto"
              imgClassName="w-full h-auto"
            />
            <p className="text-sm text-emerald-600">
              {currentWord.example.translation[language]}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Button
          variant="outline"
          size="lg"
          onClick={prevWord}
          disabled={currentIndex === 0}
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
        >
          {t('上一个', 'Previous')}
        </Button>

        {/* 音频播放按钮 */}
        {currentWord && hasWordAudio(currentWord.id) ? (
          <Button
            variant="outline"
            size="lg"
            onClick={toggleAudio}
            className="border-teal-200 text-teal-600 hover:bg-teal-50"
          >
            {isPlaying ? (
              <VolumeX className="w-5 h-5 mr-2" />
            ) : (
              <Volume2 className="w-5 h-5 mr-2" />
            )}
            {isPlaying ? t('停止', 'Stop') : t('播放', 'Play')}
          </Button>
        ) : (
          <span className="px-4 py-2 text-slate-400 text-sm flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            {t('暂无音频', 'No audio')}
          </span>
        )}
        
        <Button
          size="lg"
          onClick={markAsLearned}
          className={learnedWords.includes(currentWord?.id || '') ? 'bg-green-500 hover:bg-green-600' : 'bg-emerald-500 hover:bg-emerald-600'}
        >
          {learnedWords.includes(currentWord?.id || '') ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t('已学习', 'Learned')}
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5 mr-2" />
              {t('学会了', 'Got it')}
            </>
          )}
        </Button>
        
        {/* 最后一个词显示完成学习按钮，否则显示下一个 */}
        {currentIndex >= currentWords.length - 1 ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/learn')}
            className="border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {t('完成学习', 'Finish Learning')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={nextWord}
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            {t('下一个', 'Next')}
          </Button>
        )}
      </div>

      {/* Completion Message */}
      {currentIndex === currentWords.length - 1 && learnedWords.length === currentWords.length && (
        <Card className="max-w-md mx-auto mt-8 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-6 text-center">
            <div className="text-5xl mb-4">
              <Trophy className="w-16 h-16 mx-auto text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {t('太棒了！', 'Excellent!')}
            </h3>
            <p className="text-emerald-600 mb-4">
              {t('你已经完成了这个主题的学习！', 'You have completed this theme!')}
            </p>
            <Button onClick={() => addXP('complete_daily_goal')} className="bg-emerald-500 hover:bg-emerald-600">
              {t('获得奖励', 'Claim Reward')} +20 XP
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
