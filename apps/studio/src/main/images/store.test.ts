import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { nextTaskPicturesLine, SUGGEST_NEXT_TASKS_TOOL, type StudioEvent } from '@studio/events';
import { resetTranscriptCache, writeTranscript } from '../agent-host/transcript.js';
import { TranscriptStorage, transcriptFilePath } from '../agent-host/transcript-storage.js';
import { canonicalPath } from '../lib/canonical-path.js';
import {
  draftImageIds,
  resetComposerDraftsCache,
  writeComposerDraft,
} from '../drafts/state.js';
import {
  clearWorkspaceImages,
  gcSweep,
  imageIdsInEvents,
  readImage,
  registerImage,
  reopenWorkspaceImages,
  releaseAllPending,
  resetImagesStore,
  setCanvasRootsProvider,
  setDraftRootsProvider,
  setLiveRootsProvider,
  settlePending,
  workspaceImagesGeneration,
} from './store.js';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0, 7]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 8]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'images-store-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  resetImagesStore();
  resetTranscriptCache();
  resetComposerDraftsCache();
});

afterEach(() => {
  resetImagesStore();
  resetTranscriptCache();
  resetComposerDraftsCache();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  rmSync(root, { recursive: true, force: true });
});

function userEvent(ids: string[]): StudioEvent {
  return {
    type: 'message.user',
    turnId: 't1',
    text: 'prompt',
    attachments: ids.map((id) => ({ id, mediaType: 'image/png' as const })),
    sessionId: 's1',
    eventId: 'e1',
    seq: 1,
    ts: 1,
  } as StudioEvent;
}

