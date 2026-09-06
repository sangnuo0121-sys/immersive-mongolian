// 核心类型定义

export type Language = 'zh' | 'en';

// 音频标签
export type AudioLabel = 'official' | 'community';

// 音频项类型
export interface AudioItem {
  id: string;
  url: string;
  name: string; // 音频名称，如"标准发音"、"男声"、"女声"等
  createdAt: number;
  createdByUserId?: string; // 上传者用户ID
  // 标签系统
  label?: 'official' | 'community'; // official=官方发音，community=社区发音（默认）
  upvotes?: number;
  downvotes?: number;
  // 当前登录用户对此音频的投票（'up' / 'down' / undefined）
  userVote?: 'up' | 'down' | null;
}

// 词条类型
export interface Word {
  id: string;
  mongolian: string;
  /**
   * 预渲染的 SVG path 文件 URL（位于 public/mongolian-rendered/words/{id}.svg）
   * 由 scripts/generate-mongolian-word-svgs.mts 离线生成
   * 词条显示主走这个 SVG，避免依赖浏览器 native shaping
   */
  mongolianImageSrc?: string;
  pinyin?: string;
  translation: {
    zh: string;
    en: string;
  };
  theme: ThemeId;
  sortOrder?: number; // 排序顺序
  audios?: AudioItem[]; // 支持多个音频
  audio?: string; // 兼容旧格式，首次上传时自动转换为 audios
  example?: {
    mongolian: string;
    translation: {
      zh: string;
      en: string;
    };
  };
  createdAt: number;
  isUserUploaded?: boolean;
  createdByUserId?: string;
  difficulty?: number;
}

// 分类类型
export interface Category {
  id: number;
  slug: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  descriptionZh?: string;
  descriptionEn?: string;
  sortOrder: number;
}

// 主题类型 - 动态支持任意主题 slug
export type ThemeId = string;

export interface Theme {
  id: ThemeId;
  name: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  icon: string;
  color: string;
}

// 智慧语录
export interface WisdomQuote {
  id: string;
  mongolian: string;
  translation: {
    zh: string;
    en: string;
  };
  author?: string;
  category?: string;
  audio?: string;
  createdAt: number;
  isUserUploaded?: boolean;
  createdByUserId?: string;
}

// 声音档案
export interface OralArchive {
  id: string;
  title: {
    mn: string;
    zh: string;
    en: string;
  };
  description: {
    mn: string;
    zh: string;
    en: string;
  };
  audioUrl: string; // 公开访问URL（GET时动态生成）
  audioKey?: string; // Storage key（用于管理文件）
  durationSeconds?: number;
  uploaderName?: string;
  isUserUploaded?: boolean;
  createdByUserId?: string;
  createdAt: number;
  updatedAt?: number;
}

// 文化传统文章
export interface CultureArticle {
  id: string;
  title: {
    mn: string;
    zh: string;
    en: string;
  };
  content: {
    mn: string;
    zh: string;
    en: string;
  };
  images: string[];
  imageKeys?: string[];  // Storage keys for image files (used for edit/delete)
  category?: string;
  authorName?: string;
  isUserUploaded?: boolean;
  createdByUserId?: string;
  createdAt: number;
  updatedAt?: number;
}

// 升级系统
export interface XPState {
  totalXP: number;
  level: number;
  /** 等级称号（来自服务端 /api/xp/me 的 title，未登录或缓存缺失时用本地等级图鉴兜底） */
  title?: LevelTitle | null;
  streak: number;
  dailyXP: number;
  lastStudyDate: string;
}

export interface XPConfig {
  learn_word: number;
  listening: number;
  review: number;
  practice: number;
  challenge: number;
  complete_daily_goal: number;
  // 贡献类 XP
  upload_word: number;
  upload_audio: number;
  upload_wisdom: number;
}

export const XP_RULES: XPConfig = {
  learn_word: 10,
  listening: 8,
  review: 6,
  practice: 7,
  challenge: 10,
  complete_daily_goal: 20,
  // 贡献类 XP
  upload_word: 15,
  upload_audio: 10,
  upload_wisdom: 15,
};

