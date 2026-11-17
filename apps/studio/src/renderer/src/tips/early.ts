import { create } from 'zustand';
import type { TipsBaseline } from '@studio/events';
import { useAppInfoStore } from '../app/store.js';
import { log as rendererLog } from '../log.js';

export type EarlyTip = 'inspire';

export const INSPIRE_SPENT_KEY = 'studio.inspireTip.spent';
export const SCROLL_TIP_KEY = 'studio.scrollTip';
export const PROMPT_SPENT_KEY = 'studio.promptTip.spent';
const HOME_KEY = 'studio.tips.home';
const TIP_KEYS = [INSPIRE_SPENT_KEY, SCROLL_TIP_KEY, PROMPT_SPENT_KEY, HOME_KEY] as const;

const tipLog = rendererLog('tips');

type Homes = Partial<Record<EarlyTip, string>>;

function readHomes(): Homes {
  try {
    const raw = window.localStorage.getItem(HOME_KEY);
    const parsed: unknown = raw === null ? {} : JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const homes: Homes = {};
    for (const kind of ['inspire'] as const) {
      const value = record[kind];
      if (typeof value === 'string') homes[kind] = value;
    }
    return homes;
  } catch (error) {
    tipLog.warn('tip home read failed', { message: error instanceof Error ? error.message : 'unknown' });
    return {};
  }
}

const useTipHomes = create<{ homes: Homes | null }>()(() => ({ homes: null }));

let readOnce: Homes | null = null;

function homesOf(state: { homes: Homes | null }): Homes {
  if (state.homes !== null) return state.homes;
  readOnce ??= readHomes();
  return readOnce;
}

export function claimTipHome(kind: EarlyTip, projectPath: string): void {
  const homes = homesOf(useTipHomes.getState());
  if (homes[kind] !== undefined) return;
  const next = { ...homes, [kind]: projectPath };
  useTipHomes.setState({ homes: next });
  try {
    window.localStorage.setItem(HOME_KEY, JSON.stringify(next));
  } catch (error) {
    tipLog.warn('tip home write failed', { message: error instanceof Error ? error.message : 'unknown' });
  }
}

const ESTABLISHED_MIN_PROJECTS = 1;

export function isEstablishedBaseline(baseline: TipsBaseline | undefined): boolean {
  return baseline !== undefined && baseline.projects >= ESTABLISHED_MIN_PROJECTS;
}

/** Established until main's settings land, so no early tip shows before the answer (ONL-2960). */
const useTipAudience = create<{ isEstablished: boolean }>()(() => ({ isEstablished: true }));

export function applyTipsBaseline(baseline: TipsBaseline | undefined): void {
  const isEstablished = isEstablishedBaseline(baseline);
  if (useTipAudience.getState().isEstablished !== isEstablished) useTipAudience.setState({ isEstablished });
}

export interface EarlyTipContext {
  home: string | undefined;
  everyProject: boolean;
  isEstablished: boolean;
}

export function isEarlyTipAudience(context: Pick<EarlyTipContext, 'everyProject' | 'isEstablished'>): boolean {
  return context.everyProject || !context.isEstablished;
}

export function isTipSpent(spent: readonly string[], projectPath: string, context: EarlyTipContext): boolean {
  if (spent.includes(projectPath)) return true;
  if (context.everyProject) return false;
  if (context.isEstablished) return true;
  return spent.length > 0 || (context.home !== undefined && context.home !== projectPath);
}

export function earlyTipContext(kind: EarlyTip): EarlyTipContext {
  return { home: homesOf(useTipHomes.getState())[kind], everyProject: useAppInfoStore.getState().tipsEveryProject, isEstablished: useTipAudience.getState().isEstablished };
}

export function useEarlyTipContext(kind: EarlyTip): EarlyTipContext {
  const home = useTipHomes((state) => homesOf(state)[kind]);
  const everyProject = useAppInfoStore((state) => state.tipsEveryProject);
  const isEstablished = useTipAudience((state) => state.isEstablished);
  return { home, everyProject, isEstablished };
}

const forgetters = new Set<() => void>();

export function onTipsReset(forget: () => void): void {
  forgetters.add(forget);
}

function forgetAll(): void {
  readOnce = null;
  useTipHomes.setState({ homes: null });
  for (const forget of forgetters) forget();
}

export function clearTipRecords(): void {
  for (const key of TIP_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      tipLog.warn('tip reset failed', { key, message: error instanceof Error ? error.message : 'unknown' });
    }
  }
  forgetAll();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.newValue === null && (event.key === null || (TIP_KEYS as readonly string[]).includes(event.key))) forgetAll();
  });
}
