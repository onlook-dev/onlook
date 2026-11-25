import { describe, expect, it } from 'bun:test';
import { displayUrl, MAX_CANVAS_OPS_PER_REQUEST, type BrowserNode, type CanvasDoc } from '@studio/events';
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
      if (op.type === 'rename') { doc.nodes[op.id]!.name = op.name; continue; }
      if (op.type !== 'set-home-url') throw new Error('Unexpected canvas operation');
      const node = doc.nodes[op.id];
      if (node?.kind === 'browser') node.content.homeUrl = op.homeUrl;
    }
    return { ok: true };
  };
  return { doc, apply, projects };
}

describe('setup Frame port changes', () => {
  it('updates address-generated Frame names and preserves custom names', async () => {
    const nodes = [frame('address', 48001), frame('custom', 48001, 'second'), frame('destination-name', 48001)];
    nodes[0]!.name = displayUrl(nodes[0]!.content.homeUrl);
    nodes[2]!.name = 'localhost:4700/notes?sort=name';
    const { apply } = fixture(nodes);
    const undo = await createSetupPortMove(apply)('/project', 48001, 4700, new AbortController().signal);
    expect(nodes.map(node => node.name)).toEqual(['localhost:4700/notes?sort=name', 'custom', 'localhost:4700/notes?sort=name']);
    await undo();
    expect(nodes.map(node => node.name)).toEqual(['localhost:48001/notes?sort=name', 'custom', 'localhost:4700/notes?sort=name']);
  });

  it('keeps a later custom name when rolling back an address change', async () => {
    const node = frame('address', 48001);
    node.name = displayUrl(node.content.homeUrl);
    const { apply } = fixture([node]);
    const undo = await createSetupPortMove(apply)('/project', 48001, 4700, new AbortController().signal);
    node.name = 'Preview';
    await undo();
    expect(node.name).toBe('Preview');
    expect(node.content.homeUrl).toContain(':48001/');
  });

  it('moves and restores mixed Frame names across operation batch boundaries', async () => {
    const nodes = Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST + 1 }, (_value, index) => frame(`frame-${index}`, 48001));
    for (const [index, node] of nodes.entries()) if (index % 2 === 0) node.name = displayUrl(node.content.homeUrl);
    const names = nodes.map(node => node.name);
    const { apply } = fixture(nodes);
    const undo = await createSetupPortMove(apply)('/project', 48001, 4700, new AbortController().signal);
    expect(nodes.every(node => node.content.homeUrl.includes(':4700/'))).toBe(true);
    expect(nodes.map(node => node.name)).toEqual(names.map((name, index) => index % 2 === 0 ? name.replace(':48001/', ':4700/') : name));
    await undo();
    expect(nodes.every(node => node.content.homeUrl.includes(':48001/'))).toBe(true);
    expect(nodes.map(node => node.name)).toEqual(names);
  });

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
      for (const node of nodes) node.name = displayUrl(node.content.homeUrl);
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
      expect(nodes.every(node => node.name === displayUrl(node.content.homeUrl))).toBe(true);
    }
  });
});
