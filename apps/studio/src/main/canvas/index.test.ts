import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  CANVAS_IMAGE_ARRIVAL_MAX_SIDE,
  MAX_CANVAS_OPS_PER_REQUEST,
  defaultTextBox,
  type BrowserNode,
  type CanvasDoc,
  type CanvasNode,
  type CanvasOpEntry,
  type CanvasOpRequest,
  type CanvasRejection,
  type CanvasUpdate,
} from '@studio/events';
import {
  cleanupTempFixtures,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
  settle,
} from '@studio/fixtures';
import type { WebContents } from 'electron';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { registerView, unregisterView } from '../tabs/views.js';
import {
  initTelemetry,
  peekQueueForTesting,
  workspaceTelemetryId,
  resetTelemetryForTesting,
  setAppForTesting,
  type AppLike,
} from '../telemetry/index.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import type { CanvasDocLoad, CanvasDocumentStore } from './adapter.js';
import { createReverifyMoveAuthor, resolveCreateArtifactOps } from './authors.js';
import { createArtifactStore } from '../artifacts/store.js';
import { prepareArtifactPlacements } from '../artifacts/copy.js';
import { resetArtifactIndexCache } from '../artifacts/state.js';
import { canvasCensus } from './census.js';
import { applyOp, emptyCanvasDoc, firstCanvasPageId } from './document.js';
import { canvasLogPath } from './dir.js';
import { canvasDir, canvasDocPath, createFsDocumentStore } from './fs-backend.js';
import { readCanvasLog } from './log.js';
import { readImage, registerImage, resetImagesStore, settlePending } from '../images/store.js';
import {
  applyAgentCreateFrame,
  applyAgentCreateImage,
  applyStartingFrame,
  noteFrameGuestLoaded,
  removeStartingFrame,
  setFrameQuoteSource,
  applyAgentCreatePage,
  applyAgentCreateText,
  applyAgentDeletePage,
  applyAgentDuplicateFrames,
  applyAgentFrameUrl,
  applyAgentMoveFrames,
  applyAgentMoveNodesToPage,
  applyAgentRemoveFrames,
  applyAgentRenamePage,
  applyAgentReorderFrame,
  applyAgentReorderPage,
  applyAgentSetText,
  listAgentPages,
  applyCanvasOps,
  captureAgentFrame,
  captureThumbnailOnLeave,
  canvasSnapshot,
  canvasSnapshotFor,
  flushCanvas,
  markProjectDirty,
  snapshotForView,
  listAgentFrames,
  frameShowsPage,
  frameShownOver,
  canvasPagedSnapshotFor,
  canvasPresentationFor,
  createCanvasHost,
  CANVAS_UNDO_MAX_ENTRIES,
  setCanvasCurrentPage,
  undoAgentCanvas,
  regularFileSize,
  type CanvasHost,
  type CanvasHostDeps,
  openCanvasForProject,
} from './index.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from './registry.js';
import { createServerEntry, recordPortMeasurement } from '../server/book.js';
import { resetCanvasCameraCache, writeCanvasCamera } from './camera.js';
import { noteFramesForTesting, resetFrameMirrorForTesting } from './mirror.js';
import {
  resetThumbnailServiceForTesting,
  thumbnailService,
  type ThumbnailOutcome,
} from './thumbnail/index.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-host-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetCanvasRegistryCache();
  return root;
}

function makeHost(deps: Pick<CanvasHostDeps, 'preparePlacements' | 'onPlacementsCommitted' | 'saveArtifactDimensions'> = {}): {
  host: ReturnType<typeof createCanvasHost>;
  updates: CanvasUpdate[];
  rejections: CanvasRejection[];
  marked: string[];
} {
  const updates: CanvasUpdate[] = [];
  const rejections: CanvasRejection[] = [];
  const marked: string[] = [];
  const host = createCanvasHost({
    ...deps,
    store: createFsDocumentStore(),
    emitUpdate: (update) => updates.push(update),
    emitRejection: (rejection) => rejections.push(rejection),
    markDirty: (docId) => marked.push(docId),
  });
  return { host, updates, rejections, marked };
}

const browserNode = (id: string, docId: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: firstCanvasPageId(docId),
  kind: 'browser',
  name: 'checkout',
  x: 0,
  y: 0,
  width: 1280,
  height: 800,
  order: 0,
  content: { homeUrl: 'http://localhost:3000' },
});

it('bounds both undo and redo without leaving a partial oldest batch', async () => {
  const root = useOwnWorkspaceRoot('bounded-undo');
  const worktree = join(root, 'worktree');
  const host = createCanvasHost({
    store: {
      async load(docId) {
        const doc = emptyCanvasDoc(docId);
        const pageId = firstCanvasPageId(docId);
        doc.pages[pageId] = { id: pageId, name: 'Page', order: 0 };
        doc.nodes['frame'] = browserNode('frame', docId);
        return { outcome: 'existing', doc };
      },
      async persist() {},
      async appendHistory() {},
      async readHistory() { return []; },
      subscribe() { return () => {}; },
    },
    emitUpdate() {},
    emitRejection() {},
    markDirty() {},
  });
  await host.open(worktree);
  const batchCount = Math.floor(CANVAS_UNDO_MAX_ENTRIES / 3) + 1;
  for (let index = 0; index < batchCount; index += 1) {
    expect(await host.apply('user', () => [
      { type: 'move', id: 'frame', x: index * 3 + 1, y: 0 },
      { type: 'move', id: 'frame', x: index * 3 + 2, y: 0 },
      { type: 'move', id: 'frame', x: index * 3 + 3, y: 0 },
    ], worktree)).toMatchObject({ ok: true });
  }
  const retainedBatches = Math.floor(CANVAS_UNDO_MAX_ENTRIES / 3);
  for (let index = 0; index < retainedBatches; index += 1) {
    expect(await host.undoFor(worktree)).toMatchObject({ ok: true, applied: true });
  }
  expect(await host.undoFor(worktree)).toMatchObject({ ok: true, applied: false });
  expect((await host.snapshot()).doc?.nodes['frame']?.x).toBe(3);
  for (let index = 0; index < retainedBatches; index += 1) {
    expect(await host.redoFor(worktree)).toMatchObject({ ok: true, applied: true });
  }
  expect(await host.redoFor(worktree)).toMatchObject({ ok: true, applied: false });
  expect((await host.snapshot()).doc?.nodes['frame']?.x).toBe(batchCount * 3);
  await host.close(worktree);
});

it('remembers only committed artifact resizes, including undo and redo, not moves or rejected batches', async () => {
  const root = useOwnWorkspaceRoot('artifact-dimensions');
  const worktree = join(root, 'worktree');
  const saved: unknown[] = [];
  const { host } = makeHost({ saveArtifactDimensions: (id, dimensions) => saved.push({ id, ...dimensions }) });
  await host.open(worktree);
  const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  await host.apply('user', (doc) => [{ type: 'create', node: {
    id: 'artifact', pageId: firstCanvasPageId(doc.docId), kind: 'artifact', name: '',
    x: 0, y: 0, width: 480, height: 640, order: 0, content: { artifactId: id, title: 'Study' },
  } }], worktree);
  expect(saved).toEqual([{ id, width: 480, height: 640 }]);
  saved.length = 0;
  const resize = { type: 'resize' as const, id: 'artifact', x: 0, y: 0, width: 960, height: 540 };
  expect(await host.apply('user', () => [resize, { ...resize, id: 'missing' }], worktree)).toMatchObject({ ok: false });
  expect(saved).toEqual([]);
  expect(await host.apply('user', () => [resize], worktree)).toMatchObject({ ok: true });
  expect(await host.undoFor(worktree)).toMatchObject({ ok: true, applied: true });
  expect(await host.redoFor(worktree)).toMatchObject({ ok: true, applied: true });
  await host.apply('agent', () => [{ type: 'move', id: 'artifact', x: 100, y: 100 }], worktree);
  expect(saved).toEqual([{ id, width: 960, height: 540 }, { id, width: 480, height: 640 }, { id, width: 960, height: 540 }]);
  await host.close(worktree);
});

it('keeps the last resized size through remove undo and resolves queued agent geometry from the current manifest', async () => {
  const previousRoot = process.env['STUDIO_STATE_ROOT'];
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'canvas-artifact-sizes' });
  resetArtifactIndexCache();
  const root = useOwnWorkspaceRoot('artifact-size-order');
  const worktree = join(root, 'worktree');
  const store = createArtifactStore();
  const made = await store.create({ title: 'Study', html: '<h1>Study</h1>' });
  if ('code' in made) throw new Error(made.reason);
  const { host } = makeHost({
    saveArtifactDimensions: (id, dimensions, options) => { store.saveDimensions(id, dimensions, options); },
    preparePlacements: (ops, author) => prepareArtifactPlacements(store, ops, { reuseDimensions: author === 'user' }),
  });
  try {
    await host.open(worktree);
    await host.apply('user', (doc) => ['first', 'second'].map((id) => ({ type: 'create', node: {
      id, pageId: firstCanvasPageId(doc.docId), kind: 'artifact', name: '', x: 0, y: 0, width: 480, height: 640, order: 0,
      content: { artifactId: made.id, title: made.title, pagePath: made.pagePath },
    } })), worktree);
    await host.apply('user', () => [{ type: 'resize', id: 'second', x: 1000, y: 0, width: 960, height: 540 }], worktree);
    await host.apply('user', () => [{ type: 'remove', id: 'first' }], worktree);
    await host.undoFor(worktree);
    expect(await store.readManifest(made.id)).toMatchObject({ dimensions: { width: 960, height: 540 } });
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    const resizing = host.apply('user', async () => {
      await waiting;
      return [{ type: 'resize', id: 'second', x: 1000, y: 0, width: 900, height: 500 }];
    }, worktree);
    const placing = host.apply('agent', async (doc) => {
      const manifest = await store.readManifest(made.id);
      return resolveCreateArtifactOps(doc, { artifactId: made.id, title: made.title, pagePath: made.pagePath, beside: 'first', side: 'left', dimensions: manifest?.dimensions });
    }, worktree);
    release();
    expect(await resizing).toMatchObject({ ok: true });
    const placed = await placing;
    expect(placed).toMatchObject({ ok: true, entries: [{ op: { node: { x: -1000, width: 900, height: 500 } } }] });
    expect(await store.readManifest(made.id)).toMatchObject({ dimensions: { width: 900, height: 500 } });
    const otherProject = join(root, 'another');
    await host.open(otherProject);
    expect(await host.apply('agent', async (doc) => resolveCreateArtifactOps(doc, { artifactId: made.id, title: made.title, pagePath: made.pagePath, dimensions: (await store.readManifest(made.id))?.dimensions }), otherProject)).toMatchObject({ ok: true, entries: [{ op: { node: { width: 900, height: 500 } } }] });
  } finally {
    await host.flushAll();
    if (previousRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = previousRoot;
    resetArtifactIndexCache();
  }
});

it('opens a future document without changing its registry association or any saved bytes', async () => {
  const root = useOwnWorkspaceRoot('future-association');
  const worktree = join(root, 'worktree');
  const docId = canvasDocIdFor(worktree);
  mkdirSync(canvasDir(), { recursive: true });
  const original = JSON.stringify({ version: 99, data: { docId, future: true } });
  writeFileSync(canvasDocPath(docId), original);
  const { host } = makeHost();
  await host.open(worktree);
  expect((await host.snapshot()).doc?.docId).toBe(docId);
  expect(canvasDocIdFor(worktree)).toBe(docId);
  expect(await host.apply('user', (doc) => [{ type: 'create', node: browserNode('frame', doc.docId) }], worktree)).toMatchObject({ ok: true });
  await host.close(worktree);
  expect(readFileSync(canvasDocPath(docId), 'utf8')).toBe(original);
  expect(readCanvasLog(canvasLogPath(docId))).toEqual([]);
});

it('dirties only open projects that place the changed Artifact, including shared placements', async () => {
  const root = useOwnWorkspaceRoot('artifact-thumbnails');
  const test = makeHost();
  const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  const paths = ['first', 'second', 'unrelated'].map((name) => join(root, name));
  for (const path of paths) {
    await test.host.open(path);
    if (path === paths[2]) continue;
    await test.host.apply('user', (doc) => [{ type: 'create', node: {
      id: 'artifact', pageId: firstCanvasPageId(doc.docId), kind: 'artifact', name: 'Card',
      x: 0, y: 0, width: 1000, height: 625, order: 0, content: { artifactId, title: 'Card' },
    } }], path);
  }
  test.marked.length = 0;
  test.host.artifactChanged(artifactId);
  expect(test.marked.sort()).toEqual(paths.slice(0, 2).map(canvasDocIdFor).sort());
  test.marked.length = 0;
  test.host.artifactChanged('not-placed');
  expect(test.marked).toHaveLength(0);
  await test.host.close(paths[0]!);
  test.marked.length = 0;
  test.host.artifactChanged(artifactId);
  expect(test.marked).toEqual([canvasDocIdFor(paths[1]!)]);
});

const textNode = (id: string, docId: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: firstCanvasPageId(docId),
  kind: 'text',
  name: 'label',
  x: 0,
  y: 0,
  width: 480,
  height: 38,
  order: 1,
  content: { text: 'checkout', size: 'medium' },
});

const imageNode = (id: string, docId: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: firstCanvasPageId(docId),
  kind: 'image',
  name: 'reference',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  order: 2,
  content: { imageId: 'blob-1', name: 'reference', originalWidth: 1600, originalHeight: 1200 },
});

const homeUrlOf = (doc: CanvasDoc | null | undefined, id: string): string | undefined =>
  (doc?.nodes[id] as BrowserNode | undefined)?.content.homeUrl;

describe('canvas:snapshot — the subscribe-time answer', () => {
  it('answers { doc: null } before any project opens — the honest no-document shape', async () => {
    useOwnWorkspaceRoot('snapshot-null');
    const { host } = makeHost();
    expect(await host.snapshot()).toEqual({ doc: null });
  });

  it('answers the FORWARD document after a switch — and the outgoing one is still loaded', async () => {
    const root = useOwnWorkspaceRoot('snapshot-switch');
    const outgoing = join(root, 'repo', 'outgoing');
    const incoming = join(root, 'repo', 'incoming');
    const { host } = makeHost();

    await host.open(outgoing);
    const outgoingId = canvasDocIdFor(outgoing);
    await host.handleOpRequest({
      docId: outgoingId,
      op: { type: 'create', node: browserNode('fr_out', outgoingId) },
    });

    await host.open(incoming);
    expect((await host.snapshot()).doc?.docId).toBe(canvasDocIdFor(incoming));

    expect((await host.snapshotFor(outgoing)).doc?.nodes['fr_out']).toBeDefined();

    await host.flushAll();
    const persisted = JSON.parse(readFileSync(canvasDocPath(outgoingId), 'utf8')) as {
      data: CanvasDoc;
    };
    expect(persisted.data.revision).toBe(2);
    expect(persisted.data.nodes['fr_out']).toBeDefined();
  });
});

describe('canvas:snapshot binds to the ASKING view (ONL-2270)', () => {
  function fakeContents(id: number): WebContents {
    return {
      id,
      isDestroyed: (): boolean => false,
      send: (): void => undefined,
      once: (): void => undefined,
    } as unknown as WebContents;
  }

  it('answers no document for a view the registry does not know', async () => {
    const root = useOwnWorkspaceRoot('view-unregistered');
    const forward = join(root, 'repo', 'forward');
    await openCanvasForProject(forward);
    const created = await applyAgentCreateFrame(forward, { url: 'http://localhost:3000' });
    if (!created.ok) throw new Error(`expected a create, got: ${created.reason}`);

    expect((await canvasSnapshot()).doc?.docId).toBe(canvasDocIdFor(forward));

    expect(await snapshotForView(9270)).toEqual({ doc: null });

    const asking = fakeContents(9271);
    registerView(asking, forward);
    expect((await snapshotForView(9271)).doc?.docId).toBe(canvasDocIdFor(forward));

    unregisterView(asking);
    await flushCanvas();
  });
});