// 反馈类型
export interface Feedback {
  id: string;
  name?: string | null;
  identity?: string | null;
  feedback_type: string;
  message: string;
  willing_to_contribute: boolean;
  status: 'open' | 'replied' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  admin_replied_by?: string | null;
}

// ===== XP 系统新增类型（与用户绑定） =====

/** 排行榜条目 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  email: string;
  totalXp: number;
  currentLevel: number;
  streakDays: number;
}

/** 学习日历每日汇总 */
export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  xp: number;        // 当日获得的 XP
  count: number;      // 当日学习次数
  actions: Record<string, number>; // 行为 -> XP
}

/** 学习日历响应（含 streak） */
export interface StudyCalendar {
  days: CalendarDay[];     // 最近 365 天的每日数据
  currentStreak: number;   // 当前连续天数
  longestStreak: number;   // 历史最长连续天数
  todayXP: number;         // 今日已获 XP
}

/** XP 历史记录 */
export interface XPHistoryEntry {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  action: string;
  xpDelta: number;
  totalXpAfter: number;
  levelAfter: number;
  createdAt: string;
}

/** XP 操作分类 */
export type XPAction =
  | 'learn_word'
  | 'listening'
  | 'review'
  | 'practice'
  | 'challenge'
  | 'word_challenge'
  | 'daily_goal'
  | 'complete_daily_goal'
  | 'upload_word'
  | 'upload_audio'
  | 'upload_wisdom'
  | 'admin_adjust';

/** 贡献类 XP 类型 */
export type ContributionType = 'upload_word' | 'upload_audio' | 'upload_wisdom';

// 学习任务类型
export type TaskType = 'learn_word' | 'listening' | 'review' | 'challenge' | 'practice' | 'complete_daily_goal';

export interface LearningTask {
  type: TaskType;
  word: Word;
  completed: boolean;
  xpReward: number;
}

// 错题记录
export interface WrongAnswer {
  wordId: string;
  incorrectCount: number;
  lastWrongAt: number;
  mode: 'listening' | 'challenge';
}

// 学习模式类型
export type StudyMode = 'learning' | 'listening' | 'review' | 'challenge';

// 挑战题目结构
export interface ChallengeTask {
  id: string;
  word: Word;
  promptText: string;  // 题目文本（根据语言选择）
  options: Word[];     // 选项（包含正确答案和干扰项）
  correctWordId: string;
}

// 智慧语录题目
export interface WisdomChallengeTask {
  id: string;
  quote: WisdomQuote;
  question: string;
  options: string[];
  correctIndex: number;
}

// 听力题目
export interface ListeningTask {
  id: string;
  word: Word;
  options: string[];
  correctIndex: number;
  audioUrl: string;
}

// 等级名称系统
export interface LevelTitle {
  level: number;
  nameEn: string;
  nameZh: string;
  minXp: number;             // 进入该等级所需的最少 XP（等级系统唯一真理源）
  description: {
    zh: string;
    en: string;
  };
  color: string;
  icon: string;
}

