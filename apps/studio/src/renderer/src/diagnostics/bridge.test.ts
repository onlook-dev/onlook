import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { BrowserNode, CanvasDoc, WorkspaceCreated } from '@studio/events';
import { addInlineAttachment } from '../canvas/inlineAttachments.js';
import { useCanvasStore } from '../canvas/store.js';
import { EMPTY_ATTACHMENTS } from '../attachments.js';
import { registerChatSubmit } from '../chat/submitRegistry.js';
import { useProjectsStore } from '../projects/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { debugBridge as bridge } from './bridge.js';
import {
  noteArtifactRead,
  noteGuestHover,
  noteHoverSend,
  openDiagnosticsRegistry,
  registerFramePicker,
} from './registry.js';

// No `window` here — a leaked global one breaks a later suite's module init (ONL-2455).
beforeEach(() => {
  openDiagnosticsRegistry();
  useCanvasStore.setState({
    mode: 'design',
    tool: 'select',
    isPicking: false,
    inlineChat: null,
    inlineAttachments: EMPTY_ATTACHMENTS,
    elementSelections: [],
    doc: null,
    project: null,
    currentPageId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
  });
  useProjectsStore.setState({ workspaces: [] });
  useWorkspaceStore.setState({ workspace: null, session: { kind: 'none' } });
});

// Restores everything `beforeEach` seeds: `bun test <dir>` shares one process, so a left-behind store is the next suite's fixture.
afterEach(() => {
  useCanvasStore.setState({
    mode: 'design',
    tool: 'select',
    isPicking: false,
    inlineChat: null,
    inlineAttachments: EMPTY_ATTACHMENTS,
    elementSelections: [],
    doc: null,
    project: null,
    currentPageId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
  });
  useProjectsStore.setState({ workspaces: [] });
  useWorkspaceStore.setState({ workspace: null, session: { kind: 'none' }, run: 0 });
});

function frame(id: string, pageId = 'pg_main'): BrowserNode {
  return {
    id,
    pageId,
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    order: 0,
    content: { homeUrl: 'http://localhost:3000/' },
  };
}

