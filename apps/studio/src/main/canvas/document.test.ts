import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'bun:test';
import type {
  BrowserNode,
  CanvasDoc,
  CanvasNode,
  CanvasNodeProvenance,
  CanvasOp,
  CanvasOpEntry,
  CanvasPage,
  ImageNode,
  TextNode,
} from '@studio/events';
import {
  CANVAS_TEXT_SIZES,
  canvasPages,
  defaultTextBox,
  isBrowserNode,
  isDividerPage,
  MAX_CANVAS_OPS_PER_REQUEST,
  PLACEMENT_GAP,
  VERTICAL_PLACEMENT_GAP,
} from '@studio/events';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import {
  createReverifyMoveAuthor,
  createServerPortFollow,
  portFollowOps,
  resolveCreateFrameOps,
  resolveDuplicateFramesOps,
  resolveFrameUrlOps,
  resolveMoveFrameOps,
  resolveMoveFramesOps,
  resolveRemoveFrameOps,
  resolveRemoveFramesOps,
  resolveRenameFrameOps,
  resolveReorderFrameOps,
  type ApplyCanvasOps,
  type StackPosition,
} from './authors.js';
import {
  applyOp,
  emptyCanvasDoc,
  everyNodeAdoptionOps,
  firstCanvasPageId,
  invertOp,
  type CanvasApplyResult,
} from './document.js';
import { appendCanvasLog, readCanvasLog } from './log.js';

afterAll(() => {
  cleanupTempFixtures();
});

const fixturePath = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));

const fixtureDoc = (name = 'two-frame-canvas'): CanvasDoc =>
  JSON.parse(readFileSync(fixturePath(`${name}.json`), 'utf8')) as CanvasDoc;
const fixtureLog = (name = 'two-frame-canvas'): CanvasOpEntry[] =>
  JSON.parse(readFileSync(fixturePath(`${name}.log.json`), 'utf8')) as CanvasOpEntry[];

const FIXTURE_PAGE = firstCanvasPageId('doc_7q1xk4');

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const context = { author: 'user', at: '2026-08-12T20:00:00Z' } as const;

function accept(result: CanvasApplyResult): { doc: CanvasDoc; entry: CanvasOpEntry } {
  if (!result.ok) throw new Error(`expected acceptance, got rejection: ${result.reason}`);
  return result;
}

function expectRejection(doc: CanvasDoc, op: CanvasOp): string {
  const before = JSON.stringify(doc);
  const result = applyOp(doc, op, context);
  expect(result.ok).toBe(false);
  expect(JSON.stringify(doc)).toBe(before);
  if (result.ok) throw new Error('expected a rejection');
  return result.reason;
}

const arrived = (value: unknown): CanvasOp => value as CanvasOp;

const homeUrlOf = (doc: CanvasDoc | null | undefined, id: string): string | undefined =>
  (doc?.nodes[id] as BrowserNode | undefined)?.content.homeUrl;

describe('the artifact kind (ONL-2568)', () => {
  const artifact = {
    id: 'ar_1',
    pageId: FIXTURE_PAGE,
    kind: 'artifact' as const,
    name: '',
    x: 10,
    y: 20,
    width: 480,
    height: 640,
    order: 9,
    content: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing idea' },
  };

  it('accepts a node carrying a minted artifact id, and the document round-trips it', () => {
    const doc = fixtureDoc();
    const { doc: next } = accept(applyOp(doc, { type: 'create', node: artifact }, context));

    expect(next.nodes['ar_1']).toEqual(artifact);
    // Never bytes and never a path: the store is the only thing that resolves the id.
    expect(JSON.stringify(next.nodes['ar_1'])).not.toContain('/');
  });

  it('refuses a node whose artifact id is not one Studio minted', () => {
    for (const artifactId of ['', '../escape', '/etc/passwd', 'AAAAAAAA-1111-4111-8111-AAAAAAAAAAAA', 'nope']) {
      const reason = expectRejection(
        fixtureDoc(),
        arrived({ type: 'create', node: { ...artifact, content: { artifactId, title: 'x' } } }),
      );
      expect(reason).toContain('artifact');
    }
  });

  it('refuses a kind this build does not recognise, naming it', () => {
    const reason = expectRejection(
      fixtureDoc(),
      arrived({ type: 'create', node: { ...artifact, kind: 'hologram' } }),
    );
    expect(reason).toContain('unknown node kind');
    expect(reason).toContain('hologram');
  });

  it('resizes and moves an artifact the way the kind intends, and renames it', () => {
    const made = accept(applyOp(fixtureDoc(), { type: 'create', node: artifact }, context)).doc;

    const resized = accept(
      applyOp(made, { type: 'resize', id: 'ar_1', x: 10, y: 20, width: 300, height: 400 }, context),
    ).doc;
    expect(resized.nodes['ar_1']).toMatchObject({ width: 300, height: 400 });

    const renamed = accept(applyOp(resized, { type: 'rename', id: 'ar_1', name: 'Sketch' }, context)).doc;
    expect(renamed.nodes['ar_1']?.name).toBe('Sketch');
  });

  it('refuses the setters that belong to another kind', () => {
    const made = accept(applyOp(fixtureDoc(), { type: 'create', node: artifact }, context)).doc;

    expect(expectRejection(made, { type: 'set-home-url', id: 'ar_1', homeUrl: 'http://x' })).toBeTruthy();
    expect(
      expectRejection(made, { type: 'set-text', id: 'ar_1', text: 'x', width: 10, height: 10 }),
    ).toBeTruthy();
    expect(expectRejection(made, { type: 'set-image-alt', id: 'ar_1', alt: 'x' })).toBeTruthy();
  });

  it('removes and undoes, so a placement rides the canvas undo like any other node', () => {
    const made = accept(applyOp(fixtureDoc(), { type: 'create', node: artifact }, context)).doc;
    const removal = accept(applyOp(made, { type: 'remove', id: 'ar_1' }, context));
    expect(removal.doc.nodes['ar_1']).toBeUndefined();

    const inverse = invertOp(removal.entry);
    const restored = accept(applyOp(removal.doc, inverse, context)).doc;
    expect(restored.nodes['ar_1']).toEqual(artifact);
  });
});

describe('applyOp — each op type against the fixture', () => {
  it('create adds the author-minted node and records a prior of none', () => {
    const doc = deepFreeze(fixtureDoc());
    const node: CanvasNode & { provenance?: never } = {
      id: 'fr_c3',
      pageId: FIXTURE_PAGE,
      kind: 'browser',
      name: 'storefront',
      x: 0,
      y: 980,
      width: 1280,
      height: 800,
      order: 2,
      content: { homeUrl: 'http://localhost:3000' },
    };
    const { doc: next, entry } = accept(applyOp(doc, { type: 'create', node }, context));

    expect(Object.keys(next.nodes)).toEqual(['fr_a1', 'fr_b2', 'fr_c3']);
    expect(next.nodes['fr_c3']).toEqual(node);
    expect(next.revision).toBe(7);
    expect(entry).toEqual({
      revision: 7,
      author: 'user',
      at: context.at,
      op: { type: 'create', node },
      prior: { kind: 'none' },
    });
  });

  it('duplicate adds the node with its provenance and records a prior of none', () => {
    const doc = deepFreeze(fixtureDoc());
    const node: CanvasNode & { provenance: CanvasNodeProvenance } = {
      id: 'fr_c3',
      pageId: FIXTURE_PAGE,
      kind: 'browser',
      name: 'checkout copy',
      x: 2760,
      y: 900,
      width: 1280,
      height: 800,
      order: 2,
      provenance: { from: 'fr_a1', at: context.at },
      content: { homeUrl: 'http://localhost:3001' },
    };
    const { doc: next, entry } = accept(applyOp(doc, { type: 'duplicate', node }, context));

    expect(next.nodes['fr_c3']).toEqual(node);
    expect(next.revision).toBe(7);
    expect(entry.prior).toEqual({ kind: 'none' });
  });

  it('move updates position and records exactly the overwritten fields', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(
      applyOp(doc, { type: 'move', id: 'fr_a1', x: 40, y: -60 }, context),
    );

    expect(next.nodes['fr_a1']).toEqual({ ...doc.nodes['fr_a1']!, x: 40, y: -60 });
    expect(next.nodes['fr_b2']).toEqual(doc.nodes['fr_b2']!);
    expect(next.revision).toBe(7);
    expect(entry.prior).toEqual({ kind: 'fields', id: 'fr_a1', fields: { x: 1420, y: 900 } });
  });

  it('resize updates geometry and records all four overwritten fields', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(
      applyOp(doc, { type: 'resize', id: 'fr_b2', x: 1300, y: -20, width: 900, height: 640 }, context),
    );

    expect(next.nodes['fr_b2']).toEqual({
      ...doc.nodes['fr_b2']!,
      x: 1300,
      y: -20,
      width: 900,
      height: 640,
    });
    expect(entry.prior).toEqual({
      kind: 'fields',
      id: 'fr_b2',
      fields: { x: 1360, y: 0, width: 1280, height: 800 },
    });
  });

  it('rename updates the label and records the old name', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(
      applyOp(doc, { type: 'rename', id: 'fr_a1', name: 'cart' }, context),
    );

    expect(next.nodes['fr_a1']).toEqual({ ...doc.nodes['fr_a1']!, name: 'cart' });
    expect(entry.prior).toEqual({ kind: 'fields', id: 'fr_a1', fields: { name: 'checkout' } });
  });

  it('set-home-url retargets the frame and records the old address', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(
      applyOp(doc, { type: 'set-home-url', id: 'fr_a1', homeUrl: 'http://localhost:5173' }, context),
    );

    expect(next.nodes['fr_a1']).toEqual({
      ...(doc.nodes['fr_a1'] as BrowserNode),
      content: { homeUrl: 'http://localhost:5173' },
    });
    expect(entry.prior).toEqual({
      kind: 'fields',
      id: 'fr_a1',
      fields: { homeUrl: 'http://localhost:3001', pendingHomeUrl: null },
    });
  });

  it('reorder moves the node in the stack, records the old order, and undoes back to it', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(applyOp(doc, { type: 'reorder', id: 'fr_a1', order: 1.5 }, context));

    expect(next.nodes['fr_a1']).toEqual({ ...doc.nodes['fr_a1']!, order: 1.5 });
    expect(entry.prior).toEqual({ kind: 'fields', id: 'fr_a1', fields: { order: 0 } });
    expect(invertOp(entry)).toEqual({ type: 'reorder', id: 'fr_a1', order: 0 });
  });

  it('remove drops the node and records the WHOLE node as prior', () => {
    const doc = deepFreeze(fixtureDoc());
    const { doc: next, entry } = accept(applyOp(doc, { type: 'remove', id: 'fr_b2' }, context));

    expect(Object.keys(next.nodes)).toEqual(['fr_a1']);
    expect(next.revision).toBe(7);
    expect(entry.prior).toEqual({ kind: 'node', node: doc.nodes['fr_b2']! });
  });
});