export const LEVEL_TITLES: LevelTitle[] = [
  {
    level: 1,
    nameEn: 'Steppe Child',
    nameZh: '草原之子',
    minXp: 0,
    description: {
      zh: '初学者，刚接触语言',
      en: 'Beginner, just starting with the language',
    },
    color: '#8B5A2B',
    icon: '🌱',
  },
  {
    level: 2,
    nameEn: 'Herd Learner',
    nameZh: '牧学者',
    minXp: 100,
    description: {
      zh: '开始积累词汇',
      en: 'Starting to build vocabulary',
    },
    color: '#6B8E23',
    icon: '🐑',
  },
  {
    level: 3,
    nameEn: 'Grassland Speaker',
    nameZh: '草原言者',
    minXp: 250,
    description: {
      zh: '能简单表达',
      en: 'Can express simply',
    },
    color: '#228B22',
    icon: '🌾',
  },
  {
    level: 4,
    nameEn: 'Nomadic Explorer',
    nameZh: '游牧探索者',
    minXp: 500,
    description: {
      zh: '开始主动使用语言',
      en: 'Starting to actively use the language',
    },
    color: '#2E8B57',
    icon: '🏕️',
  },
  {
    level: 5,
    nameEn: 'Skilled Herder',
    nameZh: '熟练牧人',
    minXp: 900,
    description: {
      zh: '能稳定沟通',
      en: 'Can communicate steadily',
    },
    color: '#3CB371',
    icon: '🐎',
  },
  {
    level: 6,
    nameEn: 'Clan Voice',
    nameZh: '部族之声',
    minXp: 1500,
    description: {
      zh: '能表达思想',
      en: 'Can express thoughts',
    },
    color: '#20B2AA',
    icon: '🎵',
  },
  {
    level: 7,
    nameEn: 'Steppe Guide',
    nameZh: '草原引路人',
    minXp: 2400,
    description: {
      zh: '能帮助他人',
      en: 'Can help others',
    },
    color: '#00CED1',
    icon: '🧭',
  },
  {
    level: 8,
    nameEn: 'Wisdom Keeper',
    nameZh: '智慧守护者',
    minXp: 3700,
    description: {
      zh: '理解文化',
      en: 'Understands culture',
    },
    color: '#FFD700',
    icon: '💫',
  },
  {
    level: 9,
    nameEn: 'Spirit of the Steppe',
    nameZh: '草原之魂',
    minXp: 5500,
    description: {
      zh: '顶级 mastery',
      en: 'Ultimate mastery',
    },
    color: '#FF8C00',
    icon: '✨',
  },
];

/**
 * 数据库等级结构（auth.ts 中的 Level 的本地简化版，仅在 types/index.ts 内使用）
 */
export interface DBLevelInfo {
  level: number;
  min_xp: number;
  name_zh: string;
  name_en: string;
  icon?: string;
}

/**
 * 将数据库 Level 记录合并 LEVEL_TITLES 的 description / color，补齐为完整的 LevelTitle
 */
const mergeLevelWithTitle = (dbLv: DBLevelInfo, fallback?: LevelTitle): LevelTitle => {
  const base: LevelTitle = fallback || LEVEL_TITLES[0];
  return {
    level: dbLv.level,
    nameEn: dbLv.name_en || base.nameEn,
    nameZh: dbLv.name_zh || base.nameZh,
    minXp: dbLv.min_xp,
    description: base.description,
    color: base.color,
    icon: dbLv.icon || base.icon,
  };
};

/**
 * 把数据库 Level 列表转成 LevelTitle 列表（按 level 升序），未匹配上的回退到 LEVEL_TITLES
 */
const buildLevelTitlesFromDB = (dbLevels: DBLevelInfo[]): LevelTitle[] => {
  const sorted = [...dbLevels].sort((a, b) => a.level - b.level);
  return sorted.map((lv) => {
    const fallback = LEVEL_TITLES.find((t) => t.level === lv.level);
    return mergeLevelWithTitle(lv, fallback);
  });
};

/**
 * 根据 totalXp 计算等级。优先用数据库的 levels 表，没有则回退 LEVEL_TITLES
 */
export const calculateLevelFromXp = (totalXp: number, dbLevels?: DBLevelInfo[]): number => {
  const source: LevelTitle[] = dbLevels && dbLevels.length > 0
    ? buildLevelTitlesFromDB(dbLevels)
    : LEVEL_TITLES;
  const sorted = [...source].sort((a, b) => b.minXp - a.minXp);
  for (const l of sorted) {
    if (totalXp >= l.minXp) return l.level;
  }
  return 1;
};

/**
 * 根据 totalXp 计算等级进度。优先用数据库的 levels 表，没有则回退 LEVEL_TITLES
 */
