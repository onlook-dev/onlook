import { existsSync } from 'node:fs';
import { handle } from '../ipc/bridge.js';
import {
  IPC_INVOKE,
  type GitCadenceTrigger,
  type GitMeasureTrigger,
  type GitPillDefaultsPatch,
  type GitSnapshotRow,
  type GitStatusChange,
  type GitStatusList,
} from '@studio/events';
import { KILL_GRACE_MS } from '../env/cli.js';
import { knownProject, listWorkspaces, normalizePath } from '../workspace/store.js';
import { readGitPillDefaults, writeGitPillDefaults } from './defaults.js';
import { GH_TIMEOUT_MS } from './gh.js';
import { emptyMeasurement, measure as realMeasure, type MeasureOutcome } from './measure.js';
import { forgetGitStatusRow, reopenGitStatusRow, gitStatusProjectGeneration, gitStatusRowFor, listGitStatusRows, writeGitStatusRow } from './store.js';
import type { GithubBackend } from '../github-import/backend.js';
import { log } from '../log/index.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { gitStateProperties } from '../telemetry/git-state.js';

const logger = log('git-status');

const MEASURE_DEADLINE_MS = 180_000;
const SETTLE_BACKSTOP_MS = GH_TIMEOUT_MS + KILL_GRACE_MS;

export interface GitStatusHostDeps {
  emit(change: GitStatusChange): void;
  onApplied?(worktreePath: string, row: GitSnapshotRow): void;
  measure?: typeof realMeasure;
  now?: () => Date;
  deadlineMs?: number;
  backstopMs?: number;
  backend?: () => GithubBackend | undefined;
}

interface GitCheckOptions {
  trigger: GitCadenceTrigger;
  fetch: boolean;
}

interface RunRequest {
  trigger: GitMeasureTrigger;
  fetch: boolean;
}

export interface GitStatusHost {
  opened(worktreePath: string): Promise<void>;
  turnEnded(worktreePath: string): Promise<void>;
  check(worktreePath: string, opts: GitCheckOptions): Promise<void>;
  list(): GitStatusList;
  connectionChanged(): Promise<void>;
}

interface Pending {
  generation: number;
  trigger: GitMeasureTrigger;
  fetch: boolean;
  requestedAt?: string;
  waiters: Array<() => void>;
}

interface Runner {
  seq: number;
  inFlight?: Promise<void>;
  pending?: Pending;
}

interface Flight {
  done: Promise<void>;
  settled: Promise<void>;
}

const DEADLINE = Symbol('deadline');

const finished = (): Flight => ({ done: Promise.resolve(), settled: Promise.resolve() });

function guarded(what: string, act: () => void): void {
  try {
    act();
  } catch (err) {
    logger.error(what, { error: err });
  }
}

