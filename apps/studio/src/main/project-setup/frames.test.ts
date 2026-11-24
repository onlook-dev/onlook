import { describe, expect, it } from 'bun:test';
import { MAX_CANVAS_OPS_PER_REQUEST, type BrowserNode, type CanvasDoc } from '@studio/events';
import { createSetupPortMove } from './frames.js';
import type { ApplyCanvasOps } from '../canvas/authors.js';

function frame(id: string, port: number, pageId = 'first'): BrowserNode {
  return { id, kind: 'browser', pageId, name: id, x: 0, y: 0, width: 400, height: 300, order: 0,
    content: { homeUrl: `http://localhost:${port}/notes?sort=name#today` } };
}

function fixture(nodes: BrowserNode[]) {
  const doc: CanvasDoc = { schemaVersion: 1, docId: 'canvas', revision: 0,
    pages: { first: { id: 'first', name: 'Notes', order: 0 }, second: { id: 'second', name: 'Details', order: 1 } },
    nodes: Object.fromEntries(nodes.map(node => [node.id, node])) };
  const projects: string[] = [];
  const apply: ApplyCanvasOps = async (_author, resolve, cwd) => {
    projects.push(cwd!);
    const ops = resolve(doc);
    if (!Array.isArray(ops)) return { ok: false, reason: ops.reason };
    for (const op of ops) {
      if (op.type !== 'set-home-url') throw new Error('Unexpected canvas operation');
      const node = doc.nodes[op.id];
      if (node?.kind === 'browser') node.content.homeUrl = op.homeUrl;
    }
    return { ok: true };
  };
  return { doc, apply, projects };
}

describe('setup Frame port changes', () => {
  it('moves Frames on every Page, preserves routes and only targets this project', async () => {
    const nodes = [frame('notes', 48001), frame('details', 48001, 'second'), frame('other', 48002)];
    const { apply, projects } = fixture(nodes);
    await createSetupPortMove(apply)('/project', 48001, 4700, new AbortController().signal);
    expect(nodes.map(node => node.content.homeUrl)).toEqual([
      'http://localhost:4700/notes?sort=name#today', 'http://localhost:4700/notes?sort=name#today', 'http://localhost:48002/notes?sort=name#today',
    ]);
    expect(projects.every(project => project === '/project')).toBe(true);
  });

  it('undoes only its own Frame changes and leaves destination Frames and later edits alone', async () => {
    const nodes = [frame('moved', 48001), frame('edited', 48001), frame('already-there', 4700)];
    const { apply } = fixture(nodes);
    const undo = await createSetupPortMove(apply)('/project', 48001, 4700, new AbortController().signal);
    nodes[1]!.content.homeUrl = 'http://localhost:4900/new';
    await undo();
    expect(nodes.map(node => node.content.homeUrl)).toEqual([
      'http://localhost:48001/notes?sort=name#today', 'http://localhost:4900/new', 'http://localhost:4700/notes?sort=name#today',
    ]);
  });

  it('restores partial batches when a move is canceled or refused', async () => {
    for (const cancel of [false, true]) {
      const nodes = Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST + 1 }, (_value, index) => frame(`frame-${index}`, 48001));
      const { apply } = fixture(nodes);
      const controller = new AbortController();
      let writes = 0;
      const interrupted: ApplyCanvasOps = async (author, resolve, cwd) => {
        if (++writes === 2) {
          if (!cancel) return { ok: false, reason: 'Frame update refused' };
          controller.abort();
        }
        return apply(author, resolve, cwd);
      };
      await expect(createSetupPortMove(interrupted)('/project', 48001, 4700, controller.signal)).rejects.toThrow();
      expect(nodes.every(node => node.content.homeUrl === 'http://localhost:48001/notes?sort=name#today')).toBe(true);
    }
  });
});
