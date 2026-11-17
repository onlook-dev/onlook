import { describe, expect, test } from 'bun:test';
import { spacingBands, type Sides } from './spacing.js';

const none: Sides = { top: 0, right: 0, bottom: 0, left: 0 };
const all = (value: number): Sides => ({ top: value, right: value, bottom: value, left: value });
const rect = { left: 100, top: 100, width: 200, height: 100 };

describe('spacingBands', () => {
  test('no margin and no padding shades nothing', () => {
    expect(spacingBands(rect, none, none, none)).toEqual([]);
  });

  test('the margin ring sits outside the box, its top and bottom bands taking the corners', () => {
    const bands = spacingBands(rect, all(10), none, none);
    expect(bands.find((b) => b.side === 'top')).toMatchObject({ left: 90, top: 90, width: 220, height: 10 });
    expect(bands.find((b) => b.side === 'left')).toMatchObject({ left: 90, top: 100, width: 10, height: 100 });
  });

  test('padding starts inside the border, and its side bands fit between the top and bottom ones', () => {
    const bands = spacingBands(rect, none, all(2), { top: 8, right: 16, bottom: 8, left: 16 });
    expect(bands.find((b) => b.side === 'top')).toMatchObject({ left: 102, top: 102, width: 196, height: 8 });
    expect(bands.find((b) => b.side === 'right')).toMatchObject({ left: 282, top: 110, width: 16, height: 80, value: 16 });
  });

  test('a negative margin is not shaded', () => {
    expect(spacingBands(rect, { ...none, top: -12 }, none, none)).toEqual([]);
  });
});
