type DeliveryBoundary = 'waiting' | 'seen';
type OpenTurn = { streaming: boolean; boundary: DeliveryBoundary };

export type ClaudeTurnPhase =
  | { kind: 'idle'; streaming: boolean }
  | ({ kind: 'working' } & OpenTurn)
  | ({ kind: 'interrupting'; turn: 'open' | 'settled' } & OpenTurn)
  | { kind: 'closed'; streaming: boolean; turn: 'open' | 'settled' };

export type ClaudeTurnEvent =
  | { type: 'begin' }
  | { type: 'prompt-pushed' }
  | { type: 'boundary' }
  | { type: 'interrupt' }
  | { type: 'result' }
  /** The turn closes with no `result`, so an interrupt it was asked for stays unanswered. */
  | { type: 'turn-abandoned' }
  | { type: 'stream'; value: boolean }
  | { type: 'close' };

export class ClaudeTurnLifecycle {
  private phase: ClaudeTurnPhase = { kind: 'idle', streaming: false };

  get snapshot(): Readonly<ClaudeTurnPhase> { return this.phase; }
  get closed(): boolean { return this.phase.kind === 'closed'; }
  get streaming(): boolean { return this.phase.streaming; }
  /** Between Studio's `turn.started` and its `result`; a stream outside it is a turn the CLI began on its own (ONL-2180). */
  get turnOpen(): boolean {
    return this.phase.kind === 'working' ||
      ((this.phase.kind === 'interrupting' || this.phase.kind === 'closed') && this.phase.turn === 'open');
  }
  /** An interrupt comes back as `error_during_execution`; only the host knows it asked. */
  get interrupting(): boolean { return this.phase.kind === 'interrupting' || this.closed; }
  get boundarySeen(): boolean { return 'boundary' in this.phase && this.phase.boundary === 'seen'; }

  dispatch(event: ClaudeTurnEvent): void {
    const phase = this.phase;
    if (phase.kind === 'closed') {
      if (event.type === 'stream' && !event.value) this.phase = { ...phase, streaming: false };
      return;
    }
    switch (event.type) {
      case 'begin':
        this.phase = phase.kind === 'interrupting'
          ? { ...phase, turn: 'open' }
          : { kind: 'working', streaming: phase.streaming, boundary: 'waiting' };
        return;
      case 'prompt-pushed':
        if ('boundary' in phase) this.phase = { ...phase, boundary: 'waiting' };
        return;
      case 'boundary':
        if ('boundary' in phase) this.phase = { ...phase, boundary: 'seen' };
        return;
      case 'interrupt':
        this.phase = { kind: 'interrupting', turn: this.turnOpen ? 'open' : 'settled', streaming: phase.streaming,
          boundary: 'boundary' in phase ? phase.boundary : 'waiting' };
        return;
      case 'result':
        this.phase = { kind: 'idle', streaming: phase.streaming };
        return;
      case 'turn-abandoned':
        this.phase = phase.kind === 'interrupting'
          ? { ...phase, turn: 'settled' }
          : { kind: 'idle', streaming: phase.streaming };
        return;
      case 'stream':
        this.phase = { ...phase, streaming: event.value };
        return;
      case 'close':
        this.phase = { kind: 'closed', streaming: phase.streaming, turn: this.turnOpen ? 'open' : 'settled' };
        return;
      default: {
        const unreached: never = event;
        throw new Error(`unhandled Claude turn event ${(unreached as { type: string }).type}`);
      }
    }
  }
}