describe('the emits carry the document id', () => {
  it('an accepted user op broadcasts canvas:update with the docId, stamped author user', async () => {
    const root = useOwnWorkspaceRoot('update-docid');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });

    expect(updates).toHaveLength(2);
    expect(updates[1]?.docId).toBe(docId);
    expect(updates[1]?.entry.revision).toBe(2);
    expect(updates[1]?.entry.author).toBe('user');
    expect(rejections).toHaveLength(0);
  });

  it('an op addressed to a document that is not open rejects under the REQUESTED id, and moves nothing', async () => {
    const root = useOwnWorkspaceRoot('reject-foreign');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    await host.handleOpRequest({
      docId: 'doc_someone_else',
      op: { type: 'create', node: browserNode('fr_1', canvasDocIdFor(worktree)) },
    });

    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.docId).toBe('doc_someone_else');
    expect(updates).toHaveLength(1);
    expect((await host.snapshot()).doc?.revision).toBe(1);
  });

  it('a declined apply (missing node) rejects under the OPEN id; the revision is unmoved', async () => {
    const root = useOwnWorkspaceRoot('reject-apply');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'fr_ghost', x: 10, y: 10 } });

    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.docId).toBe(docId);
    expect(updates).toHaveLength(1);
    expect((await host.snapshot()).doc?.revision).toBe(1);
  });
});

describe('main-side authoring', () => {
  it('no renderer-origin path can author a port change: the canvas:op boundary stamps user, whatever the request smuggles', async () => {
    const root = useOwnWorkspaceRoot('author-stamp');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });

    const smuggled = {
      docId,
      op: { type: 'set-home-url', id: 'fr_1', homeUrl: 'http://localhost:5173/' },
      author: 'system',
      entry: { author: 'system' },
    } as unknown as Parameters<typeof host.handleOpRequest>[0];
    await host.handleOpRequest(smuggled);

    expect(updates).toHaveLength(3);
    expect(updates[2]?.entry.author).toBe('user');
    expect(updates[2]?.entry.op).toEqual({
      type: 'set-home-url',
      id: 'fr_1',
      homeUrl: 'http://localhost:5173/',
    });
  });

  it('apply resolves against the open document in one step and answers the fresh result in-call', async () => {
    const root = useOwnWorkspaceRoot('author-apply');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    const early = await host.apply('system', () => [{ type: 'remove', id: 'fr_1' }]);
    expect(early.ok).toBe(false);

    await host.open(worktree);
    await host.handleOpRequest({
      docId: canvasDocIdFor(worktree),
      op: { type: 'create', node: browserNode('fr_1', canvasDocIdFor(worktree)) },
    });

    const result = await host.apply('system', (doc) => [
      {
        type: 'set-home-url',
        id: Object.keys(doc.nodes)[0] ?? '',
        homeUrl: 'http://localhost:5173/',
      },
    ]);
    if (!result.ok) throw new Error(`expected acceptance, got: ${result.reason}`);
    expect(result.doc.revision).toBe(3);
    expect(homeUrlOf(result.doc, 'fr_1')).toBe('http://localhost:5173/');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.author).toBe('system');
    expect(updates).toHaveLength(3);
    expect(updates[2]?.entry.author).toBe('system');
    expect(rejections).toHaveLength(0);
  });

  it('preflights a main-authored array, gives it one batch id, and rejects invalid arrays atomically', async () => {
    const root = useOwnWorkspaceRoot('author-batch');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });

    const accepted = await host.apply('agent', () => [
      { type: 'move', id: 'fr_1', x: 10, y: 20 },
      { type: 'move', id: 'fr_2', x: 30, y: 40 },
    ]);
    if (!accepted.ok) throw new Error(`expected acceptance, got: ${accepted.reason}`);
    expect(accepted.entries).toHaveLength(2);
    expect(accepted.entries[0]?.batchId).toBeString();
    expect(accepted.entries[1]?.batchId).toBe(accepted.entries[0]?.batchId);

    const before = await host.snapshot();
    const updateCount = updates.length;
    const rejected = await host.apply('agent', () => [
      { type: 'move', id: 'fr_1', x: 100, y: 200 },
      { type: 'move', id: 'fr_missing', x: 300, y: 400 },
    ]);
    expect(rejected.ok).toBe(false);
    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(updateCount);
  });

  it('preflights a renderer array before emitting any member', async () => {
    const root = useOwnWorkspaceRoot('renderer-batch-invalid');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    const before = await host.snapshot();

    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 100, y: 200 },
        { type: 'move', id: 'fr_missing', x: 300, y: 400 },
      ],
    });

    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(2);
    expect(rejections).toHaveLength(1);

    await host.handleOpRequest({ docId, ops: [] });
    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(2);
    expect(rejections).toHaveLength(2);
  });

  it('finishes an atomic batch when one renderer broadcast sink throws', async () => {
    const root = useOwnWorkspaceRoot('batch-broadcast-failure');
    const worktree = join(root, 'repo', 'w');
    let throwNextUpdate = false;
    const host = createCanvasHost({
      store: createFsDocumentStore(),
      emitUpdate: () => {
        if (!throwNextUpdate) return;
        throwNextUpdate = false;
        throw new Error('closed renderer');
      },
      emitRejection: () => {},
      markDirty: () => {},
    });
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });

    throwNextUpdate = true;
    const batch = await host.apply('agent', () => [
      { type: 'rename', id: 'fr_1', name: 'first' },
      { type: 'rename', id: 'fr_1', name: 'second' },
    ]);
    expect(batch.ok).toBe(true);
    expect((await host.snapshot()).doc?.nodes['fr_1']?.name).toBe('second');

    const next = await host.apply('agent', () => [
      { type: 'rename', id: 'fr_1', name: 'third' },
    ]);
    expect(next.ok).toBe(true);
    expect((await host.snapshot()).doc?.nodes['fr_1']?.name).toBe('third');
  });

  it('persists only the final document snapshot of an atomic batch', async () => {
    const root = useOwnWorkspaceRoot('batch-persist-final');
    const worktree = join(root, 'repo', 'w');
    const persisted: CanvasDoc[] = [];
    let stored: CanvasDoc | null = null;
    const store: CanvasDocumentStore = {
      load: async (docId) =>
        stored === null
          ? { outcome: 'fresh', doc: emptyCanvasDoc(docId) }
          : { outcome: 'existing', doc: stored },
      persist: async (doc) => {
        stored = doc;
        persisted.push(doc);
      },
      appendHistory: async () => {},
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const host = createCanvasHost({ store, emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.flushAll();
    persisted.length = 0;

    await host.open(worktree);
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'rename', id: 'fr_1', name: 'first' },
        { type: 'rename', id: 'fr_1', name: 'second' },
      ],
    });
    await host.flushAll();

    expect(persisted.map((doc) => doc.revision)).toEqual([4]);
  });

  it("records an atomic batch's history in ONE append, entries in order (ONL-2026)", async () => {
    const root = useOwnWorkspaceRoot('batch-history-one-append');
    const worktree = join(root, 'repo', 'w');
    const appends: { docId: string; revisions: number[] }[] = [];
    let stored: CanvasDoc | null = null;
    const store: CanvasDocumentStore = {
      load: async (docId) =>
        stored === null
          ? { outcome: 'fresh', doc: emptyCanvasDoc(docId) }
          : { outcome: 'existing', doc: stored },
      persist: async (doc) => {
        stored = doc;
      },
      appendHistory: async (docId, entries) => {
        appends.push({ docId, revisions: entries.map((entry) => entry.revision) });
      },
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const host = createCanvasHost({ store, emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    appends.length = 0;

    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'rename', id: 'fr_1', name: 'first' },
        { type: 'rename', id: 'fr_1', name: 'second' },
      ],
    });
    await host.flushAll();

    expect(appends).toEqual([{ docId, revisions: [3, 4] }]);
  });

  it('places nothing when the destination is discarded while placements are checked', async () => {
    const root = useOwnWorkspaceRoot('placements-discarded');
    let published = 0;
    let host: CanvasHost;
    const made = makeHost({ onPlacementsCommitted: () => { published += 1; }, preparePlacements: async (ops) => {
      host.discard();
      return { ok: true, ops: [...ops] };
    } });
    host = made.host;
    await host.open(join(root, 'repo', 'w'));
    const snapshot = await host.snapshot();
    if (snapshot.doc === null) throw new Error('No destination canvas');
    await host.handleOpRequest({ docId: snapshot.doc.docId, op: { type: 'create', node: browserNode('fr_late', snapshot.doc.docId) } });
    expect(published).toBe(0);
    expect(made.rejections).toHaveLength(1);
    expect(made.updates.some((update) => update.entry.op.type === 'create')).toBe(false);
    expect((await host.snapshot()).doc).toBeNull();
  });

  it('rejects oversized renderer and main-authored arrays before applying any member', async () => {
    const root = useOwnWorkspaceRoot('op-array-limit');
    const worktree = join(root, 'repo', 'w');
    let copyRequests = 0;
    const { host, updates, rejections } = makeHost({ preparePlacements: async (ops) => {
      copyRequests += 1;
      return { ok: true, ops: [...ops] };
    } });

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    const before = await host.snapshot();
    copyRequests = 0;
    const oversized = Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST + 1 }, (_, index) => ({
      type: 'rename' as const,
      id: 'fr_1',
      name: `name-${index}`,
    }));

    await host.handleOpRequest({ docId, ops: oversized });
    expect(copyRequests).toBe(0);
    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(2);
    expect(rejections).toHaveLength(1);

    const authored = await host.apply('agent', () => oversized);
    expect(authored.ok).toBe(false);
    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(2);
  });

  it('accepts the operation-array boundary and owns every multi-op batch identity', async () => {
    const root = useOwnWorkspaceRoot('op-array-boundary');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    const boundary = Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST }, (_, index) => ({
      type: 'rename' as const,
      id: 'fr_1',
      name: `boundary-${index}`,
    }));
    const staleRendererIdentity = 'renderer-controlled-batch';

    await host.handleOpRequest({
      docId,
      ops: boundary,
      batchId: staleRendererIdentity,
    } as CanvasOpRequest & { batchId: string });
    const firstBatch = updates.at(-1)?.entry.batchId;
    expect(firstBatch).toBeString();
    expect(firstBatch).not.toBe(staleRendererIdentity);
    expect(
      updates
        .slice(-MAX_CANVAS_OPS_PER_REQUEST)
        .every((update) => update.entry.batchId === firstBatch),
    ).toBe(true);

    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'rename', id: 'fr_1', name: 'next-1' },
        { type: 'rename', id: 'fr_1', name: 'next-2' },
      ],
      batchId: staleRendererIdentity,
    } as CanvasOpRequest & { batchId: string });
    expect(updates.at(-1)?.entry.batchId).toBeString();
    expect(updates.at(-1)?.entry.batchId).not.toBe(firstBatch);

    await host.handleOpRequest({ docId, op: { type: 'rename', id: 'fr_1', name: 'singleton' } });
    expect(updates.at(-1)?.entry.batchId).toBeUndefined();
  });
});

describe('the starting frame a blank project gets for its first ask (ONL-2960)', () => {
  function fakeContents(id: number): WebContents {
    return { id, isDestroyed: (): boolean => false, send: (): void => undefined, once: (): void => undefined } as unknown as WebContents;
  }

  it('lands one browser-sized frame at the starter, named as asked, and refuses a canvas that already holds a frame', async () => {
    const root = useOwnWorkspaceRoot('starting-frame');
    const worktree = join(root, 'repo', 'blank');
    await openCanvasForProject(worktree);

    const placed = await applyStartingFrame(worktree, { url: 'http://localhost:4712', name: 'Home' });
    expect(placed).toMatchObject({ name: 'Home', width: 1512, height: 982, content: { homeUrl: 'http://localhost:4712/' } });
    expect(await applyStartingFrame(worktree, { url: 'http://localhost:4712', name: 'Home' })).toBeUndefined();

    await removeStartingFrame(worktree, placed!.id);
    expect(Object.keys((await canvasSnapshotFor(worktree)).doc?.nodes ?? {})).toEqual([]);
    await flushCanvas();
  });

  it("answers the asking view's snapshot with its quotes, and tells the source which frame loaded and what the document became (ONL-2960)", async () => {
    const root = useOwnWorkspaceRoot('frame-quotes');
    const worktree = join(root, 'repo', 'blank');
    await openCanvasForProject(worktree);
    const loaded: string[] = [];
    const documents: number[] = [];
    setFrameQuoteSource({
      view: () => ({ byFrame: { f1: 'A bakery site' }, turnRunning: true }),
      guestLoaded: (_path, frameId) => loaded.push(frameId),
      looked: () => undefined,
      documentChanged: (_path, doc) => documents.push(Object.keys(doc.nodes).length),
    });
    const asking = fakeContents(9601);
    registerView(asking, worktree);
    try {
      expect((await snapshotForView(9601)).quotes).toEqual({ byFrame: { f1: 'A bakery site' }, turnRunning: true });
      noteFrameGuestLoaded(canvasDocIdFor(worktree), 'f1');
      expect(loaded).toEqual(['f1']);
      expect((await applyAgentCreateFrame(worktree, { url: 'http://localhost:4700' })).ok).toBe(true);
      expect(documents).toEqual([1]);
    } finally {
      setFrameQuoteSource(undefined);
      unregisterView(asking);
      await flushCanvas();
    }
  });
});

describe("the agent write binds to its session's project (ONL-1998)", () => {
  it('group verbs answer with every frame they affected', async () => {
    const root = useOwnWorkspaceRoot('bind-group-applies');
    const worktree = join(root, 'repo', 'a');
    await openCanvasForProject(worktree);
    const first = await applyAgentCreateFrame(worktree, {
      url: 'http://localhost:3000',
      x: 0,
      y: 0,
    });
    const second = await applyAgentCreateFrame(worktree, {
      url: 'http://localhost:3001',
      x: 100,
      y: 50,
    });
    if (!first.ok || !second.ok) throw new Error('expected both frames to be created');

    const moved = await applyAgentMoveFrames(worktree, {
      frameIds: [first.node.id, second.node.id],
      deltaX: 20,
      deltaY: 30,
    });
    expect(moved).toMatchObject({ ok: true, nodes: [{ x: 20, y: 30 }, { x: 120, y: 80 }] });

    const copied = await applyAgentDuplicateFrames(worktree, {
      frameIds: [first.node.id, second.node.id],
      offsetX: 40,
      offsetY: -10,
    });
    expect(copied.ok).toBe(true);
    if (!copied.ok) throw new Error(copied.reason);
    expect(copied.nodes.map((node) => [node.x, node.y])).toEqual([
      [60, 20],
      [160, 70],
    ]);

    const removed = await applyAgentRemoveFrames(worktree, {
      frameIds: copied.nodes.map((node) => node.id),
    });
    expect(removed.ok ? removed.removed.map((node) => node.id) : []).toEqual(
      copied.nodes.map((node) => node.id),
    );
    await flushCanvas();
  });

  it("writes to its OWN project's document while another is forward, and never the other's", async () => {
    const root = useOwnWorkspaceRoot('bind-declines');
    const sessionWorktree = join(root, 'repo', 'a');
    const incoming = join(root, 'repo', 'b');

    await openCanvasForProject(sessionWorktree);
    const created = await applyAgentCreateFrame(sessionWorktree, {
      url: 'http://localhost:3000',
    });
    if (!created.ok) throw new Error(`expected a create, got: ${created.reason}`);

    await openCanvasForProject(incoming);

    const outcome = await applyAgentFrameUrl(
      created.node.id,
      'http://localhost:5173',
      sessionWorktree,
    );
    expect(outcome).toMatchObject({ ok: true });
    expect((await listAgentFrames(sessionWorktree)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:5173/',
    ]);

    const snapshot = await canvasSnapshot();
    expect(snapshot.doc?.docId).toBe(canvasDocIdFor(incoming));
    expect(snapshot.doc?.revision).toBe(1);
    expect(snapshot.doc?.nodes).toEqual({});

    const stray = await applyAgentMoveFrames(join(root, 'repo', 'never-opened'), {
      frameIds: [created.node.id],
      deltaX: 1,
      deltaY: 1,
    });
    expect(stray.ok).toBe(false);
    await flushCanvas();
  });

  it('the READS bind too — a session is shown its OWN project, never the forward one', async () => {
    // Each project needs a distinct frame: against an empty incoming document the case passes with the binding deleted.
    const root = useOwnWorkspaceRoot('bind-reads');
    const sessionWorktree = join(root, 'repo', 'a');
    const incoming = join(root, 'repo', 'b');

    await openCanvasForProject(sessionWorktree);
    const created = await applyAgentCreateFrame(sessionWorktree, {
      url: 'http://localhost:3000',
    });
    if (!created.ok) throw new Error(`expected a create, got: ${created.reason}`);

    await openCanvasForProject(incoming);
    const other = await applyAgentCreateFrame(incoming, { url: 'http://localhost:4000' });
    if (!other.ok) throw new Error(`expected a create, got: ${other.reason}`);

    expect((await listAgentFrames(sessionWorktree)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:3000/',
    ]);
    expect((await listAgentFrames(incoming)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:4000/',
    ]);
    expect(await listAgentFrames(join(root, 'repo', 'never-opened'))).toEqual([]);
    await flushCanvas();
  });
});

