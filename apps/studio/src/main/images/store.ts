import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyImageBytes,
  classifyCanvasImageBytes,
  IMAGE_MAX_BYTES,
  sniffStoredImageMediaType,
  type ImageBytes,
  type RegisterImageResult,
  type RegisterCanvasImageResult,
  type StoredImageRef,
  type StudioEvent,
  classifyAttachmentBytes,
  type HarnessId,
  type AttachmentBytes,
  type RegisterAttachmentResult,
  type FileRef,
  TEXT_ATTACHMENT_MAX_BYTES,
  nextTaskPicturesIn,
  SUGGEST_NEXT_TASKS_TOOL,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
} from '@studio/events';
import { WORKSPACE_HASH_LEN, workspaceHash, workspaceHashes } from '../lib/canonical-path.js';
import { writeAtomicFile } from '../fs-atomic.js';
import { stateRoot } from '../state/root.js';
import { canWriteStateFile } from '../state/file.js';
import { readAllTranscripts, transcriptRootsComplete } from '../agent-host/transcript.js';
import { harnessFor } from '../agent-host/harness.js';

export { IMAGE_MAX_BYTES as MAX_BYTES };

// Per call: STUDIO_STATE_ROOT moves under tests.
function blobRoot(): string {
  return join(stateRoot(), 'image-blobs');
}

