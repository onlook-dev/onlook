import { expect, it } from 'bun:test';
import { isFrameReadable } from './idle.js';

const frame = { x: 100, y: 100, width: 1000, height: 800 };
const viewport = { width: 1200, height: 900, transform: [0, 0, 1] };

it('keeps a partially visible, readable Frame running', () => {
  expect(isFrameReadable(frame, viewport)).toBe(true);
  expect(isFrameReadable({ ...frame, x: 1199 }, viewport)).toBe(true);
});

it('pauses Frames outside every viewport edge', () => {
  for (const position of [{ x: 1200, y: 0 }, { x: -1000, y: 0 }, { x: 0, y: 900 }, { x: 0, y: -800 }]) {
    expect(isFrameReadable({ ...frame, ...position }, viewport)).toBe(false);
  }
});

it('pauses unreadably small Frames and accounts for pan and zoom', () => {
  expect(isFrameReadable(frame, { ...viewport, transform: [0, 0, 0.1] })).toBe(false);
  expect(isFrameReadable(frame, { ...viewport, transform: [0, 0, 0.2] })).toBe(true);
  expect(isFrameReadable(frame, { ...viewport, transform: [-2000, 0, 1] })).toBe(false);
});

it('uses hysteresis to avoid flickering near the readable threshold', () => {
  const near = { ...viewport, transform: [0, 0, 0.17] };
  expect(isFrameReadable(frame, near, true)).toBe(true);
  expect(isFrameReadable(frame, near, false)).toBe(false);
  expect(isFrameReadable(frame, { ...viewport, transform: [0, 0, 0.2] }, false)).toBe(true);
  expect(isFrameReadable({ ...frame, x: 1199 }, viewport, false)).toBe(false);
});
