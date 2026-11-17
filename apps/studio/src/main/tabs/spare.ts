/** Wider than `RAPID_WINDOW_MS` in the `tab-rails-first` adapter, so a second `+` inside the same second misses; any shorter and that path goes unexercised (ONL-2318). */
export const SPARE_IDLE_MS = 1_500;

export type SpareState = 'held' | 'pending' | 'none';

export interface SpareSeams<T> {
  mint: () => T | undefined;
  destroy: (held: T) => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  isQuitting: () => boolean;
}

/** Held outside `order`, so the chrome, the hot set and cooling never see it (ONL-2318, ONL-2210); quit destroys it without waiting (ONL-2254). */
export class SpareKeeper<T> {
  private held: T | undefined;
  private pending: unknown;
  private isArmed = false;

  constructor(private readonly seams: SpareSeams<T>) {}

  get isHeld(): boolean {
    return this.held !== undefined;
  }

  get state(): SpareState {
    if (this.held !== undefined) return 'held';
    return this.pending !== undefined ? 'pending' : 'none';
  }

  /** For layout alone: a spare laid out late reflows its rails on promotion (ONL-2318). */
  peek(): T | undefined {
    return this.held;
  }

  /** Boot is over and the window is up; before this, a mint would compete with the first paint. */
  arm(): void {
    this.isArmed = true;
    this.schedule();
  }

  schedule(): void {
    if (!this.isArmed) return;
    if (this.held !== undefined || this.pending !== undefined) return;
    if (this.seams.isQuitting()) return;
    this.pending = this.seams.setTimer(() => {
      this.pending = undefined;
      this.mintNow();
    }, SPARE_IDLE_MS);
  }

  private mintNow(): void {
    if (this.held !== undefined || this.seams.isQuitting()) return;
    this.held = this.seams.mint();
  }

  /** Re-arming is the caller's, so the next spare starts after the promoted view paints (ONL-2318). */
  take(): T | undefined {
    const held = this.held;
    this.held = undefined;
    return held;
  }

  dispose(): void {
    this.isArmed = false;
    if (this.pending !== undefined) {
      this.seams.clearTimer(this.pending);
      this.pending = undefined;
    }
    if (this.held === undefined) return;
    const held = this.held;
    this.held = undefined;
    this.seams.destroy(held);
  }
}
