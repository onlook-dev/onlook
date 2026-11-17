import { describe, expect, it } from 'bun:test';
import type { BrowserNode, CanvasDoc, CanvasNode, ImageNode, TextNode } from '@studio/events';
import { CANVAS_TEXT_WRAP_WIDTH } from '@studio/events';
import { emptyCanvasDoc } from '../document.js';
import {
  THUMBNAIL_MARGIN_PX,
  THUMBNAIL_SIZE,
  thumbnailFitAll,
  type ThumbnailFitAll,
  type ThumbnailRect,
} from './bounds.js';

const frame = (over: Partial<BrowserNode> & { id: string }): CanvasNode => ({
  pageId: 'pg_main',
  kind: 'browser',
  name: 'frame',
  x: 0,
  y: 0,
  width: 546,
  height: 280,
  order: 0,
  content: { homeUrl: 'http://localhost:3000' },
  ...over,
});

const label = (over: Partial<TextNode> & { id: string }): CanvasNode => ({
  pageId: 'pg_main',
  kind: 'text',
  name: 'label',
  x: 0,
  y: 0,
  width: CANVAS_TEXT_WRAP_WIDTH,
  height: 38,
  order: 0,
  content: { text: 'checkout, second pass', size: 'medium' },
  ...over,
});

const picture = (over: Partial<ImageNode> & { id: string }): CanvasNode => ({
  pageId: 'pg_main',
  kind: 'image',
  name: 'reference',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  order: 0,
  content: { imageId: 'blob-1', name: 'reference', originalWidth: 1600, originalHeight: 1200 },
  ...over,
});

const MAIN_PAGE = 'pg_main';
const OTHER_PAGE = 'pg_other';

const docOf = (...nodes: CanvasNode[]): CanvasDoc => ({
  ...emptyCanvasDoc('doc-1'),
  pages: {
    [MAIN_PAGE]: { id: MAIN_PAGE, name: 'Checkout', order: 0 },
    [OTHER_PAGE]: { id: OTHER_PAGE, name: 'Settings', order: 1 },
  },
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
});

/** Every shape below is measured on the page the user is on. */
const fit = (doc: CanvasDoc): ThumbnailFitAll => thumbnailFitAll(doc, MAIN_PAGE);

const placed = (result: ThumbnailFitAll): readonly { rect: ThumbnailRect }[] => {
  if (!result.ok) throw new Error(`expected a fit, got ${result.reason}`);
  return result.placements;
};

const insets = (rect: ThumbnailRect) => ({
  left: rect.x,
  top: rect.y,
  right: THUMBNAIL_SIZE.width - (rect.x + rect.width),
  bottom: THUMBNAIL_SIZE.height - (rect.y + rect.height),
});

