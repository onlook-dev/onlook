import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';

export const FOLD_GRACE_MS = 1000;

/** Why the list is re-rendering, read by each row as it mounts, moves or leaves. */
export type CollapseIntent = 'none' | 'open' | 'reopen' | 'fold' | 'roll';

export interface CollapseState {
  open: boolean;
  /** Every row that left on the last fold has gone. */
  shut: boolean;
  intent: CollapseIntent;
  pointerInside: boolean;
  /** Keyboard focus is inside the foot; mouse focus doesn't count. */
  focusInside: boolean;
  /** From a tap on the count until the pointer next moves: the tap is not a hover on the line under it. */
  quietTip: boolean;
  /** The lines the list last drew; null before its first paint. */
  linesKey: string | null;
}

export interface CollapseActions {
  tapCount: () => void;
  pointerEnter: () => void;
  pointerMove: () => void;
  pointerLeave: () => void;
  focusIn: (isFocusVisible: boolean) => void;
  focusOut: (leftFoot: boolean) => void;
  exitsDone: () => void;
  linesChanged: (keys: readonly string[]) => void;
  committed: () => void;
  reset: () => void;
}

export type CollapseStore = CollapseState & CollapseActions;

interface Timers {
  setTimeout: (run: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export const COLLAPSED: CollapseState = { open: false, shut: true, intent: 'none', pointerInside: false, focusInside: false, quietTip: false, linesKey: null };

export const linesKeyOf = (keys: readonly string[]): string => keys.join('|');

export const isCountSeated = (state: Pick<CollapseState, 'open' | 'shut'>): boolean => !state.open && state.shut;

export function createCollapseStore(timers: Timers = globalThis as unknown as Timers, graceMs = FOLD_GRACE_MS): StoreApi<CollapseStore> {
  let pending: unknown;
  const hold = (): void => {
    if (pending !== undefined) timers.clearTimeout(pending);
    pending = undefined;
  };
  return createStore<CollapseStore>()((set, get) => {
    const scheduleFold = (): void => {
      hold();
      const { open, pointerInside, focusInside } = get();
      if (!open || pointerInside || focusInside) return;
      pending = timers.setTimeout(() => {
        pending = undefined;
        set({ open: false, intent: 'fold' });
      }, graceMs);
    };
    return {
      ...COLLAPSED,
      tapCount: () => {
        hold();
        set((state) => ({ open: true, shut: false, intent: state.shut ? 'open' : 'reopen', quietTip: true }));
      },
      pointerEnter: () => {
        hold();
        set({ pointerInside: true });
      },
      pointerMove: () => {
        if (get().quietTip) set({ quietTip: false });
      },
      pointerLeave: () => {
        set({ pointerInside: false });
        scheduleFold();
      },
      focusIn: (isFocusVisible) => {
        if (!isFocusVisible) return;
        hold();
        set({ focusInside: true });
      },
      focusOut: (leftFoot) => {
        if (!leftFoot) return;
        set({ focusInside: false });
        scheduleFold();
      },
      exitsDone: () => {
        if (!get().open && !get().shut) set({ shut: true });
      },
      linesChanged: (keys) => {
        const linesKey = linesKeyOf(keys);
        const before = get();
        if (before.linesKey === linesKey) return;
        if (keys.length <= 1 && before.open) {
          hold();
          set({ ...COLLAPSED, pointerInside: before.pointerInside, focusInside: before.focusInside, linesKey });
          return;
        }
        set({ linesKey, ...(before.linesKey === null ? {} : { intent: 'roll' as const }) });
      },
      committed: () => {
        if (get().intent === 'open') set({ intent: 'reopen' });
      },
      reset: () => {
        hold();
        set(COLLAPSED);
      },
    };
  });
}

export const statusCollapse = createCollapseStore();

export function useStatusCollapse<T>(select: (state: CollapseStore) => T): T {
  return useStore(statusCollapse, select);
}
