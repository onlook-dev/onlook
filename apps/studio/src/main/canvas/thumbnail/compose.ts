// Default import: outside Electron the package is CJS exporting a binary path, and a value import of `nativeImage` fails Bun's ESM link.
import electron, { type NativeImage } from 'electron';
import type { ThumbnailRect } from './bounds.js';
import { log } from '../../log/index.js';

const logger = log('canvas');

export const THUMBNAIL_MAX_BYTES = 1_048_576;

export interface ThumbBitmap {
  readonly width: number;
  readonly height: number;
  readonly bgra: Uint8Array;
}

/** Premultiplied, as the platform's own rows are: no channel exceeds `alpha`. */
export interface ThumbFill {
  readonly blue: number;
  readonly green: number;
  readonly red: number;
  readonly alpha: number;
}

export const THUMBNAIL_TEXT_FILL: ThumbFill = { blue: 148, green: 148, red: 148, alpha: 255 };

export const THUMBNAIL_SECTION_FILL: ThumbFill = { blue: 51, green: 51, red: 51, alpha: 255 };
export const THUMBNAIL_SECTION_BORDER: ThumbFill = { blue: 73, green: 73, red: 73, alpha: 255 };

interface ThumbOutline {
  readonly radius: number;
  readonly width: number;
  readonly colour: ThumbFill;
}

/** The source stays opaque here so the capture's own image reaches the blit without an encode and a decode in between (ONL-2471). */
export type ThumbFrame<S> = { readonly rect: ThumbnailRect } & (
  | { readonly source: S; readonly fill?: never }
  | { readonly source?: never; readonly fill: ThumbFill; readonly outline?: ThumbOutline }
);

export interface ThumbImageOps<S> {
  /** Resizes `source` to `width`×`height` and lends its rows to `read`, which is the bitmap's whole lifetime; false when it carries no pixels. */
  withBitmap(
    source: S,
    width: number,
    height: number,
    read: (bitmap: ThumbBitmap) => void,
  ): boolean;
  /** `null` for bytes that carry no image; the composite goes on without that node (ONL-2486). */
  decode(bytes: Uint8Array): S | null;
  toPng(bitmap: ThumbBitmap): Buffer;
}

export type ComposeThumbnailResult =
  | { ok: true; png: Buffer }
  | { ok: false; reason: 'no-frames' | 'frame-failed' | 'too-large' };

export function electronImageOps(): ThumbImageOps<NativeImage> {
  return {
    withBitmap(source, width, height, read) {
      if (source.isEmpty()) return false;
      const resized = source.resize({ width, height, quality: 'good' });
      const size = resized.getSize();
      // Electron 43's typings declare `getBitmap` void; it answers the BGRA rows.
      const bgra = resized.getBitmap() as unknown as Buffer;
      // A scale factor other than 1 makes the buffer disagree with the reported size; `blit` would short-write in silence.
      if (bgra.byteLength < size.width * size.height * 4) return false;
      read({ width: size.width, height: size.height, bgra });
      return true;
    },
    decode(bytes) {
      const image = electron.nativeImage.createFromBuffer(
        Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      );
      return image.isEmpty() ? null : image;
    },
    toPng(bitmap) {
      const bytes = Buffer.from(bitmap.bgra.buffer, bitmap.bgra.byteOffset, bitmap.bgra.byteLength);
      return electron.nativeImage
        .createFromBitmap(bytes, { width: bitmap.width, height: bitmap.height })
        .toPNG();
    },
  };
}

interface ThumbClip {
  readonly srcX: number;
  readonly srcY: number;
  readonly destX: number;
  readonly destY: number;
  readonly cols: number;
  readonly rows: number;
}

function clip(
  dest: ThumbBitmap,
  rect: ThumbnailRect,
  srcWidth: number,
  srcHeight: number,
): ThumbClip | null {
  const left = Math.round(rect.x);
  const top = Math.round(rect.y);
  const srcX = left < 0 ? -left : 0;
  const srcY = top < 0 ? -top : 0;
  const destX = left < 0 ? 0 : left;
  const destY = top < 0 ? 0 : top;
  const cols = Math.min(srcWidth - srcX, Math.round(rect.width) - srcX, dest.width - destX);
  const rows = Math.min(srcHeight - srcY, Math.round(rect.height) - srcY, dest.height - destY);
  if (cols <= 0 || rows <= 0) return null;
  return { srcX, srcY, destX, destY, cols, rows };
}

/** The clamp: a channel above its own alpha is not premultiplied, and a byte store wraps it into garbage. */
const blend = (src: number, dest: number, keep: number): number =>
  Math.min(255, src + Math.round((dest * keep) / 255));