describe('reorder_frame reaches list_frames as a stack rank', () => {
  it('reports 0 for the back-most frame and restacks a frame sent to the front', async () => {
    const root = useOwnWorkspaceRoot('agent-reorder');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const first = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    const second = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4000' });
    if (!first.ok || !second.ok) throw new Error('expected both frames to be created');
    const stacks = async (): Promise<[string, number][]> =>
      (await listAgentFrames(worktree)).map((frame) => [frame.id, frame.stack]);

    expect(await stacks()).toEqual([
      [first.node.id, 0],
      [second.node.id, 1],
    ]);
    expect(await applyAgentReorderFrame(worktree, { frameId: first.node.id, position: 'front' })).toMatchObject({
      ok: true,
      node: { id: first.node.id },
    });
    expect(await stacks()).toEqual([
      [second.node.id, 0],
      [first.node.id, 1],
    ]);
    await flushCanvas();
  });
});

describe('the reverify move binds to its own project (ONL-2280)', () => {
  it("moves a loaded BACKGROUND project's frames and leaves the forward one's", async () => {
    const root = useOwnWorkspaceRoot('reverify-background');
    const background = join(root, 'repo', 'a');
    const forward = join(root, 'repo', 'b');
    const move = createReverifyMoveAuthor(applyCanvasOps);

    // Both documents hold a frame on the dead port, or an unbound write landing forward is invisible.
    await openCanvasForProject(background);
    const mine = await applyAgentCreateFrame(background, { url: 'http://localhost:3000' });
    if (!mine.ok) throw new Error(`expected a create, got: ${mine.reason}`);
    await openCanvasForProject(forward);
    const theirs = await applyAgentCreateFrame(forward, { url: 'http://localhost:3000' });
    if (!theirs.ok) throw new Error(`expected a create, got: ${theirs.reason}`);

    await move(3000, 5173, background);

    expect((await listAgentFrames(background)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:5173/',
    ]);
    expect((await listAgentFrames(forward)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:3000/',
    ]);
    expect((await canvasSnapshot()).doc?.docId).toBe(canvasDocIdFor(forward));
    await flushCanvas();
  });

  it('declines a project whose document is not loaded without throwing, and writes nowhere else', async () => {
    const root = useOwnWorkspaceRoot('reverify-unloaded');
    const forward = join(root, 'repo', 'b');
    const move = createReverifyMoveAuthor(applyCanvasOps);

    await openCanvasForProject(forward);
    const theirs = await applyAgentCreateFrame(forward, { url: 'http://localhost:3000' });
    if (!theirs.ok) throw new Error(`expected a create, got: ${theirs.reason}`);

    expect(await move(3000, 5173, join(root, 'repo', 'never-opened'))).toBeUndefined();
    expect((await listAgentFrames(forward)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:3000/',
    ]);
    await flushCanvas();
  });
});

describe('undo/redo — the session timeline (ONL-2042)', () => {
  it('lets an agent undo and redo a user-authored two-frame batch through the shared timeline', async () => {
    const root = useOwnWorkspaceRoot('agent-history-user-batch');
    const worktree = join(root, 'repo', 'w');
    const { host } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 40, y: 30 },
        { type: 'move', id: 'fr_2', x: 80, y: 60 },
      ],
    });

    const undone = await host.undoFor(worktree);
    expect(undone).toMatchObject({ ok: true, applied: true });
    if (!undone.ok) throw new Error(undone.reason);
    expect(undone.frames.map((frame) => [frame.id, frame.x, frame.y])).toEqual([
      ['fr_1', 0, 0],
      ['fr_2', 0, 0],
    ]);

    const redone = await host.redoFor(worktree);
    expect(redone).toMatchObject({ ok: true, applied: true });
    if (!redone.ok) throw new Error(redone.reason);
    expect(redone.frames.map((frame) => [frame.id, frame.x, frame.y])).toEqual([
      ['fr_1', 40, 30],
      ['fr_2', 80, 60],
    ]);
  });

  it('returns an honest empty result to the agent without changing the document', async () => {
    const root = useOwnWorkspaceRoot('agent-history-empty');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const result = await host.undoFor(worktree);

    expect(result).toMatchObject({ ok: true, applied: false, frames: [] });
    expect(updates).toHaveLength(1);
    expect(rejections).toHaveLength(0);
    expect((await host.snapshot()).doc?.revision).toBe(1);
  });

  it('undoes on ITS OWN timeline while another project is forward, consuming neither the other', async () => {
    const root = useOwnWorkspaceRoot('agent-history-project-switch');
    const outgoing = join(root, 'repo', 'outgoing');
    const incoming = join(root, 'repo', 'incoming');
    const { host, updates } = makeHost();

    await host.open(outgoing);
    const outgoingId = canvasDocIdFor(outgoing);
    await host.handleOpRequest({
      docId: outgoingId,
      op: { type: 'create', node: browserNode('fr_out', outgoingId) },
    });
    await host.open(incoming);
    const incomingId = canvasDocIdFor(incoming);
    await host.handleOpRequest({
      docId: incomingId,
      op: { type: 'create', node: browserNode('fr_in', incomingId) },
    });
    const forwardBefore = await host.snapshot();

    expect(await host.undoFor(outgoing)).toMatchObject({ ok: true, applied: true });
    expect((await host.snapshotFor(outgoing)).doc?.nodes.fr_out).toBeUndefined();
    expect(await host.snapshot()).toEqual(forwardBefore);

    expect(await host.undo(incomingId)).toMatchObject({ ok: true, applied: true });
    expect((await host.snapshot()).doc?.nodes.fr_in).toBeUndefined();

    expect(await host.undoFor(join(root, 'repo', 'never-opened'))).toMatchObject({ ok: false });
    expect(updates).toHaveLength(6);
  });

  it('undoes and redoes a contiguous batch as one action, preserving its batch id', async () => {
    const root = useOwnWorkspaceRoot('undo-batch');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 40, y: 30 },
        { type: 'move', id: 'fr_2', x: 80, y: 60 },
      ],
    });
    const moveBatch = updates.at(-1)?.entry.batchId;
    expect(moveBatch).toBeString();

    await host.undo(docId);
    let doc = (await host.snapshot()).doc;
    expect(doc?.nodes.fr_1?.x).toBe(0);
    expect(doc?.nodes.fr_2?.x).toBe(0);
    expect(updates.slice(-2).map((update) => update.entry.batchId)).toEqual([
      moveBatch,
      moveBatch,
    ]);

    await host.redo(docId);
    doc = (await host.snapshot()).doc;
    expect(doc?.nodes.fr_1?.x).toBe(40);
    expect(doc?.nodes.fr_2?.x).toBe(80);
    expect(updates.slice(-2).map((update) => update.entry.batchId)).toEqual([
      moveBatch,
      moveBatch,
    ]);
    expect(rejections).toHaveLength(0);
  });

  it('does not consume a batch when any inverse fails preflight', async () => {
    const root = useOwnWorkspaceRoot('undo-batch-corrupt');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 40, y: 30 },
        { type: 'move', id: 'fr_2', x: 80, y: 60 },
      ],
    });
    const corrupt = updates[3]?.entry;
    if (!corrupt) throw new Error('expected the first batch entry');
    corrupt.prior = { kind: 'fields', id: 'fr_missing', fields: { x: 0, y: 0 } };
    const before = await host.snapshot();
    const updateCount = updates.length;

    await host.undo(docId);
    expect(await host.snapshot()).toEqual(before);
    expect(updates).toHaveLength(updateCount);
    expect(rejections).toHaveLength(1);

    await host.undo(docId);
    expect(await host.snapshot()).toEqual(before);
    expect(rejections).toHaveLength(2);
  });

  it('undoes a singleton above a batch without consuming the batch', async () => {
    const root = useOwnWorkspaceRoot('undo-singleton-above-batch');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 40, y: 30 },
        { type: 'move', id: 'fr_2', x: 80, y: 60 },
      ],
    });
    await host.handleOpRequest({ docId, op: { type: 'rename', id: 'fr_1', name: 'singleton' } });

    await host.undo(docId);
    let doc = (await host.snapshot()).doc;
    expect(doc?.nodes.fr_1?.name).toBe('checkout');
    expect(doc?.nodes.fr_1?.x).toBe(40);
    expect(doc?.nodes.fr_2?.x).toBe(80);
    expect(updates.at(-1)?.entry.batchId).toBeUndefined();

    await host.undo(docId);
    doc = (await host.snapshot()).doc;
    expect(doc?.nodes.fr_1?.x).toBe(0);
    expect(doc?.nodes.fr_2?.x).toBe(0);
  });

  it('a fresh op after batch undo clears the whole batched redo branch', async () => {
    const root = useOwnWorkspaceRoot('undo-batch-fork');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_2', docId) } });
    await host.handleOpRequest({
      docId,
      ops: [
        { type: 'move', id: 'fr_1', x: 40, y: 30 },
        { type: 'move', id: 'fr_2', x: 80, y: 60 },
      ],
    });
    await host.undo(docId);
    await host.handleOpRequest({ docId, op: { type: 'rename', id: 'fr_1', name: 'fork' } });
    const beforeRedo = updates.length;

    await host.redo(docId);

    expect(updates).toHaveLength(beforeRedo);
    const doc = (await host.snapshot()).doc;
    expect(doc?.nodes.fr_1?.x).toBe(0);
    expect(doc?.nodes.fr_2?.x).toBe(0);
  });

  it('undo after a move restores the prior x/y through a canvas:update whose revision ADVANCED', async () => {
    const root = useOwnWorkspaceRoot('undo-move');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'fr_1', x: 40, y: 30 } });

    await host.undo(docId);

    expect(updates).toHaveLength(4);
    expect(updates[3]?.entry.revision).toBe(4);
    expect(updates[3]?.entry.author).toBe('system');
    expect(updates[3]?.entry.op).toEqual({ type: 'move', id: 'fr_1', x: 0, y: 0 });
    const doc = (await host.snapshot()).doc;
    expect(doc?.revision).toBe(4);
    expect(doc?.nodes['fr_1']?.x).toBe(0);
    expect(doc?.nodes['fr_1']?.y).toBe(0);
    expect(rejections).toHaveLength(0);
  });

  it('undo after a remove restores the FULL node — identity, name, geometry — and redo removes it again', async () => {
    const root = useOwnWorkspaceRoot('undo-remove');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'remove', id: 'fr_1' } });
    expect((await host.snapshot()).doc?.nodes['fr_1']).toBeUndefined();

    await host.undo(docId);
    const restored = (await host.snapshot()).doc?.nodes['fr_1'];
    expect(restored).toEqual(browserNode('fr_1', docId));
    expect(updates[3]?.entry.op.type).toBe('create');

    await host.redo(docId);
    expect((await host.snapshot()).doc?.nodes['fr_1']).toBeUndefined();
    expect(updates).toHaveLength(5);
    expect(updates[4]?.entry.op).toEqual({ type: 'remove', id: 'fr_1' });
  });

  it('a reopened document starts with an EMPTY stack — undo is session-scoped, never log-primed', async () => {
    const root = useOwnWorkspaceRoot('undo-reopen');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });

    // `close`, not another project's `open`: an open unloads nothing (ONL-2222).
    await host.close(worktree);
    await host.open(worktree);
    expect((await host.snapshot()).doc?.nodes['fr_1']).toBeDefined();

    await host.undo(docId);
    expect(updates).toHaveLength(2);
    expect(rejections).toHaveLength(0);
    expect((await host.snapshot()).doc?.nodes['fr_1']).toBeDefined();
  });

  it("an agent's op is what a user undo reverts (ONE timeline), and the inverse entry is authored system", async () => {
    const root = useOwnWorkspaceRoot('undo-agent');
    const worktree = join(root, 'repo', 'w');
    const { host, updates } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    const result = await host.apply('agent', () => [
      { type: 'set-home-url', id: 'fr_1', homeUrl: 'http://localhost:5173/' },
    ]);
    if (!result.ok) throw new Error(`expected acceptance, got: ${result.reason}`);

    await host.undo(docId);

    expect(updates).toHaveLength(4);
    expect(updates[3]?.entry.author).toBe('system');
    expect(updates[3]?.entry.op).toEqual({
      type: 'set-home-url',
      id: 'fr_1',
      homeUrl: 'http://localhost:3000',
      pendingHomeUrl: null,
    });
    expect(homeUrlOf((await host.snapshot()).doc, 'fr_1')).toBe('http://localhost:3000');
  });

  it('a corrupt stack entry (prior/op mismatch) emits canvas:rejected and is DROPPED — the entry beneath it still undoes', async () => {
    const root = useOwnWorkspaceRoot('undo-corrupt');
    const worktree = join(root, 'repo', 'w');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'fr_1', x: 40, y: 30 } });

    // The emitted entry is the stack's own object; mutating it stages the corruption.
    const moveEntry = updates[2]?.entry;
    if (moveEntry === undefined) throw new Error('expected the move entry');
    moveEntry.prior = { kind: 'none' };

    await host.undo(docId);
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.docId).toBe(docId);
    expect(updates).toHaveLength(3);

    await host.undo(docId);
    expect(updates).toHaveLength(4);
    expect(updates[3]?.entry.op).toEqual({ type: 'remove', id: 'fr_1' });
    expect(rejections).toHaveLength(1);
  });

  it('an undo stamped with a FOREIGN docId is a silent no-op — nothing emitted, the open document and its stack unmoved', async () => {
    const root = useOwnWorkspaceRoot('undo-foreign');
    const worktree = join(root, 'repo', 'w');
    const other = join(root, 'repo', 'other');
    const { host, updates, rejections } = makeHost();

    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr_1', docId) } });
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'fr_1', x: 40, y: 30 } });

    await host.undo(canvasDocIdFor(other));

    expect(updates).toHaveLength(3);
    expect(rejections).toHaveLength(0);
    const doc = (await host.snapshot()).doc;
    expect(doc?.revision).toBe(3);
    expect(doc?.nodes['fr_1']?.x).toBe(40);

    await host.undo(docId);
    expect(updates[3]?.entry.op).toEqual({ type: 'move', id: 'fr_1', x: 0, y: 0 });
  });
});

