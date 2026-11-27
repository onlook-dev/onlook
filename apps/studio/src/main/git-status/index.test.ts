import { chmodSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import {
  GIT_PILL_SHIPPED_DEFAULTS,
  type GitMeasurement,
  type GitStatusChange,
  type WorkspaceCreated,
} from '@studio/events';
import {
  cleanupTempFixtures,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { derivePillState } from '@studio/git-ui/derive';
import { forgetProject, normalizePath, rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { readGitPillDefaults, resetGitPillDefaultsCache, writeGitPillDefaults } from './defaults.js';
import { createGitStatusHost, type GitStatusHostDeps } from './index.js';
import type { MeasureOutcome, MeasureOptions } from './measure.js';
import { forgetGitStatusRow, gitStatusRowFor, reopenGitStatusRow, resetGitStatusCache, writeGitStatusRow } from './store.js';
import { githubBackendFixture } from '../github-import/backend-fixtures.js';
import type { GithubBackend } from '../github-import/backend.js';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

it('refreshes every project after a connection change, without fetching', async () => {
  const other = join(workspaceRootDir, 'repo', 'other-design');
  mkdirSync(other, { recursive: true });
  rememberProject({ ...workspaceRecord(other), workspaceName: 'other-design', branchName: 'user/other-design' });
  const measured: Array<{ path: string; fetch: boolean }> = [];
  const host = createGitStatusHost({
    emit: () => {},
    measure: async (path, options) => { measured.push({ path, fetch: options.fetch }); return { measurement: facts(), fetched: undefined }; },
  });
  await host.connectionChanged();
  expect(measured.map(({ path }) => path).sort()).toEqual([worktree, other].sort());
  expect(measured.every(({ fetch }) => fetch === false)).toBe(true);
});

it('drops an old account’s in-flight result and partial cache on connection change', async () => {
  const { host, calls, emitted } = harness();
  const opened = host.opened(worktree);
  await settle();
  const refreshed = host.connectionChanged();
  calls[0]!.resolve({ measurement: facts({ ghAccount: 'previous-account' }), fetched: true });
  await opened;
  await settle();
  expect(emitted).toHaveLength(1);
  expect(emitted[0]!.row.invalidated).toBe(true);
  expect(emitted[0]!.row.measurement.ghAccount).toBeUndefined();
  calls[1]!.resolve({ measurement: facts({ ghAuthed: false, ghAccount: undefined, partial: true, access: 'unknown' }), fetched: undefined });
  await refreshed;
  expect(emitted).toHaveLength(2);
  expect(emitted[1]!.row.measurement.ghAccount).toBeUndefined();
  expect(emitted[1]!.row.measurement.ghAuthed).toBe(false);
});

it.each(['rejection', 'deadline'] as const)('keeps connection invalidation until fresh facts arrive after a %s', async (failure) => {
  const { host, calls, emitted } = harness({ deadlineMs: failure === 'deadline' ? 5 : 30_000 });
  const refreshed = host.connectionChanged();
  if (failure === 'rejection') calls[0]!.reject(new Error('read failed'));
  await refreshed;
  expect(emitted).toHaveLength(2);
  expect(emitted.every(({ row }) => row.invalidated === true)).toBe(true);
  expect(gitStatusRowFor(worktree)?.invalidated).toBe(true);
  if (failure === 'deadline') {
    calls[0]!.resolve({ measurement: facts(), fetched: undefined });
    await settle();
  } else {
    const retry = host.check(worktree, { trigger: 'focus', fetch: false });
    calls[1]!.resolve({ measurement: facts(), fetched: undefined });
    await retry;
  }
  expect(gitStatusRowFor(worktree)?.invalidated).toBeUndefined();
});

afterAll(() => {
  restoreWorkspaceRoot();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let workspaceRootDir: string;
let worktree: string;

beforeEach(() => {
  workspaceRootDir = makeWorkspaceRoot({ name: 'git-status' });
  process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRootDir;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'git-status' });
  resetWorkspaceCache();
  resetGitStatusCache();
  resetGitPillDefaultsCache();
  worktree = join(workspaceRootDir, 'repo', 'teal-skylark');
  mkdirSync(worktree, { recursive: true });
  rememberProject(workspaceRecord(worktree));
});

function workspaceRecord(workspacePath: string): WorkspaceCreated {
  return {
    workspacePath,
    workspaceName: 'teal-skylark',
    branchName: 'user/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'repo',
    sourcePath: '/nowhere/repo',
    sourceRepoRoot: '/nowhere/repo',
    repoIdentity: 'repo',
    copiedEnvFiles: [],
  };
}

const facts = (over: Partial<GitMeasurement> = {}): GitMeasurement => ({
  gitInstalled: true,
  ghInstalled: true,
  ghAuthed: true,
  origin: 'github',
  repo: 'acme/repo',
  access: 'granted',
  branch: 'user/teal-skylark',
  head: 'branch',
  baseBranch: 'main',
  baseExists: true,
  ahead: 1,
  behind: 0,
  dirty: false,
  aheadOfUpstream: false,
  ...over,
});

interface Call {
  options: MeasureOptions;
  resolve: (outcome: MeasureOutcome) => void;
  reject: (err: unknown) => void;
}

function harness(over: Partial<GitStatusHostDeps> = {}) {
  const calls: Call[] = [];
  const emitted: GitStatusChange[] = [];
  let tick = 0;
  const host = createGitStatusHost({
    emit: (change) => emitted.push(change),
    measure: (_worktree, options) =>
      new Promise<MeasureOutcome>((resolve, reject) => {
        calls.push({ options, resolve, reject });
      }),
    now: () => new Date(Date.UTC(2026, 7, 28, 12, 0, tick++)),
    ...over,
  });
  return { host, calls, emitted };
}

afterEach(() => {
  jest.useRealTimers();
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (): Promise<void> => sleep(0);

it('does not apply an old measurement to a newly registered Project at the same path', async () => {
  const { host, calls, emitted } = harness();
  const old = host.opened(worktree);
  forgetGitStatusRow(worktree);
  forgetProject(worktree);
  rememberProject(workspaceRecord(worktree));
  reopenGitStatusRow(worktree);
  calls[0]!.resolve({ measurement: facts({ ahead: 99 }), fetched: true });
  await old;
  await settle();
  expect(emitted).toEqual([]);
  expect(gitStatusRowFor(worktree)).toBeUndefined();
  const current = host.opened(worktree);
  calls[1]!.resolve({ measurement: facts({ ahead: 2 }), fetched: true });
  await current;
  expect(gitStatusRowFor(worktree)?.measurement.ahead).toBe(2);
});

it('keeps an in-flight measurement valid across an existing Project metadata refresh', async () => {
  const { host, calls, emitted } = harness();
  const pending = host.opened(worktree);
  rememberProject({ ...workspaceRecord(worktree), sourceRepoName: 'renamed' });
  calls[0]!.resolve({ measurement: facts({ ahead: 3 }), fetched: true });
  await pending;
  expect(emitted).toHaveLength(1);
  expect(gitStatusRowFor(worktree)?.measurement.ahead).toBe(3);
});

it('drops an old queued follow-up rather than measuring the newly registered Project', async () => {
  const { host, calls, emitted } = harness();
  const old = host.opened(worktree);
  const pending = host.turnEnded(worktree);
  forgetGitStatusRow(worktree);
  forgetProject(worktree);
  rememberProject(workspaceRecord(worktree));
  reopenGitStatusRow(worktree);
  calls[0]!.resolve({ measurement: facts(), fetched: true });
  await Promise.all([old, pending]);
  await settle();
  expect(calls).toHaveLength(1);
  expect(emitted).toEqual([]);
});

it('reports the fresh measured denial and failed refresh through the real telemetry producer without retained facts or identity', async () => {
  const savedKey = process.env['STUDIO_POSTHOG_KEY'];
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  setAppForTesting({ getPath: () => process.env['STUDIO_STATE_ROOT']!, getVersion: () => 'triage-test', getLocale: () => 'en-US', isPackaged: false });
  resetTelemetryForTesting();
  try {
    initTelemetry();
    const { host, calls } = harness();
    const first = host.opened(worktree);
    calls[0]!.resolve({ measurement: facts({ access: 'denied', accessReason: 'read-only' }), fetched: true, via: 'account' });
    await first;
    await settle();
    const second = host.check(worktree, { trigger: 'focus', fetch: false });
    calls[1]!.reject(new Error('private-path private-account private-repo'));
    await second;
    const captured = peekQueueForTesting().filter((event) => event.event === 'git_state_measured');
    expect(captured).toHaveLength(2);
    expect(captured[0]!.properties).toMatchObject({ reason: 'read-only', gh_installed: true, gh_authenticated: true, ahead: 1, behind: 0, reader: 'account' });
    expect(captured[1]!.properties).toMatchObject({ reason: 'measurement-unavailable', gh_installed: null, gh_authenticated: null, ahead: null, behind: null, reader: null });
    expect(captured[0]!.properties['project_id']).toMatch(/^[0-9a-f]{16}$/);
    for (const privateValue of ['teal-skylark', 'acme/repo', 'private-', workspaceRootDir]) expect(JSON.stringify(captured)).not.toContain(privateValue);
  } finally {
    resetTelemetryForTesting();
    setAppForTesting(undefined);
    if (savedKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
    else process.env['STUDIO_POSTHOG_KEY'] = savedKey;
  }
});

describe('the connection the saved rows were measured for', () => {
  const seeded = async (over: Partial<GitMeasurement>, backend?: GithubBackend) => {
    const context = harness({ backend: () => backend });
    const open = context.host.opened(worktree);
    await settle();
    context.calls[0]!.resolve({ measurement: facts(over), fetched: true });
    await open;
    return context;
  };
  const MEASURED_FOR_DESIGNER = { ghAccount: 'designer', connectionAccount: 'designer' };

  it('re-reads nothing when the live connection names the account the rows were measured for', async () => {
    const { host, calls } = await seeded(MEASURED_FOR_DESIGNER, githubBackendFixture('connected'));
    await host.refreshForConnection();
    expect(calls).toHaveLength(1);
    expect(gitStatusRowFor(worktree)?.invalidated).toBeUndefined();
  });

  it('invalidates and re-reads every project when the live connection names another account', async () => {
    const { host, calls, emitted } = await seeded({ ghAccount: 'someone', connectionAccount: 'someone' }, githubBackendFixture('connected'));
    const refreshed = host.refreshForConnection();
    await settle();
    expect(calls).toHaveLength(2);
    expect(emitted.at(-1)?.row.invalidated).toBe(true);
    calls[1]!.resolve({ measurement: facts(MEASURED_FOR_DESIGNER), fetched: false });
    await refreshed;
    expect(gitStatusRowFor(worktree)?.measurement.connectionAccount).toBe('designer');
  });

  it('takes the identity the caller already read rather than reading it again', async () => {
    const backend = githubBackendFixture('connected');
    let reads = 0;
    backend.identity = async () => { reads += 1; return { status: 'connected', account: 'designer' }; };
    const { host, calls } = await seeded({ ghAccount: 'someone', connectionAccount: 'someone' }, backend);
    const refreshed = host.refreshForConnection({ status: 'connected', account: 'someone-else' });
    await settle();
    expect(reads).toBe(0);
    expect(calls).toHaveLength(2);
    calls[1]!.resolve({ measurement: facts(), fetched: false });
    await refreshed;
  });

  it('re-reads nothing when no saved row names an account', async () => {
    const { host, calls } = await seeded({ ghAccount: 'wrenquill' }, githubBackendFixture('connected'));
    await host.refreshForConnection();
    expect(calls).toHaveLength(1);
    expect(gitStatusRowFor(worktree)?.invalidated).toBeUndefined();
  });

  it('re-reads nothing with no saved rows at all', async () => {
    const { host, calls } = harness({ backend: () => githubBackendFixture('connected') });
    await host.refreshForConnection();
    expect(calls).toEqual([]);
  });

  it('re-reads nothing when the identity read cannot answer', async () => {
    const { host, calls } = await seeded(MEASURED_FOR_DESIGNER, githubBackendFixture('unavailable'));
    await host.refreshForConnection();
    expect(calls).toHaveLength(1);
  });

  for (const gone of [{ status: 'disconnected' }, { status: 'reconnect', reason: 'revoked' }] as const) {
    it(`invalidates when the connection answers ${gone.status} and the rows name an account`, async () => {
      const backend = githubBackendFixture('connected');
      backend.identity = async () => gone;
      const { host, calls } = await seeded(MEASURED_FOR_DESIGNER, backend);
      const refreshed = host.refreshForConnection();
      await settle();
      expect(calls).toHaveLength(2);
      calls[1]!.resolve({ measurement: facts({ ghAuthed: false }), fetched: false });
      await refreshed;
    });
  }

  it('re-reads a row a quit left invalidated, once, even though the account agrees', async () => {
    const { host, calls } = await seeded(MEASURED_FOR_DESIGNER, githubBackendFixture('connected'));
    reopenGitStatusRow(worktree);
    writeGitStatusRow(worktree, { ...gitStatusRowFor(worktree)!, invalidated: true });
    const refreshed = host.refreshForConnection();
    await settle();
    expect(calls).toHaveLength(2);
    calls[1]!.resolve({ measurement: facts(MEASURED_FOR_DESIGNER), fetched: false });
    await refreshed;
    await host.refreshForConnection();
    expect(calls).toHaveLength(2);
  });

  it('asks nothing of a provider that cannot supply status', async () => {
    const identityOnly = { ...githubBackendFixture('connected'), repositoryAccess: undefined };
    const { host, calls } = await seeded({ ghAccount: 'someone', connectionAccount: 'someone' }, identityOnly);
    await host.refreshForConnection();
    expect(calls).toHaveLength(1);
    expect(gitStatusRowFor(worktree)?.invalidated).toBeUndefined();
  });
});

describe('a measurement the project has moved past', () => {
  it('starts at once instead of waiting for the account it was asked to replace', async () => {
    const { host, calls, emitted } = harness();
    const opened = host.opened(worktree);
    await settle();
    expect(calls).toHaveLength(1);

    const refreshed = host.connectionChanged();
    await settle();
    expect(calls).toHaveLength(2);
    calls[1]!.resolve({ measurement: facts({ ghAccount: 'current-account' }), fetched: false });
    await refreshed;
    expect(emitted.at(-1)?.row.measurement.ghAccount).toBe('current-account');

    calls[0]!.resolve({ measurement: facts({ ghAccount: 'replaced-account' }), fetched: true });
    await opened;
    await settle();
    expect(emitted.at(-1)?.row.measurement.ghAccount).toBe('current-account');
    expect(gitStatusRowFor(worktree)?.measurement.ghAccount).toBe('current-account');
  });

  it('settles without re-opening the lane or promoting what is parked behind the newer measurement', async () => {
    const { host, calls } = harness();
    const opened = host.opened(worktree);
    await settle();
    const refreshed = host.connectionChanged();
    await settle();
    const queued = host.turnEnded(worktree);
    await settle();
    expect(calls).toHaveLength(2);

    calls[0]!.resolve({ measurement: facts(), fetched: true });
    await opened;
    await settle();
    expect(calls).toHaveLength(2);

    calls[1]!.resolve({ measurement: facts(), fetched: false });
    await refreshed;
    await settle();
    expect(calls).toHaveLength(3);
    calls[2]!.resolve({ measurement: facts(), fetched: false });
    await queued;
  });
});

describe('the runner — one in flight, at most one pending', () => {
  it('coalesces two turn-ends during an open into one fetch-free trailing run that both callers resolve on', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options.fetch).toBe(true);

    let firstDone = false;
    let secondDone = false;
    const first = host.turnEnded(worktree).then(() => {
      firstDone = true;
    });
    const second = host.turnEnded(worktree).then(() => {
      secondDone = true;
    });
    await settle();
    expect(calls).toHaveLength(1);
    expect(firstDone).toBe(false);

    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.options.fetch).toBe(false);
    expect(firstDone).toBe(false);

    calls[1]?.resolve({ measurement: facts({ ahead: 2 }), fetched: undefined });
    await Promise.all([first, second]);
    expect(firstDone && secondDone).toBe(true);
    expect(calls).toHaveLength(2);
    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.row.trigger).toBe('turn-end');
    expect(emitted[1]?.row.measuredAt > emitted[0]!.row.measuredAt).toBe(true);
    expect(emitted[1]?.row.fetchedAt).toBe(emitted[0]?.row.measuredAt);
  });

  it('a turn-end joining a pending open takes the trigger, and the open still earns the fetch', async () => {
    const { host, calls, emitted } = harness();
    void host.opened(worktree);
    await settle();
    void host.opened(worktree);
    void host.turnEnded(worktree);
    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.options.fetch).toBe(true);
    calls[1]?.resolve({ measurement: facts(), fetched: undefined });
    await settle();
    expect(emitted[1]?.row.trigger).toBe('turn-end');
  });

  it('a run that outlives the deadline holds the slot: the trailing run starts only once the abandoned one settles', async () => {
    const { host, calls, emitted } = harness({ deadlineMs: 5 });
    const open = host.opened(worktree);
    const turn = host.turnEnded(worktree);
    await open;
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.row.stale).toBe(true);
    await settle();
    expect(calls).toHaveLength(1);

    calls[0]?.resolve({ measurement: facts({ ahead: 1 }), fetched: true });
    await settle();
    expect(calls).toHaveLength(2);
    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.row.measurement.ahead).toBe(1);
    expect(emitted[1]?.row.stale).toBe(false);

    calls[1]?.resolve({ measurement: facts({ ahead: 7 }), fetched: undefined });
    await turn;
    expect(emitted).toHaveLength(3);
    expect(host.list()[worktree]?.measurement.ahead).toBe(7);
    expect(host.list()[worktree]?.fetchedAt).toBe(emitted[1]?.row.fetchedAt);
  });

  it('a trigger after the deadline and before settlement produces one trailing run with the merged fetch intent', async () => {
    const { host, calls } = harness({ deadlineMs: 5 });
    await host.turnEnded(worktree);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options.fetch).toBe(false);

    const focus = host.check(worktree, { trigger: 'focus', fetch: false });
    const open = host.opened(worktree);
    await settle();
    expect(calls).toHaveLength(1);

    calls[0]?.resolve({ measurement: facts(), fetched: undefined });
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.options.fetch).toBe(true);
    calls[1]?.resolve({ measurement: facts(), fetched: true });
    await Promise.all([focus, open]);
    expect(calls).toHaveLength(2);
  });

  it('waiters on the deadline-dropped run resolve at the deadline, not at settlement', async () => {
    const { host, calls } = harness({ deadlineMs: 5 });
    let openDone = false;
    let turnDone = false;
    const open = host.opened(worktree).then(() => {
      openDone = true;
    });
    const turn = host.turnEnded(worktree).then(() => {
      turnDone = true;
    });
    await open;
    expect(openDone).toBe(true);
    expect(turnDone).toBe(false);
    expect(calls).toHaveLength(1);

    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await settle();
    expect(turnDone).toBe(false);
    calls[1]?.resolve({ measurement: facts(), fetched: undefined });
    await Promise.all([open, turn]);
    expect(turnDone).toBe(true);
  });

  it('an abandoned run that settles with no newer run applies its outcome and starts no trailing run', async () => {
    const { host, calls, emitted } = harness({ deadlineMs: 5 });
    await host.opened(worktree);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.row.stale).toBe(true);

    calls[0]?.resolve({ measurement: facts({ ahead: 3 }), fetched: true });
    await settle();
    expect(calls).toHaveLength(1);
    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.row.measurement.ahead).toBe(3);
    expect(emitted[1]?.row.stale).toBe(false);
    expect(emitted[1]?.row.fetchedAt).toBeDefined();
    expect(host.list()[worktree]).toEqual(emitted[1]?.row);

    void host.turnEnded(worktree);
    await settle();
    expect(calls).toHaveLength(2);
  });

  it("an abandoned run that rejects leaves the deadline's stale row alone", async () => {
    const applied: string[] = [];
    const { host, calls, emitted } = harness({ deadlineMs: 5, onApplied: (_w, row) => applied.push(row.trigger) });
    await host.opened(worktree);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.row.stale).toBe(true);

    calls[0]?.reject(new Error('git exploded late'));
    await settle();
    expect(emitted).toHaveLength(1);
    expect(applied).toEqual(['open']);

    void host.turnEnded(worktree);
    await settle();
    expect(calls).toHaveLength(2);
  });

  it('an emit that throws at an abandoned settlement neither floats a rejection nor jams the runner', async () => {
    const unhandled: unknown[] = [];
    const capture = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', capture);
    const applied: string[] = [];
    let emits = 0;
    try {
      const { host, calls } = harness({
        deadlineMs: 5,
        emit: () => {
          if (++emits === 2) throw new Error('renderer gone');
        },
        onApplied: (_w, row) => applied.push(row.trigger),
      });
      await host.opened(worktree);
      expect(emits).toBe(1);

      calls[0]?.resolve({ measurement: facts({ ahead: 3 }), fetched: true });
      await settle();
      expect(emits).toBe(2);
      expect(applied).toEqual(['open', 'open']);
      expect(host.list()[worktree]?.measurement.ahead).toBe(3);

      const turn = host.turnEnded(worktree);
      await settle();
      expect(calls).toHaveLength(2);
      calls[1]?.resolve({ measurement: facts({ ahead: 4 }), fetched: undefined });
      await turn;
      expect(emits).toBe(3);
      await sleep(1);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', capture);
    }
  });

  it('a measure that never settles frees the slot at deadline plus backstop, the pending run starts, and its late result is dropped', async () => {
    const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
    jest.useFakeTimers();
    const { host, calls, emitted } = harness({ deadlineMs: 5, backstopMs: 200 });
    const open = host.opened(worktree);
    const turn = host.turnEnded(worktree);
    await flush();
    expect(calls).toHaveLength(1);

    jest.advanceTimersByTime(5);
    await open;
    jest.advanceTimersByTime(199);
    await flush();
    expect(calls).toHaveLength(1);
    jest.advanceTimersByTime(1);
    await flush();
    expect(calls).toHaveLength(2);
    jest.useRealTimers();

    calls[1]?.resolve({ measurement: facts({ ahead: 7 }), fetched: undefined });
    await turn;
    await settle();
    expect(host.list()[worktree]?.measurement.ahead).toBe(7);
    const emits = emitted.length;

    calls[0]?.resolve({ measurement: facts({ ahead: 1 }), fetched: true });
    await settle();
    expect(emitted).toHaveLength(emits);
    expect(host.list()[worktree]?.measurement.ahead).toBe(7);
    expect(host.list()[worktree]?.fetchedAt).toBeUndefined();
  });

  it('ignores a worktree the registry does not know', async () => {
    const { host, calls, emitted } = harness();
    await host.opened(join(workspaceRootDir, 'stranger'));
    expect(calls).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });
});

