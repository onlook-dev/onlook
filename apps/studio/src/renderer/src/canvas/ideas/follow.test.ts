import { describe, expect, it } from 'bun:test';
import { followStyle, type CanvasView, type FollowAnchor } from './follow.js';

const ANCHOR: FollowAnchor = { view: { x: 40, y: -20, zoom: 0.5 }, start: 300, width: 900, height: 700 };

/** Where a point laid out in the layer lands in pane px, by the CSS the style names. */
function onPane(view: CanvasView, start: number, point: { x: number; y: number }): { x: number; y: number } {
  const style = followStyle(ANCHOR, view, start);
  const [, tx, ty, k] = /translate\((.+)px, (.+)px\) scale\((.+)\)/.exec(String(style.transform))!.map(Number) as [number, number, number, number];
  const [ox] = String(style.transformOrigin).split(' ').map((part) => Number.parseFloat(part)) as [number];
  const boxLeft = start + Number(style.left);
  const local = { x: point.x - ox, y: point.y };
  return { x: boxLeft + ox + tx + local.x * k, y: ty + local.y * k };
}

const toCanvas = (view: CanvasView, pane: { x: number; y: number }) => ({ x: (pane.x - view.x) / view.zoom, y: (pane.y - view.y) / view.zoom });

describe('followStyle', () => {
  it('fills the visible canvas until the cards are opened', () => {
    expect(followStyle(null, ANCHOR.view, 0)).toEqual({ position: 'absolute', inset: 0 });
  });

  it('keeps a card point on the canvas point it opened over, through a pan and a zoom', () => {
    const point = { x: 120, y: 80 };
    const opened = toCanvas(ANCHOR.view, onPane(ANCHOR.view, ANCHOR.start, point));
    const moved: CanvasView = { x: -260, y: 95, zoom: 1.25 };
    const after = toCanvas(moved, onPane(moved, ANCHOR.start, point));
    expect(after.x).toBeCloseTo(opened.x, 9);
    expect(after.y).toBeCloseTo(opened.y, 9);
  });

  it('leaves the cards where they are when the Left Rail resizes', () => {
    const point = { x: 120, y: 80 };
    const before = onPane(ANCHOR.view, ANCHOR.start, point);
    const after = onPane(ANCHOR.view, ANCHOR.start + 180, point);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(followStyle(ANCHOR, ANCHOR.view, ANCHOR.start + 180).width).toBe(ANCHOR.width);
  });
});
