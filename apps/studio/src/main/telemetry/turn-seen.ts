import electron from 'electron';
import { canonicalPath } from '../lib/canonical-path.js';
import type { TelemetryProperties, TurnSeenShownBy } from './events.js';
import { capture, telemetryConsentSignal } from './index.js';

type TurnSeenEvent = TelemetryProperties<'agent_turn_seen'>;

export type TurnSeenProperties = Pick<TurnSeenEvent, 'project_id' | 'workspace_instance_id' | 'agent_session_id' | 'harness' | 'turn_id' | 'origin' | 'outcome'>;

export interface ProjectPresence {
  windowFocused: boolean;
  projectTabActive: boolean;
}

export type ProjectLocator = (cwd: string) => ProjectPresence | undefined;

/** Until `setTurnSeenLocator` runs, no Project is on screen and every turn ends unseen. */
const NOWHERE: ProjectLocator = () => undefined;

export interface TurnSeenClock {
  now(): number;
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SystemPresence {
  idleMs(): number;
  screenLocked(): boolean;
}

type AtEnd = Pick<TurnSeenEvent, 'window_focused_at_end' | 'project_tab_active_at_end' | 'system_idle_ms_at_end' | 'screen_locked_at_end'>;

interface Waiting {
  path: string;
  endedAt: number;
  properties: TurnSeenProperties;
  atEnd: AtEnd;
}

const TURN_SEEN_CAP_MS = 60 * 60 * 1000;

const realClock: TurnSeenClock = {
  now: () => Date.now(),
  setTimeout: (run, ms) => {
    const handle = setTimeout(run, ms);
    handle.unref?.();
    return handle;
  },
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const realSystem: SystemPresence = {
  idleMs: () => electron.powerMonitor.getSystemIdleTime() * 1000,
  screenLocked: () => electron.powerMonitor.getSystemIdleState(1) === 'locked',
};

export class TurnSeenWatch {
  private waiting: Waiting[] = [];
  private timer: unknown;
  private quitting = false;
  private locate = NOWHERE;
  private readonly send: (properties: TurnSeenEvent) => void;
  private readonly clock: TurnSeenClock;
  private readonly system: SystemPresence;
  private readonly consent: () => AbortSignal | undefined;
  private consentSignal: AbortSignal | undefined;
  private readonly clearConsent = (): void => {
    this.consentSignal?.removeEventListener('abort', this.clearConsent);
    this.consentSignal = undefined;
    this.waiting = [];
    this.disarm();
  };

  constructor(send: (properties: TurnSeenEvent) => void, clock: TurnSeenClock = realClock, system: SystemPresence = realSystem, consent: () => AbortSignal | undefined = telemetryConsentSignal) {
    this.send = send;
    this.clock = clock;
    this.system = system;
    this.consent = consent;
  }

  setLocator(locate: ProjectLocator): void {
    this.locate = locate;
  }

  ended(cwd: string, properties: TurnSeenProperties): void {
    if (!this.consentActive()) return;
    const presence = this.locate(cwd);
    const atEnd: AtEnd = {
      window_focused_at_end: presence?.windowFocused === true,
      project_tab_active_at_end: presence?.projectTabActive === true,
      system_idle_ms_at_end: this.system.idleMs(),
      screen_locked_at_end: this.system.screenLocked(),
    };
    if (this.quitting) {
      this.send({ ...properties, ...atEnd, resolution: 'quit', waited_ms: 0 });
      return;
    }
    if (atEnd.window_focused_at_end && atEnd.project_tab_active_at_end) {
      this.send({ ...properties, ...atEnd, resolution: 'visible_at_end', waited_ms: 0 });
      return;
    }
    this.waiting.push({ path: canonicalPath(cwd), endedAt: this.clock.now(), properties, atEnd });
    if (this.waiting.length === 1) this.arm();
  }

  shown(workspacePath: string, by: TurnSeenShownBy): void {
    if (!this.consentActive()) return;
    if (this.waiting.length === 0) return;
    const path = canonicalPath(workspacePath);
    const seen = this.waiting.filter((turn) => turn.path === path);
    if (seen.length === 0) return;
    this.waiting = this.waiting.filter((turn) => turn.path !== path);
    const now = this.clock.now();
    const idle = this.system.idleMs();
    for (const turn of seen) {
      this.send({ ...turn.properties, ...turn.atEnd, resolution: 'shown', waited_ms: now - turn.endedAt, shown_by: by, system_idle_ms_at_shown: idle });
    }
    this.arm();
  }

  quit(): void {
    this.quitting = true;
    if (!this.consentActive()) return;
    this.disarm();
    const now = this.clock.now();
    const waiting = this.waiting;
    this.waiting = [];
    for (const turn of waiting) this.send({ ...turn.properties, ...turn.atEnd, resolution: 'quit', waited_ms: now - turn.endedAt });
  }

  private expire(): void {
    this.timer = undefined;
    if (!this.consentActive()) return;
    const now = this.clock.now();
    while (this.waiting[0] !== undefined && now - this.waiting[0].endedAt >= TURN_SEEN_CAP_MS) {
      const turn = this.waiting.shift()!;
      this.send({ ...turn.properties, ...turn.atEnd, resolution: 'cap_reached', waited_ms: now - turn.endedAt });
    }
    this.arm();
  }

  private consentActive(): boolean {
    const signal = this.consent();
    if (signal === undefined || signal.aborted) {
      this.clearConsent();
      return false;
    }
    if (signal !== this.consentSignal) {
      this.clearConsent();
      this.consentSignal = signal;
      signal.addEventListener('abort', this.clearConsent, { once: true });
    }
    return true;
  }

  private arm(): void {
    this.disarm();
    const oldest = this.waiting[0];
    if (oldest === undefined) return;
    this.timer = this.clock.setTimeout(() => this.expire(), Math.max(0, oldest.endedAt + TURN_SEEN_CAP_MS - this.clock.now()));
  }

  private disarm(): void {
    if (this.timer === undefined) return;
    this.clock.clearTimeout(this.timer);
    this.timer = undefined;
  }
}

const watch = new TurnSeenWatch((properties) => capture('agent_turn_seen', properties));

export function setTurnSeenLocator(locate: ProjectLocator): void {
  watch.setLocator(locate);
}

export function noteTurnEnded(cwd: string, properties: TurnSeenProperties): void {
  watch.ended(cwd, properties);
}

export function noteProjectShown(workspacePath: string, by: TurnSeenShownBy): void {
  watch.shown(workspacePath, by);
}

export function beginTurnSeenQuit(): void {
  watch.quit();
}
