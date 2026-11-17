import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  CANVAS_IMAGE_ARRIVAL_MAX_SIDE,
  classifyImageBytes,
  IMAGE_MAX_BYTES,
  type CanvasDoc,
  type CanvasOp,
  type CanvasOpRequest,
  type CanvasRejection,
  type CanvasSnapshot,
  type CanvasUpdate,
  type ImageNode,
  type RegisterImageResult,
} from '@studio/events';
import {
  arrivalBox,
  imageRowBoxes,
  IMAGE_GESTURE_MAX_FILES,
  ingestImageFiles,
  ingestPickedImages,
  type ImageIngestDeps,
  type ImageIngestPoint,
  type ImageIngestSource,
  type ImageRefusalReason,
} from './ingest.js';
import {
  applyImageIngest,
  imageDropPoint,
  isLeavingWindow,
  isOverCanvasRegion,
} from './dropSeat.js';
import { connectCanvas } from '../connect.js';
import { resetCanvasStoreForTests, useCanvasStore } from '../store.js';
import type { CanvasTransport } from '../wire.js';

const FALLBACK_NAME = 'a pasted image';

const POINT: ImageIngestPoint = { at: { x: 0, y: 0 }, fallbackName: FALLBACK_NAME };

/** A real PNG signature, so the shared classifier accepts it on its own terms. */
function pngBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return bytes;
}

function textBytes(): Uint8Array {
  return new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
}

interface Rig {
  deps: ImageIngestDeps;
  /** Every source whose bytes were actually pulled into the heap. */
  read: string[];
  registered: string[];
  /** What `measure` answers per registered id; a missing entry answers a square. */
  sizes: Map<string, { width: number; height: number } | null>;
}

/** `register` runs the shared classifier itself: the verdict under test is the product's own, not a stand-in. */
function rig(over: Partial<ImageIngestDeps> = {}): Rig {
  const read: string[] = [];
  const registered: string[] = [];
  const sizes = new Map<string, { width: number; height: number } | null>();
  return {
    read,
    registered,
    sizes,
    deps: {
      register: ({ bytes, name }): Promise<RegisterImageResult> => {
        const verdict = classifyImageBytes(bytes);
        if (!verdict.ok) return Promise.resolve(verdict);
        registered.push(name);
        return Promise.resolve({ ok: true, image: { id: name, mediaType: verdict.mediaType } });
      },
      measure: (ref: { id: string }) =>
        Promise.resolve(sizes.has(ref.id) ? sizes.get(ref.id)! : { width: 200, height: 100 }),
      ...over,
    },
  };
}

function source(
  name: string,
  over: { size?: number; bytes?: () => Promise<Uint8Array>; read?: string[] } = {},
): ImageIngestSource {
  const bytes = over.bytes ?? (() => Promise.resolve(pngBytes()));
  return {
    name,
    size: over.size ?? 1024,
    bytes: () => {
      over.read?.push(name);
      return bytes();
    },
  };
}

/** `closest` answers the target itself when the selector is in its list of ancestors. */
function target(...ancestors: readonly string[]): { closest(selectors: string): unknown } {
  return {
    closest: (selectors) =>
      ancestors.some((ancestor) => selectors.includes(ancestor)) ? {} : null,
  };
}

describe('which gesture the canvas claims', () => {
  it('claims a drag whose target is inside its own region', () => {
    expect(isOverCanvasRegion(target('.react-flow'))).toBe(true);
    expect(isOverCanvasRegion(target('.chat-composer-stack'))).toBe(false);
    expect(isOverCanvasRegion(null)).toBe(false);
  });

  it('lowers the shield only when a drag leaves the window, not when it crosses inside it', () => {
    const size = { innerWidth: 1280, innerHeight: 800 };
    expect(isLeavingWindow({ x: 640, y: 400 }, size)).toBe(false);
    expect(isLeavingWindow({ x: 0, y: 400 }, size)).toBe(true);
    expect(isLeavingWindow({ x: 640, y: 0 }, size)).toBe(true);
    expect(isLeavingWindow({ x: 1280, y: 400 }, size)).toBe(true);
    expect(isLeavingWindow({ x: 640, y: 800 }, size)).toBe(true);
  });
});