// Gates renderer-supplied text out of the path join.
const ID_SHAPE = new RegExp(
  `^[0-9a-f]{${String(WORKSPACE_HASH_LEN)}}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
);

function idFor(hash: string, file: string): string {
  return `${hash}-${file}`;
}

function blobPath(id: string): string {
  return join(blobRoot(), id.slice(0, WORKSPACE_HASH_LEN), id.slice(WORKSPACE_HASH_LEN + 1));
}


export function registerAttachment(cwd: string, bytes: Uint8Array, name: string, agent: HarnessId): RegisterAttachmentResult {
  const verdict = classifyAttachmentBytes(bytes, agent);
  if (!verdict.ok) return verdict;
  const hash = workspaceHash(cwd);
  if (removedProjects.has(hash)) return { ok: false, reason: 'unreadable' };
  const id = `${hash}-${randomUUID()}`;
  writeAtomicFile(blobPath(id), Buffer.from(bytes), { mode: 0o600 });
  pending.set(id, hash);
  const originalSize = bytes.byteLength;
  const mediaType = verdict.mediaType;
  return { ok: true, ref: mediaType === 'text/plain' || mediaType === 'application/pdf'
    ? { kind: 'file', id, mediaType, name, originalSize }
    : { id, mediaType, name, originalSize } };
}

export function readAttachment(id: string): AttachmentBytes | null {
  if (!ID_SHAPE.test(id)) return null;
  try {
    const bytes = readFileSync(blobPath(id));
    const verdict = classifyAttachmentBytes(bytes, 'claude');
    return verdict.ok ? { bytes, mediaType: verdict.mediaType } : null;
  } catch { return null; }
}

export function attachmentBelongsTo(cwd: string, id: string): boolean {
  return ID_SHAPE.test(id) && id.startsWith(`${workspaceHash(cwd)}-`);
}

export function readProjectAttachment(cwd: string, id: string): AttachmentBytes | null {
  return attachmentBelongsTo(cwd, id) ? readAttachment(id) : null;
}

export function canSendAttachedFiles(cwd: string, files: readonly FileRef[], agent: HarnessId): boolean {
  let textBytes = 0;
  for (const file of files) {
    const stored = readProjectAttachment(cwd, file.id);
    if (!stored || (!harnessFor(agent).pdfAttachments && stored.mediaType === 'application/pdf')) return false;
    if (stored.mediaType === 'text/plain') textBytes += stored.bytes.byteLength;
    if (textBytes > TEXT_ATTACHMENT_MAX_BYTES) return false;
  }
  return true;
}

// Chip removal is not an exit: a send cannot tell a removed ref from one still mid-admission.
const pending = new Map<string, string>();
const removedProjects = new Set<string>();
const projectGenerations = new Map<string, number>();

export function workspaceImagesGeneration(cwd: string): number {
  return projectGenerations.get(workspaceHash(cwd)) ?? 0;
}

export function reopenWorkspaceImages(cwd: string): void {
  for (const hash of workspaceHashes(cwd)) removedProjects.delete(hash);
}

// Injected: importing the agent host here is a cycle (it writes captures into this store).
let liveRootsProvider: (() => readonly StudioEvent[]) | undefined;

export function setLiveRootsProvider(provider: (() => readonly StudioEvent[]) | undefined): void {
  liveRootsProvider = provider;
}

// A stored draft outlives the session whose stop released its holds (ONL-2207).
let draftRootsProvider: (() => Iterable<string>) | undefined;

export function setDraftRootsProvider(provider: (() => Iterable<string>) | undefined): void {
  draftRootsProvider = provider;
}

// An archived chat outlives the transcript it was cut from, so it roots its own blobs (ONL-2198).
let archiveRootsProvider: (() => Iterable<string>) | undefined;

export function setArchiveRootsProvider(provider: (() => Iterable<string>) | undefined): void {
  archiveRootsProvider = provider;
}

export interface CanvasRoots {
  ids: Iterable<string>;
  complete: boolean;
}

// A node's image is in no transcript, and a closed project's document is in no live stack (ONL-2486).
let canvasRootsProvider: (() => CanvasRoots) | undefined;

export function setCanvasRootsProvider(provider: (() => CanvasRoots) | undefined): void {
  canvasRootsProvider = provider;
}

export function imageIdsInEvents(events: readonly StudioEvent[]): Set<string> {
  const ids = new Set<string>();
  const offers = new Set<string>();
  for (const event of events) {
    if (event.type === 'message.user') {
      for (const ref of event.attachments ?? []) if ('id' in ref) ids.add(ref.id);
    } else if (event.type === 'tool.start') {
      if (event.name === SUGGEST_NEXT_TASKS_TOOL || event.name === SUGGEST_NEXT_TASKS_TOOL_NAME) offers.add(event.toolCallId);
    } else if (event.type === 'tool.end') {
      for (const ref of event.images ?? []) ids.add(ref.id);
      if (offers.has(event.toolCallId)) {
        for (const picture of nextTaskPicturesIn(event.result) ?? []) if (picture !== undefined && 'clip' in picture) ids.add(picture.clip);
      }
    }
  }
  return ids;
}

// Agent captures pass hold: false — their tool.end root lands before any sweep, and a hold would pin them until session stop.
export function registerImage(cwd: string, bytes: Uint8Array, opts: { hold?: boolean; allowSvg: true }): RegisterCanvasImageResult;
export function registerImage(cwd: string, bytes: Uint8Array, opts?: { hold?: boolean }): RegisterImageResult;
export function registerImage(
  cwd: string,
  bytes: Uint8Array,
  opts: { hold?: boolean; allowSvg?: boolean } = {},
): RegisterCanvasImageResult {
  const verdict = opts.allowSvg === true ? classifyCanvasImageBytes(bytes) : classifyImageBytes(bytes);
  if (!verdict.ok) return verdict;
  const { mediaType } = verdict;

  const hash = workspaceHash(cwd);
  if (removedProjects.has(hash)) return { ok: false, reason: 'unreadable' };
  const id = `${hash}-${randomUUID()}`;
  writeAtomicFile(blobPath(id), Buffer.from(bytes), { mode: 0o600 });
  if (opts.hold !== false) pending.set(id, hash);
  const image: StoredImageRef = { id, mediaType };
  return { ok: true, image };
}

export function readImage(id: string): ImageBytes | null {
  if (!ID_SHAPE.test(id)) return null;
  let bytes: Buffer;
  try {
    bytes = readFileSync(blobPath(id));
  } catch {
    return null;
  }
  const mediaType = sniffStoredImageMediaType(bytes);
  if (mediaType === null) return null;
  return { bytes, mediaType };
}

// Only the sent ids: an admission can be in flight at send time, and a project-wide release hands it to the sweep.
export function settlePending(cwd: string, sentIds: readonly string[]): void {
  const hash = workspaceHash(cwd);
  for (const id of sentIds) {
    if (pending.get(id) === hash) pending.delete(id);
  }
}

function dropPendingFor(hash: string): void {
  for (const [id, ws] of pending) {
    if (ws === hash) pending.delete(id);
  }
}

export function releaseAllPending(cwd: string): void {
  dropPendingFor(workspaceHash(cwd));
  scheduleGc();
}

export function clearWorkspaceImages(cwd: string, options: { strict?: boolean } = {}): void {
  const hash = workspaceHash(cwd);
  removedProjects.add(hash);
  projectGenerations.set(hash, (projectGenerations.get(hash) ?? 0) + 1);
  dropPendingFor(hash);
  try {
    rmSync(join(blobRoot(), hash), { recursive: true, force: true });
  } catch (error) {
    if (options.strict) throw error;
  }
}

export function gcSweep(): void {
  const root = blobRoot();
  if (!existsSync(root)) return;
  try {
    if (!canWriteStateFile(join(stateRoot(), 'transcripts.json'), 2) ||
      !canWriteStateFile(join(stateRoot(), 'chat-history.json'), 1) ||
      !canWriteStateFile(join(stateRoot(), 'composer-drafts.json'), 1) ||
      !transcriptRootsComplete()) return;
  } catch {
    return;
  }

  const roots = new Set<string>(pending.keys());
  for (const events of Object.values(readAllTranscripts())) {
    for (const id of imageIdsInEvents(events)) roots.add(id);
  }
  if (liveRootsProvider) {
    for (const id of imageIdsInEvents(liveRootsProvider())) roots.add(id);
  }
  if (draftRootsProvider) {
    for (const id of draftRootsProvider()) roots.add(id);
  }
  if (archiveRootsProvider) {
    for (const id of archiveRootsProvider()) roots.add(id);
  }
  let complete = true;
  if (canvasRootsProvider) {
    const canvas = canvasRootsProvider();
    for (const id of canvas.ids) roots.add(id);
    complete = canvas.complete;
  }
  // As with an unlistable blob root below: deleting against a partial root set is the loss the roots exist to prevent (ONL-2486).
  if (!complete) return;

  let dirs: string[];
  try {
    dirs = readdirSync(root);
  } catch {
    return;
  }
  for (const dir of dirs) {
    let files: string[];
    try {
      files = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (roots.has(idFor(dir, file))) continue;
      try {
        rmSync(join(root, dir, file), { force: true });
      } catch {
        // A throw here escapes the bare timer; retried next sweep.
      }
    }
  }
}

// Debounced: scheduleGc fires per logged event, one per token delta while streaming.
const GC_DEBOUNCE_MS = 5_000;
let gcTimer: ReturnType<typeof setTimeout> | undefined;

export function scheduleGc(): void {
  if (gcTimer !== undefined) clearTimeout(gcTimer);
  gcTimer = setTimeout(() => {
    gcTimer = undefined;
    gcSweep();
  }, GC_DEBOUNCE_MS);
}

export function resetImagesStore(): void {
  if (gcTimer !== undefined) {
    clearTimeout(gcTimer);
    gcTimer = undefined;
  }
  pending.clear();
  removedProjects.clear();
  projectGenerations.clear();
  liveRootsProvider = undefined;
  draftRootsProvider = undefined;
  archiveRootsProvider = undefined;
  canvasRootsProvider = undefined;
}
