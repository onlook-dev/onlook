import type { ArtifactId, CanvasDoc, CanvasDocId, CanvasPageId } from '@studio/events';
import { compareCanvasPaintOrder, PERF_SPAN } from '@studio/events';
import type { NativeImage } from 'electron';
import { artifactStore } from '../../artifacts/instance.js';
import { artifactPreviews } from '../../artifacts/preview-instance.js';
import { manifestPagePath } from '../../artifacts/manifest.js';
import { flagOn } from '../../flags/index.js';
import { readImage } from '../../images/store.js';
import { log } from '../../log/index.js';
import { measureSpan } from '../../perf/probe.js';
import { capture } from '../../telemetry/index.js';
import type { TelemetryEventMap } from '../../telemetry/events.js';
import { broadcastWorkspacesChanged } from '../../workspace/workspaces-changed.js';
import { captureFrameForThumbnail } from '../gate.js';
import { frameMirror } from '../mirror.js';
import { knownCanvasDocId, worktreeForCanvasDoc } from '../registry.js';
import { thumbnailFitAll, type ThumbnailPlacement } from './bounds.js';
import {
  composeThumbnail,
  electronImageOps,
  THUMBNAIL_SECTION_BORDER,
  THUMBNAIL_SECTION_FILL,
  THUMBNAIL_TEXT_FILL,
  type ThumbFrame,
  type ThumbImageOps,
} from './compose.js';
import { thumbnailUrl } from './protocol.js';
import { thumbnailMtime, writeThumbnail } from './store.js';
import type { ThumbnailTextPlacement } from './text.js';

const logger = log('canvas');

export const THUMBNAIL_COOLDOWN_MS = 30_000;

export const THUMBNAIL_FRAME_CAP = 24;

/** Consecutive failed runs before a document settles, counting the first attempt. */
export const THUMBNAIL_FAILURE_ATTEMPTS = 2;

/** Well under the guest command default, which is twenty-five times the whole quit cap (ONL-2471). */
export const THUMBNAIL_RUN_BUDGET_MS = 15_000;

type ThumbnailTrigger = 'cooldown' | 'leave';

type ThumbnailSkipReason = 'not_dirty' | 'not_open' | 'no_frames';

type ThumbnailFailureReason =
  | 'bad_geometry'
  | 'capture_failed'
  | 'compose_failed'
  | 'budget_exceeded'
  | 'too_large'
  | 'run_failed';

export type ThumbnailOutcome =
  | {
      status: 'captured';
      trigger: ThumbnailTrigger;
      frames: number;
      capped: boolean;
      elapsedMs: number;
      mtimeMs: number;
    }
  | { status: 'skipped'; trigger: ThumbnailTrigger; reason: ThumbnailSkipReason; elapsedMs: number }
  | {
      status: 'failed';
      trigger: ThumbnailTrigger;
      reason: ThumbnailFailureReason;
      frames: number;
      elapsedMs: number;
    };

export interface ThumbnailCaptureInput {
  docId: CanvasDocId;
  frameId: string;
  deadlineMs: number;
}

export interface ThumbnailWriteNotice {
  docId: CanvasDocId;
  trigger: ThumbnailTrigger;
  frames: number;
  mtimeMs: number;
}

type ThumbnailCaptureResult<S> = { ok: true; image: S } | { ok: false; reason: string };

export interface ThumbnailServiceDeps<S> {
  renderText?: (placements: readonly ThumbnailTextPlacement[], timeoutMs: number, wanted: () => boolean) => Promise<ReadonlyMap<string, S>>;
  now?: () => number;
  setTimer?: (fire: () => void, ms: number) => () => void;
  worktreeFor?: (docId: CanvasDocId) => string | undefined;
  /** Carries the page in front of the user: the card draws that page alone (ONL-2488). */
  snapshot: (worktreePath: string) => Promise<{ doc: CanvasDoc | null; currentPageId?: CanvasPageId }>;
  captureFrame: (input: ThumbnailCaptureInput) => Promise<ThumbnailCaptureResult<S>>;
  artifactPreview?: (input: { artifactId: ArtifactId; pagePath: string | undefined }, wanted: () => boolean) => Promise<S | null>;
  readImage?: (imageId: string) => { bytes: Uint8Array } | null;
  ops: ThumbImageOps<S>;
  write: (
    docId: CanvasDocId,
    png: Buffer,
  ) => { ok: true; mtimeMs: number } | { ok: false; reason: 'too-large' };
  notifyWritten?: (notice: ThumbnailWriteNotice) => void;
}