describe('applyOp — rejections', () => {
  it('an op referencing a missing node is a rejection, never a silent no-op', () => {
    const doc = deepFreeze(fixtureDoc());
    const ops: CanvasOp[] = [
      { type: 'move', id: 'fr_gone', x: 0, y: 0 },
      { type: 'resize', id: 'fr_gone', x: 0, y: 0, width: 100, height: 100 },
      { type: 'rename', id: 'fr_gone', name: 'ghost' },
      { type: 'set-home-url', id: 'fr_gone', homeUrl: 'http://localhost:4000' },
      { type: 'reorder', id: 'fr_gone', order: 3 },
      { type: 'remove', id: 'fr_gone' },
    ];
    for (const op of ops) {
      expect(expectRejection(doc, op)).toContain('fr_gone');
    }
    expect(doc.revision).toBe(6);
  });

  it('creating over an existing id is a rejection — ids are minted once, never reused', () => {
    const doc = deepFreeze(fixtureDoc());
    const taken: CanvasNode & { provenance?: never } = {
      id: 'fr_a1',
      pageId: FIXTURE_PAGE,
      kind: 'browser',
      name: 'impostor',
      x: 0,
      y: 0,
      width: 1280,
      height: 800,
      order: 9,
      content: { homeUrl: 'http://localhost:3000' },
    };
    expect(expectRejection(doc, { type: 'create', node: taken })).toContain('fr_a1');
    expect(
      expectRejection(doc, {
        type: 'duplicate',
        node: { ...taken, provenance: { from: 'fr_b2', at: context.at } },
      }),
    ).toContain('fr_a1');
  });

  it('a malformed payload is rejected before it can touch the document', () => {
    const doc = deepFreeze(fixtureDoc());
    expectRejection(doc, arrived({ type: 'move', id: 'fr_a1', x: Number.NaN, y: 0 }));
    expectRejection(doc, arrived({ type: 'move', id: 'fr_a1', x: '40', y: 0 }));
    expectRejection(doc, arrived({ type: 'resize', id: 'fr_a1', x: 0, y: 0, width: 0, height: 800 }));
    expectRejection(doc, arrived({ type: 'rename', id: 'fr_a1', name: 42 }));
    expectRejection(doc, arrived({ type: 'set-home-url', id: 'fr_a1', homeUrl: '' }));
    expectRejection(doc, arrived({ type: 'reorder', id: 'fr_a1', order: Number.POSITIVE_INFINITY }));
    expectRejection(doc, arrived({ type: 'reorder', id: 'fr_a1', order: '2' }));
    expectRejection(doc, arrived({ type: 'remove', id: '' }));
    expectRejection(doc, arrived({ type: 'create', node: null }));
    expectRejection(doc, arrived({ type: 'warp', id: 'fr_a1' }));
  });

  it('enforces at runtime what provenance is typed to mean: never on create, always on duplicate', () => {
    const doc = deepFreeze(fixtureDoc());
    const node: CanvasNode = {
      id: 'fr_c3',
      pageId: FIXTURE_PAGE,
      kind: 'browser',
      name: 'copy',
      x: 0,
      y: 0,
      width: 1280,
      height: 800,
      order: 2,
      content: { homeUrl: 'http://localhost:3000' },
    };
    expectRejection(
      doc,
      arrived({ type: 'create', node: { ...node, provenance: { from: 'fr_a1', at: context.at } } }),
    );
    expectRejection(doc, arrived({ type: 'duplicate', node }));
  });
});

