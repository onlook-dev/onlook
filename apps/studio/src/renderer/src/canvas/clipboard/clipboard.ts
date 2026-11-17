// Every clipboard decision lives here: nothing reads a store, the DOM, the clock or `window`.

import {
  isCanvasTextSize,
  isArtifactId,
  type CanvasDocId,
  type CanvasNode,
  type CanvasNodeId,
} from '@studio/events';
import type { ImageIngestSource } from '../image/ingest.js';
import { boundingBox } from '../snapping.js';

/** Chromium keeps an unknown type as custom clipboard data, which is how the canvas's own nodes survive the round trip (ONL-2486). */
export const CANVAS_CLIPBOARD_TYPE = 'application/x-studio-canvas-nodes';

/** 2 since a node carries a page; the paste re-stamps it, and a version-1 payload named a page no document issued (ONL-2488). */
const CANVAS_CLIPBOARD_VERSION = 2;

export type ClipboardNode = CanvasNode;

interface CanvasClipboardPayload {
  version: typeof CANVAS_CLIPBOARD_VERSION;
  docId: CanvasDocId;
  nodes: ClipboardNode[];
}

export interface CanvasCopy {
  payload: string;
  /** What another app receives; empty when nothing copied carries words. */
  text: string;
  ids: CanvasNodeId[];
}

function clipboardNodes(nodes: readonly CanvasNode[]): ClipboardNode[] {
  const hasSection = nodes.some((node) => node.kind === 'section');
  return nodes.filter(
    (node): node is ClipboardNode => node.kind !== 'browser' || hasSection,
  );
}

export function copyOutcome(docId: CanvasDocId, nodes: readonly CanvasNode[]): CanvasCopy | null {
  const carried = clipboardNodes(nodes);
  if (carried.length === 0) return null;
  const payload: CanvasClipboardPayload = {
    version: CANVAS_CLIPBOARD_VERSION,
    docId,
    nodes: carried,
  };
  return {
    payload: JSON.stringify(payload),
    text: carried
      .flatMap((node) => (node.kind === 'text' ? [node.content.text] : []))
      .join('\n'),
    ids: carried.map((node) => node.id),
  };
}

export function writeCanvasCopy(
  target: { setData(type: string, data: string): void },
  copy: CanvasCopy,
): void {
  target.setData(CANVAS_CLIPBOARD_TYPE, copy.payload);
  // A picture carries no words, and its file name is not one: an empty value would offer another app a blank line.
  if (copy.text !== '') target.setData('text/plain', copy.text);
}

export interface ClipboardRead {
  get(type: string): string;
  files: readonly ImageIngestSource[];
  /** A clipboard that named an image type and produced no file; the refusal is the ingestion's to say. */
  promisesImage: boolean;
}

export type CanvasPaste =
  | { kind: 'none' }
  | { kind: 'nodes'; nodes: ClipboardNode[] }
  | { kind: 'images'; files: readonly ImageIngestSource[] }
  | { kind: 'text'; text: string };

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const filled = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/** The clipboard is outside data even when we wrote it: a malformed payload must not reach the document as an op. */
function isClipboardNode(value: unknown): value is ClipboardNode {
  if (typeof value !== 'object' || value === null) return false;
  const node = value as Record<string, unknown>;
  if (!filled(node.id) || typeof node.name !== 'string') return false;
  if (!finite(node.x) || !finite(node.y) || !finite(node.order)) return false;
  if (!finite(node.width) || node.width <= 0) return false;
  if (!finite(node.height) || node.height <= 0) return false;
  const content = node.content;
  if (typeof content !== 'object' || content === null) return false;
  const held = content as Record<string, unknown>;
  if (node.kind === 'section') return Object.keys(held).length === 0;
  if (node.kind === 'browser') return typeof held.homeUrl === 'string' && /^(https?:\/\/|about:blank$)/.test(held.homeUrl);
  if (node.kind === 'text') return typeof held.text === 'string' && isCanvasTextSize(held.size);
  if (node.kind === 'image') {
    return (
      filled(held.imageId) &&
      filled(held.name) &&
      finite(held.originalWidth) &&
      finite(held.originalHeight)
    );
  }
  if (node.kind === 'artifact') return isArtifactId(held.artifactId) && typeof held.title === 'string' && (held.pagePath === undefined || (typeof held.pagePath === 'string' && held.pagePath.startsWith('pages/') && !held.pagePath.includes('..')));
  return false;
}

/** A payload from another document is not ours to place: an image id is namespaced by the project it was registered against (ONL-2486). */
function ownNodes(read: ClipboardRead, docId: CanvasDocId | null): ClipboardNode[] | null {
  if (docId === null) return null;
  const raw = read.get(CANVAS_CLIPBOARD_TYPE);
  if (raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const payload = parsed as Partial<CanvasClipboardPayload>;
  if (payload.version !== CANVAS_CLIPBOARD_VERSION) return null;
  if (!Array.isArray(payload.nodes) || payload.nodes.length === 0) return null;
  if (payload.docId !== docId && payload.nodes.some((node) => typeof node !== 'object' || node === null || node.kind === 'image')) return null;
  return payload.nodes.every(isClipboardNode) ? payload.nodes : null;
}

/** Our own nodes first, then pictures, then words: a picture's clipboard also carries its file name, and that name is not the paste. */
export function classifyPaste(
  read: ClipboardRead,
  into: { docId: CanvasDocId | null },
): CanvasPaste {
  const nodes = ownNodes(read, into.docId);
  if (nodes !== null) return { kind: 'nodes', nodes };
  if (read.files.length > 0 || read.promisesImage) return { kind: 'images', files: read.files };
  const text = plainTextOf(read);
  return text.trim() === '' ? { kind: 'none' } : { kind: 'text', text };
}

function plainTextOf(read: ClipboardRead): string {
  const plain = read.get('text/plain');
  return plain !== '' ? plain : plainTextFromHtml(read.get('text/html'));
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

/** The fallback for a clipboard offering markup and no plain value; one offering both is taken at its plain word. */
export function plainTextFromHtml(html: string): string {
  if (html === '') return '';
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The set's own geometry, moved as one: the offset is rounded once, so no pair drifts by a pixel. */
export function pastedBoxes(
  nodes: readonly { x: number; y: number; width: number; height: number }[],
  at: { x: number; y: number },
): { x: number; y: number }[] {
  const bounds = boundingBox(nodes);
  if (bounds === null) return [];
  const dx = Math.round(at.x - (bounds.x + bounds.width / 2));
  const dy = Math.round(at.y - (bounds.y + bounds.height / 2));
  return nodes.map((node) => ({ x: node.x + dx, y: node.y + dy }));
}
