import type { FrameChange, FrameCreation, FrameEdit } from '@studio/events';

// The fallback timer clears this overlay only, never `isStreaming`: a stuck backend is `makeEmitState`'s in `agent-host/index.ts` (ONL-2194).

/** Well past any real turn; fires only on a leak. */
const WORKING_FRAMES_FALLBACK_MS = 15 * 60 * 1000;

/**
 * What a parked-question change does to the overlay. A teardown resumes nothing: the turn boundary
 * clears the set moments later, and resuming first relights every frame in between (ONL-2295).
 */
export function overlayMove(
  parked: boolean,
  turnEnding: boolean | undefined,
): 'hold' | 'resume' | 'none' {
  if (parked) return 'hold';
  return turnEnding === true ? 'none' : 'resume';
}

export type FrameChangeWords = Omit<FrameEdit, 'frameId'> | Omit<FrameCreation, 'frameId'>;

const isSameChange = (change: FrameChange, frameId: string, words: FrameChangeWords): boolean => {
  if (change.frameId !== frameId) return false;
  if (change.kind === 'created' || words.kind === 'created') return change.kind === words.kind;
  return change.done === words.done && change.what === words.what;
};

export interface WorkingFramesOptions<Handle = ReturnType<typeof setTimeout>> {
  onChange: (frameIds: string[], changes: FrameChange[], waitingOn?: string) => void;
  setTimer?: (fn: () => void, ms: number) => Handle;
  clearTimer?: (handle: Handle) => void;
}

export class WorkingFrames<Handle = ReturnType<typeof setTimeout>> {
  private readonly ids = new Set<string>();
  private changes: FrameChange[] = [];
  private waitingWords: string | undefined;
  private readonly nextTurn = new Set<string>();
  private fallback: Handle | undefined;
  private active = false;
  private held = false;
  private readonly onChange: (frameIds: string[], changes: FrameChange[], waitingOn?: string) => void;
  private readonly setTimer: (fn: () => void, ms: number) => Handle;
  private readonly clearTimer: (handle: Handle) => void;

  constructor(options: WorkingFramesOptions<Handle>) {
    this.onChange = options.onChange;
    this.setTimer =
      options.setTimer ?? ((fn, ms) => setTimeout(fn, ms) as unknown as Handle);
    this.clearTimer =
      options.clearTimer ?? ((handle) => clearTimeout(handle as unknown as NodeJS.Timeout));
  }

  /** A no-op outside a turn: a straggler after `turnEnded()` cannot resurrect a cleared set. */
  mark(frameId: string, words?: FrameChangeWords): void {
    if (!this.active) return;
    const isNewFrame = !this.ids.has(frameId);
    const isNewChange = words !== undefined && !this.changes.some((change) => isSameChange(change, frameId, words));
    if (!isNewFrame && !isNewChange) return;
    this.ids.add(frameId);
    if (isNewChange) this.changes = [...this.changes, { frameId, ...words }];
    if (this.held) return;
    this.emit();
  }

  waitingOn(what: string): void {
    if (!this.active) return;
    this.waitingWords = what;
    this.emit();
  }

  /** Marked now inside a turn, or when the next one starts. */
  markNextTurn(frameId: string): void {
    if (this.active) this.mark(frameId);
    else this.nextTurn.add(frameId);
  }

  /** The overlay goes dark but the set survives, so the answer resumes the same frames (ONL-2295). */
  hold(): void {
    if (!this.active || this.held) return;
    this.held = true;
    this.disarm();
    if (this.ids.size > 0) this.onChange([], []);
  }

  resume(): void {
    if (!this.held) return;
    this.held = false;
    this.waitingWords = undefined;
    if (!this.active) return;
    this.fallback = this.setTimer(() => this.clear(), WORKING_FRAMES_FALLBACK_MS);
    if (this.ids.size > 0) this.emit();
  }

  turnStarted(): void {
    this.active = true;
    this.held = false;
    this.disarm();
    this.clear();
    this.fallback = this.setTimer(() => this.clear(), WORKING_FRAMES_FALLBACK_MS);
    const pending = [...this.nextTurn];
    this.nextTurn.clear();
    for (const frameId of pending) this.mark(frameId);
  }

  turnEnded(): void {
    this.active = false;
    this.held = false;
    this.disarm();
    this.clear();
  }

  dispose(): void {
    this.active = false;
    this.held = false;
    this.disarm();
  }

  private disarm(): void {
    if (this.fallback === undefined) return;
    this.clearTimer(this.fallback);
    this.fallback = undefined;
  }

  private emit(): void {
    this.onChange([...this.ids], this.changes, this.waitingWords);
  }

  private clear(): void {
    this.changes = [];
    this.waitingWords = undefined;
    if (this.ids.size === 0) return;
    this.ids.clear();
    this.onChange([], []);
  }
}
