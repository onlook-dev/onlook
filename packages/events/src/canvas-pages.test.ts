import { describe, expect, it } from 'bun:test';
import {
  canvasPages,
  firstRestingPageId,
  isDividerName,
  isDividerPage,
  isLastNonDividerPage,
  nextCurrentPage,
  nodesOnPage,
  resolveNodePageId,
} from './canvas-pages.js';
import type { CanvasDoc, CanvasNode, CanvasPage } from './canvas.js';

const page = (id: string, name: string, order: number): CanvasPage => ({ id, name, order });

const node = (id: string, pageId: string): CanvasNode => ({
  id,
  pageId,
  kind: 'text',
  name: '',
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  order: 0,
  content: { text: id, size: 'medium' },
});

function docOf(pages: CanvasPage[], nodes: CanvasNode[] = []): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc-under-test',
    revision: 1,
    pages: Object.fromEntries(pages.map((one) => [one.id, one])),
    nodes: Object.fromEntries(nodes.map((one) => [one.id, one])),
  };
}

describe('the page list', () => {
  it('ranks by order, breaking a tie on id', () => {
    const doc = docOf([page('b', 'B', 1), page('a', 'A', 1), page('c', 'C', 0.5)]);
    expect(canvasPages(doc).map((one) => one.id)).toEqual(['c', 'a', 'b']);
  });

  it('answers an empty list for a document that carries no pages', () => {
    expect(canvasPages({ ...docOf([]), pages: undefined as never })).toEqual([]);
  });
});

describe('a divider page', () => {
  it('is exactly three dashes once trimmed; two and four are ordinary names', () => {
    expect(isDividerName('---')).toBe(true);
    expect(isDividerName('  ---  ')).toBe(true);
    expect(isDividerName('--')).toBe(false);
    expect(isDividerName('----')).toBe(false);
    expect(isDividerName('')).toBe(false);
  });

  it('is still a page: it has an id and an order and it holds nodes', () => {
    const doc = docOf([page('pg_1', '---', 0)], [node('tx_1', 'pg_1')]);
    expect(isDividerPage(doc.pages['pg_1']!)).toBe(true);
    expect(nodesOnPage(doc, 'pg_1').map((one) => one.id)).toEqual(['tx_1']);
  });
});

describe('the tolerant read of a node’s page', () => {
  it('answers the node’s own page when the document holds it', () => {
    const doc = docOf([page('pg_1', 'A', 0), page('pg_2', 'B', 1)], [node('tx_1', 'pg_2')]);
    expect(resolveNodePageId(doc, doc.nodes['tx_1']!)).toBe('pg_2');
    expect(nodesOnPage(doc, 'pg_2').map((one) => one.id)).toEqual(['tx_1']);
  });

  it('falls to the first page for a dangling or missing one, rather than dropping the node', () => {
    const doc = docOf([page('pg_1', 'A', 0), page('pg_2', 'B', 1)], [node('tx_1', 'pg_gone')]);
    expect(resolveNodePageId(doc, doc.nodes['tx_1']!)).toBe('pg_1');
    expect(nodesOnPage(doc, 'pg_1').map((one) => one.id)).toEqual(['tx_1']);
  });

  it('leaves a node where it is when the document names no page at all', () => {
    const doc = docOf([], [node('tx_1', 'pg_legacy')]);
    expect(resolveNodePageId(doc, doc.nodes['tx_1']!)).toBe('pg_legacy');
    expect(nodesOnPage(doc, 'pg_legacy').map((one) => one.id)).toEqual(['tx_1']);
  });
});

describe('the first page a reader rests on and a writer lands on', () => {
  it('goes to the first page in order', () => {
    expect(firstRestingPageId(docOf([page('pg_2', 'B', 1), page('pg_1', 'A', 0)]))).toBe('pg_1');
  });

  it('answers the empty id a page-less document has, which is what the reducer refuses', () => {
    expect(firstRestingPageId(docOf([]))).toBe('');
  });

  it('skips a divider, taking one only where every page is one', () => {
    expect(firstRestingPageId(docOf([page('pg_rule', '---', 0), page('pg_1', 'A', 1)]))).toBe('pg_1');
    expect(firstRestingPageId(docOf([page('pg_rule', '---', 0)]))).toBe('pg_rule');
  });
});

describe('the page a project keeps', () => {
  it('is the one non-divider left, and never a divider whatever sits beside it', () => {
    const withRule = docOf([page('pg_1', 'A', 0), page('pg_rule', '---', 1)]);
    expect(isLastNonDividerPage(withRule, page('pg_1', 'A', 0))).toBe(true);
    expect(isLastNonDividerPage(withRule, page('pg_rule', '---', 1))).toBe(false);

    const twoPages = docOf([page('pg_1', 'A', 0), page('pg_2', 'B', 1)]);
    expect(isLastNonDividerPage(twoPages, page('pg_1', 'A', 0))).toBe(false);
  });
});

describe('which page current moves to', () => {
  const doc = (): CanvasDoc =>
    docOf([
      page('pg_top', 'Top', 0),
      page('pg_rule', '---', 1),
      page('pg_mid', 'Middle', 2),
      page('pg_tail', '---', 3),
    ]);

  it('takes the first non-divider below', () => {
    expect(nextCurrentPage(doc(), 'pg_top')?.id).toBe('pg_mid');
  });

  it('falls back above when nothing below qualifies', () => {
    expect(nextCurrentPage(doc(), 'pg_tail')?.id).toBe('pg_mid');
  });

  it('answers nothing when every page is a divider', () => {
    expect(nextCurrentPage(docOf([page('pg_1', '---', 0)]), 'pg_1')).toBeUndefined();
  });
});
