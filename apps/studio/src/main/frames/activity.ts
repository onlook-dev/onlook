import type { WebContents } from 'electron';
import electron from 'electron';
import type { FrameIdleResult } from '@studio/events';
import { canvasPicture } from '../images/canvas-picture.js';
import { watchRendererSharing } from './sharing.js';

export interface ActivityGuest {
  isDestroyed(): boolean;
  isLoading(): boolean;
  thumbnail(): Promise<string | undefined>;
  transition(paused: boolean): Promise<void>;
}

export function createFrameActivity(guest: ActivityGuest) {
  let idle = false;
  let moving = false;
  let paused = false;
  let holds = 0;
  let generation = 0;
  let motionRevision = 0;
  let pausedGeneration = 0;
  let thumbnail: string | undefined;
  let pending = Promise.resolve();

  const wantsPause = (): boolean => idle && holds === 0 && !guest.isLoading();
  const cameraHolds = (): boolean => moving && holds === 0 && !guest.isLoading() &&
    (!paused || pausedGeneration === generation);
  const snapshot = (): FrameIdleResult => paused && thumbnail ? { paused, thumbnail } : { paused: false };
  const reconcile = async (): Promise<void> => {
    if (guest.isDestroyed()) return;
    if (cameraHolds()) return;
    if (paused && (!wantsPause() || pausedGeneration !== generation)) {
      await guest.transition(false);
      paused = false;
      thumbnail = undefined;
    }
    if (guest.isDestroyed()) return;
    if (moving || !wantsPause() || paused) return;
    const captureGeneration = generation;
    const captureMotionRevision = motionRevision;
    const image = await guest.thumbnail();
    if (!image || guest.isDestroyed() || moving || !wantsPause() || captureGeneration !== generation ||
      captureMotionRevision !== motionRevision) return;
    await guest.transition(true);
    if (guest.isDestroyed()) return;
    paused = true;
    pausedGeneration = captureGeneration;
    thumbnail = image;
    if (!cameraHolds() && (!wantsPause() || captureGeneration !== generation)) {
      await guest.transition(false);
      paused = false;
      thumbnail = undefined;
    }
  };
  const schedule = (): Promise<void> => {
    const next = pending.then(reconcile);
    pending = next.catch(() => {});
    return next;
  };

  return {
    snapshot,
    refresh: (): Promise<void> => {
      generation += 1;
      return schedule();
    },
    async setIdle(value: boolean, cameraMoving = false): Promise<FrameIdleResult> {
      idle = value;
      if (cameraMoving && !moving) motionRevision += 1;
      moving = cameraMoving;
      await schedule();
      return snapshot();
    },
    async withAwake<T>(run: () => Promise<T>): Promise<T> {
      holds += 1;
      generation += 1;
      try {
        await schedule();
        return await run();
      } finally {
        holds -= 1;
        void schedule().catch(() => {});
      }
    },
  };
}

const activities = new WeakMap<WebContents, ReturnType<typeof createFrameActivity>>();
const monitoredActivities = new Set<{ activity: ReturnType<typeof createFrameActivity>; isolated: () => boolean }>();

export function checkFrameProcessSharing(): void {
  for (const entry of monitoredActivities) {
    if (entry.activity.snapshot().paused && !entry.isolated()) void entry.activity.refresh().catch(() => {});
  }
}

async function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(new Error('Frame activity timed out')); }, ms);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

