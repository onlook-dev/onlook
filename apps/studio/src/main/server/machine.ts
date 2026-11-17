import { DEFAULT_DEV_PORT, type ServerOwnership, type ServerState } from '@studio/events';
import type { WorkspaceTelemetryProperties } from '../telemetry/events.js';

export interface MonitorTiming {
  waitingMs: number;
  waitingBackoffSteps: number;
  waitingAttempts: number;
  runningMs: number;
  runningFailures: number;
  recoveryBackoffSteps: number;
  stoppingMs: number;
  stopAttempts: number;
}

export const DEFAULT_TIMING: MonitorTiming = {
  waitingMs: 500,
  waitingBackoffSteps: 4,
  waitingAttempts: 40,
  runningMs: 2_000,
  runningFailures: 3,
  recoveryBackoffSteps: 15,
  stoppingMs: 500,
  stopAttempts: 20,
};

export interface FrameStateChange {
  workspaceTelemetry: WorkspaceTelemetryProperties;
  state: 'loading' | 'live' | 'unreachable';
  elapsedMs: number;
}

export interface Observation {
  answered: boolean;
  /** Absent when `nextPoll` did not ask; not the same as `'unknown'`. */
  ownership?: ServerOwnership;
  pid?: number;
}

export interface NextPoll {
  port: number;
  delayMs: number;
  resolveOwner: boolean;
}

export interface ServerMachineOptions {
  emit: (state: ServerState) => void;
  onFrameState?: (change: FrameStateChange) => void;
  timing?: Partial<MonitorTiming>;
  now?: () => number;
}

export class ServerMachine {
  private readonly emit: (state: ServerState) => void;
  private readonly onFrameState: ((change: FrameStateChange) => void) | undefined;
  private readonly now: () => number;
  readonly timing: MonitorTiming;

  private status: ServerState['status'] = 'stopped';
  private port: number | undefined;

  private attempt = 0;
  private failures = 0;
  private stopProbes = 0;
  private holderPid: number | undefined;
  private recoveryPort: number | undefined;
  private recoveryStrangerProbes = 0;

  private reported = false;
  private sawTurnStart = false;

  private watchStartedAt = 0;
  private workspaceTelemetry: WorkspaceTelemetryProperties | undefined;
  private lastEmitted: ServerState | undefined;
  private lastRecordedKey: string | undefined;

  constructor(options: ServerMachineOptions) {
    this.emit = options.emit;
    this.onFrameState = options.onFrameState;
    this.timing = { ...DEFAULT_TIMING, ...options.timing };
    this.now = options.now ?? Date.now;
  }

  current(): ServerState {
    return this.port === undefined
      ? { status: this.status }
      : { status: this.status, port: this.port };
  }

  pressedStart(): void {
    this.port = undefined;
    this.recoveryPort = undefined;
    this.holderPid = undefined;
    this.attempt = 0;
    this.failures = 0;
    this.stopProbes = 0;
    this.reported = false;
    this.sawTurnStart = false;
    this.watchStartedAt = this.now();
    this.set('starting');
  }

  pressedStop(): void {
    if (this.status === 'stopped') {
      this.recoveryPort = undefined;
      return;
    }
    this.recoveryPort = undefined;
    if (this.port === undefined) {
      this.set('stopped');
      return;
    }
    this.stopProbes = 0;
    this.set('stopping');
  }

  reportedPort(port?: number, workspaceTelemetry?: WorkspaceTelemetryProperties): void {
    this.port = port ?? DEFAULT_DEV_PORT;
    this.recoveryPort = undefined;
    this.workspaceTelemetry = workspaceTelemetry;
    this.holderPid = undefined;
    this.attempt = 0;
    this.failures = 0;
    this.stopProbes = 0;
    this.reported = true;
    // Restarted here, not only at the press: a press queued behind other turns would record their time.
    this.watchStartedAt = this.now();
    this.set('starting');
  }

  turnStarted(): void {
    this.sawTurnStart = true;
  }

  turnEnded(): void {
    if (this.status !== 'starting') return;
    if (this.reported) return;
    if (!this.sawTurnStart) return;
    this.sawTurnStart = false;
    this.set('stopped');
  }

  observed(observation: Observation): void {
    switch (this.status) {
      case 'starting':
        this.observedWhileStarting(observation);
        return;
      case 'running':
        this.observedWhileRunning(observation);
        return;
      case 'stopping':
        this.observedWhileStopping(observation);
        return;
      case 'stop-failed':
        if (!observation.answered) this.set('stopped');
        return;
      case 'stopped':
        this.observedWhileRecovering(observation);
        return;
      default:
        return;
    }
  }

