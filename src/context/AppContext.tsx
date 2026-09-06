'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { XPState, XPConfig, XP_RULES as FALLBACK_XP_RULES, Word, WisdomQuote, Language, TaskType, getLevelTitle, LevelTitle, OralArchive, CultureArticle, calculateLevelFromXp, calculateLevelProgressFromXp } from '@/types';
import type { XPRule, Level as DBLevel } from '@/types/auth';
import { corpusWords as initialCorpusWords, wisdomQuotes as initialWisdomQuotes } from '@/data/corpus';
import { getThemeProgress } from '@/lib/learning-progress';
import { getAuthToken, subscribeAuth } from '@/hooks/useAuth';
import { pushXPToast, type XPAction } from '@/lib/xp-toast-bus';

// 数据库驱动的等级和 XP 规则（启动时从 /api/admin/* 加载，state 化在 AppProvider 内部）

// 映射：前端 action key → 数据库 xp_rules.id
const ACTION_TO_RULE_ID: Record<string, string> = {
  learn_word: 'learn_word',
  listening: 'listen_audio',
  review: 'review_word',
  practice: 'practice_challenge',
  challenge: 'word_challenge',
  complete_daily_goal: 'daily_goal',
  upload_word: 'upload_word',
  upload_audio: 'upload_audio',
  upload_wisdom: 'upload_wisdom',
};

// 以 dbLevels 为首选，dbLevels 为空时回退到 LEVEL_TITLES
const calculateLevel = (totalXP: number, dbLevels: DBLevel[]): number => {
  return calculateLevelFromXp(totalXP, dbLevels);
};

/** 默认空 XP 状态（用于登出/换号时重置） */
const DEFAULT_XP_STATE: XPState = {
  totalXP: 0,
  level: 1,
  title: null,
  streak: 0,
  dailyXP: 0,
  lastStudyDate: '',
};

/**
 * 从 /api/xp/me 拉取当前登录用户的 XP 数据，并写入到对应 userId 的 localStorage。
 * setState 由调用方注入（React state setter 引用稳定，可在外部闭包内调用）。
 */
async function loadUserXPFromServer(
  userId: string,
  setState: (state: XPState) => void,
): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch('/api/xp/me', {
      headers: { 'x-session': token },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const json = await res.json();
    if (!json?.success || !json.data) return;
    const d = json.data;
    const next: XPState = {
      totalXP: d.totalXp ?? 0,
      level: d.level ?? 1,
      title: d.title ?? null,
      streak: d.streakDays ?? 0,
      dailyXP: d.dailyXpToday ?? 0,
      lastStudyDate: d.lastStudyDate ?? '',
    };
    // 写入 localStorage（按 userId 隔离）
    try {
      localStorage.setItem(getXPStorageKey(userId), JSON.stringify(next));
    } catch {}
    setState(next);
  } catch (e) {
    console.warn('[AppContext] Failed to load user XP from server:', e);
  }
}

const calculateProgress = (totalXP: number, dbLevels: DBLevel[]): { current: number; needed: number; progress: number } => {
  const { current, needed, progress } = calculateLevelProgressFromXp(totalXP, dbLevels);
  return { current, needed, progress };
};

// 从数据库 xp_rules 获取 XP 值
const getXPValue = (action: string, dbXPRules: XPRule[]): number => {
  const ruleId = ACTION_TO_RULE_ID[action];
  if (!ruleId) return FALLBACK_XP_RULES[action as keyof XPConfig] ?? 10;
  const rule = dbXPRules.find(r => r.id === ruleId);
  return rule ? rule.value : (FALLBACK_XP_RULES[action as keyof XPConfig] ?? 10);
};

