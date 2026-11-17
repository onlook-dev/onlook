// Pure functions only — nothing here reads a store, the clock, or `window`.

import {
  CANVAS_TEXT_FONT_SIZES,
  CANVAS_TEXT_WRAP_WIDTH,
  defaultTextBox,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasTextSize,
} from '@studio/events';
import { FRAME_DRAW_CLICK_THRESHOLD } from '../model.js';

export const DEFAULT_CANVAS_TEXT_SIZE: CanvasTextSize = 'medium';

export interface TextBox {
  width: number;
  height: number;
}

/** Declared here, not in the component, so `store.ts` imports nothing from it. */
export interface TextDraft {
  id: CanvasNodeId;
  x: number;
  y: number;
  size: CanvasTextSize;
  text: string;
}

interface ScreenPoint {
  x: number;
  y: number;
}

/** Screen px, the frame tool's own tolerance: the store holds no live zoom, so a flow-distance test misclassifies at low zoom. */
export function isTextPlacementClick(anchor: ScreenPoint, cursor: ScreenPoint): boolean {
  return Math.hypot(cursor.x - anchor.x, cursor.y - anchor.y) <= FRAME_DRAW_CLICK_THRESHOLD;
}

/** Marks the canvas's own top-layer surfaces; the text size bar is the first (ONL-2486). */
export const CANVAS_OVERLAY_SELECTOR = '[data-canvas-overlay]';

/** How much of a label the canvas draws; the document keeps the whole string, so a huge paste costs one layout and not the canvas (ONL-2486). */
export const CANVAS_TEXT_RENDER_MAX = 2000;

export function renderedCanvasText(text: string): string {
  return text.length <= CANVAS_TEXT_RENDER_MAX
    ? text
    : `${text.slice(0, CANVAS_TEXT_RENDER_MAX)}…`;
}

/** The stored string for the node holding the caret, `undefined` for every other, which draws the truncation: committing that would delete the rest (ONL-2486). */
export function caretText(
  nodes: Readonly<Record<CanvasNodeId, CanvasNode>> | undefined,
  textEditId: CanvasNodeId | null,
  id: CanvasNodeId,
): string | undefined {
  if (textEditId !== id) return undefined;
  const node = nodes?.[id];
  return node?.kind === 'text' ? node.content.text : undefined;
}

/** `null` is the window losing focus, which commits. */
export function keepsTextEditOpen(
  incoming: { closest(selectors: string): unknown } | null,
): boolean {
  return incoming !== null && incoming.closest(CANVAS_OVERLAY_SELECTOR) !== null;
}

/** Whole px inside the wrap width, floored at one line: the document stores integers and a browser measures fractions. */
export function measuredTextBox(
  rect: { width: number; height: number },
  size: CanvasTextSize,
  wrapWidth?: number,
): TextBox {
  const line = defaultTextBox(size).height;
  return {
    width: wrapWidth ?? Math.min(Math.max(Math.ceil(rect.width), 1), CANVAS_TEXT_WRAP_WIDTH),
    height: Math.max(Math.ceil(rect.height), line),
  };
}

/** The box the same words take at another size, scaled by the font step; the node's own next layout corrects the rounding (ONL-2486). */
export function textBoxAtSize(box: TextBox, from: CanvasTextSize, to: CanvasTextSize, wrapWidth?: number): TextBox {
  if (from === to) return { width: box.width, height: box.height };
  const step = CANVAS_TEXT_FONT_SIZES[to] / CANVAS_TEXT_FONT_SIZES[from];
  return measuredTextBox({ width: box.width * step, height: box.height * step }, to, wrapWidth);
}

/** A whole pixel of slack, or a fractional layout and an integer document correct each other forever. */
export function isTextBoxStale(stored: TextBox, measured: TextBox): boolean {
  return (
    Math.abs(stored.width - measured.width) >= 1 || Math.abs(stored.height - measured.height) >= 1
  );
}

export type TextCommit =
  | { kind: 'none' }
  | { kind: 'create'; text: string; box: TextBox }
  | { kind: 'remove' }
  | { kind: 'set-text'; text: string; box: TextBox };

/** `previous: null` is a placement no `create` op has authored yet, so abandoning it is `none` where an emptied node is `remove`. */
export function textCommitOutcome(input: {
  previous: string | null;
  next: string;
  box: TextBox;
}): TextCommit {
  if (input.next.trim() === '') {
    return input.previous === null ? { kind: 'none' } : { kind: 'remove' };
  }
  if (input.previous === null) return { kind: 'create', text: input.next, box: input.box };
  if (input.previous === input.next) return { kind: 'none' };
  return { kind: 'set-text', text: input.next, box: input.box };
}
