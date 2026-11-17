import { describe, expect, it } from 'bun:test';
import { navigateFrameTarget, type FrameTarget, type TargetGuest } from './targetNavigation.js';

function guest(attached = true): TargetGuest & { urls: string[]; ready(): void } {
  const listeners = new Set<() => void>();
  const urls: string[] = [];
  return {
    urls,
    getWebContentsId: () => {
      if (!attached) throw new Error('not attached');
      return 1;
    },
    loadURL: async (url) => { urls.push(url); },
    addEventListener: (_type, listener) => { listeners.add(listener); },
    removeEventListener: (_type, listener) => { listeners.delete(listener); },
    ready: () => {
      attached = true;
      for (const listener of [...listeners]) listener();
    },
  };
}

const target: FrameTarget = { url: 'http://localhost:4000/', seq: 1 };

describe('a navigation surviving guest replacement (ONL-2568)', () => {
  it('keeps a request pending while no guest is mounted', async () => {
    const completed = { current: null as FrameTarget | null };
    navigateFrameTarget(null, target, completed, true);
    const next = guest();
    navigateFrameTarget(next, target, completed, true);
    await Promise.resolve();
    expect(next.urls).toEqual([target.url]);
    expect(completed.current).toBe(target);
  });

  it('leaves a failed attachment pending until an explicit ready retry', async () => {
    const next = guest(false);
    const completed = { current: null as FrameTarget | null };
    navigateFrameTarget(next, target, completed, true);
    expect(next.urls).toEqual([]);
    next.ready();
    next.ready();
    await Promise.resolve();
    expect(next.urls).toEqual([]);
    expect(completed.current).toBeNull();
    navigateFrameTarget(next, target, completed, true);
    await Promise.resolve();
    expect(next.urls).toEqual([target.url]);
    expect(completed.current).toBe(target);
  });

  it('does not pull a refreshed page back to an already completed request', async () => {
    const completed = { current: null as FrameTarget | null };
    const first = guest();
    navigateFrameTarget(first, target, completed, true);
    await Promise.resolve();
    const refreshed = guest();
    navigateFrameTarget(refreshed, target, completed, true);
    expect(refreshed.urls).toEqual([]);
    navigateFrameTarget(refreshed, { ...target, seq: 2 }, completed, true);
    expect(refreshed.urls).toEqual([target.url]);
  });

  it('does not consume a request completed by a guest that was replaced', async () => {
    const completed = { current: null as FrameTarget | null };
    const first = guest();
    const cleanup = navigateFrameTarget(first, target, completed, true);
    cleanup?.();
    await Promise.resolve();
    expect(completed.current).toBeNull();
    const replacement = guest();
    navigateFrameTarget(replacement, target, completed, true);
    expect(replacement.urls).toEqual([target.url]);
  });

  it('does not install an attachment retry when a request is superseded', () => {
    const first = guest(false);
    const cleanup = navigateFrameTarget(first, target, { current: null }, true);
    cleanup?.();
    first.ready();
    expect(first.urls).toEqual([]);
  });

  it('leaves a rejected navigation available to the replacement guest', async () => {
    const completed = { current: null as FrameTarget | null };
    const failed = guest();
    failed.loadURL = () => Promise.reject(new Error('guest was destroyed'));
    const cleanup = navigateFrameTarget(failed, target, completed, true);
    cleanup?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(completed.current).toBeNull();
    const replacement = guest();
    navigateFrameTarget(replacement, target, completed, true);
    expect(replacement.urls).toEqual([target.url]);
  });

  it('does not replay a finished connection failure when the designer refreshes another page', async () => {
    const completed = { current: null as FrameTarget | null };
    const failed = guest();
    failed.loadURL = () => Promise.reject(new Error('connection refused'));
    navigateFrameTarget(failed, target, completed, true);
    await Promise.resolve();
    const refreshed = guest();
    navigateFrameTarget(refreshed, target, completed, true);
    expect(refreshed.urls).toEqual([]);
  });

  it('reports the request it reached, and never one its guest lost (ONL-2897)', async () => {
    const reached: FrameTarget[] = [];
    const first = guest();
    const cleanup = navigateFrameTarget(first, target, { current: null }, true, (settled) => { reached.push(settled); });
    cleanup?.();
    await Promise.resolve();
    expect(reached).toEqual([]);
    const replacement = guest();
    navigateFrameTarget(replacement, target, { current: null }, true, (settled) => { reached.push(settled); });
    await Promise.resolve();
    expect(reached).toEqual([target]);
  });

  it('retires a request its guest refused, since the failure is what recovery names (ONL-2897)', async () => {
    const reached: FrameTarget[] = [];
    const refused = guest();
    refused.loadURL = () => Promise.reject(new Error('connection refused'));
    navigateFrameTarget(refused, target, { current: null }, true, (settled) => { reached.push(settled); });
    await Promise.resolve();
    await Promise.resolve();
    expect(reached).toEqual([target]);
  });

  it('requires explicit readiness even when a guest id exists and DOM readiness fires', async () => {
    const mounting = guest(true);
    const completed = { current: null as FrameTarget | null };
    navigateFrameTarget(mounting, target, completed, false);
    expect(mounting.urls).toEqual([]);
    mounting.ready();
    await Promise.resolve();
    expect(mounting.urls).toEqual([]);
    expect(completed.current).toBeNull();
    navigateFrameTarget(mounting, target, completed, true);
    await Promise.resolve();
    expect(mounting.urls).toEqual([target.url]);
    expect(completed.current).toBe(target);
  });

  it('does not inspect or navigate a guest while readiness is false', () => {
    const mounting = guest();
    let inspections = 0;
    let listeners = 0;
    mounting.getWebContentsId = () => { inspections += 1; return 1; };
    mounting.addEventListener = () => { listeners += 1; };
    expect(() => navigateFrameTarget(mounting, target, { current: null }, false)).not.toThrow();
    expect(inspections).toBe(0);
    expect(listeners).toBe(0);
    expect(mounting.urls).toEqual([]);
  });

  it('leaves a synchronous load failure pending without a DOM retry', async () => {
    const mounting = guest();
    const loadURL = mounting.loadURL;
    const completed = { current: null as FrameTarget | null };
    const reached: FrameTarget[] = [];
    mounting.loadURL = () => { throw new Error('guest was destroyed'); };
    navigateFrameTarget(mounting, target, completed, true, (settled) => { reached.push(settled); });
    mounting.loadURL = loadURL;
    mounting.ready();
    await Promise.resolve();
    expect(mounting.urls).toEqual([]);
    expect(completed.current).toBeNull();
    expect(reached).toEqual([]);
    navigateFrameTarget(mounting, target, completed, true, (settled) => { reached.push(settled); });
    await Promise.resolve();
    expect(mounting.urls).toEqual([target.url]);
    expect(completed.current).toBe(target);
    expect(reached).toEqual([target]);
  });
});
