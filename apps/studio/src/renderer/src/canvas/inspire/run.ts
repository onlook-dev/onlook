import { DEFAULT_FRAME_SIZE, type CanvasCamera } from '@studio/events';
import { flagEnabled } from '../../flags/store.js';
import { log as rendererLog } from '../../log.js';
import { telemetryProjectFields } from '../../workspace/store.js';
import { prefersReducedMotion } from '../spring.js';
import { useCanvasStore } from '../store.js';
import { sendTelemetry } from '../telemetry.js';
import {
  BEATS,
  FILM_END,
  REDUCED_BEATS,
  REDUCED_END,
  SELECT_AT,
  canvasOutAt,
  chromeAt,
  outlineAt,
  pageStateAt,
  reducedFadeAt,
  reducedOutlineAt,
  reducedPageStateAt,
  tipAt,
  type Geometry,
  type OutlineState,
  type PageState,
  type Rect,
} from './choreography.js';
import { sample } from '../motion/timeline.js';
import { planSeat, type Box, type Insets } from './seat.js';
import { openInspirationChat } from './chat.js';
import { LAYER } from '../../overlay/layers.js';

const inspireLog = rendererLog('canvas');

const INSPIRATION_URL = 'https://mobbin.com/explore/web';

/** Tall enough to land on Mobbin's Popular Collections row, below its title and category strip. */
const INSPIRATION_FRAME_SIZE = { width: DEFAULT_FRAME_SIZE.width, height: 1680 } as const;

/** What only the mounted canvas knows; registered by `useInspireCanvasSource`. */
export interface InspireCanvasSource {
  camera: () => CanvasCamera;
  pane: () => DOMRect | null;
  insets: () => Insets;
  firstFit: (box: Box, pane: { width: number; height: number }) => CanvasCamera | null;
}

let source: InspireCanvasSource | null = null;

export function setInspireCanvasSource(next: InspireCanvasSource | null): void {
  source = next;
}

interface Run {
  frameId: string;
  geo: Geometry;
  zoom: number;
  reduced: boolean;
  t0: number;
  animations: Animation[];
  outline: HTMLDivElement;
  body: Element | null;
  chrome: Element | null;
  watch: number;
  done: boolean;
  release: () => void;
}

let current: Run | null = null;

const TOOL_SELECTOR = '[data-preview="frame"] button';
const EMPTY_SELECTOR = '[data-testid="canvas-empty"]';

const rectOf = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height });

const px = (n: number) => `${n.toFixed(2)}px`;

function outlineKeyframes(at: (t: number) => OutlineState, end: number): Keyframe[] {
  return sample(end, at).map(({ offset, value: o }) => ({
    offset,
    left: px(o.rect.x),
    top: px(o.rect.y),
    width: px(o.rect.w),
    height: px(o.rect.h),
    borderRadius: px(o.radius),
    opacity: o.opacity,
  }));
}

/** In the node's own units: the viewport scales it by the camera's zoom. */
function pageKeyframes(at: (t: number) => PageState, end: number, zoom: number): Keyframe[] {
  return sample(end, at).map(({ offset, value: p }) => ({
    offset,
    transform: `translate(${px(p.dx / zoom)}, ${px(p.dy / zoom)}) scale(${p.scale.toFixed(5)})`,
    clipPath: `inset(-50% -5% ${p.clipBottom > 0 ? `${(p.clipBottom * 100).toFixed(3)}%` : '-5%'} -5%)`,
    opacity: p.opacity,
  }));
}

function play(run: Run, el: Element, keyframes: Keyframe[], duration: number, id: string): Animation {
  const animation = el.animate(keyframes, { duration, fill: 'both', easing: 'linear' });
  animation.id = id;
  animation.startTime = run.t0;
  run.animations.push(animation);
  return animation;
}

function clock(run: Run, duration: number, id: string, then: () => void): void {
  const animation = play(run, run.outline, [{ visibility: 'visible' }, { visibility: 'visible' }], duration, id);
  animation.finished.then(then, () => undefined);
}

