import { describe, expect, it } from 'bun:test';
import { intersects } from '@studio/events';
import { planSeat, screenRect, visibleSpan } from './seat.js';

const SIZE = { width: 1512, height: 982 };
const PANE = { width: 1440, height: 864 };
const INSETS = { left: 300, right: 400, top: 80, bottom: 48 };

describe('where the inspiration frame lands', () => {
  it('takes the first-frame fit on an empty canvas and seats the frame in it', () => {
    const fit = { x: 320, y: 140, zoom: 0.4 };
    const plan = planSeat({ occupied: [], size: SIZE, camera: { x: 0, y: 0, zoom: 1 }, pane: PANE, insets: INSETS, firstFit: () => fit });
    expect(plan.camera).toEqual(fit);
    expect(plan.box).toEqual({ x: 0, y: 0, ...SIZE });
    expect(plan.seat).toEqual(screenRect(plan.box, fit));
    expect(plan.reveal).toBe(false);
  });

  it('holds the camera on a populated canvas and lands clear of every frame, inside the view', () => {
    const camera = { x: 400, y: 120, zoom: 0.1 };
    const occupied = [0, 1, 2, 3].map((i) => ({ x: i * 1600, y: 0, ...SIZE }));
    const plan = planSeat({ occupied, size: SIZE, camera, pane: PANE, insets: INSETS, firstFit: () => null });
    expect(plan.camera).toBeNull();
    expect(plan.reveal).toBe(false);
    expect(occupied.some((o) => intersects(plan.box, o))).toBe(false);
    const view = visibleSpan(camera, PANE, INSETS);
    expect(plan.box.x).toBeGreaterThanOrEqual(view.x);
    expect(plan.box.x + plan.box.width).toBeLessThanOrEqual(view.x + view.width + 1e-9);
  });

  it('falls back to the next open spot and asks for a reveal when nothing in view is free', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const occupied = [{ x: -5000, y: -5000, width: 20000, height: 20000 }];
    const plan = planSeat({ occupied, size: SIZE, camera, pane: PANE, insets: INSETS, firstFit: () => null });
    expect(plan.reveal).toBe(true);
    expect(plan.camera).toBeNull();
    expect(plan.box.x).toBeGreaterThan(15000 - 1);
  });
});
