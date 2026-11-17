import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { BrowserNode, CanvasDoc, CanvasNode, ImageNode, TextNode } from '@studio/events';
import { CANVAS_TEXT_WRAP_WIDTH } from '@studio/events';
import type { NativeImage } from 'electron';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../../log/index.js';
import type { GuestImageResult } from '../cdp.js';
import { emptyCanvasDoc } from '../document.js';
import { captureFrameForThumbnail } from '../gate.js';
import type { FrameMirrorReader } from '../mirror.js';
import { THUMBNAIL_SIZE, thumbnailFitAll } from './bounds.js';
import { THUMBNAIL_MAX_BYTES, type ThumbBitmap, type ThumbImageOps } from './compose.js';
import {
  THUMBNAIL_COOLDOWN_MS,
  THUMBNAIL_FAILURE_ATTEMPTS,
  THUMBNAIL_FRAME_CAP,
  THUMBNAIL_RUN_BUDGET_MS,
  createThumbnailService,
  drawableNodes,
  type ThumbnailCaptureInput,
  type ThumbnailOutcome,
  type ThumbnailService,
  type ThumbnailServiceDeps,
  type ThumbnailWriteNotice,
  projectThumbnailUrl,
  thumbnailCaptureEvent,
  thumbnailDurationBucket,
} from './index.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from '../registry.js';
import { primeThumbnailIndex } from './store.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

interface FakeClock {
  now(): number;
  setTimer(fire: () => void, ms: number): () => void;
  advance(ms: number): Promise<void>;
  jump(ms: number): void;
  armed(): number;
}

function fakeClock(): FakeClock {
  let current = 0;
  let sequence = 0;
  const timers = new Map<number, { at: number; fire: () => void }>();
  return {
    now: () => current,
    setTimer(fire, ms) {
      sequence += 1;
      const id = sequence;
      timers.set(id, { at: current + ms, fire });
      return () => {
        timers.delete(id);
      };
    },
    jump(ms) {
      current += ms;
    },
    armed: () => timers.size,
    async advance(ms) {
      const target = current + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (due === undefined) break;
        timers.delete(due[0]);
        current = due[1].at;
        due[1].fire();
        await flush();
      }
      current = target;
      await flush();
    },
  };
}

const frameNode = (id: string, over: Partial<BrowserNode> = {}): CanvasNode => ({
  id,
  pageId: 'pg_main',
  kind: 'browser',
  name: id,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  order: 0,
  content: { homeUrl: 'http://localhost:3000' },
  ...over,
});

const labelNode = (id: string, over: Partial<TextNode> = {}): CanvasNode => ({
  id,
  pageId: 'pg_main',
  kind: 'text',
  name: id,
  x: 0,
  y: 0,
  width: CANVAS_TEXT_WRAP_WIDTH,
  height: 38,
  order: 0,
  content: { text: 'second pass on the cart', size: 'medium' },
  ...over,
});

const pictureNode = (id: string, imageId: string, over: Partial<ImageNode> = {}): CanvasNode => ({
  id,
  pageId: 'pg_main',
  kind: 'image',
  name: id,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  order: 0,
  content: { imageId, name: id, originalWidth: 800, originalHeight: 600 },
  ...over,
});

const docOf = (docId: string, ...nodes: CanvasNode[]): CanvasDoc => ({
  ...emptyCanvasDoc(docId),
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
});

const threeFrames = (docId: string): CanvasDoc =>
  docOf(
    docId,
    frameNode('a', { x: 0, y: 0, order: 0 }),
    frameNode('b', { x: 500, y: 0, order: 1 }),
    frameNode('c', { x: 1000, y: 0, order: 2 }),
  );

/** The marker rides the blue channel, so a composite pixel says which source painted it. */
const markerBitmap = (width: number, height: number, marker: number): ThumbBitmap => {
  const bgra = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    bgra[pixel * 4] = marker;
    bgra[pixel * 4 + 3] = 255;
  }
  return { width, height, bgra };
};

const blueAt = (bitmap: ThumbBitmap, x: number, y: number): number =>
  bitmap.bgra[(y * bitmap.width + x) * 4] ?? -1;

const alphaAt = (bitmap: ThumbBitmap, x: number, y: number): number =>
  bitmap.bgra[(y * bitmap.width + x) * 4 + 3] ?? -1;

interface Rig {
  service: ThumbnailService;
  clock: FakeClock;
  trace: string[];
  captures: ThumbnailCaptureInput[];
  writes: { docId: string; bytes: number }[];
  notices: ThumbnailWriteNotice[];
  composites: ThumbBitmap[];
  maxOutstanding: number;
  setDoc(docId: string, doc: CanvasDoc | null): void;
}

