import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { isBrowserNode, firstRestingPageId } from '@studio/events';
import type { CanvasDoc, CanvasNode, ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { CanvasDocumentStore } from '../canvas/adapter.js';
import { emptyCanvasDoc } from '../canvas/document.js';
import { createCanvasHost } from '../canvas/index.js';
import { resolveCreateFrameOps } from '../canvas/authors.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { applyLocationTransition } from '../location/transition.js';
import { resetServerBookCache } from '../server/book.js';
import { createServerHost } from '../server/index.js';
import { createCancelToken } from './cancel.js';
import { createProject, placeFirstFrame, type ProjectCreateDeps } from './create-project.js';
import {
  awaitProjectOpen,
  awaitStartOutcome,
  noteProjectOpen,
  noteSetupReport,
  resetSetupSignals,
} from './setup-signals.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

beforeEach(() => {
  resetSetupSignals();
});

function memoryStore(): CanvasDocumentStore {
  let stored: CanvasDoc | null = null;
  return {
    load: async (docId) =>
      stored === null ? { outcome: 'fresh', doc: emptyCanvasDoc(docId) } : { outcome: 'existing', doc: stored },
    persist: async (doc) => {
      stored = doc;
    },
    appendHistory: async () => {},
    readHistory: async () => [],
    subscribe: () => () => {},
  };
}

function setup(name: string): { host: ReturnType<typeof createCanvasHost>; worktree: string } {
  const root = makeWorkspaceRoot({ name: `first-frame-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetCanvasRegistryCache();
  const host = createCanvasHost({ store: memoryStore(), emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });
  const worktree = join(root, 'repo', 'w');
  void awaitStartOutcome(worktree, createCancelToken(), (port) =>
    placeFirstFrame((resolve) => host.apply('system', resolve, worktree), port),
  );
  return { host, worktree };
}

async function frames(host: ReturnType<typeof createCanvasHost>, worktree: string): Promise<CanvasNode[]> {
  return Object.values((await host.snapshotFor(worktree)).doc?.nodes ?? {});
}

describe("the server report answers with Studio's first frame, on the real canvas host (ONL-2424)", () => {
  it('names the frame it placed, and the canvas already holds that one frame when the answer arrives', async () => {
    const { host, worktree } = setup('placed');
    await host.open(worktree);

    const answer = await noteSetupReport(worktree, 5173);

    if (answer.kind !== 'placed') throw new Error(`expected placed, got ${JSON.stringify(answer)}`);
    expect((await frames(host, worktree)).map((node) => node.id)).toEqual([answer.node.id]);
    expect(answer.node.content.homeUrl).toContain('5173');
  });

  it('names the frame that already shows the port and adds none', async () => {
    const { host, worktree } = setup('already');
    await host.open(worktree);
    const existing = await host.apply(
      'agent',
      (doc) => [
        {
          type: 'create',
          node: {
            id: 'fr_agent',
            pageId: firstRestingPageId(doc),
            kind: 'browser',
            name: 'Home',
            x: 0,
            y: 0,
            width: 1280,
            height: 800,
            order: 0,
            content: { homeUrl: 'http://localhost:5173/' },
          },
        },
      ],
      worktree,
    );
    expect(existing.ok).toBe(true);

    const answer = await noteSetupReport(worktree, 5173);

    expect(answer).toMatchObject({ kind: 'already-shown', node: { id: 'fr_agent' } });
    expect((await frames(host, worktree)).map((node) => node.id)).toEqual(['fr_agent']);
  });

  it('points a frame the agent left pending at the reported port, path kept, and adds no second frame (ONL-2960)', async () => {
    const { host, worktree } = setup('pending');
    await host.open(worktree);
    const parked = await host.apply('agent', (doc) => resolveCreateFrameOps(doc, { url: 'http://localhost:5173/app', pending: true, mintId: () => 'fr_waiting' }), worktree);
    expect(parked.ok).toBe(true);
    expect((await frames(host, worktree))[0]).toMatchObject({ content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:5173/app' } });

    const answer = await noteSetupReport(worktree, 4801);

    expect(answer).toMatchObject({ kind: 'placed', node: { id: 'fr_waiting', content: { homeUrl: 'http://localhost:4801/app' } } });
    const after = await frames(host, worktree);
    expect(after.map((node) => node.id)).toEqual(['fr_waiting']);
    expect(after[0]?.kind === 'browser' ? after[0].content.pendingHomeUrl : 'not a frame').toBeUndefined();
  });

  it("passes the canvas's own refusal to the agent when the placement fails, leaving the canvas empty", async () => {
    const { host, worktree } = setup('failed');
    const refused = await host.apply('system', () => [], worktree);
    if (refused.ok) throw new Error('expected the unopened canvas to refuse');

    const answer = await noteSetupReport(worktree, 5173);

    expect(answer).toEqual({ kind: 'not-placed', reason: refused.reason });
    expect(await frames(host, worktree)).toEqual([]);
  });
});

describe('the start report lands on an open project, whenever the tab opens it (ONL-2448)', () => {
  const PORT = 63993;
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  function world(name: string, openBoundMs = 2_000) {
    const root = makeWorkspaceRoot({ name: `first-frame-order-${name}` });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetCanvasRegistryCache();
    resetServerBookCache();
    const worktree = join(root, 'repo', 'w');
    mkdirSync(worktree, { recursive: true });
    const canvas = createCanvasHost({ store: memoryStore(), emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });
    const server = createServerHost({
      emit: () => undefined,
      createPortFollow: () => ({ observed: () => undefined }),
      authorPortMove: () => undefined,
      attributionRoots: () => ({ workspaceRoot: root, sourceRepoRoot: root }),
      isBlankProject: () => false,
      probe: async (port) => port === PORT,
      identify: async () => ({ pid: 1, cwd: worktree }),
      delay: tick,
      timing: { runningFailures: 1, waitingAttempts: 3 },
    });
    const intents: string[] = [];
    const land = (): Promise<void> =>
      applyLocationTransition(
        { kind: 'project', repoIdentity: 'repo', workspacePath: worktree },
        {
          setLocation: () => undefined,
          stopStarterExcept: () => undefined,
          openCanvas: (path) => canvas.open(path),
          deactivateCanvas: () => undefined,
          deactivateServerBook: () => undefined,
          reverifyServerBook: (path) => void server.openProject(path),
          projectOpened: noteProjectOpen,
          restartStarter: () => undefined,
        },
      );
    const unreached = (): never => {
      throw new Error('a resume at starting does not reach this');
    };
    const deps: ProjectCreateDeps = {
      plan: unreached,
      fabricate: unreached,
      rollback: unreached,
      register: unreached,
      install: unreached,
      startSession: unreached,
      capture: () => undefined,
      awaitIdle: async () => 'idle',
      detect: async () => ({ asks: [] }),
      awaitOpen: (cwd, token) => awaitProjectOpen(cwd, token, openBoundMs),
      awaitStart: awaitStartOutcome,
      sendStartIntent: async (cwd) => {
        intents.push(cwd);
        void server.report(cwd, cwd, PORT).then(() => noteSetupReport(cwd, PORT));
        return true;
      },
      authorFrame: (cwd, port) => placeFirstFrame((resolve) => canvas.apply('system', resolve, cwd), port),
      awaitRunning: (cwd, port, boundMs) => server.awaitRunning(cwd, port, boundMs),
      runningBoundMs: 2_000,
      emit: () => undefined,
    };
    const workspace: WorkspaceCreated = {
      workspacePath: worktree,
      workspaceName: 'w',
      branchName: 'w',
      baseBranch: 'main',
      sourceRepoName: 'repo',
      sourcePath: root,
      sourceRepoRoot: root,
      repoIdentity: 'repo',
      copiedEnvFiles: [],
    };
    const start = (): Promise<ProjectCreateState> =>
      createProject({ sourcePath: root, entryPoint: 'projects' }, deps, createCancelToken(), {
        phase: 'starting',
        workspace,
      });
    return { canvas, server, worktree, intents, land, start };
  }

  async function framesAt(w: ReturnType<typeof world>): Promise<string[]> {
    return (await frames(w.canvas, w.worktree)).filter(isBrowserNode).map((node) => node.content.homeUrl);
  }

  it('the tab opening the project after the agent could have reported still places one frame and goes live', async () => {
    const w = world('late');

    const setup = w.start();
    await sleep(30);
    await w.land();
    const state = await setup;

    expect(state.kind).toBe('live');
    expect(await framesAt(w)).toEqual([expect.stringContaining(String(PORT))]);
    w.server.dispose();
  });

  it('the tab opening the project first places one frame and goes live', async () => {
    const w = world('early');

    await w.land();
    const state = await w.start();

    expect(state.kind).toBe('live');
    expect(await framesAt(w)).toEqual([expect.stringContaining(String(PORT))]);
    w.server.dispose();
  });

  it('a project its tab never opens fails at starting without asking the agent to start it', async () => {
    const w = world('never', 50);

    const state = await w.start();

    expect(state).toMatchObject({ kind: 'failed', phase: 'starting' });
    expect(w.intents).toEqual([]);
    w.server.dispose();
  });
});
