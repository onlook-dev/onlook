/** In-process CDP: a debug port is attachable by any local process (ONL-1995). A script runs only on a local origin; a capture runs on any page a Frame shows (ONL-2658). */

import { session, webContents, type NativeImage, type WebContents } from 'electron';
import {
  ARTIFACT_SCHEME,
  ARTIFACTS_PARTITION,
  localPort,
  PERF_SPAN,
  type EvaluateResult,
  type FrameCaptureResult,
  type FrameCaptureStep,
} from '@studio/events';
import { messageOf } from '../errors/message.js';
import { framesSession } from '../frames/partition.js';
import { withFrameAwake } from '../frames/activity.js';
import { measureSpan } from '../perf/probe.js';
import { transitionPageLifecycle } from './lifecycle.js';
import {
  captureViewPort,
  imageRepeatsRows,
  withCaptureView,
  type CaptureViewDeps,
  type CaptureViewOutcome,
  type CaptureViewPort,
  type Judged,
  type RevealFacts,
  type RevealRefusal,
} from './capture-view.js';
import {
  CLIP_TILE,
  clipReadOf,
  clipReadScript,
  devicePixels,
  frameClip,
  targetRead,
  wholeFrameClip,
  type ClipTarget,
  type ClipTargetFailure,
  type PictureSource,
} from './clip.js';
import { frameReadOf, frameReadScript, type FrameRead } from './frame-read.js';
import { rememberedFramePicture } from '../frames/picture.js';
import {
  GUEST_PAGE_READ_SCRIPT,
  PAGE_READ_DEADLINE_MS,
  readingOf,
  type GuestReadOutcome,
} from './page-error.js';

type GuestLookup =
  | { ok: true; guest: WebContents }
  | { ok: false; reason: string };

/** `'undefined'` is the string the model has been reading. */
function serialize(value: unknown): EvaluateResult {
  if (value === undefined) return { ok: true, value: 'undefined' };
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return { ok: true, value: String(value) };
    return { ok: true, value: json };
  } catch (err) {
    return {
      ok: false,
      reason: `the result could not be serialized (${String(err)}) — return a plain value instead`,
    };
  }
}

/** Liveness and identity, where both captures stop; a script adds the origin clause below (ONL-2658). */
function resolveLiveGuest(
  webContentsId: number | undefined,
  frameId: string,
  lookup: GuestSource,
  artifactId?: string,
): GuestLookup {
  if (webContentsId === undefined) {
    return {
      ok: false,
      reason:
        `frame ${frameId} has no live page to address — it may be covered, still ` +
        `loading, or not open yet`,
    };
  }
  const guest = lookup(webContentsId);
  if (!guest || guest.isDestroyed()) {
    return { ok: false, reason: `frame ${frameId}'s page went away before the command ran` };
  }
  // Electron reuses retired ids; a holder that is not a Frame's <webview> is not the frame.
  const identityMatches = artifactId === undefined
    ? guest.session === framesSession()
    : guest.session === session.fromPartition(ARTIFACTS_PARTITION) && isArtifactPage(guest.getURL(), artifactId);
  if (guest.getType() !== 'webview' || !identityMatches) {
    return { ok: false, reason: `frame ${frameId}'s page went away before the command ran` };
  }
  return { ok: true, guest };
}

function resolveGuest(
  webContentsId: number | undefined,
  frameId: string,
  lookup: GuestSource,
  artifactId?: string,
  localOnly = false,
): GuestLookup {
  const live = resolveLiveGuest(webContentsId, frameId, lookup, artifactId);
  if (!live.ok || artifactId !== undefined) return live;
  const url = live.guest.getURL();
  // The mirrored url is a debounce stale; re-judge the live one at attach time.
  if (!isWebPage(url)) return { ok: false, reason: webOnlyRefusal(url) };
  if (localOnly && localPort(url) === null) return { ok: false, reason: localOnlyRefusal(url) };
  return live;
}

