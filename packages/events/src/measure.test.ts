import { describe, expect, test } from 'bun:test';
import { measureBetween, measureLineBox, type MeasureBox } from './measure.js';

const box = (left: number, top: number, width: number, height: number): MeasureBox => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('measureBetween', () => {
  test('side by side on one row: the horizontal gap alone, at the shared band, with no extension', () => {
    const [gap, ...rest] = measureBetween(box(0, 0, 100, 50), box(130, 10, 50, 50));
    expect(rest).toEqual([]);
    expect(gap?.value).toBe(30);
    expect(gap?.line).toEqual({ x1: 100, y1: 30, x2: 130, y2: 30 });
    expect(gap?.support).toBeUndefined();
  });

  test('stacked: the vertical gap alone', () => {
    const measured = measureBetween(box(0, 0, 100, 40), box(20, 64, 60, 20));
    expect(measured.map((m) => m.value)).toEqual([24]);
  });

  test('nested: the inset on all four sides', () => {
    const measured = measureBetween(box(10, 20, 80, 60), box(0, 0, 100, 100));
    expect(measured.map((m) => m.value)).toEqual([10, 10, 20, 20]);
  });

  test('diagonal: both gaps, each extended to the target edge it does not reach', () => {
    const measured = measureBetween(box(0, 0, 50, 50), box(80, 90, 40, 40));
    expect(measured.map((m) => m.value)).toEqual([30, 40]);
    expect(measured[0]?.support).toEqual({ x1: 80, y1: 90, x2: 80, y2: 25 });
    expect(measured[1]?.support).toEqual({ x1: 80, y1: 90, x2: 25, y2: 90 });
  });

  test('flush edges measure nothing on that side', () => {
    const measured = measureBetween(box(0, 0, 100, 100), box(0, 0, 100, 50));
    expect(measured.map((m) => m.value)).toEqual([50]);
  });
});

describe('measureLineBox — one screen pixel at any zoom, on the segment it draws', () => {
  test('a horizontal line at zoom 0.5 is 2 units thick, centred on its y', () => {
    const line = measureLineBox({ x1: 30, y1: 10, x2: 10, y2: 10 }, 2, false);
    expect(line).toMatchObject({ left: 10, top: 9, width: 20, height: 2 });
  });

  test('a vertical line is as thick as the scale, centred on its x', () => {
    const line = measureLineBox({ x1: 40, y1: 0, x2: 40, y2: 50 }, 1, false);
    expect(line).toMatchObject({ left: 39.5, top: 0, width: 1, height: 50 });
  });

  test('only an extension is dashed', () => {
    const segment = { x1: 0, y1: 0, x2: 100, y2: 0 };
    expect(measureLineBox(segment, 1, true).background).toContain('repeating-linear-gradient');
    expect(measureLineBox(segment, 1, false).background).not.toContain('gradient');
  });
});
