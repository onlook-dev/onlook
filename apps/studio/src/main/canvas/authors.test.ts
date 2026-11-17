import { describe, expect, it } from 'bun:test';
import { PLACEMENT_GAP, type CanvasDoc, type CanvasNode, type CanvasOp } from '@studio/events';
import {
  createFramePlacement,
  portFollowOps,
  resolveCreateFrameOps,
  resolveCreateArtifactOps,
  resolveCreatePageOps,
  resolveCreateTextOps,
  resolveDeletePageOps,
  resolveMoveFrameOps,
  resolveMoveNodesToPageOps,
  resolveRenamePageOps,
  resolveReorderPageOps,
} from './authors.js';

const CHECKOUT = 'pg_checkout';
const SETTINGS = 'pg_settings';
const RULE = 'pg_rule';

function frame(
  id: string,
  pageId: string,
  x: number,
  order: number,
  homeUrl = 'http://localhost:3000/',
): CanvasNode {
  return {
    id,
    pageId,
    kind: 'browser',
    name: id,
    x,
    y: 0,
    width: 400,
    height: 300,
    order,
    content: { homeUrl },
  };
}

function docOf(nodes: CanvasNode[], pageIds: string[] = [CHECKOUT, SETTINGS]): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc_pages',
    revision: 1,
    pages: Object.fromEntries(
      pageIds.map((id, order) => [id, { id, name: id === RULE ? '---' : id, order }]),
    ),
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

const ops = (resolved: CanvasOp[] | { reason: string }): CanvasOp[] => {
  if (!Array.isArray(resolved)) throw new Error(`expected ops, got: ${resolved.reason}`);
  return resolved;
};

it('places artifacts at remembered dimensions before finding a landing beside another node', () => {
  const doc = docOf([frame('anchor', CHECKOUT, 0, 0)]);
  const request = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Study', pagePath: 'pages/index.html', beside: 'anchor', side: 'left' as const };
  const remembered = ops(resolveCreateArtifactOps(doc, { ...request, dimensions: { width: 900, height: 500 } }));
  expect(remembered[0]).toMatchObject({ type: 'create', node: { x: -900 - PLACEMENT_GAP, width: 900, height: 500, pageId: CHECKOUT } });
  expect(ops(resolveCreateArtifactOps(doc, request))[0]).toMatchObject({ node: { width: 480, height: 640 } });
});

const refusal = (resolved: CanvasOp[] | { reason: string }): string => {
  if (Array.isArray(resolved)) throw new Error('expected a refusal');
  return resolved.reason;
};

