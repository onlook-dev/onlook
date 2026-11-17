import { describe, expect, it } from 'bun:test';
import { parseCwdListing, sweepWorktree, type SweepDeps, type SweepProcess } from './sweep.js';
import { parseWindowsProcesses } from './windows.js';

const ROOT = '/Users/dev/Library/Application Support/Studio/workspaces';
const WORKTREE = `${ROOT}/github-com-fixture-app/teal-skylark`;
const SOURCE = '/Users/dev/Repos/app';

function harness(running: readonly SweepProcess[], over: Partial<SweepDeps> = {}) {
  const killed: number[] = [];
  const deps: SweepDeps = {
    running: () => running,
    kill: (pid) => { killed.push(pid); },
    self: -1,
    ...over,
  };
  return { killed, run: (worktree = WORKTREE, root = ROOT) => sweepWorktree(worktree, root, deps) };
}

const proc = (pid: number, cwd: string): SweepProcess => ({ pid, cwd });
const ME = process.pid;

describe('the worktree is the lifecycle boundary (ONL-2209)', () => {
  it('ends a process whose cwd is inside the worktree', async () => {
    const h = harness([proc(ME, `${WORKTREE}/apps/web`)]);

    expect(await h.run()).toBe(1);
    expect(h.killed).toEqual([ME]);
  });

  it('ends one running at the worktree root itself', async () => {
    const h = harness([proc(ME, WORKTREE)]);

    expect(await h.run()).toBe(1);
  });

  it('NEVER ends the user own server, which runs from their source checkout', async () => {
    const h = harness([proc(ME, SOURCE), proc(ME, `${SOURCE}/apps/web`)]);

    expect(await h.run()).toBe(0);
    expect(h.killed).toEqual([]);
  });

  it('never ends a sibling worktree that shares a path prefix', async () => {
    const h = harness([proc(ME, `${WORKTREE}-two/apps/web`)]);

    expect(await h.run()).toBe(0);
  });

  it('never ends another project worktree under the same root', async () => {
    const h = harness([proc(ME, `${ROOT}/github-com-fixture-other/amber-heron`)]);

    expect(await h.run()).toBe(0);
  });
});

describe('the refusal that makes it safe', () => {
  it('refuses a target outside the workspace root', async () => {
    const h = harness([proc(ME, `${SOURCE}/apps/web`)]);

    expect(await h.run(SOURCE, ROOT)).toBe(0);
    expect(h.killed).toEqual([]);
  });

  it('refuses a traversal that climbs out of the root', async () => {
    const h = harness([proc(ME, SOURCE)]);

    expect(await h.run(`${ROOT}/../../Repos/app`, ROOT)).toBe(0);
  });
});

describe('what it skips', () => {
  it('never signals itself', async () => {
    const h = harness([proc(ME, WORKTREE)], { self: ME });

    expect(await h.run()).toBe(0);
  });

  it('never signals pid 1 or below', async () => {
    const h = harness([proc(1, WORKTREE), proc(0, WORKTREE)]);

    expect(await h.run()).toBe(0);
  });

  it('counts nothing when a kill throws — the process exited between the listing and the signal', async () => {
    const h = harness([proc(ME, WORKTREE)], {
      kill: () => {
        throw new Error('ESRCH');
      },
    });

    expect(await h.run()).toBe(0);
  });

  it('skips a pid that is already gone', async () => {
    // 2^22 is above every real pid_max, so `isAlive` answers false.
    const h = harness([proc(4_194_304, WORKTREE)]);

    expect(await h.run()).toBe(0);
  });
});

