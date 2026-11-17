import { expect, test } from 'bun:test';
import { claimHeight, footValue } from './foot.js';

const box = (top: number, height = 40): { top: number; width: number; height: number } => ({ top, width: 200, height });

test('a claim is how far its box reaches above the window bottom', () => {
  expect(claimHeight(800, box(720))).toBe(80);
});

test('a claim carries the lift of furniture already lifted', () => {
  expect(claimHeight(800, box(700))).toBe(100);
});

test('a box drawn nowhere claims nothing', () => {
  expect(claimHeight(800, { top: 0, width: 0, height: 0 })).toBe(0);
});

test('a box below the window bottom claims nothing', () => {
  expect(claimHeight(800, box(810))).toBe(0);
});

test('no claim reaches past the whole window', () => {
  expect(claimHeight(800, box(-400))).toBe(800);
});

test('the foot is the tallest live claim', () => {
  expect(footValue([40, 112, 56])).toBe('112px');
});

test('no claims leaves the floor in charge', () => {
  expect(footValue([])).toBeNull();
  expect(footValue([0, 0])).toBeNull();
});