function rig(
  options: {
    docs?: Record<string, CanvasDoc | null>;
    artifactPreview?: (input: { artifactId: string; pagePath: string | undefined }, wanted: () => boolean) => Promise<number | null>;
    renderText?: ThumbnailServiceDeps<number>['renderText'];
    /** Blob id to the marker byte its bytes carry; an id absent here is a blob the store has lost. */
    images?: Record<string, number>;
    capture?: (input: ThumbnailCaptureInput, index: number) => Promise<{ ok: true; image: number } | { ok: false; reason: string }>;
    ops?: Partial<ThumbImageOps<number>>;
    write?: (docId: string, png: Buffer) => { ok: true; mtimeMs: number } | { ok: false; reason: 'too-large' };
    snapshot?: (worktreePath: string) => Promise<{ doc: CanvasDoc | null; currentPageId?: string }>;
  } = {},
): Rig {
  const docs = new Map<string, CanvasDoc | null>(Object.entries(options.docs ?? {}));
  const clock = fakeClock();
  const trace: string[] = [];
  const captures: ThumbnailCaptureInput[] = [];
  const writes: { docId: string; bytes: number }[] = [];
  const notices: ThumbnailWriteNotice[] = [];
  const composites: ThumbBitmap[] = [];
  const images = options.images ?? {};
  let outstanding = 0;
  let mtime = 0;

  const state = {
    maxOutstanding: 0,
  };

  const service = createThumbnailService<number>({
    now: clock.now,
    setTimer: clock.setTimer,
    worktreeFor: (docId) => (docs.has(docId) ? `/w/${docId}` : undefined),
    snapshot:
      options.snapshot ??
      (async (worktreePath) => ({ doc: docs.get(worktreePath.slice('/w/'.length)) ?? null })),
    artifactPreview: options.artifactPreview,
    async captureFrame(input) {
      const index = captures.length;
      captures.push(input);
      outstanding += 1;
      state.maxOutstanding = Math.max(state.maxOutstanding, outstanding);
      trace.push(`capture:${input.frameId}`);
      try {
        return options.capture
          ? await options.capture(input, index)
          : { ok: true as const, image: index + 1 };
      } finally {
        outstanding -= 1;
      }
    },
    readImage: (imageId) => {
      const marker = images[imageId];
      return marker === undefined ? null : { bytes: Uint8Array.of(marker) };
    },
    renderText: options.renderText,
    ops: {
      withBitmap:
        options.ops?.withBitmap ??
        ((source, width, height, read) => {
          trace.push(`draw:${String(source)}`);
          read(markerBitmap(width, height, source));
          return true;
        }),
      decode: options.ops?.decode ?? ((bytes) => bytes[0] ?? null),
      toPng: (bitmap) => {
        composites.push({ width: bitmap.width, height: bitmap.height, bgra: Buffer.from(bitmap.bgra) });
        return options.ops?.toPng?.(bitmap) ?? PNG;
      },
    },
    write:
      options.write ??
      ((docId, png) => {
        writes.push({ docId, bytes: png.byteLength });
        mtime += 1;
        return { ok: true as const, mtimeMs: mtime };
      }),
    notifyWritten: (notice) => notices.push(notice),
  });

  return {
    service,
    clock,
    trace,
    captures,
    writes,
    notices,
    composites,
    get maxOutstanding() {
      return state.maxOutstanding;
    },
    setDoc: (docId, doc) => {
      docs.set(docId, doc);
    },
  };
}

it('draws each artifact from its page preview instead of a gray placeholder', async () => {
  const nodes: CanvasNode[] = Array.from({ length: 6 }, (_, index) => ({
    id: `artifact-${index}`, pageId: 'pg_main', kind: 'artifact', name: 'Card',
    x: index * 450, y: 0, width: 400, height: 300, order: index,
    content: { artifactId: `art_${index}`, pagePath: `pages/${index}.html`, title: 'Card' },
  }));
  const doc = docOf('artifacts', ...nodes);
  const requested: string[] = [];
  const test = rig({ docs: { artifacts: doc }, artifactPreview: async (input) => {
    requested.push(`${input.artifactId}:${input.pagePath}`);
    return Number(input.artifactId.slice(4)) + 40;
  } });
  test.service.markDirty('artifacts');
  expect((await test.service.captureIfDirtyNow('artifacts')).status).toBe('captured');
  expect(requested).toHaveLength(6);
  const fit = thumbnailFitAll(doc, undefined);
  if (!fit.ok) throw new Error('invalid fixture');
  for (const placement of fit.placements) {
    expect(blueAt(test.composites[0]!, placement.rect.x, placement.rect.y)).toBe(Number(placement.id.slice(9)) + 40);
  }
  expect(test.captures).toHaveLength(0);
});

it('keeps rendered artifacts, frames, text and images when another artifact stalls or fails', async () => {
  const artifact = (id: string, order: number): CanvasNode => ({
    id, pageId: 'pg_main', kind: 'artifact', name: id,
    x: order * 450, y: 0, width: 400, height: 300, order,
    content: { artifactId: id, pagePath: 'pages/index.html', title: id },
  });
  const doc = docOf('mixed', artifact('ready', 0), artifact('slow', 1), artifact('failed', 2),
    artifact('missing', 3), frameNode('frame', { x: 1800, order: 4 }),
    labelNode('text', { x: 2250, order: 5 }), pictureNode('image', 'blob', { x: 2700, order: 6 }));
  let wantedAfterDeadline: (() => boolean) | undefined;
  let release: ((image: number) => void) | undefined;
  const test = rig({ docs: { mixed: doc }, images: { blob: 70 }, artifactPreview: async (input, wanted) => {
    if (input.artifactId === 'ready') return 40;
    if (input.artifactId === 'failed') throw new Error('unavailable');
    if (input.artifactId === 'missing') return null;
    wantedAfterDeadline = wanted;
    return new Promise<number>((resolve) => { release = resolve; });
  } });
  test.service.markDirty('mixed');
  const run = test.service.captureIfDirtyNow('mixed');
  await flush();
  await test.clock.advance(THUMBNAIL_RUN_BUDGET_MS / 2);
  expect((await run).status).toBe('captured');
  expect(wantedAfterDeadline?.()).toBe(false);
  expect(test.captures[0]?.deadlineMs).toBe(THUMBNAIL_RUN_BUDGET_MS / 2);
  const fit = thumbnailFitAll(doc, undefined);
  if (!fit.ok) throw new Error('invalid fixture');
  const expected: Record<string, number> = { ready: 40, slow: 148, failed: 148, missing: 148, frame: 1, text: 148, image: 70 };
  for (const placement of fit.placements) {
    expect(blueAt(test.composites[0]!, placement.rect.x, placement.rect.y)).toBe(expected[placement.id]!);
  }
  release?.(90);
  await flush();
  expect(test.writes).toHaveLength(1);
  expect(test.clock.armed()).toBe(0);
});

