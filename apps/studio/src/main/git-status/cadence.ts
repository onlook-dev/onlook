import type { GitCadenceTrigger, GitSnapshotRow } from '@studio/events';
import { normalizePath } from '../workspace/store.js';
import { log } from '../log/index.js';

const logger = log('git-status');

/** gh's 5,000/hour budget is shared with the user's other tools. */
const GIT_STATUS_INTERVAL_MS = 5 * 60_000;
const GIT_STATUS_CEILING_MS = 30_000;
const GIT_STATUS_BACKOFF_CAP_MS = 40 * 60_000;
const GIT_STATUS_PENDING_STEPS: readonly { untilMs: number; everyMs: number }[] = [
  { untilMs: 3 * 60_000, everyMs: 30_000 },
  { untilMs: 15 * 60_000, everyMs: 60_000 },
];
/** Pending checks keep polling behind another app, where the user is watching them, at this floor. */
const GIT_STATUS_PENDING_BLURRED_MS = 2 * 60_000;

interface GitStatusCadenceCheck {
  trigger: GitCadenceTrigger;
  fetch: boolean;
}

export interface GitStatusCadenceDeps {
  check(worktreePath: string, opts: GitStatusCadenceCheck): Promise<void>;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  intervalMs?: number;
  ceilingMs?: number;
  backoffCapMs?: number;
  pendingSteps?: readonly { untilMs: number; everyMs: number }[];
  pendingBlurredMs?: number;
}

export interface GitStatusCadence {
  aim(worktreePath: string | undefined): void;
  focused(): void;
  blurred(): void;
  applied(worktreePath: string, row: GitSnapshotRow): void;
  dispose(): void;
}