describe('where a gesture with no pointer over the canvas lands', () => {
  it('takes the visible rect’s centre', () => {
    expect(imageDropPoint(null, { x: 100, y: 50, width: 800, height: 400 })).toEqual({
      x: 500,
      y: 250,
    });
  });

  it('takes the pointer when there is one', () => {
    expect(
      imageDropPoint({ x: 7, y: 9 }, { x: 100, y: 50, width: 800, height: 400 }),
    ).toEqual({ x: 7, y: 9 });
  });
});

describe('the box a placed image arrives at', () => {
  it('caps the longest side and keeps the aspect ratio', () => {
    const wide = arrivalBox({ width: CANVAS_IMAGE_ARRIVAL_MAX_SIDE * 4, height: CANVAS_IMAGE_ARRIVAL_MAX_SIDE });
    expect(Math.max(wide.width, wide.height)).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE);
    expect(wide.width / wide.height).toBeCloseTo(4, 2);

    const tall = arrivalBox({ width: CANVAS_IMAGE_ARRIVAL_MAX_SIDE, height: CANVAS_IMAGE_ARRIVAL_MAX_SIDE * 3 });
    expect(Math.max(tall.width, tall.height)).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE);
    expect(tall.height / tall.width).toBeCloseTo(3, 2);
  });

  it('never enlarges an image already smaller than the cap', () => {
    const small = { width: 48, height: 12 };
    expect(arrivalBox(small)).toEqual(small);
  });
});

describe('several images placed by one gesture', () => {
  it('sit on one row, left to right, with air between them', () => {
    const boxes = imageRowBoxes(
      [
        { width: 100, height: 100 },
        { width: 100, height: 100 },
        { width: 100, height: 100 },
      ],
      { x: 0, y: 0 },
    );
    expect(boxes).toHaveLength(3);
    const lefts = boxes.map((box) => box.x);
    expect(lefts[1]! - lefts[0]!).toBeGreaterThan(100);
    expect(lefts[2]! - lefts[1]!).toBe(lefts[1]! - lefts[0]!);
    // Centred on the point: the run's own middle is the point the user dropped on.
    expect((lefts[0]! + lefts[2]! + 100) / 2).toBeCloseTo(0, 5);
  });

  it('centres one image on the point it was dropped at', () => {
    const [box] = imageRowBoxes([{ width: 200, height: 80 }], { x: 500, y: 300 });
    expect(box).toEqual({ x: 400, y: 260 });
  });
});