export interface ThumbnailService {
  /** Never captures: the cooldown decides when a run happens. */
  markDirty(docId: CanvasDocId): void;
  /** The leave moments' door. Immediate, and the elapsed time is not part of the condition. */
  captureIfDirtyNow(docId: CanvasDocId): Promise<ThumbnailOutcome>;
  onOutcome(listener: (outcome: ThumbnailOutcome) => void): void;
}

interface DocState {
  changes: number;
  recorded: number;
  /** Consecutive failed runs; a failure below the cap leaves the document dirty so the next window retries. */
  failures: number;
  cancelTimer?: () => void;
  running?: Promise<ThumbnailOutcome>;
  /** A leave arrived while a run was in flight; the newer change is captured as soon as it settles. */
  leaveJoined?: boolean;
}

/** What the card may draw: a Section the Canvas is not drawing is out before it can set the scale or take a slot (ONL-2661). */
export function drawableNodes(doc: CanvasDoc): CanvasDoc {
  if (flagOn('sections')) return doc;
  const nodes = Object.fromEntries(Object.entries(doc.nodes).filter(([, node]) => node.kind !== 'section'));
  return Object.keys(nodes).length === Object.keys(doc.nodes).length ? doc : { ...doc, nodes };
}

const drawOrder = (chosen: readonly ThumbnailPlacement[]): ThumbnailPlacement[] =>
  [...chosen].sort((a, b) => compareCanvasPaintOrder({ ...a, ...a.rect }, { ...b, ...b.rect }));

