/** `canvas:op` carries no author; this boundary stamps `user`, so the renderer cannot impersonate the agent (ONL-1993). */

import { randomUUID } from 'node:crypto';
import { webContents } from 'electron';
import { artifactStore } from '../artifacts/instance.js';
import { prepareArtifactPlacements } from '../artifacts/copy.js';
import {
  IPC_EMIT,
  MAX_CANVAS_OPS_PER_REQUEST,
  canvasPages,
  isBrowserNode,
  resolveNodePageId,
  type BrowserNode,
  type CanvasCamera,
  type CanvasDoc,
  type CanvasDocId,
  type CanvasNode,
  type CanvasNodeId,
  type FrameQuotes,
  type CanvasOp,
  type CanvasOpAuthor,
  type CanvasOpEntry,
  type CanvasOpRequest,
  type CanvasPageId,
  type CanvasRejection,
  type CanvasRejectionCode,
  type CanvasSnapshot,
  type CanvasUpdate,
  type FrameShown,
  type FrameShownFacts,
  NO_FRAME_QUOTES,
  frameServerFacts,
  frameUnderQuote,
  shownOverFrame,
} from '@studio/events';
import { serverBookEntries } from '../server/book.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { workspaceOf } from '../tabs/views.js';
import { normalizePath } from '../workspace/store.js';
import type { CanvasDocumentStore } from './adapter.js';
import {
  imageIdsInCanvasDocument,
  imageIdsInCanvasEntries,
  storedCanvasImageIds,
  type CanvasImageRoots,
} from './assets.js';
import { resolveCreateFrameOps, type CreateFrameRequest } from './authors.js';
import {
  readCanvasCamera,
  readStoredCurrentPage,
  resolveCurrentPage,
  writeCurrentPage,
} from './camera.js';
import {
  applyOp,
  everyNodeAdoptionOps,
  firstCanvasPageId,
  invertOp,
  type CanvasApplyResult,
} from './document.js';
import { createFsDocumentStore } from './fs-backend.js';
import { CANVAS_UNDO_MAX_ENTRIES, trimCanvasHistory } from './log.js';
import { frameMirror } from './mirror.js';
import { knownCanvasDocId, openCanvasDoc, worktreeForCanvasDoc } from './registry.js';
import { captureThumbnailIfDirtyNow, markProjectDirty } from './thumbnail/index.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';
import { log } from '../log/index.js';
import { frameBindings } from '../frames/bindings.js';

export const logger = log('canvas');

export interface CanvasHostDeps {
  /** Checks every artifact a batch places still resolves, keeping its id: nothing here mints a copy. */
  preparePlacements?: (ops: readonly CanvasOp[], author: CanvasOpAuthor) => Promise<{ ok: true; ops: CanvasOp[] } | { ok: false; reason: string }>;
  onPlacementsCommitted?: (ops: readonly CanvasOp[], author: CanvasOpAuthor, worktreePath: string) => void;
  store: CanvasDocumentStore;
  emitUpdate(update: CanvasUpdate): void;
  onDocumentApplied?(before: CanvasDoc, after: CanvasDoc, op: CanvasOp, author: CanvasOpAuthor): void;
  saveArtifactDimensions?(artifactId: string, dimensions: { width: number; height: number }, options?: { onlyIfUnset?: boolean }): void;
  emitRejection(rejection: CanvasRejection): void;
  /** Never a capture: the counter and the cooldown are the service's (ONL-2471). */
  markDirty(docId: CanvasDocId): void;
}

/** All-or-nothing: `ok: false` means nothing applied and nothing broadcast (ONL-2129). */
export type CanvasAuthorResult =
  | { ok: true; doc: CanvasDoc; entries: CanvasOpEntry[] }
  | { ok: false; reason: string };

/** `currentPageId` is required and nullable, never optional: omitted, it reaches `thumbnailFitAll` as every page and draws a card from pages the user is not on (ONL-2488). */
export interface CanvasPagedSnapshot {
  doc: CanvasDoc | null;
  currentPageId: CanvasPageId | undefined;
}

/** What a surface needs to open on the page the user left, at the camera they left it at (ONL-2488). */
export interface CanvasPresentation {
  currentPageId?: CanvasPageId;
  camera?: CanvasCamera;
}

/** Every page's objects, each page back to front; an id no page in the document holds lands on the first, as every other reader resolves it (ONL-2488). */
export function nodesByPage(doc: CanvasDoc): { id: CanvasPageId; name: string; nodes: CanvasNode[] }[] {
  const buckets = new Map<CanvasPageId, CanvasNode[]>();
  for (const node of Object.values(doc.nodes)) {
    const pageId = resolveNodePageId(doc, node);
    const held = buckets.get(pageId);
    if (held === undefined) buckets.set(pageId, [node]);
    else held.push(node);
  }
  const ordered = canvasPages(doc).map((page) => ({ id: page.id, name: page.name }));
  for (const pageId of buckets.keys()) {
    if (!ordered.some((page) => page.id === pageId)) ordered.push({ id: pageId, name: '' });
  }
  return ordered.map((page) => ({
    ...page,
    nodes: (buckets.get(page.id) ?? []).sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    ),
  }));
}

