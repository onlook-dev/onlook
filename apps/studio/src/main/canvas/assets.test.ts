import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { firstRestingPageId } from '@studio/events';
import type { CanvasDoc, CanvasNode, CanvasOp, CanvasOpEntry, ImageNode } from '@studio/events';
import type { CanvasDocumentStore } from './adapter.js';
import {
  cleanupTempFixtures,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
  settle,
} from '@studio/fixtures';
import {
  clearWorkspaceImages,
  gcSweep,
  readImage,
  registerImage,
  releaseAllPending,
  resetImagesStore,
  setCanvasRootsProvider,
  settlePending,
} from '../images/store.js';
import {
  imageIdsInCanvasDocument,
  imageIdsInCanvasEntries,
  storedCanvasImageIds,
} from './assets.js';
import { emptyCanvasDoc, firstCanvasPageId } from './document.js';
import { canvasDir, canvasDocPath, canvasLogPath, createFsDocumentStore } from './fs-backend.js';
import {
  applyCanvasOps,
  canvasImageIds,
  canvasSnapshotFor,
  createCanvasHost,
  flushCanvas,
  openCanvasForProject,
  redoAgentCanvas,
  undoAgentCanvas,
  type CanvasHost,
} from './index.js';
import { resetCanvasRegistryCache } from './registry.js';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6]);

const enteringStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  restoreWorkspaceRoot();
  if (enteringStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = enteringStateRoot;
  cleanupTempFixtures();
});

afterEach(async () => {
  await flushCanvas();
  resetImagesStore();
});

function useOwnRoots(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-assets-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: `canvas-assets-${name}-state` });
  resetCanvasRegistryCache();
  resetImagesStore();
  return root;
}

/** No page, as a node an older build wrote carries none: `docWith` and `createOn` name the one it lands on (ONL-2488). */
const imageNode = (id: string, imageId: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: '',
  kind: 'image',
  name: 'reference',
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  order: 0,
  content: { imageId, name: 'reference.png', originalWidth: 800, originalHeight: 600 },
});

const browserNode = (id: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: '',
  kind: 'browser',
  name: 'checkout',
  x: 0,
  y: 0,
  width: 1280,
  height: 800,
  order: 1,
  content: { homeUrl: 'http://localhost:3000' },
});

const textNode = (id: string): CanvasNode & { provenance?: never } => ({
  id,
  pageId: '',
  kind: 'text',
  name: 'note',
  x: 0,
  y: 0,
  width: 480,
  height: 38,
  order: 2,
  content: { text: 'a note that names assets/hero.png in prose', size: 'medium' },
});

function docWith(nodes: CanvasNode[], docId: string = randomUUID()): CanvasDoc {
  const pageId = firstCanvasPageId(docId);
  return {
    ...emptyCanvasDoc(docId),
    revision: nodes.length,
    pages: { [pageId]: { id: pageId, name: 'Page 1', order: 0 } },
    nodes: Object.fromEntries(nodes.map((node) => [node.id, { ...node, pageId }])),
  };
}

/** Every author reads the landing page off the document it resolves against (ONL-2488). */
const createOn =
  (node: CanvasNode, over: Partial<CanvasNode> = {}) =>
  (doc: CanvasDoc): CanvasOp[] => [
    {
      type: 'create',
      node: { ...node, ...over, pageId: firstRestingPageId(doc) } as CanvasNode & {
        provenance?: never;
      },
    },
  ];

async function persist(doc: CanvasDoc): Promise<CanvasDoc> {
  await createFsDocumentStore().persist(doc);
  return doc;
}

function registerFor(project: string, bytes: Uint8Array): string {
  const result = registerImage(project, bytes);
  if (!result.ok) throw new Error('expected ok');
  return result.image.id;
}

function makeHost(store: CanvasDocumentStore = createFsDocumentStore()): CanvasHost {
  return createCanvasHost({
    store,
    emitUpdate: () => undefined,
    emitRejection: () => undefined,
    markDirty: () => undefined,
  });
}

function storeThatNeverPersists(docId: string): CanvasDocumentStore {
  return {
    load: async () => ({ outcome: 'fresh', doc: emptyCanvasDoc(docId) }),
    persist: async () => undefined,
    appendHistory: async () => undefined,
    readHistory: async () => [],
    subscribe: () => () => undefined,
  };
}

const storedImageId = (doc: CanvasDoc | null | undefined, id: string): string | undefined =>
  (doc?.nodes[id] as ImageNode | undefined)?.content.imageId;

