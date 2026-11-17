import type { AnchorRect, InlineDismissMethod } from '@studio/events';
import { safeScale } from './frame/geometry.js';
import type { GatherRefusal } from './selection.js';

export interface FlowBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** No camera term: the `ViewportPortal` applies pan and zoom (ONL-2455). */
export function anchorFlowBox(input: {
  rect: AnchorRect;
  /** The guest's own page zoom, not the canvas's. */
  guestZoom: number;
  origin: { x: number; y: number };
}): FlowBox {
  const scale = safeScale(input.guestZoom);
  return {
    x: input.origin.x + input.rect.x * scale,
    y: input.origin.y + input.rect.y * scale,
    width: input.rect.width * scale,
    height: input.rect.height * scale,
  };
}

/** Pane px: the one place the camera enters. */
export function anchorPaneBand(
  box: FlowBox,
  viewport: { x: number; y: number; zoom: number },
): { top: number; bottom: number } {
  return {
    top: viewport.y + box.y * viewport.zoom,
    bottom: viewport.y + (box.y + box.height) * viewport.zoom,
  };
}

export type InlinePlacement = 'above' | 'below';

/** Pane px the surface needs on the side it takes: the resting bubble, the gap, and room for a second row (ONL-2455). */
export const INLINE_BUBBLE_RESERVE = 96;

/** Screen px. */
export const INLINE_BUBBLE_GAP = 8;

/** Screen px, the layer surface's own width (`REGISTER.md`, Bubble width). */
export const INLINE_BUBBLE_WIDTH = 280;

/**
 * The surface is drawn at screen size and counter-scaled by the camera, so its half-width in flow
 * units grows as the canvas zooms out; a frame too narrow to hold it centres it instead (ONL-2518).
 */
function withinFrame(left: number, frame: { x: number; width: number }, zoom: number): number {
  // A frame React Flow has not measured bounds nothing, and its left edge is not an answer.
  if (!(frame.width > 0)) return left;
  const half = INLINE_BUBBLE_WIDTH / 2 / safeScale(zoom);
  if (frame.width <= half * 2) return frame.x + frame.width / 2;
  return Math.min(Math.max(left, frame.x + half), frame.x + frame.width - half);
}

export function inlineAnchorPoint(
  box: FlowBox,
  placement: InlinePlacement,
  zoom: number,
  /** The anchor's frame: an element near an edge would otherwise hang the surface off it. */
  frame?: { x: number; width: number },
): { left: number; top: number } {
  const gap = INLINE_BUBBLE_GAP / safeScale(zoom);
  const left = box.x + box.width / 2;
  return {
    left: frame === undefined ? left : withinFrame(left, frame, zoom),
    top: placement === 'above' ? box.y - gap : box.y + box.height + gap,
  };
}

export type InlineChatEntry = 'orb' | 'input';

/** `sent` is the bubble's own send, which `inline_chat_submitted` already records. */
export type InlineCloseReason = InlineDismissMethod | 'sent';

/** Declared here, not in the hook, so `store.ts` imports nothing from it (ONL-2455). */
export interface InlineChatRecord {
  /** The first element selection's evidence id, or the node's id when `anchor` is `node`. */
  anchorId: string;
  /** A whole Frame or Artifact is the subject, opened by Enter on its lone selection. */
  anchor?: 'node';
  draft: string;
  expanded: boolean;
  entry: InlineChatEntry;
  placement: InlinePlacement | null;
  send: 'idle' | 'sending' | 'failed';
  refusal: GatherRefusal | null;
}

export type InlineChatAnchor = 'element' | 'node';

export function inlineChatAnchor(record: InlineChatRecord): InlineChatAnchor {
  return record.anchor ?? 'element';
}

/** Node-local flow units, grown upward by the chrome that hangs above the node so the surface clears it. */
export function nodeAnchorRect(
  size: { width: number; height: number },
  /** Screen px. */
  chromeAbove: number,
  zoom: number,
): AnchorRect {
  const lift = chromeAbove / safeScale(zoom);
  return { x: 0, y: 0 - lift, width: size.width, height: size.height + lift };
}

/** The open surface's anchor is not removable: the page's box is its representation (ONL-2455). */
export function isAnchorLocked(record: InlineChatRecord | null, id: string): boolean {
  return record !== null && record.anchorId === id;
}

/** The element is the prompt's subject, never its request: no text is no send (ONL-2455). */
export function inlineSubmitText(draft: string): string | null {
  const text = draft.trim();
  return text.length === 0 ? null : text;
}

export function inlineDismissedFields(
  record: InlineChatRecord,
  method: InlineDismissMethod,
): { method: InlineDismissMethod; draft_lost: boolean } {
  return { method, draft_lost: inlineSubmitText(record.draft) !== null };
}

/** Latched once, at open: a side that moved as the draft grew would walk the surface across the element. */
export function inlinePlacementFor(anchor: {
  /** Pane px. */
  top: number;
  bottom: number;
  paneHeight: number;
}): InlinePlacement {
  if (anchor.top >= INLINE_BUBBLE_RESERVE) return 'above';
  return anchor.paneHeight - anchor.bottom >= INLINE_BUBBLE_RESERVE ? 'below' : 'above';
}
