import { randomUUID } from 'node:crypto';
import { renameSync } from 'node:fs';
import { open } from 'node:fs/promises';
import type { CanvasDoc, CanvasDocId } from '@studio/events';
import { removeAtomicFile } from '../fs-atomic.js';
import { canWriteStateFile, decodeStateFile, readStateFile, writeStateFile } from '../state/file.js';
import type { CanvasDocumentStore } from './adapter.js';
import { canvasDocPath, canvasLogPath } from './dir.js';
import { CANVAS_SCHEMA_VERSION, emptyCanvasDoc } from './document.js';
import { appendCanvasLog, CANVAS_HISTORY_VERSION, readCanvasLog } from './log.js';
import { removeThumbnail } from './thumbnail/store.js';
import { log } from '../log/index.js';

const logger = log('canvas');

export { canvasDir, canvasDocPath, canvasLogPath } from './dir.js';

function readDocumentFile(docId: CanvasDocId): ReturnType<typeof readStateFile> {
  const saved = readStateFile(canvasDocPath(docId), CANVAS_SCHEMA_VERSION);
  if (saved.kind !== 'data') return saved;
  const inline = decodeStateFile(saved.data, CANVAS_SCHEMA_VERSION, { inline: true, versionKey: 'schemaVersion' });
  return inline.kind === 'future' ? inline : saved;
}

function canWriteDocumentFile(docId: CanvasDocId): boolean {
  try {
    return readDocumentFile(docId).kind !== 'future';
  } catch (error) {
    if (error instanceof SyntaxError) return true;
    throw error;
  }
}

export function canDeleteCanvasDocFiles(docId: CanvasDocId): boolean {
  try {
    return canWriteDocumentFile(docId) && canWriteStateFile(canvasLogPath(docId), CANVAS_HISTORY_VERSION);
  } catch {
    return false;
  }
}

export function deleteCanvasDocFiles(docId: CanvasDocId): boolean {
  if (!canDeleteCanvasDocFiles(docId)) return false;
  removeAtomicFile(canvasDocPath(docId));
  removeAtomicFile(canvasLogPath(docId));
  removeThumbnail(docId);
  return true;
}

function checkDoc(value: unknown, docId: CanvasDocId): CanvasDoc {
  const doc = value as Partial<CanvasDoc> | null;
  if (typeof doc !== 'object' || doc === null) throw new Error('document must be a record');
  if (doc.schemaVersion !== CANVAS_SCHEMA_VERSION) {
    throw new Error(`document carries schema ${JSON.stringify(doc.schemaVersion)}`);
  }
  if (doc.docId !== docId) throw new Error(`document claims id ${JSON.stringify(doc.docId)}`);
  if (typeof doc.revision !== 'number' || !Number.isFinite(doc.revision)) {
    throw new Error('document revision must be finite');
  }
  if (typeof doc.nodes !== 'object' || doc.nodes === null || Array.isArray(doc.nodes)) {
    throw new Error('document nodes must be an id-keyed record');
  }
  return doc as CanvasDoc;
}

/** No v0 file ever shipped; the arm keeps migrate-on-read and its write-back exercised. */
function migrateDoc(data: unknown, fromVersion: number, docId: CanvasDocId): CanvasDoc {
  if (fromVersion !== 0) throw new Error(`no migration from version ${String(fromVersion)}`);
  if (typeof data !== 'object' || data === null) throw new Error('v0 document must be a record');
  return checkDoc({ ...data, schemaVersion: CANVAS_SCHEMA_VERSION }, docId);
}

export function readExistingCanvasDoc(docId: CanvasDocId): CanvasDoc {
  const saved = readDocumentFile(docId);
  return existingCanvasDoc(saved, docId);
}

function existingCanvasDoc(saved: ReturnType<typeof readStateFile>, docId: CanvasDocId): CanvasDoc {
  if (saved.kind !== 'data') throw new Error('document is absent or belongs to a newer build');
  return saved.version === CANVAS_SCHEMA_VERSION ? checkDoc(saved.data, docId) : migrateDoc(saved.data, saved.version, docId);
}

export async function readSmallExistingCanvasDoc(docId: CanvasDocId): Promise<CanvasDoc> {
  const file = await open(canvasDocPath(docId), 'r');
  try {
    const buffer = Buffer.alloc(65_537);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 65_536) throw new Error('canvas is too large to prepare in the background');
    const saved = decodeStateFile(JSON.parse(buffer.toString('utf8', 0, bytesRead)) as unknown, CANVAS_SCHEMA_VERSION);
    if (saved.kind === 'data' && decodeStateFile(saved.data, CANVAS_SCHEMA_VERSION, { inline: true, versionKey: 'schemaVersion' }).kind === 'future') {
      throw new Error('document belongs to a newer build');
    }
    return existingCanvasDoc(saved, docId);
  } finally {
    await file.close();
  }
}

/** Set aside, never deleted: the bytes are the evidence. */
function quarantine(path: string, why: string): void {
  const aside = `${path}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  try {
    renameSync(path, aside);
    logger.error('document set aside; minting fresh', { path, why, aside });
  } catch (err) {
    logger.error('document could not be set aside', { path, why, error: err });
  }
}

function writeDoc(doc: CanvasDoc): void {
  if (!canWriteDocumentFile(doc.docId) || !writeStateFile(canvasDocPath(doc.docId), CANVAS_SCHEMA_VERSION, doc)) {
    throw new Error('document belongs to a newer build; refusing to persist');
  }
}

export function createFsDocumentStore(): CanvasDocumentStore {
  return {
    async load(docId) {
      const path = canvasDocPath(docId);
      let saved: ReturnType<typeof readStateFile>;
      try {
        saved = readDocumentFile(docId);
      } catch (err) {
        if (err instanceof SyntaxError) {
          quarantine(path, `could not be read (${String(err)})`);
          return { outcome: 'recovered', doc: emptyCanvasDoc(randomUUID()) };
        }
        // Not absent: `fresh` under this id would let the next persist overwrite bytes never read.
        logger.error('document could not be read; leaving it in place and minting fresh', { path, error: err });
        return { outcome: 'recovered', doc: emptyCanvasDoc(randomUUID()) };
      }

      if (saved.kind === 'missing') return { outcome: 'fresh', doc: emptyCanvasDoc(docId) };
      if (saved.kind === 'future') return { outcome: 'existing', doc: emptyCanvasDoc(docId) };

      try {
        const migrated = saved.version !== CANVAS_SCHEMA_VERSION;
        const doc = migrated ? migrateDoc(saved.data, saved.version, docId) : checkDoc(saved.data, docId);
        if (migrated) {
          try {
            // Written back, or the migration reruns every launch.
            writeDoc(doc);
          } catch (err) {
            logger.error('migration could not be saved', { path, error: err });
          }
        }
        return { outcome: 'existing', doc };
      } catch (err) {
        quarantine(path, `could not be read (${String(err)})`);
        return { outcome: 'recovered', doc: emptyCanvasDoc(randomUUID()) };
      }
    },

    async persist(doc) {
      writeDoc(doc);
    },

    async appendHistory(docId, entries) {
      try {
        if (!canWriteDocumentFile(docId)) return;
        appendCanvasLog(canvasLogPath(docId), entries);
      } catch (error) {
        logger.error('op log could not be appended', { doc_id: docId, error });
      }
    },

    async readHistory(docId) {
      try {
        if (!canWriteDocumentFile(docId)) return [];
        return readCanvasLog(canvasLogPath(docId));
      } catch {
        return [];
      }
    },

    subscribe() {
      // A single writer on a local disk; nothing foreign arrives.
      return () => {};
    },
  };
}
