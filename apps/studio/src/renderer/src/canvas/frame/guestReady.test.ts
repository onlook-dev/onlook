import { describe, expect, it } from 'bun:test';
import { bindGuestReady } from './guestReady.js';

function guest(initiallyReady: boolean) {
  let ready = initiallyReady;
  const listeners = new Set<() => void>();
  return {
    addEventListener(_type: 'dom-ready', listener: () => void) { listeners.add(listener); },
    removeEventListener(_type: 'dom-ready', listener: () => void) { listeners.delete(listener); },
    getWebContentsId() {
      if (!ready) throw new Error('not ready');
      return 1;
    },
    finishLoading() {
      ready = true;
      for (const listener of listeners) listener();
    },
  };
}

describe('guest readiness', () => {
  it('initializes a guest whose ready event preceded a delayed host effect', () => {
    const frame = guest(true);
    let seeded = 0;
    bindGuestReady(frame, () => { seeded += 1; });
    expect(seeded).toBe(1);
  });

  it('initializes a guest that becomes ready after binding and detaches on cleanup', () => {
    const frame = guest(false);
    let seeded = 0;
    const dispose = bindGuestReady(frame, () => { seeded += 1; });
    expect(seeded).toBe(0);
    frame.finishLoading();
    expect(seeded).toBe(1);
    dispose();
    frame.finishLoading();
    expect(seeded).toBe(1);
  });

  it('does not hide an initialization error behind the readiness probe', () => {
    const frame = guest(true);
    expect(() => bindGuestReady(frame, () => { throw new Error('seed failed'); }))
      .toThrow('seed failed');
    expect(() => frame.finishLoading()).not.toThrow();
  });

  it('keeps listening for reloads after recovering an already-ready guest', () => {
    const frame = guest(true);
    let seeded = 0;
    const dispose = bindGuestReady(frame, () => { seeded += 1; });
    frame.finishLoading();
    expect(seeded).toBe(2);
    dispose();
    frame.finishLoading();
    expect(seeded).toBe(2);
  });
});