export function isWebPage(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function webOnlyRefusal(url: string): string {
  return `refused: ${url} is not a web page. Scripts run in pages at http and https addresses, or in an Artifact on the Canvas.`;
}

export function isArtifactPage(url: string, artifactId: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === `${ARTIFACT_SCHEME}:` && parsed.host === artifactId && parsed.username === '' && parsed.password === '';
  } catch { return false; }
}

/** Only the code mapper asks for it; `not a local address` is matched by its decline (`code/mapper/identify.ts`). */
function localOnlyRefusal(url: string): string {
  return `refused: ${url} is not a local address, and only the project's own pages map to its source.`;
}

export type GuestSource = (webContentsId: number) => WebContents | undefined;

const REAL_GUESTS: GuestSource = (id) => webContents.fromId(id) ?? undefined;

/** `awaitPromise` never settles against a stuck page; without a deadline the frame's debugger wedges. */
const GUEST_COMMAND_DEADLINE_MS = 20_000;

function withDeadline<T>(
  work: Promise<T>,
  ms: number,
  reason = 'the page did not respond in time — it may be stuck in a loop or blocked by a dialog',
): Promise<T> {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      rejectPromise(
        new Error(reason),
      );
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        rejectPromise(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/** A leaked attachment fails every later command with "already attached"; the `finally` is the recovery too. */
async function withGuest<T>(
  guest: WebContents,
  run: (send: (method: string, params?: object) => Promise<never>) => Promise<T>,
): Promise<T> {
  if (guest.debugger.isAttached()) {
    throw new Error('that page is already being debugged — close its DevTools and try again');
  }
  guest.debugger.attach('1.3');
  try {
    return await withDeadline(
      run((method, params) => guest.debugger.sendCommand(method, params) as Promise<never>),
      GUEST_COMMAND_DEADLINE_MS,
    );
  } finally {
    try {
      if (guest.debugger.isAttached()) guest.debugger.detach();
    } catch {
      /* already gone */
    }
  }
}

export async function setPageLifecycleState(contents: WebContents, state: 'frozen' | 'active'): Promise<void> {
  await transitionPageLifecycle(contents, state, () => {
    try {
      const pid = contents.getOSProcessId();
      return pid > 0 && webContents.getAllWebContents().every((other) => other === contents || other.isDestroyed() ||
        other.mainFrame.framesInSubtree.every((frame) => frame.detached || frame.osProcessId !== pid));
    } catch {
      // A contents mid cross-process navigation throws on its disposed main frame, as in `frames/activity.ts`.
      return false;
    }
  });
}

export interface GuestCommandDeps {
  frameId: string;
  localOnly?: boolean;
  artifactId?: string;
  webContentsId: number | undefined;
  guests?: GuestSource;
  deadlineMs?: number;
  navigationLoadMs?: number;
  revealed?: RevealFacts;
}

/** Runs only behind the origin gate in `gate.ts` (ONL-1995). */
export async function evaluateInGuest(
  deps: GuestCommandDeps,
  script: string,
): Promise<EvaluateResult> {
  const found = resolveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId, deps.localOnly);
  if (!found.ok) return { ok: false, reason: found.reason };
  try {
    return await withFrameAwake(found.guest, () => evaluateAwakeGuest(deps, script));
  } catch (error) {
    return { ok: false, reason: messageOf(error) };
  }
}

async function evaluateAwakeGuest(deps: GuestCommandDeps, script: string): Promise<EvaluateResult> {
  const found = resolveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId, deps.localOnly);
  if (!found.ok) return { ok: false, reason: found.reason };

  try {
    return await withGuest(found.guest, async (send) => {
      const result = (await send('Runtime.evaluate', {
        expression: script,
        returnByValue: true,
        awaitPromise: true,
        throwOnSideEffect: false,
      })) as {
        result?: { value?: unknown; description?: string };
        exceptionDetails?: { text?: string; exception?: { description?: string } };
      };

      const thrown = result.exceptionDetails;
      if (thrown) {
        const detail = thrown.exception?.description ?? thrown.text ?? 'the script threw';
        return { ok: false, reason: `the script threw in the page: ${detail}` };
      }
      return serialize(result.result?.value);
    });
  } catch (error) {
    if (!isNavigationLoss(error) || found.guest.isDestroyed()) return { ok: false, reason: messageOf(error) };
    if (!(await untilLoaded(found.guest, deps.navigationLoadMs ?? NAVIGATION_LOAD_MS))) {
      return {
        ok: false,
        reason: found.guest.isDestroyed()
          ? `frame ${deps.frameId}'s page went away while the script ran`
          : 'the page navigated while the script ran and is still loading',
      };
    }
    return { ok: true, navigatedTo: found.guest.getURL() };
  }
}

