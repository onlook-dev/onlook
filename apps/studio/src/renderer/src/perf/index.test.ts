import { expect, test } from 'bun:test';
import type { RendererTelemetryEvent } from '@studio/events';
import { useAgentStore } from '../agent/store.js';
import { initPerfTelemetry } from './index.js';

test('attributes typing and slow key/pointer inputs before observer delivery and delayed reporting (ONL-2407)', async () => {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const originalState = useAgentStore.getState();
  const listeners = new Map<string, (event: { type: string; target: unknown; timeStamp: number }) => void>();
  const reports: RendererTelemetryEvent[] = [];
  const delayed: Array<() => void> = [];
  let flush: (() => void) | undefined;
  let observe: ((list: PerformanceObserverEntryList) => void) | undefined;
  const replace = (name: string, value: unknown): void => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  class Target {
    constructor(private readonly surface: string) {}
    closest(): this { return this; }
    getAttribute(): string { return this.surface; }
  }
  class Observer {
    static supportedEntryTypes = ['event'];
    constructor(callback: (list: PerformanceObserverEntryList) => void) { observe = callback; }
    observe(): void {}
  }
  try {
    replace('Element', Target);
    replace('PerformanceObserver', Observer);
    replace('document', { addEventListener: (name: string, listener: (event: { type: string; target: unknown; timeStamp: number }) => void) => listeners.set(name, listener) });
    replace('window', {
      studio: {
        telemetryConfig: async () => ({ enabled: true }),
        telemetryEvent: (event: RendererTelemetryEvent) => reports.push(event),
      },
      addEventListener: () => undefined,
    });
    replace('setTimeout', (callback: () => void) => { delayed.push(callback); return delayed.length; });
    replace('setInterval', (callback: () => void) => { flush = callback; return 1; });
    await initPerfTelemetry();

    const input = (type: string, timeStamp: number, surface: string, busy: boolean): void => {
      useAgentStore.setState({ isStreaming: false, otherTabAgentBusy: busy });
      listeners.get(type)!({ type, timeStamp, target: new Target(surface) });
    };
    const deliver = (interactionId: number, startTime: number, name: string, surface: string, duration = 240): void => {
      const entries = [{ interactionId, startTime, name, target: new Target(surface), duration, processingStart: startTime + 10, processingEnd: startTime + 20 }];
      observe!({ getEntries: () => entries } as unknown as PerformanceObserverEntryList);
    };
    input('keydown', 100, 'chat_panel', true);
    input('keydown', 400, 'inline_chat', false);
    input('pointerdown', 700, 'canvas', true);
    input('pointerdown', 1000, 'canvas', false);
    useAgentStore.setState({ otherTabAgentBusy: false });
    deliver(1, 100, 'keydown', 'chat_panel');
    deliver(3, 700, 'pointerdown', 'canvas', 40);
    useAgentStore.setState({ otherTabAgentBusy: true });
    deliver(2, 400, 'keydown', 'inline_chat');
    deliver(4, 1000, 'pointerdown', 'canvas');
    input('pointerup', 740, 'canvas', false);
    deliver(3, 740, 'pointerup', 'canvas', 300);
    useAgentStore.setState({ otherTabAgentBusy: false });
    for (const report of delayed) report();
    const slow = reports.filter((event) => event.event === 'slow_interaction');
    expect(slow.map((event) => [event.properties.input, event.properties.other_tab_agent_busy])).toEqual([
      ['key', true], ['key', false], ['pointer', false], ['pointer', true],
    ]);
    flush!();
    const typing = reports.find((event) => event.event === 'chat_typing_measured');
    expect(typing?.properties).toMatchObject({
      busy_keystrokes: 0,
      idle_keystrokes: 2,
      other_tab_busy_keystrokes: 1,
      other_tab_busy_over_100: 1,
    });
  } finally {
    useAgentStore.setState(originalState);
    for (const [name, descriptor] of originals) {
      if (descriptor === undefined) Reflect.deleteProperty(globalThis, name);
      else Object.defineProperty(globalThis, name, descriptor);
    }
  }
});
