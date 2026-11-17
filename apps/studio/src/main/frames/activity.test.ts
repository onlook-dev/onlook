import { describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { WebContents } from 'electron';
import { activityFor, checkFrameProcessSharing, createFrameActivity, withFrameAwake } from './activity.js';

let nextFrameId = 1;

function nativeRig(pid = 123, size = { width: 800, height: 600 }) {
  let attached = false;
  let frozen = false;
  let failFreeze = false;
  let captured = false;
  let hostCaptured = false;
  let confirmPause = true;
  let deferred: { state: string; work: Promise<void> } | undefined;
  const commands: string[] = [];
  const debuggerPort = Object.assign(new EventEmitter(), {
    isAttached: () => attached,
    attach: () => { attached = true; },
    detach: () => { attached = false; frozen = false; debuggerPort.emit('detach'); },
    sendCommand: async (method: string, params?: { playbackRate: number }) => {
      const command = method === 'Animation.setPlaybackRate' ? `Animation:${params?.playbackRate}` : method;
      commands.push(command);
      if (deferred?.state === command) await deferred.work;
      if (method === 'Debugger.pause' && failFreeze) throw new Error('freeze failed');
      if (method === 'Debugger.pause' && confirmPause) {
        frozen = true;
        debuggerPort.emit('message', {}, 'Debugger.paused', {});
      }
      if (method === 'Debugger.disable') frozen = false;
    },
  });
  let resized: { width: number; height: number } | undefined;
  const image = { isEmpty: () => false, getSize: () => size, toDataURL: () => 'thumbnail', resize: (dimensions: { width: number; height: number }) => { resized = dimensions; return { toDataURL: () => 'thumbnail' }; } };
  const frames = [{ osProcessId: pid, detached: false, frameTreeNodeId: nextFrameId++ }];
  const guest = Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    isLoading: () => false,
    isBeingCaptured: () => captured,
    hostWebContents: { isDestroyed: () => false, isBeingCaptured: () => hostCaptured },
    getOSProcessId: () => pid,
    mainFrame: { framesInSubtree: frames },
    capturePage: async () => image,
    debugger: debuggerPort,
  }) as unknown as WebContents;
  const registry = [guest];
  const activity = activityFor(guest, () => registry);
  return {
    guest, debuggerPort, commands, activity, registry, frames,
    attached: () => attached,
    resized: () => resized,
    frozen: () => frozen,
    fail: () => { failFreeze = true; },
    capture: () => { captured = true; },
    recordWindow: () => { captured = true; hostCaptured = true; },
    unconfirmed: () => { confirmPause = false; },
    defer: (state: string) => {
      let reject: (error: Error) => void = () => {};
      const work = new Promise<void>((_resolve, fail) => { reject = fail; });
      deferred = { state, work };
      return reject;
    },
  };
}

