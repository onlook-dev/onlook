import { describe, expect, it } from 'bun:test';
import { ClaudeTurnLifecycle, type ClaudeTurnEvent } from './turn-lifecycle.js';

describe('Claude turn lifecycle', () => {
  const events: ClaudeTurnEvent[] = [
    { type: 'begin' }, { type: 'prompt-pushed' }, { type: 'boundary' }, { type: 'interrupt' },
    { type: 'result' }, { type: 'turn-abandoned' }, { type: 'stream', value: true },
    { type: 'stream', value: false }, { type: 'close' },
  ];
  const phases: { name: string; setup: ClaudeTurnEvent[] }[] = [
    { name: 'idle', setup: [] },
    { name: 'working', setup: [{ type: 'begin' }, { type: 'stream', value: true }] },
    { name: 'boundary-seen', setup: [{ type: 'begin' }, { type: 'boundary' }] },
    { name: 'interrupting-open', setup: [{ type: 'begin' }, { type: 'interrupt' }] },
    { name: 'interrupting-settled', setup: [{ type: 'interrupt' }] },
    { name: 'closed', setup: [{ type: 'close' }] },
  ];

  for (const { name, setup } of phases) {
    for (const event of events) {
      it(`${name} handles ${event.type}${event.type === 'stream' ? ` ${event.value}` : ''}`, () => {
        const lifecycle = new ClaudeTurnLifecycle();
        for (const step of setup) lifecycle.dispatch(step);
        const before = lifecycle.snapshot;
        lifecycle.dispatch(event);
        const after = lifecycle.snapshot;
        if (before.kind === 'closed') {
          expect(after).toEqual(before);
          return;
        }
        switch (event.type) {
          case 'begin':
            expect(lifecycle.turnOpen).toBe(true);
            expect(lifecycle.interrupting).toBe(before.kind === 'interrupting');
            break;
          case 'prompt-pushed':
            expect(lifecycle.boundarySeen).toBe(false);
            break;
          case 'boundary':
            expect(lifecycle.boundarySeen).toBe(before.kind !== 'idle');
            break;
          case 'interrupt':
            expect(after.kind).toBe('interrupting');
            break;
          case 'result':
            expect(after.kind).toBe('idle');
            expect(lifecycle.turnOpen).toBe(false);
            expect(lifecycle.interrupting).toBe(false);
            break;
          case 'turn-abandoned':
            expect(lifecycle.turnOpen).toBe(false);
            expect(lifecycle.interrupting).toBe(before.kind === 'interrupting');
            break;
          case 'stream':
            expect(lifecycle.streaming).toBe(event.value);
            break;
          case 'close':
            expect(lifecycle.closed).toBe(true);
            expect(lifecycle.interrupting).toBe(true);
        }
      });
    }
  }

  it('closes the turn before the streaming falling edge releases a held prompt', () => {
    const lifecycle = new ClaudeTurnLifecycle();
    lifecycle.dispatch({ type: 'begin' });
    lifecycle.dispatch({ type: 'stream', value: true });
    lifecycle.dispatch({ type: 'result' });
    expect([lifecycle.turnOpen, lifecycle.streaming]).toEqual([false, true]);
    lifecycle.dispatch({ type: 'stream', value: false });
    lifecycle.dispatch({ type: 'begin' });
    expect(lifecycle.snapshot.kind).toBe('working');
  });

  it('late stream frames after close cannot restart work', () => {
    const lifecycle = new ClaudeTurnLifecycle();
    lifecycle.dispatch({ type: 'begin' });
    lifecycle.dispatch({ type: 'stream', value: true });
    lifecycle.dispatch({ type: 'close' });
    lifecycle.dispatch({ type: 'stream', value: false });
    lifecycle.dispatch({ type: 'stream', value: true });
    lifecycle.dispatch({ type: 'result' });
    expect(lifecycle.snapshot).toEqual({ kind: 'closed', turn: 'open', streaming: false });
  });
});
