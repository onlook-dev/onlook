import { describe, expect, it } from 'bun:test';

import { hasVisibleNodes, type VisibilityNode, type ViewportTransform } from './visibility.js';

const IDENTITY: ViewportTransform = [0, 0, 1];
const PANE = { width: 800, height: 600 };

function node(
  x: number,
  y: number,
  width: number | null = 100,
  height: number | null = 100,
): VisibilityNode {
  return { position: { x, y }, width, height };
}

describe('hasVisibleNodes', () => {
  it('sees a node fully inside the viewport', () => {
    expect(hasVisibleNodes([node(100, 100)], IDENTITY, PANE)).toBe(true);
  });

  it('sees nothing when every node is off screen', () => {
    const nodes = [
      node(-500, -500),
      node(2000, 2000),
      node(2000, 100),
      node(100, -500),
    ];
    expect(hasVisibleNodes(nodes, IDENTITY, PANE)).toBe(false);
  });

  it('sees a node that only straddles an edge', () => {
    expect(hasVisibleNodes([node(-50, 100)], IDENTITY, PANE)).toBe(true);
  });

  it('treats a touching edge as NOT visible', () => {
    expect(hasVisibleNodes([node(-100, 100)], IDENTITY, PANE)).toBe(false);
    expect(hasVisibleNodes([node(800, 100)], IDENTITY, PANE)).toBe(false);
  });

  it('sees ANY one node, not the first', () => {
    const nodes = [node(5000, 5000), node(200, 200), node(-9000, -9000)];
    expect(hasVisibleNodes(nodes, IDENTITY, PANE)).toBe(true);
  });

  it('sees nothing while the pane is unmeasured', () => {
    const overOrigin = node(-50, -50);
    expect(hasVisibleNodes([overOrigin], IDENTITY, { width: 0, height: 600 })).toBe(false);
    expect(hasVisibleNodes([overOrigin], IDENTITY, { width: 800, height: 0 })).toBe(false);
  });

  it('reads pan and zoom out of the transform', () => {
    expect(hasVisibleNodes([node(900, 100)], IDENTITY, PANE)).toBe(false);
    expect(hasVisibleNodes([node(900, 100)], [-400, 0, 1], PANE)).toBe(true);
    expect(hasVisibleNodes([node(900, 100)], [0, 0, 0.5], PANE)).toBe(true);
  });

  it('treats an unmeasured node as a zero-area point', () => {
    expect(hasVisibleNodes([node(100, 100, 0, 0)], IDENTITY, PANE)).toBe(true);
    expect(hasVisibleNodes([{ position: { x: 100, y: 100 } }], IDENTITY, PANE)).toBe(true);
    expect(hasVisibleNodes([node(0, 100, 0, 0)], IDENTITY, PANE)).toBe(false);
  });
});
