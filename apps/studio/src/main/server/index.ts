import { basename } from 'node:path';
import { on } from '../ipc/bridge.js';
import {
  DEFAULT_DEV_PORT,
  IPC_EMIT,
  IPC_SEND,
  originForPort,
  type RunIntent,
  type ServerBookState,
  type ServerEntryState,
  type ServerOwnership,
  type ServerPortMeasurement,
  type ServerState,
} from '@studio/events';
import { createReverifyMoveAuthor, createServerPortFollow, type PortMoveOutcome } from '../canvas/authors.js';
import { applyCanvasOps } from '../canvas/index.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import type { WorkspaceTelemetryProperties } from '../telemetry/events.js';
import { recordPreviewSettlement } from '../telemetry/preview.js';
import { recordProjectPreviewDiagnostics } from '../workspace/preview-diagnostics.js';
import { newPreviewAttempt, previewDiagnostics } from '../telemetry/preview-diagnostics.js';
import { settleCreationPreview } from '../github-import/telemetry.js';
import {
  knownProject,
  registeredProject,
  normalizePath,
  workspaceOrigin,
  workspaceRoot,
} from '../workspace/store.js';
import {
  createServerEntry,
  discriminatePortReport,
  entryForFolder,
  extendServerEntry,
  moveServerEntryPort,
  recordPortMeasurement,
  removeServerEntry,
  serverBookEntries,
  setServerEntryOwnership,
  type PortListener,
  type ServerBookEntry,
} from './book.js';
import {
  DEFAULT_TIMING,
  ServerMachine,
  type FrameStateChange,
  type MonitorTiming,
} from './machine.js';
import { ServerMonitor, sleep } from './monitor.js';
import { installFrameHealthProofHook, removeFrameHealthProofHook } from './frame-health-proof.js';
import { noteStartIntent } from './start-intent.js';
import { noteServerStart, noteServerStop, serverWasStopped } from './user-stop.js';
import { views, workspaceOf } from '../tabs/views.js';
import {
  attributeCwd,
  identifyListener,
  isContainerRuntime,
  verifiesFor,
  type AttributionRoots,
  type IdentifyListener,
  type ListenerIdentity,
} from './owner.js';
import { probePort } from './probe.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';
import { log } from '../log/index.js';
import { projectSetupService } from '../project-setup/service.js';
import type { ProjectSetupService } from '../project-setup/runner.js';
import { canonicalPath } from '../lib/canonical-path.js';
import { signalTree } from '../env/child.js';

const logger = log('server');

type Measured = Extract<ServerPortMeasurement, 'live' | 'dead' | 'stranger'>;

interface PortReading {
  measured: Measured;
  listener?: PortListener;
  studioOwned?: boolean;
}

export interface StarterControl {
  portFor(worktreePath: string): number | undefined;
  running(): readonly string[];
  stop(worktreePath: string): Promise<void>;
  /** Byte-identical to Studio's template, not merely present; the runner's own `isPresent` is existence only. */
  isPresent(worktreePath: string): boolean;
  spawn(worktreePath: string, port?: number): Promise<number>;
  retire(worktreePath: string): Promise<void>;
}

export type AwaitRunningOutcome = 'running' | 'timed-out';

export interface ServerHostDeps {
  setup?: Pick<ProjectSetupService, 'read' | 'run' | 'ownsPort' | 'serverIdsForPorts'>;
  emit(worktreePath: string, state: ServerBookState): void;
  starter?: StarterControl;
  isBlankProject?: (worktreePath: string) => boolean;
  /** `worktreePath` must reach the author's own `apply()`: an unbound apply writes into the forward document (ONL-2226). */
  createPortFollow(worktreePath: string): { observed(state: ServerState): void };
  /** Only `refused` says the frames stayed where they were; anything else reads as moved. */
  authorPortMove(
    fromPort: number,
    toPort: number,
    worktreePath: string,
  ): void | PortMoveOutcome | Promise<void | PortMoveOutcome>;
  attributionRoots(worktreePath: string): AttributionRoots;
  probe?: (port: number) => Promise<boolean>;
  identify?: IdentifyListener;
  signalProcess?: (pid: number, signal: NodeJS.Signals) => void | Promise<void>;
  delay?: (ms: number) => Promise<void>;
  timing?: Partial<MonitorTiming>;
  onFrameState?: (change: FrameStateChange & { worktreePath: string; folder: string; port?: number; wasLive: boolean }) => void;
  workspaceTelemetryPropertiesFor?: (worktreePath: string) => WorkspaceTelemetryProperties | undefined;
}

