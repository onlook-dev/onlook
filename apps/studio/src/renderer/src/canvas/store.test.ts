import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { seedFlags } from '../flags/store.js';
import { useSettingsStore } from '../settings/store.js';
import type {
  InlineDismissMethod,
  ArtifactPreviewRequest,
  ArtifactPreviewResult,
  ArtifactSummary,
  BrowserNode,
  CanvasCameraSave,
  CanvasCurrentPageSave,
  CanvasDoc,
  CanvasNode,
  SectionNode,
  ImageNode,
  TextNode,
  CanvasOp,
  CanvasPage,
  CanvasOpEntry,
  CanvasOpRequest,
  CanvasPageCameras,
  CanvasPageCamerasRequest,
  CanvasRejection,
  CanvasSnapshot,
  CanvasFrameQuotes,
  FrameQuotes,
  CanvasUndoRequest,
  CanvasUpdate,
  CanvasTextSize,
  ElementEvidence,
  FrameFactsPush,
  ServerEntryState,
  ServerPortState,
} from '@studio/events';
import {
  DEFAULT_FRAME_SIZE,
  defaultTextBox,
  displayUrl,
  FRAME_FACTS_PUSH_MS,
  isBrowserNode,
  MAX_CANVAS_OPS_PER_REQUEST,
  MAX_ELEMENT_SELECTIONS,
  NO_FRAME_QUOTES,
  originForPort,
  PLACEMENT_GAP,
} from '@studio/events';
import {
  frameFlowNodes,
  FRAME_NODE_TYPE,
  IMAGE_NODE_TYPE,
  MAX_FRAME_SIZE,
  MIN_FRAME_SIZE,
  TEXT_NODE_TYPE,
  type FrameNode,
  type ImageFlowNode,
  type TextFlowNode,
} from './model.js';
import type { PlacedImage } from './image/ingest.js';
import type { InlineChatRecord } from './inlinePlacement.js';
import { applyEntryToMirror } from './readModel.js';
import { canvasFlyToCenter } from './useCanvasCameraSync.js';
import {
  armedNodeId,
  isChromeHidden,
  isRailHidden,
  dimensionBadgeNodeId,
  drawnImageBox,
  drawnTextBox,
  isFrameShielded,
  isLoneSelectedNode,
  primaryFrameId,
  resetCanvasStoreForTests,
  useCanvasStore,
} from './store.js';
import { textSizeBar } from './text/actions.js';
import { setCanvasZoomSource } from './gestures.js';
import { CANVAS_CLIPBOARD_TYPE, classifyPaste } from './clipboard/clipboard.js';
import { focusedFrameId } from './elementPicking.js';
import { beginCanvasSwitch, dispatchCanvasOps, type CanvasTransport } from './wire.js';
import { connectCanvas, resyncCanvas } from './connect.js';
import { noteFrameConsole, noteGuestAttached, noteGuestGone } from './frameFacts.js';
import { currentCanvasPageId } from './compose.js';
import { dispatchCanvasUndo } from './historyDispatch.js';
import {
  registerChatSubmit,
  submitChatPrompt,
  type ChatSubmitRequest,
} from '../chat/submitRegistry.js';
import type { AttachmentDraft } from '../attachments.js';
import { addInlineAttachment, openInlineAttachments } from './inlineAttachments.js';
import { forgetArtifact, resolveArtifact } from './artifact/artifactCache.js';
import { artifactPreviewDemand } from './artifact/previewDemand.js';
import { artifactSnapshots } from './artifact/snapshots.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { assemblePrompt, type AssembledPrompt } from '../chat/submitPrompt.js';
import { seedableSelectionsForFrame, selectionEvidence, type AddOutcome } from './selection.js';
import {
  dismissInlineChat,
  closeInlineChatCarrying,
  refuseGather,
  submitInlineChat,
} from './useInlineElementChat.js';

const DOC_ID = 'doc-under-test';

function browserNode(id: string, over: Partial<BrowserNode> = {}): BrowserNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: DEFAULT_FRAME_SIZE.width,
    height: DEFAULT_FRAME_SIZE.height,
    order: 0,
    content: { homeUrl: `http://localhost:3000/${id}` },
    ...over,
  };
}

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
    content: { text: 'a note to self', size: 'medium' },
    ...over,
  };
}

function sectionNode(over: Partial<SectionNode> = {}): SectionNode {
  return { id: 'section', pageId: 'pg_main', kind: 'section', name: 'Venue tiles', x: -100, y: -100, width: 2000, height: 1600, order: 10, content: {}, ...over };
}

function imageNode(id: string, over: Partial<ImageNode> = {}): ImageNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'image',
    name: id,
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    order: 0,
    content: { imageId: `img_${id}`, name: `${id}.png`, originalWidth: 640, originalHeight: 400 },
    ...over,
  };
}

function docOf(nodes: CanvasNode[], revision = 1, docId = DOC_ID): CanvasDoc {
  return {
    schemaVersion: 1,
    docId,
    revision,
    pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
    nodes: Object.fromEntries(nodes.map((node, index) => [node.id, { ...node, order: node.order || index }])),
  };
}

/** `prior` is a placeholder: the read model never reads it. */
function entryOf(
  revision: number,
  op: CanvasOp,
  author: CanvasOpEntry['author'] = 'user',
): CanvasOpEntry {
  return { revision, author, at: '2026-08-12T00:00:00Z', op, prior: { kind: 'none' } };
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

interface FakeWire {
  transport: CanvasTransport;
  sent: CanvasOpRequest[];
  sentUndo: CanvasUndoRequest[];
  sentCameras: CanvasCameraSave[];
  sentPages: CanvasCurrentPageSave[];
  sentFrames: FrameFactsPush[];
  pageCameraRequests: CanvasPageCamerasRequest[];
  snapshotRequests: number;
  answerSnapshotsWith(doc: CanvasDoc | null): void;
  emitUpdate(update: CanvasUpdate): void;
  emitRejected(rejection: CanvasRejection): void;
  emitWorkingFrames(frameIds: string[]): void;
  answerQuotesWith(quotes: FrameQuotes | undefined): void;
  emitQuotes(event: CanvasFrameQuotes): void;
}

function fakeWire(
  initialDoc: CanvasDoc | null,
  storedCameras: CanvasPageCameras['byPage'] = {},
): FakeWire {
  let snapshotDoc = initialDoc;
  let snapshotQuotes: FrameQuotes | undefined;
  const quoteListeners = new Set<(event: CanvasFrameQuotes) => void>();
  const updateListeners = new Set<(update: CanvasUpdate) => void>();
  const rejectedListeners = new Set<(rejection: CanvasRejection) => void>();
  const workingFramesListeners = new Set<(event: { cwd: string; frameIds: string[] }) => void>();
  const wire: FakeWire = {
    sent: [],
    sentUndo: [],
    sentCameras: [],
    sentPages: [],
    sentFrames: [],
    pageCameraRequests: [],
    snapshotRequests: 0,
    transport: {
      canvasSnapshot: (): Promise<CanvasSnapshot> => {
        wire.snapshotRequests += 1;
        return Promise.resolve(snapshotQuotes === undefined ? { doc: snapshotDoc } : { doc: snapshotDoc, quotes: snapshotQuotes });
      },
      canvasPageCameras: (request): Promise<CanvasPageCameras> => {
        wire.pageCameraRequests.push(request);
        return Promise.resolve({ byPage: storedCameras });
      },
      canvasOp: (request) => {
        wire.sent.push(request);
      },
      canvasUndo: (request) => {
        wire.sentUndo.push(request);
      },
      canvasRedo: () => {},
      canvasViewport: (save) => {
        wire.sentCameras.push(save);
      },
      canvasCurrentPage: (save) => {
        wire.sentPages.push(save);
      },
      canvasFrames: (push) => {
        wire.sentFrames.push(push);
      },
      onCanvasUpdate: (listener) => {
        updateListeners.add(listener);
        return () => updateListeners.delete(listener);
      },
      onCanvasRejected: (listener) => {
        rejectedListeners.add(listener);
        return () => rejectedListeners.delete(listener);
      },
      onAgentWorkingFrames: (listener) => {
        workingFramesListeners.add(listener);
        return () => workingFramesListeners.delete(listener);
      },
      onCanvasFrameQuotes: (listener) => {
        quoteListeners.add(listener);
        return () => quoteListeners.delete(listener);
      },
    },
    answerSnapshotsWith: (doc) => {
      snapshotDoc = doc;
    },
    emitUpdate: (update) => {
      for (const listener of updateListeners) listener(update);
    },
    emitRejected: (rejection) => {
      for (const listener of rejectedListeners) listener(rejection);
    },
    emitWorkingFrames: (frameIds) => {
      for (const listener of workingFramesListeners) listener({ cwd: '/repo', frameIds });
    },
    answerQuotesWith: (quotes) => {
      snapshotQuotes = quotes;
    },
    emitQuotes: (event) => {
      for (const listener of quoteListeners) listener(event);
    },
  };
  return wire;
}

describe('sections', () => {
  // Each case below runs on a build that answered the flag on, except the one that says otherwise (ONL-2661).
  beforeEach(() => {
    seedFlags({ sections: true, connectors: false, 'blank-first-moment': true });
  });

  it('leaves a stored Section out of the Canvas and the Designs list where the flag is off, and keeps what it held', async () => {
    seedFlags();
    await connect(docOf([sectionNode(), browserNode('inside')]));
    expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['inside']);
    expect(useCanvasStore.getState().doc?.nodes['section']).toBeDefined();
  });

  it('draws a section, selects it on echo, and returns to Select', async () => {
    const wire = await connect(docOf([]));
    const store = useCanvasStore.getState();
    store.setTool('section');
    store.beginFrameDraw({ x: 800, y: 700 }, { x: 800, y: 700 });
    store.updateFrameDraw({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(useCanvasStore.getState().endFrameDraw()).toBeNull();
    const op = singleOp(wire.sent[0]);
    expect(op).toMatchObject({ type: 'create', node: { kind: 'section', x: 100, y: 100, width: 700, height: 600, name: 'Section' } });
    if (op.type !== 'create') throw new Error('expected creation');
    fakeUpdate(entryOf(2, op));
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([op.node.id]);
    expect(useCanvasStore.getState().tool).toBe('select');
  });

  it('moves enclosed objects with a section in one batch and excludes partial overlaps', async () => {
    const wire = await connect(docOf([sectionNode(), browserNode('inside'), textNode('partial', { x: 1850 })]));
    const store = useCanvasStore.getState();
    store.selectFrame('section', false);
    store.beginSectionDrag('section');
    store.onNodesChange([{ type: 'position', id: 'section', position: { x: 200, y: 100 }, dragging: true }]);
    expect(useCanvasStore.getState().nodes.find((node) => node.id === 'inside')?.position).toEqual({ x: 300, y: 200 });
    store.onNodesChange([{ type: 'position', id: 'section', position: { x: 200, y: 100 }, dragging: false }]);
    expect(wire.sent.at(-1)?.ops).toEqual([
      { type: 'move', id: 'section', x: 200, y: 100 },
      { type: 'move', id: 'inside', x: 300, y: 200 },
    ]);
    store.endSectionDrag();
  });

  it('nudges enclosed objects once even when explicitly selected and leaves contents on delete', async () => {
    const wire = await connect(docOf([sectionNode(), browserNode('inside')]));
    const store = useCanvasStore.getState();
    store.selectFrame('section', false);
    store.selectFrame('inside', true);
    store.nudgeNodes(10, 0);
    store.flushNudges();
    expect(wire.sent.at(-1)?.ops).toHaveLength(2);
    expect(wire.sent.at(-1)?.ops?.find((op) => 'id' in op && op.id === 'inside')).toMatchObject({ x: 10, y: 0 });
    store.selectFrame('section', false);
    store.removeFrame('section');
    expect(singleOp(wire.sent.at(-1))).toEqual({ type: 'remove', id: 'section' });
  });

  it('copies a section with its frames and duplicates the group without changing relative geometry', async () => {
    const wire = await connect(docOf([sectionNode(), browserNode('inside')]));
    const store = useCanvasStore.getState();
    store.selectFrame('section', false);
    const copy = store.copyCanvasSelection();
    expect(copy?.ids).toEqual(['section', 'inside']);
    store.duplicateSelectedFrame();
    const created = wire.sent.at(-1)?.ops?.flatMap((op) => op.type === 'duplicate' ? [op.node] : []) ?? [];
    expect(created).toHaveLength(2);
    expect(created[1]!.x - created[0]!.x).toBe(100);
    expect(created[1]!.y - created[0]!.y).toBe(100);
  });

  it('cuts exactly the group it copies and can paste the group back without leaving duplicate contents', async () => {
    const wire = await connect(docOf([sectionNode(), browserNode('inside'), textNode('outside', { x: 2200 })]));
    const store = useCanvasStore.getState();
    store.selectFrame('section', false);
    const copy = store.cutCanvasSelection();
    if (copy === null) throw new Error('expected a copied Section');
    expect(copy.ids).toEqual(['section', 'inside']);
    expect(requestOps(wire.sent.at(-1))).toEqual([{ type: 'remove', id: 'section' }, { type: 'remove', id: 'inside' }]);
    expect(wire.sent).toHaveLength(1);
    const paste = classifyPaste({ get: (type) => type === CANVAS_CLIPBOARD_TYPE ? copy.payload : '', files: [], promisesImage: false }, { docId: DOC_ID });
    if (paste.kind !== 'nodes') throw new Error('expected Canvas clipboard nodes');
    store.pasteCanvasNodes(paste.nodes, { x: 3000, y: 1000 });
    const pasted = requestOps(wire.sent.at(-1)).flatMap((op) => op.type === 'duplicate' ? [op.node] : []);
    expect(pasted.map((node) => node.kind)).toEqual(['section', 'browser']);
    expect(pasted[1]!.x - pasted[0]!.x).toBe(100);
    expect(pasted[1]!.y - pasted[0]!.y).toBe(100);
  });

  it('ignores Section stacking shortcuts without authoring undo history', async () => {
    const wire = await connect(docOf([sectionNode(), browserNode('inside')]));
    useCanvasStore.getState().stackNode('section', 'front');
    useCanvasStore.getState().stackNode('section', 'back');
    expect(wire.sent).toEqual([]);
  });
});

let disconnect: (() => void) | null = null;
let currentWire: FakeWire | null = null;

async function connect(
  doc: CanvasDoc | null,
  storedCameras: CanvasPageCameras['byPage'] = {},
): Promise<FakeWire> {
  const wire = fakeWire(doc, storedCameras);
  currentWire = wire;
  disconnect = connectCanvas(wire.transport);
  await settled();
  return wire;
}

function fakeUpdate(entry: CanvasOpEntry): void {
  if (!currentWire) throw new Error('fakeUpdate before connect');
  currentWire.emitUpdate({ docId: DOC_ID, entry });
}

function singleOp(request: CanvasOpRequest | undefined): CanvasOp {
  if (!request || request.op === undefined) throw new Error('expected a singleton canvas op');
  return request.op;
}

function noteTextMeasured(id: string, box: { width: number; height: number }, size: CanvasTextSize): void {
  const state = useCanvasStore.getState();
  const node = state.doc?.nodes[id];
  state.noteTextMeasured(id, box, size, {
    text: node?.kind === 'text' ? node.content.text : '',
    wrapWidth: node?.kind === 'text' ? node.content.wrapWidth : undefined,
  });
}

function requestOps(request: CanvasOpRequest | undefined): CanvasOp[] {
  if (!request) throw new Error('expected a canvas op request');
  return request.ops ?? [singleOp(request)];
}

beforeEach(() => {
  resetCanvasStoreForTests();
  seedFlags();
  useSettingsStore.setState({ experimentalCodePanel: true });
});

afterEach(() => {
  disconnect?.();
  disconnect = null;
  currentWire = null;
});

function frameNodes(): FrameNode[] {
  return frameFlowNodes(useCanvasStore.getState().nodes);
}

const homeUrlOf = (doc: CanvasDoc | null | undefined, id: string): string | undefined =>
  (doc?.nodes[id] as BrowserNode | undefined)?.content.homeUrl;

function panelRows(): { id: string; url: string }[] {
  return frameNodes().map((n) => ({ id: n.id, url: n.data.currentUrl }));
}

function canvasNodes(): string[] {
  return useCanvasStore.getState().nodes.map((n) => n.id);
}

function panelNames(): string[] {
  return useCanvasStore.getState().nodes.map((n) => n.data.name);
}

function selection(): string[] {
  return useCanvasStore
    .getState()
    .nodes.filter((n) => n.selected === true)
    .map((n) => n.id);
}

function targets(): (string | undefined)[] {
  return frameNodes().map((n) => n.data.target?.url);
}

function evidence(id: string): ElementEvidence {
  return {
    kind: 'element',
    id,
    tag: 'button',
    domPath: 'html:nth-of-type(1) > body:nth-of-type(1) > button:nth-of-type(1)',
    outerHtmlSnippet: '<button></button>',
    textContent: '',
    classes: [],
    frameUrl: 'http://localhost:3000/',
  };
}

describe('subscribing', () => {
  it('displays a copied local route behind a no-webview cover until its own binding echo (ONL-2515)', async () => {
    const sourceUrl = 'http://localhost:4317/products?sort=new#details';
    const ownUrl = 'http://localhost:5182/products?sort=new#details';
    await connect(docOf([browserNode('copy', {
      content: { homeUrl: 'about:blank', pendingHomeUrl: sourceUrl },
    })]));
    expect(frameNodes()[0]?.data.currentUrl).toBe(sourceUrl);
    expect(frameNodes()[0]?.data.homeUrl).toBe('about:blank');
    expect(frameNodes()[0]?.data.serverCover).toBe('non-started');

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'copy', homeUrl: ownUrl }, 'system'));

    expect(frameNodes()[0]?.data.currentUrl).toBe(ownUrl);
    expect(frameNodes()[0]?.data.homeUrl).toBe(ownUrl);
    expect(frameNodes()[0]?.data.serverCover).toBeUndefined();
    const node = useCanvasStore.getState().doc?.nodes.copy;
    if (node?.kind !== 'browser') throw new Error('expected copied browser');
    expect(node.content.pendingHomeUrl).toBeUndefined();
  });

  it('always re-requests the snapshot, so a stale mirror is replaced', async () => {
    useCanvasStore.getState().replaceDoc(docOf([browserNode('stale')], 1));
    expect(canvasNodes()).toEqual(['stale']);

    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 4));

    expect(wire.snapshotRequests).toBe(1);
    expect(canvasNodes()).toEqual(['a', 'b']);
    expect(useCanvasStore.getState().doc?.revision).toBe(4);
  });
});

describe('operation-array dispatch boundary', () => {
  it('sends 1000 operations without a renderer-owned batch identity and drops 1001', async () => {
    const wire = await connect(docOf([browserNode('a')]));
    const boundary = Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST }, (_, index) => ({
      type: 'rename' as const,
      id: 'a',
      name: `boundary-${index}`,
    }));

    dispatchCanvasOps(boundary);
    expect(wire.sent).toEqual([{ docId: DOC_ID, ops: boundary }]);

    wire.sent.length = 0;
    dispatchCanvasOps([...boundary, { type: 'rename', id: 'a', name: 'oversized' }]);
    expect(wire.sent).toEqual([]);
  });
});

describe('broadcasts against the mirror', () => {
  it('applies exactly revision current+1, in order, and the surfaces see it', async () => {
    await connect(docOf([browserNode('a', { x: 0, y: 0 })], 5));

    fakeUpdate(entryOf(6, { type: 'move', id: 'a', x: 300, y: 40 }));
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 300, y: 40 });

    fakeUpdate(entryOf(7, { type: 'rename', id: 'a', name: 'checkout' }));
    expect(useCanvasStore.getState().doc?.nodes['a']?.name).toBe('checkout');
    expect(useCanvasStore.getState().doc?.revision).toBe(7);
  });

  it('drops a stale echo (revision ≤ current) without touching anything or resyncing', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 0, y: 0 })], 5));

    fakeUpdate(entryOf(5, { type: 'move', id: 'a', x: 999, y: 999 }));
    fakeUpdate(entryOf(4, { type: 'move', id: 'a', x: 999, y: 999 }));

    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(useCanvasStore.getState().doc?.revision).toBe(5);
    expect(wire.snapshotRequests).toBe(1);
  });

  it('re-requests the snapshot on a revision gap, and the answer replaces the mirror', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 0, y: 0 })], 5));

    wire.answerSnapshotsWith(docOf([browserNode('a', { x: 777, y: 0 })], 9));
    fakeUpdate(entryOf(8, { type: 'move', id: 'a', x: 123, y: 0 }));
    await settled();

    expect(wire.snapshotRequests).toBe(2);
    expect(useCanvasStore.getState().doc?.revision).toBe(9);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 777, y: 0 });
  });

  it('a reorder restacks by zIndex and leaves the array — and so every webview — where it was', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 0, y: 0 }), browserNode('b', { x: 900, y: 0, order: 1 })], 5),
    );
    expect(useCanvasStore.getState().nodes.map((node) => [node.id, node.zIndex])).toEqual([
      ['a', 0],
      ['b', 1],
    ]);

    wire.emitUpdate({ docId: DOC_ID, entry: entryOf(6, { type: 'reorder', id: 'a', order: 2 }) });

    expect(useCanvasStore.getState().nodes.map((node) => [node.id, node.zIndex])).toEqual([
      ['a', 1],
      ['b', 0],
    ]);
  });

  it('a burst of arrow presses moves only the screen, then saves once at its end and releases on that echo', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 100, y: 0 })], 5));
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().nudgeNodes(1, 0);
    useCanvasStore.getState().nudgeNodes(1, 0);
    useCanvasStore.getState().nudgeNodes(1, 0);
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 103, y: 0 });

    useCanvasStore.getState().flushNudges();
    expect(wire.sent.map((request) => request.op)).toEqual([{ type: 'move', id: 'a', x: 103, y: 0 }]);

    wire.emitUpdate({ docId: DOC_ID, entry: entryOf(6, { type: 'move', id: 'a', x: 103, y: 0 }) });
    expect(useCanvasStore.getState().gesture['a']).toBeUndefined();
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 103, y: 0 });
  });

  it('a nudged group saves as one request, which main keeps as one undo step', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 0, y: 0 }), browserNode('b', { x: 900, y: 0, order: 1 })], 5),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);

    useCanvasStore.getState().nudgeNodes(0, 10);
    useCanvasStore.getState().flushNudges();
    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]?.ops).toEqual([
      { type: 'move', id: 'a', x: 0, y: 10 },
      { type: 'move', id: 'b', x: 900, y: 10 },
    ]);
  });

  it('drops a broadcast for a foreign document', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 0, y: 0 })], 5));

    wire.emitUpdate({
      docId: 'some-other-document',
      entry: entryOf(6, { type: 'move', id: 'a', x: 999, y: 999 }),
    });

    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(useCanvasStore.getState().doc?.revision).toBe(5);
    expect(wire.snapshotRequests).toBe(1);
  });

  it('resyncs on a rejection for our document, and ignores a foreign one', async () => {
    const wire = await connect(docOf([browserNode('a')], 5));

    wire.emitRejected({ docId: 'some-other-document', reason: 'not ours' });
    await settled();
    expect(wire.snapshotRequests).toBe(1);

    wire.answerSnapshotsWith(docOf([browserNode('a')], 6));
    wire.emitRejected({ docId: DOC_ID, reason: 'op declined' });
    await settled();
    expect(wire.snapshotRequests).toBe(2);
    expect(useCanvasStore.getState().doc?.revision).toBe(6);
  });
});

describe('the composed canvas carries every node kind', () => {
  it('a text node and an image node compose under their own node types, each with its own payload', async () => {
    await connect(docOf([browserNode('a'), textNode('t'), imageNode('i')], 3));

    const nodes = useCanvasStore.getState().nodes;
    expect(nodes.map((node) => [node.id, node.type])).toEqual([
      ['a', FRAME_NODE_TYPE],
      ['t', TEXT_NODE_TYPE],
      ['i', IMAGE_NODE_TYPE],
    ]);
    expect((nodes[1] as TextFlowNode).data).toEqual({
      text: 'a note to self',
      size: 'medium',
      name: 't',
    });
    expect((nodes[2] as ImageFlowNode).data).toEqual({
      imageId: 'img_i',
      name: 'i',
      originalWidth: 640,
      originalHeight: 400,
    });
  });

  it('the frame overlay is minted for frames alone — a text node holds no browser facts', async () => {
    await connect(docOf([browserNode('a'), textNode('t'), imageNode('i')], 3));

    expect(Object.keys(useCanvasStore.getState().overlay)).toEqual(['a']);
  });

  it('a text edit replaces that node alone, box included; every other composed node keeps its object', async () => {
    await connect(docOf([browserNode('a'), textNode('t')], 2));
    const before = useCanvasStore.getState().nodes;

    fakeUpdate(entryOf(3, { type: 'set-text', id: 't', text: 'rewritten', width: 512, height: 120 }));

    const after = useCanvasStore.getState().nodes;
    expect(after.find((node) => node.id === 'a')).toBe(before.find((node) => node.id === 'a'));
    const text = after.find((node) => node.id === 't');
    expect(text).not.toBe(before.find((node) => node.id === 't'));
    expect(text).toMatchObject({ width: 512, height: 120 });
    expect((text as TextFlowNode).data.text).toBe('rewritten');
  });

  it('a content op naming a node of the wrong kind is a gap, so the mirror resyncs rather than diverging', async () => {
    const wire = await connect(docOf([browserNode('a'), textNode('t')], 2));

    wire.answerSnapshotsWith(docOf([browserNode('a'), textNode('t')], 3));
    fakeUpdate(entryOf(3, { type: 'set-text', id: 'a', text: 'not a text node', width: 512, height: 120 }));
    await settled();

    expect(wire.snapshotRequests).toBe(2);
    expect(useCanvasStore.getState().doc?.revision).toBe(3);
  });
});

describe('the mirror replays the reducer — parity against the fixture pair', () => {
  // Read at runtime, not imported: an import pulls main's project into the renderer's tsconfig.
  const mainFixture = (name: string): string =>
    readFileSync(fileURLToPath(new URL(`../../../main/canvas/fixtures/${name}`, import.meta.url)), 'utf8');

  const EVERY_OP_KIND = {
    create: true,
    duplicate: true,
    move: true,
    resize: true,
    rename: true,
    reorder: true,
    'set-home-url': true,
    'set-text': true,
    'set-text-size': true,
    'set-image-alt': true,
    remove: true,
    'create-page': true,
    'rename-page': true,
    'reorder-page': true,
    'remove-page': true,
    'set-node-page': true,
  } satisfies Record<CanvasOp['type'], true>;

  it("applies every op kind as main's reducer does: an empty mirror advanced through main's log reproduces main's document", () => {
    const fixtureDoc = JSON.parse(mainFixture('every-op-canvas.json')) as CanvasDoc;
    const fixtureLog = JSON.parse(mainFixture('every-op-canvas.log.json')) as CanvasOpEntry[];
    const kindsInLog: string[] = [...new Set(fixtureLog.map((entry) => entry.op.type))];
    expect(kindsInLog.sort()).toEqual(Object.keys(EVERY_OP_KIND).sort());

    let mirror: CanvasDoc = {
      schemaVersion: fixtureDoc.schemaVersion,
      docId: fixtureDoc.docId,
      revision: 0,
      pages: {},
      nodes: {},
    };
    for (const entry of fixtureLog) {
      const outcome = applyEntryToMirror(mirror, entry);
      if (outcome.kind !== 'applied') {
        throw new Error(`mirror answered ${outcome.kind} at revision ${String(entry.revision)}`);
      }
      mirror = outcome.doc;
    }

    expect(mirror).toEqual(fixtureDoc);
  });
});

describe('resync replaces the read model; the overlay survives by id', () => {
  it('keeps surviving ids’ moments, drops vanished ids’, and clears their selection and picker', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 3));

    useCanvasStore.getState().patchFrame('a', {
      health: 'live',
      currentUrl: 'http://localhost:3000/a/deep-route',
      title: 'Checkout',
    });
    useCanvasStore.getState().patchFrame('b', { health: 'live' });
    useCanvasStore.getState().selectFrame('b', false);
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-b'), 'b', false);
    expect(useCanvasStore.getState().isPicking).toBe(true);

    wire.answerSnapshotsWith(docOf([browserNode('a', { x: 500, y: 0 })], 7));
    wire.emitRejected({ docId: DOC_ID, reason: 'force the resync' });
    await settled();

    expect(canvasNodes()).toEqual(['a']);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 500, y: 0 });
    expect(selection()).toEqual([]);
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(useCanvasStore.getState().isPicking).toBe(true);
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
    expect(Object.keys(useCanvasStore.getState().overlay)).toEqual(['a']);
    expect(panelRows()).toEqual([{ id: 'a', url: 'http://localhost:3000/a/deep-route' }]);
    expect(frameNodes()[0]?.data.health).toBe('live');
    expect(frameNodes()[0]?.data.title).toBe('Checkout');
  });
});

describe('composition: gesture, document, overlay', () => {
  it('mid-drag the gesture wins over a broadcast, and the settle dispatches the move op', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 0, y: 0 })], 1));

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 500, y: 40 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 500, y: 40 });

    fakeUpdate(entryOf(2, { type: 'move', id: 'a', x: 900, y: 900 }));
    expect(useCanvasStore.getState().doc?.nodes['a']).toMatchObject({ x: 900, y: 900 });
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 500, y: 40 });

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 520, y: 40 }, dragging: false },
    ]);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'move', id: 'a', x: 520, y: 40 } },
    ]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 520, y: 40 });

    fakeUpdate(entryOf(3, { type: 'move', id: 'a', x: 520, y: 40 }));
    expect(useCanvasStore.getState().gesture).toEqual({});
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 520, y: 40 });
  });
});

describe('composition identity', () => {
  it('dragging one node leaves every other node’s object reference unchanged', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    const before = useCanvasStore.getState().nodes;
    const untouched = before.find((node) => node.id === 'b');

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 40 }, dragging: true },
    ]);

    const after = useCanvasStore.getState().nodes;
    expect(after.find((node) => node.id === 'a')).not.toBe(before.find((n) => n.id === 'a'));
    expect(after.find((node) => node.id === 'b')).toBe(untouched);
  });

  it('a write that changes nothing hands back the same node references — and the same array', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('a', false);
    const before = useCanvasStore.getState().nodes;

    useCanvasStore.getState().selectFrame('a', false);

    expect(useCanvasStore.getState().nodes).toBe(before);
  });

  it('a broadcast that prunes nothing keeps the momentary references alone', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked-b'), 'b', false);
    const state = useCanvasStore.getState();
    const untouchedNode = state.nodes.find((node) => node.id === 'b');

    fakeUpdate(entryOf(3, { type: 'move', id: 'a', x: 700, y: 0 }));

    const after = useCanvasStore.getState();
    expect(after.elementSelections).toBe(state.elementSelections);
    expect(after.overlay).toBe(state.overlay);
    expect(after.nodes.find((node) => node.id === 'b')).toBe(untouchedNode);
  });
});

