// The user's page is not mutated: outlines are boxes in an overlay of ours, not a class on their element.
import { ipcRenderer } from 'electron';
import {
  anchorGeometryFor,
  GUEST_CHANNEL_TO_GUEST,
  GUEST_CHANNEL_TO_HOST,
  FRAME_SCROLL_CHANNEL,
  hoverReportFor,
  measureBetween,
  measureLineBox,
  MEASURE_TAG_STYLE,
  type MeasureSegment,
  MAX_ELEMENT_SELECTIONS,
  COMPONENT_INK,
  PICKER_INK,
  type CanvasZoomAction,
  type ElementEvidence,
  type ElementSelectionSeed,
  scrubException,
  seededAnchorId,
  seedOf,
  setOutlineVisibility,
  type PickerToGuest,
  type PickerToHost,
} from '@studio/events';
import { domPathOf, evidenceOf, mintPickId, relocate, type PickNode } from './guest-evidence.js';
import { spacingBands, type Band, type Sides } from './spacing.js';
import { createOverlayRecovery, createPageObservation, isPickerNode, mutationTouchesPage, restorePickerOverlay } from './guest-mutations.js';
import { createGuestScrollController } from './guest-scroll.js';

// An SPA root is empty at `dom-ready`; a staleness verdict before this wait flashes every chip stale on reload.
const SETTLE_MS = 400;
/** How long the page must be structurally QUIET before its map is worth re-reading. Trailing, so a burst sends one report and a page that never settles sends none (ONL-2563). */
const SETTLE_REPORT_MS = 1_000;
const REFLOW_DEBOUNCE_MS = 50;

interface Held {
  seed: ElementSelectionSeed;
  evidence: ElementEvidence | null;
  element: Element | null;
  stale: boolean;
  box: HTMLElement;
  /** The margin and padding shading, redrawn wherever the box is placed. */
  spacing: HTMLElement;
  generation: number;
}

let armed = false;
let acceptingPicks = false;
let currentGeneration = 0;
let currentSeedGeneration = 0;
let hovered: Element | null = null;
let outlinesVisible = true;
/** Off until the host's open diagnostics gate turns it on (ONL-2455). */
let hoverReportsEnabled = false;
let hitTests = 0;
/** The one held id whose box is reported to the host (ONL-2455): the unshifted pick, never a ⇧-added chip. */
let anchorId: string | null = null;
let settledAt = 0;
const held = new Map<string, Held>();
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let heldResizeObserver: ResizeObserver | null = null;

let overlay: HTMLElement | null = null;
let hoverBox: HTMLElement | null = null;
let measuring = false;
let measureLayer: HTMLElement | null = null;

// An XML document (SVG, RSS, a sitemap) mints elements outside the HTML namespace, which carry no `.style` for the overlay to set, so the picker stays off there (ONL-2835).
const canDrawOverlay = 'style' in document.createElement('div');

// `pointer-events: none` is inherited by every box; without it `elementFromPoint` returns our own box.
function ensureOverlay(): HTMLElement {
  if (overlay !== null) {
    restorePickerOverlay(overlay, document.documentElement);
    return overlay;
  }
  const el = document.createElement('div');
  el.setAttribute('data-studio-picker', 'overlay');
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2147483647',
  });
  document.documentElement.appendChild(el);
  overlay = el;
  hoverBox = null;
  return el;
}

// `1/zoom` like `frameRingScale` in `canvas/frame/geometry.ts`, not the resize handles' `max(1/zoom, 1)`.
let outlineScale = 1;

const BORDER_PX = { hover: 1, selected: 2, component: 1 } as const;

function borderWidth(kind: 'hover' | 'selected' | 'component'): string {
  return `${String(BORDER_PX[kind] * outlineScale)}px`;
}

function rescaleBoxes(): void {
  if (hoverBox) hoverBox.style.borderWidth = borderWidth('hover');
  if (componentBox) componentBox.style.borderWidth = borderWidth('component');
  for (const entry of held.values()) {
    entry.box.style.borderWidth = borderWidth('selected');
    paintSpacing(entry.spacing, entry.stale ? null : entry.element);
  }
  // The tags are counter-scaled at paint; a zoom without a repaint leaves them at the old zoom's size.
  paintMeasure();
}

