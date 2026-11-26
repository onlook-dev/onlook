import type { ImageMediaType, ImageRef } from './events.js';

/** Canvas assets can retain vectors; model attachments still use ImageRef's raster formats. */
export interface StoredImageRef {
  id: string;
  mediaType: ImageMediaType | 'image/svg+xml';
}

// Bytes cross IPC only on `image:register` and `image:get`; everything else carries `ImageRef` (ONL-1881).

/** Refusal happens at attach: the SDK reports no failure for a bad image after send. */
export const IMAGE_REJECT_REASONS = ['unsupported-format', 'too-large', 'unreadable'] as const;
export type ImageRejectReason = (typeof IMAGE_REJECT_REASONS)[number];

/** A whole canvas gesture's own refusals; a per-file refusal carries `ImageRejectReason` instead (ONL-2486). */
export const IMAGE_GESTURE_REFUSAL_REASONS = ['too-many-files', 'no-image'] as const;
export type ImageGestureRefusalReason = (typeof IMAGE_GESTURE_REFUSAL_REASONS)[number];

export const IMAGE_REFUSAL_REASONS = [...IMAGE_REJECT_REASONS, ...IMAGE_GESTURE_REFUSAL_REASONS] as const;
export type ImageRefusalReason = (typeof IMAGE_REFUSAL_REASONS)[number];

export interface PickImagesRequest {
  cwd: string;
  title: string;
  buttonLabel: string;
  filterLabel: string;
  target?: 'canvas';
}

export interface ImageRejection {
  name: string;
  reason: ImageRejectReason;
}

export interface PickedImage {
  image: StoredImageRef;
  name: string;
}

export type PickImagesResult =
  | { canceled: true }
  | { canceled: false; images: PickedImage[]; rejected: ImageRejection[] };

export interface RegisterImageRequest {
  cwd: string;
  bytes: Uint8Array;
  name?: string;
  target?: 'canvas';
}

export type RegisterImageResult<T extends StoredImageRef = ImageRef> =
  | { ok: true; image: T }
  | { ok: false; reason: ImageRejectReason };

export type RegisterCanvasImageResult = RegisterImageResult<StoredImageRef>;

export interface ImageBytes {
  bytes: Uint8Array;
  mediaType: StoredImageRef['mediaType'];
}

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** One gesture's ceiling, shared so main refuses before it writes and the renderer refuses before it asks (ONL-2486). */
export const IMAGE_GESTURE_MAX_FILES = 20;

export function sniffMediaType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes.length < 12) return null;
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function classifyImageBytes(
  bytes: Uint8Array,
): { ok: true; mediaType: ImageMediaType } | { ok: false; reason: ImageRejectReason } {
  // Order is pinned by images.test.ts: empty is `unreadable`, not `unsupported-format`.
  if (bytes.byteLength === 0) return { ok: false, reason: 'unreadable' };
  if (bytes.byteLength > IMAGE_MAX_BYTES) return { ok: false, reason: 'too-large' };
  const mediaType = sniffMediaType(bytes);
  if (mediaType === null) return { ok: false, reason: 'unsupported-format' };
  return { ok: true, mediaType };
}

/** Identify an SVG document, never an SVG fragment embedded in HTML. Decoding validates its XML before placement. */
export function sniffStoredImageMediaType(bytes: Uint8Array): StoredImageRef['mediaType'] | null {
  const raster = sniffMediaType(bytes);
  if (raster !== null) return raster;
  const text = new TextDecoder().decode(bytes).trimStart();
  const prolog = /(?:<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\s+svg(?:[^>"']|"[^"]*"|'[^']*')*>)\s*/y;
  let cursor = 0;
  while (true) {
    prolog.lastIndex = cursor;
    if (!prolog.test(text)) break;
    cursor = prolog.lastIndex;
  }
  return /^<(?:[A-Za-z_][\w.-]*:)?svg(?=[\s/>])/.test(text.slice(cursor)) ? 'image/svg+xml' : null;
}

export function classifyCanvasImageBytes(bytes: Uint8Array): { ok: true; mediaType: StoredImageRef['mediaType'] } | { ok: false; reason: ImageRejectReason } {
  if (bytes.byteLength === 0) return { ok: false, reason: 'unreadable' };
  if (bytes.byteLength > IMAGE_MAX_BYTES) return { ok: false, reason: 'too-large' };
  const mediaType = sniffStoredImageMediaType(bytes);
  return mediaType === null ? { ok: false, reason: 'unsupported-format' } : { ok: true, mediaType };
}