describe('a measured box correction stays out of history (ONL-2486)', () => {
  async function withLabel(name: string): Promise<{
    host: CanvasHost;
    marked: string[];
    updates: CanvasUpdate[];
    docId: string;
  }> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'w');
    const { host, marked, updates } = makeHost();
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: textNode('tx', docId) } });
    marked.length = 0;
    return { host, marked, updates, docId };
  }

  const boxOf = (doc: CanvasDoc | null | undefined): [number, number] => [
    doc?.nodes['tx']?.width ?? -1,
    doc?.nodes['tx']?.height ?? -1,
  ];

  it('leaves a size gesture one undo deep, so one undo restores the previous size', async () => {
    const { host, docId } = await withLabel('correction-one-entry');

    await host.handleOpRequest({
      docId,
      op: { type: 'set-text-size', id: 'tx', size: 'large', width: 480, height: 66 },
    });
    await host.handleOpRequest({
      docId,
      correction: true,
      op: { type: 'set-text', id: 'tx', text: 'checkout', width: 480, height: 65 },
    });

    expect(await host.undo(docId)).toMatchObject({ ok: true, applied: true });
    const doc = (await host.snapshot()).doc;
    expect((doc?.nodes['tx'] as { content: { size: string } } | undefined)?.content.size).toBe(
      'medium',
    );
    expect(boxOf(doc)).toEqual([480, 38]);
  });

  it('does not clear the redo stack, so a correction after an undo leaves the redo working', async () => {
    const { host, docId } = await withLabel('correction-keeps-redo');

    await host.handleOpRequest({
      docId,
      op: { type: 'set-text-size', id: 'tx', size: 'large', width: 480, height: 66 },
    });
    await host.undo(docId);
    expect(boxOf((await host.snapshot()).doc)).toEqual([480, 38]);

    await host.handleOpRequest({
      docId,
      correction: true,
      op: { type: 'set-text', id: 'tx', text: 'checkout', width: 480, height: 37 },
    });

    expect(await host.redo(docId)).toMatchObject({ ok: true, applied: true });
    const doc = (await host.snapshot()).doc;
    expect((doc?.nodes['tx'] as { content: { size: string } } | undefined)?.content.size).toBe(
      'large',
    );
  });

  it('still moves the revision, broadcasts, and marks the thumbnail dirty', async () => {
    const { host, marked, updates, docId } = await withLabel('correction-still-applies');
    const sent = updates.length;

    await host.handleOpRequest({
      docId,
      correction: true,
      op: { type: 'set-text', id: 'tx', text: 'checkout', width: 214, height: 37 },
    });

    const doc = (await host.snapshot()).doc;
    expect(doc?.revision).toBe(3);
    expect(boxOf(doc)).toEqual([214, 37]);
    expect(marked).toEqual([docId]);
    expect(updates).toHaveLength(sent + 1);
  });

  it('is stamped user like any renderer request: the marker buys no author', async () => {
    const { host, updates, docId } = await withLabel('correction-author');

    await host.handleOpRequest({
      docId,
      correction: true,
      author: 'system',
      op: { type: 'set-text', id: 'tx', text: 'checkout', width: 214, height: 37 },
    } as unknown as CanvasOpRequest);

    expect(updates.at(-1)?.entry.author).toBe('user');
  });

  it('keeps a typed label’s own commit in history', async () => {
    const { host, docId } = await withLabel('correction-not-a-typed-commit');

    await host.handleOpRequest({
      docId,
      op: { type: 'set-text', id: 'tx', text: 'second pass', width: 320, height: 40 },
    });

    expect(await host.undo(docId)).toMatchObject({ ok: true, applied: true });
    const doc = (await host.snapshot()).doc;
    expect((doc?.nodes['tx'] as { content: { text: string } } | undefined)?.content.text).toBe(
      'checkout',
    );
    expect(boxOf(doc)).toEqual([480, 38]);
  });
});

