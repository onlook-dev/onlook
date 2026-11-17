import { describe, expect, it } from 'bun:test';
import { reorderedTabs } from './reorder.js';

describe('reorderedTabs', () => {
  it('moves a tab forward and back', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(reorderedTabs(order, order, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(reorderedTabs(order, order, 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  // The drop index counts the VISIBLE tabs; the invisible entry must not drift.
  it('maps a visible index onto an order holding an invisible tab', () => {
    const order = ['home', 'a', 'b', 'c'];
    const visible = ['a', 'b', 'c'];
    expect(reorderedTabs(order, visible, 'a', 2)).toEqual(['home', 'b', 'c', 'a']);
    const interleaved = ['a', 'home', 'b', 'c'];
    expect(reorderedTabs(interleaved, visible, 'c', 0)).toEqual(['c', 'home', 'a', 'b']);
  });

  // Identity, not a copy: the caller skips its broadcast on the same array.
  it('returns the original array when nothing moves', () => {
    const order = ['a', 'b', 'c'];
    expect(reorderedTabs(order, order, 'b', 1)).toBe(order);
    expect(reorderedTabs(order, order, 'nope', 0)).toBe(order);
  });

  // Past the end is the last slot: the pointer can leave the strip mid-drag.
  it('clamps an index past either end', () => {
    const order = ['a', 'b', 'c'];
    expect(reorderedTabs(order, order, 'a', 99)).toEqual(['b', 'c', 'a']);
    expect(reorderedTabs(order, order, 'c', -5)).toEqual(['c', 'a', 'b']);
  });
});