describe('agent placement is computed inside the target page (ONL-2488)', () => {
  it('uses the authored text width for the initial box, wrapping and beside placement', () => {
    const doc = docOf([frame('anchor', CHECKOUT, 1000, 0)]);
    const created = ops(resolveCreateTextOps(doc, {
      text: 'A narrow label', width: 240, beside: 'anchor', side: 'left', mintId: () => 'label',
    }));
    expect(created[0]).toMatchObject({ node: {
      x: 1000 - PLACEMENT_GAP - 240, width: 240,
      content: { text: 'A narrow label', size: 'medium', wrapWidth: 240 },
    } });
  });

  it('rejects invalid text widths before authoring a node', () => {
    for (const width of [0, -1, NaN, Infinity, -Infinity]) {
      expect(refusal(resolveCreateTextOps(docOf([]), { text: 'Label', width }))).toContain('width');
    }
  });

  it('keeps automatic text sizing when width is omitted', () => {
    expect(ops(resolveCreateTextOps(docOf([]), { text: 'Label' }))[0]).toMatchObject({
      node: { width: 480, content: { text: 'Label', size: 'medium' } },
    });
    const created = ops(resolveCreateTextOps(docOf([]), { text: 'Label' }))[0];
    if (created?.type !== 'create' || created.node.kind !== 'text') throw new Error('expected text');
    expect(created.node.content.wrapWidth).toBeUndefined();
  });

  it('parks a pending frame on its url, and refuses pending on a copy or a section (ONL-2960)', () => {
    const doc = docOf([frame('a', CHECKOUT, 0, 0)]);
    expect(ops(resolveCreateFrameOps(doc, { url: '5173', pending: true, mintId: () => 'new' }))[0]).toMatchObject({
      node: { content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:5173/' } },
    });
    expect(refusal(resolveCreateFrameOps(doc, { fromFrameId: 'a', pending: true }))).toContain('pending');
    expect(refusal(resolveCreateFrameOps(doc, { kind: 'section', pending: true }))).toContain('pending');
  });

  it('tiles from the target page’s own objects, not from a far-right frame on another page', () => {
    const doc = docOf([frame('far', CHECKOUT, 9000, 0)]);

    const created = ops(resolveCreateFrameOps(doc, { url: '3000', pageId: SETTINGS, mintId: () => 'new' }));
    const op = created[0];
    if (op?.type !== 'create') throw new Error('expected a create');

    expect(op.node.pageId).toBe(SETTINGS);
    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 0, y: 0 });
  });

  it('counts the stack from the target page, so the first object on an empty page is order 0', () => {
    const doc = docOf([frame('a', CHECKOUT, 0, 0), frame('b', CHECKOUT, 600, 7)]);

    const written = ops(resolveCreateTextOps(doc, { text: 'Settings', pageId: SETTINGS, mintId: () => 'txt' }));
    expect(written[0]).toMatchObject({ node: { pageId: SETTINGS, order: 0 } });
  });

  it('dodges only the target page’s objects when placing beside', () => {
    const anchor = frame('anchor', SETTINGS, 0, 0);
    // Sits exactly where `beside` lands, but on another page: it must not push the new frame along.
    const decoy = frame('decoy', CHECKOUT, anchor.width + PLACEMENT_GAP, 0);
    const doc = docOf([anchor, decoy]);

    const created = ops(
      resolveCreateFrameOps(doc, { url: '3000', beside: 'anchor', mintId: () => 'new' }),
    );
    const op = created[0];
    if (op?.type !== 'create') throw new Error('expected a create');

    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: anchor.width + PLACEMENT_GAP, y: 0 });
  });

  it('reports overlaps from the target page only', () => {
    const placed = frame('placed', SETTINGS, 0, 0);
    const sibling = frame('sibling', SETTINGS, 100, 1);
    const elsewhere = frame('elsewhere', CHECKOUT, 100, 0);
    const doc = docOf([placed, sibling, elsewhere]);

    const report = createFramePlacement(doc, placed, { url: '3000' }, undefined);

    expect(report.overlaps.map((other) => other.id)).toEqual(['sibling']);
  });

  it('refuses a `beside` anchor that lives on a different page than the page named', () => {
    const doc = docOf([frame('anchor', CHECKOUT, 0, 0)]);

    expect(
      refusal(resolveCreateFrameOps(doc, { url: '3000', beside: 'anchor', pageId: SETTINGS })),
    ).toContain('another page');
    expect(
      refusal(resolveMoveFrameOps(docOf([frame('anchor', CHECKOUT, 0, 0), frame('mover', SETTINGS, 0, 0)]), {
        frameId: 'mover',
        beside: 'anchor',
      })),
    ).toContain('another page');
  });

  it('refuses a page id naming no page, and a divider, rather than redirecting the write', () => {
    const doc = docOf([frame('a', CHECKOUT, 0, 0)], [CHECKOUT, SETTINGS, RULE]);

    expect(refusal(resolveCreateTextOps(doc, { text: 'x', pageId: 'pg_gone' }))).toContain('pg_gone');
    expect(refusal(resolveCreateFrameOps(doc, { url: '3000', pageId: 'pg_gone' }))).toContain('pg_gone');
    expect(refusal(resolveCreateTextOps(doc, { text: 'x', pageId: RULE }))).toContain('divider');
  });
});

describe('a moved dev-server port re-homes every page (ONL-2488)', () => {
  it('follows the port on frames the user is not looking at', () => {
    const here = frame('here', CHECKOUT, 0, 0, 'http://localhost:3000/');
    const away = frame('away', SETTINGS, 0, 0, 'http://localhost:3000/cart');
    const other = frame('other', SETTINGS, 0, 1, 'http://localhost:4000/');

    expect(portFollowOps(docOf([here, away, other]), 3000, 5173).map((op) => ('id' in op ? op.id : ''))).toEqual([
      'here',
      'away',
    ]);
  });
});

