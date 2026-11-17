import { create } from 'zustand';
import { log as rendererLog } from '../log.js';
import { onTipsReset, SCROLL_TIP_KEY } from '../tips/early.js';

/** Armed with the inspiration Frame "Add inspiration" placed, until the tip is used (ONL-2960). */
type ScrollTipEntry = { frameId: string } | 'spent';

const tipLog = rendererLog('sidebar');

function readEntries(): Record<string, ScrollTipEntry> {
  try {
    const raw = window.localStorage.getItem(SCROLL_TIP_KEY);
    const parsed: unknown = raw === null ? {} : JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries: Record<string, ScrollTipEntry> = {};
    for (const [path, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === 'spent') entries[path] = 'spent';
      else if (value !== null && typeof value === 'object' && typeof (value as { frameId?: unknown }).frameId === 'string') entries[path] = { frameId: (value as { frameId: string }).frameId };
    }
    return entries;
  } catch (error) {
    tipLog.warn('scroll tip read failed', { message: error instanceof Error ? error.message : 'unknown' });
    return {};
  }
}

const useScrollTipStore = create<{ entries: Record<string, ScrollTipEntry> | null }>()(() => ({ entries: null }));

let readOnce: Record<string, ScrollTipEntry> | null = null;

const lingering = new Map<string, ReturnType<typeof setTimeout>>();

onTipsReset(() => {
  readOnce = null;
  useScrollTipStore.setState({ entries: null });
  for (const timer of lingering.values()) clearTimeout(timer);
  lingering.clear();
});

function entriesOf(state: { entries: Record<string, ScrollTipEntry> | null }): Record<string, ScrollTipEntry> {
  if (state.entries !== null) return state.entries;
  readOnce ??= readEntries();
  return readOnce;
}

function write(projectPath: string, entry: ScrollTipEntry): void {
  const next = { ...entriesOf(useScrollTipStore.getState()), [projectPath]: entry };
  useScrollTipStore.setState({ entries: next });
  try {
    window.localStorage.setItem(SCROLL_TIP_KEY, JSON.stringify(next));
  } catch (error) {
    tipLog.warn('scroll tip write failed', { message: error instanceof Error ? error.message : 'unknown' });
  }
}

export function armScrollTip(projectPath: string, frameId: string): void {
  if (entriesOf(useScrollTipStore.getState())[projectPath] !== undefined) return;
  write(projectPath, { frameId });
}

const isArmed = (projectPath: string): boolean => {
  const entry = entriesOf(useScrollTipStore.getState())[projectPath];
  return entry !== undefined && entry !== 'spent';
};

/** The person did what the tip teaches: an armed tip stays under their hand for `lingerMs`, then `onOver` ends it. */
export function lingerScrollTip(projectPath: string, lingerMs: number, onOver: () => void): void {
  if (lingering.has(projectPath) || !isArmed(projectPath)) return;
  lingering.set(projectPath, setTimeout(() => {
    lingering.delete(projectPath);
    if (isArmed(projectPath)) onOver();
  }, lingerMs));
}

export function spendScrollTip(projectPath: string): void {
  if (entriesOf(useScrollTipStore.getState())[projectPath] === 'spent') return;
  write(projectPath, 'spent');
}

/** The armed Frame's id, or null when the tip was never armed here or is spent. */
export function useScrollTipFrame(projectPath: string | null): string | null {
  return useScrollTipStore((state) => {
    if (projectPath === null) return null;
    const entry = entriesOf(state)[projectPath];
    return entry === undefined || entry === 'spent' ? null : entry.frameId;
  });
}

/** Landed: on the canvas, its flight over. */
export function scrollTipFrameLanded(frameId: string | null, canvas: { nodes: readonly { id: string }[]; inspiration: { frameId: string } | null }): boolean {
  return frameId !== null && canvas.inspiration?.frameId !== frameId && canvas.nodes.some((node) => node.id === frameId);
}