function makeOutline(): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset.testid = 'inspire-outline';
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    opacity: '0',
    outline: '1.5px solid white',
    pointerEvents: 'none',
    contain: 'strict',
    zIndex: String(LAYER.floating),
  });
  document.body.append(el);
  return el;
}

function attachFrame(run: Run): void {
  const end = run.reduced ? REDUCED_END : FILM_END;
  const node = document.querySelector(`.react-flow__node[data-id="${CSS.escape(run.frameId)}"] [data-testid="frame-node"]`);
  if (run.body === null && node !== null) {
    run.body = node;
    const drawn = node.getBoundingClientRect();
    const scale = run.reduced ? 1 : pageStateAt(BEATS.flight[1], run.geo).scale;
    if (Math.abs(drawn.width / scale - run.geo.seat.w) > 1) {
      inspireLog.warn('inspiration frame drew off its planned seat', { planned: Math.round(run.geo.seat.w), drawn: Math.round(drawn.width) });
    }
    play(run, node, pageKeyframes(run.reduced ? reducedPageStateAt : (t) => pageStateAt(t, run.geo), end, run.zoom), end, 'inspire:page');
  }
  const chrome = node?.querySelector('.frame-chrome') ?? null;
  if (chrome !== null && chrome !== run.chrome) {
    run.chrome = chrome;
    const at = run.reduced ? (t: number) => reducedPageStateAt(t).opacity : chromeAt;
    play(run, chrome, sample(end, at).map(({ offset, value }) => ({ offset, opacity: value })), end, 'inspire:chrome');
  }
}

function watchFrame(run: Run): void {
  const tick = () => {
    if (run.done) return;
    attachFrame(run);
    run.watch = requestAnimationFrame(tick);
  };
  run.watch = requestAnimationFrame(tick);
}

/** Jumps every animation to its end; the beats still land in order. */
function finishInspiration(): void {
  const run = current;
  if (run === null || run.done) return;
  attachFrame(run);
  for (const animation of [...run.animations]) animation.finish();
}

function end(run: Run, reveal: boolean): void {
  if (run.done) return;
  run.done = true;
  cancelAnimationFrame(run.watch);
  run.release();
  const state = useCanvasStore.getState();
  if (!state.selectedNodeIds.includes(run.frameId) && state.doc?.nodes[run.frameId] !== undefined) state.selectFrame(run.frameId, false);
  state.endInspiration(run.frameId);
  openInspirationChat(run.frameId);
  requestAnimationFrame(() => {
    for (const animation of run.animations) animation.cancel();
    run.outline.remove();
    if (current === run) current = null;
    if (reveal) useCanvasStore.getState().flyToFrame(run.frameId, true);
  });
}

function listenForInterruption(): () => void {
  const stop = () => finishInspiration();
  const options = { capture: true, passive: true } as const;
  window.addEventListener('pointerdown', stop, options);
  window.addEventListener('wheel', stop, options);
  window.addEventListener('keydown', stop, options);
  window.addEventListener('resize', stop, options);
  const tool = useCanvasStore.getState().tool;
  const unsubscribe = useCanvasStore.subscribe((state) => {
    if (state.tool !== tool) stop();
  });
  return () => {
    window.removeEventListener('pointerdown', stop, options);
    window.removeEventListener('wheel', stop, options);
    window.removeEventListener('keydown', stop, options);
    window.removeEventListener('resize', stop, options);
    unsubscribe();
  };
}

export interface InspirationStart {
  url?: string;
  tip?: Element | null;
  /** The tip's fold has ended: its seat can go. */
  onTipGone?: () => void;
}

