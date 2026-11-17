import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  classifyImageBytes,
  defaultTextBox,
  IMAGE_MAX_BYTES,
  type CanvasDoc,
  type CanvasNode,
  type CanvasOp,
  type CanvasOpRequest,
  type CanvasSnapshot,
  type ImageNode,
  type RegisterImageResult,
  type TextNode,
} from '@studio/events';
import {
  CANVAS_CLIPBOARD_TYPE,
  classifyPaste,
  copyOutcome,
  pastedBoxes,
  plainTextFromHtml,
  writeCanvasCopy,
  type CanvasCopy,
  type ClipboardNode,
  type ClipboardRead,
} from './clipboard.js';
import { ingestImageFiles, type ImageIngestDeps, type ImageIngestSource } from '../image/ingest.js';
import { applyImageIngest, imageDropPoint } from '../image/dropSeat.js';
import { CANVAS_TEXT_RENDER_MAX } from '../text/placement.js';
import { TEXT_NODE_TYPE, type TextFlowNode } from '../model.js';
import { connectCanvas } from '../connect.js';
import { resetCanvasStoreForTests, useCanvasStore } from '../store.js';
import type { CanvasTransport } from '../wire.js';

const DOC_ID = 'doc-under-test';

function textNode(id: string, over: Partial<TextNode> = {}): TextNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'text',
    name: id,
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order: 0,
    content: { text: `the words of ${id}`, size: 'medium' },
    ...over,
  };
}

function imageNode(id: string, over: Partial<ImageNode> = {}): ImageNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'image',
    name: `${id}.png`,
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    order: 0,
    content: { imageId: `img_${id}`, name: `${id}.png`, originalWidth: 640, originalHeight: 400 },
    ...over,
  };
}

function browserNode(id: string): CanvasNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    order: 0,
    content: { homeUrl: `http://localhost:3000/${id}` },
  };
}

function docOf(nodes: CanvasNode[], docId = DOC_ID): CanvasDoc {
  return {
    schemaVersion: 1,
    docId,
    revision: 1,
    pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
    nodes: Object.fromEntries(
      nodes.map((node, index) => [node.id, { ...node, order: node.order || index }]),
    ),
  };
}

interface FakeWire {
  transport: CanvasTransport;
  sent: CanvasOpRequest[];
}