describe('apply — what a row keeps', () => {
  const pr = {
    number: 7,
    url: 'https://github.com/acme/repo/pull/7',
    state: 'OPEN' as const,
    isDraft: false,
    mergeStateStatus: 'CLEAN',
    checks: 'passing' as const,
    baseRefName: 'main',
    updatedAt: '2026-08-28T11:00:00.000Z',
  };

  it('a partial result keeps the previous pr with the counts it was measured against (ONL-2411)', async () => {
    const { host, calls, emitted } = harness();
    const onRelease = { ...pr, baseRefName: 'release' };
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ pr: onRelease, baseBranch: 'release', ahead: 2 }), fetched: true });
    await open;
    const fetchedAt = emitted[0]?.row.fetchedAt;
    expect(fetchedAt).toBeDefined();

    // gh failed part-way, so this pass counted against the project's recorded base instead.
    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({ measurement: facts({ partial: true, baseBranch: 'main', ahead: 3, behind: 9 }), fetched: undefined });
    await turn;
    const row = emitted[1]?.row;
    expect(row?.measurement.pr).toEqual(onRelease);
    expect(row?.measurement.baseBranch).toBe('release');
    expect(row?.measurement.ahead).toBe(2);
    expect(row?.measurement.behind).toBe(0);
    expect(row?.fetchedAt).toBe(fetchedAt);
    expect(row?.stale).toBe(true);
  });

  it('a partial result keeps its own fresh counts when the kept pr targets the measured base (ONL-2411)', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ pr, baseBranch: 'main', ahead: 0, behind: 0 }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({ measurement: facts({ partial: true, baseBranch: 'main', ahead: 2, behind: 5 }), fetched: undefined });
    await turn;
    const row = emitted[1]?.row;
    expect(row?.measurement.pr).toEqual(pr);
    expect(row?.measurement.baseBranch).toBe('main');
    expect(row?.measurement.ahead).toBe(2);
    expect(row?.measurement.behind).toBe(5);
  });

  it('a total failure keeps the previous facts with a fresh measuredAt, the trigger, and stale', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ pr }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.reject(new Error('git exploded'));
    await turn;
    const row = emitted[1]?.row;
    expect(row?.measurement).toEqual(emitted[0]!.row.measurement);
    expect(row?.measuredAt > emitted[0]!.row.measuredAt).toBe(true);
    expect(row?.fetchedAt).toBe(emitted[0]?.row.fetchedAt);
    expect(row?.trigger).toBe('turn-end');
    expect(row?.stale).toBe(true);
    expect(host.list()[worktree]).toEqual(row);
  });

  it('a first-ever failure writes a stale row with git facts absent', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.reject(new Error('git exploded'));
    await open;
    const row = emitted[0]?.row;
    expect(row?.stale).toBe(true);
    expect(row?.measurement.gitInstalled).toBe(false);
    expect(row?.measurement.branch).toBeUndefined();
    expect(row?.measurement.baseBranch).toBe('main');
    expect(row?.fetchedAt).toBeUndefined();
  });

  it('an open PR measured after a turn end is what the emitted row carries', async () => {
    const { host, calls, emitted } = harness();
    const turn = host.turnEnded(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ pr }), fetched: undefined });
    await turn;
    expect(emitted[0]?.row.measurement.pr?.state).toBe('OPEN');
    expect(emitted[0]?.row.trigger).toBe('turn-end');
  });

  it('persists rows across a domain re-read, keyed by the worktree path', async () => {
    const { host, calls } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    resetGitStatusCache();
    expect(Object.keys(host.list())).toEqual([worktree]);
    expect(readdirSync(workspaceRootDir)).toContain('git-status.json');
  });

  it('a row that cannot be persisted still emits and still lists from the cache', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    chmodSync(workspaceRootDir, 0o500);
    try {
      calls[0]?.resolve({ measurement: facts({ ahead: 4 }), fetched: true });
      await open;
    } finally {
      chmodSync(workspaceRootDir, 0o700);
    }
    expect(readdirSync(workspaceRootDir)).not.toContain('git-status.json');
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.row.measurement.ahead).toBe(4);
    expect(host.list()[worktree]).toEqual(emitted[0]?.row);
  });

  it('lists rows under the registry spelling of a symlinked workspace root, the same key emit uses', async () => {
    const link = join(workspaceRootDir, '..', `git-status-link-${Date.now()}`);
    symlinkSync(workspaceRootDir, link);
    const linked = join(link, 'repo', 'teal-skylark');
    expect(normalizePath(linked)).not.toBe(linked);
    resetWorkspaceCache();
    rememberProject(workspaceRecord(linked));

    const { host, calls, emitted } = harness();
    const open = host.opened(linked);
    await settle();
    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    expect(emitted[0]?.worktreePath).toBe(linked);
    expect(host.list()[linked]).toEqual(emitted[0]?.row);
    expect(Object.keys(host.list())).toContain(linked);
    rmSync(link);
  });

  it('a vanished worktree keeps the previous row and marks it stale, never gitInstalled false', async () => {
    const realWorktree = normalizePath(worktree);
    const { host, calls, emitted } = harness();
    const open = host.opened(realWorktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ pr }), fetched: true });
    await open;

    rmSync(realWorktree, { recursive: true });
    const turn = host.turnEnded(realWorktree);
    await turn;
    expect(calls).toHaveLength(1);
    const row = emitted[1]?.row;
    expect(row?.stale).toBe(true);
    expect(row?.measurement).toEqual(emitted[0]!.row.measurement);
    expect(row?.measurement.gitInstalled).toBe(true);
  });

  it('a partial result keeps the previous trust facts', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ ghAccount: 'wrenquill', pr }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({
      measurement: facts({ partial: true, ghAuthed: false, access: 'unknown' }),
      fetched: undefined,
    });
    await turn;
    const m = emitted[1]?.row.measurement;
    expect(m?.ghAuthed).toBe(true);
    expect(m?.ghAccount).toBe('wrenquill');
    expect(m?.access).toBe('granted');
    expect(m?.pr).toEqual(pr);
  });

  it('a partial result borrows no access while a read failure is live, and the pill does not read denied again', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ access: 'denied', accessReason: 'read-only' }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({
      measurement: facts({ partial: true, access: 'unknown', githubReadFailure: { status: 'forbidden' } }),
      fetched: undefined,
    });
    await turn;
    const row = emitted[1]?.row;
    expect(row?.measurement.access).toBe('unknown');
    expect(row?.measurement.accessReason).toBeUndefined();
    expect(derivePillState(row, GIT_PILL_SHIPPED_DEFAULTS).id).not.toBe('no-access');
  });

  it('an access the host does carry forward arrives with the reason it was measured with', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ access: 'denied', accessReason: 'sso_required' }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({ measurement: facts({ partial: true, access: 'unknown' }), fetched: undefined });
    await turn;
    const row = emitted[1]?.row;
    expect(row?.measurement.access).toBe('denied');
    expect(row?.measurement.accessReason).toBe('sso_required');
  });

  it('borrows the account the facts it keeps were measured for, and drops it when this pass signs in itself', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ ghAccount: 'designer', connectionAccount: 'designer' }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({ measurement: facts({ partial: true, ghAuthed: false, access: 'unknown' }), fetched: undefined });
    await turn;
    expect(emitted[1]?.row.measurement.connectionAccount).toBe('designer');

    const next = host.turnEnded(worktree);
    await settle();
    calls[2]?.resolve({ measurement: facts({ partial: true, ghAuthed: true, ghAccount: 'wrenquill', access: 'unknown' }), fetched: undefined });
    await next;
    expect(emitted[2]?.row.measurement.ghAccount).toBe('wrenquill');
    expect(emitted[2]?.row.measurement.connectionAccount).toBeUndefined();
  });

  it('a partial result that reached identity keeps its fresh sign-in over the stale one', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ ghAuthed: false, access: 'unknown' }), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({
      measurement: facts({ partial: true, ghAuthed: true, ghAccount: 'wrenquill', access: 'unknown' }),
      fetched: undefined,
    });
    await turn;
    const m = emitted[1]?.row.measurement;
    expect(m?.ghAuthed).toBe(true);
    expect(m?.ghAccount).toBe('wrenquill');
  });

  it('a partial result with no pr to carry is stale', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts({ partial: true }), fetched: true });
    await open;
    expect(emitted[0]?.row.stale).toBe(true);
  });

  it('a failed fetch on open is stale', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts(), fetched: false });
    await open;
    expect(emitted[0]?.row.stale).toBe(true);
    expect(emitted[0]?.row.fetchedAt).toBeUndefined();
  });

  it('an open arriving during an in-flight turn-end makes the trailing run fetch', async () => {
    const { host, calls } = harness();
    void host.turnEnded(worktree);
    await settle();
    expect(calls[0]?.options.fetch).toBe(false);
    const open = host.opened(worktree);
    calls[0]?.resolve({ measurement: facts(), fetched: undefined });
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.options.fetch).toBe(true);
    calls[1]?.resolve({ measurement: facts(), fetched: true });
    await open;
  });
});