describe('no document', () => {
  it('composes an empty canvas and emits nothing — the no-project world', async () => {
    const wire = await connect(null);

    expect(canvasNodes()).toEqual([]);
    expect(selection()).toEqual([]);
    expect(wire.sent).toEqual([]);
  });

  it('an EMPTY document composes an empty canvas — the emptied-project relaunch shape', () => {
    useCanvasStore.getState().replaceDoc(docOf([], 4));
    expect(canvasNodes()).toEqual([]);
  });
});
describe('seeding the camera before mount', () => {
  it('puts the saved camera in place synchronously, so the mount reads it', () => {
    useCanvasStore.getState().seedCamera({ x: 1, y: 2, zoom: 0.75 });
    expect(useCanvasStore.getState().restoredViewport).toEqual({ x: 1, y: 2, zoom: 0.75 });
  });

  it('a project with nothing saved falls back to fitView', () => {
    useCanvasStore.getState().seedCamera({ x: 1, y: 2, zoom: 0.75 });
    useCanvasStore.getState().seedCamera(undefined);
    expect(useCanvasStore.getState().restoredViewport).toBeNull();
  });

  it('leaving the project drops it, so the next one is never opened at this camera', () => {
    useCanvasStore.getState().seedCamera({ x: 1, y: 2, zoom: 0.75 });
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().restoredViewport).toBeNull();
  });
});
describe('user mutations become ops', () => {
  it('addFrame dispatches a create op that tiles right of the rightmost frame, and the echo selects the minted id', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('wide', { x: 0, width: 1280 }),
          browserNode('narrow', { x: 200, width: 100, order: 1 }),
        ],
        2,
      ),
    );

    const minted = useCanvasStore.getState().addFrame('http://localhost:4000');

    const request = wire.sent[0];
    expect(request?.docId).toBe(DOC_ID);
    const op = singleOp(request);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node.x).toBeGreaterThan(1280);
    expect(op.node).toMatchObject({
      id: minted,
      pageId: 'pg_main',
      kind: 'browser',
      y: 0,
      width: DEFAULT_FRAME_SIZE.width,
      height: DEFAULT_FRAME_SIZE.height,
      order: 2,
      content: { homeUrl: 'http://localhost:4000' },
    });

    fakeUpdate(entryOf(3, { type: 'create', node: op.node }));
    expect(panelRows()[2]).toEqual({ id: minted, url: 'http://localhost:4000' });
    expect(selection()).toEqual([minted]);
  });

  it('addFrame on an empty document creates at the origin — the tiling sentinel', async () => {
    const wire = await connect(docOf([], 1));
    useCanvasStore.getState().addFrame('http://localhost:3000');
    const op = wire.sent[0]?.op;
    if (op?.type !== 'create') throw new Error('expected a create op');
    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 0, y: 0 });
  });

  it('addFrame with no document open drops the op rather than queueing it', async () => {
    const wire = await connect(null);
    useCanvasStore.getState().addFrame('http://localhost:3000');
    expect(wire.sent).toEqual([]);
  });

  it('both delete routes — toolbar and React Flow remove — dispatch the same op, and the echo cleans up', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('b', false);
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-b'), 'b', false);

    useCanvasStore.getState().removeFrame('b');
    useCanvasStore.getState().onNodesChange([{ type: 'remove', id: 'b' }]);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'remove', id: 'b' } },
      { docId: DOC_ID, op: { type: 'remove', id: 'b' } },
    ]);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'b' }));
    expect(canvasNodes()).toEqual(['a']);
    expect(selection()).toEqual([]);
    expect(useCanvasStore.getState().isPicking).toBe(true);
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('a deletion elsewhere does not disturb a selection it did not remove', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('a', false);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'b' }));

    expect(canvasNodes()).toEqual(['a']);
    expect(selection()).toEqual(['a']);
  });

  it('the address bar commit authors a set-home-url op AND navigates through the request; in-page browsing authors nothing', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().commitAddress('a', 'http://localhost:5173/');
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/' } },
    ]);
    expect(targets()).toEqual(['http://localhost:5173/']);

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/' }));
    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(
      'http://localhost:5173/',
    );
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3000/a');

    useCanvasStore.getState().patchFrame('a', {
      currentUrl: 'http://localhost:5173/settings',
      title: 'Settings',
    });
    expect(wire.sent).toHaveLength(1);
  });

  it('a resize drag settles at onResizeEnd: one resize op, the hold persists, the echo releases it', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 10, y: 20 })], 1));

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      {
        type: 'dimensions',
        id: 'a',
        dimensions: { width: 900, height: 600 },
        resizing: true,
        setAttributes: true,
      },
    ]);
    expect(wire.sent).toEqual([]);
    const held = useCanvasStore.getState().nodes[0];
    expect({ width: held?.width, height: held?.height }).toEqual({ width: 900, height: 600 });

    useCanvasStore.getState().settleResize('a', { x: 5, y: 20, width: 904, height: 600 });
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'resize', id: 'a', x: 5, y: 20, width: 900, height: 600 } },
    ]);
    const settling = useCanvasStore.getState().nodes[0];
    expect(settling?.position).toEqual({ x: 5, y: 20 });

    fakeUpdate(entryOf(2, { type: 'resize', id: 'a', x: 5, y: 20, width: 900, height: 600 }));
    expect(useCanvasStore.getState().gesture).toEqual({});
    const node = useCanvasStore.getState().nodes[0];
    expect({ width: node?.width, height: node?.height }).toEqual({ width: 900, height: 600 });
  });

  it('a device preset dispatches a resize op carrying the frame’s current position', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 10, y: 20 })], 1));

    useCanvasStore.getState().resizeFrame('a', 402, 874);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'resize', id: 'a', x: 10, y: 20, width: 402, height: 874 } },
    ]);

    fakeUpdate(entryOf(2, { type: 'resize', id: 'a', x: 10, y: 20, width: 402, height: 874 }));
    const node = useCanvasStore.getState().nodes[0];
    expect({ width: node?.width, height: node?.height }).toEqual({ width: 402, height: 874 });
  });
});

describe('the menu’s stacking verbs (ONL-2486)', () => {
  const stacked = (): CanvasDoc =>
    docOf([browserNode('back'), textNode('middle', { order: 1 }), imageNode('front', { order: 2 })], 3);

  it('sends the front-most node behind every other node, in one request', async () => {
    const wire = await connect(stacked());
    useCanvasStore.getState().stackNode('front', 'back');
    expect(wire.sent).toEqual([{ docId: DOC_ID, op: { type: 'reorder', id: 'front', order: -1 } }]);
  });

  it('brings the back-most node in front of every other node', async () => {
    const wire = await connect(stacked());
    useCanvasStore.getState().stackNode('back', 'front');
    expect(requestOps(wire.sent[0])).toEqual([{ type: 'reorder', id: 'back', order: 3 }]);
  });

  it('authors nothing for a node already at that end, so the stack gains no history entry', async () => {
    const wire = await connect(stacked());
    useCanvasStore.getState().stackNode('back', 'back');
    useCanvasStore.getState().stackNode('front', 'front');
    expect(wire.sent).toEqual([]);
  });

  it('authors nothing for a node the document does not hold', async () => {
    const wire = await connect(stacked());
    useCanvasStore.getState().stackNode('ghost', 'front');
    expect(wire.sent).toEqual([]);
  });

  it('deletes every selected node in one request, whichever member the menu opened on', async () => {
    const wire = await connect(stacked());
    useCanvasStore.getState().selectFrame('back', false);
    useCanvasStore.getState().selectFrame('middle', true);

    useCanvasStore.getState().removeFrame('middle');

    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'remove', id: 'back' },
      { type: 'remove', id: 'middle' },
    ]);
    expect(wire.sent).toHaveLength(1);
  });
});

describe('duplicate and create gestures (ONL-1994)', () => {
  it('duplicateFrame dispatches a duplicate op — provenance from the source, geometry and homeUrl copied, order max+1 — and the echo selects the copy', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('storefront', { x: 100, y: 50, width: 800, height: 600 }),
          browserNode('other', { order: 1 }),
        ],
        2,
      ),
    );

    const minted = useCanvasStore.getState().duplicateFrame('storefront');
    if (minted === undefined) throw new Error('expected the duplicate to mint an id');

    const request = wire.sent[0];
    expect(request?.docId).toBe(DOC_ID);
    const op = singleOp(request);
    if (op.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect(op.node).toMatchObject({
      id: minted,
      pageId: 'pg_main',
      kind: 'browser',
      x: DEFAULT_FRAME_SIZE.width + PLACEMENT_GAP,
      y: 50,
      width: 800,
      height: 600,
      order: 2,
      content: { homeUrl: 'http://localhost:3000/storefront' },
    });
    expect(op.node.provenance.from).toBe('storefront');
    expect(Number.isNaN(Date.parse(op.node.provenance.at))).toBe(false);

    fakeUpdate(entryOf(3, { type: 'duplicate', node: op.node }));
    expect(panelRows()[2]).toEqual({ id: minted, url: 'http://localhost:3000/storefront' });
    expect(selection()).toEqual([minted]);
  });

  it('a second duplicate of the SAME source cascades further right — the anti-stack rule', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 0, y: 0 })], 1));
    const slot = DEFAULT_FRAME_SIZE.width + PLACEMENT_GAP;

    useCanvasStore.getState().duplicateFrame('a');
    const first = singleOp(wire.sent[0]);
    if (first.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect({ x: first.node.x, y: first.node.y }).toEqual({ x: slot, y: 0 });
    fakeUpdate(entryOf(2, { type: 'duplicate', node: first.node }));

    useCanvasStore.getState().duplicateFrame('a');
    const second = singleOp(wire.sent[1]);
    if (second.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect({ x: second.node.x, y: second.node.y }).toEqual({ x: slot * 2, y: 0 });
  });

  it('places a duplicate to the right even when the viewport has no room for it', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 900, y: 700, width: 400, height: 300 })], 1),
    );
    useCanvasStore.getState().duplicateFrame('a');

    const op = wire.sent[0]?.op;
    if (op?.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 1400, y: 700 });
  });

  it('⌘D with no selection is a no-op, and a vanished id duplicates nothing', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    expect(useCanvasStore.getState().duplicateSelectedFrame()).toBeUndefined();
    expect(useCanvasStore.getState().duplicateFrame('gone')).toBeUndefined();
    expect(wire.sent).toEqual([]);
  });

  it('repeated keyboard duplicates keep the source intact and continue right in the same row', async () => {
    const source = browserNode('a', { x: 900, y: 700, width: 800, height: 600 });
    const wire = await connect(docOf([source], 1));
    useCanvasStore.getState().selectFrame('a', false);
    for (let index = 0; index < 3; index += 1) {
      useCanvasStore.getState().duplicateSelectedFrame();
      const op = singleOp(wire.sent[index]);
      if (op.type !== 'duplicate') throw new Error('expected a duplicate op');
      expect({ x: op.node.x, y: op.node.y }).toEqual({
        x: source.x + (index + 1) * (source.width + PLACEMENT_GAP),
        y: source.y,
      });
      fakeUpdate(entryOf(index + 2, op));
      expect(selection()).toEqual([op.node.id]);
      expect(useCanvasStore.getState().doc?.nodes.a).toEqual(source);
    }
  });

  it('opens a new frame past the full width of a resized source', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 900, y: 700, width: 2400 })], 1));
    useCanvasStore.getState().openInNewFrame('a', 'http://localhost:9000/');
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 3400, y: 700 });
  });

  it('skips an offset neighbour and requests a pan only for duplicates and new-frame opens', async () => {
    const source = browserNode('a', { x: 0, y: 100, width: 400, height: 300 });
    const neighbour = browserNode('b', { x: 650, y: 150, width: 700, height: 300, order: 1 });
    for (const action of ['keyboard', 'menu', 'new-frame'] as const) {
      const wire = await connect(docOf([source, neighbour], 1));
      useCanvasStore.getState().selectFrame('a', false);
      const state = useCanvasStore.getState();
      const minted = action === 'keyboard' ? state.duplicateSelectedFrame()
        : action === 'menu' ? state.duplicateFrame('a') : state.openInNewFrame('a', 'http://localhost:9000/');
      const op = singleOp(wire.sent[0]);
      if (op.type !== 'duplicate' && op.type !== 'create') throw new Error('expected a new node');
      expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 1450, y: 100 });
      expect(useCanvasStore.getState().flyTo).toMatchObject({ id: minted, panOnly: true });
      fakeUpdate(entryOf(2, op));
      expect(selection()).toEqual([minted!]);
      expect(useCanvasStore.getState().doc?.nodes.a).toEqual(source);
      expect(useCanvasStore.getState().doc?.nodes.b).toEqual(neighbour);
      disconnect?.();
      disconnect = null;
    }
  });

  it('keeps an exact option-drag drop even over a neighbour and does not request a pan', async () => {
    const wire = await connect(docOf([
      browserNode('a', { width: 400, height: 300 }),
      browserNode('b', { x: 650, y: 150, width: 700, height: 300 }),
    ]));
    useCanvasStore.getState().duplicateFrame('a', { x: 680, y: 160 });
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'duplicate') throw new Error('expected a duplicate');
    expect({ x: op.node.x, y: op.node.y }).toEqual({ x: 680, y: 160 });
    expect(useCanvasStore.getState().flyTo).toBeNull();
  });

  it('a refused single duplicate mints nothing — never a selection of an id main never heard', async () => {
    await connect(docOf([browserNode('storefront')], 1));
    useCanvasStore.getState().selectFrame('storefront', false);
    disconnect?.();
    disconnect = null;

    expect(useCanvasStore.getState().duplicateFrame('storefront')).toBeUndefined();
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['storefront']);
  });

  it('openInNewFrame authors a create at the shared placement; the source frame is untouched', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 10, y: 20 })], 1));

    const minted = useCanvasStore.getState().openInNewFrame('a', 'http://localhost:9000/');

    expect(wire.sent).toHaveLength(1);
    const request = wire.sent[0];
    const op = singleOp(request);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({
      id: minted,
      pageId: 'pg_main',
      kind: 'browser',
      name: displayUrl('http://localhost:9000/'),
      x: 10 + DEFAULT_FRAME_SIZE.width + PLACEMENT_GAP,
      y: 20,
      width: DEFAULT_FRAME_SIZE.width,
      height: DEFAULT_FRAME_SIZE.height,
      order: 1,
      content: { homeUrl: 'http://localhost:9000/' },
    });
    expect(op.node.provenance).toBeUndefined();

    fakeUpdate(entryOf(2, { type: 'create', node: op.node }));
    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(
      'http://localhost:3000/a',
    );
    expect(targets()).toEqual([undefined, undefined]);
    expect(selection()).toEqual([minted]);
  });
});

describe('frame names (ONL-1994)', () => {
  it('a rename op round-trips into the sidebar row, and renaming A leaves B’s node reference unchanged', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    const before = useCanvasStore.getState().nodes;
    const untouched = before.find((node) => node.id === 'b');

    useCanvasStore.getState().renameFrame('a', 'Storefront');

    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'rename', id: 'a', name: 'Storefront' } },
    ]);

    fakeUpdate(entryOf(3, { type: 'rename', id: 'a', name: 'Storefront' }));
    expect(panelNames()).toEqual(['Storefront', 'b']);
    const after = useCanvasStore.getState().nodes;
    expect(after.find((node) => node.id === 'a')).not.toBe(before.find((n) => n.id === 'a'));
    expect(after.find((node) => node.id === 'b')).toBe(untouched);
  });

  it('authors nothing when the committed name is unchanged — padding included', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().renameFrame('a', 'a');
    useCanvasStore.getState().renameFrame('a', '  a  ');

    expect(wire.sent).toEqual([]);
  });

  it('an EMPTY commit reverts to the displayUrl fallback rather than persisting a blank name', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().renameFrame('a', '   ');

    expect(wire.sent).toEqual([
      {
        docId: DOC_ID,
        op: { type: 'rename', id: 'a', name: displayUrl('http://localhost:3000/a') },
      },
    ]);
  });

  it('the edit state opens on document nodes only, and every exit clears it', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().beginRename('a');
    expect(useCanvasStore.getState().renamingFrameId).toBe('a');
    useCanvasStore.getState().endRename();
    expect(useCanvasStore.getState().renamingFrameId).toBeNull();
    useCanvasStore.getState().beginRename('a');
    useCanvasStore.getState().renameFrame('a', 'a');
    expect(useCanvasStore.getState().renamingFrameId).toBeNull();
  });
});

describe('⌥-drag pulls a copy (ONL-1994)', () => {
  function nodeBytes(id: string): string {
    return JSON.stringify(useCanvasStore.getState().nodes.find((n) => n.id === id));
  }

  it('drop away from the source: one duplicate op at the drop position, no move op, the source snaps back byte-identical', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 100, y: 50, width: 800, height: 600 })], 1),
    );
    const before = nodeBytes('a');

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 400, y: 300 });
    expect(wire.sent).toEqual([]);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 420, y: 310 }, dragging: false },
    ]);

    expect(wire.sent).toHaveLength(1);
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect(op.node).toMatchObject({
      x: 420,
      y: 310,
      width: 800,
      height: 600,
      content: { homeUrl: 'http://localhost:3000/a' },
    });
    const copy = op.node;
    expect(copy.provenance.from).toBe('a');
    expect(nodeBytes('a')).toBe(before);
    expect(useCanvasStore.getState().duplicateDrag).toBeNull();

    fakeUpdate(entryOf(2, { type: 'duplicate', node: copy }));
    expect(selection()).toEqual([copy.id]);
    expect(useCanvasStore.getState().nodes.find((n) => n.id === copy.id)?.position)
      .toEqual({ x: 420, y: 310 });
  });

  it('cancel mid-drag (Escape / ⌥-release): the source snaps back and NOTHING is authored — and the next plain drag settles as ever', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 100, y: 50 })], 1));
    const before = nodeBytes('a');

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
    ]);

    useCanvasStore.getState().cancelDuplicateDrag();
    expect(nodeBytes('a')).toBe(before);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 500, y: 400 }, dragging: true },
      { type: 'position', id: 'a', position: { x: 510, y: 410 }, dragging: false },
    ]);
    expect(nodeBytes('a')).toBe(before);
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().duplicateDrag).toBeNull();

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 200, y: 60 }, dragging: true },
      { type: 'position', id: 'a', position: { x: 210, y: 60 }, dragging: false },
    ]);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'move', id: 'a', x: 210, y: 60 } },
    ]);
  });

  it('a terminal blur cancel needs no trailing settle and leaves the next plain drag untouched', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 100, y: 50 })], 1));
    const before = nodeBytes('a');

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
    ]);
    useCanvasStore.getState().cancelDuplicateDrag();
    useCanvasStore.getState().endDuplicateDrag();

    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
    expect(nodeBytes('a')).toBe(before);
    expect(wire.sent).toEqual([]);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 210, y: 60 }, dragging: false },
    ]);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'move', id: 'a', x: 210, y: 60 } },
    ]);
  });

  it('drop on the source (within one placement step) resolves by the anti-stack offset rule', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 100, y: 50 })], 1));

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 110, y: 55 }, dragging: true },
      { type: 'position', id: 'a', position: { x: 110, y: 55 }, dragging: false },
    ]);

    const op = wire.sent[0]?.op;
    if (op?.type !== 'duplicate') throw new Error('expected a duplicate op');
    expect({ x: op.node.x, y: op.node.y }).toEqual({
      x: 100 + DEFAULT_FRAME_SIZE.width + PLACEMENT_GAP,
      y: 50,
    });
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 100, y: 50 });
  });

  it('the drag-stop cleanup clears a drag that never settled, authoring nothing', async () => {
    const wire = await connect(docOf([browserNode('a', { x: 100, y: 50 })], 1));
    const before = nodeBytes('a');

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 130, y: 80 }, dragging: true },
    ]);
    useCanvasStore.getState().endDuplicateDrag();

    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
    expect(nodeBytes('a')).toBe(before);
    expect(wire.sent).toEqual([]);
  });

  it('duplicates the whole selected set at its final preview positions in one batch, then selects every echoed copy', async () => {
    const wire = await connect(
      docOf([
        browserNode('a', { x: 100, y: 50 }),
        browserNode('b', { x: 1000, y: 50, order: 1 }),
      ], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);

    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 1300, y: 300 }, dragging: true },
    ]);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 420, y: 310 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 1320, y: 310 }, dragging: false },
    ]);

    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]).not.toHaveProperty('batchId');
    const ops = requestOps(wire.sent[0]);
    expect(ops).toHaveLength(2);
    expect(ops.every((op) => op.type === 'duplicate')).toBe(true);
    const copies = ops.flatMap((op) => (op.type === 'duplicate' ? [op.node] : []));
    expect(copies.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 420, y: 310 },
      { x: 1320, y: 310 },
    ]);
    expect(copies.map((copy) => copy.provenance.from)).toEqual(['a', 'b']);
    expect(useCanvasStore.getState().nodes.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 'a', position: { x: 100, y: 50 } },
      { id: 'b', position: { x: 1000, y: 50 } },
    ]);

    fakeUpdate(entryOf(3, { type: 'duplicate', node: copies[0]! }));
    fakeUpdate(entryOf(4, { type: 'duplicate', node: copies[1]! }));
    expect(selection()).toEqual(copies.map((copy) => copy.id));
    expect(primaryFrameId(useCanvasStore.getState())).toBe(copies[1]?.id);
  });

  it('cancels every selected member of an option-drag without authoring a move or duplicate', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 100 }), browserNode('b', { x: 1000, order: 1 })], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 1300, y: 300 }, dragging: true },
    ]);

    useCanvasStore.getState().cancelDuplicateDrag();
    expect(useCanvasStore.getState().nodes.map((node) => node.position)).toEqual([
      { x: 100, y: 0 },
      { x: 1000, y: 0 },
    ]);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 420, y: 310 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 1320, y: 310 }, dragging: false },
    ]);
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
  });

  it('a remotely removed source cancels the whole option-drag and swallows each survivor’s late settle', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 100 }), browserNode('b', { x: 1000, order: 1 })], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 1300, y: 300 }, dragging: true },
    ]);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(useCanvasStore.getState().nodes.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 'b', position: { x: 1000, y: 0 } },
    ]);
    expect(useCanvasStore.getState().duplicateDrag).toMatchObject({
      ids: ['b'],
      isCancelled: true,
    });
    expect(useCanvasStore.getState().duplicateDrag?.members).toEqual(new Set(['b']));

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'b', position: { x: 1320, y: 310 }, dragging: false },
    ]);

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 1000, y: 0 });
    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
  });

  it('retires the cancelled option-drag tombstone when its final survivor disappears', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 100 }), browserNode('b', { x: 1000, order: 1 })], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 1300, y: 300 }, dragging: true },
    ]);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(useCanvasStore.getState().duplicateDrag).not.toBeNull();
    fakeUpdate(entryOf(4, { type: 'remove', id: 'b' }));

    expect(useCanvasStore.getState().nodes).toEqual([]);
    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
    expect(wire.sent).toEqual([]);
  });

  it('retires a cancelled tombstone when only already-settled survivors remain', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 100 }), browserNode('b', { x: 1000, order: 1 })], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 400, y: 300 }, dragging: false },
    ]);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'b' }));

    expect(useCanvasStore.getState().duplicateDrag).toBeNull();
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 100, y: 0 });
    expect(wire.sent).toEqual([]);
  });
});

describe('selection is a set with one armed frame (ONL-2043)', () => {
  it('keeps the real selection when a batch duplicate is refused locally', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    disconnect?.();
    disconnect = null;

    expect(useCanvasStore.getState().duplicateSelectedFrame()).toBeUndefined();
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['a', 'b']);
  });

  it('a plain pick replaces a two-frame selection with one, whichever surface picked, and moves nothing else', async () => {
    await connect(
      docOf([browserNode('a'), browserNode('b', { order: 1 }), browserNode('c', { order: 2 })], 3),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    expect(selection()).toEqual(['a', 'b']);

    useCanvasStore.getState().selectFrame('c', false);
    expect(selection()).toEqual(['c']);

    expect(panelRows()).toEqual([
      { id: 'a', url: 'http://localhost:3000/a' },
      { id: 'b', url: 'http://localhost:3000/b' },
      { id: 'c', url: 'http://localhost:3000/c' },
    ]);
  });

  it('shift-pick gathers, and shift-pick on a selected member removes it', async () => {
    await connect(
      docOf([browserNode('a'), browserNode('b', { order: 1 }), browserNode('c', { order: 2 })], 3),
    );

    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().selectFrame('c', true);
    expect(selection()).toEqual(['a', 'b', 'c']);

    useCanvasStore.getState().selectFrame('b', true);
    expect(selection()).toEqual(['a', 'c']);
  });

  it('the sidebar rows and the canvas nodes report ONE selection after either surface changes it', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('a', false);
    expect(selection()).toEqual(['a']);

    useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'b', selected: true }]);
    expect(selection()).toEqual(['a', 'b']);

    useCanvasStore.getState().selectFrame('a', true);
    expect(selection()).toEqual(['b']);
  });

  it('the ARMED frame is the most recently selected, not the first in composition order', async () => {
    await connect(
      docOf([browserNode('a'), browserNode('b', { order: 1 }), browserNode('c', { order: 2 })], 3),
    );

    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('c', true);
    expect(primaryFrameId(useCanvasStore.getState())).toBe('c');
  });

  it('removing the primary re-derives the primary from the remaining selection', async () => {
    await connect(docOf([browserNode('a'), browserNode('c', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('c', true);
    expect(primaryFrameId(useCanvasStore.getState())).toBe('c');

    fakeUpdate(entryOf(3, { type: 'remove', id: 'c' }));
    expect(selection()).toEqual(['a']);
    expect(primaryFrameId(useCanvasStore.getState())).toBe('a');
  });

  it('a group drag settles one move op per selected frame, none for the unselected', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 0 }),
          browserNode('b', { x: 500, y: 0, order: 1 }),
          browserNode('c', { x: 1000, y: 0, order: 2 }),
        ],
        3,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 40, y: 30 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 540, y: 30 }, dragging: true },
    ]);
    expect(wire.sent).toEqual([]);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 50, y: 40 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 550, y: 40 }, dragging: false },
    ]);

    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]).not.toHaveProperty('batchId');
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'move', id: 'a', x: 50, y: 40 },
      { type: 'move', id: 'b', x: 550, y: 40 },
    ]);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 60, y: 50 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 560, y: 50 }, dragging: false },
    ]);
    expect(wire.sent[1]).not.toHaveProperty('batchId');
  });

  it('a refused group settle drops its holds — back to document truth, never parked where main never heard', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 0, y: 0 }), browserNode('b', { x: 500, y: 0, order: 1 })], 2),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 40, y: 30 }, dragging: true },
      { type: 'position', id: 'b', position: { x: 540, y: 30 }, dragging: true },
    ]);
    disconnect?.();
    disconnect = null;

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 50, y: 40 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 550, y: 40 }, dragging: false },
    ]);

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().gesture).toEqual({});
    const positions = Object.fromEntries(
      useCanvasStore.getState().nodes.map((n) => [n.id, n.position]),
    );
    expect(positions).toEqual({ a: { x: 0, y: 0 }, b: { x: 500, y: 0 } });
  });

  it('delete aimed at a member removes ALL selected frames — three ops — and an unselected target removes itself alone', async () => {
    const wire = await connect(
      docOf([browserNode('a'), browserNode('b', { order: 1 }), browserNode('c', { order: 2 })], 3),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    useCanvasStore.getState().selectFrame('c', true);

    useCanvasStore.getState().removeFrame('b');
    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]).not.toHaveProperty('batchId');
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'remove', id: 'a' },
      { type: 'remove', id: 'b' },
      { type: 'remove', id: 'c' },
    ]);

    wire.sent.length = 0;
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().removeFrame('c');
    expect(wire.sent).toEqual([{ docId: DOC_ID, op: { type: 'remove', id: 'c' } }]);
    expect(selection()).toEqual(['a']);
  });

  it('duplicate with two selected mints two provenance-carrying copies on distinct slots — the occupied set sees the sibling placement', async () => {
    const slot = 800 + PLACEMENT_GAP;
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 0, width: 800, height: 600 }),
          browserNode('b', { x: slot, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);

    const returned = useCanvasStore.getState().duplicateSelectedFrame();

    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]).not.toHaveProperty('batchId');
    const [first, second] = requestOps(wire.sent[0]);
    if (first?.type !== 'duplicate' || second?.type !== 'duplicate') {
      throw new Error('expected two duplicate ops');
    }
    expect({ x: first.node.x, y: first.node.y }).toEqual({ x: slot * 2, y: 0 });
    expect(first.node.provenance.from).toBe('a');
    expect({ x: second.node.x, y: second.node.y }).toEqual({ x: slot * 3, y: 0 });
    expect(second.node.provenance.from).toBe('b');
    expect([first.node.order, second.node.order]).toEqual([2, 3]);

    fakeUpdate(entryOf(3, { type: 'duplicate', node: first.node }));
    fakeUpdate(entryOf(4, { type: 'duplicate', node: second.node }));
    expect(selection()).toEqual([first.node.id, second.node.id]);
    expect(primaryFrameId(useCanvasStore.getState())).toBe(second.node.id);
    expect(returned).toBe(second.node.id);
  });

  it('selects nothing at all when the id is not on the canvas', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('gone', false);
    expect(selection()).toEqual([]);
    expect(primaryFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('applies React Flow select changes without touching geometry', async () => {
    await connect(docOf([browserNode('a', { x: 7, y: 9 })], 1));

    useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'a', selected: true }]);
    expect(selection()).toEqual(['a']);
    useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'a', selected: false }]);
    expect(selection()).toEqual([]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 7, y: 9 });
  });
});

