import { describe, expect, it } from 'bun:test';
import { freezeAnimations, type CdpSocket } from './animations.js';
import { outcome, settle } from './async.js';
import type { CdpTarget } from './cdp.js';

const TARGET: CdpTarget = { id: 't', type: 'page', title: 'Onlook', url: 'file:///index.html?tab=t1', webSocketDebuggerUrl: 'ws://fake' };

function fakePage() {
  const sent: { method: string; params: Record<string, unknown> }[] = [];
  const listeners = new Map<string, ((event: { data?: unknown }) => void)[]>();
  let closed = false;
  const emit = (type: string, data?: unknown) => {
    for (const listener of listeners.get(type) ?? []) listener({ data });
  };
  const socket: CdpSocket = {
    send: (data) => {
      const frame = JSON.parse(data) as { id: number; method: string; params: Record<string, unknown> };
      sent.push({ method: frame.method, params: frame.params });
      queueMicrotask(() => emit('message', JSON.stringify({ id: frame.id, result: {} })));
    },
    close: () => {
      closed = true;
    },
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      if (type === 'open') queueMicrotask(() => listener({}));
    },
  };
  const start = (id: string, name: string) => emit('message', JSON.stringify({ method: 'Animation.animationStarted', params: { animation: { id, name } } }));
  return { socket, sent, start, isClosed: () => closed };
}

describe('freezeAnimations', () => {
  it('stops the timeline before anything can start, and plays it again on release', async () => {
    const page = fakePage();
    const frozen = await freezeAnimations(TARGET, () => page.socket);
    expect(page.sent.map((m) => m.method)).toStrictEqual(['Animation.enable', 'Animation.setPlaybackRate']);
    expect(page.sent[1]!.params).toStrictEqual({ playbackRate: 0 });
    await frozen.release();
    expect(page.sent.at(-1)).toStrictEqual({ method: 'Animation.setPlaybackRate', params: { playbackRate: 1 } });
    expect(page.isClosed()).toBe(true);
  });

  it('seeks only the animations whose names match, all to one time', async () => {
    const page = fakePage();
    const frozen = await freezeAnimations(TARGET, () => page.socket);
    page.start('a1', 'ideas:stage');
    page.start('a2', 'ideas:card:landing');
    page.start('a3', 'tooltip');
    expect(await frozen.seek(400, (name) => name.startsWith('ideas:'))).toBe(2);
    expect(page.sent.at(-1)).toStrictEqual({ method: 'Animation.seekAnimations', params: { animations: ['a1', 'a2'], currentTime: 400 } });
  });

  it('sends no seek when nothing matches', async () => {
    const page = fakePage();
    const frozen = await freezeAnimations(TARGET, () => page.socket);
    const before = page.sent.length;
    expect(await frozen.seek(100)).toBe(0);
    expect(page.sent.length).toBe(before);
  });

  it('waits for an animation by name, and names what did start when it never comes', async () => {
    const page = fakePage();
    const frozen = await freezeAnimations(TARGET, () => page.socket);
    const arrived = frozen.waitFor('ideas:stage', 1_000);
    page.start('a1', 'ideas:words');
    page.start('a2', 'ideas:stage');
    await arrived;
    expect(await outcome(frozen.waitFor('ideas:caption:landing', 20))).toThrow(/ideas:words, ideas:stage/);
    await settle();
  });
});