function fakeWire(doc: CanvasDoc | null): FakeWire {
  const wire: FakeWire = {
    sent: [],
    transport: {
      canvasSnapshot: (): Promise<CanvasSnapshot> => Promise.resolve({ doc }),
      canvasPageCameras: () => Promise.resolve({ byPage: {} }),
      canvasOp: (request) => {
        wire.sent.push(request);
      },
      canvasUndo: () => {},
      canvasRedo: () => {},
      canvasViewport: () => {},
      canvasCurrentPage: () => {},
      canvasFrames: () => {},
      onCanvasUpdate: () => () => {},
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
    },
  };
  return wire;
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

let disconnect: (() => void) | null = null;

async function connect(nodes: CanvasNode[]): Promise<FakeWire> {
  const wire = fakeWire(docOf(nodes));
  disconnect = connectCanvas(wire.transport);
  await settled();
  return wire;
}

beforeEach(() => {
  resetCanvasStoreForTests();
});

afterEach(() => {
  disconnect?.();
  disconnect = null;
});

function select(...ids: string[]): void {
  useCanvasStore.setState({ selectedNodeIds: ids });
  useCanvasStore.getState().replaceDoc(useCanvasStore.getState().doc);
}

function requestOps(request: CanvasOpRequest | undefined): CanvasOp[] {
  if (!request) throw new Error('expected a canvas op request');
  if (request.ops !== undefined) return request.ops;
  if (request.op === undefined) throw new Error('a request with neither op nor ops');
  return [request.op];
}

function mintedNodes(request: CanvasOpRequest | undefined): CanvasNode[] {
  return requestOps(request).flatMap((op) =>
    op.type === 'create' || op.type === 'duplicate' ? [op.node] : [],
  );
}

/** A clipboard the canvas can read, with only the types the case under test offers. */
function clipboard(
  types: Record<string, string>,
  over: { files?: readonly ImageIngestSource[]; promisesImage?: boolean } = {},
): ClipboardRead {
  return {
    get: (type) => types[type] ?? '',
    files: over.files ?? [],
    promisesImage: over.promisesImage ?? false,
  };
}

/** What a real copy leaves behind, read back the way a paste reads it. */
function roundTrip(copy: CanvasCopy): ClipboardRead {
  const written: Record<string, string> = {};
  writeCanvasCopy(
    {
      setData: (type, data) => {
        written[type] = data;
      },
    },
    copy,
  );
  return clipboard(written);
}

function pasteInto(read: ClipboardRead, at: { x: number; y: number }): void {
  const store = useCanvasStore.getState();
  const outcome = classifyPaste(read, { docId: store.doc?.docId ?? null });
  if (outcome.kind === 'nodes') store.pasteCanvasNodes(outcome.nodes, at);
  if (outcome.kind === 'text') store.pasteCanvasText(outcome.text, at);
}

function copiedFrom(...ids: string[]): CanvasCopy {
  select(...ids);
  const copy = useCanvasStore.getState().copyCanvasSelection();
  if (copy === null) throw new Error('expected the selection to copy');
  return copy;
}

const ORIGIN = { x: 0, y: 0 };

describe('what the canvas puts on the clipboard', () => {
  it('carries the selected labels and pictures and leaves a frame behind', async () => {
    await connect([textNode('note'), imageNode('shot'), browserNode('frame')]);
    const copy = copiedFrom('note', 'shot', 'frame');
    expect(copy.ids).toEqual(['note', 'shot']);
  });

  it('copies nothing when the selection holds only frames', async () => {
    await connect([browserNode('frame')]);
    select('frame');
    expect(useCanvasStore.getState().copyCanvasSelection()).toBeNull();
  });

  it('offers another app the words it copied', async () => {
    await connect([textNode('note')]);
    const written = roundTrip(copiedFrom('note'));
    expect(written.get('text/plain')).toBe('the words of note');
    expect(written.get(CANVAS_CLIPBOARD_TYPE)).not.toBe('');
  });

  it('offers no words for a picture alone, which has none', async () => {
    await connect([imageNode('shot')]);
    const written = roundTrip(copiedFrom('shot'));
    expect(written.get('text/plain')).toBe('');
    expect(written.get(CANVAS_CLIPBOARD_TYPE)).not.toBe('');
  });
});

describe('copying a node and pasting it back', () => {
  it('puts a second node with the same words on the canvas under a new id', async () => {
    const wire = await connect([textNode('note')]);
    const read = roundTrip(copiedFrom('note'));
    pasteInto(read, ORIGIN);
    const minted = mintedNodes(wire.sent.at(-1));
    expect(minted).toHaveLength(1);
    const pasted = minted[0]!;
    expect(pasted.id).not.toBe('note');
    expect(pasted.kind).toBe('text');
    expect((pasted as TextNode).content.text).toBe('the words of note');
  });

  it('names the node it came from', async () => {
    const wire = await connect([textNode('note')]);
    pasteInto(roundTrip(copiedFrom('note')), ORIGIN);
    expect(mintedNodes(wire.sent.at(-1))[0]?.provenance?.from).toBe('note');
  });

  it('leaves the pasted node selected, as a duplicate does', async () => {
    const wire = await connect([textNode('note')]);
    pasteInto(roundTrip(copiedFrom('note')), ORIGIN);
    const pasted = mintedNodes(wire.sent.at(-1))[0]!;
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([pasted.id]);
  });

  it('keeps the offsets between three nodes when they land together', async () => {
    const sources = [
      textNode('one', { x: 100, y: 100 }),
      imageNode('two', { x: 400, y: 160 }),
      textNode('three', { x: 250, y: 500 }),
    ];
    const wire = await connect(sources);
    pasteInto(roundTrip(copiedFrom('one', 'two', 'three')), { x: 2000, y: 3000 });
    const minted = mintedNodes(wire.sent.at(-1));
    expect(minted).toHaveLength(3);
    const offsets = minted.map((node) => ({
      x: node.x - minted[0]!.x,
      y: node.y - minted[0]!.y,
    }));
    expect(offsets).toEqual(
      sources.map((node) => ({ x: node.x - sources[0]!.x, y: node.y - sources[0]!.y })),
    );
  });

  it('travels as one request, so the whole arrival is one undo step', async () => {
    const wire = await connect([textNode('one'), textNode('two')]);
    pasteInto(roundTrip(copiedFrom('one', 'two')), ORIGIN);
    expect(wire.sent).toHaveLength(1);
    expect(requestOps(wire.sent[0]).every((op) => op.type === 'duplicate')).toBe(true);
  });

  it('declines a payload copied in another project, whose pictures it cannot resolve', async () => {
    await connect([imageNode('shot')]);
    const copy = copiedFrom('shot');
    const elsewhere = classifyPaste(roundTrip(copy), { docId: 'another-document' });
    expect(elsewhere.kind).toBe('none');
  });

  it('declines a payload whose nodes are not shaped like nodes', async () => {
    await connect([textNode('note')]);
    const broken = JSON.stringify({
      version: 2,
      docId: DOC_ID,
      nodes: [{ id: 'note', kind: 'text', name: 'note', x: 0, y: 0, width: 0, height: 0, order: 0, content: {} }],
    });
    const outcome = classifyPaste(clipboard({ [CANVAS_CLIPBOARD_TYPE]: broken }), {
      docId: DOC_ID,
    });
    expect(outcome.kind).toBe('none');
  });
});

describe('cutting a node', () => {
  it('removes every node it copied in one request, so one undo brings them back', async () => {
    const wire = await connect([textNode('one'), imageNode('two'), browserNode('frame')]);
    select('one', 'two');
    const copy = useCanvasStore.getState().cutCanvasSelection();
    expect(copy?.ids).toEqual(['one', 'two']);
    expect(wire.sent).toHaveLength(1);
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'remove', id: 'one' },
      { type: 'remove', id: 'two' },
    ]);
  });

  it('cuts nothing and removes nothing when the selection holds only frames', async () => {
    const wire = await connect([browserNode('frame')]);
    select('frame');
    expect(useCanvasStore.getState().cutCanvasSelection()).toBeNull();
    expect(wire.sent).toHaveLength(0);
  });

  it('puts what it removed on the clipboard, so the cut can be pasted back', async () => {
    const wire = await connect([textNode('note')]);
    select('note');
    const copy = useCanvasStore.getState().cutCanvasSelection();
    if (copy === null) throw new Error('expected the cut to copy');
    pasteInto(roundTrip(copy), ORIGIN);
    expect((mintedNodes(wire.sent.at(-1))[0] as TextNode | undefined)?.content.text).toBe(
      'the words of note',
    );
  });
});

