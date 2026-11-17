import { randomUUID } from 'node:crypto';
import type { CanvasDoc, CanvasOp } from '@studio/events';
import { localPort, MAX_CANVAS_OPS_PER_REQUEST, originForPort } from '@studio/events';
import { readImage, registerImage } from '../images/store.js';
import { t } from '@studio/i18n';

export async function cloneCanvasDocument(
  source: CanvasDoc,
  docId: string,
  destinationCwd: string,
  sourcePort: number | undefined,
): Promise<{ doc: CanvasDoc; pageIds: Record<string, string> }> {
  const doc = structuredClone(source);
  doc.docId = docId;
  doc.revision = 0;
  const pageIds: Record<string, string> = {};
  const pages = doc.pages;
  doc.pages = {};
  for (const page of Object.values(pages)) {
    const id = randomUUID();
    pageIds[page.id] = id;
    doc.pages[id] = { ...page, id };
  }
  const nodes = doc.nodes;
  doc.nodes = {};
  const imageIds = new Map<string, string>();
  for (const node of Object.values(nodes)) {
    node.id = randomUUID();
    node.pageId = pageIds[node.pageId] ?? node.pageId;
    delete node.provenance;
    if (node.kind === 'image') {
      const originalId = node.content.imageId;
      let imageId = imageIds.get(originalId);
      if (imageId === undefined) {
        const image = readImage(originalId);
        if (image === null) throw new Error(t('projects.copy.error.imageRead'));
        const result = registerImage(destinationCwd, image.bytes, { allowSvg: true });
        if (!result.ok) throw new Error(t('projects.copy.error.imageCopy'));
        imageId = result.image.id;
        imageIds.set(originalId, imageId);
      }
      node.content.imageId = imageId;
    } else if (node.kind === 'browser') {
      const original = node.content.pendingHomeUrl ?? node.content.homeUrl;
      const parked = sourcePort === undefined
        ? node.content.pendingHomeUrl !== undefined
        : localPort(original) === sourcePort;
      if (parked) {
        node.content.pendingHomeUrl = original;
        node.content.homeUrl = 'about:blank';
      } else {
        node.content.homeUrl = original;
        delete node.content.pendingHomeUrl;
      }
    }
    doc.nodes[node.id] = node;
  }
  return { doc, pageIds };
}

export function duplicateFrameRebindOps(doc: CanvasDoc, port: number): CanvasOp[] {
  const ops: CanvasOp[] = [];
  for (const node of Object.values(doc.nodes)) {
    if (node.kind !== 'browser' || node.content.pendingHomeUrl === undefined) continue;
    const original = node.content.pendingHomeUrl;
    if (localPort(original) !== null) {
      const home = new URL(original);
      const destination = new URL(originForPort(port));
      home.protocol = destination.protocol;
      home.host = destination.host;
      ops.push({ type: 'set-home-url', id: node.id, homeUrl: home.toString() });
    } else {
      ops.push({ type: 'set-home-url', id: node.id, homeUrl: original });
    }
    if (ops.length === MAX_CANVAS_OPS_PER_REQUEST) break;
  }
  return ops;
}

export async function drainCanvasOps<Result>(
  apply: (resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string }) => Promise<Result>,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string },
): Promise<Result> {
  let lastApplied: Result | undefined;
  for (;;) {
    let productive = false;
    const result = await apply((doc) => {
      const ops = resolve(doc);
      productive = Array.isArray(ops) && ops.length > 0;
      return Array.isArray(ops) ? ops.slice(0, MAX_CANVAS_OPS_PER_REQUEST) : ops;
    });
    if (typeof result === 'object' && result !== null && 'ok' in result && result.ok === false) return result;
    if (!productive) return lastApplied ?? result;
    lastApplied = result;
  }
}

export async function drainCopiedFrameRebinds<Result>(
  apply: (resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string }) => Promise<Result>,
  port: number,
  resolveInitial: (doc: CanvasDoc, pending: CanvasOp[]) => CanvasOp[] | { reason: string } = (_doc, pending) => pending,
): Promise<Result> {
  let initial = true;
  return drainCanvasOps(apply, (doc) => {
    const pending = duplicateFrameRebindOps(doc, port);
    const ops = initial ? resolveInitial(doc, pending) : pending;
    initial = false;
    return ops;
  });
}