export function createThumbnailService<S>(deps: ThumbnailServiceDeps<S>): ThumbnailService {
  const now = deps.now ?? (() => Date.now());
  const setTimer =
    deps.setTimer ??
    ((fire: () => void, ms: number) => {
      const handle = setTimeout(fire, ms);
      handle.unref();
      return () => {
        clearTimeout(handle);
      };
    });
  const worktreeFor = deps.worktreeFor ?? worktreeForCanvasDoc;
  const imageBytes = deps.readImage ?? readImage;
  const listeners: ((outcome: ThumbnailOutcome) => void)[] = [];
  const docs = new Map<CanvasDocId, DocState>();

  const stateOf = (docId: CanvasDocId): DocState => {
    const held = docs.get(docId);
    if (held !== undefined) return held;
    const fresh: DocState = { changes: 0, recorded: 0, failures: 0 };
    docs.set(docId, fresh);
    return fresh;
  };

  function decodeImage(imageId: string): S | null {
    try {
      const held = imageBytes(imageId);
      return held === null ? null : deps.ops.decode(held.bytes);
    } catch {
      return null;
    }
  }

  function cancelWindow(state: DocState): void {
    state.cancelTimer?.();
    delete state.cancelTimer;
  }

  function failed(
    trigger: ThumbnailTrigger,
    reason: ThumbnailFailureReason,
    frames: number,
    elapsedMs: number,
    frameId?: string,
  ): ThumbnailOutcome {
    // The capture layer's own reason can name a frame's url, so it never crosses this boundary (ONL-2471).
    logger.warn('thumbnail capture failed', { reason, frames, ...(frameId === undefined ? {} : { frame_id: frameId }) });
    const outcome: ThumbnailOutcome = { status: 'failed', trigger, reason, frames, elapsedMs };
    for (const listener of listeners) listener(outcome);
    return outcome;
  }

  function skipped(
    trigger: ThumbnailTrigger,
    reason: ThumbnailSkipReason,
    elapsedMs: number,
  ): ThumbnailOutcome {
    const outcome: ThumbnailOutcome = { status: 'skipped', trigger, reason, elapsedMs };
    for (const listener of listeners) listener(outcome);
    return outcome;
  }

  /** Both doors fire and never await, so a throw escaping here is an unhandled rejection in main (ONL-2471). */
  async function runCapture(
    docId: CanvasDocId,
    state: DocState,
    trigger: ThumbnailTrigger,
  ): Promise<ThumbnailOutcome> {
    const startedAtCount = state.changes;
    let outcome: ThumbnailOutcome;
    // The catch returns an outcome too, so every exit reaches the settle below.
    try {
      outcome = await attemptCapture(docId, state, trigger);
    } catch {
      outcome = failed(trigger, 'run_failed', 0, 0);
    }
    if (outcome.status !== 'failed') {
      state.failures = 0;
      state.recorded = startedAtCount;
      return outcome;
    }
    state.failures += 1;
    // Bad geometry and an unphotographable frame fail every window; an edit hands back a fresh budget (ONL-2471).
    if (state.failures >= THUMBNAIL_FAILURE_ATTEMPTS) state.recorded = startedAtCount;
    return outcome;
  }

  async function attemptCapture(
    docId: CanvasDocId,
    state: DocState,
    trigger: ThumbnailTrigger,
  ): Promise<ThumbnailOutcome> {
    const startedAt = now();
    const elapsed = (): number => now() - startedAt;

    const worktree = worktreeFor(docId);
    if (worktree === undefined) return skipped(trigger, 'not_open', elapsed());

    let doc: CanvasDoc | null;
    let currentPageId: CanvasPageId | undefined;
    try {
      ({ doc, currentPageId } = await deps.snapshot(worktree));
    } catch {
      return failed(trigger, 'run_failed', 0, elapsed());
    }
    // Nothing captures a project that is not open; enforced here and nowhere else.
    if (doc === null) return skipped(trigger, 'not_open', elapsed());

    const fit = thumbnailFitAll(drawableNodes(doc), currentPageId);
    if (!fit.ok) {
      return fit.reason === 'no-frames'
        ? skipped(trigger, 'no_frames', elapsed())
        : failed(trigger, 'bad_geometry', 0, elapsed());
    }

    const capped = fit.placements.length > THUMBNAIL_FRAME_CAP;
    const chosen = drawOrder(fit.placements.slice(0, THUMBNAIL_FRAME_CAP));

    let textImages: ReadonlyMap<string, S> = new Map();
    const text = chosen.filter((placement) => placement.kind === 'text');
    if (deps.renderText !== undefined && text.length > 0) {
      const budget = Math.min(2000, Math.max(0, (THUMBNAIL_RUN_BUDGET_MS - elapsed()) / 4));
      let active = true;
      let cancelDeadline: (() => void) | undefined;
      try {
        textImages = await Promise.race([
          deps.renderText(text, budget, () => active),
          new Promise<ReadonlyMap<string, S>>((resolve) => {
            cancelDeadline = setTimer(() => resolve(new Map()), budget);
          }),
        ]);
      } catch {
        textImages = new Map();
      } finally {
        active = false;
        cancelDeadline?.();
      }
    }

    const artifactImages = new Map<string, S>();
    if (deps.artifactPreview !== undefined && chosen.some((placement) => placement.kind === 'artifact')) {
      const budget = Math.max(0, (THUMBNAIL_RUN_BUDGET_MS - elapsed()) / 2);
      const deadline = now() + budget;
      let active = true;
      const wanted = (): boolean => active && now() < deadline;
      let cancelDeadline: (() => void) | undefined;
      try {
        await Promise.race([
          Promise.all(chosen.map(async (placement) => {
            if (placement.kind !== 'artifact' || !wanted()) return;
            try {
              const image = await deps.artifactPreview!(placement, wanted);
              if (image !== null && wanted()) artifactImages.set(placement.id, image);
            } catch { return; }
          })),
          new Promise<void>((resolve) => { cancelDeadline = setTimer(resolve, budget); }),
        ]);
      } finally {
        active = false;
        cancelDeadline?.();
      }
    }

    let abandoned: ThumbnailFailureReason | undefined;
    let failedFrameId: string | undefined;
    let drawn = 0;
    let undecodable = 0;

    async function* frames(): AsyncGenerator<ThumbFrame<S>> {
      for (const placement of chosen) {
        const left = THUMBNAIL_RUN_BUDGET_MS - elapsed();
        if (left <= 0) {
          abandoned = 'budget_exceeded';
          return;
        }
        if (placement.kind === 'section') {
          drawn += 1;
          yield { fill: THUMBNAIL_SECTION_FILL, rect: placement.rect,
            outline: { radius: 8 * placement.scale, width: placement.scale, colour: THUMBNAIL_SECTION_BORDER } };
          continue;
        }
        if (placement.kind === 'text' || placement.kind === 'artifact') {
          drawn += 1;
          const source = (placement.kind === 'text' ? textImages : artifactImages).get(placement.id);
          yield source === undefined
            ? { fill: THUMBNAIL_TEXT_FILL, rect: placement.rect }
            : { source, rect: placement.rect };
          continue;
        }
        if (placement.kind === 'image') {
          const decoded = decodeImage(placement.imageId);
          // One lost blob leaves its node out; abandoning here would blank the whole card (ONL-2486).
          if (decoded === null) {
            undecodable += 1;
            continue;
          }
          drawn += 1;
          yield { source: decoded, rect: placement.rect };
          continue;
        }
        let shot: ThumbnailCaptureResult<S>;
        try {
          const browser: Extract<ThumbnailPlacement, { kind: 'browser' }> = placement;
          shot = await deps.captureFrame({ docId, frameId: browser.id, deadlineMs: left });
        } catch {
          abandoned = 'capture_failed';
          failedFrameId = placement.id;
          return;
        }
        if (!shot.ok) {
          abandoned = 'capture_failed';
          failedFrameId = placement.id;
          return;
        }
        drawn += 1;
        yield { source: shot.image, rect: placement.rect };
      }
    }

    try {
      const composed = await measureSpan(PERF_SPAN.composite, () =>
        composeThumbnail(fit.size, frames(), deps.ops),
      );
      // One line per run, not per node: a lost blob is lost every window until the node goes.
      if (undecodable > 0) {
        logger.warn('canvas images did not decode; their nodes are left out of the thumbnail', { undecodable });
      }
      if (abandoned !== undefined) return failed(trigger, abandoned, drawn, elapsed(), failedFrameId);
      if (!composed.ok) {
        if (composed.reason === 'no-frames') return skipped(trigger, 'no_frames', elapsed());
        return failed(
          trigger,
          composed.reason === 'too-large' ? 'too_large' : 'compose_failed',
          drawn,
          elapsed(),
        );
      }

      // Re-checked after the snapshot: a removal forgets the binding while this capture is in flight, and the write would re-create the file it just deleted (ONL-2315).
      if (worktreeFor(docId) === undefined) return skipped(trigger, 'not_open', elapsed());

      const written = deps.write(docId, composed.png);
      if (!written.ok) return failed(trigger, 'too_large', drawn, elapsed());

      const outcome: ThumbnailOutcome = {
        status: 'captured',
        trigger,
        frames: drawn,
        capped,
        elapsedMs: elapsed(),
        mtimeMs: written.mtimeMs,
      };
      // A leave waiting on this run is what the notice reports; the outcome still carries what started it.
      deps.notifyWritten?.({
        docId,
        trigger: state.leaveJoined === true ? 'leave' : trigger,
        frames: drawn,
        mtimeMs: written.mtimeMs,
      });
      for (const listener of listeners) listener(outcome);
      return outcome;
    } catch {
      return failed(trigger, 'run_failed', drawn, elapsed());
    }
  }

  function start(docId: CanvasDocId, state: DocState, trigger: ThumbnailTrigger): Promise<ThumbnailOutcome> {
    const held = state.running;
    if (held !== undefined) {
      /* The run already going recorded only the counter it started with, so a leave
         joining it would otherwise wait out a fresh window for the newer change. */
      if (trigger === 'leave') state.leaveJoined = true;
      return held;
    }
    const run = runCapture(docId, state, trigger).finally(() => {
      delete state.running;
      const dirty = state.changes !== state.recorded;
      const joined = state.leaveJoined === true;
      delete state.leaveJoined;
      if (!dirty) return;
      // A change that landed mid-run left the counter ahead; a leave asked for it now, a timer asks later.
      if (joined) void start(docId, state, 'leave');
      else arm(docId, state);
    });
    state.running = run;
    return run;
  }

  function arm(docId: CanvasDocId, state: DocState): void {
    if (state.cancelTimer !== undefined) return;
    state.cancelTimer = setTimer(() => {
      delete state.cancelTimer;
      if (state.changes === state.recorded) return;
      void start(docId, state, 'cooldown');
    }, THUMBNAIL_COOLDOWN_MS);
  }

  return {
    markDirty(docId) {
      const state = stateOf(docId);
      state.changes += 1;
      // New content is a new subject: whatever failed before is not what this run will photograph.
      state.failures = 0;
      arm(docId, state);
    },

    captureIfDirtyNow(docId) {
      const state = stateOf(docId);
      cancelWindow(state);
      if (state.changes === state.recorded) {
        return Promise.resolve(skipped('leave', 'not_dirty', 0));
      }
      return start(docId, state, 'leave');
    },

    onOutcome(listener) {
      listeners.push(listener);
    },
  };
}

