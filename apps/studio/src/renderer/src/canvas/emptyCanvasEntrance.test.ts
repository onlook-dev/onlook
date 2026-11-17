import { describe, expect, it } from 'bun:test';
import { entranceWrapperPaint, type Pose } from './emptyCanvasEntrance.js';

const pose: Pose = { box: { left: 96, top: 6, width: 148, height: 128 }, ry: 0, rz: 4, origin: { x: 50, y: 190 } };
const CENTRE = 140;
const STEPS = Array.from({ length: 101 }, (_, i) => i / 100);

describe('the empty canvas entrance', () => {
  it('starts with both cards hidden', () => {
    expect(entranceWrapperPaint('page', pose, CENTRE, 0)?.opacity).toBe(0);
    expect(entranceWrapperPaint('photo', pose, CENTRE, 0)?.opacity).toBe(0);
  });

  it('leaves nothing painted once the spring rests, so each card stands exactly on its pose', () => {
    expect(entranceWrapperPaint('page', pose, CENTRE, 1)).toBeNull();
    expect(entranceWrapperPaint('photo', pose, CENTRE, 1)).toBeNull();
  });

  it('shows the page before the photo begins to appear', () => {
    const pageFirst = STEPS.some(
      (p) => entranceWrapperPaint('page', pose, CENTRE, p)?.opacity === 1 && entranceWrapperPaint('photo', pose, CENTRE, p)?.opacity === 0,
    );
    expect(pageFirst).toBe(true);
  });
});