/** Premultiplied source-over: a label in front of a frame has to leave the frame showing around it (ONL-2486). */
function over(
  bgra: Uint8Array,
  at: number,
  blue: number,
  green: number,
  red: number,
  alpha: number,
): void {
  if (alpha === 0) return;
  if (alpha === 255) {
    bgra[at] = blue;
    bgra[at + 1] = green;
    bgra[at + 2] = red;
    bgra[at + 3] = 255;
    return;
  }
  const keep = 255 - alpha;
  bgra[at] = blend(blue, bgra[at] ?? 0, keep);
  bgra[at + 1] = blend(green, bgra[at + 1] ?? 0, keep);
  bgra[at + 2] = blend(red, bgra[at + 2] ?? 0, keep);
  bgra[at + 3] = blend(alpha, bgra[at + 3] ?? 0, keep);
}

function blit(dest: ThumbBitmap, src: ThumbBitmap, rect: ThumbnailRect): void {
  const box = clip(dest, rect, src.width, src.height);
  if (box === null) return;

  for (let row = 0; row < box.rows; row += 1) {
    let from = ((box.srcY + row) * src.width + box.srcX) * 4;
    let at = ((box.destY + row) * dest.width + box.destX) * 4;
    for (let col = 0; col < box.cols; col += 1) {
      over(dest.bgra, at, src.bgra[from] ?? 0, src.bgra[from + 1] ?? 0, src.bgra[from + 2] ?? 0, src.bgra[from + 3] ?? 0);
      from += 4;
      at += 4;
    }
  }
}

function roundedCoverage(x: number, y: number, width: number, height: number, radius: number): number {
  if (width <= 0 || height <= 0) return 0;
  const corner = Math.min(radius, width / 2, height / 2);
  const dx = Math.abs(x - width / 2) - (width / 2 - corner);
  const dy = Math.abs(y - height / 2) - (height / 2 - corner);
  const distance = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - corner;
  return Math.max(0, Math.min(1, 0.5 - distance));
}

function fill(dest: ThumbBitmap, colour: ThumbFill, rect: ThumbnailRect, outline?: ThumbOutline): void {
  const box = clip(dest, rect, Math.round(rect.width), Math.round(rect.height));
  if (box === null) return;

  for (let row = 0; row < box.rows; row += 1) {
    let at = ((box.destY + row) * dest.width + box.destX) * 4;
    for (let col = 0; col < box.cols; col += 1) {
      if (outline === undefined) {
        over(dest.bgra, at, colour.blue, colour.green, colour.red, colour.alpha);
      } else {
        const x = box.srcX + col + 0.5;
        const y = box.srcY + row + 0.5;
        const outer = roundedCoverage(x, y, rect.width, rect.height, outline.radius);
        const inner = roundedCoverage(x - outline.width, y - outline.width,
          rect.width - 2 * outline.width, rect.height - 2 * outline.width,
          Math.max(0, outline.radius - outline.width));
        const border = Math.max(0, outer - inner);
        const channel = (inside: number, edge: number): number => Math.round(inside * inner + edge * border);
        over(dest.bgra, at, channel(colour.blue, outline.colour.blue), channel(colour.green, outline.colour.green),
          channel(colour.red, outline.colour.red), channel(colour.alpha, outline.colour.alpha));
      }
      at += 4;
    }
  }
}

/** The zeroed buffer is the transparent ground; the card supplies the colour behind it (ONL-2471). */
export async function composeThumbnail<S>(
  size: { width: number; height: number },
  frames: AsyncIterable<ThumbFrame<S>>,
  ops: ThumbImageOps<S>,
): Promise<ComposeThumbnailResult> {
  const composite: ThumbBitmap = {
    width: size.width,
    height: size.height,
    bgra: Buffer.alloc(size.width * size.height * 4),
  };
  let drawn = 0;

  try {
    for await (const frame of frames) {
      const width = Math.round(frame.rect.width);
      const height = Math.round(frame.rect.height);
      if (width <= 0 || height <= 0) continue;
      if (frame.fill !== undefined) {
        fill(composite, frame.fill, frame.rect, frame.outline);
        drawn += 1;
        continue;
      }
      const read = ops.withBitmap(frame.source, width, height, (bitmap) => {
        blit(composite, bitmap, frame.rect);
      });
      if (!read) {
        logger.warn('thumbnail frame did not decode; abandoning the composite', { drawn });
        return { ok: false, reason: 'frame-failed' };
      }
      drawn += 1;
    }
  } catch {
    // The caught error carries a lower layer's message and stack; only the count crosses the logging door (ONL-2471).
    logger.warn('thumbnail frames stopped arriving; abandoning the composite', { drawn });
    return { ok: false, reason: 'frame-failed' };
  }

  if (drawn === 0) return { ok: false, reason: 'no-frames' };

  const png = ops.toPng(composite);
  if (png.byteLength > THUMBNAIL_MAX_BYTES) {
    logger.error('thumbnail encoded over its ceiling; refusing it', { bytes: png.byteLength, drawn });
    return { ok: false, reason: 'too-large' };
  }
  return { ok: true, png };
}
