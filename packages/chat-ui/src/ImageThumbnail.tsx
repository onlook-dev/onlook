/**
 * One transcript image, by reference (ONL-1881) — the single render path a
 * user's attachment and a tool's image result both take. The bytes arrive
 * through an injected `resolve`; null is a real state, not an error (a
 * reference can outlive its bytes), and renders an explicit unavailable tile.
 */

import { useEffect, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import type { ImageRef } from '@studio/events';

export type ResolveImage = (ref: ImageRef) => Promise<string | null>;

const TILE: React.CSSProperties = {
  maxWidth: 220,
  maxHeight: 160,
  borderRadius: 'var(--radius-container)',
  border: 'var(--border-width) solid var(--color-border)',
};

export interface ImageThumbnailProps {
  image: ImageRef;
  resolve: ResolveImage;
  /** Screen-reader description — the app's catalog owns the sentence. */
  alt: string;
  /** The bytes-are-gone tile's text (R15). */
  unavailableLabel: string;
}

export function ImageThumbnail({
  image,
  resolve,
  alt,
  unavailableLabel,
}: ImageThumbnailProps): React.JSX.Element {
  // undefined = resolving; null = the bytes are gone, a state and not an error (ONL-1881).
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void resolve(image).then((resolved) => {
      if (alive) setUrl(resolved);
    });
    return () => {
      alive = false;
    };
  }, [image, resolve]);

  if (url == null) {
    return (
      <span
        role={url === null ? 'img' : undefined}
        aria-label={url === null ? unavailableLabel : undefined}
        data-testid={url === null ? 'chat-image-unavailable' : 'chat-image-loading'}
        style={{
          ...TILE,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 120,
          height: 80,
          background: 'var(--color-background-card)',
        }}
      >
        {url === null ? (
          <Text size="sm" color="secondary">
            {unavailableLabel}
          </Text>
        ) : null}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      data-testid="chat-image-thumbnail"
      style={{ ...TILE, display: 'block', objectFit: 'contain' }}
      width={image.width}
      height={image.height}
    />
  );
}
