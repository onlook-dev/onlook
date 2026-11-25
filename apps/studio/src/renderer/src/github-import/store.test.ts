import { afterEach, beforeEach, expect, jest, test } from 'bun:test';
import '../testing/dom.js';
import type { GithubImportCommand, GithubImportState } from '@studio/events';
import { seedCapabilities } from '../capabilities.js';
import { seedFlags } from '../flags/store.js';
import { deferred, installBridge } from '../testing/bridge.js';
import { cloningNow, EMPTY_GITHUB, githubCommand, useGithubImport, watchGithub } from './store.js';

const connected: GithubImportState = {
  ...EMPTY_GITHUB, enabled: true, connection: { status: 'connected', scopes: ['repo'], expiresAt: null },
  repositories: [{ id: 1, fullName: 'team/site', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true }],
};
let stop: (() => void) | undefined;
let calls: GithubImportCommand[];

test('startup stays checking until the first status answer connects', async () => {
  const answer = deferred<GithubImportState>();
  useGithubImport.setState({ state: EMPTY_GITHUB });
  installBridge({ githubImport: () => answer.promise });
  const status = githubCommand({ kind: 'status' });
  await tick(0);
  expect(useGithubImport.getState().state.connection.status).toBe('checking');
  answer.settle(connected);
  await status;
  expect(useGithubImport.getState().state.connection.status).toBe('connected');
});

test('a rejected first status request leaves Checking with an unavailable result', async () => {
  useGithubImport.setState({ state: { ...EMPTY_GITHUB, enabled: true } });
  installBridge({ githubImport: async () => { throw new Error('Offline'); } });
  await githubCommand({ kind: 'status' });
  expect(useGithubImport.getState().state.connection.status).toBe('unavailable');
});

beforeEach(() => {
  jest.useFakeTimers();
  seedFlags({ sections: false, connectors: false, githubImport: true });
  seedCapabilities({ github: true });
  useGithubImport.setState({ state: connected, pendingCommands: [], progressCommands: [] });
  calls = [];
  installBridge({
    githubImport: async (command) => { calls.push(command); return structuredClone(useGithubImport.getState().state); },
    onAuthChanged: () => () => {},
  });
});

afterEach(() => {
  stop?.();
  stop = undefined;
  jest.useRealTimers();
  seedCapabilities();
  useGithubImport.setState({ state: EMPTY_GITHUB, pendingCommands: [], progressCommands: [] });
});

async function tick(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms);
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

test('a click selects synchronously while branches wait and a replacement bypasses the old request', async () => {
  const first = deferred<GithubImportState>();
  const second = deferred<GithubImportState>();
  const repository = { ...connected.repositories[0]!, id: 2, fullName: 'designer/portfolio' };
  const repositories = [...connected.repositories, repository];
  useGithubImport.setState({ state: { ...connected, repositories, branches: ['old'], existingPath: '/old/project' } });
  installBridge({ githubImport: (command) => {
    calls.push(command);
    return command.kind === 'select' && command.repositoryId === 1 ? first.promise : second.promise;
  } });
  const oldRequest = githubCommand({ kind: 'select', repositoryId: 1 });
  expect(useGithubImport.getState().state.repositoryId).toBe(1);
  expect(useGithubImport.getState().state.branches).toEqual(['main']);
  expect(useGithubImport.getState().state.existingPath).toBeUndefined();
  await tick(0);
  const newRequest = githubCommand({ kind: 'select', repositoryId: 2 });
  expect(useGithubImport.getState().state.repositoryId).toBe(2);
  await tick(500);
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }, { kind: 'select', repositoryId: 2 }]);
  second.settle({ ...connected, repositories, repositoryId: 2, branches: ['main'] });
  await newRequest;
  first.settle({ ...connected, repositoryId: 1, branches: ['stale'] });
  await oldRequest;
  expect(useGithubImport.getState().state.repositoryId).toBe(2);
  expect(useGithubImport.getState().state.branches).toEqual(['main']);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
});

test('a rejected selection keeps its row, list and destination and can be retried', async () => {
  const answer = deferred<GithubImportState>();
  useGithubImport.setState({ state: { ...connected, destination: '/clones' } });
  installBridge({ githubImport: () => answer.promise });
  const request = githubCommand({ kind: 'select', repositoryId: 1 });
  await tick(500);
  answer.refuse(new Error('Bridge failed'));
  await request;
  expect(useGithubImport.getState().state).toMatchObject({ repositoryId: 1, repositories: connected.repositories, destination: '/clones',
    phase: 'failed', failure: 'network', branches: [] });
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
  installBridge({ githubImport: async () => ({ ...connected, repositoryId: 1, branches: ['main'], destination: '/clones' }) });
  await githubCommand({ kind: 'select', repositoryId: 1 });
  expect(useGithubImport.getState().state.branches).toEqual(['main']);
});

