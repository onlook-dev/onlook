import type { ImageBytes } from '@studio/events';
import { studio } from '../bridge.js';
import { ignoreRefusal } from '../refusal.js';

export function imageBytesToObjectUrl(stored: ImageBytes): string {
  return URL.createObjectURL(
    new Blob([new Uint8Array(stored.bytes)], { type: stored.mediaType }),
  );
}

/** The stored bytes' own pixels: a thumbnail or a node sized without them reflows as the picture loads. */
export function decodeImageSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}

export interface ImageCache {
  /** The id is all that is read: a canvas image node carries no media type (ONL-2486). */
  resolve: (ref: { id: string }) => Promise<string | null>;
  /** The settled answer, or `undefined` while there is none. A remount that must not flash its empty state reads this first (ONL-2488). */
  peek: (ref: { id: string }) => string | null | undefined;
}

export function createImageCache(
  fetchBytes: (req: { id: string }) => Promise<ImageBytes | null>,
  onRefusal: (error: unknown) => void = ignoreRefusal('chat', 'imageBytes'),
): ImageCache {
  const entries = new Map<string, Promise<string | null>>();
  const settled = new Map<string, string | null>();

  return {
    resolve(ref: { id: string }): Promise<string | null> {
      const held = entries.get(ref.id);
      if (held) return held;
      const entry = fetchBytes({ id: ref.id })
        .then((stored) => (stored ? imageBytesToObjectUrl(stored) : null))
        // A failed fetch and an absent image are the same `null` to the caller.
        .catch((error: unknown) => {
          onRefusal(error);
          return null;
        })
        .then((url) => {
          settled.set(ref.id, url);
          return url;
        });
      entries.set(ref.id, entry);
      return entry;
    },
    peek(ref: { id: string }): string | null | undefined {
      return settled.get(ref.id);
    },
  };
}

let appCache: ImageCache | undefined;

function cache(): ImageCache {
  appCache ??= createImageCache((req) => studio().imageBytes(req));
  return appCache;
}

export function resolveImage(ref: { id: string }): Promise<string | null> {
  return cache().resolve(ref);
}

export function peekImage(ref: { id: string }): string | null | undefined {
  return cache().peek(ref);
}