describe('edge snapping while dragging (ONL-2044)', () => {
  it('a drag settling within threshold of another frame’s edge dispatches the SNAPPED coordinates in the move op', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: false },
    ]);
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'move', id: 'a', x: 1200, y: 340 } },
    ]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 1200, y: 340 });
  });

  it('a dragged group snaps and guides by its outer edge, not by its primary member', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 400, height: 600 }),
          browserNode('c', { x: 500, y: 300, width: 400, height: 600, order: 1 }),
          browserNode('b', { x: -2000, y: 0, width: 800, height: 600, order: 2 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('c', true);

    // Only the group's left edge (a's) comes within reach of b's right edge; c, the primary, is nowhere near b.
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: -1195, y: 340 }, dragging: true },
      { type: 'position', id: 'c', position: { x: -695, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().snapGuides.map((guide) => guide.position)).toContain(-1200);
    const positions = useCanvasStore.getState().nodes.map((node) => [node.id, node.position.x]);
    expect(positions).toContainEqual(['a', -1200]);
    expect(positions).toContainEqual(['c', -700]);
  });

  it('guides appear mid-drag on the aligned pair and clear on the settle', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().snapGuides).toEqual([
      { orientation: 'vertical', position: 2000, from: 0, to: 940 },
    ]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 1200, y: 340 });

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: false },
    ]);
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
  });

  it('a group drag near a snap line settles every member by the SAME delta — relative geometry preserved', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 900, y: 300, width: 800, height: 600, order: 1 }),
          browserNode('c', { x: 2000, y: 0, width: 800, height: 600, order: 2 }),
        ],
        3,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 295, y: 340 }, dragging: false },
      { type: 'position', id: 'b', position: { x: 1195, y: 340 }, dragging: false },
    ]);
    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0]).not.toHaveProperty('batchId');
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'move', id: 'a', x: 300, y: 340 },
      { type: 'move', id: 'b', x: 1200, y: 340 },
    ]);
  });

  it('a cancelled ⌥-drag wandering into threshold raises no guides and snaps nothing — the abandoned hand decorates nothing', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginDuplicateDrag('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 600, y: 340 }, dragging: true },
    ]);
    useCanvasStore.getState().cancelDuplicateDrag();

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().snapGuides).toEqual([]);

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: false },
    ]);
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
    expect(useCanvasStore.getState().nodes[0]?.position).toEqual({ x: 0, y: 300 });
    expect(wire.sent).toEqual([]);
  });

  it('a mid-drag dimensions measurement leaves held guides ALONE — only a drag batch may move the overlay', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().snapGuides).toHaveLength(1);

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'b', dimensions: { width: 800, height: 600 } },
    ]);
    expect(useCanvasStore.getState().snapGuides).toEqual([
      { orientation: 'vertical', position: 2000, from: 0, to: 940 },
    ]);
  });

  it('arms resize before its first tick, then cancellation drops every transient and swallows a late settle', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );

    useCanvasStore.getState().beginResize('a');
    expect(useCanvasStore.getState().resizeInFlightId).toBe('a');
    expect(useCanvasStore.getState().resizeReadout).toBeNull();

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1995, height: 600 }, resizing: true },
    ]);
    expect(useCanvasStore.getState().gesture['a']).toBeDefined();
    expect(useCanvasStore.getState().resizeReadout?.id).toBe('a');
    expect(useCanvasStore.getState().snapGuides).toHaveLength(1);

    useCanvasStore.getState().cancelResize();
    expect(useCanvasStore.getState().resizeInFlightId).toBeNull();
    expect(useCanvasStore.getState().gesture).toEqual({});
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
    expect(useCanvasStore.getState().nodes[0]).toMatchObject({
      position: { x: 0, y: 300 },
      width: 800,
      height: 600,
    });
    expect(wire.sent).toEqual([]);

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1995, height: 600 }, resizing: true },
    ]);
    useCanvasStore.getState().settleResize('a', { x: 0, y: 300, width: 1995, height: 600 });
    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().gesture).toEqual({});
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
  });

  it('resize cancellation never consumes the frame-draw readout', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('frame');
    useCanvasStore.getState().beginFrameDraw(
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    );
    useCanvasStore.getState().updateFrameDraw(
      { x: 700, y: 500 },
      { x: 700, y: 500 },
    );
    expect(useCanvasStore.getState().resizeReadout?.id).toBeNull();

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().cancelResize();
    expect(useCanvasStore.getState().resizeReadout).toMatchObject({
      id: null,
      width: 600,
      height: 400,
    });
  });

  it('a resize batch snaps its MOVING edge by size — the anchored edge never moves, and the readout tracks the snapped box', async () => {
    const wire = await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginResize('a');

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1995, height: 600 }, resizing: true },
    ]);
    const held = useCanvasStore.getState().nodes[0];
    expect(held?.position).toEqual({ x: 0, y: 300 });
    expect({ width: held?.width, height: held?.height }).toEqual({ width: 2000, height: 600 });
    expect(useCanvasStore.getState().snapGuides).toEqual([
      { orientation: 'vertical', position: 2000, from: 0, to: 900 },
    ]);
    expect(useCanvasStore.getState().resizeReadout).toEqual({
      id: 'a',
      x: 0,
      y: 300,
      width: 2000,
      height: 600,
    });

    useCanvasStore.getState().settleResize('a', { x: 0, y: 300, width: 1995, height: 600 });
    expect(wire.sent).toEqual([
      { docId: DOC_ID, op: { type: 'resize', id: 'a', x: 0, y: 300, width: 2000, height: 600 } },
    ]);
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
  });

  it('a left-handle resize snaps position and size TOGETHER — the right edge stays fixed', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 1000, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 0, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginResize('a');

    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 805, y: 300 } },
      { type: 'dimensions', id: 'a', dimensions: { width: 995, height: 600 }, resizing: true },
    ]);
    const held = useCanvasStore.getState().nodes[0];
    expect(held?.position).toEqual({ x: 800, y: 300 });
    expect(held?.width).toBe(1000);
  });

  it('a corner resize snaps both moving edges, each axis independently clamped and guided', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginResize('a');

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1995, height: 295 }, resizing: true },
    ]);
    const held = useCanvasStore.getState().nodes[0];
    expect(held?.position).toEqual({ x: 0, y: 300 });
    expect({ width: held?.width, height: held?.height }).toEqual({ width: 2000, height: 300 });
    expect(useCanvasStore.getState().snapGuides).toHaveLength(2);
  });

  it('a snap below the minimum size is refused — the clamp wins over the attraction', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: MIN_FRAME_SIZE.width - 5, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginResize('a');

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: MIN_FRAME_SIZE.width, height: 600 }, resizing: true },
    ]);
    const held = useCanvasStore.getState().nodes[0];
    expect(held?.width).toBe(MIN_FRAME_SIZE.width);
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
    expect(useCanvasStore.getState().resizeReadout).toEqual({
      id: 'a',
      x: 0,
      y: 300,
      width: MIN_FRAME_SIZE.width,
      height: 600,
    });
  });

  it('a drag batch never writes the readout — it is the resize gesture’s own', async () => {
    await connect(docOf([browserNode('a', { x: 0, y: 300, width: 800, height: 600 })], 1));
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 40, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
  });

  it('a new gesture RECLAIMS a hold left settling — the old echo cannot strip the active hand', async () => {
    const wire = await connect(
      docOf([browserNode('a', { x: 0, y: 300, width: 800, height: 600 })], 1),
    );
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 900, height: 600 }, resizing: true },
    ]);
    useCanvasStore.getState().settleResize('a', { x: 0, y: 300, width: 900, height: 600 });
    expect(wire.sent).toHaveLength(1);

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 950, height: 600 }, resizing: true },
    ]);

    fakeUpdate(entryOf(2, { type: 'resize', id: 'a', x: 0, y: 300, width: 900, height: 600 }));
    expect(useCanvasStore.getState().gesture['a']).toBeDefined();
    expect(useCanvasStore.getState().nodes[0]?.width).toBe(950);

    useCanvasStore.getState().settleResize('a', { x: 0, y: 300, width: 948, height: 600 });
    expect(wire.sent).toHaveLength(2);
    expect(wire.sent[1]?.op).toEqual({
      type: 'resize', id: 'a', x: 0, y: 300, width: 950, height: 600,
    });
    fakeUpdate(entryOf(3, { type: 'resize', id: 'a', x: 0, y: 300, width: 950, height: 600 }));
    expect(useCanvasStore.getState().gesture).toEqual({});
  });

  it('a document change that removes the resized frame retires the readout — survival-by-id', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 900, height: 600 }, resizing: true },
    ]);
    expect(useCanvasStore.getState().resizeReadout?.id).toBe('a');

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
  });

  it('settleResize clears held guides — a resize’s end never leaves a stale alignment line', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { x: 0, y: 300, width: 800, height: 600 }),
          browserNode('b', { x: 2000, y: 0, width: 800, height: 600, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'a', position: { x: 1195, y: 340 }, dragging: true },
    ]);
    expect(useCanvasStore.getState().snapGuides).toHaveLength(1);

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().settleResize('a', { x: 1195, y: 340, width: 900, height: 600 });
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
  });
});

describe('the guest shield (ONL-1923)', () => {
  it('pressing a frame selects it without lifting or raising its shield — the mode decides', async () => {
    await connect(docOf([browserNode('a')], 1));

    for (const [mode, shielded] of [
      ['design', true],
      ['interact', false],
    ] as const) {
      useCanvasStore.getState().deselectFrames();
      useCanvasStore.getState().setMode(mode);
      expect(isFrameShielded(useCanvasStore.getState(), 'a'), `${mode}, unselected`).toBe(shielded);

      useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'a', selected: true }]);
      expect(primaryFrameId(useCanvasStore.getState())).toBe('a');
      expect(isFrameShielded(useCanvasStore.getState(), 'a'), `${mode}, selected`).toBe(shielded);
    }
  });
});

describe('a Space hold relayed from inside a frame (ONL-2577)', () => {
  it('dies with the document that relayed it, which has no release left to send', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().relaySpacePan('a', true);
    expect(useCanvasStore.getState().isSpacePanning).toBe(true);

    useCanvasStore.getState().releaseSpacePanFrom('b');
    expect(useCanvasStore.getState().isSpacePanning).toBe(true);

    useCanvasStore.getState().releaseSpacePanFrom('a');
    expect(useCanvasStore.getState().isSpacePanning).toBe(false);
  });

  it('ends on its own frame’s release, never on another frame’s', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().relaySpacePan('a', true);
    useCanvasStore.getState().relaySpacePan('b', false);
    expect(useCanvasStore.getState().isSpacePanning).toBe(true);

    useCanvasStore.getState().relaySpacePan('a', false);
    expect(useCanvasStore.getState().isSpacePanning).toBe(false);
  });

  it("leaves the host's own hold alone, since its keyup and blur still arrive", async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().setSpacePanning(true);
    useCanvasStore.getState().releaseSpacePanFrom('a');
    expect(useCanvasStore.getState().isSpacePanning).toBe(true);

    useCanvasStore.getState().setSpacePanning(false);
    expect(useCanvasStore.getState().isSpacePanning).toBe(false);
  });

  it('gives way to the host’s own hold, which the host then releases', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().relaySpacePan('a', true);
    useCanvasStore.getState().setSpacePanning(true);
    useCanvasStore.getState().releaseSpacePanFrom('a');
    expect(useCanvasStore.getState().isSpacePanning).toBe(true);

    useCanvasStore.getState().setSpacePanning(false);
    expect(useCanvasStore.getState().isSpacePanning).toBe(false);
  });

  it('leaves with the canvas it was held over, so no next project opens with the hand down', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().relaySpacePan('a', true);
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().isSpacePanning).toBe(false);
  });
});

describe('the picking mode', () => {
  it('arming needs no selection, forces the select tool, and pan/interact still disarm', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().deselectFrames();
    useCanvasStore.getState().setTool('pan');
    useCanvasStore.getState().setPicking(true);
    expect(useCanvasStore.getState().isPicking).toBe(true);
    expect(useCanvasStore.getState().tool).toBe('select');

    useCanvasStore.getState().setTool('pan');
    expect(useCanvasStore.getState().isPicking).toBe(false);
    useCanvasStore.getState().setTool('select');
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().isPicking).toBe(false);
  });

  it('a pane click clears the FRAME selection and leaves element selections intact — sticky by contract', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-a'), 'a', false);

    useCanvasStore.getState().deselectFrames();
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(useCanvasStore.getState().elementSelections).toHaveLength(1);
    expect(useCanvasStore.getState().isPicking).toBe(true);
  });

  it('a picked element arms the node holding it, which no node selection names (ONL-2640)', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('a', false);
    expect(armedNodeId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-a'), 'a', false);
    // The artifact picker deselects the node it picked inside, so the measure has no selection to read.
    useCanvasStore.getState().deselectFrames();
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(armedNodeId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('b', true);
    expect(armedNodeId(useCanvasStore.getState())).toBeNull();

    useCanvasStore.getState().deselectFrames();
    useCanvasStore.getState().clearElementSelections('escape');
    expect(armedNodeId(useCanvasStore.getState())).toBeNull();
  });

  it('a node selected before its echo composes disarms the picked one, rather than reading as nothing selected (ONL-2640)', async () => {
    await connect(docOf([browserNode('a')], 2));

    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-a'), 'a', false);
    useCanvasStore.getState().deselectFrames();
    expect(armedNodeId(useCanvasStore.getState())).toBe('a');

    // Creating a node selects its minted id and only main's echo composes it; that gap is a selection, not an absence.
    useCanvasStore.setState({ selectedNodeIds: ['minted'] });
    expect(useCanvasStore.getState().nodes.some((node) => node.selected === true)).toBe(false);
    expect(armedNodeId(useCanvasStore.getState())).toBeNull();
  });
});

describe('the frame tool', () => {
  function draw(
    from: { flow: { x: number; y: number }; screen: { x: number; y: number } },
    to?: { flow: { x: number; y: number }; screen: { x: number; y: number } },
    tool: 'frame' | 'artifact' = 'frame',
  ): void {
    useCanvasStore.getState().setTool(tool);
    useCanvasStore.getState().beginFrameDraw(from.flow, from.screen);
    if (to) useCanvasStore.getState().updateFrameDraw(to.flow, to.screen);
  }

  it('answers no method for an artifact, which reports its own two events', async () => {
    // The caller sends `frame_created` for any non-null answer, and cannot tell the tools
    // apart because the tool has already reverted to select (ONL-2568).
    await connect(docOf([browserNode('wide')], 2));
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { artifactCreate: () => Promise.resolve({ code: 'badId', why: 'stub' }) } },
      configurable: true,
      writable: true,
    });

    draw(
      { flow: { x: 50, y: 60 }, screen: { x: 200, y: 200 } },
      { flow: { x: 400, y: 500 }, screen: { x: 550, y: 640 } },
      'artifact',
    );

    expect(useCanvasStore.getState().endFrameDraw()).toBeNull();
  });

  it('a click spawns the default at the anchor, opens the first frame’s origin, and selects the mint', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw({ flow: { x: 2000, y: 300 }, screen: { x: 500, y: 300 } });
    const method = useCanvasStore.getState().endFrameDraw();

    expect(method).toBe('click');
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({
      pageId: 'pg_main',
      kind: 'browser',
      x: 2000,
      y: 300,
      width: DEFAULT_FRAME_SIZE.width,
      height: DEFAULT_FRAME_SIZE.height,
      content: { homeUrl: 'http://localhost:3000' },
    });
    expect(useCanvasStore.getState().tool).toBe('select');
    fakeUpdate(entryOf(3, { type: 'create', node: op.node }));
    expect(selection()).toEqual([op.node.id]);
  });

  it('a drag draws the box: readout live mid-drag (gesture-owned), the create op at the drawn size', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw(
      { flow: { x: 100, y: 100 }, screen: { x: 100, y: 100 } },
      { flow: { x: 740, y: 500 }, screen: { x: 740, y: 500 } },
    );
    expect(useCanvasStore.getState().resizeReadout).toEqual({
      id: null,
      x: 100,
      y: 100,
      width: 640,
      height: 400,
    });

    const method = useCanvasStore.getState().endFrameDraw();
    expect(method).toBe('drag');
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({ x: 100, y: 100, width: 640, height: 400 });
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
    expect(useCanvasStore.getState().frameDraw).toBeNull();
  });

  it('dragging up-left normalizes: position at the min corner, size positive', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw(
      { flow: { x: 900, y: 700 }, screen: { x: 900, y: 700 } },
      { flow: { x: 400, y: 380 }, screen: { x: 400, y: 380 } },
    );
    useCanvasStore.getState().endFrameDraw();

    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({ x: 400, y: 380, width: 500, height: 320 });
  });

  it('a nonzero drag under the threshold is a click — the default, never a sliver', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw(
      { flow: { x: 50, y: 60 }, screen: { x: 200, y: 200 } },
      { flow: { x: 52, y: 62 }, screen: { x: 202, y: 202 } },
    );
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
    const method = useCanvasStore.getState().endFrameDraw();

    expect(method).toBe('click');
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({
      x: 50,
      y: 60,
      width: DEFAULT_FRAME_SIZE.width,
      height: DEFAULT_FRAME_SIZE.height,
    });
  });

  it('click-vs-drag reads the SCREEN pair — a large flow delta at low zoom is still a click', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw(
      { flow: { x: 100, y: 100 }, screen: { x: 10, y: 10 } },
      { flow: { x: 140, y: 140 }, screen: { x: 12, y: 12 } },
    );
    const method = useCanvasStore.getState().endFrameDraw();

    expect(method).toBe('click');
    const op = singleOp(wire.sent[0]);
    if (op.type !== 'create') throw new Error('expected a create op');
    expect(op.node).toMatchObject({ width: DEFAULT_FRAME_SIZE.width });
  });

  it('drawn sizes clamp to the frame bounds, and the mid-drag readout already shows the clamp', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    const under = { x: MIN_FRAME_SIZE.width / 2, y: MIN_FRAME_SIZE.height / 2 };
    draw(
      { flow: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
      { flow: under, screen: under },
    );
    expect(useCanvasStore.getState().resizeReadout).toMatchObject(MIN_FRAME_SIZE);
    useCanvasStore.getState().endFrameDraw();
    const small = singleOp(wire.sent[0]);
    if (small.type !== 'create') throw new Error('expected a create op');
    expect(small.node).toMatchObject(MIN_FRAME_SIZE);

    draw(
      { flow: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
      { flow: { x: MAX_FRAME_SIZE.width + 800, y: MAX_FRAME_SIZE.height + 800 }, screen: { x: 900, y: 900 } },
    );
    useCanvasStore.getState().endFrameDraw();
    const big = singleOp(wire.sent[1]);
    if (big.type !== 'create') throw new Error('expected a create op');
    expect(big.node).toMatchObject(MAX_FRAME_SIZE);
  });

  it('a broadcast landing mid-draw leaves the gesture readout standing — null id is prune-exempt', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    draw(
      { flow: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
      { flow: { x: 600, y: 400 }, screen: { x: 600, y: 400 } },
    );
    expect(useCanvasStore.getState().resizeReadout).not.toBeNull();

    fakeUpdate(entryOf(3, { type: 'move', id: 'b', x: 40, y: 40 }));
    expect(useCanvasStore.getState().resizeReadout).toMatchObject({ id: null, width: 600 });
  });

  it('with no frames a live server port answers the URL; with neither, a blank page', async () => {
    const wire = await connect(docOf([], 2));
    useCanvasStore.getState().applyServerBook([serverEntry(5173, { measured: 'live' })]);

    draw({ flow: { x: 10, y: 10 }, screen: { x: 10, y: 10 } });
    useCanvasStore.getState().endFrameDraw();
    const fromPort = singleOp(wire.sent[0]);
    if (fromPort.type !== 'create') throw new Error('expected a create op');
    expect(fromPort.node.content).toEqual({ homeUrl: 'http://localhost:5173' });

    useCanvasStore.getState().applyServerBook([]);
    draw({ flow: { x: 20, y: 20 }, screen: { x: 20, y: 20 } });
    useCanvasStore.getState().endFrameDraw();
    const fallback = singleOp(wire.sent[1]);
    if (fallback.type !== 'create') throw new Error('expected a create op');
    expect(fallback.node.content).toEqual({ homeUrl: 'about:blank' });
  });

  it('no document: the release drops without dispatching, like every other author', async () => {
    const wire = await connect(null);

    draw({ flow: { x: 10, y: 10 }, screen: { x: 10, y: 10 } });
    const method = useCanvasStore.getState().endFrameDraw();

    expect(method).toBeNull();
    expect(wire.sent).toHaveLength(0);
    expect(useCanvasStore.getState().frameDraw).toBeNull();
  });

  it('cancel authors nothing and keeps the tool armed', async () => {
    const wire = await connect(docOf([browserNode('wide')], 2));

    draw(
      { flow: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
      { flow: { x: 600, y: 400 }, screen: { x: 600, y: 400 } },
    );
    useCanvasStore.getState().cancelFrameDraw();

    expect(wire.sent).toHaveLength(0);
    expect(useCanvasStore.getState().frameDraw).toBeNull();
    expect(useCanvasStore.getState().resizeReadout).toBeNull();
    expect(useCanvasStore.getState().tool).toBe('frame');
  });

  it('the frame tool and the picker are mutually exclusive, and interact disarms to select', async () => {
    await connect(docOf([browserNode('wide')], 2));

    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().setTool('frame');
    expect(useCanvasStore.getState().isPicking).toBe(false);

    useCanvasStore.getState().beginFrameDraw({ x: 0, y: 0 }, { x: 0, y: 0 });
    useCanvasStore.getState().setPicking(true);
    expect(useCanvasStore.getState().tool).toBe('select');
    expect(useCanvasStore.getState().frameDraw).toBeNull();

    useCanvasStore.getState().setMode('design');
    useCanvasStore.getState().setTool('frame');
    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().tool).toBe('select');
    useCanvasStore.getState().setMode('design');
    useCanvasStore.getState().setTool('pan');
    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().tool).toBe('select');

    useCanvasStore.getState().setTool('frame');
    expect(useCanvasStore.getState().tool).toBe('select');
  });
});

describe('retargeting the canvas (momentary — the overlay half)', () => {
  it('moves the live frame’s request and leaves the address bar alone until the guest arrives', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().retargetFrame('http://localhost:5173/', 'a');

    expect(targets()).toEqual(['http://localhost:5173/']);
    expect(panelRows()).toEqual([{ id: 'a', url: 'http://localhost:3000/a' }]);
  });

  it('bumps a counter, so asking for the same address twice is two requests', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().retargetFrame('http://localhost:5173/', 'a');
    const first = frameNodes()[0]?.data.target?.seq;
    useCanvasStore.getState().retargetFrame('http://localhost:5173/', 'a');
    const second = frameNodes()[0]?.data.target?.seq;

    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  it('moves the frame the caller named, not the newest one', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().retargetFrame('http://localhost:5173/', 'a');
    expect(targets()).toEqual(['http://localhost:5173/', undefined]);
  });

});

describe('a localhost link from chat opens its own frame', () => {
  it('selects the frame already showing the link and navigates none', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().openLocalLink('http://localhost:3000/a');

    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['a']);
    expect(targets()).toEqual([undefined, undefined]);
  });

  it('with two frames on the link, the selected one wins over the one on top', async () => {
    await connect(
      docOf(
        [
          browserNode('a', { content: { homeUrl: 'http://localhost:3000/same' } }),
          browserNode('b', { content: { homeUrl: 'http://localhost:3000/same' }, order: 1 }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().openLocalLink('http://localhost:3000/same');
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['a']);

    useCanvasStore.getState().deselectFrames();
    useCanvasStore.getState().openLocalLink('http://localhost:3000/same');
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['b']);
  });

  it('a link no frame shows opens a new frame at it', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().openLocalLink('http://localhost:5173/pricing');
    const op = wire.sent[0]?.op;
    if (op?.type !== 'create' || !isBrowserNode(op.node)) {
      throw new Error('expected a browser frame create op');
    }
    expect(op.node.content.homeUrl).toBe('http://localhost:5173/pricing');
    expect(targets()[0]).toBeUndefined();
  });
});

describe('navigation on the broadcast: the author decides', () => {
  it('an agent-authored home move retargets the live frame; the mount URL never moves', async () => {
    await connect(docOf([browserNode('a')], 1));

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/a' }, 'agent'));
    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe('http://localhost:5173/a');
    expect(targets()).toEqual(['http://localhost:5173/a']);

    fakeUpdate(entryOf(3, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5174/' }, 'agent'));
    expect(frameNodes()[0]?.data.target).toEqual({
      url: 'http://localhost:5174/',
      seq: 2,
    });

    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3000/a');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(0);
  });

  it('a system-authored home move re-seats the mount before a later agent navigation', async () => {
    await connect(docOf([browserNode('a')], 1));

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/a' }, 'system'));
    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe('http://localhost:5173/a');
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:5173/a');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:5173/a');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
    expect(targets()).toEqual([undefined]);

    fakeUpdate(entryOf(3, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5174/' }, 'agent'));
    expect(frameNodes()[0]?.data.target).toEqual({ url: 'http://localhost:5174/', seq: 1 });
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:5173/a');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
  });

  it('the USER echo does not re-navigate — the committing renderer already did', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().patchFrame('a', { health: 'live' });

    useCanvasStore.getState().commitAddress('a', 'http://localhost:5173/');
    expect(frameNodes()[0]?.data.target?.seq).toBe(1);

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/' }));
    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe('http://localhost:5173/');
    expect(frameNodes()[0]?.data.target?.seq).toBe(1);
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3000/a');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(0);
  });

  for (const initialUrl of ['https://localhost:3000/', 'about:blank']) {
    it(`re-seats ${initialUrl} only after the USER address correction is accepted`, async () => {
      const destination = 'http://localhost:3000/';
      const wire = await connect(docOf([
        browserNode('a', { content: { homeUrl: initialUrl } }),
        browserNode('b'),
      ], 1));
      useCanvasStore.getState().patchFrame('a', {
        health: initialUrl === 'about:blank' ? 'live' : 'unreachable',
      });
      useCanvasStore.getState().patchFrame('b', { health: 'live' });
      useCanvasStore.getState().retargetFrame('http://localhost:3000/other', 'b');
      const otherFrame = frameNodes()[1];
      const otherOverlay = useCanvasStore.getState().overlay.b;

      useCanvasStore.getState().commitAddress('a', destination);

      expect(wire.sent).toEqual([
        { docId: DOC_ID, op: { type: 'set-home-url', id: 'a', homeUrl: destination } },
      ]);
      expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(initialUrl);
      expect(frameNodes()[0]?.data.homeUrl).toBe(initialUrl);
      expect(frameNodes()[0]?.data.target).toEqual({ url: destination, seq: 1 });
      expect(frameNodes()[0]?.data.guestEpoch).toBe(0);

      fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: destination }));

      expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(destination);
      expect(frameNodes()[0]?.data.homeUrl).toBe(destination);
      expect(frameNodes()[0]?.data.currentUrl).toBe(destination);
      expect(frameNodes()[0]?.data.target).toBeUndefined();
      expect(useCanvasStore.getState().overlay.a?.mountUrl).toBe(destination);
      expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
      expect(useCanvasStore.getState().overlay.a?.guestEpoch).toBe(1);
      expect(useCanvasStore.getState().overlay.a).not.toHaveProperty('target');
      expect(frameNodes()[1]).toEqual(otherFrame);
      expect(useCanvasStore.getState().overlay.b).toBe(otherOverlay);
      expect(wire.sent).toHaveLength(1);
    });

    it(`does not re-seat ${initialUrl} when the USER address correction is rejected`, async () => {
      const destination = 'http://localhost:3000/';
      const wire = await connect(docOf([
        browserNode('a', { content: { homeUrl: initialUrl } }),
      ], 1));
      useCanvasStore.getState().patchFrame('a', {
        health: initialUrl === 'about:blank' ? 'live' : 'unreachable',
      });

      useCanvasStore.getState().commitAddress('a', destination);
      wire.emitRejected({ docId: DOC_ID, reason: 'op declined' });
      await settled();

      expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(initialUrl);
      expect(frameNodes()[0]?.data.homeUrl).toBe(initialUrl);
      expect(useCanvasStore.getState().overlay.a?.mountUrl).toBe(initialUrl);
      expect(frameNodes()[0]?.data.guestEpoch).toBe(0);
      expect(frameNodes()[0]?.data.target).toEqual({ url: destination, seq: 1 });
      expect(wire.sent).toHaveLength(1);
    });
  }

  it('advances the guest epoch for each accepted same-URL retry without resetting on recomposition', async () => {
    const destination = 'https://localhost:3000/';
    await connect(docOf([browserNode('a', { content: { homeUrl: destination } })], 1));

    for (const revision of [2, 3]) {
      useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
      useCanvasStore.getState().commitAddress('a', destination);
      expect(frameNodes()[0]?.data.guestEpoch).toBe(revision - 2);

      fakeUpdate(entryOf(revision, { type: 'set-home-url', id: 'a', homeUrl: destination }));

      expect(frameNodes()[0]?.data.guestEpoch).toBe(revision - 1);
      expect(useCanvasStore.getState().overlay.a?.guestEpoch).toBe(revision - 1);
      expect(frameNodes()[0]?.data.homeUrl).toBe(destination);
      expect(frameNodes()[0]?.data.target).toBeUndefined();

      useCanvasStore.getState().patchFrame('a', { health: 'live', title: 'Recovered' });
      expect(frameNodes()[0]?.data.guestEpoch).toBe(revision - 1);
    }
  });

  it('system home moves re-seat the mount both while covered and after revival', async () => {
    await connect(docOf([browserNode('a', { content: { homeUrl: 'http://localhost:4401/' } })], 1));
    useCanvasStore.getState().applyServerBook([serverEntry(4401, { everLive: true })]);
    expect(covers()).toEqual(['dead']);

    fakeUpdate(
      entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4402/' }, 'system'),
    );

    const rehomed = useCanvasStore.getState().nodes[0];
    expect(rehomed?.data.homeUrl).toBe('http://localhost:4402/');
    expect(rehomed?.data.currentUrl).toBe('http://localhost:4402/');
    expect(rehomed?.data.target).toBeUndefined();

    useCanvasStore.getState().applyServerBook([serverEntry(4402, { measured: 'unverified' })]);
    expect(covers()).toEqual(['non-started']);
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(4402, { measured: 'live', everLive: true, status: 'running' })]);
    expect(covers()).toEqual([undefined]);
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:4402/');

    const guestEpoch = frameNodes()[0]?.data.guestEpoch ?? 0;
    fakeUpdate(
      entryOf(3, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4402/about' }, 'system'),
    );
    expect(frameNodes()[0]?.data.target).toBeUndefined();
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:4402/about');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:4402/about');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(guestEpoch + 1);
  });

  it('an agent-authored create composes through the normal read-model path — the mount is the navigation', async () => {
    await connect(docOf([], 1));

    const minted = browserNode('minted') as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: minted }, 'agent'));

    expect(canvasNodes()).toEqual(['minted']);
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3000/minted');
    expect(frameNodes()[0]?.data.target).toBeUndefined();
  });
});

describe('the undo/redo dispatch seam (ONL-2042)', () => {
  it('an undone set-home-url comes back SYSTEM-authored and re-seats the live frame (two-sided)', async () => {
    const wire = await connect(docOf([browserNode('a')], 2));

    dispatchCanvasUndo();
    expect(wire.sentUndo).toEqual([{ docId: DOC_ID }]);

    fakeUpdate(
      entryOf(3, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:5173/prior' }, 'system'),
    );

    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe(
      'http://localhost:5173/prior',
    );
    expect(targets()).toEqual([undefined]);
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:5173/prior');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:5173/prior');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
  });
});

describe('following the measured port (momentary — the durable follow is main’s)', () => {
  it('never moves a frame off its port — the port change is the system author’s op, not this measurement’s', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().followServerPort(5173);
    expect(targets()).toEqual([undefined]);
    expect(wire.sent).toEqual([]);
  });

  it('never adds a frame for a measurement, where an agent request would', async () => {
    const wire = await connect(docOf([], 1));
    useCanvasStore.getState().followServerPort(5173);
    expect(canvasNodes()).toEqual([]);
    expect(wire.sent).toEqual([]);
  });

  it('refreshes a frame the server came up UNDER, not just one on the wrong port', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });

    useCanvasStore.getState().followServerPort(3000);

    expect(targets()).toEqual(['http://localhost:3000/a']);
    expect(frameNodes()[0]?.data.target?.seq).toBe(1);
  });

  it('leaves a frame that is LIVE on that port alone', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    useCanvasStore.getState().followServerPort(3000);
    expect(targets()).toEqual([undefined]);
  });

  it('refreshes every dead frame on the port and no other — the multi-viewport case', async () => {
    await connect(
      docOf(
        [
          browserNode('desktop'),
          browserNode('mobile', { order: 1 }),
          browserNode('elsewhere', {
            order: 2,
            content: { homeUrl: 'http://localhost:5173/elsewhere' },
          }),
        ],
        3,
      ),
    );
    useCanvasStore.getState().patchFrame('desktop', { health: 'unreachable' });
    useCanvasStore.getState().patchFrame('mobile', { health: 'unreachable' });
    useCanvasStore.getState().patchFrame('elsewhere', { health: 'unreachable' });

    useCanvasStore.getState().followServerPort(3000);

    expect(targets()).toEqual([
      'http://localhost:3000/desktop',
      'http://localhost:3000/mobile',
      undefined,
    ]);
  });

});

function serverEntry(
  port: number,
  over: Partial<ServerEntryState> & { measured?: ServerPortState['measured']; everLive?: boolean } = {},
): ServerEntryState {
  const { measured = 'dead', everLive = false, ...rest } = over;
  return {
    entryId: `entry-${String(port)}`,
    folderName: 'shop',
    ownership: 'agent-started',
    status: 'stopped',
    ports: [{ port, origin: originForPort(port), measured, everLive }],
    everMeasuredLive: everLive,
    ...rest,
  };
}

function covers(): (string | undefined)[] {
  return frameNodes().map((n) => n.data.serverCover);
}

