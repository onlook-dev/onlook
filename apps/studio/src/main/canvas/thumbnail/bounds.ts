import type { ArtifactId, CanvasDoc, CanvasNode, CanvasNodeId, CanvasPageId, TextContent } from '@studio/events';
import { nodesOnPage } from '@studio/events';
import { finite } from '../document.js';

const CARD_THUMBNAIL_SLOT = { width: 273, height: 140 } as const;

const LONG_EDGE_PX = 1024;

/** Figma Product-UI frame 10361:3164, handoff 10362:2833: the slot's own inset, in slot pixels. */
const THUMBNAIL_SLOT_MARGIN_PX = 12;

export const THUMBNAIL_SIZE = {
  width: LONG_EDGE_PX,
  height: Math.round((LONG_EDGE_PX * CARD_THUMBNAIL_SLOT.height) / CARD_THUMBNAIL_SLOT.width),
} as const;

export const THUMBNAIL_MARGIN_PX = Math.round(
  (THUMBNAIL_SLOT_MARGIN_PX * THUMBNAIL_SIZE.width) / CARD_THUMBNAIL_SLOT.width,
);

const INSET_BOX = {
  width: THUMBNAIL_SIZE.width - 2 * THUMBNAIL_MARGIN_PX,
  height: THUMBNAIL_SIZE.height - 2 * THUMBNAIL_MARGIN_PX,
} as const;

export interface ThumbnailRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ThumbnailPlacementBase {
  id: CanvasNodeId;
  /** The document's stacking order; the placements themselves arrive by destination area. */
  order: number;
  rect: ThumbnailRect;
}

/** Only a browser placement is photographed; the rest draw from what main already holds (ONL-2486). */
type ThumbnailContent =
  { kind: 'browser' } | { kind: 'section'; scale: number } | { kind: 'artifact'; artifactId: ArtifactId; pagePath: string | undefined } | ({ kind: 'text'; scale: number } & TextContent) | { kind: 'image'; imageId: string };

export type ThumbnailPlacement = ThumbnailPlacementBase & ThumbnailContent;

function thumbnailContent(node: CanvasNode, scale: number): ThumbnailContent {
  switch (node.kind) {
    case 'browser': return { kind: node.kind };
    case 'text': return { kind: node.kind, ...node.content, scale };
    case 'section': return { kind: node.kind, scale };
    case 'image': return { kind: node.kind, imageId: node.content.imageId };
    case 'artifact': return { kind: node.kind, artifactId: node.content.artifactId, pagePath: node.content.pagePath };
    default: return node satisfies never;
  }
}

export type ThumbnailFitAll =
  | {
      ok: true;
      size: { readonly width: number; readonly height: number };
      placements: ThumbnailPlacement[];
    }
  | { ok: false; reason: 'no-frames' | 'bad-geometry' };

const unsound = (node: CanvasNode): boolean =>
  !finite(node.x) ||
  !finite(node.y) ||
  !finite(node.order) ||
  !finite(node.width) ||
  node.width <= 0 ||
  !finite(node.height) ||
  node.height <= 0;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const byArea = (a: ThumbnailPlacement, b: ThumbnailPlacement): number =>
  b.rect.width * b.rect.height - a.rect.width * a.rect.height ||
  a.order - b.order ||
  a.id.localeCompare(b.id);

/** `pageId` is required and nullable, never optional: a caller that forgets it draws a card from pages the user is not on, and the first off-page browser node has no mounted guest to photograph (ONL-2488). */
export function thumbnailFitAll(doc: CanvasDoc, pageId: CanvasPageId | undefined): ThumbnailFitAll {
  const nodes = pageId === undefined ? Object.values(doc.nodes) : nodesOnPage(doc, pageId);
  if (nodes.length === 0) return { ok: false, reason: 'no-frames' };
  if (nodes.some(unsound)) return { ok: false, reason: 'bad-geometry' };

  // A loop, not a spread: an argument list the width of the node map overflows the stack.
  let minX = Infinity;
  let minY = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > right) right = node.x + node.width;
    if (node.y + node.height > bottom) bottom = node.y + node.height;
  }
  const unionWidth = right - minX;
  const unionHeight = bottom - minY;

  const scale = Math.min(INSET_BOX.width / unionWidth, INSET_BOX.height / unionHeight);
  if (!finite(scale) || scale <= 0) return { ok: false, reason: 'bad-geometry' };

  const offsetX = THUMBNAIL_MARGIN_PX + (INSET_BOX.width - unionWidth * scale) / 2;
  const offsetY = THUMBNAIL_MARGIN_PX + (INSET_BOX.height - unionHeight * scale) / 2;

  const placements: ThumbnailPlacement[] = nodes.map((node) => {
    const left = Math.round(offsetX + (node.x - minX) * scale);
    const top = Math.round(offsetY + (node.y - minY) * scale);
    const width = clamp(
      Math.round(offsetX + (node.x + node.width - minX) * scale) - left,
      1,
      INSET_BOX.width,
    );
    const height = clamp(
      Math.round(offsetY + (node.y + node.height - minY) * scale) - top,
      1,
      INSET_BOX.height,
    );
    return {
      id: node.id,
      order: node.order,
      ...thumbnailContent(node, scale),
      rect: {
        x: clamp(left, THUMBNAIL_MARGIN_PX, THUMBNAIL_MARGIN_PX + INSET_BOX.width - width),
        y: clamp(top, THUMBNAIL_MARGIN_PX, THUMBNAIL_MARGIN_PX + INSET_BOX.height - height),
        width,
        height,
      },
    };
  });

  return { ok: true, size: THUMBNAIL_SIZE, placements: placements.sort(byArea) };
}