describe('where a paste lands', () => {
  it('tracks the point it is given, keeping the set centred on it', () => {
    const nodes = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 200, y: 50, width: 100, height: 100 },
    ];
    const near = pastedBoxes(nodes, { x: 1000, y: 1000 });
    const far = pastedBoxes(nodes, { x: 1300, y: 1120 });
    expect(far.map((box, index) => ({ x: box.x - near[index]!.x, y: box.y - near[index]!.y }))).toEqual([
      { x: 300, y: 120 },
      { x: 300, y: 120 },
    ]);
    const left = Math.min(...near.map((box) => box.x));
    const right = Math.max(...near.map((box, index) => box.x + nodes[index]!.width));
    expect((left + right) / 2).toBe(1000);
  });

  it('lands on the pointer over the canvas and on the visible centre when the pointer is elsewhere', async () => {
    const wire = await connect([textNode('note')]);
    const view = { x: 0, y: 0, width: 1000, height: 800 };
    const pointer = { x: 120, y: 240 };
    const read = roundTrip(copiedFrom('note'));
    pasteInto(read, imageDropPoint(pointer, view));
    const onPointer = mintedNodes(wire.sent.at(-1))[0]!;
    pasteInto(read, imageDropPoint(null, view));
    const offCanvas = mintedNodes(wire.sent.at(-1))[0]!;
    expect({ x: onPointer.x, y: onPointer.y }).not.toEqual({ x: offCanvas.x, y: offCanvas.y });
    expect(offCanvas.x - onPointer.x).toBe(view.width / 2 - pointer.x);
    expect(offCanvas.y - onPointer.y).toBe(view.height / 2 - pointer.y);
  });
});

