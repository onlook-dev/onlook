import { describe, expect, test } from 'bun:test';
import type { GithubImportCommand, GithubRepository } from '@studio/events';
import type { GithubBackend } from './backend.js';
import { createGithubImport, listedRepository, SLOW_CLONE_MS, type GithubImportDeps } from './service.js';

const REPO: GithubRepository = { id: 42, fullName: 'private-team/private-repo', private: true, defaultBranch: 'design', archived: false, canPull: true, canPush: true };

function fixture(overrides: Partial<GithubImportDeps> = {}) {
  const calls: unknown[] = [];
  let enabled = true;
  let subject: string | undefined = 'designer';
  const credential = { status: 'ready' as const, remoteUrl: `https://github.com/${REPO.fullName}.git`, username: 'x-access-token' as const, password: 'never-in-renderer', expiresAt: Date.now() + 300_000 };
  const backend: GithubBackend = {
    start: async () => { calls.push('start'); return { status: 'connecting', url: 'https://api.workos.com/connect' }; },
    status: async () => { calls.push('status'); return { status: 'connected', scopes: ['repo'], expiresAt: credential.expiresAt }; },
    repositories: async (page) => { calls.push(['page', page]); return { status: 'connected', repositories: [REPO], nextPage: null }; },
    credential: async () => { calls.push('credential'); return credential; },
  };
  const events: unknown[] = [];
  const service = createGithubImport({
    enabled: () => enabled, subject: () => subject, backend: () => backend,
    open: async () => { calls.push('browser'); }, parent: async () => '/chosen/folder', existing: () => undefined,
    clone: async ({ progress }) => { progress(50, '/chosen/source'); return { ok: true, sourcePath: '/chosen/source' }; },
    cloned: (path) => { calls.push(['cloned', path]); },
    connectEvent: (...args) => { events.push(['connect', ...args]); }, cloneEvent: (...args) => { events.push(['clone', ...args]); }, ...overrides,
  });
  const select = async () => { await service.command({ kind: 'status' }); await service.command({ kind: 'repositories' }); return service.command({ kind: 'select', repositoryId: REPO.id }); };
  return { service, select, calls, events, backend, disable: () => { enabled = false; }, signOut: () => { subject = undefined; }, replaceAccount: () => { subject = 'replacement'; } };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((settle, refuse) => { resolve = settle; reject = refuse; });
  return { promise, resolve, reject };
}

