import { create } from 'zustand';
import type { GithubEntryPoint, GithubImportCommand, GithubImportState } from '@studio/events';
import { capable } from '../capabilities.js';
import { flagEnabled } from '../flags/store.js';
import { studio } from '../bridge.js';

export const EMPTY_GITHUB: GithubImportState = {
  enabled: false, connection: { status: 'checking' }, repositories: [], branches: [], phase: 'idle', progress: 0,
};

export const GITHUB_STATUS_TIMEOUT_MS = 10_000;

export const useGithubImport = create<{
  state: GithubImportState;
  pendingCommands: GithubImportCommand[];
  progressCommands: GithubImportCommand[];
}>(() => ({ state: EMPTY_GITHUB, pendingCommands: [], progressCommands: [] }));

/* One owner for the commands in flight: retiring it drops its de-duplication table and its
   queue together, and every answer still coming back is no longer current (ONL-3182). */
interface Dispatch {
  requests: Map<string, Promise<GithubImportState>>;
  queue: Promise<unknown>;
}
let dispatch: Dispatch = { requests: new Map(), queue: Promise.resolve() };
/** The connection the person opened in the browser; the watcher polls only while it is unanswered. */
let connection: 'idle' | 'waiting' = 'idle';

function retire(): void {
  dispatch = { requests: new Map(), queue: Promise.resolve() };
}

/** Off without a provider that brokers GitHub: nothing is asked of main, since nothing could answer. */
function githubOffered(): boolean {
  return flagEnabled('githubImport') && capable('github');
}

const keyOf = (command: GithubImportCommand | { kind: 'select'; repositoryId: number }): string => JSON.stringify(command);

/* The one answer to whether a clone is running: from the press, which main has not heard yet,
   until main's own phase says it has stopped. Every view asks here (ONL-3182). */
export function cloningNow(store: Pick<ReturnType<typeof useGithubImport.getState>, 'state' | 'pendingCommands'>): boolean {
  return store.state.phase === 'cloning' || store.pendingCommands.some((command) => command.kind === 'clone');
}

export function githubCommand(command: GithubImportCommand, background = command.kind === 'status'): Promise<GithubImportState> {
  if (!githubOffered()) return Promise.resolve(EMPTY_GITHUB);
  const foreground = !background;
  const deduplicate = foreground && command.kind !== 'begin' && command.kind !== 'leave';
  const existing = deduplicate ? dispatch.requests.get(keyOf(command)) : undefined;
  if (existing) return existing;
  if (command.kind === 'select') {
    const state = useGithubImport.getState().state;
    const repository = state.repositories.find((repo) => repo.id === command.repositoryId);
    if (cloningNow(useGithubImport.getState()) || repository === undefined) return Promise.resolve(state);
    retire();
    useGithubImport.setState({
      state: { ...state, repositoryId: command.repositoryId, branches: repository.defaultBranch === null ? [] : [repository.defaultBranch], existingPath: undefined, failure: undefined, sourcePath: undefined, progress: 0, phase: 'idle' },
      pendingCommands: [], progressCommands: [],
    });
  }
  const owner = dispatch;
  const selection = command.kind === 'clone' ? owner.requests.get(keyOf({ kind: 'select', repositoryId: command.repositoryId })) : undefined;
  const key = keyOf(command);
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (foreground) {
    useGithubImport.setState((store) => ({ pendingCommands: [...store.pendingCommands, command] }));
    timer = setTimeout(() => {
      if (owner === dispatch) useGithubImport.setState((store) => ({ progressCommands: [...store.progressCommands, command] }));
    }, 300);
  }
  const result = owner.queue.then(async () => {
    if (selection !== undefined && command.kind === 'clone') {
      const acknowledgement = await selection;
      if (acknowledgement.repositoryId !== command.repositoryId || acknowledgement.phase === 'failed') return acknowledgement;
    }
    return performCommand(command, owner);
  }).finally(() => {
    clearTimeout(timer);
    if (!foreground) return;
    if (deduplicate) owner.requests.delete(key);
    if (owner !== dispatch) return;
    useGithubImport.setState((store) => ({
      pendingCommands: store.pendingCommands.filter((candidate) => candidate !== command),
      progressCommands: store.progressCommands.filter((candidate) => candidate !== command),
    }));
  });
  if (deduplicate) owner.requests.set(key, result);
  owner.queue = result.catch(() => {});
  return result;
}