describe('the capture gate — what makes a run happen at all', () => {
  it('drops a trigger for a document with no open canvas, writing nothing', async () => {
    const it = rig({ docs: { 'doc-1': null } });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.captures).toHaveLength(0);
    expect(it.writes).toHaveLength(0);
  });

  it('drops a trigger for a document the registry does not know', async () => {
    const it = rig();

    it.service.markDirty('ghost');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.captures).toHaveLength(0);
    expect(it.writes).toHaveLength(0);
  });

  it('reports no frames for a canvas that never had one', async () => {
    const it = rig({ docs: { 'doc-1': docOf('doc-1') } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome.status).toBe('skipped');
    expect(outcome.status === 'skipped' && outcome.reason).toBe('no_frames');
    expect(it.captures).toHaveLength(0);
    expect(it.writes).toHaveLength(0);
  });

  it('leaves the existing file alone when the last frame is deleted, rather than blanking the card', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    expect(it.writes).toHaveLength(1);
    const written = it.writes[0];

    // N to 0: the acceptance criterion is that an empty canvas produces no image and deletes nothing.
    it.setDoc('doc-1', docOf('doc-1'));
    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome.status === 'skipped' && outcome.reason).toBe('no_frames');
    expect(it.writes).toEqual([written]);
  });

  it('writes one file for a three-frame document whose every capture succeeds', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', trigger: 'leave', frames: 3, capped: false });
    expect(it.captures.map((input) => input.frameId)).toEqual(['a', 'b', 'c']);
    expect(it.writes).toEqual([{ docId: 'doc-1', bytes: PNG.byteLength }]);
  });

  it('abandons the whole run on the second frame’s failure, having asked for two captures', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (input) =>
        input.frameId === 'b'
          ? { ok: false as const, reason: 'frame b went away' }
          : { ok: true as const, image: 1 },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'capture_failed' });
    expect(it.captures).toHaveLength(2);
    expect(it.writes).toHaveLength(0);
  });

  it('fails the capture rather than throwing when a guest is destroyed mid-run', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (input) => {
        if (input.frameId === 'b') throw new Error('Object has been destroyed');
        return { ok: true as const, image: 1 };
      },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'capture_failed' });
    expect(it.writes).toHaveLength(0);
  });

  it('photographs a frame sitting on a remote page and completes the run', async () => {
    const mirror: FrameMirrorReader = {
      read: () => [],
      peek: (_docId, id) => ({
        id,
        currentUrl: 'https://accounts.google.com/signin',
        health: 'live' as const,
        title: '',
        webContentsId: 7,
      }),
    };
    const written: Buffer[] = [];
    const service = createThumbnailService<NativeImage>({
      now: () => 0,
      worktreeFor: () => '/w/doc-1',
      snapshot: async () => ({ doc: threeFrames('doc-1') }),
      captureFrame: (input) =>
        captureFrameForThumbnail({
          mirror,
          docId: input.docId,
          frameId: input.frameId,
          deadlineMs: input.deadlineMs,
          run: async () => ({ ok: true, image: {} }) as unknown as GuestImageResult,
        }),
      ops: {
        withBitmap: (_source, width, height, read) => {
          read({ width, height, bgra: Buffer.alloc(width * height * 4) });
          return true;
        },
        decode: () => null,
        toPng: () => PNG,
      },
      write: (_docId, png) => {
        written.push(png);
        return { ok: true, mtimeMs: 1 };
      },
    });

    service.markDirty('doc-1');
    const outcome = await service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 3 });
    expect(written).toHaveLength(1);
  });
});

describe('the cooldown — trailing, never leading', () => {
  it('captures one dirty mark at thirty seconds, not at the mark', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS - 1);
    expect(it.writes).toHaveLength(0);

    await it.clock.advance(1);
    expect(it.writes).toHaveLength(1);
  });

  it('collapses ten marks across twenty-five seconds into one capture that reads the canvas as it stands then', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    for (let mark = 0; mark < 10; mark += 1) {
      it.service.markDirty('doc-1');
      await it.clock.advance(2_500);
      if (mark === 8) it.setDoc('doc-1', docOf('doc-1', frameNode('late', { x: 0, y: 0, order: 0 })));
    }
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS - 25_000);

    expect(it.writes).toHaveLength(1);
    expect(it.captures.map((input) => input.frameId)).toEqual(['late']);
  });

  it('captures every thirty seconds under five minutes of continuous change, never starving', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    for (let second = 0; second < 300; second += 1) {
      it.service.markDirty('doc-1');
      await it.clock.advance(1_000);
    }

    expect(it.writes).toHaveLength(10);
  });

  it('skips a window that fires with the counter unmoved since the last capture', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });
    const outcomes: ThumbnailOutcome[] = [];
    it.service.onOutcome?.((outcome) => outcomes.push(outcome));

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    expect(it.writes).toHaveLength(1);

    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.writes).toHaveLength(1);
    expect(it.captures).toHaveLength(3);
    expect(it.clock.armed()).toBe(0);
  });

  it('drops a pending window whose canvas closed before it fired', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    it.setDoc('doc-1', null);
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.captures).toHaveLength(0);
    expect(it.writes).toHaveLength(0);
  });
});

describe('the leave moment — immediate, and not bound by the cooldown', () => {
  it('captures a dirty document immediately and cancels the pending window', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    it.service.markDirty('doc-1');
    await it.clock.advance(40_000 - THUMBNAIL_COOLDOWN_MS);
    expect(it.writes).toHaveLength(1);

    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', trigger: 'leave' });
    expect(it.writes).toHaveLength(2);
    expect(it.clock.armed()).toBe(0);
  });

  it('captures five seconds after the last capture too — the elapsed time is not consulted', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    expect(it.writes).toHaveLength(1);

    it.service.markDirty('doc-1');
    await it.clock.advance(5_000);
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', trigger: 'leave' });
    expect(it.writes).toHaveLength(2);
  });

  it('runs nothing for a document whose counter has not moved, whatever the elapsed time', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    const cold = await it.service.captureIfDirtyNow('doc-1');
    expect(cold).toMatchObject({ status: 'skipped', trigger: 'leave', reason: 'not_dirty' });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    it.clock.jump(600_000);
    const settled = await it.service.captureIfDirtyNow('doc-1');

    expect(settled).toMatchObject({ status: 'skipped', reason: 'not_dirty' });
    expect(it.writes).toHaveLength(1);
  });

  it('leaves no window behind: the cancelled one never fires later', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.clock.advance(5_000);
    await it.service.captureIfDirtyNow('doc-1');
    expect(it.writes).toHaveLength(1);

    await it.clock.advance(120_000);

    expect(it.writes).toHaveLength(1);
  });
});

