/** Stale by definition: nothing durable derives from it; the durable address is the document's `homeUrl` (ONL-1995). */

import { webContents, type WebContents } from 'electron';
import { on } from '../ipc/bridge.js';
import {
  FRAME_CONSOLE_CAPACITY,
  IPC_SEND,
  isRecord,
  truncateConsoleLine,
  type CanvasDocId,
  type FrameConsoleLine,
  type FrameFacts,
  type FrameFactsPush,
  type MirroredFrame,
} from '@studio/events';
import { log } from '../log/index.js';

const logger = log('canvas');

interface Entry {
  facts: FrameFacts;
  console: FrameConsoleLine[];
}

interface ViewState {
  docId: string;
  entries: Map<string, Entry>;
}

export interface FrameMirrorReader {
  /** Drains each answered frame's console buffer: "since the agent last looked" has no timestamp. */
  read(docId: string, ids: readonly string[]): MirroredFrame[];
  /** `read` without the drain. */
  peek(docId: string, id: string): FrameFacts | undefined;
}

/** Apart from `FrameMirrorReader`, which the agent's tools take: a guest id is main's own address, not a reading (ONL-2471). */
export interface FrameGuestLookup {
  /** The reverse of `FrameFacts.webContentsId`; an id two views carry answers `undefined`. */
  docIdForGuest(webContentsId: number): CanvasDocId | undefined;
  frameForGuest(webContentsId: number): { docId: CanvasDocId; frameId: string } | undefined;
}

export interface FrameMirror extends FrameMirrorReader, FrameGuestLookup {
  note(viewId: number, push: FrameFactsPush): void;
  /** Electron recycles webContents ids; a leaked entry is addressable. */
  forget(viewId: number): void;
  clear(): void;
}

const HEALTHS = new Set(['loading', 'live', 'unreachable']);
const LEVELS = new Set(['log', 'warning', 'error']);

function readFacts(value: unknown): FrameFacts | undefined {
  if (!isRecord(value)) return undefined;
  const { id, currentUrl, health, title, webContentsId, targetUrl, loadFailed } = value;
  if (typeof id !== 'string' || id === '') return undefined;
  if (typeof currentUrl !== 'string') return undefined;
  if (typeof health !== 'string' || !HEALTHS.has(health)) return undefined;
  if (typeof title !== 'string') return undefined;
  const facts: FrameFacts = {
    id,
    currentUrl,
    health: health as FrameFacts['health'],
    title,
  };
  // A bad id addresses whatever page holds it now; absent beats wrong.
  if (typeof webContentsId === 'number' && Number.isInteger(webContentsId) && webContentsId > 0) {
    facts.webContentsId = webContentsId;
  }
  if (typeof targetUrl === 'string' && targetUrl !== '') facts.targetUrl = targetUrl;
  if (loadFailed === true) facts.loadFailed = true;
  return facts;
}

function readLine(value: unknown): FrameConsoleLine | undefined {
  if (!isRecord(value)) return undefined;
  const { level, text } = value;
  if (typeof level !== 'string' || !LEVELS.has(level)) return undefined;
  if (typeof text !== 'string') return undefined;
  return truncateConsoleLine({ level: level as FrameConsoleLine['level'], text });
}

