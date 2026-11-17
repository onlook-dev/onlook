import type { FrameCaptureFailure } from '../telemetry/events.js';
import { FRAME_REF_RESOLVE, type RefExpectation } from './frame-read.js';

/** The card tile is 72×56 CSS px; a clip is stored at twice that (ONL-2977). */
export const CLIP_TILE = { width: 144, height: 112 } as const;

const MARGIN = 1.3;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type ClipTargetFailure = 'no-match' | 'invalid-selector' | 'hidden' | 'not-in-view' | 'stale-ref';

export type PictureMiss = ClipTargetFailure | Exclude<FrameCaptureFailure, 'none'>;

/** `element` is what was asked; `frame` is the whole viewport, asked or as the fallback; `remembered` is the frame's picture from its last load. */
export type PictureSource = 'element' | 'frame' | 'remembered';

export type FramePicture = { ok: true; id: string; source: PictureSource; missed?: PictureMiss } | { ok: false; reason: PictureMiss };

export interface FramePictures {
  pictures: FramePicture[];
  captureFailure: FrameCaptureFailure;
  retried: boolean;
  durationMs: number;
}

export interface PictureTarget {
  selector?: string;
  ref?: string;
}

/** A ref main never handed out carries no expectation, and the page reads it as stale. */
export type ClipTarget = { selector: string } | { ref: string; expect: RefExpectation | null } | Record<string, never>;

export type TargetRead = { ok: true; rect: Rect } | { ok: false; reason: ClipTargetFailure };

export interface PageFound {
  invalid?: boolean;
  stale?: boolean;
  rect?: Rect;
  visible?: boolean;
  inView?: boolean;
}

const tileAspect = CLIP_TILE.width / CLIP_TILE.height;

function fitInside(region: Rect, viewport: Viewport): Rect {
  const scale = Math.min(1, viewport.width / region.width, viewport.height / region.height);
  const width = region.width * scale;
  const height = region.height * scale;
  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  const x = Math.min(Math.max(cx - width / 2, 0), viewport.width - width);
  const y = Math.min(Math.max(cy - height / 2, 0), viewport.height - height);
  return { x, y, width, height };
}

/** The part of the viewport the tile shows: the element with a margin of page around it, centred and fitted whole. */
export function frameClip(rect: Rect, viewport: Viewport): Rect {
  const scale = Math.min(CLIP_TILE.width / (rect.width * MARGIN), CLIP_TILE.height / (rect.height * MARGIN));
  const width = CLIP_TILE.width / scale;
  const height = CLIP_TILE.height / scale;
  return fitInside({ x: rect.x + rect.width / 2 - width / 2, y: rect.y + rect.height / 2 - height / 2, width, height }, viewport);
}

/** No selector pictures the frame itself, anchored at its top left. */
export function wholeFrameClip(viewport: Viewport): Rect {
  const width = Math.min(viewport.width, viewport.height * tileAspect);
  return { x: 0, y: 0, width, height: width / tileAspect };
}

/** `inView` is the page's own verdict, the rule a read marks lines by, so the two never disagree (ONL-2977). */
export function targetRead(found: PageFound | undefined): TargetRead {
  if (found?.invalid === true) return { ok: false, reason: 'invalid-selector' };
  if (found?.stale === true) return { ok: false, reason: 'stale-ref' };
  if (found?.rect === undefined) return { ok: false, reason: 'no-match' };
  const { rect } = found;
  if (found.visible !== true || rect.width <= 0 || rect.height <= 0) return { ok: false, reason: 'hidden' };
  if (found.inView !== true) return { ok: false, reason: 'not-in-view' };
  return { ok: true, rect };
}

type PageTarget = { selector: string } | { ref: string; role: string | null; name: string | null } | null;

function pageTarget(target: ClipTarget): PageTarget {
  if ('selector' in target) return { selector: target.selector };
  if ('ref' in target) return { ref: target.ref, role: target.expect?.role ?? null, name: target.expect?.name ?? null };
  return null;
}

/** The targets ride as JSON data inside the script, never as code. */
export function clipReadScript(targets: readonly ClipTarget[]): string {
  return `(() => {${FRAME_REF_RESOLVE}
    const read = (target) => {
      if (target === null) return null;
      let element;
      if ('ref' in target) {
        element = resolveRef(target);
        if (element === null) return { stale: true };
      } else {
        try { element = document.querySelector(target.selector); } catch { return { invalid: true }; }
        if (element === null) return {};
      }
      const box = pictureBox(element);
      const style = getComputedStyle(element);
      const visible = style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0;
      return { rect: { x: box.x, y: box.y, width: box.width, height: box.height }, visible, inView: halfShown(box) };
    };
    const answer = () => ({ width: innerWidth, height: innerHeight, ratio: devicePixelRatio, targets: ${JSON.stringify(targets.map(pageTarget))}.map(read) });
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(answer()))));
  })()`;
}

export interface ClipRead {
  viewport: Viewport & { ratio: number };
  targets: (PageFound | null)[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function rectOf(value: unknown): Rect | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { x, y, width, height } = value as Record<string, unknown>;
  return finite(x) && finite(y) && finite(width) && finite(height) ? { x, y, width, height } : undefined;
}

export function clipReadOf(value: unknown, count: number): ClipRead | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { width, height, ratio, targets } = value as Record<string, unknown>;
  if (!finite(width) || !finite(height) || !finite(ratio) || width <= 0 || height <= 0 || ratio <= 0) return undefined;
  if (!Array.isArray(targets) || targets.length !== count) return undefined;
  return {
    viewport: { width, height, ratio },
    targets: targets.map((target: unknown) => {
      if (typeof target !== 'object' || target === null) return null;
      const { invalid, stale, visible, inView, rect } = target as Record<string, unknown>;
      const box = rectOf(rect);
      return {
        ...(invalid === true ? { invalid: true } : {}),
        ...(stale === true ? { stale: true } : {}),
        ...(box === undefined ? {} : { rect: box }),
        ...(visible === true ? { visible: true } : {}),
        ...(inView === true ? { inView: true } : {}),
      };
    }),
  };
}

/** A clip rect in CSS px, as device pixels of a capture taken at `ratio`, inside an image of `size`. */
export function devicePixels(rect: Rect, ratio: number, size: Viewport): Rect {
  const x = Math.max(0, Math.floor(rect.x * ratio));
  const y = Math.max(0, Math.floor(rect.y * ratio));
  const width = Math.max(1, Math.min(size.width - x, Math.round(rect.width * ratio)));
  const height = Math.max(1, Math.min(size.height - y, Math.round(rect.height * ratio)));
  return { x, y, width, height };
}
