import { afterEach, expect, it } from 'bun:test';
import { act, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WebviewTag } from 'electron';
import type { FrameDestinationReadiness, StudioBridge } from '@studio/events';
import { takeComplaints } from '../../testing/dom.js';
import { forgetFrameFacts } from '../frameFacts.js';
import { useCanvasStore } from '../store.js';
import type { FrameTarget } from './targetNavigation.js';
import { useFrameWebview } from './useFrameWebview.js';

const frameId = 'verified-frame';
const canonicalUrl = 'http://localhost:4000/canonical';
const target: FrameTarget = { url: 'http://localhost:4000/requested', seq: 1 };
const originalBridge = window.studio;
const originalState = useCanvasStore.getState();
let root: Root | undefined;
let container: HTMLElement | undefined;

interface ReadyReply {
  request: { nodeId: string; webContentsId: number };
  resolve: (ready: FrameDestinationReadiness) => void;
  reject: (error: Error) => void;
  answered: boolean;
}

function guest(webContentsId: number, initiallyAttached = true) {
  let attached = initiallyAttached;
  let url = 'about:blank';
  const urls: string[] = [];
  const cacheReloads: string[] = [];
  const element = Object.assign(document.createElement('div'), {
    getWebContentsId: () => {
      if (!attached) throw new Error('Guest is not attached');
      return webContentsId;
    },
    getURL: () => url,
    getTitle: () => 'Frame',
    canGoBack: () => false,
    canGoForward: () => false,
    loadURL: async (next: string) => { urls.push(next); url = next; },
    reloadIgnoringCache: () => { cacheReloads.push(url); },
  });
  return {
    element: element as unknown as WebviewTag,
    urls,
    cacheReloads,
    attach: () => { attached = true; },
    emit(type: string, destination?: string): void {
      if (destination !== undefined) url = destination;
      const event = new Event(type);
      if (type === 'did-start-navigation') Object.assign(event, { isMainFrame: true, isInPlace: false });
      element.dispatchEvent(event);
    },
  };
}

async function mountWebview(bypassCache = false, { deferWake = false, mainApi = true, initiallyAttached = true } = {}) {
  const replies: ReadyReply[] = [];
  const reached: { nodeId: string; target: FrameTarget }[] = [];
  const wakes: { webContentsId: number; idle: boolean }[] = [];
  const pendingWakes: (() => void)[] = [];
  window.studio = {
    ...(mainApi ? { canvasFrameReady: (request: ReadyReply['request']) => new Promise<FrameDestinationReadiness>((resolve, reject) => {
      replies.push({ request, resolve, reject, answered: false });
    }) } : {}),
    frameIdle: async (request: { webContentsId: number; idle: boolean }) => {
      wakes.push(request);
      if (deferWake) await new Promise<void>((resolve) => { pendingWakes.push(resolve); });
      return { paused: false };
    },
  } as StudioBridge;
  useCanvasStore.setState({
    patchFrame: () => {},
    noteTargetReached: (nodeId, settled) => { reached.push({ nodeId, target: settled }); },
  });
  const initialGuest = guest(17, initiallyAttached);
  const ref: RefObject<WebviewTag | null> = { current: initialGuest.element };
  function Surface({ nonce = 0, hasGuest = true, pendingTarget = target }: { nonce?: number; hasGuest?: boolean; pendingTarget?: FrameTarget }) {
    useFrameWebview(frameId, ref, pendingTarget, { nonce, bypassCache, hasGuest });
    return null;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const render = async (nonce = 0, hasGuest = true, pendingTarget = target): Promise<void> => {
    await act(async () => { root!.render(<Surface nonce={nonce} hasGuest={hasGuest} pendingTarget={pendingTarget} />); });
  };
  await render();
  const answer = async (ready: boolean, webContentsId = 17): Promise<void> => {
    const pending = replies.filter((reply) => !reply.answered && reply.request.webContentsId === webContentsId);
    expect(pending.length).toBeGreaterThan(0);
    await act(async () => {
      for (const reply of pending) {
        expect(reply.request).toEqual({ nodeId: frameId, webContentsId });
        reply.answered = true;
        reply.resolve(ready ? 'ready' : 'pending');
      }
    });
  };
  const wake = async (): Promise<void> => {
    expect(pendingWakes.length).toBeGreaterThan(0);
    await act(async () => { for (const resolve of pendingWakes.splice(0)) resolve(); });
  };
  return { initialGuest, ref, replies, reached, wakes, answer, render, wake };
}

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  forgetFrameFacts();
  useCanvasStore.setState(originalState, true);
  window.studio = originalBridge;
  expect(takeComplaints()).toEqual([]);
});

