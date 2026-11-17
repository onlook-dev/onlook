import { describe, expect, it } from 'bun:test';
import { NO_FRAME_QUOTES, nextCurrentPage } from '@studio/events';
import type { CanvasDoc, CanvasNode, CanvasOp, CanvasPageId } from '@studio/events';
import { applyEntryToMirror, composeCanvasNodes, composedPageId, type CompositionInput } from './readModel.js';

function node(id: string, pageId: CanvasPageId, order: number): CanvasNode {
  return {
    id,
    pageId,
    kind: 'text',
    name: id,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    order,
    content: { text: id, size: 'medium' },
  };
}

function docOf(nodes: CanvasNode[], pageIds: CanvasPageId[] = ['pg_a', 'pg_b']): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc-under-test',
    revision: 1,
    pages: Object.fromEntries(
      pageIds.map((id, order) => [id, { id, name: id, order }]),
    ),
    nodes: Object.fromEntries(nodes.map((candidate) => [candidate.id, candidate])),
  };
}

function inputOf(doc: CanvasDoc, currentPageId: CanvasPageId | null, sectionsEnabled = true): CompositionInput {
  return {
    doc,
    currentPageId,
    overlay: {},
    gesture: {},
    measured: {},
    selectedNodeIds: [],
    serverEntries: [],
    sectionsEnabled,
    frameQuotes: NO_FRAME_QUOTES,
  };
}

function artifactNode(id: string, pageId: CanvasPageId, order = 0): CanvasNode {
  return {
    id,
    pageId,
    kind: 'artifact',
    name: '',
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order,
    content: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing idea' },
  };
}

describe('the sections flag (ONL-2661)', () => {
  const section: CanvasNode = { ...node('section', 'pg_a', 2), kind: 'section', content: {}, width: 1000, height: 800 };
  const doc = docOf([section, node('child', 'pg_a', 0), node('loose', 'pg_a', 1)]);

  it('composes the Section and the objects on the page with the flag on', () => {
    expect(composeCanvasNodes(inputOf(doc, 'pg_a', true)).map((item) => item.id).sort()).toEqual(['child', 'loose', 'section']);
  });

  it('composes a stored Section away with the flag off and leaves what it held', () => {
    const result = composeCanvasNodes(inputOf(doc, 'pg_a', false));
    expect(result.map((item) => item.id).sort()).toEqual(['child', 'loose']);
    expect(result.every((item) => (item.zIndex ?? 0) >= 0)).toBe(true);
  });
});