describe('reading the image ids a document names', () => {
  it('takes the image nodes and leaves the browser and text nodes alone', () => {
    const doc = docWith([imageNode('im_1', 'ws-hash-a'), browserNode('fr_1'), textNode('tx_1')]);
    expect([...imageIdsInCanvasDocument({ version: 1, data: doc })]).toEqual(['ws-hash-a']);
  });

  it('reads a document written before the envelope existed', () => {
    const doc = docWith([imageNode('im_1', 'ws-hash-a')]);
    expect([...imageIdsInCanvasDocument(doc)]).toEqual(['ws-hash-a']);
  });

  it('names nothing for a shape that is not a document, rather than throwing', () => {
    expect([...imageIdsInCanvasDocument(null)]).toEqual([]);
    expect([...imageIdsInCanvasDocument('not a document')]).toEqual([]);
    expect([...imageIdsInCanvasDocument({ version: 1, data: { nodes: [] } })]).toEqual([]);
    expect([...imageIdsInCanvasDocument({ version: 1, data: { nodes: { im_1: 7 } } })]).toEqual([]);
    expect(
      [...imageIdsInCanvasDocument({ version: 1, data: { nodes: { im_1: { kind: 'image' } } } })],
    ).toEqual([]);
    expect([
      ...imageIdsInCanvasDocument({
        version: 1,
        data: { nodes: { im_1: { kind: 'image', content: { imageId: 12 } } } },
      }),
    ]).toEqual([]);
  });
});

describe('reading the image ids a history entry names', () => {
  it('takes the node a create carries', () => {
    const entries: CanvasOpEntry[] = [
      {
        revision: 1,
        author: 'user',
        at: '2026-01-01T00:00:00.000Z',
        op: { type: 'create', node: imageNode('im_1', 'created-id') },
        prior: { kind: 'none' },
      },
    ];
    expect([...imageIdsInCanvasEntries(entries)]).toEqual(['created-id']);
  });

  it('takes the node a duplicate carries', () => {
    const entries: CanvasOpEntry[] = [
      {
        revision: 2,
        author: 'user',
        at: '2026-01-01T00:00:00.000Z',
        op: {
          type: 'duplicate',
          node: {
            ...imageNode('im_2', 'duplicated-id'),
            provenance: { from: 'im_1', at: '2026-01-01T00:00:00.000Z' },
          },
        },
        prior: { kind: 'none' },
      },
    ];
    expect([...imageIdsInCanvasEntries(entries)]).toEqual(['duplicated-id']);
  });

  it('takes the node a remove set aside as its prior', () => {
    const entries: CanvasOpEntry[] = [
      {
        revision: 3,
        author: 'user',
        at: '2026-01-01T00:00:00.000Z',
        op: { type: 'remove', id: 'im_1' },
        prior: { kind: 'node', node: imageNode('im_1', 'removed-id') },
      },
    ];
    expect([...imageIdsInCanvasEntries(entries)]).toEqual(['removed-id']);
  });

  it('names nothing for an entry whose prior is fields', () => {
    const entries: CanvasOpEntry[] = [
      {
        revision: 4,
        author: 'user',
        at: '2026-01-01T00:00:00.000Z',
        op: { type: 'set-image-alt', id: 'im_1', alt: 'a chair' },
        prior: { kind: 'fields', id: 'im_1', fields: { alt: '' } },
      },
    ];
    expect([...imageIdsInCanvasEntries(entries)]).toEqual([]);
  });
});

