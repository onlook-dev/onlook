import { createHash } from 'node:crypto';
import type { NativeImage, WebContents } from 'electron';
import {
  IPC_EMIT,
  IPC_SEND,
  paintsWhole,
  repeatedRowsShift,
  type CaptureGeometry,
  type CaptureViewAnswer,
  type CaptureViewRequest,
  type FrameCaptureStep,
  type NotWholeWhy,
} from '@studio/events';
import { onView } from '../ipc/bridge.js';

const CHECK_LIMIT_MS = 2_500;
const STEP_LIMIT_MS = 1_000;
const PAINT_LIMIT_MS = 400;
export const PAINT_RETRY_MS = 17;
export const MOVED_SHOOT_LIMIT_MS = 1_000;

export interface RevealFacts {
  viewMoved: boolean;
  /** Excludes `captureMs`, the time inside the capture attempts. */
  revealMs: number;
  captureMs?: number;
  stalledStep?: FrameCaptureStep;
  geometry: CaptureGeometry | null;
  /** From the moved camera's answer to the last capture, and how many captures that took. */
  paintMs?: number;
  attempts?: number;
  restore?: 'restored' | 'kept' | 'silent';
  /** How long the still picture covered the tab; 0 when none was held. */
  freezeMs?: number;
  moveAnsweredLate?: boolean;
}

export type RevealRefusal =
  | { kind: 'busy' }
  | { kind: 'late' }
  | { kind: 'stalled' }
  | { kind: 'not-whole'; why: NotWholeWhy | 'hidden-tab' };

/** `failed`: the tab is shown and Studio could not hold it still, so the view must not move. */
export type TabFreeze = { state: 'held'; lift(): void } | { state: 'not-shown' } | { state: 'failed' };

/** One tab renderer, the one that draws the frame's canvas. */
export interface CaptureViewPort {
  id: number;
  ask(request: CaptureViewRequest, limitMs: number): Promise<CaptureViewAnswer | null>;
  /** Holds the tab's last picture over it. */
  freeze(): Promise<TabFreeze>;
  /** Runs a hidden tab's lifecycle once before a capture. */
  warm(): Promise<void>;
}