describe('coalescing — one run in flight, one rerun for what lands during it', () => {
  it('captures on the next window when a mark lands mid-run', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    const running = it.service.captureIfDirtyNow('doc-1');
    await flush();
    it.service.markDirty('doc-1');
    release();
    await running;
    expect(it.writes).toHaveLength(1);

    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.writes).toHaveLength(2);
  });

  it('turns two marks arriving during a run into exactly one further run', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    const running = it.service.captureIfDirtyNow('doc-1');
    await flush();
    it.service.markDirty('doc-1');
    it.service.markDirty('doc-1');
    release();
    await running;

    await it.clock.advance(300_000);

    expect(it.writes).toHaveLength(2);
  });

  it('keeps counters and windows per document: a busy project never delays a quiet one', async () => {
    const it = rig({
      docs: { 'busy': threeFrames('busy'), 'quiet': threeFrames('quiet') },
    });

    it.service.markDirty('quiet');
    for (let tick = 0; tick < 6; tick += 1) {
      it.service.markDirty('busy');
      await it.clock.advance(5_000);
    }

    expect(it.writes.filter((write) => write.docId === 'quiet')).toHaveLength(1);
    expect(it.writes.filter((write) => write.docId === 'busy')).toHaveLength(1);
  });

  it('runs two documents without serialising them against each other', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'stuck': threeFrames('stuck'), 'free': threeFrames('free') },
      capture: async (input, index) => {
        if (input.docId === 'stuck') await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('stuck');
    const stuck = it.service.captureIfDirtyNow('stuck');
    await flush();
    it.service.markDirty('free');
    const free = await it.service.captureIfDirtyNow('free');

    expect(free).toMatchObject({ status: 'captured' });
    expect(it.writes.map((write) => write.docId)).toEqual(['free']);

    release();
    await stuck;
    expect(it.writes.map((write) => write.docId)).toEqual(['free', 'stuck']);
  });
});

describe('a leave that arrives while a run is already going', () => {
  it('captures the newer change as soon as that run settles, without waiting out a window', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    const cooldownRun = it.service.captureIfDirtyNow('doc-1');
    await flush();
    // The change the leave must not lose, and the leave that joins the run in flight.
    it.service.markDirty('doc-1');
    const joined = it.service.captureIfDirtyNow('doc-1');
    release();
    await cooldownRun;
    await joined;
    await flush();
    await flush();

    expect(it.writes).toHaveLength(2);
    expect(it.notices.map((notice) => notice.trigger)).toEqual(['leave', 'leave']);
    // No window was left armed to do it later.
    expect(it.clock.armed()).toBe(0);
  });

  it('reports the write as a leave when the run in flight was started by the timer', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    const joined = it.service.captureIfDirtyNow('doc-1');
    release();
    await joined;
    await flush();
    await flush();

    // One write, and the leave is what it answers: a 'cooldown' notice would never reach the grid.
    expect(it.writes).toHaveLength(1);
    expect(it.notices.map((notice) => notice.trigger)).toEqual(['leave']);
    expect(it.clock.armed()).toBe(0);
  });

  it('leaves no follow-up when nothing changed during the run', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    const first = it.service.captureIfDirtyNow('doc-1');
    await flush();
    const joined = it.service.captureIfDirtyNow('doc-1');
    release();
    await first;
    await joined;
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS * 2);

    expect(it.writes).toHaveLength(1);
  });
});

describe('what the service records when a run throws outright', () => {
  it('reports run_failed and stays retryable for the next change', async () => {
    let throwing = true;
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      snapshot: async () => {
        if (throwing) throw new Error('/Users/someone/checkout blew up');
        return { doc: threeFrames('doc-1') };
      },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');
    expect(outcome).toMatchObject({ status: 'failed', reason: 'run_failed' });
    expect(JSON.stringify(outcome)).not.toContain('/Users/someone');

    // No second markDirty: a throw leaves the document dirty, so the next window retries it.
    throwing = false;
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.writes).toHaveLength(1);
  });

  it('records the counter it started with, so a change landing mid-throw is not swallowed', async () => {
    let calls = 0;
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      snapshot: async () => {
        calls += 1;
        if (calls === 1) {
          // Lands while the failing run is still in flight.
          it.service.markDirty('doc-1');
          throw new Error('boom');
        }
        return { doc: threeFrames('doc-1') };
      },
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    expect(it.writes).toHaveLength(0);

    // The mid-run mark survived the throw, so the next window captures without a new edit.
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    expect(it.writes).toHaveLength(1);
  });
});

describe('every outcome reaches each registered listener once', () => {
  it('accumulates listeners, which is why the singleton registers its own exactly once', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });
    const first: string[] = [];
    const second: string[] = [];
    it.service.onOutcome((outcome) => first.push(outcome.status));
    it.service.onOutcome((outcome) => second.push(outcome.status));

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    expect(first).toEqual(['captured']);
    expect(second).toEqual(['captured']);
  });
});