describe('reading the cwd listing', () => {
  it('pairs each pid record with the cwd that follows it', () => {
    expect(parseCwdListing('p101\nn/a/one\np202\nn/a/two\n')).toEqual([
      { pid: 101, cwd: '/a/one' },
      { pid: 202, cwd: '/a/two' },
    ]);
  });

  it('keeps a path containing spaces whole', () => {
    expect(parseCwdListing('p101\nn/Users/dev/Application Support/w\n')).toEqual([
      { pid: 101, cwd: '/Users/dev/Application Support/w' },
    ]);
  });

  it('drops a cwd with no pid before it', () => {
    expect(parseCwdListing('n/a/orphan\np101\nn/a/one\n')).toEqual([{ pid: 101, cwd: '/a/one' }]);
  });

  it('drops a record whose pid does not parse', () => {
    expect(parseCwdListing('pxyz\nn/a/one\n')).toEqual([]);
  });

  it('answers empty for empty output, so a failed listing sweeps nothing', () => {
    expect(parseCwdListing('')).toEqual([]);
  });

  it('ignores field types it was not asked for', () => {
    expect(parseCwdListing('p101\ncnode\nn/a/one\n')).toEqual([{ pid: 101, cwd: '/a/one' }]);
  });
});

describe('Windows process identity revalidation', () => {
  const candidate: SweepProcess = { pid: ME, cwd: WORKTREE, creationTime: '134052000000000001' };

  it('terminates a process only when its fresh identity and cwd still match', async () => {
    const inspected: number[] = [];
    const h = harness([candidate], {
      inspect: (pid) => { inspected.push(pid); return { ...candidate }; },
    });

    expect(await h.run()).toBe(1);
    expect(inspected).toEqual([ME]);
    expect(h.killed).toEqual([ME]);
  });

  it('skips a snapshot without a creation identity', async () => {
    const inspected: number[] = [];
    const h = harness([proc(ME, WORKTREE)], {
      inspect: (pid) => { inspected.push(pid); return candidate; },
    });

    expect(await h.run()).toBe(0);
    expect(inspected).toEqual([]);
    expect(h.killed).toEqual([]);
  });

  it.each([
    ['unreadable', undefined],
    ['missing creation identity', { pid: ME, cwd: WORKTREE }],
    ['reused pid', { ...candidate, creationTime: '134052000000000002' }],
    ['different pid', { ...candidate, pid: process.ppid }],
    ['foreign cwd', { ...candidate, cwd: SOURCE }],
    ['changed cwd within the worktree', { ...candidate, cwd: `${WORKTREE}/apps/web` }],
  ] satisfies Array<[string, SweepProcess | undefined]>)('skips a fresh process with %s', async (_name, fresh) => {
    const h = harness([candidate], { inspect: () => fresh });

    expect(await h.run()).toBe(0);
    expect(h.killed).toEqual([]);
  });

  it('skips a process when reinspection fails', async () => {
    const h = harness([candidate], {
      inspect: () => { throw new Error('access denied'); },
    });

    expect(await h.run()).toBe(0);
    expect(h.killed).toEqual([]);
  });

  it.each(['identity', 'cwd'] as const)('rechecks a later process after an asynchronous kill changes its %s', async (changed) => {
    const later = { ...candidate, pid: process.ppid };
    let freshLater = { ...later };
    let release!: () => void;
    let started!: () => void;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    const killing = new Promise<void>((resolve) => { started = resolve; });
    const inspected: number[] = [];
    const killed: number[] = [];
    const h = harness([candidate, later], {
      inspect: (pid) => {
        inspected.push(pid);
        return pid === candidate.pid ? { ...candidate } : freshLater;
      },
      kill: async (pid) => {
        killed.push(pid);
        started();
        await waiting;
      },
    });

    const sweeping = h.run();
    await killing;
    freshLater = changed === 'identity'
      ? { ...later, creationTime: '134052000000000002' }
      : { ...later, cwd: SOURCE };
    release();

    expect(await sweeping).toBe(1);
    expect(inspected).toEqual([ME, process.ppid]);
    expect(killed).toEqual([ME]);
  });

  it('keeps creation timestamps exact and drops malformed timestamps', () => {
    const identity = { ...candidate, cwd: 'C:\\Projects\\Studio', command: 'node', ports: [3000] };
    expect(parseWindowsProcesses(JSON.stringify([
      identity,
      { ...identity, creationTime: Number(identity.creationTime) },
      { ...identity, creationTime: '' },
      { ...identity, creationTime: '0' },
      { ...identity, creationTime: '-1' },
    ]))).toEqual([identity]);
  });
});