export interface CaptureViewDeps {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export type Judged = 'whole' | 'short' | 'final';

export interface CaptureViewOutcome<T> {
  value?: T;
  refusal?: RevealRefusal;
}

const STALLED = Symbol('stalled');

const tails = new Map<number, Promise<void>>();
let nextRequestId = 0;

/** FIFO per tab: no capture runs under another's moved camera. */
async function enter(id: number): Promise<() => void> {
  const ahead = tails.get(id) ?? Promise.resolve();
  let release = (): void => {};
  const mine = new Promise<void>((resolve) => { release = resolve; });
  const tail = ahead.then(() => mine);
  tails.set(id, tail);
  void tail.then(() => { if (tails.get(id) === tail) tails.delete(id); });
  await ahead;
  return release;
}

export async function withCaptureView<T>(
  port: CaptureViewPort | undefined,
  frameId: string,
  shoot: () => Promise<T>,
  judge: (value: T) => Judged,
  deps: CaptureViewDeps,
  facts?: RevealFacts,
): Promise<CaptureViewOutcome<T>> {
  const timed = async (): Promise<T> => {
    const started = deps.now();
    try {
      return await shoot();
    } finally {
      if (facts) facts.captureMs = (facts.captureMs ?? 0) + deps.now() - started;
    }
  };
  if (port === undefined) return { value: await timed() };
  const release = await enter(port.id);
  const began = deps.now();
  nextRequestId += 1;
  const requestId = nextRequestId;
  let sentMove = false;
  let unfreeze: (() => void) | undefined;
  let frozeAt = 0;
  try {
    const checked = await port.ask({ requestId, frameId, step: 'check' }, CHECK_LIMIT_MS);
    if (checked?.state === 'busy') return { refusal: { kind: 'busy' } };
    if (checked?.state !== 'needs-move') {
      if (facts && checked?.state === 'in-place') facts.geometry = checked.geometry;
      return { value: await timed() };
    }
    if (!checked.geometry.hidden) {
      const freeze = await port.freeze().catch((): TabFreeze => ({ state: 'failed' }));
      if (freeze.state === 'failed') return { value: await timed() };
      if (freeze.state === 'held') {
        unfreeze = freeze.lift;
        frozeAt = deps.now();
      }
    }
    sentMove = true;
    const answer = await port.ask({ requestId, frameId, step: 'move' }, STEP_LIMIT_MS);
    if (answer === null) {
      if (facts) facts.moveAnsweredLate = true;
      return { refusal: { kind: 'late' } };
    }
    if (answer.state === 'busy') return { refusal: { kind: 'busy' } };
    if (answer.state !== 'moved') return { value: await timed() };
    const geometry = answer.geometry;
    if (facts) {
      facts.viewMoved = true;
      facts.geometry = geometry;
    }
    const whole = paintsWhole(geometry);
    if (!whole.whole) return { refusal: { kind: 'not-whole', why: whole.why } };
    const painting = deps.now();
    const paint = async (): Promise<T | typeof STALLED> => {
      const left = MOVED_SHOOT_LIMIT_MS - (deps.now() - painting);
      if (left <= 0) return STALLED;
      const shot = (async () => {
        if (geometry.hidden) await port.warm().catch(() => undefined);
        return timed();
      })();
      shot.catch(() => undefined);
      return Promise.race([shot, deps.sleep(left).then((): typeof STALLED => STALLED)]);
    };
    let value = await paint();
    let attempts = 1;
    let judged: Judged | typeof STALLED = value === STALLED ? STALLED : judge(value);
    while (judged === 'short' && deps.now() - painting < PAINT_LIMIT_MS) {
      await deps.sleep(PAINT_RETRY_MS);
      value = await paint();
      judged = value === STALLED ? STALLED : judge(value);
      attempts += 1;
    }
    if (facts) {
      facts.paintMs = Math.round(deps.now() - painting);
      facts.attempts = attempts;
    }
    if (value === STALLED) {
      if (facts) facts.stalledStep = 'capture';
      return { refusal: { kind: 'stalled' } };
    }
    if (judged === 'short' && geometry.hidden) return { value, refusal: { kind: 'not-whole', why: 'hidden-tab' } };
    return { value };
  } finally {
    if (sentMove) {
      const restored = await port.ask({ requestId, frameId, step: 'restore' }, STEP_LIMIT_MS);
      if (facts) facts.restore = restored?.state === 'kept' ? 'kept' : restored === null ? 'silent' : 'restored';
    }
    unfreeze?.();
    if (facts) facts.freezeMs = unfreeze === undefined ? 0 : Math.round(deps.now() - frozeAt);
    if (facts) facts.revealMs = Math.round(deps.now() - began - (facts.captureMs ?? 0));
    release();
  }
}

/** The rows of an image a capture painted past its surface repeat its top (ONL-3031). */
export function imageRepeatsRows(image: Pick<NativeImage, 'getSize' | 'toBitmap'>): boolean {
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap();
  const stride = width * 4;
  if (height < 8 || bitmap.length < stride * height) return false;
  const rows: string[] = [];
  for (let row = 0; row < height; row += 1) {
    rows.push(createHash('sha1').update(bitmap.subarray(row * stride, (row + 1) * stride)).digest('base64'));
  }
  return repeatedRowsShift(rows) !== null;
}

type TabFreezer = (contentsId: number) => Promise<TabFreeze>;

let tabFreezer: TabFreezer | undefined;

export function seatTabFreezer(freezer: TabFreezer | undefined): void {
  tabFreezer = freezer;
}

export function captureViewPort(host: WebContents): CaptureViewPort {
  return {
    id: host.id,
    ask: (request, limitMs) => new Promise((resolve) => {
      if (host.isDestroyed()) {
        resolve(null);
        return;
      }
      const done = (answer: CaptureViewAnswer | null): void => {
        clearTimeout(timer);
        if (!host.isDestroyed()) unhear();
        resolve(answer);
      };
      const listen = (_event: unknown, answer: CaptureViewAnswer): void => {
        if (answer?.requestId === request.requestId && answer.step === request.step) done(answer);
      };
      const timer = setTimeout(() => done(null), limitMs);
      const unhear = onView(host, IPC_SEND.canvasCaptureViewed, listen);
      host.send(IPC_EMIT.canvasCaptureView, request);
    }),
    freeze: () => tabFreezer?.(host.id) ?? Promise.resolve({ state: 'not-shown' }),
    warm: async () => {
      if (!host.isDestroyed()) await host.capturePage({ x: 0, y: 0, width: 1, height: 1 }, { stayHidden: true });
    },
  };
}