/** What the history verbs report. Not `AgentFrameReading`: this path has no session to read a frame's live facts through (ONL-2488). */
interface AgentPagedNode {
  id: CanvasNodeId;
  name: string;
  kind: CanvasNode['kind'];
  pageId: CanvasPageId;
  pageName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Dense inside the page: 0 is that page's back-most object. */
  stack: number;
}

function pagedNodes(doc: CanvasDoc): AgentPagedNode[] {
  return nodesByPage(doc).flatMap((page) =>
    page.nodes.map((node, stack) => ({
      id: node.id,
      name: node.name,
      kind: node.kind,
      pageId: page.id,
      pageName: page.name,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      stack,
    })),
  );
}

export type CanvasHistoryResult =
  | { ok: true; applied: boolean; frames: AgentPagedNode[] }
  | { ok: false; reason: string };

type AppliedCanvasOp = Extract<CanvasApplyResult, { ok: true }>;

/** The ops that change a pixel of the project card (ONL-2471). */
const REDRAWS: ReadonlySet<CanvasOp['type']> = new Set([
  'create',
  'duplicate',
  'move',
  'resize',
  'remove',
  'reorder',
  'set-text',
  'set-text-size',
  'set-node-page',
  'remove-page',
]);

export interface CanvasHost {
  /** Never rejects; an already-loaded worktree is only brought forward. */
  open(worktreePath: string): Promise<void>;
  close(worktreePath: string): Promise<void>;
  deactivate(): void;
  flushAll(): Promise<void>;
  /** Omitted `worktreePath` binds to the active document at call time. No `canvas:rejected` on failure; the caller is right there (ONL-1998). */
  apply(
    author: CanvasOpAuthor,
    resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string } | Promise<CanvasOp[] | { reason: string }>,
    worktreePath?: string,
    options?: { silent?: boolean },
  ): Promise<CanvasAuthorResult>;
  handleOpRequest(request: CanvasOpRequest): Promise<void>;
  undo(docId: string): Promise<CanvasHistoryResult>;
  redo(docId: string): Promise<CanvasHistoryResult>;
  undoFor(worktreePath: string): Promise<CanvasHistoryResult>;
  redoFor(worktreePath: string): Promise<CanvasHistoryResult>;
  snapshot(): Promise<CanvasSnapshot>;
  /** `{ doc: null }` for a worktree nothing opened; loading on demand would mint documents for unopened projects. */
  snapshotFor(worktreePath: string): Promise<CanvasSnapshot>;
  /** Outside the op chain: one queued op behind it. */
  peek(worktreePath: string): CanvasDoc | undefined;
  /** The document with the page in front of the user, resolved against it (ONL-2488). */
  paged(worktreePath: string): Promise<CanvasPagedSnapshot>;
  /** Refuses a page the document does not hold and a divider; neither is a place a reader can rest (ONL-2488). */
  setCurrentPage(docId: CanvasDocId, pageId: CanvasPageId): Promise<void>;
  artifactChanged(artifactId: string): void;
  /** No flush: a persist landing after the wipe resurrects a deleted file. */
  discard(): void;
  /** Both stacks: an undo moves its entry onto the redo stack, and a redo puts the node back on the canvas (ONL-2486). */
  historyImageIds(): Set<string>;
  /** A revision the disk refused is in no file, and `close()` evicts the slot that held it (ONL-2486). */
  unflushedImageIds(): Set<string>;
}

interface CanvasSlot {
  worktreePath: string;
  doc: CanvasDoc;
  undoStack: CanvasOpEntry[];
  redoStack: CanvasOpEntry[];
  /** The renderer's push, held for the two writes that are not agent-facing reads: the project card, and an omitted page on a node-creating tool (ONL-2488). */
  currentPageId?: CanvasPageId;
}

type CommitVia = 'undo' | 'redo' | 'correction';

interface CommitOptions {
  via?: CommitVia;
  withinBatch?: boolean;
  /** Applies and broadcasts, but leaves the project card clean: a write the user never asked for is no reason to redraw it (ONL-2488). */
  silent?: boolean;
  /** The log already carries these entries; `appendCanvasLog` pushes unconditionally, and a duplicate replays as a refusal (ONL-2488). */
  logged?: boolean;
}