describe('a newer domain file', () => {
  it('reads as empty without quarantining or changing newer bytes or the workspace registry', () => {
    const registryPath = join(workspaceRootDir, 'workspaces.json');
    const registryBefore = readFileSync(registryPath);
    writeFileSync(
      join(workspaceRootDir, 'git-status.json'),
      `${JSON.stringify({ version: 99, data: { rows: { [worktree]: { future: true } } } })}\n`,
    );
    const newerBytes = readFileSync(join(workspaceRootDir, 'git-status.json'));
    resetGitStatusCache();
    const { host } = harness();
    expect(host.list()).toEqual({});
    expect(readdirSync(workspaceRootDir).some((f) => f.startsWith('git-status.json.corrupt-'))).toBe(false);
    expect(readFileSync(join(workspaceRootDir, 'git-status.json')).equals(newerBytes)).toBe(true);
    expect(readFileSync(registryPath).equals(registryBefore)).toBe(true);
  });
});

describe('the pill defaults', () => {
  it('answers the shipped defaults when unset', () => {
    expect(readGitPillDefaults()).toEqual(GIT_PILL_SHIPPED_DEFAULTS);
  });

  it('persists a set default across a domain re-read and drops a value off the enum', () => {
    const set = { ...GIT_PILL_SHIPPED_DEFAULTS, ready: 'merge' as const };
    expect(writeGitPillDefaults({ ready: 'merge' })).toEqual(set);
    resetGitPillDefaultsCache();
    expect(readGitPillDefaults()).toEqual(set);
    writeGitPillDefaults({ noPr: 'bogus' as never });
    expect(readGitPillDefaults()).toEqual(set);
  });
});