describe('what an outside paste becomes', () => {
  it('reads plain text as a label', () => {
    const outcome = classifyPaste(clipboard({ 'text/plain': 'a line from elsewhere' }), {
      docId: DOC_ID,
    });
    expect(outcome).toEqual({ kind: 'text', text: 'a line from elsewhere' });
  });

  it('reads a link as a label, not a frame', () => {
    const outcome = classifyPaste(clipboard({ 'text/plain': 'https://example.com/pricing' }), {
      docId: DOC_ID,
    });
    expect(outcome).toEqual({ kind: 'text', text: 'https://example.com/pricing' });
  });

  it('takes rich text at its plain word, dropping the markup', () => {
    const outcome = classifyPaste(
      clipboard({
        'text/html': '<p style="font-weight:700">a <em>bold</em> claim</p>',
        'text/plain': 'a bold claim',
      }),
      { docId: DOC_ID },
    );
    expect(outcome).toEqual({ kind: 'text', text: 'a bold claim' });
  });

  it('reduces markup itself when that is all the clipboard offers', () => {
    const outcome = classifyPaste(
      clipboard({
        'text/html': '<div>first &amp; foremost</div><div>second</div>',
      }),
      { docId: DOC_ID },
    );
    expect(outcome).toEqual({ kind: 'text', text: 'first & foremost\nsecond' });
  });

  it('drops a script block rather than reading it as words', () => {
    expect(plainTextFromHtml('<p>kept</p><script>const dropped = 1;</script>')).toBe('kept');
  });

  it('reads an image file as a picture, and prefers it over the file name the clipboard also carries', () => {
    const file: ImageIngestSource = {
      name: 'hero.png',
      size: 1024,
      bytes: () => Promise.resolve(new Uint8Array()),
    };
    const outcome = classifyPaste(clipboard({ 'text/plain': 'hero.png' }, { files: [file] }), {
      docId: DOC_ID,
    });
    expect(outcome).toEqual({ kind: 'images', files: [file] });
  });

  it('reads a clipboard that promised a picture and produced no file as a picture all the same', () => {
    const outcome = classifyPaste(clipboard({}, { promisesImage: true }), { docId: DOC_ID });
    expect(outcome).toEqual({ kind: 'images', files: [] });
  });

  it('reads an empty clipboard as nothing at all', () => {
    expect(classifyPaste(clipboard({}), { docId: DOC_ID })).toEqual({ kind: 'none' });
    expect(classifyPaste(clipboard({ 'text/plain': '   \n ' }), { docId: DOC_ID })).toEqual({
      kind: 'none',
    });
  });

  it('will not place its own nodes with no document open, and reads a label copy as words instead', async () => {
    await connect([textNode('note')]);
    const read = roundTrip(copiedFrom('note'));
    expect(classifyPaste(read, { docId: null })).toEqual({
      kind: 'text',
      text: 'the words of note',
    });
  });

  it('will not place a picture copy as a node with no document open, and it carries no words', async () => {
    await connect([imageNode('shot')]);
    const read = roundTrip(copiedFrom('shot'));
    expect(classifyPaste(read, { docId: null }).kind).toBe('none');
  });
});

describe('the label an outside paste places', () => {
  it('commits it at once, with no caret waiting in it', async () => {
    const wire = await connect([]);
    pasteInto(clipboard({ 'text/plain': 'a line from elsewhere' }), ORIGIN);
    const minted = mintedNodes(wire.sent.at(-1));
    expect(minted).toHaveLength(1);
    expect((minted[0] as TextNode).content.text).toBe('a line from elsewhere');
    expect(useCanvasStore.getState().textEditId).toBeNull();
    expect(useCanvasStore.getState().textDraft).toBeNull();
  });

  it('stores the default box, which the first layout then corrects', async () => {
    const wire = await connect([]);
    pasteInto(clipboard({ 'text/plain': 'a short line' }), ORIGIN);
    const placed = mintedNodes(wire.sent.at(-1))[0]!;
    expect({ width: placed.width, height: placed.height }).toEqual(defaultTextBox('medium'));

    useCanvasStore.getState().replaceDoc(docOf([placed]));
    const measured = { width: 180, height: 38 };
    useCanvasStore.getState().noteTextMeasured(placed.id, measured, 'medium', { text: 'a short line' });
    const correction = requestOps(wire.sent.at(-1))[0];
    expect(correction).toMatchObject({ type: 'set-text', id: placed.id, ...measured });
  });

  it('renders a very long paste shortened while the document keeps every character', async () => {
    const whole = 'x'.repeat(CANVAS_TEXT_RENDER_MAX * 2 + 500);
    const wire = await connect([]);
    pasteInto(clipboard({ 'text/plain': whole }), ORIGIN);
    const placed = mintedNodes(wire.sent.at(-1))[0]! as TextNode;
    expect(placed.content.text).toHaveLength(whole.length);

    useCanvasStore.getState().replaceDoc(docOf([placed]));
    const drawn = useCanvasStore
      .getState()
      .nodes.find((node): node is TextFlowNode => node.type === TEXT_NODE_TYPE);
    expect(drawn?.data.text.length).toBeLessThan(whole.length);
    expect(whole.startsWith(drawn?.data.text.slice(0, -1) ?? '')).toBe(true);
  });

  it('places nothing for a document that is not open', () => {
    expect(useCanvasStore.getState().pasteCanvasText('a line', ORIGIN)).toBeNull();
  });
});