/** A `create-page` matches on its page id alone: a page whose name later reads differently is still the page this log recorded (ONL-2488). */
function adoptionMark(op: CanvasOp): string {
  return op.type === 'create-page' ? `create-page ${op.page.id}` : JSON.stringify(op);
}

function logRecordsAdoption(entries: readonly CanvasOpEntry[], ops: readonly CanvasOp[]): boolean {
  const recorded = new Set(entries.map((entry) => adoptionMark(entry.op)));
  return ops.every((op) => recorded.has(adoptionMark(op)));
}

export function createCanvasHost(deps: CanvasHostDeps): CanvasHost {
  const documents = new Map<string, CanvasSlot>();
  let activeKey: string | undefined;
  /** One FIFO chain per project; a global chain stalls every background project on the forward one's disk. */
  const lifecycles = createKeyedQueue<string | undefined>();
  /** Separate from the op chain, so ops never wait on the disk. */
  const persists = new Map<string, Promise<void>>();
  /** Held for the process: a refused revision is named by no file, and its slot goes on the next close (ONL-2486). */
  const unflushed = new Set<string>();
  let epoch = 0;

  const keyFor = (worktreePath: string): string => normalizePath(worktreePath);

  const chain = <T>(key: string | undefined, step: () => Promise<T>): Promise<T> => lifecycles.run(key, step);

  function queuePersist(key: string, doc: CanvasDoc): void {
    const at = epoch;
    const tail = (persists.get(key) ?? Promise.resolve())
      .then(() => (at === epoch ? deps.store.persist(doc) : undefined))
      .catch((err) => {
        for (const id of imageIdsInCanvasDocument(doc)) unflushed.add(id);
        logger.error('revision could not be persisted; the in-memory document remains the truth', { doc_id: doc.docId, revision: doc.revision, error: err });
      });
    persists.set(key, tail);
  }

  function commitApplied(
    key: string,
    slot: CanvasSlot,
    result: AppliedCanvasOp,
    options: CommitOptions = {},
  ): AppliedCanvasOp {
    const { via, withinBatch = false, silent = false } = options;
    deps.onDocumentApplied?.(slot.doc, result.doc, result.entry.op, result.entry.author);
    if (result.entry.op.type === 'resize' || (result.entry.op.type === 'create' && via === undefined)) {
      const nodeId = result.entry.op.type === 'resize' ? result.entry.op.id : result.entry.op.node.id;
      const resized = result.doc.nodes[nodeId];
      if (resized?.kind === 'artifact') deps.saveArtifactDimensions?.(resized.content.artifactId, { width: resized.width, height: resized.height }, { onlyIfUnset: result.entry.op.type === 'create' });
    }
    slot.doc = result.doc;
    if (via === 'undo') slot.redoStack.push(result.entry);
    else if (via === 'redo') slot.undoStack.push(result.entry);
    // A correction is a gesture already in history, re-measured: a second entry costs two undos, and clearing eats the redo.
    else if (via !== 'correction') {
      slot.undoStack.push(result.entry);
      slot.redoStack.length = 0;
    }
    if (!withinBatch) {
      trimCanvasHistory(slot.undoStack, CANVAS_UNDO_MAX_ENTRIES);
      trimCanvasHistory(slot.redoStack, CANVAS_UNDO_MAX_ENTRIES);
      void deps.store.appendHistory(result.doc.docId, [result.entry]);
      queuePersist(key, result.doc);
    }
    // Every author, undo included: whoever moved the frame, the thumbnail is out of date.
    if (!silent && REDRAWS.has(result.entry.op.type)) deps.markDirty(result.doc.docId);
    try {
      deps.emitUpdate({ docId: result.doc.docId, entry: result.entry });
    } catch (error) {
      logger.error('revision could not be broadcast', { doc_id: result.doc.docId, revision: result.doc.revision, error });
    }
    return result;
  }

  function commitPrepared(
    key: string,
    slot: CanvasSlot,
    results: AppliedCanvasOp[],
    options: Omit<CommitOptions, 'withinBatch'> = {},
  ): void {
    for (const result of results) commitApplied(key, slot, result, { ...options, withinBatch: true });
    const final = results.at(-1);
    if (!final) return;
    trimCanvasHistory(slot.undoStack, CANVAS_UNDO_MAX_ENTRIES);
    trimCanvasHistory(slot.redoStack, CANVAS_UNDO_MAX_ENTRIES);
    // One append for the batch: the log rewrites its file per call (ONL-2026).
    if (options.logged !== true) {
      void deps.store.appendHistory(final.doc.docId, results.map((result) => result.entry));
    }
    queuePersist(key, final.doc);
  }

  /** All-or-nothing, through `prepare`: one refused move must not leave half the nodes paged, persisted and broadcast (ONL-2488). */
  function adopt(
    key: string,
    slot: CanvasSlot,
    ops: CanvasOp[],
    recorded: readonly CanvasOpEntry[],
  ): boolean {
    const prepared = prepare(slot.doc, ops, 'system');
    if (!prepared.ok) {
      logger.error('a document could not be put on a page', { doc_id: slot.doc.docId, reason: prepared.reason });
      return false;
    }
    commitPrepared(key, slot, prepared.results, {
      via: 'correction',
      silent: true,
      logged: logRecordsAdoption(recorded, ops),
    });
    return true;
  }

  function applyNow(
    key: string,
    slot: CanvasSlot,
    op: CanvasOp,
    author: CanvasOpAuthor,
    options: { via?: 'undo' | 'redo'; batchId?: string } = {},
  ): CanvasApplyResult {
    const result = applyOp(slot.doc, op, {
      author,
      at: new Date().toISOString(),
      batchId: options.batchId,
      restoring: options.via !== undefined,
    });
    return result.ok ? commitApplied(key, slot, result, { via: options.via }) : result;
  }

  function prepare(
    doc: CanvasDoc,
    ops: CanvasOp[],
    author: CanvasOpAuthor,
    options: { batchId?: string; restoring?: boolean } = {},
  ): { ok: true; results: AppliedCanvasOp[] } | { ok: false; reason: string; code?: CanvasRejectionCode } {
    let candidate = doc;
    const results: AppliedCanvasOp[] = [];
    for (const op of ops) {
      const result = applyOp(candidate, op, {
        author,
        at: new Date().toISOString(),
        batchId: options.batchId,
        restoring: options.restoring === true,
      });
      if (!result.ok) return result;
      results.push(result);
      candidate = result.doc;
    }
    return { ok: true, results };
  }

  function applyHistory(
    binding: { docId: string } | { worktreePath: string },
    via: 'undo' | 'redo',
  ): Promise<CanvasHistoryResult> {
    // Through the registry, not the live map: the document may still be loading.
    const key =
      'docId' in binding ? worktreeForCanvasDoc(binding.docId) : keyFor(binding.worktreePath);
    return chain(key, async () => {
      const slot = key === undefined ? undefined : documents.get(key);
      if (key === undefined || slot === undefined) {
        return {
          ok: false,
          reason:
            'docId' in binding
              ? 'no canvas document is open'
              : "this session's project is no longer open",
        };
      }
      if ('docId' in binding && slot.doc.docId !== binding.docId) {
        return { ok: false, reason: 'not the open canvas document' };
      }
      const docId = slot.doc.docId;
      const source = via === 'undo' ? slot.undoStack : slot.redoStack;
      const entry = source.at(-1);
      if (entry === undefined) {
        return { ok: true, applied: false, frames: pagedNodes(slot.doc) };
      }

      if (entry.batchId !== undefined) {
        const run: CanvasOpEntry[] = [];
        for (let index = source.length - 1; index >= 0; index -= 1) {
          const candidate = source[index];
          if (candidate?.batchId !== entry.batchId) break;
          run.push(candidate);
        }

        const inverses: CanvasOp[] = [];
        try {
          for (const candidate of run) inverses.push(invertOp(candidate));
        } catch (err) {
          deps.emitRejection({
            docId,
            reason: `could not ${via}: ${err instanceof Error ? err.message : String(err)}`,
          });
          return {
            ok: false,
            reason: `could not ${via}: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
        const prepared = prepare(slot.doc, inverses, 'system', { batchId: entry.batchId, restoring: true });
        if (!prepared.ok) {
          deps.emitRejection({ docId, reason: `could not ${via}: ${prepared.reason}` });
          return { ok: false, reason: `could not ${via}: ${prepared.reason}` };
        }

        source.splice(source.length - run.length, run.length);
        commitPrepared(key, slot, prepared.results, { via });
        return { ok: true, applied: true, frames: pagedNodes(slot.doc) };
      }

      source.pop();
      let inverse: CanvasOp;
      try {
        inverse = invertOp(entry);
      } catch (err) {
        // Left off the stack: an entry that cannot invert now will not on a retry.
        deps.emitRejection({
          docId,
          reason: `could not ${via}: ${err instanceof Error ? err.message : String(err)}`,
        });
        return {
          ok: false,
          reason: `could not ${via}: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
      const result = applyNow(key, slot, inverse, 'system', { via });
      if (!result.ok) {
        deps.emitRejection({ docId, reason: `could not ${via}: ${result.reason}` });
        return { ok: false, reason: `could not ${via}: ${result.reason}` };
      }
      return { ok: true, applied: true, frames: pagedNodes(slot.doc) };
    });
  }

  return {
    open: (worktreePath) => {
      const key = keyFor(worktreePath);
      // Forward before the chain step, so a racing `snapshot()` picks this lane and waits.
      activeKey = key;
      return chain(key, async () => {
        // An open landing after `discard()` would let later persists recreate wiped files.
        const at = epoch;
        if (documents.has(key)) return;
        try {
          const loaded = await openCanvasDoc(worktreePath, deps.store);
          const adoption = everyNodeAdoptionOps(loaded.doc);
          const recorded = adoption.length === 0 ? [] : await deps.store.readHistory(loaded.doc.docId);
          if (at !== epoch) return;
          // Fresh stacks: priming from the log hands ⌘Z the document's whole recorded life (ONL-2042).
          const slot: CanvasSlot = { worktreePath, doc: loaded.doc, undoStack: [], redoStack: [] };
          // No await from the check above to the publish below: a `discard()` landing inside adoption would let this `set` resurrect a wiped document (ONL-2488).
          // Unpublished on a refusal: a document holding no page accepts no create, and the next open retries (ONL-2488).
          if (adoption.length > 0 && !adopt(key, slot, adoption, recorded)) return;
          documents.set(key, slot);
        } catch (err) {
          logger.error('could not open a document', { path: worktreePath, error: err });
        }
      });
    },

    close: (worktreePath) => {
      const key = keyFor(worktreePath);
      if (activeKey === key) activeKey = undefined;
      return chain(key, async () => {
        await persists.get(key);
        documents.delete(key);
        persists.delete(key);
      });
    },

    deactivate: () => {
      activeKey = undefined;
    },

    flushAll: async () => {
      await Promise.all(
        [...documents.keys()].map((key) =>
          chain(key, async () => {
            await persists.get(key);
          }),
        ),
      );
      documents.clear();
      persists.clear();
      activeKey = undefined;
    },

    apply: (author, resolve, worktreePath, options = {}) => {
      // The active project is read here, not inside the step: an open landing between must not redirect the write.
      const key = worktreePath === undefined ? activeKey : keyFor(worktreePath);
      return chain(key, async () => {
        const slot = key === undefined ? undefined : documents.get(key);
        if (key === undefined || slot === undefined) {
          return {
            ok: false,
            reason:
              worktreePath === undefined
                ? 'no canvas document is open'
                : "this session's project is no longer open",
          };
        }
        const resolved = await resolve(slot.doc);
        if ('reason' in resolved) return { ok: false, reason: resolved.reason };
        if (resolved.length > MAX_CANVAS_OPS_PER_REQUEST) {
          return {
            ok: false,
            reason: `an action may contain at most ${MAX_CANVAS_OPS_PER_REQUEST} operations`,
          };
        }
        const batchId = resolved.length > 1 ? randomUUID() : undefined;
        const placements = await deps.preparePlacements?.(resolved, author);
        if (placements?.ok === false) return placements;
        const prepared = prepare(slot.doc, placements?.ops ?? resolved, author, { batchId });
        if (!prepared.ok) return prepared;
        commitPrepared(key, slot, prepared.results, { silent: options.silent === true });
        if (placements?.ok === true) deps.onPlacementsCommitted?.(placements.ops, author, key);
        return {
          ok: true,
          doc: slot.doc,
          entries: prepared.results.map((result) => result.entry),
        };
      });
    },

    async handleOpRequest(request) {
      const docId =
        typeof request === 'object' && request !== null && typeof request.docId === 'string'
          ? request.docId
          : '';
      if (docId === '') {
        logger.warn('dropped a malformed op request: no document id to reject against');
        return;
      }
      const key = worktreeForCanvasDoc(docId);
      await chain(key, async () => {
        const slot = key === undefined ? undefined : documents.get(key);
        if (key === undefined || slot === undefined || slot.doc.docId !== docId) {
          deps.emitRejection({ docId, reason: 'not the open canvas document' });
          return;
        }
        const hasOp = typeof request.op === 'object' && request.op !== null;
        const hasOps = Array.isArray(request.ops);
        if (hasOp === hasOps) {
          deps.emitRejection({ docId, reason: 'request must carry either op or ops' });
          return;
        }
        const ops = (hasOps ? request.ops : [request.op]) as CanvasOp[];
        if (ops.length === 0) {
          deps.emitRejection({ docId, reason: 'ops must be a non-empty array of records' });
          return;
        }
        if (ops.length > MAX_CANVAS_OPS_PER_REQUEST) {
          deps.emitRejection({
            docId,
            reason: `an action may contain at most ${MAX_CANVAS_OPS_PER_REQUEST} operations`,
          });
          return;
        }
        if (ops.some((op) => typeof op !== 'object' || op === null)) {
          deps.emitRejection({ docId, reason: 'ops must be a non-empty array of records' });
          return;
        }
        const batchId = ops.length > 1 ? randomUUID() : undefined;
        const destination = slot.doc;
        const placements = await deps.preparePlacements?.(ops, 'user');
        if (placements?.ok === false) {
          deps.emitRejection({ docId, reason: placements.reason });
          return;
        }
        if (documents.get(key) !== slot || slot.doc !== destination) {
          deps.emitRejection({ docId, reason: 'The destination canvas changed. Nothing was placed.' });
          return;
        }
        const prepared = prepare(slot.doc, placements?.ops ?? ops, 'user', { batchId });
        if (!prepared.ok) {
          deps.emitRejection({
            docId,
            ...(prepared.code === undefined ? {} : { code: prepared.code }),
            reason: prepared.reason,
          });
          return;
        }
        commitPrepared(key, slot, prepared.results, {
          ...(request.correction === true ? { via: 'correction' as const } : {}),
        });
        if (placements?.ok === true) deps.onPlacementsCommitted?.(placements.ops, 'user', key);
      });
    },

    undo: (docId) => applyHistory({ docId }, 'undo'),

    redo: (docId) => applyHistory({ docId }, 'redo'),

    undoFor: (worktreePath) => applyHistory({ worktreePath }, 'undo'),

    redoFor: (worktreePath) => applyHistory({ worktreePath }, 'redo'),

    snapshot: () => {
      const key = activeKey;
      return chain(key, async () => ({
        doc: (key === undefined ? undefined : documents.get(key)?.doc) ?? null,
      }));
    },

    snapshotFor: (worktreePath) => {
      const key = keyFor(worktreePath);
      return chain(key, async () => ({ doc: documents.get(key)?.doc ?? null }));
    },

    peek: (worktreePath) => documents.get(keyFor(worktreePath))?.doc,

    paged: (worktreePath) => {
      const key = keyFor(worktreePath);
      return chain(key, async () => {
        const slot = documents.get(key);
        if (slot === undefined) return { doc: null, currentPageId: undefined };
        // Resolved per read, never pinned at open: the renderer re-derives an unnamed page from
        // the order it is showing, and a stale id here is a page nobody is looking at (ONL-2488).
        const hint = slot.currentPageId ?? readStoredCurrentPage(slot.doc.docId);
        return { doc: slot.doc, currentPageId: resolveCurrentPage(slot.doc, hint) };
      });
    },

    setCurrentPage: (docId, pageId) => {
      const key = worktreeForCanvasDoc(docId);
      return chain(key, async () => {
        const slot = key === undefined ? undefined : documents.get(key);
        if (slot === undefined || slot.doc.docId !== docId) return;
        if (resolveCurrentPage(slot.doc, pageId) !== pageId) return;
        const moved = slot.currentPageId !== pageId;
        slot.currentPageId = pageId;
        writeCurrentPage(docId, pageId);
        // The card draws the current page, so a switch dates it exactly as an op does (ONL-2488).
        if (moved) deps.markDirty(docId);
      });
    },

    artifactChanged: (artifactId) => {
      for (const { doc } of documents.values()) {
        if (Object.values(doc.nodes).some((node) => node.kind === 'artifact' && node.content.artifactId === artifactId)) {
          deps.markDirty(doc.docId);
        }
      }
    },

    discard: () => {
      epoch += 1;
      documents.clear();
      persists.clear();
      activeKey = undefined;
    },

    historyImageIds: () => {
      const ids = new Set<string>();
      for (const slot of documents.values()) {
        for (const id of imageIdsInCanvasEntries(slot.undoStack)) ids.add(id);
        for (const id of imageIdsInCanvasEntries(slot.redoStack)) ids.add(id);
      }
      return ids;
    },

    unflushedImageIds: () => new Set(unflushed),
  };
}

export const host = createCanvasHost({
  saveArtifactDimensions: (id, dimensions, options) => {
    const result = artifactStore().saveDimensions(id, dimensions, options);
    if ('code' in result) logger.warn('artifact dimensions could not be saved', { code: result.code });
  },
  preparePlacements: (ops, author) => prepareArtifactPlacements(artifactStore(), ops, { reuseDimensions: author === 'user' }),
  // Sidebar placements report from the renderer; a duplicate or paste is counted here, once it committed.
  onPlacementsCommitted: (ops, author, worktreePath) => {
    const count = ops.filter((op) => op.type === 'duplicate' && op.node.kind === 'artifact').length;
    if (count === 0) return;
    const method = author === 'agent' ? 'agent' as const : 'paste' as const;
    const workspaceProperties = resolveWorkspaceTelemetryProperties(worktreePath);
    capture('artifact_placed', { ...workspaceProperties, method, count });
  },
  store: createFsDocumentStore(),
  emitUpdate: (update) => broadcastToRenderers(IPC_EMIT.canvasUpdate, update),
  onDocumentApplied: (before, after, op, author) => {
    frameBindings.committed(before, after, op, author);
    noteQuotedDocument(after);
  },
  emitRejection: (rejection) => broadcastToRenderers(IPC_EMIT.canvasRejected, rejection),
  markDirty: markProjectDirty,
});

export function openCanvasForProject(worktreePath: string): Promise<void> {
  return host.open(worktreePath);
}

/** The blank-project rollback. Not the projects-list navigation; that is `deactivateCanvas`, which unloads nothing (ONL-2222). */
export function closeCanvas(worktreePath: string): Promise<void> {
  return host.close(worktreePath);
}

export function deactivateCanvas(): void {
  host.deactivate();
}

export function flushCanvas(): Promise<void> {
  return host.flushAll();
}

/** The union, never the stacks alone: a closed project's images are named by its file and nothing else (ONL-2486). */
export function canvasImageIds(): CanvasImageRoots {
  const roots = storedCanvasImageIds();
  for (const id of host.historyImageIds()) roots.ids.add(id);
  for (const id of host.unflushedImageIds()) roots.ids.add(id);
  return roots;
}

export function applyCanvasOps(
  author: CanvasOpAuthor,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string },
  worktreePath?: string,
  options?: { silent?: boolean },
): Promise<CanvasAuthorResult> {
  return host.apply(author, resolve, worktreePath, options);
}

export function opNodeId(op: CanvasOp | undefined): CanvasNodeId | undefined {
  if (op === undefined) return undefined;
  if (op.type === 'create' || op.type === 'duplicate') return op.node.id;
  return 'id' in op ? op.id : undefined;
}

/** The host's in-memory hint, never the camera domain. `beside` and `copy_of` already name a page through the object they point at, so only a create naming neither takes it (ONL-2488). */
export async function withLandingPage<
  T extends { pageId?: CanvasPageId; beside?: CanvasNodeId; fromFrameId?: CanvasNodeId },
>(worktreePath: string, request: T): Promise<T> {
  if (request.pageId !== undefined || request.beside !== undefined) return request;
  if (request.fromFrameId !== undefined) return request;
  const current = (await host.paged(worktreePath)).currentPageId;
  return current === undefined ? request : { ...request, pageId: current };
}

function frameFactsUnderQuote(worktreePath: string, frameId: string): Omit<FrameShownFacts, 'quote' | 'turnRunning'> | undefined {
  const docId = knownCanvasDocId(worktreePath);
  const node = host.peek(worktreePath)?.nodes[frameId as CanvasNodeId];
  const facts = docId === undefined ? undefined : frameMirror().peek(docId, frameId);
  if (node === undefined || !isBrowserNode(node) || facts === undefined) return undefined;
  const { cover, serverLive, serverStarting } = frameServerFacts(serverBookEntries(worktreePath), {
    pointedUrl: facts.targetUrl ?? facts.currentUrl,
    pendingHome: node.content.pendingHomeUrl !== undefined,
  });
  return { health: facts.health, cover, serverLive, serverStarting, loadFailed: facts.loadFailed === true };
}

export function frameShowsPage(worktreePath: string, frameId: string): boolean {
  const facts = frameFactsUnderQuote(worktreePath, frameId);
  return facts !== undefined && frameUnderQuote(facts).kind === 'page';
}

export function frameShownOver(worktreePath: string, frameId: string): FrameShown | undefined {
  const facts = frameFactsUnderQuote(worktreePath, frameId);
  if (facts === undefined) return undefined;
  const quotes = frameQuoteSource?.view(worktreePath) ?? NO_FRAME_QUOTES;
  return shownOverFrame({ ...facts, quote: quotes.byFrame[frameId], turnRunning: quotes.turnRunning });
}

/** Whether main can reach each named frame's page now, or with none named every frame on the page the canvas shows: mirrored live and done loading. */
export async function framePagesLive(worktreePath: string, frameIds: readonly string[]): Promise<boolean> {
  const { doc, currentPageId } = await host.paged(worktreePath);
  if (doc === null) return false;
  const shownPageFrames = (): string[] =>
    Object.values(doc.nodes)
      .filter((node) => node.kind === 'browser' && resolveNodePageId(doc, node) === currentPageId)
      .map((node) => node.id);
  return (frameIds.length > 0 ? frameIds : shownPageFrames()).every((frameId) => {
    const facts = frameMirror().peek(doc.docId, frameId);
    const guest = facts?.webContentsId === undefined ? undefined : webContents.fromId(facts.webContentsId);
    return facts?.health === 'live' && guest !== undefined && !guest.isDestroyed() && !guest.isLoading();
  });
}

export function canvasSnapshot(): Promise<CanvasSnapshot> {
  return host.snapshot();
}

export function canvasSnapshotFor(worktreePath: string): Promise<CanvasSnapshot> {
  return host.snapshotFor(worktreePath);
}

export interface FrameQuoteSource {
  view(worktreePath: string): FrameQuotes;
  guestLoaded(worktreePath: string, frameId: CanvasNodeId): void;
  looked(worktreePath: string, frameId: CanvasNodeId): void;
  documentChanged(worktreePath: string, doc: CanvasDoc): void;
}

export let frameQuoteSource: FrameQuoteSource | undefined;

export function setFrameQuoteSource(source: FrameQuoteSource | undefined): void {
  frameQuoteSource = source;
}

export function noteFrameGuestLoaded(docId: CanvasDocId, frameId: CanvasNodeId): void {
  if (frameQuoteSource === undefined) return;
  const worktree = worktreeForCanvasDoc(docId);
  if (worktree !== undefined) frameQuoteSource.guestLoaded(worktree, frameId);
}

function noteQuotedDocument(doc: CanvasDoc): void {
  if (frameQuoteSource === undefined) return;
  const worktree = worktreeForCanvasDoc(doc.docId);
  if (worktree !== undefined) frameQuoteSource.documentChanged(worktree, doc);
}

/** No fallback to the active document for an unregistered view: a `+` tab asking before `location:set` was shown the previous project's frames (ONL-2270). */
export function snapshotForView(viewId: number): Promise<CanvasSnapshot> {
  const worktree = workspaceOf(viewId);
  return worktree === undefined ? Promise.resolve({ doc: null }) : snapshotOf(worktree);
}

export async function snapshotOf(worktree: string): Promise<CanvasSnapshot> {
  const snapshot = await host.snapshotFor(worktree);
  const quotes = snapshot.doc === null ? undefined : frameQuoteSource?.view(worktree);
  return quotes === undefined || Object.keys(quotes.byFrame).length === 0 ? snapshot : { ...snapshot, quotes };
}

/** Refused once the canvas holds any frame: the starting frame is the first, or none (ONL-2960). */
export async function applyStartingFrame(
  worktreePath: string,
  request: { url: string; name: string },
): Promise<BrowserNode | undefined> {
  const landed = await withLandingPage<CreateFrameRequest>(worktreePath, request);
  const result = await host.apply(
    'system',
    (doc) => (Object.values(doc.nodes).some(isBrowserNode) ? { reason: 'the canvas already holds a frame' } : resolveCreateFrameOps(doc, landed)),
    worktreePath,
  );
  if (!result.ok) return undefined;
  const id = opNodeId(result.entries[0]?.op);
  const node = id === undefined ? undefined : result.doc.nodes[id];
  return node !== undefined && isBrowserNode(node) ? node : undefined;
}

export async function removeStartingFrame(worktreePath: string, frameId: CanvasNodeId): Promise<void> {
  await host.apply('system', (doc) => (doc.nodes[frameId] === undefined ? [] : [{ type: 'remove', id: frameId }]), worktreePath);
}

export function canvasPagedSnapshotFor(worktreePath: string): Promise<CanvasPagedSnapshot> {
  return host.paged(worktreePath);
}

export function setCanvasCurrentPage(docId: CanvasDocId, pageId: CanvasPageId): Promise<void> {
  return host.setCurrentPage(docId, pageId);
}

/** The project list asks before `location:set` opens the document, and an unopened one cannot check the stored page; the surface that opens it resolves the hint again (ONL-2488). */
export async function canvasPresentationFor(worktreePath: string): Promise<CanvasPresentation> {
  const docId = knownCanvasDocId(worktreePath);
  if (docId === undefined) return {};
  const paged = await host.paged(worktreePath);
  if (paged.doc !== null) {
    if (paged.currentPageId === undefined) return {};
    const open = readCanvasCamera(docId, paged.currentPageId);
    return { currentPageId: paged.currentPageId, ...(open === undefined ? {} : { camera: open }) };
  }
  // Named here, the page would disagree with the one the open resolves (ONL-2488).
  const stored = readStoredCurrentPage(docId);
  const camera = readCanvasCamera(docId, stored ?? firstCanvasPageId(docId));
  return {
    ...(stored === undefined ? {} : { currentPageId: stored }),
    ...(camera === undefined ? {} : { camera }),
  };
}

/** Takes the leaving tab's own project: the active document is one global, and with two tabs open it names the wrong project (ONL-2471). */
export function captureThumbnailOnLeave(worktreePath: string | undefined): void {
  if (worktreePath === undefined) return;
  const docId = knownCanvasDocId(worktreePath);
  if (docId === undefined) return;
  captureThumbnailIfDirtyNow(docId);
}
