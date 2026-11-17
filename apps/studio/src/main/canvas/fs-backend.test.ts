import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'bun:test';
import type { CanvasDoc, CanvasNode, CanvasOpEntry } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  canvasDir,
  canvasDocPath,
  canvasLogPath,
  createFsDocumentStore,
  canDeleteCanvasDocFiles,
  deleteCanvasDocFiles,
} from './fs-backend.js';
import { thumbnailMtime, thumbnailPath, writeThumbnail } from './thumbnail/store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-fs-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  return root;
}

const fixturePath = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));

const fixtureDoc = (): CanvasDoc =>
  JSON.parse(readFileSync(fixturePath('two-frame-canvas.json'), 'utf8')) as CanvasDoc;
const fixtureLog = (): CanvasOpEntry[] =>
  JSON.parse(readFileSync(fixturePath('two-frame-canvas.log.json'), 'utf8')) as CanvasOpEntry[];

function corruptArtifacts(): string[] {
  if (!existsSync(canvasDir())) return [];
  return readdirSync(canvasDir()).filter((f) => f.includes('.corrupt-'));
}

describe('fs document store — the round-trip, proven first', () => {
  it('persists the fixture doc and loads it back identical, keyed by doc id on disk', async () => {
    const root = useOwnWorkspaceRoot('roundtrip');
    const store = createFsDocumentStore();
    const doc = fixtureDoc();

    await store.persist(doc);
    expect(canvasDocPath(doc.docId)).toBe(join(root, 'canvas', `${doc.docId}.json`));
    expect(existsSync(canvasDocPath(doc.docId))).toBe(true);
    expect(statSync(canvasDocPath(doc.docId)).mode & 0o777).toBe(0o600);

    const loaded = await store.load(doc.docId);
    expect(loaded.outcome).toBe('existing');
    expect(loaded.doc).toEqual(doc);
    // The pages and the nodes' `pageId` ride schema 1; a bump would quarantine every shipped canvas (ONL-2488).
    expect(loaded.doc.schemaVersion).toBe(1);
    expect(Object.keys(loaded.doc.pages)).toHaveLength(1);
    expect(corruptArtifacts()).toHaveLength(0);
  });

  it('a node carrying a kind this build has never heard of loads intact: the envelope alone decides', async () => {
    useOwnWorkspaceRoot('unknown-kind');
    const doc = fixtureDoc();
    const laterBuildNode = {
      id: 'sk_z9',
      kind: 'sketch',
      name: 'from a later build',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      order: 7,
      content: { strokes: 4 },
    } as unknown as CanvasNode;
    const stored: CanvasDoc = { ...doc, nodes: { ...doc.nodes, sk_z9: laterBuildNode } };
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(doc.docId), JSON.stringify({ version: 1, data: stored }));

    const loaded = await createFsDocumentStore().load(doc.docId);
    expect(loaded.outcome).toBe('existing');
    expect(loaded.doc).toEqual(stored);
    expect(corruptArtifacts()).toHaveLength(0);
  });

  it('a top-level key this build has never heard of loads intact: the envelope is cast, never rebuilt (ONL-2488)', async () => {
    useOwnWorkspaceRoot('unknown-key');
    const doc = fixtureDoc();
    const stored = { ...doc, currentPageId: 'page-doc_7q1xk4' };
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(doc.docId), JSON.stringify({ version: 1, data: stored }));

    const loaded = await createFsDocumentStore().load(doc.docId);
    expect(loaded.outcome).toBe('existing');
    expect(loaded.doc).toEqual(stored as CanvasDoc);
    expect(loaded.doc.schemaVersion).toBe(1);
    expect(corruptArtifacts()).toHaveLength(0);
  });

  it('history composes the log sidecar, beside the document and keyed the same way', async () => {
    const root = useOwnWorkspaceRoot('history');
    const store = createFsDocumentStore();
    const doc = fixtureDoc();
    const [first, second] = fixtureLog();

    await store.appendHistory(doc.docId, [first!]);
    await store.appendHistory(doc.docId, [second!]);

    expect(await store.readHistory(doc.docId)).toEqual([first, second]);
    expect(canvasLogPath(doc.docId)).toBe(join(root, 'canvas', `${doc.docId}.log.json`));
    expect(existsSync(canvasLogPath(doc.docId))).toBe(true);
  });
});