function showOutlines(visible: boolean): void {
  outlinesVisible = visible;
  if (hoverBox) setOutlineVisibility(hoverBox.style, visible);
  if (componentBox) setOutlineVisibility(componentBox.style, visible);
  for (const entry of held.values()) {
    setOutlineVisibility(entry.box.style, visible);
    setOutlineVisibility(entry.spacing.style, visible);
  }
  paintMeasure();
}

function makeBox(kind: 'hover' | 'selected' | 'component'): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute('data-studio-picker', kind);
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    display: 'none',
    // A box minted while suppressed — a re-seed in Interact — starts hidden.
    visibility: outlinesVisible ? 'visible' : 'hidden',
    borderWidth: borderWidth(kind),
    // Not a `border` shorthand: `rescaleBoxes` re-sets the width per zoom.
    borderStyle: 'solid',
    borderColor: kind === 'component' ? COMPONENT_INK : PICKER_INK,
  });
  ensureOverlay().appendChild(box);
  return box;
}

function place(box: HTMLElement, element: Element | null): DOMRect | null {
  if (!element?.isConnected) {
    box.style.display = 'none';
    return null;
  }
  const rect = element.getBoundingClientRect();
  Object.assign(box.style, {
    display: 'block',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  return rect;
}

/** Sent at the ENTRY's generation, like `refreshed` and `staleness`: the host's current one is advanced by every arm and would be dropped. */
function placeHeld(id: string, entry: Held, element: Element | null): void {
  const rect = place(entry.box, element);
  paintSpacing(entry.spacing, rect === null ? null : element);
  if (rect === null) return;
  const message = anchorGeometryFor(anchorId, id, {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  });
  if (message) send(message, entry.generation);
}

function reflow(): void {
  if (!canDrawOverlay) return;
  if (hoverBox) place(hoverBox, hovered);
  if (componentBox) paintComponent();
  for (const [id, entry] of held) placeHeld(id, entry, entry.stale ? null : entry.element);
  paintMeasure();
}

/** Onlook's box-model shading: margin blue, padding green, each a faint wash under a hairline hatch. */
const SPACING_INK: Record<Band['kind'], string> = {
  margin: 'color(display-p3 0.25 0.55 1)',
  padding: 'color(display-p3 0.2 0.8 0.35)',
};

/** One screen-pixel line per tile, drawn by SVG: a sub-pixel gradient stripe rounds to a different width on every repeat. */
const HATCH_TILE = 6;
/** Faint enough that a band's number reads over it. */
const HATCH_OPACITY = 0.35;

function hatchTile(ink: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${String(HATCH_TILE)}' height='${String(HATCH_TILE)}'><path d='M-1 1L1 -1M0 ${String(HATCH_TILE)}L${String(HATCH_TILE)} 0M${String(HATCH_TILE - 1)} ${String(HATCH_TILE + 1)}L${String(HATCH_TILE + 1)} ${String(HATCH_TILE - 1)}' stroke='${ink}' stroke-opacity='${String(HATCH_OPACITY)}' stroke-width='0.75'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Screen px below which a band's number would crowd it. */
const SPACING_LABEL_MIN = 12;

function makeSpacingLayer(): HTMLElement {
  const layer = document.createElement('div');
  layer.setAttribute('data-studio-picker', 'spacing');
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    // Under the outlines, whichever was minted first.
    zIndex: '-1',
    visibility: outlinesVisible ? 'visible' : 'hidden',
  });
  ensureOverlay().appendChild(layer);
  return layer;
}

function paintSpacing(layer: HTMLElement, element: Element | null): void {
  layer.replaceChildren();
  if (!element?.isConnected) return;
  const style = getComputedStyle(element);
  const sides = (property: (side: string) => string): Sides => ({
    top: Number.parseFloat(style.getPropertyValue(property('top'))) || 0,
    right: Number.parseFloat(style.getPropertyValue(property('right'))) || 0,
    bottom: Number.parseFloat(style.getPropertyValue(property('bottom'))) || 0,
    left: Number.parseFloat(style.getPropertyValue(property('left'))) || 0,
  });
  const bands = spacingBands(
    element.getBoundingClientRect(),
    sides((side) => `margin-${side}`),
    sides((side) => `border-${side}-width`),
    sides((side) => `padding-${side}`),
  );
  const tile = HATCH_TILE * outlineScale;
  for (const band of bands) {
    const ink = SPACING_INK[band.kind];
    const shade = document.createElement('div');
    Object.assign(shade.style, {
      position: 'fixed',
      left: `${String(band.left)}px`,
      top: `${String(band.top)}px`,
      width: `${String(band.width)}px`,
      height: `${String(band.height)}px`,
      backgroundColor: `color-mix(in srgb, ${ink} 10%, transparent)`,
      backgroundImage: hatchTile(ink),
      backgroundSize: `${String(tile)}px ${String(tile)}px`,
      // Phased to the viewport, so the hatch runs unbroken from one band into the next.
      backgroundPosition: `${String(-band.left)}px ${String(-band.top)}px`,
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
    });
    const thickness = band.side === 'top' || band.side === 'bottom' ? band.height : band.width;
    if (thickness / outlineScale >= SPACING_LABEL_MIN) {
      const label = document.createElement('span');
      Object.assign(label.style, {
        color: ink,
        font: MEASURE_TAG_STYLE.font,
        fontVariantNumeric: 'tabular-nums',
        transform: `scale(${String(outlineScale)})`,
      });
      label.textContent = String(Math.round(band.value));
      shade.append(label);
    }
    layer.append(shade);
  }
}

// Component paths are cached per load, avoiding debugger attachment on hover (ONL-2563).
let componentPaths: Set<string> = new Set();
let componentBox: HTMLElement | null = null;

/** The INNERMOST instance only, so nesting draws one box rather than a stack of them. */
function componentAncestor(element: Element | null): Element | null {
  if (element === null || componentPaths.size === 0) return null;
  let at: Element | null = element;
  let hops = 0;
  while (at !== null && hops < 64) {
    hops += 1;
    if (componentPaths.has(domPathOf(at as unknown as PickNode))) return at;
    at = at.parentElement;
  }
  return null;
}

/** The element the designer is HOLDING, and only the hovered one until they hold something: a box that left with the pointer answered nothing (ONL-2563). */
function componentSubject(): Element | null {
  // The LAST held, not the first: a re-seed clears the anchor, and the newest pick is the subject.
  const anchor = anchorId === null ? undefined : held.get(anchorId);
  const entry = anchor ?? [...held.values()].at(-1);
  if (entry !== undefined && !entry.stale && entry.element !== null) return entry.element;
  return hovered;
}

function paintComponent(): void {
  restorePickerOverlay(overlay, document.documentElement);
  const instance = componentAncestor(componentSubject());
  if (instance === null) {
    if (componentBox) componentBox.style.display = 'none';
    return;
  }
  // Minted BEFORE the hover box would be, so the overlay stacks it underneath.
  if (!componentBox?.isConnected) componentBox = makeBox('component');
  place(componentBox, instance);
}

function paintHover(element: Element | null): void {
  restorePickerOverlay(overlay, document.documentElement);
  hovered = element;
  paintComponent();
  if (!hoverBox?.isConnected) hoverBox = makeBox('hover');
  place(hoverBox, element);
  paintMeasure();
}

function clearHover(): void {
  hovered = null;
  if (hoverBox) hoverBox.style.display = 'none';
  paintComponent();
  paintMeasure();
}

function measureFrom(): Element | null {
  const anchor = anchorId === null ? undefined : held.get(anchorId);
  const entry = anchor ?? held.values().next().value;
  return entry?.stale === false ? entry.element : null;
}

function paintMeasure(): void {
  restorePickerOverlay(overlay, document.documentElement);
  if (measureLayer?.parentElement !== overlay || !measureLayer?.isConnected) {
    measureLayer = document.createElement('div');
    measureLayer.setAttribute('data-studio-picker', 'measure');
    ensureOverlay().appendChild(measureLayer);
  }
  measureLayer.replaceChildren();
  const from = measureFrom();
  if (!measuring || !outlinesVisible || hovered === null || from === null || from === hovered) return;
  if (!from.isConnected || !hovered.isConnected) return;
  for (const measurement of measureBetween(from.getBoundingClientRect(), hovered.getBoundingClientRect())) {
    measureLayer.append(measureLine(measurement.line, false));
    if (measurement.support) measureLayer.append(measureLine(measurement.support, true));
    const tag = document.createElement('div');
    Object.assign(tag.style, MEASURE_TAG_STYLE, {
      position: 'fixed',
      transformOrigin: 'center',
      left: `${String((measurement.line.x1 + measurement.line.x2) / 2)}px`,
      top: `${String((measurement.line.y1 + measurement.line.y2) / 2)}px`,
      transform: `translate(-50%, -50%) scale(${String(outlineScale)})`,
    });
    tag.textContent = String(Math.round(measurement.value));
    measureLayer.append(tag);
  }
}

function measureLine(segment: MeasureSegment, isDashed: boolean): HTMLElement {
  const line = document.createElement('div');
  const box = measureLineBox(segment, outlineScale, isDashed);
  Object.assign(line.style, {
    position: 'fixed',
    left: `${String(box.left)}px`,
    top: `${String(box.top)}px`,
    width: `${String(box.width)}px`,
    height: `${String(box.height)}px`,
    background: box.background,
  });
  return line;
}

type PickerToHostWithoutGeneration = PickerToHost extends infer Message
  ? Message extends PickerToHost
    ? Omit<Message, 'generation'>
    : never
  : never;

function send(message: PickerToHostWithoutGeneration, generation = currentGeneration): void {
  ipcRenderer.sendToHost(GUEST_CHANNEL_TO_HOST, {
    ...message,
    generation,
  } satisfies PickerToHost);
}

function targetAt(x: number, y: number): Element | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (el.closest('[data-studio-picker]')) return null;
  return el;
}