const DURATION_BUCKETS: readonly { readonly ceilingMs: number; readonly bucket: ThumbnailDurationBucket }[] = [
  { ceilingMs: 1_000, bucket: 'under_1s' },
  { ceilingMs: 3_000, bucket: 'under_3s' },
  { ceilingMs: 10_000, bucket: 'under_10s' },
];

export type ThumbnailDurationBucket = 'under_1s' | 'under_3s' | 'under_10s' | 'over_10s';

export function thumbnailDurationBucket(elapsedMs: number): ThumbnailDurationBucket {
  return DURATION_BUCKETS.find((step) => elapsedMs < step.ceilingMs)?.bucket ?? 'over_10s';
}

/** One event per outcome, from the service's one exit: no branch reports twice and none is missed (ONL-2471). */
export function thumbnailCaptureEvent(outcome: ThumbnailOutcome): TelemetryEventMap['canvas_thumbnail_captured'] {
  return {
    trigger: outcome.trigger,
    outcome: outcome.status === 'captured' ? 'written' : outcome.reason,
    frames: outcome.status === 'skipped' ? 0 : outcome.frames,
    duration_bucket: thumbnailDurationBucket(outcome.elapsedMs),
    capped: outcome.status === 'captured' && outcome.capped,
  };
}

let service: ThumbnailService | undefined;