export function createGitStatusCadence(deps: GitStatusCadenceDeps): GitStatusCadence {
  // Monotonic: under Date.now() a backward wall-clock jump holds the ceiling closed for the jump's span.
  const now = deps.now ?? (() => performance.now());
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const intervalMs = deps.intervalMs ?? GIT_STATUS_INTERVAL_MS;
  const ceilingMs = deps.ceilingMs ?? GIT_STATUS_CEILING_MS;
  const capMs = deps.backoffCapMs ?? GIT_STATUS_BACKOFF_CAP_MS;
  const pendingSteps = deps.pendingSteps ?? GIT_STATUS_PENDING_STEPS;
  const pendingBlurredMs = deps.pendingBlurredMs ?? GIT_STATUS_PENDING_BLURRED_MS;

  let activeRaw: string | undefined;
  let activeKey: string | undefined;
  // A driven never-shown window gets no focus event and still measures on open.
  let focused = true;
  let level = 0;
  let lastCompletedAt: number | undefined;
  let timer: unknown;
  let dueAt: number | undefined;
  let pausedMs: number | undefined;
  let pendingSince: number | undefined;
  let isLastRowStale = false;

  const isPendingClock = (): boolean => pendingSince !== undefined && !isLastRowStale;
  const pendingDelayMs = (): number | undefined => {
    if (pendingSince === undefined || isLastRowStale) return undefined;
    const elapsed = now() - pendingSince;
    const step = pendingSteps.find((candidate) => elapsed < candidate.untilMs);
    const every = step?.everyMs ?? intervalMs;
    return focused ? every : Math.max(every, pendingBlurredMs);
  };
  const delayMs = (): number => pendingDelayMs() ?? Math.min(intervalMs * 2 ** level, capMs);
  const isLive = (): boolean => activeRaw !== undefined && (focused || isPendingClock());
  const underCeiling = (): boolean => lastCompletedAt !== undefined && now() - lastCompletedAt < ceilingMs;

  const disarm = (): void => {
    if (timer === undefined) return;
    clearTimer(timer);
    timer = undefined;
  };

  const arm = (ms = delayMs()): void => {
    disarm();
    pausedMs = undefined;
    if (!isLive()) return;
    dueAt = now() + ms;
    timer = setTimer(tick, ms);
  };

  const tick = (): void => {
    const target = activeRaw;
    if (target === undefined || !isLive()) {
      timer = undefined;
      return;
    }
    if (underCeiling()) {
      arm();
      return;
    }
    timer = undefined;
    void deps
      .check(target, { trigger: 'interval', fetch: true })
      .catch((err: unknown) => logger.error('interval check failed', { error: err }))
      .finally(() => {
        // A sequence-gated run applies nothing, so `applied` may never re-arm.
        if (activeRaw === target && timer === undefined) arm();
      });
  };

  const checkOnArrival = (target: string): void => {
    arm();
    void deps
      .check(target, { trigger: 'activate', fetch: false })
      .catch((err: unknown) => logger.error('activation check failed', { error: err }));
  };

  return {
    aim: (worktreePath) => {
      if (worktreePath === undefined) {
        activeRaw = undefined;
        activeKey = undefined;
        pausedMs = undefined;
        disarm();
        return;
      }
      // Every tabs broadcast aims, a working or status flip included; a repeat keeps the pending clock.
      if (worktreePath === activeRaw) return;
      const key = normalizePath(worktreePath);
      activeRaw = worktreePath;
      if (key === activeKey) return;
      activeKey = key;
      level = 0;
      pendingSince = undefined;
      isLastRowStale = false;
      pausedMs = undefined;
      if (!focused) {
        arm();
        return;
      }
      if (!underCeiling() || lastCompletedAt === undefined) {
        checkOnArrival(worktreePath);
        return;
      }
      // Deferred, not skipped: a skipped check leaves the pill on the full interval.
      disarm();
      const waitMs = ceilingMs - (now() - lastCompletedAt);
      dueAt = now() + waitMs;
      timer = setTimer(() => {
        timer = undefined;
        if (activeRaw === worktreePath && focused) checkOnArrival(worktreePath);
      }, waitMs);
    },
    focused: () => {
      if (focused) return;
      focused = true;
      if (activeRaw !== undefined && !underCeiling()) {
        void deps
          .check(activeRaw, { trigger: 'focus', fetch: false })
          .catch((err: unknown) => logger.error('focus check failed', { error: err }));
      }
      // A pending clock ran on the slow blurred step; the fast one resumes now.
      if (isPendingClock()) arm();
      else if (timer === undefined) arm(pausedMs);
    },
    blurred: () => {
      if (!focused) return;
      focused = false;
      if (isPendingClock()) {
        arm();
        return;
      }
      if (timer !== undefined && dueAt !== undefined) pausedMs = Math.max(0, dueAt - now());
      disarm();
    },
    applied: (worktreePath, row) => {
      if (activeKey === undefined) return;
      // `normalizePath` is a blocking realpath syscall; the raw compare skips it on every applied row.
      if (worktreePath !== activeRaw && normalizePath(worktreePath) !== activeKey) return;
      lastCompletedAt = now();
      isLastRowStale = row.stale === true;
      // A stale row is gh failing, not checks moving: it keeps the backoff, and the pending clock waits for a real answer.
      if (!row.stale) {
        const isPending = row.measurement.pr?.checks === 'pending';
        if (!isPending) pendingSince = undefined;
        else pendingSince ??= now();
      }
      if (row.trigger === 'open' || row.trigger === 'turn-end' || !row.stale) level = 0;
      else if (delayMs() < capMs) level += 1;
      if ((row.trigger !== 'focus' && row.trigger !== 'activate') || isPendingClock()) arm();
    },
    dispose: () => {
      activeRaw = undefined;
      activeKey = undefined;
      pausedMs = undefined;
      disarm();
    },
  };
}

let cadence: GitStatusCadence | undefined;

export function registerGitStatusCadence(deps: GitStatusCadenceDeps): GitStatusCadence {
  cadence = createGitStatusCadence(deps);
  return cadence;
}

export function gitStatusCadence(): GitStatusCadence | undefined {
  return cadence;
}
