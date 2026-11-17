import { describe, expect, it } from 'bun:test';
import { AppServerTurnLifecycle, type AppServerTurnEvent } from './turn-lifecycle.js';

describe('ChatGPT turn lifecycle', () => {
  const events: AppServerTurnEvent[] = [
    { type: 'request' }, { type: 'started' }, { type: 'settled' },
    { type: 'thread', active: true }, { type: 'thread', active: false },
    { type: 'interrupt' }, { type: 'interrupt-settled' },
    { type: 'stream', value: true }, { type: 'stream', value: false },
    { type: 'stop' }, { type: 'transport-ended' }, { type: 'close' },
  ];
  const phases: { name: string; setup: AppServerTurnEvent[] }[] = [
    { name: 'idle', setup: [] },
    { name: 'requested', setup: [{ type: 'request' }] },
    { name: 'active', setup: [{ type: 'request' }, { type: 'thread', active: true }, { type: 'stream', value: true }] },
    { name: 'interrupting', setup: [{ type: 'request' }, { type: 'interrupt' }] },
    { name: 'stopped', setup: [{ type: 'interrupt' }, { type: 'stop' }] },
    { name: 'closed', setup: [{ type: 'close' }] },
    { name: 'exited', setup: [{ type: 'transport-ended' }] },
  ];
  for (const { name, setup } of phases) {
    for (const event of events) {
      it(`${name} handles ${event.type}${event.type === 'stream' ? ` ${event.value}` : event.type === 'thread' ? ` ${event.active}` : ''}`, () => {
        const lifecycle = new AppServerTurnLifecycle();
        for (const step of setup) lifecycle.dispatch(step);
        const before = lifecycle.snapshot;
        const owed = lifecycle.outstanding;
        lifecycle.dispatch(event);
        if (before.kind === 'closed') {
          expect(lifecycle.snapshot).toEqual(before);
          expect(lifecycle.settleEpoch).toBe(event.type === 'stop' ? 1 : 0);
          return;
        }
        if (before.kind === 'exited' && event.type !== 'close') {
          expect(lifecycle.snapshot).toEqual(before);
          expect(lifecycle.settleEpoch).toBe(event.type === 'stop' ? 2 : 1);
          return;
        }
        switch (event.type) {
          case 'request':
            expect(lifecycle.outstanding).toBe(owed + 1);
            expect(lifecycle.interruptPending).toBe(false);
            break;
          case 'started':
            expect(lifecycle.outstanding).toBe(Math.max(1, owed));
            break;
          case 'settled':
            expect(lifecycle.outstanding).toBe(Math.max(0, owed - 1));
            break;
          case 'thread':
            expect(lifecycle.threadActive).toBe(event.active);
            break;
          case 'interrupt':
            expect(lifecycle.interruptPending).toBe(true);
            break;
          case 'interrupt-settled':
            expect(lifecycle.interruptPending).toBe(false);
            break;
          case 'stream':
            expect(lifecycle.streaming).toBe(event.value);
            break;
          case 'stop':
            expect([lifecycle.outstanding, lifecycle.threadActive, lifecycle.streaming]).toEqual([0, false, false]);
            expect(lifecycle.settleEpoch).toBe(name === 'stopped' ? 2 : 1);
            break;
          case 'transport-ended':
            expect(lifecycle.snapshot).toEqual({ kind: 'exited' });
            expect(lifecycle.settleEpoch).toBe(name === 'stopped' ? 2 : 1);
            break;
          case 'close':
            expect(lifecycle.closed).toBe(true);
        }
      });
    }
  }

  it('keeps working until both the requested turn and active thread settle', () => {
    const lifecycle = new AppServerTurnLifecycle();
    lifecycle.dispatch({ type: 'request' });
    lifecycle.dispatch({ type: 'stream', value: true });
    lifecycle.dispatch({ type: 'thread', active: true });
    lifecycle.dispatch({ type: 'settled' });
    expect(lifecycle.threadActive).toBe(true);
    expect(lifecycle.streaming).toBe(true);
    lifecycle.dispatch({ type: 'thread', active: false });
    expect(lifecycle.snapshot).toEqual({ kind: 'idle' });
  });

  it('retains the streaming window while a completed steer becomes a new turn', () => {
    const lifecycle = new AppServerTurnLifecycle();
    lifecycle.dispatch({ type: 'stream', value: true });
    lifecycle.dispatch({ type: 'thread', active: false, keepStreaming: true });
    expect(lifecycle.streaming).toBe(true);
    expect(lifecycle.outstanding).toBe(0);
    lifecycle.dispatch({ type: 'request' });
    expect(lifecycle.outstanding).toBe(1);
  });
});
