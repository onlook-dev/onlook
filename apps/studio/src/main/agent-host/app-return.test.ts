import { describe, expect, it } from 'bun:test';
import { settle } from '@studio/fixtures';
import { appReturnedToForeground, type AppReturnEvents } from './app-return.js';

interface FakeApp extends AppReturnEvents {
  emit: (event: string) => void;
  listeners: () => number;
}

function fakeApp(): FakeApp {
  const registered = new Map<string, Set<() => void>>();
  return {
    on(event: string, listener: () => void): unknown {
      const existing = registered.get(event) ?? new Set<() => void>();
      existing.add(listener);
      registered.set(event, existing);
      return undefined;
    },
    off(event: string, listener: () => void): unknown {
      registered.get(event)?.delete(listener);
      return undefined;
    },
    emit(event: string): void {
      for (const listener of [...(registered.get(event) ?? [])]) listener();
    },
    listeners(): number {
      let total = 0;
      for (const set of registered.values()) total += set.size;
      return total;
    },
  };
}

describe('app return to the foreground', () => {
  it.each([
    ['browser-window-blur', 'browser-window-focus'],
    ['did-resign-active', 'did-become-active'],
  ])('resolves on %s then %s and never on a return it never left', async (left, back) => {
    const events = fakeApp();
    const abort = new AbortController();
    let returned = false;
    const pending = appReturnedToForeground(abort.signal, events, []).then(() => { returned = true; });
    expect(events.listeners()).toBeGreaterThan(0);
    events.emit(back);
    await settle();
    expect(returned).toBe(false);
    events.emit(left);
    events.emit(back);
    await pending;
    expect(returned).toBe(true);
    expect(events.listeners()).toBe(0);
  });

  it('rejects an abort during the hand-off and leaves no listener behind', async () => {
    const events = fakeApp();
    const abort = new AbortController();
    const rejected = appReturnedToForeground(abort.signal, events, []).catch((error: unknown) => error);
    events.emit('browser-window-blur');
    const reason = new Error('hand-off abandoned');
    abort.abort(reason);
    expect(await rejected).toBe(reason);
    expect(events.listeners()).toBe(0);
    events.emit('browser-window-focus');
    await settle();
  });

  it('returns on the window pair alone, which is the whole signal off macOS', async () => {
    const events = fakeApp();
    const window = fakeApp();
    const abort = new AbortController();
    let returned = false;
    const pending = appReturnedToForeground(abort.signal, events, [window]).then(() => { returned = true; });
    window.emit('focus');
    await settle();
    expect(returned).toBe(false);
    window.emit('blur');
    window.emit('focus');
    await pending;
    expect(returned).toBe(true);
    expect(window.listeners()).toBe(0);
    expect(events.listeners()).toBe(0);
  });

  it('rejects an already aborted hand-off without registering a listener', async () => {
    const events = fakeApp();
    const abort = new AbortController();
    const reason = new Error('already gone');
    abort.abort(reason);
    await expect(appReturnedToForeground(abort.signal, events, [])).rejects.toBe(reason);
    expect(events.listeners()).toBe(0);
  });
});
