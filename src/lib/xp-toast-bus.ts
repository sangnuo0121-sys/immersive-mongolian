/**
 * XP Toast 事件总线
 *
 * 跨 context 共享的轻量事件机制，AppContext.addXP → XPToastHost 订阅渲染。
 * 不入 context.value，避免污染 useApp 的依赖图。
 */

import type { XPAction } from '@/types';

export type { XPAction };

export interface XPToastItem {
  id: string;
  action: XPAction;
  value: number; // XP 增量
  /** 显示持续时间（ms），默认 3000 */
  duration?: number;
  /** 是否触发等级提升（用于二次提醒） */
  leveledUp?: boolean;
}

type Listener = (item: XPToastItem) => void;
const listeners = new Set<Listener>();

export function pushXPToast(item: Omit<XPToastItem, 'id'>): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: XPToastItem = { id, ...item };
  listeners.forEach((l) => l(full));
}

export function subscribeXPToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