/** The one hit-test the relay pays for, counted so the host can hold the two numbers against each other (ONL-2455). */
function hoverAt(x: number, y: number): void {
  const target = targetAt(x, y);
  hitTests += 1;
  paintHover(target);
  // Returns before the path is built: a closed gate pays one test, never a walk up the tree.
  if (!hoverReportsEnabled) return;
  const report = hoverReportFor(
    hoverReportsEnabled,
    target === null
      ? null
      : { tag: target.tagName.toLowerCase(), domPath: domPathOf(target as unknown as PickNode) },
    hitTests,
  );
  if (report) send(report);
}

function heldIdFor(element: Element): string | null {
  for (const [id, entry] of held) if (entry.element === element) return id;
  return null;
}

function addHeld(evidence: ElementEvidence, element: Element): Held {
  const entry: Held = {
    seed: seedOf(evidence),
    evidence,
    element,
    stale: false,
    box: makeBox('selected'),
    spacing: makeSpacingLayer(),
    generation: currentGeneration,
  };
  held.set(evidence.id, entry);
  syncMutationObservation();
  heldResizeObserver?.observe(element);
  place(entry.box, element);
  paintSpacing(entry.spacing, element);
  return entry;
}

function dropHeld(id: string): void {
  const entry = held.get(id);
  if (!entry) return;
  if (entry.element) heldResizeObserver?.unobserve(entry.element);
  entry.box.remove();
  entry.spacing.remove();
  held.delete(id);
  syncMutationObservation();
  if (anchorId === id) anchorId = null;
  paintComponent();
}

