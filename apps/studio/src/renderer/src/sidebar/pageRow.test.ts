import { describe, expect, test } from 'bun:test';
import { nextPageOrder } from '@studio/events';
import type { CanvasDoc, CanvasNode, CanvasPage, CanvasPageId } from '@studio/events';

import {
  currentAfterRename,
  nextPageName,
  orderForPageDrop,
  orderForPageStep,
  pageKeyIntent,
  pageRowFacts,
} from './pageRow.js';

function frameOn(id: string, pageId: CanvasPageId): CanvasNode {
  return {
    id,
    pageId,
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    order: 0,
    content: { homeUrl: 'http://localhost:3000' },
  };
}

function docOf(pages: CanvasPage[], nodes: CanvasNode[] = []): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc',
    revision: 1,
    pages: Object.fromEntries(pages.map((page) => [page.id, page])),
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

const PAGES: CanvasPage[] = [
  { id: 'a', name: 'Checkout', order: 0 },
  { id: 'b', name: '---', order: 1 },
  { id: 'c', name: 'Settings', order: 2 },
];

const ROWS = pageRowFacts(docOf(PAGES), 'a');

describe('what the pages section lists', () => {
  test('page order, the divider flagged, the current one marked', () => {
    expect(ROWS.map((row) => [row.id, row.isDivider, row.isCurrent])).toEqual([
      ['a', false, true],
      ['b', true, false],
      ['c', false, false],
    ]);
  });

  test('two pages may share a name, and only the one holding the id is current', () => {
    const rows = pageRowFacts(
      docOf([
        { id: 'a', name: 'Checkout', order: 0 },
        { id: 'b', name: 'Checkout', order: 1 },
      ]),
      'b',
    );
    expect(rows.map((row) => row.isCurrent)).toEqual([false, true]);
  });

  test('a page the document no longer holds leaves every row unselected', () => {
    expect(pageRowFacts(docOf(PAGES), 'gone').some((row) => row.isCurrent)).toBe(false);
  });

  test('only three dashes draw a rule, whatever whitespace they arrive in', () => {
    const rows = pageRowFacts(
      docOf([
        { id: 'a', name: '--', order: 0 },
        { id: 'b', name: '---', order: 1 },
        { id: 'c', name: '----', order: 2 },
        { id: 'd', name: '- - -', order: 3 },
        { id: 'e', name: '  ---\n', order: 4 },
      ]),
      null,
    );
    expect(rows.map((row) => row.isDivider)).toEqual([false, true, false, false, true]);
  });

  test('a divider never carries the current mark, whichever place it sits in', () => {
    const rows = pageRowFacts(
      docOf([
        { id: 'rule', name: '---', order: 0 },
        { id: 'a', name: 'Checkout', order: 1 },
      ]),
      'rule',
    );
    expect(rows.some((row) => row.isCurrent)).toBe(false);
  });

  test('the next page is named for the count plus one, and lands past the last order', () => {
    expect(nextPageName(docOf(PAGES))).toBe('Page 4');
    expect(nextPageOrder(docOf(PAGES))).toBe(3);
    expect(nextPageOrder(docOf([]))).toBe(0);
  });
});

describe('the agent working somewhere the user is not looking (ONL-2488)', () => {
  const doc = docOf(PAGES, [frameOn('one', 'a'), frameOn('two', 'c')]);

  test('the row of the page holding the worked frame signals, and no other does', () => {
    const rows = pageRowFacts(doc, 'a', { two: { working: true } });
    expect(rows.map((row) => [row.id, row.isWorking])).toEqual([
      ['a', false],
      ['b', false],
      ['c', true],
    ]);
  });

  test('work on the page already on screen signals nothing — the user can see it', () => {
    const rows = pageRowFacts(doc, 'a', { one: { working: true } });
    expect(rows.some((row) => row.isWorking)).toBe(false);
  });

  test('the signal clears when the user switches to that page', () => {
    const working = { two: { working: true } };
    expect(pageRowFacts(doc, 'a', working).find((row) => row.id === 'c')?.isWorking).toBe(true);
    expect(pageRowFacts(doc, 'c', working).find((row) => row.id === 'c')?.isWorking).toBe(false);
  });

  test('a frame nobody is working on, and a page with no frames, signal nothing', () => {
    expect(pageRowFacts(doc, 'a', { two: { working: false } }).some((row) => row.isWorking)).toBe(
      false,
    );
    expect(pageRowFacts(doc, 'a').some((row) => row.isWorking)).toBe(false);
  });

  test('a node whose page the document no longer holds signals the first page', () => {
    const stray = docOf(PAGES, [frameOn('lost', 'gone')]);
    expect(pageRowFacts(stray, 'c', { lost: { working: true } }).map((row) => row.isWorking)).toEqual(
      [true, false, false],
    );
  });
});

