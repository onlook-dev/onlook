import { describe, expect, it } from 'bun:test';
import {
  distanceFromBottom,
  isAwayFromBottom,
  openAtEndScrollTop,
  shouldRearmFollow,
  type ScrollGeometry,
} from './useTranscriptFollow.js';

function scrolledShortOfBottom(distance: number): ScrollGeometry {
  return { scrollHeight: 2000, scrollTop: 1600 - distance, offsetHeight: 400 };
}

describe('shouldRearmFollow', () => {
  it('re-arms at the bottom', () => {
    expect(shouldRearmFollow(scrolledShortOfBottom(0))).toBe(true);
  });

  it('declines when scrolled up, so a deliberate scroll-up is never yanked back', () => {
    expect(shouldRearmFollow(scrolledShortOfBottom(400))).toBe(false);
  });

  it('re-arms when the transcript cannot scroll at all', () => {
    expect(shouldRearmFollow({ scrollHeight: 400, scrollTop: 0, offsetHeight: 401 })).toBe(
      true,
    );
    expect(distanceFromBottom({ scrollHeight: 400, scrollTop: 0, offsetHeight: 401 })).toBe(
      -1,
    );
  });
});

describe('isAwayFromBottom', () => {
  it('shows the pill when scrolled up, never at the bottom', () => {
    expect(isAwayFromBottom(scrolledShortOfBottom(0))).toBe(false);
    expect(isAwayFromBottom(scrolledShortOfBottom(400))).toBe(true);
  });
});

describe('openAtEndScrollTop', () => {
  it('opens a scrollable transcript at its last row', () => {
    expect(openAtEndScrollTop({ scrollHeight: 2000, clientHeight: 400 })).toBe(1600);
  });

  it('refuses when the content does not fill the viewport', () => {
    expect(openAtEndScrollTop({ scrollHeight: 300, clientHeight: 400 })).toBeNull();
    expect(openAtEndScrollTop({ scrollHeight: 0, clientHeight: 0 })).toBeNull();
    expect(openAtEndScrollTop({ scrollHeight: 400, clientHeight: 400 })).toBeNull();
  });
});