export const calculateLevelProgressFromXp = (
  totalXp: number,
  dbLevels?: DBLevelInfo[]
): {
  current: number;
  needed: number;
  progress: number;
  currentLevel: LevelTitle;
  nextLevel: LevelTitle | null;
} => {
  const source: LevelTitle[] = dbLevels && dbLevels.length > 0
    ? buildLevelTitlesFromDB(dbLevels)
    : LEVEL_TITLES;
  const sorted = [...source].sort((a, b) => a.minXp - b.minXp);
  let current = sorted[0];
  let next: LevelTitle | null = null;
  for (const l of sorted) {
    if (totalXp >= l.minXp) {
      current = l;
    } else {
      next = l;
      break;
    }
  }
  if (!next) {
    return { current: totalXp, needed: 0, progress: 1, currentLevel: current, nextLevel: null };
  }
  const xpInLevel = totalXp - current.minXp;
  const xpNeeded = next.minXp - current.minXp;
  return {
    current: xpInLevel,
    needed: xpNeeded,
    progress: xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1,
    currentLevel: current,
    nextLevel: next,
  };
};

// 获取等级名称（按 level 编号）。优先用数据库的 levels 表，没有则回退 LEVEL_TITLES
export const getLevelTitle = (level: number, dbLevels?: DBLevelInfo[]): LevelTitle => {
  if (dbLevels && dbLevels.length > 0) {
    const hit = dbLevels.find((l) => l.level === level);
    if (hit) {
      const fallback = LEVEL_TITLES.find((t) => t.level === level);
      return mergeLevelWithTitle(hit, fallback);
    }
  }
  if (level <= 1) return LEVEL_TITLES[0];
  if (level <= 2) return LEVEL_TITLES[1];
  if (level <= 3) return LEVEL_TITLES[2];
  if (level <= 4) return LEVEL_TITLES[3];
  if (level <= 5) return LEVEL_TITLES[4];
  if (level <= 6) return LEVEL_TITLES[5];
  if (level <= 7) return LEVEL_TITLES[6];
  if (level <= 8) return LEVEL_TITLES[7];
  return LEVEL_TITLES[8];
};

// AI对话消息
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 词条编辑表单数据
export interface WordEditForm {
  mongolian: string;
  pinyin?: string;
  translation: {
    zh: string;
    en: string;
  };
  theme: ThemeId;
  example?: {
    mongolian: string;
    translation: {
      zh: string;
      en: string;
    };
  };
  audios?: AudioItem[];
}

// 音频工具函数

// 检查是否有可播放音频（兼容新旧格式）
export const hasPlayableAudio = (word: Word): boolean => {
  // 新格式：audios 数组
  if (word.audios && word.audios.length > 0) {
    return true;
  }
  // 旧格式：audio 字符串
  return Boolean(word.audio && word.audio.trim() !== '');
};

// 获取所有音频列表（兼容新旧格式）
export const getWordAudios = (word: Word): AudioItem[] => {
  // 新格式：audios 数组
  if (word.audios && word.audios.length > 0) {
    return word.audios;
  }
  // 旧格式：转换为 AudioItem 数组
  if (word.audio && word.audio.trim() !== '') {
    return [{
      id: 'legacy-audio',
      url: word.audio,
      name: 'Audio 1',
      createdAt: word.createdAt,
    }];
  }
  return [];
};

// 获取第一个音频URL（兼容新旧格式）
export const getWordAudioUrl = (word: Word): string | null => {
  const audios = getWordAudios(word);
  if (audios.length === 0) {
    return null;
  }
  return audios[0].url;
};

// 获取默认音频名称
export const getDefaultAudioName = (language: Language = 'zh'): string => {
  return language === 'zh' ? '发音' : 'Audio';
};

// 检查词条是否可以删除（用户词条可以删除，系统词条不能删除）
export const canDeleteWord = (word: Word): boolean => {
  return word.isUserUploaded === true;
};

// 检查词条是否可以编辑
export const canEditWord = (): boolean => {
  return true; // 所有词条都可以编辑
};

// 鸣谢类型
export interface Acknowledgement {
  id: string;
  mongolianName: string;
  chineseName?: string;
  englishName?: string;
  contributionDescription: string;
  quote?: string;
  imageKey?: string;
  imageUrl?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: number;
}

// 鸣谢表单数据
export interface AcknowledgementForm {
  mongolianName: string;
  chineseName?: string;
  englishName?: string;
  contributionDescription: string;
  quote?: string;
  image?: File;
}
