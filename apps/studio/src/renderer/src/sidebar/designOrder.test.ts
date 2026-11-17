import { describe, expect, test } from 'bun:test';
import { DRAG_THRESHOLD, dropIndexAt, dropMarkFor, isDragArmed, orderForDrop } from './designOrder.js';

// Front first, as the list reads: the highest order is the top row.
const LIST = [
  { id: 'front', order: 3 },
  { id: 'middle', order: 2 },
  { id: 'back', order: 1 },
];

describe('orderForDrop', () => {
  test('to the top: above the current front', () => {
    expect(orderForDrop(LIST, 'back', 0)).toBe(4);
  });

  test('to the bottom: below the current back', () => {
    expect(orderForDrop(LIST, 'front', 3)).toBe(0);
  });

  test('between two rows: the midpoint of their orders', () => {
    expect(orderForDrop(LIST, 'back', 1)).toBe(2.5);
    expect(orderForDrop(LIST, 'front', 2)).toBe(1.5);
  });

  test('dropped on either side of itself: no move', () => {
    expect(orderForDrop(LIST, 'middle', 1)).toBeNull();
    expect(orderForDrop(LIST, 'middle', 2)).toBeNull();
  });
});

describe('a press becomes a drag only past the threshold, so a click still selects', () => {
  test('under the threshold, either way, is a click', () => {
    expect(isDragArmed(100, 100 + DRAG_THRESHOLD - 1)).toBe(false);
    expect(isDragArmed(100, 100 - DRAG_THRESHOLD + 1)).toBe(false);
  });

  test('at the threshold, either way, is a drag', () => {
    expect(isDragArmed(100, 100 + DRAG_THRESHOLD)).toBe(true);
    expect(isDragArmed(100, 100 - DRAG_THRESHOLD)).toBe(true);
  });
});

describe('dropIndexAt: the gap nearest the pointer', () => {
  // Three rows, 20px tall, starting at y = 0.
  const MIDLINES = [10, 30, 50];

  test('above the first midline is the gap above the first row', () => {
    expect(dropIndexAt(MIDLINES, 5)).toBe(0);
  });

  test('between two midlines is the gap between those rows', () => {
    expect(dropIndexAt(MIDLINES, 25)).toBe(1);
    expect(dropIndexAt(MIDLINES, 45)).toBe(2);
  });

  test('past the last midline is the gap below the last row, even far below the list', () => {
    expect(dropIndexAt(MIDLINES, 55)).toBe(3);
    expect(dropIndexAt(MIDLINES, 5000)).toBe(3);
  });
});

describe('dropMarkFor: exactly one row draws the line, at every gap', () => {
  const COUNT = 3;
  const marks = (index: number): Array<ReturnType<typeof dropMarkFor>> =>
    [0, 1, 2].map((row) => dropMarkFor(index, row, COUNT));

  test('every gap, the no-move ones included, is drawn by exactly one row', () => {
    for (let index = 0; index <= COUNT; index += 1) {
      expect(marks(index).filter((mark) => mark !== null)).toHaveLength(1);
    }
  });

  test('the top gap sits inside the first row, clear of the list clip', () => {
    expect(marks(0)[0]).toEqual({ edge: 'before', isAtListEnd: true });
  });

  test('a gap between rows sits on the top edge of the row below it, straddling the boundary', () => {
    expect(marks(2)[2]).toEqual({ edge: 'before', isAtListEnd: false });
  });

  test('the bottom gap sits inside the last row, clear of the list clip', () => {
    expect(marks(COUNT)[2]).toEqual({ edge: 'after', isAtListEnd: true });
  });
});