test('a rejected superseded bridge request cannot replace the successful current selection', async () => {
  const old = deferred<GithubImportState>();
  const repository = { ...connected.repositories[0]!, id: 2, fullName: 'designer/site' };
  const replacement = { ...connected, repositories: [...connected.repositories, repository], repositoryId: 2, branches: ['replacement'] };
  useGithubImport.setState({ state: replacement });
  installBridge({ githubImport: (command) => command.kind === 'select' && command.repositoryId === 1 ? old.promise : Promise.resolve(replacement) });
  const pending = githubCommand({ kind: 'select', repositoryId: 1 });
  await tick(0);
  await githubCommand({ kind: 'select', repositoryId: 2 });
  old.refuse(new Error('Stale bridge failure'));
  await pending;
  expect(useGithubImport.getState().state).toEqual(replacement);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
});

test('focus rechecks a connected account without reloading repositories or disabling the picker', async () => {
  stop = watchGithub();
  const reserved: number[] = [];
  const unsubscribe = useGithubImport.subscribe((next) => { reserved.push(next.pendingCommands.length); });
  window.dispatchEvent(new Event('focus'));
  await tick(0);
  unsubscribe();
  expect(calls).toEqual([{ kind: 'status' }]);
  expect(reserved.every((count) => count === 0)).toBe(true);
  expect(useGithubImport.getState().state.connection).toBe(connected.connection);
});

test('a delayed status keeps the settled connection and selection until a different answer arrives', async () => {
  const answer = deferred<GithubImportState>();
  useGithubImport.setState({ state: { ...connected, repositoryId: 1, branches: ['main'] } });
  installBridge({ githubImport: () => answer.promise });
  const request = githubCommand({ kind: 'status' });
  await tick(0);
  expect(useGithubImport.getState().state.connection).toBe(connected.connection);
  expect(useGithubImport.getState().state.repositoryId).toBe(1);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  answer.settle({ ...EMPTY_GITHUB, enabled: true, connection: { status: 'reconnect', reason: 'revoked' } });
  await request;
  expect(useGithubImport.getState().state.connection.status).toBe('reconnect');
  expect(useGithubImport.getState().state.repositoryId).toBeUndefined();
});

test('a failed background check does not replace a settled connection with an unknown result', async () => {
  installBridge({ githubImport: () => Promise.reject(new Error('offline')) });
  await githubCommand({ kind: 'status' });
  expect(useGithubImport.getState().state).toBe(connected);
});

test('selecting a repository blocks duplicate submits before the queued command starts', async () => {
  const answer = deferred<GithubImportState>();
  installBridge({ githubImport: (command) => { calls.push(command); return answer.promise; } });
  const first = githubCommand({ kind: 'select', repositoryId: 1 });
  const second = githubCommand({ kind: 'select', repositoryId: 1 });
  await tick(0);
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  answer.settle(connected);
  await Promise.all([first, second]);
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
});

test('only a slow foreground command reports progress after 300 ms', async () => {
  const answer = deferred<GithubImportState>();
  installBridge({ githubImport: () => answer.promise });
  const command = { kind: 'select' as const, repositoryId: 1 };
  const request = githubCommand(command);
  expect(useGithubImport.getState().pendingCommands).toEqual([command]);
  await tick(299);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
  await tick(1);
  expect(useGithubImport.getState().progressCommands).toEqual([command]);
  answer.settle(connected);
  await request;
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
});

test('a slow background recheck reserves nothing and reports no progress', async () => {
  const answer = deferred<GithubImportState>();
  installBridge({ githubImport: () => answer.promise });
  const request = githubCommand({ kind: 'status' });
  await tick(20_000);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
  answer.settle(connected);
  await request;
});

test('background completion cannot clear a queued foreground reservation', async () => {
  const status = deferred<GithubImportState>();
  const selection = deferred<GithubImportState>();
  installBridge({ githubImport: (command) => command.kind === 'status' ? status.promise : selection.promise });
  const check = githubCommand({ kind: 'status' });
  const command = { kind: 'select' as const, repositoryId: 1 };
  const request = githubCommand(command);
  status.settle(connected);
  await check;
  expect(useGithubImport.getState().pendingCommands).toEqual([command]);
  selection.settle(connected);
  await request;
  await tick(300);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
});