/** "Add inspiration": the tool rings and blinks, and a Frame flies out of it to its seat. `null` when there is no canvas to land on. */
export function startInspiration({ url = INSPIRATION_URL, tip = null, onTipGone }: InspirationStart = {}): string | null {
  if (!flagEnabled('blank-first-moment')) {
    onTipGone?.();
    return null;
  }
  const state = useCanvasStore.getState();
  const pane = source?.pane() ?? null;
  const tool = document.querySelector(TOOL_SELECTOR);
  if (current !== null || source === null || pane === null || tool === null || state.doc === null) {
    inspireLog.warn('inspiration dropped', { hasCanvas: source !== null && pane !== null, hasTool: tool !== null, running: current !== null });
    onTipGone?.();
    return null;
  }
  const occupied = state.nodes.map((node) => ({ x: node.position.x, y: node.position.y, width: node.width ?? 0, height: node.height ?? 0 }));
  const plan = planSeat({
    occupied,
    size: INSPIRATION_FRAME_SIZE,
    camera: source.camera(),
    pane: { width: pane.width, height: pane.height },
    insets: source.insets(),
    firstFit: (box) => source?.firstFit(box, { width: pane.width, height: pane.height }) ?? null,
  });
  const geo: Geometry = {
    tool: rectOf(tool.getBoundingClientRect()),
    toolRadius: Number.parseFloat(getComputedStyle(tool).borderTopLeftRadius) || 6,
    seat: { x: pane.left + plan.seat.x, y: pane.top + plan.seat.y, w: plan.seat.w, h: plan.seat.h },
  };
  const reduced = prefersReducedMotion();
  const frameId = state.addFrame(url, { x: plan.box.x, y: plan.box.y }, INSPIRATION_FRAME_SIZE, { select: false });
  state.beginInspiration(frameId);
  if (plan.camera !== null) {
    const camera = plan.camera;
    useCanvasStore.setState((s) => ({ viewportRequest: { camera, seq: (s.viewportRequest?.seq ?? 0) + 1 } }));
  }
  sendTelemetry({ event: 'frame_created', properties: { ...telemetryProjectFields(), method: 'inspiration' } });

  const run: Run = {
    frameId,
    geo,
    zoom: plan.camera?.zoom ?? source.camera().zoom,
    reduced,
    t0: Number(document.timeline.currentTime ?? performance.now()),
    animations: [],
    outline: makeOutline(),
    body: null,
    chrome: null,
    watch: 0,
    done: false,
    release: () => undefined,
  };
  current = run;
  run.release = listenForInterruption();

  const filmEnd = reduced ? REDUCED_END : FILM_END;
  play(run, run.outline, outlineKeyframes(reduced ? (t) => reducedOutlineAt(t, geo) : (t) => outlineAt(t, geo), filmEnd), filmEnd, 'inspire:outline');

  const fadeEnd = reduced ? REDUCED_BEATS.fade[1] : BEATS.tipCollapse[1];
  if (tip !== null) {
    const at = reduced ? (t: number) => ({ opacity: reducedFadeAt(t), scale: 1 }) : tipAt;
    const frames = sample(fadeEnd, at).map(({ offset, value }) => ({ offset, opacity: value.opacity, transform: `scale(${value.scale.toFixed(4)})` }));
    play(run, tip, frames, fadeEnd, 'inspire:tip');
  }
  const empty = document.querySelector(EMPTY_SELECTOR);
  if (empty !== null) {
    const outEnd = reduced ? REDUCED_BEATS.fade[1] : BEATS.canvasOut[1];
    const at = reduced ? (t: number) => ({ opacity: reducedFadeAt(t), dy: 0 }) : canvasOutAt;
    play(run, empty, sample(outEnd, at).map(({ offset, value }) => ({ offset, opacity: value.opacity, transform: `translateY(${px(value.dy)})` })), outEnd, 'inspire:canvas-out');
  }

  clock(run, fadeEnd, 'inspire:tip-gone', () => onTipGone?.());
  clock(run, reduced ? REDUCED_END : SELECT_AT, 'inspire:select', () => {
    if (useCanvasStore.getState().doc?.nodes[frameId] !== undefined) useCanvasStore.getState().selectFrame(frameId, false);
  });
  clock(run, filmEnd, 'inspire:end', () => end(run, plan.reveal));
  watchFrame(run);
  return frameId;
}
