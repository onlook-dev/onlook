import { EventEmitter } from 'node:events';
import type { WebContents } from 'electron';
import { describe, expect, it } from 'bun:test';
import { checkPageProcessSharing, transitionPageLifecycle } from './lifecycle.js';

function rig() {
  const calls: string[] = [];
  let attached = false;
  let refuse = '';
  let replace = false;
  let shared = false;
  let shareAfter = '';
  let unjudgeable = false;
  let holdAt = '';
  let held: Promise<void> | undefined;
  let proceed: () => void = () => {};
  const protocol = Object.assign(new EventEmitter(), {
    isAttached: () => attached,
    attach: () => { attached = true; calls.push('attach'); },
    detach: () => { attached = false; calls.push('detach'); protocol.emit('detach'); },
    sendCommand: async (method: string, params?: { state?: string; playbackRate?: number }) => {
      calls.push(`${method}${params?.state === undefined ? params?.playbackRate === undefined ? '' : `:${params.playbackRate}` : `:${params.state}`}`);
      if (method === shareAfter) shared = true;
      if (method === holdAt) {
        holdAt = '';
        await held;
      }
      if (replace && method === 'Debugger.pause') {
        protocol.detach();
        protocol.attach();
        throw new Error('attachment replaced');
      }
      if (method === refuse) throw new Error('refused');
      if (method === 'Runtime.evaluate') protocol.emit('message', {}, 'Debugger.paused');
    },
  });
  const contents = { debugger: protocol, isDestroyed: () => false } as unknown as WebContents;
  return {
    contents,
    protocol,
    calls,
    isolated: (): boolean => {
      if (unjudgeable) throw new Error('its main frame is disposed');
      return !shared;
    },
    refuse: (method: string) => { refuse = method; },
    replace: () => { replace = true; },
    share: () => { shared = true; },
    shareAfter: (method: string) => { shareAfter = method; },
    unjudgeable: () => { unjudgeable = true; },
    hold: (method: string): (() => void) => {
      holdAt = method;
      held = new Promise<void>((resolve) => { proceed = resolve; });
      return () => { proceed(); };
    },
  };
}

const settle = (): Promise<void> => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