async function performCommand(command: GithubImportCommand, owner: Dispatch): Promise<GithubImportState> {
  if (owner !== dispatch) return EMPTY_GITHUB;
  if (!githubOffered()) return EMPTY_GITHUB;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = studio().githubImport(command);
    const status = useGithubImport.getState().state.connection.status;
    const needsDeadline = command.kind === 'status' && (status === 'checking' || status === 'unavailable' || status === 'not_found' || status === 'invalid_request');
    const state = await (needsDeadline ? Promise.race([request, new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('GitHub status timed out')), GITHUB_STATUS_TIMEOUT_MS);
    })]) : request);
    if (owner === dispatch) {
      if (command.kind === 'start') connection = state.connection.status === 'connecting' ? 'waiting' : 'idle';
      if (state.connection.status === 'connected' || command.kind === 'begin' || command.kind === 'cancel' || (command.kind === 'leave' && command.next !== 'waiting')) connection = 'idle';
      const previous = useGithubImport.getState().state;
      useGithubImport.setState({ state: {
        ...state,
        connection: JSON.stringify(previous.connection) === JSON.stringify(state.connection) ? previous.connection : state.connection,
        repositories: JSON.stringify(previous.repositories) === JSON.stringify(state.repositories) ? previous.repositories : state.repositories,
      } });
    }
    return owner === dispatch ? state : EMPTY_GITHUB;
  } catch {
    if (command.kind === 'status' && owner === dispatch && useGithubImport.getState().state.enabled && useGithubImport.getState().state.connection.status !== 'checking') return useGithubImport.getState().state;
    const state: GithubImportState = command.kind === 'select'
      ? { ...useGithubImport.getState().state, phase: 'failed', failure: 'network', branches: [] }
      : { ...EMPTY_GITHUB, enabled: true, connection: { status: 'unavailable', reason: 'provider_unavailable' } };
    if (owner === dispatch) useGithubImport.setState({ state });
    return owner === dispatch ? state : EMPTY_GITHUB;
  } finally {
    clearTimeout(timeout);
  }
}

export async function primeGithub(background = true): Promise<void> {
  const state = await githubCommand({ kind: 'status' }, background);
  if (state.connection.status === 'connected') await githubCommand({ kind: 'repositories' }, background);
}

export async function prepareGithub(entryPoint: GithubEntryPoint): Promise<void> {
  await githubCommand({ kind: 'begin', entryPoint });
  await primeGithub();
}

export function dismissGithub(): void {
  void githubCommand({ kind: 'leave', next: 'dismiss' });
}

export function watchGithub(): () => void {
  if (!githubOffered()) return () => {};
  let active = true;
  let refreshing: Dispatch | undefined;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interval: number | undefined;
  const schedule = (): void => {
    const state = useGithubImport.getState().state;
    const delay = state.phase === 'cloning' ? 300
      : state.connection.status !== 'connected' && (connection === 'waiting' || state.waitingForApproval) ? 5000 : undefined;
    if (timer !== undefined && interval === delay) return;
    clearTimeout(timer);
    timer = undefined;
    interval = delay;
    if (active && refreshing !== dispatch && delay !== undefined) timer = setTimeout(() => { timer = undefined; void refresh(); }, delay);
  };
  const refresh = async (): Promise<void> => {
    if (!active) return;
    if (refreshing === dispatch) { again = true; return; }
    const owner = dispatch;
    refreshing = owner;
    again = false;
    clearTimeout(timer);
    timer = undefined;
    const before = useGithubImport.getState().state;
    try {
      const next = await githubCommand({ kind: 'status' });
      if (active && owner === dispatch && before.connection.status !== 'connected' && next.connection.status === 'connected') await githubCommand({ kind: 'repositories' }, true);
    } finally {
      if (refreshing === owner) {
        refreshing = undefined;
        if (again && active && owner === dispatch) {
          again = false;
          void refresh();
        } else {
          again = false;
          schedule();
        }
      }
    }
  };
  const focus = (): void => { void refresh(); };
  window.addEventListener('focus', focus);
  const stop = studio().onAuthChanged(() => {
    retire();
    connection = 'idle';
    useGithubImport.setState({ state: EMPTY_GITHUB, pendingCommands: [], progressCommands: [] });
    void primeGithub();
  });
  const unsubscribe = useGithubImport.subscribe(schedule);
  schedule();
  return () => { active = false; clearTimeout(timer); unsubscribe(); stop(); window.removeEventListener('focus', focus); };
}