describe('the composed frame↔server join', () => {
  it('a matched never-lived claim composes the no-guest flag; unmatched frames compose none', async () => {
    await connect(
      docOf(
        [
          browserNode('matched'),
          browserNode('external', {
            order: 1,
            content: { homeUrl: 'https://staging.example.com/' },
          }),
          browserNode('unclaimed', {
            order: 2,
            content: { homeUrl: 'http://localhost:5173/' },
          }),
        ],
        3,
      ),
    );

    useCanvasStore.getState().applyServerBook([serverEntry(3000)]);

    expect(covers()).toEqual(['non-started', undefined, undefined]);
  });

  it('a claim re-verifying live flips exactly its frames', async () => {
    await connect(
      docOf(
        [
          browserNode('web'),
          browserNode('api', { order: 1, content: { homeUrl: 'http://localhost:4000/' } }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().applyServerBook([
      serverEntry(3000, { everLive: true }),
      serverEntry(4000, { everLive: true }),
    ]);
    expect(covers()).toEqual(['dead', 'dead']);

    useCanvasStore.getState().applyServerBook([
      serverEntry(3000, { measured: 'live', everLive: true, status: 'running' }),
      serverEntry(4000, { everLive: true }),
    ]);
    expect(covers()).toEqual([undefined, 'dead']);
  });

  it('a stranger answering a claimed port composes the occupied variant, never non-started', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().applyServerBook([serverEntry(3000, { measured: 'stranger' })]);
    expect(covers()).toEqual(['occupied']);
  });

  it('a cover LIFTING bumps the composed guestEpoch — the revived guest is a new binding target', async () => {
    await connect(docOf([browserNode('a')], 1));
    expect(frameNodes()[0]?.data.guestEpoch).toBe(0);

    useCanvasStore.getState().applyServerBook([serverEntry(3000, { everLive: true })]);
    expect(covers()).toEqual(['dead']);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(0);

    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3000, { measured: 'live', everLive: true, status: 'running' })]);
    expect(covers()).toEqual([undefined]);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);

    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3000, { measured: 'live', everLive: true, status: 'running' })]);
    fakeUpdate(entryOf(2, { type: 'rename', id: 'a', name: 'renamed' }));
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);

    useCanvasStore.getState().applyServerBook([serverEntry(3000, { everLive: true })]);
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3000, { measured: 'live', everLive: true, status: 'running' })]);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(2);
  });

  it('keeps rehome and cover-lift guest epochs monotonic together', async () => {
    const destination = 'http://localhost:3000/a';
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().applyServerBook([serverEntry(3000, { everLive: true })]);

    expect(useCanvasStore.getState().rehomeDeadFrame('a', destination)).toBe(true);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
    expect(covers()).toEqual(['dead']);

    useCanvasStore.getState().applyServerBook([
      serverEntry(3000, { measured: 'live', everLive: true, status: 'running' }),
    ]);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(2);
    expect(covers()).toEqual([undefined]);

    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
    expect(useCanvasStore.getState().rehomeDeadFrame('a', destination)).toBe(true);
    expect(frameNodes()[0]?.data.guestEpoch).toBe(3);
    expect(useCanvasStore.getState().overlay.a?.guestEpoch).toBe(3);
    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    expect(frameNodes()[0]?.data.guestEpoch).toBe(3);
  });

  it('a book that changes nothing keeps node identity; a cover flip repaints', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().applyServerBook([serverEntry(3000)]);
    const before = useCanvasStore.getState().nodes[0];

    useCanvasStore.getState().applyServerBook([serverEntry(3000)]);
    expect(useCanvasStore.getState().nodes[0]).toBe(before as FrameNode);

    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3000, { measured: 'live', everLive: true })]);
    expect(useCanvasStore.getState().nodes[0]).not.toBe(before as FrameNode);
    expect(covers()).toEqual([undefined]);
  });
});

describe('element selection admission', () => {
  it('refreshes prompt evidence and clears stale state through the store action', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', true);
    useCanvasStore.getState().setElementStale('picked', true);
    useCanvasStore.getState().refreshElementSelection({
      ...evidence('picked'),
      textContent: 'Current copy',
    });

    expect(useCanvasStore.getState().elementSelections[0]).toMatchObject({
      stale: false,
      evidence: { id: 'picked', textContent: 'Current copy' },
    });
  });

  it('holds the anchor’s box beside the selection, never inside its evidence (ONL-2455)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    const rect = { x: 8, y: 12, width: 120, height: 32 };
    useCanvasStore.getState().setElementAnchorRect('picked', rect);

    expect(useCanvasStore.getState().elementAnchorRects).toEqual({ picked: rect });
    expect(Object.keys(useCanvasStore.getState().elementSelections[0]?.evidence ?? {})).not.toContain(
      'rect',
    );

    useCanvasStore.getState().setElementAnchorRect('picked', { ...rect, y: 200 });
    expect(useCanvasStore.getState().elementAnchorRects['picked']?.y).toBe(200);

    useCanvasStore.getState().removeElementSelection('picked');
    expect(useCanvasStore.getState().elementAnchorRects).toEqual({});
  });

  /* The mapper's answer lives beside the anchor rects, never inside the evidence
     the agent reads — which is exact-key-parsed and carries no path (ONL-2563). */
  it('holds the mapper’s answer beside the selection, and drops it with the pick (ONL-2563)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    const mapping = {
      path: 'src/Hero.jsx',
      line: 8,
      column: 5,
      via: 'owner-stack' as const,
      definition: null,
      grade: 'exact' as const,
      component: 'Hero',
      others: [],
      uses: 0,
      produced: 1,
      producedComplete: true,
    };
    useCanvasStore.getState().setElementMapping('picked', mapping);
    expect(useCanvasStore.getState().elementMappings).toEqual({ picked: mapping });
    expect(Object.keys(useCanvasStore.getState().elementSelections[0]?.evidence ?? {})).not.toContain('path');

    useCanvasStore.getState().removeElementSelection('picked');
    expect(useCanvasStore.getState().elementMappings).toEqual({});
  });

  /* A decline is an ANSWER and is kept, or the Frame is asked again on every
     render — and the round trip takes an exclusive debugger. */
  it('keeps a declined mapping rather than leaving it absent', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementMapping('picked', null);
    expect('picked' in useCanvasStore.getState().elementMappings).toBe(true);
  });

  it('invalidates a cached source answer when the held element evidence changes', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementMapping('picked', null);
    useCanvasStore.getState().refreshElementSelection(evidence('picked'));
    expect('picked' in useCanvasStore.getState().elementMappings).toBe(true);
    useCanvasStore.getState().refreshElementSelection({ ...evidence('picked'), textContent: 'HTTPError 500' });
    expect('picked' in useCanvasStore.getState().elementMappings).toBe(false);
    expect(useCanvasStore.getState().elementSelections[0]?.evidence.textContent).toBe('HTTPError 500');
  });

  it('invalidates source mapping on a document load without losing prompt selections', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementMapping('picked', null);
    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    expect('picked' in useCanvasStore.getState().elementMappings).toBe(false);
    expect(useCanvasStore.getState().elementSelections[0]?.evidence.id).toBe('picked');
  });

  it('drops an answer that arrives for a pick the store no longer holds', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setElementMapping('never-picked', null);
    expect(useCanvasStore.getState().elementMappings).toEqual({});
  });

  it('a dropped selection takes its box with it, however it was dropped', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementAnchorRect('picked', { x: 0, y: 0, width: 10, height: 10 });

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
    expect(useCanvasStore.getState().elementAnchorRects).toEqual({});

    useCanvasStore.getState().addElementSelection(evidence('regathered'), 'a', false);
    useCanvasStore
      .getState()
      .setElementAnchorRect('regathered', { x: 1, y: 1, width: 10, height: 10 });
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().elementAnchorRects).toEqual({});
  });
});

describe('the mode round trip keeps what the user gathered (ONL-2455)', () => {
  it('entering Interact leaves the element selections and their boxes untouched', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementAnchorRect('picked', { x: 0, y: 0, width: 10, height: 10 });
    const held = useCanvasStore.getState().elementSelections;
    const boxes = useCanvasStore.getState().elementAnchorRects;

    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().elementSelections).toBe(held);
    expect(useCanvasStore.getState().elementAnchorRects).toBe(boxes);

    useCanvasStore.getState().setMode('design');
    expect(useCanvasStore.getState().elementSelections).toBe(held);
  });

  it('Escape’s clear takes the selection, its boxes and the composer’s armed mode together', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().addElementSelection(evidence('added'), 'a', true);
    useCanvasStore.getState().setElementAnchorRect('picked', { x: 0, y: 0, width: 10, height: 10 });

    useCanvasStore.getState().clearElementSelections('escape');
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
    expect(useCanvasStore.getState().elementAnchorRects).toEqual({});
    expect(useCanvasStore.getState().isPicking).toBe(false);
  });

  it('a clear with nothing to clear re-renders nothing', async () => {
    await connect(docOf([browserNode('a')], 1));
    const before = useCanvasStore.getState();

    useCanvasStore.getState().clearElementSelections('escape');
    expect(useCanvasStore.getState()).toBe(before);
  });
});

describe('selection validity is three-tier (ONL-1994)', () => {
  it('same-origin navigation never drops — reload refreshes (tier 1), moving away marks stale (tier 2)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    const held = useCanvasStore.getState().elementSelections;

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3000/a' });
    expect(useCanvasStore.getState().elementSelections).toBe(held);

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3000/elsewhere' });
    expect(useCanvasStore.getState().elementSelections).toBe(held);
    useCanvasStore.getState().setElementStale('picked', true);
    expect(useCanvasStore.getState().elementSelections[0]?.stale).toBe(true);
  });

  it('a measured origin change drops exactly that frame’s selections (tier 3)', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    const held = useCanvasStore.getState().elementSelections;

    useCanvasStore.getState().patchFrame('b', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().elementSelections).toBe(held);

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('a system port-follow of the same book entry REFRESHES rather than drops — one-shot', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3001, { measured: 'live', everLive: true, status: 'running' })]);

    fakeUpdate(
      entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:3001/a' }, 'system'),
    );
    expect(useCanvasStore.getState().portFollowRefresh.a).toBeUndefined();
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3001/a' });
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual([
      'picked',
    ]);

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:9999/' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);

    useCanvasStore.getState().addElementSelection(evidence('regathered'), 'a', false);
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3001/a' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('a followed selection moves to the address it followed, so that page can re-adopt it (ONL-2518)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3001, { measured: 'live', everLive: true, status: 'running' })]);

    fakeUpdate(
      entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:3001/a' }, 'system'),
    );
    expect(useCanvasStore.getState().elementSelections[0]?.evidence.frameUrl).toBe('http://localhost:3001/a');
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3001/a' });

    expect(useCanvasStore.getState().elementSelections[0]?.evidence.frameUrl).toBe(
      'http://localhost:3001/a',
    );
    expect(
      seedableSelectionsForFrame(
        useCanvasStore.getState().elementSelections,
        'a',
        'http://localhost:3001/a',
      ).map((s) => s.evidence.id),
    ).toEqual(['picked']);
  });

  it('refreshes selected evidence once after a trusted system port follow recovered through a revision gap', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().applyServerBook([serverEntry(3001, { measured: 'live', everLive: true, status: 'running' })]);
    wire.answerSnapshotsWith(docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3001/a' } })], 4));

    fakeUpdate(entryOf(4, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:3001/a' }, 'system'));
    await settled();

    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3001/a');
    expect(targets()).toEqual([undefined]);
    expect(useCanvasStore.getState().elementSelections[0]?.evidence.frameUrl).toBe('http://localhost:3001/a');
    expect(seedableSelectionsForFrame(useCanvasStore.getState().elementSelections, 'a', 'http://localhost:3001/a')
      .map(selection => selection.evidence.id)).toEqual(['picked']);
    expect(useCanvasStore.getState().portFollowRefresh).toEqual({});

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'https://example.test/unrelated' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('a system move onto a DIFFERENT book entry’s port is no carve-out — two entries is a hop, not a follow', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().applyServerBook([
      serverEntry(3000, { everLive: true }),
      serverEntry(4000, { measured: 'live', everLive: true, status: 'running' }),
    ]);

    fakeUpdate(
      entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4000/a' }, 'system'),
    );
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:4000/a' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('an AGENT home move onto a new origin drops — the exemption belongs to the system author alone', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .applyServerBook([serverEntry(3001, { measured: 'live', everLive: true, status: 'running' })]);

    fakeUpdate(
      entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:3001/a' }, 'agent'),
    );
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3001/a' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('a frame deleted mid-composition drops its chips with it; a survivor’s keep identity', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);
    const held = useCanvasStore.getState().elementSelections;

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(useCanvasStore.getState().elementSelections).toBe(held);

    fakeUpdate(entryOf(4, { type: 'remove', id: 'b' }));
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });
});

describe('the focused frame is derived, never stored and never the frame selection (ONL-2455)', () => {
  it('a pick focuses its frame while the frame selection and the primary stay empty', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);

    expect(focusedFrameId(useCanvasStore.getState())).toBe('b');
    // The two inputs the resize controls' arming reads (`FrameNode`'s `isArmed`).
    expect(selection()).toEqual([]);
    expect(primaryFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a gather into a second frame keeps focus and the bubble on the first-picked element’s frame', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));

    useCanvasStore.getState().addElementSelection(evidence('first'), 'b', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'first', draft: '', expanded: true, entry: 'orb', placement: null, send: 'idle', refusal: null });
    useCanvasStore.getState().addElementSelection(evidence('second'), 'a', true);

    expect(useCanvasStore.getState().elementSelections.map((s) => s.frameNodeId)).toEqual([
      'b',
      'a',
    ]);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('b');
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('first');
  });

  it('removing the second frame drops its elements and leaves the bubble open on the first', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('first'), 'b', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'first', draft: '', expanded: true, entry: 'orb', placement: null, send: 'idle', refusal: null });
    useCanvasStore.getState().addElementSelection(evidence('second'), 'a', true);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));

    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual(['first']);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('first');
  });

  it('the explicit clear ends the focus', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().clearElementSelections('escape');

    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('dropping the last chip ends the focus', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().removeElementSelection('picked');

    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a removed frame ends the focus; another frame leaving does not', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(focusedFrameId(useCanvasStore.getState())).toBe('b');

    fakeUpdate(entryOf(4, { type: 'remove', id: 'b' }));
    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a measured origin change ends the focus', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });

    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a resync that keeps only live frames ends the focus on the one it dropped', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('b');

    wire.answerSnapshotsWith(docOf([browserNode('a')], 3));
    await resyncCanvas();

    expect(canvasNodes()).toEqual(['a']);
    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a project switch ends the focus', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('a');

    useCanvasStore.getState().clearFrames();

    expect(focusedFrameId(useCanvasStore.getState())).toBeNull();
  });

  it('a selected frame that is also focused answers ONE accent, because both reads are the same frame', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('b', false);

    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);

    expect(selection()).toEqual(['b']);
    expect(focusedFrameId(useCanvasStore.getState())).toBe('b');
  });
});

describe('replacing every frame (project switch)', () => {
  it('clearFrames resets the momentary world and authors NO ops on the outgoing document', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('picked-a'), 'a', false);

    useCanvasStore.getState().clearFrames();

    expect(canvasNodes()).toEqual([]);
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
    expect(useCanvasStore.getState().isPicking).toBe(false);
    expect(wire.sent).toEqual([]);
  });

  it('the incoming document seeds cleanly from the switch resync, and ops then stamp its id', async () => {
    const wire = await connect(docOf([browserNode('a')], 3));
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().clearFrames();
    wire.answerSnapshotsWith(docOf([browserNode('z', { x: 40, y: 0 })], 1, 'incoming-doc'));
    await resyncCanvas();

    expect(canvasNodes()).toEqual(['z']);
    expect(useCanvasStore.getState().doc?.docId).toBe('incoming-doc');
    expect(selection()).toEqual([]);
    expect(wire.sent).toEqual([]);
    useCanvasStore.getState().removeFrame('z');
    expect(wire.sent).toEqual([{ docId: 'incoming-doc', op: { type: 'remove', id: 'z' } }]);
  });

  it('a Section left closed does not follow the switch into the next project (ONL-2661)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().toggleSectionClosed('a');
    expect(useCanvasStore.getState().closedSectionIds).toEqual(['a']);

    useCanvasStore.getState().clearFrames();

    expect(useCanvasStore.getState().closedSectionIds).toEqual([]);
  });
});

describe('the switch-in-flight latch (ONL-1999)', () => {
  it('the mount resync during a switch is skipped — the mirror stays null instead of mirroring the outgoing document', async () => {
    const wire = await connect(docOf([browserNode('outgoing')], 3));

    beginCanvasSwitch();
    useCanvasStore.getState().clearFrames();
    disconnect?.();
    disconnect = connectCanvas(wire.transport);
    await settled();

    expect(wire.snapshotRequests).toBe(1);
    expect(useCanvasStore.getState().doc).toBeNull();
    expect(canvasNodes()).toEqual([]);
  });

  it("adopt's resync seeds the incoming document and lowers the latch", async () => {
    const wire = await connect(docOf([browserNode('outgoing')], 3));
    beginCanvasSwitch();
    useCanvasStore.getState().clearFrames();
    disconnect?.();
    disconnect = connectCanvas(wire.transport);
    await settled();

    wire.answerSnapshotsWith(docOf([browserNode('z')], 1, 'incoming-doc'));
    await resyncCanvas();
    expect(useCanvasStore.getState().doc?.docId).toBe('incoming-doc');
    expect(canvasNodes()).toEqual(['z']);

    disconnect?.();
    disconnect = connectCanvas(wire.transport);
    await settled();
    expect(wire.snapshotRequests).toBe(3);
  });

  it('outside a switch the mount resync fires', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));

    disconnect?.();
    disconnect = connectCanvas(wire.transport);
    await settled();
    expect(wire.snapshotRequests).toBe(2);
    expect(canvasNodes()).toEqual(['a']);
  });
});

describe('rails in Preview (ONL-2593)', () => {
  it('enters Preview with both rails closed, opens one on request, and leaves the Design choice alone', () => {
    useCanvasStore.setState({ mode: 'design', hiddenRails: { left: false, right: true } });
    useCanvasStore.getState().setMode('interact');
    const entered = useCanvasStore.getState();
    expect([isRailHidden(entered, 'left'), isRailHidden(entered, 'right')]).toEqual([true, true]);

    useCanvasStore.getState().toggleRail('left');
    const opened = useCanvasStore.getState();
    expect([isRailHidden(opened, 'left'), isRailHidden(opened, 'right')]).toEqual([false, true]);

    useCanvasStore.getState().setMode('design');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: false, right: true });

    useCanvasStore.getState().setMode('interact');
    expect(isRailHidden(useCanvasStore.getState(), 'left')).toBe(true);
    useCanvasStore.getState().setMode('design');
  });
});

describe('hiddenRails (ONL-2236)', () => {
  it('toggles one rail without touching the other', () => {
    useCanvasStore.setState({ hiddenRails: { left: false, right: false } });
    useCanvasStore.getState().toggleRail('left');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: false });
    useCanvasStore.getState().toggleRail('right');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: true });
    useCanvasStore.getState().toggleRail('left');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: false, right: true });
  });

  it('hiding both rails by hand is a panel statement, never the chord', () => {
    useCanvasStore.getState().toggleRail('left');
    useCanvasStore.getState().toggleRail('right');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: true });
    expect(isChromeHidden(useCanvasStore.getState())).toBe(false);
  });

  it('the chord takes the canvas furniture and the rails together', () => {
    useCanvasStore.getState().toggleChrome();
    expect(isChromeHidden(useCanvasStore.getState())).toBe(true);
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: true });
  });

  it('a rail toggle ends a standing chord, so the furniture comes back with the rail', () => {
    useCanvasStore.getState().toggleChrome();
    useCanvasStore.getState().toggleRail('left');
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: false, right: true });
    expect(isChromeHidden(useCanvasStore.getState())).toBe(false);
  });

  it('the chord hides both from any rail state, so it is never a no-op', () => {
    for (const start of [
      { left: false, right: false },
      { left: true, right: false },
      { left: false, right: true },
      { left: true, right: true },
    ]) {
      useCanvasStore.setState({ hiddenRails: start, chromeHidden: false });
      useCanvasStore.getState().toggleChrome();
      expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: true });
      expect(isChromeHidden(useCanvasStore.getState())).toBe(true);
    }
  });

  it('the chord shows both only when the chord put them away', () => {
    useCanvasStore.getState().toggleChrome();
    useCanvasStore.getState().toggleChrome();
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: false, right: false });
    expect(isChromeHidden(useCanvasStore.getState())).toBe(false);
  });
});

describe('which view the left panel is showing (ONL-2563)', () => {
  for (const tool of ['frame', 'text'] as const) {
    it(`disarms ${tool} when Code hides creation tools without changing editor mode`, () => {
      useCanvasStore.getState().setTool(tool);
      if (tool === 'frame') {
        useCanvasStore.getState().beginFrameDraw({ x: 0, y: 0 }, { x: 0, y: 0 });
        useCanvasStore.getState().updateFrameDraw({ x: 100, y: 100 }, { x: 100, y: 100 });
      }
      useCanvasStore.getState().setLeftPanelView('code');
      expect(useCanvasStore.getState().tool).toBe('select');
      expect(useCanvasStore.getState().mode).toBe('design');
      expect(useCanvasStore.getState().frameDraw).toBeNull();
      expect(useCanvasStore.getState().resizeReadout).toBeNull();
      useCanvasStore.getState().setTool(tool);
      expect(useCanvasStore.getState().tool).toBe('select');
      useCanvasStore.getState().setLeftPanelView('designs');
      useCanvasStore.getState().setTool(tool);
      expect(useCanvasStore.getState().tool).toBe(tool);
    });
  }

  for (const tool of ['select', 'pan'] as const) {
    it(`keeps ${tool} when switching the toolbar presentation`, () => {
      useCanvasStore.getState().setTool(tool);
      useCanvasStore.getState().setLeftPanelView('code');
      expect(useCanvasStore.getState().tool).toBe(tool);
      useCanvasStore.getState().setLeftPanelView('designs');
      expect(useCanvasStore.getState().tool).toBe(tool);
    });
  }

  it('opens on the designs the user already had', () => {
    expect(useCanvasStore.getState().leftPanelView).toBe('designs');
  });

  it('switching to code and back leaves the designs list exactly as it was', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('b', false);
    const before = {
      nodes: useCanvasStore.getState().nodes,
      selectedNodeIds: useCanvasStore.getState().selectedNodeIds,
      doc: useCanvasStore.getState().doc,
    };

    useCanvasStore.getState().setLeftPanelView('code');
    useCanvasStore.getState().setLeftPanelView('designs');

    expect(useCanvasStore.getState().nodes).toBe(before.nodes);
    expect(useCanvasStore.getState().selectedNodeIds).toBe(before.selectedNodeIds);
    expect(useCanvasStore.getState().doc).toBe(before.doc);
  });

  it('is not the editor mode: switching the panel view leaves Design and Preview where they were', () => {
    useCanvasStore.getState().setMode('interact');
    useCanvasStore.getState().setLeftPanelView('code');
    expect(useCanvasStore.getState().mode).toBe('interact');
    expect(useCanvasStore.getState().leftPanelView).toBe('code');
  });

  it('a new project opens on its designs, whatever the last one was showing', () => {
    useCanvasStore.getState().setLeftPanelView('code');
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().leftPanelView).toBe('designs');
  });
});

describe("the frame quotes main answers for the open document (ONL-2960)", () => {
  const quoted = { byFrame: { a: 'A bakery site' }, turnRunning: true };

  it('takes the quotes from the snapshot, then follows pushes for this document only', async () => {
    const wire = fakeWire(docOf([browserNode('a')], 1));
    wire.answerQuotesWith(quoted);
    currentWire = wire;
    disconnect = connectCanvas(wire.transport);
    await settled();
    expect(useCanvasStore.getState().frameQuotes).toEqual(quoted);
    expect(useCanvasStore.getState().nodes.find((node) => node.id === 'a')?.data).toMatchObject({ quote: 'A bakery site', quoteTurnRunning: true });

    wire.emitQuotes({ docId: 'another-document', byFrame: {}, turnRunning: false });
    expect(useCanvasStore.getState().frameQuotes).toEqual(quoted);
    wire.emitQuotes({ docId: DOC_ID, byFrame: {}, turnRunning: false });
    expect(useCanvasStore.getState().frameQuotes).toEqual(NO_FRAME_QUOTES);
    expect(useCanvasStore.getState().nodes.find((node) => node.id === 'a')?.data['quote']).toBeUndefined();
  });

  it('forgets the quotes when the canvas closes for a project switch', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    wire.emitQuotes({ docId: DOC_ID, ...quoted });
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().frameQuotes).toEqual(NO_FRAME_QUOTES);
  });
});

describe('involved frames (ONL-2194)', () => {
  it('marks a frame working, and clears it when the push no longer names it', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b')], 1));

    wire.emitWorkingFrames(['a']);
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'a')?.data.working).toBe(true);
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'b')?.data.working).toBeUndefined();

    // `working: false` is omitted from `data`, so not-working reads `undefined`.
    wire.emitWorkingFrames(['b']);
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'a')?.data.working).toBeUndefined();
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'b')?.data.working).toBe(true);

    wire.emitWorkingFrames([]);
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'b')?.data.working).toBeUndefined();
  });

  it('an id the document does not carry is a no-op, not a crash', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    expect(() => wire.emitWorkingFrames(['ghost'])).not.toThrow();
    expect(useCanvasStore.getState().nodes.find((n) => n.id === 'a')?.data.working).toBeUndefined();
  });
});

describe('what the canvas tells main about its frames', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports an artifact canvas guest and forgets its address when unmounted', async () => {
    const wire = await connect(docOf([{ id: 'art', kind: 'artifact', content: { artifactId: 'artifact-a', title: 'Launch card', pagePath: 'pages/index.html' }, x: 0, y: 0, width: 1200, height: 630 } as CanvasNode]));
    noteGuestAttached('art', 19);
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    expect(wire.sentFrames.at(-1)?.frames.find((frame) => frame.id === 'art')).toMatchObject({
      currentUrl: 'studio-artifact://artifact-a/pages/index.html', webContentsId: 19,
    });
    noteGuestGone('art');
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    expect(wire.sentFrames.at(-1)?.frames.find((frame) => frame.id === 'art')?.webContentsId).toBeUndefined();
  });

  it('a push names a webContents id only for an attached guest', async () => {
    const wire = await connect(docOf([browserNode('a'), browserNode('b')]));
    useCanvasStore
      .getState()
      .patchFrame('a', { currentUrl: 'http://localhost:5173/about', health: 'live', title: 'About' });
    noteGuestAttached('a', 7);
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);

    const push = wire.sentFrames.at(-1);
    expect(push?.frames.find((frame) => frame.id === 'a')).toEqual({
      id: 'a',
      currentUrl: 'http://localhost:5173/about',
      health: 'live',
      title: 'About',
      webContentsId: 7,
    });
    const unattached = push?.frames.find((frame) => frame.id === 'b');
    expect(unattached).toBeDefined();
    expect(unattached !== undefined && 'webContentsId' in unattached).toBe(false);
  });

  it('an unchanged summary with no console lines sends nothing', async () => {
    const wire = await connect(docOf([browserNode('a')]));
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    const pushed = wire.sentFrames.length;

    useCanvasStore.getState().hoverNode('a');
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    expect(wire.sentFrames).toHaveLength(pushed);
  });

  it('a reconnect forgets the guests the last connection knew', async () => {
    await connect(docOf([browserNode('a')]));
    noteGuestAttached('a', 7);
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    disconnect?.();

    const wire = await connect(docOf([browserNode('a')]));
    jest.advanceTimersByTime(FRAME_FACTS_PUSH_MS);
    const frame = wire.sentFrames.at(-1)?.frames.find((candidate) => candidate.id === 'a');
    expect(frame).toBeDefined();
    expect(frame !== undefined && 'webContentsId' in frame).toBe(false);
  });
});