describe('the frame cap and the draw order', () => {
  it('draws the twenty-four largest destinations in document order and reports the cap', async () => {
    const nodes = Array.from({ length: 30 }, (_, index) =>
      frameNode(`f${String(index).padStart(2, '0')}`, {
        x: (index % 6) * 1_500,
        y: Math.floor(index / 6) * 1_500,
        width: 100 + index * 40,
        height: 100 + index * 40,
        order: 29 - index,
      }),
    );
    const doc = docOf('doc-1', ...nodes);
    const it = rig({ docs: { 'doc-1': doc } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: THUMBNAIL_FRAME_CAP, capped: true });
    const asked = it.captures.map((input) => input.frameId);
    expect(asked).toHaveLength(THUMBNAIL_FRAME_CAP);
    for (const smallest of ['f00', 'f01', 'f02', 'f03', 'f04', 'f05']) {
      expect(asked).not.toContain(smallest);
    }
    const orders = asked.map((id) => (doc.nodes[id] as CanvasNode).order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    const fit = thumbnailFitAll(doc, undefined);
    const chosen = fit.ok ? fit.placements.slice(0, THUMBNAIL_FRAME_CAP) : [];
    expect(new Set(asked)).toEqual(new Set(chosen.map((placement) => placement.id)));
  });

  it('hands the compositor one frame at a time, never two outstanding at once', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        await flush();
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    expect(it.maxOutstanding).toBe(1);
    expect(it.trace).toEqual([
      'capture:a',
      'draw:1',
      'capture:b',
      'draw:2',
      'capture:c',
      'draw:3',
    ]);
  });
});

describe('the page the card draws', () => {
  const twoPages = (): CanvasDoc => ({
    ...docOf(
      'doc-1',
      frameNode('here', { x: 0, y: 0, order: 0 }),
      frameNode('elsewhere', { pageId: 'pg_other', x: 5_000, y: 0, order: 1 }),
    ),
    pages: {
      pg_main: { id: 'pg_main', name: 'Checkout', order: 0 },
      pg_other: { id: 'pg_other', name: 'Settings', order: 1 },
    },
  });

  it('photographs the current page alone, and a frame on another page never abandons the card', async () => {
    const it = rig({
      // A frame off the current page has no mounted guest; asking for one costs the whole card.
      capture: async (input, index) =>
        input.frameId === 'elsewhere'
          ? { ok: false as const, reason: 'no mounted guest' }
          : { ok: true as const, image: index + 1 },
      docs: { 'doc-1': twoPages() },
      snapshot: async () => ({ doc: twoPages(), currentPageId: 'pg_main' }),
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 1 });
    expect(it.captures.map((input) => input.frameId)).toEqual(['here']);
    expect(it.writes).toHaveLength(1);
  });

  it('draws the other page once the user is on it', async () => {
    const it = rig({
      docs: { 'doc-1': twoPages() },
      snapshot: async () => ({ doc: twoPages(), currentPageId: 'pg_other' }),
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 1 });
    expect(it.captures.map((input) => input.frameId)).toEqual(['elsewhere']);
  });
});

