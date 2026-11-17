import { asksQuestion, type BackgroundEventKind, type StudioEvent } from '@studio/events';

export class BackgroundActivity {
  private seen = new Set<string>();
  private waiting = new Map<string, { kind: 'question' | 'approval'; since: number }>();

  observe(event: StudioEvent): { kind?: BackgroundEventKind; waitedMs?: number; waitingKind?: 'question' | 'approval' } {
    if (event.type !== 'permission.requested' && event.type !== 'permission.resolved' && event.type !== 'turn.ended') return {};
    const key = `${event.sessionId}:${event.eventId}`;
    if (this.seen.has(key)) return {};
    this.seen.add(key);
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value!);
    if (event.type === 'permission.requested') {
      const kind = asksQuestion(event.questions) ? 'question' : 'approval';
      this.waiting.set(`${event.sessionId}:${event.requestId}`, { kind, since: event.ts });
      return { kind };
    }
    if (event.type === 'permission.resolved') {
      const request = `${event.sessionId}:${event.requestId}`;
      const held = this.waiting.get(request);
      this.waiting.delete(request);
      return held === undefined || event.outcome === 'deny' ? {} : { waitedMs: Math.max(0, event.ts - held.since), waitingKind: held.kind };
    }
    for (const request of this.waiting.keys()) if (request.startsWith(`${event.sessionId}:`)) this.waiting.delete(request);
    if (event.stopReason === 'interrupted' || event.stopReason === 'session_closed') return {};
    const finished = event.stopReason === undefined || event.stopReason === 'success' || event.stopReason === 'completed' || event.stopReason === 'end_turn';
    return { kind: finished ? 'finished' : 'failed' };
  }
}

export function backgroundDestination(focused: boolean, activeProject: boolean): 'notification' | 'toast' | undefined {
  return focused ? (activeProject ? undefined : 'toast') : 'notification';
}
