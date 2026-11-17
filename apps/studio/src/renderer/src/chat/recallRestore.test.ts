import { describe, expect, it } from 'bun:test';
import type { ArtifactAttachment } from '@studio/events';
import { createEndRecall, createRecallRestore, endingRecall, settleRecallRestore, type RecallEnd, type RecallRestore, type RecallRestorePass } from './recallRestore.js';

const artifact = (artifactId: string, title = artifactId): ArtifactAttachment => ({ kind: 'artifact', artifactId, title });

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** The composer the pass would write to, and what the user sees of it. */
function composer() {
  const applied: { artifacts: ArtifactAttachment[]; missing: string[]; restoring: boolean[] } = { artifacts: [], missing: [], restoring: [] };
  return {
    applied,
    sink: {
      setArtifacts: (artifacts: ArtifactAttachment[]): void => { applied.artifacts = artifacts; },
      setMissing: (missing: string[]): void => { applied.missing = missing; },
      setRestoring: (isRestoring: boolean): void => { applied.restoring.push(isRestoring); },
    },
  };
}

/** Mirrors `useAttachments.replace`: the swap happens only while the pass is current. */
function imageReads(bytes: Deferred<void>, swapped: { did: boolean }, unreadable: string[] = []) {
  return async (isCurrent: () => boolean): Promise<string[]> => {
    await bytes.promise;
    if (!isCurrent()) return [];
    swapped.did = true;
    return unreadable;
  };
}

/** The panel that owns the walk, and the two composer flags the ending clears. */
function recordingPanel() {
  const ended: RecallEnd[] = [];
  const restoring: boolean[] = [];
  const recalling: boolean[] = [];
  return {
    ended,
    restoring,
    recalling,
    ref: { current: { end: (nextAction: RecallEnd): void => { ended.push(nextAction); } } as { end: (nextAction: RecallEnd) => void } | null },
    composer: {
      setRestoring: (isRestoring: boolean): void => { restoring.push(isRestoring); },
      setRecalling: (isRecalling: boolean): void => { recalling.push(isRecalling); },
    },
  };
}

function walking(restore: RecallRestore, read: Deferred<ArtifactAttachment[]>, bytes: Deferred<void>, requested: ArtifactAttachment[]) {
  const pass = restore.begin();
  const swapped = { did: false };
  const seen = composer();
  const settled = settleRecallRestore(
    restore,
    pass,
    {
      work: { images: imageReads(bytes, swapped), artifacts: () => read.promise },
      requested,
      missing: [],
      sink: seen.sink,
      unreadableLabel: 'its attachments',
    },
  );
  return { pass, swapped, seen, settled };
}