describe('the kinds a canvas holds besides frames', () => {
  it('does not open the text renderer for previews without Canvas text', async () => {
    let renders = 0;
    const it = rig({
      docs: { 'doc-1': docOf('doc-1', frameNode('frame')) },
      renderText: async () => { renders += 1; return new Map(); },
    });
    it.service.markDirty('doc-1');
    expect(await it.service.captureIfDirtyNow('doc-1')).toMatchObject({ status: 'captured' });
    expect(renders).toBe(0);
  });

  it('renders the words of a text-only canvas only during an actual capture', async () => {
    const calls: unknown[] = [];
    const it = rig({
      docs: { 'doc-1': docOf('doc-1', labelNode('label')) },
      renderText: async (placements, timeoutMs) => {
        calls.push({ placements, timeoutMs });
        return new Map([['label', 77]]);
      },
    });
    it.service.markDirty('doc-1');
    expect(calls).toHaveLength(0);
    expect(await it.service.captureIfDirtyNow('doc-1')).toMatchObject({ status: 'captured' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ placements: [{ id: 'label', text: 'second pass on the cart', size: 'medium' }], timeoutMs: 2000 });
    expect(it.trace).toContain('draw:77');
    await it.service.captureIfDirtyNow('doc-1');
    expect(calls).toHaveLength(1);
  });

  it.each(['reject', 'timeout', 'empty'] as const)('keeps the grey text fallback when rendering returns %s', async (mode) => {
    const it = rig({
      docs: { 'doc-1': docOf('doc-1', labelNode('label')) },
      renderText: async () => {
        if (mode === 'reject') throw new Error('renderer lost');
        if (mode === 'timeout') return new Promise(() => undefined);
        return new Map();
      },
    });
    it.service.markDirty('doc-1');
    const captured = it.service.captureIfDirtyNow('doc-1');
    await flush();
    if (mode === 'timeout') it.clock.advance(2000);
    expect(await captured).toMatchObject({ status: 'captured' });
    const fit = thumbnailFitAll(docOf('doc-1', labelNode('label')), undefined);
    if (!fit.ok) throw new Error(fit.reason);
    const rect = fit.placements[0]!.rect;
    expect(blueAt(it.composites[0]!, rect.x + 1, rect.y + 1)).toBe(148);
  });
  const mixed = (docId: string): CanvasDoc =>
    docOf(
      docId,
      frameNode('fr', { x: 0, y: 0, order: 0 }),
      labelNode('label', { x: 600, y: 0, order: 1 }),
      pictureNode('shot', 'blob-1', { x: 1_200, y: 0, order: 2 }),
    );

  it('draws a label and a reference image without asking the frame mirror for either', async () => {
    const it = rig({ docs: { 'doc-1': mixed('doc-1') }, images: { 'blob-1': 31 } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 3 });
    expect(it.captures.map((input) => input.frameId)).toEqual(['fr']);
    expect(it.writes).toHaveLength(1);
  });

  it('paints a reference image over a frame it sits above, whatever order the placements arrive in', async () => {
    const doc = docOf(
      'doc-1',
      frameNode('fr', { x: 0, y: 0, width: 200, height: 200, order: 0 }),
      pictureNode('shot', 'blob-1', { x: 0, y: 0, width: 4_000, height: 3_000, order: 1 }),
    );
    const it = rig({ docs: { 'doc-1': doc }, images: { 'blob-1': 31 } });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    const fit = thumbnailFitAll(doc, undefined);
    if (!fit.ok) throw new Error(fit.reason);
    // Largest destination first is what the fit answers, so the frame is second in placement order and first in stack order.
    expect(fit.placements.map((placement) => placement.id)).toEqual(['shot', 'fr']);
    const composite = it.composites[0] as ThumbBitmap;
    const overlap = fit.placements.find((placement) => placement.id === 'fr')?.rect;
    if (!overlap) throw new Error('the frame has a destination');
    expect(blueAt(composite, overlap.x + 1, overlap.y + 1)).toBe(31);
  });

  it('paints a label over the frame beneath it, leaving no transparent pixel in its box', async () => {
    const doc = docOf(
      'doc-1',
      frameNode('fr', { x: 0, y: 0, width: 2_000, height: 1_500, order: 0 }),
      labelNode('label', { x: 200, y: 200, order: 1 }),
    );
    const it = rig({ docs: { 'doc-1': doc } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 2 });
    expect(it.captures.map((input) => input.frameId)).toEqual(['fr']);
    const fit = thumbnailFitAll(doc, undefined);
    if (!fit.ok) throw new Error(fit.reason);
    const box = fit.placements.find((placement) => placement.id === 'label')?.rect;
    if (!box) throw new Error('the label has a destination');
    const composite = it.composites[0] as ThumbBitmap;
    for (const [x, y] of [
      [box.x, box.y],
      [box.x + box.width - 1, box.y + box.height - 1],
      [box.x + Math.floor(box.width / 2), box.y + Math.floor(box.height / 2)],
    ] as const) {
      expect(alphaAt(composite, x, y)).toBe(255);
      expect(blueAt(composite, x, y)).not.toBe(1);
    }
  });

  it('writes the card when a reference image’s bytes are gone from the store', async () => {
    const it = rig({ docs: { 'doc-1': mixed('doc-1') } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 2 });
    expect(it.captures.map((input) => input.frameId)).toEqual(['fr']);
    expect(it.writes).toHaveLength(1);
  });

  it('skips a reference image its bytes will not decode, keeping the rest of the canvas', async () => {
    const it = rig({
      docs: { 'doc-1': mixed('doc-1') },
      images: { 'blob-1': 31 },
      ops: { decode: () => null },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 2 });
    expect(it.writes).toHaveLength(1);
  });

  it('reports no frames for a canvas of one reference image whose bytes are gone', async () => {
    const it = rig({ docs: { 'doc-1': docOf('doc-1', pictureNode('shot', 'blob-1')) } });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'no_frames' });
    expect(it.writes).toHaveLength(0);
  });

  it('encodes one composite of the one output size however many reference images the canvas holds', async () => {
    const images = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [`blob-${String(index)}`, 10 + index]),
    );
    const doc = docOf(
      'doc-1',
      ...Array.from({ length: 6 }, (_, index) =>
        pictureNode(`p${String(index)}`, `blob-${String(index)}`, {
          x: (index % 3) * 500,
          y: Math.floor(index / 3) * 400,
          order: index,
        }),
      ),
    );
    const it = rig({ docs: { 'doc-1': doc }, images });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'captured', frames: 6 });
    expect(it.captures).toHaveLength(0);
    expect(it.composites).toHaveLength(1);
    expect({ width: it.composites[0]?.width, height: it.composites[0]?.height }).toEqual({
      width: THUMBNAIL_SIZE.width,
      height: THUMBNAIL_SIZE.height,
    });
    expect(it.writes[0]?.bytes).toBeLessThanOrEqual(THUMBNAIL_MAX_BYTES);
  });
});

describe('the budget and the enumerated refusals', () => {
  it('returns budget_exceeded and writes nothing when the captures outrun the run deadline', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        it.clock.jump(THUMBNAIL_RUN_BUDGET_MS);
        return { ok: true as const, image: index + 1 };
      },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'budget_exceeded' });
    expect(it.captures).toHaveLength(1);
    expect(it.writes).toHaveLength(0);
  });

  it('shortens each frame’s deadline to what the run has left', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    for (const input of it.captures) {
      expect(input.deadlineMs).toBeGreaterThan(0);
      expect(input.deadlineMs).toBeLessThanOrEqual(THUMBNAIL_RUN_BUDGET_MS);
    }
  });

  it('returns bad_geometry for a document whose node carries an unsound rect', async () => {
    const it = rig({
      docs: { 'doc-1': docOf('doc-1', frameNode('a', { width: Number.NaN })) },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'bad_geometry' });
    expect(it.captures).toHaveLength(0);
    expect(it.writes).toHaveLength(0);
  });

  it('returns compose_failed when a captured frame carries no pixels', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      ops: { withBitmap: () => false },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'compose_failed' });
    expect(it.writes).toHaveLength(0);
  });

  it('returns too_large when the encoded composite passes its ceiling', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      ops: { toPng: () => Buffer.alloc(THUMBNAIL_MAX_BYTES + 1) },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'too_large' });
    expect(it.writes).toHaveLength(0);
  });

  it('returns too_large when the store refuses the bytes', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      write: () => ({ ok: false as const, reason: 'too-large' as const }),
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'too_large' });
  });

  it('returns run_failed rather than throwing when the write itself throws', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      write: () => {
        throw new Error('ENOSPC: no space left on device');
      },
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(outcome).toMatchObject({ status: 'failed', reason: 'run_failed' });
  });

  it('leaves the document dirty after a failure, so the next window retries', async () => {
    let failing = true;
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) =>
        failing ? { ok: false as const, reason: 'gone' } : { ok: true as const, image: index + 1 },
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    expect(it.writes).toHaveLength(0);

    // No second markDirty: the failure itself has to be what arms the retry.
    failing = false;
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.writes).toHaveLength(1);
  });

  it('settles a document that keeps failing, rather than retrying every window forever', async () => {
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async () => ({ ok: false as const, reason: 'gone' }),
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS * 10);

    // THUMBNAIL_FAILURE_ATTEMPTS runs, then quiet: no armed window and nothing left to retry.
    expect(it.captures).toHaveLength(THUMBNAIL_FAILURE_ATTEMPTS);
    expect(it.clock.armed()).toBe(0);
    expect(await it.service.captureIfDirtyNow('doc-1')).toMatchObject({
      status: 'skipped',
      reason: 'not_dirty',
    });
  });

  it('hands a settled document a fresh budget on the next edit', async () => {
    let failing = true;
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) =>
        failing ? { ok: false as const, reason: 'gone' } : { ok: true as const, image: index + 1 },
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS * 10);
    expect(it.writes).toHaveLength(0);

    failing = false;
    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(it.writes).toHaveLength(1);
  });
});