describe('discard() disarms a queued open', () => {
  it('an open suspended at its load when discard() fires resumes without assigning the document', async () => {
    const root = useOwnWorkspaceRoot('discard-open');
    const worktree = join(root, 'repo', 'w');

    let releaseLoad: ((load: CanvasDocLoad) => void) | undefined;
    const persisted: CanvasDoc[] = [];
    const store: CanvasDocumentStore = {
      load: () =>
        new Promise((resolve) => {
          releaseLoad = resolve;
        }),
      persist: async (doc) => {
        persisted.push(doc);
      },
      appendHistory: async () => {},
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const host = createCanvasHost({ store, emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });

    const opening = host.open(worktree);
    for (let turn = 0; releaseLoad === undefined; turn += 1) {
      if (turn > 20) throw new Error('open never reached its load');
      await Promise.resolve();
    }
    host.discard();
    releaseLoad({ outcome: 'fresh', doc: emptyCanvasDoc(canvasDocIdFor(worktree)) });
    await opening;

    expect(await host.snapshot()).toEqual({ doc: null });
    await host.handleOpRequest({
      docId: canvasDocIdFor(worktree),
      op: { type: 'create', node: browserNode('fr_1', canvasDocIdFor(worktree)) },
    });
    expect(persisted).toHaveLength(0);
  });
});

describe('an opened document is put on a page (ONL-2488)', () => {
  const tick = async (): Promise<void> => {
    for (let turn = 0; turn < 5; turn += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  };

  /** No `pageId` at all, which is what a build older than pages wrote (ONL-2488). */
  const unpagedNode = (id: string, over: Record<string, unknown> = {}): CanvasNode =>
    ({
      id,
      kind: 'browser',
      name: 'checkout',
      x: 0,
      y: 0,
      width: 1280,
      height: 800,
      order: 0,
      content: { homeUrl: 'http://localhost:3000' },
      ...over,
    }) as unknown as CanvasNode;

  function writeDoc(docId: string, nodes: CanvasNode[], pages: CanvasDoc['pages'] = {}): CanvasDoc {
    const doc: CanvasDoc = {
      ...emptyCanvasDoc(docId),
      revision: nodes.length,
      pages,
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(docId), `${JSON.stringify({ version: 1, data: doc }, null, 2)}\n`);
    return doc;
  }

  it('puts every node of a document written before pages onto one named page, and a second open authors nothing more', async () => {
    const root = useOwnWorkspaceRoot('adopt-legacy');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    const pageId = firstCanvasPageId(docId);
    writeDoc(docId, [unpagedNode('fr_1'), unpagedNode('fr_2', { order: 1 })]);

    const { host, updates, marked } = makeHost();
    await host.open(worktree);
    await tick();

    const doc = (await host.snapshot()).doc;
    expect(doc?.pages).toEqual({ [pageId]: { id: pageId, name: 'Page 1', order: 0 } });
    expect(Object.values(doc?.nodes ?? {}).map((node) => node.pageId)).toEqual([pageId, pageId]);
    expect(doc?.revision).toBe(5);
    expect(updates.map((update) => update.entry.op.type)).toEqual([
      'create-page',
      'set-node-page',
      'set-node-page',
    ]);
    // `set-node-page` redraws a card for an ordinary move; adoption is not one.
    expect(marked).toEqual([]);

    await host.close(worktree);
    const logged = readCanvasLog(canvasLogPath(docId));
    await host.open(worktree);
    await tick();

    expect(readCanvasLog(canvasLogPath(docId))).toEqual(logged);
    expect((await host.snapshot()).doc?.revision).toBe(5);
  });

  it('opens a never-before-opened project on exactly one page, and the first frame authored after it lands there', async () => {
    const root = useOwnWorkspaceRoot('adopt-fresh');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const docId = canvasDocIdFor(worktree);
    const pageId = firstCanvasPageId(docId);

    expect((await canvasSnapshotFor(worktree)).doc?.pages).toEqual({
      [pageId]: { id: pageId, name: 'Page 1', order: 0 },
    });

    const created = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    if (!created.ok) throw new Error(created.reason);
    expect(created.node.pageId).toBe(pageId);
    await flushCanvas();
  });

  it('adopts only the node no page names, leaving a document that already has pages alone', async () => {
    const root = useOwnWorkspaceRoot('adopt-one-node');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    writeDoc(
      docId,
      [unpagedNode('fr_1', { pageId: 'pg_kept' }), unpagedNode('fr_2', { order: 1 })],
      { pg_kept: { id: 'pg_kept', name: 'Checkout', order: 0 } },
    );

    const { host, updates, marked } = makeHost();
    await host.open(worktree);
    await tick();

    const doc = (await host.snapshot()).doc;
    expect(Object.keys(doc?.pages ?? {})).toEqual(['pg_kept']);
    expect(doc?.nodes['fr_2']?.pageId).toBe('pg_kept');
    expect(doc?.revision).toBe(3);
    expect(updates.map((update) => update.entry.op.type)).toEqual(['set-node-page']);
    expect(marked).toEqual([]);
  });

  it('publishes no document when the reducer refuses one of its moves, and the next open retries', async () => {
    const root = useOwnWorkspaceRoot('adopt-refused');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    const pageId = firstCanvasPageId(docId);
    // An id no lookup can resolve: the batch's `set-node-page` is refused, so none of it lands.
    const stored: CanvasDoc = {
      ...emptyCanvasDoc(docId),
      revision: 4,
      nodes: { fr_1: unpagedNode('') },
    };
    const healed: CanvasDoc = {
      ...emptyCanvasDoc(docId),
      revision: 4,
      nodes: { fr_1: unpagedNode('fr_1') },
    };
    const appended: CanvasOpEntry[][] = [];
    let loads = 0;
    const store: CanvasDocumentStore = {
      load: async () => {
        loads += 1;
        return { outcome: 'existing', doc: loads === 1 ? stored : healed };
      },
      persist: async () => {},
      appendHistory: async (_docId, entries) => {
        appended.push(entries);
      },
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const updates: CanvasUpdate[] = [];
    const host = createCanvasHost({
      store,
      emitUpdate: (update) => updates.push(update),
      emitRejection: () => {},
      markDirty: () => {},
    });

    await host.open(worktree);
    await tick();

    // A document holding no page accepts no create for the rest of the session; the slot stays empty instead.
    expect((await host.snapshot()).doc).toBeNull();
    expect(appended).toEqual([]);
    expect(updates).toEqual([]);

    await host.open(worktree);
    await tick();

    expect((await host.snapshot()).doc?.pages).toEqual({
      [pageId]: { id: pageId, name: 'Page 1', order: 0 },
    });
    expect((await host.snapshot()).doc?.nodes['fr_1']?.pageId).toBe(pageId);
  });

  it('keeps the adopted page off the undo stack, so the first undo after a migrated open does nothing', async () => {
    const root = useOwnWorkspaceRoot('adopt-undo');
    const worktree = join(root, 'repo', 'w');
    writeDoc(canvasDocIdFor(worktree), [unpagedNode('fr_1')]);

    const { host } = makeHost();
    await host.open(worktree);
    await tick();
    const before = await host.snapshot();

    expect(await host.undoFor(worktree)).toMatchObject({ ok: true, applied: false });
    expect(await host.snapshot()).toEqual(before);
  });

  it('a discard landing at the load leaves no document loaded and the file on disk untouched', async () => {
    const root = useOwnWorkspaceRoot('adopt-discard');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    writeDoc(docId, [unpagedNode('fr_1')]);
    const before = readFileSync(canvasDocPath(docId), 'utf8');

    const disk = createFsDocumentStore();
    let releaseLoad: (() => void) | undefined;
    const store: CanvasDocumentStore = {
      ...disk,
      load: async (id) => {
        await new Promise<void>((resolve) => {
          releaseLoad = resolve;
        });
        return disk.load(id);
      },
    };
    const host = createCanvasHost({
      store,
      emitUpdate: () => {},
      emitRejection: () => {},
      markDirty: () => {},
    });

    const opening = host.open(worktree);
    for (let turn = 0; releaseLoad === undefined; turn += 1) {
      if (turn > 20) throw new Error('open never reached its load');
      await Promise.resolve();
    }
    host.discard();
    releaseLoad();
    await opening;
    await tick();

    expect(await host.snapshotFor(worktree)).toEqual({ doc: null });
    expect(readFileSync(canvasDocPath(docId), 'utf8')).toBe(before);
    expect(readCanvasLog(canvasLogPath(docId))).toEqual([]);
  });

  it('holds the paged document and its images when the adoption persist fails', async () => {
    const root = useOwnWorkspaceRoot('adopt-persist-fails');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    const pageId = firstCanvasPageId(docId);
    writeDoc(docId, [
      unpagedNode('im_1', {
        kind: 'image',
        content: {
          imageId: 'img-adopted',
          name: 'reference.png',
          originalWidth: 800,
          originalHeight: 600,
        },
      }),
    ]);

    const disk = createFsDocumentStore();
    const host = createCanvasHost({
      store: {
        ...disk,
        persist: async () => {
          throw new Error('the disk refused');
        },
      },
      emitUpdate: () => {},
      emitRejection: () => {},
      markDirty: () => {},
    });

    await host.open(worktree);
    await tick();

    expect((await host.snapshot()).doc?.nodes['im_1']?.pageId).toBe(pageId);
    expect([...host.unflushedImageIds()]).toEqual(['img-adopted']);
  });

  it('appends the adoption once when its persist failed, and the launch after replays to the same document', async () => {
    const root = useOwnWorkspaceRoot('adopt-append-once');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    const disk = createFsDocumentStore();
    const refusingDisk: CanvasDocumentStore = {
      ...disk,
      persist: async () => {
        throw new Error('the disk refused');
      },
    };
    const launch = (): CanvasHost =>
      createCanvasHost({
        store: refusingDisk,
        emitUpdate: () => {},
        emitRejection: () => {},
        markDirty: () => {},
      });

    const first = launch();
    await first.open(worktree);
    await tick();
    const adopted = (await first.snapshot()).doc;
    await first.close(worktree);

    const second = launch();
    await second.open(worktree);
    await tick();

    const logged = readCanvasLog(canvasLogPath(docId));
    expect(logged.map((entry) => entry.op.type)).toEqual(['create-page']);

    let replayed = emptyCanvasDoc(docId);
    for (const entry of logged) {
      const result = applyOp(replayed, entry.op, { author: entry.author, at: entry.at });
      if (!result.ok) throw new Error(`replay refused: ${result.reason}`);
      replayed = result.doc;
    }
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(adopted));
  });
});

describe('N projects, held concurrently (ONL-2222)', () => {
  const settle = async (): Promise<void> => {
    for (let turn = 0; turn < 5; turn += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const withStore = (
    store: CanvasDocumentStore,
  ): { host: CanvasHost; updates: CanvasUpdate[] } => {
    const updates: CanvasUpdate[] = [];
    return {
      host: createCanvasHost({
        store,
        emitUpdate: (update) => updates.push(update),
        emitRejection: () => {},
        markDirty: () => {},
      }),
      updates,
    };
  };

  it('holds both documents at once — a write to each lands on its own', async () => {
    const root = useOwnWorkspaceRoot('n-both-held');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const { host } = makeHost();

    await host.open(a);
    await host.handleOpRequest({
      docId: canvasDocIdFor(a),
      op: { type: 'create', node: browserNode('fr_a', canvasDocIdFor(a)) },
    });
    await host.open(b);
    await host.handleOpRequest({
      docId: canvasDocIdFor(b),
      op: { type: 'create', node: browserNode('fr_b', canvasDocIdFor(b)) },
    });

    expect(Object.keys((await host.snapshotFor(a)).doc?.nodes ?? {})).toEqual(['fr_a']);
    expect(Object.keys((await host.snapshotFor(b)).doc?.nodes ?? {})).toEqual(['fr_b']);
    expect(await host.snapshotFor(join(root, 'repo', 'c'))).toEqual({ doc: null });
  });

  it('deactivate() leaves every document loaded — only the wire goes empty', async () => {
    const root = useOwnWorkspaceRoot('n-deactivate');
    const a = join(root, 'repo', 'a');
    const { host } = makeHost();

    await host.open(a);
    await host.handleOpRequest({
      docId: canvasDocIdFor(a),
      op: { type: 'create', node: browserNode('fr_a', canvasDocIdFor(a)) },
    });

    host.deactivate();

    expect(await host.snapshot()).toEqual({ doc: null });
    expect((await host.snapshotFor(a)).doc?.nodes['fr_a']).toBeDefined();
    expect(await host.undoFor(a)).toMatchObject({ ok: true, applied: true });
    expect((await host.snapshotFor(a)).doc?.nodes['fr_a']).toBeUndefined();

    await host.open(a);
    expect(await host.redoFor(a)).toMatchObject({ ok: true, applied: true });
    expect((await host.snapshot()).doc?.nodes['fr_a']).toBeDefined();
  });

  it('close(worktree) unloads exactly that one, and flushes it on the way out', async () => {
    const root = useOwnWorkspaceRoot('n-close-one');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const { host } = makeHost();

    await host.open(a);
    await host.handleOpRequest({
      docId: canvasDocIdFor(a),
      op: { type: 'create', node: browserNode('fr_a', canvasDocIdFor(a)) },
    });
    await host.open(b);

    await host.close(a);

    expect(await host.snapshotFor(a)).toEqual({ doc: null });
    expect((await host.snapshotFor(b)).doc?.docId).toBe(canvasDocIdFor(b));
    const persisted = JSON.parse(readFileSync(canvasDocPath(canvasDocIdFor(a)), 'utf8')) as {
      data: CanvasDoc;
    };
    expect(persisted.data.nodes['fr_a']).toBeDefined();
  });

  it('a stalled OPEN on one project does not hold an op on another', async () => {
    // Stall the open, not a persist: persists queue off the op chain and block nothing.
    const root = useOwnWorkspaceRoot('n-chain-split');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const aId = canvasDocIdFor(a);

    let releaseLoad: (() => void) | undefined;
    const store: CanvasDocumentStore = {
      load: (docId) =>
        docId === aId
          ? new Promise((resolve) => {
              releaseLoad = () => resolve({ outcome: 'fresh', doc: emptyCanvasDoc(docId) });
            })
          : Promise.resolve({ outcome: 'fresh', doc: emptyCanvasDoc(docId) }),
      persist: async () => {},
      appendHistory: async () => {},
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const { host } = withStore(store);

    const openingA = host.open(a);
    for (let turn = 0; releaseLoad === undefined; turn += 1) {
      if (turn > 20) throw new Error("A's load never started");
      await Promise.resolve();
    }

    // A flag, not an await: a shared chain fails red instead of hanging to the timeout.
    let bLanded = false;
    const bWork = host
      .open(b)
      .then(() =>
        host.handleOpRequest({
          docId: canvasDocIdFor(b),
          op: { type: 'create', node: browserNode('fr_b', canvasDocIdFor(b)) },
        }),
      )
      .then(() => {
        bLanded = true;
      });
    await settle();
    expect(bLanded).toBe(true);
    expect((await host.snapshotFor(b)).doc?.nodes['fr_b']).toBeDefined();

    releaseLoad();
    await Promise.all([openingA, bWork]);
    expect((await host.snapshotFor(a)).doc?.docId).toBe(aId);
  });

  it('an op racing its OWN project open still lands behind that open', async () => {
    const root = useOwnWorkspaceRoot('n-op-races-open');
    const worktree = join(root, 'repo', 'w');

    let releaseLoad: (() => void) | undefined;
    const store: CanvasDocumentStore = {
      load: (docId) =>
        new Promise((resolve) => {
          releaseLoad = () => resolve({ outcome: 'fresh', doc: emptyCanvasDoc(docId) });
        }),
      persist: async () => {},
      appendHistory: async () => {},
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const { host, updates } = withStore(store);

    const docId = canvasDocIdFor(worktree);
    const opening = host.open(worktree);
    for (let turn = 0; releaseLoad === undefined; turn += 1) {
      if (turn > 20) throw new Error('open never reached its load');
      await Promise.resolve();
    }
    const dispatched = host.handleOpRequest({
      docId,
      op: { type: 'create', node: browserNode('fr_1', docId) },
    });

    releaseLoad();
    await opening;
    await dispatched;

    expect(updates).toHaveLength(2);
    expect((await host.snapshot()).doc?.nodes['fr_1']).toBeDefined();
  });

  it('flushAll() waits on EVERY loaded document, not just the forward one', async () => {
    const root = useOwnWorkspaceRoot('n-flush-all');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const aId = canvasDocIdFor(a);
    const bId = canvasDocIdFor(b);

    const gates = new Map<string, () => void>();
    const settled: string[] = [];
    const store: CanvasDocumentStore = {
      load: async (docId) => ({ outcome: 'fresh', doc: emptyCanvasDoc(docId) }),
      persist: async (doc) => {
        await new Promise<void>((resolve) => gates.set(doc.docId, resolve));
        settled.push(doc.docId);
      },
      appendHistory: async () => {},
      readHistory: async () => [],
      subscribe: () => () => {},
    };
    const { host } = withStore(store);

    await host.open(a);
    await host.open(b);
    await settle();
    // Each open adopts its document onto a page and persists that; released here, so the gates below are the test's own ops (ONL-2488).
    gates.get(aId)?.();
    gates.get(bId)?.();
    await settle();
    settled.length = 0;

    await host.handleOpRequest({ docId: aId, op: { type: 'create', node: browserNode('fr_a', aId) } });
    await host.handleOpRequest({ docId: bId, op: { type: 'create', node: browserNode('fr_b', bId) } });
    await settle();

    let flushed = false;
    const flushing = host.flushAll().then(() => {
      flushed = true;
    });

    await settle();
    expect(flushed).toBe(false);
    // Only the forward persist is released; a flush keyed to it alone resolves here.
    gates.get(bId)?.();
    await settle();
    expect(flushed).toBe(false);

    gates.get(aId)?.();
    await flushing;
    expect(settled.sort()).toEqual([aId, bId].sort());
    expect(await host.snapshot()).toEqual({ doc: null });
    expect(await host.snapshotFor(a)).toEqual({ doc: null });
  });

  it('discard() drops EVERY document, not only the forward one', async () => {
    const root = useOwnWorkspaceRoot('n-discard-all');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const { host } = makeHost();

    await host.open(a);
    await host.open(b);

    host.discard();

    expect(await host.snapshot()).toEqual({ doc: null });
    expect(await host.snapshotFor(a)).toEqual({ doc: null });
    expect(await host.snapshotFor(b)).toEqual({ doc: null });
  });
});

describe('capture_frame failures reach the main-process log (ONL-2304)', () => {
  beforeEach(() => recordLinesForTesting());
  afterEach(() => resetLogForTesting());

  it('logs one canvas error line, naming the frame, on each refusing exit', async () => {
    const root = useOwnWorkspaceRoot('capture-log');
    const worktree = join(root, 'repo', 'a');
    const captureFailures = () =>
      peekLinesForTesting().filter((line) => line.subsystem === 'canvas' && line.msg === 'capture_frame failed');
    try {
      const closed = await captureAgentFrame(join(root, 'repo', 'nowhere'), 'frame-x');
      expect(closed.ok).toBe(false);
      expect(peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed')).toEqual([
        expect.objectContaining({ outcome: 'failure', failure_reason: 'project-closed', duration_ms: expect.any(Number) }),
      ]);
      expect(captureFailures()).toHaveLength(1);
      expect(captureFailures()[0]?.['frame_id']).toBe('frame-x');
      expect(captureFailures()[0]?.level).toBe('error');

      await openCanvasForProject(worktree);
      const noPage = await captureAgentFrame(worktree, 'frame-ghost');
      expect(noPage.ok).toBe(false);
      expect(captureFailures()).toHaveLength(2);
      expect(captureFailures()[1]?.['frame_id']).toBe('frame-ghost');
    } finally {
      await flushCanvas();
    }
  });

  it('tells the quote source of no look when the capture fails, so the quote stays (ONL-2960)', async () => {
    const root = useOwnWorkspaceRoot('capture-no-look');
    const worktree = join(root, 'repo', 'a');
    const looks: string[] = [];
    setFrameQuoteSource({
      view: () => ({ byFrame: { 'frame-ghost': 'A bakery site' }, turnRunning: true }),
      guestLoaded: () => undefined,
      looked: (_path, frameId) => looks.push(frameId),
      documentChanged: () => undefined,
    });
    try {
      await openCanvasForProject(worktree);
      const made = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
      if (!made.ok) throw new Error(made.reason);
      expect((await captureAgentFrame(worktree, made.node.id)).ok).toBe(false);
      expect((await captureAgentFrame(worktree, 'frame-ghost')).ok).toBe(false);
      expect(looks).toEqual([]);
    } finally {
      setFrameQuoteSource(undefined);
      await flushCanvas();
    }
  });

  it('writes no error line for a frame that is merely on another page — an unmounted page is expected (ONL-2488)', async () => {
    const root = useOwnWorkspaceRoot('capture-log-off-page');
    const worktree = join(root, 'repo', 'a');
    try {
      await openCanvasForProject(worktree);
      const made = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
      if (!made.ok) throw new Error(made.reason);
      const elsewhere = await applyAgentCreatePage(worktree, { name: 'Settings' });
      if (!elsewhere.ok) throw new Error(elsewhere.reason);
      await setCanvasCurrentPage(canvasDocIdFor(worktree), elsewhere.page.id);

      const offPage = await captureAgentFrame(worktree, made.node.id);

      expect(offPage.ok).toBe(false);
      if (offPage.ok) throw new Error('expected a refusal');
      expect(offPage.reason).toContain('Page 1');
      expect(
        peekLinesForTesting().filter((line) => line.msg === 'capture_frame failed'),
      ).toHaveLength(0);
      const completions = peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed');
      expect(completions).toHaveLength(1);
      expect(completions[0]).toMatchObject({ outcome: 'failure', failure_reason: 'off-page', duration_ms: expect.any(Number) });
      expect(completions[0]).not.toHaveProperty('frame_id');
      expect(completions[0]).not.toHaveProperty('project_id');
      expect(JSON.stringify(completions)).not.toContain('Settings');
      expect(JSON.stringify(completions)).not.toContain('Page 1');
      expect(JSON.stringify(completions)).not.toContain(made.node.id);
      expect(JSON.stringify(completions)).not.toContain(worktree);
    } finally {
      await flushCanvas();
    }
  });
});

describe('an op that moves pixels marks its project dirty (ONL-2471)', () => {
  async function withFrame(name: string): Promise<{
    host: CanvasHost;
    marked: string[];
    docId: string;
    worktree: string;
  }> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'a');
    const { host, marked } = makeHost();
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr', docId) } });
    marked.length = 0;
    return { host, marked, docId, worktree };
  }

  it('marks on a user-authored move', async () => {
    const { host, marked, docId } = await withFrame('mark-user-move');
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'fr', x: 40, y: 60 } });
    expect(marked).toEqual([docId]);
  });

  it('marks on an agent-authored move, through the same door', async () => {
    const { host, marked, docId } = await withFrame('mark-agent-move');
    const applied = await host.apply('agent', () => [{ type: 'move', id: 'fr', x: 40, y: 60 }]);
    expect(applied.ok).toBe(true);
    expect(marked).toEqual([docId]);
  });

  it('marks on create, duplicate, resize and remove', async () => {
    const { host, marked, docId } = await withFrame('mark-geometry');
    await host.handleOpRequest({ docId, op: { type: 'create', node: browserNode('fr2', docId) } });
    await host.handleOpRequest({
      docId,
      op: {
        type: 'duplicate',
        node: { ...browserNode('fr3', docId), provenance: { from: 'fr', at: '2026-01-01T00:00:00.000Z' } },
      },
    });
    await host.handleOpRequest({
      docId,
      op: { type: 'resize', id: 'fr', x: 0, y: 0, width: 800, height: 600 },
    });
    await host.handleOpRequest({ docId, op: { type: 'remove', id: 'fr2' } });
    expect(marked).toEqual([docId, docId, docId, docId]);
  });

  it('marks on NEITHER a rename nor a set-home-url: neither changes what is drawn', async () => {
    const { host, marked, docId } = await withFrame('mark-not-metadata');
    await host.handleOpRequest({ docId, op: { type: 'rename', id: 'fr', name: 'renamed' } });
    await host.handleOpRequest({
      docId,
      op: { type: 'set-home-url', id: 'fr', homeUrl: 'http://localhost:4000' },
    });
    expect(marked).toEqual([]);
  });

  it('marks on a label’s words and on its size', async () => {
    const { host, marked, docId } = await withFrame('mark-text');
    await host.handleOpRequest({ docId, op: { type: 'create', node: textNode('tx', docId) } });
    marked.length = 0;

    await host.handleOpRequest({
      docId,
      op: { type: 'set-text', id: 'tx', text: 'second pass', width: 320, height: 40 },
    });
    await host.handleOpRequest({
      docId,
      op: { type: 'set-text-size', id: 'tx', size: 'large', width: 480, height: 66 },
    });

    expect(marked).toEqual([docId, docId]);
  });

  it('marks when a node moves up or down the stack, which decides what covers what', async () => {
    const { host, marked, docId } = await withFrame('mark-reorder');
    await host.handleOpRequest({ docId, op: { type: 'reorder', id: 'fr', order: 5 } });
    expect(marked).toEqual([docId]);
  });

  it('marks on NEITHER set-image-alt: an image’s alt changes no pixel, as a rename does not', async () => {
    const { host, marked, docId } = await withFrame('mark-not-alt');
    await host.handleOpRequest({ docId, op: { type: 'create', node: imageNode('img', docId) } });
    marked.length = 0;

    await host.handleOpRequest({ docId, op: { type: 'set-image-alt', id: 'img', alt: 'the cart' } });

    expect(marked).toEqual([]);
  });

  it('marks on a page removal and on a node moving to another page, which both change what a card shows', async () => {
    const { host, marked, docId, worktree } = await withFrame('mark-pages');
    const added = await host.apply(
      'user',
      () => [{ type: 'create-page', page: { id: 'pg_2', name: 'Settings', order: 1 } }],
      worktree,
    );
    expect(added.ok).toBe(true);
    expect(marked).toEqual([]);

    await host.apply('user', () => [{ type: 'set-node-page', id: 'fr', pageId: 'pg_2' }], worktree);
    await host.apply('user', () => [{ type: 'rename-page', pageId: 'pg_2', name: 'Billing' }], worktree);
    await host.apply('user', () => [{ type: 'reorder-page', pageId: 'pg_2', order: 0.5 }], worktree);
    await host.apply('user', () => [{ type: 'remove-page', pageId: firstCanvasPageId(docId) }], worktree);

    expect(marked).toEqual([docId, docId]);
  });

  it('leaves the card clean for a silent write, so a page a user never asked for redraws nothing', async () => {
    const { host, marked, worktree } = await withFrame('mark-silent');
    const applied = await host.apply(
      'system',
      () => [{ type: 'create-page', page: { id: 'pg_2', name: '', order: 1 } }, { type: 'set-node-page', id: 'fr', pageId: 'pg_2' }],
      worktree,
      { silent: true },
    );
    expect(applied.ok).toBe(true);
    expect(marked).toEqual([]);
  });

  it('marks nothing for an op the document refused', async () => {
    const { host, marked, docId } = await withFrame('mark-refused');
    await host.handleOpRequest({ docId, op: { type: 'move', id: 'no-such-frame', x: 1, y: 1 } });
    expect(marked).toEqual([]);
  });

  it('marks the project the op landed in and NOT a sibling that is also open', async () => {
    const root = useOwnWorkspaceRoot('mark-own-project');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const { host, marked } = makeHost();
    await host.open(a);
    await host.open(b);
    const aId = canvasDocIdFor(a);
    const bId = canvasDocIdFor(b);

    await host.apply('agent', () => [{ type: 'create', node: browserNode('fr', aId) }], a);

    expect(marked).toEqual([aId]);
    expect(marked).not.toContain(bId);
  });

  it('marks once per op in a batch, and the gate turns the run of marks into ONE capture', async () => {
    const root = useOwnWorkspaceRoot('mark-batch');
    const worktree = join(root, 'repo', 'a');
    const { host, marked } = makeHost();
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);

    await host.apply('agent', () => [
      { type: 'create', node: browserNode('fr', docId) },
      { type: 'create', node: browserNode('fr2', docId) },
    ]);
    expect(marked).toEqual([docId, docId]);

    resetThumbnailServiceForTesting();
    const outcomes: ThumbnailOutcome[] = [];
    thumbnailService().onOutcome((outcome) => outcomes.push(outcome));
    for (const id of marked) markProjectDirty(id);

    await thumbnailService().captureIfDirtyNow(docId);
    await thumbnailService().captureIfDirtyNow(docId);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]?.status === 'skipped' && outcomes[0].reason).not.toBe('not_dirty');
    expect(outcomes[1]).toMatchObject({ status: 'skipped', reason: 'not_dirty' });
  });
});