const NAVIGATION_LOAD_MS = 10_000;

function isNavigationLoss(error: unknown): boolean {
  const message = messageOf(error);
  return message.includes('Inspected target navigated or closed') || message.includes('Execution context was destroyed');
}

function untilLoaded(guest: WebContents, ms: number): Promise<boolean> {
  if (!guest.isLoading()) return Promise.resolve(true);
  return new Promise((resolvePromise) => {
    const finish = (loaded: boolean): void => {
      clearTimeout(timer);
      guest.removeListener('did-stop-loading', stopped);
      guest.removeListener('destroyed', gone);
      resolvePromise(loaded);
    };
    const stopped = (): void => { finish(true); };
    const gone = (): void => { finish(false); };
    const timer = setTimeout(() => { finish(false); }, ms);
    guest.on('did-stop-loading', stopped);
    guest.on('destroyed', gone);
  });
}

/** `capturePage`, not `Page.captureScreenshot`: a hidden view never answers the paint-dependent command (ONL-2304). */
export async function captureGuest(deps: GuestCommandDeps): Promise<FrameCaptureResult> {
  const found = resolveLiveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { ok: false, reason: found.reason };
  try {
    return await withFrameAwake(found.guest, () => captureRevealedGuest(deps));
  } catch (error) {
    return { ok: false, reason: messageOf(error) };
  }
}