test('reopening a flow queues a new begin after leave instead of joining the dismissed begin', async () => {
  const answer = deferred<GithubImportState>();
  installBridge({ githubImport: (command) => { calls.push(command); return answer.promise; } });
  const first = githubCommand({ kind: 'begin', entryPoint: 'projects' });
  const leave = githubCommand({ kind: 'leave', next: 'dismiss' });
  const reopened = githubCommand({ kind: 'begin', entryPoint: 'projects' });
  answer.settle(connected);
  await Promise.all([first, leave, reopened]);
  expect(calls).toEqual([{ kind: 'begin', entryPoint: 'projects' }, { kind: 'leave', next: 'dismiss' }, { kind: 'begin', entryPoint: 'projects' }]);
});

test('changing accounts clears command progress and ignores its old timer and answer', async () => {
  const selection = deferred<GithubImportState>();
  let authChanged = (): void => {};
  installBridge({
    githubImport: (command) => command.kind === 'select' ? selection.promise : Promise.resolve(connected),
    onAuthChanged: (listener) => { authChanged = () => listener({ email: 'next@onlook.test', source: 'manual' }); return () => {}; },
  });
  stop = watchGithub();
  const request = githubCommand({ kind: 'select', repositoryId: 1 });
  await tick(0);
  authChanged();
  await tick(300);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
  selection.settle({ ...connected, repositoryId: 1 });
  await request;
  await tick(0);
  expect(useGithubImport.getState().state.repositoryId).toBeUndefined();
});