describe('native Frame lifecycle', () => {
  it('keeps screenshot-sized idle pictures intact and bounds oversized pictures', async () => {
    const crisp = nativeRig(123, { width: 780, height: 3800 });
    expect(await crisp.activity.setIdle(true)).toEqual({ paused: true, thumbnail: 'thumbnail' });
    expect(crisp.resized()).toBeUndefined();
    const bounded = nativeRig(124, { width: 8000, height: 2000 });
    expect(await bounded.activity.setIdle(true)).toEqual({ paused: true, thumbnail: 'thumbnail' });
    expect(bounded.resized()).toEqual({ width: 4096, height: 1024 });
  });
  it('retains its debugger while frozen and releases it before capture or evaluation', async () => {
    const test = nativeRig();
    const activity = test.activity;
    expect(await activity.setIdle(true)).toEqual({ paused: true, thumbnail: 'thumbnail' });
    expect(test.attached()).toBe(true);
    expect(test.frozen()).toBe(true);
    await withFrameAwake(test.guest, async () => {
      expect(test.attached()).toBe(false);
      expect(test.frozen()).toBe(false);
      expect(test.commands).toEqual(['Debugger.enable', 'Animation:0', 'Debugger.pause', 'Runtime.evaluate', 'Debugger.disable', 'Animation:1']);
      test.debuggerPort.attach();
      await activity.setIdle(true);
      expect(test.attached()).toBe(true);
      expect(test.frozen()).toBe(false);
      test.debuggerPort.detach();
    });
    await activity.setIdle(true);
    expect(test.frozen()).toBe(true);
    await activity.setIdle(false);
    expect(test.attached()).toBe(false);
  });

  it('does not steal or detach another debugger', async () => {
    const test = nativeRig();
    test.debuggerPort.attach();
    const activity = test.activity;
    expect(await activity.setIdle(true)).toEqual({ paused: false });
    await activity.setIdle(false);
    expect(test.attached()).toBe(true);
    expect(test.commands).toEqual([]);
  });

  it('reconciles an unexpected detach and leaves a replacement debugger alone', async () => {
    const test = nativeRig();
    const activity = test.activity;
    await activity.setIdle(true);
    test.debuggerPort.detach();
    test.debuggerPort.attach();
    expect(await activity.setIdle(true)).toEqual({ paused: false });
    expect(test.attached()).toBe(true);
    expect(test.frozen()).toBe(false);
    expect(test.commands).toEqual(['Debugger.enable', 'Animation:0', 'Debugger.pause', 'Runtime.evaluate']);
  });

  it('cleans up its own attachment when freezing fails', async () => {
    const test = nativeRig();
    test.fail();
    await expect(test.activity.setIdle(true)).rejects.toThrow('freeze failed');
    expect(test.frozen()).toBe(false);
    expect(test.attached()).toBe(false);
    expect(test.commands).toEqual(['Debugger.enable', 'Animation:0', 'Debugger.pause', 'Debugger.disable', 'Animation:1']);
  });

  it('does not suspend a renderer shared with another WebContents', async () => {
    const test = nativeRig();
    const other = nativeRig();
    test.registry.push(other.guest);
    await expect(test.activity.setIdle(true)).rejects.toThrow('Frame renderer is shared');
    expect(test.commands).toEqual([]);
    expect(test.attached()).toBe(false);
  });

  it('leaves a guest with an active native capture awake', async () => {
    const test = nativeRig();
    test.capture();
    expect(await test.activity.setIdle(true)).toEqual({ paused: false });
    expect(test.commands).toEqual([]);
  });

  it('can pause during whole-window recording and ignores its own frames in the host tree', async () => {
    const test = nativeRig();
    const host = nativeRig(456);
    host.frames.push(...test.frames);
    test.registry.push(host.guest);
    test.recordWindow();
    expect(await test.activity.setIdle(true)).toMatchObject({ paused: true });
    await test.activity.setIdle(false);
  });

  it('wakes when another page introduces a subframe sharing its renderer', async () => {
    const test = nativeRig();
    const other = nativeRig(456);
    test.registry.push(other.guest);
    await test.activity.setIdle(true);
    other.frames.push({ osProcessId: 123, detached: false, frameTreeNodeId: nextFrameId++ });
    checkFrameProcessSharing();
    await expect(test.activity.setIdle(true)).rejects.toThrow('Frame renderer is shared');
    expect(test.activity.snapshot()).toEqual({ paused: false });
    expect(test.frozen()).toBe(false);
    expect(test.attached()).toBe(false);
  });

  it('wakes a shared renderer immediately even during a camera gesture', async () => {
    const test = nativeRig();
    const other = nativeRig(456);
    test.registry.push(other.guest);
    await test.activity.setIdle(true);
    await test.activity.setIdle(true, true);
    other.frames.push({ osProcessId: 123, detached: false, frameTreeNodeId: nextFrameId++ });
    checkFrameProcessSharing();
    await test.activity.setIdle(true, true);
    expect(test.frozen()).toBe(false);
    expect(test.activity.snapshot()).toEqual({ paused: false });
  });

  it('cleans up if sharing appears while pause confirmation is pending', async () => {
    const test = nativeRig();
    test.unconfirmed();
    const pausing = test.activity.setIdle(true);
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    test.registry.push(nativeRig().guest);
    checkFrameProcessSharing();
    test.debuggerPort.emit('message', {}, 'Debugger.paused', {});
    await expect(pausing).rejects.toThrow('Frame renderer is shared');
    expect(test.activity.snapshot()).toEqual({ paused: false });
    expect(test.attached()).toBe(false);
  });

  it('requires a paused event rather than accepting an armed pause request', async () => {
    const test = nativeRig();
    test.unconfirmed();
    await expect(test.activity.setIdle(true)).rejects.toThrow('Frame activity timed out');
    expect(test.activity.snapshot()).toEqual({ paused: false });
    expect(test.attached()).toBe(false);
  });

  for (const state of ['Debugger.enable', 'Animation:0', 'Debugger.pause', 'Debugger.disable', 'Animation:1']) {
    it(`leaves a replacement debugger alone when a pending ${state} command rejects`, async () => {
      const test = nativeRig();
      const activity = test.activity;
      const waking = state === 'Debugger.disable' || state === 'Animation:1';
      if (waking) await activity.setIdle(true);
      const reject = test.defer(state);
      const changing = activity.setIdle(!waking);
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      expect(test.commands.at(-1)).toBe(state);
      const originalCommands = [...test.commands];
      test.debuggerPort.detach();
      test.debuggerPort.attach();
      reject(new Error('connection replaced'));
      await expect(changing).rejects.toThrow(state === 'Debugger.pause' ? 'Frame debugger detached' : 'connection replaced');
      await activity.setIdle(false);
      expect(test.attached()).toBe(true);
      expect(test.commands).toEqual(originalCommands);
    });
  }
});

