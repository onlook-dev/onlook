import { describe, expect, it } from 'bun:test';
import { tabPointOf } from './pointer.js';

const VIEWPORT = { width: 1000, height: 800 };
const WEBVIEW = { x: 50, y: 60, width: 500, height: 400 };

describe('tabPointOf', () => {
  it('carries the element centre onto the tab by the scale the frame renders at', () => {
    expect(tabPointOf({ x: 100, y: 40, width: 200, height: 20 }, VIEWPORT, WEBVIEW)).toEqual({
      x: 150,
      y: 85,
      guest: { x: 200, y: 50 },
      scale: 0.5,
    });
  });

  it('aims at the part of the element inside the page viewport', () => {
    const point = tabPointOf({ x: -100, y: 790, width: 200, height: 40 }, VIEWPORT, WEBVIEW);
    expect(point).toMatchObject({ guest: { x: 50, y: 795 } });
  });

  it('refuses an element with no part inside the page viewport', () => {
    expect(typeof tabPointOf({ x: 1200, y: 40, width: 200, height: 20 }, VIEWPORT, WEBVIEW)).toBe('string');
    expect(typeof tabPointOf({ x: 100, y: -60, width: 200, height: 60 }, VIEWPORT, WEBVIEW)).toBe('string');
  });
});