// 检查是否是连续学习
const checkStreak = (lastDate: string, today: string): number => {
  const last = new Date(lastDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return -1;
  if (diffDays === 1) return -2;
  return 0;
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (zh: string, en: string) => string;
  
  xpState: XPState;
  addXP: (action: keyof XPConfig) => void;
  getLevelProgress: () => { current: number; needed: number; progress: number };
  getThemeLearnedCount: (themeSlug: string) => { learned: number; total: number };
  
  words: Word[];
  addWord: (word: Omit<Word, 'id' | 'createdAt'>) => Promise<boolean>;
  updateWord: (id: string, updates: Partial<Word>) => Promise<boolean>;
  deleteWord: (id: string) => Promise<boolean>;
  // 音频相关 - 服务端持久化
  uploadAudioToServer: (wordId: string, file: File, audioName?: string) => Promise<{ audioItem: import('@/types').AudioItem | null; error?: string }>;
  deleteAudioFromServer: (audioId: string) => Promise<boolean>;
  getWordAudios: (wordId: string) => import('@/types').AudioItem[];
  loadWordAudios: (wordId: string) => Promise<void>;
  voteAudio: (audioId: string, voteType: 'up' | 'down' | null) => Promise<{ ok: boolean; error?: string }>;
  setAudioLabel: (audioId: string, label: 'official' | 'community') => Promise<{ ok: boolean; error?: string }>;
  hasWordAudio: (wordId: string) => boolean;
  getFirstAudioUrl: (wordId: string) => string | null;
  getWordsByTheme: (themeId: string) => Word[];
  getWordsWithAudio: () => Word[];
  searchWords: (query: string) => Word[];
  isLoading: boolean;
  refreshData: () => Promise<void>; // 强制刷新数据（清除缓存）
  
  wisdomQuotes: WisdomQuote[];
  addWisdomQuote: (quote: Omit<WisdomQuote, 'id' | 'createdAt'>) => Promise<boolean>;
  updateWisdomQuote: (id: string, updates: Partial<WisdomQuote>) => Promise<boolean>;
  deleteWisdomQuote: (id: string) => Promise<boolean>;
  getRandomWisdomQuote: () => WisdomQuote | null;
  
  // 声音档案和文化文章
  oralArchives: OralArchive[];
  cultureArticles: CultureArticle[];
  refreshOralArchives: () => Promise<void>;
  refreshCultureArticles: () => Promise<void>;
  
  showLevelUp: boolean;
  newLevel: number;
  hideLevelUp: () => void;
  
  getLevelTitleInfo: (level: number) => LevelTitle;
  
  // 错题系统
  wrongAnswers: Record<string, import('@/types').WrongAnswer>;
  recordWrongAnswer: (wordId: string, mode: 'listening' | 'challenge') => void;
  removeWrongAnswer: (wordId: string) => void;
  getWrongAnswerWords: (mode?: 'listening' | 'challenge') => Word[];
  clearWrongAnswers: () => void;
  
  // 主题管理
  themes: import('@/types').Theme[];
  refreshThemes: () => Promise<void>;

  // XP 规则和等级系统（管理员可编辑）
  refreshXPRules: () => Promise<void>;

  // 蒙古文 SVG 缓存失效跟踪
  // 当生产环境编辑词条/智慧语录/鸣谢后，磁盘上的预渲染 SVG 无法被覆盖（EROFS），
  // 服务端会在响应里返回 mongolianCacheStale=true，AppContext 把该 id 加入对应集合。
  // <MongolianTextImage> 通过 isMongolianStale(type, id) 检测，命中后改用 /api/mongolian-svg 端点。
  isMongolianStale: (type: 'words' | 'wisdom' | 'acknowledgements', id: string) => boolean;
  markMongolianStale: (type: 'words' | 'wisdom' | 'acknowledgements', idOrIds: string | string[]) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Constants
const XP_PER_LEVEL = 100;
const STORAGE_KEY_PREFIX = 'mongolian-learning-xp';
const STORAGE_KEY_GUEST = `${STORAGE_KEY_PREFIX}-guest`;
const WRONG_ANSWERS_KEY = 'mongolian-learning-wrong-answers';

/** 根据 userId 派生 localStorage key，保证不同账号 XP 物理隔离 */
function getXPStorageKey(userId: string | null | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_GUEST;
}

// 数据缓存配置
// v3: 新增 oralArchives / cultureArticles 字段。
//     旧版缓存只有 words / wisdomQuotes / audioRecords / themes，
//     5 分钟内刷新页面时 cache-hit 会跳过 API 调用，
//     导致 oralArchives 和 cultureArticles 永远停留在初始空 state。
//     升级到 v3 即可让所有用户首次访问 v3 后使用新格式；不存在的旧字段用空数组兜底。
const DATA_CACHE_KEY = 'mongolian-learning-data-cache-v4';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

interface DataCache {
  words: Word[];
  wisdomQuotes: WisdomQuote[];
  audioRecords: Record<string, import('@/types').AudioItem[]>;
  themes?: import('@/types').Theme[];
  // v3: 新增 — 声音档案与文化文章必须与 words 一样在缓存命中时也能恢复
  oralArchives?: OralArchive[];
  cultureArticles?: CultureArticle[];
  timestamp: number;
}

// 检查缓存是否有效
function isCacheValid(cache: DataCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');
  
  const [xpState, setXPState] = useState<XPState>(DEFAULT_XP_STATE);
  
  // 错题记录
  const [wrongAnswers, setWrongAnswers] = useState<Record<string, import('@/types').WrongAnswer>>({});
  
  // 词库数据 - 全部从数据库加载
  const [words, setWords] = useState<Word[]>([]);
  
  // 智慧语录 - 全部从数据库加载
  const [wisdomQuotes, setWisdomQuotes] = useState<WisdomQuote[]>([]);
  
  // 声音档案 - 从服务端数据库加载
  const [oralArchives, setOralArchives] = useState<OralArchive[]>([]);
  
  // 文化文章 - 从服务端数据库加载
  const [cultureArticles, setCultureArticles] = useState<CultureArticle[]>([]);

  // 蒙古文 SVG 缓存 stale 集合
  // 当生产环境 EROFS 导致磁盘上的预渲染 SVG 与最新文本不一致时，
  // 把对应记录 id 放进来，让 <MongolianTextImage> 自动跳过静态文件、
  // 走 /api/mongolian-svg 动态生成端点。
  // 持久化到 sessionStorage：仅当前会话有效，避免污染长期缓存。
  const [staleMongolianIds, setStaleMongolianIds] = useState<{
    words: Set<string>;
    wisdom: Set<string>;
    acknowledgements: Set<string>;
  }>({ words: new Set(), wisdom: new Set(), acknowledgements: new Set() });

  const STALE_STORAGE_KEY = 'mongolian-stale-ids-v1';

  // sessionStorage 加载（仅客户端、仅挂载后调用，避免 SSR mismatch）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(STALE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<'words' | 'wisdom' | 'acknowledgements', string[]>>;
      setStaleMongolianIds({
        words: new Set(parsed.words ?? []),
        wisdom: new Set(parsed.wisdom ?? []),
        acknowledgements: new Set(parsed.acknowledgements ?? []),
      });
    } catch {
      /* ignore parse error */
    }
  }, []);

  // 写入 sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dump = {
        words: Array.from(staleMongolianIds.words),
        wisdom: Array.from(staleMongolianIds.wisdom),
        acknowledgements: Array.from(staleMongolianIds.acknowledgements),
      };
      if (dump.words.length === 0 && dump.wisdom.length === 0 && dump.acknowledgements.length === 0) {
        window.sessionStorage.removeItem(STALE_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(STALE_STORAGE_KEY, JSON.stringify(dump));
      }
    } catch {
      /* sessionStorage quota or unavailable, ignore */
    }
  }, [staleMongolianIds]);

  const markMongolianStale = useCallback(
    (
      type: 'words' | 'wisdom' | 'acknowledgements',
      idOrIds: string | string[]
    ) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      if (ids.length === 0) return;
      setStaleMongolianIds((prev) => {
        const next = new Set(prev[type]);
        let changed = false;
        for (const id of ids) {
          if (id && !next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        if (!changed) return prev;
        return { ...prev, [type]: next };
      });
    },
    []
  );

  const isMongolianStale = useCallback(
    (type: 'words' | 'wisdom' | 'acknowledgements', id: string): boolean => {
      return staleMongolianIds[type].has(id);
    },
    [staleMongolianIds]
  );

  // 等级和 XP 规则 - 从数据库加载（管理员后台可编辑）
  const [dbLevels, setDbLevels] = useState<DBLevel[]>([]);
  const [dbXPRules, setDbXPRules] = useState<XPRule[]>([]);
  
  // 音频记录 - 从服务端数据库加载
  const [audioRecords, setAudioRecords] = useState<Record<string, import('@/types').AudioItem[]>>({});
  
  // 主题列表 - 从数据库加载
  const [themes, setThemes] = useState<import('@/types').Theme[]>([]);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 当前登录用户 id（订阅 useAuth 后实时同步）
  const currentUserIdRef = useRef<string | null>(null);
  // 上次处理的 userId（用于判断"换号"）
  const lastHandledUserIdRef = useRef<string | null>(null);

  // 是否完成首次数据加载（避免初次空 state 写入缓存，导致空数据被缓存）
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // 标记组件已挂载 - 防止 hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ==== 订阅 useAuth 状态变化：登录/换号拉服务端 XP，登出清空 ====
  // 解决"切换账号 XP 残留"的关键钩子。
  useEffect(() => {
    const unsubscribe = subscribeAuth((authState) => {
      // 跳过 useAuth 还在异步加载 session 的中间态
      if (authState.loading) return;

      const userId = authState.user?.id ?? null;
      const prevUserId = lastHandledUserIdRef.current;
      // 同一个用户不重复处理
      if (userId === prevUserId) return;
      lastHandledUserIdRef.current = userId;
      currentUserIdRef.current = userId;

      if (userId && authState.isLoggedIn) {
        // 登录 / 换号：先尝试从该 userId 的 localStorage 缓存恢复
        // （避免显示 0 XP 的空窗），再异步从服务端拉最新数据覆盖
        try {
          const cached = localStorage.getItem(getXPStorageKey(userId));
          if (cached) {
            const parsed = JSON.parse(cached);
            setXPState({ ...DEFAULT_XP_STATE, ...parsed });
          } else {
            // 该账号从未在本机学习过，重置为 0
            setXPState(DEFAULT_XP_STATE);
          }
        } catch {
          setXPState(DEFAULT_XP_STATE);
        }
        void loadUserXPFromServer(userId, setXPState);
      } else {
        // 登出：清空当前显示
        setXPState(DEFAULT_XP_STATE);
      }
    });
    return unsubscribe;
  }, []);

  // ==== 自动 debounce refreshData ====
  // 多个 mutation 连续触发时，只在最后一次后 500ms 触发一次 refreshData，
  // 避免风暴式 refetch。
  const refreshDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==== XP 状态同步 ref ====
  // addXP 内部需要同步读取"调用前"的 totalXP / level，用 ref 抓 latest state
  const xpStateRef = useRef<XPState>(xpState);
  useEffect(() => {
    xpStateRef.current = xpState;
  }, [xpState]);

  // ==== 自动持久化缓存 ====
  // 任何 words/wisdomQuotes/audioRecords/themes 变化后，自动写入 sessionStorage。
  // 这样:
  // 1. addWord / updateWord / deleteWord / addWisdomQuote / ... 之后缓存自动更新
  // 2. 用户刷新页面后，缓存里是最新数据，不会出现"刷新后看到旧蒙古文"
  // 3. 用户编辑词条时 MongolianTextImage 的 alt 一变，React state 一变，缓存就变
  // 4. 配合 MongolianTextImage 的 ?v=hash 缓存绕过策略，完全避免任何"修改后看不到新内容"
  useEffect(() => {
    if (!hasInitialLoaded) return;  // 首次加载未完成时不要写空缓存
    try {
      const cache: DataCache = {
        words,
        wisdomQuotes,
        audioRecords,
        themes,
        // v3: 持久化声音档案和文化文章，
        // 保证页面刷新后 WisdomPage 仍能立即显示（不再因为缓存命中而变成空）
        oralArchives,
        cultureArticles,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      // Safari 无痕模式或 quota 满都可能写不进去，不影响主流程
      console.warn('[AppContext] Failed to persist cache:', e);
    }
  }, [hasInitialLoaded, words, wisdomQuotes, audioRecords, themes, oralArchives, cultureArticles]);

  // 初始化
  useEffect(() => {
    // Safari 无痕/隐私模式下 localStorage 会抛 SecurityError，必须 try/catch
    let savedLang: string | null = null;
    try {
      savedLang = localStorage.getItem('mongolian-learning-lang');
    } catch (e) {
      console.warn('[AppContext] localStorage not available (Safari private mode):', e);
    }
    if (savedLang === 'zh' || savedLang === 'en') {
      setLanguageState(savedLang);
    }
    
    // 启动时读取 XP：
    // - 未登录（sessionStorage 无 token）→ 读 guest 缓存
    // - 已登录 → 不读，由 useAuth listener 异步拉取并按 userId 恢复
    const hasToken = (() => {
      try { return !!sessionStorage.getItem('mongolian-learning-auth-token'); } catch { return false; }
    })();
    if (!hasToken) {
      let savedXP: string | null = null;
      try {
        savedXP = localStorage.getItem(STORAGE_KEY_GUEST);
      } catch (e) {
        console.warn('[AppContext] localStorage not available (Safari private mode):', e);
      }
      if (savedXP) {
        try {
          const parsed = JSON.parse(savedXP);
          setXPState({ ...DEFAULT_XP_STATE, ...parsed });
        } catch (e) {
          console.error('Failed to parse XP state');
        }
      }
    }
    
    // 加载错题记录
    let savedWrongAnswers: string | null = null;
    try {
      savedWrongAnswers = localStorage.getItem(WRONG_ANSWERS_KEY);
    } catch (e) {
      console.warn('[AppContext] localStorage not available (Safari private mode):', e);
    }
    if (savedWrongAnswers) {
      try {
        const parsed = JSON.parse(savedWrongAnswers);
        setWrongAnswers(parsed);
      } catch (e) {
        console.error('Failed to parse wrong answers');
      }
    }
  }, []);
  
  // 从数据库加载所有数据（词条、智慧语录、音频）- 带缓存
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // 尝试从 sessionStorage 读取缓存
      try {
        const cachedData = sessionStorage.getItem(DATA_CACHE_KEY);
        if (cachedData) {
          const cache: DataCache = JSON.parse(cachedData);
          if (isCacheValid(cache)) {
            console.log('[AppContext] Using cached data, age:', Math.round((Date.now() - cache.timestamp) / 1000), 's');
            setWords(cache.words);
            setWisdomQuotes(cache.wisdomQuotes);
            setAudioRecords(cache.audioRecords);
            if (cache.themes && cache.themes.length > 0) {
              setThemes(cache.themes);
            }
            // v3: 缓存命中也要恢复 oralArchives / cultureArticles。
            // 旧版本缓存（v2 之前）没有这俩字段，要安全兜底为 []。
            // 用数组 isArray 判断避免 setState 收到非数组值导致下游 map 崩溃。
            setOralArchives(Array.isArray(cache.oralArchives) ? cache.oralArchives : []);
            setCultureArticles(Array.isArray(cache.cultureArticles) ? cache.cultureArticles : []);
            setIsLoading(false);
            setHasInitialLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.warn('[AppContext] Failed to read cache:', e);
      }
      
      // 缓存无效或不存在，从 API 加载
      console.log('[AppContext] Fetching data from API...');
      try {
        const [corpusRes, wisdomRes, audioRes, categoriesRes, oralArchivesRes, cultureArticlesRes, xpRulesRes, levelsRes] = await Promise.all([
          fetch('/api/corpus'),
          fetch('/api/wisdom'),
          fetch('/api/audio'),
          fetch('/api/categories'),
          fetch('/api/wisdom/oral-archives'),
          fetch('/api/wisdom/culture-articles'),
          fetch('/api/admin/xp-rules'),
          fetch('/api/admin/levels')
        ]);
        
        const corpusData = await corpusRes.json();
        const wisdomData = await wisdomRes.json();
        const audioData = await audioRes.json();
        const categoriesData = await categoriesRes.json();
        const oralArchivesData = await oralArchivesRes.json();
        const cultureArticlesData = await cultureArticlesRes.json();
        const xpRulesData = await xpRulesRes.json();
        const levelsData = await levelsRes.json();
        
        // 加载 XP 规则（从数据库）
        if (xpRulesData.success && Array.isArray(xpRulesData.data)) {
          setDbXPRules(xpRulesData.data);
        }

        // 加载等级系统（从数据库）
        if (levelsData.success && Array.isArray(levelsData.data)) {
          const levels = levelsData.data;
          setDbLevels(levels);
          // 重新计算当前等级（数据库规则可能不同于 fallback）
          setXPState(prev => {
            const newLevel = calculateLevel(prev.totalXP, levels);
            if (newLevel !== prev.level) {
              return { ...prev, level: newLevel };
            }
            return prev;
          });
        }
        
        // 加载词条（从数据库，包含种子数据）
        if (corpusData.success && Array.isArray(corpusData.data)) {
          setWords(corpusData.data);
        }
        
        // 加载智慧语录（从数据库，包含种子数据）
        if (wisdomData.success && Array.isArray(wisdomData.data)) {
          setWisdomQuotes(wisdomData.data);
        }
        
        // 加载声音档案
        if (oralArchivesData.success && Array.isArray(oralArchivesData.data)) {
          setOralArchives(oralArchivesData.data);
        }
        
        // 加载文化文章
        if (cultureArticlesData.success && Array.isArray(cultureArticlesData.data)) {
          setCultureArticles(cultureArticlesData.data);
        }
        
        // 加载音频记录
        const groupedRecords: Record<string, import('@/types').AudioItem[]> = {};
        if (audioData.success && Array.isArray(audioData.data)) {
          for (const record of audioData.data) {
            const wordId = record.wordId;
            if (!groupedRecords[wordId]) {
              groupedRecords[wordId] = [];
            }
            groupedRecords[wordId].push({
              id: record.id,
              url: record.audioUrl,
              name: record.audioName || record.createdByName || '未命名音频',
              createdAt: new Date(record.createdAt).getTime(),
              createdByUserId: record.createdByUserId || undefined,
            });
          }
          setAudioRecords(groupedRecords);
        }
        
        // 加载主题（从数据库）
        let loadedThemes: import('@/types').Theme[] = [];
        if (categoriesData.success && Array.isArray(categoriesData.data)) {
          loadedThemes = categoriesData.data.map((cat: any) => ({
            id: cat.slug,
            name: {
              zh: cat.nameZh,
              en: cat.nameEn,
            },
            description: {
              zh: cat.descriptionZh || '',
              en: cat.descriptionEn || '',
            },
            icon: cat.emoji || '📚',
            color: '#10b981', // 默认绿色
          }));
          setThemes(loadedThemes);
        }
        
        // 写入缓存已由下方"自动持久化缓存"useEffect 接管，无需在此手动写入
      } catch (error) {
        console.error('Failed to load data from database:', error);
      } finally {
        setIsLoading(false);
        setHasInitialLoaded(true);  // 标记首次加载完成，触发后续自动持久化
      }
    };
    
    loadData();
  }, []);

  // 保存XP状态（按 userId 隔离 localStorage key）
  useEffect(() => {
    try {
      localStorage.setItem(getXPStorageKey(currentUserIdRef.current), JSON.stringify(xpState));
    } catch (e) {
      console.warn('[AppContext] Failed to save XP state:', e);
    }
  }, [xpState]);
  
  // 保存错题记录
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(wrongAnswers));
      } catch (e) {
        console.warn('[AppContext] Failed to save wrong answers:', e);
      }
    }
  }, [wrongAnswers, isMounted]);
  
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mongolian-learning-lang', lang);
    } catch (e) {
      console.warn('[AppContext] Failed to save language:', e);
    }
  }, []);
  
  const t = useCallback((zh: string, en: string): string => {
    return language === 'zh' ? zh : en;
  }, [language]);
  
  const addXP = useCallback((action: keyof XPConfig) => {
    const xpGain = getXPValue(action, dbXPRules);

    // 在 setXPState 之外预计算 leveledUp，用于 toast
    const prevTotal = xpStateRef.current.totalXP;
    const newTotal = prevTotal + xpGain;
    const oldLevel = xpStateRef.current.level;
    const newLevel = calculateLevel(newTotal, dbLevels);
    const leveledUp = newLevel > oldLevel;

    setXPState((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const newTotalXP = prev.totalXP + xpGain;
      const newLevel = calculateLevel(newTotalXP, dbLevels);
      const oldLevel = prev.level;

      let newStreak = prev.streak;
      if (prev.lastStudyDate !== today) {
        const streakResult = checkStreak(prev.lastStudyDate, today);
        if (streakResult === -2) {
          newStreak = prev.streak + 1;
        } else if (streakResult === 0) {
          newStreak = 1;
        }
      }

      if (newLevel > oldLevel) {
        setNewLevel(newLevel);
        setTimeout(() => setShowLevelUp(true), 100);
      }

      return {
        totalXP: newTotalXP,
        level: newLevel,
        title: prev.title, // 称号由下次 loadUserXPFromServer 拉服务端刷新
        streak: newStreak,
        dailyXP: prev.dailyXP + xpGain,
        lastStudyDate: today,
      };
    });

    // 推送蒙古文化 XP toast
    pushXPToast({ action, value: xpGain, leveledUp });

    // 登录用户：把 XP 同步到服务端 /api/xp/add
    const token = getAuthToken();
    const userId = currentUserIdRef.current;
    if (token && userId) {
      const apiAction = ACTION_TO_RULE_ID[action] ?? action;
      void fetch('/api/xp/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ action: apiAction, customDelta: xpGain }),
        cache: 'no-store',
      }).catch((e) => {
        console.warn('[AppContext] Failed to sync XP to server:', e);
      });
    }
  }, [dbLevels, dbXPRules]);
  
  const getLevelProgress = useCallback(() => {
    return calculateProgress(xpState.totalXP, dbLevels);
  }, [xpState.totalXP, dbLevels]);
  
  // 获取主题学习进度
  const getThemeLearnedCount = useCallback((themeSlug: string): { learned: number; total: number } => {
    const themeWords = words.filter(w => w.theme === themeSlug);
    const total = themeWords.length;
    const wordIds = themeWords.map(w => w.id);
    const progress = getThemeProgress(wordIds);
    return { learned: progress.learned, total };
  }, [words]);
  
  // 添加词条 - 写入服务端
  const addWord = useCallback(async (word: Omit<Word, 'id' | 'createdAt'>): Promise<boolean> => {
    const newWord: Word = {
      ...word,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      isUserUploaded: true,
    };
    
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-session'] = token;
      const response = await fetch('/api/corpus', {
        method: 'POST',
        headers,
        body: JSON.stringify(newWord),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 成功写入服务端后，用服务端返回的完整数据更新本地状态
        // API 可能返回数组（批量插入）或单条记录
        const serverWords = Array.isArray(result.data) ? result.data : [result.data];
        const serverWord = serverWords[0] as Word | undefined;
        if (serverWord && serverWord.id) {
          setWords(prev => [...prev, serverWord]);
        } else {
          // 回退：如果服务端没有返回完整数据，使用本地数据
          setWords(prev => [...prev, newWord]);
        }
        // 标记 stale：生产环境 SVG 写盘失败时，前端转走 API 兜底
        if (Array.isArray(result.staleWordIds) && result.staleWordIds.length > 0) {
          markMongolianStale('words', result.staleWordIds);
        } else if (serverWord?.id && result.mongolianCacheStale === true) {
          markMongolianStale('words', serverWord.id);
        }
        return true;
      } else {
        console.error('Failed to add word to server:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to add word:', error);
      return false;
    }
  }, []);
  
  // 更新词条 - 写入服务端（带回滚 + 服务端权威数据回填）
  const updateWord = useCallback(async (id: string, updates: Partial<Word>): Promise<boolean> => {
    // 1) 乐观更新，记住原值用于失败回滚
    let originalSnapshot: Word | null = null;
    setWords(prev => {
      const found = prev.find(w => w.id === id);
      if (found) originalSnapshot = found;
      return prev.map(w => w.id === id ? { ...w, ...updates } : w);
    });

    try {
      // 2) 调用 API 更新数据库
      const token = getAuthToken();
      const putHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) putHeaders['x-session'] = token;
      const response = await fetch(`/api/words/${id}`, {
        method: 'PUT',
        headers: putHeaders,
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Failed to update word:', result.error);
        // 回滚到原值
        if (originalSnapshot) {
          const snap = originalSnapshot;
          setWords(prev => prev.map(w => w.id === id ? snap : w));
        }
        return false;
      }

      // 3) 用服务端权威数据替换本地状态（防止字段规范化后不一致）
      if (result.data && typeof result.data === 'object') {
        const serverWord = result.data as Word;
        setWords(prev => prev.map(w => w.id === id ? serverWord : w));
      }

      // 4) 编辑后若服务端无法重写磁盘 SVG（生产 EROFS），把该 id 标 stale，
      //    后续 <MongolianTextImage> 会自动走 /api/mongolian-svg 动态生成。
      if (result.mongolianCacheStale === true) {
        markMongolianStale('words', id);
      }

      // 4) 不再需要在此调用 refreshData：
      //    - useEffect (line 173) 会自动 persist 新 state 到 sessionStorage
      //    - 消费者（WordDetailModal 等）会调用 router.refresh() 触发 RSC 重渲染
      //    - 直接调用 refreshData 会与 updateWord 产生循环依赖
      return true;
    } catch (error) {
      console.error('Failed to update word:', error);
      // 回滚到原值
      if (originalSnapshot) {
        const snap = originalSnapshot;
        setWords(prev => prev.map(w => w.id === id ? snap : w));
      }
      return false;
    }
  }, []);
  
  // 删除词条 - 删除服务端数据
  const deleteWord = useCallback(async (id: string): Promise<boolean> => {
    const word = words.find(w => w.id === id);
    
    if (!word) {
      return false;
    }
    
    try {
      const token = getAuthToken();
      const delHeaders: Record<string, string> = {};
      if (token) delHeaders['x-session'] = token;
      const response = await fetch(`/api/words/${id}`, {
        method: 'DELETE',
        headers: delHeaders,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWords(prev => prev.filter(w => w.id !== id));
        return true;
      } else {
        console.error('Failed to delete word:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete word:', error);
      return false;
    }
  }, [words]);
  
  // 上传音频到服务端存储
  const uploadAudioToServer = useCallback(async (
    wordId: string, 
    file: File, 
    audioName?: string
  ): Promise<{ audioItem: import('@/types').AudioItem | null; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wordId', wordId);
      // Use auth token from global state (more reliable than sessionStorage)
      const authToken = typeof window !== 'undefined' ? getAuthToken() : null;
      const userId = 'anonymous';
      const userName = 'Anonymous User';
      
      // Set x-session header so server can identify the user
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['x-session'] = authToken;
        // The server will override createdByUserId with the session user's ID
      }
      formData.append('createdByUserId', userId);
      formData.append('createdByName', userName);
      if (audioName) {
        formData.append('audioName', audioName);
      }

      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
        headers,
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 优先使用上传时指定的音频名称，否则使用上传者名称
        const audioDisplayName = result.data.audioName || audioName || result.data.createdByName || t('未命名音频', 'Unnamed Audio');
        const audioItem: import('@/types').AudioItem = {
          id: result.data.id,
          url: result.data.audioUrl,
          name: audioDisplayName,
          createdAt: new Date(result.data.createdAt).getTime(),
          createdByUserId: result.data.createdByUserId || userId,
        };
        
        // 更新本地状态
        setAudioRecords(prev => ({
          ...prev,
          [wordId]: [...(prev[wordId] || []), audioItem],
        }));
        
        return { audioItem };
      } else {
        const errMsg = result.error || result.details || (typeof result === 'object' ? JSON.stringify(result) : 'Unknown server error');
        console.error('Failed to upload audio:', errMsg);
        return { audioItem: null, error: errMsg };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to upload audio:', errMsg);
      return { audioItem: null, error: errMsg };
    }
  }, []);

  // 从服务端删除音频
  const deleteAudioFromServer = useCallback(async (audioId: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      if (token) headers['x-session'] = token;

      const response = await fetch(`/api/audio/${audioId}`, {
        method: 'DELETE',
        headers,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态 - 从所有词条的音频列表中移除
        setAudioRecords(prev => {
          const newRecords = { ...prev };
          for (const wordId of Object.keys(newRecords)) {
            newRecords[wordId] = newRecords[wordId].filter(a => a.id !== audioId);
          }
          return newRecords;
        });
        return true;
      } else {
        // 404 表示记录已不存在，也清理本地缓存
        if (response.status === 404) {
          setAudioRecords(prev => {
            const newRecords = { ...prev };
            for (const wordId of Object.keys(newRecords)) {
              newRecords[wordId] = newRecords[wordId].filter(a => a.id !== audioId);
            }
            return newRecords;
          });
        }
        console.error('Failed to delete audio:', result.error);
        return response.status === 404; // 404 视为"已删除"，返回 true
      }
    } catch (error) {
      console.error('Failed to delete audio:', error);
      return false;
    }
  }, []);

  // 获取词条的所有音频
  const getWordAudiosFromServer = useCallback(async (wordId: string): Promise<import('@/types').AudioItem[]> => {
    // 先检查本地缓存
    if (audioRecords[wordId]) {
      return audioRecords[wordId];
    }

    try {
      const response = await fetch(`/api/audio?wordId=${wordId}`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const audios: import('@/types').AudioItem[] = result.data.map((record: any) => ({
          id: record.id,
          url: record.audioUrl,
          name: record.audioName || record.createdByName || t('未命名音频', 'Unnamed Audio'),
          createdAt: new Date(record.createdAt).getTime(),
          createdByUserId: record.createdByUserId || null,
          label: record.label === 'official' ? 'official' : 'community',
          upvotes: typeof record.upvotes === 'number' ? record.upvotes : 0,
          downvotes: typeof record.downvotes === 'number' ? record.downvotes : 0,
        }));

        // 更新本地缓存
        setAudioRecords(prev => ({
          ...prev,
          [wordId]: audios,
        }));

        // 拉取当前用户对每个 audio 的投票状态
        try {
          const idsParam = audios.map(a => a.id).join(',');
          if (idsParam) {
            const votesRes = await fetch(`/api/audio/votes?audioIds=${idsParam}`);
            const votesJson = await votesRes.json();
            if (votesJson.success && votesJson.votes) {
              audios.forEach(a => {
                a.userVote = votesJson.votes[a.id] || null;
              });
              setAudioRecords(prev => ({ ...prev, [wordId]: audios }));
            }
          }
        } catch (voteErr) {
          // 投票查询失败不影响主流程
          console.warn('Failed to fetch audio votes:', voteErr);
        }

        return audios;
      }
      return [];
    } catch (error) {
      console.error('Failed to get audio records:', error);
      return [];
    }
  }, [audioRecords, t]);

  // 获取词条的所有音频（同步版本，使用缓存）
  const getWordAudios = useCallback((wordId: string): import('@/types').AudioItem[] => {
    return audioRecords[wordId] || [];
  }, [audioRecords]);

  // 加载词条音频数据
  const loadWordAudios = useCallback(async (wordId: string) => {
    // 如果已经有缓存，不重复加载
    if (audioRecords[wordId]) return;

    try {
      const response = await fetch(`/api/audio?wordId=${wordId}`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const audios: import('@/types').AudioItem[] = result.data.map((record: any) => ({
          id: record.id,
          url: record.audioUrl,
          name: record.audioName || record.createdByName || t('未命名音频', 'Unnamed Audio'),
          createdAt: new Date(record.createdAt).getTime(),
          createdByUserId: record.createdByUserId || undefined,
          label: record.label === 'official' ? 'official' : 'community',
          upvotes: typeof record.upvotes === 'number' ? record.upvotes : 0,
          downvotes: typeof record.downvotes === 'number' ? record.downvotes : 0,
        }));

        setAudioRecords(prev => ({
          ...prev,
          [wordId]: audios,
        }));

        // 拉取当前用户对每个 audio 的投票状态
        try {
          const idsParam = audios.map(a => a.id).join(',');
          if (idsParam) {
            const token = getAuthToken();
            const votesRes = await fetch(`/api/audio/votes?audioIds=${idsParam}`, {
              headers: token ? { 'x-session': token } : {},
            });
            const votesJson = await votesRes.json();
            if (votesJson.success && votesJson.votes) {
              audios.forEach(a => {
                a.userVote = votesJson.votes[a.id] || null;
              });
              setAudioRecords(prev => ({ ...prev, [wordId]: audios }));
            }
          }
        } catch (voteErr) {
          console.warn('Failed to fetch audio votes:', voteErr);
        }
      }
    } catch (error) {
      console.error('Failed to load word audios:', error);
    }
  }, [audioRecords, t]);

  // 投票：up / down / null（取消）
  const voteAudio = useCallback(async (audioId: string, voteType: 'up' | 'down' | null): Promise<{ ok: boolean; error?: string }> => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/audio/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session': token } : {}),
        },
        body: JSON.stringify({ audioId, voteType }),
      });
      const result = await response.json();
      if (!result.success) {
        return { ok: false, error: result.error || '投票失败' };
      }

      // 直接用后端返回的最新计数更新本地缓存（新对象 + 新引用触发重渲染）
      const { upvotes, downvotes } = result.data || {};
      setAudioRecords(prev => {
        const next: typeof prev = { ...prev };
        for (const wordId of Object.keys(next)) {
          next[wordId] = next[wordId].map(a =>
            a.id === audioId
              ? { ...a, upvotes, downvotes, userVote: voteType }
              : a
          );
        }
        return next;
      });

      return { ok: true };
    } catch (error: any) {
      console.error('voteAudio error:', error);
      return { ok: false, error: error?.message || '投票失败' };
    }
  }, []);

  // admin 切换音频标签：official ↔ community
  const setAudioLabel = useCallback(async (audioId: string, label: 'official' | 'community'): Promise<{ ok: boolean; error?: string }> => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/audio/${audioId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session': token } : {}),
        },
        body: JSON.stringify({ label }),
      });
      const result = await response.json();
      if (!result.success) {
        return { ok: false, error: result.error || '修改标签失败' };
      }
      // 刷新本地缓存
      setAudioRecords(prev => {
        const next: typeof prev = { ...prev };
        for (const wordId of Object.keys(next)) {
          next[wordId] = next[wordId].map(a => a.id === audioId ? { ...a, label } : a);
        }
        return next;
      });
      return { ok: true };
    } catch (error: any) {
      console.error('setAudioLabel error:', error);
      return { ok: false, error: error?.message || '修改标签失败' };
    }
  }, []);

  // 检查词条是否有音频（从服务端缓存）
  const hasWordAudio = useCallback((wordId: string): boolean => {
    const audios = audioRecords[wordId];
    return Boolean(audios && audios.length > 0);
  }, [audioRecords]);

  // 获取词条的第一个音频URL（从服务端缓存）
  const getFirstAudioUrl = useCallback((wordId: string): string | null => {
    const audios = audioRecords[wordId];
    if (audios && audios.length > 0) {
      return audios[0].url;
    }
    return null;
  }, [audioRecords]);
  
  const getWordsByTheme = useCallback((themeId: string): Word[] => {
    return words.filter((word) => word.theme === themeId);
  }, [words]);
  
  const getWordsWithAudio = useCallback((): Word[] => {
    return words.filter((word) => {
      // 检查服务端 audio_records
      if (audioRecords[word.id] && audioRecords[word.id].length > 0) return true;
      // 新格式 - 词条自身的 audios 数组
      if (word.audios && word.audios.length > 0) return true;
      // 旧格式兼容
      if (word.audio && word.audio.trim() !== '') return true;
      return false;
    });
  }, [words, audioRecords]);
  
  const searchWords = useCallback((query: string): Word[] => {
    if (!query.trim()) return words;
    const lowerQuery = query.toLowerCase();
    return words.filter((word) => {
      return (
        word.mongolian.toLowerCase().includes(lowerQuery) ||
        word.translation.zh.toLowerCase().includes(lowerQuery) ||
        word.translation.en.toLowerCase().includes(lowerQuery) ||
        word.pinyin?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [words]);
  
  // 添加智慧语录 - 写入服务端
  const addWisdomQuote = useCallback(async (quote: Omit<WisdomQuote, 'id' | 'createdAt'>): Promise<boolean> => {
    const newQuote: WisdomQuote = {
      ...quote,
      id: `user-wq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      isUserUploaded: true,
    };

    try {
      const token = getAuthToken();
      const wisdomPostHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) wisdomPostHeaders['x-session'] = token;
      const response = await fetch('/api/wisdom', {
        method: 'POST',
        headers: wisdomPostHeaders,
        body: JSON.stringify(newQuote),
      });

      const result = await response.json();

      if (result.success) {
        // 关键：用服务端返回的 result.data（已经是 WisdomQuote 嵌套格式）
        // 替换本地构造的 newQuote，避免字段不一致
        const serverQuote: WisdomQuote = (result.data && typeof result.data === 'object')
          ? (result.data as WisdomQuote)
          : newQuote;
        setWisdomQuotes(prev => {
          if (prev.some(q => q.id === serverQuote.id)) return prev;
          return [...prev, serverQuote];
        });
        // 标记 stale：生产环境 SVG 写盘失败时，前端转走 API 兜底
        if (Array.isArray(result.staleWordIds) && result.staleWordIds.length > 0) {
          markMongolianStale('wisdom', result.staleWordIds);
        } else if (serverQuote.id && result.mongolianCacheStale === true) {
          markMongolianStale('wisdom', serverQuote.id);
        }
        return true;
      } else {
        console.error('Failed to add wisdom quote:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to add wisdom quote:', error);
      return false;
    }
  }, []);
  
  // 更新智慧语录 - 写入服务端（带回滚 + 服务端权威数据回填）
  const updateWisdomQuote = useCallback(async (id: string, updates: Partial<WisdomQuote>): Promise<boolean> => {
    // 1) 乐观更新，记住原值用于失败回滚
    let originalSnapshot: WisdomQuote | null = null;
    setWisdomQuotes(prev => {
      const found = prev.find(q => q.id === id);
      if (found) originalSnapshot = found;
      return prev.map(q => q.id === id ? { ...q, ...updates } : q);
    });

    try {
      // 2) 调用 API 更新数据库
      const token = getAuthToken();
      const wisdomPutHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) wisdomPutHeaders['x-session'] = token;
      const response = await fetch(`/api/wisdom/${id}`, {
        method: 'PUT',
        headers: wisdomPutHeaders,
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Failed to update wisdom quote:', result.error);
        // 回滚
        if (originalSnapshot) {
          const snap = originalSnapshot;
          setWisdomQuotes(prev => prev.map(q => q.id === id ? snap : q));
        }
        return false;
      }

      // 3) 用服务端权威数据替换本地状态
      if (result.data && typeof result.data === 'object') {
        const serverQuote = result.data as WisdomQuote;
        setWisdomQuotes(prev => prev.map(q => q.id === id ? serverQuote : q));
      }

      // 4) 编辑后若服务端无法重写磁盘 SVG（生产 EROFS），把该 id 标 stale
      if (result.mongolianCacheStale === true) {
        markMongolianStale('wisdom', id);
      }

      return true;
    } catch (error) {
      console.error('Failed to update wisdom quote:', error);
      // 回滚
      if (originalSnapshot) {
        const snap = originalSnapshot;
        setWisdomQuotes(prev => prev.map(q => q.id === id ? snap : q));
      }
      return false;
    }
  }, []);
  
  // 删除智慧语录 - 写入服务端
  const deleteWisdomQuote = useCallback(async (id: string): Promise<boolean> => {
    const quote = wisdomQuotes.find(q => q.id === id);
    
    if (!quote) {
      return false;
    }
    
    try {
      const token = getAuthToken();
      const wisdomDelHeaders: Record<string, string> = {};
      if (token) wisdomDelHeaders['x-session'] = token;
      const response = await fetch(`/api/wisdom/${id}`, {
        method: 'DELETE',
        headers: wisdomDelHeaders,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWisdomQuotes(prev => prev.filter(q => q.id !== id));
        return true;
      } else {
        console.error('Failed to delete wisdom quote:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete wisdom quote:', error);
      return false;
    }
  }, [wisdomQuotes]);
  
  const getRandomWisdomQuote = useCallback((): WisdomQuote | null => {
    // 服务端或未挂载时返回第一个（保证 hydration 一致）
    if (!isMounted || wisdomQuotes.length === 0) {
      return wisdomQuotes[0] || null;
    }
    const index = Math.floor(Math.random() * wisdomQuotes.length);
    return wisdomQuotes[index];
  }, [isMounted, wisdomQuotes]);
  
  const hideLevelUp = useCallback(() => {
    setShowLevelUp(false);
  }, []);
  
  const getLevelTitleInfo = useCallback((level: number): LevelTitle => {
    // 优先从 dbLevels（管理员后台可编辑）查等级信息，dbLevels 为空时回退 LEVEL_TITLES
    return getLevelTitle(level, dbLevels);
  }, [dbLevels]);
  
  // 错题追踪功能
  const recordWrongAnswer = useCallback((wordId: string, mode: 'listening' | 'challenge') => {
    setWrongAnswers(prev => {
      const key = `${mode}-${wordId}`;
      const existing = prev[key];
      
      if (existing) {
        return {
          ...prev,
          [key]: {
            ...existing,
            incorrectCount: existing.incorrectCount + 1,
            lastWrongAt: Date.now(),
          },
        };
      } else {
        return {
          ...prev,
          [key]: {
            wordId,
            mode,
            incorrectCount: 1,
            lastWrongAt: Date.now(),
          },
        };
      }
    });
  }, []);
  
  const removeWrongAnswer = useCallback((wordId: string, mode?: 'listening' | 'challenge') => {
    if (mode) {
      setWrongAnswers(prev => {
        const key = `${mode}-${wordId}`;
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      // 移除所有模式的错题
      setWrongAnswers(prev => {
        const { ...rest } = prev;
        Object.keys(rest).forEach(key => {
          if (key.endsWith(`-${wordId}`)) {
            delete rest[key];
          }
        });
        return rest;
      });
    }
  }, []);
  
  // Stable refs for getWrongAnswerWords to prevent infinite re-render loops
  const wrongAnswersRef = useRef(wrongAnswers);
  const wordsRef = useRef(words);

  useEffect(() => {
    wrongAnswersRef.current = wrongAnswers;
    wordsRef.current = words;
  }, [wrongAnswers, words]);

  const getWrongAnswerWords = useCallback((mode?: 'listening' | 'challenge'): Word[] => {
    const currentWrongAnswers = wrongAnswersRef.current;
    const currentWords = wordsRef.current;
    const wrongWordIds = Object.values(currentWrongAnswers)
      .filter(wa => !mode || wa.mode === mode)
      .map(wa => wa.wordId);
    
    // 去重并获取词条
    const uniqueIds = [...new Set(wrongWordIds)];
    return uniqueIds.map(id => currentWords.find(w => w.id === id)).filter(Boolean) as Word[];
  }, []);
  
  const clearWrongAnswers = useCallback((mode?: 'listening' | 'challenge') => {
    if (mode) {
      setWrongAnswers(prev => {
        const newState: Record<string, import('@/types').WrongAnswer> = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (value.mode !== mode) {
            newState[key] = value;
          }
        });
        return newState;
      });
    } else {
      setWrongAnswers({});
    }
  }, []);
  
  // 强制刷新数据（清除缓存并重新加载）
  const refreshData = useCallback(async () => {
    // 清除缓存（也由下方 useEffect 自动重新写入）
    try {
      sessionStorage.removeItem(DATA_CACHE_KEY);
      console.log('[AppContext] Cache cleared');
    } catch (e) {
      console.warn('[AppContext] Failed to clear cache:', e);
    }
    
    setIsLoading(true);
    try {
      // 与 loadData 保持一致：拉取全部 6 个数据源，确保 themes / oralArchives / cultureArticles 也被刷新
      const [corpusRes, wisdomRes, audioRes, categoriesRes, oralArchivesRes, cultureArticlesRes] = await Promise.all([
        fetch('/api/corpus'),
        fetch('/api/wisdom'),
        fetch('/api/audio'),
        fetch('/api/categories'),
        fetch('/api/wisdom/oral-archives'),
        fetch('/api/wisdom/culture-articles')
      ]);
      
      const corpusData = await corpusRes.json();
      const wisdomData = await wisdomRes.json();
      const audioData = await audioRes.json();
      const categoriesData = await categoriesRes.json();
      const oralArchivesData = await oralArchivesRes.json();
      const cultureArticlesData = await cultureArticlesRes.json();
      
      if (corpusData.success && Array.isArray(corpusData.data)) {
        setWords(corpusData.data);
      }
      
      if (wisdomData.success && Array.isArray(wisdomData.data)) {
        setWisdomQuotes(wisdomData.data);
      }
      
      if (oralArchivesData.success && Array.isArray(oralArchivesData.data)) {
        setOralArchives(oralArchivesData.data);
      }
      
      if (cultureArticlesData.success && Array.isArray(cultureArticlesData.data)) {
        setCultureArticles(cultureArticlesData.data);
      }
      
      const groupedRecords: Record<string, import('@/types').AudioItem[]> = {};
      if (audioData.success && Array.isArray(audioData.data)) {
        for (const record of audioData.data) {
          const wordId = record.wordId;
          if (!groupedRecords[wordId]) {
            groupedRecords[wordId] = [];
          }
          groupedRecords[wordId].push({
            id: record.id,
            url: record.audioUrl,
            name: record.audioName || record.createdByName || '未命名音频',
            createdAt: new Date(record.createdAt).getTime(),
            createdByUserId: record.createdByUserId || undefined,
          });
        }
        setAudioRecords(groupedRecords);
      }
      
      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        const loadedThemes = categoriesData.data.map((cat: any) => ({
          id: cat.slug,
          name: { zh: cat.nameZh, en: cat.nameEn },
          description: { zh: cat.descriptionZh || '', en: cat.descriptionEn || '' },
          icon: cat.emoji || '📚',
          color: '#10b981',
        }));
        setThemes(loadedThemes);
      }
      
      // 缓存自动持久化由 useEffect 接管（on state change）
      console.log('[AppContext] Data refreshed; auto-persist will write cache on next render');
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 刷新主题列表
  const refreshThemes = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const loadedThemes = data.data.map((cat: any) => ({
          id: cat.slug,
          name: {
            zh: cat.nameZh,
            en: cat.nameEn,
          },
          description: {
            zh: cat.descriptionZh || '',
            en: cat.descriptionEn || '',
          },
          icon: cat.emoji || '📚',
          color: '#10b981', // 默认绿色
        }));
        setThemes(loadedThemes);
        console.log('[AppContext] Themes refreshed:', loadedThemes.length);
      }
    } catch (error) {
      console.error('Failed to refresh themes:', error);
    }
  }, []);
  
  // 刷新声音档案
  const refreshOralArchives = useCallback(async () => {
    try {
      const response = await fetch('/api/wisdom/oral-archives');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setOralArchives(data.data);
      }
    } catch (error) {
      console.error('Failed to refresh oral archives:', error);
    }
  }, []);
  
  // 刷新文化文章
  const refreshCultureArticles = useCallback(async () => {
    try {
      const response = await fetch('/api/wisdom/culture-articles');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCultureArticles(data.data);
      }
    } catch (error) {
      console.error('Failed to refresh culture articles:', error);
    }
  }, []);

  const refreshXPRules = useCallback(async () => {
    try {
      const [xpRulesRes, levelsRes] = await Promise.all([
        fetch('/api/admin/xp-rules'),
        fetch('/api/admin/levels'),
      ]);
      const xpRulesData = await xpRulesRes.json();
      const levelsData = await levelsRes.json();
      if (xpRulesData.success && Array.isArray(xpRulesData.data)) {
        setDbXPRules(xpRulesData.data);
      }
      if (levelsData.success && Array.isArray(levelsData.data)) {
        const levels = levelsData.data;
        setDbLevels(levels);
        setXPState(prev => {
          const newLevel = calculateLevel(prev.totalXP, levels);
          if (newLevel !== prev.level) {
            return { ...prev, level: newLevel };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to refresh XP rules:', error);
    }
  }, []);
  
  const value: AppContextType = {
    language,
    setLanguage,
    t,
    xpState,
    addXP,
    getLevelProgress,
    getThemeLearnedCount,
    words,  // 直接使用数据库词条
    addWord,
    updateWord,
    deleteWord,
    uploadAudioToServer,
    deleteAudioFromServer,
    getWordAudios,
    loadWordAudios,
    voteAudio,
    setAudioLabel,
    getWordsByTheme,
    getWordsWithAudio,
    searchWords,
    isLoading,
    refreshData,
    wisdomQuotes,  // 直接使用数据库语录
    addWisdomQuote,
    updateWisdomQuote,
    deleteWisdomQuote,
    getRandomWisdomQuote,
    oralArchives,
    cultureArticles,
    refreshOralArchives,
    refreshCultureArticles,
    showLevelUp,
    newLevel,
    hideLevelUp,
    getLevelTitleInfo,
    wrongAnswers,
    recordWrongAnswer,
    removeWrongAnswer,
    getWrongAnswerWords,
    clearWrongAnswers,
    hasWordAudio,
    getFirstAudioUrl,
    themes,
    refreshThemes,
    refreshXPRules,
    isMongolianStale,
    markMongolianStale,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
