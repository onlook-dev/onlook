import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'bun:test';
import type { CanvasDoc } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  canvasDir,
  canvasDocPath,
  createFsDocumentStore,
  readExistingCanvasDoc,
  readSmallExistingCanvasDoc,
} from './fs-backend.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): void {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: `canvas-small-${name}` });
}

function fixtureDoc(): CanvasDoc {
  const path = fileURLToPath(new URL('fixtures/two-frame-canvas.json', import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as CanvasDoc;
}

function writeDocument(docId: string, contents: string): void {
  mkdirSync(canvasDir(), { recursive: true });
  writeFileSync(canvasDocPath(docId), contents);
}

function expectUnchangedAndRemovable(docId: string, original: string): void {
  const path = canvasDocPath(docId);
  expect(readFileSync(path, 'utf8')).toBe(original);
  expect(readdirSync(canvasDir())).toEqual([basename(path)]);
  const moved = `${path}.moved`;
  renameSync(path, moved);
  rmSync(moved);
  expect(readdirSync(canvasDir())).toEqual([]);
}

describe('readSmallExistingCanvasDoc', () => {
  it('reads a persisted current document identically to readExistingCanvasDoc', async () => {
    useOwnWorkspaceRoot('current');
    const doc = fixtureDoc();
    await createFsDocumentStore().persist(doc);
    const original = readFileSync(canvasDocPath(doc.docId), 'utf8');

    const loaded = await readSmallExistingCanvasDoc(doc.docId);
    expect(loaded).toEqual(readExistingCanvasDoc(doc.docId));
    expect(loaded).toEqual(doc);
    expectUnchangedAndRemovable(doc.docId, original);
  });

  it('accepts a valid document of exactly 64 KiB', async () => {
    useOwnWorkspaceRoot('limit');
    const doc = fixtureDoc();
    const original = JSON.stringify({ version: 1, data: doc }).padEnd(65_536, ' ');
    writeDocument(doc.docId, original);
    expect(statSync(canvasDocPath(doc.docId)).size).toBe(65_536);

    expect(await readSmallExistingCanvasDoc(doc.docId)).toEqual(doc);
    expectUnchangedAndRemovable(doc.docId, original);
  });

  it('rejects an absent document without creating files', async () => {
    useOwnWorkspaceRoot('absent');
    mkdirSync(canvasDir(), { recursive: true });

    await expect(readSmallExistingCanvasDoc('doc_never_written')).rejects.toThrow();

    expect(existsSync(canvasDocPath('doc_never_written'))).toBe(false);
    expect(readdirSync(canvasDir())).toEqual([]);
  });

  const rejectedDocuments = [
    { name: 'malformed JSON', contents: () => '{not json' },
    { name: 'a future envelope', contents: (doc: CanvasDoc) => JSON.stringify({ version: 99, data: doc }) },
    {
      name: 'a future inline schema inside a current envelope',
      contents: (doc: CanvasDoc) => JSON.stringify({ version: 1, data: { ...doc, schemaVersion: 99 } }),
    },
    {
      name: 'a document claiming the wrong id',
      contents: (doc: CanvasDoc) => JSON.stringify({ version: 1, data: { ...doc, docId: 'doc_other' } }),
    },
  ];

  for (const { name, contents } of rejectedDocuments) {
    it(`rejects ${name} without rewriting or quarantining it`, async () => {
      useOwnWorkspaceRoot('rejected');
      const doc = fixtureDoc();
      const original = contents(doc);
      writeDocument(doc.docId, original);
      const before = statSync(canvasDocPath(doc.docId));

      await expect(readSmallExistingCanvasDoc(doc.docId)).rejects.toThrow();

      const after = statSync(canvasDocPath(doc.docId));
      expect(after.ino).toBe(before.ino);
      expect(after.mtimeMs).toBe(before.mtimeMs);
      expectUnchangedAndRemovable(doc.docId, original);
    });
  }

  it('rejects a valid document one byte over 64 KiB without rewriting or quarantining it', async () => {
    useOwnWorkspaceRoot('oversized');
    const doc = fixtureDoc();
    const original = JSON.stringify({ version: 1, data: doc }).padEnd(65_537, ' ');
    writeDocument(doc.docId, original);
    const before = statSync(canvasDocPath(doc.docId));
    expect(before.size).toBe(65_537);

    await expect(readSmallExistingCanvasDoc(doc.docId)).rejects.toThrow('too large');

    const after = statSync(canvasDocPath(doc.docId));
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expectUnchangedAndRemovable(doc.docId, original);
  });
});
