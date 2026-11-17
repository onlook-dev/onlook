interface WorkActivityState {
  focused: boolean;
  visible: boolean;
  onBattery: boolean;
}

export interface WorkActivity {
  multiplier(): number;
  isForeground(): boolean;
  update(state: Partial<WorkActivityState>): void;
  subscribe(listener: () => void): () => void;
}

export function createWorkActivity(): WorkActivity {
  let state: WorkActivityState = { focused: true, visible: true, onBattery: false };
  const listeners = new Set<() => void>();
  const multiplier = (): number => state.focused && state.visible && !state.onBattery ? 1 : 10;
  const isForeground = (): boolean => state.focused && state.visible;
  return {
    multiplier,
    isForeground,
    update(next) {
      const previous = multiplier();
      const wasForeground = isForeground();
      state = { ...state, ...next };
      if (previous !== multiplier() || (!wasForeground && isForeground())) for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const workActivity = createWorkActivity();

export interface WorkTimers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const workTimers: WorkTimers = {
  set(callback, ms) {
    const timer = setTimeout(callback, ms);
    timer.unref();
    return timer;
  },
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function repeatWork(
  callback: () => void,
  intervalMs: number,
  activity = workActivity,
  timers = workTimers,
): () => void {
  let disposed = false;
  let timer: unknown;
  const arm = (): void => {
    if (!disposed) timer = timers.set(tick, intervalMs * activity.multiplier());
  };
  const tick = (): void => {
    if (disposed) return;
    try { callback(); } finally { arm(); }
  };
  const unsubscribe = activity.subscribe(() => {
    timers.clear(timer);
    tick();
  });
  arm();
  return () => {
    disposed = true;
    timers.clear(timer);
    unsubscribe();
  };
}

export function waitForWork(ms: number, activity = workActivity, timers = workTimers): { done: Promise<void>; cancel: () => void } {
  let finish!: () => void;
  const done = new Promise<void>((resolve) => { finish = resolve; });
  let timer: unknown;
  const cancel = (): void => {
    timers.clear(timer);
    unsubscribe();
    finish();
  };
  const arm = (): void => { timer = timers.set(cancel, ms * activity.multiplier()); };
  const unsubscribe = activity.subscribe(() => {
    timers.clear(timer);
    if (activity.isForeground()) cancel();
    else arm();
  });
  arm();
  return { done, cancel };
}