describe('a leave moment asks the gate for its own project (ONL-2471)', () => {
  let outcomes: ThumbnailOutcome[] = [];

  beforeEach(() => {
    resetThumbnailServiceForTesting();
    outcomes = [];
    thumbnailService().onOutcome((outcome) => outcomes.push(outcome));
  });

  const asked = (): number => outcomes.length;
  const declined = (): number =>
    outcomes.filter((outcome) => outcome.status === 'skipped' && outcome.reason === 'not_dirty').length;

  it('asks for the leaving project when it changed', async () => {
    const root = useOwnWorkspaceRoot('leave-dirty');
    const worktree = join(root, 'repo', 'a');
    markProjectDirty(canvasDocIdFor(worktree));

    captureThumbnailOnLeave(worktree);
    await settle();

    expect(asked()).toBe(1);
    expect(declined()).toBe(0);
  });

  it('still asks for an UNCHANGED project — the gate declines it, not the call site', async () => {
    const root = useOwnWorkspaceRoot('leave-clean');
    const worktree = join(root, 'repo', 'a');
    canvasDocIdFor(worktree);

    captureThumbnailOnLeave(worktree);
    await settle();

    expect(asked()).toBe(1);
    expect(declined()).toBe(1);
  });

  it('asks nothing for a tab that names no project', async () => {
    useOwnWorkspaceRoot('leave-no-workspace');
    captureThumbnailOnLeave(undefined);
    await settle();
    expect(asked()).toBe(0);
  });

  it('asks nothing for a project no document was ever minted for', async () => {
    const root = useOwnWorkspaceRoot('leave-unknown-doc');
    captureThumbnailOnLeave(join(root, 'repo', 'never-opened'));
    await settle();
    expect(asked()).toBe(0);
  });

  it('asks for the LEAVING project and never a sibling tab’s, with both dirty', async () => {
    const root = useOwnWorkspaceRoot('leave-two-tabs');
    const a = join(root, 'repo', 'a');
    const b = join(root, 'repo', 'b');
    const aId = canvasDocIdFor(a);
    const bId = canvasDocIdFor(b);
    markProjectDirty(aId);
    markProjectDirty(bId);

    captureThumbnailOnLeave(a);
    await settle();

    // Asking consumes the dirt, so a's answer names it asked and b's names it untouched.
    expect(await thumbnailService().captureIfDirtyNow(aId)).toMatchObject({ reason: 'not_dirty' });
    expect(await thumbnailService().captureIfDirtyNow(bId)).not.toMatchObject({ reason: 'not_dirty' });
  });

  it('returns before the capture settles: no leave path waits on one', () => {
    const root = useOwnWorkspaceRoot('leave-not-awaited');
    const worktree = join(root, 'repo', 'a');
    markProjectDirty(canvasDocIdFor(worktree));

    expect(captureThumbnailOnLeave(worktree)).toBeUndefined();
    expect(outcomes).toEqual([]);
  });
});

describe('the agent writes the other canvas kinds (ONL-2486)', () => {
  const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
  let stateRoot: string;

  beforeEach(() => {
    stateRoot = makeStateRoot({ name: 'canvas-agent-objects' });
    process.env['STUDIO_STATE_ROOT'] = stateRoot;
    resetImagesStore();
  });

  afterEach(() => {
    resetImagesStore();
    if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  });

  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
  const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  const ingestWith = (size: { width: number; height: number } | null) => ({
    fileSize: (path: string) => statSync(path).size,
    readFile: (path: string) => readFileSync(path),
    register: registerImage,
    settle: settlePending,
    imageSize: () => size,
  });

  function fileHolding(dir: string, name: string, bytes: Uint8Array): string {
    mkdirSync(dir, { recursive: true });
    const path = join(dir, name);
    writeFileSync(path, bytes);
    return path;
  }

  it('lands the page error on the frame whose page is broken, and on no other (ONL-2297)', async () => {
    const root = useOwnWorkspaceRoot('agent-page-error');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    resetFrameMirrorForTesting();

    const fine = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    const broken = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4000' });
    if (!fine.ok || !broken.ok) throw new Error('the fixture frames were refused');

    // The push the renderer would have sent: both pages loaded, so both read `live`.
    noteFramesForTesting(101, {
      docId: canvasDocIdFor(worktree),
      frames: [
        { id: fine.node.id, currentUrl: 'http://localhost:3000/', health: 'live', title: 'fine', webContentsId: 11 },
        { id: broken.node.id, currentUrl: 'http://localhost:4000/', health: 'live', title: 'broken', webContentsId: 12 },
      ],
    });

    const listed = await listAgentFrames(worktree, undefined, {
      readPage: (frame) =>
        Promise.resolve(
          frame.webContentsId === 12
            ? {
                read: true,
                reading: {
                  overlay: { source: 'vite', message: 'Unexpected token', file: 'src/hero.js:1:0' },
                },
              }
            : { read: true, reading: {} },
        ),
    });

    const byId = new Map(listed.map((entry) => [entry.id, entry]));
    expect(byId.get(broken.node.id)?.pageError).toEqual({
      source: 'vite',
      message: 'Unexpected token',
      file: 'src/hero.js:1:0',
    });
    expect(byId.get(fine.node.id)?.pageError).toBeUndefined();
    resetFrameMirrorForTesting();
    await flushCanvas();
  });

  it('counts a frame as showing its page only once it loaded and no book entry for its port is down (ONL-2960)', async () => {
    const root = useOwnWorkspaceRoot('frame-shows-page');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    resetFrameMirrorForTesting();
    const made = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4700' });
    if (!made.ok || made.node.kind !== 'browser') throw new Error('the fixture frame was refused');
    const frameId = made.node.id;
    const homeUrl = made.node.content.homeUrl;
    const push = (health: 'loading' | 'live' | 'unreachable', more: { targetUrl?: string; loadFailed?: true } = {}) =>
      noteFramesForTesting(101, {
        docId: canvasDocIdFor(worktree),
        frames: [{ id: frameId, currentUrl: homeUrl, health, title: '', webContentsId: 11, ...more }],
      });

    expect(frameShowsPage(worktree, frameId)).toBe(false);
    push('loading');
    expect(frameShowsPage(worktree, frameId)).toBe(false);
    push('unreachable');
    expect(frameShowsPage(worktree, frameId)).toBe(false);
    push('live');
    expect(frameShowsPage(worktree, frameId)).toBe(true);

    const entry = createServerEntry(worktree, { folder: worktree, port: 4700, ownership: 'agent-started' });
    expect(frameShowsPage(worktree, frameId)).toBe(false);
    recordPortMeasurement(worktree, entry.id, 4700, 'live');
    expect(frameShowsPage(worktree, frameId)).toBe(true);
    recordPortMeasurement(worktree, entry.id, 4700, 'dead');
    expect(frameShowsPage(worktree, frameId)).toBe(false);
    resetFrameMirrorForTesting();
    await flushCanvas();
  });

  it('reads what the user sees in a frame from the address it is heading to, as the canvas does (ONL-2960)', async () => {
    const root = useOwnWorkspaceRoot('frame-shown-over');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    resetFrameMirrorForTesting();
    const made = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4700' });
    if (!made.ok || made.node.kind !== 'browser') throw new Error('the fixture frame was refused');
    const frameId = made.node.id;
    const homeUrl = made.node.content.homeUrl;
    const live = createServerEntry(worktree, { folder: join(worktree, 'web'), port: 4700, ownership: 'agent-started' });
    recordPortMeasurement(worktree, live.id, 4700, 'live');
    const stopped = createServerEntry(worktree, { folder: join(worktree, 'docs'), port: 4701, ownership: 'agent-started' });
    recordPortMeasurement(worktree, stopped.id, 4701, 'dead');
    const push = (more: { targetUrl?: string } = {}) =>
      noteFramesForTesting(101, {
        docId: canvasDocIdFor(worktree),
        frames: [{ id: frameId, currentUrl: homeUrl, health: 'live', title: '', webContentsId: 11, ...more }],
      });

    push();
    expect(frameShownOver(worktree, frameId)).toEqual({ kind: 'page' });
    push({ targetUrl: 'http://localhost:4701/' });
    expect(frameShowsPage(worktree, frameId)).toBe(false);
    expect(frameShownOver(worktree, frameId)).toEqual({ kind: 'cover', cover: 'non-started' });

    setFrameQuoteSource({
      view: () => ({ byFrame: { [frameId]: 'A bakery site' }, turnRunning: true }),
      guestLoaded: () => undefined,
      looked: () => undefined,
      documentChanged: () => undefined,
    });
    try {
      expect(frameShownOver(worktree, frameId)).toEqual({ kind: 'quote', quote: 'A bakery site' });
    } finally {
      setFrameQuoteSource(undefined);
    }
    resetFrameMirrorForTesting();
    await flushCanvas();
  });

  it('writes a text object the listing reports by kind, with its words and the default box', async () => {
    const root = useOwnWorkspaceRoot('agent-text');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);

    const written = await applyAgentCreateText(worktree, { text: 'Checkout — v2' });
    if (!written.ok) throw new Error(written.reason);

    expect(await listAgentFrames(worktree)).toEqual([
      {
        id: written.node.id,
        // Blank: the label is derived from the words at render, so nothing stored goes stale on the next rewrite.
        name: '',
        kind: 'text',
        pageId: firstCanvasPageId(canvasDocIdFor(worktree)),
        pageName: 'Page 1',
        text: 'Checkout — v2',
        size: 'medium',
        x: written.node.x,
        y: written.node.y,
        ...defaultTextBox('medium'),
        stack: 0,
      },
    ]);
    await flushCanvas();
  });

  it('rewrites those words, and one undo puts the old ones back', async () => {
    const root = useOwnWorkspaceRoot('agent-set-text');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const written = await applyAgentCreateText(worktree, { text: 'Before', size: 'large' });
    if (!written.ok) throw new Error(written.reason);

    const rewritten = await applyAgentSetText(worktree, { textId: written.node.id, text: 'After' });
    expect(rewritten).toMatchObject({ ok: true, node: { content: { text: 'After', size: 'large' } } });

    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true });
    const undone = (await canvasSnapshotFor(worktree)).doc?.nodes[written.node.id];
    expect(undone).toEqual(written.node);
    await flushCanvas();
  });

  it('refuses to rewrite a frame, naming the kind it found, and changes nothing', async () => {
    const root = useOwnWorkspaceRoot('agent-set-text-frame');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const frame = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    if (!frame.ok) throw new Error(frame.reason);

    const refused = await applyAgentSetText(worktree, { textId: frame.node.id, text: 'Heading' });
    expect(refused.ok).toBe(false);
    expect(refused.ok ? '' : refused.reason).toContain('browser');
    expect((await canvasSnapshotFor(worktree)).doc?.nodes[frame.node.id]).toEqual(frame.node);
    await flushCanvas();
  });

  it('refuses a text object with nothing to write, and one whose id names no object', async () => {
    const root = useOwnWorkspaceRoot('agent-text-refusals');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);

    expect((await applyAgentCreateText(worktree, { text: '   ' })).ok).toBe(false);
    expect((await applyAgentSetText(worktree, { textId: 'ghost', text: 'x' })).ok).toBe(false);
    expect((await canvasSnapshotFor(worktree)).doc?.nodes).toEqual({});
    await flushCanvas();
  });

  it('copies a readable picture into the store and names it on the node', async () => {
    const root = useOwnWorkspaceRoot('agent-image');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const path = fileHolding(join(root, 'source'), 'mockup.png', PNG);

    const placed = await applyAgentCreateImage(
      worktree,
      { path, alt: 'the pricing mockup' },
      ingestWith({ width: 1600, height: 1200 }),
    );
    if (!placed.ok) throw new Error(placed.reason);
    if (placed.node.kind !== 'image') throw new Error(`expected an image, got ${placed.node.kind}`);

    expect(placed.node.content).toMatchObject({
      name: 'mockup.png',
      originalWidth: 1600,
      originalHeight: 1200,
      alt: 'the pricing mockup',
    });
    // The same arrival cap a dropped picture takes, aspect kept.
    expect(Math.max(placed.node.width, placed.node.height)).toBe(CANVAS_IMAGE_ARRIVAL_MAX_SIDE);
    expect(placed.node.width / placed.node.height).toBeCloseTo(1600 / 1200, 2);
    expect(readImage(placed.node.content.imageId)?.bytes).toEqual(Buffer.from(PNG));
    expect((await listAgentFrames(worktree))[0]).toMatchObject({ kind: 'image', alt: 'the pricing mockup' });

    const page = await applyAgentCreatePage(worktree, { name: 'Reference' });
    if (!page.ok) throw new Error(page.reason);
    const onPage = await applyAgentCreateImage(
      worktree,
      { path: fileHolding(join(root, 'source'), 'second.png', PNG), pageId: page.page.id },
      ingestWith({ width: 1600, height: 1200 }),
    );
    if (!onPage.ok) throw new Error(onPage.reason);
    expect(onPage.node.pageId).toBe(page.page.id);
    await flushCanvas();
  });

  it('takes a path relative to the project directory', async () => {
    const root = useOwnWorkspaceRoot('agent-image-relative');
    const worktree = join(root, 'repo', 'w');
    // Before the open: a canvas document keys off the canonical path, which a directory has only once it exists.
    fileHolding(join(worktree, 'design'), 'hero.png', PNG);
    await openCanvasForProject(worktree);

    const placed = await applyAgentCreateImage(
      worktree,
      { path: 'design/hero.png' },
      ingestWith({ width: 400, height: 300 }),
    );
    expect(placed).toMatchObject({ ok: true, node: { width: 400, height: 300, name: 'hero.png' } });
    await flushCanvas();
  });

  it('refuses a path it cannot read, a file that is no image it accepts, and bytes it cannot measure — each adding nothing', async () => {
    const root = useOwnWorkspaceRoot('agent-image-refusals');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const vector = fileHolding(join(root, 'source'), 'logo.svg', SVG);
    const readable = fileHolding(join(root, 'source'), 'shot.png', PNG);

    const missing = await applyAgentCreateImage(
      worktree,
      { path: join(root, 'source', 'gone.png') },
      ingestWith({ width: 10, height: 10 }),
    );
    expect(missing.ok).toBe(false);
    expect(missing.ok ? '' : missing.reason).toContain('gone.png');

    const unsupported = await applyAgentCreateImage(worktree, { path: vector }, ingestWith({ width: 10, height: 10 }));
    expect(unsupported.ok).toBe(false);
    expect(unsupported.ok ? '' : unsupported.reason).toContain('PNG');

    const unmeasurable = await applyAgentCreateImage(worktree, { path: readable }, ingestWith(null));
    expect(unmeasurable.ok).toBe(false);

    expect((await canvasSnapshotFor(worktree)).doc?.nodes).toEqual({});
    await flushCanvas();
  });

  it('reports all three kinds, ranked in one stack, and reports no selection', async () => {
    const root = useOwnWorkspaceRoot('agent-list-kinds');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    await applyAgentCreateText(worktree, { text: 'Variants' });
    await applyAgentCreateImage(
      worktree,
      { path: fileHolding(join(root, 'source'), 'ref.png', PNG) },
      ingestWith({ width: 200, height: 100 }),
    );

    const listed = await listAgentFrames(worktree);
    expect(listed.map((object) => [object.kind, object.stack])).toEqual([
      ['browser', 0],
      ['text', 1],
      ['image', 2],
    ]);
    for (const object of listed) expect(Object.keys(object)).not.toContain('selected');
    await flushCanvas();
  });

  it('authors every operation these verbs produce as the agent', async () => {
    const root = useOwnWorkspaceRoot('agent-author');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const written = await applyAgentCreateText(worktree, { text: 'Heading' });
    if (!written.ok) throw new Error(written.reason);
    await applyAgentSetText(worktree, { textId: written.node.id, text: 'Heading v2' });
    await applyAgentCreateImage(
      worktree,
      { path: fileHolding(join(root, 'source'), 'ref.png', PNG) },
      ingestWith({ width: 200, height: 100 }),
    );
    await flushCanvas();

    const logged = readCanvasLog(canvasLogPath(canvasDocIdFor(worktree)));
    expect(logged.map((entry) => [entry.op.type, entry.author])).toEqual([
      ['create-page', 'system'],
      ['create', 'agent'],
      ['set-text', 'agent'],
      ['create', 'agent'],
    ]);
  });
});

