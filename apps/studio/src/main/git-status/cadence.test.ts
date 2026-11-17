import { beforeEach, describe, expect, it } from 'bun:test';
import type { GitSnapshotRow } from '@studio/events';
import { MEASUREMENT_FIXTURES, row as fixtureRow } from '@studio/git-ui/measurement-fixtures';
import { createGitStatusCadence, type GitStatusCadence } from './cadence.js';

interface ArmedTimer {
  id: number;
  fn: () => void;
  ms: number;
  cleared: boolean;
}

interface CheckCall {
  worktreePath: string;
  trigger: string;
  fetch: boolean;
}

let nowMs: number;
let timers: ArmedTimer[];
let checks: CheckCall[];
let nextTimerId: number;

function armed(): ArmedTimer[] {
  return timers.filter((t) => !t.cleared);
}

function fireNext(): void {
  const timer = armed()[0];
  if (timer === undefined) throw new Error('no armed timer to fire');
  timer.cleared = true;
  nowMs += timer.ms;
  timer.fn();
}

function makeCadence(
  overrides: {
    intervalMs?: number;
    ceilingMs?: number;
    backoffCapMs?: number;
    check?: (worktreePath: string, opts: { trigger: string; fetch: boolean }) => Promise<void>;
  } = {},
): GitStatusCadence {
  return createGitStatusCadence({
    check: (worktreePath, opts) => {
      checks.push({ worktreePath, trigger: opts.trigger, fetch: opts.fetch });
      return overrides.check === undefined ? Promise.resolve() : overrides.check(worktreePath, opts);
    },
    now: () => nowMs,
    setTimer: (fn, ms) => {
      const timer: ArmedTimer = { id: nextTimerId++, fn, ms, cleared: false };
      timers.push(timer);
      return timer.id;
    },
    clearTimer: (handle) => {
      const timer = timers.find((t) => t.id === handle);
      if (timer !== undefined) timer.cleared = true;
    },
    intervalMs: overrides.intervalMs ?? 1_000,
    ceilingMs: overrides.ceilingMs ?? 300,
    backoffCapMs: overrides.backoffCapMs ?? 8_000,
    pendingSteps: [
      { untilMs: 1_000, everyMs: 100 },
      { untilMs: 3_000, everyMs: 200 },
    ],
    pendingBlurredMs: 500,
  });
}

function row(trigger: GitSnapshotRow['trigger'], stale = false): GitSnapshotRow {
  return fixtureRow(MEASUREMENT_FIXTURES['local-only'], { measuredAt: new Date(nowMs).toISOString(), trigger, stale });
}

function pendingRow(trigger: GitSnapshotRow['trigger'], stale = false): GitSnapshotRow {
  return fixtureRow(MEASUREMENT_FIXTURES['checks-running'], { measuredAt: new Date(nowMs).toISOString(), trigger, stale });
}

const worktree = '/tmp/cadence-worktree';

beforeEach(() => {
  nowMs = 1_000_000;
  timers = [];
  checks = [];
  nextTimerId = 1;
});

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function arrive(cadence: GitStatusCadence, worktreePath: string): void {
  const before = checks.length;
  cadence.aim(worktreePath);
  expect(checks.slice(before)).toEqual([{ worktreePath, trigger: 'activate', fetch: false }]);
  checks.length = before;
}