describe('a file gesture the canvas ingests', () => {
  it('places one node at its capped size with the source pixels kept', async () => {
    const it_ = rig();
    it_.sizes.set('shot.png', { width: CANVAS_IMAGE_ARRIVAL_MAX_SIDE * 2, height: CANVAS_IMAGE_ARRIVAL_MAX_SIDE });
    const outcome = await ingestImageFiles([source('shot.png')], POINT, it_.deps);
    expect(outcome.refusal).toBeUndefined();
    expect(outcome.images).toHaveLength(1);
    const image = outcome.images[0]!;
    expect(Math.max(image.width, image.height)).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE);
    expect(image.content.originalWidth).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE * 2);
    expect(image.content.originalHeight).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE);
    expect(image.content.imageId).toBe('shot.png');
    expect(image.name).toBe('shot.png');
    expect(image.content.name).toBe('shot.png');
  });

  it('places three images left to right and refuses nothing', async () => {
    const it_ = rig();
    const outcome = await ingestImageFiles(
      [source('one.png'), source('two.png'), source('three.png')],
      POINT,
      it_.deps,
    );
    expect(outcome.refusal).toBeUndefined();
    expect(outcome.images.map((image) => image.name)).toEqual(['one.png', 'two.png', 'three.png']);
    const lefts = outcome.images.map((image) => image.x);
    expect(lefts[0]!).toBeLessThan(lefts[1]!);
    expect(lefts[1]!).toBeLessThan(lefts[2]!);
  });

  it('refuses a gesture past the file ceiling with its count and places nothing', async () => {
    const it_ = rig();
    const files = Array.from({ length: IMAGE_GESTURE_MAX_FILES + 1 }, (_unused, index) =>
      source(`shot-${String(index)}.png`),
    );
    const outcome = await ingestImageFiles(files, POINT, it_.deps);
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('too-many-files');
    expect(outcome.refusal?.count).toBe(IMAGE_GESTURE_MAX_FILES + 1);
    // The whole gesture is refused before any file is opened.
    expect(it_.registered).toEqual([]);
  });

  it('refuses a gesture that carries no file', async () => {
    const outcome = await ingestImageFiles([], POINT, rig().deps);
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('no-image');
  });

  it('places the images it accepts and names the file it refused', async () => {
    const it_ = rig();
    const outcome = await ingestImageFiles(
      [
        source('one.png'),
        source('notes.txt', { bytes: () => Promise.resolve(textBytes()) }),
        source('two.png'),
        source('three.png'),
      ],
      POINT,
      it_.deps,
    );
    expect(outcome.images.map((image) => image.name)).toEqual([
      'one.png',
      'two.png',
      'three.png',
    ]);
    expect(outcome.refusal?.reason).toBe('unsupported-format');
    expect(outcome.refusal?.name).toBe('notes.txt');
    expect(outcome.refusal?.count).toBe(1);
  });

  it('surfaces each reason the classifier can answer, and leaves no image behind for any of them', async () => {
    const cases: { file: ImageIngestSource; reason: ImageRefusalReason }[] = [
      {
        file: source('empty.png', { bytes: () => Promise.resolve(new Uint8Array()) }),
        reason: 'unreadable',
      },
      { file: source('huge.png', { size: IMAGE_MAX_BYTES + 1 }), reason: 'too-large' },
      {
        file: source('notes.txt', { bytes: () => Promise.resolve(textBytes()) }),
        reason: 'unsupported-format',
      },
    ];
    const seen: string[] = [];
    for (const row of cases) {
      const outcome = await ingestImageFiles([row.file], POINT, rig().deps);
      expect(outcome.images, row.reason).toEqual([]);
      expect(outcome.refusal?.reason, row.reason).toBe(row.reason);
      expect(outcome.refusal?.name, row.reason).toBe(row.file.name);
      seen.push(outcome.refusal?.reason ?? 'none');
    }
    expect(new Set(seen).size).toBe(cases.length);
  });

  it('refuses a file past the size cap without reading its bytes', async () => {
    const it_ = rig();
    const read: string[] = [];
    const outcome = await ingestImageFiles(
      [
        source('huge.png', {
          size: IMAGE_MAX_BYTES + 1,
          read,
          bytes: () => Promise.reject(new Error('the bytes must never be pulled into the heap')),
        }),
      ],
      POINT,
      it_.deps,
    );
    expect(read).toEqual([]);
    expect(outcome.refusal?.reason).toBe('too-large');
    expect(outcome.images).toEqual([]);
  });

  it('judges the format by the bytes, not by the name', async () => {
    const it_ = rig();
    const outcome = await ingestImageFiles(
      [source('screenshot.png', { bytes: () => Promise.resolve(textBytes()) })],
      POINT,
      it_.deps,
    );
    expect(outcome.refusal?.reason).toBe('unsupported-format');

    const honest = rig();
    const accepted = await ingestImageFiles(
      [source('notes.txt', { bytes: () => Promise.resolve(pngBytes()) })],
      POINT,
      honest.deps,
    );
    expect(accepted.refusal).toBeUndefined();
    expect(accepted.images).toHaveLength(1);
  });

  it('refuses a registered file whose pixels will not decode', async () => {
    const it_ = rig();
    it_.sizes.set('shot.png', null);
    const outcome = await ingestImageFiles([source('shot.png')], POINT, it_.deps);
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('unreadable');
    expect(outcome.refusal?.name).toBe('shot.png');
  });

  it('refuses a read that throws as unreadable', async () => {
    const outcome = await ingestImageFiles(
      [source('shot.png', { bytes: () => Promise.reject(new Error('gone')) })],
      POINT,
      rig().deps,
    );
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('unreadable');
  });

  it('gives an unnamed paste the fallback label rather than an empty one', async () => {
    const it_ = rig();
    const outcome = await ingestImageFiles([source('')], POINT, it_.deps);
    expect(outcome.images[0]?.name).toBe(FALLBACK_NAME);
    expect(outcome.images[0]?.content.name).toBe(FALLBACK_NAME);
  });

  it('holds one refusal carrying the count when a gesture refuses two files for different reasons', async () => {
    const it_ = rig();
    const outcome = await ingestImageFiles(
      [
        source('notes.txt', { bytes: () => Promise.resolve(textBytes()) }),
        source('huge.png', { size: IMAGE_MAX_BYTES + 1 }),
        source('good.png'),
      ],
      POINT,
      it_.deps,
    );
    expect(outcome.images).toHaveLength(1);
    // The newest wins, and the count says the rest happened.
    expect(outcome.refusal?.reason).toBe('too-large');
    expect(outcome.refusal?.count).toBe(2);
  });
});

