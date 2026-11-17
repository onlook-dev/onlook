import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CanvasDoc, CanvasPage } from '@studio/events';
import { nextCurrentPage } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import {
  forgetCanvasCamera,
  readCanvasCamera,
  readCanvasPageCameras,
  readStoredCurrentPage,
  resetCanvasCameraCache,
  resolveCurrentPage,
  writeCanvasCamera,
  writeCurrentPage,
} from './camera.js';
import { emptyCanvasDoc, firstCanvasPageId } from './document.js';

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
let stateRoot: string;

const relaunch = resetCanvasCameraCache;

const quarantined = (): string[] =>
  readdirSync(stateRoot).filter((name) => name.includes('.corrupt-'));

const plantV1 = (byDoc: Record<string, unknown>): void => {
  writeFileSync(join(stateRoot, 'canvas-camera.json'), JSON.stringify({ version: 1, data: { byDoc } }));
};

const docWithPages = (docId: string, ...pages: CanvasPage[]): CanvasDoc => ({
  ...emptyCanvasDoc(docId),
  pages: Object.fromEntries(pages.map((page) => [page.id, page])),
});

beforeEach(() => {
  resetCanvasCameraCache();
  stateRoot = makeStateRoot({ name: 'canvas-camera' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
});

afterAll(() => {
  resetCanvasCameraCache();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

describe('canvas camera persistence', () => {
  it('brings back each page of each document independently, and no camera for a page never left', () => {
    writeCanvasCamera('doc_a', 'page_1', { x: -120, y: 48, zoom: 0.5 });
    writeCanvasCamera('doc_a', 'page_2', { x: 300, y: -20, zoom: 1.25 });
    writeCanvasCamera('doc_b', 'page_1', { x: 7, y: 7, zoom: 2 });
    writeCanvasCamera('doc_a', 'page_1', { x: -240, y: 96, zoom: 0.75 });

    relaunch();

    expect(readCanvasCamera('doc_a', 'page_1')).toEqual({ x: -240, y: 96, zoom: 0.75 });
    expect(readCanvasCamera('doc_a', 'page_2')).toEqual({ x: 300, y: -20, zoom: 1.25 });
    expect(readCanvasCamera('doc_b', 'page_1')).toEqual({ x: 7, y: 7, zoom: 2 });
    expect(readCanvasCamera('doc_a', 'page_3')).toBeUndefined();
    expect(readCanvasCamera('doc_c', 'page_1')).toBeUndefined();
  });

  it("carries a viewport written before pages onto that document's first page, and keeps it", () => {
    plantV1({ doc_a: { x: -240, y: 96, zoom: 0.75 }, doc_b: { x: 12, y: 0, zoom: 2 } });

    expect(readCanvasCamera('doc_a', firstCanvasPageId('doc_a'))).toEqual({ x: -240, y: 96, zoom: 0.75 });
    // The salvaged value is written straight back over the file; a second read proves what landed.
    relaunch();
    expect(readCanvasCamera('doc_a', firstCanvasPageId('doc_a'))).toEqual({ x: -240, y: 96, zoom: 0.75 });
    expect(readCanvasCamera('doc_b', firstCanvasPageId('doc_b'))).toEqual({ x: 12, y: 0, zoom: 2 });
    expect(readCanvasCamera('doc_a', 'page_other')).toBeUndefined();
    expect(quarantined()).toEqual([]);
  });

  it('leaves a file from a newer version in place without reading or changing it', () => {
    const bytes = JSON.stringify({ version: 99, data: { byDoc: { doc_a: { byPage: {} } } } });
    writeFileSync(
      join(stateRoot, 'canvas-camera.json'),
      bytes,
    );

    expect(readCanvasCamera('doc_a', 'page_1')).toBeUndefined();
    expect(quarantined()).toHaveLength(0);
    writeCanvasCamera('doc_a', 'page_1', { x: 10, y: 10, zoom: 1 });
    expect(readFileSync(join(stateRoot, 'canvas-camera.json'), 'utf8')).toBe(bytes);
  });

  it('never saves a camera the canvas cannot be panned back from, nor restores one found on disk', () => {
    writeCanvasCamera('doc_a', 'page_1', { x: 10, y: 20, zoom: 1 });
    for (const zoom of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      writeCanvasCamera('doc_a', 'page_1', { x: 0, y: 0, zoom });
    }
    writeCanvasCamera('doc_a', 'page_1', { x: Number.NaN, y: 0, zoom: 1 });
    expect(readCanvasCamera('doc_a', 'page_1')).toEqual({ x: 10, y: 20, zoom: 1 });

    relaunch();
    writeFileSync(
      join(stateRoot, 'canvas-camera.json'),
      JSON.stringify({
        version: 2,
        data: {
          byDoc: {
            doc_a: {
              byPage: { page_1: { x: 0, y: 0, zoom: 0 }, page_2: { x: -5, y: 5, zoom: 1 } },
            },
            doc_b: { byPage: { page_1: { x: null, y: 0, zoom: 1 } } },
          },
        },
      }),
    );
    relaunch();

    // Refused per page: one unreadable viewport never costs the page beside it.
    expect(readCanvasCamera('doc_a', 'page_1')).toBeUndefined();
    expect(readCanvasCamera('doc_a', 'page_2')).toEqual({ x: -5, y: 5, zoom: 1 });
    expect(readCanvasCamera('doc_b', 'page_1')).toBeUndefined();
  });

  it('forgets every page of a document at once', () => {
    writeCanvasCamera('doc_a', 'page_1', { x: 1, y: 1, zoom: 1 });
    writeCanvasCamera('doc_a', 'page_2', { x: 2, y: 2, zoom: 1 });
    writeCurrentPage('doc_a', 'page_2');
    writeCanvasCamera('doc_b', 'page_1', { x: 3, y: 3, zoom: 1 });

    forgetCanvasCamera('doc_a');
    relaunch();

    expect(readCanvasCamera('doc_a', 'page_1')).toBeUndefined();
    expect(readCanvasCamera('doc_a', 'page_2')).toBeUndefined();
    expect(readStoredCurrentPage('doc_a')).toBeUndefined();
    expect(readCanvasCamera('doc_b', 'page_1')).toEqual({ x: 3, y: 3, zoom: 1 });
  });

  it('hands the renderer every page it has a camera for, and invents none for the rest', () => {
    writeCanvasCamera('doc_a', 'page_1', { x: -240, y: 96, zoom: 0.75 });
    writeCanvasCamera('doc_a', 'page_2', { x: 300, y: -20, zoom: 1.25 });
    writeCanvasCamera('doc_b', 'page_1', { x: 7, y: 7, zoom: 2 });

    relaunch();

    expect(readCanvasPageCameras('doc_a')).toEqual({
      page_1: { x: -240, y: 96, zoom: 0.75 },
      page_2: { x: 300, y: -20, zoom: 1.25 },
    });
    expect(readCanvasPageCameras('doc_c')).toEqual({});
  });

  it('leaves out a page whose stored camera the canvas cannot be panned back from', () => {
    writeFileSync(
      join(stateRoot, 'canvas-camera.json'),
      JSON.stringify({
        version: 2,
        data: {
          byDoc: {
            doc_a: { byPage: { page_1: { x: 0, y: 0, zoom: 0 }, page_2: { x: -5, y: 5, zoom: 1 } } },
          },
        },
      }),
    );
    relaunch();

    expect(readCanvasPageCameras('doc_a')).toEqual({ page_2: { x: -5, y: 5, zoom: 1 } });
  });

  it("brings back the page the user left, and keeps it beside that page's camera", () => {
    writeCanvasCamera('doc_a', 'page_2', { x: 4, y: 4, zoom: 1 });
    writeCurrentPage('doc_a', 'page_2');

    relaunch();

    expect(readStoredCurrentPage('doc_a')).toBe('page_2');
    expect(readCanvasCamera('doc_a', 'page_2')).toEqual({ x: 4, y: 4, zoom: 1 });
    expect(readStoredCurrentPage('doc_b')).toBeUndefined();
  });
});

describe('the current page a document can rest on', () => {
  const first: CanvasPage = { id: 'page_1', name: 'Home', order: 0 };
  const second: CanvasPage = { id: 'page_2', name: 'Settings', order: 1 };
  const divider: CanvasPage = { id: 'page_rule', name: '---', order: -1 };

  it('keeps a hint the document still holds', () => {
    expect(resolveCurrentPage(docWithPages('doc_a', first, second), 'page_2')).toBe('page_2');
  });

  it('falls back to the lowest-order page the document does hold', () => {
    expect(resolveCurrentPage(docWithPages('doc_a', second, first), 'page_gone')).toBe('page_1');
    expect(resolveCurrentPage(docWithPages('doc_a', second, first), undefined)).toBe('page_1');
  });

  it('never rests on a divider, whichever place it sits in', () => {
    const doc = docWithPages('doc_a', divider, first, second);
    expect(resolveCurrentPage(doc, 'page_rule')).toBe('page_1');
    expect(resolveCurrentPage(doc, undefined)).toBe('page_1');
  });

  // The renderer's `composedPageId` walks `nextCurrentPage` too; main answering anything else stamps agent frames onto a page nobody is watching (ONL-2488).
  it('leaves a divider hint through the rule the renderer reads: the first page below it, else above', () => {
    const doc = docWithPages(
      'doc_a',
      first,
      { id: 'page_rule', name: '---', order: 1 },
      { ...second, order: 2 },
    );

    expect(resolveCurrentPage(doc, 'page_rule')).toBe('page_2');
    expect(resolveCurrentPage(doc, 'page_rule')).toBe(nextCurrentPage(doc, 'page_rule')?.id);
  });

  it('answers nothing for a document holding no page it can rest on', () => {
    expect(resolveCurrentPage(emptyCanvasDoc('doc_a'), 'page_1')).toBeUndefined();
    expect(resolveCurrentPage(docWithPages('doc_a', divider), undefined)).toBeUndefined();
  });
});
