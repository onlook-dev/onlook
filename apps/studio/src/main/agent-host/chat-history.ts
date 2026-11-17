import type { StudioEvent } from '@studio/events';
import { imageIdsInEvents } from '../images/store.js';
import { defineDomain } from '../state/store.js';
import { harnessKey, type SessionHarness } from './sessions.js';

export interface ArchivedChat {
  sessionId: string;
  /** ISO, so the follow-up list can order without a storage change (ONL-2325). */
  archivedAt: string;
  events: StudioEvent[];
}

interface ChatHistoryState {
  byWorkspace: Record<string, ArchivedChat[]>;
}

/** Oldest first; the cap trims the front, so the chat a user just left is never the one dropped (ONL-2198). */
export const MAX_ARCHIVED_CHATS = 20;

// Sanitised per entry, never quarantined: this file is the only copy (ONL-2198).
const domain = defineDomain<ChatHistoryState>({
  name: 'chat-history',
  version: 1,
  fallback: () => ({ byWorkspace: {} }),
  // Written back: returning empty here overwrites every archived chat (ONL-2198).
  migrate: (data) => ({ byWorkspace: salvage(data) }),
});

function isEvent(value: unknown): value is StudioEvent {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as { seq?: unknown; type?: unknown };
  return typeof row.seq === 'number' && typeof row.type === 'string';
}

function sanitise(value: unknown): ArchivedChat | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const chat = value as Partial<ArchivedChat>;
  if (typeof chat.sessionId !== 'string') return undefined;
  if (typeof chat.archivedAt !== 'string') return undefined;
  if (!Array.isArray(chat.events)) return undefined;
  // Dropped whole: a half-valid conversation restores rows that never happened.
  if (!chat.events.every(isEvent)) return undefined;
  return {
    sessionId: chat.sessionId,
    archivedAt: chat.archivedAt,
    events: chat.events,
  };
}

function salvage(data: unknown): Record<string, ArchivedChat[]> {
  const byWorkspace = workspaces(data as ChatHistoryState | null);
  const kept: Record<string, ArchivedChat[]> = {};
  for (const [key, chats] of Object.entries(byWorkspace)) {
    if (!Array.isArray(chats)) continue;
    const usable = chats.map(sanitise).filter((chat): chat is ArchivedChat => chat !== undefined);
    if (usable.length > 0) kept[key] = usable.slice(-MAX_ARCHIVED_CHATS);
  }
  return kept;
}

// A version-matched file can still be hollow; `data: null` is a real shape on disk, not corruption.
function workspaces(state: ChatHistoryState | null): Record<string, ArchivedChat[]> {
  const byWorkspace = state?.byWorkspace;
  return typeof byWorkspace === 'object' && byWorkspace !== null ? byWorkspace : {};
}

function chatsAt(state: ChatHistoryState | null, key: string): ArchivedChat[] {
  const stored = workspaces(state)[key];
  if (!Array.isArray(stored)) return [];
  const usable: ArchivedChat[] = [];
  for (const entry of stored) {
    const chat = sanitise(entry);
    if (chat !== undefined) usable.push(chat);
  }
  return usable;
}

export function readArchivedChats(cwd: string, harness: SessionHarness): ArchivedChat[] {
  return chatsAt(domain.read(), harnessKey(cwd, harness));
}

/** Undebounced: the archive has to be on disk before anything clears the conversation it holds (ONL-2198). */
export function archiveChat(
  cwd: string,
  harness: SessionHarness,
  chat: { sessionId: string; events: readonly StudioEvent[] },
): void {
  const key = harnessKey(cwd, harness);
  const entry: ArchivedChat = {
    sessionId: chat.sessionId,
    archivedAt: new Date().toISOString(),
    events: [...chat.events],
  };
  domain.update((state) => {
    // Sanitised, never spread: an unguarded shape written back throws on every later read.
    const byWorkspace: Record<string, ArchivedChat[]> = {};
    for (const stored of Object.keys(workspaces(state))) {
      byWorkspace[stored] = chatsAt(state, stored);
    }
    byWorkspace[key] = [...(byWorkspace[key] ?? []), entry].slice(-MAX_ARCHIVED_CHATS);
    return { byWorkspace };
  });
}

/** A GC root: without it the sweep takes an archived chat's blobs seconds after the new chat starts. */
export function archivedImageIds(): Set<string> {
  const state = domain.read();
  const ids = new Set<string>();
  for (const key of Object.keys(workspaces(state))) {
    for (const chat of chatsAt(state, key)) {
      for (const id of imageIdsInEvents(chat.events)) ids.add(id);
    }
  }
  return ids;
}

export function resetChatHistoryCache(): void {
  domain.reset();
}

export function forgetArchivedChats(cwd: string, harness: SessionHarness): void {
  const key = harnessKey(cwd, harness);
  domain.update((state) => {
    const byWorkspace = { ...workspaces(state) };
    delete byWorkspace[key];
    return { byWorkspace };
  });
}