export interface ServerHost {
  openProject(worktreePath: string): Promise<void>;
  closeProject(onlyIf?: string): Promise<void>;
  deactivateProject(): Promise<void>;
  /** Any registered project, not only the active one, which is `closeProject`'s. */
  closeWorkspace(worktreePath: string): Promise<void>;
  report(
    worktreePath: string,
    folder: string,
    port: number | undefined,
    workspaceTelemetry?: WorkspaceTelemetryProperties,
    signal?: AbortSignal,
  ): Promise<void>;
  press(intent: RunIntent, worktree?: string): void;
  /** Spawns Studio's starter and reports its port, with the book reading `starterSpawning` until the report lands. */
  startStarter(worktreePath: string, port?: number): Promise<void>;
  /** Not a chain step: a chained awaiter holds every later report behind the bound. */
  awaitRunning(worktreePath: string, port: number, boundMs: number): Promise<AwaitRunningOutcome>;
  /** `open` is the view registry's set, never this host's registered set (ONL-2226). */
  stopStarterExcept(open: ReadonlySet<string>): void;
  retainStarter(worktreePath: string): () => void;
  turnStarted(worktreePath: string): void;
  turnEnded(worktreePath: string): void;
  snapshotFor(worktreePath: string): ServerBookState;
  dispose(): void;
}

interface Seat {
  monitor: ServerMonitor;
  /** Never `monitor.watch` directly: a stale `lastAnswer` labels a later silent port `stranger`. */
  watch: (port: number, workspaceTelemetry?: WorkspaceTelemetryProperties) => void;
  observers: Set<(state: ServerState) => void>;
}

type SeatsByEntry = Map<string, Seat>;