export function createGitStatusHost(deps: GitStatusHostDeps): GitStatusHost {
  const measure = deps.measure ?? ((path, options) => realMeasure(path, options, { backend: deps.backend?.() }));
  const now = deps.now ?? (() => new Date());
  const deadlineMs = deps.deadlineMs ?? MEASURE_DEADLINE_MS;
  const backstopMs = deps.backstopMs ?? SETTLE_BACKSTOP_MS;
  const runners = new Map<string, Runner>();

  const apply = (
    worktreePath: string,
    trigger: GitMeasureTrigger,
    stamps: { measuredAt: string; startedAt: string },
    baseBranch: string,
    outcome: MeasureOutcome | undefined,
  ): void => {
    const { measuredAt, startedAt } = stamps;
    const previous = gitStatusRowFor(worktreePath);
    let row: GitSnapshotRow;
    if (outcome === undefined) {
      row = {
        measurement: previous?.measurement ?? emptyMeasurement(baseBranch, false),
        measuredAt,
        ...(previous?.fetchedAt === undefined ? {} : { fetchedAt: previous.fetchedAt }),
        trigger,
        stale: true,
      };
    } else {
      const measurement = { ...outcome.measurement };
      if (measurement.partial && previous !== undefined) {
        const kept = previous.measurement;
        if (!measurement.ghAuthed) {
          measurement.ghAuthed = kept.ghAuthed;
          if (kept.ghAccount !== undefined) measurement.ghAccount = kept.ghAccount;
        }
        if (measurement.access === 'unknown') measurement.access = kept.access;
        if (measurement.pr === undefined && kept.pr !== undefined) {
          measurement.pr = kept.pr;
          // Only a base this pass did not measure brings its counts along; against the same base the fresh ones are newer (ONL-2411).
          if (kept.baseBranch !== measurement.baseBranch) {
            measurement.baseBranch = kept.baseBranch;
            measurement.baseExists = kept.baseExists;
            measurement.ahead = kept.ahead;
            measurement.behind = kept.behind;
          }
        }
      }
      const fetchedAt = outcome.fetched === true ? startedAt : previous?.fetchedAt;
      row = {
        measurement,
        measuredAt,
        ...(fetchedAt === undefined ? {} : { fetchedAt }),
        trigger,
        stale: outcome.fetched === false || measurement.partial === true,
      };
    }
    guarded('could not persist the row', () => writeGitStatusRow(worktreePath, row));
    guarded('emit threw', () => deps.emit({ worktreePath, row }));
    guarded('onApplied threw', () => deps.onApplied?.(worktreePath, row));
    guarded('telemetry threw', () => {
      const workspaceProperties = resolveWorkspaceTelemetryProperties(worktreePath);
      if (workspaceProperties !== undefined) capture('git_state_measured', {
        ...workspaceProperties,
        ...gitStateProperties(outcome?.measurement, trigger, outcome?.fetched),
      });
    });
  };

  const run = (
    runner: Runner,
    worktreePath: string,
    trigger: GitMeasureTrigger,
    fetch: boolean,
    baseBranch: string | undefined,
    requestedAt: string | undefined,
  ): Flight => {
    if (baseBranch === undefined) return finished();
    const seq = ++runner.seq;
    const generation = gitStatusProjectGeneration(worktreePath);
    const startedAt = now().toISOString();
    const measuredAt = requestedAt ?? startedAt;
    const applyIfCurrent = (outcome: MeasureOutcome | undefined): void => {
      if (seq === runner.seq && generation === gitStatusProjectGeneration(worktreePath)) {
        apply(worktreePath, trigger, { measuredAt, startedAt }, baseBranch, outcome);
      }
    };

    if (!existsSync(worktreePath)) {
      applyIfCurrent(undefined);
      return finished();
    }

    let abandoned = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<typeof DEADLINE>((resolve) => {
      timer = setTimeout(() => {
        abandoned = true;
        resolve(DEADLINE);
      }, deadlineMs);
    });
    const outcome = measure(worktreePath, { baseBranch, fetch }).then(
      (value) => value,
      () => undefined,
    );
    const done = Promise.race([outcome, deadline]).then((result) => {
      if (timer !== undefined) clearTimeout(timer);
      applyIfCurrent(result === DEADLINE ? undefined : result);
    });
    const settled = outcome.then((late) => {
      if (abandoned && late !== undefined) applyIfCurrent(late);
    });
    return { done, settled };
  };

  const start = (
    runner: Runner,
    worktreePath: string,
    trigger: GitMeasureTrigger,
    fetch: boolean,
    baseBranch: string | undefined,
    requestedAt?: string,
  ): Promise<void> => {
    const { done, settled } = run(runner, worktreePath, trigger, fetch, baseBranch, requestedAt);
    let backstop: ReturnType<typeof setTimeout> | undefined;
    const ceiling = new Promise<void>((resolve) => {
      backstop = setTimeout(resolve, deadlineMs + backstopMs);
    });
    runner.inFlight = Promise.race([settled, ceiling]).finally(() => {
      if (backstop !== undefined) clearTimeout(backstop);
      runner.inFlight = undefined;
      const pending = runner.pending;
      if (pending === undefined) return;
      runner.pending = undefined;
      if (pending.generation !== gitStatusProjectGeneration(worktreePath)) {
        for (const wake of pending.waiters) wake();
        return;
      }
      const trailing = start(runner, worktreePath, pending.trigger, pending.fetch, knownProject(worktreePath)?.baseBranch, pending.requestedAt);
      void trailing.catch((err: unknown) => logger.error('trailing measurement failed', { error: err })).finally(() => {
        for (const wake of pending.waiters) wake();
      });
    });
    return done;
  };

  const enqueue = (worktreePath: string, baseBranch: string | undefined, opts: RunRequest): Promise<void> => {
    const key = normalizePath(worktreePath);
    let runner = runners.get(key);
    if (runner === undefined) {
      runner = { seq: 0 };
      runners.set(key, runner);
    }
    if (runner.inFlight === undefined) return start(runner, worktreePath, opts.trigger, opts.fetch, baseBranch);

    const generation = gitStatusProjectGeneration(worktreePath);
    if (runner.pending !== undefined && runner.pending.generation !== generation) {
      for (const wake of runner.pending.waiters) wake();
      runner.pending = undefined;
    }
    const pending = (runner.pending ??= { generation, trigger: opts.trigger, fetch: false, waiters: [] });
    if (opts.trigger === 'turn-end') {
      pending.trigger = 'turn-end';
      pending.requestedAt ??= now().toISOString();
    }
    pending.fetch ||= opts.fetch;
    return new Promise<void>((resolve) => {
      pending.waiters.push(resolve);
    });
  };

  const trigger = (worktreePath: string, opts: RunRequest): Promise<void> => {
    const known = knownProject(worktreePath);
    return known === undefined ? Promise.resolve() : enqueue(worktreePath, known.baseBranch, opts);
  };

  return {
    opened: (worktreePath) => {
      const known = knownProject(worktreePath);
      if (known === undefined) return Promise.resolve();
      return enqueue(worktreePath, known.baseBranch, { trigger: 'open', fetch: true });
    },
    turnEnded: (worktreePath) => trigger(worktreePath, { trigger: 'turn-end', fetch: false }),
    check: (worktreePath, opts) => trigger(worktreePath, opts),
    connectionChanged: async () => {
      const checks: Promise<void>[] = [];
      for (const workspace of listWorkspaces()) {
        for (const project of workspace.projects) {
          if (project.missing) continue;
          forgetGitStatusRow(project.workspacePath);
          reopenGitStatusRow(project.workspacePath);
          checks.push(trigger(project.workspacePath, { trigger: 'focus', fetch: false }));
        }
      }
      await Promise.all(checks);
    },
    list: () => {
      const rows = listGitStatusRows();
      const list: GitStatusList = {};
      for (const summary of listWorkspaces()) {
        for (const project of summary.projects) {
          const row = rows[normalizePath(project.workspacePath)];
          if (row) list[project.workspacePath] = row;
        }
      }
      return list;
    },
  };
}

let host: GitStatusHost | undefined;

export function registerGitStatusHost(deps: GitStatusHostDeps): GitStatusHost {
  host = createGitStatusHost(deps);
  handle(IPC_INVOKE.listGitStatus, (): GitStatusList => host?.list() ?? {});
  handle(IPC_INVOKE.gitPillDefaults, () => readGitPillDefaults());
  handle(IPC_INVOKE.setGitPillDefault, (_event, patch: GitPillDefaultsPatch) =>
    writeGitPillDefaults(patch ?? {}),
  );
  return host;
}

export function gitStatusHost(): GitStatusHost | undefined {
  return host;
}