describe('what leaves the service', () => {
  beforeEach(() => recordLinesForTesting());
  afterEach(() => resetLogForTesting());

  const failures = () =>
    peekLinesForTesting().filter(
      (line) => line.subsystem === 'canvas' && line.msg === 'thumbnail capture failed',
    );

  it('carries no url out of a capture failure, neither in the outcome nor in the log', async () => {
    const secret = 'https://accounts.google.com/signin?token=abc';
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async () => ({
        ok: false as const,
        reason: `refused: ${secret} is not a local address`,
      }),
    });

    it.service.markDirty('doc-1');
    const outcome = await it.service.captureIfDirtyNow('doc-1');

    expect(JSON.stringify(outcome)).not.toContain('accounts.google.com');
    expect(outcome).toMatchObject({ status: 'failed', reason: 'capture_failed' });
    expect(failures()).toHaveLength(1);
    expect(JSON.stringify(failures()[0])).not.toContain('accounts.google.com');
    expect(failures()[0]?.['reason']).toBe('capture_failed');
    // A document id is stable per project, so it stays out of the line too.
    expect(failures()[0]).not.toHaveProperty('doc_id');
  });

  it('reports an undecodable canvas image as a count, naming neither the blob nor the node', async () => {
    const it = rig({
      docs: {
        'doc-1': docOf(
          'doc-1',
          frameNode('fr', { x: 0, y: 0, order: 0 }),
          pictureNode('holiday-invoice', 'blob-1', { x: 600, y: 0, order: 1 }),
        ),
      },
    });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    const lines = peekLinesForTesting().filter(
      (line) => line.subsystem === 'canvas' && line.msg.startsWith('canvas images did not decode'),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.['undecodable']).toBe(1);
    const wire = JSON.stringify(lines[0]);
    for (const forbidden of ['blob-1', 'holiday-invoice', 'doc-1']) {
      expect(wire).not.toContain(forbidden);
    }
  });

  it('notifies a successful write with its trigger, so the wiring can broadcast or flag', async () => {
    const it = rig({ docs: { 'doc-1': threeFrames('doc-1') } });

    it.service.markDirty('doc-1');
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);
    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    expect(it.notices.map((notice) => notice.trigger)).toEqual(['cooldown', 'leave']);
    expect(it.notices[0]).toMatchObject({ docId: 'doc-1', frames: 3 });
    expect(it.notices[1]?.mtimeMs).toBeGreaterThan(it.notices[0]?.mtimeMs ?? 0);
  });

  it('notifies nothing when a run writes nothing', async () => {
    const it = rig({ docs: { 'doc-1': docOf('doc-1') } });

    it.service.markDirty('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    expect(it.notices).toHaveLength(0);
  });
});

describe('the card reference a returning user lands on', () => {
  afterAll(() => {
    restoreWorkspaceRoot();
    cleanupTempFixtures();
  });

  const useRoot = (name: string): string => {
    const root = makeWorkspaceRoot({ name: `thumb-ref-${name}` });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetCanvasRegistryCache();
    return root;
  };

  it('answers a url for a thumbnail this process never wrote, on the first read after init', () => {
    const root = useRoot('previous-session');
    const worktree = join(root, 'project');
    const docId = canvasDocIdFor(worktree);
    mkdirSync(join(root, 'canvas'), { recursive: true });
    writeFileSync(join(root, 'canvas', `${docId}.thumb.png`), PNG);

    primeThumbnailIndex();

    const url = projectThumbnailUrl(worktree);
    expect(url).toContain(docId);
    expect(url).toMatch(/\?v=\d+$/);
  });

  it('answers undefined for a project whose canvas document is unknown, minting nothing', () => {
    const root = useRoot('unknown-doc');
    primeThumbnailIndex();

    expect(projectThumbnailUrl(join(root, 'never-opened'))).toBeUndefined();
  });

  it('answers undefined for a known document with no file on disk', () => {
    const root = useRoot('no-file');
    const worktree = join(root, 'project');
    canvasDocIdFor(worktree);
    primeThumbnailIndex();

    expect(projectThumbnailUrl(worktree)).toBeUndefined();
  });
});