describe('what an open reports about the canvas it found (ONL-2486)', () => {
  const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);

  const ingestWith = (size: { width: number; height: number }) => ({
    fileSize: (path: string) => statSync(path).size,
    readFile: (path: string) => readFileSync(path),
    register: registerImage,
    settle: settlePending,
    imageSize: () => size,
  });

  function pictureAt(dir: string, name: string): string {
    mkdirSync(dir, { recursive: true });
    const path = join(dir, name);
    writeFileSync(path, PNG);
    return path;
  }

  async function documentWith(
    name: string,
    counts: { labels: number; pictures: number },
  ): Promise<{ root: string; worktree: string }> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'w');
    resetImagesStore();
    await openCanvasForProject(worktree);
    for (let index = 0; index < counts.labels; index += 1) {
      const written = await applyAgentCreateText(worktree, { text: `label ${String(index)}` });
      if (!written.ok) throw new Error(written.reason);
    }
    for (let index = 0; index < counts.pictures; index += 1) {
      const placed = await applyAgentCreateImage(
        worktree,
        { path: pictureAt(join(root, 'source'), `ref-${String(index)}.png`) },
        ingestWith({ width: 200, height: 100 }),
      );
      if (!placed.ok) throw new Error(placed.reason);
    }
    await flushCanvas();
    return { root, worktree };
  }

  it('counts the labels and the pictures the document holds', async () => {
    const { worktree } = await documentWith('census-counts', { labels: 3, pictures: 2 });

    expect(canvasCensus(worktree)).toMatchObject({ text_node_count: 3, image_node_count: 2 });
  });

  it('reports the oldest label in whole days, from the operations the log recorded', async () => {
    const { worktree } = await documentWith('census-age', { labels: 2, pictures: 0 });
    const logPath = canvasLogPath(canvasDocIdFor(worktree));
    let oldest = true;
    const aged = readCanvasLog(logPath).map((entry) => {
      const label = entry.op.type === 'create' && entry.op.node.kind === 'text';
      const at = new Date(Date.UTC(2026, 0, label && oldest ? 1 : 20)).toISOString();
      if (label) oldest = false;
      return { ...entry, at };
    });
    writeFileSync(logPath, JSON.stringify(aged, null, 2));

    expect(canvasCensus(worktree, Date.UTC(2026, 0, 11))).toEqual({
      text_node_count: 2,
      image_node_count: 0,
      artifact_node_count: 0,
      oldest_text_node_days: 10,
      page_count: 1,
      non_divider_page_count: 1,
      oldest_page_days: 0,
    });
  });

  it('still counts, and reports no age at all, when the log reads back empty', async () => {
    const { worktree } = await documentWith('census-no-log', { labels: 2, pictures: 1 });
    writeFileSync(canvasLogPath(canvasDocIdFor(worktree)), 'not a log');

    expect(canvasCensus(worktree)).toEqual({
      text_node_count: 2,
      image_node_count: 1,
      artifact_node_count: 0,
      page_count: 1,
      non_divider_page_count: 1,
    });
  });

  async function documentWithPages(name: string, names: string[]): Promise<string> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    for (const pageName of names) {
      const made = await applyAgentCreatePage(worktree, { name: pageName });
      if (!made.ok) throw new Error(made.reason);
    }
    await flushCanvas();
    return worktree;
  }

  it('counts the pages a document holds, and the dividers apart from them (ONL-2488)', async () => {
    const worktree = await documentWithPages('census-pages', ['Settings', '---', 'Billing']);

    expect(canvasCensus(worktree)).toMatchObject({ page_count: 4, non_divider_page_count: 3 });
  });

  it('reports the oldest page in whole days, from the operations the log recorded (ONL-2488)', async () => {
    const worktree = await documentWithPages('census-page-age', ['Settings']);
    const logPath = canvasLogPath(canvasDocIdFor(worktree));
    let oldest = true;
    const aged = readCanvasLog(logPath).map((entry) => {
      const page = entry.op.type === 'create-page';
      const at = new Date(Date.UTC(2026, 0, page && oldest ? 1 : 20)).toISOString();
      if (page) oldest = false;
      return { ...entry, at };
    });
    writeFileSync(logPath, JSON.stringify(aged, null, 2));

    expect(canvasCensus(worktree, Date.UTC(2026, 0, 11))).toMatchObject({
      page_count: 2,
      non_divider_page_count: 2,
      oldest_page_days: 10,
    });
  });

  it('counts an artifact node, so the count is not green only because it is always zero', () => {
    const root = useOwnWorkspaceRoot('census-artifacts');
    const worktree = join(root, 'repo', 'w');
    const docId = canvasDocIdFor(worktree);
    const doc = emptyCanvasDoc(docId);
    doc.nodes['ar_1'] = {
      id: 'ar_1',
      pageId: firstCanvasPageId(docId),
      kind: 'artifact',
      name: '',
      x: 0,
      y: 0,
      width: 480,
      height: 640,
      order: 9,
      content: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing idea' },
    };
    mkdirSync(dirname(canvasDocPath(docId)), { recursive: true });
    writeFileSync(canvasDocPath(docId), JSON.stringify(doc));

    // The count must move with the document; asserting only zero passes a broken increment.
    expect(canvasCensus(worktree)).toMatchObject({ artifact_node_count: 1 });
  });

  it('counts nothing for a project whose canvas was never opened', () => {
    const root = useOwnWorkspaceRoot('census-unopened');

    expect(canvasCensus(join(root, 'repo', 'never'))).toEqual({
      text_node_count: 0,
      image_node_count: 0,
      artifact_node_count: 0,
      page_count: 0,
      non_divider_page_count: 0,
    });
  });

  it('answers zero counts for a document this build cannot read', async () => {
    const { worktree } = await documentWith('census-unreadable', { labels: 2, pictures: 1 });
    writeFileSync(canvasDocPath(canvasDocIdFor(worktree)), 'not a document');

    expect(canvasCensus(worktree)).toMatchObject({
      text_node_count: 0,
      image_node_count: 0,
      artifact_node_count: 0,
      page_count: 0,
      non_divider_page_count: 0,
    });
  });
});

describe('what the agent writing an object reports (ONL-2486)', () => {
  const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const REPO_IDENTITY = 'github.com/acme/site';

  function fakeApp(userData: string): AppLike {
    return {
      getPath: () => userData,
      getVersion: () => '0.0.0-test',
      getLocale: () => 'en-US',
      isPackaged: false,
    };
  }

  function canvasEvents(): { event: string; properties: Record<string, unknown> }[] {
    return peekQueueForTesting()
      .filter((event) => event.event === 'text_node_created' || event.event === 'image_node_created')
      .map((event) => ({ event: event.event, properties: event.properties }));
  }

  let root: string;
  let worktree: string;

  beforeEach(async () => {
    resetTelemetryForTesting();
    root = useOwnWorkspaceRoot('agent-telemetry');
    worktree = join(root, 'repo', 'w');
    mkdirSync(worktree, { recursive: true });
    process.env['STUDIO_STATE_ROOT'] = join(root, 'state');
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAppForTesting(fakeApp(join(root, 'userdata')));
    resetWorkspaceCache();
    rememberProject({
      workspacePath: worktree,
      workspaceName: 'brave-otter',
      branchName: 'tester/brave-otter',
      baseBranch: 'main',
      sourceRepoName: 'site',
      sourcePath: join(root, 'repo'),
      sourceRepoRoot: join(root, 'repo'),
      repoIdentity: REPO_IDENTITY,
      copiedEnvFiles: [],
    });
    initTelemetry();
    resetImagesStore();
    await openCanvasForProject(worktree);
  });

  afterEach(async () => {
    await flushCanvas();
    resetTelemetryForTesting();
    setAppForTesting(undefined);
    delete process.env['STUDIO_POSTHOG_KEY'];
    delete process.env['STUDIO_STATE_ROOT'];
  });

  it('reports a label it wrote as the agent path, under the hashed project and never its words', async () => {
    const written = await applyAgentCreateText(worktree, { text: 'the pricing headline' });
    if (!written.ok) throw new Error(written.reason);

    expect(canvasEvents()).toHaveLength(1);
    expect(canvasEvents()[0]).toMatchObject({
      event: 'text_node_created',
      properties: { method: 'agent', count: 1, project_id: workspaceTelemetryId(REPO_IDENTITY) },
    });
    const serialized = JSON.stringify(canvasEvents()[0]?.properties);
    expect(serialized).not.toContain('pricing');
    expect(serialized).not.toContain(worktree);
  });

  it('reports a picture it placed, and never the file it read', async () => {
    mkdirSync(join(root, 'source'), { recursive: true });
    const path = join(root, 'source', 'mockup-v4.png');
    writeFileSync(path, PNG);

    const placed = await applyAgentCreateImage(worktree, { path }, {
      fileSize: (from: string) => statSync(from).size,
      readFile: (from: string) => readFileSync(from),
      register: registerImage,
      settle: settlePending,
      imageSize: () => ({ width: 200, height: 100 }),
    });
    if (!placed.ok) throw new Error(placed.reason);

    expect(canvasEvents()).toHaveLength(1);
    expect(canvasEvents()[0]).toMatchObject({
      event: 'image_node_created',
      properties: { method: 'agent', count: 1 },
    });
    expect(JSON.stringify(canvasEvents()[0]?.properties)).not.toContain('mockup-v4');
  });

  it('reports one arrival per kind when it duplicates a mixed group, and none for a frame', async () => {
    mkdirSync(join(root, 'source'), { recursive: true });
    const path = join(root, 'source', 'ref.png');
    writeFileSync(path, PNG);
    const written = await applyAgentCreateText(worktree, { text: 'a heading' });
    const placed = await applyAgentCreateImage(worktree, { path }, {
      fileSize: (from: string) => statSync(from).size,
      readFile: (from: string) => readFileSync(from),
      register: registerImage,
      settle: settlePending,
      imageSize: () => ({ width: 200, height: 100 }),
    });
    const frame = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    if (!written.ok || !placed.ok || !frame.ok) throw new Error('the fixture could not be written');
    const before = canvasEvents().length;

    const copied = await applyAgentDuplicateFrames(worktree, {
      frameIds: [written.node.id, placed.node.id, frame.node.id],
    });
    if (!copied.ok) throw new Error(copied.reason);

    expect(canvasEvents().slice(before)).toMatchObject([
      { event: 'text_node_created', properties: { method: 'agent', count: 1 } },
      { event: 'image_node_created', properties: { method: 'agent', count: 1 } },
    ]);
  });

  it('reports nothing for a refused write, or for words it only rewrote', async () => {
    const written = await applyAgentCreateText(worktree, { text: 'first' });
    if (!written.ok) throw new Error(written.reason);

    await applyAgentSetText(worktree, { textId: written.node.id, text: 'second' });
    expect((await applyAgentCreateText(worktree, { text: '   ' })).ok).toBe(false);
    expect(
      (
        await applyAgentCreateImage(worktree, { path: join(root, 'source', 'absent.png') }, {
          fileSize: (from: string) => statSync(from).size,
      readFile: (from: string) => readFileSync(from),
          register: registerImage,
          settle: settlePending,
          imageSize: () => ({ width: 10, height: 10 }),
        })
      ).ok,
    ).toBe(false);

    expect(canvasEvents()).toHaveLength(1);
  });
});

describe('the size probe behind the agent create_image path (ONL-2486)', () => {
  it('answers with the size of a regular file', () => {
    const dir = useOwnWorkspaceRoot('regular-file-size');
    const path = join(dir, 'shot.png');
    writeFileSync(path, Buffer.from([1, 2, 3, 4, 5]));

    expect(regularFileSize(path)).toBe(5);
  });

  it('refuses anything that is not a regular file, before a read can block on it', () => {
    const dir = useOwnWorkspaceRoot('irregular-file-size');

    // `/dev/zero` reports size 0, so the cap would pass and the read would never reach EOF.
    expect(() => regularFileSize('/dev/zero')).toThrow();
    expect(() => regularFileSize(dir)).toThrow();
  });
});

describe('the page the user is on (ONL-2488)', () => {
  const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

  beforeEach(() => {
    resetCanvasCameraCache();
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'canvas-current-page' });
  });

  afterEach(async () => {
    await flushCanvas();
    resetCanvasCameraCache();
    if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  });

  async function twoPages(name: string): Promise<{ worktree: string; docId: string; first: string }> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const docId = canvasDocIdFor(worktree);
    const applied = await applyCanvasOps(
      'user',
      () => [{ type: 'create-page', page: { id: 'pg_settings', name: 'Settings', order: 1 } }],
      worktree,
    );
    if (!applied.ok) throw new Error(applied.reason);
    return { worktree, docId, first: firstCanvasPageId(docId) };
  }

  it('answers the page the user left and that page’s camera, never another page’s', async () => {
    const { worktree, docId, first } = await twoPages('current-page-camera');
    writeCanvasCamera(docId, first, { x: -10, y: -10, zoom: 0.5 });
    writeCanvasCamera(docId, 'pg_settings', { x: 240, y: 96, zoom: 1.5 });

    await setCanvasCurrentPage(docId, 'pg_settings');

    expect(await canvasPresentationFor(worktree)).toEqual({
      currentPageId: 'pg_settings',
      camera: { x: 240, y: 96, zoom: 1.5 },
    });
  });

  it('brings the page back after the document is closed and opened again', async () => {
    const { worktree, docId } = await twoPages('current-page-relaunch');
    writeCanvasCamera(docId, 'pg_settings', { x: 4, y: 4, zoom: 2 });
    await setCanvasCurrentPage(docId, 'pg_settings');

    await flushCanvas();
    await openCanvasForProject(worktree);

    expect(await canvasPresentationFor(worktree)).toEqual({
      currentPageId: 'pg_settings',
      camera: { x: 4, y: 4, zoom: 2 },
    });
  });

  it('refuses a page the document does not hold, and a divider, as a place to rest', async () => {
    const { worktree, docId } = await twoPages('current-page-refusals');
    const ruled = await applyCanvasOps(
      'user',
      () => [{ type: 'create-page', page: { id: 'pg_rule', name: '---', order: 2 } }],
      worktree,
    );
    if (!ruled.ok) throw new Error(ruled.reason);
    await setCanvasCurrentPage(docId, 'pg_settings');

    await setCanvasCurrentPage(docId, 'pg_gone');
    await setCanvasCurrentPage(docId, 'pg_rule');

    // Neither push moved the user: a refused page leaves the one they were on.
    expect((await canvasPresentationFor(worktree)).currentPageId).toBe('pg_settings');
  });

  it('falls back to the lowest-order page left when the page the user was on is taken away', async () => {
    const { worktree, docId, first } = await twoPages('current-page-removed');
    await setCanvasCurrentPage(docId, 'pg_settings');
    const removed = await applyCanvasOps('user', () => [{ type: 'remove-page', pageId: 'pg_settings' }], worktree);
    if (!removed.ok) throw new Error(removed.reason);

    expect((await canvasPresentationFor(worktree)).currentPageId).toBe(first);
  });

  it('answers nothing for a project no document was ever opened for', async () => {
    const root = useOwnWorkspaceRoot('current-page-unknown');
    expect(await canvasPresentationFor(join(root, 'repo', 'never'))).toEqual({});
  });

  it('opens a user who never switched page where they left off, with no document loaded', async () => {
    const { worktree, docId, first } = await twoPages('current-page-never-switched');
    writeCanvasCamera(docId, first, { x: -240, y: 96, zoom: 0.75 });

    // The relaunch: nothing is loaded, and nothing ever stored a page, because
    // only a switch writes one and this user never switched (ONL-2488).
    await flushCanvas();

    // The camera comes back. No page is named: the open resolves that, and a second
    // answer here would disagree with it once a page sorts ahead of the first.
    expect(await canvasPresentationFor(worktree)).toEqual({
      camera: { x: -240, y: 96, zoom: 0.75 },
    });
  });

  it('follows a reorder for a user who never switched, rather than holding the page open pinned', async () => {
    const { worktree, first } = await twoPages('current-page-reorder-drift');
    await openCanvasForProject(worktree);
    expect((await canvasPagedSnapshotFor(worktree)).currentPageId).toBe(first);

    // The renderer re-derives its page from the order it is showing, so a pinned
    // answer here would leave main naming a page nobody is looking at.
    const moved = await applyCanvasOps(
      'user',
      () => [{ type: 'reorder-page', pageId: 'pg_settings', order: -1 }],
      worktree,
    );
    if (!moved.ok) throw new Error(moved.reason);

    expect((await canvasPagedSnapshotFor(worktree)).currentPageId).toBe('pg_settings');
  });

  it('names no page the open would resolve differently, once another page sorts first', async () => {
    const { worktree, docId, first } = await twoPages('current-page-reordered');
    const moved = await applyCanvasOps(
      'user',
      () => [{ type: 'reorder-page', pageId: 'pg_settings', order: -1 }],
      worktree,
    );
    if (!moved.ok) throw new Error(moved.reason);
    writeCanvasCamera(docId, first, { x: 8, y: 8, zoom: 1.25 });
    await flushCanvas();

    // Cold, the presentation names nothing, so the renderer rests where the open does.
    expect((await canvasPresentationFor(worktree)).currentPageId).toBeUndefined();

    await openCanvasForProject(worktree);
    expect((await canvasPresentationFor(worktree)).currentPageId).toBe('pg_settings');
  });
});