function clearHeld(): void {
  for (const id of held.keys()) dropHeld(id);
  cancelSettleTimer();
}

// Picking is coordinate relay, not in-page pointer handling: that needs the host's shield down, which fires the page's `:hover` and kills pan and zoom over a frame.
// `isTrusted` keeps a page's own `dispatchEvent` from forging picks into the agent's prompt; `pickPath` arrives only from the embedder, sent from the diagnostics gate (ONL-2372).
function swallow(event: Event): boolean {
  if (!armed) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  return event.isTrusted;
}

function selectAt(x: number, y: number, shiftHeld: boolean): void {
  if (!acceptingPicks) return;
  const element = targetAt(x, y);
  if (!element) return;
  select(element, shiftHeld);
}

function selectPath(selector: string, shiftHeld: boolean): void {
  if (!acceptingPicks) return;
  let element: Element | null;
  try {
    element = document.querySelector(selector);
  } catch {
    return;
  }
  if (!element || element.closest('[data-studio-picker]')) return;
  select(element, shiftHeld);
}

function select(element: Element, shiftHeld: boolean): void {
  const existing = heldIdFor(element);
  if (shiftHeld) {
    if (existing) {
      dropHeld(existing);
      send({ type: 'deselected', id: existing });
      return;
    }
    capture(element, true);
    return;
  }

  clearHeld();
  capture(element, false);
  // The mode outlives the pick; the picker ends via the toggle, Escape, or sending.
}

