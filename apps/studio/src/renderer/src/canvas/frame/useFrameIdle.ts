import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import { bindGuestReady } from './guestReady.js';
import { ignoreRefusal } from '../../refusal.js';
import { useCameraMotion } from '../cameraMotion.js';
import { beforeTabFramesDiscarded } from './tabFrames.js';
import { studio } from '../../bridge.js';

const PAINT_WAIT_MS = 20_000;

export function useFrameIdle(ref: RefObject<WebviewTag | null>, idle: boolean, instance: number | string, hasGuest: boolean, pictureKey = instance): string | null {
  const [thumbnail, renderThumbnail] = useState<{ instance: number | string; value: string | null } | null>(null);
  const retained = useRef<typeof thumbnail>(null);
  const setThumbnail = useCallback((next: typeof thumbnail) => {
    if (retained.current?.instance === next?.instance && retained.current?.value === next?.value) return;
    retained.current = next;
    renderThumbnail(next);
  }, []);
  const captureRevision = useRef(0);
  // A discard waits for every Frame in the Tab, so one Frame's picture can be staged across another's
  // navigation; applied then, it would cover the page that replaced it (ONL-2987).
  const navigation = useRef(0);
  useEffect(() => {
    const guest = ref.current;
    if (!guest) return;
    const moved = (): void => { navigation.current += 1; };
    guest.addEventListener('did-start-loading', moved);
    guest.addEventListener('did-navigate', moved);
    guest.addEventListener('did-navigate-in-page', moved);
    return () => {
      guest.removeEventListener('did-start-loading', moved);
      guest.removeEventListener('did-navigate', moved);
      guest.removeEventListener('did-navigate-in-page', moved);
    };
  }, [ref, instance, hasGuest]);
  useEffect(() => beforeTabFramesDiscarded(async signal => {
    const guest = ref.current;
    if (!guest || !studio()?.framePicture) return;
    const capturedAt = navigation.current;
    try {
      const picture = await studio().framePicture({ webContentsId: guest.getWebContentsId() });
      if (!signal.aborted && navigation.current === capturedAt && typeof picture === 'string') return () => {
        if (ref.current !== guest || navigation.current !== capturedAt) return;
        captureRevision.current += 1;
        setThumbnail({ instance: pictureKey, value: picture });
      };
    } catch (error) {
      ignoreRefusal('canvas', 'frame picture')(error);
    }
  }), [ref, pictureKey, setThumbnail]);
  useEffect(() => {
    const guest = ref.current;
    if (!guest || !studio()?.frameIdle) return;
    let active = true;
    let revision = 0;
    let waitingSince: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number): void => {
      clearTimeout(timer);
      if (active) timer = setTimeout(() => { void request(); }, delay);
    };
    const request = async (): Promise<void> => {
      const requestedRevision = ++revision;
      const requestedCapture = captureRevision.current;
      try {
        const result = await studio().frameIdle({ webContentsId: guest.getWebContentsId(), idle, moving: useCameraMotion.getState().moving });
        if (!active) return;
        if (requestedRevision !== revision || requestedCapture !== captureRevision.current || useCameraMotion.getState().moving) return;
        let soonest = result.paused !== idle ? (idle ? 5000 : 1000) : undefined;
        if (result.paused) setThumbnail({ instance: pictureKey, value: result.thumbnail ?? null });
        else {
          const hasPicture = retained.current?.instance === pictureKey && retained.current.value !== null;
          const painted = !hasPicture || studio().framePicture === undefined || await studio().framePicture({ webContentsId: guest.getWebContentsId(), afterPaint: true }) !== null;
          if (!active || requestedRevision !== revision || requestedCapture !== captureRevision.current) return;
          waitingSince ??= Date.now();
          // The slower idle retry cannot take this one's place, or a picture waiting on paint stays up for its delay.
          // A page that never answers gives the picture up, rather than holding the Frame's last one for ever.
          if (painted || Date.now() - waitingSince > PAINT_WAIT_MS) setThumbnail({ instance: pictureKey, value: null });
          else soonest = Math.min(soonest ?? 250, 250);
          if (painted) waitingSince = undefined;
        }
        if (soonest !== undefined) schedule(soonest);
      } catch (error) {
        ignoreRefusal('canvas', 'frame activity')(error);
        if (!active) return;
        if (requestedRevision !== revision) return;
        schedule(idle ? 5000 : 1000);
      }
    };
    const ready = (): void => {
      revision += 1;
      if (timer !== undefined) clearTimeout(timer);
      if (idle && !useCameraMotion.getState().moving) schedule(750);
      else void request();
    };
    const unbind = bindGuestReady(guest, ready);
    const unsubscribe = useCameraMotion.subscribe(ready);
    return () => {
      active = false;
      unbind();
      unsubscribe();
      clearTimeout(timer);
    };
  }, [ref, idle, instance, hasGuest, pictureKey, setThumbnail]);
  return thumbnail?.instance === pictureKey ? thumbnail.value : null;
}