describe('registerImage — the attach-time gates', () => {
  it('reopens one Project without validating old admissions or changing a sibling generation', () => {
    const cwd = join(root, 'project');
    const sibling = join(root, 'sibling');
    const generation = workspaceImagesGeneration(cwd);
    const siblingGeneration = workspaceImagesGeneration(sibling);
    const siblingImage = registerImage(sibling, PNG);
    expect(siblingImage.ok).toBe(true);
    clearWorkspaceImages(cwd);
    expect(registerImage(cwd, PNG)).toEqual({ ok: false, reason: 'unreadable' });
    reopenWorkspaceImages(cwd);
    expect(workspaceImagesGeneration(cwd)).not.toBe(generation);
    expect(workspaceImagesGeneration(sibling)).toBe(siblingGeneration);
    expect(registerImage(cwd, PNG).ok).toBe(true);
    if (siblingImage.ok) expect(readImage(siblingImage.image.id)?.bytes).toEqual(PNG);
  });

  it('stores and rereads the exact SVG source for canvas registrations', () => {
    const result = registerImage('/tmp/ws-a', SVG, { allowSvg: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected SVG registration');
    expect(result.image.mediaType).toBe('image/svg+xml');
    const back = readImage(result.image.id);
    expect(back?.mediaType).toBe('image/svg+xml');
    expect(back?.bytes).toEqual(SVG);
  });
  it('accepts all four formats and answers the sniffed type', () => {
    const cases = [
      { bytes: PNG, mediaType: 'image/png' },
      { bytes: JPEG, mediaType: 'image/jpeg' },
      { bytes: GIF, mediaType: 'image/gif' },
      { bytes: WEBP, mediaType: 'image/webp' },
    ] as const;
    for (const { bytes, mediaType } of cases) {
      const result = registerImage('/tmp/ws-a', bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.image.mediaType).toBe(mediaType);
      const back = readImage(result.image.id);
      expect(back?.mediaType).toBe(mediaType);
      expect(Buffer.from(back?.bytes ?? []).equals(Buffer.from(bytes))).toBe(true);
    }
  });

  it('rejects svg and garbage bytes as unsupported-format', () => {
    expect(registerImage('/tmp/ws-a', SVG)).toEqual({ ok: false, reason: 'unsupported-format' });
    expect(registerImage('/tmp/ws-a', Uint8Array.from({ length: 64 }, (_, i) => i))).toEqual({
      ok: false,
      reason: 'unsupported-format',
    });
  });

  it('writes blobs 0600 under the state root', () => {
    const result = registerImage('/tmp/ws-a', PNG);
    if (!result.ok) throw new Error('expected ok');
    const dir = join(root, 'image-blobs', result.image.id.slice(0, 12));
    const [file] = readdirSync(dir);
    expect(file).toBeDefined();
    const mode = statSync(join(dir, String(file))).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('readImage — id hygiene and the placeholder path', () => {
  it('answers null for an unknown id, never throws', () => {
    expect(readImage('0123456789ab-00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('refuses anything that is not a bare minted id before path join', () => {
    expect(readImage('../../../etc/passwd')).toBeNull();
    expect(readImage('0123456789ab/evil')).toBeNull();
    expect(readImage('')).toBeNull();
  });
});

describe('gcSweep — the root set', () => {
  it.each(['quarantine', 'legacy-refusal'])('keeps attachments behind unresolved %s transcript recovery across worker startup', recovery => {
    const cwd = canonicalPath('/tmp/ws-a');
    const image = registerImage(cwd, PNG);
    if (!image.ok) throw new Error('expected ok');
    settlePending(cwd, [image.image.id]);
    const storage = new TranscriptStorage(root);
    if (recovery === 'quarantine') {
      mkdirSync(join(root, 'transcripts'));
      writeFileSync(transcriptFilePath(root, cwd), '{"interrupted":');
      storage.clear(cwd, 'claude');
    } else {
      storage.patch(cwd, 'claude', 0, [userEvent([])], 1);
      storage.flush();
      writeFileSync(join(root, 'transcripts.json'), JSON.stringify({ version: 2, data: {
        byWorkspace: { [`${cwd}::claude`]: [userEvent([image.image.id])] },
      } }));
      expect(() => storage.migrate()).toThrow('conflicting transcript migration identity');
    }
    gcSweep();
    expect(readImage(image.image.id)).not.toBeNull();
    resetTranscriptCache();
    gcSweep();
    expect(readImage(image.image.id)).not.toBeNull();
  });

  it('does not collect attachments whose roots may belong to newer saved metadata', () => {
    for (const name of ['transcripts', 'chat-history', 'composer-drafts']) {
      const result = registerImage('/tmp/ws-a', PNG);
      if (!result.ok) throw new Error('expected ok');
      settlePending('/tmp/ws-a', [result.image.id]);
      const path = join(root, `${name}.json`);
      const bytes = '{"version":99,"data":{"futureShape":true}}\n';
      writeFileSync(path, bytes);
      gcSweep();
      expect(readImage(result.image.id)).not.toBeNull();
      expect(readFileSync(path, 'utf8')).toBe(bytes);
      rmSync(path);
    }
  });

  it('keeps a pending (registered, unsent) blob — the mid-compose case', () => {
    const result = registerImage('/tmp/ws-a', PNG);
    if (!result.ok) throw new Error('expected ok');
    gcSweep();
    expect(readImage(result.image.id)).not.toBeNull();
  });

  it('keeps blobs referenced by persisted transcripts, collects the unrooted', () => {
    const kept = registerImage('/tmp/ws-a', PNG);
    const dropped = registerImage('/tmp/ws-a', JPEG);
    if (!kept.ok || !dropped.ok) throw new Error('expected ok');

    writeTranscript('/tmp/ws-a', 'claude', [userEvent([kept.image.id])]);
    settlePending('/tmp/ws-a', [kept.image.id, dropped.image.id]);
    gcSweep();

    expect(readImage(kept.image.id)).not.toBeNull();
    expect(readImage(dropped.image.id)).toBeNull();
  });

  it('keeps blobs referenced only by the live session log', () => {
    const live = registerImage('/tmp/ws-a', PNG);
    if (!live.ok) throw new Error('expected ok');
    setLiveRootsProvider(() => [userEvent([live.image.id])]);
    settlePending('/tmp/ws-a', [live.image.id]);
    gcSweep();
    expect(readImage(live.image.id)).not.toBeNull();
  });

  it('never touches another project’s rooted blobs', () => {
    const a = registerImage('/tmp/ws-a', PNG);
    const b = registerImage('/tmp/ws-b', JPEG);
    if (!a.ok || !b.ok) throw new Error('expected ok');
    writeTranscript('/tmp/ws-b', 'claude', [userEvent([b.image.id])]);
    settlePending('/tmp/ws-a', [a.image.id]);
    settlePending('/tmp/ws-b', [b.image.id]);
    gcSweep();
    expect(readImage(a.image.id)).toBeNull();
    expect(readImage(b.image.id)).not.toBeNull();
  });
});

describe('settlePending — sent ids only', () => {
  it('keeps a registered-but-unsent ref pending while others settle', () => {
    const sent = registerImage('/tmp/ws-a', PNG);
    const midAdmit = registerImage('/tmp/ws-a', JPEG);
    if (!sent.ok || !midAdmit.ok) throw new Error('expected ok');

    setLiveRootsProvider(() => [userEvent([sent.image.id])]);
    settlePending('/tmp/ws-a', [sent.image.id]);
    gcSweep();

    expect(readImage(midAdmit.image.id)).not.toBeNull();
    expect(readImage(sent.image.id)).not.toBeNull();
  });

  it('ignores a sent id that belongs to a different project', () => {
    const foreign = registerImage('/tmp/ws-b', PNG);
    if (!foreign.ok) throw new Error('expected ok');
    settlePending('/tmp/ws-a', [foreign.image.id]);
    gcSweep();
    expect(readImage(foreign.image.id)).not.toBeNull();
  });

  it('drops the hold the registering cwd took, so one namespace covers attach and send (ONL-2549)', () => {
    const sent = registerImage('/tmp/worktrees/shop', PNG);
    if (!sent.ok) throw new Error('expected ok');

    settlePending('/tmp/worktrees/shop', [sent.image.id]);
    gcSweep();

    expect(readImage(sent.image.id)).toBeNull();
  });

  it('a hold-free capture with no transcript root reclaims on sweep', () => {
    const captured = registerImage('/tmp/ws-a', PNG, { hold: false });
    if (!captured.ok) throw new Error('expected ok');
    gcSweep();
    expect(readImage(captured.image.id)).toBeNull();
  });
});

describe('releaseAllPending — the session-close reclaim', () => {
  it('releases a project’s unsent holds so the sweep reclaims them', () => {
    const abandoned = registerImage('/tmp/ws-a', PNG);
    if (!abandoned.ok) throw new Error('expected ok');
    releaseAllPending('/tmp/ws-a');
    gcSweep();
    expect(readImage(abandoned.image.id)).toBeNull();
  });

  it('never releases another project’s holds', () => {
    const a = registerImage('/tmp/ws-a', PNG);
    const b = registerImage('/tmp/ws-b', JPEG);
    if (!a.ok || !b.ok) throw new Error('expected ok');
    releaseAllPending('/tmp/ws-a');
    gcSweep();
    expect(readImage(a.image.id)).toBeNull();
    expect(readImage(b.image.id)).not.toBeNull();
  });
});

describe('a stored draft is a GC root (ONL-2207)', () => {
  it('keeps an un-sent attachment through the session stop that released its hold', () => {
    const unsent = registerImage('/tmp/ws-a', PNG);
    if (!unsent.ok) throw new Error('expected ok');
    setDraftRootsProvider(() => draftImageIds());
    writeComposerDraft('/tmp/ws-a', { text: 'still writing', images: [unsent.image] });

    releaseAllPending('/tmp/ws-a');
    gcSweep();

    expect(readImage(unsent.image.id)).not.toBeNull();
  });

  it('reclaims it once the draft no longer holds it', () => {
    const unsent = registerImage('/tmp/ws-a', PNG);
    if (!unsent.ok) throw new Error('expected ok');
    setDraftRootsProvider(() => draftImageIds());
    writeComposerDraft('/tmp/ws-a', { text: 'still writing', images: [unsent.image] });
    releaseAllPending('/tmp/ws-a');

    writeComposerDraft('/tmp/ws-a', { text: '', images: [] });
    gcSweep();

    expect(readImage(unsent.image.id)).toBeNull();
  });
});

describe('a canvas node is a GC root (ONL-2486)', () => {
  it('keeps what the canvas names once the attach-time hold is gone, and takes the rest', () => {
    const named = registerImage('/tmp/ws-a', PNG);
    const orphan = registerImage('/tmp/ws-a', JPEG);
    if (!named.ok || !orphan.ok) throw new Error('expected ok');
    setCanvasRootsProvider(() => ({ ids: [named.image.id], complete: true }));

    releaseAllPending('/tmp/ws-a');
    gcSweep();

    expect(readImage(named.image.id)).not.toBeNull();
    expect(readImage(orphan.image.id)).toBeNull();
  });

  it('deletes nothing when the canvas could not name every document it holds', () => {
    const named = registerImage('/tmp/ws-a', PNG);
    const unnamed = registerImage('/tmp/ws-a', JPEG);
    if (!named.ok || !unnamed.ok) throw new Error('expected ok');
    setCanvasRootsProvider(() => ({ ids: [named.image.id], complete: false }));

    releaseAllPending('/tmp/ws-a');
    gcSweep();

    expect(readImage(named.image.id)).not.toBeNull();
    expect(readImage(unnamed.image.id)).not.toBeNull();
  });

  it('is dropped by the store reset, so no suite inherits the previous one’s canvas', () => {
    const named = registerImage('/tmp/ws-a', PNG);
    if (!named.ok) throw new Error('expected ok');
    setCanvasRootsProvider(() => ({ ids: [named.image.id], complete: true }));

    resetImagesStore();
    gcSweep();

    expect(readImage(named.image.id)).toBeNull();
  });
});

describe('clearWorkspaceImages — the fresh-session sibling', () => {
  it('removes the project’s blob directory and nothing else', () => {
    const a = registerImage('/tmp/ws-a', PNG);
    const b = registerImage('/tmp/ws-b', JPEG);
    if (!a.ok || !b.ok) throw new Error('expected ok');
    clearWorkspaceImages('/tmp/ws-a');
    expect(readImage(a.image.id)).toBeNull();
    expect(existsSync(join(root, 'image-blobs', a.image.id.slice(0, 12)))).toBe(false);
    expect(readImage(b.image.id)).not.toBeNull();
    expect(registerImage('/tmp/ws-a', PNG)).toEqual({ ok: false, reason: 'unreadable' });
    expect(existsSync(join(root, 'image-blobs', a.image.id.slice(0, 12)))).toBe(false);
  });
});

describe('imageIdsInEvents — both producers', () => {
  it('collects user attachments and tool-result images, nothing else', () => {
    const events: StudioEvent[] = [
      userEvent(['0123456789ab-00000000-0000-0000-0000-000000000001']),
      {
        type: 'tool.end',
        toolCallId: 't1',
        status: 'completed',
        images: [
          {
            id: '0123456789ab-00000000-0000-0000-0000-000000000002',
            mediaType: 'image/png' as const,
          },
        ],
        sessionId: 's1',
        eventId: 'e2',
        seq: 2,
        ts: 2,
      } as StudioEvent,
      {
        type: 'text.end',
        blockId: 'b1',
        text: 'prose mentioning assets/hero.png goes nowhere',
        sessionId: 's1',
        eventId: 'e3',
        seq: 3,
        ts: 3,
      } as StudioEvent,
    ];
    const ids = imageIdsInEvents(events);
    expect(ids.size).toBe(2);
    expect(ids.has('0123456789ab-00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(ids.has('0123456789ab-00000000-0000-0000-0000-000000000002')).toBe(true);
  });

  it('keeps the pictures a next-task offer names, and nothing a look-alike line elsewhere names (ONL-2977)', () => {
    const clip = '0123456789ab-00000000-0000-0000-0000-000000000003';
    const stray = '0123456789ab-00000000-0000-0000-0000-000000000004';
    const base = { sessionId: 's1', ts: 1 };
    const events = [
      { ...base, type: 'tool.start', toolCallId: 'offer', name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest', eventId: 'e1', seq: 1 },
      { ...base, type: 'tool.end', toolCallId: 'offer', status: 'completed', result: `Shown.\n${nextTaskPicturesLine([{ clip }, { skeleton: 'row' }, null])}`, eventId: 'e2', seq: 2 },
      { ...base, type: 'tool.start', toolCallId: 'bash', name: 'Bash', kind: 'shell', title: 'Run', eventId: 'e3', seq: 3 },
      { ...base, type: 'tool.end', toolCallId: 'bash', status: 'completed', result: nextTaskPicturesLine([{ clip: stray }]), eventId: 'e4', seq: 4 },
    ] as StudioEvent[];
    expect([...imageIdsInEvents(events)]).toEqual([clip]);
  });
});