describe('confirmed tab lifecycle suspension (ONL-2894)', () => {
  it('retains the debugger until active and waits for a confirmed pause', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', () => true);
    expect(subject.protocol.isAttached()).toBe(true);
    expect(subject.calls).toEqual(['attach', 'Page.setWebLifecycleState:frozen', 'Debugger.enable', 'Animation.setPlaybackRate:0', 'Debugger.pause', 'Runtime.evaluate']);
    expect(subject.protocol.listenerCount('message')).toBe(0);
    await transitionPageLifecycle(subject.contents, 'active', () => true);
    expect(subject.calls.slice(-4)).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
  });

  it('restores lifecycle and animation and detaches when freezing is refused', async () => {
    const subject = rig();
    subject.refuse('Debugger.pause');
    await expect(transitionPageLifecycle(subject.contents, 'frozen', () => true)).rejects.toThrow('refused');
    expect(subject.calls.slice(-4)).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.listenerCount('message')).toBe(0);
    expect(subject.protocol.listenerCount('detach')).toBe(0);
  });

  it('refuses a shared renderer without pausing it', async () => {
    const subject = rig();
    await expect(transitionPageLifecycle(subject.contents, 'frozen', () => false)).rejects.toThrow('shared');
    expect(subject.calls).not.toContain('Debugger.pause');
    expect(subject.protocol.isAttached()).toBe(false);
  });

  it('does not steal an existing debugger attachment', async () => {
    const subject = rig();
    subject.protocol.attach();
    await expect(transitionPageLifecycle(subject.contents, 'frozen', () => true)).rejects.toThrow('already attached');
    expect(subject.calls).toEqual(['attach']);
  });

  it('does not mistake a replacement debugger for its retained attachment', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', () => true);
    subject.protocol.detach();
    subject.protocol.attach();
    await expect(transitionPageLifecycle(subject.contents, 'active', () => true)).rejects.toThrow('already attached');
  });

  it('thaws a frozen shell whose renderer is shared afterwards', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
    subject.calls.length = 0;
    subject.share();
    checkPageProcessSharing();
    await settle();
    expect(subject.calls).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.isAttached()).toBe(false);
    expect(subject.protocol.listenerCount('detach')).toBe(0);
  });

  it('thaws a shell joined after the creation event without waiting for navigation', async () => {
    const subject = rig();
    try {
      await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
      checkPageProcessSharing();
      subject.share();
      const deadline = Date.now() + 1500;
      while (subject.protocol.isAttached() && Date.now() < deadline) await Bun.sleep(20);
      expect(subject.protocol.isAttached()).toBe(false);
      expect(subject.calls).toContain('Debugger.disable');
    } finally {
      if (subject.protocol.isAttached()) await transitionPageLifecycle(subject.contents, 'active', subject.isolated);
    }
  });

  it('thaws only the shell that lost isolation', async () => {
    const joined = rig();
    const alone = rig();
    await transitionPageLifecycle(joined.contents, 'frozen', joined.isolated);
    await transitionPageLifecycle(alone.contents, 'frozen', alone.isolated);
    alone.calls.length = 0;
    joined.share();
    checkPageProcessSharing();
    await settle();
    expect(alone.calls).toEqual([]);
    expect(alone.protocol.isAttached()).toBe(true);
    await transitionPageLifecycle(alone.contents, 'active', alone.isolated);
    expect(alone.calls).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
  });

  it('leaves a replacement debugger alone when its shell loses isolation', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
    subject.protocol.detach();
    subject.protocol.attach();
    subject.calls.length = 0;
    subject.share();
    checkPageProcessSharing();
    await Bun.sleep(300);
    expect(subject.calls).toEqual([]);
    expect(subject.protocol.isAttached()).toBe(true);
    expect(subject.protocol.listenerCount('detach')).toBe(0);
  });

  it('leaves an in-flight wake to finish rather than thawing under it', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
    subject.calls.length = 0;
    const proceed = subject.hold('Debugger.disable');
    const waking = transitionPageLifecycle(subject.contents, 'active', subject.isolated);
    await settle();
    subject.share();
    checkPageProcessSharing();
    await settle();
    proceed();
    await waking;
    expect(subject.calls).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.isAttached()).toBe(false);
  });

  it('wakes a shell whose sharing the sweep finds in the same tick', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
    subject.calls.length = 0;
    const waking = transitionPageLifecycle(subject.contents, 'active', subject.isolated);
    subject.share();
    checkPageProcessSharing();
    await expect(waking).resolves.toBeUndefined();
    await settle();
    expect(subject.calls).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.isAttached()).toBe(false);
  });

  it('thaws a shell whose isolation cannot be judged and sweeps past it', async () => {
    const unjudged = rig();
    const joined = rig();
    await transitionPageLifecycle(unjudged.contents, 'frozen', unjudged.isolated);
    await transitionPageLifecycle(joined.contents, 'frozen', joined.isolated);
    unjudged.calls.length = 0;
    joined.calls.length = 0;
    unjudged.unjudgeable();
    joined.share();
    expect(() => { checkPageProcessSharing(); }).not.toThrow();
    await settle();
    expect(unjudged.calls.slice(-1)).toEqual(['detach']);
    expect(joined.calls.slice(-1)).toEqual(['detach']);
  });

  it('wakes the shell a thaw left behind without interleaving with it', async () => {
    const subject = rig();
    await transitionPageLifecycle(subject.contents, 'frozen', subject.isolated);
    subject.calls.length = 0;
    subject.share();
    checkPageProcessSharing();
    await transitionPageLifecycle(subject.contents, 'active', () => true);
    expect(subject.calls).toEqual([
      'Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach',
      'attach', 'Page.setWebLifecycleState:active', 'detach',
    ]);
  });

  it('refuses to pause a renderer that starts sharing during setup', async () => {
    const subject = rig();
    subject.shareAfter('Debugger.enable');
    await expect(transitionPageLifecycle(subject.contents, 'frozen', subject.isolated)).rejects.toThrow('shared');
    expect(subject.calls).not.toContain('Debugger.pause');
    expect(subject.calls.slice(-4)).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.isAttached()).toBe(false);
    checkPageProcessSharing();
    await settle();
    expect(subject.calls.slice(-1)).toEqual(['detach']);
  });

  it('retains nothing when sharing begins while the pause is confirming', async () => {
    const subject = rig();
    subject.shareAfter('Debugger.pause');
    await expect(transitionPageLifecycle(subject.contents, 'frozen', subject.isolated)).rejects.toThrow('shared');
    expect(subject.calls.slice(-4)).toEqual(['Page.setWebLifecycleState:active', 'Debugger.disable', 'Animation.setPlaybackRate:1', 'detach']);
    expect(subject.protocol.isAttached()).toBe(false);
    checkPageProcessSharing();
    await settle();
    expect(subject.calls.slice(-1)).toEqual(['detach']);
  });

  it('never cleans up a replacement debugger attached during a failed pause', async () => {
    const subject = rig();
    subject.replace();
    await expect(transitionPageLifecycle(subject.contents, 'frozen', () => true)).rejects.toThrow();
    expect(subject.calls.slice(-2)).toEqual(['detach', 'attach']);
    expect(subject.calls).not.toContain('Page.setWebLifecycleState:active');
    expect(subject.protocol.isAttached()).toBe(true);
    expect(subject.protocol.listenerCount('detach')).toBe(0);
  });
});
