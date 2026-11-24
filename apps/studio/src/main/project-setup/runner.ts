import type { ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { ProjectSetupAction, ProjectSetupFailure, ProjectSetupResult, ProjectSetupSnapshot, ServerOwnership, VersionedProjectSetup } from '@studio/events';
import { t } from '@studio/i18n';
import { canonicalPath } from '../lib/canonical-path.js';
import { userEnv } from '../env/shell-env.js';
import { log } from '../log/index.js';
import { identifyListener, isAlive, verifiesFor, type IdentifyListener, type ListenerIdentity } from '../server/owner.js';
import { probePort } from '../server/probe.js';
import type { SetupRunFailureReason, TelemetryProperties } from '../telemetry/events.js';
import { previewStderrTail, reportedPreviewPort, type PreviewDiagnostics } from '../telemetry/preview-diagnostics.js';
import { previewProjectTools } from '../workspace/preview-tools.js';
import { installFingerprint, installationReusable } from './fingerprint.js';
import { containedPath, setupState, snapshotOf, validatePaths, versionDefinition, type SetupState } from './state.js';
import { setupShell } from './shell.js';
import { isWindows } from '../env/platform.js';
import { envWithout, leadsOwnGroup, signalGroup, startChild } from '../env/child.js';

type Server = VersionedProjectSetup['definition']['servers'][number];
interface RuntimeEndpoint {
  server?: Server;
  version: VersionedProjectSetup;
  safeCommand: string;
  folder?: string;
}
interface ReconnectedEndpoint extends RuntimeEndpoint {
  server: Server;
  folder: string;
  pid: number;
  listenerFolder: string;
}
interface ProcessHandle extends RuntimeEndpoint {
  child: ChildProcess;
  output: string;
  stderr: string;
  spawnedAt: number;
  exit: { code: number | null; signal: string | null } | undefined;
  error: string | undefined;
  done: Promise<void>;
  closed: Promise<void>;
  termination: { state: 'live' } | { state: 'stopping'; promise: Promise<void>; killed: boolean } | { state: 'stopped' } | { state: 'failed' };
}
interface ActiveRun { controller: AbortController; promise: Promise<ProjectSetupResult>; selection: string; version: VersionedProjectSetup }
interface StopRun { promise: Promise<ProjectSetupResult>; pending: ActiveRun | undefined }
type RunPhase =
  | { state: 'idle' }
  | { state: 'preparing' | 'installing' | 'starting'; run: ActiveRun }
  | { state: 'running' }
  | { state: 'failed'; failure: ProjectSetupFailure; run?: ActiveRun }
  | { state: 'stopping'; stop: StopRun };

function pendingRun(phase: RunPhase | undefined): ActiveRun | undefined {
  if (phase?.state === 'stopping') return phase.stop.pending;
  return phase && 'run' in phase ? phase.run : undefined;
}
/** `*` is every saved server; a listed selection is the sorted ids a run was asked for. */
function runCovers(run: ActiveRun, serverId: string | undefined): boolean {
  return run.selection === '*' || (serverId !== undefined && run.selection.split(',').includes(serverId));
}
const IDENTIFY_ATTEMPTS = 3;
export interface ProjectSetupDeps {
  state?: SetupState;
  env?: () => Promise<NodeJS.ProcessEnv>;
  probe?: (port: number) => Promise<boolean>;
  identify?: IdentifyListener;
  shell?: (cwd: string, env: NodeJS.ProcessEnv) => string | undefined;
  allowed?: (cwd: string) => boolean;
  changed?: (cwd: string, snapshot: ProjectSetupSnapshot) => void;
  runCompleted?: (cwd: string, measurement: Omit<TelemetryProperties<'project_setup_run_completed'>, 'project_id'>) => void;
  installationChecked?: (cwd: string, reused: boolean) => void;
  diagnostics?: (cwd: string, measurement: Partial<PreviewDiagnostics>, reset?: boolean) => void;
  serverExited?: (cwd: string) => void;
  report: (cwd: string, folder: string, port: number, signal: AbortSignal) => Promise<void>;
  installTimeoutMs?: number;
  readyTimeoutMs?: number;
  stopGraceMs?: number;
  identifyRetryMs?: number;
}

export function redactSetupOutput(text: string, env: NodeJS.ProcessEnv): string {
  let result = text;
  for (const [name, value] of Object.entries(env)) {
    if (/token|secret|password|credential|api.?key/i.test(name) && value && value.length >= 4) result = result.replaceAll(value, '[redacted]');
  }
  return result.replace(/((?:[\w]*TOKEN|[\w]*SECRET|[\w]*PASSWORD|[\w]*API_KEY)\s*[=:]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/gi, '$1[redacted]').slice(-16384);
}

export async function untilAborted<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error(t('projectSetup.failure.canceled'));
  let abort: () => void = () => undefined;
  const canceled = new Promise<never>((_done, reject) => { abort = () => reject(new Error(t('projectSetup.failure.canceled'))); signal.addEventListener('abort', abort, { once: true }); });
  try { return await Promise.race([pending, canceled]); }
  finally { signal.removeEventListener('abort', abort); }
}
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
function groupAlive(handle: ProcessHandle): boolean {
  if (handle.child.pid === undefined) return false;
  if (isWindows()) return handle.exit === undefined && isAlive(handle.child.pid);
  try { process.kill(-handle.child.pid, 0); return true; } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

export function createProjectSetupService(deps: ProjectSetupDeps) {
  const store = deps.state ?? setupState;
  const probe = deps.probe ?? probePort;
  const identify = deps.identify ?? identifyListener;
  const identityOf = async (port: number, folder: string, signal: AbortSignal): Promise<ListenerIdentity | undefined> => {
    for (let attempt = 1; ; attempt += 1) {
      const identity = await untilAborted(identify(port), signal);
      const ownership = verifiesFor(identity, folder);
      if (ownership !== 'unknown' || attempt === IDENTIFY_ATTEMPTS) return identity;
      await delay(deps.identifyRetryMs ?? 250, undefined, { signal }).catch(() => undefined);
      if (signal.aborted) throw new Error(t('projectSetup.failure.canceled'));
    }
  };
  const ownershipOf = async (port: number, folder: string, signal: AbortSignal): Promise<ServerOwnership> => verifiesFor(await identityOf(port, folder, signal), folder);
  const handles = new Map<string, Set<ProcessHandle>>();
  const phases = new Map<string, RunPhase>();
  const reconnected = new Map<string, Set<ReconnectedEndpoint>>();
  const sameListener = (endpoint: ReconnectedEndpoint, identity: ListenerIdentity | undefined): boolean =>
    identity?.pid === endpoint.pid && identity.cwd !== undefined && canonicalPath(identity.cwd) === endpoint.listenerFolder && verifiesFor(identity, endpoint.folder) === 'ours';
  const cancellations = new Map<string, number>();
  const retainedFailures = new Map<string, ProjectSetupFailure>();
  const failureReasons = new WeakMap<ProjectSetupResult, SetupRunFailureReason>();
  const logger = log('project-setup');
  const recordMeasurement = (notify: () => void): void => {
    try { notify(); }
    catch { logger.error('setup analytics callback failed'); }
  };
  const allowed = (cwd: string) => { if (deps.allowed && !deps.allowed(cwd)) throw new Error(t('projectSetup.failure.unregistered')); };
  const read = (cwd: string): ProjectSetupSnapshot => {
    allowed(cwd);
    cwd = store.key(cwd);
    const record = store.read(cwd);
    const phase = phases.get(cwd);
    const failure = phase?.state === 'failed' ? phase.failure : retainedFailures.get(cwd) ?? record.failure;
    return structuredClone(snapshotOf({ ...record, failure }, phase?.state));
  };
  const publish = (cwd: string, phase: RunPhase): void => {
    phases.set(cwd, phase);
    deps.changed?.(cwd, read(cwd));
  };
  const publishRun = (cwd: string, run: ActiveRun, state: 'preparing' | 'installing' | 'starting'): void => {
    const phase = phases.get(cwd);
    if (pendingRun(phase) === run && phase?.state !== 'stopping') publish(cwd, { state, run });
  };
  const result = (cwd: string, reason?: string): ProjectSetupResult => reason === undefined ? { ok: true, snapshot: read(cwd) } : { ok: false, snapshot: read(cwd), reason };
  const retainFailure = (cwd: string, failure: ProjectSetupFailure): void => {
    retainedFailures.set(cwd, failure);
    try { store.write(cwd, { ...store.read(cwd), failure }); }
    catch (error) { logger.error('failure persistence failed', { error: String(error) }); }
  };
  const recordFailure = (cwd: string, failure: ProjectSetupFailure, run?: ActiveRun): void => {
    retainFailure(cwd, failure);
    if (phases.get(cwd)?.state !== 'stopping') publish(cwd, { state: 'failed', failure, ...(run ? { run } : {}) });
  };
  const matchesEndpoint = (handle: RuntimeEndpoint, cwd: string, server: Server): boolean => handle.server !== undefined &&
    (handle.server.port === server.port || handle.folder === canonicalPath(resolve(cwd, server.cwd)));
  const ownedForServer = <Endpoint extends RuntimeEndpoint>(live: readonly Endpoint[], cwd: string, server: Server, servers: readonly Server[]): Endpoint[] => {
    const exact = live.filter((handle) => handle.server?.id === server.id);
    if (exact.length > 0) return exact;
    const candidates = live.filter((handle) => matchesEndpoint(handle, cwd, server));
    if (candidates.length > 1 || candidates.some((handle) => servers.some((saved) => saved.id === handle.server?.id))) throw new Error(t('projectSetup.failure.ambiguousServer'));
    return candidates;
  };
  const selectedHandles = (cwd: string, ids?: string[], includeReconnected = true): (ProcessHandle | ReconnectedEndpoint)[] => {
    const live = [...handles.get(cwd) ?? [], ...(includeReconnected ? reconnected.get(cwd) ?? [] : [])];
    if (ids === undefined) return live;
    const servers = store.read(cwd).saved?.definition.servers ?? [];
    const selected = new Set<ProcessHandle | ReconnectedEndpoint>(live.filter((handle) => !handle.server));
    for (const id of ids) {
      const exact = live.filter((handle) => handle.server?.id === id);
      if (exact.length > 0) { for (const handle of exact) selected.add(handle); continue; }
      const server = servers.find((saved) => saved.id === id);
      if (server) for (const handle of ownedForServer(live, cwd, server, servers)) selected.add(handle);
    }
    return [...selected];
  };
  const launch = (shell: string, cwd: string, command: string, env: NodeJS.ProcessEnv, version: VersionedProjectSetup, server?: Server): ProcessHandle => {
    const childEnv = envWithout(env, ['ELECTRON_RUN_AS_NODE', 'ELECTRON_NO_ASAR', 'NODE_OPTIONS', 'NODE_CHANNEL_FD']);
    if (server) childEnv['PORT'] = String(server.port);
    const child = startChild(shell, ['-e', '-c', command], { cwd, env: childEnv, detached: leadsOwnGroup(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const handle: ProcessHandle = { child, output: '', stderr: '', spawnedAt: Date.now(), exit: undefined, error: undefined, done: Promise.resolve(), closed: Promise.resolve(), version, termination: { state: 'live' }, safeCommand: redactSetupOutput(server?.start ?? command, env), ...(server ? { server, folder: canonicalPath(containedPath(cwd, server.cwd)) } : {}) };
    handle.done = new Promise((done) => {
      child.once('error', (error) => { handle.error = error.message; done(); });
      child.once('exit', (code, signal) => { handle.exit = { code, signal }; done(); });
    });
    handle.closed = new Promise((closed) => { child.once('close', () => closed()); });
    const collect = (chunk: Buffer) => { handle.output = (handle.output + chunk.toString()).slice(-32768); };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', (chunk: Buffer) => { collect(chunk); handle.stderr = (handle.stderr + chunk.toString()).slice(-8192); });
    return handle;
  };
  const kill = (handle: ProcessHandle): void => {
    if (handle.termination.state !== 'stopping' || handle.termination.killed) return;
    signalGroup(handle.child, 'SIGKILL', 'throw-unless-gone');
    handle.termination.killed = true;
  };
  const terminate = (handle: ProcessHandle, immediate = false): Promise<void> => {
    if (handle.termination.state === 'stopped') return Promise.resolve();
    if (handle.termination.state === 'stopping') {
      if (immediate) kill(handle);
      return handle.termination.promise;
    }
    const termination = { state: 'stopping' as const, promise: Promise.resolve(), killed: false };
    termination.promise = Promise.resolve().then(async () => {
      if (immediate) kill(handle);
      else signalGroup(handle.child, 'SIGTERM', 'throw-unless-gone');
      const deadline = Date.now() + (immediate ? 0 : deps.stopGraceMs ?? 2000);
      while (!termination.killed && groupAlive(handle) && Date.now() < deadline) await delay(25);
      if (groupAlive(handle)) kill(handle);
      await Promise.race([handle.done, delay(500)]);
      const killedDeadline = Date.now() + 500;
      while (groupAlive(handle) && Date.now() < killedDeadline) await delay(25);
      if (groupAlive(handle)) throw new Error(t('projectSetup.failure.processGroupAlive'));
      await Promise.race([handle.closed, delay(500)]);
      handle.termination = { state: 'stopped' };
    }).catch((error: unknown) => { handle.termination = { state: 'failed' }; throw error; });
    handle.termination = termination;
    return termination.promise;
  };
  const execute = async (cwd: string, run: ActiveRun, ids: string[] | undefined): Promise<ProjectSetupResult> => {
    const { version, controller } = run;
    const started = Date.now();
    const launched = new Set<ProcessHandle>();
    const live = handles.get(cwd) ?? new Set<ProcessHandle>();
    handles.set(cwd, live);
    const endpoints = reconnected.get(cwd) ?? new Set<ReconnectedEndpoint>();
    reconnected.set(cwd, endpoints);
    let env: NodeJS.ProcessEnv = {};
    let stage: ProjectSetupFailure['stage'] = 'prepare';
    let command = version.definition.prepare;
    let currentHandle: ProcessHandle | undefined;
    let currentServer: Server | undefined;
    let failureHandle: ProcessHandle | undefined;
    const check = () => { if (controller.signal.aborted || pendingRun(phases.get(cwd)) !== run) throw new Error(t('projectSetup.failure.canceled')); };
    let failureReason: SetupRunFailureReason | undefined;
    let measuredFailure = false;
    const measure = (patch: Partial<PreviewDiagnostics>, reset = false): void => recordMeasurement(() => deps.diagnostics?.(cwd, patch, reset));
    const measureFailure = (handle?: ProcessHandle, code?: SetupRunFailureReason): void => {
      measuredFailure = true;
      const reported = reportedPreviewPort(handle?.output ?? '');
      measure({
        cause: code ?? (stage === 'install' ? 'install_failed' : stage === 'prepare' ? 'prepare_failed' : handle?.error ? 'process_error' : handle?.exit ? 'process_exited' : 'unknown'),
        ...((handle?.server ?? currentServer) ? { expected_port: (handle?.server ?? currentServer)!.port } : {}),
        reported_port: reported,
        process_exited: handle === undefined ? null : handle.exit !== undefined,
        exit_code: handle?.exit?.code ?? null,
        exit_signal: handle?.exit?.signal ?? null,
        stderr_tail: previewStderrTail(handle?.stderr ?? ''),
        spawn_to_failure_ms: handle === undefined ? null : Date.now() - handle.spawnedAt,
        ...(stage === 'install' ? { install_succeeded: false } : {}),
      });
    };
    const fail = (stage: ProjectSetupFailure['stage'], command: string, reason: string, handle?: ProcessHandle, code?: SetupRunFailureReason): never => {
      failureHandle = handle;
      failureReason = code;
      measureFailure(handle, code);
      const server = handle?.server ?? currentServer;
      const failure: ProjectSetupFailure = {
        revision: version.revision, stage, command: redactSetupOutput(command, env), reason: redactSetupOutput(reason, env),
        outputTail: redactSetupOutput(handle?.output ?? '', env), elapsedMs: Date.now() - started,
        ...(server ? { serverId: server.id } : {}),
        ...(handle?.exit?.code !== null && handle?.exit?.code !== undefined ? { exitCode: handle.exit.code } : {}),
        ...(handle?.exit?.signal ? { signal: handle.exit.signal } : {}),
      };
      throw failure;
    };
    try {
      measure({}, true);
      env = await untilAborted<NodeJS.ProcessEnv>((deps.env ?? userEnv)(), controller.signal);
      check();
      validatePaths(cwd, version.definition);
      const shellPath = (deps.shell ?? setupShell)(cwd, env);
      if (shellPath === undefined) throw new Error(t('projectSetup.failure.shellMissing'));
      const requested = version.definition.servers.filter((server) => ids === undefined || ids.includes(server.id));
      const requestedHandles = new Map<string, ProcessHandle>();
      const requestedEndpoints = new Map<string, ReconnectedEndpoint>();
      if (requested.length === 0 || ids?.some((id) => !version.definition.servers.some((server) => server.id === id))) throw new Error(t('projectSetup.failure.unknownServer'));
      const shell = async (text: string, phase: 'prepare' | 'install') => {
        stage = phase;
        command = text;
        publishRun(cwd, run, phase === 'prepare' ? 'preparing' : 'installing');
        check();
        if (!text.trim()) return;
        const handle = launch(shellPath, cwd, text, env, version);
        live.add(handle);
        launched.add(handle);
        const timeout = new AbortController();
        try {
          await untilAborted(Promise.race([handle.done, delay(deps.installTimeoutMs ?? 600000, undefined, { signal: timeout.signal })]), controller.signal);
        } finally { timeout.abort(); }
        check();
        if (handle.error || !handle.exit || handle.exit.code !== 0) fail(phase, text, handle.error ?? (!handle.exit ? t('projectSetup.failure.commandTimeout') : t('projectSetup.failure.commandFailed')), handle);
        await terminate(handle);
        live.delete(handle);
        launched.delete(handle);
      };
      await shell(version.definition.prepare, 'prepare');
      const reused = installationReusable(cwd, version.definition, store.read(cwd).installFingerprint);
      recordMeasurement(() => deps.installationChecked?.(cwd, reused));
      if (!reused) {
        store.write(cwd, { ...store.read(cwd), installFingerprint: null });
        await shell(`${version.definition.prepare}\n${version.definition.install.script}`, 'install');
        check();
        store.write(cwd, { ...store.read(cwd), installFingerprint: installFingerprint(cwd, version.definition) });
      }
      stage = 'start';
      measure({ install_succeeded: true });
      publishRun(cwd, run, 'starting');
      for (const server of requested) {
        stage = 'start';
        currentHandle = undefined;
        currentServer = server;
        check();
        const folder = containedPath(cwd, server.cwd);
        measure({ ...previewProjectTools(folder), expected_port: server.port, actual_port: null, reported_port: null, port_occupied: null, port_owner: null });
        command = `${version.definition.prepare}\ncd ${quote(folder)}\n${server.start}`;
        const owned = ownedForServer([...live, ...endpoints], cwd, server, version.definition.servers);
        if (owned.length > 1) throw new Error(t('projectSetup.failure.ambiguousServer'));
        const existing = owned.find((handle): handle is ProcessHandle => 'child' in handle && !handle.exit && !handle.error);
        if (existing) {
          currentHandle = existing;
          if (existing.termination.state !== 'live') throw new Error(t('projectSetup.failure.processGroupAlive'));
          if (existing.version.revision !== version.revision) throw new Error(t('projectSetup.failure.changedSetup'));
          if (existing.server?.port !== server.port || existing.server.start !== server.start || existing.server.cwd !== server.cwd) throw new Error(t('projectSetup.failure.changedServer'));
          if (!await probe(server.port)) throw new Error(t('projectSetup.failure.unverifiedListener'));
          const ownership = await ownershipOf(server.port, folder, controller.signal);
          check();
          if (ownership === 'unknown') { failureReason = 'listener_unseen'; throw new Error(t('projectSetup.failure.listenerUnseen', { port: server.port })); }
          if (ownership !== 'ours') { failureReason = 'listener_foreign'; throw new Error(t('projectSetup.failure.unverifiedListener')); }
          check();
          await untilAborted(deps.report(cwd, folder, server.port, controller.signal), controller.signal);
          check();
          if (existing.exit || existing.error) fail('start', command, existing.error ?? t('projectSetup.failure.earlyExit'), existing);
          requestedHandles.set(server.id, existing);
          continue;
        }
        for (const handle of owned.filter((candidate): candidate is ProcessHandle => 'child' in candidate && !!(candidate.exit || candidate.error))) {
          await terminate(handle);
          live.delete(handle);
          check();
        }
        const remembered = owned.find((endpoint): endpoint is ReconnectedEndpoint => !('child' in endpoint));
        if (remembered) {
          if (!await probe(remembered.server.port)) endpoints.delete(remembered);
          else {
            if (remembered.version.revision !== version.revision) throw new Error(t('projectSetup.failure.changedSetup'));
            if (remembered.server.port !== server.port || remembered.server.start !== server.start || remembered.server.cwd !== server.cwd) throw new Error(t('projectSetup.failure.changedServer'));
          }
          check();
        }
        if (await probe(server.port)) {
          const identity = await identityOf(server.port, folder, controller.signal);
          const ownership = verifiesFor(identity, folder);
          measure({ port_occupied: true, port_owner: ownership === 'ours' ? 'project' : ownership === 'foreign' ? 'other' : 'unknown' });
          check();
          if (ownership === 'unknown') fail('ready', command, t('projectSetup.failure.listenerUnseen', { port: server.port }), undefined, 'listener_unseen');
          if (ownership !== 'ours') fail('ready', command, t('projectSetup.failure.occupiedPort', { port: server.port }), undefined, 'port_occupied');
          const endpoint: ReconnectedEndpoint = {
            server, folder: canonicalPath(folder), version, safeCommand: redactSetupOutput(server.start, env), pid: identity!.pid, listenerFolder: canonicalPath(identity!.cwd!),
          };
          if (remembered) endpoints.delete(remembered);
          endpoints.add(endpoint);
          requestedEndpoints.set(server.id, endpoint);
          await untilAborted(deps.report(cwd, folder, server.port, controller.signal), controller.signal);
          check();
          continue;
        }
        if (remembered) endpoints.delete(remembered);
        measure({ port_occupied: false, port_owner: null });
        check();
        const handle = launch(shellPath, cwd, command, env, version, server);
        currentHandle = handle;
        live.add(handle);
        launched.add(handle);
        stage = 'ready';
        const deadline = Date.now() + (deps.readyTimeoutMs ?? 60000);
        let ready = false;
        while (Date.now() < deadline) {
          check();
          if (handle.exit || handle.error) fail('start', command, handle.error ?? t('projectSetup.failure.earlyExit'), handle);
          if (await probe(server.port)) {
            check();
            const ownership = await ownershipOf(server.port, folder, controller.signal);
            check();
            if (ownership === 'unknown') fail('ready', command, t('projectSetup.failure.listenerUnseen', { port: server.port }), handle, 'listener_unseen');
            if (ownership !== 'ours') fail('ready', command, t('projectSetup.failure.listenerFolder'), handle, 'listener_foreign');
            measure({ actual_port: server.port, reported_port: reportedPreviewPort(handle.output), cause: 'unknown', process_exited: false });
            ready = true;
            break;
          }
          await delay(100);
        }
        if (!ready) fail('ready', command, t('projectSetup.failure.readinessTimeout'), handle, 'readiness_timeout');
        check();
        await untilAborted(deps.report(cwd, folder, server.port, controller.signal), controller.signal);
        check();
        if (handle.exit || handle.error) fail('start', command, handle.error ?? t('projectSetup.failure.earlyExit'), handle);
        requestedHandles.set(server.id, handle);
      }
      for (const endpoint of requestedEndpoints.values()) {
        check();
        currentServer = endpoint.server;
        currentHandle = undefined;
        command = endpoint.safeCommand;
        stage = 'ready';
        if (!endpoints.has(endpoint) || !await probe(endpoint.server.port)) fail('ready', command, t('projectSetup.failure.earlyExit'));
        const identity = await identityOf(endpoint.server.port, endpoint.folder, controller.signal);
        check();
        const ownership = verifiesFor(identity, endpoint.folder);
        if (ownership === 'unknown') fail('ready', command, t('projectSetup.failure.listenerUnseen', { port: endpoint.server.port }), undefined, 'listener_unseen');
        if (!sameListener(endpoint, identity)) fail('ready', command, t('projectSetup.failure.unverifiedListener'), undefined, ownership === 'foreign' ? 'listener_foreign' : undefined);
        if (!await probe(endpoint.server.port)) fail('ready', command, t('projectSetup.failure.earlyExit'));
        check();
      }
      for (const handle of requestedHandles.values()) {
        check();
        if (!live.has(handle) || handle.exit || handle.error || handle.termination.state !== 'live') fail('start', handle.safeCommand, handle.error ?? t('projectSetup.failure.earlyExit'), handle);
      }
      const allReady = version.definition.servers.every((server) => requestedEndpoints.has(server.id) || [...live].some((handle) => handle.server?.id === server.id && handle.version.revision === version.revision && !handle.exit && !handle.error && handle.termination.state === 'live'));
      const record = store.read(cwd);
      const previousFailure = retainedFailures.get(cwd) ?? record.failure;
      const complete = allReady && requested.length === version.definition.servers.length;
      const failure = complete || !previousFailure?.serverId || requested.some((server) => server.id === previousFailure.serverId) ? null : previousFailure;
      store.write(cwd, { ...record, ...(allReady && failure === null ? { verified: version } : {}), failure });
      if (failure === null) retainedFailures.delete(cwd);
      publish(cwd, failure ? { state: 'failed', failure } : { state: 'running' });
      for (const handle of launched) {
        void handle.done.then(async () => {
          if (!live.has(handle) || handle.termination.state !== 'live' || !handle.server) return;
          measureFailure(handle);
          recordMeasurement(() => deps.serverExited?.(cwd));
          const failure: ProjectSetupFailure = { revision: version.revision, stage: 'start', serverId: handle.server.id, command: redactSetupOutput(handle.server.start, env), reason: t('projectSetup.failure.unexpectedExit'), outputTail: redactSetupOutput(handle.output, env), elapsedMs: Date.now() - started, ...(handle.exit?.code === null || handle.exit?.code === undefined ? {} : { exitCode: handle.exit.code }), ...(handle.exit?.signal ? { signal: handle.exit.signal } : {}) };
          const recordExit = (failure: ProjectSetupFailure): void => {
            const pending = pendingRun(phases.get(cwd));
            if (pending && runCovers(pending, failure.serverId)) retainFailure(cwd, failure);
            else recordFailure(cwd, failure, pending);
          };
          recordExit(failure);
          await terminate(handle);
          live.delete(handle);
          const outputTail = redactSetupOutput(handle.output, env);
          if (outputTail !== failure.outputTail && retainedFailures.get(cwd) === failure) recordExit({ ...failure, outputTail });
        }).catch((error: unknown) => logger.error('exited process cleanup failed', { error: String(error) }));
      }
      return result(cwd);
    } catch (error) {
      if (!controller.signal.aborted && !measuredFailure) measureFailure(currentHandle);
      const reported = reportedPreviewPort((failureHandle ?? currentHandle)?.output ?? '');
      if (!controller.signal.aborted && currentServer && reported !== null && reported !== currentServer.port) {
        try {
          const folder = containedPath(cwd, currentServer.cwd);
          if (await probe(reported) && verifiesFor(await identityOf(reported, folder, controller.signal), folder) === 'ours') {
            measure({ actual_port: reported, ...(failureReason === 'readiness_timeout' ? { cause: 'reported_port_mismatch' as const } : {}) });
          }
        } catch { }
      }
      const cleanup = await Promise.allSettled([...launched].map(async (handle) => { await terminate(handle); live.delete(handle); }));
      const terminationFailure = cleanup.find((entry) => entry.status === 'rejected');
      if (terminationFailure?.status === 'rejected') {
        const reason = t('projectSetup.failure.stopTermination', { reason: String(terminationFailure.reason) });
        recordFailure(cwd, { revision: version.revision, stage: 'stop', command: redactSetupOutput(command, env), reason, outputTail: '', elapsedMs: Date.now() - started });
        return result(cwd, reason);
      }
      if (controller.signal.aborted) return result(cwd, t('projectSetup.failure.canceled'));
      if (failureHandle) await Promise.race([failureHandle.closed, delay(500)]);
      const failure = error && typeof error === 'object' && 'stage' in error ? { ...error as ProjectSetupFailure, outputTail: redactSetupOutput(failureHandle?.output ?? (error as ProjectSetupFailure).outputTail, env) } : { revision: version.revision, stage, command: redactSetupOutput(command, env), reason: redactSetupOutput(error instanceof Error ? error.message : String(error), env), outputTail: redactSetupOutput(currentHandle?.output ?? '', env), elapsedMs: Date.now() - started, ...(currentServer ? { serverId: currentServer.id } : {}) };
      recordFailure(cwd, failure);
      const failed = result(cwd, failure.reason);
      if (failureReason) failureReasons.set(failed, failureReason);
      return failed;
    }
  };
  const terminateReconnected = async (endpoint: ReconnectedEndpoint): Promise<void> => {
    const { port } = endpoint.server;
    const signal = new AbortController().signal;
    const signalListener = async (name: NodeJS.Signals): Promise<void> => {
      if (!await probe(port)) return;
      const identity = await identityOf(port, endpoint.folder, signal);
      const ownership = verifiesFor(identity, endpoint.folder);
      if (ownership === 'unknown' || !sameListener(endpoint, identity) || !Number.isInteger(endpoint.pid) || endpoint.pid <= 1 || endpoint.pid === process.pid) {
        if (!await probe(port)) return;
        throw new Error(ownership === 'unknown' ? t('projectSetup.failure.listenerUnseen', { port }) : t('projectSetup.failure.unverifiedListener'));
      }
      try { process.kill(endpoint.pid, name); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
    };
    if (!await probe(port)) return;
    await signalListener('SIGTERM');
    const deadline = Date.now() + (deps.stopGraceMs ?? 2000);
    while (await probe(port) && Date.now() < deadline) await delay(25);
    if (await probe(port)) await signalListener('SIGKILL');
  };
  const stop = (cwd: string, serverIds?: string[], includeReconnected = true): Promise<ProjectSetupResult> => {
    const phase = phases.get(cwd);
    const previous = phase?.state === 'stopping' ? phase.stop : undefined;
    const pending = pendingRun(phase);
    const live = handles.get(cwd);
    const failureBeforeStop = retainedFailures.get(cwd);
    let selected: (ProcessHandle | ReconnectedEndpoint)[];
    try { selected = selectedHandles(cwd, serverIds, includeReconnected); }
    catch (error) { return Promise.resolve(result(cwd, error instanceof Error ? error.message : String(error))); }
    pending?.controller.abort();
    const owns = (): boolean => {
      const current = phases.get(cwd);
      return current?.state === 'stopping' && current.stop === operation;
    };
    const settle = (next: RunPhase): void => {
      if (owns()) publish(cwd, next);
    };
    /** A superseded stop keeps its reason for its own caller and leaves the successor's snapshot alone. */
    const settleFailure = (failure: ProjectSetupFailure): ProjectSetupResult => {
      if (!owns()) return result(cwd, failure.reason);
      recordFailure(cwd, failure);
      settle({ state: 'failed', failure });
      return result(cwd, failure.reason);
    };
    let observed: ProcessHandle | ReconnectedEndpoint | undefined;
    const operation: StopRun = { pending, promise: Promise.resolve().then(async () => {
      if (previous) await previous.promise;
      const cleanup = await Promise.allSettled(selected.map(async (handle) => {
        if ('child' in handle) { await terminate(handle); live?.delete(handle); }
        else await terminateReconnected(handle);
      }));
      if (pending) await pending.promise;
      const terminationFailure = cleanup.find((entry) => entry.status === 'rejected');
      if (terminationFailure?.status === 'rejected') {
        const handle = selected[cleanup.indexOf(terminationFailure)]!;
        const reason = t('projectSetup.failure.stopTermination', { reason: String(terminationFailure.reason) });
        return settleFailure({ revision: handle.version.revision, stage: 'stop', ...(handle.server ? { serverId: handle.server.id } : {}), command: handle.safeCommand, reason, outputTail: '', elapsedMs: 0 });
      }
      /** A group that outlived an earlier termination is never one of `selected`: a selected one either left `live` or rejected above. */
      if (pending && [...live ?? []].some((handle) => handle.termination.state !== 'live' && groupAlive(handle))) {
        const recorded = retainedFailures.get(cwd);
        return settleFailure(recorded !== undefined && recorded !== failureBeforeStop ? recorded : {
          revision: pending.version.revision, stage: 'stop', command: '',
          reason: t('projectSetup.failure.processGroupAlive'), outputTail: '', elapsedMs: 0,
        });
      }
      for (const handle of selected) {
        if (!handle.server) continue;
        observed = handle;
        const deadline = Date.now() + 2000;
        while (await probe(handle.server.port) && Date.now() < deadline) await delay(50);
        if (await probe(handle.server.port)) return settleFailure({ revision: handle.version.revision, stage: 'stop', serverId: handle.server.id, command: handle.safeCommand, reason: t('projectSetup.failure.stopListener'), outputTail: '', elapsedMs: 0 });
        if (!('child' in handle)) reconnected.get(cwd)?.delete(handle);
      }
      const running = [...live ?? []].find((handle) => handle.server && !handle.exit && !handle.error && handle.termination.state === 'live') ?? [...reconnected.get(cwd) ?? []][0];
      settle(running ? { state: 'running' } : { state: 'idle' });
      return result(cwd);
    }).catch((error: unknown) => {
      const owner = observed ?? selected[0];
      const version = owner?.version ?? pending?.version ?? store.read(cwd).saved;
      const reason = t('projectSetup.failure.stopTermination', { reason: String(error) });
      if (version) return settleFailure({ revision: version.revision, stage: 'stop', ...(owner?.server ? { serverId: owner.server.id } : {}), command: owner?.safeCommand ?? '', reason, outputTail: '', elapsedMs: 0 });
      settle({ state: 'idle' });
      return result(cwd, reason);
    }) };
    publish(cwd, { state: 'stopping', stop: operation });
    return operation.promise;
  };
  return {
    read,
    /** Unmerged: a live in-flight failure would otherwise sit over the stored record's invalid marker, which the approval predicate reads (ONL-2499). */
    readStored(cwd: string): ProjectSetupSnapshot {
      allowed(cwd);
      const key = store.key(cwd);
      return structuredClone(snapshotOf(store.read(key), phases.get(key)?.state));
    },
    ownsPort(cwd: string, port: number): boolean {
      const key = store.key(cwd);
      return [...handles.get(key) ?? []].some((handle) => handle.server?.port === port && groupAlive(handle)) || [...reconnected.get(key) ?? []].some((endpoint) => endpoint.server.port === port);
    },
    serverIdsForPorts(cwd: string, ports: readonly number[]): string[] {
      const selected = new Set(ports);
      const key = store.key(cwd);
      return [...new Set([
        ...[...handles.get(key) ?? []].filter((handle) => handle.server && selected.has(handle.server.port) && groupAlive(handle)).map((handle) => handle.server!.id),
        ...[...reconnected.get(key) ?? []].filter((endpoint) => selected.has(endpoint.server.port)).map((endpoint) => endpoint.server.id),
      ])];
    },
    save(cwd: string, definition: unknown, expectedRevision: string | null): ProjectSetupResult {
      allowed(cwd);
      cwd = store.key(cwd);
      const record = store.read(cwd);
      if ((record.saved?.revision ?? null) !== expectedRevision) return result(cwd, t('projectSetup.failure.staleRevision'));
      try {
        const saved = versionDefinition(definition);
        validatePaths(cwd, saved.definition);
        store.write(cwd, { ...record, saved });
        deps.changed?.(cwd, read(cwd));
        return result(cwd);
      } catch (error) { return result(cwd, error instanceof Error ? error.message : String(error)); }
    },
    async run(cwd: string, action: ProjectSetupAction): Promise<ProjectSetupResult> {
      allowed(cwd);
      cwd = store.key(cwd);
      if (!['start', 'stop', 'restart'].includes(action.action)) return result(cwd, t('projectSetup.failure.unknownAction'));
      const started = Date.now();
      const perform = async (): Promise<ProjectSetupResult> => {
        const definition = store.read(cwd).saved?.definition;
        const live = [...handles.get(cwd) ?? [], ...reconnected.get(cwd) ?? []];
        if (action.serverIds !== undefined && (!Array.isArray(action.serverIds) || action.serverIds.length === 0 || action.serverIds.some((id) => typeof id !== 'string' ||
          (!definition?.servers.some((server) => server.id === id) && (action.action === 'start' || !live.some((handle) => handle.server?.id === id)))))) return result(cwd, t('projectSetup.failure.unknownServer'));
        if (action.action === 'stop') {
          cancellations.set(cwd, (cancellations.get(cwd) ?? 0) + 1);
          return stop(cwd, action.serverIds);
        }
        const cancellation = cancellations.get(cwd) ?? 0;
        let startIds = action.serverIds;
        if (action.action === 'restart') {
          if (action.serverIds) {
            const servers = definition?.servers ?? [];
            const selected = new Set<string>();
            try {
              for (const id of action.serverIds) {
                const exact = servers.find((server) => server.id === id);
                if (exact) { selected.add(exact.id); continue; }
                const owned = live.filter((handle) => handle.server?.id === id);
                const candidates = servers.filter((server) => owned.some((handle) => matchesEndpoint(handle, cwd, server)));
                if (candidates.length > 1) throw new Error(t('projectSetup.failure.ambiguousServer'));
                const candidate = candidates[0];
                if (candidate) {
                  if (ownedForServer(live, cwd, candidate, servers).some((handle) => !owned.includes(handle))) throw new Error(t('projectSetup.failure.ambiguousServer'));
                  selected.add(candidate.id);
                }
              }
            } catch (error) { return result(cwd, error instanceof Error ? error.message : String(error)); }
            startIds = [...selected];
          }
          const stopped = await stop(cwd, action.serverIds);
          if (!stopped.ok) return stopped;
        }
        while (true) {
          const phase = phases.get(cwd);
          if (phase?.state !== 'stopping') break;
          const stopped = await phase.stop.promise;
          if (!stopped.ok) return stopped;
        }
        if ((cancellations.get(cwd) ?? 0) !== cancellation) return result(cwd, t('projectSetup.failure.canceled'));
        if (startIds?.length === 0) return result(cwd, t('projectSetup.failure.unknownServer'));
        const previous = pendingRun(phases.get(cwd));
        const selection = startIds === undefined ? '*' : [...new Set(startIds)].sort().join(',');
        if (previous) return previous.selection === selection ? previous.promise : result(cwd, t('projectSetup.failure.concurrentStart'));
        const version = store.read(cwd).saved;
        if (!version) return result(cwd, t('projectSetup.failure.noSavedSetup'));
        const controller = new AbortController();
        const run: ActiveRun = { controller, version, selection, promise: Promise.resolve().then(() => execute(cwd, run, startIds)) };
        publish(cwd, { state: 'preparing', run });
        return run.promise;
      };
      const outcome = await perform();
      recordMeasurement(() => deps.runCompleted?.(cwd, {
        action: action.action,
        ok: outcome.ok,
        duration_ms: Date.now() - started,
        ...(!outcome.ok && outcome.snapshot.failure ? { failure_stage: outcome.snapshot.failure.stage } : {}),
        ...(failureReasons.has(outcome) ? { failure_reason: failureReasons.get(outcome) } : {}),
      }));
      return outcome;
    },
    async forget(cwd: string) {
      cwd = store.key(cwd);
      cancellations.set(cwd, (cancellations.get(cwd) ?? 0) + 1);
      const stopped = await stop(cwd, undefined, false);
      if (!stopped.ok) throw new Error(stopped.reason);
      store.forget(cwd);
      phases.delete(cwd);
      retainedFailures.delete(cwd);
      handles.delete(cwd);
      reconnected.delete(cwd);
    },
    async dispose() {
      await Promise.all([...new Set([...handles.keys(), ...reconnected.keys(), ...phases.keys()])].map((cwd) => {
        cancellations.set(cwd, (cancellations.get(cwd) ?? 0) + 1);
        return stop(cwd, undefined, false).then(() => { reconnected.delete(cwd); });
      }));
    },
    disposeNow() {
      for (const cwd of new Set([...handles.keys(), ...reconnected.keys(), ...phases.keys()])) cancellations.set(cwd, (cancellations.get(cwd) ?? 0) + 1);
      for (const phase of phases.values()) pendingRun(phase)?.controller.abort();
      reconnected.clear();
      for (const live of handles.values()) {
        for (const handle of live) {
          void terminate(handle, true).catch((error: unknown) => { logger.error('quit process termination failed', { error: String(error) }); });
        }
      }
    },
  };
}

export type ProjectSetupService = ReturnType<typeof createProjectSetupService>;