describe('the check seam and onApplied', () => {
  it('check() runs with the caller\'s trigger and fetch intent, and onApplied gets the row', async () => {
    const applied: Array<{ worktreePath: string; trigger: string }> = [];
    const { host, calls, emitted } = harness({
      onApplied: (worktreePath, row) => applied.push({ worktreePath, trigger: row.trigger }),
    });
    const check = host.check(worktree, { trigger: 'interval', fetch: true });
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options.fetch).toBe(true);

    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await check;
    expect(emitted[0]?.row.trigger).toBe('interval');
    expect(applied).toEqual([{ worktreePath: worktree, trigger: 'interval' }]);
  });

  it('onApplied fires for opened and turnEnded rows too', async () => {
    const applied: string[] = [];
    const { host, calls } = harness({ onApplied: (_w, row) => applied.push(row.trigger) });
    const open = host.opened(worktree);
    await settle();
    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;

    const turn = host.turnEnded(worktree);
    await settle();
    calls[1]?.resolve({ measurement: facts(), fetched: undefined });
    await turn;
    expect(applied).toEqual(['open', 'turn-end']);
  });

  it('an open joining a focus-created pending merges fetch without stealing the label', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();

    const focus = host.check(worktree, { trigger: 'focus', fetch: false });
    const reopen = host.opened(worktree);
    await settle();
    expect(calls).toHaveLength(1);

    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.options.fetch).toBe(true);

    calls[1]?.resolve({ measurement: facts(), fetched: true });
    await Promise.all([focus, reopen]);
    expect(emitted[1]?.row.trigger).toBe('focus');
  });

  it('a coalesced turn-end row is stamped at the turn-end request, not the trailing start', async () => {
    let clock = Date.UTC(2026, 7, 28, 12, 0, 0);
    const { host, calls, emitted } = harness({ now: () => new Date(clock) });
    const open = host.opened(worktree);
    await settle();

    clock += 1_000;
    const requestedAt = new Date(clock).toISOString();
    const turn = host.turnEnded(worktree);
    clock += 1_000;
    void host.turnEnded(worktree);
    clock += 3_000;
    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    await settle();
    expect(calls).toHaveLength(2);
    calls[1]?.resolve({ measurement: facts(), fetched: undefined });
    await turn;

    const row = emitted[1]?.row;
    expect(row?.trigger).toBe('turn-end');
    expect(row?.measuredAt).toBe(requestedAt);
    expect(Date.parse(row!.measuredAt) < clock).toBe(true);
  });

  it('a turn-end joining a focus-created pending still takes label supremacy', async () => {
    const { host, calls, emitted } = harness();
    const open = host.opened(worktree);
    await settle();

    const focus = host.check(worktree, { trigger: 'focus', fetch: false });
    const turn = host.turnEnded(worktree);
    await settle();

    calls[0]?.resolve({ measurement: facts(), fetched: true });
    await open;
    await settle();
    calls[1]?.resolve({ measurement: facts(), fetched: undefined });
    await Promise.all([focus, turn]);
    expect(emitted[1]?.row.trigger).toBe('turn-end');
  });
});
