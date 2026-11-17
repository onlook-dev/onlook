import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { defaultTextBox, PLACEMENT_GAP } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  applyAgentCreatePage,
  applyAgentCreateText,
  applyAgentSetText,
  applyCanvasOps,
  canvasSnapshotFor,
  closeCanvas,
  flushCanvas,
  listAgentFrames,
  openCanvasForProject,
  setCanvasCurrentPage,
} from './index.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from './registry.js';

afterAll(async () => {
  await flushCanvas();
  restoreWorkspaceRoot();
  resetCanvasRegistryCache();
  cleanupTempFixtures();
});

describe('agent text rewrites preserve authored wrapping off-page', () => {
  it('creates wrapping text at the requested width and preserves it through a rewrite and disk reload', async () => {
    const root = makeWorkspaceRoot({ name: 'agent-create-text-width' });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetCanvasRegistryCache();
    const worktree = join(root, 'repo', 'w');
    await openCanvasForProject(worktree);
    const written = await applyAgentCreateText(worktree, {
      text: 'A label that fits its frame', width: 240, size: 'small', x: 1000, y: 1000,
    });
    if (!written.ok) throw new Error(written.reason);
    expect(written.node).toMatchObject({ width: 240, content: { wrapWidth: 240, size: 'small' } });
    const rewritten = await applyAgentSetText(worktree, { textId: written.node.id, text: 'Revised label' });
    if (!rewritten.ok) throw new Error(rewritten.reason);
    expect(rewritten.node).toMatchObject({ width: 240, content: { wrapWidth: 240, text: 'Revised label' } });
    await flushCanvas();
    await closeCanvas(worktree);
    resetCanvasRegistryCache();
    await openCanvasForProject(worktree);
    const reopened = await canvasSnapshotFor(worktree);
    expect(reopened.doc?.nodes[written.node.id]).toMatchObject({
      width: 240, content: { wrapWidth: 240, text: 'Revised label', size: 'small' },
    });
  });

  for (const wrapWidth of [240, 800]) {
    it(`retains ${wrapWidth}px in the tool result, snapshot, listing and beside placement`, async () => {
      const root = makeWorkspaceRoot({ name: `agent-set-text-wrap-${wrapWidth}` });
      process.env['STUDIO_WORKSPACE_ROOT'] = root;
      resetCanvasRegistryCache();
      const worktree = join(root, 'repo', 'w');
      await openCanvasForProject(worktree);
      const visible = await applyAgentCreatePage(worktree, { name: 'Visible' });
      const offPage = await applyAgentCreatePage(worktree, { name: 'Off-page' });
      if (!visible.ok) throw new Error(visible.reason);
      if (!offPage.ok) throw new Error(offPage.reason);
      await setCanvasCurrentPage(canvasDocIdFor(worktree), visible.page.id);
      const written = await applyAgentCreateText(worktree, {
        text: 'Before', pageId: offPage.page.id, x: 1000, y: 1000,
      });
      if (!written.ok) throw new Error(written.reason);
      const resized = await applyCanvasOps('user', () => [{
        type: 'resize', id: written.node.id, x: 1000, y: 1000, width: wrapWidth, height: 152,
      }], worktree);
      if (!resized.ok) throw new Error(resized.reason);

      const rewritten = await applyAgentSetText(worktree, { textId: written.node.id, text: 'After' });
      if (!rewritten.ok) throw new Error(rewritten.reason);
      const expected = {
        pageId: offPage.page.id, x: 1000, y: 1000,
        width: wrapWidth, height: defaultTextBox('medium').height,
        content: { text: 'After', size: 'medium', wrapWidth },
      };
      expect(rewritten.node).toMatchObject(expected);
      expect((await canvasSnapshotFor(worktree)).doc?.nodes[written.node.id]).toMatchObject(expected);
      expect((await listAgentFrames(worktree, undefined, { pageId: offPage.page.id })).find((node) => node.id === written.node.id))
        .toMatchObject({ width: wrapWidth, text: 'After', pageId: offPage.page.id });

      const beside = await applyAgentCreateText(worktree, { text: 'Beside', beside: written.node.id, side: 'right' });
      if (!beside.ok) throw new Error(beside.reason);
      expect(beside.node).toMatchObject({ pageId: offPage.page.id, x: 1000 + wrapWidth + PLACEMENT_GAP });
      await flushCanvas();
    });
  }
});
