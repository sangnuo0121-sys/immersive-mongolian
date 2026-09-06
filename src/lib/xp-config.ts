import { getAdminClient } from '@/lib/auth/admin-client';
import { LEVEL_TITLES } from '@/types';

export interface XpRule {
  id: string;
  value: number;
  description_zh: string;
  description_en: string;
  sort_order: number;
}

export interface Level {
  level: number;
  min_xp: number;
  name_zh: string;
  name_en: string;
  icon: string;
  sort_order: number;
}

export interface XpConfig {
  rules: XpRule[];
  levels: Level[];
}

let cached: { data: XpConfig; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 分钟

export const DEFAULT_RULES: XpRule[] = [
  { id: 'learn_word', value: 10, description_zh: '学习单词', description_en: 'Learn a word', sort_order: 1 },
  { id: 'listening', value: 8, description_zh: '听力训练', description_en: 'Listening practice', sort_order: 2 },
  { id: 'review', value: 6, description_zh: '复习任务', description_en: 'Review task', sort_order: 3 },
  { id: 'challenge', value: 7, description_zh: '练习挑战', description_en: 'Practice challenge', sort_order: 4 },
  { id: 'word_challenge', value: 10, description_zh: '单词挑战', description_en: 'Word challenge', sort_order: 5 },
  { id: 'daily_goal', value: 20, description_zh: '完成每日目标', description_en: 'Complete daily goal', sort_order: 6 },
  { id: 'upload_word', value: 15, description_zh: '上传词条', description_en: 'Upload a word', sort_order: 7 },
  { id: 'upload_audio', value: 10, description_zh: '上传音频', description_en: 'Upload audio', sort_order: 8 },
  { id: 'upload_wisdom', value: 15, description_zh: '上传智慧语录', description_en: 'Upload a wisdom quote', sort_order: 9 },
];

/**
 * 等级定义以 LEVEL_TITLES（types/index.ts）为唯一真理源，
 * 后端使用 DB 格式（min_xp 下划线）时通过此函数派生
 */
export const DEFAULT_LEVELS: Level[] = LEVEL_TITLES.map((l) => ({
  level: l.level,
  min_xp: l.minXp,
  name_zh: l.nameZh,
  name_en: l.nameEn,
  icon: l.icon,
  sort_order: l.level,
}));

/**
 * 从服务端拉取 XP 规则和等级定义（带短缓存）
 */
export async function getXpRules(): Promise<XpConfig> {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const admin = getAdminClient();
    const [rulesRes, levelsRes] = await Promise.all([
      admin.from('xp_rules').select('id, value, description_zh, description_en, sort_order').order('sort_order'),
      admin.from('levels').select('level, min_xp, name_zh, name_en, icon, sort_order').order('sort_order'),
    ]);

    const rulesData: XpRule[] = Array.isArray(rulesRes.data) ? rulesRes.data : [];
    const levelsData: Level[] = Array.isArray(levelsRes.data) ? levelsRes.data : [];
    const rules: XpRule[] = rulesData.length > 0 ? rulesData : DEFAULT_RULES;
    const levels: Level[] = levelsData.length > 0 ? levelsData : DEFAULT_LEVELS;

    cached = { data: { rules, levels }, ts: Date.now() };
    return cached.data;
  } catch (e) {
    return { rules: DEFAULT_RULES, levels: DEFAULT_LEVELS };
  }
}

export function invalidateXpCache() {
  cached = null;
}

/**
 * 根据 totalXp 计算等级
 */
export function calculateLevelFromRules(totalXp: number, levels: Level[]): number {
  const sorted = [...levels].sort((a, b) => a.min_xp - b.min_xp);
  let level = 1;
  for (const l of sorted) {
    if (totalXp >= l.min_xp) {
      level = l.level;
    } else {
      break;
    }
  }
  return level;
}

export function getLevelTitleFromRules(level: number, levels: Level[]) {
  const found = levels.find((l) => l.level === level);
  if (found) {
    return { name_zh: found.name_zh, name_en: found.name_en, icon: found.icon };
  }
  // fallback to highest
  const sorted = [...levels].sort((a, b) => b.level - a.level);
  const top = sorted[0];
  return { name_zh: top?.name_zh || '蒙古学者', name_en: top?.name_en || 'Mongolian Scholar', icon: top?.icon || '🎓' };
}

export function getNextLevelProgressFromRules(totalXp: number, levels: Level[]) {
  const sorted = [...levels].sort((a, b) => a.min_xp - b.min_xp);
  let current = sorted[0];
  let next = sorted[0];
  for (const l of sorted) {
    if (totalXp >= l.min_xp) {
      current = l;
    } else {
      next = l;
      break;
    }
  }
  const remaining = next.min_xp - totalXp;
  const span = next.min_xp - current.min_xp;
  const progress = span > 0 ? Math.min(1, (totalXp - current.min_xp) / span) : 1;
  return { current, next, remaining, progress };
}