describe('every document on disk, open or not', () => {
  it('refuses collection when a newer document may name images in a shape this build cannot read', () => {
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath('future-doc'), '{"version":99,"data":{"futureLayout":true}}\n');
    expect(storedCanvasImageIds().complete).toBe(false);
  });

  for (const format of ['bare', 'enveloped'] as const) {
    it(`preserves every blob when a ${format} document has a future inline schema`, () => {
      const root = useOwnRoots(`future-inline-${format}`);
      const project = join(root, 'repo', 'project');
      const kept = registerFor(project, PNG);
      const orphan = registerFor(project, JPEG);
      const future = { schemaVersion: 99, futureLayout: { imageId: kept } };
      const document = format === 'bare' ? future : { version: 1, data: future };
      mkdirSync(canvasDir(), { recursive: true });
      const path = canvasDocPath(`future-inline-${format}`);
      writeFileSync(path, JSON.stringify(document));
      setCanvasRootsProvider(storedCanvasImageIds);
      releaseAllPending(project);

      expect(storedCanvasImageIds().complete).toBe(false);
      expect([...storedCanvasImageIds().ids]).toEqual([]);
      gcSweep();
      expect(readImage(kept)).not.toBeNull();
      expect(readImage(orphan)).not.toBeNull();

      rmSync(path);
      expect(storedCanvasImageIds().complete).toBe(true);
      gcSweep();
      expect(readImage(kept)).toBeNull();
      expect(readImage(orphan)).toBeNull();
    });
  }

  it('names the images of a project nothing opened', async () => {
    useOwnRoots('closed-project');
    const doc = await persist(docWith([imageNode('im_1', 'closed-id')]));
    expect(doc.nodes['im_1']).toBeDefined();
    expect([...storedCanvasImageIds().ids]).toEqual(['closed-id']);
  });

  it('names nothing once the document file is gone', async () => {
    useOwnRoots('deleted-document');
    const doc = await persist(docWith([imageNode('im_1', 'deleted-id')]));
    rmSync(canvasDocPath(doc.docId));
    expect([...storedCanvasImageIds().ids]).toEqual([]);
  });

  it('survives a document it cannot parse, and still names its siblings’ images', async () => {
    useOwnRoots('malformed-document');
    await persist(docWith([imageNode('im_1', 'readable-id')]));
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(join(canvasDir(), `${randomUUID()}.json`), '{ not json at all');

    expect([...storedCanvasImageIds().ids]).toEqual(['readable-id']);
  });

  it('answers complete for a canvas directory that does not exist', () => {
    useOwnRoots('absent-directory');
    expect(storedCanvasImageIds()).toEqual({ ids: new Set(), complete: true });
  });

  it('answers incomplete for a document it could not read', async () => {
    useOwnRoots('incomplete-answer');
    const doc = await persist(docWith([imageNode('im_1', 'unread-id')]));

    chmodSync(canvasDocPath(doc.docId), 0o000);
    try {
      expect(storedCanvasImageIds().complete).toBe(false);
    } finally {
      chmodSync(canvasDocPath(doc.docId), 0o600);
    }
  });

  it('answers complete for malformed bytes, which every later sweep would read the same way', async () => {
    useOwnRoots('malformed-answer');
    await persist(docWith([imageNode('im_1', 'readable-id')]));
    writeFileSync(join(canvasDir(), `${randomUUID()}.json`), '{ not json at all');

    expect(storedCanvasImageIds()).toEqual({ ids: new Set(['readable-id']), complete: true });
  });

  it('answers complete for a quarantine nothing can parse, which nothing ever deletes', async () => {
    useOwnRoots('malformed-quarantine-answer');
    await persist(docWith([imageNode('im_1', 'readable-id')]));
    writeFileSync(
      join(canvasDir(), `${randomUUID()}.json.corrupt-2026-09-30T00-00-00-000Z`),
      '{ not json at all',
    );

    expect(storedCanvasImageIds()).toEqual({ ids: new Set(['readable-id']), complete: true });
  });

  it('leaves an image named only by the history log unrooted', async () => {
    useOwnRoots('skips-log');
    const doc = await persist(docWith([imageNode('im_1', 'in-document')]));
    writeFileSync(
      canvasLogPath(doc.docId),
      JSON.stringify([
        {
          revision: 1,
          author: 'user',
          at: '2026-01-01T00:00:00.000Z',
          op: { type: 'create', node: imageNode('im_2', 'only-in-log') },
          prior: { kind: 'none' },
        },
      ]),
    );

    expect([...storedCanvasImageIds().ids]).toEqual(['in-document']);
  });
});