function capture(element: Element, shiftHeld: boolean): void {
  const evidence = evidenceOf(element as unknown as PickNode, mintPickId(crypto), location.href);
  // The cap holds the box here and the host names the refusal: a pick the host
  // never hears is a refusal the user cannot see (ONL-2455).
  if (shiftHeld && held.size >= MAX_ELEMENT_SELECTIONS) {
    send({ type: 'picked', evidence, shiftHeld });
    return;
  }
  const entry = addHeld(evidence, element);
  send({ type: 'picked', evidence, shiftHeld });
  if (shiftHeld) return;
  // After the pick, never before it: the host admits geometry only for an id it already holds.
  anchorId = evidence.id;
  placeHeld(evidence.id, entry, element);
  paintComponent();
}

// Keyed by `event.code`, not `event.key`: with shift held the key is `!`, `+`, `_`, and differs again per layout (ONL-1979).
const ZOOM_CHORDS: Record<string, CanvasZoomAction | undefined> = {
  Equal: 'in',
  Minus: 'out',
  Digit0: 'reset',
  Digit1: 'fit',
  Digit2: 'selection',
};

// Main's `before-input-event` cannot see page focus and would swallow `!` from the user's text fields; this check is why the chord relay lives in the guest (ONL-1979).
function isTypingTarget(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (active instanceof HTMLElement && active.isContentEditable) return true;
  const tag = active.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

let isSpacePanRelayed = false;

function isPlainSpace(event: KeyboardEvent): boolean {
  return event.code === 'Space' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
}

function releaseSpacePan(): void {
  if (!isSpacePanRelayed) return;
  isSpacePanRelayed = false;
  send({ type: 'space-pan', held: false });
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') releaseSpacePan();
}

function onKeyDown(event: KeyboardEvent): void {
  // A text field keeps its Space; anywhere else the page's own Space (scroll, button press) gives way to the canvas pan.
  if (event.isTrusted && isPlainSpace(event) && (isSpacePanRelayed || !isTypingTarget())) {
    event.preventDefault();
    event.stopPropagation();
    if (!isSpacePanRelayed) {
      isSpacePanRelayed = true;
      send({ type: 'space-pan', held: true });
    }
    return;
  }

  // Read before `swallow`: in INTERACT `swallow` is false and the host hears nothing, which is the case this relay exists for.
  if (
    event.shiftKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.repeat &&
    !isTypingTarget()
  ) {
    const action = ZOOM_CHORDS[event.code];
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'zoom-chord', action });
      return;
    }
  }

  if (!swallow(event)) return;
  if (event.key === 'Escape') send({ type: 'escape' });
}

function reresolve(): void {
  restorePickerOverlay(overlay, document.documentElement);
  if (held.size === 0) return;
  const settled = Date.now() >= settledAt;
  for (const [id, entry] of held) {
    const found = relocate(
      entry.seed,
      document as unknown as Parameters<typeof relocate>[1],
      entry.element as unknown as PickNode | null,
    );
    const element = (found as unknown as Element | null) ?? null;
    const stale = element === null;
    // Before the DOM settles a miss is "not rendered yet", not "gone".
    if (stale && !settled) continue;
    if (entry.element !== element) {
      if (entry.element) heldResizeObserver?.unobserve(entry.element);
      if (element) heldResizeObserver?.observe(element);
      entry.element = element;
    }
    placeHeld(id, entry, element);
    if (element !== null) {
      const evidence = evidenceOf(element as unknown as PickNode, id, location.href);
      if (entry.evidence === null || JSON.stringify(evidence) !== JSON.stringify(entry.evidence)) {
        entry.evidence = evidence;
        entry.seed = seedOf(evidence);
        send({ type: 'refreshed', evidence }, entry.generation);
      }
    }
    if (stale !== entry.stale) {
      entry.stale = stale;
      send({ type: 'staleness', id, stale }, entry.generation);
    }
  }
  paintComponent();
}

