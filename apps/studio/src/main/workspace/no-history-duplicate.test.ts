import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, gitOutput, makeStateRoot, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { CanvasDoc } from '@studio/events';
import { resetUserEnvForTests } from '../env/shell-env.js';
import { readCanvasCamera, resetCanvasCameraCache, writeCanvasCamera } from '../canvas/camera.js';
import { canvasDir } from '../canvas/dir.js';
import { emptyCanvasDoc } from '../canvas/document.js';
import { createFsDocumentStore, readExistingCanvasDoc } from '../canvas/fs-backend.js';
import { knownCanvasDocId, rebindCanvasDoc, resetCanvasRegistryCache } from '../canvas/registry.js';
import { readImage, registerImage, resetImagesStore } from '../images/store.js';
import { workspaceHash } from '../lib/canonical-path.js';
import { resetServerBookCache } from '../server/book.js';
import { stateRoot } from '../state/root.js';
import { blankWithoutHistory, claimBlankBucket, clearBlankMarker } from './blank.js';
import { completeDuplicateRegistration, fabricateDuplicate, planDuplicate, rollbackDuplicate } from './duplicate.js';
import { knownProject, projectHasNoHistory, rememberProject, resetWorkspaceCache, workspaceHeldOrigin } from './store.js';

const originalPath = process.env['PATH'];
const originalStateRoot = process.env['STUDIO_STATE_ROOT'];
const imageBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

afterEach(() => {
  if (originalPath === undefined) delete process.env['PATH'];
  else process.env['PATH'] = originalPath;
  if (originalStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalStateRoot;
  resetUserEnvForTests();
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetCanvasCameraCache();
  resetImagesStore();
  resetServerBookCache();
  restoreWorkspaceRoot();
});

afterAll(() => cleanupTempFixtures());

async function sourceProject(options: { withGit?: boolean } = {}) {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: 'no-history-duplicate' });
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'no-history-duplicate-state' });
  if (!options.withGit) process.env['PATH'] = '';
  resetUserEnvForTests(async () => ({ PATH: process.env['PATH'] ?? '' }));
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetCanvasCameraCache();
  resetImagesStore();
  resetServerBookCache();
  const claimed = claimBlankBucket();
  if (!claimed.ok) throw new Error('expected fresh blank bucket');
  const source = blankWithoutHistory(claimed.claim);
  mkdirSync(source.workspacePath);
  writeFileSync(join(source.workspacePath, 'design.txt'), 'Original design\n');
  rememberProject(source);
  clearBlankMarker(claimed.claim.bucket);
  const doc = emptyCanvasDoc(randomUUID());
  doc.pages.design = { id: 'design', name: 'Design', order: 0 };
  await createFsDocumentStore().persist(doc);
  rebindCanvasDoc(source.workspacePath, doc.docId);
  return { source, doc };
}

async function duplicate(sourcePath: string) {
  const plan = await planDuplicate(sourcePath);
  if (plan.kind !== 'ready') throw new Error('expected duplicate plan');
  const result = await fabricateDuplicate(plan);
  if (!result.ok) throw new Error(`expected duplicate: ${result.detail ?? ''}`);
  rememberProject(result.workspace);
  completeDuplicateRegistration(result.workspace.workspacePath);
  return result.workspace;
}

function fixtureGit(cwd: string, args: string[]): string {
  return gitOutput(cwd, [
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
    '-c', 'user.name=Fixture User', '-c', 'user.email=fixture@example.com',
    ...args,
  ]);
}

function addImage(doc: CanvasDoc, id: string, imageId: string): void {
  doc.nodes[id] = {
    id, pageId: 'design', kind: 'image', name: '', x: 0, y: 0, width: 40, height: 40, order: Object.keys(doc.nodes).length,
    content: { imageId, name: id, originalWidth: 40, originalHeight: 40 },
  };
}

