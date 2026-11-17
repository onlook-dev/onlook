import { useEffect, useRef, useState, type RefObject } from 'react';
import type {
  ConsoleMessageEvent,
  DidFailLoadEvent,
  PageTitleUpdatedEvent,
  WebviewTag,
} from 'electron';
import { isFrameMountUrl } from '@studio/events';
import type { FrameNodeData } from '../model.js';
import { noteFrameConsole, noteGuestAttached, noteGuestGone } from '../frameFacts.js';
import { useCanvasStore } from '../store.js';
import { isElectronsOwnNoise } from './consoleNoise.js';
import { navigateFrameTarget, type FrameTarget } from './targetNavigation.js';
import { bindGuestReady } from './guestReady.js';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';

// `did-fail-load` also fires for an aborted navigation, which is not a failure.
const ERR_ABORTED = -3;

// Conservative at the top end: the error count is what `list_frames` reports.
function wireConsoleLevel(level: number): 'error' | 'warning' | 'log' {
  if (level >= 3) return 'error';
  if (level === 2) return 'warning';
  return 'log';
}

// Health is derived, never asserted — a dev server that is up answers and one
// that is down refuses the connection. No polling, no probe.
export function useFrameWebview(
  frameId: string,
  ref: RefObject<WebviewTag | null>,
  /** See `FrameNodeData.target` (ONL-1884). */
  target?: FrameNodeData['target'],
  /** In every dependency array here: a refresh and a lifting cover replace the `<webview>` element, and a listener left on the old one looks like it worked. */
  mount: { nonce: number | string; bypassCache: boolean; hasGuest?: boolean } = { nonce: 0, bypassCache: false },
): void {
  const patchFrame = useCanvasStore((state) => state.patchFrame);
  const noteTargetReached = useCanvasStore((state) => state.noteTargetReached);
  const acceptedTarget = useCanvasStore((state) => state.overlay[frameId]?.acceptedTarget);
  const mountNonce = mount.nonce;
  const bypassCache = mount.bypassCache;
  const completedTarget = useRef<FrameTarget | null>(null);
  const targetFlight = useRef<{ element: WebviewTag; target: FrameTarget } | null>(null);
  const hasGuest = mount.hasGuest ?? true;
  const destinationReady = useRef<WebviewTag | null>(null);
  const verifyDestination = useRef<(() => void) | null>(null);
  const [destinationVersion, setDestinationVersion] = useState(0);

  // Electron reuses `webContents` ids, so an id naming a destroyed guest reaches an unrelated page.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    patchFrame(frameId, { health: 'loading' });

    const onReady = (): void => {
      try {
        noteGuestAttached(frameId, element.getWebContentsId());
      } catch {
        // Not attached after all; main reports the frame unaddressable.
      }
    };
    const onGone = (): void => {
      noteGuestGone(frameId);
    };

    const stopReady = bindGuestReady(element, onReady);
    element.addEventListener('render-process-gone', onGone);
    element.addEventListener('destroyed', onGone);
    return () => {
      stopReady();
      element.removeEventListener('render-process-gone', onGone);
      element.removeEventListener('destroyed', onGone);
      // The element is going or being replaced; either way the id stops being
      // true now rather than at the next push.
      noteGuestGone(frameId);
    };
  }, [frameId, ref, mountNonce, hasGuest, patchFrame]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    let epoch = 0;
    let cacheReload: 'needed' | 'starting' | 'loading' | 'done' = bypassCache ? 'needed' : 'done';
    const invalidate = (): void => {
      epoch += 1;
      if (destinationReady.current === element) destinationReady.current = null;
    };
    const verify = (): void => {
      if (cacheReload === 'starting' || cacheReload === 'loading' || typeof studio().canvasFrameReady !== 'function') return;
      const requestEpoch = ++epoch;
      let webContentsId: number;
      try { webContentsId = element.getWebContentsId(); } catch { return; }
      void studio().canvasFrameReady({ nodeId: frameId, webContentsId }).then(ready => {
        if (!active || epoch !== requestEpoch || ref.current !== element) return;
        if (ready !== 'ready') {
          invalidate();
          if (ready === 'retired') {
            const state = useCanvasStore.getState();
            const accepted = state.overlay[frameId]?.acceptedTarget;
            if (accepted) state.rehomeDeadFrame(frameId, accepted.url, accepted);
          }
          return;
        }
        if (cacheReload === 'needed') {
          cacheReload = 'starting';
          invalidate();
          try { element.reloadIgnoringCache(); } catch (error) { ignoreRefusal('canvas', 'refresh frame without cache')(error); }
          return;
        }
        destinationReady.current = element;
        if (targetFlight.current?.element !== element) setDestinationVersion(value => value + 1);
      }, ignoreRefusal('canvas', 'verify frame destination'));
    };
    const onNavigation = (event: Event): void => {
      const navigation = event as Event & { isMainFrame: boolean; isInPlace: boolean };
      if (navigation.isMainFrame && !navigation.isInPlace) {
        if (cacheReload === 'starting') cacheReload = 'loading';
        invalidate();
      }
    };
    const onDomReady = (): void => {
      if (cacheReload === 'loading') cacheReload = 'done';
      verify();
    };
    element.addEventListener('dom-ready', onDomReady);
    element.addEventListener('did-finish-load', verify);
    element.addEventListener('did-start-navigation', onNavigation);
    element.addEventListener('render-process-gone', invalidate);
    element.addEventListener('destroyed', invalidate);
    verifyDestination.current = verify;
    verify();
    return () => {
      active = false;
      if (verifyDestination.current === verify) verifyDestination.current = null;
      invalidate();
      element.removeEventListener('dom-ready', onDomReady);
      element.removeEventListener('did-finish-load', verify);
      element.removeEventListener('did-start-navigation', onNavigation);
      element.removeEventListener('render-process-gone', invalidate);
      element.removeEventListener('destroyed', invalidate);
    };
  }, [frameId, ref, mountNonce, hasGuest, bypassCache]);

  useEffect(() => {
    if (acceptedTarget) verifyDestination.current?.();
  }, [acceptedTarget, mountNonce, hasGuest]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !target || completedTarget.current === target) return;
    if (destinationReady.current !== element) {
      verifyDestination.current?.();
      return;
    }
    let active = true;
    let stop: (() => void) | undefined;
    let flight: { element: WebviewTag; target: FrameTarget } | undefined;
    const navigate = (): void => {
      if (active && destinationReady.current === element) {
        flight = { element, target };
        targetFlight.current = flight;
        stop = navigateFrameTarget(element, target, completedTarget, true, (reached) => {
          if (targetFlight.current === flight) targetFlight.current = null;
          noteTargetReached(frameId, reached);
        });
        if (!stop && targetFlight.current === flight) targetFlight.current = null;
      }
    };
    try {
      void studio().frameIdle({ webContentsId: element.getWebContentsId(), idle: false }).then(navigate, (error: unknown) => {
        ignoreRefusal('canvas', 'wake frame for navigation')(error);
        navigate();
      });
    } catch {
      navigate();
    }
    return () => {
      active = false;
      stop?.();
      if (targetFlight.current === flight) targetFlight.current = null;
    };
  }, [frameId, ref, target, mountNonce, hasGuest, noteTargetReached, destinationVersion]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Not React state: `did-stop-loading` reads it in the same tick a setState would not have landed in.
    let mainFrameFailed = false;

    // The navigation getters throw until the guest is dom-ready.
    function syncNavigation(): void {
      if (!element) return;
      try {
        // A revived guest sits on its mount URL until main hands it the page; reported, it would
        // swap the Frame's address and name for plumbing in the middle of a wake (ONL-2987).
        if (isFrameMountUrl(element.getURL())) return;
        patchFrame(frameId, {
          currentUrl: element.getURL(),
          title: element.getTitle(),
          canGoBack: element.canGoBack(),
          canGoForward: element.canGoForward(),
        });
      } catch {
        // Not attached yet.
      }
    }

    const onStartLoading = (): void => {
      mainFrameFailed = false;
      patchFrame(frameId, { health: 'loading' });
    };

    const onFailLoad = (event: DidFailLoadEvent): void => {
      if (event.errorCode === ERR_ABORTED) return;
      if (!event.isMainFrame) return;
      mainFrameFailed = true;
      patchFrame(frameId, {
        health: 'unreachable',
        loadFailure: { url: event.validatedURL, code: event.errorCode, description: event.errorDescription },
      });
    };

    const onStopLoading = (): void => {
      try { if (isFrameMountUrl(element.getURL())) return; } catch { return; }
      patchFrame(frameId, { health: mainFrameFailed ? 'unreachable' : 'live' });
      syncNavigation();
    };

    const onNavigate = (): void => {
      syncNavigation();
    };

    const onTitle = (event: PageTitleUpdatedEvent): void => {
      patchFrame(frameId, { title: event.title });
    };

    // A crashed renderer emits no load events on the way down.
    const onGone = (): void => {
      patchFrame(frameId, { health: 'unreachable' });
    };

    const onConsole = (event: ConsoleMessageEvent): void => {
      if (isElectronsOwnNoise(event.sourceId)) return;
      noteFrameConsole(frameId, {
        level: wireConsoleLevel(event.level),
        text: event.message,
      });
    };

    element.addEventListener('console-message', onConsole);
    element.addEventListener('did-start-loading', onStartLoading);
    element.addEventListener('did-fail-load', onFailLoad);
    element.addEventListener('did-stop-loading', onStopLoading);
    element.addEventListener('did-navigate', onNavigate);
    element.addEventListener('did-navigate-in-page', onNavigate);
    element.addEventListener('dom-ready', onNavigate);
    element.addEventListener('page-title-updated', onTitle);
    element.addEventListener('render-process-gone', onGone);

    return () => {
      element.removeEventListener('console-message', onConsole);
      element.removeEventListener('did-start-loading', onStartLoading);
      element.removeEventListener('did-fail-load', onFailLoad);
      element.removeEventListener('did-stop-loading', onStopLoading);
      element.removeEventListener('did-navigate', onNavigate);
      element.removeEventListener('did-navigate-in-page', onNavigate);
      element.removeEventListener('dom-ready', onNavigate);
      element.removeEventListener('page-title-updated', onTitle);
      element.removeEventListener('render-process-gone', onGone);
    };
  }, [frameId, ref, patchFrame, mountNonce]);

}