function cancelSettleTimer(): void {
  if (settleTimer === undefined) return;
  clearTimeout(settleTimer);
  settleTimer = undefined;
}

function seed(
  selections: ElementSelectionSeed[],
  generation: number,
  anchor: string | null,
): void {
  clearHeld();
  currentSeedGeneration = generation;
  settledAt = Date.now() + SETTLE_MS;
  // Set before `reresolve`, which is what reports the anchor's box (ONL-2455).
  anchorId = seededAnchorId(anchor, selections);
  for (const s of selections) {
    held.set(s.id, {
      seed: s,
      evidence: null,
      element: null,
      stale: false,
      box: makeBox('selected'),
      spacing: makeSpacingLayer(),
      generation,
    });
  }
  reresolve();
  if (held.size > 0) {
    syncMutationObservation();
    settleTimer = setTimeout(() => {
      settleTimer = undefined;
      if (currentSeedGeneration !== generation) return;
      reresolve();
    }, SETTLE_MS);
  }
}

// Only a throw inside these handlers is ours; the page's own errors are not listened to (ONL-2348).
function reportError(error: unknown): void {
  try {
    const scrubbed = scrubException(error, 'web:javascript');
    ipcRenderer.sendToHost(GUEST_CHANNEL_TO_HOST, {
      type: 'error',
      report: { type: scrubbed.type, value: scrubbed.value, frames: scrubbed.stacktrace?.frames ?? [] },
      generation: currentGeneration,
    } satisfies PickerToHost);
  } catch {
    // A torn channel is not a second failure worth raising.
  }
}

function guarded<T extends unknown[]>(handler: (...args: T) => void): (...args: T) => void {
  return (...args) => {
    try {
      handler(...args);
    } catch (error) {
      reportError(error);
    }
  };
}

function setArmed(next: boolean): void {
  armed = next;
  syncMutationObservation();
  acceptingPicks = next;
  if (!next) {
    overlayRecovery.cancel();
    clearHover();
  } else {
    restorePickerOverlay(overlay, document.documentElement);
  }
}

ipcRenderer.on(GUEST_CHANNEL_TO_GUEST, guarded((_event: unknown, message: PickerToGuest) => {
  // Before the generation gate so a proof's throw cannot advance it; the env var's `!isPackaged` half lives only in `main/errors/dev-hook.ts` (ONL-2348).
  if (message.type === 'devThrow') {
    if (process.env['STUDIO_ERROR_HOOK'] === '1') throw new Error('dev hook: frame preload threw');
    return;
  }
  if (message.generation < currentGeneration) return;
  currentGeneration = message.generation;
  if (!canDrawOverlay) return;
  switch (message.type) {
    case 'arm':
      setArmed(true);
      break;
    case 'hoverAt':
      if (!armed) break;
      if (message.point) hoverAt(message.point.x, message.point.y);
      else clearHover();
      break;
    case 'measure':
      measuring = message.active;
      paintMeasure();
      break;
    case 'hoverReports':
      hoverReportsEnabled = message.enabled;
      break;
    case 'pickAt':
      selectAt(message.point.x, message.point.y, message.shiftHeld);
      break;
    case 'pickPath':
      selectPath(message.selector, message.shiftHeld);
      break;
    case 'zoom':
      // A zero zoom takes the border width to Infinity.
      outlineScale = 1 / Math.max(message.zoom, 0.01);
      rescaleBoxes();
      break;
    case 'disarm':
      setArmed(false);
      break;
    case 'outlineVisibility':
      showOutlines(message.visible);
      break;
    case 'componentMap':
      // Outside a React dev build this arrives empty and nothing is ever drawn.
      componentPaths = new Set(message.paths);
      paintComponent();
      break;
    case 'clearSelections':
      currentSeedGeneration = message.generation;
      clearHeld();
      break;
    case 'removeSelection':
      dropHeld(message.id);
      break;
    case 'seedSelections':
      seed(message.selections, message.generation, message.anchorId);
      break;
  }
}));

