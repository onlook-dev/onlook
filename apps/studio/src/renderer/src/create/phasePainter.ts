export interface PainterTimers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const REAL_TIMERS: PainterTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class PhasePainter<T> {
  private readonly delayMs: number;
  private readonly paint: (value: T | null) => void;
  private readonly timers: PainterTimers;
  private pending: unknown;

  constructor(delayMs: number, paint: (value: T | null) => void, timers: PainterTimers = REAL_TIMERS) {
    this.delayMs = delayMs;
    this.paint = paint;
    this.timers = timers;
  }

  observe(next: T | null): void {
    this.dispose();
    if (next === null) {
      this.paint(null);
      return;
    }
    this.pending = this.timers.set(() => {
      this.pending = undefined;
      this.paint(next);
    }, this.delayMs);
  }

  dispose(): void {
    if (this.pending === undefined) return;
    this.timers.clear(this.pending);
    this.pending = undefined;
  }
}