describe('fs document store — load failure is never a crash', () => {
  it('a missing document answers fresh under the REQUESTED id, quarantining nothing', async () => {
    useOwnWorkspaceRoot('missing');

    const loaded = await createFsDocumentStore().load('doc_never_written');
    expect(loaded).toEqual({
      outcome: 'fresh',
      // Pageless: the first page is authored as an operation in `host.open`, never stamped on at load (ONL-2488).
      doc: { schemaVersion: 1, docId: 'doc_never_written', revision: 0, pages: {}, nodes: {} },
    });
    expect(corruptArtifacts()).toHaveLength(0);
  });

  it('a corrupt document is set aside with its bytes intact, and a fresh doc under a NEW id answers', async () => {
    useOwnWorkspaceRoot('corrupt');
    const path = canvasDocPath('doc_damaged');
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(path, '{ not json at all');

    const loaded = await createFsDocumentStore().load('doc_damaged');
    expect(loaded.outcome).toBe('recovered');
    expect(loaded.doc.revision).toBe(0);
    expect(loaded.doc.nodes).toEqual({});
    expect(loaded.doc.docId).not.toBe('doc_damaged');

    const aside = corruptArtifacts();
    expect(aside).toHaveLength(1);
    expect(readFileSync(join(canvasDir(), aside[0] as string), 'utf8')).toBe('{ not json at all');
    expect(existsSync(path)).toBe(false);
  });

  // Root reads through a 000 mode, so the case cannot arrange its failure there.
  it.skipIf(process.getuid?.() === 0)(
    'an unreadable document answers recovered under a NEW id, and the file survives the next persist unread',
    async () => {
      useOwnWorkspaceRoot('unreadable');
      const store = createFsDocumentStore();
      const doc = fixtureDoc();
      await store.persist(doc);
      const path = canvasDocPath(doc.docId);
      const original = readFileSync(path, 'utf8');
      chmodSync(path, 0o000);

      try {
        const loaded = await store.load(doc.docId);
        expect(loaded.outcome).toBe('recovered');
        expect(loaded.doc.revision).toBe(0);
        expect(loaded.doc.nodes).toEqual({});
        expect(loaded.doc.docId).not.toBe(doc.docId);
        expect(corruptArtifacts()).toHaveLength(0);

        await store.persist(loaded.doc);
        expect(existsSync(canvasDocPath(loaded.doc.docId))).toBe(true);
      } finally {
        chmodSync(path, 0o600);
      }
      expect(readFileSync(path, 'utf8')).toBe(original);
    },
  );

  it('a future document keeps its id and bytes through load, persist, history and deletion', async () => {
    useOwnWorkspaceRoot('unmigratable');
    const doc = fixtureDoc();
    mkdirSync(canvasDir(), { recursive: true });
    const path = canvasDocPath(doc.docId);
    const original = JSON.stringify({ version: 99, data: doc });
    writeFileSync(path, original);
    writeThumbnail(doc.docId, Buffer.from('thumbnail'));
    const store = createFsDocumentStore();

    const loaded = await store.load(doc.docId);
    expect(loaded.outcome).toBe('existing');
    expect(loaded.doc.docId).toBe(doc.docId);
    expect(loaded.doc.nodes).toEqual({});
    await expect(store.persist(loaded.doc)).rejects.toThrow();
    await store.appendHistory(doc.docId, fixtureLog());
    expect(existsSync(canvasLogPath(doc.docId))).toBe(false);
    expect(canDeleteCanvasDocFiles(doc.docId)).toBe(false);
    expect(deleteCanvasDocFiles(doc.docId)).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(original);
    expect(existsSync(thumbnailPath(doc.docId))).toBe(true);
    expect(corruptArtifacts()).toHaveLength(0);
  });

  it('a future history refuses deletion before the document or thumbnail is erased', async () => {
    useOwnWorkspaceRoot('future-history');
    const doc = fixtureDoc();
    await createFsDocumentStore().persist(doc);
    const path = canvasLogPath(doc.docId);
    const original = JSON.stringify({ version: 99, data: [] });
    writeFileSync(path, original);
    expect(deleteCanvasDocFiles(doc.docId)).toBe(false);
    expect(existsSync(canvasDocPath(doc.docId))).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(original);
  });

  it('an inline future schema is preserved without a preceding read', async () => {
    useOwnWorkspaceRoot('inline-future');
    const doc = fixtureDoc();
    mkdirSync(canvasDir(), { recursive: true });
    const path = canvasDocPath(doc.docId);
    const original = JSON.stringify({ ...doc, schemaVersion: 99 });
    writeFileSync(path, original);
    const store = createFsDocumentStore();
    await expect(store.persist(doc)).rejects.toThrow();
    expect((await store.load(doc.docId)).doc.docId).toBe(doc.docId);
    expect(deleteCanvasDocFiles(doc.docId)).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(original);
  });

  it('a document claiming a different id than its filename keys is damage, not truth', async () => {
    useOwnWorkspaceRoot('wrong-id');
    const doc = fixtureDoc();
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath('doc_other'), JSON.stringify({ version: 1, data: doc }));

    const loaded = await createFsDocumentStore().load('doc_other');
    expect(loaded.outcome).toBe('recovered');
    expect(corruptArtifacts()).toHaveLength(1);
  });
});

