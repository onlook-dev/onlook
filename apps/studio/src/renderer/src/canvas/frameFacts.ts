import {
  FRAME_CONSOLE_CAPACITY,
  FRAME_FACTS_PUSH_MS,
  artifactPageUrl,
  ARTIFACT_FIRST_PAGE_PATH,
  truncateConsoleLine,
  type FrameConsoleLine,
  type FrameFacts,
  type FrameFactsPush,
} from '@studio/events';
import type { FrameOverlay } from './readModel.js';
import { useCanvasStore } from './store.js';
import { canvasTransport } from './wire.js';

/** Module state, not store state: in the store, a page logging in a loop re-renders every canvas subscriber. */
const consoleBuffer = new Map<string, FrameConsoleLine[]>();
let factsTimer: ReturnType<typeof setTimeout> | undefined;
let lastFactsSent = '';

/** Set at `dom-ready` and deleted when the guest goes, never inferred: Electron reuses retired webContents ids, so a stale entry addresses somebody else's page. */
const guestIds = new Map<string, number>();

export function noteGuestAttached(id: string, webContentsId: number): void {
  if (!Number.isInteger(webContentsId) || webContentsId <= 0) return;
  if (guestIds.get(id) === webContentsId) return;
  guestIds.set(id, webContentsId);
  scheduleFrameFactsPush();
}

export function noteGuestGone(id: string): void {
  if (!guestIds.delete(id)) return;
  scheduleFrameFactsPush();
}

export function noteFrameConsole(id: string, line: FrameConsoleLine): void {
  const lines = consoleBuffer.get(id) ?? [];
  lines.push(truncateConsoleLine(line));
  // Bounded here too: a runaway page grows the renderer's heap within one coalescing window.
  if (lines.length > FRAME_CONSOLE_CAPACITY) lines.splice(0, lines.length - FRAME_CONSOLE_CAPACITY);
  consoleBuffer.set(id, lines);
  scheduleFrameFactsPush();
}

let currentWorkingFrameIds = new Set<string>();
const workingListeners = new Set<() => void>();

/** For nodes with no frame overlay to patch, such as artifacts (ONL-2593). */
export function subscribeWorkingNodes(listener: () => void): () => void {
  workingListeners.add(listener);
  return () => workingListeners.delete(listener);
}

export function isNodeWorking(id: string): boolean {
  return currentWorkingFrameIds.has(id);
}

/** Each push carries the whole involved set, not a delta. */
export function applyWorkingFrameIds(frameIds: string[]): void {
  const next = new Set(frameIds);
  const patchFrame = useCanvasStore.getState().patchFrame;
  for (const id of currentWorkingFrameIds) {
    if (!next.has(id)) patchFrame(id, { working: false });
  }
  for (const id of next) {
    if (!currentWorkingFrameIds.has(id)) patchFrame(id, { working: true });
  }
  currentWorkingFrameIds = next;
  for (const listener of workingListeners) listener();
}

function pushFrameFacts(): void {
  factsTimer = undefined;
  const wire = canvasTransport();
  const state = useCanvasStore.getState();
  const doc = state.doc;
  if (!wire || !doc) return;

  // Every frame the document holds, not the page composed: absence here means removal, and a page switch removes nothing (ONL-2488).
  const frames: FrameFacts[] = [];
  for (const node of Object.values(doc.nodes)) {
    const facts: Pick<FrameOverlay, 'currentUrl' | 'health' | 'title' | 'target' | 'loadFailure'> | undefined = node.kind === 'artifact'
      ? { currentUrl: artifactPageUrl(node.content.artifactId, node.content.pagePath ?? ARTIFACT_FIRST_PAGE_PATH), health: guestIds.has(node.id) ? 'live' as const : 'loading' as const, title: node.content.title }
      : state.overlay[node.id];
    if (!facts) continue;
    const webContentsId = guestIds.get(node.id);
    frames.push({
      id: node.id,
      currentUrl: facts.currentUrl,
      health: facts.health,
      title: facts.title,
      // Omitted, not zeroed: main refuses a frame it cannot address.
      ...(webContentsId !== undefined ? { webContentsId } : {}),
      ...(facts.target === undefined ? {} : { targetUrl: facts.target.url }),
      ...(facts.loadFailure === undefined ? {} : { loadFailed: true as const }),
    });
  }

  const console_: FrameFactsPush['console'] = [];
  for (const [id, lines] of consoleBuffer) {
    if (lines.length > 0) console_.push({ id, lines });
  }
  consoleBuffer.clear();

  // Every store change schedules a push; an unchanged summary carries nothing main lacks.
  const key = JSON.stringify(frames);
  if (key === lastFactsSent && console_.length === 0) return;
  lastFactsSent = key;
  wire.canvasFrames({ docId: doc.docId, frames, console: console_ });
}

export function scheduleFrameFactsPush(): void {
  factsTimer ??= setTimeout(pushFrameFacts, FRAME_FACTS_PUSH_MS);
}

export function forgetFrameFacts(): void {
  if (factsTimer !== undefined) clearTimeout(factsTimer);
  factsTimer = undefined;
  consoleBuffer.clear();
  guestIds.clear();
  currentWorkingFrameIds = new Set();
  lastFactsSent = '';
}
