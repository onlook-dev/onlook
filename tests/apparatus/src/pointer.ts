// Sent to the tab, the way a user's pointer goes: the tab's shield takes it and relays the point to the guest (ONL-2375, ONL-2444).

import { until } from './async.js';
import { listTargets, readJson, readTab, tabTarget, withSession, type CdpTarget } from './cdp.js';

export interface InFrame {
  frameId: string;
  selector: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FramePoint {
  /** The tab's viewport px, where the pointer goes. */
  x: number;
  y: number;
  /** The same point in the page's px, where the picker hit-tests. */
  guest: { x: number; y: number };
  /** Tab px per page px: the canvas zoom times the page's own zoom. */
  scale: number;
  over: 'shield' | 'webview';
}

export function tabPointOf(
  element: Rect,
  viewport: { width: number; height: number },
  webview: Rect,
): Omit<FramePoint, 'over'> | string {
  const left = Math.max(element.x, 0);
  const top = Math.max(element.y, 0);
  const right = Math.min(element.x + element.width, viewport.width);
  const bottom = Math.min(element.y + element.height, viewport.height);
  if (right <= left || bottom <= top) return 'no part of it is inside the page viewport; scroll the page first';
  if (viewport.width <= 0 || webview.width <= 0) return 'the frame has no width on the canvas';
  const guest = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const scale = webview.width / viewport.width;
  return { x: webview.x + guest.x * scale, y: webview.y + guest.y * scale, guest, scale };
}

const RECT_OF = `(el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }`;
const DESCRIBE = `(el) => el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 3).map((c) => '.' + c).join('') + (el.dataset?.testid ? '[data-testid=' + el.dataset.testid + ']' : '') : 'nothing'`;
const nodeOf = (frameId: string): string => `document.querySelector('.react-flow__node[data-id="' + CSS.escape(${JSON.stringify(frameId)}) + '"]')`;

type FrameRead = { kind: 'none' } | { kind: 'covered'; cover: string } | { kind: 'live'; webview: Rect; url: string };

async function readFrame(port: string | number, tabId: string, frameId: string): Promise<FrameRead> {
  return readTab<FrameRead>(
    port,
    tabId,
    `(() => {
      const node = ${nodeOf(frameId)};
      if (!node) return { kind: 'none' };
      const webview = node.querySelector('webview');
      if (!webview) return { kind: 'covered', cover: (${DESCRIBE})(node.querySelector('[data-testid^="frame-"]')) };
      let url = '';
      try { url = webview.getURL(); } catch {}
      return { kind: 'live', webview: (${RECT_OF})(webview), url };
    })()`,
  );
}

async function liveFrame(port: string | number, tabId: string, frameId: string): Promise<{ webview: Rect; url: string }> {
  const frame = await readFrame(port, tabId, frameId);
  if (frame.kind === 'none') throw new Error(`No frame ${frameId} is on the canvas in tab ${tabId}.`);
  if (frame.kind === 'covered') throw new Error(`Frame ${frameId} shows ${frame.cover}, not a page: it has no guest to point at.`);
  if (frame.url === '') throw new Error(`Frame ${frameId}'s page has not attached yet; wait for it to load.`);
  return frame;
}

export async function frameGuest(port: string | number, tabId: string, frameId: string): Promise<CdpTarget> {
  const { url } = await liveFrame(port, tabId, frameId);
  const guests = (await listTargets(port)).filter((target) => target.type === 'webview' && target.url === url);
  if (guests.length === 1) return guests[0] as CdpTarget;
  if (guests.length === 0) throw new Error(`No webview target shows ${url}, frame ${frameId}'s page.`);
  throw new Error(`${String(guests.length)} frames show ${url}, so frame ${frameId}'s page cannot be told apart; give each frame its own path, as quickStartFrames does.`);
}

const aimOf = (target: InFrame): string => `${target.selector} in frame ${target.frameId}`;

async function aimInFrame(port: string | number, tabId: string, target: InFrame): Promise<Omit<FramePoint, 'over'>> {
  const { webview } = await liveFrame(port, tabId, target.frameId);
  const guest = await frameGuest(port, tabId, target.frameId);
  const found = await readJson<{ element: Rect; viewport: { width: number; height: number } } | null>(
    guest,
    `(() => {
      const el = document.querySelector(${JSON.stringify(target.selector)});
      if (!el) return null;
      return { element: (${RECT_OF})(el), viewport: { width: innerWidth, height: innerHeight } };
    })()`,
  );
  const aim = aimOf(target);
  if (found === null) throw new Error(`Nothing matches ${aim}.`);
  const point = tabPointOf(found.element, found.viewport, webview);
  if (typeof point === 'string') throw new Error(`Cannot point at ${aim}: ${point}.`);

  const inPage = await readJson<string | null>(
    guest,
    `(() => {
      const el = document.querySelector(${JSON.stringify(target.selector)});
      const hit = document.elementFromPoint(${String(point.guest.x)}, ${String(point.guest.y)});
      return hit && el.contains(hit) ? null : (${DESCRIBE})(hit);
    })()`,
  );
  if (inPage !== null) throw new Error(`Cannot point at ${aim}: ${inPage} covers its centre in the page, so the picker would take that instead.`);
  return point;
}

export async function locateInFrame(port: string | number, tabId: string, target: InFrame): Promise<FramePoint> {
  const point = await aimInFrame(port, tabId, target);
  const inTab = await readTab<{ over: 'shield' | 'webview' | null; hit: string }>(
    port,
    tabId,
    `(() => {
      const hit = document.elementFromPoint(${String(point.x)}, ${String(point.y)});
      const node = ${nodeOf(target.frameId)};
      const over = !hit || !node?.contains(hit) ? null
        : hit.closest('[data-testid="frame-shield"]') ? 'shield'
        : hit.closest('webview') ? 'webview' : null;
      return { over, hit: (${DESCRIBE})(hit) };
    })()`,
  );
  if (inTab.over === null) {
    throw new Error(
      `Cannot point at ${aimOf(target)}: at (${point.x.toFixed(0)}, ${point.y.toFixed(0)}) the tab shows ${inTab.hit}, not the frame's page; revealInFrame brings it into the open.`,
    );
  }
  return { ...point, over: inTab.over };
}

const SHIFT = 8;
const CTRL = 2;

type MouseInput = Record<string, unknown> & { type: string; x: number; y: number };

async function dispatch(port: string | number, tabId: string, events: readonly MouseInput[]): Promise<void> {
  await withSession(await tabTarget(port, tabId), async (send) => {
    for (const event of events) await send('Input.dispatchMouseEvent', event);
  });
}

export async function hoverInFrame(port: string | number, tabId: string, target: InFrame): Promise<FramePoint> {
  const at = await locateInFrame(port, tabId, target);
  await dispatch(port, tabId, [{ type: 'mouseMoved', x: at.x, y: at.y, button: 'none', buttons: 0 }]);
  return at;
}

export async function clickInFrame(
  port: string | number,
  tabId: string,
  target: InFrame,
  { shift = false }: { shift?: boolean } = {},
): Promise<FramePoint> {
  const at = await locateInFrame(port, tabId, target);
  const modifiers = shift ? SHIFT : 0;
  const { x, y } = at;
  await dispatch(port, tabId, [
    { type: 'mouseMoved', x, y, button: 'none', buttons: 0, modifiers },
    { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, modifiers },
    { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, modifiers },
  ]);
  return at;
}

/** `by` is in tab px. */
export async function dragInFrame(
  port: string | number,
  tabId: string,
  target: InFrame,
  { by, steps = 8 }: { by: { x: number; y: number }; steps?: number },
): Promise<{ from: FramePoint; to: { x: number; y: number } }> {
  const from = await locateInFrame(port, tabId, target);
  const to = { x: from.x + by.x, y: from.y + by.y };
  const moves = Array.from({ length: Math.max(1, steps) }, (_, i) => {
    const t = (i + 1) / Math.max(1, steps);
    return { type: 'mouseMoved', x: from.x + by.x * t, y: from.y + by.y * t, button: 'left', buttons: 1 };
  });
  await dispatch(port, tabId, [
    { type: 'mouseMoved', x: from.x, y: from.y, button: 'none', buttons: 0 },
    { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 },
    ...moves,
    { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 },
  ]);
  return { from, to };
}

export interface PickerOutline {
  hovered: boolean;
  selected: boolean;
}

export async function pickerOutline(port: string | number, tabId: string, target: InFrame): Promise<PickerOutline> {
  const outline = await readJson<PickerOutline | null>(
    await frameGuest(port, tabId, target.frameId),
    `(() => {
      const el = document.querySelector(${JSON.stringify(target.selector)});
      if (!el) return null;
      const rectOf = ${RECT_OF};
      const at = rectOf(el);
      const on = (box) => box.style.display !== 'none' && ['x', 'y', 'width', 'height'].every((k) => Math.abs(rectOf(box)[k] - at[k]) < 1);
      const boxes = (kind) => [...document.querySelectorAll('[data-studio-picker="' + kind + '"]')];
      return { hovered: boxes('hover').some(on), selected: boxes('selected').some(on) };
    })()`,
  );
  if (outline === null) throw new Error(`Nothing matches ${target.selector} in frame ${target.frameId}.`);
  return outline;
}

/** In the tab's viewport px. */
export async function frameBox(port: string | number, tabId: string, frameId: string): Promise<Rect> {
  const box = await readTab<Rect | null>(port, tabId, `(() => { const node = ${nodeOf(frameId)}; return node ? (${RECT_OF})(node) : null; })()`);
  if (box === null) throw new Error(`No frame ${frameId} is on the canvas in tab ${tabId}.`);
  return box;
}

export async function canvasZoom(port: string | number, tabId: string): Promise<number> {
  const zoom = await readTab<number | null>(
    port,
    tabId,
    `(() => { const viewport = document.querySelector('.react-flow__viewport'); return viewport ? new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a : null; })()`,
  );
  if (zoom === null) throw new Error(`Tab ${tabId} shows no canvas.`);
  return zoom;
}

// React Flow's macOS pinch: a ctrl-wheel of `deltaY` scales the zoom by 2^(-deltaY × 0.02); each step re-measures it.
const PINCH_GAIN = 0.02;
const ZOOM_TOLERANCE = 0.005;

export async function zoomCanvas(
  port: string | number,
  tabId: string,
  zoom: number,
  { around }: { around?: InFrame } = {},
): Promise<number> {
  const at = around ? await locateInFrame(port, tabId, around) : await canvasCentre(port, tabId);
  let gain = PINCH_GAIN;
  let current = await canvasZoom(port, tabId);
  for (let step = 0; step < 6 && Math.abs(current / zoom - 1) > ZOOM_TOLERANCE; step++) {
    const deltaY = -Math.log2(zoom / current) / gain;
    await dispatch(port, tabId, [{ type: 'mouseWheel', x: at.x, y: at.y, deltaX: 0, deltaY, modifiers: CTRL }]);
    const before = current;
    current = await until(() => canvasZoom(port, tabId), (read) => read !== before, {
      what: `the canvas to leave zoom ${before.toFixed(3)} on its way to ${String(zoom)}`,
      limitMs: 3_000,
      everyMs: 20,
    });
    gain = Math.log2(current / before) / -deltaY;
  }
  if (Math.abs(current / zoom - 1) > ZOOM_TOLERANCE) throw new Error(`The canvas reached zoom ${current.toFixed(3)}, not ${String(zoom)}.`);
  return current;
}

async function canvasCentre(port: string | number, tabId: string): Promise<{ x: number; y: number }> {
  const centre = await readTab<{ x: number; y: number; hit: string } | null>(
    port,
    tabId,
    `(() => {
      const pane = document.querySelector('.react-flow');
      if (!pane) return null;
      const r = pane.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { x, y, hit: pane.contains(hit) && !hit.closest('webview') ? '' : (${DESCRIBE})(hit) };
    })()`,
  );
  if (centre === null) throw new Error(`Tab ${tabId} shows no canvas.`);
  if (centre.hit !== '') throw new Error(`The centre of tab ${tabId}'s canvas shows ${centre.hit}, so a wheel there would not reach the canvas.`);
  return centre;
}

// React Flow's scroll-pan moves the canvas by half the wheel's delta; a first guess only, each step re-measures it.
const PAN_GAIN = 0.5;

export async function revealInFrame(port: string | number, tabId: string, target: InFrame): Promise<FramePoint> {
  const reachable = await locateInFrame(port, tabId, target).catch(() => null);
  if (reachable !== null) return reachable;
  const centre = await canvasCentre(port, tabId);
  const gain = { x: PAN_GAIN, y: PAN_GAIN };
  let point = await aimInFrame(port, tabId, target);
  for (let step = 0; step < 5; step++) {
    const miss = { x: centre.x - point.x, y: centre.y - point.y };
    if (Math.abs(miss.x) < 2 && Math.abs(miss.y) < 2) break;
    const delta = { x: -miss.x / gain.x, y: -miss.y / gain.y };
    await dispatch(port, tabId, [{ type: 'mouseWheel', x: centre.x, y: centre.y, deltaX: delta.x, deltaY: delta.y }]);
    const before = point;
    point = await until(() => aimInFrame(port, tabId, target), (read) => read.x !== before.x || read.y !== before.y, {
      what: `the canvas to scroll ${aimOf(target)} toward its centre`,
      limitMs: 3_000,
      everyMs: 20,
    });
    if (Math.abs(delta.x) > 1) gain.x = (point.x - before.x) / -delta.x;
    if (Math.abs(delta.y) > 1) gain.y = (point.y - before.y) / -delta.y;
  }
  return locateInFrame(port, tabId, target);
}