describe('the keyboard in the pages section', () => {
  test('the down arrow switches to the next page and skips a divider', () => {
    expect(pageKeyIntent(ROWS, 'a', { key: 'ArrowDown', altKey: false })).toEqual({
      kind: 'switch',
      pageId: 'c',
    });
  });

  test('the up arrow skips the divider on the way back', () => {
    expect(pageKeyIntent(ROWS, 'c', { key: 'ArrowUp', altKey: false })).toEqual({
      kind: 'switch',
      pageId: 'a',
    });
  });

  test('past the last page, and above the first, it authors nothing', () => {
    expect(pageKeyIntent(ROWS, 'c', { key: 'ArrowDown', altKey: false })).toBeNull();
    expect(pageKeyIntent(ROWS, 'a', { key: 'ArrowUp', altKey: false })).toBeNull();
  });

  test('option-down reorders the focused page one place later', () => {
    expect(pageKeyIntent(ROWS, 'a', { key: 'ArrowDown', altKey: true })).toEqual({
      kind: 'reorder',
      pageId: 'a',
      order: 1.5,
    });
  });

  test('option-down on the last page authors nothing', () => {
    expect(pageKeyIntent(ROWS, 'c', { key: 'ArrowDown', altKey: true })).toBeNull();
    expect(orderForPageStep(ROWS, 'c', 'later')).toBeNull();
    expect(orderForPageStep(ROWS, 'a', 'earlier')).toBeNull();
  });

  test('Enter starts a rename and Delete deletes', () => {
    expect(pageKeyIntent(ROWS, 'a', { key: 'Enter', altKey: false })).toEqual({
      kind: 'rename',
      pageId: 'a',
    });
    expect(pageKeyIntent(ROWS, 'a', { key: 'Delete', altKey: false })).toEqual({
      kind: 'delete',
      pageId: 'a',
    });
  });

  test('no focused row, and a key the section does not claim, author nothing', () => {
    expect(pageKeyIntent(ROWS, null, { key: 'ArrowDown', altKey: false })).toBeNull();
    expect(pageKeyIntent(ROWS, 'a', { key: 'k', altKey: false })).toBeNull();
  });
});

describe('a rename that turns the current page into a rule', () => {
  const doc = docOf(PAGES);

  test('moves current to the first page below that is not a rule', () => {
    expect(currentAfterRename(doc, 'a', '---', 'a')).toBe('c');
  });

  test('falls back to the first above when nothing below can be rested on', () => {
    expect(currentAfterRename(doc, 'c', '  ---  ', 'c')).toBe('a');
  });

  test('moves nobody when the renamed page is not the current one', () => {
    expect(currentAfterRename(doc, 'c', '---', 'a')).toBeNull();
  });

  test('moves nobody when the new name is an ordinary one, in either direction', () => {
    expect(currentAfterRename(doc, 'a', 'Cart', 'a')).toBeNull();
    expect(currentAfterRename(doc, 'b', 'Cart', 'a')).toBeNull();
    expect(currentAfterRename(doc, 'a', '----', 'a')).toBeNull();
  });

  test('moves nobody when this is the last page that is not a rule — the rename is refused', () => {
    const lastOne = docOf([
      { id: 'rule', name: '---', order: 0 },
      { id: 'a', name: 'Checkout', order: 1 },
    ]);
    expect(currentAfterRename(lastOne, 'a', '---', 'a')).toBeNull();
  });
});

describe('where a dragged page lands', () => {
  test('between its two new neighbours', () => {
    expect(orderForPageDrop(ROWS, 'c', 1)).toBe(0.5);
  });

  test('above the first row, and below the last', () => {
    expect(orderForPageDrop(ROWS, 'c', 0)).toBe(-1);
    expect(orderForPageDrop(ROWS, 'a', 3)).toBe(3);
  });

  test('dropped on either side of its own gap, nothing', () => {
    expect(orderForPageDrop(ROWS, 'b', 1)).toBeNull();
    expect(orderForPageDrop(ROWS, 'b', 2)).toBeNull();
  });
});
