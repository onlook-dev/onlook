import { nodesOnPage, resolveNodePageId } from './canvas-pages.js';
import type { CanvasDoc, CanvasNode, CanvasNodeId, CanvasOp, CanvasPageId } from './canvas.js';

export type StackPosition = 'front' | 'back' | 'forward' | 'backward';

/** One page, back to front; the id breaks a tie so every reader ranks the same stack. Front means the front of this page, never of the document (ONL-2488). */
export function canvasStack(doc: CanvasDoc, pageId: CanvasPageId): CanvasNode[] {
  return nodesOnPage(doc, pageId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** The one copy of the stack arithmetic — the agent's restack tool and the canvas menu both author through it. `null` means the document holds no such node, and each caller words that refusal (ONL-2486). */
export function resolveStackOps(
  doc: CanvasDoc,
  id: CanvasNodeId,
  position: StackPosition,
): CanvasOp[] | { reason: string } | null {
  const target = doc.nodes[id];
  if (target === undefined) return null;
  if (target.kind === 'section') return { reason: 'Sections stay behind their contents' };
  const stack = canvasStack(doc, resolveNodePageId(doc, target)).filter((node) => node.kind !== 'section');
  const index = stack.findIndex((candidate) => candidate.id === id);
  const node = stack[index];
  if (node === undefined) return null;
  const up = position === 'front' || position === 'forward';
  if (up ? index === stack.length - 1 : index === 0) {
    return { reason: `"${node.name}" is already at the ${up ? 'front' : 'back'}` };
  }
  const top = stack[stack.length - 1] as CanvasNode;
  const bottom = stack[0] as CanvasNode;
  const step = up ? 1 : -1;
  const neighbour = stack[index + step] as CanvasNode;
  const beyond = stack[index + 2 * step];
  const order =
    position === 'front'
      ? top.order + 1
      : position === 'back'
        ? bottom.order - 1
        : beyond === undefined
          ? neighbour.order + step
          : (neighbour.order + beyond.order) / 2;
  return [{ type: 'reorder', id: node.id, order }];
}