const hull = (rects: readonly ThumbnailRect[]): ThumbnailRect => {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const expectInsideTheInset = (rects: readonly ThumbnailRect[]): void => {
  for (const rect of rects) {
    const inset = insets(rect);
    expect(inset.left).toBeGreaterThanOrEqual(THUMBNAIL_MARGIN_PX);
    expect(inset.top).toBeGreaterThanOrEqual(THUMBNAIL_MARGIN_PX);
    expect(inset.right).toBeGreaterThanOrEqual(THUMBNAIL_MARGIN_PX);
    expect(inset.bottom).toBeGreaterThanOrEqual(THUMBNAIL_MARGIN_PX);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  }
};

const insetBox = {
  width: THUMBNAIL_SIZE.width - 2 * THUMBNAIL_MARGIN_PX,
  height: THUMBNAIL_SIZE.height - 2 * THUMBNAIL_MARGIN_PX,
};
const insetRatio = insetBox.width / insetBox.height;

const oneInsetShapedFrame = docOf(
  frame({ id: 'a', width: insetBox.width * 2, height: insetBox.height * 2 }),
);
const oneTallFrame = docOf(frame({ id: 'a', width: 400, height: 1600 }));
const oneWideFrame = docOf(frame({ id: 'a', width: 3000, height: 400 }));
const twoFramesFarApart = docOf(
  frame({ id: 'a', x: -4000, y: -3000, width: 800, height: 600 }),
  frame({ id: 'b', x: 5000, y: 4000, width: 800, height: 600, order: 1 }),
);
const fiveFramesInARow = docOf(
  ...Array.from({ length: 5 }, (_, index) =>
    frame({ id: `f-${String(index)}`, x: index * 1200, y: 0, width: 1000, height: 700, order: index }),
  ),
);
const maxSizedFrames = docOf(
  frame({ id: 'a', x: 0, y: 0, width: 8192, height: 8192 }),
  frame({ id: 'b', x: 8192, y: 8192, width: 8192, height: 8192, order: 1 }),
);

const onlyLabelsAndPictures = docOf(
  label({ id: 'l', x: -200, y: -60 }),
  picture({ id: 'p', x: 900, y: 400, order: 1 }),
);
const oneOfEachKind = docOf(
  frame({ id: 'f' }),
  label({ id: 'l', x: 900, order: 1 }),
  picture({ id: 'p', x: 1800, order: 2 }),
);

const everyShape = [
  oneInsetShapedFrame,
  oneTallFrame,
  oneWideFrame,
  twoFramesFarApart,
  fiveFramesInARow,
  maxSizedFrames,
  onlyLabelsAndPictures,
  oneOfEachKind,
];

describe('the canvas thumbnail fit-all', () => {
  it('centres one frame shaped like the inset box with the same margin on all four sides', () => {
    const rect = placed(fit(oneInsetShapedFrame))[0]?.rect;
    if (!rect) throw new Error('one frame, one placement');
    const inset = insets(rect);
    expect(inset.left).toBe(inset.right);
    expect(inset.top).toBe(inset.bottom);
    expect(Math.abs(inset.left - inset.top)).toBeLessThanOrEqual(1);
    expect(inset.left).toBeGreaterThan(0);
  });

  it('gives a tall and a wide frame the same output size and a different inset', () => {
    const tall = fit(oneTallFrame);
    const wide = fit(oneWideFrame);
    expect(tall.ok && tall.size).toEqual(wide.ok && wide.size);

    const tallInset = insets(hull(placed(tall).map(({ rect }) => rect)));
    const wideInset = insets(hull(placed(wide).map(({ rect }) => rect)));
    expect(tallInset.left).toBeGreaterThan(tallInset.top);
    expect(wideInset.top).toBeGreaterThan(wideInset.left);
    expect(tallInset.left).not.toBe(wideInset.left);
  });

  it('fits a union wider than the inset box by width and a taller union by height', () => {
    const wideHull = hull(placed(fit(fiveFramesInARow)).map(({ rect }) => rect));
    expect(wideHull.width / wideHull.height).toBeGreaterThan(insetRatio);
    const wideInset = insets(wideHull);
    expect(Math.abs(wideInset.left - THUMBNAIL_MARGIN_PX)).toBeLessThanOrEqual(1);
    expect(wideInset.top).toBeGreaterThan(wideInset.left);

    const tallHull = hull(placed(fit(oneTallFrame)).map(({ rect }) => rect));
    expect(tallHull.width / tallHull.height).toBeLessThan(insetRatio);
    const tallInset = insets(tallHull);
    expect(Math.abs(tallInset.top - THUMBNAIL_MARGIN_PX)).toBeLessThanOrEqual(1);
    expect(tallInset.left).toBeGreaterThan(tallInset.top);
  });

  it('spans both of two frames far apart, each inside the inset box', () => {
    const rects = placed(fit(twoFramesFarApart)).map(({ rect }) => rect);
    expect(rects).toHaveLength(2);
    expectInsideTheInset(rects);
    const spanned = hull(rects);
    const inset = insets(spanned);
    expect(inset.left).toBe(inset.right);
    expect(inset.top).toBe(inset.bottom);
  });

  it('keeps a canvas at the largest frame size the resize controls allow inside the inset box', () => {
    expectInsideTheInset(placed(fit(maxSizedFrames)).map(({ rect }) => rect));
  });

  it('refuses an empty canvas as its own outcome, not a degenerate rect', () => {
    expect(thumbnailFitAll(emptyCanvasDoc('doc-1'), MAIN_PAGE)).toEqual({ ok: false, reason: 'no-frames' });
  });

  it('refuses geometry that is not finite and positive', () => {
    const refusals = [
      docOf(frame({ id: 'a', x: Number.NaN })),
      docOf(frame({ id: 'a', y: Number.POSITIVE_INFINITY })),
      docOf(frame({ id: 'a', width: Number.NaN })),
      docOf(frame({ id: 'a', height: 0 })),
      docOf(frame({ id: 'a', width: -10 })),
      docOf(frame({ id: 'a', order: Number.NaN })),
      docOf(frame({ id: 'a' }), frame({ id: 'b', x: Number.NaN, order: 1 })),
    ];
    for (const doc of refusals) {
      expect(fit(doc)).toEqual({ ok: false, reason: 'bad-geometry' });
    }
  });

  it('returns whole-pixel destination rects', () => {
    for (const doc of everyShape) {
      for (const { rect } of placed(fit(doc))) {
        expect(Number.isInteger(rect.x)).toBe(true);
        expect(Number.isInteger(rect.y)).toBe(true);
        expect(Number.isInteger(rect.width)).toBe(true);
        expect(Number.isInteger(rect.height)).toBe(true);
      }
    }
  });

  it('carries one output size whatever the canvas holds', () => {
    for (const doc of everyShape) {
      const result = fit(doc);
      expect(result.ok && result.size).toEqual(THUMBNAIL_SIZE);
    }
    expect(THUMBNAIL_SIZE.width / THUMBNAIL_SIZE.height).toBeCloseTo(273 / 140, 2);
    expect(Math.max(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height)).toBe(1024);
    expect(THUMBNAIL_MARGIN_PX).toBeGreaterThan(0);
  });

  it('frames a canvas holding only a label and a reference image', () => {
    const rects = placed(fit(onlyLabelsAndPictures)).map(({ rect }) => rect);
    expect(rects).toHaveLength(2);
    expectInsideTheInset(rects);
    const inset = insets(hull(rects));
    expect(inset.left).toBe(inset.right);
    expect(inset.top).toBe(inset.bottom);
  });

  it('names what each placement draws, and a reference image by the blob holding its bytes', () => {
    const result = fit(oneOfEachKind);
    if (!result.ok) throw new Error(result.reason);
    const byId = new Map(result.placements.map((placement) => [placement.id, placement]));

    expect(byId.get('f')?.kind).toBe('browser');
    expect(byId.get('l')?.kind).toBe('text');
    const image = byId.get('p');
    expect(image?.kind).toBe('image');
    expect(image?.kind === 'image' && image.imageId).toBe('blob-1');
  });

  it('draws the page the user is on, and never reaches for a node on another page', () => {
    const here = frame({ id: 'here', x: 0, y: 0, width: 800, height: 600 });
    const elsewhere = frame({
      id: 'elsewhere',
      pageId: OTHER_PAGE,
      x: 9000,
      y: 9000,
      width: 800,
      height: 600,
      order: 1,
    });

    const scoped = fit(docOf(here, elsewhere));
    expect(placed(scoped).map(({ rect }) => rect)).toHaveLength(1);
    expect(scoped).toEqual(fit(docOf(here)));
  });

  it('refuses a page holding nothing, whatever the pages beside it hold', () => {
    const elsewhere = frame({ id: 'elsewhere', pageId: OTHER_PAGE });
    expect(fit(docOf(elsewhere))).toEqual({ ok: false, reason: 'no-frames' });
  });

  it('is not refused by geometry on a page the user is not on', () => {
    const here = frame({ id: 'here' });
    const broken = frame({ id: 'broken', pageId: OTHER_PAGE, width: Number.NaN, order: 1 });
    expect(fit(docOf(here, broken)).ok).toBe(true);
  });

  it('fits every node when no page is resolved, so a document predating pages still draws', () => {
    const doc = docOf(frame({ id: 'here' }), frame({ id: 'elsewhere', pageId: OTHER_PAGE, x: 900, order: 1 }));
    expect(placed(thumbnailFitAll(doc, undefined))).toHaveLength(2);
  });

  it('orders placements by destination area, largest first, keeping each draw order', () => {
    const small = frame({ id: 'small', x: 0, y: 0, width: 400, height: 300, order: 0 });
    const large = frame({ id: 'large', x: 500, y: 0, width: 1600, height: 1200, order: 1 });
    const middle = frame({ id: 'middle', x: 0, y: 1400, width: 800, height: 600, order: 2 });
    const result = fit(docOf(small, large, middle));
    if (!result.ok) throw new Error(result.reason);

    expect(result.placements.map(({ id }) => id)).toEqual(['large', 'middle', 'small']);
    const areas = result.placements.map(({ rect }) => rect.width * rect.height);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
    expect(result.placements.map(({ order }) => order)).toEqual([1, 2, 0]);
  });
});