describe('folder-backed Project duplication', () => {
  it('preserves relative symlinks and isolates copies even after the original is removed', async () => {
    const { source, doc } = await sourceProject();
    mkdirSync(join(source.workspacePath, 'assets'));
    writeFileSync(join(source.workspacePath, 'assets', 'color.txt'), 'Original color\n');
    mkdirSync(join(source.workspacePath, 'links'));
    const links = { 'design-link': 'design.txt', 'assets-link': 'assets', 'links/color': '../assets/color.txt', 'missing-link': 'missing.txt' };
    for (const [name, target] of Object.entries(links)) symlinkSync(target, join(source.workspacePath, name));
    mkdirSync(join(source.workspacePath, 'node_modules'));
    writeFileSync(join(source.workspacePath, 'node_modules', 'generated.txt'), 'Do not copy\n');
    const copy = await duplicate(source.workspacePath);
    expect(copy.history).toBe('none');
    expect(workspaceHeldOrigin(copy)).toBe('blank');
    expect(projectHasNoHistory(copy.workspacePath)).toBe(true);
    expect(existsSync(join(copy.workspacePath, '.git'))).toBe(false);
    expect(existsSync(join(copy.workspacePath, 'node_modules'))).toBe(false);
    for (const [name, target] of Object.entries(links)) {
      expect(lstatSync(join(copy.workspacePath, name)).isSymbolicLink()).toBe(true);
      expect(readlinkSync(join(copy.workspacePath, name))).toBe(target);
      expect(readlinkSync(join(source.workspacePath, name))).toBe(target);
    }
    writeFileSync(join(copy.workspacePath, 'design-link'), 'Copied design\n');
    writeFileSync(join(copy.workspacePath, 'assets-link', 'color.txt'), 'Copied color\n');
    expect(readFileSync(join(source.workspacePath, 'design.txt'), 'utf8')).toBe('Original design\n');
    expect(readFileSync(join(source.workspacePath, 'links', 'color'), 'utf8')).toBe('Original color\n');
    const copyDocId = knownCanvasDocId(copy.workspacePath);
    expect(copyDocId).toBeDefined();
    expect(copyDocId).not.toBe(doc.docId);
    expect(readExistingCanvasDoc(doc.docId)).toEqual(doc);
    rmSync(source.workspacePath, { recursive: true });
    expect(readFileSync(join(copy.workspacePath, 'design-link'), 'utf8')).toBe('Copied design\n');
    expect(readFileSync(join(copy.workspacePath, 'links', 'color'), 'utf8')).toBe('Copied color\n');
    const nextCopy = await duplicate(copy.workspacePath);
    expect(nextCopy.history).toBe('none');
    for (const [name, target] of Object.entries(links)) expect(readlinkSync(join(nextCopy.workspacePath, name))).toBe(target);
    writeFileSync(join(nextCopy.workspacePath, 'design-link'), 'Independent next copy\n');
    expect(readFileSync(join(copy.workspacePath, 'design-link'), 'utf8')).toBe('Copied design\n');
  });

  for (const committed of [false, true]) {
    it(`keeps folder storage after explicit Git initialization ${committed ? 'with a commit' : 'without a commit'}`, async () => {
      const { source } = await sourceProject({ withGit: true });
      fixtureGit(source.workspacePath, ['init', '--quiet', '-b', 'main']);
      if (committed) {
        fixtureGit(source.workspacePath, ['add', '.']);
        fixtureGit(source.workspacePath, ['commit', '--quiet', '-m', 'Synthetic design history']);
      }
      writeFileSync(join(source.workspacePath, 'design.txt'), 'Current disk design\n');
      writeFileSync(join(source.workspacePath, 'untracked.txt'), 'New design\n');
      symlinkSync('design.txt', join(source.workspacePath, 'design-link'));
      const status = fixtureGit(source.workspacePath, ['status', '--porcelain=v1']);
      const head = committed ? fixtureGit(source.workspacePath, ['rev-parse', 'HEAD']) : undefined;
      expect(projectHasNoHistory(source.workspacePath)).toBe(false);
      expect(knownProject(source.workspacePath)?.history).toBe('none');
      expect(workspaceHeldOrigin(source)).toBe('blank');
      expect(existsSync(join(source.sourceRepoRoot, '.git'))).toBe(false);
      const copy = await duplicate(source.workspacePath);
      expect(copy.history).toBe('none');
      expect(workspaceHeldOrigin(copy)).toBe('blank');
      expect(projectHasNoHistory(copy.workspacePath)).toBe(true);
      expect(existsSync(join(copy.workspacePath, '.git'))).toBe(false);
      expect(readFileSync(join(copy.workspacePath, 'design.txt'), 'utf8')).toBe('Current disk design\n');
      expect(readFileSync(join(copy.workspacePath, 'untracked.txt'), 'utf8')).toBe('New design\n');
      expect(readlinkSync(join(copy.workspacePath, 'design-link'))).toBe('design.txt');
      expect(fixtureGit(source.workspacePath, ['status', '--porcelain=v1'])).toBe(status);
      if (head !== undefined) expect(fixtureGit(source.workspacePath, ['rev-parse', 'HEAD'])).toBe(head);
      expect(readdirSync(source.sourceRepoRoot)).toEqual([]);
    });
  }

  it('rolls back copied files and partial images when a later canvas image is missing', async () => {
    const { source, doc } = await sourceProject();
    const sibling = await duplicate(source.workspacePath);
    const image = registerImage(source.workspacePath, imageBytes, { allowSvg: true });
    if (!image.ok) throw new Error('expected synthetic image');
    addImage(doc, 'first', image.image.id);
    addImage(doc, 'missing', 'missing-image');
    await createFsDocumentStore().persist(doc);
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected duplicate plan');
    const imagesBefore = readdirSync(join(stateRoot(), 'image-blobs')).sort();
    const documentsBefore = readdirSync(canvasDir()).sort();
    const result = await fabricateDuplicate(plan);
    expect(result).toMatchObject({ ok: false, reason: 'create-failed' });
    if (result.ok) throw new Error('expected missing image failure');
    expect(result.detail).toContain('image');
    expect(existsSync(plan.workspacePath)).toBe(false);
    expect(knownProject(plan.workspacePath)).toBeUndefined();
    expect(knownCanvasDocId(plan.workspacePath)).toBeUndefined();
    expect(existsSync(join(stateRoot(), 'image-blobs', workspaceHash(plan.workspacePath)))).toBe(false);
    expect(readdirSync(join(stateRoot(), 'image-blobs')).sort()).toEqual(imagesBefore);
    expect(readdirSync(canvasDir()).sort()).toEqual(documentsBefore);
    expect(readImage(image.image.id)?.bytes).toEqual(imageBytes);
    expect(readExistingCanvasDoc(doc.docId)).toEqual(doc);
    expect(readFileSync(join(source.workspacePath, 'design.txt'), 'utf8')).toBe('Original design\n');
    expect(readFileSync(join(sibling.workspacePath, 'design.txt'), 'utf8')).toBe('Original design\n');
    expect(knownProject(sibling.workspacePath)).toBeDefined();
    await rollbackDuplicate(plan);
    await expect(fabricateDuplicate(plan)).rejects.toThrow();
  });

  it('does not remove an existing destination or its canvas and image ownership on refusal', async () => {
    const { source, doc } = await sourceProject();
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected duplicate plan');
    mkdirSync(plan.workspacePath);
    writeFileSync(join(plan.workspacePath, 'existing.txt'), 'Already owned\n');
    const destinationDoc = emptyCanvasDoc(randomUUID());
    destinationDoc.pages.design = { id: 'design', name: 'Existing design', order: 0 };
    const image = registerImage(plan.workspacePath, imageBytes, { allowSvg: true });
    if (!image.ok) throw new Error('expected destination image');
    addImage(destinationDoc, 'existing', image.image.id);
    await createFsDocumentStore().persist(destinationDoc);
    rebindCanvasDoc(plan.workspacePath, destinationDoc.docId);
    writeCanvasCamera(destinationDoc.docId, 'design', { x: 12, y: 34, zoom: 0.7 });
    const imagesBefore = readdirSync(join(stateRoot(), 'image-blobs')).sort();
    const documentsBefore = readdirSync(canvasDir()).sort();
    expect(await fabricateDuplicate(plan)).toMatchObject({ ok: false, reason: 'create-failed' });
    await rollbackDuplicate(plan);
    expect(readFileSync(join(plan.workspacePath, 'existing.txt'), 'utf8')).toBe('Already owned\n');
    expect(existsSync(join(plan.workspacePath, 'design.txt'))).toBe(false);
    expect(knownCanvasDocId(plan.workspacePath)).toBe(destinationDoc.docId);
    expect(readExistingCanvasDoc(destinationDoc.docId)).toEqual(destinationDoc);
    expect(readCanvasCamera(destinationDoc.docId, 'design')).toEqual({ x: 12, y: 34, zoom: 0.7 });
    expect(readImage(image.image.id)?.bytes).toEqual(imageBytes);
    expect(readdirSync(join(stateRoot(), 'image-blobs')).sort()).toEqual(imagesBefore);
    expect(readdirSync(canvasDir()).sort()).toEqual(documentsBefore);
    expect(readExistingCanvasDoc(doc.docId)).toEqual(doc);
    expect(knownProject(source.workspacePath)).toBeDefined();
  });
});