describe('the event a capture reports itself with', () => {
  const SECRET = 'https://accounts.google.com/signin?token=abc';

  it('maps a written capture to its trigger, count, bucket and cap', () => {
    expect(
      thumbnailCaptureEvent({
        status: 'captured',
        trigger: 'leave',
        frames: 3,
        capped: false,
        elapsedMs: 420,
        mtimeMs: 7,
      }),
    ).toEqual({ trigger: 'leave', outcome: 'written', frames: 3, duration_bucket: 'under_1s', capped: false });
  });

  it('reports the cap when the run hit it', () => {
    const event = thumbnailCaptureEvent({
      status: 'captured',
      trigger: 'cooldown',
      frames: 24,
      capped: true,
      elapsedMs: 4_000,
      mtimeMs: 7,
    });
    expect(event).toMatchObject({ outcome: 'written', frames: 24, capped: true, duration_bucket: 'under_10s' });
  });

  it('carries every skip and failure reason through as the outcome, with no bytes and no frames invented', () => {
    const skips = ['not_dirty', 'not_open', 'no_frames'] as const;
    for (const reason of skips) {
      expect(thumbnailCaptureEvent({ status: 'skipped', trigger: 'cooldown', reason, elapsedMs: 0 })).toEqual({
        trigger: 'cooldown',
        outcome: reason,
        frames: 0,
        duration_bucket: 'under_1s',
        capped: false,
      });
    }

    const failures = [
      'bad_geometry',
      'capture_failed',
      'compose_failed',
      'budget_exceeded',
      'too_large',
      'run_failed',
    ] as const;
    for (const reason of failures) {
      expect(
        thumbnailCaptureEvent({ status: 'failed', trigger: 'leave', reason, frames: 1, elapsedMs: 50 }),
      ).toMatchObject({ outcome: reason, frames: 1 });
    }
  });

  it('buckets the duration rather than shipping it', () => {
    expect(thumbnailDurationBucket(0)).toBe('under_1s');
    expect(thumbnailDurationBucket(999)).toBe('under_1s');
    expect(thumbnailDurationBucket(1_000)).toBe('under_3s');
    expect(thumbnailDurationBucket(2_999)).toBe('under_3s');
    expect(thumbnailDurationBucket(3_000)).toBe('under_10s');
    expect(thumbnailDurationBucket(9_999)).toBe('under_10s');
    expect(thumbnailDurationBucket(10_000)).toBe('over_10s');
    expect(thumbnailDurationBucket(600_000)).toBe('over_10s');
  });

  it('fires one event per outcome from the service, and none of them names a url, a path or a document', async () => {
    const events: ReturnType<typeof thumbnailCaptureEvent>[] = [];
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async () => ({ ok: false as const, reason: `refused: ${SECRET} is not a local address` }),
    });
    it.service.onOutcome((outcome) => events.push(thumbnailCaptureEvent(outcome)));

    it.service.markDirty('doc-1');
    // The first failure retries on the next leave; the second exhausts the budget and settles.
    await it.service.captureIfDirtyNow('doc-1');
    await it.service.captureIfDirtyNow('doc-1');
    await it.service.captureIfDirtyNow('doc-1');

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ outcome: 'capture_failed', trigger: 'leave' });
    expect(events[1]).toMatchObject({ outcome: 'capture_failed', trigger: 'leave' });
    expect(events[2]).toMatchObject({ outcome: 'not_dirty' });
    const wire = JSON.stringify(events);
    for (const forbidden of ['accounts.google.com', 'doc-1', '/w/', 'localhost', '.thumb.png', 'studio-thumb']) {
      expect(wire).not.toContain(forbidden);
    }
  });

  it('gives a coalesced rerun its own event rather than folding it into the first', async () => {
    const events: string[] = [];
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const it = rig({
      docs: { 'doc-1': threeFrames('doc-1') },
      capture: async (_input, index) => {
        if (index === 0) await held;
        return { ok: true as const, image: index + 1 };
      },
    });
    it.service.onOutcome((outcome) => events.push(thumbnailCaptureEvent(outcome).outcome));

    it.service.markDirty('doc-1');
    const running = it.service.captureIfDirtyNow('doc-1');
    await flush();
    it.service.markDirty('doc-1');
    release();
    await running;
    await it.clock.advance(THUMBNAIL_COOLDOWN_MS);

    expect(events).toEqual(['written', 'written']);
  });
});

describe('the card and the sections flag (ONL-2661)', () => {
  const held = process.env['STUDIO_FLAGS'];
  const doc = docOf('doc-1', frameNode('a', { x: 0, y: 0, order: 0 }), {
    id: 'held', pageId: 'pg_main', kind: 'section', name: 'Venue tiles', x: -100, y: -100, width: 2000, height: 1600, order: 1, content: {},
  });
  afterEach(() => {
    if (held === undefined) delete process.env['STUDIO_FLAGS'];
    else process.env['STUDIO_FLAGS'] = held;
  });

  it('drops a stored Section before it can set the card scale or take a frame slot', () => {
    delete process.env['STUDIO_FLAGS'];
    expect(Object.keys(drawableNodes(doc).nodes)).toEqual(['a']);
  });

  it('draws it where the flag is on, and returns the same document untouched', () => {
    process.env['STUDIO_FLAGS'] = 'sections';
    expect(drawableNodes(doc)).toBe(doc);
  });

  it('paints sections with the canvas gray, rounded corners and border, not the text placeholder', async () => {
    process.env['STUDIO_FLAGS'] = 'sections';
    const section: CanvasNode = {
      id: 'section', pageId: 'pg_main', kind: 'section', name: 'Designs',
      x: 0, y: 0, width: 400, height: 300, order: 0, content: {},
    };
    const sectionDoc = docOf('doc-1', section);
    const test = rig({ docs: { 'doc-1': sectionDoc } });
    test.service.markDirty('doc-1');
    expect(await test.service.captureIfDirtyNow('doc-1')).toMatchObject({ status: 'captured' });
    const fit = thumbnailFitAll(sectionDoc, 'pg_main');
    if (!fit.ok) throw new Error('section did not fit');
    const rect = fit.placements[0]!.rect;
    const bitmap = test.composites[0]!;
    const center = ((rect.y + Math.floor(rect.height / 2)) * bitmap.width + rect.x + Math.floor(rect.width / 2)) * 4;
    expect([...bitmap.bgra.slice(center, center + 4)]).toEqual([51, 51, 51, 255]);
    expect(alphaAt(bitmap, rect.x, rect.y)).toBe(0);
    expect(blueAt(bitmap, rect.x + Math.floor(rect.width / 2), rect.y)).toBe(73);
    expect(test.captures).toEqual([]);
  });
});