describe('deleteCanvasDocFiles — the blank rollback’s removal (ONL-2152)', () => {
  it('removes the document and its log, leaves a quarantined sibling, and tolerates absence', async () => {
    useOwnWorkspaceRoot('delete');
    const doc = fixtureDoc();
    const store = createFsDocumentStore();
    await store.persist(doc);
    await store.appendHistory(doc.docId, fixtureLog());
    const aside = `${canvasDocPath(doc.docId)}.corrupt-evidence`;
    writeFileSync(aside, 'not ours to delete');

    deleteCanvasDocFiles(doc.docId);

    expect(existsSync(canvasDocPath(doc.docId))).toBe(false);
    expect(existsSync(canvasLogPath(doc.docId))).toBe(false);
    expect(existsSync(aside)).toBe(true);
    expect(() => deleteCanvasDocFiles(doc.docId)).not.toThrow();
  });

  it('removes the thumbnail and an interrupted write’s temp sibling, and tolerates a project never photographed', async () => {
    useOwnWorkspaceRoot('delete-thumbnail');
    const doc = fixtureDoc();
    const store = createFsDocumentStore();
    await store.persist(doc);
    writeThumbnail(doc.docId, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const stranded = `${thumbnailPath(doc.docId)}.4242.tmp`;
    writeFileSync(stranded, 'half a screenshot');

    deleteCanvasDocFiles(doc.docId);

    expect(existsSync(thumbnailPath(doc.docId))).toBe(false);
    expect(existsSync(stranded)).toBe(false);
    expect(thumbnailMtime(doc.docId)).toBeNull();

    await store.persist(doc);
    expect(() => deleteCanvasDocFiles(doc.docId)).not.toThrow();
  });
});

describe('fs document store — migration', () => {
  it('a v0 (envelope-less) document loads migrated, and the migration is written back', async () => {
    useOwnWorkspaceRoot('migration');
    const doc = fixtureDoc();
    const { schemaVersion: _dropped, ...v0 } = doc;
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(doc.docId), JSON.stringify(v0));

    const loaded = await createFsDocumentStore().load(doc.docId);
    expect(loaded.outcome).toBe('existing');
    expect(loaded.doc).toEqual(doc);

    const raw = JSON.parse(readFileSync(canvasDocPath(doc.docId), 'utf8')) as {
      version: number;
      data: CanvasDoc;
    };
    expect(raw.version).toBe(1);
    expect(raw.data).toEqual(doc);
    expect(corruptArtifacts()).toHaveLength(0);
  });
});
