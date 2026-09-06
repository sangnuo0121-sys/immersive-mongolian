/**
 * 每日学习任务智能选择器
 *
 * 设计原则（草原教学法）：
 * 1. 难度梯度：复习已学（巩固） → 接触新词（扩展） → 易混淆词（精辨）
 * 2. 主题均衡：避免连续抽同一主题，循环遍历 7 个驿站
 * 3. 同主题配对：干扰项优先选同主题同词性，提高辨析价值
 * 4. 不重复：同一会话内不重复出同一词
 *
 * 配比（10 题）：
 *   - 3 题复习（已学词）
 *   - 5 题新词（按主题轮询）
 *   - 2 题易混淆（待后续接入主题向量时启用，目前为新词替代）
 *
 * 任务类型：learn_word / listening / review / challenge 四种，按 4-3-2-1 节奏穿插
 */

import type { Word, TaskType, LearningTask } from '@/types';
import { XP_RULES } from '@/types';

export type TaskSlot =
  | { kind: 'review'; word: Word }
  | { kind: 'new'; word: Word }
  | { kind: 'confusable'; word: Word; anchor: Word };

export interface SelectionContext {
  words: Word[];
  learnedIds: Set<string>;
  /** 主题学习进度（learned/total），用于挑主题 */
  themeProgress: Record<string, { learned: number; total: number }>;
  /** 已选过的词 id（本会话去重用） */
  excludeIds?: Set<string>;
  /** 总任务数，默认 10 */
  totalTasks?: number;
}

/**
 * 简单确定性洗牌（Fisher-Yates + 种子）
 * 用每日日期作为种子 → 同一天内抽到的词稳定，避免每次刷新都换
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getTodaySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

/**
 * 按主题轮询挑出"新词"：优先挑未学且未学比例高的主题
 */