describe('the agent reaches every page (ONL-2488)', () => {
  const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

  beforeEach(() => {
    resetCanvasCameraCache();
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'canvas-agent-pages' });
  });

  afterEach(async () => {
    await flushCanvas();
    resetCanvasCameraCache();
    if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  });

  async function project(name: string): Promise<{ worktree: string; docId: string; first: string }> {
    const root = useOwnWorkspaceRoot(name);
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const docId = canvasDocIdFor(worktree);
    return { worktree, docId, first: firstCanvasPageId(docId) };
  }

  const nodeIds = (doc: CanvasDoc | null): string[] => Object.keys(doc?.nodes ?? {}).sort();

  it('reports the page it minted by id and name, and takes a second page of the same name', async () => {
    const { worktree } = await project('agent-create-page');

    const added = await applyAgentCreatePage(worktree, { name: 'Checkout' });
    if (!added.ok) throw new Error(added.reason);
    expect(added.page).toMatchObject({ name: 'Checkout', divider: false, current: false, objects: 0 });
    expect(added.page.id).not.toBe('');

    const twin = await applyAgentCreatePage(worktree, { name: 'Checkout' });
    if (!twin.ok) throw new Error(twin.reason);
    expect(twin.page.id).not.toBe(added.page.id);
  });

  it('moves four objects onto a page as one act one undo reverses, and one bad id moves nothing', async () => {
    const { worktree, first } = await project('agent-move-nodes');
    const page = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!page.ok) throw new Error(page.reason);
    const made: string[] = [];
    for (const label of ['a', 'b', 'c', 'd']) {
      const written = await applyAgentCreateText(worktree, { text: label });
      if (!written.ok) throw new Error(written.reason);
      made.push(written.node.id);
    }

    const stray = await applyAgentMoveNodesToPage(worktree, {
      nodeIds: [...made, 'ghost'],
      pageId: page.page.id,
    });
    expect(stray).toMatchObject({ ok: false });
    if (stray.ok) throw new Error('expected a refusal');
    expect(stray.reason).toContain('ghost');
    expect(
      Object.values((await canvasSnapshotFor(worktree)).doc?.nodes ?? {}).map((node) => node.pageId),
    ).toEqual([first, first, first, first]);

    const moved = await applyAgentMoveNodesToPage(worktree, { nodeIds: made, pageId: page.page.id });
    if (!moved.ok) throw new Error(moved.reason);
    expect(moved.page).toEqual({ id: page.page.id, name: 'Settings' });
    expect(moved.nodes.map((node) => node.pageId)).toEqual([page.page.id, page.page.id, page.page.id, page.page.id]);

    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true, applied: true });
    expect(
      Object.values((await canvasSnapshotFor(worktree)).doc?.nodes ?? {}).map((node) => node.pageId),
    ).toEqual([first, first, first, first]);
  });

  it('dates the project card on a page switch, which is what the card draws', async () => {
    const root = useOwnWorkspaceRoot('switch-marks-dirty');
    const worktree = join(root, 'repo', 'w');
    const { host, marked } = makeHost();
    await host.open(worktree);
    const docId = canvasDocIdFor(worktree);
    const first = firstCanvasPageId(docId);
    // A page holding no frames: nothing mounts to mark the project dirty on the way in.
    const second = 'pg_notes';
    const made = await host.apply(
      'agent',
      () => [{ type: 'create-page' as const, page: { id: second, name: 'Notes', order: 1 } }],
      worktree,
    );
    if (!made.ok) throw new Error(made.reason);
    marked.length = 0;

    await host.setCurrentPage(docId, second);

    expect(marked).toEqual([docId]);

    // A switch to the page already current redraws nothing.
    marked.length = 0;
    await host.setCurrentPage(docId, second);
    expect(marked).toEqual([]);

    await host.setCurrentPage(docId, first);
    expect(marked).toEqual([docId]);
  });

  it('leaves the console of a frame already on the destination page for the agent to read', async () => {
    const root = useOwnWorkspaceRoot('agent-move-console');
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    resetFrameMirrorForTesting();

    const page = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!page.ok) throw new Error(page.reason);
    const settled = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    const travelling = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4000' });
    if (!settled.ok || !travelling.ok) throw new Error('the fixture frames were refused');
    const parked = await applyAgentMoveNodesToPage(worktree, {
      nodeIds: [settled.node.id],
      pageId: page.page.id,
    });
    if (!parked.ok) throw new Error(parked.reason);

    noteFramesForTesting(101, {
      docId: canvasDocIdFor(worktree),
      frames: [
        { id: settled.node.id, currentUrl: 'http://localhost:3000/', health: 'live', title: 'settled', webContentsId: 11 },
        { id: travelling.node.id, currentUrl: 'http://localhost:4000/', health: 'live', title: 'travelling', webContentsId: 12 },
      ],
      console: [{ id: settled.node.id, lines: [{ level: 'error', text: 'boom' }] }],
    });

    // The move lists the whole destination page to find its own objects; a draining read would empty this one.
    const moved = await applyAgentMoveNodesToPage(worktree, {
      nodeIds: [travelling.node.id],
      pageId: page.page.id,
    });
    if (!moved.ok) throw new Error(moved.reason);

    const listed = await listAgentFrames(worktree, undefined, {
      readPage: () => Promise.resolve({ read: true, reading: {} }),
    });
    const kept = listed.find((entry) => entry.id === settled.node.id);
    expect(kept?.console?.map((line) => line.text)).toEqual(['boom']);
    expect(kept?.errorCount).toBe(1);
    resetFrameMirrorForTesting();
    await flushCanvas();
  });

  it('refuses a move onto a divider', async () => {
    const { worktree } = await project('agent-move-divider');
    const rule = await applyAgentCreatePage(worktree, { name: '---' });
    if (!rule.ok) throw new Error(rule.reason);
    const written = await applyAgentCreateText(worktree, { text: 'a' });
    if (!written.ok) throw new Error(written.reason);

    const refused = await applyAgentMoveNodesToPage(worktree, {
      nodeIds: [written.node.id],
      pageId: rule.page.id,
    });
    expect(refused).toMatchObject({ ok: false });
    if (refused.ok) throw new Error('expected a refusal');
    expect(refused.reason).toContain('divider');
  });

  it('brings back objects whose page had become a divider, and leaves the older undo reachable', async () => {
    const { worktree } = await project('undo-divider-page');
    const page = await applyAgentCreatePage(worktree, { name: 'Checkout' });
    if (!page.ok) throw new Error(page.reason);
    for (const label of ['a', 'b']) {
      const written = await applyAgentCreateText(worktree, { text: label, pageId: page.page.id });
      if (!written.ok) throw new Error(written.reason);
    }
    const before = nodeIds((await canvasSnapshotFor(worktree)).doc);

    // A page holding objects may become a rule: only the last non-divider rename is refused.
    const ruled = await applyCanvasOps(
      'user',
      () => [{ type: 'rename-page', pageId: page.page.id, name: '---' }],
      worktree,
    );
    if (!ruled.ok) throw new Error(ruled.reason);
    const deleted = await applyAgentDeletePage(worktree, { pageId: page.page.id });
    if (!deleted.ok) throw new Error(deleted.reason);
    expect(nodeIds((await canvasSnapshotFor(worktree)).doc)).toEqual([]);

    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true, applied: true });
    expect(nodeIds((await canvasSnapshotFor(worktree)).doc)).toEqual(before);

    // The run came off the stack, so the rename before it is still reachable.
    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true, applied: true });
    expect((await canvasSnapshotFor(worktree)).doc?.pages[page.page.id]).toMatchObject({
      name: 'Checkout',
    });
  });

  it('deletes a populated page and everything on it as one act one undo reverses', async () => {
    const { worktree, docId } = await project('agent-delete-page');
    const page = await applyAgentCreatePage(worktree, { name: 'Scratch' });
    if (!page.ok) throw new Error(page.reason);
    for (const label of ['a', 'b']) {
      const written = await applyAgentCreateText(worktree, { text: label, pageId: page.page.id });
      if (!written.ok) throw new Error(written.reason);
    }
    const before = nodeIds((await canvasSnapshotFor(worktree)).doc);

    const deleted = await applyAgentDeletePage(worktree, { pageId: page.page.id });
    if (!deleted.ok) throw new Error(deleted.reason);
    expect(deleted.removed).toEqual({ id: page.page.id, name: 'Scratch', objects: 2 });
    expect(deleted.pages.map((held) => held.id)).not.toContain(page.page.id);
    expect(nodeIds((await canvasSnapshotFor(worktree)).doc)).toEqual([]);

    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true, applied: true });
    const back = await canvasSnapshotFor(worktree);
    expect(nodeIds(back.doc)).toEqual(before);
    expect(back.doc?.pages[page.page.id]).toMatchObject({ name: 'Scratch' });
    expect(Object.values(back.doc?.nodes ?? {}).map((node) => node.pageId)).toEqual([
      page.page.id,
      page.page.id,
    ]);
    await flushCanvas();
    const run = readCanvasLog(canvasLogPath(docId)).filter(
      (entry) => entry.op.type === 'remove' || entry.op.type === 'remove-page',
    );
    expect(run.map((entry) => entry.op.type)).toEqual(['remove', 'remove', 'remove-page']);
    expect(new Set(run.map((entry) => entry.batchId)).size).toBe(1);
    expect(run[0]?.batchId).toBeDefined();
  });

  it('deletes an empty page as a single op, and undo still brings it back', async () => {
    const { worktree, docId } = await project('agent-delete-empty-page');
    const page = await applyAgentCreatePage(worktree, { name: 'Empty' });
    if (!page.ok) throw new Error(page.reason);

    const deleted = await applyAgentDeletePage(worktree, { pageId: page.page.id });
    if (!deleted.ok) throw new Error(deleted.reason);
    expect(deleted.removed.objects).toBe(0);
    expect((await canvasSnapshotFor(worktree)).doc?.pages[page.page.id]).toBeUndefined();

    // Before any flush: `open()` hands a reopened document fresh stacks, so a later session undoes nothing (ONL-2042).
    expect(await undoAgentCanvas(worktree)).toMatchObject({ ok: true, applied: true });
    expect((await canvasSnapshotFor(worktree)).doc?.pages[page.page.id]).toMatchObject({ name: 'Empty' });

    await flushCanvas();
    // The single-op path: a batchId here would make the reverse walk collect a run of one.
    const removal = readCanvasLog(canvasLogPath(docId)).find((entry) => entry.op.type === 'remove-page');
    expect(removal?.batchId).toBeUndefined();
  });

  it('renames a page to a divider and moves one where the agent puts it', async () => {
    const { worktree, first } = await project('agent-page-arrangement');
    const page = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!page.ok) throw new Error(page.reason);

    const ruled = await applyAgentRenamePage(worktree, { pageId: page.page.id, name: '---' });
    if (!ruled.ok) throw new Error(ruled.reason);
    expect(ruled.page.divider).toBe(true);

    const moved = await applyAgentReorderPage(worktree, { pageId: page.page.id, position: 'first' });
    if (!moved.ok) throw new Error(moved.reason);
    expect((await listAgentPages(worktree)).map((held) => held.id)).toEqual([page.page.id, first]);
  });

  it('lands a write on the page the tool named while the user is looking at another', async () => {
    const { worktree, docId, first } = await project('agent-named-page');
    const page = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!page.ok) throw new Error(page.reason);

    const named = await applyAgentCreateText(worktree, { text: 'On settings', pageId: page.page.id });
    if (!named.ok) throw new Error(named.reason);
    expect(named.node.pageId).toBe(page.page.id);

    const omitted = await applyAgentCreateText(worktree, { text: 'Where the user is' });
    if (!omitted.ok) throw new Error(omitted.reason);
    expect(omitted.node.pageId).toBe(first);

    await setCanvasCurrentPage(docId, page.page.id);
    const followed = await applyAgentCreateText(worktree, { text: 'Now here' });
    if (!followed.ok) throw new Error(followed.reason);
    expect(followed.node.pageId).toBe(page.page.id);
  });

  it('refuses a page id naming no page and writes nothing', async () => {
    const { worktree } = await project('agent-unknown-page');
    const refused = await applyAgentCreateText(worktree, { text: 'x', pageId: 'pg_gone' });

    expect(refused).toMatchObject({ ok: false });
    if (refused.ok) throw new Error('expected a refusal');
    expect(refused.reason).toContain('pg_gone');
    expect(nodeIds((await canvasSnapshotFor(worktree)).doc)).toEqual([]);
  });

  it('reads every page, with a stack dense inside each and no overlap from another', async () => {
    const { worktree, first } = await project('agent-list-every-page');
    const settings = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!settings.ok) throw new Error(settings.reason);
    await applyAgentCreatePage(worktree, { name: 'Empty' });

    for (const pageId of [first, settings.page.id]) {
      for (const at of [0, 40]) {
        // Overlapping on purpose, and at the same coordinates on both pages.
        const made = await applyAgentCreateFrame(worktree, { url: '3000', x: at, y: at, pageId });
        if (!made.ok) throw new Error(made.reason);
      }
    }

    const listed = await listAgentFrames(worktree);
    expect(listed.map((node) => [node.pageName, node.stack])).toEqual([
      ['Page 1', 0],
      ['Page 1', 1],
      ['Settings', 0],
      ['Settings', 1],
    ]);
    const onFirst = new Set(listed.filter((node) => node.pageId === first).map((node) => node.id));
    for (const node of listed) {
      for (const other of node.overlaps ?? []) {
        expect(onFirst.has(node.id)).toBe(onFirst.has(other));
      }
    }
    expect(listed.every((node) => (node.overlaps ?? []).length === 1)).toBe(true);

    const filtered = await listAgentFrames(worktree, undefined, { pageId: settings.page.id });
    expect(filtered).toEqual(listed.filter((node) => node.pageId === settings.page.id));
  });

  it('shows an empty page to list_pages and to nothing else, with its divider and current flags', async () => {
    const { worktree, docId, first } = await project('agent-empty-page');
    const empty = await applyAgentCreatePage(worktree, { name: 'Empty' });
    if (!empty.ok) throw new Error(empty.reason);
    const rule = await applyAgentCreatePage(worktree, { name: '---' });
    if (!rule.ok) throw new Error(rule.reason);
    await setCanvasCurrentPage(docId, empty.page.id);

    expect(await listAgentFrames(worktree)).toEqual([]);
    expect(await listAgentPages(worktree)).toEqual([
      { id: first, name: 'Page 1', divider: false, current: false, objects: 0 },
      { id: empty.page.id, name: 'Empty', divider: false, current: true, objects: 0 },
      { id: rule.page.id, name: '---', divider: true, current: false, objects: 0 },
    ]);
  });

  it('refuses a capture of a frame on another page by naming that page, and still lists it', async () => {
    const { worktree, docId } = await project('agent-capture-off-page');
    const made = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    if (!made.ok) throw new Error(made.reason);
    const elsewhere = await applyAgentCreatePage(worktree, { name: 'Settings' });
    if (!elsewhere.ok) throw new Error(elsewhere.reason);
    await setCanvasCurrentPage(docId, elsewhere.page.id);

    const refused = await captureAgentFrame(worktree, made.node.id);

    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('expected a refusal');
    expect(refused.reason).toContain('Page 1');
    expect(refused.reason).not.toContain('may not exist');
    expect((await listAgentFrames(worktree)).map((frame) => frame.id)).toContain(made.node.id);
  });
});
