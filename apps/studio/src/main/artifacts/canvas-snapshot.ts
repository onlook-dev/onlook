import type { WebContents, Session } from 'electron';
import { ARTIFACT_SCHEME, type ArtifactSnapshot, type ArtifactSnapshotRequest } from '@studio/events';
import { canvasPicture } from '../images/canvas-picture.js';

export function createArtifactSnapshotter(lookup: (id: number) => WebContents | undefined, session: () => Session) {
  let running = false;
  return async (sender: WebContents, request: ArtifactSnapshotRequest): Promise<ArtifactSnapshot | null> => {
    if (running || !Number.isInteger(request?.webContentsId) || typeof request?.url !== 'string') return null;
    const guest = lookup(request.webContentsId);
    if (!guest) return null;
    let expired = false;
    const current = () => !expired && !guest.isDestroyed() && !sender.isDestroyed() &&
      guest.getType() === 'webview' && guest.hostWebContents === sender && guest.session === session() &&
      guest.getURL() === request.url && request.url.startsWith(`${ARTIFACT_SCHEME}://`) && !guest.isLoading();
    if (!current()) return null;
    running = true;
    let navigated = false;
    const navigation = () => { navigated = true; };
    guest.on('did-start-loading', navigation);
    const capture = (async (): Promise<ArtifactSnapshot | null> => {
      try {
        const image = await guest.capturePage(undefined, { stayHidden: true });
        if (navigated || !current() || image.isEmpty()) return null;
        return canvasPicture(image);
      } catch {
        return null;
      } finally {
        guest.removeListener('did-start-loading', navigation);
        running = false;
      }
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([capture, new Promise<null>((resolve) => { timer = setTimeout(() => { expired = true; resolve(null); }, 1500); })]);
    } finally { clearTimeout(timer); }
  };
}
