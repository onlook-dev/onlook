import { describe, expect, it } from 'bun:test';
import { CLIP_TILE, clipReadOf, devicePixels, frameClip, targetRead, wholeFrameClip } from './clip.js';

const viewport = { width: 1440, height: 900 };
const aspect = CLIP_TILE.width / CLIP_TILE.height;
const contains = (outer: { x: number; y: number; width: number; height: number }, inner: typeof outer): boolean =>
  outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.width >= inner.x + inner.width && outer.y + outer.height >= inner.y + inner.height;

describe('the part of the page a next-task tile shows (ONL-2977)', () => {
  it('holds the whole element with page around it, in the tile’s shape', () => {
    const button = { x: 600, y: 400, width: 120, height: 40 };
    const region = frameClip(button, viewport);
    expect(contains(region, button)).toBe(true);
    expect(region.width).toBeGreaterThan(button.width);
    expect(region.width / region.height).toBeCloseTo(aspect, 5);
    expect(region.x + region.width / 2).toBeCloseTo(button.x + button.width / 2, 5);
  });

  it('fits a wide strip whole rather than reading part of it', () => {
    const nav = { x: 40, y: 20, width: 900, height: 24 };
    const region = frameClip(nav, viewport);
    expect(contains(region, nav)).toBe(true);
    expect(region.width / region.height).toBeCloseTo(aspect, 5);
  });

  it('stays inside the viewport for an element at its edge', () => {
    const corner = { x: 1400, y: 880, width: 40, height: 20 };
    const region = frameClip(corner, viewport);
    expect(contains({ x: 0, y: 0, ...viewport }, region)).toBe(true);
  });

  it('shrinks to the viewport for an element larger than it', () => {
    const hero = { x: 0, y: 0, width: 1440, height: 2000 };
    const region = frameClip(hero, viewport);
    expect(contains({ x: 0, y: 0, ...viewport }, region)).toBe(true);
    expect(region.width / region.height).toBeCloseTo(aspect, 5);
  });

  it('pictures a whole frame from its top left', () => {
    const desktop = wholeFrameClip(viewport);
    expect([desktop.x, desktop.y, desktop.width]).toEqual([0, 0, 900 * aspect]);
    expect(desktop.height).toBeCloseTo(900, 5);
    const phone = wholeFrameClip({ width: 390, height: 844 });
    expect([phone.x, phone.y, phone.width]).toEqual([0, 0, 390]);
    expect(phone.height).toBeCloseTo(390 / aspect, 5);
  });
});

describe('which targets a next-task tile can picture (ONL-2977)', () => {
  const rect = { x: 100, y: 100, width: 200, height: 50 };

  it('pictures a visible element the page reads as in view', () => {
    expect(targetRead({ rect, visible: true, inView: true })).toEqual({ ok: true, rect });
  });

  it('names why it cannot picture the rest', () => {
    expect(targetRead({ invalid: true })).toEqual({ ok: false, reason: 'invalid-selector' });
    expect(targetRead({})).toEqual({ ok: false, reason: 'no-match' });
    expect(targetRead({ stale: true })).toEqual({ ok: false, reason: 'stale-ref' });
    expect(targetRead(undefined)).toEqual({ ok: false, reason: 'no-match' });
    expect(targetRead({ rect, visible: false, inView: true })).toEqual({ ok: false, reason: 'hidden' });
    expect(targetRead({ rect: { ...rect, height: 0 }, visible: true, inView: true })).toEqual({ ok: false, reason: 'hidden' });
    expect(targetRead({ rect, visible: true })).toEqual({ ok: false, reason: 'not-in-view' });
  });

  it('reads a page answer only when it has a viewport and one entry per target', () => {
    const answer = { width: 1440, height: 900, ratio: 2, targets: [{ rect, visible: true, inView: true }, null] };
    expect(clipReadOf(answer, 2)?.targets).toEqual([{ rect, visible: true, inView: true }, null]);
    expect(clipReadOf(answer, 3)).toBeUndefined();
    expect(clipReadOf({ ...answer, ratio: 0 }, 2)).toBeUndefined();
  });

  it('crops device pixels inside the capture', () => {
    expect(devicePixels({ x: 10.4, y: 20, width: 100, height: 50 }, 2, { width: 2880, height: 1800 })).toEqual({ x: 20, y: 40, width: 200, height: 100 });
    expect(devicePixels({ x: 1400, y: 0, width: 100, height: 50 }, 2, { width: 2880, height: 1800 }).width).toBe(80);
  });
});
