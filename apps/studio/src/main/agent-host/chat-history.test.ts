import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StudioEvent } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import {
  gcSweep,
  readImage,
  registerImage,
  resetImagesStore,
  setArchiveRootsProvider,
} from '../images/store.js';
import { resetTranscriptCache } from './transcript.js';
import { harnessKey } from './sessions.js';

const {
  MAX_ARCHIVED_CHATS,
  archiveChat,
  forgetArchivedChats,
  archivedImageIds,
  readArchivedChats,
  resetChatHistoryCache,
} = await import('./chat-history.js');

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let stateRoot: string;
let a: string;
let b: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'chat-history' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetChatHistoryCache();
  resetTranscriptCache();
  resetImagesStore();
  // Real directories: keys canonicalise through the filesystem.
  a = join(stateRoot, 'a');
  b = join(stateRoot, 'b');
  for (const dir of [a, b]) mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  resetImagesStore();
  resetTranscriptCache();
});

function row(seq: number, ids: readonly string[] = []): StudioEvent {
  return {
    type: 'message.user',
    turnId: 't1',
    text: 'prompt',
    attachments: ids.map((id) => ({ id, mediaType: 'image/png' as const })),
    sessionId: 's1',
    eventId: `e${String(seq)}`,
    seq,
    ts: seq,
  } as StudioEvent;
}

function plant(data: unknown, version = 1): void {
  writeFileSync(join(stateRoot, 'chat-history.json'), `${JSON.stringify({ version, data })}\n`);
}

function quarantined(): string[] {
  return readdirSync(stateRoot).filter((name) => name.startsWith('chat-history.json.corrupt-'));
}

describe('a file written by another version (ONL-2198)', () => {
  it('leaves a newer archive untouched instead of migrating or quarantining it', () => {
    plant(
      {
        byWorkspace: {
          [harnessKey(a, 'claude')]: [
            { sessionId: 'kept', archivedAt: '2026-01-01T00:00:00.000Z', events: [row(1)] },
            { sessionId: 'broken', archivedAt: '2026-01-01T00:00:00.000Z', events: [{ nope: true }] },
          ],
        },
      },
      7,
    );
    const bytes = readFileSync(join(stateRoot, 'chat-history.json'), 'utf8');
    resetChatHistoryCache();

    expect(readArchivedChats(a, 'claude')).toEqual([]);
    archiveChat(a, 'claude', { sessionId: 'local', events: [row(2)] });
    expect(readFileSync(join(stateRoot, 'chat-history.json'), 'utf8')).toBe(bytes);
    expect(quarantined()).toEqual([]);
  });

  it('preserves a newer archive through repeated cache resets', () => {
    plant(
      { byWorkspace: { [harnessKey(a, 'claude')]: [{ sessionId: 'kept', archivedAt: 'x', events: [row(1)] }] } },
      7,
    );
    const bytes = readFileSync(join(stateRoot, 'chat-history.json'), 'utf8');
    resetChatHistoryCache();
    readArchivedChats(a, 'claude');
    resetChatHistoryCache();

    expect(readArchivedChats(a, 'claude')).toEqual([]);
    expect(readFileSync(join(stateRoot, 'chat-history.json'), 'utf8')).toBe(bytes);
  });

  it('a pre-envelope file is migrated by the same path, not quarantined', () => {
    writeFileSync(
      join(stateRoot, 'chat-history.json'),
      `${JSON.stringify({ byWorkspace: { [harnessKey(a, 'claude')]: [{ sessionId: 'old', archivedAt: 'x', events: [row(1)] }] } })}\n`,
    );
    resetChatHistoryCache();

    expect(readArchivedChats(a, 'claude').map((chat) => chat.sessionId)).toEqual(['old']);
    expect(quarantined()).toEqual([]);
  });
});

describe('the archive round-trip', () => {
  it('keeps every archived chat in the order it was written, across a cache drop', () => {
    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1), row(2)] });
    archiveChat(a, 'claude', { sessionId: 's2', events: [row(3)] });

    resetChatHistoryCache();
    const back = readArchivedChats(a, 'claude');
    expect(back.map((chat) => chat.sessionId)).toEqual(['s1', 's2']);
    expect(back[0]?.events).toEqual([row(1), row(2)]);
    expect(Number.isNaN(Date.parse(back[1]?.archivedAt ?? ''))).toBe(false);
  });

  it('writes undebounced, in the versioned envelope', () => {
    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1)] });
    const written = JSON.parse(readFileSync(join(stateRoot, 'chat-history.json'), 'utf8')) as {
      version: number;
    };
    expect(written.version).toBe(1);
  });

  it('keeps the two runtimes apart under one project', () => {
    archiveChat(a, 'claude', { sessionId: 'claude-1', events: [row(1)] });
    archiveChat(a, 'appserver', { sessionId: 'codex-1', events: [row(2)] });

    resetChatHistoryCache();
    expect(readArchivedChats(a, 'claude').map((chat) => chat.sessionId)).toEqual(['claude-1']);
    expect(readArchivedChats(a, 'appserver').map((chat) => chat.sessionId)).toEqual(['codex-1']);
    expect(readArchivedChats(b, 'claude')).toEqual([]);
  });
});

