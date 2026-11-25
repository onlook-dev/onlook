import type { GithubBackend, GithubCredential } from './backend.js';
import type { GithubCloneFailure, GithubEntryPoint, GithubImportCommand, GithubImportState, GithubRepository } from '@studio/events';
import { listRemoteBranches } from './branches.js';
import { validCredential } from './git.js';
import { cloneRepository } from './clone.js';

/** A clone past this is not stuck, it is big; the view says so rather than leaving the bar to explain itself. */
export const SLOW_CLONE_MS = 8000;
export const GITHUB_STATUS_TIMEOUT_MS = 8000;

const FULL_NAME = /^[^/\s]{1,100}\/[^/\s]{1,100}$/;

/* Field by field, never spread: a field the cloud adds reaches the picker as presentation
   Studio did not design for, and `access` alone would grey a row and refuse its clone (ONL-3182). */
export function listedRepository(listing: GithubRepository): GithubRepository | undefined {
  if (listing === null || typeof listing !== 'object' || listing.canPull !== true) return undefined;
  if (!Number.isSafeInteger(listing.id) || typeof listing.fullName !== 'string' || !FULL_NAME.test(listing.fullName)) return undefined;
  const defaultBranch = typeof listing.defaultBranch === 'string' && listing.defaultBranch.length > 0 && listing.defaultBranch.length < 256 ? listing.defaultBranch : null;
  return {
    id: listing.id, fullName: listing.fullName, private: listing.private === true, defaultBranch,
    archived: listing.archived === true, canPull: true, canPush: listing.canPush === true,
  };
}

export interface GithubImportDeps {
  enabled(): boolean;
  backend(): GithubBackend | undefined;
  subject(): string | undefined;
  open(url: string): Promise<void>;
  parent(choice: 'onlook' | 'documents' | 'choose'): Promise<string | undefined>;
  existing(repository: GithubRepository): string | undefined;
  connectEvent(outcome: 'connected' | 'waiting' | 'no_connection', next: 'clone' | 'folder' | 'retry' | 'dismiss' | 'waiting', entryPoint: GithubEntryPoint): void;
  cloneEvent(outcome: 'started' | 'done' | NonNullable<GithubImportState['failure']>, entryPoint: GithubEntryPoint): void;
  creationEvent?(step: 'started' | 'abandoned'): void;
  cloned(path: string): void;
  clone?: typeof cloneRepository;
  branches?: (credential: Extract<GithubCredential, { status: 'ready' }>) => Promise<string[]>;
  now?: () => number;
}

interface Selection {
  repository: GithubRepository;
  branches: string[];
  existingPath?: string;
}

type SettledPhase =
  | { kind: 'idle' }
  | { kind: 'ready'; selection: Selection }
  | { kind: 'done'; selection: Selection; sourcePath: string; progress: number }
  | { kind: 'failed'; selection?: Selection; failure: GithubCloneFailure };

type ImportPhase = SettledPhase
  | { kind: 'loading'; previous: SettledPhase }
  | { kind: 'cloning'; selection: Selection; destination: string; progress: number; startedAt: number };

type ConnectionAttempt = { kind: 'none' | 'finished' }
  | { kind: 'active'; entryPoint: GithubEntryPoint; outcome: 'connected' | 'waiting' | 'no_connection' };