describe('the picture an outside paste places', () => {
  function rig(): { deps: ImageIngestDeps } {
    return {
      deps: {
        register: ({ bytes, name }): Promise<RegisterImageResult> => {
          const verdict = classifyImageBytes(bytes);
          return Promise.resolve(
            verdict.ok ? { ok: true, image: { id: name, mediaType: verdict.mediaType } } : verdict,
          );
        },
        measure: (ref: { id: string }) =>
          Promise.resolve(ref.id === '' ? null : { width: 200, height: 100 }),
      },
    };
  }

  function pngSource(name: string, size = 1024): ImageIngestSource {
    const bytes = new Uint8Array(16);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    return { name, size, bytes: () => Promise.resolve(bytes) };
  }

  async function paste(read: ClipboardRead): Promise<void> {
    const outcome = classifyPaste(read, { docId: useCanvasStore.getState().doc?.docId ?? null });
    if (outcome.kind !== 'images') throw new Error(`expected pictures, read ${outcome.kind}`);
    await applyImageIngest(
      ingestImageFiles(outcome.files, { at: ORIGIN, fallbackName: 'a pasted image' }, rig().deps),
      'paste',
    );
  }

  it('places a picture for bytes that arrive with no name of their own', async () => {
    const wire = await connect([]);
    await paste(clipboard({}, { files: [pngSource('')], promisesImage: true }));
    const placed = mintedNodes(wire.sent.at(-1))[0];
    expect(placed?.kind).toBe('image');
    expect(placed?.name).toBe('a pasted image');
  });

  it('places a picture for an image file, keeping its name', async () => {
    const wire = await connect([]);
    await paste(clipboard({ 'text/plain': 'hero.png' }, { files: [pngSource('hero.png')] }));
    expect(mintedNodes(wire.sent.at(-1))[0]).toMatchObject({ kind: 'image', name: 'hero.png' });
  });

  it("says why when a pasted picture is refused, and places nothing", async () => {
    const wire = await connect([]);
    await paste(clipboard({}, { files: [pngSource('huge.png', IMAGE_MAX_BYTES + 1)] }));
    expect(wire.sent).toHaveLength(0);
    expect(useCanvasStore.getState().imageRefusal).toMatchObject({ reason: 'too-large' });
  });

  it('refuses a clipboard that promised a picture and produced nothing readable', async () => {
    const wire = await connect([]);
    await paste(clipboard({}, { promisesImage: true }));
    expect(wire.sent).toHaveLength(0);
    expect(useCanvasStore.getState().imageRefusal).toMatchObject({ reason: 'no-image' });
  });
});

describe('a label whose whole string the canvas never drew', () => {
  it('draws less than it stores, and the caret opens on the whole string (ONL-2486)', async () => {
    const whole = 'y'.repeat(CANVAS_TEXT_RENDER_MAX * 2);
    const node = textNode('long', { content: { text: whole, size: 'medium' } });
    const wire = await connect([node]);
    const drawn = useCanvasStore
      .getState()
      .nodes.find((flow): flow is TextFlowNode => flow.type === TEXT_NODE_TYPE);
    expect(drawn?.data.text.length).toBeLessThan(whole.length);

    useCanvasStore.getState().beginTextEdit('long');
    useCanvasStore.getState().commitTextEdit(whole, defaultTextBox('medium'));

    expect(wire.sent).toHaveLength(0);
    expect(useCanvasStore.getState().doc?.nodes['long']?.content).toEqual({
      text: whole,
      size: 'medium',
    });
  });
});

/** Which nodes travel is the pure decision; that a payload carries only these two kinds is what a frame's absence proves. */
describe('which kinds the clipboard carries', () => {
  it('drops a frame from a mixed selection and keeps the order it was selected in', () => {
    const copy = copyOutcome(DOC_ID, [imageNode('shot'), browserNode('frame'), textNode('note')]);
    expect(copy?.ids).toEqual(['shot', 'note']);
  });

  it('is nothing at all for a selection of frames', () => {
    expect(copyOutcome(DOC_ID, [browserNode('frame')])).toBeNull();
  });

  it('carries the whole node, so a paste needs nothing the document still holds', () => {
    const copy = copyOutcome(DOC_ID, [imageNode('shot')]);
    const nodes = (JSON.parse(copy?.payload ?? '{}') as { nodes: ClipboardNode[] }).nodes;
    expect(nodes[0]).toEqual(imageNode('shot'));
  });
});