describe('reading a shape we did not write', () => {
  it('drops one malformed archived chat and keeps its siblings', () => {
    plant({
      byWorkspace: {
        [harnessKey(a, 'claude')]: [
          { sessionId: 's1', events: [row(1)], archivedAt: '2026-09-24T00:00:00.000Z' },
          { sessionId: 7, events: [row(2)], archivedAt: '2026-09-24T00:00:01.000Z' },
          { sessionId: 's3', events: 'not an array', archivedAt: '2026-09-24T00:00:02.000Z' },
          { sessionId: 's4', events: [row(3), { type: 'message.user' }], archivedAt: '2026-09-24T00:00:03.000Z' },
          { sessionId: 's5', events: [row(4)], archivedAt: '2026-09-24T00:00:04.000Z' },
        ],
      },
    });

    expect(readArchivedChats(a, 'claude').map((chat) => chat.sessionId)).toEqual(['s1', 's5']);
    expect(quarantined()).toEqual([]);
  });

  it('never writes an unsanitised sibling back', () => {
    plant({
      byWorkspace: {
        [harnessKey(a, 'claude')]: [{ sessionId: 7, events: [], archivedAt: 'x' }],
        [harnessKey(b, 'claude')]: 'not an array',
      },
    });

    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1)] });
    resetChatHistoryCache();
    expect(readArchivedChats(a, 'claude').map((chat) => chat.sessionId)).toEqual(['s1']);
    expect(readArchivedChats(b, 'claude')).toEqual([]);
  });

  it('tolerates a hollow file on read and on write', () => {
    plant(null);
    expect(readArchivedChats(a, 'claude')).toEqual([]);
    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1)] });
    expect(readArchivedChats(a, 'claude').map((chat) => chat.sessionId)).toEqual(['s1']);
    expect(quarantined()).toEqual([]);
  });

  it('answers the empty fallback for an absent file without quarantining it', () => {
    expect(readArchivedChats(a, 'claude')).toEqual([]);
    expect(quarantined()).toEqual([]);
  });

  it('quarantines unparseable bytes and falls back', () => {
    writeFileSync(join(stateRoot, 'chat-history.json'), 'not json at all');
    expect(readArchivedChats(a, 'claude')).toEqual([]);
    expect(quarantined()).toHaveLength(1);
  });
});

describe('retention', () => {
  it('trims the oldest chat and never the newest', () => {
    const over = MAX_ARCHIVED_CHATS + 3;
    for (let i = 1; i <= over; i += 1) {
      archiveChat(a, 'claude', { sessionId: `s${String(i)}`, events: [row(i)] });
    }

    resetChatHistoryCache();
    const back = readArchivedChats(a, 'claude');
    expect(back).toHaveLength(MAX_ARCHIVED_CHATS);
    expect(back[0]?.sessionId).toBe('s4');
    expect(back.at(-1)?.sessionId).toBe(`s${String(over)}`);
  });

  it('preserves the beginning and end of a chat beyond 4,000 rows', () => {
    const events = Array.from({ length: 4_100 }, (_, i) => row(i + 1));
    archiveChat(a, 'claude', { sessionId: 's1', events });

    resetChatHistoryCache();
    const stored = readArchivedChats(a, 'claude')[0]?.events ?? [];
    expect(stored).toHaveLength(4_100);
    expect(stored[0]?.seq).toBe(1);
    expect(stored.at(-1)?.seq).toBe(4_100);
  });
});

describe('the image GC root', () => {
  it('keeps a blob referenced only by an archived chat', () => {
    const registered = registerImage(a, PNG, { hold: false });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    const { id } = registered.image;

    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1, [id])] });
    expect([...archivedImageIds()]).toEqual([id]);

    setArchiveRootsProvider(() => archivedImageIds());
    gcSweep();
    expect(readImage(id)).not.toBeNull();
  });

  it('is the only thing keeping it: without the provider the sweep takes it', () => {
    const registered = registerImage(a, PNG, { hold: false });
    if (!registered.ok) return;
    const { id } = registered.image;

    archiveChat(a, 'claude', { sessionId: 's1', events: [row(1, [id])] });
    gcSweep();
    expect(readImage(id)).toBeNull();
  });
});

describe('Project teardown', () => {
  it('forgets only the named Project and Harness, including the persisted map entry', () => {
    archiveChat(a, 'claude', { sessionId: 'claude-a', events: [row(1)] });
    archiveChat(a, 'appserver', { sessionId: 'codex-a', events: [row(2)] });
    archiveChat(b, 'claude', { sessionId: 'claude-b', events: [row(3)] });
    forgetArchivedChats(a, 'claude');
    resetChatHistoryCache();
    expect(readArchivedChats(a, 'claude')).toEqual([]);
    expect(readArchivedChats(a, 'appserver')[0]?.sessionId).toBe('codex-a');
    expect(readArchivedChats(b, 'claude')[0]?.sessionId).toBe('claude-b');
    const stored = JSON.parse(readFileSync(join(stateRoot, 'chat-history.json'), 'utf8')) as {
      data: { byWorkspace: Record<string, unknown> };
    };
    expect(Object.hasOwn(stored.data.byWorkspace, harnessKey(a, 'claude'))).toBe(false);
  });

  it('leaves future archive bytes unchanged while forgetting', () => {
    plant({ byWorkspace: { [harnessKey(a, 'claude')]: [{ sessionId: 'future' }] } }, 99);
    const file = join(stateRoot, 'chat-history.json');
    const before = readFileSync(file, 'utf8');
    forgetArchivedChats(a, 'claude');
    resetChatHistoryCache();
    expect(readFileSync(file, 'utf8')).toBe(before);
  });
});