export function createServerHost(deps: ServerHostDeps): ServerHost {
  const probe = deps.probe ?? ((port: number) => probePort(port));
  const identify = deps.identify ?? identifyListener;
  const signalProcess = deps.signalProcess ?? signalTree;
  const delay = deps.delay ?? sleep;
  const timing: MonitorTiming = { ...DEFAULT_TIMING, ...deps.timing };
  const isBlankProject = deps.isBlankProject ?? isRegisteredBlankProject;

  const workspaces = new Map<string, SeatsByEntry>();
  const retainedStarters = new Set<string>();
  let activeWorktree: string | undefined;
  const lanes = createKeyedQueue<string | undefined>();

  const pendings = new Map<string, ServerMachine>();
  const starterSpawns = new Map<string, number>();
  /** Signalled but not yet escalated: the 2s wait outlives a quit, which would leave the process on its port (ONL-2499). */
  const awaitingEscalation = new Set<number>();

  function pendingFor(worktreePath: string): ServerMachine {
    const key = normalizePath(worktreePath);
    const existing = pendings.get(key);
    if (existing !== undefined) return existing;
    const machine = new ServerMachine({ emit: () => broadcastFor(worktreePath) });
    pendings.set(key, machine);
    return machine;
  }

  const pendingIfAny = (worktreePath: string): ServerMachine | undefined =>
    pendings.get(normalizePath(worktreePath));

  const chain = <T>(key: string | undefined, step: () => Promise<T>): Promise<T> => lanes.run(key, step);

  function toWire(entry: ServerBookEntry, seats: SeatsByEntry | undefined): ServerEntryState {
    const state = seats?.get(entry.id)?.monitor.state;
    return {
      entryId: entry.id,
      folderName: basename(entry.folder),
      ownership: entry.ownership,
      status: state?.status ?? 'stopped',
      ...(state?.port === undefined ? {} : { port: state.port }),
      ports: entry.ports.map((p) => ({
        port: p.port,
        origin: originForPort(p.port),
        measured: p.measured,
        everLive: p.everLive,
        ...(p.listener === undefined ? {} : { listener: p.listener }),
      })),
      everMeasuredLive: entry.everMeasuredLive,
    };
  }

  function snapshotFor(worktreePath: string): ServerBookState {
    const seats = workspaces.get(worktreePath);
    return {
      entries: serverBookEntries(worktreePath).map((e) => toWire(e, seats)),
      pending: pendingIfAny(worktreePath)?.current().status === 'starting',
      ...(starterSpawns.has(normalizePath(worktreePath)) ? { starterSpawning: true } : {}),
    };
  }

  function broadcastFor(worktreePath: string | undefined): void {
    if (worktreePath === undefined) return;
    deps.emit(worktreePath, snapshotFor(worktreePath));
  }

  /** An empty book, not the claims as stopped: unmeasured claims would offer Stop for nothing watched. */
  function broadcastClosed(worktreePath: string | undefined): void {
    if (worktreePath === undefined) return;
    deps.emit(worktreePath, { entries: [], pending: false });
  }

  function starterEntryTest(worktreePath: string): (folder: string) => boolean {
    const worktreeKey = normalizePath(worktreePath);
    return (folder) =>
      deps.starter?.portFor(worktreePath) !== undefined && normalizePath(folder) === worktreeKey;
  }

  async function awaitPortSilent(port: number): Promise<boolean> {
    for (let attempt = 0; attempt < timing.stopAttempts; attempt += 1) {
      if (!(await probe(port))) return true;
      await delay(timing.stoppingMs);
    }
    return false;
  }

  function teardownSlot(seats: SeatsByEntry): void {
    for (const seat of seats.values()) seat.monitor.stop(false);
    seats.clear();
  }

  // Called inside a chain step; going through `closeWorkspace` re-enters the same lane and deadlocks.
  function teardownRegisteredWorkspace(worktreePath: string): void {
    const seats = workspaces.get(worktreePath);
    if (seats === undefined) return;
    teardownSlot(seats);
    workspaces.delete(worktreePath);
  }

  async function retireStarterFor(worktreePath: string, reported: number): Promise<void> {
    const starter = deps.starter;
    if (starter === undefined) return;
    const runningPort = starter.portFor(worktreePath);
    if (runningPort === reported) return;
    const entry = studioStarterEntry(worktreePath);
    const starterPort = runningPort ?? entry?.ports.at(-1)?.port;
    if (starterPort === undefined || starterPort === reported) return;
    if (runningPort !== undefined) {
      await starter.stop(worktreePath);
      if (!(await awaitPortSilent(starterPort))) {
        logger.error('starter port still answers after stop; frames stay put and the report is handled as an extend', { port: starterPort });
        return;
      }
    }
    if (entry !== undefined) {
      // Seat first: a monitor on a removed entry re-emits a phantom on its next transition.
      const seats = workspaces.get(worktreePath);
      seats?.get(entry.id)?.monitor.stop(false);
      seats?.delete(entry.id);
      recordPortMeasurement(worktreePath, entry.id, starterPort, 'dead');
    }
    await deps.authorPortMove(starterPort, reported, worktreePath);
    if (entry !== undefined) removeServerEntry(worktreePath, entry.id);
    try {
      await starter.retire(worktreePath);
    } catch (err) {
      logger.error('starter retire failed', { error: err });
    }
  }

  async function measure(port: number, folder: string, worktreePath: string): Promise<PortReading> {
    const answered = await probe(port);
    if (!answered) return { measured: 'dead' };
    const identity = await identify(port).catch((): undefined => undefined);
    if (verifiesFor(identity, folder) !== 'foreign') return { measured: 'live' };
    if (isContainerRuntime(identity?.command)) return { measured: 'stranger', listener: 'container' };
    return {
      measured: 'stranger',
      studioOwned: attributeCwd(identity?.cwd, deps.attributionRoots(worktreePath)) === 'agent-started',
    };
  }

  function seatFor(worktreePath: string, seats: SeatsByEntry, entry: ServerBookEntry): Seat {
    const existing = seats.get(entry.id);
    if (existing) return existing;

    const portFollow = deps.createPortFollow(worktreePath);
    const roots = deps.attributionRoots(worktreePath);
    const isStarterEntry = starterEntryTest(worktreePath);
    let watchedPort: number | undefined;
    let wasLive = false;
    let lastAnswer: ServerOwnership | undefined;
    let lastCommand: string | undefined;
    const monitor = new ServerMonitor({
      ...(deps.timing === undefined ? {} : { timing: deps.timing }),
      ...(deps.delay === undefined ? {} : { delay: deps.delay }),
      probe,
      identify,
      adjudicate: (identity: ListenerIdentity | undefined) => {
        const answer = verifiesFor(identity, entry.folder);
        lastAnswer = answer;
        lastCommand = identity?.command;
        if (answer === 'ours' && isStarterEntry(entry.folder)) {
          setServerEntryOwnership(worktreePath, entry.id, 'studio-started');
        } else if (answer === 'ours' && identity?.cwd !== undefined) {
          const attribution = attributeCwd(identity.cwd, roots);
          if (attribution !== 'unknown') {
            setServerEntryOwnership(worktreePath, entry.id, attribution);
          }
        }
        return answer;
      },
      emit: (state) => {
        if (state.port !== undefined) watchedPort = state.port;
        if (state.status === 'running' && state.port !== undefined) {
          recordPortMeasurement(worktreePath, entry.id, state.port, 'live');
        } else if (state.status === 'stopped' && watchedPort !== undefined) {
          const stranger = lastAnswer === 'foreign';
          recordPortMeasurement(
            worktreePath,
            entry.id,
            watchedPort,
            stranger ? 'stranger' : 'dead',
            stranger && isContainerRuntime(lastCommand) ? 'container' : undefined,
          );
        }
        portFollow.observed(state);
        broadcastFor(worktreePath);
        for (const observer of seat.observers) observer(state);
      },
      ...(deps.onFrameState === undefined ? {} : { onFrameState: (change) => {
        wasLive ||= change.state === 'live';
        deps.onFrameState?.({ ...change, worktreePath, folder: entry.folder, wasLive, ...(watchedPort === undefined ? {} : { port: watchedPort }) });
      } }),
    });
    const seat: Seat = {
      monitor,
      watch: (port, workspaceTelemetry) => {
        lastAnswer = undefined;
        lastCommand = undefined;
        watchedPort = port;
        wasLive = false;
        monitor.watch(port, workspaceTelemetry);
      },
      observers: new Set(),
    };
    seats.set(entry.id, seat);
    return seat;
  }

  function report(
    worktreePath: string,
    folder: string,
    port: number | undefined,
    workspaceTelemetry?: WorkspaceTelemetryProperties,
    signal?: AbortSignal,
  ): Promise<void> {
    return chain(worktreePath, async () => {
      if (signal?.aborted) return;
      const seatsAtStart = workspaces.get(worktreePath);
      const reported = port ?? DEFAULT_DEV_PORT;
      await retireStarterFor(worktreePath, reported);
      if (signal?.aborted) return;
      const known = entryForFolder(worktreePath, folder);

      let entry: ServerBookEntry;
      if (known === undefined) {
        entry = createServerEntry(worktreePath, {
          folder,
          port: reported,
          ownership: starterEntryTest(worktreePath)(folder)
            ? 'studio-started'
            : attributeCwd(folder, deps.attributionRoots(worktreePath)),
        });
      } else {
        const measurements = new Map(
          await Promise.all(
            known.ports.map(async (claimed) =>
              [claimed.port, await measure(claimed.port, known.folder, worktreePath)] as const),
          ),
        );
        // What was just measured, before any await: a claim left with a stale `live` covers nothing (ONL-3287).
        for (const [port, measurement] of measurements) {
          recordPortMeasurement(worktreePath, known.id, port, measurement.measured, measurement.listener);
        }
        const reading = discriminatePortReport(
          known.ports.map((p) => p.port),
          reported,
          new Map([...measurements].map(([port, measurement]) => [port, measurement.measured])),
        );
        if (reading.kind === 'extend') {
          extendServerEntry(worktreePath, known.id, reported);
        } else if (reading.kind === 'move') {
          const move = (): void =>
            moveServerEntryPort(worktreePath, known.id, { from: reading.deadPort, to: reported });
          if (measurements.get(reading.deadPort)?.studioOwned === true) {
            // Frames leave before the entry stops claiming the old port: another Project answers
            // there, and an unclaimed port mounts that Project's page (ONL-3287).
            if ((await deps.authorPortMove(reading.deadPort, reported, worktreePath)) !== 'refused') {
              move();
            }
            // A refused move leaves the frames on the old port, and the entry claiming it, so they stay covered.
          } else {
            move();
            if (reading.pairedMeasurement === 'dead') {
              await deps.authorPortMove(reading.deadPort, reported, worktreePath);
            }
          }
        }
        entry = entryForFolder(worktreePath, folder) ?? known;
      }

      if (signal?.aborted || seatsAtStart === undefined || workspaces.get(worktreePath) !== seatsAtStart) return;
      seatFor(worktreePath, seatsAtStart, entry).watch(reported, workspaceTelemetry);
      pendingIfAny(worktreePath)?.reset(false);
      broadcastFor(worktreePath);
    });
  }

  async function startStarter(worktreePath: string, port?: number): Promise<void> {
    const starter = deps.starter;
    if (starter === undefined) return;
    const key = normalizePath(worktreePath);
    starterSpawns.set(key, (starterSpawns.get(key) ?? 0) + 1);
    broadcastFor(worktreePath);
    try {
      const spawned = await starter.spawn(worktreePath, port);
      await report(worktreePath, worktreePath, spawned, resolveWorkspaceTelemetryProperties(worktreePath));
    } finally {
      const left = (starterSpawns.get(key) ?? 1) - 1;
      if (left > 0) starterSpawns.set(key, left);
      else starterSpawns.delete(key);
      broadcastFor(worktreePath);
    }
  }

  return {
    openProject: (worktreePath) =>
      chain(worktreePath, async () => {
        if (activeWorktree === worktreePath) {
          broadcastFor(worktreePath);
          return;
        }
        const existing = workspaces.get(worktreePath);
        if (existing !== undefined) {
          activeWorktree = worktreePath;
          broadcastFor(worktreePath);
          return;
        }

        const seats: SeatsByEntry = new Map();
        workspaces.set(worktreePath, seats);
        activeWorktree = worktreePath;
        pendingIfAny(worktreePath)?.reset(false);

        await Promise.all(
          serverBookEntries(worktreePath).map(async (entry) => {
            try {
              let livePort: number | undefined;
              for (const claimed of entry.ports) {
                const reading = await measure(claimed.port, entry.folder, worktreePath);
                if (workspaces.get(worktreePath) !== seats) return;
                recordPortMeasurement(
                  worktreePath,
                  entry.id,
                  claimed.port,
                  reading.measured,
                  reading.listener,
                );
                livePort ??= reading.measured === 'live' ? claimed.port : undefined;
              }
              if (livePort !== undefined) {
                seatFor(worktreePath, seats, entry).watch(
                  livePort,
                  deps.workspaceTelemetryPropertiesFor?.(worktreePath),
                );
              }
            } catch (err) {
              logger.error('re-verify failed for entry', { entry_id: entry.id, error: err });
            }
          }),
        );
        if (workspaces.get(worktreePath) !== seats) return;
        broadcastFor(worktreePath);
      }),

    closeWorkspace: (worktreePath) =>
      chain(worktreePath, async () => {
        try {
          await deps.setup?.run(worktreePath, { action: 'stop' });
        } catch (error) {
          logger.error('setup stop rejected during workspace close', { error: String(error) });
        } finally {
          teardownRegisteredWorkspace(worktreePath);
        }
      }),

    closeProject(onlyIf) {
      const target = activeWorktree;
      if (target === undefined) {
        return chain(undefined, async () => undefined);
      }
      if (onlyIf !== undefined && onlyIf !== target) return Promise.resolve();
      return chain(target, async () => {
        if (activeWorktree !== target) return;
        try {
          await deps.setup?.run(target, { action: 'stop' });
        } catch (error) {
          logger.error('setup stop rejected during project close', { error: String(error) });
        } finally {
          teardownRegisteredWorkspace(target);
          if (activeWorktree === target) activeWorktree = undefined;
          pendings.delete(normalizePath(target));
          broadcastClosed(target);
        }
      });
    },

    deactivateProject() {
      const target = activeWorktree;
      return chain(target, async () => {
        if (activeWorktree !== target) return;
        activeWorktree = undefined;
        broadcastFor(target);
      });
    },

    report,

    startStarter,

    press(intent, askingWorktree) {
      const starter = deps.starter;
      const worktree = askingWorktree ?? activeWorktree;
      if (worktree === undefined) return;
      const requested = intent.entryIds ?? (intent.entryId === undefined ? undefined : [intent.entryId]);
      const selectedEntries = serverBookEntries(worktree).filter((entry) => requested === undefined || requested.includes(entry.id));
      const runtimePorts = new Set(selectedEntries.flatMap((entry) => entry.ports.filter((port) => deps.setup?.ownsPort(worktree, port.port)).map((port) => port.port)));
      const setup = deps.setup;
      const saved = setup?.read(worktree).saved;
      const selectedPorts = selectedEntries.flatMap((entry) => entry.ports.map((port) => port.port));
      if (intent.press === 'stop') {
        noteServerStop(worktree, requested === undefined ? undefined : selectedEntries.map((entry) => entry.folder), selectedPorts);
      } else {
        noteServerStart(worktree, requested === undefined ? undefined : selectedEntries.map((entry) => entry.folder), selectedPorts);
      }
      if (setup !== undefined && saved) {
        const selectedFolders = requested === undefined ? undefined : selectedEntries.map((entry) => canonicalPath(entry.folder));
        const serverIds = selectedFolders === undefined ? undefined : intent.press === 'stop'
          ? setup.serverIdsForPorts(worktree, [...runtimePorts])
          : saved.definition.servers.filter((server) => selectedFolders.includes(canonicalPath(`${worktree}/${server.cwd}`))).map((server) => server.id);
        if (serverIds?.length !== 0) {
          void setup.run(worktree, { action: intent.press, ...(serverIds ? { serverIds } : {}) }).catch(() => {
            logger.error('saved setup control failed');
          });
        }
        if (intent.press === 'start') return;
      }
      if (intent.press === 'start') {
        if (
          starter !== undefined &&
          starter.portFor(worktree) === undefined &&
          isBlankProject(worktree) &&
          studioStarterEntry(worktree) !== undefined &&
          starter.isPresent(worktree)
        ) {
          // Off the chain: the adapter's ready wait would hold every report behind it.
          void startStarter(worktree).catch((err: unknown) => {
            logger.error('starter re-spawn failed', { error: err });
          });
          return;
        }
        pendingFor(worktree).pressedStart();
        broadcastFor(worktree);
        const named = new Set(intent.entryIds ?? []);
        const folders = serverBookEntries(worktree)
          .filter((entry) => named.has(entry.id))
          .map((entry) => basename(entry.folder));
        noteStartIntent(worktree, folders);
        return;
      }
      const pressedSeats = workspaces.get(worktree);
      const entriesToStop = selectedEntries;
      for (const entry of entriesToStop) {
        if (entry.ownership === 'users-own' || entry.ownership === 'unknown' || entry.ownership === 'studio-started') continue;
        for (const port of entry.ports) {
          if (runtimePorts.has(port.port)) continue;
          void (async () => {
            const identity = await identify(port.port);
            if (identity === undefined || verifiesFor(identity, entry.folder) !== 'ours' || identity.pid <= 1 || identity.pid === process.pid) return;
            try { await signalProcess(identity.pid, 'SIGTERM'); } catch { return; }
            awaitingEscalation.add(identity.pid);
            try {
              await delay(2000);
              const still = await identify(port.port);
              if (still?.pid === identity.pid && verifiesFor(still, entry.folder) === 'ours') {
                try { await signalProcess(still.pid, 'SIGKILL'); } catch { return; }
              }
            } finally { awaitingEscalation.delete(identity.pid); }
          })().catch(() => { logger.error('scoped server stop failed'); });
        }
      }
      const studioOwned = (entryId: string): boolean =>
        serverBookEntries(worktree).some(
          (entry) => entry.id === entryId && entry.ownership === 'studio-started',
        );
      const stopSeat = (entryId: string, seat: Seat): void => {
        if (studioOwned(entryId)) {
          void starter?.stop(worktree).catch((err: unknown) => {
            logger.error('starter stop failed', { error: err });
          });
        }
        seat.monitor.pressedStop();
      };
      for (const entry of entriesToStop) {
        const seat = pressedSeats?.get(entry.id);
        if (seat !== undefined) stopSeat(entry.id, seat);
      }
      pendingFor(worktree).pressedStop();
      broadcastFor(worktree);
    },

    awaitRunning(worktreePath, port, boundMs) {
      const seats = workspaces.get(worktreePath);
      const entry = serverBookEntries(worktreePath).find((candidate) =>
        candidate.ports.some((p) => p.port === port),
      );
      const seat = entry === undefined || seats === undefined ? undefined : seats.get(entry.id);
      if (seat === undefined) {
        return delay(boundMs).then(() => 'timed-out' as const);
      }
      if (seat.monitor.state?.status === 'running' && seat.monitor.state.port === port) {
        return Promise.resolve('running');
      }
      return new Promise<AwaitRunningOutcome>((resolve) => {
        const observer = (state: ServerState): void => {
          if (state.status === 'running' && state.port === port) {
            seat.observers.delete(observer);
            resolve('running');
          }
        };
        seat.observers.add(observer);
        void delay(boundMs).then(() => {
          if (seat.observers.delete(observer)) resolve('timed-out');
        });
      });
    },

    retainStarter(worktreePath) {
      const path = normalizePath(worktreePath);
      retainedStarters.add(path);
      return () => { retainedStarters.delete(path); };
    },

    stopStarterExcept(open) {
      const starter = deps.starter;
      if (starter === undefined) return;
      const normalizedOpen = new Set(Array.from(open, (worktree) => normalizePath(worktree)));
      for (const worktree of starter.running()) {
        if (normalizedOpen.has(normalizePath(worktree))) continue;
        if (retainedStarters.has(normalizePath(worktree))) continue;
        void starter.stop(worktree).catch((err: unknown) => {
          logger.error('starter stop on switch failed', { error: err });
        });
      }
    },

    turnStarted(worktreePath) {
      pendingIfAny(worktreePath)?.turnStarted();
    },

    turnEnded(worktreePath) {
      pendingIfAny(worktreePath)?.turnEnded();
    },

    snapshotFor,

    dispose() {
      // Synchronous, because quit does not wait: an unescalated SIGTERM leaves the port held after Studio is gone.
      for (const pid of awaitingEscalation) {
        try { void Promise.resolve(signalProcess(pid, 'SIGKILL')).catch(() => undefined); } catch { /* already gone */ }
      }
      awaitingEscalation.clear();
      for (const seats of workspaces.values()) teardownSlot(seats);
      workspaces.clear();
      pendings.clear();
      starterSpawns.clear();
      activeWorktree = undefined;
    },
  };
}