describe('the live undo and redo stacks', () => {
  it('names the image of a create the user has undone', async () => {
    const root = useOwnRoots('undone-create');
    const project = join(root, 'repo', 'project');
    const host = makeHost();
    await host.open(project);
    const created = await host.apply('user', createOn(imageNode('im_1', 'undone-id')), project);
    expect(created.ok).toBe(true);

    const undone = await host.undoFor(project);
    expect(undone.ok).toBe(true);
    expect(storedImageId((await host.snapshotFor(project)).doc, 'im_1')).toBeUndefined();
    expect([...host.historyImageIds()]).toEqual(['undone-id']);
  });

  it('names the image of a node the user removed', async () => {
    const root = useOwnRoots('removed-node');
    const project = join(root, 'repo', 'project');
    const host = makeHost();
    await host.open(project);
    await host.apply('user', createOn(imageNode('im_1', 'removed-id')), project);
    const removed = await host.apply('user', () => [{ type: 'remove', id: 'im_1' }], project);
    expect(removed.ok).toBe(true);

    expect(storedImageId((await host.snapshotFor(project)).doc, 'im_1')).toBeUndefined();
    expect([...host.historyImageIds()]).toEqual(['removed-id']);
  });

  it('names the image of an accepted create whose revision never reached the disk', async () => {
    const root = useOwnRoots('unpersisted-create');
    const project = join(root, 'repo', 'project');
    const host = makeHost(storeThatNeverPersists(randomUUID()));
    await host.open(project);
    const created = await host.apply('user', createOn(imageNode('im_1', 'unpersisted-id')), project);
    expect(created.ok).toBe(true);
    await settle();

    expect([...storedCanvasImageIds().ids]).toEqual([]);
    expect([...host.historyImageIds()]).toEqual(['unpersisted-id']);
  });

  it('names nothing once the project is closed', async () => {
    const root = useOwnRoots('closed-stacks');
    const project = join(root, 'repo', 'project');
    const host = makeHost();
    await host.open(project);
    await host.apply('user', createOn(imageNode('im_1', 'closed-id')), project);

    await host.close(project);

    expect([...host.historyImageIds()]).toEqual([]);
  });
});