describe('git-status cadence', () => {
  it('arms no timer without an active worktree; arriving at one checks it once, unfetched, and arms the interval', () => {
    const cadence = makeCadence();
    expect(armed()).toHaveLength(0);
    cadence.aim(worktree);
    expect(checks).toEqual([{ worktreePath: worktree, trigger: 'activate', fetch: false }]);
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(1_000);
  });

  it('aiming at the same worktree again checks nothing and keeps the pending clock', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, pendingRow('activate'));
    expect(armed().at(-1)?.ms).toBe(100);
    nowMs += 50;
    cadence.aim(worktree);
    expect(checks).toHaveLength(0);
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(100);
  });

  it('arriving within the ceiling defers the check to the ceiling, not the interval', async () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, row('turn-end'));
    nowMs += 100;
    const other = '/tmp/cadence-other';
    cadence.aim(other);
    expect(checks).toHaveLength(0);
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(200);
    fireNext();
    await settle();
    expect(checks).toEqual([{ worktreePath: other, trigger: 'activate', fetch: false }]);
    expect(armed()[0]?.ms).toBe(1_000);
  });

  it('arriving behind another app checks nothing until focus returns', () => {
    const cadence = makeCadence();
    cadence.blurred();
    cadence.aim(worktree);
    expect(checks).toHaveLength(0);
    expect(armed()).toHaveLength(0);
    cadence.focused();
    expect(checks).toEqual([{ worktreePath: worktree, trigger: 'focus', fetch: false }]);
    expect(armed()).toHaveLength(1);
  });

  it('an activation row re-arms only while checks are pending', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    nowMs += 400;
    cadence.applied(worktree, row('activate'));
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(1_000);
    cadence.applied(worktree, pendingRow('activate'));
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(100);
  });

  it('an interval tick runs a fetching interval check and re-arms', async () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, row('open'));
    nowMs += 1_000;
    timers.length = 0;
    cadence.applied(worktree, row('turn-end'));
    fireNext();
    await settle();
    expect(checks).toEqual([{ worktreePath: worktree, trigger: 'interval', fetch: true }]);
    expect(armed()).toHaveLength(1);
  });

  it('no runs while blurred; focus regain runs one non-fetching check and resumes the paused interval', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, row('open'));
    nowMs += 400;
    cadence.blurred();
    expect(armed()).toHaveLength(0);
    nowMs += 3 * 1_000;
    expect(checks).toHaveLength(0);
    cadence.focused();
    expect(checks).toEqual([{ worktreePath: worktree, trigger: 'focus', fetch: false }]);
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(600);
  });

  it('an interval fetch fires after one interval of accumulated focused time across blur/focus cycles', async () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    const fetches = (): CheckCall[] => checks.filter((c) => c.fetch);
    for (let cycle = 0; cycle < 4; cycle += 1) {
      nowMs += 200;
      cadence.blurred();
      nowMs += 5_000;
      cadence.focused();
      expect(fetches()).toHaveLength(0);
    }
    expect(checks.filter((c) => c.trigger === 'focus')).toHaveLength(4);
    expect(armed()[0]?.ms).toBe(200);
    fireNext();
    await settle();
    expect(fetches()).toEqual([{ worktreePath: worktree, trigger: 'interval', fetch: true }]);
  });

  it('a focus row stamps the ceiling but never restarts the interval', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    nowMs += 700;
    cadence.blurred();
    cadence.focused();
    cadence.applied(worktree, row('focus'));
    expect(armed()).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(300);
    nowMs += 100;
    cadence.blurred();
    cadence.focused();
    expect(checks.filter((c) => c.trigger === 'focus')).toHaveLength(1);
    expect(armed()[0]?.ms).toBe(200);
  });

  it('a key moment while blurred discards the paused remainder; focus regain arms a full interval', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    nowMs += 700;
    cadence.blurred();
    cadence.applied(worktree, row('turn-end'));
    expect(armed()).toHaveLength(0);
    nowMs += 1_000;
    cadence.focused();
    expect(armed()[0]?.ms).toBe(1_000);
  });

  it('a tick landing under the ceiling skips and re-arms', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    const tick = armed()[0];
    if (tick === undefined) throw new Error('expected a timer');
    cadence.applied(worktree, row('turn-end'));
    nowMs += 100;
    tick.cleared = true;
    tick.fn();
    expect(checks).toHaveLength(0);
    expect(armed()).toHaveLength(1);
  });

  it('a REPEATED focus signal costs nothing — main reports it from two sources (ONL-2222)', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    nowMs += 1_000;
    cadence.blurred();
    cadence.focused();
    cadence.focused();
    expect(checks.filter((c) => c.trigger === 'focus')).toHaveLength(1);
  });

  it('a REPEATED blur signal does not re-pause a shorter remainder (ONL-2222)', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    nowMs += 700;
    cadence.blurred();
    nowMs += 500;
    cadence.blurred();
    cadence.focused();
    expect(armed()[0]?.ms).toBe(300);
  });

  it('stale applies double the gap to the cap; a key moment resets it', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, row('interval', true));
    expect(armed().at(-1)?.ms).toBe(2_000);
    cadence.applied(worktree, row('interval', true));
    expect(armed().at(-1)?.ms).toBe(4_000);
    cadence.applied(worktree, row('interval', true));
    expect(armed().at(-1)?.ms).toBe(8_000);
    cadence.applied(worktree, row('interval', true));
    expect(armed().at(-1)?.ms).toBe(8_000);
    cadence.applied(worktree, row('turn-end', true));
    expect(armed().at(-1)?.ms).toBe(1_000);
  });

  it('a successful interval apply resets accumulated backoff', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied(worktree, row('interval', true));
    cadence.applied(worktree, row('interval', true));
    cadence.applied(worktree, row('interval'));
    cadence.applied(worktree, row('turn-end'));
    expect(armed().at(-1)?.ms).toBe(1_000);
  });

  it('aiming at nothing disarms; aiming at another worktree re-targets it', async () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.aim(undefined);
    expect(armed()).toHaveLength(0);

    const other = '/tmp/cadence-other';
    arrive(cadence, other);
    cadence.applied(other, row('open'));
    nowMs += 1_000;
    timers.length = 0;
    cadence.applied(other, row('turn-end'));
    fireNext();
    await settle();
    expect(checks).toEqual([{ worktreePath: other, trigger: 'interval', fetch: true }]);
  });

  it('a check resolving after a project switch never re-arms for the old worktree', async () => {
    let release: (() => void) | undefined;
    const cadence = makeCadence({ check: () => new Promise<void>((resolve) => { release = resolve; }) });
    arrive(cadence, worktree);
    cadence.applied(worktree, row('open'));
    nowMs += 1_000;
    timers.length = 0;
    cadence.applied(worktree, row('turn-end'));
    fireNext();
    const releaseOld = release;

    const other = '/tmp/cadence-other';
    arrive(cadence, other);
    const armedForOther = armed().length;
    releaseOld?.();
    await settle();
    expect(armed()).toHaveLength(armedForOther);

    cadence.aim(undefined);
    expect(armed()).toHaveLength(0);
    release = undefined;
  });

  it('an applied row for a non-active worktree is ignored', () => {
    const cadence = makeCadence();
    arrive(cadence, worktree);
    cadence.applied('/tmp/somewhere-else', row('interval', true));
    expect(armed().at(-1)?.ms).toBe(1_000);
    nowMs += 1_000;
    cadence.blurred();
    cadence.focused();
    expect(checks.filter((c) => c.trigger === 'focus')).toHaveLength(1);
  });

  describe('while checks are pending (ONL-2313)', () => {
    it('polls fast, then eases through the steps back to the interval', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      expect(armed().at(-1)?.ms).toBe(100);
      nowMs += 1_500;
      cadence.applied(worktree, pendingRow('interval'));
      expect(armed().at(-1)?.ms).toBe(200);
      nowMs += 2_000;
      cadence.applied(worktree, pendingRow('interval'));
      expect(armed().at(-1)?.ms).toBe(1_000);
    });

    it('keeps a slow clock behind another app, and resumes the fast one on return', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      cadence.blurred();
      expect(armed()).toHaveLength(1);
      expect(armed()[0]?.ms).toBe(500);
      cadence.focused();
      expect(armed()).toHaveLength(1);
      expect(armed()[0]?.ms).toBe(100);
    });

    it('a blurred pending tick still checks', async () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      cadence.blurred();
      fireNext();
      await settle();
      expect(checks).toEqual([{ worktreePath: worktree, trigger: 'interval', fetch: true }]);
    });

    it('checks settling returns to the plain interval, and blur pauses again', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      nowMs += 400;
      cadence.applied(worktree, row('interval'));
      expect(armed().at(-1)?.ms).toBe(1_000);
      cadence.blurred();
      expect(armed()).toHaveLength(0);
    });

    it('a stale row is gh failing, not checks moving: it starts no fast clock', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('interval', true));
      expect(armed().at(-1)?.ms).toBe(2_000);
    });

    it('gh failing after checks were pending takes the backoff, and blur pauses again', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      expect(armed().at(-1)?.ms).toBe(100);
      cadence.applied(worktree, pendingRow('interval', true));
      expect(armed().at(-1)?.ms).toBe(2_000);
      cadence.applied(worktree, pendingRow('interval', true));
      expect(armed().at(-1)?.ms).toBe(4_000);
      cadence.blurred();
      expect(armed()).toHaveLength(0);
    });

    it('a fresh pending answer after gh recovers resumes the fast clock', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      cadence.applied(worktree, pendingRow('interval', true));
      cadence.applied(worktree, pendingRow('interval'));
      expect(armed().at(-1)?.ms).toBe(100);
    });

    it('switching worktrees forgets the pending clock', () => {
      const cadence = makeCadence();
      arrive(cadence, worktree);
      cadence.applied(worktree, pendingRow('open'));
      nowMs += 300;
      arrive(cadence, '/tmp/another-worktree');
      expect(armed().at(-1)?.ms).toBe(1_000);
    });
  });
});