describe('GitHub import boundary', () => {
  test('selecting a listed repository never waits on credentials or remote branches', async () => {
    const flow = fixture();
    flow.backend.credential = () => new Promise(() => {});
    await flow.service.command({ kind: 'status' });
    await flow.service.command({ kind: 'repositories' });
    const selected = await flow.service.command({ kind: 'select', repositoryId: REPO.id });
    expect(selected.repositoryId).toBe(REPO.id);
    expect(selected.branches).toEqual(['design']);
    expect(selected.phase).toBe('idle');
    expect(flow.calls).not.toContain('credential');
  });

  test('only the latest selection owns a slow default destination lookup', async () => {
    const first = deferred<string | undefined>();
    const second = { ...REPO, id: 84, fullName: 'personal/site' };
    let parents = 0;
    const flow = fixture({ parent: async () => ++parents === 1 ? first.promise : '/replacement' });
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [REPO, second], nextPage: null });
    await flow.service.command({ kind: 'status' });
    await flow.service.command({ kind: 'repositories' });
    const pending = flow.service.command({ kind: 'select', repositoryId: REPO.id });
    const loading = await flow.service.command({ kind: 'status' });
    expect(loading.repositoryId).toBe(REPO.id);
    expect(loading.phase).toBe('loading');
    expect(loading.branches).toEqual(['design']);
    expect(loading.repositories).toHaveLength(2);
    const replacement = await flow.service.command({ kind: 'select', repositoryId: second.id });
    expect(replacement.repositoryId).toBe(second.id);
    expect(replacement.branches).toEqual(['design']);
    first.resolve('/stale');
    await pending;
    const settled = await flow.service.command({ kind: 'status' });
    expect(settled.repositoryId).toBe(second.id);
    expect(settled.branches).toEqual(['design']);
    expect(settled.destination).toBe('/replacement');
    expect(settled.failure).toBeUndefined();
  });

  test('a failed credential keeps its repository selected and its list intact', async () => {
    const flow = fixture();
    flow.backend.credential = async () => ({ status: 'reconnect', reason: 'expired' });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    flow.backend.status = async () => ({ status: 'reconnect', reason: 'expired' });
    const failed = await flow.service.command({ kind: 'status' });
    expect(failed.repositoryId).toBe(REPO.id);
    expect(failed.repositories).toHaveLength(1);
    expect(failed.branches).toEqual(['design']);
    expect(failed.failure).toBe('access');
    expect(failed.connection).toEqual({ status: 'reconnect', reason: 'expired' });
  });

  test('a successful clone retry uses fresh credentials after an access failure', async () => {
    const flow = fixture();
    const credential = flow.backend.credential;
    flow.backend.credential = async () => ({ status: 'reconnect', reason: 'expired' });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    flow.backend.credential = credential;
    await flow.service.command({ kind: 'status' });
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    const retried = await flow.service.command({ kind: 'status' });
    expect(retried.connection.status).toBe('connected');
    expect(retried.branches).toEqual(['design']);
    expect(retried.failure).toBeUndefined();
  });

  test('refocusing after a credential failure keeps the selected repository and recovery in place', async () => {
    const flow = fixture();
    flow.backend.credential = async () => ({ status: 'reconnect', reason: 'expired' });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    flow.backend.status = async () => ({ status: 'reconnect', reason: 'expired' });
    const refreshed = await flow.service.command({ kind: 'status' });
    expect(refreshed.repositoryId).toBe(REPO.id);
    expect(refreshed.repositories).toHaveLength(1);
    expect(refreshed.branches).toEqual(['design']);
    expect(refreshed.failure).toBe('access');
  });

  test('a forged branch cannot bypass the listed default branch', async () => {
    const flow = fixture();
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'untrusted', entryPoint: 'projects' });
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('a stale repository ID cannot clone the previous selection with the same default branch', async () => {
    const replacement = { ...REPO, id: 84, fullName: 'designer/replacement' };
    const flow = fixture();
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [REPO, replacement], nextPage: null });
    await flow.select();
    const refused = await flow.service.command({ kind: 'clone', repositoryId: replacement.id, branch: 'design', entryPoint: 'projects' });
    expect(refused.repositoryId).toBe(REPO.id);
    expect(refused.phase).toBe('idle');
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('an unchanged focus refresh preserves the selected repository, branches and destination', async () => {
    const flow = fixture();
    await flow.select();
    await flow.service.command({ kind: 'destination', destination: 'documents' });
    await flow.service.command({ kind: 'status' });
    const refreshed = await flow.service.command({ kind: 'repositories' });
    expect(refreshed.repositoryId).toBe(REPO.id);
    expect(refreshed.branches).toEqual(['design']);
    expect(refreshed.destination).toBe('/chosen/folder');
    expect(refreshed.destinationChoice).toBe('documents');
  });

  for (const connectedFirst of [false, true]) test(`approval acknowledgement does not depend on an active connection attempt: connected first ${connectedFirst}`, async () => {
    const flow = fixture();
    if (connectedFirst) {
      await flow.service.command({ kind: 'start', entryPoint: 'projects' });
      await flow.service.command({ kind: 'status' });
    }
    flow.backend.status = async () => ({ status: 'forbidden' });
    await flow.service.command({ kind: 'status' });
    expect((await flow.service.command({ kind: 'leave', next: 'waiting' })).waitingForApproval).toBe(true);
    await flow.service.command({ kind: 'leave', next: 'folder' });
    expect(flow.events).toEqual(connectedFirst ? [['connect', 'connected', 'folder', 'projects']] : []);
    flow.replaceAccount();
    expect((await flow.service.command({ kind: 'status' })).waitingForApproval).toBe(false);
  });

  test('account replacement may select while old clone cleanup runs but cannot clone until cleanup settles', async () => {
    const cleanup = deferred<Awaited<ReturnType<NonNullable<GithubImportDeps['clone']>>>>();
    const requests: { repository: string; branch: string; parent: string }[] = [];
    let destination = '/old/account/destination';
    let oldProgress!: Parameters<NonNullable<GithubImportDeps['clone']>>[0]['progress'];
    const flow = fixture({ parent: async () => destination, clone: async (options) => {
      requests.push({ repository: options.repository, branch: options.branch, parent: options.parent });
      if (requests.length > 1) return { ok: true, sourcePath: '/replacement/source' };
      oldProgress = options.progress;
      return cleanup.promise;
    } });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    flow.replaceAccount();
    destination = '/replacement/account/destination';
    const replacement = { ...REPO, id: 84, fullName: 'replacement-owner/replacement', defaultBranch: 'main' };
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [replacement], nextPage: null });
    flow.backend.credential = async (repository) => ({ status: 'ready', remoteUrl: `https://github.com/${repository}.git`, username: 'x-access-token', password: 'secret', expiresAt: Date.now() + 300_000 });
    await flow.service.command({ kind: 'status' });
    await flow.service.command({ kind: 'repositories' });
    await flow.service.command({ kind: 'select', repositoryId: replacement.id });
    const blocked = await flow.service.command({ kind: 'clone', repositoryId: replacement.id, branch: 'main', entryPoint: 'projects' });
    expect(blocked.repositoryId).toBe(replacement.id);
    expect(blocked.phase).toBe('idle');
    expect(requests).toEqual([{ repository: REPO.fullName, branch: 'design', parent: '/old/account/destination' }]);
    oldProgress(99, '/old/account/source');
    cleanup.resolve({ ok: true, sourcePath: '/old/account/source' });
    await Bun.sleep(0);
    const selected = await flow.service.command({ kind: 'status' });
    expect(selected.progress).toBe(0);
    expect(selected.sourcePath).toBeUndefined();
    expect(selected.repositoryId).toBe(replacement.id);
    expect(flow.calls).not.toContainEqual(['cloned', '/old/account/source']);
    await flow.service.command({ kind: 'clone', repositoryId: replacement.id, branch: 'main', entryPoint: 'projects' });
    await Bun.sleep(0);
    const done = await flow.service.command({ kind: 'status' });
    expect(requests).toEqual([
      { repository: REPO.fullName, branch: 'design', parent: '/old/account/destination' },
      { repository: replacement.fullName, branch: 'main', parent: '/replacement/account/destination' },
    ]);
    expect(done.phase).toBe('done');
    expect(done.sourcePath).toBe('/replacement/source');
  });

  test('reset during load cannot publish old repositories or release the replacement loading owner', async () => {
    const oldPage = deferred<Awaited<ReturnType<GithubBackend['repositories']>>>();
    const newPage = deferred<Awaited<ReturnType<GithubBackend['repositories']>>>();
    const flow = fixture();
    flow.backend.repositories = () => oldPage.promise;
    const oldLoad = flow.service.command({ kind: 'repositories' });
    await flow.service.command({ kind: 'begin', entryPoint: 'projects' });
    flow.backend.repositories = () => newPage.promise;
    const newLoad = flow.service.command({ kind: 'repositories' });
    oldPage.resolve({ status: 'connected', repositories: [REPO], nextPage: null });
    expect((await oldLoad).enabled).toBe(false);
    const occupied = await flow.service.command({ kind: 'start', entryPoint: 'projects' });
    expect(occupied.phase).toBe('loading');
    expect(flow.calls).not.toContain('start');
    const replacement = { ...REPO, id: 84, fullName: 'another-owner/another-repo' };
    newPage.resolve({ status: 'connected', repositories: [replacement], nextPage: null });
    expect((await newLoad).repositories).toEqual([{ ...replacement, onThisComputer: false }]);
  });

  test('reset during clone keeps cleanup ownership and ignores its late progress and completed path', async () => {
    const result = deferred<Awaited<ReturnType<NonNullable<GithubImportDeps['clone']>>>>();
    let report!: Parameters<NonNullable<GithubImportDeps['clone']>>[0]['progress'];
    let signal!: AbortSignal;
    const flow = fixture({ clone: async (options) => { report = options.progress; signal = options.signal; return result.promise; } });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    let began = false;
    const begin = flow.service.command({ kind: 'begin', entryPoint: 'projects' }).then((state) => { began = true; return state; });
    await Bun.sleep(0);
    expect(signal.aborted).toBe(true);
    expect(began).toBe(false);
    report(99, '/old/source');
    result.resolve({ ok: true, sourcePath: '/old/source' });
    const state = await begin;
    expect(state.phase).toBe('idle');
    expect(state.sourcePath).toBeUndefined();
    expect(state.repositoryId).toBeUndefined();
    expect(state.progress).toBe(0);
    expect(flow.calls).not.toContainEqual(['cloned', '/old/source']);
    expect((await flow.select()).branches).toEqual(['design']);
  });

  test('replacement repository owner invalidates selection before a clone can use the old branch list', async () => {
    const cloned: string[] = [];
    const flow = fixture({ clone: async ({ repository }) => { cloned.push(repository); return { ok: false, failure: 'cancelled' }; } });
    await flow.select();
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [{ ...REPO, fullName: 'replacement-owner/private-repo' }], nextPage: null });
    const refreshed = await flow.service.command({ kind: 'repositories' });
    expect(refreshed.repositoryId).toBeUndefined();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    expect(cloned).toEqual([]);
    flow.backend.credential = async (repository) => ({ status: 'ready', remoteUrl: `https://github.com/${repository}.git`, username: 'x-access-token', password: 'secret', expiresAt: Date.now() + 300_000 });
    await flow.service.command({ kind: 'select', repositoryId: REPO.id });
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await flow.service.command({ kind: 'cancel' });
    expect(cloned).toEqual(['replacement-owner/private-repo']);
  });

  test('cancel awaits cleanup and a restart uses the same selected repository, branch and destination', async () => {
    const cleanup = deferred<void>();
    const aborted = deferred<void>();
    const cloned: unknown[] = [];
    const flow = fixture({ clone: async ({ signal, repository, branch, parent }) => {
      cloned.push([repository, branch, parent]);
      if (cloned.length > 1) return { ok: true, sourcePath: '/chosen/restarted' };
      signal.addEventListener('abort', () => aborted.resolve(), { once: true });
      await cleanup.promise;
      return { ok: false, failure: 'cancelled' };
    } });
    await flow.select();
    await flow.service.command({ kind: 'destination', destination: 'documents' });
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    let cancelled = false;
    const cancel = flow.service.command({ kind: 'cancel' }).then((state) => { cancelled = true; return state; });
    await aborted.promise;
    expect(cancelled).toBe(false);
    cleanup.resolve();
    expect((await cancel).failure).toBe('cancelled');
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    const done = await flow.service.command({ kind: 'status' });
    expect(done.phase).toBe('done');
    expect(done.sourcePath).toBe('/chosen/restarted');
    expect(cloned).toEqual([[REPO.fullName, 'design', '/chosen/folder'], [REPO.fullName, 'design', '/chosen/folder']]);
    expect(done.destinationChoice).toBe('documents');
  });

  test('account replacement clears approval and selection while an old destination lookup is pending', async () => {
    const parent = deferred<string | undefined>();
    const flow = fixture({ parent: () => parent.promise });
    await flow.service.command({ kind: 'start', entryPoint: 'projects' });
    await flow.service.command({ kind: 'leave', next: 'waiting' });
    await flow.service.command({ kind: 'repositories' });
    const selected = flow.service.command({ kind: 'select', repositoryId: REPO.id });
    await Bun.sleep(0);
    flow.replaceAccount();
    flow.backend.status = async () => ({ status: 'disconnected' });
    const replaced = await flow.service.command({ kind: 'status' });
    expect(replaced.waitingForApproval).toBe(false);
    expect(replaced.connectionAttempted).toBe(false);
    expect(replaced.repositories).toEqual([]);
    parent.resolve('/old-account');
    expect((await selected).enabled).toBe(false);
    const current = await flow.service.command({ kind: 'status' });
    expect(current.repositoryId).toBeUndefined();
    expect(current.branches).toEqual([]);
    expect(current.waitingForApproval).toBe(false);
  });

  test('flag off preserves the existing app without backend or filesystem effects', async () => {
    const flow = fixture(); flow.disable();
    const commands: GithubImportCommand[] = [{ kind: 'status' }, { kind: 'start', entryPoint: 'onboarding' }, { kind: 'repositories' },
      { kind: 'select', repositoryId: REPO.id }, { kind: 'open', repositoryId: REPO.id }, { kind: 'destination', destination: 'choose' }, { kind: 'clone', repositoryId: REPO.id, branch: 'main', entryPoint: 'projects' }];
    for (const command of commands) expect((await flow.service.command(command)).enabled).toBe(false);
    expect(flow.calls).toEqual([]); expect(flow.events).toEqual([]);
  });

  test('connected flow preserves branches and never exposes a token in any snapshot or analytics event', async () => {
    const flow = fixture();
    await flow.service.command({ kind: 'start', entryPoint: 'onboarding' });
    const selected = await flow.select();
    expect(selected.branches).toEqual(['design']);
    expect(selected.repositoryId).toBe(REPO.id);
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'onboarding' });
    await Bun.sleep(0);
    const done = await flow.service.command({ kind: 'status' });
    expect(done.phase).toBe('done'); expect(done.progress).toBe(50);
    expect(flow.events).toEqual([['connect', 'connected', 'clone', 'onboarding'], ['clone', 'started', 'onboarding'], ['clone', 'done', 'onboarding']]);
    expect(JSON.stringify([selected, done, flow.events])).not.toContain('never-in-renderer');
    expect(JSON.stringify(flow.events)).not.toContain('private-team');
    expect(JSON.stringify(flow.events)).not.toContain('design');
  });

  test('open returns an existing Project without a destination, credentials or network request', async () => {
    let parents = 0;
    const flow = fixture({ existing: () => '/registered/project', parent: async () => { parents += 1; return undefined; } });
    await flow.service.command({ kind: 'repositories' });
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.repositoryId).toBe(REPO.id);
    expect(opened.existingPath).toBe('/registered/project');
    expect(opened.repositories[0]?.onThisComputer).toBe(true);
    expect(opened.destination).toBeUndefined();
    expect(parents).toBe(0);
    expect(flow.calls).toEqual([['page', 1]]);
    expect(flow.events).toEqual([]);
  });

  test('open works from the trusted list even when the backend is no longer available', async () => {
    let backend: GithubBackend | undefined;
    const flow = fixture({ backend: () => backend, existing: () => '/registered/project' });
    backend = flow.backend;
    await flow.service.command({ kind: 'repositories' });
    backend = undefined;
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.existingPath).toBe('/registered/project');
    expect(opened.repositories[0]?.onThisComputer).toBe(true);
    expect(flow.calls).toEqual([['page', 1]]);
    expect(flow.events).toEqual([]);
  });

  test('opening a vanished local Project clears its local flag and only a subsequent Clone can clone', async () => {
    let existingPath: string | undefined = '/registered/project';
    let parents = 0;
    let clones = 0;
    const flow = fixture({
      existing: () => existingPath,
      parent: async () => { parents += 1; return '/chosen/folder'; },
      clone: async () => { clones += 1; return { ok: true, sourcePath: '/chosen/source' }; },
    });
    const listed = await flow.service.command({ kind: 'repositories' });
    expect(listed.repositories[0]?.onThisComputer).toBe(true);
    existingPath = undefined;
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.repositoryId).toBe(REPO.id);
    expect(opened.existingPath).toBeUndefined();
    expect(opened.repositories[0]?.onThisComputer).toBe(false);
    expect(opened.phase).toBe('idle');
    expect(parents).toBe(0);
    expect(clones).toBe(0);
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    expect(parents).toBe(1);
    expect(clones).toBe(1);
    expect(flow.calls).toContain('credential');
    expect(flow.events).toEqual([['clone', 'started', 'projects'], ['clone', 'done', 'projects']]);
  });

  test('open supersedes a pending selection destination without waiting for it', async () => {
    const parent = deferred<string | undefined>();
    const local = { ...REPO, id: 84, fullName: 'designer/local' };
    const flow = fixture({ parent: () => parent.promise, existing: (repo) => repo.id === local.id ? '/registered/local' : undefined });
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [REPO, local], nextPage: null });
    await flow.service.command({ kind: 'repositories' });
    const selecting = flow.service.command({ kind: 'select', repositoryId: REPO.id });
    const opened = await flow.service.command({ kind: 'open', repositoryId: local.id });
    expect(opened.repositoryId).toBe(local.id);
    expect(opened.existingPath).toBe('/registered/local');
    expect(opened.destination).toBeUndefined();
    parent.resolve('/stale/destination');
    const settled = await selecting;
    expect(settled.repositoryId).toBe(local.id);
    expect(settled.existingPath).toBe('/registered/local');
    expect(settled.destination).toBeUndefined();
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('open supersedes a pending network status and its late disconnected answer', async () => {
    const status = deferred<Awaited<ReturnType<GithubBackend['status']>>>();
    const flow = fixture({ existing: () => '/registered/project' });
    await flow.select();
    flow.backend.status = () => status.promise;
    const refreshing = flow.service.command({ kind: 'status' });
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.existingPath).toBe('/registered/project');
    expect(opened.phase).toBe('idle');
    status.resolve({ status: 'disconnected' });
    const settled = await refreshing;
    expect(settled.existingPath).toBe('/registered/project');
    expect(settled.connection.status).toBe('connected');
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('open cannot use the previous account repository list', async () => {
    let lookups = 0;
    const flow = fixture({ existing: () => { lookups += 1; return '/registered/project'; } });
    await flow.select();
    const before = lookups;
    flow.replaceAccount();
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.repositoryId).toBeUndefined();
    expect(opened.existingPath).toBeUndefined();
    expect(opened.repositories).toEqual([]);
    expect(lookups).toBe(before);
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('open does not publish a registry result after its account becomes inactive', async () => {
    let subject: string | undefined = 'designer';
    let signOut = false;
    const flow = fixture({ subject: () => subject, existing: () => { if (signOut) subject = undefined; return '/registered/project'; } });
    await flow.service.command({ kind: 'repositories' });
    signOut = true;
    const opened = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(opened.enabled).toBe(false);
    expect(opened.existingPath).toBeUndefined();
    expect(opened.repositories).toEqual([]);
    expect(flow.calls).not.toContain('credential');
    expect(flow.events).toEqual([]);
  });

  test('open cannot replace the selection of an active clone', async () => {
    const result = deferred<Awaited<ReturnType<NonNullable<GithubImportDeps['clone']>>>>();
    const local = { ...REPO, id: 84, fullName: 'designer/local' };
    const flow = fixture({ clone: () => result.promise, existing: (repo) => repo.id === local.id ? '/registered/local' : undefined });
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [REPO, local], nextPage: null });
    await flow.select();
    await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    const opened = await flow.service.command({ kind: 'open', repositoryId: local.id });
    expect(opened.phase).toBe('cloning');
    expect(opened.repositoryId).toBe(REPO.id);
    expect(opened.existingPath).toBeUndefined();
    result.resolve({ ok: false, failure: 'cancelled' });
    await Bun.sleep(0);
  });

  test('a clone that outlasts the slow mark says so in the snapshot, and only while it runs', async () => {
    const result = deferred<Awaited<ReturnType<NonNullable<GithubImportDeps['clone']>>>>();
    let clock = 1_000_000;
    const flow = fixture({ clone: () => result.promise, now: () => clock });
    await flow.select();
    const cloning = await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    expect(cloning.cloneStage).toBe('cloning');
    clock += SLOW_CLONE_MS - 1;
    expect((await flow.service.command({ kind: 'status' })).cloneStage).toBe('cloning');
    clock += 1;
    expect((await flow.service.command({ kind: 'status' })).cloneStage).toBe('slow');
    result.resolve({ ok: true, sourcePath: '/chosen/source' });
    await Bun.sleep(0);
    expect((await flow.service.command({ kind: 'status' })).cloneStage).toBeUndefined();
  });

  test('main still lists remote branches and clones one that is not the default', async () => {
    const flow = fixture({ branches: async () => ['design', 'release-2'] });
    await flow.select();
    expect((await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'release-2', entryPoint: 'projects' })).phase).toBe('idle');
    const listed = await flow.service.command({ kind: 'branches', repositoryId: REPO.id });
    expect(listed.branches).toEqual(['design', 'release-2']);
    expect(flow.calls).toContain('credential');
    const cloning = await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'release-2', entryPoint: 'projects' });
    expect(cloning.phase).toBe('cloning');
    await Bun.sleep(0);
    expect(flow.calls).toContainEqual(['cloned', '/chosen/source']);
  });

  test('a repository with no branches at all is an empty one, not a clone', async () => {
    const flow = fixture({ branches: async () => [] });
    await flow.select();
    expect((await flow.service.command({ kind: 'branches', repositoryId: REPO.id })).failure).toBe('empty');
  });

  test('cancel waits for cleanup and records one cancelled attempt', async () => {
    let cleaned = false;
    const flow = fixture({ clone: async ({ signal }) => {
      await new Promise<void>((resolve) => { if (signal.aborted) resolve(); else signal.addEventListener('abort', () => resolve(), { once: true }); });
      cleaned = true; return { ok: false, failure: 'cancelled' };
    } });
    await flow.select(); await flow.service.command({ kind: 'clone', repositoryId: REPO.id, branch: 'design', entryPoint: 'projects' });
    await Bun.sleep(0);
    expect((await flow.service.command({ kind: 'cancel' })).failure).toBe('cancelled');
    expect(cleaned).toBe(true);
    expect(flow.events).toEqual([['clone', 'started', 'projects'], ['clone', 'cancelled', 'projects']]);
  });

  test('returning unconnected records what the designer does next without a dead end', async () => {
    const flow = fixture();
    flow.backend.status = async () => ({ status: 'disconnected' });
    await flow.service.command({ kind: 'start', entryPoint: 'onboarding' });
    await flow.service.command({ kind: 'status' });
    await flow.service.command({ kind: 'leave', next: 'folder' });
    expect(flow.events).toEqual([['connect', 'no_connection', 'folder', 'onboarding']]);
  });

  test('owner approval is explicitly reported by the person, never inferred from no connection', async () => {
    const flow = fixture(); await flow.service.command({ kind: 'start', entryPoint: 'onboarding' });
    await flow.service.command({ kind: 'leave', next: 'waiting' });
    expect(flow.events).toEqual([]);
    await flow.service.command({ kind: 'leave', next: 'folder' });
    expect(flow.events).toEqual([['connect', 'waiting', 'folder', 'onboarding']]);
  });

  test('late repositories after sign-out cannot cross into the next account', async () => {
    const flow = fixture();
    flow.backend.repositories = async () => { flow.signOut(); return { status: 'connected', repositories: [REPO], nextPage: null }; };
    const result = await flow.service.command({ kind: 'repositories' });
    expect(result.enabled).toBe(false); expect(result.repositories).toEqual([]);
  });

  test('leaving invalidates an in-flight repository request', async () => {
    const flow = fixture();
    let release!: () => void;
    flow.backend.repositories = async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return { status: 'connected', repositories: [REPO], nextPage: null };
    };
    const request = flow.service.command({ kind: 'repositories' });
    await flow.service.command({ kind: 'leave', next: 'dismiss' });
    release();
    await request;
    flow.backend.status = async () => ({ status: 'connected', scopes: ['repo'], expiresAt: null });
    expect((await flow.service.command({ kind: 'status' })).repositories).toEqual([]);
  });

  test('all repository pages are loaded and a pagination loop fails closed', async () => {
    const flow = fixture();
    flow.backend.repositories = async (page) => ({ status: 'connected', repositories: [{ ...REPO, id: page }], nextPage: page === 1 ? 2 : null });
    expect((await flow.service.command({ kind: 'repositories' })).repositories.map((repo) => repo.id)).toEqual([1, 2]);
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [REPO], nextPage: 1 });
    expect((await flow.service.command({ kind: 'repositories' })).phase).toBe('failed');
  });

  /* The cloud's repository contract carries no organization-policy state, so no real listing can reach
     the greyed row and its refused clone until the product means it to (ONL-3182). */
  test('a listing is rebuilt from the fields Studio knows, so a cloud field cannot grey a row', async () => {
    const flow = fixture();
    flow.backend.repositories = async () => ({ status: 'connected', repositories: [
      { ...REPO, access: 'sso', onThisComputer: true, surprise: 'from the cloud' } as GithubRepository,
    ], nextPage: null });
    const listed = (await flow.service.command({ kind: 'repositories' })).repositories;
    expect(listed).toEqual([{ ...REPO, onThisComputer: false }]);
    expect(JSON.stringify(listed)).not.toContain('surprise');
  });

  test('a listing Studio cannot act on is left out of the list', () => {
    expect(listedRepository(REPO)).toEqual(REPO);
    expect(listedRepository({ ...REPO, canPull: false })).toBeUndefined();
    expect(listedRepository({ ...REPO, fullName: 'no-slash' })).toBeUndefined();
    expect(listedRepository({ ...REPO, id: 1.5 })).toBeUndefined();
    expect(listedRepository({ ...REPO, defaultBranch: null })?.defaultBranch).toBeNull();
    expect(listedRepository({ ...REPO, archived: undefined as unknown as boolean })?.archived).toBe(false);
  });

  test('Back from a repository already on this computer returns to the list with the row now labelled', async () => {
    const flow = fixture({ existing: () => '/registered/project' });
    await flow.select();
    const open = await flow.service.command({ kind: 'open', repositoryId: REPO.id });
    expect(open.existingPath).toBe('/registered/project');
    const list = await flow.service.command({ kind: 'list' });
    expect(list.repositoryId).toBeUndefined();
    expect(list.existingPath).toBeUndefined();
    expect(list.repositories).toEqual([{ ...REPO, onThisComputer: true }]);
    expect(flow.events.filter((event) => Array.isArray(event) && event[0] === 'connect')).toEqual([]);
  });

  for (const reason of ['revoked', 'expired', 'missing_scopes'] as const) test(`lapsed access remains actionable: ${reason}`, async () => {
    const flow = fixture(); flow.backend.status = async () => ({ status: 'reconnect', reason });
    expect((await flow.service.command({ kind: 'status' })).connection).toEqual({ status: 'reconnect', reason });
  });
});