// Not gated on `armed`: a zoom gesture is the canvas's in every mode. `ctrlKey` is the trackpad pinch; a plain wheel is the page's own scroll.
function onWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  event.stopPropagation();
  if (!event.isTrusted) return;
  send({
    type: 'wheel',
    deltaY: event.deltaY,
    clientX: event.clientX,
    clientY: event.clientY,
    isPinch: event.ctrlKey,
  });
}

// Unlike wheel and chord handling, context menus only swallow input while armed (ONL-2563).
function onContextMenu(event: MouseEvent): void {
  if (!swallow(event)) return;
  // Selects first, then relays: right-clicking an unselected element shows the
  // menu for THAT element, which is what every other canvas menu does.
  selectAt(event.clientX, event.clientY, false);
  send({ type: 'context-menu', clientX: event.clientX, clientY: event.clientY });
}

const captureNonPassive = { capture: true, passive: false } as const;
addEventListener('wheel', guarded(onWheel), captureNonPassive);
addEventListener('keydown', guarded(onKeyDown), true);
addEventListener('keyup', guarded(onKeyUp), true);
addEventListener('blur', guarded(releaseSpacePan));
// `contextmenu` has its own handler, which swallows it and then relays the point.
addEventListener('contextmenu', guarded(onContextMenu as (event: Event) => void), captureNonPassive);
for (const type of ['mousedown', 'mouseup', 'mousemove', 'auxclick'] as const) {
  addEventListener(type, guarded((event: Event) => void swallow(event)), captureNonPassive);
}
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
  addEventListener(type, guarded((event: Event) => void swallow(event)), captureNonPassive);
}
// `guarded` inside the debounce: the throw happens in the timer, and this file has no window-level fallback to catch it (ONL-2348).
addEventListener('scroll', debounce(guarded(reflow), REFLOW_DEBOUNCE_MS), true);
const frameScroll = createGuestScrollController(document, window,
  (message) => ipcRenderer.sendToHost(FRAME_SCROLL_CHANNEL, message), guarded(reflow), guarded);
ipcRenderer.on(FRAME_SCROLL_CHANNEL, guarded((_event: unknown, message: unknown) => frameScroll.receive(message)));
addEventListener('pagehide', () => frameScroll.dispose());
addEventListener('resize', debounce(guarded(reflow), REFLOW_DEBOUNCE_MS));

const scheduleReresolve = debounce(guarded(reresolve), REFLOW_DEBOUNCE_MS);
const overlayRecovery = createOverlayRecovery(
  guarded(() => { restorePickerOverlay(overlay, document.documentElement); }),
  (callback) => setTimeout(callback, REFLOW_DEBOUNCE_MS),
  (timer) => clearTimeout(timer),
);
addEventListener('pagehide', () => overlayRecovery.cancel());
heldResizeObserver =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(debounce(guarded(reflow), REFLOW_DEBOUNCE_MS));

function touchesPage(mutation: MutationRecord): boolean {
  return mutationTouchesPage(mutation, isPickerNode);
}

// Style and text mutations cannot add component instances (ONL-2563).
function changesPageStructure(mutation: MutationRecord): boolean {
  return mutation.type === 'childList' && touchesPage(mutation);
}

// SPA components can mount after dom-ready (ONL-2563).
const reportSettled = debounce(
  guarded(() => {
    send({ type: 'dom-settled' });
  }),
  SETTLE_REPORT_MS,
);

function processMutations(mutations: MutationRecord[]): void {
  if (armed && overlay !== null && !overlay.isConnected) overlayRecovery.request();
  if (held.size > 0 && mutations.some(touchesPage)) scheduleReresolve();
  if (mutations.some(changesPageStructure)) reportSettled();
}

const pageObserver = new MutationObserver(processMutations);
const observePage = createPageObservation(pageObserver, document, processMutations);
function syncMutationObservation(): void {
  observePage(armed || held.size > 0);
}
syncMutationObservation();

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