describe('a recall restoration pass (ONL-2509)', () => {
  it('holds the composer for one pass, and a new walk step retires the one before it', () => {
    const restore = createRecallRestore();
    const first = restore.begin();
    const second = restore.begin();

    expect(first.isCurrent).toBe(false);
    expect(second.isCurrent).toBe(true);
    expect(restore.settle(first)).toBe(false);
    expect(restore.settle(second)).toBe(true);
  });

  it('releases the composer exactly once, whether the pass settles or is cancelled', () => {
    const restore = createRecallRestore();
    const pass = restore.begin();

    expect(restore.settle(pass)).toBe(true);
    // The cancel that follows a settled pass has nothing to hand back.
    expect(restore.cancel()).toBe(false);
    expect(restore.settle(pass)).toBe(false);

    const next = restore.begin();
    expect(restore.cancel()).toBe(true);
    expect(restore.cancel()).toBe(false);
    expect(restore.settle(next)).toBe(false);
  });

  it('applies the read chips and the names it could not restore', async () => {
    const restore = createRecallRestore();
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const pass = restore.begin();
    const seen = composer();
    const swapped = { did: false };
    const settled = settleRecallRestore(
      restore,
      pass,
      {
        work: { images: imageReads(bytes, swapped, ['reference.png']), artifacts: () => read.promise },
        requested: [artifact('kept'), artifact('deleted', 'Deleted sketch')],
        missing: ['header button'],
        sink: seen.sink,
        unreadableLabel: 'its attachments',
      },
    );

    bytes.resolve();
    read.resolve([artifact('kept')]);
    await settled;

    expect(swapped.did).toBe(true);
    expect(seen.applied.artifacts.map((entry) => entry.artifactId)).toEqual(['kept']);
    expect(seen.applied.missing).toEqual(['header button', 'reference.png', 'Deleted sketch']);
    expect(seen.applied.restoring).toEqual([false]);
  });

  it('every payload control ends the walk before it acts, and passes its arguments through', () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const endRecall = createEndRecall(restore, panel.ref, panel.composer);
    const acted: string[] = [];
    const controls = endingRecall(endRecall, {
      removeFrame: (id: string): void => { acted.push(`frame:${id}`); },
      removeElement: (id: string): void => { acted.push(`element:${id}`); },
      removeAttachment: (id: string): void => { acted.push(`attachment:${id}`); },
      acceptFiles: (names: string[]): void => { acted.push(`files:${names.join()}`); },
      pickImages: (): void => { acted.push('pick'); },
    });
    const press: Record<keyof typeof controls, () => void> = {
      removeFrame: () => controls.removeFrame('chip'),
      removeElement: () => controls.removeElement('chip'),
      removeAttachment: () => controls.removeAttachment('chip'),
      acceptFiles: () => controls.acceptFiles(['shot.png']),
      pickImages: () => controls.pickImages(),
    };

    // Every control the record carries, so a new one cannot be added without this covering it.
    for (const name of Object.keys(controls) as (keyof typeof controls)[]) {
      restore.begin();
      panel.ended.length = 0;
      press[name]();
      // The ending comes first, or the control's own change is what the pass lands on top of.
      expect(panel.ended).toEqual(['edit']);
    }

    expect(acted).toEqual(['frame:chip', 'element:chip', 'attachment:chip', 'files:shot.png', 'pick']);
    expect(panel.restoring).toEqual([false, false, false, false, false]);
  });

  it('an ending clears the walk flag itself, so a panel with no walk left cannot strand the composer', () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    panel.ref.current = null;

    createEndRecall(restore, panel.ref, panel.composer)('abandon');

    expect(panel.recalling).toEqual([false]);
  });

  it('ending a walk as an edit retires its pass, so a read still in the air applies nothing', async () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const endRecall = createEndRecall(restore, panel.ref, panel.composer);
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, [artifact('provisional')]);

    endRecall('edit');
    bytes.resolve();
    read.resolve([artifact('provisional')]);
    await walk.settled;

    expect(panel.ended).toEqual(['edit']);
    expect(panel.restoring).toEqual([false]);
    // The removed chip stays removed and the composer's own images are never swapped out.
    expect(walk.seen.applied.artifacts).toEqual([]);
    expect(walk.seen.applied.missing).toEqual([]);
    expect(walk.seen.applied.restoring).toEqual([]);
    expect(walk.swapped.did).toBe(false);
  });

  it('every keystroke tells the walk it is an edit, and only the one that caught a pass hands the composer back', async () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const endRecall = createEndRecall(restore, panel.ref, panel.composer);
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, []);

    endRecall('edit');
    endRecall('edit');
    bytes.resolve();
    read.resolve([]);
    await walk.settled;

    expect(panel.ended).toEqual(['edit', 'edit']);
    expect(panel.restoring).toEqual([false]);
  });

  it('ending a walk as abandoned retires its pass, so the chat the user left never writes the next draft', async () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const endRecall = createEndRecall(restore, panel.ref, panel.composer);
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, [artifact('left-behind')]);

    endRecall('abandon');
    bytes.resolve();
    read.resolve([artifact('left-behind')]);
    await walk.settled;

    expect(panel.ended).toEqual(['abandon']);
    expect(walk.seen.applied.artifacts).toEqual([]);
    expect(walk.swapped.did).toBe(false);
    expect(walk.seen.applied.restoring).toEqual([]);
  });

  it('an ending with no panel left to tell still retires the pass and clears the composer flags', async () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const endRecall = createEndRecall(restore, panel.ref, panel.composer);
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, [artifact('other-project')]);

    panel.ref.current = null;
    endRecall('abandon');
    bytes.resolve();
    read.resolve([artifact('other-project')]);
    await walk.settled;

    expect(panel.ended).toEqual([]);
    expect(panel.restoring).toEqual([false]);
    expect(walk.seen.applied.artifacts).toEqual([]);
    expect(walk.swapped.did).toBe(false);
  });

  it('a bare cancel retires the pass without telling a walk, as the unmount cleanup once did', async () => {
    const restore = createRecallRestore();
    const panel = recordingPanel();
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, [artifact('unmounted')]);

    // The cleanup effect's one move: no walk to end, only the pass to retire.
    restore.cancel();
    bytes.resolve();
    read.resolve([artifact('unmounted')]);
    await walk.settled;

    expect(panel.ended).toEqual([]);
    expect(walk.seen.applied.artifacts).toEqual([]);
    expect(walk.swapped.did).toBe(false);
    expect(walk.seen.applied.restoring).toEqual([]);
  });

  it('a failed read on a cancelled pass says nothing is missing, because nothing was restored', async () => {
    const restore = createRecallRestore();
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, []);

    restore.cancel();
    bytes.resolve();
    read.reject(new Error('refused'));
    await walk.settled;

    expect(walk.seen.applied.missing).toEqual([]);
    expect(walk.seen.applied.restoring).toEqual([]);
  });

  it('a failed read on a live pass hands the composer back and names the loss, keeping what was already known missing', async () => {
    const restore = createRecallRestore();
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const pass = restore.begin();
    const seen = composer();
    const settled = settleRecallRestore(
      restore,
      pass,
      {
        work: { images: imageReads(bytes, { did: false }), artifacts: () => read.promise },
        requested: [],
        missing: ['header button'],
        sink: seen.sink,
        unreadableLabel: 'its attachments',
      },
    );

    bytes.resolve();
    read.reject(new Error('refused'));
    await settled;

    expect(seen.applied.missing).toEqual(['header button', 'its attachments']);
    expect(seen.applied.restoring).toEqual([false]);
  });

  it('the pass a later walk step replaced never writes the step that replaced it', async () => {
    const restore = createRecallRestore();
    const first = { read: deferred<ArtifactAttachment[]>(), bytes: deferred<void>() };
    const older = walking(restore, first.read, first.bytes, [artifact('older')]);
    const second = { read: deferred<ArtifactAttachment[]>(), bytes: deferred<void>() };
    const newer = walking(restore, second.read, second.bytes, [artifact('newer')]);

    second.bytes.resolve();
    second.read.resolve([artifact('newer')]);
    await newer.settled;
    first.bytes.resolve();
    first.read.resolve([artifact('older')]);
    await older.settled;

    expect(newer.seen.applied.artifacts.map((entry) => entry.artifactId)).toEqual(['newer']);
    expect(older.seen.applied.artifacts).toEqual([]);
    expect(older.swapped.did).toBe(false);
  });

  it('a pass cancelled before its reads resolve leaves the lock released, so the next walk can take it', async () => {
    const restore = createRecallRestore();
    const read = deferred<ArtifactAttachment[]>();
    const bytes = deferred<void>();
    const walk = walking(restore, read, bytes, []);
    restore.cancel();

    const next: RecallRestorePass = restore.begin();
    bytes.resolve();
    read.resolve([]);
    await walk.settled;

    expect(next.isCurrent).toBe(true);
    expect(restore.settle(next)).toBe(true);
  });
});
