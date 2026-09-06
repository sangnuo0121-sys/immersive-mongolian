/**
 * 学习进度 LocalStorage 数据层
 * 
 * 管理用户对每个词条的学习状态（未学/已学）
 * 数据持久化到 localStorage，刷新不丢失
 */

export type WordStatus = 0 | 1; // 0=未学 1=已学

export interface LearningProgress {
  wordStatuses: Record<string, WordStatus>; // wordId -> status
  lastStudyDate: string | null;             // YYYY-MM-DD
  streak: number;                           // 连续天数
  totalXP: number;                          // 总经验值
}

const STORAGE_KEY = 'mongolian-learning-progress';

/** 获取学习进度 */
export function getLearningProgress(): LearningProgress {
  if (typeof window === 'undefined') {
    return { wordStatuses: {}, lastStudyDate: null, streak: 0, totalXP: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse learning progress:', e);
  }
  return { wordStatuses: {}, lastStudyDate: null, streak: 0, totalXP: 0 };
}

/** 保存学习进度 */
export function saveLearningProgress(progress: LearningProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save learning progress:', e);
  }
}

/** 标记词条为已学 */
export function markWordLearned(wordId: string): LearningProgress {
  const progress = getLearningProgress();
  if (progress.wordStatuses[wordId] !== 1) {
    progress.wordStatuses[wordId] = 1;
    saveLearningProgress(progress);
  }
  return progress;
}

/** 批量标记词条为已学 */
export function markWordsLearned(wordIds: string[]): LearningProgress {
  const progress = getLearningProgress();
  for (const id of wordIds) {
    progress.wordStatuses[id] = 1;
  }
  saveLearningProgress(progress);
  return progress;
}

/** 获取词条状态 */
export function getWordStatus(wordId: string): WordStatus {
  const progress = getLearningProgress();
  return progress.wordStatuses[wordId] ?? 0;
}

/** 获取某主题下的学习统计 */
export function getThemeProgress(wordIds: string[]): { learned: number; total: number } {
  const progress = getLearningProgress();
  const learned = wordIds.filter(id => progress.wordStatuses[id] === 1).length;
  return { learned, total: wordIds.length };
}

/** 获取所有已学词条 ID */
export function getLearnedWordIds(): string[] {
  const progress = getLearningProgress();
  return Object.entries(progress.wordStatuses)
    .filter(([_, status]) => status === 1)
    .map(([id]) => id);
}

/** 更新连续天数（今日学习后调用） */
export function updateStreak(): LearningProgress {
  const progress = getLearningProgress();
  const today = new Date().toISOString().split('T')[0];

  if (progress.lastStudyDate === today) {
    // 今天已经学习过，不重复更新
    return progress;
  }

  if (progress.lastStudyDate) {
    const lastDate = new Date(progress.lastStudyDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // 连续学习
      progress.streak += 1;
    } else if (diffDays > 1) {
      // 中断，重新开始
      progress.streak = 1;
    }
    // diffDays === 0 不会到这里（因为 lastStudyDate !== today）
  } else {
    // 第一次学习
    progress.streak = 1;
  }

  progress.lastStudyDate = today;
  saveLearningProgress(progress);
  return progress;
}

/** 重置学习进度（测试用） */
export function resetLearningProgress(): void {
  saveLearningProgress({
    wordStatuses: {},
    lastStudyDate: null,
    streak: 0,
    totalXP: 0,
  });
}