it('keeps a bootstrap DOM-ready target pending until main confirms the finished destination', async () => {
  const surface = await mountWebview();
  await surface.answer(false);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(false);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);

  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
  });
  expect(surface.initialGuest.urls).toEqual([]);
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
  expect(surface.wakes).toContainEqual({ webContentsId: 17, idle: false });

  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(true);
  await act(async () => { surface.initialGuest.emit('did-finish-load'); });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it('accepts main readiness before DOM-ready without replaying the target when DOM-ready follows', async () => {
  const surface = await mountWebview();
  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
  });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toHaveLength(1);
});

it('hard refresh spends its cache bypass only on a verified destination and waits for renewed readiness', async () => {
  const surface = await mountWebview(true);
  await surface.answer(false);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(false);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);

  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
  });
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  await surface.answer(true);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);

  const beforeReloadStart = surface.replies.length;
  await act(async () => {
    surface.initialGuest.emit('did-finish-load');
    surface.initialGuest.emit('dom-ready');
  });
  expect(surface.replies).toHaveLength(beforeReloadStart);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);

  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
  });
  expect(surface.replies).toHaveLength(beforeReloadStart);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(false);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);
  await act(async () => { surface.initialGuest.emit('did-finish-load'); });
  await surface.answer(true);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(true);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([target.url]);
});

it.each(['ordinary', 'cache-bypass'])('ignores a delayed readiness reply after teardown (%s)', async (mode) => {
  const bypassCache = mode === 'cache-bypass';
  const surface = await mountWebview(bypassCache);
  await act(async () => { root!.unmount(); });
  root = undefined;
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);
});

