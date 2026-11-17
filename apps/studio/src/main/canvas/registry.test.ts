import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'bun:test';
import type { CanvasDoc, CanvasDocId } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { canvasDir, canvasDocPath, createFsDocumentStore } from './fs-backend.js';
import {
  canvasDocIdFor,
  forgetCanvasDoc,
  openCanvasDoc,
  resetCanvasRegistryCache,
} from './registry.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-registry-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetCanvasRegistryCache();
  return root;
}

const fixtureDoc = (): CanvasDoc =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL('fixtures/two-frame-canvas.json', import.meta.url)), 'utf8'),
  ) as CanvasDoc;

describe('the canvas registry — minting, proven first', () => {
  it('mints a doc id for an unknown worktree once, and answers it stably across calls and a cache drop', () => {
    const root = useOwnWorkspaceRoot('mint');
    const worktree = join(root, 'github-com-fixture-alpha', 'teal-skylark');

    const minted = canvasDocIdFor(worktree);
    expect(minted.length).toBeGreaterThan(0);
    expect(canvasDocIdFor(worktree)).toBe(minted);

    resetCanvasRegistryCache();
    expect(canvasDocIdFor(worktree)).toBe(minted);

    const file = JSON.parse(readFileSync(join(root, 'canvas-registry.json'), 'utf8')) as {
      version: number;
      data: { documents: Record<string, CanvasDocId> };
    };
    expect(file.version).toBe(1);
    expect(Object.values(file.data.documents)).toEqual([minted]);

    // The control: without it phase 2 passes off a stale cache.
    writeFileSync(
      join(root, 'canvas-registry.json'),
      JSON.stringify({ version: 1, data: { documents: {} } }),
      'utf8',
    );
    resetCanvasRegistryCache();
    expect(canvasDocIdFor(worktree)).not.toBe(minted);
  });

  it('keys one directory once — two spellings of one worktree share a document', () => {
    const root = useOwnWorkspaceRoot('spellings');
    const worktree = join(root, 'repo', 'amber-kestrel');
    // Not `join`: it collapses `..` itself and the case proves nothing.
    const dotted = `${root}/repo/../repo/amber-kestrel/`;

    expect(dotted).not.toBe(worktree);
    expect(canvasDocIdFor(dotted)).toBe(canvasDocIdFor(worktree));
  });

  it('keeps distinct worktrees on distinct documents', () => {
    const root = useOwnWorkspaceRoot('distinct');
    expect(canvasDocIdFor(join(root, 'repo', 'a'))).not.toBe(canvasDocIdFor(join(root, 'repo', 'b')));
  });

  it('forgets a removed worktree — the next open is a new document — and touches nothing else', () => {
    const root = useOwnWorkspaceRoot('forget');
    const doomed = join(root, 'repo', 'doomed');
    const bystander = join(root, 'repo', 'bystander');
    const doomedId = canvasDocIdFor(doomed);
    const bystanderId = canvasDocIdFor(bystander);

    forgetCanvasDoc(doomed);
    expect(canvasDocIdFor(doomed)).not.toBe(doomedId);
    expect(canvasDocIdFor(bystander)).toBe(bystanderId);
  });
});

describe('openCanvasDoc — the open a project performs', () => {
  it('a first open is a fresh document under the association it just minted', async () => {
    const root = useOwnWorkspaceRoot('open-first');
    const worktree = join(root, 'repo', 'w');

    const opened = await openCanvasDoc(worktree, createFsDocumentStore());
    expect(opened.outcome).toBe('fresh');
    expect(opened.doc.docId).toBe(canvasDocIdFor(worktree));
    expect(opened.doc.nodes).toEqual({});
  });

  it('opens the stored document and leaves the association alone', async () => {
    const root = useOwnWorkspaceRoot('open-healthy');
    const worktree = join(root, 'repo', 'w');
    const store = createFsDocumentStore();
    const docId = canvasDocIdFor(worktree);
    await store.persist({ ...fixtureDoc(), docId });

    const opened = await openCanvasDoc(worktree, store);
    expect(opened.outcome).toBe('existing');
    expect(opened.doc.docId).toBe(docId);
    expect(canvasDocIdFor(worktree)).toBe(docId);
  });

  it('a corrupt document quarantines, opens fresh, and the association is rewritten to the fresh id', async () => {
    const root = useOwnWorkspaceRoot('open-corrupt');
    const worktree = join(root, 'repo', 'w');
    const store = createFsDocumentStore();
    const docId = canvasDocIdFor(worktree);
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(docId), 'damage beyond parsing');

    const opened = await openCanvasDoc(worktree, store);
    expect(opened.outcome).toBe('recovered');
    expect(opened.doc.docId).not.toBe(docId);
    expect(opened.doc.nodes).toEqual({});

    expect(canvasDocIdFor(worktree)).toBe(opened.doc.docId);
    resetCanvasRegistryCache();
    expect(canvasDocIdFor(worktree)).toBe(opened.doc.docId);

    const aside = readdirSync(canvasDir()).filter((f) => f.includes('.corrupt-'));
    expect(aside).toHaveLength(1);
  });
});
