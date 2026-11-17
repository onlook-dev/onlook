import { describe, expect, test } from 'bun:test';
import { captureCamera, geometryUnder, paintedSize, paintsWhole, repeatedRowsShift, type CaptureGeometry } from './capture-view.js';
import type { CanvasCamera } from './canvas.js';

const FRAME = { width: 1512, height: 982 };

function at(tab: { width: number; height: number }, zoom: number, left: number, top: number, frame = FRAME): CaptureGeometry {
  return { tab, pane: { left: 0, top: 0 }, frame, rect: { left, top, width: frame.width * zoom, height: frame.height * zoom }, hidden: false };
}

describe('paintsWhole follows the painted surface Chromium measured on Studio frames', () => {
  test('a frame taller than about 1.3 tabs at its zoom paints short, wherever its top sits on the tab', () => {
    for (const top of [80, 380]) {
      const g = at({ width: 1200, height: 500 }, 0.9, 100, top);
      expect(paintsWhole(g)).toEqual({ whole: false, axis: 'height', why: 'too-large' });
      expect(Math.abs(paintedSize(g).height * 2 - 1447)).toBeLessThanOrEqual(3);
      expect(paintedSize(g).width).toBe(1512);
    }
  });

  test('a frame whose top-left is off the tab loses its leading edge too', () => {
    const g = at({ width: 1200, height: 500 }, 0.9, -200, -350);
    expect(paintsWhole(g).whole).toBe(false);
    const size = paintedSize(g);
    expect(Math.abs(size.width * 2 - 2982)).toBeLessThanOrEqual(3);
    expect(Math.abs(size.height * 2 - 1354)).toBeLessThanOrEqual(3);
  });

  test('the same frame zoomed out, or on a taller tab, paints whole', () => {
    expect(paintsWhole(at({ width: 1200, height: 500 }, 0.3, 100, 80))).toEqual({ whole: true });
    expect(paintsWhole(at({ width: 1200, height: 827 }, 0.9, 100, 80))).toEqual({ whole: true });
  });

  test('a frame wholly off the tab never paints', () => {
    expect(paintsWhole(at({ width: 1200, height: 500 }, 0.3, 1300, 80))).toEqual({ whole: false, axis: 'width', why: 'off-tab' });
    expect(paintsWhole(at({ width: 1200, height: 500 }, 0.3, 100, -400))).toEqual({ whole: false, axis: 'height', why: 'off-tab' });
  });

  test('an unmeasured frame is never whole', () => {
    expect(paintsWhole(at({ width: 1200, height: 500 }, 0, 100, 80)).whole).toBe(false);
  });
});

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function onCamera(camera: CanvasCamera, point: { x: number; y: number }, pane: { left: number; top: number }, tab: CaptureGeometry['tab'], frame: CaptureGeometry['frame']): CaptureGeometry {
  return {
    tab,
    pane,
    frame,
    rect: { left: pane.left + point.x * camera.zoom + camera.x, top: pane.top + point.y * camera.zoom + camera.y, width: frame.width * camera.zoom, height: frame.height * camera.zoom },
    hidden: false,
  };
}

describe('captureCamera', () => {
  test('the kill-condition frame gets a camera it paints whole under', () => {
    const camera = { x: 100, y: 80, zoom: 0.9 };
    const g = onCamera(camera, { x: 0, y: 0 }, { left: 0, top: 0 }, { width: 1200, height: 500 }, FRAME);
    const next = captureCamera(camera, g);
    expect(next).not.toBeNull();
    expect(paintsWhole(geometryUnder(camera, next!, g))).toEqual({ whole: true });
  });

  test('a frame that already paints whole keeps the camera', () => {
    const camera = { x: 100, y: 80, zoom: 0.3 };
    expect(captureCamera(camera, onCamera(camera, { x: 0, y: 0 }, { left: 0, top: 0 }, { width: 1200, height: 500 }, FRAME))).toBeNull();
  });

  test('every camera it returns paints the frame whole, lands where the camera puts it, and never zooms in', () => {
    const random = seeded(3031);
    for (let run = 0; run < 2_000; run += 1) {
      const tab = { width: 400 + random() * 1600, height: 300 + random() * 1000 };
      const pane = { left: random() * 300, top: random() * 60 };
      const frame = { width: Math.round(200 + random() * 3800), height: Math.round(200 + random() * 6000) };
      const camera = { x: (random() - 0.5) * 4000, y: (random() - 0.5) * 4000, zoom: 0.05 + random() * 2 };
      const point = { x: (random() - 0.5) * 3000, y: (random() - 0.5) * 3000 };
      const g = onCamera(camera, point, pane, tab, frame);
      const next = captureCamera(camera, g);
      if (next === null) {
        expect(paintsWhole(g)).toEqual({ whole: true });
        continue;
      }
      expect(next.zoom).toBeLessThanOrEqual(camera.zoom);
      const moved = geometryUnder(camera, next, g);
      const direct = onCamera(next, point, pane, tab, frame);
      expect(moved.rect.left).toBeCloseTo(direct.rect.left, 6);
      expect(moved.rect.top).toBeCloseTo(direct.rect.top, 6);
      expect(paintsWhole(moved)).toEqual({ whole: true });
    }
  });
});

describe('repeatedRowsShift', () => {
  test('flags a capture whose lower rows repeat its top', () => {
    expect(repeatedRowsShift(['a', 'b', 'c', 'd', 'e', 'a', 'b', 'c', 'd', 'e'])).toBe(5);
  });

  test('a block repeated once inside other content is ordinary content', () => {
    expect(repeatedRowsShift(['a', 'b', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).toBeNull();
  });

  test('a blank page, or blank margins around content, is never flagged', () => {
    expect(repeatedRowsShift(Array.from({ length: 40 }, () => 'white'))).toBeNull();
    expect(repeatedRowsShift(['w', 'w', 'w', 'a', 'b', 'c', 'w', 'w', 'w'])).toBeNull();
  });

  test('rows of real content are not flagged', () => {
    expect(repeatedRowsShift(Array.from({ length: 200 }, (_, row) => `row-${String(row)}`))).toBeNull();
  });
});