describe('the kind dispatch (ONL-2568)', () => {
  it('paints outer sections behind inner sections even when the outer section was created last', () => {
    const inner: CanvasNode = { ...node('inner', 'pg_a', 1), kind: 'section', content: {}, width: 600, height: 500 };
    const outer: CanvasNode = { ...inner, id: 'outer', order: 2, width: 1000, height: 800 };
    const input = inputOf(docOf([inner, outer, node('child', 'pg_a', 0)]), 'pg_a');
    input.measured = { inner: { width: 500, height: 400 } };
    const result = composeCanvasNodes(input);
    expect(result.find((item) => item.id === 'outer')!.zIndex).toBeLessThan(result.find((item) => item.id === 'inner')!.zIndex!);
    expect(result.find((item) => item.id === 'inner')!.zIndex).toBeLessThan(result.find((item) => item.id === 'child')!.zIndex!);
    expect(result.find((item) => item.id === 'inner')!.width).toBe(600);
    expect(result.find((item) => item.id === 'inner')!.height).toBe(500);
  });
  it('round-trips pending copied homes through binding, undo and redo echoes', () => {
    const frame: CanvasNode = {
      id: 'copy', pageId: 'pg_a', kind: 'browser', name: '',
      x: 0, y: 0, width: 640, height: 480, order: 0,
      content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' },
    };
    let doc = docOf([frame]);
    const ops: CanvasOp[] = [
      { type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/products?sort=new#details' },
      { type: 'set-home-url', id: frame.id, homeUrl: 'about:blank', pendingHomeUrl: frame.content.pendingHomeUrl },
      { type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/products?sort=new#details', pendingHomeUrl: null },
    ];
    for (const [index, op] of ops.entries()) {
      const outcome = applyEntryToMirror(doc, {
        revision: doc.revision + 1, author: 'system', at: '2026-10-14T12:00:00.000Z', op, prior: { kind: 'none' },
      });
      if (outcome.kind !== 'applied') throw new Error('expected home echo');
      doc = outcome.doc;
      const restored = doc.nodes[frame.id];
      if (restored?.kind !== 'browser') throw new Error('expected browser');
      expect(restored.content).toEqual(index === 1 ? frame.content : { homeUrl: 'http://localhost:5182/products?sort=new#details' });
    }
  });

  it('rejects invalid pending-home restoration values without advancing the mirror', () => {
    const frame: CanvasNode = {
      id: 'copy', pageId: 'pg_a', kind: 'browser', name: '',
      x: 0, y: 0, width: 640, height: 480, order: 0, content: { homeUrl: 'about:blank' },
    };
    for (const pendingHomeUrl of ['', 42, false, {}]) {
      const doc = docOf([frame]);
      const outcome = applyEntryToMirror(doc, {
        revision: doc.revision + 1, author: 'system', at: '2026-10-14T12:00:00.000Z',
        op: { type: 'set-home-url', id: frame.id, homeUrl: 'about:blank', pendingHomeUrl } as CanvasOp,
        prior: { kind: 'none' },
      });
      expect(outcome.kind).toBe('gap');
      expect(doc.nodes[frame.id]).toEqual(frame);
    }
  });

  it('a pending copied Frame has a no-webview cover with an empty server book, and loses it atomically on binding (ONL-2515)', () => {
    const pending: CanvasNode = {
      id: 'copy-frame', pageId: 'pg_a', kind: 'browser', name: 'Details',
      x: 0, y: 0, width: 640, height: 480, order: 0,
      content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' },
    };
    const doc = docOf([pending]);
    const before = composeCanvasNodes(inputOf(doc, 'pg_a'))[0];
    if (before?.type !== 'frame') throw new Error('expected copied Frame');
    expect(before.data.serverCover).toBe('non-started');
    expect(before.data.homeUrl).toBe('about:blank');
    expect(before.data.currentUrl).toBe('http://localhost:4317/products?sort=new#details');
    const outcome = applyEntryToMirror(doc, {
      revision: doc.revision + 1, author: 'system', at: '2026-10-14T12:00:00.000Z',
      op: { type: 'set-home-url', id: pending.id, homeUrl: 'http://localhost:5182/products?sort=new#details' },
      prior: { kind: 'fields', id: pending.id, fields: { homeUrl: 'about:blank' } },
    });
    if (outcome.kind !== 'applied') throw new Error('expected binding echo');
    const rebound = outcome.doc.nodes[pending.id];
    if (rebound?.kind !== 'browser') throw new Error('expected rebound browser');
    expect(rebound.content.pendingHomeUrl).toBeUndefined();
    expect(rebound.content.homeUrl).toBe('http://localhost:5182/products?sort=new#details');
    const after = composeCanvasNodes(inputOf(outcome.doc, 'pg_a'))[0];
    if (after?.type !== 'frame') throw new Error('expected bound Frame');
    expect(after.data.homeUrl).toBe('http://localhost:5182/products?sort=new#details');
    expect(after.data.currentUrl).toBe('http://localhost:5182/products?sort=new#details');
    expect(after.data.serverCover).toBeUndefined();
  });

  it('composes an artifact node as its own type, carrying its id and title', () => {
    const composed = composeCanvasNodes(inputOf(docOf([artifactNode('a', 'pg_a')]), 'pg_a'));

    expect(composed).toHaveLength(1);
    expect(composed[0]?.type).toBe('artifact');
    expect(composed[0]?.data).toMatchObject({
      artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      title: 'Pricing idea',
    });
  });

  it('renders a kind this build does not know as nothing at all, never as a frame', () => {
    // The hazard the explicit dispatch exists for: the old fall-through read any unknown kind
    // as a browser node and mounted a `<webview>` against its absent homeUrl (ONL-2568).
    const alien = {
      id: 'x',
      pageId: 'pg_a',
      kind: 'hologram',
      name: 'from a newer build',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      order: 0,
      content: {},
    } as unknown as CanvasNode;

    const composed = composeCanvasNodes(inputOf(docOf([alien]), 'pg_a'));

    expect(composed).toEqual([]);
    expect(composed.some((flow) => flow.type === 'frame')).toBe(false);
  });

  it('keeps the recognised siblings of an unrecognised kind', () => {
    const alien = { ...artifactNode('x', 'pg_a'), kind: 'hologram' } as unknown as CanvasNode;
    const composed = composeCanvasNodes(
      inputOf(docOf([node('t', 'pg_a', 0), alien, artifactNode('a', 'pg_a', 2)]), 'pg_a'),
    );

    expect(composed.map((flow) => flow.id).sort()).toEqual(['a', 't']);
  });
});

describe('a frame quote on the composed canvas (ONL-2960)', () => {
  const frame = (id: string): CanvasNode => ({
    id, pageId: 'pg_a', kind: 'browser', name: id, x: 0, y: 0, width: 1512, height: 982, order: 0, content: { homeUrl: 'http://localhost:4712/' },
  });

  it('lands on the frame main named, with whether its turn runs, and on no other', () => {
    const composed = composeCanvasNodes({
      ...inputOf(docOf([frame('a'), frame('b')]), 'pg_a'),
      frameQuotes: { byFrame: { a: 'A bakery site', gone: 'Elsewhere' }, turnRunning: false },
    });
    expect(Object.fromEntries(composed.map((flow) => [flow.id, [flow.data['quote'], flow.data['quoteTurnRunning']]]))).toEqual({
      a: ['A bakery site', false],
      b: [undefined, undefined],
    });
  });
});

describe('a quote on a composed artifact (ONL-2960)', () => {
  it('lands on the artifact main named, with whether its turn runs, and lets go once it lifts', () => {
    const doc = docOf([artifactNode('a', 'pg_a'), artifactNode('b', 'pg_a', 1)]);
    const quoted = composeCanvasNodes({
      ...inputOf(doc, 'pg_a'),
      frameQuotes: { byFrame: { a: 'A pricing card for my plans' }, turnRunning: true },
    });
    expect(Object.fromEntries(quoted.map((flow) => [flow.id, [flow.data['quote'], flow.data['quoteTurnRunning']]]))).toEqual({
      a: ['A pricing card for my plans', true],
      b: [undefined, undefined],
    });

    const lifted = composeCanvasNodes(inputOf(doc, 'pg_a'), quoted);
    expect(lifted.find((flow) => flow.id === 'a')).not.toBe(quoted.find((flow) => flow.id === 'a'));
    expect(lifted.find((flow) => flow.id === 'a')?.data['quote']).toBeUndefined();
    expect(lifted.find((flow) => flow.id === 'b')).toBe(quoted.find((flow) => flow.id === 'b'));
  });
});

describe('composedPageId', () => {
  it('answers the first page when the current one is missing or dangling', () => {
    const doc = docOf([]);
    expect(composedPageId(doc, 'pg_b')).toBe('pg_b');
    expect(composedPageId(doc, 'pg_gone')).toBe('pg_a');
    expect(composedPageId(doc, null)).toBe('pg_a');
  });

  it('answers nothing for a document holding no pages, so nothing is filtered away', () => {
    expect(composedPageId(docOf([], []), 'pg_a')).toBeNull();
  });

  // Main's `resolveCurrentPage` walks `nextCurrentPage` too; the two sides naming different pages sends agent frames to a page nobody is watching (ONL-2488).
  it('leaves a divider through the rule main reads: the first page below it, else above', () => {
    const doc = docOf([], ['pg_a', 'pg_rule', 'pg_b']);
    doc.pages['pg_rule'] = { id: 'pg_rule', name: '---', order: 1 };

    expect(composedPageId(doc, 'pg_rule')).toBe('pg_b');
    expect(composedPageId(doc, 'pg_rule')).toBe(nextCurrentPage(doc, 'pg_rule')?.id ?? null);
  });
});

describe('composeCanvasNodes across pages', () => {
  it('returns only the current page, in its own stacking order', () => {
    const doc = docOf([
      node('b2', 'pg_b', 5),
      node('a1', 'pg_a', 1),
      node('b1', 'pg_b', 2),
    ]);

    expect(composeCanvasNodes(inputOf(doc, 'pg_a')).map((n) => n.id)).toEqual(['a1']);
    expect(composeCanvasNodes(inputOf(doc, 'pg_b')).map((n) => n.id)).toEqual(['b1', 'b2']);
  });

  it('keeps an unchanged node object across a recompose on the same page', () => {
    const doc = docOf([node('a1', 'pg_a', 1)]);
    const first = composeCanvasNodes(inputOf(doc, 'pg_a'));
    const second = composeCanvasNodes(inputOf(doc, 'pg_a'), first);

    expect(second).toBe(first);
    expect(second[0]).toBe(first[0]);
  });

  it('shows the same set on a page left and returned to', () => {
    const doc = docOf([node('a1', 'pg_a', 1), node('b1', 'pg_b', 2)]);
    const onA = composeCanvasNodes(inputOf(doc, 'pg_a'));
    const onB = composeCanvasNodes(inputOf(doc, 'pg_b'), onA);
    const backOnA = composeCanvasNodes(inputOf(doc, 'pg_a'), onB);

    expect(onB.map((n) => n.id)).toEqual(['b1']);
    expect(backOnA.map((n) => n.id)).toEqual(['a1']);
  });

  it('composes a node whose page the document does not hold onto the first page', () => {
    const doc = docOf([node('orphan', 'pg_gone', 1)]);

    expect(composeCanvasNodes(inputOf(doc, 'pg_a')).map((n) => n.id)).toEqual(['orphan']);
    expect(composeCanvasNodes(inputOf(doc, 'pg_b')).map((n) => n.id)).toEqual([]);
  });

  it('composes the first page when the current page names one the document dropped', () => {
    const doc = docOf([node('a1', 'pg_a', 1), node('b1', 'pg_b', 2)]);

    expect(composeCanvasNodes(inputOf(doc, 'pg_gone')).map((n) => n.id)).toEqual(['a1']);
  });
});