export function activityFor(guest: WebContents, allGuests: () => WebContents[] = () => electron.webContents.getAllWebContents()): ReturnType<typeof createFrameActivity> {
  const existing = activities.get(guest);
  if (existing) return existing;
  let ownsDebugger = false;
  let stopWatching = (): void => {};
  const isCapturing = (): boolean => {
    const host = guest.hostWebContents;
    return guest.isBeingCaptured() && !(host && !host.isDestroyed() && host.isBeingCaptured());
  };
  const isolated = (): boolean => {
    if (guest.isDestroyed() || isCapturing()) return false;
    try {
      const pid = guest.getOSProcessId();
      if (pid <= 0) return false;
      const ownFrames = new Set(guest.mainFrame.framesInSubtree.map((frame) => frame.frameTreeNodeId));
      return allGuests().every((contents) => contents === guest || contents.isDestroyed() ||
        contents.mainFrame.framesInSubtree.every((frame) => frame.detached || ownFrames.has(frame.frameTreeNodeId) || frame.osProcessId !== pid));
    } catch {
      return false;
    }
  };
  const detach = (): void => {
    stopWatching();
    if (!ownsDebugger) return;
    ownsDebugger = false;
    if (!guest.isDestroyed() && guest.debugger.isAttached()) guest.debugger.detach();
  };
  const activity = createFrameActivity({
    isDestroyed: () => guest.isDestroyed(),
    isLoading: () => guest.isLoading(),
    thumbnail: async () => {
      if (guest.debugger.isAttached() || isCapturing()) return undefined;
      const image = await within(guest.capturePage(), 1500);
      if (image.isEmpty()) return undefined;
      return canvasPicture(image).image;
    },
    transition: async (frozen) => {
      if (!frozen) {
        if (!ownsDebugger) return;
        if (guest.isDestroyed() || !guest.debugger.isAttached()) {
          ownsDebugger = false;
          return;
        }
        try {
          await within(guest.debugger.sendCommand('Debugger.disable'), 1500);
          if (ownsDebugger && !guest.isDestroyed()) await within(guest.debugger.sendCommand('Animation.setPlaybackRate', { playbackRate: 1 }), 1500);
        } finally {
          detach();
        }
        return;
      }
      if (guest.debugger.isAttached()) throw new Error('Frame debugger is busy');
      if (!isolated()) throw new Error('Frame renderer is shared or capturing');
      guest.debugger.attach('1.3');
      ownsDebugger = true;
      try {
        await within(guest.debugger.sendCommand('Debugger.enable'), 1500);
        if (!ownsDebugger || guest.isDestroyed()) throw new Error('Frame debugger detached');
        await within(guest.debugger.sendCommand('Animation.setPlaybackRate', { playbackRate: 0 }), 1500);
        if (!ownsDebugger || guest.isDestroyed()) throw new Error('Frame debugger detached');
        if (!isolated()) throw new Error('Frame renderer is shared or capturing');
        let confirm: () => void = () => {};
        let reject: (error: Error) => void = () => {};
        const paused = new Promise<void>((resolve, fail) => { confirm = resolve; reject = fail; });
        const message = (_event: Electron.Event, method: string): void => { if (method === 'Debugger.paused') confirm(); };
        const detached = (): void => { reject(new Error('Frame debugger detached')); };
        guest.debugger.on('message', message);
        guest.debugger.on('detach', detached);
        try {
          await within(Promise.all([
            guest.debugger.sendCommand('Debugger.pause').then(() => {
              if (ownsDebugger && !guest.isDestroyed()) void guest.debugger.sendCommand('Runtime.evaluate', { expression: 'void 0' }).catch(() => {});
            }),
            paused,
          ]), 1500);
        } finally {
          guest.debugger.removeListener('message', message);
          guest.debugger.removeListener('detach', detached);
        }
        if (!ownsDebugger || guest.isDestroyed() || !isolated()) throw new Error('Frame renderer is shared or unavailable');
        let waking = false;
        stopWatching = watchRendererSharing(() => {
          if (waking || isolated()) return;
          waking = true;
          void activity.refresh().catch(() => {}).finally(() => { waking = false; });
        });
      } catch (error) {
        if (!guest.isDestroyed() && ownsDebugger && guest.debugger.isAttached()) {
          await within(guest.debugger.sendCommand('Debugger.disable'), 1500).catch(() => {});
          if (ownsDebugger && !guest.isDestroyed()) await within(guest.debugger.sendCommand('Animation.setPlaybackRate', { playbackRate: 1 }), 1500).catch(() => {});
        }
        detach();
        throw error;
      }
    },
  });
  activities.set(guest, activity);
  const monitored = { activity, isolated };
  monitoredActivities.add(monitored);
  guest.debugger.on('detach', () => {
    if (!ownsDebugger) return;
    stopWatching();
    ownsDebugger = false;
    void activity.refresh().catch(() => {});
  });
  guest.on('did-start-loading', () => { void activity.refresh().catch(() => {}); });
  guest.on('did-stop-loading', () => { void activity.refresh().catch(() => {}); });
  guest.on('destroyed', () => {
    stopWatching();
    monitoredActivities.delete(monitored);
    void activity.refresh().catch(() => {});
  });
  return activity;
}

export function withFrameAwake<T>(guest: WebContents, run: () => Promise<T>): Promise<T> {
  return activities.get(guest)?.withAwake(run) ?? run();
}
