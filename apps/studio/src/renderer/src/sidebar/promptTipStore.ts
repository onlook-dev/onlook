import { create } from 'zustand';
import { log as rendererLog } from '../log.js';
import { onTipsReset, PROMPT_SPENT_KEY } from '../tips/early.js';

/** How long the next-task cards sit unpicked before the prompt tip comes in beside them (ONL-2960). */
export const PROMPT_TIP_DELAY_MS = 12_000;

const tipLog = rendererLog('sidebar');

function readShown(): string[] {
  try {
    const raw = window.localStorage.getItem(PROMPT_SPENT_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch (error) {
    tipLog.warn('prompt tip read failed', { message: error instanceof Error ? error.message : 'unknown' });
    return [];
  }
}

/** `shown` persists, so the tip appears once per project; `ended` is this launch's, so the one up leaves when it is used or runs out. */
interface PromptTipStore {
  shown: readonly string[] | null;
  ended: Record<string, true>;
  /** The project whose cards have sat unpicked for the delay. */
  due: string | null;
  offeredAt: number | null;
}

export const usePromptTipStore = create<PromptTipStore>()(() => ({ shown: null, ended: {}, due: null, offeredAt: null }));

let readOnce: readonly string[] | null = null;

function shownPaths(state: { shown: readonly string[] | null }): readonly string[] {
  if (state.shown !== null) return state.shown;
  readOnce ??= readShown();
  return readOnce;
}

export const promptTipWasShown = (state: PromptTipStore, projectPath: string): boolean => shownPaths(state).includes(projectPath);
export const promptTipEnded = (state: PromptTipStore, projectPath: string): boolean => state.ended[projectPath] === true;

export function markPromptTipShown(projectPath: string): void {
  const shown = shownPaths(usePromptTipStore.getState());
  if (shown.includes(projectPath)) return;
  const next = [...shown, projectPath];
  usePromptTipStore.setState({ shown: next });
  try {
    window.localStorage.setItem(PROMPT_SPENT_KEY, JSON.stringify(next));
  } catch (error) {
    tipLog.warn('prompt tip write failed', { message: error instanceof Error ? error.message : 'unknown' });
  }
}

export function endPromptTip(projectPath: string): void {
  markPromptTipShown(projectPath);
  if (promptTipEnded(usePromptTipStore.getState(), projectPath)) return;
  usePromptTipStore.setState((state) => ({ ended: { ...state.ended, [projectPath]: true } }));
}

let clock: { path: string; timer: ReturnType<typeof setTimeout> | undefined } | undefined;

/** Counts from the moment the cards land while they wait on a pick; a pick, a question or the agent starting again stops it, and the next offer counts afresh. */
export function watchNextTasksOffer(projectPath: string | null, isWaitingOnPick: boolean, delayMs: number, now: number = Date.now()): void {
  const isSame = clock !== undefined && clock.path === projectPath;
  if (isWaitingOnPick && isSame) return;
  if (clock?.timer !== undefined) clearTimeout(clock.timer);
  clock = undefined;
  if (!isWaitingOnPick || projectPath === null) {
    const state = usePromptTipStore.getState();
    if (state.due !== null || state.offeredAt !== null) usePromptTipStore.setState({ due: null, offeredAt: null });
    return;
  }
  const watched = { path: projectPath, timer: undefined as ReturnType<typeof setTimeout> | undefined };
  watched.timer = setTimeout(() => {
    watched.timer = undefined;
    usePromptTipStore.setState({ due: projectPath });
  }, delayMs);
  clock = watched;
  usePromptTipStore.setState({ due: null, offeredAt: now });
}

export function forgetPromptTip(): void {
  if (clock?.timer !== undefined) clearTimeout(clock.timer);
  clock = undefined;
  readOnce = null;
  usePromptTipStore.setState({ shown: null, ended: {}, due: null, offeredAt: null });
}

onTipsReset(forgetPromptTip);