function pickNewWords(ctx: SelectionContext, count: number): Word[] {
  const { words, learnedIds, themeProgress, excludeIds = new Set() } = ctx;
  const unlearned = words.filter(w => !learnedIds.has(w.id) && !excludeIds.has(w.id));
  if (unlearned.length === 0) return [];

  // 把 unlearned 按主题分组
  const byTheme = new Map<string, Word[]>();
  for (const w of unlearned) {
    const t = w.theme || 'default';
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t)!.push(w);
  }

  // 按主题"未学比例"降序排（挑未学率高的主题）
  const themeOrder = Object.entries(themeProgress)
    .map(([slug, p]) => ({
      slug,
      ratio: p.total > 0 ? (p.total - p.learned) / p.total : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map(t => t.slug);

  // 把所有主题都纳入（包括 themeProgress 没记录的）
  for (const t of byTheme.keys()) {
    if (!themeOrder.includes(t)) themeOrder.push(t);
  }

  const seed = getTodaySeed();
  const picked: Word[] = [];
  // 轮询主题：每轮从每个主题抽 1 个，直到凑齐 count
  const queue = themeOrder.map(t => seededShuffle(byTheme.get(t) || [], seed));
  let safety = 0;
  while (picked.length < count && safety < 200) {
    let addedThisRound = 0;
    for (const list of queue) {
      if (picked.length >= count) break;
      if (list.length > 0) {
        picked.push(list.shift()!);
        addedThisRound++;
      }
    }
    if (addedThisRound === 0) break; // 全部主题抽空
    safety++;
  }
  return picked;
}

/**
 * 挑复习词：从未学率低（已学比例高）的主题里挑
 * 优先挑学得"最久"的（实现简化：随机）
 */
function pickReviewWords(ctx: SelectionContext, count: number): Word[] {
  const { words, learnedIds, themeProgress, excludeIds = new Set() } = ctx;
  const learned = words.filter(w => learnedIds.has(w.id) && !excludeIds.has(w.id));
  if (learned.length === 0) return [];

  // 按主题"已学比例"降序排（挑已学率高的主题）
  const byTheme = new Map<string, Word[]>();
  for (const w of learned) {
    const t = w.theme || 'default';
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t)!.push(w);
  }

  const themeOrder = Object.entries(themeProgress)
    .filter(([, p]) => p.learned > 0)
    .map(([slug, p]) => ({
      slug,
      ratio: p.total > 0 ? p.learned / p.total : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map(t => t.slug);

  for (const t of byTheme.keys()) {
    if (!themeOrder.includes(t)) themeOrder.push(t);
  }

  const seed = getTodaySeed();
  const picked: Word[] = [];
  const queue = themeOrder.map(t => seededShuffle(byTheme.get(t) || [], seed));
  let safety = 0;
  while (picked.length < count && safety < 200) {
    let added = 0;
    for (const list of queue) {
      if (picked.length >= count) break;
      if (list.length > 0) {
        picked.push(list.shift()!);
        added++;
      }
    }
    if (added === 0) break;
    safety++;
  }
  return picked;
}

/**
 * 4 选 1 干扰项：优先同主题，其次跨主题；同主题里优先 translation 长度相近的
 */
export function pickDistractors(target: Word, pool: Word[], count: number): Word[] {
  const candidates = pool.filter(w => w.id !== target.id);
  if (candidates.length <= count) return candidates;

  const sameTheme = candidates.filter(w => w.theme === target.theme);
  const otherTheme = candidates.filter(w => w.theme !== target.theme);

  const seed = getTodaySeed();
  const shuffledSame = seededShuffle(sameTheme, seed);
  const shuffledOther = seededShuffle(otherTheme, seed + 1);

  const picked: Word[] = [];
  for (const w of shuffledSame) {
    if (picked.length >= count) break;
    picked.push(w);
  }
  if (picked.length < count) {
    for (const w of shuffledOther) {
      if (picked.length >= count) break;
      picked.push(w);
    }
  }
  return picked.slice(0, count);
}

/**
 * 任务类型节奏分配（4-3-2-1）
 * 10 题分布：4 learn_word, 3 listening, 2 review, 1 challenge
 * 顺序：learn → listen → learn → review → learn → listen → learn → review → listen → challenge
 * 这样学习过程有节奏感：认知 → 听觉 → 巩固 → 精辨
 */
const TASK_RHYTHM: TaskType[] = [
  'learn_word',
  'listening',
  'learn_word',
  'review',
  'learn_word',
  'listening',
  'learn_word',
  'review',
  'listening',
  'challenge',
];

/**
 * 智能配比主函数
 */
export function selectDailyTasks(ctx: SelectionContext): LearningTask[] {
  const total = ctx.totalTasks ?? 10;
  const rhythm = TASK_RHYTHM.slice(0, total);

  // 配比：30% 复习（3），50% 新词（5），20% 易混淆（2）
  const reviewCount = Math.max(0, Math.floor(total * 0.3));
  const newCount = Math.max(0, Math.floor(total * 0.5));
  // confusable 暂用新词占位（v1 简化：不做易混淆聚类）
  const confusableCount = total - reviewCount - newCount;

  const exclude = new Set(ctx.excludeIds || []);
  const reviewWords = pickReviewWords(ctx, reviewCount);
  reviewWords.forEach(w => exclude.add(w.id));
  const newWords = pickNewWords({ ...ctx, excludeIds: exclude }, newCount);
  newWords.forEach(w => exclude.add(w.id));
  const confusableWords = pickNewWords({ ...ctx, excludeIds: exclude }, confusableCount);

  // 合并：把三种词按 rhythm 分配任务类型
  const allWords: Array<{ word: Word; kind: 'review' | 'new' | 'confusable' }> = [
    ...reviewWords.map(w => ({ word: w, kind: 'review' as const })),
    ...newWords.map(w => ({ word: w, kind: 'new' as const })),
    ...confusableWords.map(w => ({ word: w, kind: 'confusable' as const })),
  ];

  // 把 rhythm 按类型填入 slot
  // 顺序：先复习（放前 30%），再新词，再易混淆
  // 实际让 rhythm 决定具体任务的类型，我们只要保证词的顺序合理
  const tasks: LearningTask[] = [];
  const pool = [...allWords];

  // 重新排序：让"复习"出现在前 30%，"新词"中段，"易混淆"压轴
  const reviews = pool.filter(p => p.kind === 'review');
  const news = pool.filter(p => p.kind === 'new');
  const confusables = pool.filter(p => p.kind === 'confusable');
  const seed = getTodaySeed();
  const ordered: Array<{ word: Word; kind: 'review' | 'new' | 'confusable' }> = [
    ...seededShuffle(reviews, seed),
    ...seededShuffle(news, seed + 2),
    ...seededShuffle(confusables, seed + 3),
  ];

  for (let i = 0; i < rhythm.length; i++) {
    const slot = ordered[i];
    if (!slot) continue;
    const type = rhythm[i];
    tasks.push({
      type,
      word: slot.word,
      completed: false,
      xpReward: XP_RULES[type] || 0,
      // v1 简化：易混淆标识暂未使用，由组件通过查主题推断
    });
  }

  return tasks;
}

/**
 * 把"已学词" Set 转换为 Set<string>
 */
export function buildLearnedSet(wordStatuses: Record<string, 0 | 1>): Set<string> {
  const set = new Set<string>();
  for (const [id, status] of Object.entries(wordStatuses)) {
    if (status === 1) set.add(id);
  }
  return set;
}
