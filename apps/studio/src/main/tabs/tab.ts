import type { WebContentsView } from 'electron';
import type { TabStatus } from '@studio/events';
import type { TabHealth } from './health.js';
import type { createTabIdle } from './idle.js';
import type { FirstPaintPhase, WarmPhase } from './presentation-machine.js';

/**
 * One record per Tab. Every piece reads it; each field has one writer, and only that piece's
 * file holds the writable view of its fields (`Owned`). A re-keyed Tab is a new record that
 * carries every field over, so a closure holding the old one never sees the new one's state.
 */
export interface Tab {
  readonly id: string;

  /** The book's: which Project the Tab holds and what its chip says. */
  readonly workspacePath?: string;
  /** `done` never survives activation (ONL-2364). */
  readonly status?: TabStatus;
  readonly contextSource?: string;
  readonly isWorking: boolean;

  /** The view pool's: the renderer behind the Tab, asleep or awake, and its health. */
  readonly idle?: ReturnType<typeof createTabIdle>;
  /** Absent while cold: a restored or cooled tab is a chip with no renderer (ONL-2208, ONL-2210). */
  readonly view?: WebContentsView;
  readonly health?: TabHealth;

  /** The presentation's: where the Tab is on its way to the screen. Written only through `PresentationMachine.dispatch`. */
  readonly firstPaint?: FirstPaintPhase;
  /** The background warm of this Tab, while one is in flight; its only way out is `forgetWarm()` (ONL-3153). */
  readonly warming?: WarmPhase;
  /** The `failed` health this Tab shows was put there by a paint that never came. */
  readonly paintFailed?: true;
  /** When the press that is on its way to the screen began; every trace line is timed from it. */
  readonly presentationStartedAt?: number;
}

/** The writable view of the fields one piece owns. */
export type Owned<K extends keyof Tab> = { -readonly [P in K]: Tab[P] };