export function studioStarterEntry(worktreePath: string): ServerBookEntry | undefined {
  const entry = entryForFolder(worktreePath, worktreePath);
  return entry?.ownership === 'studio-started' ? entry : undefined;
}

export function isRegisteredBlankProject(worktreePath: string): boolean {
  const record = knownProject(worktreePath);
  return record !== undefined && record.internal !== 'artifacts' && workspaceOrigin(record) === 'blank';
}

let host: ServerHost | undefined;

export function createServerIntentHandler(deps: {
  workspaceOf(senderId: number): string | undefined;
  registered(cwd: string): boolean;
  press(intent: RunIntent, cwd: string): void;
}) {
  return (senderId: number, intent: RunIntent): void => {
    const worktree = deps.workspaceOf(senderId);
    if (!worktree || !deps.registered(worktree)) return;
    const press = (intent as { press?: unknown } | null | undefined)?.press;
    if (press !== 'start' && press !== 'stop') return;
    const entryId = (intent as { entryId?: unknown }).entryId;
    const rawIds = (intent as { entryIds?: unknown }).entryIds;
    const entryIds = Array.isArray(rawIds)
      ? rawIds.filter((id): id is string => typeof id === 'string')
      : undefined;
    deps.press({
      press,
      ...(typeof entryId === 'string' ? { entryId } : {}),
      ...(entryIds === undefined ? {} : { entryIds }),
    }, worktree);
  };
}

