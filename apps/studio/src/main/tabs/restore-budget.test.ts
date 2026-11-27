import { describe, expect, it } from 'bun:test';
import type { BrowserNode, CanvasDoc, CanvasNode } from '@studio/events';
import { RESTORE_MEMORY_RATIO, restoreCanvasEligibleAcrossAllPages, restoreWithinBudget } from './restore-budget.js';

const browser = (id = 'browser', pageId = 'page'): BrowserNode => ({
  id,
  pageId,
  kind: 'browser',
  name: 'Frame',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  order: 0,
  content: { homeUrl: 'http://localhost:3000' },
});

const canvas = (nodes: CanvasNode[] = [browser()]): CanvasDoc => ({
  schemaVersion: 1,
  docId: 'canvas',
  revision: 0,
  pages: {
    page: { id: 'page', name: 'Page', order: 0 },
    other: { id: 'other', name: 'Other page', order: 1 },
  },
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
});

describe('restoreCanvasEligibleAcrossAllPages', () => {
  it('accepts exactly one browser across all pages', () => {
    expect(restoreCanvasEligibleAcrossAllPages(canvas())).toBe(true);
    expect(restoreCanvasEligibleAcrossAllPages(canvas([browser('browser', 'other')]))).toBe(true);
  });

  it('rejects an empty canvas or multiple browsers, including on other pages', () => {
    expect(restoreCanvasEligibleAcrossAllPages(canvas([]))).toBe(false);
    expect(restoreCanvasEligibleAcrossAllPages(canvas([browser(), browser('second')]))).toBe(false);
    expect(restoreCanvasEligibleAcrossAllPages(canvas([browser(), browser('second', 'other')]))).toBe(false);
  });

  const otherNodes: CanvasNode[] = [
    { ...browser('artifact', 'other'), kind: 'artifact', content: { artifactId: 'artifact', title: 'Artifact' } },
    { ...browser('text', 'other'), kind: 'text', content: { text: 'Text', size: 'small' } },
    { ...browser('image', 'other'), kind: 'image', content: { imageId: 'image', name: 'Image', originalWidth: 800, originalHeight: 600 } },
    { ...browser('section', 'other'), kind: 'section', content: {} },
  ];

  for (const node of otherNodes) {
    it(`rejects a ${node.kind} alone or alongside a browser`, () => {
      expect(restoreCanvasEligibleAcrossAllPages(canvas([node]))).toBe(false);
      expect(restoreCanvasEligibleAcrossAllPages(canvas([browser(), node]))).toBe(false);
    });
  }

  it('rejects missing or malformed node collections and entries', () => {
    const malformed: unknown[] = [
      undefined,
      null,
      false,
      'canvas',
      {},
      { nodes: undefined },
      { nodes: null },
      { nodes: 'browser' },
      { nodes: 1 },
      { nodes: [] },
      { nodes: [browser()] },
      { nodes: { broken: null } },
      { nodes: { broken: undefined } },
      { nodes: { broken: 1 } },
      { nodes: { broken: {} } },
      { nodes: { broken: { kind: 'unknown' } } },
      { nodes: { browser: browser(), broken: null } },
    ];

    for (const doc of malformed) {
      expect(restoreCanvasEligibleAcrossAllPages(doc as CanvasDoc)).toBe(false);
    }
  });

  it('does not mutate a saved document', () => {
    const doc = canvas();
    const before = structuredClone(doc);
    Object.freeze(doc.nodes.browser);
    Object.freeze(doc.nodes);
    Object.freeze(doc);

    expect(restoreCanvasEligibleAcrossAllPages(doc)).toBe(true);
    expect(restoreCanvasEligibleAcrossAllPages(doc)).toBe(true);
    expect(doc).toEqual(before);
  });
});

describe('restoreWithinBudget', () => {
  it('uses a 15 percent inclusive memory limit', () => {
    expect(RESTORE_MEMORY_RATIO).toBe(1.15);
    expect(restoreWithinBudget(1000, 900)).toBe(true);
    expect(restoreWithinBudget(1000, 1000)).toBe(true);
    expect(restoreWithinBudget(1000, 1149.999)).toBe(true);
    expect(restoreWithinBudget(1000, 1150)).toBe(true);
    expect(restoreWithinBudget(1000, 1150.001)).toBe(false);
  });

  it('rejects invalid measurements in either position', () => {
    for (const invalid of [NaN, Infinity, -Infinity, 0, -0, -1]) {
      expect(restoreWithinBudget(invalid, 1000)).toBe(false);
      expect(restoreWithinBudget(1000, invalid)).toBe(false);
      expect(restoreWithinBudget(invalid, invalid)).toBe(false);
    }
  });

  it('accepts positive fractional measurements without rounding', () => {
    expect(restoreWithinBudget(1, 1.15)).toBe(true);
    expect(restoreWithinBudget(1, 1.150001)).toBe(false);
    expect(restoreWithinBudget(1000, Number.MIN_VALUE)).toBe(true);
  });

  it('does not retain a previous budget decision', () => {
    expect(restoreWithinBudget(1000, 1200)).toBe(false);
    expect(restoreWithinBudget(2000, 1200)).toBe(true);
    expect(restoreWithinBudget(1000, 1200)).toBe(false);
  });
});