export function createGithubImport(deps: GithubImportDeps) {
  const githubOff = (): GithubImportState => ({
    enabled: false, connection: { status: deps.subject() === undefined ? 'disconnected' : 'checking' }, repositories: [], branches: [], phase: 'idle', progress: 0,
  });
  let context: Pick<GithubImportState, 'enabled' | 'connection' | 'repositories' | 'destination' | 'destinationChoice'> = githubOff();
  let phase: ImportPhase = { kind: 'idle' };
  let account: string | undefined;
  let generation = 0;
  let work: { controller: AbortController; running: Promise<void> } | undefined;
  let attempt: ConnectionAttempt = { kind: 'none' };
  let approval: 'none' | 'waiting' = 'none';
  let creationActive = false;

  const now = (): number => (deps.now ?? Date.now)();

  function snapshot(): GithubImportState {
    const settled = phase.kind === 'loading' ? phase.previous : phase;
    const selection = 'selection' in settled ? settled.selection : undefined;
    return {
      ...context,
      phase: phase.kind === 'ready' ? 'idle' : phase.kind,
      ...(settled.kind === 'cloning' ? { cloneStage: now() - settled.startedAt >= SLOW_CLONE_MS ? 'slow' as const : 'cloning' as const } : {}),
      repositoryId: selection?.repository.id,
      branches: selection?.branches ?? [],
      existingPath: selection?.existingPath,
      progress: 'progress' in settled ? settled.progress : 0,
      sourcePath: settled.kind === 'done' ? settled.sourcePath : undefined,
      failure: settled.kind === 'failed' ? settled.failure : undefined,
      connectionAttempted: attempt.kind !== 'none',
      waitingForApproval: approval === 'waiting',
    };
  }

  function reset(): void {
    abandonCreation();
    generation += 1;
    work?.controller.abort();
    account = deps.subject();
    context = githubOff();
    phase = { kind: 'idle' };
    attempt = { kind: 'none' };
    approval = 'none';
  }

  function abandonCreation(): void {
    if (!creationActive) return;
    creationActive = false;
    deps.creationEvent?.('abandoned');
  }

  function finish(next: 'clone' | 'folder' | 'retry' | 'dismiss' | 'waiting'): void {
    if (attempt.kind !== 'active') return;
    deps.connectEvent(attempt.outcome, next, attempt.entryPoint);
    attempt = { kind: 'finished' };
  }

  async function command(command: GithubImportCommand): Promise<GithubImportState> {
    if (!deps.enabled() || deps.subject() === undefined) { reset(); return snapshot(); }
    if (account !== deps.subject()) reset();
    context = { ...context, enabled: true };
    const epoch = generation;
    const active = (): boolean => generation === epoch && account === deps.subject() && deps.enabled();
    if (command.kind === 'begin') {
      finish('dismiss');
      abandonCreation();
      generation += 1;
      const owner = generation;
      phase = { kind: 'idle' };
      if (command.entryPoint !== 'settings') {
        creationActive = true;
        deps.creationEvent?.('started');
      }
      work?.controller.abort();
      await work?.running;
      if (owner !== generation) return githubOff();
      if (account !== deps.subject() || !deps.enabled()) { abandonCreation(); return githubOff(); }
      return snapshot();
    }
    if (command.kind === 'cancel') {
      abandonCreation();
      work?.controller.abort();
      await work?.running;
      return active() ? snapshot() : githubOff();
    }
    if (command.kind === 'leave') {
      if (command.next === 'waiting') {
        if (context.connection.status === 'disconnected' || context.connection.status === 'forbidden') approval = 'waiting';
        if (attempt.kind === 'active' && attempt.outcome !== 'connected') attempt.outcome = 'waiting';
        return snapshot();
      }
      finish(command.next);
      abandonCreation();
      generation += 1;
      const owner = generation;
      phase = { kind: 'idle' };
      work?.controller.abort();
      await work?.running;
      return owner === generation && account === deps.subject() && deps.enabled() ? snapshot() : githubOff();
    }
    if (phase.kind === 'cloning') return snapshot();
    if (command.kind === 'list') {
      /* What the dead end learned about the chosen repository outlives the choice: its row says so. */
      const settled = phase.kind === 'loading' ? phase.previous : phase;
      const selection = 'selection' in settled ? settled.selection : undefined;
      if (selection?.existingPath !== undefined) {
        const known = { ...selection.repository, onThisComputer: true };
        context = { ...context, repositories: context.repositories.map((repo) => repo.id === known.id ? known : repo) };
      }
      phase = { kind: 'idle' };
      return snapshot();
    }
    if (command.kind === 'open') {
      const repository = context.repositories.find((repo) => repo.id === command.repositoryId);
      if (repository === undefined) return snapshot();
      const previous = phase;
      const ownsOpen = (): boolean => active() && phase === previous;
      const selection: Selection = { repository, branches: repository.defaultBranch === null ? [] : [repository.defaultBranch] };
      try {
        const existingPath = deps.existing(repository);
        if (!ownsOpen()) return active() ? snapshot() : githubOff();
        const refreshed = { ...repository, onThisComputer: existingPath !== undefined };
        context = { ...context, repositories: context.repositories.map((repo) => repo.id === refreshed.id ? refreshed : repo) };
        phase = { kind: 'ready', selection: { ...selection, repository: refreshed, existingPath } };
      } catch {
        if (ownsOpen()) phase = { kind: 'failed', selection, failure: 'existing' };
      }
      return active() ? snapshot() : githubOff();
    }
    if (phase.kind === 'loading' && command.kind !== 'select') return snapshot();
    const backend = deps.backend();
    if (backend === undefined) {
      context = { ...context, connection: { status: 'unavailable', reason: 'not_configured' }, repositories: [] };
      phase = { kind: 'idle' };
      return snapshot();
    }
    if (command.kind === 'select' && !context.repositories.some((repo) => repo.id === command.repositoryId)) return snapshot();
    const loading: Extract<ImportPhase, { kind: 'loading' }> = { kind: 'loading', previous: phase.kind === 'loading' ? phase.previous : phase };
    phase = loading;
    const ownsLoading = (): boolean => active() && phase === loading;
    let statusTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (command.kind === 'access') {
        await deps.open('https://github.com/settings/connections/applications');
      } else if (command.kind === 'status') {
        const deadline = new Promise<never>((_resolve, reject) => {
          statusTimer = setTimeout(() => reject(new Error('GitHub status timed out')), GITHUB_STATUS_TIMEOUT_MS);
        });
        const connection = await Promise.race([backend.status(), deadline]);
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        context = { ...context, connection };
        if (connection.status === 'connected') approval = 'none';
        if (connection.status === 'connected' && attempt.kind === 'active') attempt.outcome = 'connected';
        const failedSelection = loading.previous.kind === 'failed' && loading.previous.failure === 'access' && loading.previous.selection !== undefined;
        if (connection.status !== 'connected' && !failedSelection) { context = { ...context, repositories: [] }; phase = { kind: 'idle' }; }
      } else if (command.kind === 'start') {
        finish('retry');
        attempt = { kind: 'active', entryPoint: command.entryPoint, outcome: 'no_connection' };
        context = { ...context, repositories: [] };
        loading.previous = { kind: 'idle' };
        const result = await backend.start();
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        if (result.status === 'connecting') {
          const url = new URL(result.url);
          if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid connection URL');
          context = { ...context, connection: { status: 'connecting' } };
          await deps.open(url.toString());
        } else context = { ...context, connection: result };
      } else if (command.kind === 'repositories') {
        const repositories: GithubRepository[] = [];
        const pages = new Set<number>();
        let page: number | null = 1;
        while (page !== null) {
          if (pages.has(page) || pages.size >= 100) throw new Error('Invalid pagination');
          pages.add(page);
          const result = await backend.repositories(page);
          if (!ownsLoading()) return active() ? snapshot() : githubOff();
          if (result.status !== 'connected') {
            context = { ...context, connection: result, repositories: [] };
            phase = { kind: 'idle' };
            return snapshot();
          }
          for (const listing of result.repositories) {
            const repo = listedRepository(listing);
            if (repo !== undefined) repositories.push({ ...repo, onThisComputer: deps.existing(repo) !== undefined });
          }
          page = result.nextPage;
        }
        context = { ...context, repositories };
        const previous = loading.previous;
        const selection = 'selection' in previous ? previous.selection : undefined;
        const repository = repositories.find((candidate) => candidate.id === selection?.repository.id && candidate.fullName === selection.repository.fullName);
        phase = previous.kind !== 'idle' && selection !== undefined && repository !== undefined
          ? { ...previous, selection: { ...selection, repository } }
          : { kind: 'idle' };
      } else if (command.kind === 'select') {
        const repo = context.repositories.find((candidate) => candidate.id === command.repositoryId);
        if (repo === undefined) { phase = loading.previous; return snapshot(); }
        const existingPath = deps.existing(repo);
        const selection: Selection = { repository: repo, branches: repo.defaultBranch === null ? [] : [repo.defaultBranch], existingPath };
        loading.previous = { kind: 'ready', selection };
        const parent = context.destination ?? await deps.parent('onlook');
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        context = { ...context, destination: parent, destinationChoice: context.destinationChoice ?? 'onlook' };
        phase = { kind: 'ready', selection };
      } else if (command.kind === 'branches') {
        const previous = loading.previous;
        /* Only a settled choice can grow a branch list: a finished clone keeps its own result. */
        const selection = previous.kind === 'ready' || previous.kind === 'failed' ? previous.selection : undefined;
        if (selection === undefined || selection.repository.id !== command.repositoryId) { phase = previous; return snapshot(); }
        const credential = await backend.credential(selection.repository.fullName, 'clone');
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        if (credential.status !== 'ready') { phase = { kind: 'failed', selection, failure: 'access' }; return snapshot(); }
        if (!validCredential(credential, selection.repository.fullName)) throw new Error('Invalid credential');
        const branches = await (deps.branches ?? listRemoteBranches)(credential);
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        phase = branches.length === 0 ? { kind: 'failed', failure: 'empty', selection } : { kind: 'ready', selection: { ...selection, branches } };
      } else if (command.kind === 'destination') {
        const destination = await deps.parent(command.destination);
        if (ownsLoading() && destination !== undefined) context = { ...context, destination, destinationChoice: command.destination };
      } else if (command.kind === 'clone') {
        const previous = loading.previous;
        const selection = previous.kind === 'ready' || previous.kind === 'failed' ? previous.selection : undefined;
        const listed = selection !== undefined && (command.branch === (selection.repository.defaultBranch ?? '') || selection.branches.includes(command.branch));
        if (selection === undefined || command.repositoryId !== selection.repository.id || !listed || work !== undefined) {
          phase = previous;
          return snapshot();
        }
        const repo = selection.repository;
        const existingPath = deps.existing(repo);
        if (existingPath !== undefined) { phase = { kind: 'ready', selection: { ...selection, existingPath } }; return snapshot(); }
        const destination = context.destination ?? await deps.parent('onlook');
        if (!ownsLoading()) return active() ? snapshot() : githubOff();
        if (destination === undefined) { phase = { kind: 'failed', selection, failure: 'destination' }; return snapshot(); }
        context = { ...context, destination, destinationChoice: context.destinationChoice ?? 'onlook' };
        if (!creationActive && command.entryPoint !== 'settings') {
          creationActive = true;
          deps.creationEvent?.('started');
        }
        finish('clone');
        deps.cloneEvent('started', command.entryPoint);
        const controller = new AbortController();
        const signal = controller.signal;
        const cloning: Extract<ImportPhase, { kind: 'cloning' }> = { kind: 'cloning', selection, destination, progress: 0, startedAt: now() };
        phase = cloning;
        const ownsClone = (): boolean => active() && phase === cloning;
        const running = (async () => {
          let outcome: NonNullable<GithubImportState['failure']> | 'done' = 'access';
          try {
            const credential = await backend.credential(repo.fullName, 'clone');
            if (!ownsClone() || signal.aborted) outcome = 'cancelled';
            else if (credential.status === 'ready') {
              const result = await (deps.clone ?? cloneRepository)({ credential, repository: repo.fullName, branch: command.branch, parent: cloning.destination, signal,
                progress: (progress) => { if (ownsClone()) cloning.progress = Math.max(cloning.progress, progress); },
              });
              outcome = result.ok ? 'done' : result.failure;
              if (result.ok && ownsClone()) {
                deps.cloned(result.sourcePath);
                creationActive = false;
                phase = { kind: 'done', selection, sourcePath: result.sourcePath, progress: cloning.progress };
              }
            }
          } catch { outcome = signal.aborted ? 'cancelled' : 'network'; }
          if (ownsClone() && outcome !== 'done') phase = { kind: 'failed', selection, failure: outcome };
          deps.cloneEvent(outcome, command.entryPoint);
        })();
        const currentWork = { controller, running };
        work = currentWork;
        void running.finally(() => { if (work === currentWork) work = undefined; });
      }
    } catch {
      if (ownsLoading()) {
        const previous = loading.previous;
        phase = { kind: 'failed', failure: 'network', selection: 'selection' in previous ? previous.selection : undefined };
        context = { ...context, connection: context.connection.status === 'connecting' || (command.kind === 'status' && context.connection.status === 'checking') ? { status: 'unavailable', reason: 'provider_unavailable' } : context.connection };
      }
    } finally {
      if (statusTimer !== undefined) clearTimeout(statusTimer);
      if (phase === loading) phase = loading.previous;
    }
    return active() ? snapshot() : githubOff();
  }
  return { command, dispose() { finish('dismiss'); reset(); } };
}
