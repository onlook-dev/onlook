import type { EventInput } from './event-log.js';

const PROVIDER_SILENCE_MS = 120_000;

export class TurnWatchdog {
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private stalled = false;
  private holds = 0;
  private readonly tools = new Set<string>();
  private readonly permissions = new Set<string>();
  private readonly onStalled?: (silentMs: number) => void;

  constructor(onStalled?: (silentMs: number) => void) {
    this.onStalled = onStalled;
  }

  start(): void {
    this.stop();
    this.active = true;
    this.stalled = false;
    this.holds = 0;
    this.tools.clear();
    this.permissions.clear();
    this.arm();
  }

  /** What this measures is the provider's silence, so a turn still waiting on Studio itself is not
   * counted against it: a runtime install outlasts the window on its own (ONL-2925). */
  hold(): void {
    this.holds += 1;
    this.arm();
  }

  release(): void {
    if (this.holds > 0) this.holds -= 1;
    this.arm();
  }

  observe(event: EventInput): void {
    if (!this.active) return;
    switch (event.type) {
      case 'tool.start':
      case 'tool.update':
        if (event.status === 'in_progress') this.tools.add(event.toolCallId);
        break;
      case 'tool.end': this.tools.delete(event.toolCallId); break;
      case 'permission.requested': this.permissions.add(event.requestId); break;
      case 'permission.resolved': this.permissions.delete(event.requestId); break;
      case 'text.start':
      case 'text.delta':
      case 'text.end':
      case 'thinking.start':
      case 'thinking.delta':
      case 'thinking.end':
      case 'session.retrying': break;
      case 'turn.ended': this.stop(); return;
      default: return;
    }
    this.arm();
  }

  stop(): boolean {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.active = false;
    return this.stalled;
  }

  private arm(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.active || this.holds > 0) return;
    if (!this.onStalled || this.stalled || this.tools.size > 0 || this.permissions.size > 0) return;
    const since = Date.now();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.stalled = true;
      this.onStalled?.(Math.max(0, Date.now() - since));
    }, PROVIDER_SILENCE_MS);
    this.timer.unref();
  }
}
