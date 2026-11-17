import { describe, expect, it } from 'bun:test';
import type { CanvasDoc, CanvasNode, CanvasOp, SectionNode } from '@studio/events';
import { applyOp, emptyCanvasDoc, firstCanvasPageId, invertOp } from './document.js';
import { resolveCreateFrameOps, resolveDuplicateFramesOps, resolveMoveFrameOps, resolveMoveFramesOps } from './authors.js';

const context = { author: 'user', at: '2026-10-21T04:00:00Z' } as const;
function apply(doc: CanvasDoc, op: CanvasOp): ReturnType<typeof applyOp> & { ok: true } {
  const result = applyOp(doc, op, context);
  if (!result.ok) throw new Error(result.reason);
  return result;
}
const section: SectionNode = { id: 'section', pageId: firstCanvasPageId('sections'), kind: 'section', name: 'Venue tiles', x: 0, y: 0, width: 1000, height: 800, order: 10, content: {} };
const child: CanvasNode = { id: 'frame', pageId: section.pageId, kind: 'browser', name: 'Tile', x: 100, y: 100, width: 400, height: 300, order: 0, content: { homeUrl: 'http://localhost:3000' } };
const document = (): CanvasDoc => {
  const paged = apply(emptyCanvasDoc('sections'), { type: 'create-page', page: { id: section.pageId, name: 'Canvas', order: 0 } }).doc;
  return apply(apply(paged, { type: 'create', node: { ...section, provenance: undefined } }).doc, { type: 'create', node: { ...child, provenance: undefined } }).doc;
};

describe('durable sections', () => {
  it('creates, renames, resizes and removes a section, with inverse operations restoring every step', () => {
    let doc = document();
    for (const op of [
      { type: 'rename', id: section.id, name: 'Venue tile explorations' },
      { type: 'resize', id: section.id, x: -20, y: -30, width: 1400, height: 900 },
      { type: 'remove', id: section.id },
    ] satisfies CanvasOp[]) {
      const before = doc;
      const result = apply(doc, op);
      expect(result.doc.nodes.frame).toEqual(child);
      const inverse = invertOp(result.entry);
      expect(inverse).toBeDefined();
      const restored = apply(result.doc, inverse!);
      expect(restored.doc.nodes).toEqual(before.nodes);
      doc = result.doc;
    }
  });

  it('lets the agent create a section with explicit geometry and moves its contents together once', () => {
    const doc = document();
    const created = resolveCreateFrameOps(doc, { kind: 'section', name: 'Next explorations', x: 1200, y: 0, width: 800, height: 700, mintId: () => 'new-section' });
    expect(created).toMatchObject([{ type: 'create', node: { kind: 'section', name: 'Next explorations', x: 1200, y: 0, width: 800, height: 700 } }]);
    const moved = resolveMoveFrameOps(doc, { frameId: section.id, x: 60, y: 40 });
    expect(moved).toEqual([{ type: 'move', id: section.id, x: 60, y: 40 }, { type: 'move', id: child.id, x: 160, y: 140 }]);
    expect(resolveMoveFramesOps(doc, { frameIds: [section.id, child.id], deltaX: 60, deltaY: 40 })).toEqual(moved);
  });

  it('refuses malformed section content and non-positive geometry', () => {
    expect(applyOp(emptyCanvasDoc('sections'), { type: 'create', node: { ...section, content: { unexpected: true } } } as unknown as CanvasOp, context).ok).toBe(false);
    expect(resolveCreateFrameOps(document(), { kind: 'section', width: 0 })).toHaveProperty('reason');
  });

  it('duplicates a section and enclosed frames together through the agent tools', () => {
    const doc = document();
    for (const offset of [{ offsetX: 1200, offsetY: 50 }, {}]) {
      let serial = 0;
      const result = resolveDuplicateFramesOps(doc, { frameIds: [section.id, child.id], ...offset, mintId: () => `copy-${String(serial++)}` });
      if (!Array.isArray(result)) throw new Error(result.reason);
      expect(result).toHaveLength(2);
      const copies = result.map((op) => { if (op.type !== 'duplicate') throw new Error('Expected duplicate'); return op.node; });
      expect(copies[1]!.x - copies[0]!.x).toBe(child.x - section.x);
      expect(copies[1]!.y - copies[0]!.y).toBe(child.y - section.y);
      expect(copies[0]!.x).toBe(section.x + (offset.offsetX ?? 1100));
    }
    const result = resolveDuplicateFramesOps(doc, { frameIds: [section.id] });
    expect(Array.isArray(result) ? result.length : result).toBe(2);
  });
});
