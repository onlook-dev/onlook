import { beforeEach, describe, expect, it } from 'bun:test';
import type { GitSnapshotRow, TabsState } from '@studio/events';
import { measurement, row as fixtureRow } from '@studio/git-ui/measurement-fixtures';
import { createGitStatusCadence, type GitStatusCadence } from '../git-status/cadence.js';
import { visibleWorktree } from './visible.js';

const A = '/tmp/visible-tab/project-a';
const B = '/tmp/visible-tab/project-b';
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const FAST_POLL_MS = 30 * SECOND;

interface Check {
  at: number;
  path: string;
  trigger: string;
}

let now: number;
let timers: Map<number, { due: number; fn: () => void }>;
let checks: Check[];
let checksPassAt: Map<string, number>;
let cadence: GitStatusCadence;

function rowFor(path: string, trigger: GitSnapshotRow['trigger']): GitSnapshotRow {
  const passing = now >= (checksPassAt.get(path) ?? 0);
  return fixtureRow(measurement({}, { mergeStateStatus: 'CLEAN', checks: passing ? 'passing' : 'pending' }), {
    measuredAt: new Date(now).toISOString(),
    trigger,
    stale: false,
  });
}

function advanceTo(ms: number): void {
  for (;;) {
    const next = [...timers.entries()].sort((x, y) => x[1].due - y[1].due)[0];
    if (next === undefined || next[1].due > ms) break;
    timers.delete(next[0]);
    now = next[1].due;
    next[1].fn();
  }
  now = ms;
}

function broadcast(activeId: string | undefined, tabs: { id: string; workspacePath?: string }[]): void {
  const state: TabsState = {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      name: tab.id,
      purpose: tab.workspacePath === undefined ? 'projects' : 'project',
      ...(tab.workspacePath === undefined ? {} : { workspacePath: tab.workspacePath }),
    })),
    canCreate: true,
    isHome: activeId === 'home',
    ...(activeId === undefined ? {} : { activeId }),
  };
  cadence.aim(visibleWorktree(state));
}

const between = (from: number, to: number): Check[] => checks.filter((c) => c.at >= from && c.at <= to);

function firstPassingCheck(path: string): number | undefined {
  return checks.find((c) => c.path === path && c.at >= (checksPassAt.get(path) ?? 0))?.at;
}

beforeEach(() => {
  now = 0;
  timers = new Map();
  checks = [];
  checksPassAt = new Map();
  let id = 0;
  cadence = createGitStatusCadence({
    now: () => now,
    setTimer: (fn, ms) => {
      timers.set(++id, { due: now + ms, fn });
      return id;
    },
    clearTimer: (handle) => void timers.delete(handle as number),
    check: async (path, opts) => {
      checks.push({ at: now, path, trigger: opts.trigger });
      cadence.applied(path, rowFor(path, opts.trigger));
    },
  });
});

const home = { id: 'home' };
const tabA = { id: 'a', workspacePath: A };
const tabB = { id: 'b', workspacePath: B };

describe('the git poll follows the tab on screen (ONL-2561)', () => {
  it('leaving a project stops its checks; returning measures it within the fast poll and polls it until its checks pass', () => {
    checksPassAt.set(A, 10 * MINUTE);
    broadcast('a', [home, tabA, tabB]);
    advanceTo(2 * MINUTE);
    expect(between(0, 2 * MINUTE).every((c) => c.path === A)).toBe(true);

    broadcast('b', [home, tabA, tabB]);
    advanceTo(8 * MINUTE);
    const whileAway = between(2 * MINUTE + 1, 8 * MINUTE);
    expect(whileAway.length).toBeGreaterThan(0);
    expect(whileAway.every((c) => c.path === B)).toBe(true);

    broadcast('a', [home, tabA, tabB]);
    advanceTo(20 * MINUTE);
    const back = between(8 * MINUTE + 1, 20 * MINUTE);
    expect(back.every((c) => c.path === A)).toBe(true);
    expect(back[0]!.at - 8 * MINUTE).toBeLessThanOrEqual(FAST_POLL_MS);
    expect(firstPassingCheck(A)! - 10 * MINUTE).toBeLessThanOrEqual(FAST_POLL_MS);
  });

  it('a background tab landing a project or a Projects Screen never moves the target', () => {
    checksPassAt.set(A, 5 * MINUTE);
    broadcast('a', [home, tabA, { id: 'b' }]);
    advanceTo(MINUTE);
    broadcast('a', [home, tabA, tabB]);
    broadcast('a', [home, tabA, tabB, { id: 'c' }]);
    advanceTo(20 * MINUTE);

    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((c) => c.path === A)).toBe(true);
    expect(firstPassingCheck(A)! - 5 * MINUTE).toBeLessThanOrEqual(FAST_POLL_MS);
  });

  it('a Projects tab on screen polls nothing', () => {
    checksPassAt.set(A, 5 * MINUTE);
    broadcast('a', [home, tabA, tabB]);
    broadcast('home', [home, tabA, tabB]);
    checks.length = 0;
    advanceTo(20 * MINUTE);
    expect(checks).toEqual([]);
  });

  it('a broadcast that leaves the same tab on screen keeps the fast poll', () => {
    checksPassAt.set(A, 3 * MINUTE);
    for (let at = 0; at <= 3 * MINUTE; at += 5 * SECOND) {
      advanceTo(at);
      broadcast('a', [home, tabA, tabB]);
    }
    advanceTo(4 * MINUTE);
    const gaps = checks.slice(1).map((c, i) => c.at - checks[i]!.at);
    expect(gaps.every((gap) => gap <= FAST_POLL_MS)).toBe(true);
    expect(firstPassingCheck(A)).toBe(3 * MINUTE);
  });
});
