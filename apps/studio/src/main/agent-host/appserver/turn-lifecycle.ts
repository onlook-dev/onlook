type Work = { outstanding: number; thread: 'active' | 'inactive'; streaming: boolean };

export type AppServerTurnPhase =
  | { kind: 'idle' | 'exited' }
  | ({ kind: 'working' | 'interrupting' | 'closed' } & Work);

export type AppServerTurnEvent =
  | { type: 'request' }
  | { type: 'started' }
  | { type: 'settled' }
  | { type: 'thread'; active: boolean; keepStreaming?: boolean }
  | { type: 'interrupt' }
  | { type: 'interrupt-settled' }
  | { type: 'stream'; value: boolean }
  | { type: 'stop' }
  | { type: 'transport-ended' }
  | { type: 'close' };

export class AppServerTurnLifecycle {
  private phase: AppServerTurnPhase = { kind: 'idle' };
  private epoch = 0;

  get snapshot(): Readonly<AppServerTurnPhase> { return this.phase; }
  get closed(): boolean { return this.phase.kind === 'closed'; }
  get exited(): boolean { return this.phase.kind === 'exited'; }
  get streaming(): boolean { return 'streaming' in this.phase && this.phase.streaming; }
  /** Turns asked for and not yet settled; `turn/started` lands a round trip too late to raise the row (ONL-2383). */
  get outstanding(): number { return 'outstanding' in this.phase ? this.phase.outstanding : 0; }
  get threadActive(): boolean { return 'thread' in this.phase && this.phase.thread === 'active'; }
  get interruptPending(): boolean { return this.phase.kind === 'interrupting'; }
  get settleEpoch(): number { return this.epoch; }

  dispatch(event: AppServerTurnEvent): void {
    const phase = this.phase;
    if (phase.kind === 'closed' && event.type !== 'stop') return;
    if (phase.kind === 'exited' && event.type !== 'close' && event.type !== 'stop') return;
    const work: Work = 'outstanding' in phase
      ? phase
      : { outstanding: 0, thread: 'inactive', streaming: false };
    const kind = phase.kind === 'interrupting' ? 'interrupting' : 'working';
    switch (event.type) {
      case 'request':
        this.phase = { ...work, kind: 'working', outstanding: work.outstanding + 1 };
        return;
      case 'started':
        this.phase = { ...work, kind, outstanding: Math.max(1, work.outstanding) };
        return;
      case 'settled':
        this.store(kind, { ...work, outstanding: Math.max(0, work.outstanding - 1) });
        return;
      case 'thread': {
        const idle = !event.active && work.outstanding === 0 && !event.keepStreaming;
        this.store(kind, { ...work, thread: event.active ? 'active' : 'inactive',
          streaming: work.streaming && !idle });
        return;
      }
      case 'interrupt':
        this.phase = { ...work, kind: 'interrupting' };
        return;
      case 'interrupt-settled':
        this.store('working', work);
        return;
      case 'stream':
        this.store(kind, { ...work, streaming: event.value });
        return;
      case 'stop':
        this.epoch += 1;
        switch (phase.kind) {
          case 'closed':
          case 'interrupting':
            this.phase = { kind: phase.kind, outstanding: 0, thread: 'inactive', streaming: false };
            break;
          case 'exited':
            this.phase = { kind: 'exited' };
            break;
          default:
            this.phase = { kind: 'idle' };
        }
        return;
      case 'transport-ended':
        this.epoch += 1;
        this.phase = { kind: 'exited' };
        return;
      case 'close':
        this.phase = { ...work, kind: 'closed' };
        return;
      default: {
        const unreached: never = event;
        throw new Error(`unhandled app-server turn event ${(unreached as { type: string }).type}`);
      }
    }
  }

  private store(kind: 'working' | 'interrupting', work: Work): void {
    this.phase = kind === 'working' && work.outstanding === 0 && work.thread === 'inactive' && !work.streaming
      ? { kind: 'idle' }
      : { ...work, kind };
  }
}