function rig() {
  const transitions: boolean[] = [];
  let loading = false;
  let destroyed = false;
  let snapshots = 0;
  const activity = createFrameActivity({
    isDestroyed: () => destroyed,
    isLoading: () => loading,
    thumbnail: async () => { snapshots += 1; return 'data:image/png;base64,thumb'; },
    transition: async (paused) => { transitions.push(paused); },
  });
  return { activity, transitions, snapshots: () => snapshots, loading: () => { loading = true; }, loaded: () => { loading = false; }, destroy: () => { destroyed = true; } };
}

describe('Frame activity', () => {
  it('keeps an unchanged paused Frame suspended across repeated camera gestures', async () => {
    const test = rig();
    await test.activity.setIdle(true);
    for (let gesture = 0; gesture < 3; gesture += 1) {
      await test.activity.setIdle(true, true);
      await test.activity.setIdle(true, false);
    }
    expect(test.snapshots()).toBe(1);
    expect(test.transitions).toEqual([true]);
  });

  it('holds a pause confirmed during a gesture until settle instead of immediately thawing', async () => {
    let finish: () => void = () => {};
    const transitions: boolean[] = [];
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: async () => 'thumbnail',
      transition: async (paused) => {
        transitions.push(paused);
        if (paused) await new Promise<void>((resolve) => { finish = resolve; });
      },
    });
    const pausing = activity.setIdle(true);
    await Promise.resolve();
    await Promise.resolve();
    const moving = activity.setIdle(false, true);
    finish();
    await Promise.all([pausing, moving]);
    expect(transitions).toEqual([true]);
    await activity.setIdle(false, false);
    expect(transitions).toEqual([true, false]);
  });

  it('never swaps live or paused Frames during a camera gesture', async () => {
    const test = rig();
    await test.activity.setIdle(true, true);
    expect(test.transitions).toEqual([]);
    await test.activity.setIdle(true, false);
    expect(test.transitions).toEqual([true]);
    await test.activity.setIdle(false, true);
    expect(test.transitions).toEqual([true]);
    await test.activity.setIdle(false, false);
    expect(test.transitions).toEqual([true, false]);
  });

  it('cancels a pending thumbnail pause when a gesture starts', async () => {
    let finish: (value: string) => void = () => {};
    const transitions: boolean[] = [];
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: () => new Promise<string>((resolve) => { finish = resolve; }),
      transition: async (paused) => { transitions.push(paused); },
    });
    const pausing = activity.setIdle(true);
    await Promise.resolve();
    const moving = activity.setIdle(true, true);
    finish('thumbnail');
    await Promise.all([pausing, moving]);
    expect(transitions).toEqual([]);
  });

  it('keeps a thumbnail and freezes once, then resumes the same guest', async () => {
    const test = rig();
    expect(await test.activity.setIdle(true)).toEqual({ paused: true, thumbnail: 'data:image/png;base64,thumb' });
    await test.activity.setIdle(true);
    expect(test.snapshots()).toBe(1);
    expect(await test.activity.setIdle(false)).toEqual({ paused: false });
    expect(test.transitions).toEqual([true, false]);
  });

  it('leaves pending navigation and destroyed guests alone', async () => {
    const test = rig();
    test.loading();
    expect(await test.activity.setIdle(true)).toEqual({ paused: false });
    test.destroy();
    await test.activity.setIdle(true);
    expect(test.transitions).toEqual([]);
    expect(test.snapshots()).toBe(0);
  });

  it('wakes for loading without forgetting the offscreen policy, then pauses when navigation settles', async () => {
    const test = rig();
    await test.activity.setIdle(true);
    test.loading();
    await test.activity.refresh();
    expect(test.activity.snapshot()).toEqual({ paused: false });
    test.loaded();
    await test.activity.refresh();
    expect(test.activity.snapshot()).toMatchObject({ paused: true });
    expect(test.transitions).toEqual([true, false, true]);
  });

  it('wakes before capture and cannot freeze while it is busy', async () => {
    const test = rig();
    await test.activity.setIdle(true);
    await test.activity.withAwake(async () => {
      expect(test.transitions).toEqual([true, false]);
      expect(await test.activity.setIdle(true)).toEqual({ paused: false });
      await test.activity.withAwake(async () => {
        expect(test.transitions).toEqual([true, false]);
      });
    });
    await test.activity.setIdle(true);
    expect(test.transitions).toEqual([true, false, true]);
  });

  it('releases a failed operation and permits later pause', async () => {
    const test = rig();
    await expect(test.activity.withAwake(async () => { throw new Error('capture failed'); })).rejects.toThrow('capture failed');
    expect(await test.activity.setIdle(true)).toMatchObject({ paused: true });
  });

  it('does not freeze if the Frame returns during thumbnail capture', async () => {
    let finish: (value: string) => void = () => {};
    const transitions: boolean[] = [];
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: () => new Promise<string>((resolve) => { finish = resolve; }),
      transition: async (paused) => { transitions.push(paused); },
    });
    const pausing = activity.setIdle(true);
    await Promise.resolve();
    const waking = activity.setIdle(false);
    finish('thumbnail');
    await Promise.all([pausing, waking]);
    expect(transitions).toEqual([]);
  });

  it('discards an old thumbnail when navigation starts and settles during capture', async () => {
    let finish: (value: string) => void = () => {};
    let loading = false;
    let captures = 0;
    const transitions: boolean[] = [];
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => loading,
      thumbnail: async () => {
        captures += 1;
        if (captures === 1) return new Promise<string>((resolve) => { finish = resolve; });
        return 'new document';
      },
      transition: async (paused) => { transitions.push(paused); },
    });
    const pausing = activity.setIdle(true);
    await Promise.resolve();
    loading = true;
    const navigating = activity.refresh();
    loading = false;
    const settled = activity.refresh();
    finish('old document');
    await Promise.all([pausing, navigating, settled]);
    expect(captures).toBe(2);
    expect(activity.snapshot()).toEqual({ paused: true, thumbnail: 'new document' });
    expect(transitions).toEqual([true]);
  });

  it('does not strand a guest if it returns during the freeze command', async () => {
    let finish: () => void = () => {};
    const transitions: boolean[] = [];
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: async () => 'thumbnail',
      transition: async (paused) => {
        transitions.push(paused);
        if (paused) await new Promise<void>((resolve) => { finish = resolve; });
      },
    });
    const pausing = activity.setIdle(true);
    await Promise.resolve();
    await Promise.resolve();
    const waking = activity.setIdle(false);
    finish();
    await Promise.all([pausing, waking]);
    expect(transitions).toEqual([true, false]);
  });

  it('recovers after a rejected thumbnail without wedging the queue', async () => {
    let fails = true;
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: async () => { if (fails) throw new Error('capture unavailable'); return 'thumbnail'; },
      transition: async () => {},
    });
    await expect(activity.setIdle(true)).rejects.toThrow('capture unavailable');
    fails = false;
    expect(await activity.setIdle(true)).toMatchObject({ paused: true });
  });

  it('retains an accurate thumbnail when thaw fails and retries without replacing the guest', async () => {
    let failResume = true;
    const activity = createFrameActivity({
      isDestroyed: () => false,
      isLoading: () => false,
      thumbnail: async () => 'thumbnail',
      transition: async (paused) => { if (!paused && failResume) throw new Error('debugger busy'); },
    });
    await activity.setIdle(true);
    await expect(activity.setIdle(false)).rejects.toThrow('debugger busy');
    expect(activity.snapshot()).toEqual({ paused: true, thumbnail: 'thumbnail' });
    failResume = false;
    expect(await activity.setIdle(false)).toEqual({ paused: false });
  });

  it('does not read loading state if the guest is destroyed during a transition', async () => {
    let destroyed = false;
    const activity = createFrameActivity({
      isDestroyed: () => destroyed,
      isLoading: () => { if (destroyed) throw new Error('guest destroyed'); return false; },
      thumbnail: async () => 'thumbnail',
      transition: async () => { destroyed = true; },
    });
    expect(await activity.setIdle(true)).toEqual({ paused: false });
  });
});
