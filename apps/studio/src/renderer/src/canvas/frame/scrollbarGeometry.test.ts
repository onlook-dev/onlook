import { expect, it } from 'bun:test';
import { scrollbarEligible, scrollbarGeometry, wheelPageDelta } from './scrollbarGeometry.js';

it('maps page scroll to the counter-scaled track and clamps overscroll', () => {
  expect(scrollbarGeometry({ top: 800, viewport: 400, height: 2000 }, 400)).toEqual({ thumb: 80, travel: 320, top: 160, range: 1600 });
  expect(scrollbarGeometry({ top: -10, viewport: 400, height: 2000 }, 400).top).toBe(0);
  expect(scrollbarGeometry({ top: 3000, viewport: 400, height: 2000 }, 400).top).toBe(320);
});

it('keeps the minimum thumb at each zoom without exceeding a tiny track', () => {
  for (const zoom of [0.25, 1, 2]) {
    const geometry = scrollbarGeometry({ top: 0, viewport: 400, height: 100000 }, 400 * zoom);
    expect(geometry.thumb).toBe(32);
  }
  expect(scrollbarGeometry({ top: 0, viewport: 400, height: 100000 }, 20)).toEqual({ thumb: 20, travel: 0, top: 0, range: 99600 });
});

it('offers the scrollbar to one live selected Frame, or the one S is held over, in design mode and to nothing else', () => {
  const selected = { armed: true, isScrollKeyOn: false, mode: 'design', exporting: false, hasGuest: true, health: 'live' };
  expect(scrollbarEligible(selected)).toBe(true);
  expect(scrollbarEligible({ ...selected, armed: false })).toBe(false);
  expect(scrollbarEligible({ ...selected, armed: false, isScrollKeyOn: true })).toBe(true);
  expect(scrollbarEligible({ ...selected, armed: false, isScrollKeyOn: true, mode: 'interact' })).toBe(false);
  expect(scrollbarEligible({ ...selected, mode: 'interact' })).toBe(false);
  expect(scrollbarEligible({ ...selected, exporting: true })).toBe(false);
  expect(scrollbarEligible({ ...selected, hasGuest: false })).toBe(false);
  expect(scrollbarEligible({ ...selected, health: 'failed' })).toBe(false);
});

it('turns a wheel into page px at the canvas zoom and leaves pinch, ⌘ and sideways swipes to the canvas', () => {
  const wheel = { deltaX: 0, deltaY: 50, deltaMode: 0, ctrlKey: false, metaKey: false };
  expect(wheelPageDelta(wheel, 0.5, 900)).toBe(100);
  expect(wheelPageDelta(wheel, 1, 900)).toBe(50);
  expect(wheelPageDelta({ ...wheel, deltaY: 3, deltaMode: 1 }, 0.5, 900)).toBe(48);
  expect(wheelPageDelta({ ...wheel, deltaY: 1, deltaMode: 2 }, 0.5, 900)).toBe(900);
  expect(wheelPageDelta({ ...wheel, ctrlKey: true }, 1, 900)).toBeNull();
  expect(wheelPageDelta({ ...wheel, metaKey: true }, 1, 900)).toBeNull();
  expect(wheelPageDelta({ ...wheel, deltaX: 80 }, 1, 900)).toBeNull();
});