// Injected: the canvas host imports this module, so reaching back for its snapshot closes a cycle.
let snapshotProvider:
  | ((worktreePath: string) => Promise<{ doc: CanvasDoc | null; currentPageId?: CanvasPageId }>)
  | undefined;

export function setCanvasSnapshotProvider(
  provider:
    | ((worktreePath: string) => Promise<{ doc: CanvasDoc | null; currentPageId?: CanvasPageId }>)
    | undefined,
): void {
  snapshotProvider = provider;
  service = undefined;
}

export function thumbnailService(): ThumbnailService {
  if (service !== undefined) return service;
  const ops = electronImageOps();
  const built = createThumbnailService<NativeImage>({
    snapshot: async (worktreePath) =>
      snapshotProvider === undefined ? { doc: null } : snapshotProvider(worktreePath),
    captureFrame: (input) =>
      captureFrameForThumbnail({
        mirror: frameMirror(),
        docId: input.docId,
        frameId: input.frameId,
        deadlineMs: input.deadlineMs,
      }),
    artifactPreview: async (input, wanted) => {
      const read = await artifactStore().read(input.artifactId);
      if (read.outcome !== 'resolved' || !wanted()) return null;
      const pagePath = manifestPagePath(read.manifest, input.pagePath);
      if (pagePath === undefined) return null;
      const result = await artifactPreviews().request({
        artifactId: input.artifactId, pagePath, updatedAt: read.manifest.updatedAt,
      }, wanted);
      if (result.outcome !== 'ready' || !wanted()) return null;
      return ops.decode(Buffer.from(result.image.slice('data:image/png;base64,'.length), 'base64'));
    },
    ops,
    renderText: async (placements, timeoutMs, wanted) => {
      const deadline = Date.now() + timeoutMs;
      const { renderThumbnailText } = await import('./text-render.js');
      if (!wanted() || Date.now() >= deadline) return new Map();
      return renderThumbnailText(placements, deadline, wanted);
    },
    write: writeThumbnail,
    // A cooldown write repaints a hidden grid; the next list derives its reference anyway (ONL-2471).
    notifyWritten: (notice) => {
      if (notice.trigger === 'leave') broadcastWorkspacesChanged();
    },
  });
  // Registered with the service, not on every lookup: both doors call this accessor on every edit.
  built.onOutcome((outcome) => capture('canvas_thumbnail_captured', thumbnailCaptureEvent(outcome)));
  service = built;
  return built;
}

/** The card's reference, from the store's own memory: no per-project syscall on a list. */
export function projectThumbnailUrl(workspacePath: string): string | undefined {
  const docId = knownCanvasDocId(workspacePath);
  if (docId === undefined) return undefined;
  const mtimeMs = thumbnailMtime(docId);
  return mtimeMs === null ? undefined : thumbnailUrl(docId, mtimeMs);
}

export function projectThumbnail(workspacePath: string): { url: string; mtimeMs: number } | undefined {
  const docId = knownCanvasDocId(workspacePath);
  if (docId === undefined) return undefined;
  const mtimeMs = thumbnailMtime(docId);
  return mtimeMs === null ? undefined : { url: thumbnailUrl(docId, mtimeMs), mtimeMs };
}

export function markProjectDirty(docId: CanvasDocId): void {
  thumbnailService().markDirty(docId);
}

/** Fired, never awaited: no leave path becomes asynchronous because of a capture. */
export function captureThumbnailIfDirtyNow(docId: CanvasDocId): void {
  void thumbnailService().captureIfDirtyNow(docId);
}

export function resetThumbnailServiceForTesting(): void {
  service = undefined;
}