function docOf(nodes: BrowserNode[], revision = 4): CanvasDoc {
  return {
    schemaVersion: 2,
    docId: 'doc-1',
    revision,
    pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

const LANDED: WorkspaceCreated = {
  workspacePath: '/tmp/worktrees/shop',
  workspaceName: 'shop',
  branchName: 'studio/shop',
  baseBranch: 'main',
  sourceRepoName: 'shop',
  sourcePath: '/tmp/src/shop',
  sourceRepoRoot: '/tmp/src/shop',
  repoIdentity: 'repo-shop',
  copiedEnvFiles: [],
};

describe('what the gate publishes about the picker (ONL-2455)', () => {
  it('names the canvas mode and the tool, which are the picker’s activation', () => {
    expect(bridge.screen()).toMatchObject({ mode: 'design', tool: 'select' });
    useCanvasStore.setState({ mode: 'interact', tool: 'pan' });
    expect(bridge.screen()).toMatchObject({ mode: 'interact', tool: 'pan' });
  });

  it('carries the hovered element’s tag and path, and both counters', () => {
    noteHoverSend();
    noteGuestHover({ frameId: 'frame-1', tag: 'button', domPath: 'body > button', hitTests: 4 });
    const screen = bridge.screen();
    expect(screen.hovered).toEqual({
      frameId: 'frame-1',
      tag: 'button',
      domPath: 'body > button',
    });
    expect(screen.hitTests).toBe(4);
    expect(screen.hoverSends).toBeGreaterThan(0);
  });

  it('reports a miss as a hover with no identity', () => {
    noteGuestHover({ frameId: 'frame-1', tag: null, domPath: null, hitTests: 9 });
    expect(bridge.screen().hovered).toEqual({
      frameId: 'frame-1',
      tag: null,
      domPath: null,
    });
  });
});

describe('what the gate publishes about the bubble (ONL-2455)', () => {
  it('is null with none open', () => {
    expect(bridge.screen().inlineChat).toBeNull();
  });

  it('carries the draft’s LENGTH and never its text', () => {
    useCanvasStore.setState({
      inlineChat: {
        anchorId: 'el-1',
        draft: 'Make the hero bigger',
        expanded: true,
        entry: 'orb',
        placement: 'above',
        send: 'idle',
        refusal: null,
      },
    });
    const published = bridge.screen().inlineChat;
    expect(published).toEqual({
      anchorId: 'el-1',
      draftChars: 20,
      placement: 'above',
      send: 'idle',
      refusal: null,
    });
    expect(JSON.stringify(published)).not.toContain('Make the hero bigger');
  });
});

describe('the gate’s pick refusals (ONL-2455)', () => {
  it('names the mode, not an arming step, when the canvas is in Interact', () => {
    useCanvasStore.setState({ mode: 'interact' });
    const result = bridge.selectElement({ frameId: 'frame-1', selector: 'button' });
    expect(result.ok).toBe(false);
    const reason = result.ok ? '' : result.reason;
    expect(reason).toContain('interact');
    expect(reason).not.toContain('armed');
  });

  it('names the tool holding the pointer, not an arming step', () => {
    useCanvasStore.setState({ tool: 'pan' });
    const result = bridge.selectElement({ frameId: 'frame-1', selector: 'button' });
    expect(result.ok).toBe(false);
    const reason = result.ok ? '' : result.reason;
    expect(reason).toContain('pan');
    expect(reason).not.toContain('armed');
  });

  it('picks in Design with nothing armed, which is what the composer’s button stopped deciding', () => {
    const picks: string[] = [];
    const release = registerFramePicker('frame-1', {
      isArmed: true,
      pick: (selector) => picks.push(selector),
    });
    expect(bridge.selectElement({ frameId: 'frame-1', selector: 'button' })).toEqual({ ok: true });
    expect(picks).toEqual(['button']);
    release();
  });

  it('still refuses a frame the picker has not reached yet, and says so in those words', () => {
    const release = registerFramePicker('frame-2', { isArmed: false, pick: () => undefined });
    const result = bridge.selectElement({ frameId: 'frame-2', selector: 'button' });
    expect(result).toEqual({
      ok: false,
      reason: 'frame frame-2 has not been told the picker is live yet',
    });
    release();
  });
});

describe('the renderer’s own stores, beside main’s answer (ONL-2423)', () => {
  it('answers with empties on a tab holding nothing, never a throw', () => {
    expect(bridge.stores()).toEqual({
      projects: [],
      location: {
        screen: 'pending',
        workspacePath: null,
        repoIdentity: null,
        canvasProjectPath: null,
        isSwitching: false,
      },
      canvas: {
        doc: null,
        currentPageId: null,
        selectedNodeIds: [],
        hoveredNodeId: null,
        artifactReads: [],
      },
    });
  });

  it('carries the projects store’s own name, which is what a stale rename reads as', () => {
    useProjectsStore.setState({
      workspaces: [
        {
          repoIdentity: 'repo-shop',
          name: 'shop',
          sourcePath: '/tmp/src/shop',
          lastOpenedAt: '2026-10-01T00:00:00.000Z',
          archived: false,
          projects: [
            {
              workspacePath: '/tmp/worktrees/shop',
              name: 'shop',
              editableName: 'The old name',
              branchName: 'studio/shop',
              repoIdentity: 'repo-shop',
              lastOpenedAt: '2026-10-01T00:00:00.000Z',
              createdAt: '2026-10-01T00:00:00.000Z',
              missing: false,
              archived: false,
            },
          ],
        },
      ],
    });
    expect(bridge.stores().projects[0]?.projects[0]?.editableName).toBe('The old name');
  });

  it('reports the landed project and follows the switch flag', () => {
    useWorkspaceStore.setState({ workspace: LANDED });
    expect(bridge.stores().location).toMatchObject({
      workspacePath: '/tmp/worktrees/shop',
      repoIdentity: 'repo-shop',
      isSwitching: false,
    });
    useWorkspaceStore.setState({ session: { kind: 'opening', covered: true } });
    expect(bridge.stores().location.isSwitching).toBe(true);
    useWorkspaceStore.setState({ session: { kind: 'open', workspacePath: LANDED.workspacePath } });
    expect(bridge.stores().location.isSwitching).toBe(false);
  });

  it('shows a cleared switch as a null project beside the canvas’s surviving project (ONL-2139)', () => {
    useWorkspaceStore.setState({ workspace: LANDED });
    useCanvasStore.setState({ project: { path: '/tmp/worktrees/shop', name: 'shop' } });
    useWorkspaceStore.setState({ workspace: null });
    expect(bridge.stores().location).toMatchObject({
      workspacePath: null,
      repoIdentity: null,
      canvasProjectPath: '/tmp/worktrees/shop',
    });
  });

  it('counts the document’s nodes in the shape main answers with', () => {
    useCanvasStore.setState({ doc: docOf([frame('fr_1'), frame('fr_2')]), currentPageId: 'pg_main' });
    expect(bridge.stores().canvas.doc).toEqual({
      docId: 'doc-1',
      schemaVersion: 2,
      revision: 4,
      nodeCount: 2,
    });
    expect(bridge.stores().canvas.currentPageId).toBe('pg_main');
  });

  it('answers the page the canvas composes, not a stored id the document dropped (ONL-2488)', () => {
    useCanvasStore.setState({ doc: docOf([frame('fr_1')]), currentPageId: 'pg_deleted' });
    expect(bridge.stores().canvas.currentPageId).toBe('pg_main');
  });

  it('carries the node selection in recency order and the hovered node', () => {
    useCanvasStore.setState({
      doc: docOf([frame('fr_1'), frame('fr_2')]),
      selectedNodeIds: ['fr_2', 'fr_1'],
      hoveredNodeId: 'fr_2',
    });
    const canvas = bridge.stores().canvas;
    expect(canvas.selectedNodeIds).toEqual(['fr_2', 'fr_1']);
    expect(canvas.hoveredNodeId).toBe('fr_2');
  });

  it('leaves the element selections and the guest hover to the reads that own them', () => {
    noteGuestHover({ frameId: 'frame-1', tag: 'button', domPath: 'body > button', hitTests: 4 });
    useCanvasStore.setState({
      doc: docOf([frame('fr_1')]),
      hoveredNodeId: 'fr_1',
      elementSelections: [
        {
          frameNodeId: 'fr_1',
          stale: false,
          evidence: {
            kind: 'element',
            id: 'el-7',
            tag: 'button',
            domPath: 'body > button',
            outerHtmlSnippet: '<button>Buy</button>',
            textContent: 'Buy',
            classes: [],
            frameUrl: 'http://localhost:3000/',
          },
        },
      ],
    });
    // The canvas half answers while the element half is loaded, so an empty object could not pass this.
    const stores = bridge.stores();
    expect(stores.canvas.hoveredNodeId).toBe('fr_1');
    expect(JSON.stringify(stores)).not.toContain('body > button');
    expect(JSON.stringify(stores)).not.toContain('el-7');
    expect(bridge.selections()).toHaveLength(1);
  });
});

describe('the gate’s inline submit (ONL-2455)', () => {
  const openBubble = (draft: string): void => {
    useCanvasStore.setState({
      inlineChat: {
        anchorId: 'el-1',
        draft,
        expanded: true,
        entry: 'orb',
        placement: 'above',
        send: 'idle',
        refusal: null,
      },
    });
  };

  it('refuses with no bubble open', async () => {
    expect(await bridge.submitInline()).toEqual({
      ok: false,
      reason: 'no inline bubble is open on this canvas',
    });
  });

  it('refuses a bubble holding nothing to say — the element is the subject, not the request', async () => {
    openBubble('   ');
    expect(await bridge.submitInline()).toEqual({
      ok: false,
      reason: 'the bubble carries nothing to send',
    });
  });

  it('sends a bubble holding an image and no text (ONL-2549)', async () => {
    openBubble('   ');
    addInlineAttachment({
      ref: { id: 'blob-1', mediaType: 'image/png', width: 8, height: 8 },
      name: 'reference.png',
      previewUrl: 'blob:reference',
    });
    const sent: string[] = [];
    const unregister = registerChatSubmit({
      submit: (request) => {
        sent.push(...(request.images ?? []).map((ref) => ref.id));
        return Promise.resolve({ outcome: 'rejected' });
      },
    });

    // `rejected`, so the reason names the session: the gate let an image-only bubble through to it.
    expect(await bridge.submitInline()).toEqual({
      ok: false,
      reason: 'the session turned the send away',
    });
    expect(sent).toEqual(['blob-1']);
    unregister();
  });
});

describe('the artifact reads a sample would miss (ONL-2568)', () => {
  it('keeps every state change in order, and no re-render in between', () => {
    noteArtifactRead({ nodeId: 'n1', artifactId: 'art-1', state: 'reading' });
    noteArtifactRead({ nodeId: 'n1', artifactId: 'art-1', state: 'reading' });
    noteArtifactRead({ nodeId: 'n1', artifactId: 'art-1', state: 'resolved' });

    expect(bridge.stores().canvas.artifactReads).toEqual([
      { nodeId: 'n1', artifactId: 'art-1', state: 'reading', seq: 0 },
      { nodeId: 'n1', artifactId: 'art-1', state: 'resolved', seq: 1 },
    ]);
  });

  it('follows each node on its own, so two nodes cannot swallow each other’s transition', () => {
    noteArtifactRead({ nodeId: 'n2', artifactId: 'art-2', state: 'reading' });
    noteArtifactRead({ nodeId: 'n1', artifactId: 'art-1', state: 'missing' });
    noteArtifactRead({ nodeId: 'n2', artifactId: 'art-2', state: 'reading' });

    expect(bridge.stores().canvas.artifactReads.slice(2)).toEqual([
      { nodeId: 'n2', artifactId: 'art-2', state: 'reading', seq: 2 },
      { nodeId: 'n1', artifactId: 'art-1', state: 'missing', seq: 3 },
    ]);
  });
});