describe("the picker's own result", () => {
  it('places what main admitted and carries what main rejected', async () => {
    const it_ = rig();
    const outcome = await ingestPickedImages(
      {
        images: [{ image: { id: 'one.png', mediaType: 'image/png' }, name: 'one.png' }],
        rejected: [{ name: 'notes.txt', reason: 'unsupported-format' }],
      },
      POINT,
      it_.deps,
    );
    expect(outcome.images.map((image) => image.name)).toEqual(['one.png']);
    expect(outcome.refusal?.reason).toBe('unsupported-format');
    expect(outcome.refusal?.name).toBe('notes.txt');
  });

  it('refuses a selection past the file ceiling', async () => {
    const outcome = await ingestPickedImages(
      {
        images: Array.from({ length: IMAGE_GESTURE_MAX_FILES + 1 }, (_unused, index) => ({
          image: { id: `shot-${String(index)}`, mediaType: 'image/png' as const },
          name: `shot-${String(index)}`,
        })),
        rejected: [],
      },
      POINT,
      rig().deps,
    );
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('too-many-files');
  });
});

const DOC_ID = 'doc-under-image-test';

function docOf(nodes: ImageNode[] = []): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: DOC_ID,
    revision: 1,
    pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
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
      onCanvasUpdate: (_listener: (update: CanvasUpdate) => void) => () => {},
      onCanvasRejected: (_listener: (rejection: CanvasRejection) => void) => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
    },
  };
  return wire;
}

let disconnect: (() => void) | null = null;

async function connect(doc: CanvasDoc | null): Promise<FakeWire> {
  const wire = fakeWire(doc);
  disconnect = connectCanvas(wire.transport);
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
  return wire;
}

function requestOps(request: CanvasOpRequest | undefined): CanvasOp[] {
  if (!request) throw new Error('expected a canvas op request');
  return request.ops ?? (request.op ? [request.op] : []);
}

beforeEach(() => {
  resetCanvasStoreForTests();
});

afterEach(() => {
  disconnect?.();
  disconnect = null;
});

describe('what an ingestion writes to the document', () => {
  it('sends one request for a multi-file gesture, so the arrival is one undo step', async () => {
    const wire = await connect(docOf());
    const it_ = rig();
    await applyImageIngest(
      ingestImageFiles(
        [source('one.png'), source('two.png'), source('three.png')],
        POINT,
        it_.deps,
      ),
      'drop',
    );
    expect(wire.sent).toHaveLength(1);
    const ops = requestOps(wire.sent[0]);
    expect(ops).toHaveLength(3);
    expect(ops.every((op) => op.type === 'create')).toBe(true);
  });

  it('creates every image in front of what is already there', async () => {
    const existing: ImageNode = {
      id: 'held',
      pageId: 'pg_main',
      kind: 'image',
      name: 'held.png',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      order: 7,
      content: { imageId: 'held', name: 'held.png', originalWidth: 10, originalHeight: 10 },
    };
    const wire = await connect(docOf([existing]));
    await applyImageIngest(
      ingestImageFiles([source('one.png'), source('two.png')], POINT, rig().deps),
      'drop',
    );
    const orders = requestOps(wire.sent[0]).map((op) =>
      op.type === 'create' ? op.node.order : -1,
    );
    expect(Math.min(...orders)).toBeGreaterThan(existing.order);
    expect(orders[1]).toBeGreaterThan(orders[0]!);
  });

  it('selects what it placed', async () => {
    await connect(docOf());
    await applyImageIngest(ingestImageFiles([source('one.png')], POINT, rig().deps), 'drop');
    expect(useCanvasStore.getState().selectedNodeIds).toHaveLength(1);
  });

  it('raises the newest refusal and writes nothing when everything was refused', async () => {
    const wire = await connect(docOf());
    await applyImageIngest(
      ingestImageFiles(
        [source('notes.txt', { bytes: () => Promise.resolve(textBytes()) })],
        POINT,
        rig().deps,
      ),
      'drop',
    );
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().imageRefusal?.reason).toBe('unsupported-format');
  });

  it('clears a standing refusal on the next accepted arrival, and an explicit close clears it too', async () => {
    await connect(docOf());
    await applyImageIngest(
      ingestImageFiles(
        [source('notes.txt', { bytes: () => Promise.resolve(textBytes()) })],
        POINT,
        rig().deps,
      ),
      'drop',
    );
    expect(useCanvasStore.getState().imageRefusal).not.toBeNull();
    await applyImageIngest(ingestImageFiles([source('one.png')], POINT, rig().deps), 'drop');
    expect(useCanvasStore.getState().imageRefusal).toBeNull();

    await applyImageIngest(
      ingestImageFiles(
        [source('notes.txt', { bytes: () => Promise.resolve(textBytes()) })],
        POINT,
        rig().deps,
      ),
      'drop',
    );
    expect(useCanvasStore.getState().imageRefusal).not.toBeNull();
    useCanvasStore.getState().dismissImageRefusal();
    expect(useCanvasStore.getState().imageRefusal).toBeNull();
  });

  it('gives two refusals that read alike different band identities', async () => {
    await connect(docOf());
    const refuse = (): Promise<void> =>
      applyImageIngest(
        ingestImageFiles(
          [source('notes.txt', { bytes: () => Promise.resolve(textBytes()) })],
          POINT,
          rig().deps,
        ),
        'drop',
      );
    await refuse();
    const first = useCanvasStore.getState().imageRefusal?.seq;
    await refuse();
    expect(useCanvasStore.getState().imageRefusal?.seq).not.toBe(first);
  });
});

