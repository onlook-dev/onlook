import { describe, expect, test } from 'bun:test';
import type { CanvasDoc, CanvasNode, CanvasPage } from '@studio/events';

import { pageDeleteRequest } from './pageConfirm.js';

const PAGES: CanvasPage[] = [
  { id: 'a', name: 'Checkout', order: 0 },
  { id: 'b', name: 'Settings', order: 1 },
];

function textNode(id: string, pageId: string): CanvasNode {
  return {
    id,
    pageId,
    kind: 'text',
    name: '',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    order: 0,
    content: { text: id, size: 'medium' },
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

describe('when deleting a page asks first', () => {
  test('a page holding three objects asks, and names the count', () => {
    const doc = docOf(PAGES, [textNode('n1', 'a'), textNode('n2', 'a'), textNode('n3', 'a')]);
    expect(pageDeleteRequest(doc, 'a')).toEqual({
      kind: 'ask',
      pageId: 'a',
      name: 'Checkout',
      nodeCount: 3,
    });
  });

  test('an empty page deletes with no prompt', () => {
    expect(pageDeleteRequest(docOf(PAGES, [textNode('n1', 'b')]), 'a')).toEqual({
      kind: 'delete',
      pageId: 'a',
      name: 'Checkout',
      nodeCount: 0,
    });
  });

  test('the count follows the tolerant read: a dangling page id sits on the first page', () => {
    const doc = docOf(PAGES, [textNode('n1', 'gone')]);
    expect(pageDeleteRequest(doc, 'a')).toMatchObject({ kind: 'ask', nodeCount: 1 });
    expect(pageDeleteRequest(doc, 'b')).toMatchObject({ kind: 'delete', nodeCount: 0 });
  });

  test('the last page is refused by the code the band words — a project keeps one', () => {
    expect(pageDeleteRequest(docOf([PAGES[0] as CanvasPage]), 'a')).toEqual({
      kind: 'refused',
      code: 'last-page',
    });
  });

  test('the last page that is not a divider is refused by its own code', () => {
    const doc = docOf([PAGES[0] as CanvasPage, { id: 'r', name: '---', order: 1 }]);
    expect(pageDeleteRequest(doc, 'a')).toEqual({
      kind: 'refused',
      code: 'last-non-divider-page',
    });
    expect(pageDeleteRequest(doc, 'r')).toMatchObject({ kind: 'delete', pageId: 'r' });
  });

  test('a page the document no longer holds is its own outcome, told apart from a refusal', () => {
    expect(pageDeleteRequest(docOf(PAGES), 'gone')).toEqual({ kind: 'gone' });
  });
});
