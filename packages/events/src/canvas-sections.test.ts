import { describe, expect, it } from 'bun:test';
import type { CanvasNode, SectionNode } from './canvas.js';
import { compareCanvasPaintOrder, isInsideSection, sectionMembersOnPage, withSectionContentsOnPage } from './canvas-sections.js';

const section: SectionNode = { id: 'section', kind: 'section', pageId: 'page', name: 'Explorations', x: 0, y: 0, width: 1000, height: 800, order: 10, content: {} };
const child: CanvasNode = { id: 'child', kind: 'browser', pageId: 'page', name: 'Frame', x: 100, y: 100, width: 400, height: 300, order: 0, content: { homeUrl: 'http://localhost:3000' } };

describe('spatial sections', () => {
  it('paints bigger sections behind smaller sections and all ordinary objects', () => {
    const nested = { ...section, id: 'nested', width: 800, height: 600, order: 0 };
    expect([child, nested, section].sort(compareCanvasPaintOrder).map((node) => node.id)).toEqual(['section', 'nested', 'child']);
  });
  it('includes fully enclosed same-page objects and strictly smaller sections', () => {
    const nested = { ...section, id: 'nested', x: 20, y: 20, width: 800, height: 600 };
    const partial = { ...child, id: 'partial', x: 900 };
    const offPage = { ...child, id: 'off-page', pageId: 'another' };
    const equal = { ...section, id: 'equal' };
    expect(sectionMembersOnPage([section, nested, child, partial, offPage, equal], section).map((node) => node.id)).toEqual(['nested', 'child']);
  });

  it('expands overlapping selected sections once and never crosses pages', () => {
    const nested = { ...section, id: 'nested', width: 800, height: 600 };
    const offPage = { ...child, id: 'off-page', pageId: 'another' };
    expect(withSectionContentsOnPage([section, nested, child, offPage], ['section', 'nested', 'child'])).toEqual(['section', 'nested', 'child']);
  });

  it('keeps non-section selections unchanged', () => {
    expect(withSectionContentsOnPage([section, child], ['child'])).toEqual(['child']);
  });
});

describe('the enclosure the sidebar and the canvas share', () => {
  const box = (id: string, x: number, y: number, width: number, height: number, isSection = false) =>
    ({ id, isSection, x, y, width, height });
  const outer = box('outer', 0, 0, 1000, 800, true);

  it('holds an object on its own edge and refuses one a pixel past it', () => {
    expect(isInsideSection(box('flush', 0, 0, 1000, 800), outer)).toBe(true);
    expect(isInsideSection(box('over', 1, 0, 1000, 800), outer)).toBe(false);
  });

  it('holds a strictly smaller section and refuses one of its own size', () => {
    expect(isInsideSection(box('inner', 0, 0, 1000, 799, true), outer)).toBe(true);
    expect(isInsideSection(box('twin', 0, 0, 1000, 800, true), outer)).toBe(false);
  });

  it('never lets two sections of one size hold each other', () => {
    const twin = box('twin', 0, 0, 1000, 800, true);
    expect(isInsideSection(twin, outer) || isInsideSection(outer, twin)).toBe(false);
  });

  it('holds nothing against itself', () => {
    expect(isInsideSection(outer, outer)).toBe(false);
  });
});