describe('an inline send across frames (ONL-2477)', () => {
  let sent: { request: ChatSubmitRequest; prompt: AssembledPrompt | null }[] = [];
  let telemetry: { event: string; properties: Record<string, unknown> }[] = [];
  let unregister: (() => void) | null = null;
  let holds = false;
  let refuses = false;
  let duringSend: (() => void) | null = null;

  beforeEach(() => {
    sent = [];
    telemetry = [];
    holds = false;
    refuses = false;
    duringSend = null;
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: (payload: (typeof telemetry)[number]) => telemetry.push(payload) } },
      configurable: true,
      writable: true,
    });
    unregister = registerChatSubmit({
      // The absent case is `ChatRegion`'s own: the empty set, never another surface's refs (ONL-2549).
      submit: (request) => {
        const canvas = useCanvasStore.getState();
        const prompt = assemblePrompt({
          text: request.text,
          images: request.images ?? [],
          elementSelections: canvas.elementSelections,
          frames: request.frames ?? { selectedFrameIds: canvas.selectedNodeIds, frameName: () => undefined },
        });
        sent.push({ request, prompt });
        duringSend?.();
        if (refuses) return Promise.resolve({ outcome: 'rejected' });
        return Promise.resolve(
          prompt === null ? { outcome: 'empty' } : { outcome: 'accepted', submitted: prompt, held: holds },
        );
      },
    });
  });

  afterEach(() => {
    unregister?.();
    unregister = null;
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('a node-anchored chat sends its node as the selected object, and closes on the send', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'a', anchor: 'node', draft: '', expanded: true, entry: 'input', placement: 'above', send: 'idle', refusal: null });
    expect(useCanvasStore.getState().inlineChat?.anchor).toBe('node');

    expect(await submitInlineChat('Make this denser')).toBe('accepted');

    expect(sent[0]?.request.frames?.selectedFrameIds).toEqual(['a']);
    expect(sent[0]?.prompt?.evidence).toEqual([]);
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['a']);
    expect(telemetry.find((row) => row.event === 'inline_chat_submitted')?.properties).toMatchObject({
      element_count: 0,
      frame_count: 1,
      anchor: 'node',
    });
  });

  it('an element pick hands a node-anchored chat to the element, draft kept', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'a', anchor: 'node', draft: 'Hold on', expanded: true, entry: 'input', placement: 'above', send: 'idle', refusal: null });
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', true);

    const record = useCanvasStore.getState().inlineChat;
    expect(record?.anchorId).toBe('picked');
    expect(record?.anchor).toBeUndefined();
    expect(record?.draft).toBe('Hold on');
  });

  it('carries every frame the elements came from, once each, and counts them', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 }), browserNode('c', { order: 2 })], 3));
    useCanvasStore.getState().addElementSelection(evidence('first'), 'a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'first', draft: '', expanded: true, entry: 'orb', placement: null, send: 'idle', refusal: null });
    useCanvasStore.getState().addElementSelection(evidence('second'), 'b', true);
    useCanvasStore.getState().addElementSelection(evidence('third'), 'a', true);
    useCanvasStore.getState().selectFrame('c', false);

    expect(await submitInlineChat('Match these two')).toBe('accepted');

    expect(sent).toHaveLength(1);
    expect(sent[0]?.request.frames?.selectedFrameIds).toEqual(['a', 'b']);
    const prompt = sent[0]?.prompt;
    expect(prompt?.attachments.filter((item) => 'kind' in item && item.kind === 'frame')).toEqual([
      { kind: 'frame', name: 'a' },
      { kind: 'frame', name: 'b' },
    ]);
    expect(prompt?.context).toContain('"a" (id a): first, third');
    expect(prompt?.context).toContain('"b" (id b): second');
    expect(prompt?.context).not.toContain('id c');
    expect(telemetry.find((row) => row.event === 'inline_chat_submitted')?.properties).toMatchObject({
      element_count: 3,
      frame_count: 2,
    });
  });

  it('a held send closes the bubble while keeping the element context for a returned prompt (ONL-2518)', async () => {
    holds = true;
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().toggleRail('right');
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'picked', draft: 'Tighten this', expanded: true, entry: 'orb', placement: 'above', send: 'idle', refusal: null });

    expect(await submitInlineChat('Tighten this')).toBe('held');

    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual(['picked']);
    expect(sent[0]?.prompt?.evidence).toEqual([{ ...evidence('picked'), stale: false }]);
  });

  it('records a send that was turned away, by its outcome, and keeps the bubble up', async () => {
    refuses = true;
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'picked', draft: 'Tighten this', expanded: true, entry: 'orb', placement: 'above', send: 'idle', refusal: null });

    expect(await submitInlineChat('Tighten this')).toBe('refused');

    expect(useCanvasStore.getState().inlineChat?.send).toBe('failed');
    expect(telemetry.filter((row) => row.event.startsWith('inline_chat_')).map((row) => [row.event, row.properties])).toEqual([
      ['inline_chat_send_refused', { outcome: 'rejected', anchor: 'element' }],
    ]);
  });

  it('a delivered send closes the bubble and clears the element', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'picked', draft: 'Tighten this', expanded: true, entry: 'orb', placement: 'above', send: 'idle', refusal: null });

    expect(await submitInlineChat('Tighten this')).toBe('accepted');

    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  const attached = (id: string): AttachmentDraft => ({
    ref: { id, mediaType: 'image/png', width: 8, height: 8 },
    name: `${id}.png`,
    previewUrl: `blob:${id}`,
  });

  /** The slice itself, not the open record's read: a closed bubble reads empty whether the send cleared or not. */
  const slicePills = (): string[] =>
    useCanvasStore.getState().inlineAttachments.drafts.map((draft) => draft.ref.id);

  const openBubble = async (draft: string): Promise<void> => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId: 'picked', draft, expanded: true, entry: 'orb', placement: 'above', send: 'idle', refusal: null });
  };

  it('an inline send carries the bubble’s refs and a composer send its own (ONL-2549)', async () => {
    await openBubble('');
    addInlineAttachment(attached('inline-1'));
    const composerRefs = [{ id: 'composer-1', mediaType: 'image/png' as const }];

    expect(await submitInlineChat('Like this')).toBe('accepted');
    await submitChatPrompt({ text: 'and this one', images: composerRefs });

    expect(sent.map((call) => call.prompt?.images.map((ref) => ref.id))).toEqual([
      ['inline-1'],
      ['composer-1'],
    ]);
  });

  it('a submit that names no images carries none', async () => {
    await connect(docOf([browserNode('a')], 1));
    await submitChatPrompt({ text: 'no reference with this one' });
    expect(sent[0]?.prompt?.images).toEqual([]);
  });

  it('an image with no text is a sendable prompt (ONL-2549)', async () => {
    await openBubble('');
    addInlineAttachment(attached('inline-1'));

    expect(await submitInlineChat('')).toBe('accepted');

    expect(sent[0]?.request.text).toBe('');
    expect(sent[0]?.prompt?.text).toBe('');
    expect(sent[0]?.prompt?.images.map((ref) => ref.id)).toEqual(['inline-1']);
  });

  it('an element with no text and no image still sends nothing (ONL-2455)', async () => {
    await openBubble('');

    expect(await submitInlineChat('')).toBe('unchanged');

    expect(sent).toEqual([]);
  });

  it('an accepted send empties the attachments it carried', async () => {
    await openBubble('Tighten this');
    addInlineAttachment(attached('inline-1'));

    expect(await submitInlineChat('Tighten this')).toBe('accepted');

    expect(slicePills()).toEqual([]);
  });

  it('a held send empties its attachments and closes the bubble, keeping the element context (ONL-2518)', async () => {
    holds = true;
    await openBubble('Tighten this');
    addInlineAttachment(attached('inline-1'));

    expect(await submitInlineChat('Tighten this')).toBe('held');

    expect(slicePills()).toEqual([]);
    expect(openInlineAttachments(useCanvasStore.getState()).drafts).toEqual([]);
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual(['picked']);
  });

  it('a refused send leaves them standing with the bubble up', async () => {
    refuses = true;
    await openBubble('Tighten this');
    addInlineAttachment(attached('inline-1'));

    expect(await submitInlineChat('Tighten this')).toBe('refused');

    expect(slicePills()).toEqual(['inline-1']);
    expect(useCanvasStore.getState().inlineChat).toMatchObject({ anchorId: 'picked', send: 'failed' });
  });

  it('a paste admitted during the round trip survives a send that did not carry it', async () => {
    holds = true;
    await openBubble('Tighten this');
    addInlineAttachment(attached('carried'));
    duringSend = () => {
      addInlineAttachment(attached('late'));
    };

    expect(await submitInlineChat('Tighten this')).toBe('held');

    expect(slicePills()).toEqual(['late']);
  });

  it('reports the image count the send carried, not the count the outcome landed on', async () => {
    await openBubble('Tighten this');
    addInlineAttachment(attached('carried'));
    duringSend = () => {
      addInlineAttachment(attached('late'));
    };

    expect(await submitInlineChat('Tighten this')).toBe('accepted');

    expect(telemetry.find((row) => row.event === 'inline_chat_submitted')?.properties).toMatchObject({
      image_count: 1,
    });
  });

  it('an outcome landing after a re-anchor takes what it sent and leaves the rest', async () => {
    await openBubble('Tighten this');
    addInlineAttachment(attached('carried'));
    duringSend = () => {
      const canvas = useCanvasStore.getState();
      canvas.addElementSelection(evidence('other'), 'a', true);
      const record = canvas.inlineChat;
      if (record === null) throw new Error('the bubble closed before the re-anchor');
      canvas.setInlineChat({ ...record, anchorId: 'other' });
      addInlineAttachment(attached('fresh'));
    };

    expect(await submitInlineChat('Tighten this')).toBe('accepted');

    // The sent pill goes even though the surface moved: leaving it would let the next send deliver it twice.
    expect(slicePills()).toEqual(['fresh']);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('other');
  });

  it('a held outcome leaves a replacement bubble and its unsent attachments alone', async () => {
    holds = true;
    await openBubble('Tighten this');
    addInlineAttachment(attached('carried'));
    duringSend = () => {
      const canvas = useCanvasStore.getState();
      canvas.addElementSelection(evidence('other'), 'a', true);
      const record = canvas.inlineChat;
      if (record === null) throw new Error('the bubble closed before the re-anchor');
      canvas.setInlineChat({ ...record, anchorId: 'other', draft: 'Another request' });
      addInlineAttachment(attached('fresh'));
    };

    expect(await submitInlineChat('Tighten this')).toBe('held');

    expect(slicePills()).toEqual(['fresh']);
    expect(useCanvasStore.getState().inlineChat).toMatchObject({ anchorId: 'other', draft: 'Another request' });
  });
});

describe('the inline bubble’s momentary record (ONL-2455)', () => {
  const open = (anchorId: string, draft = 'Tighten this'): void => {
    useCanvasStore
      .getState()
      .setInlineChat({ anchorId, draft, expanded: true, entry: 'orb', placement: 'above', send: 'idle', refusal: null });
  };

  it('refuses a record whose anchor no selection holds', async () => {
    await connect(docOf([browserNode('a')], 1));
    open('picked');
    expect(useCanvasStore.getState().inlineChat).toBeNull();

    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });

  it('collapsing to the ball and expanding again are real writes', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');
    const expanded = useCanvasStore.getState().inlineChat;
    if (expanded === null) throw new Error('the record did not open');

    useCanvasStore.getState().setInlineChat({ ...expanded, expanded: false });
    expect(useCanvasStore.getState().inlineChat?.expanded).toBe(false);
    useCanvasStore.getState().setInlineChat({ ...expanded, expanded: true });
    expect(useCanvasStore.getState().inlineChat?.expanded).toBe(true);
  });

  it('the entry is part of the record, not dropped as a no-op', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');
    const held = useCanvasStore.getState().inlineChat;
    if (held === null) throw new Error('the record did not open');

    useCanvasStore.getState().setInlineChat({ ...held, entry: 'input' });
    expect(useCanvasStore.getState().inlineChat?.entry).toBe('input');
  });

  it('a no-op write re-renders nothing', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');
    const held = useCanvasStore.getState().inlineChat;

    open('picked');
    expect(useCanvasStore.getState().inlineChat).toBe(held);
  });

  it('a shift-add keeps the anchor, and a plain pick re-points it with the draft standing', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().addElementSelection(evidence('added'), 'a', true);
    expect(useCanvasStore.getState().inlineChat).toMatchObject({
      anchorId: 'picked',
      draft: 'Tighten this',
    });

    useCanvasStore.getState().addElementSelection(evidence('elsewhere'), 'a', false);
    expect(useCanvasStore.getState().inlineChat).toMatchObject({
      anchorId: 'elsewhere',
      draft: 'Tighten this',
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
    });
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual([
      'elsewhere',
    ]);
  });

  it('refuses a deselection of the anchor, so a shift-click on it strands nothing', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().addElementSelection(evidence('added'), 'a', true);
    open('picked');
    const held = useCanvasStore.getState().elementSelections;

    useCanvasStore.getState().removeElementSelection('picked');
    expect(useCanvasStore.getState().elementSelections).toBe(held);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');

    useCanvasStore.getState().removeElementSelection('added');
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual([
      'picked',
    ]);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });

  it('the anchor’s chip is still removable once the bubble is closed', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);

    useCanvasStore.getState().removeElementSelection('picked');
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('Escape’s one clear — and an accepted send’s — takes the bubble with the selection, and leaves the rails', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().toggleRail('right');
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().clearElementSelections('escape');
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
    expect(useCanvasStore.getState().hiddenRails).toEqual({ left: false, right: true });
  });

  it('arming the composer closes it — one pick cannot land in two places', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().setPicking(true);
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections).toHaveLength(1);
  });

  it('Interact parks it with the selection, and Design brings back the same bubble', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');
    const before = useCanvasStore.getState().inlineChat;

    useCanvasStore.getState().setMode('interact');
    expect(useCanvasStore.getState().inlineChat).toBe(before);
    expect(useCanvasStore.getState().elementSelections).toHaveLength(1);

    useCanvasStore.getState().setMode('design');
    expect(useCanvasStore.getState().inlineChat).toBe(before);
    expect(useCanvasStore.getState().elementSelections).toHaveLength(1);
  });

  it('a stale anchor keeps it, because a stale selection still sends', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().setElementStale('picked', true);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
    expect(useCanvasStore.getState().elementSelections[0]?.stale).toBe(true);
  });

  it('a frame navigating to another origin under it keeps the anchor, flagged (ONL-2518)', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().elementSelections[0]?.stale).toBe(true);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });

  it('a frame leaving the canvas under it closes it', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'b', false);
    open('picked');

    fakeUpdate(entryOf(3, { type: 'remove', id: 'b' }));
    expect(useCanvasStore.getState().inlineChat).toBeNull();
  });

  it('answers WHY a pick was turned away, so the surface can say so', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    const store = (): ReturnType<typeof useCanvasStore.getState> => useCanvasStore.getState();

    expect(store().addElementSelection(evidence('picked'), 'a', false)).toBe('added');
    open('picked');
    expect(store().addElementSelection(evidence('added'), 'a', true)).toBe('added');
    expect(store().addElementSelection(evidence('added'), 'a', true)).toBe('already-held');
    expect(store().addElementSelection(evidence('over-there'), 'b', true)).toBe('added');

    for (let index = 3; index < MAX_ELEMENT_SELECTIONS; index += 1) {
      expect(store().addElementSelection(evidence(`e${index}`), 'a', true)).toBe('added');
    }
    expect(store().elementSelections).toHaveLength(MAX_ELEMENT_SELECTIONS);
    const held = store().elementSelections;
    expect(store().addElementSelection(evidence('one-more'), 'b', true)).toBe('count-cap');
    expect(store().elementSelections).toBe(held);
    expect(store().inlineChat?.anchorId).toBe('picked');
  });

  it('retires a standing refusal on the next accepted pick, shift or plain', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    const refused = (): void => {
      useCanvasStore.getState().setInlineChat({
        anchorId: 'picked',
        draft: 'Tighten this',
        expanded: true,
        entry: 'orb',
        placement: 'above',
        send: 'idle',
        refusal: 'count-cap',
      });
    };

    refused();
    expect(useCanvasStore.getState().inlineChat?.refusal).toBe('count-cap');
    useCanvasStore.getState().addElementSelection(evidence('added'), 'a', true);
    expect(useCanvasStore.getState().inlineChat?.refusal).toBeNull();

    refused();
    useCanvasStore.getState().addElementSelection(evidence('elsewhere'), 'a', false);
    expect(useCanvasStore.getState().inlineChat).toMatchObject({
      anchorId: 'elsewhere',
      refusal: null,
      draft: 'Tighten this',
    });
  });

  it('a project switch takes it with the rest of the outgoing canvas', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().inlineChat).toBeNull();
  });
});

describe('a refused pick with no bubble to carry it (ONL-2482)', () => {
  /** The picker's own branch: whoever relays a pick reports what the add turned away. */
  const relay = (id: string, shiftHeld: boolean): AddOutcome => {
    const outcome = useCanvasStore.getState().addElementSelection(evidence(id), 'a', shiftHeld);
    if (outcome !== 'added' && outcome !== 'already-held') refuseGather(outcome);
    return outcome;
  };

  const gatherToCap = (): void => {
    for (let index = 0; index < MAX_ELEMENT_SELECTIONS; index += 1) {
      expect(relay(`e${index}`, index > 0)).toBe('added');
    }
  };

  it('lands the reason on the store, because the composer is the surface that is up', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    expect(useCanvasStore.getState().inlineChat).toBeNull();

    expect(relay('one-more', true)).toBe('count-cap');
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');
  });

  it('leaves it to the open bubble, so one refusal never shows on two surfaces', async () => {
    await connect(docOf([browserNode('a')], 1));
    gatherToCap();
    useCanvasStore.getState().setInlineChat({
      anchorId: 'e0',
      draft: 'Tighten this',
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
      refusal: null,
    });

    expect(relay('one-more', true)).toBe('count-cap');
    expect(useCanvasStore.getState().inlineChat?.refusal).toBe('count-cap');
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
  });

  it('retires on the next pick that lands', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');

    expect(relay('elsewhere', false)).toBe('added');
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
  });

  it('retires wherever the picker is disarmed, a send included', async () => {
    const disarms: ((store: ReturnType<typeof useCanvasStore.getState>) => void)[] = [
      // Where a send ends the mode (ChatRegion's onSend).
      (store) => store.setPicking(false),
      (store) => store.setTool('pan'),
      (store) => store.setMode('interact'),
    ];
    for (const disarm of disarms) {
      await connect(docOf([browserNode('a')], 1));
      useCanvasStore.getState().setPicking(true);
      gatherToCap();
      relay('one-more', true);
      expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');

      disarm(useCanvasStore.getState());
      expect(useCanvasStore.getState().gatherRefusal).toBeNull();
    }
  });

  it('retires when the gather shrinks, because the cap it named may no longer bind', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');

    useCanvasStore.getState().removeElementSelection('e4');
    expect(useCanvasStore.getState().elementSelections).toHaveLength(
      MAX_ELEMENT_SELECTIONS - 1,
    );
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
  });

  it('retires when a frame leaves and takes the elements picked in it', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().setPicking(true);
    useCanvasStore.getState().addElementSelection(evidence('kept'), 'b', false);
    for (let index = 1; index < MAX_ELEMENT_SELECTIONS; index += 1) {
      useCanvasStore.getState().addElementSelection(evidence(`e${index}`), 'a', true);
    }
    relay('one-more', true);
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');

    fakeUpdate(entryOf(3, { type: 'remove', id: 'a' }));
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual([
      'kept',
    ]);
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
  });

  it('stands through a canvas op that leaves the gather alone', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);

    useCanvasStore.getState().setElementStale('e0', true);
    useCanvasStore.getState().hoverNode('a');
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');
  });

  it('steps aside for a send, so a rejected one is not read behind it', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);
    expect(useCanvasStore.getState().gatherRefusal).toBe('count-cap');

    // The composer calls this before it awaits; a rejected send never reaches the disarm.
    useCanvasStore.getState().dismissGatherRefusal();
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
    expect(useCanvasStore.getState().isPicking).toBe(true);
  });

  it('retires with the gather it was about, and with the canvas it stood on', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);

    useCanvasStore.getState().clearElementSelections('escape');
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();

    useCanvasStore.getState().setPicking(true);
    gatherToCap();
    relay('one-more', true);
    useCanvasStore.getState().clearFrames();
    expect(useCanvasStore.getState().gatherRefusal).toBeNull();
  });
});

describe('a reload under the bubble (ONL-2455, ONL-2518)', () => {
  const open = (anchorId: string, over: Partial<InlineChatRecord> = {}): void => {
    useCanvasStore.getState().setInlineChat({
      anchorId,
      draft: 'Tighten this',
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
      refusal: null,
      ...over,
    });
  };

  const picked = async (): Promise<void> => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setElementAnchorRect('picked', { x: 0, y: 0, width: 10, height: 10 });
  };

  it('keeps it whole, so the sentence the user was typing comes back with the page', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    expect(useCanvasStore.getState().inlineChat).toEqual({
      anchorId: 'picked',
      draft: 'Tighten this',
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
      refusal: null,
    });
    expect(useCanvasStore.getState().elementSelections.map((s) => s.evidence.id)).toEqual([
      'picked',
    ]);
  });

  it('survives every patch one reload pushes, not only the first', async () => {
    await picked();
    open('picked');
    const home = 'http://localhost:3000/a';

    // The shape `useFrameWebview` pushes: start, navigate, dom-ready, then stop as its own patch before the sync.
    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    useCanvasStore.getState().patchFrame('a', { currentUrl: home, title: 'App' });
    useCanvasStore.getState().patchFrame('a', { currentUrl: home, title: 'App' });
    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    useCanvasStore.getState().patchFrame('a', { currentUrl: home, title: 'App' });

    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
  });

  it('keeps it when the load ends unreachable, flagging the element it can no longer see', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
    expect(useCanvasStore.getState().elementSelections).toEqual([
      { evidence: evidence('picked'), frameNodeId: 'a', stale: true },
    ]);
  });

  it('clears the flag when the frame comes back and the guest finds the element again', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
    expect(useCanvasStore.getState().elementSelections[0]?.stale).toBe(true);

    // The page returns byte-identical, which is what a dev server coming back looks like.
    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    useCanvasStore.getState().refreshElementSelection(evidence('picked'));
    expect(useCanvasStore.getState().elementSelections[0]?.stale).toBe(false);
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
  });

  it('holds the dead frame’s anchor rect, so the flagged surface sits where it last was', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
    expect(useCanvasStore.getState().elementAnchorRects.picked).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
  });

  it('leaves an unreachable frame’s elements alone when no bubble is open to carry them', async () => {
    await picked();

    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });
    expect(useCanvasStore.getState().elementSelections).toEqual([
      { evidence: evidence('picked'), frameNodeId: 'a', stale: false },
    ]);
  });

  it('puts the surface down with no telemetry door, which a chrome view and a test both lack', async () => {
    await picked();
    open('picked');

    dismissInlineChat('escape');
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('leaves an unreachable frame that is not the anchor’s alone', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().patchFrame('b', { health: 'unreachable' });
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });

  it('holds the anchor’s rect across the load, so the surface never unmounts', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    expect(useCanvasStore.getState().elementAnchorRects.picked).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
  });

  it('keeps it when the page goes to another origin, holding the element as last seen', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
    expect(useCanvasStore.getState().elementSelections).toEqual([
      { evidence: evidence('picked'), frameNodeId: 'a', stale: true },
    ]);
  });

  it('still drops a navigated frame’s elements when no bubble is open to carry them', async () => {
    await picked();

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(useCanvasStore.getState().elementSelections).toEqual([]);
  });

  it('sends what it kept as stale, so the submit carries the path and the url it was picked at', async () => {
    await picked();
    open('picked');

    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    expect(selectionEvidence(useCanvasStore.getState().elementSelections)).toEqual([
      { ...evidence('picked'), stale: true },
    ]);
  });

  it('keeps it through a reload in Interact, where the loss is invisible', async () => {
    await picked();
    open('picked');
    useCanvasStore.getState().setMode('interact');

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    useCanvasStore.getState().setMode('design');
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
  });

  it('keeps a send in flight, so its outcome lands on the record that carried it', async () => {
    await picked();
    open('picked', { send: 'sending' });

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    expect(useCanvasStore.getState().inlineChat?.send).toBe('sending');
  });

  it('lets a fresh pick re-point the surviving surface, draft kept', async () => {
    await picked();
    open('picked');
    useCanvasStore.getState().patchFrame('a', { health: 'loading' });

    useCanvasStore.getState().addElementSelection(evidence('second'), 'a', false);
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('second');
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
  });

  it('a load on another frame moves nothing, as a load on the anchor’s own no longer does', async () => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().patchFrame('b', { health: 'loading' });
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });

  it('a load finishing live leaves it open, as every non-terminal health now does', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    open('picked');

    useCanvasStore.getState().patchFrame('a', { health: 'live' });
    expect(useCanvasStore.getState().inlineChat?.anchorId).toBe('picked');
  });
});

describe('every way a bubble closes is counted once, with its reason; a frame’s own page closes none (ONL-2518)', () => {
  let telemetry: { event: string; properties: Record<string, unknown> }[] = [];

  const dismissals = (): Record<string, unknown>[] =>
    telemetry.filter((entry) => entry.event === 'inline_chat_dismissed').map((entry) => entry.properties);

  const openOver = async (draft: string): Promise<void> => {
    await connect(docOf([browserNode('a'), browserNode('b', { order: 1 })], 2));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setInlineChat({
      anchorId: 'picked',
      draft,
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
      refusal: null,
    });
    telemetry = [];
  };

  beforeEach(() => {
    telemetry = [];
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: (payload: (typeof telemetry)[number]) => telemetry.push(payload) } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('counts nothing for a reload, a navigation away, or a frame that dies', async () => {
    await openOver('Tighten this');
    const home = 'http://localhost:3000/a';

    useCanvasStore.getState().patchFrame('a', { health: 'loading' });
    useCanvasStore.getState().patchFrame('a', { currentUrl: home, title: 'App' });
    useCanvasStore.getState().patchFrame('a', { health: 'live', currentUrl: home });
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:5173/' });
    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });

    expect(dismissals()).toEqual([]);
    expect(useCanvasStore.getState().inlineChat?.draft).toBe('Tighten this');
  });

  const closes: [InlineDismissMethod, () => void][] = [
    ['escape', () => dismissInlineChat('escape')],
    ['click-away', () => dismissInlineChat('click-away')],
    ['mode-switch', () => dismissInlineChat('mode-switch')],
    ['tool-switch', () => useCanvasStore.getState().setTool('pan')],
    ['tool-switch', () => useCanvasStore.getState().setTool('frame')],
    ['picker-armed', () => useCanvasStore.getState().setPicking(true)],
    ['chat-sent', () => closeInlineChatCarrying([evidence('picked')])],
    ['prompt-recalled', () => useCanvasStore.getState().clearElementSelections('prompt-recalled')],
    ['window-hidden', () => useCanvasStore.getState().closeInlineChat('window-hidden')],
    ['canvas-cleared', () => useCanvasStore.getState().clearFrames()],
    ['selection-changed', () => currentWire?.emitUpdate({ docId: DOC_ID, entry: entryOf(3, { type: 'remove', id: 'a' }) })],
  ];

  for (const [method, close] of closes) {
    it(`counts one close, by ${method}, for each way a bubble closes`, async () => {
      await openOver('Tighten this');
      close();
      expect(useCanvasStore.getState().inlineChat).toBeNull();
      expect(dismissals()).toEqual([{ method, draft_lost: true }]);
    });
  }

  it('names a close no path attributed, rather than dropping it', async () => {
    await openOver('');
    useCanvasStore.setState({ inlineChat: null });
    expect(dismissals()).toEqual([{ method: 'unattributed', draft_lost: false }]);
  });

  it('counts a bubble’s own send as its submission, never as a dismissal', async () => {
    await openOver('Tighten this');
    useCanvasStore.getState().closeInlineChat('sent');
    expect(useCanvasStore.getState().inlineChat).toBeNull();
    expect(dismissals()).toEqual([]);
  });
});

describe('the text tool’s arming (ONL-2486)', () => {
  it('takes the element picker’s activation with it, as the hand and frame tools do', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setPicking(true);
    expect(useCanvasStore.getState().isPicking).toBe(true);

    useCanvasStore.getState().setTool('text');

    expect(useCanvasStore.getState().tool).toBe('text');
    expect(useCanvasStore.getState().isPicking).toBe(false);
  });

  it('closes an open inline bubble, so one Escape has one claimant', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().addElementSelection(evidence('picked'), 'a', false);
    useCanvasStore.getState().setInlineChat({
      anchorId: 'picked',
      draft: 'Tighten this',
      expanded: true,
      entry: 'input',
      placement: 'above',
      send: 'idle',
      refusal: null,
    });

    useCanvasStore.getState().setTool('text');

    expect(useCanvasStore.getState().inlineChat).toBeNull();
  });

  it('is refused in Interact, where a placing click would vanish into the guest page', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setMode('interact');

    useCanvasStore.getState().setTool('text');

    expect(useCanvasStore.getState().tool).toBe('select');
  });

  it('returns to select when Interact opens under it', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('text');

    useCanvasStore.getState().setMode('interact');

    expect(useCanvasStore.getState().tool).toBe('select');
  });

  it('shields the guest and suppresses a pick while it is armed', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('text');
    expect(isFrameShielded(useCanvasStore.getState(), 'a')).toBe(true);
  });

  it('disarming authors nothing and leaves no placement behind', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('text');

    useCanvasStore.getState().setTool('select');

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().textDraft).toBeNull();
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });
});

describe('placing a text node (ONL-2486)', () => {
  const MEASURED = { width: 212, height: 38 };

  const place = (at: { x: number; y: number }): string => {
    const id = useCanvasStore.getState().placeTextNode(at);
    if (id === null) throw new Error('the placement was refused');
    return id;
  };

  it('opens the caret on the placed node at the clicked point and returns the tool to select', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('text');

    const placed = place({ x: 640, y: 210 });

    expect(useCanvasStore.getState().tool).toBe('select');
    expect(useCanvasStore.getState().textEditId).toBe(placed);
    expect(useCanvasStore.getState().textDraft).toMatchObject({ id: placed, x: 640, y: 210 });
    // Nothing is authored yet: an abandoned placement has to leave no history.
    expect(wire.sent).toEqual([]);
  });

  it('authors one text node at that point, front-most, when the caret leaves with a value', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    const placed = place({ x: 640, y: 210 });

    useCanvasStore.getState().commitTextEdit('ship it', MEASURED);

    const op = singleOp(wire.sent[0]);
    expect(wire.sent).toHaveLength(1);
    expect(op).toMatchObject({
      type: 'create',
      node: {
        id: placed,
        pageId: 'pg_main',
        kind: 'text',
        x: 640,
        y: 210,
        width: MEASURED.width,
        height: MEASURED.height,
        order: 1,
        content: { text: 'ship it' },
      },
    });
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('holds the placement on screen until its own node arrives, then lets it go', async () => {
    await connect(docOf([browserNode('a')], 1));
    const placed = place({ x: 10, y: 20 });
    useCanvasStore.getState().commitTextEdit('ship it', MEASURED);
    expect(useCanvasStore.getState().textDraft?.text).toBe('ship it');

    fakeUpdate(
      entryOf(2, {
        type: 'create',
        node: {
          id: placed,
          pageId: 'pg_main',
          kind: 'text',
          name: 'Text',
          x: 10,
          y: 20,
          width: MEASURED.width,
          height: MEASURED.height,
          order: 1,
          content: { text: 'ship it', size: 'medium' },
        },
      }),
    );

    expect(useCanvasStore.getState().textDraft).toBeNull();
    expect(canvasNodes()).toEqual(['a', placed]);
  });

  it('leaves the undo stack where it was when the placement is left empty', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().placeTextNode({ x: 640, y: 210 });

    useCanvasStore.getState().commitTextEdit('', MEASURED);

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().textDraft).toBeNull();
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('treats a placement typed only spaces and newlines the same way', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().placeTextNode({ x: 640, y: 210 });

    useCanvasStore.getState().commitTextEdit('  \n \t ', MEASURED);

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().textDraft).toBeNull();
  });

  it('claims the selection for the placed node, not whatever was under the click', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().selectFrame('a', false);

    const placed = place({ x: 40, y: 40 });

    expect(useCanvasStore.getState().selectedNodeIds).toEqual([placed]);
    expect(selection()).toEqual([]);
  });

  it('places nothing with no document open', async () => {
    const wire = await connect(null);
    useCanvasStore.getState().setTool('text');

    expect(useCanvasStore.getState().placeTextNode({ x: 0, y: 0 })).toBeNull();
    expect(useCanvasStore.getState().textDraft).toBeNull();
    expect(wire.sent).toEqual([]);
  });

  it('drops a placement whose create the wire refused, so nothing waits on an echo that never comes', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().placeTextNode({ x: 0, y: 0 });
    disconnect?.();
    disconnect = null;

    useCanvasStore.getState().commitTextEdit('ship it', MEASURED);

    expect(useCanvasStore.getState().textDraft).toBeNull();
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('keeps the line breaks a multi-line placement was typed with', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().placeTextNode({ x: 0, y: 0 });

    useCanvasStore.getState().commitTextEdit('first\nsecond', { width: 212, height: 76 });

    expect(singleOp(wire.sent[0])).toMatchObject({
      type: 'create',
      node: { content: { text: 'first\nsecond' }, height: 76 },
    });
  });
});