describe('an image node is a first-class selection member', () => {
  const held = (over: Partial<ImageNode> = {}): ImageNode => ({
    id: 'i',
    pageId: 'pg_main',
    kind: 'image',
    name: 'shot.png',
    x: 900,
    y: 40,
    width: 320,
    height: 200,
    order: 1,
    content: { imageId: 'img-i', name: 'shot.png', originalWidth: 640, originalHeight: 400 },
    ...over,
  });

  const neighbour: ImageNode = held({
    id: 'a',
    x: 0,
    y: 0,
    order: 0,
    name: 'other.png',
    content: { imageId: 'img-a', name: 'other.png', originalWidth: 10, originalHeight: 10 },
  });

  const mixed = (): CanvasDoc => docOf([neighbour, held()]);

  function selection(): string[] {
    return useCanvasStore
      .getState()
      .nodes.filter((node) => node.selected === true)
      .map((node) => node.id);
  }

  it('joins a marquee beside another node', async () => {
    await connect(mixed());

    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'select', selected: true },
      { id: 'i', type: 'select', selected: true },
    ]);

    expect(selection()).toEqual(['a', 'i']);
  });

  it('moves with the group drag it is part of, one move op each', async () => {
    const wire = await connect(mixed());
    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'select', selected: true },
      { id: 'i', type: 'select', selected: true },
    ]);

    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'position', position: { x: 60, y: 60 }, dragging: false },
      { id: 'i', type: 'position', position: { x: 960, y: 100 }, dragging: false },
    ]);

    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'move', id: 'a', x: 60, y: 60 },
      { type: 'move', id: 'i', x: 960, y: 100 },
    ]);
  });

  it('reaches the read model with a box, which is what a fit-to-content measures', async () => {
    await connect(mixed());
    const node = useCanvasStore.getState().nodes.find((candidate) => candidate.id === 'i');
    expect(node?.width).toBe(320);
    expect(node?.height).toBe(200);
  });

  it('paints by the document’s stack order, so the front-most node wins an overlapping point', async () => {
    await connect(docOf([held({ id: 'under', order: 0 }), held({ id: 'over', order: 1 })]));

    expect(useCanvasStore.getState().nodes.map((node) => [node.id, node.zIndex])).toEqual([
      ['under', 0],
      ['over', 1],
    ]);
  });
});

describe('a file drag in flight', () => {
  it('covers every guest for as long as it lasts, and a drag that ends uncovers them', () => {
    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().fileDrag).toBeNull();

    useCanvasStore.getState().noteFileDrag('elsewhere');
    expect(useCanvasStore.getState().fileDrag).toEqual({ isOverCanvas: false });

    useCanvasStore.getState().noteFileDrag('canvas');
    expect(useCanvasStore.getState().fileDrag).toEqual({ isOverCanvas: true });

    useCanvasStore.getState().endFileDrag();
    expect(useCanvasStore.getState().fileDrag).toBeNull();
  });
});