describe('copied Frame home inverses', () => {
  it('restores pending routes on undo, clears them on redo, and permits a later server rebind', () => {
    const doc = fixtureDoc();
    const frame = doc.nodes.fr_b2;
    if (frame?.kind !== 'browser') throw new Error('expected browser fixture');
    frame.content = { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' };
    for (const author of ['user', 'system'] as const) {
      const bound = accept(applyOp(doc, {
        type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/products?sort=new#details',
      }, { ...context, author }));
      expect(bound.entry.prior).toEqual({
        kind: 'fields', id: frame.id,
        fields: { homeUrl: 'about:blank', pendingHomeUrl: frame.content.pendingHomeUrl },
      });
      expect(invertOp(bound.entry)).toEqual({
        type: 'set-home-url', id: frame.id, homeUrl: 'about:blank', pendingHomeUrl: frame.content.pendingHomeUrl,
      });
      const undone = accept(applyOp(bound.doc, invertOp(bound.entry), context));
      expect(undone.doc.nodes[frame.id]).toEqual(frame);
      expect(invertOp(undone.entry)).toEqual({
        type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/products?sort=new#details', pendingHomeUrl: null,
      });
      const redone = accept(applyOp(undone.doc, invertOp(undone.entry), context));
      expect(redone.doc.nodes[frame.id]).toEqual(bound.doc.nodes[frame.id]);
      const restored = accept(applyOp(redone.doc, invertOp(redone.entry), context));
      const rebound = accept(applyOp(restored.doc, {
        type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:6193/products?sort=new#details',
      }, context));
      const final = rebound.doc.nodes[frame.id];
      if (final?.kind !== 'browser') throw new Error('expected browser');
      expect(final.content).toEqual({ homeUrl: 'http://localhost:6193/products?sort=new#details' });
    }
  });

  it('validates pending-home restoration, accepting only a nonempty string or the null clear sentinel', () => {
    for (const pendingHomeUrl of ['', 42, false, {}]) {
      expect(expectRejection(fixtureDoc(), arrived({
        type: 'set-home-url', id: 'fr_b2', homeUrl: 'about:blank', pendingHomeUrl,
      }))).toContain('pendingHomeUrl');
    }
    for (const pendingHomeUrl of [undefined, null]) {
      const doc = fixtureDoc();
      const frame = doc.nodes.fr_b2;
      if (frame?.kind !== 'browser') throw new Error('expected browser');
      frame.content.pendingHomeUrl = 'http://localhost:4317/saved';
      const result = accept(applyOp(doc, { type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/saved', pendingHomeUrl }, context));
      const cleared = result.doc.nodes[frame.id];
      if (cleared?.kind !== 'browser') throw new Error('expected browser');
      expect(cleared.content.pendingHomeUrl).toBeUndefined();
    }
  });
});

describe('revision discipline', () => {
  it('every accepted op advances the revision by exactly one; a rejected op never moves it', () => {
    const doc = deepFreeze(fixtureDoc());
    const moved = accept(applyOp(doc, { type: 'move', id: 'fr_a1', x: 1, y: 2 }, context));
    expect(moved.doc.revision).toBe(7);
    expect(moved.entry.revision).toBe(7);

    expect(applyOp(moved.doc, { type: 'remove', id: 'fr_gone' }, context).ok).toBe(false);
    expect(moved.doc.revision).toBe(7);

    const renamed = accept(applyOp(moved.doc, { type: 'rename', id: 'fr_a1', name: 'cart' }, context));
    expect(renamed.doc.revision).toBe(8);
    expect(renamed.entry.revision).toBe(8);
  });
});

const textNode = (over: Partial<TextNode> = {}): TextNode => ({
  id: 'tx_1',
  pageId: FIXTURE_PAGE,
  kind: 'text',
  name: 'Checkout notes',
  x: -4000,
  y: -4000,
  ...defaultTextBox('large'),
  order: 3,
  content: { text: 'Checkout, rebuilt', size: 'large' },
  ...over,
});

const imageNode = (over: Partial<ImageNode> = {}): ImageNode => ({
  id: 'im_1',
  pageId: FIXTURE_PAGE,
  kind: 'image',
  name: 'reference.png',
  x: -4000,
  y: 1200,
  width: 640,
  height: 400,
  order: 4,
  content: { imageId: 'img_9f2c', name: 'reference.png', originalWidth: 1280, originalHeight: 800 },
  ...over,
});

const mixedDoc = (): CanvasDoc => {
  const base = fixtureDoc();
  return {
    ...base,
    revision: base.revision + 2,
    nodes: { ...base.nodes, tx_1: textNode(), im_1: imageNode() },
  };
};

const text = (doc: CanvasDoc, id: string): TextNode => doc.nodes[id] as TextNode;
const image = (doc: CanvasDoc, id: string): ImageNode => doc.nodes[id] as ImageNode;

describe('authored text wrapping width (ONL-2521)', () => {
  for (const width of [240, 720]) {
    it(`persists a ${width}px resize through edit, size, duplicate, reopen and undo/redo`, () => {
      const original = mixedDoc();
      const before = text(original, 'tx_1');
      const resized = accept(applyOp(original, {
        type: 'resize', id: 'tx_1', x: -4100, y: -4000, width, height: 130,
      }, context));
      expect(text(resized.doc, 'tx_1').content).toEqual({ ...before.content, wrapWidth: width });
      expect(text(resized.doc, 'tx_1')).toMatchObject({ width, height: 130, x: -4100 });

      const edited = accept(applyOp(resized.doc, {
        type: 'set-text', id: 'tx_1', text: 'More words\nAnother line', width, height: 195,
      }, context));
      const sized = accept(applyOp(edited.doc, {
        type: 'set-text-size', id: 'tx_1', size: 'small', width, height: 72,
      }, context));
      expect(text(sized.doc, 'tx_1')).toMatchObject({ width, height: 72, content: { wrapWidth: width } });
      const copied = { ...text(sized.doc, 'tx_1'), id: 'tx_copy', provenance: { from: 'tx_1', at: context.at } };
      const duplicated = accept(applyOp(sized.doc, { type: 'duplicate', node: copied }, context));
      const reopened = JSON.parse(JSON.stringify(duplicated.doc)) as CanvasDoc;
      expect(text(reopened, 'tx_copy')).toEqual(copied);

      const undone = accept(applyOp(resized.doc, invertOp(resized.entry), context));
      expect(text(undone.doc, 'tx_1')).toEqual(before);
      expect(text(undone.doc, 'tx_1').content).not.toHaveProperty('wrapWidth');
      const redone = accept(applyOp(undone.doc, invertOp(undone.entry), context));
      expect(text(redone.doc, 'tx_1')).toEqual(text(resized.doc, 'tx_1'));
    });
  }

  it('restores an earlier authored width rather than returning to intrinsic layout', () => {
    const first = accept(applyOp(mixedDoc(), {
      type: 'resize', id: 'tx_1', x: -4000, y: -4000, width: 720, height: 65,
    }, context));
    const second = accept(applyOp(first.doc, {
      type: 'resize', id: 'tx_1', x: -3900, y: -4000, width: 240, height: 195,
    }, context));
    const undone = accept(applyOp(second.doc, invertOp(second.entry), context));
    expect(text(undone.doc, 'tx_1')).toEqual(text(first.doc, 'tx_1'));
  });
});

describe('a text node and an image node in the document', () => {
  it('a text payload missing its size, or naming one that is not a size, is refused', () => {
    const doc = deepFreeze(fixtureDoc());
    const { size: _size, ...sizeless } = textNode().content;
    expectRejection(doc, arrived({ type: 'create', node: { ...textNode(), content: sizeless } }));
    expectRejection(
      doc,
      arrived({ type: 'create', node: { ...textNode(), content: { ...sizeless, size: 'huge' } } }),
    );
    expectRejection(doc, arrived({ type: 'create', node: { ...textNode(), content: null } }));
    expect(doc.revision).toBe(6);
  });

  it('an image payload that names no stored image, no display name, or no original size is refused', () => {
    const doc = deepFreeze(fixtureDoc());
    const { imageId: _id, ...unnamed } = imageNode().content;
    expectRejection(doc, arrived({ type: 'create', node: { ...imageNode(), content: unnamed } }));
    expectRejection(
      doc,
      arrived({ type: 'create', node: { ...imageNode(), content: { ...unnamed, imageId: '' } } }),
    );
    expectRejection(
      doc,
      arrived({
        type: 'create',
        node: { ...imageNode(), content: { ...imageNode().content, name: '' } },
      }),
    );
    expectRejection(
      doc,
      arrived({
        type: 'create',
        node: { ...imageNode(), content: { ...imageNode().content, originalWidth: 0 } },
      }),
    );
    expectRejection(
      doc,
      arrived({
        type: 'create',
        node: { ...imageNode(), content: { ...imageNode().content, originalHeight: Number.NaN } },
      }),
    );
  });

  it('a text node still answers to the shared envelope checks', () => {
    const doc = deepFreeze(fixtureDoc());
    expectRejection(doc, arrived({ type: 'create', node: { ...textNode(), width: 0 } }));
    expectRejection(doc, arrived({ type: 'create', node: { ...textNode(), y: Number.NaN } }));
  });

  it('setting a text string accepts, and the inverse restores the previous string exactly — newlines and emptiness included', () => {
    let doc: CanvasDoc = mixedDoc();
    for (const next of ['', 'one\ntwo\n\nthree', 'back to a single line']) {
      const before = text(doc, 'tx_1');
      const applied = accept(
        applyOp(doc, { type: 'set-text', id: 'tx_1', text: next, width: 512, height: 140 }, context),
      );
      expect(text(applied.doc, 'tx_1').content.text).toBe(next);
      const undone = accept(applyOp(applied.doc, invertOp(applied.entry), context));
      expect(undone.doc.nodes['tx_1']).toEqual(before);
      doc = applied.doc;
    }
  });

  it('setting a text string also stores the measured box, and the inverse restores the string and the box together', () => {
    const doc = deepFreeze(mixedDoc());
    const before = text(doc, 'tx_1');
    const applied = accept(
      applyOp(
        doc,
        { type: 'set-text', id: 'tx_1', text: 'a paragraph long enough to wrap', width: 512, height: 260 },
        context,
      ),
    );

    expect(applied.doc.nodes['tx_1']).toMatchObject({ width: 512, height: 260 });
    expect(applied.entry.prior).toEqual({
      kind: 'fields',
      id: 'tx_1',
      fields: { text: before.content.text, width: before.width, height: before.height },
    });
    const undone = accept(applyOp(applied.doc, invertOp(applied.entry), context));
    expect(undone.doc.nodes['tx_1']).toEqual(before);
  });

  it('a text size accepts each of the three values, carries its own box, and refuses anything else', () => {
    const doc = deepFreeze(mixedDoc());
    const before = text(doc, 'tx_1');
    for (const size of CANVAS_TEXT_SIZES) {
      const applied = accept(
        applyOp(doc, { type: 'set-text-size', id: 'tx_1', size, width: 512, height: 96 }, context),
      );
      expect(text(applied.doc, 'tx_1').content.size).toBe(size);
      expect(applied.doc.nodes['tx_1']).toMatchObject({ width: 512, height: 96 });
      expect(invertOp(applied.entry)).toEqual({
        type: 'set-text-size',
        id: 'tx_1',
        size: before.content.size,
        width: before.width,
        height: before.height,
      });
    }
    expectRejection(doc, arrived({ type: 'set-text-size', id: 'tx_1', size: 'huge', width: 512, height: 96 }));
    expectRejection(doc, arrived({ type: 'set-text-size', id: 'tx_1', size: 'small', width: 0, height: 96 }));
  });

  it('a content operation on a node of the wrong kind is refused, and the reason names the kind it found', () => {
    const doc = deepFreeze(mixedDoc());
    expect(
      expectRejection(doc, { type: 'set-text', id: 'im_1', text: 'x', width: 200, height: 40 }),
    ).toContain('image');
    expect(
      expectRejection(doc, { type: 'set-text-size', id: 'im_1', size: 'small', width: 200, height: 40 }),
    ).toContain('image');
    expect(expectRejection(doc, { type: 'set-image-alt', id: 'tx_1', alt: 'x' })).toContain('text');
    expect(
      expectRejection(doc, { type: 'set-text', id: 'fr_a1', text: 'x', width: 200, height: 40 }),
    ).toContain('browser');
  });

  it('a malformed value on a content operation never reaches the document', () => {
    const doc = deepFreeze(mixedDoc());
    expectRejection(doc, arrived({ type: 'set-text', id: 'tx_1', text: 42, width: 200, height: 40 }));
    expectRejection(doc, arrived({ type: 'set-text', id: 'tx_1', text: 'x', width: Number.NaN, height: 40 }));
    expectRejection(doc, arrived({ type: 'set-image-alt', id: 'im_1', alt: 7 }));
  });

  it('text wraps at its resized width; an image node resizes as a frame does', () => {
    const doc = deepFreeze(mixedDoc());
    const resized = accept(applyOp(doc, { type: 'resize', id: 'tx_1', x: 0, y: 0, width: 300, height: 120 }, context));
    expect(text(resized.doc, 'tx_1')).toMatchObject({ width: 300, height: 120, content: { wrapWidth: 300, size: 'large' } });

    const applied = accept(
      applyOp(doc, { type: 'resize', id: 'im_1', x: 10, y: 20, width: 320, height: 200 }, context),
    );
    expect(applied.doc.nodes['im_1']).toMatchObject({ x: 10, y: 20, width: 320, height: 200 });
  });

  it('a home url on a text or an image node is refused', () => {
    const doc = deepFreeze(mixedDoc());
    for (const id of ['tx_1', 'im_1']) {
      expectRejection(doc, { type: 'set-home-url', id, homeUrl: 'http://localhost:5173' });
    }
  });

  it('clearing an alt text inverts back to the previous alt, and an alt first written inverts back to none at all', () => {
    const doc = deepFreeze(mixedDoc());
    const described = accept(
      applyOp(doc, { type: 'set-image-alt', id: 'im_1', alt: 'the reference shot' }, context),
    );
    expect(image(described.doc, 'im_1').content.alt).toBe('the reference shot');

    const cleared = accept(
      applyOp(described.doc, { type: 'set-image-alt', id: 'im_1', alt: '' }, context),
    );
    expect(image(cleared.doc, 'im_1').content.alt).toBeUndefined();
    const restored = accept(applyOp(cleared.doc, invertOp(cleared.entry), context));
    expect(image(restored.doc, 'im_1').content.alt).toBe('the reference shot');

    const undescribed = accept(applyOp(described.doc, invertOp(described.entry), context));
    expect(JSON.stringify(undescribed.doc.nodes['im_1'])).toBe(JSON.stringify(doc.nodes['im_1']));
  });

  it('move, rename, reorder, duplicate and remove all accept on both new kinds, and each inverts exactly', () => {
    const doc = deepFreeze(mixedDoc());
    for (const id of ['tx_1', 'im_1']) {
      const before = doc.nodes[id];
      const ops: CanvasOp[] = [
        { type: 'move', id, x: 11, y: 22 },
        { type: 'rename', id, name: 'renamed' },
        { type: 'reorder', id, order: 9.5 },
        { type: 'remove', id },
      ];
      for (const op of ops) {
        const applied = accept(applyOp(doc, op, context));
        const undone = accept(applyOp(applied.doc, invertOp(applied.entry), context));
        expect(undone.doc.nodes[id]).toEqual(before);
      }

      const copy = {
        ...(before as CanvasNode),
        id: `${id}_copy`,
        provenance: { from: id, at: context.at },
      };
      const duplicated = accept(applyOp(doc, { type: 'duplicate', node: copy }, context));
      expect(duplicated.doc.nodes[`${id}_copy`]).toEqual(copy);
      const dropped = accept(applyOp(duplicated.doc, invertOp(duplicated.entry), context));
      expect(dropped.doc.nodes[`${id}_copy`]).toBeUndefined();
    }
  });

  it('a content operation naming a node that is not there is refused, and the revision stays put', () => {
    const doc = deepFreeze(mixedDoc());
    const ops: CanvasOp[] = [
      { type: 'set-text', id: 'tx_gone', text: 'x', width: 200, height: 40 },
      { type: 'set-text-size', id: 'tx_gone', size: 'small', width: 200, height: 40 },
      { type: 'set-image-alt', id: 'im_gone', alt: 'x' },
    ];
    for (const op of ops) expect(expectRejection(doc, op)).toContain('gone');
    expect(doc.revision).toBe(mixedDoc().revision);
  });

  it('a document mixing all three kinds answers port-follow and duplicate placement exactly as one of frames alone', () => {
    const frames = deepFreeze(fixtureDoc());
    const mixed = deepFreeze(mixedDoc());
    expect(portFollowOps(mixed, 3000, 5173)).toEqual(portFollowOps(frames, 3000, 5173));

    // The text and image nodes sit clear of both frames, so only their presence is under test.
    const request = (): { frameIds: string[]; mintId: () => string; at: string } => {
      const ids = ['copy-a', 'copy-b'];
      return {
        frameIds: ['fr_a1', 'fr_b2'],
        mintId: () => ids.shift() ?? 'unexpected',
        at: '2026-09-30T00:00:00Z',
      };
    };
    const placements = (resolved: CanvasOp[] | { reason: string }): unknown =>
      (resolved as CanvasOp[]).map((op) =>
        op.type === 'duplicate' ? { id: op.node.id, x: op.node.x, y: op.node.y } : op,
      );
    expect(placements(resolveDuplicateFramesOps(mixed, request()))).toEqual(
      placements(resolveDuplicateFramesOps(frames, request())),
    );
  });
});

describe('the log replayed, then undone', () => {
  function replayFixture(name = 'two-frame-canvas'): { doc: CanvasDoc; entries: CanvasOpEntry[] } {
    let doc = emptyCanvasDoc(fixtureDoc(name).docId);
    const entries: CanvasOpEntry[] = [];
    for (const entry of fixtureLog(name)) {
      const result = accept(
        applyOp(doc, entry.op, {
          author: entry.author,
          at: entry.at,
          batchId: entry.batchId,
        }),
      );
      entries.push(result.entry);
      doc = result.doc;
    }
    return { doc, entries };
  }

  it.each(['two-frame-canvas', 'every-op-canvas'])(
    'replaying the %s log from empty reproduces its doc and records complete home priors',
    (name) => {
      const { doc, entries } = replayFixture(name);
      expect(JSON.stringify(doc)).toBe(JSON.stringify(fixtureDoc(name)));
      const expected = fixtureLog(name).map((entry) =>
        entry.op.type === 'set-home-url' && entry.prior.kind === 'fields'
          ? { ...entry, prior: { ...entry.prior, fields: { ...entry.prior.fields, pendingHomeUrl: null } } }
          : entry,
      );
      expect(JSON.stringify(entries)).toBe(JSON.stringify(expected));
    },
  );

  it('records a supplied batch id without requiring one from legacy entries', () => {
    const { provenance: _provenance, ...legacyNode } = fixtureDoc().nodes.fr_a1!;
    const paged = accept(
      applyOp(
        emptyCanvasDoc('doc_batch'),
        { type: 'create-page', page: { id: FIXTURE_PAGE, name: 'Page 1', order: 0 } },
        context,
      ),
    );
    const legacy = accept(applyOp(paged.doc, { type: 'create', node: legacyNode }, context));
    const batched = accept(
      applyOp(
        legacy.doc,
        { type: 'move', id: 'fr_a1', x: 10, y: 20 },
        {
          ...context,
          batchId: 'batch_fixture',
        },
      ),
    );

    expect(legacy.entry.batchId).toBeUndefined();
    expect(batched.entry.batchId).toBe('batch_fixture');
  });

  it('undo is replaying inverses: the priors alone walk the nodes back to empty while the revision keeps climbing', () => {
    const { doc, entries } = replayFixture();
    const reversed = [...entries].reverse();
    const first = reversed.pop();

    let undone = doc;
    for (const entry of reversed) {
      const result = accept(applyOp(undone, invertOp(entry), context));
      expect(result.doc.revision).toBe(undone.revision + 1);
      undone = result.doc;
    }

    expect(JSON.stringify(undone.nodes)).toBe(JSON.stringify(emptyCanvasDoc('doc_7q1xk4').nodes));
    expect(undone.revision).toBe(11);
    // The one inverse a full undo cannot reach: the project keeps its last page (ONL-2488).
    expect(expectRejection(undone, invertOp(first!))).toContain('last page');
  });

  it('undoing a remove restores the node exactly — through duplicate when it carried provenance', () => {
    const doc = deepFreeze(fixtureDoc());

    const removedDupe = accept(applyOp(doc, { type: 'remove', id: 'fr_b2' }, context));
    const dupeInverse = invertOp(removedDupe.entry);
    expect(dupeInverse.type).toBe('duplicate');
    const restoredDupe = accept(applyOp(removedDupe.doc, dupeInverse, context));
    expect(restoredDupe.doc.nodes['fr_b2']).toEqual(doc.nodes['fr_b2']!);

    const removedPlain = accept(applyOp(doc, { type: 'remove', id: 'fr_a1' }, context));
    const plainInverse = invertOp(removedPlain.entry);
    expect(plainInverse.type).toBe('create');
    const restoredPlain = accept(applyOp(removedPlain.doc, plainInverse, context));
    expect(restoredPlain.doc.nodes['fr_a1']).toEqual(doc.nodes['fr_a1']!);
  });
});

describe('the op log', () => {
  it('reads a valid log correctly — the control every corrupt case below leans on', () => {
    const path = join(makeDirWithFiles({ name: 'canvas-log-valid' }), 'canvas.log.json');
    writeFileSync(path, readFileSync(fixturePath('two-frame-canvas.log.json')));
    expect(readCanvasLog(path)).toEqual(fixtureLog());
  });

  it('append then read round-trips, preserving what was already there', () => {
    const path = join(makeDirWithFiles({ name: 'canvas-log-append' }), 'canvas.log.json');
    const [first, second] = fixtureLog();

    appendCanvasLog(path, [first!]);
    expect(readCanvasLog(path)).toEqual([first]);

    appendCanvasLog(path, [second!]);
    expect(readCanvasLog(path)).toEqual([first, second]);
  });

  it('a batch appends in order after what was already there', () => {
    const path = join(makeDirWithFiles({ name: 'canvas-log-append-batch' }), 'canvas.log.json');
    const [first, second] = fixtureLog();

    appendCanvasLog(path, [first!]);
    appendCanvasLog(path, [second!, first!]);
    expect(readCanvasLog(path)).toEqual([first, second, first]);
  });

  it('a missing log is empty history, not an error', () => {
    const dir = makeDirWithFiles({ name: 'canvas-log-missing' });
    expect(readCanvasLog(join(dir, 'never-written.log.json'))).toEqual([]);
  });

  it('a corrupt log reads as empty history — never a throw', () => {
    const dir = makeDirWithFiles({ name: 'canvas-log-corrupt' });

    const truncated = join(dir, 'truncated.log.json');
    writeFileSync(truncated, '[{"revision": 1,');
    expect(readCanvasLog(truncated)).toEqual([]);

    const wrongShape = join(dir, 'wrong-shape.log.json');
    writeFileSync(wrongShape, '{"entries": []}');
    expect(readCanvasLog(wrongShape)).toEqual([]);

    const brokenEntry = join(dir, 'broken-entry.log.json');
    writeFileSync(brokenEntry, '[{"revision": "one"}]');
    expect(readCanvasLog(brokenEntry)).toEqual([]);
  });
});

// Runs the resolve synchronously, so a case asserts right after `observed`.
function portFollowHarness(initial: CanvasDoc | null): {
  follow: ReturnType<typeof createServerPortFollow>;
  doc: () => CanvasDoc | null;
  swap: (next: CanvasDoc | null) => void;
  entries: CanvasOpEntry[];
  batches: number[];
  apply: ApplyCanvasOps;
  refuseNext: () => void;
} {
  let doc = initial;
  const entries: CanvasOpEntry[] = [];
  const batches: number[] = [];
  let refusal = false;
  const apply: ApplyCanvasOps = async (author, resolve) => {
    if (doc === null) return { ok: false, reason: 'no canvas document is open' };
    const resolved = resolve(doc);
    if ('reason' in resolved) return { ok: false, reason: resolved.reason };
    batches.push(resolved.length);
    if (resolved.length > MAX_CANVAS_OPS_PER_REQUEST) return { ok: false, reason: 'too many operations' };
    if (refusal && resolved.length > 0) {
      refusal = false;
      return { ok: false, reason: 'transient refusal' };
    }
    for (const op of resolved) {
      const result = accept(applyOp(doc, op, { author, at: context.at }));
      doc = result.doc;
      entries.push(result.entry);
    }
    return { ok: true, doc, entries };
  };
  const follow = createServerPortFollow(apply);
  return {
    follow,
    doc: () => doc,
    swap: (next) => {
      doc = next;
    },
    entries,
    batches,
    apply,
    refuseNext: () => { refusal = true; },
  };
}

function largePortFollowDoc(pending = true): CanvasDoc {
  const doc = fixtureDoc();
  doc.nodes = {};
  for (let index = 0; index < 1001; index += 1) {
    const id = `copied-${index}`;
    const route = `/route/${index}?sort=new#details`;
    doc.nodes[id] = {
      id, pageId: FIXTURE_PAGE, kind: 'browser', name: id,
      x: 0, y: 0, width: 640, height: 480, order: index,
      content: pending
        ? { homeUrl: 'about:blank', pendingHomeUrl: `http://localhost:4317${route}` }
        : { homeUrl: `http://localhost:5182${route}` },
    };
  }
  doc.nodes.external = {
    id: 'external', pageId: FIXTURE_PAGE, kind: 'browser', name: 'Reference',
    x: 0, y: 0, width: 640, height: 480, order: 1001,
    content: { homeUrl: 'https://example.com/reference?q=one#section' },
  };
  return doc;
}

function expectAllPortFollowHomes(doc: CanvasDoc | null, port: number): void {
  for (let index = 0; index < 1001; index += 1) {
    const frame = doc?.nodes[`copied-${index}`];
    if (frame?.kind !== 'browser') throw new Error('expected copied browser');
    expect(frame.content).toEqual({ homeUrl: `http://localhost:${port}/route/${index}?sort=new#details` });
  }
  expect(homeUrlOf(doc, 'external')).toBe('https://example.com/reference?q=one#section');
}

function deferredPortFollowHarness(initial: CanvasDoc): {
  follow: ReturnType<typeof createServerPortFollow>;
  doc: () => CanvasDoc;
  swap: (next: CanvasDoc) => void;
  releaseNext: () => Promise<void>;
  drain: () => Promise<void>;
  entries: CanvasOpEntry[];
  batches: number[];
  paths: (string | undefined)[];
} {
  let doc = initial;
  const entries: CanvasOpEntry[] = [];
  const batches: number[] = [];
  const paths: (string | undefined)[] = [];
  const queue: (() => void)[] = [];
  const apply: ApplyCanvasOps = (author, resolve, worktreePath) => new Promise((answer) => {
    paths.push(worktreePath);
    queue.push(() => {
      const ops = resolve(doc);
      if ('reason' in ops) { answer({ ok: false, reason: ops.reason }); return; }
      batches.push(ops.length);
      if (ops.length > MAX_CANVAS_OPS_PER_REQUEST) { answer({ ok: false, reason: 'too many operations' }); return; }
      const committed: CanvasOpEntry[] = [];
      for (const op of ops) {
        const result = accept(applyOp(doc, op, { author, at: context.at }));
        doc = result.doc;
        committed.push(result.entry);
        entries.push(result.entry);
      }
      answer({ ok: true, doc, entries: committed });
    });
  });
  const releaseNext = async (): Promise<void> => {
    const step = queue.shift();
    if (step === undefined) throw new Error('no queued transaction');
    step();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };
  return {
    follow: createServerPortFollow(apply, '/workspaces/copied-project'),
    doc: () => doc, entries, batches, paths, releaseNext,
    swap: (next) => { doc = next; },
    drain: async () => { while (queue.length > 0) await releaseNext(); },
  };
}

describe('the system author: port-follow', () => {
  it('forgets a completed move before a later user-authored old-port address', async () => {
    const harness = portFollowHarness(largePortFollowDoc(false));
    harness.follow.observed({ status: 'running', port: 5182 });
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expectAllPortFollowHomes(harness.doc(), 6193);
    await harness.apply('user', () => [{ type: 'set-home-url', id: 'copied-0', homeUrl: 'http://localhost:5182/reference' }]);
    const count = harness.entries.length;
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(harness.entries).toHaveLength(count);
    const frame = harness.doc()?.nodes['copied-0'];
    if (frame?.kind !== 'browser') throw new Error('expected copied browser');
    expect(frame.content.homeUrl).toBe('http://localhost:5182/reference');
  });

  it('does not invent an old port when a queued first observation resolves against another document', async () => {
    const harness = deferredPortFollowHarness(largePortFollowDoc(false));
    harness.follow.observed({ status: 'running', port: 5182 });
    harness.follow.observed({ status: 'running', port: 6193 });
    harness.swap({ ...largePortFollowDoc(false), docId: 'recovered-document' });
    await harness.drain();
    expectAllPortFollowHomes(harness.doc(), 5182);
    expect(harness.entries).toHaveLength(0);
  });

  it('converges 1001 pending and partially bound Frames to the newest concurrent observation', async () => {
    const harness = portFollowHarness(largePortFollowDoc());
    harness.follow.observed({ status: 'running', port: 5182 });
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expectAllPortFollowHomes(harness.doc(), 6193);
    expect(harness.batches.every((size) => size <= MAX_CANVAS_OPS_PER_REQUEST)).toBe(true);
    const count = harness.entries.length;
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(harness.entries).toHaveLength(count);
  });

  it.each([false, true])('uses the latest desired port in deferred FIFO resolvers (first batch committed: %s)', async (commitFirst) => {
    const harness = deferredPortFollowHarness(largePortFollowDoc());
    harness.follow.observed({ status: 'running', port: 5182 });
    const completion = commitFirst ? harness.releaseNext() : undefined;
    harness.follow.observed({ status: 'running', port: 6193 });
    await completion;
    await harness.drain();
    expectAllPortFollowHomes(harness.doc(), 6193);
    expect(harness.batches.every((size) => size <= MAX_CANVAS_OPS_PER_REQUEST)).toBe(true);
    expect(harness.paths.every((path) => path === '/workspaces/copied-project')).toBe(true);
    const count = harness.entries.length;
    harness.follow.observed({ status: 'running', port: 6193 });
    await harness.drain();
    expect(harness.entries).toHaveLength(count);
  });

  it('fully drains every later move of 1001 bound Frames without another running observation', async () => {
    const harness = portFollowHarness(largePortFollowDoc());
    harness.follow.observed({ status: 'running', port: 5182 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    for (const port of [6193, 7204]) {
      const batchStart = harness.batches.length;
      harness.follow.observed({ status: 'running', port });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(harness.batches.slice(batchStart).filter((size) => size > 0)).toEqual([1000, 1]);
      expectAllPortFollowHomes(harness.doc(), port);
      const count = harness.entries.length;
      harness.follow.observed({ status: 'running', port });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(harness.entries).toHaveLength(count);
    }
  });

  it('retains old-port work after refusal and retries a repeated desired-port report', async () => {
    const harness = portFollowHarness(largePortFollowDoc(false));
    harness.follow.observed({ status: 'running', port: 5182 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    harness.refuseNext();
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expectAllPortFollowHomes(harness.doc(), 5182);
    expect(harness.entries).toHaveLength(0);
    const batchStart = harness.batches.length;
    harness.follow.observed({ status: 'running', port: 6193 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(harness.batches.slice(batchStart).filter((size) => size > 0)).toEqual([1000, 1]);
    expectAllPortFollowHomes(harness.doc(), 6193);
  });

  it('keeps refused from-ports through a newer desired port and never transfers them to another document', async () => {
    const harness = portFollowHarness(largePortFollowDoc(false));
    harness.follow.observed({ status: 'running', port: 5182 });
    harness.refuseNext();
    harness.follow.observed({ status: 'running', port: 6193 });
    harness.follow.observed({ status: 'running', port: 7204 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expectAllPortFollowHomes(harness.doc(), 7204);
    harness.swap({ ...largePortFollowDoc(false), docId: 'another-document' });
    const count = harness.entries.length;
    harness.follow.observed({ status: 'running', port: 8305 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expectAllPortFollowHomes(harness.doc(), 5182);
    expect(harness.entries).toHaveLength(count);
  });

  it('shares bounded draining with reverify and retains work when its first batch is refused', async () => {
    const harness = portFollowHarness(largePortFollowDoc(false));
    const move = createReverifyMoveAuthor(harness.apply);
    harness.refuseNext();
    await move(5182, 6193);
    expectAllPortFollowHomes(harness.doc(), 5182);
    const batchStart = harness.batches.length;
    await move(5182, 6193);
    expect(harness.batches.slice(batchStart).filter((size) => size > 0)).toEqual([1000, 1]);
    expectAllPortFollowHomes(harness.doc(), 6193);
    const count = harness.entries.length;
    await move(5182, 6193);
    expect(harness.entries).toHaveLength(count);
  });

  it('drains 1001 copied routes from the first server observation without touching external homes', async () => {
    const doc = fixtureDoc();
    doc.nodes = {};
    for (let index = 0; index < 1001; index += 1) {
      const id = `copied-${index}`;
      doc.nodes[id] = {
        id, pageId: FIXTURE_PAGE, kind: 'browser', name: id,
        x: 0, y: 0, width: 640, height: 480, order: index,
        content: { homeUrl: 'about:blank', pendingHomeUrl: `http://localhost:4317/route/${index}?sort=new#details` },
      };
    }
    doc.nodes.external = {
      id: 'external', pageId: FIXTURE_PAGE, kind: 'browser', name: 'Reference',
      x: 0, y: 0, width: 640, height: 480, order: 1001,
      content: { homeUrl: 'https://example.com/reference?q=one#section' },
    };
    const harness = portFollowHarness(doc);
    harness.follow.observed({ status: 'running', port: 5182 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(harness.batches.filter((size) => size > 0)).toEqual([1000, 1]);
    expect(harness.entries).toHaveLength(1001);
    for (let index = 0; index < 1001; index += 1) {
      const frame = harness.doc()?.nodes[`copied-${index}`];
      if (frame?.kind !== 'browser') throw new Error('expected copied browser');
      expect(frame.content).toEqual({ homeUrl: `http://localhost:5182/route/${index}?sort=new#details` });
    }
    expect(homeUrlOf(harness.doc(), 'external')).toBe('https://example.com/reference?q=one#section');
    harness.follow.observed({ status: 'running', port: 5182 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(harness.entries).toHaveLength(1001);
  });
  it('a measured move from port A to B authors exactly one system op per frame homed on A; a first measurement authors nothing', () => {
    const h = portFollowHarness(fixtureDoc());

    h.follow.observed({ status: 'running', port: 3000 });
    expect(h.entries).toEqual([]);

    h.follow.observed({ status: 'running', port: 5173 });
    expect(h.entries).toEqual([
      {
        revision: 7,
        author: 'system',
        at: context.at,
        op: { type: 'set-home-url', id: 'fr_b2', homeUrl: 'http://localhost:5173/design-system' },
        prior: { kind: 'fields', id: 'fr_b2', fields: { homeUrl: 'http://localhost:3000/design-system', pendingHomeUrl: null } },
      },
    ]);
    expect(homeUrlOf(h.doc(), 'fr_a1')).toBe('http://localhost:3001');

    h.follow.observed({ status: 'running', port: 5173 });
    expect(h.entries).toHaveLength(1);
  });

  it('the tracked port survives a stop: kill the server, restart on a new port, the homes still follow', () => {
    const h = portFollowHarness(fixtureDoc());
    h.follow.observed({ status: 'running', port: 3000 });
    h.follow.observed({ status: 'stopped' });
    h.follow.observed({ status: 'running', port: 5173 });
    expect(h.entries).toHaveLength(1);
    expect(homeUrlOf(h.doc(), 'fr_b2')).toBe('http://localhost:5173/design-system');
  });

  it('a port learned under one document never rewrites another — the memory is docId-keyed', () => {
    const h = portFollowHarness(fixtureDoc());
    h.follow.observed({ status: 'running', port: 3000 });

    h.swap({ ...fixtureDoc(), docId: 'doc_other' });
    h.follow.observed({ status: 'running', port: 5173 });
    expect(h.entries).toEqual([]);
  });

  it('the reverify-move author walks the dead port, as system, with no prior measurement', () => {
    let doc = fixtureDoc();
    const entries: CanvasOpEntry[] = [];
    const move = createReverifyMoveAuthor(async (author, resolve) => {
      const resolved = resolve(doc);
      if ('reason' in resolved) throw new Error(resolved.reason);
      for (const op of resolved) {
        const result = accept(applyOp(doc, op, { author, at: context.at }));
        doc = result.doc;
        entries.push(result.entry);
      }
      return undefined;
    });

    move(3000, 5173);
    expect(entries).toEqual([
      {
        revision: 7,
        author: 'system',
        at: context.at,
        op: { type: 'set-home-url', id: 'fr_b2', homeUrl: 'http://localhost:5173/design-system' },
        prior: { kind: 'fields', id: 'fr_b2', fields: { homeUrl: 'http://localhost:3000/design-system', pendingHomeUrl: null } },
      },
    ]);
    expect(homeUrlOf(doc, 'fr_a1')).toBe('http://localhost:3001');

    move(5173, 5173);
    expect(entries).toHaveLength(1);
  });

  it('portFollowOps is one op per affected node, none for other ports or other machines (pure)', () => {
    const doc = deepFreeze(fixtureDoc());
    const both = accept(
      applyOp(doc, { type: 'set-home-url', id: 'fr_a1', homeUrl: 'http://localhost:3000/checkout' }, context),
    ).doc;
    expect(portFollowOps(both, 3000, 5173)).toEqual([
      { type: 'set-home-url', id: 'fr_a1', homeUrl: 'http://localhost:5173/checkout' },
      { type: 'set-home-url', id: 'fr_b2', homeUrl: 'http://localhost:5173/design-system' },
    ]);

    const remote = accept(
      applyOp(doc, { type: 'set-home-url', id: 'fr_b2', homeUrl: 'https://example.com:3000/' }, context),
    ).doc;
    expect(portFollowOps(remote, 3000, 5173)).toEqual([]);
  });

  it('binds every apply call to ITS OWN project (ONL-2226 phase 3) — an unbound call would author into whatever is forward', () => {
    const seenWorktreePaths: (string | undefined)[] = [];
    const follow = createServerPortFollow(async (_author, _resolve, worktreePath) => {
      seenWorktreePaths.push(worktreePath);
      return { ok: false, reason: 'not exercised — this case only inspects the binding' };
    }, '/workspaces/background-project');

    follow.observed({ status: 'running', port: 3000 });
    follow.observed({ status: 'running', port: 5173 });

    expect(seenWorktreePaths).toEqual(['/workspaces/background-project', '/workspaces/background-project']);
  });
});

describe('the agent author: set_frame_url resolution (ONL-1995)', () => {
  it('retargets exactly the frame it was given', () => {
    expect(resolveFrameUrlOps(deepFreeze(fixtureDoc()), 'http://localhost:5173', {
      frameId: 'fr_a1',
    })).toEqual([{ type: 'set-home-url', id: 'fr_a1', homeUrl: 'http://localhost:5173/' }]);

    expect(resolveFrameUrlOps(fixtureDoc(), 'http://localhost:5173', { frameId: 'fr_b2' })).toEqual([
      { type: 'set-home-url', id: 'fr_b2', homeUrl: 'http://localhost:5173/' },
    ]);
  });

  it('an address Studio cannot navigate to is a rejection, never a document write', () => {
    for (const junk of ['ftp://localhost:21', 'file:///etc/passwd', 'not a url at all', '']) {
      expect(resolveFrameUrlOps(fixtureDoc(), junk, { frameId: 'fr_a1' })).toHaveProperty('reason');
    }
  });

  it('an id that names no frame is declined — never a create, and never another frame', () => {
    const missed = resolveFrameUrlOps(fixtureDoc(), '5173', { frameId: 'fr_gone' });
    if (!('reason' in missed)) throw new Error('expected a rejection');
    expect(missed.reason).toContain('fr_gone');
  });
});

describe('the agent author: the canvas verbs (ONL-1995)', () => {
  const mint = (): string => 'fr_minted';
  const at = '2026-08-14T09:00:00Z';
  const doc = (): CanvasDoc => deepFreeze(fixtureDoc());

  describe('create_frame', () => {
    it('authors `create` from a url, at the shared tiling placement when none is given', () => {
      const ops = resolveCreateFrameOps(doc(), { url: 'http://localhost:5173', mintId: mint, at });
      expect(ops).toHaveLength(1);
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'create' || !isBrowserNode(op.node)) {
        throw new Error('expected a browser frame create');
      }
      expect(op.node.content.homeUrl).toBe('http://localhost:5173/');
      expect(op.node).toMatchObject({ id: 'fr_minted', kind: 'browser', y: 0 });
      expect(op.node.x).toBeGreaterThan(0);
    });

    it('authors `duplicate` from a source frame, with provenance and the source’s address', () => {
      const ops = resolveCreateFrameOps(doc(), { fromFrameId: 'fr_a1', mintId: mint, at });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'duplicate' || !isBrowserNode(op.node)) {
        throw new Error('expected a browser frame duplicate');
      }
      expect(op.node.provenance).toEqual({ from: 'fr_a1', at });
      expect(op.node.content.homeUrl).toBe((fixtureDoc().nodes['fr_a1'] as BrowserNode).content.homeUrl);
      expect(op.node.id).toBe('fr_minted');
    });

    it('a create from a url records NO provenance', () => {
      const ops = resolveCreateFrameOps(doc(), { url: 'http://localhost:5173', mintId: mint, at });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'create') throw new Error('expected a create');
      expect('provenance' in op.node && op.node.provenance !== undefined).toBe(false);
    });

    it('places a copy immediately right of its source — the shared placement, not a position this module chose', () => {
      const ops = resolveCreateFrameOps(doc(), { fromFrameId: 'fr_a1', mintId: mint, at });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'duplicate') throw new Error('expected a duplicate');
      const source = fixtureDoc().nodes.fr_a1;
      if (!source) throw new Error('fixture is missing fr_a1');
      expect({ x: op.node.x, y: op.node.y }).toEqual({
        x: source.x + source.width + PLACEMENT_GAP,
        y: source.y,
      });
    });

    it('honours an explicit position exactly, on both branches', () => {
      const fromUrl = resolveCreateFrameOps(doc(), {
        url: 'http://localhost:5173',
        x: -400,
        y: 900,
        mintId: mint,
        at,
      });
      expect((fromUrl as CanvasOp[])[0]).toMatchObject({ node: { x: -400, y: 900 } });
      const fromSource = resolveCreateFrameOps(doc(), {
        fromFrameId: 'fr_a1',
        x: 7,
        y: 8,
        mintId: mint,
        at,
      });
      expect((fromSource as CanvasOp[])[0]).toMatchObject({ node: { x: 7, y: 8 } });
    });

    it('lands the new frame ON TOP — one past the highest order', () => {
      const ops = resolveCreateFrameOps(doc(), { url: 'http://localhost:5173', mintId: mint, at });
      expect((ops as CanvasOp[])[0]).toMatchObject({ node: { order: 2 } });
    });

    it('declines a source frame that is not there', () => {
      expect(resolveCreateFrameOps(doc(), { fromFrameId: 'ghost', mintId: mint, at })).toHaveProperty('reason');
    });

    it('declines a call naming neither a url nor a source', () => {
      expect(resolveCreateFrameOps(doc(), { mintId: mint, at })).toHaveProperty('reason');
    });

    it('declines an address that does not normalize, rather than writing it', () => {
      expect(resolveCreateFrameOps(doc(), { url: 'not a url', mintId: mint, at })).toHaveProperty('reason');
    });
  });

  describe('beside placement (ONL-2199)', () => {
    const anchor: CanvasNode = {
      id: 'anchor',
      pageId: 'pg_main',
      kind: 'browser',
      name: 'Anchor',
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      order: 0,
      content: { homeUrl: 'http://localhost:4000' },
    };
    const anchorOnly = (): CanvasDoc => ({
      schemaVersion: 1,
      docId: 'doc_beside',
      revision: 1,
      pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
      nodes: { anchor },
    });

    it('places a new frame beside a NAMED anchor, defaulting to its right', () => {
      const ops = resolveCreateFrameOps(anchorOnly(), {
        url: 'http://localhost:5173',
        beside: 'anchor',
        mintId: mint,
        at,
      });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'create') throw new Error('expected a create');
      expect({ x: op.node.x, y: op.node.y }).toEqual({ x: anchor.width + PLACEMENT_GAP, y: 0 });
    });

    it('honours side, with the taller vertical gap for below/above', () => {
      const ops = resolveCreateFrameOps(anchorOnly(), {
        url: 'http://localhost:5173',
        beside: 'anchor',
        side: 'below',
        mintId: mint,
        at,
      });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'create') throw new Error('expected a create');
      expect({ x: op.node.x, y: op.node.y }).toEqual({
        x: 0,
        y: anchor.height + VERTICAL_PLACEMENT_GAP,
      });
    });

    it('declines beside combined with x/y, on both create_frame and move_frame', () => {
      expect(
        resolveCreateFrameOps(anchorOnly(), {
          url: 'http://localhost:5173',
          beside: 'anchor',
          x: 1,
          y: 1,
        }),
      ).toHaveProperty('reason');
      expect(
        resolveMoveFrameOps(anchorOnly(), { frameId: 'anchor', beside: 'anchor', x: 1 }),
      ).toHaveProperty('reason');
    });

    it('declines a beside anchor that is not there', () => {
      expect(
        resolveCreateFrameOps(anchorOnly(), { url: 'http://localhost:5173', beside: 'ghost' }),
      ).toHaveProperty('reason');
    });

    it('an explicit beside on a copy overrides the implicit source anchor', () => {
      const source: CanvasNode = {
        id: 'source',
        pageId: 'pg_main',
        kind: 'browser',
        name: 'Source',
        x: 900,
        y: 900,
        width: 200,
        height: 100,
        order: 1,
        content: { homeUrl: 'http://localhost:5000' },
      };
      const withSource: CanvasDoc = {
        ...anchorOnly(),
        nodes: { anchor, source },
      };
      const ops = resolveCreateFrameOps(withSource, {
        fromFrameId: 'source',
        beside: 'anchor',
        mintId: mint,
        at,
      });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'duplicate') throw new Error('expected a duplicate');
      expect({ x: op.node.x, y: op.node.y }).toEqual({ x: anchor.width + PLACEMENT_GAP, y: 0 });
    });

    it('jumps a blocker even when it sits off the naive slot — the overlap this stage fixes', () => {
      const source: CanvasNode = {
        id: 'src',
        pageId: 'pg_main',
        kind: 'browser',
        name: 'Source',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        order: 0,
        content: { homeUrl: 'http://localhost:4000' },
      };
      const blocker: CanvasNode = {
        id: 'blk',
        pageId: 'pg_main',
        kind: 'browser',
        name: 'Blocker',
        x: source.width + PLACEMENT_GAP + 5,
        y: 0,
        width: 200,
        height: 100,
        order: 1,
        content: { homeUrl: 'http://localhost:4001' },
      };
      const custom: CanvasDoc = {
        schemaVersion: 1,
        docId: 'doc_overlap',
        revision: 2,
        pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
        nodes: { src: source, blk: blocker },
      };
      const ops = resolveCreateFrameOps(custom, { fromFrameId: 'src', mintId: mint, at });
      const op = (ops as CanvasOp[])[0];
      if (op?.type !== 'duplicate') throw new Error('expected a duplicate');
      expect({ x: op.node.x, y: op.node.y }).toEqual({
        x: blocker.x + blocker.width + PLACEMENT_GAP,
        y: 0,
      });
    });
  });

  describe('move_frame', () => {
    it('authors `move` when no size is given', () => {
      expect(resolveMoveFrameOps(doc(), { frameId: 'fr_a1', x: 500, y: 600 })).toEqual([
        { type: 'move', id: 'fr_a1', x: 500, y: 600 },
      ]);
    });

    it('authors ONE `resize` when a size is given, never a move and a resize', () => {
      const ops = resolveMoveFrameOps(doc(), {
        frameId: 'fr_a1',
        x: 5,
        y: 6,
        width: 390,
        height: 844,
      });
      expect(ops).toEqual([{ type: 'resize', id: 'fr_a1', x: 5, y: 6, width: 390, height: 844 }]);
    });

    it('keeps the position when a resize names only a size', () => {
      const source = fixtureDoc().nodes.fr_a1;
      expect(resolveMoveFrameOps(doc(), { frameId: 'fr_a1', width: 390 })).toEqual([
        {
          type: 'resize',
          id: 'fr_a1',
          x: source?.x ?? 0,
          y: source?.y ?? 0,
          width: 390,
          height: source?.height ?? 0,
        },
      ]);
    });

    it('declines a move that changes nothing', () => {
      const source = fixtureDoc().nodes.fr_a1;
      const outcome = resolveMoveFrameOps(doc(), {
        frameId: 'fr_a1',
        x: source?.x,
        y: source?.y,
      });
      expect(outcome).toHaveProperty('reason');
    });

    it('declines a non-positive size', () => {
      expect(resolveMoveFrameOps(doc(), { frameId: 'fr_a1', width: 0 })).toHaveProperty('reason');
    });

    it('declines a frame that is not there', () => {
      expect(resolveMoveFrameOps(doc(), { frameId: 'ghost', x: 1 })).toHaveProperty('reason');
    });

    it('places the moved frame beside a named anchor (ONL-2199)', () => {
      const anchor: CanvasNode = {
        id: 'anchor',
        pageId: 'pg_main',
        kind: 'browser',
        name: 'Anchor',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        order: 0,
        content: { homeUrl: 'http://localhost:4000' },
      };
      const mover: CanvasNode = {
        id: 'mover',
        pageId: 'pg_main',
        kind: 'browser',
        name: 'Mover',
        x: 900,
        y: 900,
        width: 200,
        height: 100,
        order: 1,
        content: { homeUrl: 'http://localhost:4001' },
      };
      const custom: CanvasDoc = {
        schemaVersion: 1,
        docId: 'doc_move_beside',
        revision: 2,
        pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
        nodes: { anchor, mover },
      };
      expect(resolveMoveFrameOps(custom, { frameId: 'mover', beside: 'anchor' })).toEqual([
        { type: 'move', id: 'mover', x: anchor.width + PLACEMENT_GAP, y: 0 },
      ]);
    });
  });

  describe('rename_frame', () => {
    it('authors one `rename`, trimmed', () => {
      expect(resolveRenameFrameOps(doc(), { frameId: 'fr_a1', name: '  Storefront  ' })).toEqual([
        { type: 'rename', id: 'fr_a1', name: 'Storefront' },
      ]);
    });

    it('declines an empty name, padding included', () => {
      expect(resolveRenameFrameOps(doc(), { frameId: 'fr_a1', name: '   ' })).toHaveProperty('reason');
    });

    it('declines a rename to the name it already has', () => {
      const name = fixtureDoc().nodes.fr_a1?.name ?? '';
      expect(resolveRenameFrameOps(doc(), { frameId: 'fr_a1', name })).toHaveProperty('reason');
    });

    it('declines a frame that is not there', () => {
      expect(resolveRenameFrameOps(doc(), { frameId: 'ghost', name: 'x' })).toHaveProperty(
        'reason',
      );
    });
  });

  describe('reorder_frame', () => {
    const stacked = (): CanvasDoc => {
      const base = fixtureDoc();
      const a = base.nodes.fr_a1 as CanvasNode;
      return {
        ...base,
        nodes: {
          back: { ...a, id: 'back', name: 'back', order: 0 },
          middle: { ...a, id: 'middle', name: 'middle', order: 1 },
          upper: { ...a, id: 'upper', name: 'upper', order: 2 },
          front: { ...a, id: 'front', name: 'front', order: 4 },
        },
      };
    };

    it('front lands above every frame, back below every frame', () => {
      expect(resolveReorderFrameOps(stacked(), { frameId: 'middle', position: 'front' })).toEqual([
        { type: 'reorder', id: 'middle', order: 5 },
      ]);
      expect(resolveReorderFrameOps(stacked(), { frameId: 'upper', position: 'back' })).toEqual([
        { type: 'reorder', id: 'upper', order: -1 },
      ]);
    });

    it('forward and backward pass exactly one neighbour, landing between it and the next', () => {
      expect(resolveReorderFrameOps(stacked(), { frameId: 'back', position: 'forward' })).toEqual([
        { type: 'reorder', id: 'back', order: 1.5 },
      ]);
      expect(resolveReorderFrameOps(stacked(), { frameId: 'front', position: 'backward' })).toEqual([
        { type: 'reorder', id: 'front', order: 1.5 },
      ]);
    });

    it('forward and backward past the last neighbour step one beyond it', () => {
      expect(resolveReorderFrameOps(stacked(), { frameId: 'upper', position: 'forward' })).toEqual([
        { type: 'reorder', id: 'upper', order: 5 },
      ]);
      expect(resolveReorderFrameOps(stacked(), { frameId: 'middle', position: 'backward' })).toEqual([
        { type: 'reorder', id: 'middle', order: -1 },
      ]);
    });

    it('declines raising the top node or lowering the bottom one, naming no frame', () => {
      const refusalOf = (frameId: string, position: StackPosition): string => {
        const outcome = resolveReorderFrameOps(stacked(), { frameId, position });
        if (Array.isArray(outcome)) throw new Error('expected a refusal');
        return outcome.reason;
      };
      for (const position of ['front', 'forward'] as const) {
        expect(refusalOf('front', position)).toContain('"front"');
        expect(refusalOf('front', position)).not.toContain('frame');
      }
      for (const position of ['back', 'backward'] as const) {
        expect(refusalOf('back', position)).toContain('"back"');
        expect(refusalOf('back', position)).not.toContain('frame');
      }
    });

    it('declines a frame that is not there', () => {
      expect(resolveReorderFrameOps(stacked(), { frameId: 'ghost', position: 'front' })).toHaveProperty(
        'reason',
      );
    });
  });

  describe('remove_frame', () => {
    it('authors one `remove`', () => {
      expect(resolveRemoveFrameOps(doc(), { frameId: 'fr_a1' })).toEqual([
        { type: 'remove', id: 'fr_a1' },
      ]);
    });

    it('declines a frame that is not there', () => {
      expect(resolveRemoveFrameOps(doc(), { frameId: 'ghost' })).toHaveProperty('reason');
    });
  });

  describe('atomic group verbs', () => {
    it('moves every frame by one shared delta, preserving relative geometry', () => {
      expect(
        resolveMoveFramesOps(doc(), {
          frameIds: ['fr_a1', 'fr_b2'],
          deltaX: 30,
          deltaY: -20,
        }),
      ).toEqual([
        { type: 'move', id: 'fr_a1', x: 1450, y: 880 },
        { type: 'move', id: 'fr_b2', x: 1390, y: -20 },
      ]);
    });

    it('duplicates in request order with one shared offset and fresh ids', () => {
      const ids = ['copy-a', 'copy-b'];
      const ops = resolveDuplicateFramesOps(doc(), {
        frameIds: ['fr_a1', 'fr_b2'],
        offsetX: 40,
        offsetY: 50,
        mintId: () => ids.shift() ?? 'unexpected',
        at: '2026-08-22T00:00:00Z',
      });
      expect(ops).toMatchObject([
        {
          type: 'duplicate',
          node: { id: 'copy-a', x: 1460, y: 950, order: 2, provenance: { from: 'fr_a1' } },
        },
        {
          type: 'duplicate',
          node: { id: 'copy-b', x: 1400, y: 50, order: 3, provenance: { from: 'fr_b2' } },
        },
      ]);
    });

    it('keeps a label’s blank name, so the copy still reads as its own words (ONL-2486)', () => {
      const base = mixedDoc();
      const doc = deepFreeze({ ...base, nodes: { ...base.nodes, tx_1: textNode({ name: '' }) } });
      const shared = { frameIds: ['tx_1'], at: '2026-09-30T00:00:00Z' };

      const withOffset = resolveDuplicateFramesOps(doc, {
        ...shared,
        offsetX: 40,
        offsetY: 50,
        mintId: () => 'copy-a',
      });
      const beside = resolveDuplicateFramesOps(doc, { ...shared, mintId: () => 'copy-b' });

      expect(withOffset).toMatchObject([{ type: 'duplicate', node: { id: 'copy-a', name: '' } }]);
      expect(beside).toMatchObject([{ type: 'duplicate', node: { id: 'copy-b', name: '' } }]);
    });

    it('still names the copy of a node that carries a name', () => {
      const doc = deepFreeze(mixedDoc());
      const shared = { frameIds: ['tx_1'], at: '2026-09-30T00:00:00Z' };

      expect(
        resolveDuplicateFramesOps(doc, { ...shared, mintId: () => 'copy-a' }),
      ).toMatchObject([{ type: 'duplicate', node: { name: 'Checkout notes copy' } }]);
    });

    it('places each copy beside its OWN source when offsets are omitted, accumulating occupancy (ONL-2199)', () => {
      // Neither fixture frame's beside slot overlaps the other's, so this pins the accumulation.
      const ids = ['copy-a', 'copy-b'];
      const ops = resolveDuplicateFramesOps(doc(), {
        frameIds: ['fr_a1', 'fr_b2'],
        mintId: () => ids.shift() ?? 'unexpected',
        at: '2026-08-22T00:00:00Z',
      });
      const a1 = fixtureDoc().nodes.fr_a1;
      const b2 = fixtureDoc().nodes.fr_b2;
      if (!a1 || !b2) throw new Error('fixture is missing a frame');
      expect(ops).toMatchObject([
        {
          type: 'duplicate',
          node: {
            id: 'copy-a',
            x: a1.x + a1.width + PLACEMENT_GAP,
            y: a1.y,
            order: 2,
            provenance: { from: 'fr_a1' },
          },
        },
        {
          type: 'duplicate',
          node: {
            id: 'copy-b',
            x: b2.x + b2.width + PLACEMENT_GAP,
            y: b2.y,
            order: 3,
            provenance: { from: 'fr_b2' },
          },
        },
      ]);
    });

    it('declines one offset given without the other, rather than treating it as zero', () => {
      expect(resolveDuplicateFramesOps(doc(), { frameIds: ['fr_a1'], offsetX: 10 })).toHaveProperty('reason');
      expect(resolveDuplicateFramesOps(doc(), { frameIds: ['fr_a1'], offsetY: 10 })).toHaveProperty('reason');
    });

    it('removes in request order', () => {
      expect(resolveRemoveFramesOps(doc(), { frameIds: ['fr_b2', 'fr_a1'] })).toEqual([
        { type: 'remove', id: 'fr_b2' },
        { type: 'remove', id: 'fr_a1' },
      ]);
    });

    it('rejects empty, duplicate, over-cap, and missing lists before returning any op', () => {
      expect(
        resolveMoveFramesOps(doc(), { frameIds: [], deltaX: 1, deltaY: 0 }),
      ).toHaveProperty('reason');
      expect(resolveRemoveFramesOps(doc(), { frameIds: ['fr_a1', 'fr_a1'] })).toHaveProperty('reason');
      expect(
        resolveRemoveFramesOps(doc(), {
          frameIds: Array.from({ length: 1001 }, (_, i) => `f${i}`),
        }),
      ).toHaveProperty('reason');
      expect(resolveRemoveFramesOps(doc(), { frameIds: ['fr_a1', 'ghost'] })).toHaveProperty('reason');
    });
  });
});

describe('pages in the document', () => {
  const page = (id: string, name: string, order: number): CanvasPage => ({ id, name, order });

  function pagedDoc(pages: CanvasPage[], nodes: CanvasNode[] = []): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: 'doc_pages',
      revision: 1,
      pages: Object.fromEntries(pages.map((one) => [one.id, one])),
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  const label = (id: string, pageId: string, order = 0): CanvasNode & { provenance?: never } => ({
    id,
    pageId,
    kind: 'text',
    name: '',
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order,
    content: { text: id, size: 'medium' },
  });

  const onePage = (): CanvasDoc => pagedDoc([page('pg_1', 'Checkout', 0)]);
  const twoPages = (): CanvasDoc =>
    pagedDoc([page('pg_1', 'Checkout', 0), page('pg_2', 'Settings', 1)]);

  it('mints no page in an empty document, so a fixture replay never depends on a generated id', () => {
    expect(emptyCanvasDoc('doc_empty').pages).toEqual({});
  });

  it('rejects a create whose page id names no page, and the revision does not move', () => {
    const doc = deepFreeze(onePage());
    expect(expectRejection(doc, { type: 'create', node: label('tx_1', 'pg_ghost') })).toContain(
      'pg_ghost',
    );
    expect(expectRejection(doc, { type: 'create', node: label('tx_1', '') })).toContain('create:');
  });

  it('rejects a duplicate whose page id names no page', () => {
    const doc = deepFreeze(onePage());
    const node = { ...label('tx_1', 'pg_ghost'), provenance: { from: 'tx_0', at: context.at } };
    expect(expectRejection(doc, { type: 'duplicate', node })).toContain('pg_ghost');
  });

  it('accepts a create onto a page the document holds', () => {
    const { doc } = accept(
      applyOp(deepFreeze(onePage()), { type: 'create', node: label('tx_1', 'pg_1') }, context),
    );
    expect(doc.nodes['tx_1']?.pageId).toBe('pg_1');
  });

  it('refuses a create and a duplicate onto a divider, whatever route authored it', () => {
    const withRule = deepFreeze(pagedDoc([page('pg_1', 'Checkout', 0), page('pg_rule', '---', 1)]));
    expect(expectRejection(withRule, { type: 'create', node: label('tx_1', 'pg_rule') })).toContain(
      'divider',
    );
    expect(
      expectRejection(withRule, {
        type: 'duplicate',
        node: { ...label('tx_2', 'pg_rule'), provenance: { from: 'tx_1', at: context.at } },
      }),
    ).toContain('divider');
  });

  it('puts an object back on a page that became a divider, because an inverse restores rather than places', () => {
    const withRule = deepFreeze(pagedDoc([page('pg_1', 'Checkout', 0), page('pg_rule', '---', 1)]));
    const restored = applyOp(withRule, { type: 'create', node: label('tx_1', 'pg_rule') }, {
      ...context,
      restoring: true,
    });
    if (!restored.ok) throw new Error(restored.reason);
    expect(restored.doc.nodes['tx_1']?.pageId).toBe('pg_rule');
  });

  it("lands the agent's default create on the first page that is not a divider", () => {
    const ops = resolveCreateFrameOps(
      deepFreeze(pagedDoc([page('pg_rule', '---', 0), page('pg_1', 'Checkout', 1)])),
      { url: 'http://localhost:5173', mintId: () => 'fr_1', at: context.at },
    );
    expect((ops as CanvasOp[])[0]).toMatchObject({ node: { pageId: 'pg_1' } });
  });

  it('refuses a create-page whose id is already taken', () => {
    expect(
      expectRejection(deepFreeze(onePage()), {
        type: 'create-page',
        page: page('pg_1', 'Another', 5),
      }),
    ).toContain('already exists');
  });

  it('refuses a create-page whose order is not finite', () => {
    expect(
      expectRejection(deepFreeze(onePage()), {
        type: 'create-page',
        page: { id: 'pg_2', name: 'Settings', order: Number.NaN },
      }),
    ).toContain('finite');
  });

  it('adds a page and inverts back to removing it', () => {
    const added = accept(
      applyOp(deepFreeze(onePage()), { type: 'create-page', page: page('pg_2', 'Settings', 1) }, context),
    );
    expect(added.doc.pages['pg_2']).toEqual(page('pg_2', 'Settings', 1));
    expect(added.entry.prior).toEqual({ kind: 'none' });
    expect(invertOp(added.entry)).toEqual({ type: 'remove-page', pageId: 'pg_2' });
  });

  it('refuses removing the only page, naming it as the last one', () => {
    const reason = expectRejection(deepFreeze(onePage()), { type: 'remove-page', pageId: 'pg_1' });
    expect(reason).toContain('last page');
    expect(reason).toContain('pg_1');
  });

  it('refuses removing the last page that is not a divider, and takes the divider beside it', () => {
    const withRule = pagedDoc([page('pg_1', 'Checkout', 0), page('pg_rule', '---', 1)]);
    const reason = expectRejection(deepFreeze(withRule), { type: 'remove-page', pageId: 'pg_1' });
    expect(reason).toContain('not a divider');
    expect(reason).toContain('pg_1');
    expect(
      accept(applyOp(deepFreeze(withRule), { type: 'remove-page', pageId: 'pg_rule' }, context)).doc
        .pages,
    ).toEqual({ pg_1: page('pg_1', 'Checkout', 0) });
    expect(
      accept(applyOp(deepFreeze(twoPages()), { type: 'remove-page', pageId: 'pg_1' }, context)).doc
        .pages,
    ).toEqual({ pg_2: page('pg_2', 'Settings', 1) });
  });

  it('lands an orphaned node on the first page that is not a divider, and on a divider only when every page is one', () => {
    expect(
      everyNodeAdoptionOps(
        pagedDoc([page('pg_rule', '---', 0), page('pg_1', 'Checkout', 1)], [label('tx_1', 'pg_gone')]),
      ),
    ).toEqual([{ type: 'set-node-page', id: 'tx_1', pageId: 'pg_1' }]);
    expect(
      everyNodeAdoptionOps(pagedDoc([page('pg_rule', '---', 0)], [label('tx_1', 'pg_gone')])),
    ).toEqual([{ type: 'set-node-page', id: 'tx_1', pageId: 'pg_rule' }]);
  });

  it('applies every adoption op it authors, dividers or not, so an existing canvas still opens', () => {
    const allRules = pagedDoc(
      [page('pg_rule', '---', 0), page('pg_rule_2', '---', 1)],
      [label('tx_1', 'pg_gone')],
    );
    const adopted = everyNodeAdoptionOps(allRules).reduce(
      (doc, op) => accept(applyOp(doc, op, context)).doc,
      allRules,
    );
    expect(adopted.nodes['tx_1']?.pageId).toBe('pg_rule');
  });

  it('refuses removing a page that still holds nodes, so the caller batches the removals first', () => {
    const doc = deepFreeze(twoPages());
    const held = accept(applyOp(doc, { type: 'create', node: label('tx_1', 'pg_2') }, context));
    expect(expectRejection(held.doc, { type: 'remove-page', pageId: 'pg_2' })).toContain('still holds');
  });

  it('refuses a remove-page naming no page', () => {
    expect(expectRejection(deepFreeze(twoPages()), { type: 'remove-page', pageId: 'pg_ghost' })).toContain(
      'no page "pg_ghost"',
    );
  });

  it('restores a removed page with its exact name and order when undone', () => {
    const doc = deepFreeze(twoPages());
    const removed = accept(applyOp(doc, { type: 'remove-page', pageId: 'pg_2' }, context));
    expect(removed.doc.pages['pg_2']).toBeUndefined();
    expect(removed.entry.prior).toEqual({ kind: 'page', page: page('pg_2', 'Settings', 1) });
    const restored = accept(applyOp(removed.doc, invertOp(removed.entry), context));
    expect(restored.doc.pages['pg_2']).toEqual(page('pg_2', 'Settings', 1));
  });

  it('moves a node between pages, capturing its previous page, and inverts back to it', () => {
    const doc = accept(
      applyOp(deepFreeze(twoPages()), { type: 'create', node: label('tx_1', 'pg_1') }, context),
    ).doc;
    const moved = accept(applyOp(doc, { type: 'set-node-page', id: 'tx_1', pageId: 'pg_2' }, context));
    expect(moved.doc.nodes['tx_1']?.pageId).toBe('pg_2');
    expect(moved.entry.prior).toEqual({ kind: 'fields', id: 'tx_1', fields: { pageId: 'pg_1' } });
    const back = accept(applyOp(moved.doc, invertOp(moved.entry), context));
    expect(back.doc.nodes['tx_1']?.pageId).toBe('pg_1');
  });

  it('refuses a set-node-page naming an unknown node or an unknown page', () => {
    const doc = accept(
      applyOp(deepFreeze(twoPages()), { type: 'create', node: label('tx_1', 'pg_1') }, context),
    ).doc;
    expect(expectRejection(doc, { type: 'set-node-page', id: 'ghost', pageId: 'pg_2' })).toContain(
      'no node "ghost"',
    );
    expect(expectRejection(doc, { type: 'set-node-page', id: 'tx_1', pageId: 'pg_ghost' })).toContain(
      'no page "pg_ghost"',
    );
  });

  it('refuses renaming the last non-divider page to a divider, and allows it once a sibling remains', () => {
    expect(
      expectRejection(deepFreeze(onePage()), { type: 'rename-page', pageId: 'pg_1', name: '---' }),
    ).toContain('pg_1');
    const { doc } = accept(
      applyOp(deepFreeze(twoPages()), { type: 'rename-page', pageId: 'pg_1', name: '---' }, context),
    );
    expect(doc.pages['pg_1']?.name).toBe('---');
  });

  it('lets a divider be renamed back to an ordinary page', () => {
    const doc = pagedDoc([page('pg_1', '---', 0), page('pg_2', 'Settings', 1)]);
    const { doc: next } = accept(
      applyOp(deepFreeze(doc), { type: 'rename-page', pageId: 'pg_1', name: 'Checkout' }, context),
    );
    expect(isDividerPage(next.pages['pg_1']!)).toBe(false);
  });

  it('reads a name that trims to three dashes as a divider, and two or four as ordinary', () => {
    const doc = deepFreeze(twoPages());
    const renamed = (name: string): CanvasPage =>
      accept(applyOp(doc, { type: 'rename-page', pageId: 'pg_1', name }, context)).doc.pages['pg_1']!;
    expect(isDividerPage(renamed('  ---  '))).toBe(true);
    expect(isDividerPage(renamed('--'))).toBe(false);
    expect(isDividerPage(renamed('----'))).toBe(false);
  });

  it('gives the refusals a user has to be told about a typed code beside the prose (ONL-2488)', () => {
    const refusalCode = (doc: CanvasDoc, op: CanvasOp): string | undefined => {
      const result = applyOp(doc, op, context);
      if (result.ok) throw new Error('expected a rejection');
      return result.code;
    };
    const held = accept(
      applyOp(deepFreeze(twoPages()), { type: 'create', node: label('tx_1', 'pg_2') }, context),
    ).doc;

    expect(refusalCode(deepFreeze(onePage()), { type: 'remove-page', pageId: 'pg_1' })).toBe(
      'last-page',
    );
    expect(
      refusalCode(deepFreeze(onePage()), { type: 'rename-page', pageId: 'pg_1', name: '---' }),
    ).toBe('last-non-divider-page');
    expect(
      refusalCode(deepFreeze(pagedDoc([page('pg_1', 'Checkout', 0), page('pg_rule', '---', 1)])), {
        type: 'remove-page',
        pageId: 'pg_1',
      }),
    ).toBe('last-non-divider-page');
    expect(refusalCode(held, { type: 'remove-page', pageId: 'pg_2' })).toBe('page-not-empty');
    expect(refusalCode(held, { type: 'set-node-page', id: 'tx_1', pageId: 'pg_ghost' })).toBe(
      'no-such-page',
    );
    expect(
      refusalCode(deepFreeze(onePage()), { type: 'create', node: label('tx_9', 'pg_ghost') }),
    ).toBe('no-such-page');
    expect(
      refusalCode(deepFreeze(pagedDoc([page('pg_1', 'Checkout', 0), page('pg_rule', '---', 1)])), {
        type: 'create',
        node: label('tx_9', 'pg_rule'),
      }),
    ).toBe('divider-page');
  });

  it('leaves a refusal the renderer has no words for uncoded, so the band stays shut', () => {
    const result = applyOp(
      deepFreeze(onePage()),
      { type: 'create-page', page: page('pg_1', 'Another', 5) },
      context,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a rejection');
    expect(result.code).toBeUndefined();
  });

  it('captures the previous name on a rename and inverts back to it', () => {
    const renamed = accept(
      applyOp(deepFreeze(twoPages()), { type: 'rename-page', pageId: 'pg_2', name: 'Billing' }, context),
    );
    expect(renamed.entry.prior).toEqual({ kind: 'page-fields', pageId: 'pg_2', fields: { name: 'Settings' } });
    expect(invertOp(renamed.entry)).toEqual({ type: 'rename-page', pageId: 'pg_2', name: 'Settings' });
  });

  it('reorders a page to any finite value and captures the prior order', () => {
    const doc = deepFreeze(twoPages());
    const moved = accept(applyOp(doc, { type: 'reorder-page', pageId: 'pg_2', order: 0.5 }, context));
    expect(moved.doc.pages['pg_2']?.order).toBe(0.5);
    expect(moved.entry.prior).toEqual({ kind: 'page-fields', pageId: 'pg_2', fields: { order: 1 } });
    expect(invertOp(moved.entry)).toEqual({ type: 'reorder-page', pageId: 'pg_2', order: 1 });
    expect(expectRejection(doc, { type: 'reorder-page', pageId: 'pg_2', order: Number.POSITIVE_INFINITY })).toContain(
      'finite',
    );
  });

  it('allows two pages to share a name — identity is the id', () => {
    const { doc } = accept(
      applyOp(deepFreeze(twoPages()), { type: 'rename-page', pageId: 'pg_2', name: 'Checkout' }, context),
    );
    expect(canvasPages(doc).map((one) => one.name)).toEqual(['Checkout', 'Checkout']);
  });

  it('refuses to invert a page op carrying a node-fields prior rather than answering a node op', () => {
    const entry: CanvasOpEntry = {
      revision: 9,
      author: 'user',
      at: context.at,
      op: { type: 'rename-page', pageId: 'pg_1', name: 'Checkout' },
      prior: { kind: 'fields', id: 'pg_1', fields: { name: 'Settings' } },
    };
    expect(() => invertOp(entry)).toThrow('cannot invert');
  });
});