describe('the page verbs (ONL-2488)', () => {
  it('mints a page after the last one, and takes a second page of the same name', () => {
    const doc = docOf([]);
    const created = ops(resolveCreatePageOps(doc, { name: 'Checkout', mintId: () => 'pg_new' }));

    expect(created).toEqual([
      { type: 'create-page', page: { id: 'pg_new', name: 'Checkout', order: 2 } },
    ]);
    expect(ops(resolveCreatePageOps(doc, { name: CHECKOUT, mintId: () => 'pg_twin' }))).toHaveLength(1);
    expect(refusal(resolveCreatePageOps(doc, { name: '   ' }))).toContain('empty');
  });

  it('renames a page, and `---` is an ordinary rename the reducer judges', () => {
    const doc = docOf([]);
    expect(ops(resolveRenamePageOps(doc, { pageId: SETTINGS, name: '---' }))).toEqual([
      { type: 'rename-page', pageId: SETTINGS, name: '---' },
    ]);
    expect(refusal(resolveRenamePageOps(doc, { pageId: 'pg_gone', name: 'x' }))).toContain('pg_gone');
  });

  it('reorders a page to either end and one step either way, and says when it is already there', () => {
    const doc = docOf([]);
    expect(ops(resolveReorderPageOps(doc, { pageId: SETTINGS, position: 'first' }))).toEqual([
      { type: 'reorder-page', pageId: SETTINGS, order: -1 },
    ]);
    expect(ops(resolveReorderPageOps(doc, { pageId: CHECKOUT, position: 'last' }))).toEqual([
      { type: 'reorder-page', pageId: CHECKOUT, order: 2 },
    ]);
    expect(refusal(resolveReorderPageOps(doc, { pageId: CHECKOUT, position: 'earlier' }))).toContain('first');
  });

  it('deletes a populated page as its nodes then the page, and keeps the last page', () => {
    const doc = docOf([frame('a', SETTINGS, 0, 0), frame('b', SETTINGS, 600, 1), frame('c', CHECKOUT, 0, 0)]);

    expect(ops(resolveDeletePageOps(doc, { pageId: SETTINGS }))).toEqual([
      { type: 'remove', id: 'a' },
      { type: 'remove', id: 'b' },
      { type: 'remove-page', pageId: SETTINGS },
    ]);
    expect(ops(resolveDeletePageOps(docOf([], [CHECKOUT, SETTINGS]), { pageId: CHECKOUT }))).toEqual([
      { type: 'remove-page', pageId: CHECKOUT },
    ]);
    expect(refusal(resolveDeletePageOps(docOf([], [CHECKOUT]), { pageId: CHECKOUT }))).toContain('last page');
  });

  it('keeps the last page that is not a divider, and still takes the divider beside it', () => {
    const doc = docOf([], [CHECKOUT, RULE]);

    expect(refusal(resolveDeletePageOps(doc, { pageId: CHECKOUT }))).toContain('not a divider');
    expect(ops(resolveDeletePageOps(doc, { pageId: RULE }))).toEqual([
      { type: 'remove-page', pageId: RULE },
    ]);
  });

  it('moves objects onto a page, and one unknown id moves nothing', () => {
    const doc = docOf([frame('a', CHECKOUT, 0, 0), frame('b', CHECKOUT, 600, 1)], [CHECKOUT, SETTINGS, RULE]);

    expect(ops(resolveMoveNodesToPageOps(doc, { nodeIds: ['a', 'b'], pageId: SETTINGS }))).toEqual([
      { type: 'set-node-page', id: 'a', pageId: SETTINGS },
      { type: 'set-node-page', id: 'b', pageId: SETTINGS },
    ]);
    expect(refusal(resolveMoveNodesToPageOps(doc, { nodeIds: ['a', 'ghost'], pageId: SETTINGS }))).toContain('ghost');
    expect(refusal(resolveMoveNodesToPageOps(doc, { nodeIds: ['a'], pageId: RULE }))).toContain('divider');
    expect(refusal(resolveMoveNodesToPageOps(doc, { nodeIds: ['a'], pageId: 'pg_gone' }))).toContain('pg_gone');
  });
});