describe('editing a text node already on the canvas (ONL-2486)', () => {
  it('opens the caret on it, which is what a double-click reaches', async () => {
    await connect(docOf([browserNode('a'), textNode('t')], 2));

    useCanvasStore.getState().beginTextEdit('t');

    expect(useCanvasStore.getState().textEditId).toBe('t');
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['t']);
  });

  it('opens on no other kind of node', async () => {
    await connect(docOf([browserNode('a'), imageNode('i')], 2));

    useCanvasStore.getState().beginTextEdit('a');
    useCanvasStore.getState().beginTextEdit('i');
    useCanvasStore.getState().beginTextEdit('ghost');

    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('writes the value that left the caret, not the one the edit opened on', async () => {
    const wire = await connect(docOf([textNode('t')], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().commitTextEdit('rewritten', { width: 300, height: 76 });

    expect(singleOp(wire.sent[0])).toEqual({
      type: 'set-text',
      id: 't',
      text: 'rewritten',
      width: 300,
      height: 76,
    });
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('authors nothing when the value came back unchanged', async () => {
    const wire = await connect(docOf([textNode('t', { content: { text: 'steady', size: 'medium' } })], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().commitTextEdit('steady', { width: 999, height: 999 });

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().textEditId).toBeNull();
  });

  it('authors nothing when a label longer than the canvas draws came back unchanged (ONL-2486)', async () => {
    const long = 'x'.repeat(5000);
    const wire = await connect(docOf([textNode('t', { content: { text: long, size: 'medium' } })], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().commitTextEdit(long, { width: 999, height: 999 });

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().doc?.nodes['t']?.content).toEqual({ text: long, size: 'medium' });
  });

  it('keeps every character when a label longer than the canvas draws is edited (ONL-2486)', async () => {
    const long = 'x'.repeat(5000);
    const wire = await connect(docOf([textNode('t', { content: { text: long, size: 'medium' } })], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().commitTextEdit(`${long}!`, { width: 300, height: 76 });

    expect(singleOp(wire.sent[0])).toEqual({
      type: 'set-text',
      id: 't',
      text: `${long}!`,
      width: 300,
      height: 76,
    });
  });

  it('removes a node emptied to whitespace', async () => {
    const wire = await connect(docOf([textNode('t')], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().commitTextEdit('   \n ', { width: 20, height: 38 });

    expect(singleOp(wire.sent[0])).toEqual({ type: 'remove', id: 't' });
  });

  it('authors nothing with no caret open', async () => {
    const wire = await connect(docOf([textNode('t')], 1));

    useCanvasStore.getState().commitTextEdit('never typed', { width: 20, height: 38 });

    expect(wire.sent).toEqual([]);
  });

  it('closes the caret when the node it was in leaves the document', async () => {
    await connect(docOf([textNode('t')], 1));
    useCanvasStore.getState().beginTextEdit('t');

    fakeUpdate(entryOf(2, { type: 'remove', id: 't' }));

    expect(useCanvasStore.getState().textEditId).toBeNull();
  });
});

describe('resizable text layout (ONL-2521)', () => {
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    for (const echoTiming of ['before-first-tick', 'between-ticks', 'before-release', 'after-release']) {
      it(`keeps the displayed fixed corner through overlapping top-left then ${corner} resizes with the earlier echo ${echoTiming}`, async () => {
        const wire = await connect(docOf([textNode('t', { x: 1000, y: 1000, width: 480, height: 76 })]));
        const state = useCanvasStore.getState();
        state.beginResize('t', 9, { anchorBottom: true, measureHeight: () => 38 });
        state.onNodesChange([
          { id: 't', type: 'position', position: { x: 760, y: 1000 } },
          { id: 't', type: 'dimensions', dimensions: { width: 720, height: 400 }, resizing: true },
        ]);
        state.settleResize('t', { x: 760, y: 1000, width: 720, height: 400 });
        expect(singleOp(wire.sent[0])).toEqual({ type: 'resize', id: 't', x: 760, y: 1038, width: 720, height: 38 });

        const anchorBottom = corner.startsWith('top');
        const anchorRight = corner.endsWith('left');
        const measureHeight = (width: number) => width === 240 ? 152 : 114;
        state.beginResize('t', 10, { anchorBottom, measureHeight });
        const echoEarlier = () => fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
        const expectBox = (width: number) => {
          const current = useCanvasStore.getState();
          const height = measureHeight(width);
          const x = anchorRight ? 1480 - width : 760;
          const y = anchorBottom ? 1076 - height : 1038;
          expect(current.nodes.find((node) => node.id === 't')?.position).toEqual({ x, y });
          expect(drawnTextBox(current, 't')).toEqual({ width, height, wrapWidth: width });
          expect(current.gesture.t).toMatchObject({ x, y, width, height });
          expect(anchorRight ? x + width : x).toBe(anchorRight ? 1480 : 760);
          expect(anchorBottom ? y + height : y).toBe(anchorBottom ? 1076 : 1038);
        };
        const tick = (width: number) => state.onNodesChange([
          ...(anchorRight ? [{ id: 't', type: 'position' as const, position: { x: 1480 - width, y: 1038 } }] : []),
          { id: 't', type: 'dimensions', dimensions: { width, height: 400 }, resizing: true },
        ]);

        if (echoTiming === 'before-first-tick') echoEarlier();
        tick(240);
        expectBox(240);
        if (echoTiming === 'between-ticks') {
          echoEarlier();
          expectBox(240);
        }
        tick(360);
        expectBox(360);
        if (echoTiming === 'before-release') {
          echoEarlier();
          expectBox(360);
        }
        state.settleResize('t', { x: anchorRight ? 1120 : 760, y: 1038, width: 360, height: 400 });
        expectBox(360);
        expect(singleOp(wire.sent[1])).toEqual({
          type: 'resize', id: 't', x: anchorRight ? 1120 : 760,
          y: anchorBottom ? 962 : 1038, width: 360, height: 114,
        });
        if (echoTiming === 'after-release') {
          echoEarlier();
          expectBox(360);
        }
        fakeUpdate(entryOf(3, singleOp(wire.sent[1])));
        expect(useCanvasStore.getState().gesture.t).toBeUndefined();
        expect(useCanvasStore.getState().doc?.nodes.t).toMatchObject({
          x: anchorRight ? 1120 : 760, y: anchorBottom ? 962 : 1038, width: 360, height: 114,
        });
      });
    }
  }

  it('keeps the displayed top edge on a bottom-corner release without a tick or an earlier echo', async () => {
    const wire = await connect(docOf([textNode('t', { x: 1000, y: 1000, width: 480, height: 76 })]));
    const state = useCanvasStore.getState();
    state.beginResize('t', 9, { anchorBottom: true, measureHeight: () => 38 });
    state.settleResize('t', { x: 1000, y: 1000, width: 720, height: 400 });
    state.beginResize('t', 10, { anchorBottom: false, measureHeight: () => 152 });
    state.settleResize('t', { x: 1000, y: 1038, width: 240, height: 400 });
    expect(singleOp(wire.sent[1])).toEqual({ type: 'resize', id: 't', x: 1000, y: 1038, width: 240, height: 152 });
  });

  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    for (const width of [240, 720]) {
      it(`fits content at ${width}px from ${corner} at non-unit zoom with one resize operation`, async () => {
        const wire = await connect(docOf([textNode('t', { x: 1000, y: 1000, width: 480, height: 76 })]));
        setCanvasZoomSource(() => 0.5);
        const state = useCanvasStore.getState();
        const height = width === 240 ? 152 : 38;
        const x = corner.endsWith('left') ? 1480 - width : 1000;
        const y = corner.startsWith('top') ? 1076 - height : 1000;
        state.beginResize('t', 9, { anchorBottom: corner.startsWith('top'), measureHeight: () => height });
        state.onNodesChange([
          { id: 't', type: 'position', position: { x, y: 1000 } },
          { id: 't', type: 'dimensions', dimensions: { width, height: 400 }, resizing: true },
        ]);
        expect(drawnTextBox(useCanvasStore.getState(), 't')).toEqual({ width, height, wrapWidth: width });
        expect(wire.sent).toHaveLength(0);
        state.settleResize('t', { x, y: 1000, width, height: 400 });
        expect(wire.sent).toHaveLength(1);
        expect(singleOp(wire.sent[0])).toEqual({ type: 'resize', id: 't', x, y, width, height });
        fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
        expect(useCanvasStore.getState().doc?.nodes.t).toMatchObject({ x, y, width, height, content: { size: 'medium', wrapWidth: width } });
      });
    }
  }

  it('height-only corner motion retains the font, complete text and content-fit height', async () => {
    const wire = await connect(docOf([textNode('t', { width: 240, height: 152, content: { text: 'All the words', size: 'medium', wrapWidth: 240 } })]));
    const state = useCanvasStore.getState();
    state.beginResize('t', 9, { anchorBottom: true, measureHeight: () => 152 });
    state.onNodesChange([
      { id: 't', type: 'position', position: { x: 0, y: -100 } },
      { id: 't', type: 'dimensions', dimensions: { width: 240, height: 252 }, resizing: true },
    ]);
    state.settleResize('t', { x: 0, y: -100, width: 240, height: 252 });
    expect(singleOp(wire.sent[0])).toMatchObject({ x: 0, y: 0, width: 240, height: 152 });
    expect(useCanvasStore.getState().doc?.nodes.t).toMatchObject({ content: { text: 'All the words', size: 'medium', wrapWidth: 240 } });
  });

  it('reads authored and held geometry rather than the last React Flow measurement', async () => {
    await connect(docOf([textNode('t', { width: 720, height: 76, content: { text: 'The words', size: 'medium', wrapWidth: 720 } })]));
    useCanvasStore.getState().onNodesChange([{ id: 't', type: 'dimensions', dimensions: { width: 214, height: 38 } }]);
    expect(drawnTextBox(useCanvasStore.getState(), 't')).toEqual({ width: 720, height: 76, wrapWidth: 720 });
    useCanvasStore.getState().beginResize('t');
    useCanvasStore.getState().onNodesChange([{ id: 't', type: 'dimensions', dimensions: { width: 240, height: 200 }, resizing: true }]);
    expect(drawnTextBox(useCanvasStore.getState(), 't')).toEqual({ width: 240, height: 76, wrapWidth: 240 });
  });

  it('holds measurement corrections throughout a gesture and its pending echo', async () => {
    const wire = await connect(docOf([textNode('t', { width: 300, height: 38 })]));
    const state = useCanvasStore.getState();
    state.beginResize('t', 9);
    state.noteTextMeasured('t', { width: 214, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: undefined });
    expect(wire.sent).toHaveLength(0);
    state.settleResize('t', { x: 0, y: 0, width: 720, height: 38 });
    state.noteTextMeasured('t', { width: 214, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: undefined });
    expect(wire.sent).toHaveLength(1);
    expect(singleOp(wire.sent[0])).toMatchObject({ type: 'resize', id: 't', width: 720 });
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
    state.noteTextMeasured('t', { width: 300, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: undefined });
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'large', { text: 'a note to self', wrapWidth: 720 });
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'medium', { text: 'older words', wrapWidth: 720 });
    expect(wire.sent).toHaveLength(1);
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: 720 });
    expect(wire.sent).toHaveLength(2);
    expect(wire.sent[1]?.correction).toBe(true);
    expect(singleOp(wire.sent[1])).toMatchObject({ type: 'set-text', width: 720, height: 76 });
  });

  it('rejects a measured layout left behind by undo even when font and words match', async () => {
    const wire = await connect(docOf([textNode('t', { width: 300, height: 38 })]));
    const state = useCanvasStore.getState();
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: 720 });
    expect(wire.sent).toHaveLength(0);
  });

  it('an earlier resize echo cannot release the newer resize awaiting its own echo', async () => {
    const wire = await connect(docOf([textNode('t', { width: 300, height: 38 })]));
    const state = useCanvasStore.getState();
    state.beginResize('t');
    state.settleResize('t', { x: 0, y: 0, width: 720, height: 38 });
    state.beginResize('t');
    state.settleResize('t', { x: 0, y: 0, width: 240, height: 38 });
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
    expect(drawnTextBox(useCanvasStore.getState(), 't')?.wrapWidth).toBe(240);
    expect(useCanvasStore.getState().gesture.t?.isSettling).toBe(true);
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: 720 });
    expect(wire.sent).toHaveLength(2);
    fakeUpdate(entryOf(3, singleOp(wire.sent[1])));
    expect(useCanvasStore.getState().gesture.t).toBeUndefined();
    state.noteTextMeasured('t', { width: 240, height: 152 }, 'medium', { text: 'a note to self', wrapWidth: 240 });
    expect(wire.sent).toHaveLength(3);
  });

  it('an old resize echo cannot release the hold between a new pointer press and its first tick', async () => {
    const wire = await connect(docOf([textNode('t', { width: 300, height: 38 })]));
    const state = useCanvasStore.getState();
    state.beginResize('t');
    state.settleResize('t', { x: 0, y: 0, width: 720, height: 38 });
    state.beginResize('t');
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
    expect(useCanvasStore.getState().gesture.t?.width).toBe(720);
    state.noteTextMeasured('t', { width: 720, height: 76 }, 'medium', { text: 'a note to self', wrapWidth: 720 });
    expect(wire.sent).toHaveLength(1);
    state.settleResize('t', { x: 0, y: 0, width: 240, height: 38 });
    expect(singleOp(wire.sent[1])).toMatchObject({ type: 'resize', width: 240 });
    fakeUpdate(entryOf(3, singleOp(wire.sent[1])));
    expect(useCanvasStore.getState().gesture.t).toBeUndefined();
  });

  for (const wrapWidth of [240, 720]) {
    it(`preserves ${wrapWidth}px through font choices, editing and copy/paste`, async () => {
      const wire = await connect(docOf([textNode('t', {
        width: wrapWidth, height: 152, content: { text: 'a note to self', size: 'medium', wrapWidth },
      })]));
      useCanvasStore.getState().selectFrame('t', false);
      for (const size of ['small', 'large', 'medium'] as const) {
        useCanvasStore.getState().setSelectedTextSize(size);
        const op = requestOps(wire.sent.at(-1))[0];
        expect(op).toMatchObject({ type: 'set-text-size', width: wrapWidth, size });
        if (!op) throw new Error('expected font size operation');
        fakeUpdate(entryOf((useCanvasStore.getState().doc?.revision ?? 0) + 1, op));
      }
      useCanvasStore.getState().beginTextEdit('t');
      useCanvasStore.getState().commitTextEdit('new words\nand another line', { width: wrapWidth, height: 228 });
      fakeUpdate(entryOf(5, singleOp(wire.sent.at(-1))));
      const stored = useCanvasStore.getState().doc?.nodes.t;
      expect(stored).toMatchObject({ width: wrapWidth, height: 228, content: { wrapWidth } });
      const copy = useCanvasStore.getState().copyCanvasSelection();
      if (!copy) throw new Error('expected copied text');
      const paste = classifyPaste({
        get: (type) => type === CANVAS_CLIPBOARD_TYPE ? copy.payload : '',
        files: [], promisesImage: false,
      }, { docId: DOC_ID });
      if (paste.kind !== 'nodes') throw new Error('expected copied nodes');
      useCanvasStore.getState().pasteCanvasNodes(paste.nodes, { x: 900, y: 0 });
      expect(requestOps(wire.sent.at(-1))[0]).toMatchObject({ node: { width: wrapWidth, content: { wrapWidth } } });
    });
  }
});

describe('a text node’s stored box follows its measured one (ONL-2486)', () => {
  const stored = (id: string): TextNode => {
    const node = useCanvasStore.getState().doc?.nodes[id];
    if (node?.kind !== 'text') throw new Error('expected a text node');
    return node;
  };
  const boxOf = (id: string): { width: number; height: number } => ({
    width: stored(id).width,
    height: stored(id).height,
  });

  it('corrects a node that arrived without an edit session on its first layout', async () => {
    const wire = await connect(
      docOf([textNode('t', { ...defaultTextBox('medium'), content: { text: 'agent wrote this', size: 'medium' } })], 1),
    );

    noteTextMeasured('t', { width: 214, height: 38 }, 'medium');

    expect(singleOp(wire.sent[0])).toEqual({
      type: 'set-text',
      id: 't',
      text: 'agent wrote this',
      width: 214,
      height: 38,
    });
  });

  it('authors nothing once the stored box already matches', async () => {
    const wire = await connect(docOf([textNode('t', { width: 214, height: 38 })], 1));

    noteTextMeasured('t', { width: 214, height: 38 }, 'medium');

    expect(wire.sent).toEqual([]);
  });

  it('never corrects mid-edit, where the box is still moving under the caret', async () => {
    const wire = await connect(docOf([textNode('t', { width: 214, height: 38 })], 1));
    useCanvasStore.getState().beginTextEdit('t');

    noteTextMeasured('t', { width: 480, height: 152 }, 'medium');

    expect(wire.sent).toEqual([]);
  });

  it('corrects no other kind of node', async () => {
    const wire = await connect(docOf([browserNode('a'), imageNode('i')], 2));

    noteTextMeasured('a', { width: 1, height: 1 }, 'medium');
    noteTextMeasured('i', { width: 1, height: 1 }, 'medium');
    noteTextMeasured('ghost', { width: 1, height: 1 }, 'medium');

    expect(wire.sent).toEqual([]);
  });

  it('declines a measurement taken at a size the node has since left', async () => {
    const wire = await connect(docOf([textNode('t', { width: 269, height: 38 })], 1));

    noteTextMeasured('t', { width: 461, height: 65 }, 'large');

    expect(wire.sent).toEqual([]);
    expect(boxOf('t')).toEqual({ width: 269, height: 38 });
  });

  it('keeps the pre-change box when a size gesture, its undo, and the large layout’s correction land in that order', async () => {
    const wire = await connect(docOf([textNode('t', { width: 269, height: 38 })], 1));
    useCanvasStore.getState().selectFrame('t', false);

    useCanvasStore.getState().setSelectedTextSize('large');
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
    dispatchCanvasUndo();
    fakeUpdate(
      entryOf(3, { type: 'set-text-size', id: 't', size: 'medium', width: 269, height: 38 }, 'system'),
    );

    noteTextMeasured('t', { width: 461, height: 65 }, 'large');
    // Anything dispatched past the gesture comes back, because a correction that lands is one that persists.
    for (const late of wire.sent.slice(1)) fakeUpdate(entryOf(4, singleOp(late)));

    expect(boxOf('t')).toEqual({ width: 269, height: 38 });
    expect(stored('t').content.size).toBe('medium');
    expect(wire.sent).toHaveLength(1);
  });

  it('marks the correction, so it never becomes a history entry of its own', async () => {
    const wire = await connect(docOf([textNode('t', { width: 480, height: 66 })], 1));

    noteTextMeasured('t', { width: 214, height: 65 }, 'medium');

    expect(wire.sent[0]?.correction).toBe(true);
  });

  it('applies a measurement taken at the size the node still holds, and the echo moves the revision', async () => {
    const wire = await connect(
      docOf([textNode('t', { width: 480, height: 66, content: { text: 'checkout', size: 'large' } })], 1),
    );

    noteTextMeasured('t', { width: 461, height: 65 }, 'large');

    expect(singleOp(wire.sent[0])).toEqual({
      type: 'set-text',
      id: 't',
      text: 'checkout',
      width: 461,
      height: 65,
    });
    expect(wire.sent[0]?.correction).toBe(true);
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));
    expect(useCanvasStore.getState().doc?.revision).toBe(2);
    expect(boxOf('t')).toEqual({ width: 461, height: 65 });
  });

  it('never writes the replaced string back while the commit is still out (ONL-2486)', async () => {
    const wire = await connect(
      docOf([textNode('t', { width: 300, height: 38, content: { text: 'Hello', size: 'medium' } })], 1),
    );
    useCanvasStore.getState().beginTextEdit('t');
    useCanvasStore.getState().commitTextEdit('Hello world', { width: 460, height: 38 });

    // Closing the caret re-measures the node, and the document still holds `Hello`.
    noteTextMeasured('t', { width: 460, height: 38 }, 'medium');

    expect(wire.sent).toHaveLength(1);
    expect(singleOp(wire.sent[0])).toEqual({
      type: 'set-text',
      id: 't',
      text: 'Hello world',
      width: 460,
      height: 38,
    });
  });

  it('corrects the box again once that echo has landed', async () => {
    const wire = await connect(
      docOf([textNode('t', { width: 300, height: 38, content: { text: 'Hello', size: 'medium' } })], 1),
    );
    useCanvasStore.getState().beginTextEdit('t');
    useCanvasStore.getState().commitTextEdit('Hello world', { width: 460, height: 38 });
    fakeUpdate(entryOf(2, singleOp(wire.sent[0])));

    noteTextMeasured('t', { width: 452, height: 38 }, 'medium');

    expect(stored('t').content.text).toBe('Hello world');
    expect(singleOp(wire.sent[1])).toEqual({
      type: 'set-text',
      id: 't',
      text: 'Hello world',
      width: 452,
      height: 38,
    });
    expect(wire.sent[1]?.correction).toBe(true);
  });

  it('marks neither a typed label’s commit nor a size gesture: both are the user’s own edit', async () => {
    const wire = await connect(docOf([textNode('t', { width: 480, height: 38 })], 1));
    useCanvasStore.getState().beginTextEdit('t');
    useCanvasStore.getState().commitTextEdit('rewritten', { width: 300, height: 38 });
    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().setSelectedTextSize('large');

    expect(wire.sent.map((request) => request.correction)).toEqual([undefined, undefined]);
  });
});

describe('a text node is a first-class selection member (ONL-2486)', () => {
  const mixed = (): CanvasDoc =>
    docOf([browserNode('a'), textNode('t', { x: 900, y: 40, order: 1 })], 2);

  it('joins a marquee that also took a frame', async () => {
    await connect(mixed());

    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'select', selected: true },
      { id: 't', type: 'select', selected: true },
    ]);

    expect(selection()).toEqual(['a', 't']);
  });

  it('moves with the group drag it is part of, one move op each', async () => {
    const wire = await connect(mixed());
    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'select', selected: true },
      { id: 't', type: 'select', selected: true },
    ]);

    useCanvasStore.getState().onNodesChange([
      { id: 'a', type: 'position', position: { x: 60, y: 60 }, dragging: false },
      { id: 't', type: 'position', position: { x: 960, y: 100 }, dragging: false },
    ]);

    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'move', id: 'a', x: 60, y: 60 },
      { type: 'move', id: 't', x: 960, y: 100 },
    ]);
  });

  it('takes an arrow nudge like any other node', async () => {
    const wire = await connect(mixed());
    useCanvasStore.getState().selectFrame('t', false);

    useCanvasStore.getState().nudgeNodes(0, -1);
    useCanvasStore.getState().flushNudges();

    expect(requestOps(wire.sent[0])).toEqual([{ type: 'move', id: 't', x: 900, y: 39 }]);
  });

  it('duplicates and deletes with the selection it belongs to', async () => {
    const wire = await connect(mixed());
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('t', true);

    useCanvasStore.getState().duplicateSelectedFrame();
    expect(requestOps(wire.sent[0]).map((op) => op.type)).toEqual(['duplicate', 'duplicate']);

    // The duplicates took the selection, so the originals are re-gathered before the delete.
    wire.sent.length = 0;
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('t', true);
    useCanvasStore.getState().removeFrame('t');
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'remove', id: 'a' },
      { type: 'remove', id: 't' },
    ]);
  });

  it('paints by the document’s stack order, so the front-most node wins an overlapping point', async () => {
    await connect(docOf([textNode('under'), browserNode('over', { order: 1 })], 2));

    const ranks = useCanvasStore.getState().nodes.map((node) => [node.id, node.zIndex]);
    expect(ranks).toEqual([
      ['under', 0],
      ['over', 1],
    ]);

    useCanvasStore.getState().stackNode('under', 'front');
    fakeUpdate(entryOf(3, { type: 'reorder', id: 'under', order: 2 }));
    expect(useCanvasStore.getState().nodes.map((node) => [node.id, node.zIndex])).toEqual([
      ['under', 1],
      ['over', 0],
    ]);
  });
});

describe('resizing a picture on the canvas (ONL-2486)', () => {
  /** Its box ratio differs from its originals', so a test says which of the two a lock preserved. */
  const distorted = (over: Partial<ImageNode> = {}): ImageNode =>
    imageNode('p', {
      x: 100,
      y: 200,
      width: 300,
      height: 200,
      content: { imageId: 'img_p', name: 'hero.png', originalWidth: 1600, originalHeight: 1200 },
      ...over,
    });

  const boxOf = (id: string): { width: number; height: number } => {
    const node = useCanvasStore.getState().nodes.find((candidate) => candidate.id === id);
    return { width: node?.width ?? 0, height: node?.height ?? 0 };
  };

  const ratioOf = (id: string): number => {
    const box = boxOf(id);
    return box.width / box.height;
  };

  it('wears the resize controls alone in the selection and none inside a group', async () => {
    await connect(docOf([distorted(), browserNode('a', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('p', false);
    expect(isLoneSelectedNode(useCanvasStore.getState(), 'p')).toBe(true);

    useCanvasStore.getState().selectFrame('a', true);
    expect(isLoneSelectedNode(useCanvasStore.getState(), 'p')).toBe(false);
    expect(isLoneSelectedNode(useCanvasStore.getState(), 'a')).toBe(false);
  });

  it('sends one operation for a drag of many pointer moves, from the box the release held', async () => {
    const wire = await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    for (const width of [320, 360, 420, 500, 560]) {
      useCanvasStore.getState().onNodesChange([
        { type: 'dimensions', id: 'p', dimensions: { width, height: 200 }, resizing: true },
      ]);
    }
    useCanvasStore.getState().settleResize('p', { x: 100, y: 200, width: 560, height: 200 });

    expect(wire.sent).toHaveLength(1);
    expect(singleOp(wire.sent[0])).toEqual({
      type: 'resize',
      id: 'p',
      x: 100,
      y: 200,
      width: 560,
      height: 420,
    });
  });

  it('holds the picture’s own ratio with no key held, not the one its box had drifted to', async () => {
    await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 600, height: 200 }, resizing: true },
    ]);

    // Each side is a whole pixel, so the ratio lands within a pixel of the source rather than on it.
    const box = boxOf('p');
    expect(Math.abs(box.width - box.height * (1600 / 1200))).toBeLessThanOrEqual(1);
    expect(ratioOf('p')).not.toBeCloseTo(300 / 200, 1);
  });

  it('keeps the bottom edge where a top-edge drag left it, at the picture’s ratio', async () => {
    await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'p', position: { x: 100, y: 100 } },
      { type: 'dimensions', id: 'p', dimensions: { width: 300, height: 300 }, resizing: true },
    ]);

    const held = useCanvasStore.getState().nodes[0];
    expect((held?.position.y ?? 0) + (held?.height ?? 0)).toBe(400);
    expect(boxOf('p')).toEqual({ width: 400, height: 300 });
  });

  it('saves the locked box, not the one the control reports at the release', async () => {
    const wire = await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 600, height: 200 }, resizing: true },
    ]);
    const locked = boxOf('p');
    // The control reports its own unlocked box at the release; the held one is what the settle saves.
    useCanvasStore.getState().settleResize('p', { x: 100, y: 200, width: 600, height: 200 });

    expect(wire.sent).toHaveLength(1);
    expect(singleOp(wire.sent[0])).toMatchObject({ type: 'resize', id: 'p', ...locked });
    expect(locked.height).toBeGreaterThan(200);
  });

  // A 4:3 picture at 320×240: the two deltas cross at 60, where re-reading the driver would take the
  // width from 380 to 401 on a one-pixel pointer move.
  it('keeps the axis the gesture started on, so a one-pixel pointer move never jumps the width', async () => {
    await connect(
      docOf(
        [
          imageNode('p', {
            x: 0,
            y: 0,
            width: 320,
            height: 240,
            content: { imageId: 'img_p', name: 'hero.png', originalWidth: 1600, originalHeight: 1200 },
          }),
        ],
        1,
      ),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 380, height: 300 }, resizing: true },
    ]);
    const before = boxOf('p');
    // One pixel further down: the height's delta now leads the width's.
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 380, height: 301 }, resizing: true },
    ]);

    expect(before).toEqual({ width: 380, height: 285 });
    expect(boxOf('p')).toEqual(before);
  });

  it('settles the axis only once the drag has moved a whole unit', async () => {
    await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 300.4, height: 200 }, resizing: true },
    ]);
    expect(useCanvasStore.getState().resizeDriver).toBeNull();

    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 300, height: 260 }, resizing: true },
    ]);
    expect(useCanvasStore.getState().resizeDriver).toBe('height');
  });

  it('drops the gesture’s axis at the release, so the next drag reads its own', async () => {
    await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 600, height: 200 }, resizing: true },
    ]);
    expect(useCanvasStore.getState().resizeDriver).toBe('width');

    useCanvasStore.getState().settleResize('p', { x: 100, y: 200, width: 600, height: 450 });

    expect(useCanvasStore.getState().resizeDriver).toBeNull();
  });

  it('snaps the edge the pointer drives to a neighbour’s, and derives the other side from it', async () => {
    await connect(
      docOf([distorted(), browserNode('a', { x: 700, y: 200, width: 800, height: 600, order: 1 })], 2),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 595, height: 200 }, resizing: true },
    ]);

    expect(boxOf('p')).toEqual({ width: 600, height: 450 });
    expect(useCanvasStore.getState().snapGuides.map((guide) => guide.position)).toEqual([700]);
  });

  it('draws a guide for the driven edge alone, since the ratio overrode the other side’s snap', async () => {
    await connect(
      docOf(
        [
          distorted(),
          browserNode('a', { x: 700, y: 200, width: 800, height: 600, order: 1 }),
          browserNode('b', { x: 2000, y: 410, width: 800, height: 600, order: 2 }),
        ],
        3,
      ),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 595, height: 205 }, resizing: true },
    ]);

    expect(useCanvasStore.getState().snapGuides.map((guide) => guide.orientation)).toEqual(['vertical']);
    expect(boxOf('p')).toEqual({ width: 600, height: 450 });
  });

  it('draws the retained guide down the settled box, not the shorter one it was measured on', async () => {
    await connect(
      docOf([distorted(), browserNode('a', { x: 700, y: 200, width: 800, height: 100, order: 1 })], 2),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 595, height: 200 }, resizing: true },
    ]);

    // The lock took the box from 200 to 450 tall after the guide had been measured against the 200.
    expect(boxOf('p')).toEqual({ width: 600, height: 450 });
    expect(useCanvasStore.getState().snapGuides).toEqual([
      { orientation: 'vertical', position: 700, from: 200, to: 650 },
    ]);
  });

  it('anchors the edge the drag held, not one a filtered snap pulled back', async () => {
    await connect(
      docOf([distorted(), browserNode('a', { x: 700, y: 200, width: 800, height: 600, order: 1 })], 2),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'position', id: 'p', position: { x: 95, y: 198 } },
      { type: 'dimensions', id: 'p', dimensions: { width: 305, height: 202 }, resizing: true },
    ]);

    const held = useCanvasStore.getState().nodes.find((node) => node.id === 'p');
    expect((held?.position.y ?? 0) + (held?.height ?? 0)).toBe(400);
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
  });

  it('lets a picture already past the ceiling keep its size, as the handles and the snap do', async () => {
    await connect(
      docOf(
        [
          imageNode('p', {
            x: 0,
            y: 0,
            width: 12000,
            height: 3000,
            content: {
              imageId: 'img_p',
              name: 'panorama.png',
              originalWidth: 12000,
              originalHeight: 3000,
            },
          }),
        ],
        1,
      ),
    );

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 11_900, height: 3000 }, resizing: true },
    ]);

    expect(boxOf('p').width).toBeGreaterThan(8192);
  });

  it('draws a picture at the box the gesture holds, never at the measurement that trails it', async () => {
    await connect(
      docOf(
        [
          imageNode('p', {
            width: 280,
            height: 180,
            content: {
              imageId: 'img_p',
              name: 'photo.png',
              originalWidth: 280,
              originalHeight: 180,
            },
          }),
        ],
        1,
      ),
    );
    expect(drawnImageBox(useCanvasStore.getState(), 'p')).toEqual({ width: 280, height: 180 });

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 440, height: 180 }, resizing: true },
    ]);
    // What React Flow then hands the node as its `width`/`height`: the box it measured before the lock rewrote it.
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 440, height: 180 } },
    ]);

    expect(drawnImageBox(useCanvasStore.getState(), 'p')).toEqual(boxOf('p'));
    expect(drawnImageBox(useCanvasStore.getState(), 'p')?.height).toBeGreaterThan(180);
  });

  it('draws nothing for a picture the document has dropped', async () => {
    await connect(docOf([distorted()], 1));

    expect(drawnImageBox(useCanvasStore.getState(), 'gone')).toBeNull();
  });

  it('holds the ratio and draws nothing with no neighbour in reach', async () => {
    await connect(docOf([distorted()], 1));

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 600, height: 200 }, resizing: true },
    ]);

    expect(boxOf('p')).toEqual({ width: 600, height: 450 });
    expect(useCanvasStore.getState().snapGuides).toEqual([]);
  });

  it('moves a frame’s two sides apart: the lock is the picture’s alone', async () => {
    await connect(docOf([browserNode('a', { x: 0, y: 0, width: 800, height: 600 })], 1));

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1200, height: 600 }, resizing: true },
    ]);

    expect(boxOf('a')).toEqual({ width: 1200, height: 600 });
  });

  it('restores the stored original dimensions in one operation, leaving the corner put', async () => {
    const wire = await connect(docOf([distorted()], 1));

    useCanvasStore.getState().restoreImageAspectRatio('p');

    expect(wire.sent).toHaveLength(1);
    expect(singleOp(wire.sent[0])).toEqual({
      type: 'resize',
      id: 'p',
      x: 100,
      y: 200,
      width: 1600,
      height: 1200,
    });
  });

  it('authors nothing for a picture already at its originals, or for any other kind', async () => {
    const wire = await connect(
      docOf([distorted({ width: 1600, height: 1200 }), browserNode('a', { order: 1 }), textNode('t', { order: 2 })], 3),
    );

    useCanvasStore.getState().restoreImageAspectRatio('p');
    useCanvasStore.getState().restoreImageAspectRatio('a');
    useCanvasStore.getState().restoreImageAspectRatio('t');
    useCanvasStore.getState().restoreImageAspectRatio('ghost');

    expect(wire.sent).toEqual([]);
  });
});

