import { describe, expect, it } from 'bun:test';
import { canvasStack, resolveStackOps, type StackPosition } from './canvas-stack.js';
import { defaultTextBox, type CanvasDoc, type CanvasNode, type CanvasPage } from './canvas.js';

const MAIN = 'pg_main';
const OTHER = 'pg_other';

function browser(id: string, order: number, pageId = MAIN): CanvasNode {
  return {
    id,
    pageId,
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
    order,
    content: { homeUrl: 'http://localhost:3000/' },
  };
}

function label(id: string, order: number, pageId = MAIN): CanvasNode {
  return {
    id,
    pageId,
    kind: 'text',
    name: id,
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order,
    content: { text: 'a note', size: 'medium' },
  };
}

function picture(id: string, order: number, pageId = MAIN): CanvasNode {
  return {
    id,
    pageId,
    kind: 'image',
    name: id,
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    order,
    content: { imageId: `img_${id}`, name: `${id}.png`, originalWidth: 640, originalHeight: 400 },
  };
}

const page = (id: string, order: number): CanvasPage => ({ id, name: id, order });

function docOf(nodes: CanvasNode[]): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc-under-test',
    revision: 1,
    pages: { [MAIN]: page(MAIN, 0), [OTHER]: page(OTHER, 1) },
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

/** One of every kind, so no answer can depend on what a node holds. */
const mixed = (): CanvasDoc =>
  docOf([browser('back', 0), label('middle', 1), picture('upper', 2), browser('front', 4)]);

function orderOf(doc: CanvasDoc, id: string, position: StackPosition): number {
  const outcome = resolveStackOps(doc, id, position);
  if (outcome === null || !Array.isArray(outcome)) {
    throw new Error(`expected ops, got ${JSON.stringify(outcome)}`);
  }
  const op = outcome[0];
  if (op?.type !== 'reorder') throw new Error('expected one reorder op');
  return op.order;
}

function refusalOf(doc: CanvasDoc, id: string, position: StackPosition): string {
  const outcome = resolveStackOps(doc, id, position);
  if (outcome === null || Array.isArray(outcome)) throw new Error('expected a refusal');
  return outcome.reason;
}

describe('the canvas stack', () => {
  it('ranks back to front, breaking a tie on order by id', () => {
    const doc = docOf([browser('b', 1), label('a', 1), picture('c', 0)]);
    expect(canvasStack(doc, MAIN).map((node) => node.id)).toEqual(['c', 'a', 'b']);
  });

  it('sends to back below every node and brings to front above every node', () => {
    expect(orderOf(mixed(), 'middle', 'front')).toBe(5);
    expect(orderOf(mixed(), 'upper', 'back')).toBe(-1);
  });

  it('passes exactly one neighbour going forward or backward, landing between it and the next', () => {
    expect(orderOf(mixed(), 'back', 'forward')).toBe(1.5);
    expect(orderOf(mixed(), 'front', 'backward')).toBe(1.5);
  });

  it('steps one beyond the last neighbour when there is nothing past it', () => {
    expect(orderOf(mixed(), 'upper', 'forward')).toBe(5);
    expect(orderOf(mixed(), 'middle', 'backward')).toBe(-1);
  });

  it('refuses to raise the top node or sink the bottom one, naming no frame', () => {
    for (const position of ['front', 'forward'] as const) {
      expect(refusalOf(mixed(), 'front', position)).not.toContain('frame');
    }
    for (const position of ['back', 'backward'] as const) {
      expect(refusalOf(mixed(), 'back', position)).not.toContain('frame');
    }
  });

  it('answers nothing for an id the document does not hold, so each caller words its own refusal', () => {
    expect(resolveStackOps(mixed(), 'ghost', 'front')).toBeNull();
  });

  it('refuses Section stacking and skips Section backgrounds when stepping between objects', () => {
    const doc = docOf([
      browser('back', 0),
      { id: 'section', pageId: MAIN, kind: 'section', name: 'Explorations', x: 0, y: 0, width: 1600, height: 1200, order: 1, content: {} },
      browser('front', 2),
    ]);
    for (const position of ['front', 'back', 'forward', 'backward'] as const) {
      expect(resolveStackOps(doc, 'section', position)).toEqual({ reason: 'Sections stay behind their contents' });
    }
    expect(orderOf(doc, 'back', 'forward')).toBe(3);
    expect(orderOf(doc, 'front', 'backward')).toBe(-1);
  });

  it('ranks and restacks one page at a time: front is the front of the node\u2019s own page (ONL-2488)', () => {
    const doc = docOf([
      browser('back', 0),
      browser('front', 4),
      picture('alone', 40, OTHER),
    ]);
    expect(canvasStack(doc, OTHER).map((node) => node.id)).toEqual(['alone']);
    // 41 would be the answer if the other page's node counted.
    expect(orderOf(doc, 'back', 'front')).toBe(5);
    expect(refusalOf(doc, 'alone', 'front')).toContain('alone');
  });

  it('reads a node whose page the document no longer holds as being on the first page', () => {
    const doc = docOf([browser('back', 0), label('adrift', 1, 'pg_gone')]);
    expect(canvasStack(doc, MAIN).map((node) => node.id)).toEqual(['back', 'adrift']);
    expect(orderOf(doc, 'back', 'front')).toBe(2);
  });

  it('has nowhere to send a lone node', () => {
    const doc = docOf([picture('only', 0)]);
    for (const position of ['front', 'back', 'forward', 'backward'] as const) {
      expect(refusalOf(doc, 'only', position)).toContain('only');
    }
  });
});