/** Registered before the agent host: a report seam captured as `undefined` drops the run's first report. */
export function registerServerBook(options: { starter?: StarterControl } = {}): ServerHost {
  host = createServerHost({
    setup: {
      read: (cwd) => projectSetupService().read(cwd),
      run: (cwd, action) => projectSetupService().run(cwd, action),
      ownsPort: (cwd, port) => projectSetupService().ownsPort(cwd, port),
      serverIdsForPorts: (cwd, ports) => projectSetupService().serverIdsForPorts(cwd, ports),
    },
    emit: (worktreePath, state) => views.routeTo(worktreePath, IPC_EMIT.serverState, state),
    ...(options.starter === undefined ? {} : { starter: options.starter }),
    createPortFollow: (worktreePath) => createServerPortFollow(applyCanvasOps, worktreePath),
    authorPortMove: createReverifyMoveAuthor(applyCanvasOps),
    attributionRoots: (worktreePath) => ({
      workspaceRoot: workspaceRoot(),
      sourceRepoRoot: knownProject(worktreePath)?.sourceRepoRoot,
    }),
    onFrameState: (change) => {
      const previous = previewDiagnostics(change.worktreePath);
      const endpoint = change.port === undefined ? newPreviewAttempt() : previewDiagnostics(change.worktreePath, change.port);
      recordProjectPreviewDiagnostics(change.worktreePath, {
        ...endpoint,
        was_live: previous.was_live || change.state === 'live',
        ...(change.port === undefined ? {} : { expected_port: endpoint.expected_port ?? change.port }),
        ...(change.state === 'live' ? { was_live: true, actual_port: change.port ?? null, cause: 'unknown' as const } : {}),
        ...(change.state === 'unreachable' ? { cause: change.port !== undefined && serverWasStopped(change.worktreePath, [{ folder: change.folder, port: change.port }]) ? 'user_stop' as const : endpoint.cause !== 'unknown' ? endpoint.cause : change.wasLive ? 'server_down' as const : 'not_started' as const } : {}),
      });
      capture('frame_state_changed', {
        ...change.workspaceTelemetry,
        state: change.state,
        elapsed_ms: change.elapsedMs,
      }, change.worktreePath);
      recordPreviewSettlement({
        workspaceTelemetry: change.workspaceTelemetry,
        workspacePath: change.worktreePath,
        state: change.state,
        elapsedMs: change.elapsedMs,
        entryPoint: settleCreationPreview(change.workspaceTelemetry.project_id, change.state, change.worktreePath),
      });
    },
    workspaceTelemetryPropertiesFor: resolveWorkspaceTelemetryProperties,
  });
  installFrameHealthProofHook(() => host);

  const handleIntent = createServerIntentHandler({
    workspaceOf,
    registered: (cwd) => registeredProject(cwd) !== undefined,
    press: (intent, cwd) => host?.press(intent, cwd),
  });
  // The handler looks the sender up again: it also drops a Project the registry no longer holds.
  on(IPC_SEND.serverIntent, (_project, intent, event) => handleIntent(event.sender.id, intent));

  return host;
}

export function serverHost(): ServerHost | undefined {
  return host;
}

export function openServerBookForProject(worktreePath: string): Promise<void> {
  return host?.openProject(worktreePath) ?? Promise.resolve();
}

export function closeServerBookProject(onlyIf?: string): void {
  void host?.closeProject(onlyIf);
}

export function deactivateServerBook(): void {
  void host?.deactivateProject();
}

export function stopStarterExcept(open: ReadonlySet<string>): void {
  host?.stopStarterExcept(open);
}

export function disposeServerBook(): void {
  host?.dispose();
  removeFrameHealthProofHook();
}