export function createFrameMirror(
  options: { consoleCapacity?: number } = {},
): FrameMirror {
  const capacity = options.consoleCapacity ?? FRAME_CONSOLE_CAPACITY;
  const views = new Map<number, ViewState>();

  function resolve(docId: string): ViewState | undefined {
    let found: ViewState | undefined;
    for (const view of views.values()) {
      if (view.docId !== docId) continue;
      if (found !== undefined) {
        logger.error('document is mirrored by more than one view; refusing to guess which page a canvas tool meant (ONL-2222; ONL-2206 owns whether one view per workspace is an invariant)', { doc_id: docId });
        return undefined;
      }
      found = view;
    }
    return found;
  }

  return {
    note(viewId, push) {
      if (!isRecord(push)) return;
      const { docId, frames, console: lines } = push;
      if (typeof docId !== 'string' || docId === '') return;
      if (!Array.isArray(frames)) return;

      // Replace, never merge: an id present in both documents would answer the old console.
      let state = views.get(viewId);
      if (state === undefined || state.docId !== docId) {
        state = { docId, entries: new Map() };
        views.set(viewId, state);
      }
      const entries = state.entries;

      // The push is the complete list; absence is removal.
      const seen = new Set<string>();
      for (const raw of frames) {
        const facts = readFacts(raw);
        if (facts === undefined) continue;
        seen.add(facts.id);
        const existing = entries.get(facts.id);
        if (existing) existing.facts = facts;
        else entries.set(facts.id, { facts, console: [] });
      }
      for (const id of [...entries.keys()]) {
        if (!seen.has(id)) entries.delete(id);
      }

      if (!Array.isArray(lines)) return;
      for (const raw of lines) {
        if (!isRecord(raw)) continue;
        const { id, lines: batch } = raw;
        if (typeof id !== 'string' || !Array.isArray(batch)) continue;
        const entry = entries.get(id);
        if (entry === undefined) continue;
        for (const rawLine of batch) {
          const line = readLine(rawLine);
          if (line === undefined) continue;
          entry.console.push(line);
        }
        if (entry.console.length > capacity) {
          entry.console.splice(0, entry.console.length - capacity);
        }
      }
    },

    forget(viewId) {
      views.delete(viewId);
    },

    read(docId, ids) {
      const state = resolve(docId);
      if (state === undefined) return [];
      const out: MirroredFrame[] = [];
      for (const id of ids) {
        const entry = state.entries.get(id);
        if (entry === undefined) continue;
        const drained = entry.console;
        entry.console = [];
        out.push({
          ...entry.facts,
          console: drained,
          errorCount: drained.reduce((n, line) => (line.level === 'error' ? n + 1 : n), 0),
        });
      }
      return out;
    },

    peek(docId, id) {
      return resolve(docId)?.entries.get(id)?.facts;
    },

    docIdForGuest(webContentsId) {
      return this.frameForGuest(webContentsId)?.docId;
    },

    frameForGuest(webContentsId) {
      let found: { view: ViewState; frameId: string } | undefined;
      for (const view of views.values()) {
        let frameId: string | undefined;
        for (const [id, entry] of view.entries) {
          if (entry.facts.webContentsId === webContentsId) frameId = id;
        }
        if (frameId === undefined) continue;
        if (found !== undefined && found.view !== view) {
          logger.error('a guest id is claimed by more than one view; refusing to guess which document it changed (ONL-2471)', { web_contents_id: webContentsId });
          return undefined;
        }
        found = { view, frameId };
      }
      return found === undefined ? undefined : { docId: found.view.docId, frameId: found.frameId };
    },

    clear() {
      views.clear();
    },
  };
}

const mirror = createFrameMirror();

// A separate object, not a narrowed type: a cast would defeat the type.
const reader: FrameMirrorReader & FrameGuestLookup = {
  read: (docId, ids) => mirror.read(docId, ids),
  peek: (docId, id) => mirror.peek(docId, id),
  docIdForGuest: (webContentsId) => mirror.docIdForGuest(webContentsId),
  frameForGuest: (webContentsId) => mirror.frameForGuest(webContentsId),
};

export function installFrameMirror(): FrameMirrorReader & FrameGuestLookup {
  const watched = new WeakSet<WebContents>();
  on(IPC_SEND.canvasFrames, (_project, push, event) => {
    if (!Array.isArray(push.frames)) return;
    const sender = event.sender;
    const viewId = sender.id;
    // The sender is the view; a push that could name one could overwrite another tab's frames.
    const frames = push.frames.map((facts) => {
      if (!facts || typeof facts.webContentsId !== 'number') return facts;
      const guest = webContents.fromId(facts.webContentsId);
      if (guest && !guest.isDestroyed() && guest.getType() === 'webview' && guest.hostWebContents === sender) return facts;
      const { webContentsId: _foreignId, ...safe } = facts;
      return safe;
    });
    mirror.note(viewId, { ...push, frames });
    if (!watched.has(sender)) {
      watched.add(sender);
      sender.once('destroyed', () => mirror.forget(viewId));
    }
  });
  return reader;
}

export function frameMirror(): FrameMirrorReader & FrameGuestLookup {
  return reader;
}

/** The push the renderer would have sent; `installFrameMirror`'s ipc seam is not reachable from a unit test. */
export function noteFramesForTesting(viewId: number, push: FrameFactsPush): void {
  mirror.note(viewId, push);
}

export function resetFrameMirrorForTesting(): void {
  mirror.clear();
}
