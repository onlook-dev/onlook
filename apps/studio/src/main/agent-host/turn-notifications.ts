import type { StudioEvent } from '@studio/events';
import type { AgentBackend, BackendState } from './backend.js';

type NotificationSession = Pick<AgentBackend, 'isTurnLive'>;
type NotificationState = { live: boolean; cancelled: boolean; pending?: StudioEvent };

export class TurnNotifications {
  private readonly states = new WeakMap<NotificationSession, NotificationState>();

  constructor(private readonly deliver: (event: StudioEvent) => void) {}

  observe(event: StudioEvent, session?: NotificationSession): void {
    if (session === undefined || event.type !== 'turn.ended') {
      if (session !== undefined && event.type === 'turn.started') this.state(session).pending = undefined;
      this.deliver(event);
      return;
    }
    const state = this.state(session);
    if (event.stopReason === 'interrupted' || event.stopReason === 'session_closed') {
      state.pending = undefined;
      this.deliver(event);
      return;
    }
    if (state.cancelled) return;
    if (session.isTurnLive) state.pending = event;
    else this.deliver(event);
  }

  update(session: NotificationSession, next: BackendState): void {
    const state = this.state(session);
    if (!state.live && next.isTurnLive) state.cancelled = false;
    state.live = next.isTurnLive;
    if (next.turnEnding) state.pending = undefined;
    if (next.isTurnLive || state.pending === undefined) return;
    const pending = state.pending;
    state.pending = undefined;
    if (!state.cancelled) this.deliver(pending);
  }

  cancel(session: NotificationSession): void {
    const state = this.state(session);
    state.cancelled = true;
    state.pending = undefined;
  }

  private state(session: NotificationSession): NotificationState {
    let state = this.states.get(session);
    if (state === undefined) {
      state = { live: session.isTurnLive, cancelled: false };
      this.states.set(session, state);
    }
    return state;
  }
}
