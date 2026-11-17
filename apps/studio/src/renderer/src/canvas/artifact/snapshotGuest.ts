import type { WebviewTag } from 'electron';
import { artifactSnapshots } from './snapshots.js';
import { useCameraMotion } from '../cameraMotion.js';
import { studio } from '../../bridge.js';

export function bindArtifactSnapshot(contents: WebviewTag, snapshotKey: string, url: string, onLoaded: (key: string | null) => void): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paint = 0;
  let idle = 0;
  let generation = 0;
  let settled = false;
  let visible = false;
  let attempts = 0;
  const wanted = () => active && settled && visible && !useCameraMotion.getState().moving;
  const schedule = () => {
    clearTimeout(timer);
    if (wanted() && attempts < 3 && !artifactSnapshots.peek(snapshotKey)) timer = setTimeout(capture, 500 * Math.max(1, attempts));
  };
  const capture = () => {
    if (!wanted() || attempts >= 3 || artifactSnapshots.peek(snapshotKey)) return;
    const requestedGeneration = generation;
    cancelIdleCallback(idle);
    idle = requestIdleCallback(() => {
      void artifactSnapshots.capture(snapshotKey, () => wanted() && generation === requestedGeneration, () => {
        if (attempts >= 3) return Promise.resolve(null);
        attempts += 1;
        return studio().artifactSnapshot({ webContentsId: contents.getWebContentsId(), url });
      }).then(() => { if (active && generation === requestedGeneration) schedule(); });
    }, { timeout: 1000 });
  };
  const finished = () => {
    settled = true;
    cancelAnimationFrame(paint);
    paint = requestAnimationFrame(() => {
      paint = requestAnimationFrame(() => { if (active) onLoaded(snapshotKey); });
    });
    schedule();
  };
  const started = () => {
    generation += 1;
    settled = false;
    attempts = 0;
    onLoaded(null);
    cancelAnimationFrame(paint);
    cancelIdleCallback(idle);
    clearTimeout(timer);
  };
  contents.addEventListener('did-start-loading', started);
  contents.addEventListener('did-finish-load', finished);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting === true;
    schedule();
  });
  observer.observe(contents);
  const unsubscribe = useCameraMotion.subscribe(({ moving }) => {
    if (moving) { clearTimeout(timer); cancelIdleCallback(idle); }
    else schedule();
  });
  try { if (!contents.isLoading() && contents.getURL() === url) finished(); } catch {}
  return () => {
    active = false;
    unsubscribe();
    observer.disconnect();
    contents.removeEventListener('did-start-loading', started);
    contents.removeEventListener('did-finish-load', finished);
    cancelAnimationFrame(paint);
    cancelIdleCallback(idle);
    clearTimeout(timer);
  };
}
