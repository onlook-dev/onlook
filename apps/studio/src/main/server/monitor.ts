import type { ServerOwnership, ServerState } from '@studio/events';
import type { WorkspaceTelemetryProperties } from '../telemetry/events.js';
import {
  ServerMachine,
  type FrameStateChange,
  type ServerMachineOptions,
} from './machine.js';
import type { IdentifyListener, ListenerIdentity } from './owner.js';
import { probePort } from './probe.js';
import { log } from '../log/index.js';
import { waitForWork, workActivity, type WorkActivity } from '../background-work/activity.js';

const logger = log('server');

export type { FrameStateChange };

export interface ServerMonitorOptions extends ServerMachineOptions {
  probe?: (port: number) => Promise<boolean>;
  /** No default: a resolver reading the machine's port table called a developer's own server a stranger (ONL-2255). */
  identify: IdentifyListener;
  /** No default: `() => 'unknown'` never demotes a stranger and nothing notices. */
  adjudicate: (identity: ListenerIdentity | undefined) => ServerOwnership;
  delay?: (ms: number) => Promise<void>;
  activity?: WorkActivity;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    // `unref` so a pending poll can never be the reason Electron will not quit.
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });

export class ServerMonitor {
  private readonly machine: ServerMachine;
  private readonly probe: (port: number) => Promise<boolean>;
  private readonly identify: IdentifyListener;
  private readonly adjudicate: (identity: ListenerIdentity | undefined) => ServerOwnership;
  private readonly delay: ((ms: number) => Promise<void>) | undefined;
  private readonly activity: WorkActivity;
  private cancelDelay: (() => void) | undefined;

  /** Re-checked after every await: a superseded loop must not feed the machine. */
  private generation = 0;
  private engaged = false;

  constructor(options: ServerMonitorOptions) {
    this.machine = new ServerMachine(options);
    this.probe = options.probe ?? ((port) => probePort(port));
    this.identify = options.identify;
    this.adjudicate = options.adjudicate;
    this.delay = options.delay;
    this.activity = options.activity ?? workActivity;
  }

  get state(): ServerState | undefined {
    return this.engaged ? this.machine.current() : undefined;
  }

  watch(port?: number, workspaceTelemetry?: WorkspaceTelemetryProperties): void {
    this.machine.reportedPort(port, workspaceTelemetry);
    this.drive();
  }

  pressedStart(): void {
    this.machine.pressedStart();
    this.drive();
  }

  pressedStop(): void {
    this.machine.pressedStop();
    this.drive();
  }

  turnStarted(): void {
    this.engaged = true;
    this.machine.turnStarted();
  }

  turnEnded(): void {
    this.machine.turnEnded();
    this.drive();
  }

  stop(announce = true): void {
    this.generation += 1;
    this.cancelDelay?.();
    this.cancelDelay = undefined;
    this.machine.reset(announce);
    if (!announce) this.engaged = false;
  }

  private drive(): void {
    this.engaged = true;
    const generation = ++this.generation;
    this.cancelDelay?.();
    this.cancelDelay = undefined;
    void this.run(generation).catch((error: unknown) => {
      logger.error('monitor poll loop ended on an error', { error });
    });
  }

  private async run(generation: number): Promise<void> {
    for (;;) {
      const next = this.machine.nextPoll();
      if (next === undefined) return;

      if (next.delayMs > 0) {
        if (this.delay === undefined && this.machine.current().status === 'running') {
          const wait = waitForWork(next.delayMs, this.activity);
          this.cancelDelay = wait.cancel;
          await wait.done;
          if (this.cancelDelay === wait.cancel) this.cancelDelay = undefined;
        } else {
          await (this.delay ?? sleep)(next.delayMs);
        }
        if (generation !== this.generation) return;
      }

      const answered = await this.probe(next.port);
      if (generation !== this.generation) return;

      let ownership;
      let pid;
      if (answered && next.resolveOwner) {
        const identity = await this.identify(next.port).catch(() => undefined);
        if (generation !== this.generation) return;
        try {
          ownership = this.adjudicate(identity);
        } catch (error) {
          logger.error('monitor ownership adjudication failed', { error });
        }
        pid = identity?.pid;
      }

      // `observed` reaches a durable-domain write that throws when it cannot persist; the loop must outlive it.
      try {
        this.machine.observed({ answered, ownership, pid });
      } catch (error) {
        logger.error('monitor observation not recorded', { error });
      }
    }
  }
}