describe('the text size bar (ONL-2486)', () => {
  const small = (id: string, order: number): TextNode =>
    textNode(id, { order, content: { text: 'a note', size: 'small' }, ...defaultTextBox('small') });
  const large = (id: string, order: number): TextNode =>
    textNode(id, { order, content: { text: 'a note', size: 'large' }, ...defaultTextBox('large') });

  it('shows for a selection of text nodes alone, and for nothing else', async () => {
    await connect(docOf([small('t', 0), large('u', 1), browserNode('a', { order: 2 })], 3));

    useCanvasStore.getState().selectFrame('t', false);
    expect(textSizeBar(useCanvasStore.getState()).ids).toEqual(['t']);

    useCanvasStore.getState().selectFrame('u', true);
    expect(textSizeBar(useCanvasStore.getState()).ids).toEqual(['t', 'u']);

    useCanvasStore.getState().selectFrame('a', true);
    expect(textSizeBar(useCanvasStore.getState()).ids).toEqual([]);

    useCanvasStore.getState().deselectFrames();
    expect(textSizeBar(useCanvasStore.getState()).ids).toEqual([]);
  });

  it('highlights the size the whole selection shares, and none when they differ', async () => {
    await connect(docOf([small('t', 0), small('u', 1), large('v', 2)], 3));

    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().selectFrame('u', true);
    expect(textSizeBar(useCanvasStore.getState()).size).toBe('small');

    useCanvasStore.getState().selectFrame('v', true);
    expect(textSizeBar(useCanvasStore.getState()).size).toBeNull();
  });

  it('applies a size as one operation per selected node in one request, each carrying its own new box', async () => {
    const wire = await connect(docOf([small('t', 0), large('u', 1)], 2));
    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().selectFrame('u', true);

    useCanvasStore.getState().setSelectedTextSize('medium');

    expect(wire.sent).toHaveLength(1);
    const ops = requestOps(wire.sent[0]);
    expect(ops.map((op) => ('id' in op ? op.id : null))).toEqual(['t', 'u']);
    for (const op of ops) {
      expect(op).toMatchObject({ type: 'set-text-size', size: 'medium' });
      if (op.type !== 'set-text-size') throw new Error('expected a size op');
      expect(op.width).toBeGreaterThan(0);
      expect(op.height).toBeGreaterThanOrEqual(defaultTextBox('medium').height);
    }
  });

  it('carries a taller box going up the ramp and a shorter one coming down', async () => {
    const wire = await connect(docOf([small('t', 0)], 1));
    useCanvasStore.getState().selectFrame('t', false);

    useCanvasStore.getState().setSelectedTextSize('large');
    const up = singleOp(wire.sent[0]);
    if (up.type !== 'set-text-size') throw new Error('expected a size op');
    expect(up.height).toBeGreaterThan(defaultTextBox('small').height);
  });

  it('writes nothing for the size the selection already is', async () => {
    const wire = await connect(docOf([small('t', 0), small('u', 1)], 2));
    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().selectFrame('u', true);

    useCanvasStore.getState().setSelectedTextSize('small');

    expect(wire.sent).toEqual([]);
  });

  it('leaves an open caret open, so a press on the bar never removes an untouched node', async () => {
    const wire = await connect(docOf([small('t', 0)], 1));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().setSelectedTextSize('large');

    expect(useCanvasStore.getState().textEditId).toBe('t');
    expect(requestOps(wire.sent[0]).map((op) => op.type)).toEqual(['set-text-size']);
  });

  it('writes nothing with no text node selected', async () => {
    const wire = await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().setSelectedTextSize('large');

    expect(wire.sent).toEqual([]);
  });
});

describe('which object wears the size badge (ONL-2501)', () => {
  const badge = (): string | null => dimensionBadgeNodeId(useCanvasStore.getState());

  it('answers the one selected node', async () => {
    await connect(docOf([textNode('t'), browserNode('a', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('t', false);

    expect(badge()).toBe('t');
  });

  it('answers none while that node is under the caret, and the node again once the caret closes', async () => {
    await connect(docOf([textNode('t')], 1));

    useCanvasStore.getState().beginTextEdit('t');
    expect(badge()).toBeNull();

    useCanvasStore.getState().commitTextEdit('a note to self\nabout it', defaultTextBox('medium'));

    expect(useCanvasStore.getState().textEditId).toBeNull();
    expect(badge()).toBe('t');
  });

  it('answers the selected node while a different one is under the caret', async () => {
    await connect(docOf([textNode('t'), textNode('u', { order: 1 })], 2));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().selectFrame('u', false);

    expect(useCanvasStore.getState().textEditId).toBe('t');
    expect(badge()).toBe('u');
  });

  it('answers a selected picture while text is under the caret elsewhere', async () => {
    await connect(docOf([textNode('t'), imageNode('p', { order: 1 })], 2));
    useCanvasStore.getState().beginTextEdit('t');

    useCanvasStore.getState().selectFrame('p', false);

    expect(badge()).toBe('p');
  });

  it('answers none for a gathered selection', async () => {
    await connect(docOf([textNode('t'), browserNode('a', { order: 1 })], 2));

    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().selectFrame('a', true);

    expect(badge()).toBeNull();
  });

  it('answers none while a resize reads the selected node out', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().selectFrame('a', false);

    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'a', dimensions: { width: 1000, height: 600 }, resizing: true },
    ]);

    expect(useCanvasStore.getState().resizeReadout?.id).toBe('a');
    expect(badge()).toBeNull();
  });

  it('answers the resized node again once the drag settles, with the caret still open elsewhere', async () => {
    await connect(docOf([textNode('t'), imageNode('p', { order: 1 })], 2));
    useCanvasStore.getState().beginTextEdit('t');
    useCanvasStore.getState().selectFrame('p', false);

    useCanvasStore.getState().beginResize('p');
    useCanvasStore.getState().onNodesChange([
      { type: 'dimensions', id: 'p', dimensions: { width: 500, height: 400 }, resizing: true },
    ]);
    expect(badge()).toBeNull();

    useCanvasStore.getState().settleResize('p', { x: 0, y: 0, width: 500, height: 400 });

    expect(useCanvasStore.getState().textEditId).toBe('t');
    expect(badge()).toBe('p');
  });

  it('answers none for an emptied text node still under the caret', async () => {
    await connect(docOf([textNode('t', { name: '', content: { text: '', size: 'medium' } })], 1));

    useCanvasStore.getState().beginTextEdit('t');

    expect(badge()).toBeNull();
  });
});

describe('what the canvas reports about its objects (ONL-2486)', () => {
  const MEASURED = { width: 212, height: 38 };
  let telemetry: { event: string; properties: Record<string, unknown> }[] = [];

  function events(name: string): Record<string, unknown>[] {
    return telemetry.filter((sent) => sent.event === name).map((sent) => sent.properties);
  }

  function placed(id: string, over: Partial<ImageNode> = {}): PlacedImage {
    const node = imageNode(id, over);
    const { order: _order, ...rest } = node;
    return rest;
  }

  beforeEach(() => {
    telemetry = [];
    // No project by default: the path is its own claim below, and a stray one would ride every other expectation.
    useWorkspaceStore.setState({ workspace: null });
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: (payload: (typeof telemetry)[number]) => telemetry.push(payload) } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    useWorkspaceStore.setState({ workspace: null });
  });

  it('sends the open worktree path for main to swap for a hash, and nothing else of the project', async () => {
    await connect(docOf([browserNode('a')], 1));
    useWorkspaceStore.setState({
      workspace: {
        workspacePath: '/ws/brave-otter',
        workspaceName: 'brave-otter',
        branchName: 'tester/brave-otter',
        baseBranch: 'main',
        sourceRepoName: 'site',
        sourcePath: '/Users/tester/site',
        sourceRepoRoot: '/Users/tester/site',
        repoIdentity: 'github.com/acme/site',
        copiedEnvFiles: [],
      },
    });

    useCanvasStore.getState().pasteCanvasText('a note', { x: 0, y: 0 });

    expect(events('text_node_created')).toEqual([
      { worktreePath: '/ws/brave-otter', method: 'paste', count: 1 },
    ]);
  });

  it('reports a label when it commits, not when the tool places it', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().setTool('text');
    useCanvasStore.getState().placeTextNode({ x: 40, y: 40 });

    expect(events('text_node_created')).toEqual([]);

    useCanvasStore.getState().commitTextEdit('ship it', MEASURED);

    expect(events('text_node_created')).toEqual([{ method: 'tool', count: 1 }]);
  });

  it('reports nothing for a placement left empty', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().placeTextNode({ x: 40, y: 40 });

    useCanvasStore.getState().commitTextEdit('   ', MEASURED);

    expect(events('text_node_created')).toEqual([]);
  });

  it('reports words pasted from outside as a label arriving by paste, and never the words', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().pasteCanvasText('the secret roadmap', { x: 0, y: 0 });

    expect(events('text_node_created')).toEqual([{ method: 'paste', count: 1 }]);
    expect(JSON.stringify(telemetry)).not.toContain('secret');
  });

  it('reports one arrival per kind when its own objects are pasted, each with that kind of count', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().pasteCanvasNodes(
      [textNode('t'), textNode('u'), imageNode('p')],
      { x: 0, y: 0 },
    );

    expect(events('text_node_created')).toEqual([{ method: 'paste', count: 2 }]);
    expect(events('image_node_created')).toEqual([{ method: 'paste', count: 1 }]);
  });

  it('reports one arrival per kind when a mixed selection is duplicated, and none for a frame', async () => {
    await connect(docOf([browserNode('a'), textNode('t', { order: 1 }), imageNode('p', { order: 2 })], 3));
    useCanvasStore.getState().selectFrame('a', false);
    useCanvasStore.getState().selectFrame('t', true);
    useCanvasStore.getState().selectFrame('p', true);

    useCanvasStore.getState().duplicateSelectedFrame();

    expect(events('text_node_created')).toEqual([{ method: 'duplicate', count: 1 }]);
    expect(events('image_node_created')).toEqual([{ method: 'duplicate', count: 1 }]);
  });

  it('reports a duplicated label once, and nothing for a duplicated frame', async () => {
    await connect(docOf([browserNode('a'), textNode('t', { order: 1 })], 2));

    useCanvasStore.getState().duplicateFrame('t');
    useCanvasStore.getState().duplicateFrame('a');

    expect(events('text_node_created')).toEqual([{ method: 'duplicate', count: 1 }]);
    expect(events('image_node_created')).toEqual([]);
  });

  it('reports a run of pictures once for the gesture, with how many landed and no filename', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore
      .getState()
      .placeImages([placed('p'), placed('q'), placed('r')], 'drop');

    expect(events('image_node_created')).toEqual([{ method: 'drop', count: 3 }]);
    expect(JSON.stringify(telemetry)).not.toContain('.png');
  });

  it('reports each gesture that brings pictures in under its own method', async () => {
    await connect(docOf([browserNode('a')], 1));

    useCanvasStore.getState().placeImages([placed('p')], 'paste');
    useCanvasStore.getState().placeImages([placed('q')], 'picker');

    expect(events('image_node_created').map((properties) => properties['method'])).toEqual([
      'paste',
      'picker',
    ]);
  });

  it('reports a distinct reason for every way a picture is refused, and how many it stands for', async () => {
    await connect(docOf([browserNode('a')], 1));

    for (const reason of ['unreadable', 'too-large', 'unsupported-format'] as const) {
      useCanvasStore.getState().raiseImageRefusal({ reason, name: 'pricing-v4.png', count: 2 }, 'drop');
    }
    useCanvasStore.getState().raiseImageRefusal({ reason: 'too-many-files', count: 41 }, 'drop');
    useCanvasStore.getState().raiseImageRefusal({ reason: 'no-image', count: 0 }, 'paste');

    expect(events('image_refused')).toEqual([
      { method: 'drop', reason: 'unreadable', count: 2 },
      { method: 'drop', reason: 'too-large', count: 2 },
      { method: 'drop', reason: 'unsupported-format', count: 2 },
      { method: 'drop', reason: 'too-many-files', count: 41 },
      { method: 'paste', reason: 'no-image', count: 0 },
    ]);
    expect(JSON.stringify(telemetry)).not.toContain('pricing-v4');
  });

  it('reports the size a change landed on and how many labels took it', async () => {
    await connect(
      docOf(
        [
          textNode('t', { content: { text: 'a note', size: 'small' } }),
          textNode('u', { order: 1, content: { text: 'a note', size: 'small' } }),
        ],
        2,
      ),
    );
    useCanvasStore.getState().selectFrame('t', false);
    useCanvasStore.getState().selectFrame('u', true);

    useCanvasStore.getState().setSelectedTextSize('large');

    expect(events('text_size_changed')).toEqual([{ size: 'large', node_count: 2 }]);
  });

  it('reports nothing for a size the selection already is', async () => {
    await connect(docOf([textNode('t', { content: { text: 'a note', size: 'small' } })], 1));
    useCanvasStore.getState().selectFrame('t', false);

    useCanvasStore.getState().setSelectedTextSize('small');

    expect(events('text_size_changed')).toEqual([]);
  });

  it('reports a handle resize of a picture by the method it used', async () => {
    await connect(docOf([imageNode('p')], 1));
    useCanvasStore.getState().beginResize('p');

    useCanvasStore.getState().settleResize('p', { x: 0, y: 0, width: 400, height: 250 });

    expect(events('image_resized')).toEqual([{ method: 'handle' }]);
  });

  it('reports a text handle gesture once, never its measurement or cancellation', async () => {
    await connect(docOf([textNode('t')], 1));
    const state = useCanvasStore.getState();
    state.beginResize('t');
    state.settleResize('t', { x: 0, y: 0, width: 720, height: 38 });
    state.settleResize('t', { x: 0, y: 0, width: 720, height: 38 });
    noteTextMeasured('t', { width: 200, height: 38 }, 'medium');
    state.beginResize('t');
    state.cancelResize();
    expect(events('text_resized')).toEqual([{ method: 'handle' }]);
    expect(events('image_resized')).toEqual([]);
  });

  it('reports a restored aspect ratio as its own resize', async () => {
    await connect(docOf([imageNode('p', { width: 900, height: 200 })], 1));

    useCanvasStore.getState().restoreImageAspectRatio('p');

    expect(events('image_resized')).toEqual([{ method: 'restore-aspect-ratio' }]);
  });

  it('reports nothing when a frame is resized, or when a restore has nothing to change', async () => {
    await connect(docOf([browserNode('a'), imageNode('p', { order: 1, width: 640, height: 400 })], 2));
    useCanvasStore.getState().beginResize('a');
    useCanvasStore.getState().settleResize('a', { x: 0, y: 0, width: 900, height: 700 });

    useCanvasStore.getState().restoreImageAspectRatio('p');

    expect(events('image_resized')).toEqual([]);
  });
});

describe('the camera places itself only for what it is owed (ONL-2486)', () => {
  const fitSeq = (): number | undefined => useCanvasStore.getState().fitRequest?.seq;

  it('asks for a fit when a document opens with content and no saved camera', async () => {
    await connect(docOf([browserNode('a')], 1));

    expect(fitSeq()).toBe(1);
  });

  it('asks for nothing when the canvas opens empty', async () => {
    await connect(docOf([], 1));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('leaves a placed label where the user put it, which the deferred mount fit used to move', async () => {
    await connect(docOf([], 1));
    const id = useCanvasStore.getState().placeTextNode({ x: 120, y: 80 });
    if (id === null) throw new Error('the placement was refused');
    useCanvasStore.getState().commitTextEdit('Checkout, final pass', { width: 269, height: 38 });
    const placed = textNode(id, {
      x: 120,
      y: 80,
      content: { text: 'Checkout, final pass', size: 'medium' },
    }) as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: placed }));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('brings the first frame on an empty canvas into view', async () => {
    await connect(docOf([], 1));
    const minted = browserNode('a') as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: minted }));

    expect(fitSeq()).toBe(1);
  });

  it("flies to the agent's first artifact on an empty page whose camera was saved", async () => {
    seedFlags({ 'blank-first-moment': true });
    useCanvasStore.getState().seedCamera({ x: -400, y: 300, zoom: 0.4 }, undefined);
    await connect(docOf([], 1));
    const artifact = { id: 'art', pageId: 'pg_main', kind: 'artifact', name: 'Launch card', order: 0, content: { artifactId: 'artifact-a', title: 'Launch card', pagePath: 'pages/index.html' }, x: 0, y: 0, width: 1200, height: 630 } as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: artifact }, 'agent'));

    expect(useCanvasStore.getState().fitRequest).toEqual({ seq: 1, animate: true });
  });

  it("leaves a saved camera alone for the user's own first frame", async () => {
    useCanvasStore.getState().seedCamera({ x: -400, y: 300, zoom: 0.4 }, undefined);
    await connect(docOf([], 1));
    const minted = browserNode('a') as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: minted }));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('leaves the camera to the inspiration flight, which seated it before the frame arrived (ONL-2960)', async () => {
    await connect(docOf([], 1));
    useCanvasStore.getState().beginInspiration('a');
    const minted = browserNode('a') as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: minted }));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('leaves the camera alone for a frame that joins nodes already there', async () => {
    await connect(docOf([textNode('t')], 1));
    useCanvasStore.getState().noteFitted();
    const joined = browserNode('a') as CanvasNode & { provenance?: never };
    fakeUpdate(entryOf(2, { type: 'create', node: joined }));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('never re-places the camera on a resync, which would move the user mid-session', async () => {
    await connect(docOf([browserNode('a')], 1));
    useCanvasStore.getState().noteFitted();

    useCanvasStore.getState().replaceDoc(docOf([browserNode('a'), browserNode('b')], 7));

    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });
});