  private observedWhileStarting({ answered, ownership, pid }: Observation): void {
    if (!answered) {
      this.attempt += 1;
      if (this.attempt >= this.timing.waitingAttempts) this.set('stopped');
      return;
    }
    if (ownership === 'foreign') {
      this.set('stopped');
      return;
    }
    this.failures = 0;
    this.holderPid = pid ?? this.holderPid;
    this.set('running');
  }

  private observedWhileRunning({ answered, ownership, pid }: Observation): void {
    if (!answered) {
      this.failures += 1;
      if (this.failures >= this.timing.runningFailures) {
        this.recoveryPort = this.port;
        this.recoveryStrangerProbes = 0;
        this.set('stopped');
      }
      return;
    }
    if (ownership === 'foreign') {
      this.recoveryPort = this.port;
      this.recoveryStrangerProbes = 1;
      this.set('stopped');
      return;
    }
    this.failures = 0;
    this.holderPid = pid ?? this.holderPid;
  }

  private observedWhileRecovering({ answered, ownership, pid }: Observation): void {
    if (this.recoveryPort === undefined) return;
    if (!answered) {
      this.recoveryStrangerProbes = 0;
      return;
    }
    if (ownership !== 'ours') {
      this.recoveryStrangerProbes += 1;
      return;
    }
    this.port = this.recoveryPort;
    this.recoveryPort = undefined;
    this.recoveryStrangerProbes = 0;
    this.failures = 0;
    this.holderPid = pid;
    this.set('running');
  }

  private observedWhileStopping({ answered, ownership, pid }: Observation): void {
    if (!answered) {
      this.set('stopped');
      return;
    }
    if (ownership === 'foreign') {
      this.set('stopped');
      return;
    }
    if (pid !== undefined && this.holderPid !== undefined && pid !== this.holderPid) {
      this.set('stopped');
      return;
    }
    this.stopProbes += 1;
    if (this.stopProbes >= this.timing.stopAttempts) this.set('stop-failed');
  }

  nextPoll(): NextPoll | undefined {
    if (this.status === 'stopped') {
      return this.recoveryPort === undefined
        ? undefined
        : {
            port: this.recoveryPort,
            delayMs:
              this.timing.runningMs *
              Math.min(1 + this.recoveryStrangerProbes, this.timing.recoveryBackoffSteps),
            resolveOwner: true,
          };
    }
    if (this.port === undefined) return undefined;
    switch (this.status) {
      case 'starting':
        return {
          port: this.port,
          delayMs:
            this.attempt === 0
              ? 0
              : this.timing.waitingMs * Math.min(this.attempt, this.timing.waitingBackoffSteps),
          resolveOwner: true,
        };
      case 'running':
        return {
          port: this.port,
          delayMs: this.timing.runningMs,
          resolveOwner: this.failures > 0,
        };
      case 'stopping':
        return { port: this.port, delayMs: this.timing.stoppingMs, resolveOwner: true };
      case 'stop-failed':
        return { port: this.port, delayMs: this.timing.runningMs, resolveOwner: false };
      default:
        return undefined;
    }
  }

  reset(announce = true): void {
    this.port = undefined;
    this.recoveryPort = undefined;
    this.holderPid = undefined;
    this.attempt = 0;
    this.failures = 0;
    this.stopProbes = 0;
    this.reported = false;
    this.sawTurnStart = false;
    // Cleared before the emit so a deliberate reset records no `unreachable`.
    this.workspaceTelemetry = undefined;
    this.lastRecordedKey = undefined;
    if (announce && this.status !== 'stopped') this.set('stopped');
    else this.status = 'stopped';
    if (!announce) this.lastEmitted = undefined;
  }

  private set(status: ServerState['status']): void {
    this.status = status;
    // `stopped` names no port: the canvas would follow a dead one (ONL-1868).
    if (status === 'stopped') this.port = undefined;
    const next = this.current();

    // Before the emit dedupe: a rewatch to another project on the same port still records.
    this.record(next);
    if (this.lastEmitted?.status === next.status && this.lastEmitted.port === next.port) return;
    this.lastEmitted = next;
    this.emit(next);
  }

  /** `stopping` and `stop-failed` record as `live`: the shipped event describes the frame, not the button. */
  private record(state: ServerState): void {
    if (this.onFrameState === undefined || this.workspaceTelemetry === undefined) return;
    const mapped =
      state.status === 'starting'
        ? 'loading'
        : state.status === 'stopped'
          ? 'unreachable'
          : 'live';
    const key = `${this.workspaceTelemetry.project_id}:${mapped}`;
    if (key === this.lastRecordedKey) return;
    this.lastRecordedKey = key;
    this.onFrameState({
      workspaceTelemetry: this.workspaceTelemetry,
      state: mapped,
      elapsedMs: this.now() - this.watchStartedAt,
    });
  }
}
