import type { NativeImage, Session, WebContents } from 'electron';
import type { FramePictureRequest, FramePictureResult } from '@studio/events';
import { canvasPicture } from '../images/canvas-picture.js';
import { CLIP_TILE, wholeFrameClip } from '../canvas/clip.js';

const PAINTED = 'new Promise(resolve => { if (document.readyState === "loading") { resolve(false); return; } requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))); })';
const kept = new WeakMap<WebContents, { url: string; picture: string; tile: NativeImage }>();
const capturing = new WeakSet<WebContents>();

/** An off-screen capture answers one flat colour rather than failing, and a Frame covered by one is the bug (ONL-2987). */
function hasInk(image: NativeImage): boolean {
  const bytes = image.toBitmap();
  if (bytes.length < 8) return false;
  const ground = bytes.readUInt32LE(0);
  const stride = Math.max(4, Math.floor(bytes.length / 16_384) * 4);
  for (let index = 0; index + 4 <= bytes.length; index += stride) {
    if (bytes.readUInt32LE(index) !== ground) return true;
  }
  return false;
}

function capturableUrl(guest: WebContents, owner?: WebContents): string | null {
  if (guest.isDestroyed() || guest.getType() !== 'webview' || (owner !== undefined && guest.hostWebContents !== owner)) return null;
  const url = guest.getURL();
  return /^https?:\/\//.test(url) ? url : null;
}

async function within<Value>(work: Promise<Value>, ms: number): Promise<Value | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), ms); })]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A released Frame's picture is taken here, when its page paints: a view only answers a capture while it
 * is composited, and the release comes long after its Tab left the screen (ONL-2987).
 */
export function rememberFramePicture(guest: WebContents): void {
  const url = capturableUrl(guest);
  if (url === null || guest.isLoading() || capturing.has(guest) || guest.debugger.isAttached()) return;
  capturing.add(guest);
  void (async () => {
    const ready = await within(guest.executeJavaScriptInIsolatedWorld(999, [{ code: PAINTED }]), 1500);
    if (ready !== true || guest.isDestroyed() || guest.getURL() !== url) return;
    const image = await within(guest.capturePage(undefined, { stayHidden: true, stayAwake: true }), 1500);
    if (image === null || image.isEmpty() || guest.isDestroyed() || guest.getURL() !== url || !hasInk(image)) return;
    kept.set(guest, { url, picture: canvasPicture(image).image, tile: cardTile(image) });
  })().catch(() => undefined).finally(() => capturing.delete(guest));
}

function cardTile(image: NativeImage): NativeImage {
  return image.crop(wholeFrameClip(image.getSize())).resize({ width: CLIP_TILE.width, height: CLIP_TILE.height, quality: 'best' });
}

/** A next-task card's last resort for a frame it could not capture now (ONL-2977). */
export function rememberedFramePicture(guest: WebContents): NativeImage | undefined {
  const remembered = guest.isDestroyed() ? undefined : kept.get(guest);
  return remembered?.url === guest.getURL() ? remembered.tile : undefined;
}

/** The page it was taken from is gone, so it can never be served again; held, it would sit in main until the guest dies (ONL-2987). */
export function forgetFramePicture(guest: WebContents): void {
  kept.delete(guest);
}

export function createFramePicture(lookup: (id: number) => WebContents | undefined, pausedPicture: (guest: WebContents) => string | undefined, frames: () => Session) {
  return async (sender: WebContents, request: FramePictureRequest): Promise<FramePictureResult> => {
    if (!Number.isSafeInteger(request?.webContentsId) || request.webContentsId <= 0 || (request.afterPaint !== undefined && typeof request.afterPaint !== 'boolean') || (request.retake !== undefined && typeof request.retake !== 'boolean')) return null;
    const guest = lookup(request.webContentsId);
    if (!guest) return null;
    const url = capturableUrl(guest, sender);
    if (url === null || guest.session !== frames()) return null;
    // A Frame resizes without reloading, and a picture of the old shape wakes letterboxed against the card
    // it is there to hide (ONL-2987).
    if (request.retake) {
      rememberFramePicture(guest);
      return null;
    }
    if (!request.afterPaint) {
      const paused = pausedPicture(guest);
      if (paused !== undefined) return paused;
      const remembered = kept.get(guest);
      return remembered?.url === url ? remembered.picture : null;
    }
    let active = true;
    const invalidate = (details: { isMainFrame: boolean }): void => { if (details.isMainFrame) active = false; };
    const current = (): boolean => active && !sender.isDestroyed() && !guest.isDestroyed() && guest.hostWebContents === sender && guest.getURL() === url;
    guest.on('did-start-navigation', invalidate);
    try {
      const ready = await within(guest.executeJavaScriptInIsolatedWorld(999, [{ code: PAINTED }]), 1500);
      if (ready !== true || !current()) return null;
      // One pixel: only whether the surface answers at all is read from this (ONL-2304).
      const image = await within(guest.capturePage({ x: 0, y: 0, width: 1, height: 1 }, { stayHidden: true, stayAwake: true }), 1500);
      return image !== null && !image.isEmpty() && current() ? true : null;
    } catch {
      return null;
    } finally {
      active = false;
      guest.removeListener('did-start-navigation', invalidate);
    }
  };
}
