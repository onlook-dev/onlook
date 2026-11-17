import type { ImageBytes, ImageRef } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { rasterBytes } from '../canvas/image/rasterBytes.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { imageBytesToObjectUrl } from './imageCache.js';
import { studio } from '../bridge.js';

/** A canvas image node stores only the blob id; its media type lives with the bytes (ONL-2486). */
export function createCanvasImageRefs(
  fetchBytes: (req: { id: string }) => Promise<ImageBytes | null>,
  /** A refused read drops a picture from a prompt the user already sent, so it is never silent. */
  onRefused: (error: unknown) => void = ignoreRefusal('chat', 'canvas image bytes'),
  rasterizeSvg?: (image: ImageBytes) => Promise<ImageRef | null>,
): (imageId: string) => Promise<ImageRef | null> {
  const resolved = new Map<string, ImageRef>();
  return async (imageId) => {
    const held = resolved.get(imageId);
    if (held?.id === imageId) return held;
    let stored: ImageBytes | null;
    try {
      // The vector is rooted by the canvas; its model copy may have been
      // collected after an unsent attachment/session closed.
      if (held !== undefined && await fetchBytes({ id: held.id }) !== null) return held;
      stored = await fetchBytes({ id: imageId });
    } catch (error) {
      onRefused(error);
      return null;
    }
    if (stored === null) return null;
    let ref: ImageRef | null;
    if (stored.mediaType === 'image/svg+xml') {
      try {
        ref = rasterizeSvg === undefined ? null : await rasterizeSvg(stored);
      } catch (error) {
        onRefused(error);
        return null;
      }
    } else ref = { id: imageId, mediaType: stored.mediaType };
    if (ref === null) return null;
    resolved.set(imageId, ref);
    return ref;
  };
}

let appRefs: ((imageId: string) => Promise<ImageRef | null>) | undefined;

export function resolveCanvasImageRef(imageId: string): Promise<ImageRef | null> {
  appRefs ??= createCanvasImageRefs((req) => studio().imageBytes(req), undefined, async (image) => {
    const cwd = useWorkspaceStore.getState().workspace?.workspacePath;
    if (cwd === undefined) return null;
    const isCurrent = (): boolean => useWorkspaceStore.getState().workspace?.workspacePath === cwd;
    const url = imageBytesToObjectUrl(image);
    try {
      const bytes = await rasterBytes(url);
      if (!isCurrent()) return null;
      const result = await studio().registerImage({ cwd, bytes });
      if (!isCurrent() || !result.ok || result.image.mediaType === 'image/svg+xml') return null;
      return { ...result.image, mediaType: result.image.mediaType };
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  return appRefs(imageId);
}