it.each(['ordinary', 'cache-bypass'])('ignores the replaced guest reply without authorizing its replacement (%s)', async (mode) => {
  const bypassCache = mode === 'cache-bypass';
  const surface = await mountWebview(bypassCache);
  const replacement = guest(23);
  surface.ref.current = replacement.element;
  await surface.render(1);
  await surface.answer(true, 17);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(replacement.urls).toEqual([]);
  expect(replacement.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);

  await act(async () => {
    replacement.emit('did-start-navigation', canonicalUrl);
    replacement.emit('did-finish-load');
  });
  await surface.answer(true, 23);
  if (bypassCache) {
    expect(replacement.cacheReloads).toEqual([canonicalUrl]);
    expect(replacement.urls).toEqual([]);
    expect(surface.reached).toEqual([]);
    await act(async () => {
      replacement.emit('did-start-navigation');
      replacement.emit('dom-ready');
    });
    await surface.answer(true, 23);
  }
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(replacement.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it.each(['ordinary', 'cache-bypass'])('fails closed when the main readiness API is absent (%s)', async (mode) => {
  const bypassCache = mode === 'cache-bypass';
  const surface = await mountWebview(bypassCache, { mainApi: false });
  await act(async () => {
    surface.initialGuest.emit('dom-ready');
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
    surface.initialGuest.emit('dom-ready');
  });
  expect(surface.replies).toEqual([]);
  expect(surface.wakes).toEqual([]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);
});

it('rechecks readiness after waking rather than navigating with the old verified destination', async () => {
  const surface = await mountWebview(false, { deferWake: true });
  await surface.answer(true);
  expect(surface.wakes).toContainEqual({ webContentsId: 17, idle: false });
  expect(surface.initialGuest.urls).toEqual([]);
  await act(async () => { surface.initialGuest.emit('did-start-navigation', canonicalUrl); });
  await surface.wake();
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);

  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([]);
  await surface.wake();
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it('keeps an in-flight target navigation through renewed readiness and retires it once its load resolves', async () => {
  const surface = await mountWebview();
  let finishLoad!: () => void;
  const loading = new Promise<void>((resolve) => { finishLoad = resolve; });
  surface.initialGuest.element.loadURL = (url: string) => {
    surface.initialGuest.urls.push(url);
    return loading;
  };

  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([]);

  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', target.url);
    surface.initialGuest.emit('dom-ready');
  });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([]);

  await act(async () => { finishLoad(); });
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it('does not restart an in-flight navigation when its address acceptance arrives', async () => {
  const surface = await mountWebview();
  let finishLoad!: () => void;
  surface.initialGuest.element.loadURL = (url: string) => {
    surface.initialGuest.urls.push(url);
    return new Promise<void>((resolve) => { finishLoad = resolve; });
  };
  await surface.answer(true);
  await act(async () => {
    useCanvasStore.setState({ overlay: { [frameId]: {
      mountUrl: canonicalUrl, currentUrl: canonicalUrl, health: 'live', title: '', canGoBack: false, canGoForward: false,
      target, acceptedTarget: target,
    } } });
  });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([]);
  await act(async () => { finishLoad(); });
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it('revalidates a superseding target before the previous navigation finishes', async () => {
  const surface = await mountWebview();
  let finishFirst!: () => void;
  surface.initialGuest.element.loadURL = (url: string) => {
    surface.initialGuest.urls.push(url);
    return new Promise<void>((resolve) => { finishFirst = resolve; });
  };
  await surface.answer(true);
  await act(async () => { surface.initialGuest.emit('did-start-navigation', target.url); });
  const replacement = { url: 'http://localhost:4000/replacement', seq: 2 };
  await surface.render(0, true, replacement);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([]);
  const firstFinished = finishFirst;
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url, replacement.url]);
  expect(surface.reached).toEqual([]);
  await act(async () => { firstFinished(); });
  expect(surface.reached).toEqual([]);
  await act(async () => { finishFirst(); });
  expect(surface.reached).toEqual([{ nodeId: frameId, target: replacement }]);
});

it.each(['ordinary', 'cache-bypass'])('waits for attachment and main readiness before using a guest (%s)', async (mode) => {
  const bypassCache = mode === 'cache-bypass';
  const surface = await mountWebview(bypassCache, { initiallyAttached: false });
  expect(surface.replies).toEqual([]);
  expect(surface.wakes).toEqual([]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);
  await act(async () => {
    surface.initialGuest.attach();
    surface.initialGuest.emit('dom-ready');
  });
  await surface.answer(false);
  expect(surface.wakes).toEqual([]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  await act(async () => {
    surface.initialGuest.emit('did-start-navigation', canonicalUrl);
    surface.initialGuest.emit('did-finish-load');
  });
  await surface.answer(true);
  if (bypassCache) {
    expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
    expect(surface.initialGuest.urls).toEqual([]);
    expect(surface.reached).toEqual([]);
    await act(async () => {
      surface.initialGuest.emit('did-start-navigation', canonicalUrl);
      surface.initialGuest.emit('dom-ready');
    });
    await surface.answer(true);
  }
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it.each(['starting', 'loading'])('keeps a superseding target behind the hard-refresh %s gate', async (phase) => {
  const surface = await mountWebview(true);
  await act(async () => { surface.initialGuest.emit('did-finish-load', canonicalUrl); });
  await surface.answer(true);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  if (phase === 'loading') {
    await act(async () => { surface.initialGuest.emit('did-start-navigation', canonicalUrl); });
  }
  const requestCount = surface.replies.length;
  const replacement = { url: 'http://localhost:4000/replacement', seq: 2 };
  await surface.render(0, true, replacement);
  expect(surface.replies).toHaveLength(requestCount);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);
  if (phase === 'starting') {
    await act(async () => { surface.initialGuest.emit('did-start-navigation', canonicalUrl); });
  }
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  expect(surface.initialGuest.urls).toEqual([]);
  await surface.answer(true);
  expect(surface.initialGuest.cacheReloads).toEqual([canonicalUrl]);
  expect(surface.initialGuest.urls).toEqual([replacement.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target: replacement }]);
});

it('retries refused readiness without navigating an unverified target', async () => {
  const surface = await mountWebview();
  await act(async () => {
    for (const reply of surface.replies) {
      reply.answered = true;
      reply.reject(new Error('Readiness refused'));
    }
  });
  expect(surface.wakes).toEqual([]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  await surface.answer(true);
  expect(surface.initialGuest.urls).toEqual([target.url]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it('restarts verified cache bypass on a replacement after the old reload throws', async () => {
  const surface = await mountWebview(true);
  surface.initialGuest.element.reloadIgnoringCache = () => { throw new Error('Guest refused reload'); };
  await act(async () => { surface.initialGuest.emit('did-finish-load', canonicalUrl); });
  await surface.answer(true);
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([]);
  const replacement = guest(23);
  surface.ref.current = replacement.element;
  await surface.render(1);
  await act(async () => {
    replacement.emit('did-start-navigation', canonicalUrl);
    replacement.emit('did-finish-load');
  });
  await surface.answer(true, 23);
  expect(replacement.cacheReloads).toEqual([canonicalUrl]);
  expect(replacement.urls).toEqual([]);
  await act(async () => {
    replacement.emit('did-start-navigation', canonicalUrl);
    replacement.emit('dom-ready');
  });
  await surface.answer(true, 23);
  expect(replacement.urls).toEqual([target.url]);
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.reached).toEqual([{ nodeId: frameId, target }]);
});

it.each(['ordinary', 'cache-bypass'])('ignores an older true reply after a newer false reply (%s)', async (mode) => {
  const bypassCache = mode === 'cache-bypass';
  const surface = await mountWebview(bypassCache);
  const stale = surface.replies[0]!;
  await act(async () => { surface.initialGuest.emit('dom-ready'); });
  const latest = surface.replies.at(-1)!;
  expect(latest).not.toBe(stale);
  await act(async () => {
    latest.answered = true;
    latest.resolve('pending');
  });
  await act(async () => {
    stale.answered = true;
    stale.resolve('ready');
  });
  expect(surface.initialGuest.urls).toEqual([]);
  expect(surface.initialGuest.cacheReloads).toEqual([]);
  expect(surface.reached).toEqual([]);
});