describe('one page at a time reaches the canvas (ONL-2488)', () => {
  function pagedDoc(nodes: CanvasNode[], revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: {
        pg_a: { id: 'pg_a', name: 'Checkout', order: 0 },
        pg_b: { id: 'pg_b', name: 'Settings', order: 1 },
      },
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  const pageOf = (): string | null => currentCanvasPageId(useCanvasStore.getState());

  async function pushed(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, FRAME_FACTS_PUSH_MS + 30));
  }

  it('composes one page, and a switch recomposes it without touching the document', async () => {
    const wire = await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b2', { pageId: 'pg_b', order: 5 }),
        textNode('b1', { pageId: 'pg_b', order: 2 }),
      ]),
    );
    expect(canvasNodes()).toEqual(['a1']);
    const doc = useCanvasStore.getState().doc;

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(canvasNodes()).toEqual(['b1', 'b2']);
    expect(useCanvasStore.getState().doc).toBe(doc);
    expect(wire.sent).toEqual([]);
    expect(wire.sentPages).toEqual([
      { docId: DOC_ID, pageId: 'pg_a' },
      { docId: DOC_ID, pageId: 'pg_b' },
    ]);
  });

  it('drops the selection, which on return would be a surprise rather than a memory', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore.getState().selectFrame('a1', false);

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(selection()).toEqual([]);
  });

  it('shows the same set on a page left and returned to', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    expect(canvasNodes()).toEqual(['b1']);
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');

    expect(canvasNodes()).toEqual(['a1']);
  });

  it('follows a set-node-page echo off the current page and back onto it', async () => {
    await connect(pagedDoc([textNode('n', { pageId: 'pg_a', order: 0 })]));

    fakeUpdate(entryOf(2, { type: 'set-node-page', id: 'n', pageId: 'pg_b' }));
    expect(canvasNodes()).toEqual([]);

    fakeUpdate(entryOf(3, { type: 'set-node-page', id: 'n', pageId: 'pg_a' }));
    expect(canvasNodes()).toEqual(['n']);
  });

  it('composes a node whose page the document does not hold onto the first page', async () => {
    await connect(pagedDoc([textNode('orphan', { pageId: 'pg_gone', order: 0 })]));

    expect(canvasNodes()).toEqual(['orphan']);
  });

  it('refuses a page the document does not hold, rather than composing an empty canvas', async () => {
    const wire = await connect(pagedDoc([textNode('a1', { pageId: 'pg_a', order: 0 })]));

    useCanvasStore.getState().setCurrentPage('pg_gone', 'click');

    expect(pageOf()).toBe('pg_a');
    expect(canvasNodes()).toEqual(['a1']);
    expect(wire.sentPages).toEqual([{ docId: DOC_ID, pageId: 'pg_a' }]);
  });

  it('restores the page camera and settles the fit that would land after it', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    expect(useCanvasStore.getState().fitRequest?.seq).toBe(1);
    useCanvasStore.getState().noteCameraSettled({ x: -400, y: 120, zoom: 0.6 });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    useCanvasStore.getState().noteFitted();
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');

    expect(useCanvasStore.getState().viewportRequest?.camera).toEqual({ x: -400, y: 120, zoom: 0.6 });
    expect(useCanvasStore.getState().fitRequest).toBeNull();
    expect(useCanvasStore.getState().mountFitDone).toBe(true);
  });

  it('records the settled camera against the page it belongs to', async () => {
    const wire = await connect(pagedDoc([textNode('a1', { pageId: 'pg_a', order: 0 })]));

    useCanvasStore.getState().noteCameraSettled({ x: 8, y: 9, zoom: 1.5 });

    expect(wire.sentCameras).toEqual([
      { docId: DOC_ID, pageId: 'pg_a', camera: { x: 8, y: 9, zoom: 1.5 } },
    ]);
  });

  it('never saves a camera a capture is holding, and saves the next one the person settles on', async () => {
    const wire = await connect(pagedDoc([textNode('a1', { pageId: 'pg_a', order: 0 })]));

    useCanvasStore.getState().holdCaptureCamera(true);
    useCanvasStore.getState().noteCameraSettled({ x: 1, y: 2, zoom: 0.4 });
    useCanvasStore.getState().holdCaptureCamera(false);
    useCanvasStore.getState().noteCameraSettled({ x: 8, y: 9, zoom: 1.5 });

    expect(wire.sentCameras).toEqual([
      { docId: DOC_ID, pageId: 'pg_a', camera: { x: 8, y: 9, zoom: 1.5 } },
    ]);
  });

  it('opens a page with no camera and nothing on it at the origin, not the outgoing pan', async () => {
    await connect(pagedDoc([textNode('a1', { pageId: 'pg_a', order: 0 })]));
    useCanvasStore.getState().noteCameraSettled({ x: -900, y: -900, zoom: 0.2 });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().viewportRequest?.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('takes one fit on a page that holds nodes and has no camera', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore.getState().noteFitted();

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().fitRequest?.seq).toBe(1);
    expect(useCanvasStore.getState().viewportRequest).toBeNull();
  });

  it('keeps naming a frame on another page: absence in the push means removal', async () => {
    const wire = await connect(
      pagedDoc([
        browserNode('here', { pageId: 'pg_a', order: 0 }),
        browserNode('there', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    await pushed();
    expect(wire.sentFrames.at(-1)?.frames.map((frame) => frame.id).sort()).toEqual([
      'here',
      'there',
    ]);

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    expect(canvasNodes()).toEqual(['there']);
    noteFrameConsole('here', { level: 'log', text: 'still running' });
    await pushed();

    expect(wire.sentFrames.at(-1)?.frames.map((frame) => frame.id).sort()).toEqual([
      'here',
      'there',
    ]);
  });

  it('remounts a frame at the address it was last on, not its home url', async () => {
    await connect(
      pagedDoc([
        browserNode('a', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3000/a/deep' });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    expect(useCanvasStore.getState().overlay['a']?.currentUrl).toBe('http://localhost:3000/a/deep');
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');

    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:3000/a/deep');
  });

  it('keeps a node’s measured box across the page switch that unmounted it', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore
      .getState()
      .onNodesChange([{ type: 'dimensions', id: 'a1', dimensions: { width: 300, height: 48 } }]);
    expect(useCanvasStore.getState().measured['a1']).toEqual({ width: 300, height: 48 });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    // The node is still in the document; only its page went off screen.
    expect(useCanvasStore.getState().measured['a1']).toEqual({ width: 300, height: 48 });
  });

  it('drops a measured box when the node itself is removed, not when its page is left', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore
      .getState()
      .onNodesChange([{ type: 'dimensions', id: 'a1', dimensions: { width: 300, height: 48 } }]);

    // The document dropping it, which is the only thing that ends a node.
    useCanvasStore.getState().replaceDoc(pagedDoc([textNode('b1', { pageId: 'pg_b', order: 1 })], 2));

    expect(useCanvasStore.getState().measured['a1']).toBeUndefined();
  });

  it('takes the hover off a node when the page under the pointer changes', async () => {
    await connect(
      pagedDoc([
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    useCanvasStore.getState().hoverNode('a1');
    expect(useCanvasStore.getState().hoveredNodeId).toBe('a1');

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().hoveredNodeId).toBeNull();
  });

  it('selects a frame on another page rather than minting a second one at the same url', async () => {
    const wire = await connect(
      pagedDoc([
        textNode('note', { pageId: 'pg_a', order: 0 }),
        browserNode('a', { pageId: 'pg_b', order: 1 }),
      ]),
    );

    useCanvasStore.getState().openLocalLink('http://localhost:3000/a');

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['a']);
  });

  it('stamps the current page on a minted frame, label and picture', async () => {
    const wire = await connect(pagedDoc([]));
    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    useCanvasStore.getState().addFrame('http://localhost:3000/new');
    useCanvasStore.getState().pasteCanvasText('a note', { x: 0, y: 0 });
    useCanvasStore.getState().placeImages(
      [imageNode('shot') as unknown as PlacedImage],
      'paste',
    );

    const pages = wire.sent.flatMap((request) =>
      requestOps(request).flatMap((op) => (op.type === 'create' ? [op.node.pageId] : [])),
    );
    expect(pages).toEqual(['pg_b', 'pg_b', 'pg_b']);
  });

  it('asks for no fit when the page a document opens on holds nothing', async () => {
    await connect(pagedDoc([textNode('b1', { pageId: 'pg_b', order: 0 })]));

    expect(canvasNodes()).toEqual([]);
    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('leaves the camera alone for a frame the agent puts on a page nobody is looking at', async () => {
    await connect(pagedDoc([]));
    const elsewhere = browserNode('a', { pageId: 'pg_b' }) as CanvasNode & { provenance?: never };

    fakeUpdate(entryOf(2, { type: 'create', node: elsewhere }));

    expect(canvasNodes()).toEqual([]);
    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('stamps the target page on a paste, never the page the copy came from', async () => {
    const wire = await connect(pagedDoc([textNode('note', { pageId: 'pg_a', order: 0 })]));
    const copied = useCanvasStore.getState().doc?.nodes['note'] as TextNode;
    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    useCanvasStore.getState().pasteCanvasNodes([copied], { x: 40, y: 40 });

    const op = singleOp(wire.sent.at(-1));
    expect(op.type === 'duplicate' && op.node.pageId).toBe('pg_b');
  });
});

describe('the pages section authors its gestures (ONL-2488)', () => {
  function pagesDoc(pages: CanvasPage[], nodes: CanvasNode[] = [], revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: Object.fromEntries(pages.map((page) => [page.id, page])),
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  const TWO: CanvasPage[] = [
    { id: 'pg_a', name: 'Checkout', order: 0 },
    { id: 'pg_b', name: 'Settings', order: 1 },
  ];

  it('the plus appends a page past the last order and leaves its rename open', async () => {
    const wire = await connect(pagesDoc(TWO));

    const id = useCanvasStore.getState().createPage('Page 3');

    expect(id).not.toBeNull();
    const op = singleOp(wire.sent.at(-1));
    expect(op).toEqual({ type: 'create-page', page: { id: id as string, name: 'Page 3', order: 2 } });
    expect(useCanvasStore.getState().renamingPageId).toBe(id);
    // Not yet: the document does not hold the page until its echo lands.
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');

    fakeUpdate(entryOf(2, { type: 'create-page', page: { id: id as string, name: 'Page 3', order: 2 } }));

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe(id);
    expect(useCanvasStore.getState().renamingPageId).toBe(id);
  });

  it('leaves a page the agent takes away from under it, not just one the user left', async () => {
    const wire = await connect(pagesDoc(TWO));
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');

    // The agent's rename, arriving as an echo rather than as this seat's gesture.
    fakeUpdate(entryOf(2, { type: 'rename-page', pageId: 'pg_a', name: '---' }));

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(wire.sentPages.at(-1)).toEqual({ docId: DOC_ID, pageId: 'pg_b' });
  });

  it('keeps the page it is showing when another is reordered above it, and names it to main', async () => {
    const wire = await connect(pagesDoc(TWO));

    // Nothing was ever switched to, so the page is the one the arrival pinned.
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
    expect(wire.sentPages.at(-1)).toMatchObject({ pageId: 'pg_a' });

    fakeUpdate(entryOf(2, { type: 'reorder-page', pageId: 'pg_b', order: -1 }));

    // A reorder is not a switch: the view stays, and no switch was reported.
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
    expect(useCanvasStore.getState().viewportRequest).toBeNull();
  });

  it('gives a second page its own order when the first has not echoed back yet', async () => {
    const wire = await connect(pagesDoc(TWO));

    const first = useCanvasStore.getState().createPage('Page 3');
    // No echo in between: the document still ends at the order the first one took.
    const second = useCanvasStore.getState().createPage('Page 4');

    const orders = wire.sent
      .map((sent) => singleOp(sent))
      .filter((op) => op?.type === 'create-page')
      .map((op) => (op as { page: { order: number } }).page.order);
    expect(orders).toEqual([2, 3]);
    expect(first).not.toBe(second);
  });

  it('a page another seat created does not steal the view', async () => {
    await connect(pagesDoc(TWO));

    fakeUpdate(
      entryOf(2, { type: 'create-page', page: { id: 'pg_c', name: 'Agent', order: 2 } }, 'agent'),
    );

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
  });

  it('an empty or whitespace-only rename keeps the previous name and authors nothing', async () => {
    const wire = await connect(pagesDoc(TWO));
    useCanvasStore.getState().beginPageRename('pg_a');

    useCanvasStore.getState().renamePage('pg_a', '   ');

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().renamingPageId).toBeNull();
    expect(useCanvasStore.getState().doc?.pages['pg_a']?.name).toBe('Checkout');
  });

  it('a rename trims, and a name that did not change authors nothing', async () => {
    const wire = await connect(pagesDoc(TWO));

    useCanvasStore.getState().renamePage('pg_a', '  Basket  ');
    expect(singleOp(wire.sent.at(-1))).toEqual({
      type: 'rename-page',
      pageId: 'pg_a',
      name: 'Basket',
    });

    useCanvasStore.getState().renamePage('pg_b', 'Settings');
    expect(wire.sent).toHaveLength(1);
  });

  it('two pages may share a name, and the id is what switches', async () => {
    await connect(
      pagesDoc([
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_b', name: 'Checkout', order: 1 },
      ]),
    );

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
  });

  it('deleting a page holding objects removes each of them, then the page, as one request', async () => {
    const wire = await connect(
      pagesDoc(TWO, [
        textNode('n2', { pageId: 'pg_b', order: 2 }),
        textNode('n1', { pageId: 'pg_b', order: 1 }),
        textNode('n3', { pageId: 'pg_b', order: 3 }),
        textNode('keep', { pageId: 'pg_a', order: 0 }),
      ]),
    );

    useCanvasStore.getState().deletePage('pg_b', true);

    expect(requestOps(wire.sent.at(-1))).toEqual([
      { type: 'remove', id: 'n1' },
      { type: 'remove', id: 'n2' },
      { type: 'remove', id: 'n3' },
      { type: 'remove-page', pageId: 'pg_b' },
    ]);
  });

  it('deleting the current page leaves it first, so the destination camera is the one restored', async () => {
    const wire = await connect(pagesDoc(TWO));

    useCanvasStore.getState().deletePage('pg_a', true);

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(wire.sentPages.at(-1)).toEqual({ docId: DOC_ID, pageId: 'pg_b' });
    expect(requestOps(wire.sent.at(-1))).toEqual([{ type: 'remove-page', pageId: 'pg_a' }]);
  });

  it('a divider is never where a delete lands the user', async () => {
    const wire = await connect(
      pagesDoc([
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_div', name: '---', order: 1 },
        { id: 'pg_b', name: 'Settings', order: 2 },
      ]),
    );

    useCanvasStore.getState().deletePage('pg_a', true);

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(wire.sentPages.at(-1)).toEqual({ docId: DOC_ID, pageId: 'pg_b' });
  });

  it('the last page is not deletable — a project keeps one', async () => {
    const wire = await connect(pagesDoc([TWO[0] as CanvasPage]));

    useCanvasStore.getState().deletePage('pg_a', true);

    expect(wire.sent).toEqual([]);
  });

  it('a confirmed delete of the last page that is not a divider says so rather than doing nothing', async () => {
    const wire = await connect(
      pagesDoc([
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_div', name: '---', order: 1 },
      ]),
    );

    useCanvasStore.getState().deletePage('pg_a', true);

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().canvasRefusal?.code).toBe('last-non-divider-page');
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
  });

  it('a reorder authors its order once, and never re-authors the one it already has', async () => {
    const wire = await connect(pagesDoc(TWO));

    useCanvasStore.getState().reorderPage('pg_b', -1);
    useCanvasStore.getState().reorderPage('pg_a', 0);

    expect(wire.sent.map((request) => singleOp(request))).toEqual([
      { type: 'reorder-page', pageId: 'pg_b', order: -1 },
    ]);
  });
});

describe('moving objects to another page (ONL-2488)', () => {
  const TWO: CanvasPage[] = [
    { id: 'pg_a', name: 'Checkout', order: 0 },
    { id: 'pg_b', name: 'Settings', order: 1 },
  ];

  function pagesDoc(nodes: CanvasNode[], pages: CanvasPage[] = TWO, revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: Object.fromEntries(pages.map((page) => [page.id, page])),
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  it('sends one request for the whole selection, so the move undoes as one act', async () => {
    const wire = await connect(
      pagesDoc([
        textNode('n1', { pageId: 'pg_a', order: 0 }),
        textNode('n2', { pageId: 'pg_a', order: 1 }),
        textNode('n3', { pageId: 'pg_a', order: 2 }),
      ]),
    );

    useCanvasStore.getState().moveNodesToPage(['n1', 'n2', 'n3'], 'pg_b');

    expect(wire.sent).toHaveLength(1);
    expect(requestOps(wire.sent[0])).toEqual([
      { type: 'set-node-page', id: 'n1', pageId: 'pg_b' },
      { type: 'set-node-page', id: 'n2', pageId: 'pg_b' },
      { type: 'set-node-page', id: 'n3', pageId: 'pg_b' },
    ]);
  });

  it('leaves the page empty rather than following the objects that left it', async () => {
    const wire = await connect(pagesDoc([textNode('only', { pageId: 'pg_a', order: 0 })]));
    useCanvasStore.getState().selectFrame('only', false);
    const fitBefore = useCanvasStore.getState().fitRequest;
    const viewportBefore = useCanvasStore.getState().viewportRequest;

    useCanvasStore.getState().moveNodesToPage(['only'], 'pg_b');
    fakeUpdate(entryOf(2, { type: 'set-node-page', id: 'only', pageId: 'pg_b' }));

    expect(canvasNodes()).toEqual([]);
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
    expect(wire.sentPages).toEqual([{ docId: DOC_ID, pageId: 'pg_a' }]);
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(useCanvasStore.getState().fitRequest).toBe(fitBefore);
    expect(useCanvasStore.getState().viewportRequest).toBe(viewportBefore);
  });

  it('authors nothing for a page the document no longer holds, so the revision stays put', async () => {
    const wire = await connect(pagesDoc([textNode('n', { pageId: 'pg_a', order: 0 })]));

    useCanvasStore.getState().moveNodesToPage(['n'], 'pg_gone');

    expect(wire.sent).toEqual([]);
    expect(useCanvasStore.getState().doc?.revision).toBe(1);
  });

  it('authors nothing for an object already on the page, or for one the document dropped', async () => {
    const wire = await connect(
      pagesDoc([
        textNode('here', { pageId: 'pg_b', order: 0 }),
        textNode('n', { pageId: 'pg_a', order: 1 }),
      ]),
    );

    useCanvasStore.getState().moveNodesToPage(['here'], 'pg_b');
    expect(wire.sent).toEqual([]);

    useCanvasStore.getState().moveNodesToPage(['ghost', 'n'], 'pg_b');
    expect(requestOps(wire.sent.at(-1))).toEqual([
      { type: 'set-node-page', id: 'n', pageId: 'pg_b' },
    ]);
  });
});

describe('reaching a node that is not on screen (ONL-2488)', () => {
  function pagedDoc(nodes: CanvasNode[], revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: {
        pg_a: { id: 'pg_a', name: 'Checkout', order: 0 },
        pg_b: { id: 'pg_b', name: 'Settings', order: 1 },
      },
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  const twoPages = (): Promise<FakeWire> =>
    connect(
      pagedDoc([
        browserNode('here', { pageId: 'pg_a', order: 0 }),
        browserNode('there', { pageId: 'pg_b', order: 1, x: 900, y: 400 }),
      ]),
    );

  async function pushed(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, FRAME_FACTS_PUSH_MS + 30));
  }

  it('switches to the page holding the node, then centres it', async () => {
    const wire = await twoPages();

    const answered = useCanvasStore.getState().flyToFrame('there');

    expect(answered).toBe(true);
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(wire.sentPages.at(-1)).toEqual({ docId: DOC_ID, pageId: 'pg_b' });
    const state = useCanvasStore.getState();
    // The centre resolves against the composed array the switch just rebuilt: a success that moves nothing is the bug.
    expect(canvasFlyToCenter(state.flyTo, state.nodes)).not.toBeNull();
  });

  it('never names a rule, however the page was reached: main refuses one, and the two sides would part', async () => {
    // A page renamed to a rule keeps the nodes that were on it, so a chat link can still point at one.
    const wire = await connect({
      schemaVersion: 1,
      docId: DOC_ID,
      revision: 1,
      pages: {
        pg_a: { id: 'pg_a', name: 'Checkout', order: 0 },
        pg_rule: { id: 'pg_rule', name: '---', order: 1 },
        pg_c: { id: 'pg_c', name: 'Settings', order: 2 },
      },
      nodes: Object.fromEntries(
        [
          browserNode('here', { pageId: 'pg_a', order: 0 }),
          browserNode('ruled', { pageId: 'pg_rule', order: 1, x: 900, y: 400 }),
          browserNode('below', { pageId: 'pg_c', order: 2 }),
        ].map((node) => [node.id, node]),
      ),
    });

    useCanvasStore.getState().flyToFrame('ruled');

    // Both sides land on the page below the rule, and main is told that page rather than the rule.
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_c');
    expect(useCanvasStore.getState().currentPageId).toBe('pg_c');
    expect(wire.sentPages.at(-1)).toEqual({ docId: DOC_ID, pageId: 'pg_c' });
    expect(wire.sentPages.some((save) => save.pageId === 'pg_rule')).toBe(false);
  });

  it('leaves the page alone for a node already on it', async () => {
    const wire = await twoPages();

    expect(useCanvasStore.getState().flyToFrame('here')).toBe(true);

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
    expect(wire.sentPages).toEqual([{ docId: DOC_ID, pageId: 'pg_a' }]);
    const state = useCanvasStore.getState();
    expect(canvasFlyToCenter(state.flyTo, state.nodes)).not.toBeNull();
  });

  it('answers false for a node the document no longer holds, and moves nothing', async () => {
    const wire = await twoPages();

    expect(useCanvasStore.getState().flyToFrame('gone')).toBe(false);

    expect(useCanvasStore.getState().flyTo).toBeNull();
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');
    expect(wire.sentPages).toEqual([{ docId: DOC_ID, pageId: 'pg_a' }]);
  });

  it('keeps the selection a local link just made when the frame is on another page', async () => {
    await twoPages();
    useCanvasStore.getState().patchFrame('there', { currentUrl: 'http://localhost:3000/there' });

    useCanvasStore.getState().openLocalLink('http://localhost:3000/there');

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(useCanvasStore.getState().selectedNodeIds).toEqual(['there']);
  });

  it('reports an off-page frame’s console lines, buffered before and after the switch', async () => {
    const wire = await twoPages();
    noteFrameConsole('here', { level: 'error', text: 'boom before' });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    noteFrameConsole('here', { level: 'error', text: 'boom after' });
    await pushed();

    const lines = wire.sentFrames.flatMap((push) => push.console ?? []).filter((held) => held.id === 'here');
    expect(lines.flatMap((held) => held.lines.map((line) => line.text))).toEqual([
      'boom before',
      'boom after',
    ]);
    expect(wire.sentFrames.at(-1)?.frames.map((frame) => frame.id).sort()).toEqual(['here', 'there']);
  });
});

describe('each page opens at the camera the LAST session left it at (ONL-2488)', () => {
  function pagedDoc(nodes: CanvasNode[] = []): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision: 1,
      pages: {
        pg_a: { id: 'pg_a', name: 'Checkout', order: 0 },
        pg_b: { id: 'pg_b', name: 'Settings', order: 1 },
      },
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  it('asks main for every page of the document it just took', async () => {
    const wire = await connect(pagedDoc());

    expect(wire.pageCameraRequests).toEqual([{ docId: DOC_ID }]);
  });

  it('restores a page never visited this session to its own stored camera', async () => {
    await connect(pagedDoc([textNode('b1', { pageId: 'pg_b', order: 0 })]), {
      pg_b: { x: -240, y: 96, zoom: 0.75 },
    });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().viewportRequest?.camera).toEqual({ x: -240, y: 96, zoom: 0.75 });
    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('leaves a stored page alone and still opens an unstored empty one at the origin', async () => {
    await connect(pagedDoc(), { pg_a: { x: -900, y: -900, zoom: 0.2 } });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().viewportRequest?.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(useCanvasStore.getState().fitRequest).toBeNull();
  });

  it('takes one fit on an unstored page that holds nodes', async () => {
    await connect(pagedDoc([textNode('b1', { pageId: 'pg_b', order: 0 })]), {
      pg_a: { x: 5, y: 5, zoom: 2 },
    });
    useCanvasStore.getState().noteFitted();

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(useCanvasStore.getState().fitRequest?.seq).toBe(1);
    expect(useCanvasStore.getState().viewportRequest).toBeNull();
  });

  it('keeps where this session left a page over what the durable copy says', async () => {
    await connect(pagedDoc(), { pg_a: { x: 1, y: 1, zoom: 1.5 } });
    useCanvasStore.getState().noteCameraSettled({ x: 70, y: 80, zoom: 0.9 });

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');

    expect(useCanvasStore.getState().viewportRequest?.camera).toEqual({ x: 70, y: 80, zoom: 0.9 });
  });
});

describe('a refused page operation reaches the user in the renderer\'s words (ONL-2488)', () => {
  function pagesDoc(pages: CanvasPage[]): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision: 1,
      pages: Object.fromEntries(pages.map((page) => [page.id, page])),
      nodes: {},
    };
  }

  const ONE: CanvasPage[] = [{ id: 'pg_a', name: 'Checkout', order: 0 }];

  it('holds the typed code the band words, and never the prose main composed', async () => {
    const wire = await connect(pagesDoc(ONE));

    wire.emitRejected({
      docId: DOC_ID,
      code: 'last-non-divider-page',
      reason: 'rename-page: page "pg_a" is the last page that is not a divider — a project keeps one',
    });

    const refusal = useCanvasStore.getState().canvasRefusal;
    expect(refusal?.code).toBe('last-non-divider-page');
    expect(JSON.stringify(refusal)).not.toContain('rename-page');
    expect(JSON.stringify(refusal)).not.toContain('pg_a');
  });

  it('a second refusal is a new notice, so a dismissed band opens again', async () => {
    const wire = await connect(pagesDoc(ONE));

    wire.emitRejected({ docId: DOC_ID, code: 'last-page', reason: 'the last page' });
    const first = useCanvasStore.getState().canvasRefusal?.seq;
    wire.emitRejected({ docId: DOC_ID, code: 'last-page', reason: 'the last page' });

    expect(useCanvasStore.getState().canvasRefusal?.seq).toBeGreaterThan(first ?? 0);
  });

  it('a refusal the renderer has no words for shows nothing, as it did before', async () => {
    const wire = await connect(pagesDoc(ONE));

    wire.emitRejected({ docId: DOC_ID, reason: 'request must carry either op or ops' });

    expect(useCanvasStore.getState().canvasRefusal).toBeNull();
  });

  it('a refusal against another document reaches no band', async () => {
    const wire = await connect(pagesDoc(ONE));

    wire.emitRejected({ docId: 'some-other-doc', code: 'last-page', reason: 'the last page' });

    expect(useCanvasStore.getState().canvasRefusal).toBeNull();
  });

  it('dismissing closes it', async () => {
    const wire = await connect(pagesDoc(ONE));
    wire.emitRejected({ docId: DOC_ID, code: 'no-such-page', reason: 'no page "pg_x"' });

    useCanvasStore.getState().dismissCanvasRefusal();

    expect(useCanvasStore.getState().canvasRefusal).toBeNull();
  });
});

describe("the current page never rests on a rule, whoever renamed it (ONL-2488)", () => {
  const THREE: CanvasPage[] = [
    { id: 'pg_a', name: 'Checkout', order: 0 },
    { id: 'pg_b', name: 'Settings', order: 1 },
    { id: 'pg_c', name: 'Billing', order: 2 },
  ];

  function pagesDoc(pages: CanvasPage[], nodes: CanvasNode[] = [], revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: Object.fromEntries(pages.map((page) => [page.id, page])),
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  it("an agent rename of the current page moves current to the first page below that is not a rule", async () => {
    await connect(
      pagesDoc(THREE, [
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('b1', { pageId: 'pg_b', order: 1 }),
      ]),
    );
    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_a');

    fakeUpdate(entryOf(2, { type: 'rename-page', pageId: 'pg_a', name: '---' }, 'agent'));

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
    expect(canvasNodes()).toEqual(['b1']);
  });

  it('falls back to the first page above when nothing below can be rested on', async () => {
    await connect(pagesDoc(THREE));
    useCanvasStore.getState().setCurrentPage('pg_c', 'click');

    fakeUpdate(entryOf(2, { type: 'rename-page', pageId: 'pg_c', name: '---' }, 'agent'));

    expect(currentCanvasPageId(useCanvasStore.getState())).toBe('pg_b');
  });
});

describe('what the panel reports about its pages (ONL-2488)', () => {
  const TWO: CanvasPage[] = [
    { id: 'pg_a', name: 'Checkout', order: 0 },
    { id: 'pg_b', name: 'Settings', order: 1 },
  ];

  function pagesDoc(pages: CanvasPage[], nodes: CanvasNode[] = [], revision = 1): CanvasDoc {
    return {
      schemaVersion: 1,
      docId: DOC_ID,
      revision,
      pages: Object.fromEntries(pages.map((page) => [page.id, page])),
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
  }

  let telemetry: { event: string; properties: Record<string, unknown> }[] = [];

  function events(name: string): Record<string, unknown>[] {
    return telemetry.filter((sent) => sent.event === name).map((sent) => sent.properties);
  }

  beforeEach(() => {
    telemetry = [];
    useWorkspaceStore.setState({ workspace: null });
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: (payload: (typeof telemetry)[number]) => telemetry.push(payload) } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    useWorkspaceStore.setState({ workspace: null });
  });

  it('a switch reports the method and how many objects the page arrived at holds', async () => {
    await connect(
      pagesDoc(TWO, [
        textNode('b1', { pageId: 'pg_b', order: 0 }),
        textNode('b2', { pageId: 'pg_b', order: 1 }),
      ]),
    );

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');

    expect(events('page_switched')[0]).toMatchObject({
      method: 'click',
      node_count: 2,
    });
    expect(events('page_switched')[0]?.['ms_since_open']).toBeGreaterThanOrEqual(0);
  });

  it('reports a switch to an empty page, with zero rather than nothing (ONL-2488)', async () => {
    await connect(pagesDoc(TWO, [textNode('a1', { pageId: 'pg_a', order: 0 })]));

    useCanvasStore.getState().setCurrentPage('pg_b', 'keyboard');

    expect(events('page_switched')[0]).toMatchObject({ method: 'keyboard', node_count: 0 });
  });

  it('the plus reports its own method, and the echo that makes the page current reports the switch', async () => {
    await connect(pagesDoc(TWO));

    const id = useCanvasStore.getState().createPage('Billing');
    fakeUpdate(entryOf(2, { type: 'create-page', page: { id: id!, name: 'Billing', order: 2 } }));

    expect(events('page_created')).toEqual([{ method: 'plus' }]);
    expect(events('page_switched')[0]).toMatchObject({ method: 'created', node_count: 0 });
  });

  it('a rename reports whether the page became a rule, never the name it took', async () => {
    await connect(pagesDoc(TWO));

    useCanvasStore.getState().renamePage('pg_b', 'Pricing v4');
    useCanvasStore.getState().renamePage('pg_b', '---');

    expect(events('page_renamed')).toEqual([
      { method: 'user', became_divider: false },
      { method: 'user', became_divider: true },
    ]);
    expect(JSON.stringify(telemetry)).not.toContain('Pricing');
  });

  it('a delete reports whether the page held objects and whether the user was asked', async () => {
    await connect(
      pagesDoc(TWO, [textNode('b1', { pageId: 'pg_b', order: 0 })], 1),
    );

    useCanvasStore.getState().deletePage('pg_b', true);

    expect(events('page_deleted')).toEqual([
      { method: 'user', had_nodes: true, confirmed: true },
    ]);
  });

  it('an empty page deletes with no prompt, and says so', async () => {
    await connect(pagesDoc(TWO));

    useCanvasStore.getState().deletePage('pg_b', false);

    expect(events('page_deleted')).toEqual([
      { method: 'user', had_nodes: false, confirmed: false },
    ]);
  });

  it('a move reports how many objects went, once for the whole gesture', async () => {
    await connect(
      pagesDoc(TWO, [
        textNode('a1', { pageId: 'pg_a', order: 0 }),
        textNode('a2', { pageId: 'pg_a', order: 1 }),
      ]),
    );

    useCanvasStore.getState().moveNodesToPage(['a1', 'a2'], 'pg_b');

    expect(events('page_nodes_moved')).toEqual([{ method: 'menu', node_count: 2 }]);
  });

  it('no page event carries a page name, an object name or any content (ONL-2488)', async () => {
    await connect(
      pagesDoc(
        [
          { id: 'pg_a', name: 'Checkout', order: 0 },
          { id: 'pg_b', name: 'Pricing v4', order: 1 },
        ],
        [textNode('b1', { pageId: 'pg_b', order: 0, name: 'hero headline' })],
      ),
    );

    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    useCanvasStore.getState().renamePage('pg_b', 'Pricing v5');
    useCanvasStore.getState().moveNodesToPage(['b1'], 'pg_a');
    useCanvasStore.getState().deletePage('pg_b', true);

    const sent = JSON.stringify(telemetry.filter((row) => row.event.startsWith('page_')));
    expect(sent).not.toContain('Pricing');
    expect(sent).not.toContain('Checkout');
    expect(sent).not.toContain('hero headline');
    expect(sent).not.toContain('pg_b');
  });

  describe('how many of the arriving page’s artifacts came up covered (ONL-2791)', () => {
    const FIRST = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
    const SECOND = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    const BARE = 'cccccccc-3333-4333-8333-cccccccccccc';
    const GONE = 'dddddddd-4444-4444-8444-dddddddddddd';
    const PICTURE = 'data:image/png;base64,last-render';
    const PAGE_PATH = 'pages/index.html';
    const UPDATED_AT = '2026-10-27T09:00:00.000Z';
    const ALL = [FIRST, SECOND, BARE, GONE];

    const records = new Map<string, ArtifactSummary | null>();
    const pictures = new Map<string, string>();
    const pictureKey = (request: ArtifactPreviewRequest): string =>
      `${request.artifactId}|${request.pagePath}|${request.updatedAt}`;
    let restoreImage: (() => void) | undefined;

    function artifactNode(id: string, artifactId: string, pageId: string, order: number): CanvasNode {
      return {
        id,
        pageId,
        kind: 'artifact',
        name: id,
        x: 0,
        y: 0,
        width: 480,
        height: 640,
        order,
        content: { artifactId, title: 'Pricing idea', pagePath: PAGE_PATH },
      };
    }

    /** `pages` carries the node's path, or a real node reads missing and shows no cover at all. */
    async function seedRecord(artifactId: string, pages = [{ path: PAGE_PATH, name: 'Home' }]): Promise<void> {
      records.set(artifactId, {
        id: artifactId,
        title: 'Pricing idea',
        pagePath: PAGE_PATH,
        pages,
        updatedAt: UPDATED_AT,
        readOnly: false,
      });
      await resolveArtifact(artifactId);
    }

    async function seedPicture(artifactId: string): Promise<void> {
      const request: ArtifactPreviewRequest = { artifactId, pagePath: PAGE_PATH, updatedAt: UPDATED_AT };
      pictures.set(pictureKey(request), PICTURE);
      const stop = artifactPreviewDemand.watch(request, () => undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));
      stop();
    }

    beforeEach(() => {
      records.clear();
      pictures.clear();
      Object.defineProperty(globalThis, 'window', {
        value: {
          studio: {
            telemetryEvent: (payload: (typeof telemetry)[number]) => telemetry.push(payload),
            artifactRead: async ({ artifactId }: { artifactId: string }) => records.get(artifactId) ?? null,
            artifactPreview: async (request: ArtifactPreviewRequest): Promise<ArtifactPreviewResult> => {
              const image = pictures.get(pictureKey(request));
              return image === undefined ? { outcome: 'missing' } : { outcome: 'ready', image };
            },
          },
        },
        configurable: true,
        writable: true,
      });
      // The demand layer awaits `decode()` on the picture it was handed, which nothing here implements (ONL-2791).
      const own = Object.getOwnPropertyDescriptor(globalThis, 'Image');
      Object.defineProperty(globalThis, 'Image', {
        value: class { src = ''; decode(): Promise<void> { return Promise.resolve(); } },
        configurable: true,
        writable: true,
      });
      restoreImage = () => {
        if (own) Object.defineProperty(globalThis, 'Image', own);
        else Reflect.deleteProperty(globalThis, 'Image');
      };
    });

    afterEach(() => {
      restoreImage?.();
      restoreImage = undefined;
      for (const artifactId of ALL) {
        forgetArtifact(artifactId);
        artifactPreviewDemand.forget(artifactId);
      }
    });

    it('counts the page’s artifacts and the ones that arrived with a picture', async () => {
      await seedRecord(FIRST);
      await seedRecord(SECOND);
      await seedRecord(BARE);
      await seedPicture(FIRST);
      await seedPicture(SECOND);
      await connect(
        pagesDoc(TWO, [
          artifactNode('art1', FIRST, 'pg_b', 0),
          artifactNode('art2', SECOND, 'pg_b', 1),
          artifactNode('art3', BARE, 'pg_b', 2),
          textNode('b1', { pageId: 'pg_b', order: 3 }),
        ]),
      );

      useCanvasStore.getState().setCurrentPage('pg_b', 'click');

      expect(events('page_switched')[0]).toMatchObject({
        node_count: 4,
        artifact_node_count: 3,
        artifact_cover_held_count: 2,
      });
    });

    it('a picture for a page the record no longer carries is not a cover', async () => {
      await seedRecord(FIRST, [{ path: 'pages/other.html', name: 'Other' }]);
      await seedPicture(FIRST);
      await connect(pagesDoc(TWO, [artifactNode('art1', FIRST, 'pg_b', 0)]));

      useCanvasStore.getState().setCurrentPage('pg_b', 'click');

      expect(events('page_switched')[0]).toMatchObject({
        artifact_node_count: 1,
        artifact_cover_held_count: 0,
      });
    });

    it('a remembered picture with no record behind it is not a cover', async () => {
      await seedRecord(GONE);
      await seedPicture(GONE);
      records.set(GONE, null);
      forgetArtifact(GONE);
      await resolveArtifact(GONE);
      await connect(pagesDoc(TWO, [artifactNode('art1', GONE, 'pg_b', 0)]));

      useCanvasStore.getState().setCurrentPage('pg_b', 'click');

      expect(events('page_switched')[0]).toMatchObject({
        artifact_node_count: 1,
        artifact_cover_held_count: 0,
      });
    });

    it('counts a session snapshot as its own layer, never as a durable cover', async () => {
      await seedRecord(BARE);
      await artifactSnapshots.capture(
        `artS:studio-artifact://${BARE}/${PAGE_PATH}:${UPDATED_AT}`,
        () => true,
        async () => ({ image: PICTURE, width: 480, height: 640 }),
      );
      await connect(pagesDoc(TWO, [artifactNode('artS', BARE, 'pg_b', 0)]));

      useCanvasStore.getState().setCurrentPage('pg_b', 'click');

      // Two layers can cover a node and they are not interchangeable: only the cover survives a relaunch.
      expect(events('page_switched')[0]).toMatchObject({
        artifact_node_count: 1,
        artifact_cover_held_count: 0,
        artifact_snapshot_held_count: 1,
      });
    });

    it('a page with no artifacts reports zero of each, rather than nothing', async () => {
      await connect(pagesDoc(TWO, [textNode('b1', { pageId: 'pg_b', order: 0 })]));

      useCanvasStore.getState().setCurrentPage('pg_b', 'click');

      expect(events('page_switched')[0]).toMatchObject({
        node_count: 1,
        artifact_node_count: 0,
        artifact_cover_held_count: 0,
        artifact_snapshot_held_count: 0,
      });
    });
  });
});

describe('a refusal the renderer knew without asking (ONL-2488)', () => {
  it('raises the last-page code, so a delete on the only page is not a silent no-op (ONL-2488)', async () => {
    await connect({
      schemaVersion: 1,
      docId: DOC_ID,
      revision: 1,
      pages: { pg_a: { id: 'pg_a', name: 'Checkout', order: 0 } },
      nodes: {},
    });

    useCanvasStore.getState().raiseCanvasRefusal('last-page');

    expect(useCanvasStore.getState().canvasRefusal?.code).toBe('last-page');
  });
});

describe('a port move landing on a frame whose server died (ONL-2568)', () => {
  it('re-seats the mount, because an error page is not a page to keep', async () => {
    await connect(docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 1));
    useCanvasStore.getState().patchFrame('a', { health: 'unreachable' });

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4000/' }, 'system'));

    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:4000/');
    expect(targets()).toEqual([undefined]);
  });

  it('re-seats a live frame immediately after the system accepts its new port', async () => {
    await connect(docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 1));
    useCanvasStore.getState().patchFrame('a', { health: 'live' });

    fakeUpdate(entryOf(2, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4000/' }, 'system'));

    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
    expect(targets()).toEqual([undefined]);
  });
});

describe('a moved address that arrives through a resync (ONL-2568)', () => {
  for (const superseding of ['second-frame', 'general-resync', 'unrelated-update'] as const) {
    it(`keeps every trusted system move when its resync overlaps ${superseding}`, async () => {
      const frames = (port: number) => ['a', 'b'].map((id) => browserNode(id, { content: { homeUrl: `http://localhost:${port}/${id}` } }));
      const wire = await connect(docOf(frames(3000), 1));
      for (const id of ['a', 'b']) useCanvasStore.getState().patchFrame(id, { health: 'live' });
      wire.answerSnapshotsWith(docOf(frames(4000), 5));
      fakeUpdate(entryOf(3, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4000/a' }, 'system'));
      if (superseding === 'second-frame') fakeUpdate(entryOf(4, { type: 'set-home-url', id: 'b', homeUrl: 'http://localhost:4000/b' }, 'system'));
      else if (superseding === 'unrelated-update') fakeUpdate(entryOf(4, { type: 'rename', id: 'b', name: 'Details' }, 'user'));
      else await resyncCanvas();
      await settled();
      expect(useCanvasStore.getState().overlay.a?.guestEpoch).toBe(1);
      if (superseding === 'second-frame') expect(useCanvasStore.getState().overlay.b?.guestEpoch).toBe(1);
    });
  }

  for (const currentUrl of ['https://accounts.example.test/authorize', 'http://localhost:3001/settings']) {
    it(`keeps live navigation to ${currentUrl} when the stored home did not move`, async () => {
      const doc = docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 1);
      await connect(doc);
      useCanvasStore.getState().patchFrame('a', { currentUrl, health: 'live' });

      await resyncCanvas();

      expect(targets()).toEqual([undefined]);
      expect(frameNodes()[0]?.data.currentUrl).toBe(currentUrl);
    });
  }

  it('re-seats the mount at the trusted system origin recovered through a gap', async () => {
    const wire = await connect(
      docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 1),
    );
    useCanvasStore
      .getState()
      .patchFrame('a', { currentUrl: 'http://localhost:3000/', health: 'unreachable' });

    // The move lands past the mirror's next revision, so the entry is dropped and the snapshot carries it.
    wire.answerSnapshotsWith(
      docOf([browserNode('a', { content: { homeUrl: 'http://localhost:4000/' } })], 4),
    );
    fakeUpdate(entryOf(4, { type: 'set-home-url', id: 'a', homeUrl: 'http://localhost:4000/' }, 'system'));
    await settled();

    expect(homeUrlOf(useCanvasStore.getState().doc, 'a')).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.homeUrl).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.currentUrl).toBe('http://localhost:4000/');
    expect(frameNodes()[0]?.data.guestEpoch).toBe(1);
    expect(targets()).toEqual([undefined]);
  });

  it('leaves a frame the designer took deeper into the same origin where it stands', async () => {
    const wire = await connect(
      docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 1),
    );
    useCanvasStore.getState().patchFrame('a', { currentUrl: 'http://localhost:3000/settings' });

    wire.answerSnapshotsWith(
      docOf([browserNode('a', { content: { homeUrl: 'http://localhost:3000/' } })], 4),
    );
    fakeUpdate(entryOf(4, { type: 'rename', id: 'a', name: 'Home' }, 'user'));
    await settled();

    expect(targets()).toEqual([undefined]);
  });
});