function captureViewDeps(): CaptureViewDeps {
  return {
    now: () => performance.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

function hostViewPort(guest: WebContents): CaptureViewPort | undefined {
  const host = guest.hostWebContents as WebContents | null | undefined;
  return host && !host.isDestroyed() ? captureViewPort(host) : undefined;
}

type Viewport = { width: number; height: number; ratio: number; zoom: number };

function judgeImage(image: NativeImage, expected: { width: number; height: number }): Judged {
  const size = image.getSize();
  return !image.isEmpty() && size.width === expected.width && size.height === expected.height ? 'whole' : 'short';
}

const NO_PARTIAL = 'No partial image was returned.';
const READ_INSTEAD = 'Instead, read the page with evaluate_in_frame.';
const DO_NOT_RETRY = 'Do not retry the capture or take a screenshot outside Onlook; read the page with evaluate_in_frame instead.';
const VIEW_BUSY_REASON = 'FRAME_VIEW_BUSY: the person is moving the canvas right now, so Onlook did not move it to capture this frame. Retry capture_frame in a moment.';
const VIEW_LATE_REASON = 'FRAME_VIEW_LATE: the project tab did not answer Onlook\'s move of the canvas view in time, so nothing was captured. Onlook put the person\'s view back. Retry capture_frame once.';
const MOVED_STALL_REASON = 'FRAME_CAPTURE_TIMEOUT: the frame did not paint within the time Onlook can hold the person\'s view moved, so nothing was captured and Onlook put the view back. Retry capture_frame once; if it times out again, read the page with evaluate_in_frame.';

function notWholeWhy(why: RevealRefusal & { kind: 'not-whole' }): string {
  if (why.why === 'hidden-tab') return 'The frame\'s project tab is in the background, where Onlook cannot repaint the frame';
  if (why.why === 'too-large') return 'The frame is too large on screen for any zoom-out Onlook can reach';
  return 'The frame could not be brought onto the screen';
}

function shotSize(image: NativeImage | undefined, expected: { width: number; height: number }): string {
  if (image === undefined) return '';
  const size = image.getSize();
  return ` (it painted ${String(size.width)}x${String(size.height)} of the ${String(expected.width)}x${String(expected.height)} pixels it needs)`;
}

async function readGuestViewport(guest: WebContents): Promise<Viewport> {
  const value: unknown = await guest.executeJavaScriptInIsolatedWorld(PAGE_READ_WORLD_ID, [
    { code: '({ width: innerWidth, height: innerHeight, ratio: devicePixelRatio })' },
  ]);
  if (typeof value !== 'object' || value === null ||
    !('width' in value) || !('height' in value) || !('ratio' in value) ||
    typeof value.width !== 'number' || typeof value.height !== 'number' ||
    !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) ||
    value.width <= 0 || value.height <= 0 ||
    typeof value.ratio !== 'number' || !Number.isFinite(value.ratio) || value.ratio <= 0) {
    throw new Error('the frame reported no usable viewport');
  }
  const zoom = guest.getZoomFactor();
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('the frame reported no usable zoom');
  return { width: value.width, height: value.height, ratio: value.ratio, zoom };
}

async function captureRevealedGuest(deps: GuestCommandDeps, retryResize = true): Promise<FrameCaptureResult> {
  const found = resolveLiveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { ok: false, reason: found.reason };
  const guest = found.guest;
  const view = captureViewDeps();
  const facts = deps.revealed ?? { viewMoved: false, revealMs: 0, geometry: null };
  const timeoutReason = `FRAME_CAPTURE_TIMEOUT: the frame did not render within the capture deadline. A dialog in its page may be blocking it. ${DO_NOT_RETRY}`;
  const deadlineMs = deps.deadlineMs ?? 4_000;
  const bounded = async <R>(step: FrameCaptureStep, work: () => Promise<R>): Promise<R> => {
    try {
      return await withDeadline(work(), deadlineMs, timeoutReason);
    } catch (error) {
      if (messageOf(error) === timeoutReason) facts.stalledStep = step;
      throw error;
    }
  };
  const failed = (error: unknown): FrameCaptureResult => {
    const detail = messageOf(error);
    return { ok: false, reason: detail === timeoutReason ? detail : `FRAME_NOT_VISIBLE: the frame could not be captured (${detail}). ${READ_INSTEAD}` };
  };

  const url = guest.getURL();
  let viewport: Viewport;
  let outcome: CaptureViewOutcome<NativeImage>;
  let current: Viewport;
  try {
    viewport = await bounded('viewport-read', () => readGuestViewport(guest));
    const rect = { x: 0, y: 0, width: Math.round(viewport.width * viewport.zoom), height: Math.round(viewport.height * viewport.zoom) };
    const expected = { width: Math.round(viewport.width * viewport.ratio), height: Math.round(viewport.height * viewport.ratio) };
    outcome = await withCaptureView(hostViewPort(guest), deps.frameId, () => bounded('capture', () => guest.capturePage(rect)), (image) => judgeImage(image, expected), view, facts);
    if (outcome.refusal?.kind === 'busy') return { ok: false, reason: VIEW_BUSY_REASON };
    if (outcome.refusal?.kind === 'late') return { ok: false, reason: VIEW_LATE_REASON };
    if (outcome.refusal?.kind === 'stalled') return { ok: false, reason: MOVED_STALL_REASON };
    if (outcome.refusal?.kind === 'not-whole') {
      return { ok: false, reason: `FRAME_NOT_VISIBLE: captured no whole image. Onlook moved the canvas view for this capture, and the frame still could not paint whole${shotSize(outcome.value, expected)}. ${notWholeWhy(outcome.refusal)}. ${NO_PARTIAL} ${READ_INSTEAD}` };
    }
    if (outcome.value === undefined) return { ok: false, reason: 'FRAME_NOT_VISIBLE: the frame could not be captured.' };
    current = await bounded('viewport-recheck', () => readGuestViewport(guest));
  } catch (error) {
    return failed(error);
  }
  if (guest.isDestroyed() || guest.getURL() !== url) {
    return { ok: false, reason: 'FRAME_PAGE_CHANGED: the frame navigated during capture. Wait for the page to finish loading, then retry capture_frame.' };
  }
  if (current.width !== viewport.width || current.height !== viewport.height ||
    current.ratio !== viewport.ratio || current.zoom !== viewport.zoom) {
    if (retryResize) return captureRevealedGuest(deps, false);
    return { ok: false, reason: 'FRAME_VIEWPORT_CHANGED: the frame size or display scale changed during capture. Wait for it to settle, then retry capture_frame.' };
  }
  const image = outcome.value;
  const size = image.getSize();
  const expected = { width: Math.round(viewport.width * viewport.ratio), height: Math.round(viewport.height * viewport.ratio) };
  if (judgeImage(image, expected) === 'short') {
    return {
      ok: false,
      reason: `FRAME_NOT_VISIBLE: captured ${String(size.width)}x${String(size.height)}, but the ${String(viewport.width)}x${String(viewport.height)} frame viewport requires ${String(expected.width)}x${String(expected.height)} pixels at device scale ${String(viewport.ratio)}. ${NO_PARTIAL} The frame had not finished painting${facts.viewMoved ? ' under the view Onlook moved to' : ''}; retry capture_frame once, and if it fails again, read the page with evaluate_in_frame.`,
    };
  }
  if (imageRepeatsRows(image)) {
    return { ok: false, reason: `FRAME_NOT_VISIBLE: captured ${String(size.width)}x${String(size.height)}, but its lower rows repeat its top, so part of the frame was never painted. ${NO_PARTIAL} A page whose whole lower part repeats its top exactly also reads this way. ${READ_INSTEAD}` };
  }
  return { ok: true, pngBase64: image.toPNG().toString('base64') };
}

/** Not the preload's world and not the page's: a read the page's own scripts cannot see or shadow. */
const PAGE_READ_WORLD_ID = 2297;

/** No `debugger.attach`: this runs on every `list_frames`, and an open DevTools refuses a second attachment (ONL-2297). */
export async function readGuestPageError(deps: GuestCommandDeps): Promise<GuestReadOutcome> {
  const found = resolveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { read: false, why: 'unaddressable' };
  try {
    return await withFrameAwake(found.guest, () => readAwakeGuestPageError(deps));
  } catch {
    return { read: false, why: 'failed' };
  }
}

async function readAwakeGuestPageError(deps: GuestCommandDeps): Promise<GuestReadOutcome> {
  // `resolveGuest`, as the sibling commands take it: the mirrored url is a debounce stale, so the origin is re-judged live.
  const found = resolveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { read: false, why: 'unaddressable' };

  // Chromium does not dispatch an isolated world's own error out, so a failed script answers `undefined` rather than throwing.
  const asked = (async () => {
    try {
      return (await found.guest.executeJavaScriptInIsolatedWorld(PAGE_READ_WORLD_ID, [
        { code: GUEST_PAGE_READ_SCRIPT },
      ])) as unknown;
    } catch {
      return undefined;
    }
  })();

  try {
    const reading = readingOf(await withDeadline(asked, deps.deadlineMs ?? PAGE_READ_DEADLINE_MS));
    return reading === undefined ? { read: false, why: 'failed' } : { read: true, reading };
  } catch {
    // `asked` never rejects, so the deadline is the only thing left to throw.
    return { read: false, why: 'timeout' };
  }
}

export interface ThumbnailGuestDeps extends GuestCommandDeps {
  /** Required, not defaulted: this path holds a view reference and must not inherit the guest-command deadline. */
  deadlineMs: number;
}

export type GuestImageResult =
  | { ok: true; image: NativeImage }
  | { ok: false; reason: string };

/** A frame at the document's maximum, captured at device ratio 2, base64-encodes past V8's maximum string length: the cap lands before any read (ONL-2471). */
export const THUMBNAIL_SOURCE_MAX_EDGE = 2048;

function capSource(image: NativeImage): NativeImage {
  const { width, height } = image.getSize();
  const longest = Math.max(width, height);
  if (longest <= THUMBNAIL_SOURCE_MAX_EDGE) return image;
  const scale = THUMBNAIL_SOURCE_MAX_EDGE / longest;
  return image.resize({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    quality: 'good',
  });
}

/** Studio's own capture, for the project card: the caller's deadline, and the image itself rather than an encoding (ONL-2471). */
export async function captureGuestForThumbnail(deps: ThumbnailGuestDeps): Promise<GuestImageResult> {
  const found = resolveLiveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { ok: false, reason: found.reason };

  try {
    return await measureSpan(PERF_SPAN.guestCapture, async () => {
      const image = await withDeadline(found.guest.capturePage(), deps.deadlineMs);
      if (image.isEmpty()) return { ok: false as const, reason: 'the page returned no image' };
      return { ok: true as const, image: capSource(image) };
    });
  } catch (error) {
    return { ok: false, reason: messageOf(error) };
  }
}

export interface ClipGuestDeps extends GuestCommandDeps {
  targets: readonly ClipTarget[];
  remembered?: (guest: WebContents) => NativeImage | undefined;
}

type ClipTargetResult = { ok: true; png: Buffer; source: Exclude<PictureSource, 'remembered'>; missed?: ClipTargetFailure };

export type ClipGuestResult =
  | { ok: true; targets: ClipTargetResult[]; retried: boolean }
  | { ok: false; reason: string; retried: boolean; remembered?: Buffer };

const ONE_FRAME_MS = 17;
const CLIP_TIMEOUT_REASON = 'FRAME_CAPTURE_TIMEOUT: the frame did not render within the capture deadline.';

/** The export's hidden-window path: a 1px warm-up, then one whole-viewport capture cropped per target; a compositor error is retried once (ONL-2977). */
export async function clipGuest(deps: ClipGuestDeps): Promise<ClipGuestResult> {
  const readsPage = deps.targets.some((target) => 'selector' in target || 'ref' in target);
  const lookup = readsPage ? resolveGuest : resolveLiveGuest;
  const found = lookup(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { ok: false, reason: found.reason, retried: false };
  let result: ClipGuestResult;
  try {
    result = await withFrameAwake(found.guest, () => clipAwakeGuest(found.guest, deps));
  } catch (error) {
    result = { ok: false, reason: messageOf(error), retried: false };
  }
  if (result.ok) return result;
  const remembered = rememberedTile(found.guest, deps.remembered ?? rememberedFramePicture);
  return remembered === undefined ? result : { ...result, remembered };
}

function tileOf(image: NativeImage, region: { x: number; y: number; width: number; height: number }, ratio: number): Buffer {
  return image
    .crop(devicePixels(region, ratio, image.getSize()))
    .resize({ width: CLIP_TILE.width, height: CLIP_TILE.height, quality: 'best' })
    .toPNG();
}

function rememberedTile(guest: WebContents, remembered: (guest: WebContents) => NativeImage | undefined): Buffer | undefined {
  const image = remembered(guest);
  if (image === undefined || image.isEmpty()) return undefined;
  return tileOf(image, wholeFrameClip(image.getSize()), 1);
}

const FRAME_READ_DEADLINE_MS = 5_000;

export type FrameReadResult = { ok: true; read: FrameRead } | { ok: false; reason: string };

/** Studio's isolated world and no debugger, so a page with DevTools open still reads. */
export async function readGuestFrame(deps: GuestCommandDeps): Promise<FrameReadResult> {
  const found = resolveGuest(deps.webContentsId, deps.frameId, deps.guests ?? REAL_GUESTS, deps.artifactId);
  if (!found.ok) return { ok: false, reason: found.reason };
  try {
    const value = await withFrameAwake(found.guest, () =>
      withDeadline(
        found.guest.executeJavaScriptInIsolatedWorld(PAGE_READ_WORLD_ID, [{ code: frameReadScript() }]),
        deps.deadlineMs ?? FRAME_READ_DEADLINE_MS,
      ),
    );
    const read = frameReadOf(value);
    return read === undefined ? { ok: false, reason: 'the page answered the read with nothing Onlook could list' } : { ok: true, read };
  } catch (error) {
    return { ok: false, reason: messageOf(error) };
  }
}

const SHORT_PREFIX = 'FRAME_NOT_VISIBLE: captured';
const CLIP_OPTIONS = { stayHidden: true, stayAwake: true };

function clipWhole(image: NativeImage, expected: { width: number; height: number }): boolean {
  const size = image.getSize();
  return !image.isEmpty() && Math.abs(size.width - expected.width) <= 1 && Math.abs(size.height - expected.height) <= 1 && !imageRepeatsRows(image);
}

async function clipAwakeGuest(guest: WebContents, deps: ClipGuestDeps): Promise<ClipGuestResult> {
  const deadlineMs = deps.deadlineMs ?? 4_000;
  let retried = false;
  const failed = (reason: string): ClipGuestResult => ({ ok: false, reason, retried });
  const onceMore = async <R>(work: () => Promise<R>): Promise<R> => {
    try {
      return await withDeadline(work(), deadlineMs, CLIP_TIMEOUT_REASON);
    } catch (error) {
      if (retried || !messageOf(error).includes('UnknownVizError')) throw error;
      retried = true;
      await new Promise((resolve) => setTimeout(resolve, ONE_FRAME_MS));
      return withDeadline(work(), deadlineMs, CLIP_TIMEOUT_REASON);
    }
  };
  try {
    const url = guest.getURL();
    const read = await onceMore(async () => {
      await guest.capturePage({ x: 0, y: 0, width: 1, height: 1 }, CLIP_OPTIONS);
      return clipReadOf(
        await guest.executeJavaScriptInIsolatedWorld(PAGE_READ_WORLD_ID, [{ code: clipReadScript(deps.targets) }]),
        deps.targets.length,
      );
    });
    if (read === undefined) return failed('the frame reported no usable viewport');
    const { viewport } = read;
    const expected = { width: Math.round(viewport.width * viewport.ratio), height: Math.round(viewport.height * viewport.ratio) };
    const outcome = await withCaptureView(
      hostViewPort(guest),
      deps.frameId,
      () => onceMore(() => guest.capturePage(undefined, CLIP_OPTIONS)),
      (image) => clipWhole(image, expected) ? 'whole' : 'short',
      captureViewDeps(),
    );
    if (outcome.refusal?.kind === 'busy') return failed(VIEW_BUSY_REASON);
    if (outcome.refusal?.kind === 'late') return failed(VIEW_LATE_REASON);
    if (outcome.refusal?.kind === 'stalled') return failed(CLIP_TIMEOUT_REASON);
    if (outcome.refusal?.kind === 'not-whole') return failed(`${SHORT_PREFIX} no whole image. ${notWholeWhy(outcome.refusal)}.`);
    const image = outcome.value;
    if (image === undefined) return failed('the frame could not be captured');
    if (guest.isDestroyed() || guest.getURL() !== url) return failed('FRAME_PAGE_CHANGED: the frame navigated during capture.');
    const size = image.getSize();
    if (!clipWhole(image, expected)) {
      return failed(imageRepeatsRows(image)
        ? `${SHORT_PREFIX} ${String(size.width)}x${String(size.height)} with its lower rows repeating its top.`
        : `${SHORT_PREFIX} ${String(size.width)}x${String(size.height)}, expected ${String(expected.width)}x${String(expected.height)}.`);
    }
    const whole = (): Buffer => tileOf(image, wholeFrameClip(viewport), viewport.ratio);
    const targets = read.targets.map((found, index): ClipTargetResult => {
      const asked = deps.targets[index];
      if (asked === undefined || !('selector' in asked || 'ref' in asked)) return { ok: true, png: whole(), source: 'frame' };
      const target = targetRead(found ?? undefined);
      if (!target.ok) return { ok: true, png: whole(), source: 'frame', missed: target.reason };
      return { ok: true, png: tileOf(image, frameClip(target.rect, viewport), viewport.ratio), source: 'element' };
    });
    return { ok: true, targets, retried };
  } catch (error) {
    return failed(messageOf(error));
  }
}
