import { afterEach, describe, expect, it, jest } from 'bun:test';
import { createTabPaintGate, TAB_PAINT_TIMEOUT_MS } from './paint.js';

function fixture() {
  let resolve!: (image: { isEmpty(): boolean }) => void;
  let reject!: (error: Error) => void;
  let destroyed = false;
  const calls: string[] = [];
  const captures: string[] = [];
  const frame = new Promise<{ isEmpty(): boolean }>((done, fail) => { resolve = done; reject = fail; });
  const gate = createTabPaintGate({
    contents: { isDestroyed: () => destroyed, capturePage: async (rect, options) => {
      expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
      expect(options).toEqual({ stayHidden: true, stayAwake: true });
      return frame;
    } },
    painted: () => calls.push('painted'),
    failed: () => calls.push('failed'),
    captured: (result) => captures.push(result),
  });
  return { calls, captures, gate, resolve, reject, destroy: () => { destroyed = true; } };
}

afterEach(() => jest.useRealTimers());

async function flushCaptures() {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
}

describe('a tab is uncovered only after a compositor frame', () => {
  it('keeps the outgoing screen until the requested frame arrives', async () => {
    const tab = fixture();
    tab.gate.request();
    await new Promise(resolve => setTimeout(resolve, 175));
    expect(tab.calls).toEqual([]);
    tab.resolve({ isEmpty: () => false });
    await Bun.sleep(0);
    expect(tab.calls).toEqual(['painted']);
  });

  it('never uncovers a tab after cancellation or destruction', async () => {
    for (const stop of ['cancel', 'destroy'] as const) {
      const tab = fixture();
      tab.gate.request();
      if (stop === 'cancel') tab.gate.cancel();
      else { tab.destroy(); tab.gate.cancel(); }
      tab.resolve({ isEmpty: () => false });
      await flushCaptures();
      expect(tab.calls).toEqual([]);
    }
  });

  it('allows an empty or rejected first capture to recover before the deadline', async () => {
    for (const result of ['empty', 'rejected']) {
      const tab = fixture();
      tab.gate.request();
      if (result === 'empty') tab.resolve({ isEmpty: () => true });
      else tab.reject(new Error('renderer gone'));
      await flushCaptures();
      expect(tab.calls).toEqual([]);
      expect(tab.captures).toEqual([result]);
      tab.gate.presented();
      expect(tab.calls).toEqual(['painted']);
      tab.gate.cancel();
    }
  });

  it('offers recovery instead of presenting when readiness or capture never arrives', () => {
    jest.useFakeTimers();
    for (const phase of ['readiness', 'capture']) {
      const tab = fixture();
      if (phase === 'capture') tab.gate.request();
      jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
      expect(tab.calls).toEqual(['failed']);
      tab.gate.cancel();
    }
  });

  it('invalidates old navigation captures but accepts a late frame after the watchdog', async () => {
    jest.useFakeTimers();
    for (const phase of ['navigation', 'timeout']) {
      const tab = fixture();
      tab.gate.request();
      if (phase === 'navigation') tab.gate.restart();
      else jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
      tab.resolve({ isEmpty: () => false });
      await flushCaptures();
      expect(tab.calls).toEqual(phase === 'navigation' ? [] : ['failed', 'painted']);
      tab.gate.cancel();
    }
  });

  it('retries empty compositor frames without extending the stall deadline', async () => {
    jest.useFakeTimers();
    let captures = 0;
    const calls: string[] = [];
    const gate = createTabPaintGate({
      contents: { isDestroyed: () => false, capturePage: async () => {
        captures += 1;
        return { isEmpty: () => captures < 2 };
      } },
      painted: () => calls.push('painted'),
      failed: () => calls.push('failed'),
    });
    gate.request();
    await flushCaptures();
    expect(calls).toEqual([]);
    jest.advanceTimersByTime(150);
    await flushCaptures();
    expect(captures).toBe(2);
    expect(calls).toEqual(['painted']);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not postpone a persistent empty capture through repeated readiness requests', async () => {
    jest.useFakeTimers();
    const calls: string[] = [];
    const reported: string[] = [];
    const gate = createTabPaintGate({
      contents: { isDestroyed: () => false, capturePage: async () => ({ isEmpty: () => true }) },
      painted: () => calls.push('painted'),
      failed: () => calls.push('failed'),
      captured: (result) => reported.push(result),
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      gate.request();
      await flushCaptures();
      jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS / 3);
    }
    expect(calls).toEqual(['failed']);
    // A stuck gate traces the transition, never the retry: each of these is a synchronous disk write (ONL-3153).
    expect(reported).toEqual(['empty']);
    gate.cancel();
    expect(jest.getTimerCount()).toBe(0);
  });
});