test('approval polling loads repositories once and stops as soon as connected', async () => {
  useGithubImport.setState({ state: { ...EMPTY_GITHUB, enabled: true, connection: { status: 'connecting' }, waitingForApproval: true } });
  installBridge({
    githubImport: async (command) => { calls.push(command); return connected; },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  await tick(5_000);
  expect(calls).toEqual([{ kind: 'status' }, { kind: 'repositories' }]);
  await tick(20_000);
  expect(calls).toHaveLength(2);
});

test('a connected repository list stays idle for twenty seconds even with an old approval flag', async () => {
  useGithubImport.setState({ state: { ...connected, waitingForApproval: true } });
  stop = watchGithub();
  await tick(20_000);
  expect(calls).toEqual([]);
});

test('a slow approval check does not queue more polls and resumes only after its answer', async () => {
  const answer = deferred<GithubImportState>();
  const waiting: GithubImportState = { ...EMPTY_GITHUB, enabled: true, waitingForApproval: true };
  useGithubImport.setState({ state: waiting });
  installBridge({
    githubImport: (command) => { calls.push(command); return answer.promise; },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  await tick(5_000);
  await tick(20_000);
  expect(calls).toHaveLength(1);
  answer.settle(waiting);
  await tick(0);
  await tick(5_000);
  expect(calls).toHaveLength(2);
});

test('clone progress keeps polling until completion without reloading repositories', async () => {
  useGithubImport.setState({ state: { ...connected, phase: 'cloning' } });
  stop = watchGithub();
  await tick(300);
  expect(calls).toEqual([{ kind: 'status' }]);
  useGithubImport.setState({ state: { ...connected, phase: 'done', progress: 100 } });
  await tick(20_000);
  expect(calls).toHaveLength(1);
});

test('a superseded focus request cannot hold the refresh lock needed to observe clone completion', async () => {
  const old = deferred<GithubImportState>();
  let statuses = 0;
  const selected: GithubImportState = { ...connected, repositoryId: 1, branches: ['main'], destination: '/clones' };
  installBridge({
    githubImport: (command) => {
      calls.push(command);
      if (command.kind === 'status') return ++statuses === 1 ? old.promise : Promise.resolve({ ...selected, phase: 'done', progress: 100 });
      return Promise.resolve(command.kind === 'clone' ? { ...selected, phase: 'cloning' } : selected);
    },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  window.dispatchEvent(new Event('focus'));
  await tick(0);
  await githubCommand({ kind: 'select', repositoryId: 1 });
  await githubCommand({ kind: 'clone', repositoryId: 1, branch: 'main', entryPoint: 'projects' });
  await tick(300);
  const beforeOldAnswer = useGithubImport.getState().state.phase;
  old.settle({ ...EMPTY_GITHUB, enabled: true });
  await tick(0);
  expect(beforeOldAnswer).toBe('done');
  expect(useGithubImport.getState().state.phase).toBe('done');
});

test('Clone reserved during selection never reaches main when that selection acknowledgement fails', async () => {
  const selection = deferred<GithubImportState>();
  installBridge({ githubImport: (command) => { calls.push(command); return command.kind === 'select' ? selection.promise : Promise.resolve(connected); } });
  const selecting = githubCommand({ kind: 'select', repositoryId: 1 });
  await tick(0);
  const cloning = githubCommand({ kind: 'clone', repositoryId: 1, branch: 'main', entryPoint: 'projects' });
  selection.refuse(new Error('Selection transport failed'));
  await Promise.all([selecting, cloning]);
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  expect(useGithubImport.getState().state.failure).toBe('network');
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
});

test('focus events share an in-flight refresh and teardown cancels future polling', async () => {
  const answer = deferred<GithubImportState>();
  installBridge({
    githubImport: (command) => { calls.push(command); return answer.promise; },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('focus'));
  await tick(0);
  expect(calls).toHaveLength(1);
  stop();
  answer.settle(connected);
  await tick(20_000);
  expect(calls).toHaveLength(1);
});

test('an unfinished connection keeps checking after a disconnected answer until approved', async () => {
  let approved = false;
  installBridge({
    githubImport: async (command) => {
      calls.push(command);
      if (command.kind === 'start') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: 'connecting' } };
      return approved ? connected : { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: 'disconnected' } };
    },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  await githubCommand({ kind: 'start', entryPoint: 'projects' });
  await tick(5_000);
  expect(useGithubImport.getState().state.connection.status).toBe('disconnected');
  approved = true;
  await tick(5_000);
  expect(calls.map((command) => command.kind)).toEqual(['start', 'status', 'status', 'repositories']);
  await tick(20_000);
  expect(calls).toHaveLength(4);
});

test('focus during an old answer requests one trailing check and discovers approval', async () => {
  const old = deferred<GithubImportState>();
  let statusCalls = 0;
  useGithubImport.setState({ state: { ...EMPTY_GITHUB, enabled: true } });
  installBridge({
    githubImport: (command) => {
      calls.push(command);
      return command.kind === 'status' && statusCalls++ === 0 ? old.promise : Promise.resolve(connected);
    },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  window.dispatchEvent(new Event('focus'));
  await tick(0);
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('focus'));
  old.settle({ ...EMPTY_GITHUB, enabled: true });
  await tick(0);
  expect(calls.map((command) => command.kind)).toEqual(['status', 'status', 'repositories']);
  expect(useGithubImport.getState().state.connection.status).toBe('connected');
});

test('dismissing an unfinished connection cancels its polling', async () => {
  installBridge({
    githubImport: async (command) => {
      calls.push(command);
      return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: 'connecting' } };
    },
    onAuthChanged: () => () => {},
  });
  stop = watchGithub();
  await githubCommand({ kind: 'start', entryPoint: 'projects' });
  await githubCommand({ kind: 'leave', next: 'dismiss' });
  await tick(20_000);
  expect(calls.map((command) => command.kind)).toEqual(['start', 'leave']);
});

test('a clone is running from the press until main says it has stopped', async () => {
  const answer = deferred<GithubImportState>();
  useGithubImport.setState({ state: { ...connected, repositoryId: 1, branches: ['main'], destination: '/clones' } });
  installBridge({ githubImport: (command) => { calls.push(command); return answer.promise; } });
  const request = githubCommand({ kind: 'clone', repositoryId: 1, branch: 'main', entryPoint: 'projects' });
  expect(cloningNow(useGithubImport.getState())).toBe(true);
  /* No second selection reaches main while that is true, whichever side is holding the clone. */
  await githubCommand({ kind: 'select', repositoryId: 1 });
  expect(calls).toEqual([{ kind: 'clone', repositoryId: 1, branch: 'main', entryPoint: 'projects' }]);
  answer.settle({ ...connected, repositoryId: 1, branches: ['main'], phase: 'cloning', progress: 4 });
  await request;
  expect(cloningNow(useGithubImport.getState())).toBe(true);
  useGithubImport.setState({ state: { ...connected, repositoryId: 1, phase: 'failed', failure: 'cancelled' } });
  expect(cloningNow(useGithubImport.getState())).toBe(false);
});