describe('the sweep against the canvas', () => {
  it('keeps the bytes a node names and takes the bytes nothing names', async () => {
    const root = useOwnRoots('kept-and-taken');
    const project = join(root, 'repo', 'project');
    const named = registerFor(project, PNG);
    const orphan = registerFor(project, JPEG);
    await persist(docWith([imageNode('im_1', named)]));
    setCanvasRootsProvider(() => canvasImageIds());

    releaseAllPending(project);
    gcSweep();

    expect(readImage(named)).not.toBeNull();
    expect(readImage(orphan)).toBeNull();
  });

  it('leaves the bytes on disk when the node that named them is removed', async () => {
    const root = useOwnRoots('removal-keeps-bytes');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    setCanvasRootsProvider(() => canvasImageIds());

    await openCanvasForProject(project);
    await applyCanvasOps('user', createOn(imageNode('im_1', kept)), project);
    settlePending(project, [kept]);
    await applyCanvasOps('user', () => [{ type: 'remove', id: 'im_1' }], project);
    await settle();

    expect([...storedCanvasImageIds().ids]).toEqual([]);
    gcSweep();
    expect(readImage(kept)).not.toBeNull();
  });

  it('keeps the bytes of an undone create, and a redo resolves the picture again', async () => {
    const root = useOwnRoots('undo-redo-bytes');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    setCanvasRootsProvider(() => canvasImageIds());

    await openCanvasForProject(project);
    await applyCanvasOps('user', createOn(imageNode('im_1', kept)), project);
    settlePending(project, [kept]);
    expect((await undoAgentCanvas(project)).ok).toBe(true);
    await settle();

    expect([...storedCanvasImageIds().ids]).toEqual([]);
    gcSweep();

    expect((await redoAgentCanvas(project)).ok).toBe(true);
    expect(storedImageId((await canvasSnapshotFor(project)).doc, 'im_1')).toBe(kept);
    expect(readImage(kept)).not.toBeNull();
  });

  it('leaves bytes written but not yet placed on a canvas alone', async () => {
    const root = useOwnRoots('pending-window');
    const project = join(root, 'repo', 'project');
    const inFlight = registerFor(project, PNG);
    setCanvasRootsProvider(() => canvasImageIds());

    gcSweep();
    expect(readImage(inFlight)).not.toBeNull();

    await openCanvasForProject(project);
    await applyCanvasOps('user', createOn(imageNode('im_1', inFlight)), project);
    settlePending(project, [inFlight]);
    gcSweep();

    expect(readImage(inFlight)).not.toBeNull();
  });

  it('takes the bytes of an operation the document refused', async () => {
    const root = useOwnRoots('refused-op');
    const project = join(root, 'repo', 'project');
    const written = registerFor(project, PNG);
    setCanvasRootsProvider(() => canvasImageIds());

    await openCanvasForProject(project);
    const refused = await applyCanvasOps(
      'user',
      createOn(imageNode('im_1', written), { width: 0 }),
      project,
    );
    expect(refused.ok).toBe(false);

    releaseAllPending(project);
    gcSweep();

    expect(readImage(written)).toBeNull();
  });

  it('keeps bytes two documents name until neither names them', async () => {
    const root = useOwnRoots('two-documents');
    const project = join(root, 'repo', 'project');
    const shared = registerFor(project, PNG);
    const first = await persist(docWith([imageNode('im_1', shared)]));
    const second = await persist(docWith([imageNode('im_2', shared)]));
    setCanvasRootsProvider(() => canvasImageIds());
    releaseAllPending(project);

    gcSweep();
    expect(readImage(shared)).not.toBeNull();

    rmSync(canvasDocPath(first.docId));
    gcSweep();
    expect(readImage(shared)).not.toBeNull();

    rmSync(canvasDocPath(second.docId));
    gcSweep();
    expect(readImage(shared)).toBeNull();
  });

  it('keeps a closed project’s bytes through a sweep another project triggered', async () => {
    const root = useOwnRoots('other-project-sweep');
    const closed = join(root, 'repo', 'closed');
    const busy = join(root, 'repo', 'busy');
    const kept = registerFor(closed, PNG);
    await persist(docWith([imageNode('im_1', kept)]));
    setCanvasRootsProvider(() => canvasImageIds());
    releaseAllPending(closed);

    await openCanvasForProject(busy);
    gcSweep();

    expect(readImage(kept)).not.toBeNull();
  });

  it('leaves every blob alone when a document could not be read', async () => {
    const root = useOwnRoots('unreadable-document-sweep');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    const doc = await persist(docWith([imageNode('im_1', kept)]));
    setCanvasRootsProvider(() => canvasImageIds());
    settlePending(project, [kept]);

    chmodSync(canvasDocPath(doc.docId), 0o000);
    try {
      gcSweep();
    } finally {
      chmodSync(canvasDocPath(doc.docId), 0o600);
    }

    expect(readImage(kept)).not.toBeNull();
  });

  it('keeps rooting the images of a document quarantine set aside', async () => {
    const root = useOwnRoots('quarantined-document');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    const orphan = registerFor(project, JPEG);
    const doc = await persist(docWith([imageNode('im_1', kept)]));
    setCanvasRootsProvider(() => canvasImageIds());
    settlePending(project, [kept, orphan]);

    const path = canvasDocPath(doc.docId);
    renameSync(path, `${path}.corrupt-2026-09-30T00-00-00-000Z`);
    gcSweep();

    expect(readImage(kept)).not.toBeNull();
    expect(readImage(orphan)).toBeNull();
  });

  it('still collects against a quarantine whose bytes nothing can parse', async () => {
    const root = useOwnRoots('malformed-quarantine-sweep');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    const orphan = registerFor(project, JPEG);
    await persist(docWith([imageNode('im_1', kept)]));
    setCanvasRootsProvider(() => canvasImageIds());
    settlePending(project, [kept, orphan]);

    // Nothing deletes a quarantine, so a sweep that stopped for one would never run again (ONL-2486).
    writeFileSync(
      join(canvasDir(), `${randomUUID()}.json.corrupt-2026-09-30T00-00-00-000Z`),
      '{ not json at all',
    );
    gcSweep();

    expect(readImage(kept)).not.toBeNull();
    expect(readImage(orphan)).toBeNull();
  });

  it('keeps the bytes of a revision the disk refused, through the close that evicts it', async () => {
    const root = useOwnRoots('refused-persist');
    const project = join(root, 'repo', 'project');
    const kept = registerFor(project, PNG);
    const orphan = registerFor(project, JPEG);
    setCanvasRootsProvider(() => canvasImageIds());
    settlePending(project, [kept, orphan]);

    // Sealed before the open: the adoption that gives the document its page persists too (ONL-2488).
    mkdirSync(canvasDir(), { recursive: true });
    chmodSync(canvasDir(), 0o500);
    try {
      await openCanvasForProject(project);
      const created = await applyCanvasOps(
        'user',
        createOn(imageNode('im_1', kept)),
        project,
      );
      expect(created.ok).toBe(true);
      await flushCanvas();
    } finally {
      chmodSync(canvasDir(), 0o700);
    }

    expect(readdirSync(canvasDir())).toEqual([]);
    gcSweep();

    expect(readImage(kept)).not.toBeNull();
    expect(readImage(orphan)).toBeNull();
  });

  it('holds bytes registered against the project root, not against a session worktree', async () => {
    const root = useOwnRoots('project-root-namespace');
    const project = join(root, 'repo', 'project');
    const session = join(root, 'repo', 'project.session-1');
    const kept = registerFor(project, PNG);
    await persist(docWith([imageNode('im_1', kept)]));
    setCanvasRootsProvider(() => canvasImageIds());
    releaseAllPending(project);

    clearWorkspaceImages(session);
    gcSweep();
    expect(readImage(kept)).not.toBeNull();

    clearWorkspaceImages(project);
    expect(readImage(kept)).toBeNull();
  });
});
