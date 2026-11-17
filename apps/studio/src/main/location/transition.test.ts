import { afterAll, describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import {
  cleanupTempFixtures,
  held,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
  settle,
} from '@studio/fixtures';
import {
  applyAgentCreateFrame,
  canvasSnapshot,
  deactivateCanvas,
  flushCanvas,
  listAgentFrames,
  openCanvasForProject,
} from '../canvas/index.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';
import { applyLocationTransition, type LocationTransitionDeps } from './transition.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `location-transition-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetCanvasRegistryCache();
  return root;
}

function makeDeps(): { deps: LocationTransitionDeps; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      setLocation: (location) => calls.push(`setLocation:${location.kind}`),
      stopStarterExcept: () => calls.push('stopStarterExcept'),
      openCanvas: async (worktreePath) => {
        calls.push('openCanvas');
        await openCanvasForProject(worktreePath);
      },
      deactivateCanvas: () => {
        calls.push('deactivateCanvas');
        deactivateCanvas();
      },
      deactivateServerBook: () => calls.push('deactivateServerBook'),
      reverifyServerBook: () => calls.push('reverifyServerBook'),
      projectOpened: () => calls.push('projectOpened'),
      restartStarter: () => calls.push('restartStarter'),
    },
  };
}

describe('location:set', () => {
  it('opening a project loads its canvas and keeps every other starter off', async () => {
    const root = useOwnWorkspaceRoot('open');
    const worktree = join(root, 'repo', 'w');
    const { deps, calls } = makeDeps();

    await applyLocationTransition({ kind: 'project', repoIdentity: 'repo', workspacePath: worktree }, deps);

    expect(calls).toEqual([
      'setLocation:project',
      'stopStarterExcept',
      'openCanvas',
      'reverifyServerBook',
      'projectOpened',
      'restartStarter',
    ]);
    expect((await canvasSnapshot()).doc).not.toBeNull();
    await flushCanvas();
  });

  it('the projects list DEACTIVATES — the document stays open and its session keeps its tools', async () => {
    const root = useOwnWorkspaceRoot('projects');
    const worktree = join(root, 'repo', 'w');
    const { deps, calls } = makeDeps();

    await applyLocationTransition({ kind: 'project', repoIdentity: 'repo', workspacePath: worktree }, deps);
    const created = await applyAgentCreateFrame(worktree, { url: 'http://localhost:3000' });
    if (!created.ok) throw new Error(`expected a create, got: ${created.reason}`);
    calls.length = 0;

    await applyLocationTransition({ kind: 'projects' }, deps);

    expect(calls).toEqual([
      'setLocation:projects',
      'stopStarterExcept',
      'deactivateCanvas',
      'deactivateServerBook',
    ]);
    expect(await canvasSnapshot()).toEqual({ doc: null });
    expect((await listAgentFrames(worktree)).map((frame) => frame.homeUrl)).toEqual([
      'http://localhost:3000/',
    ]);
    await applyLocationTransition({ kind: 'project', repoIdentity: 'repo', workspacePath: worktree }, deps);
    expect((await canvasSnapshot()).doc?.nodes[created.node.id]).toBeDefined();
    await flushCanvas();
  });

  it('a project record with no workspacePath touches no host — guessing could unload what is on screen', async () => {
    const root = useOwnWorkspaceRoot('legacy-shape');
    const worktree = join(root, 'repo', 'w');
    const { deps, calls } = makeDeps();

    await applyLocationTransition({ kind: 'project', repoIdentity: 'repo', workspacePath: worktree }, deps);
    calls.length = 0;

    await applyLocationTransition({ kind: 'project' } as never, deps);

    expect(calls).toEqual(['setLocation:project', 'stopStarterExcept']);
    expect((await canvasSnapshot()).doc).not.toBeNull();
    await flushCanvas();
  });
});

describe('location:set runs in order per sender (ONL-2265)', () => {
  it("a back-out's projects transition runs after the abandoned project transition's tail, and the canvas ends deactivated", async () => {
    const root = useOwnWorkspaceRoot('queued-back-out');
    const worktree = join(root, 'repo', 'w');
    const { deps, calls } = makeDeps();
    const opening = held();
    const heldDeps: LocationTransitionDeps = {
      ...deps,
      openCanvas: async (worktreePath) => {
        calls.push('openCanvas');
        await opening.wait();
        await openCanvasForProject(worktreePath);
      },
    };
    const inOrder = createKeyedQueue<number>();

    const project = inOrder.run(1,() =>
      applyLocationTransition({ kind: 'project', repoIdentity: 'repo', workspacePath: worktree }, heldDeps),
    );
    const projects = inOrder.run(1,() => applyLocationTransition({ kind: 'projects' }, heldDeps));
    await settle();
    expect(calls).toEqual(['setLocation:project', 'stopStarterExcept', 'openCanvas']);

    opening.open();
    await Promise.all([project, projects]);

    expect(calls).toEqual([
      'setLocation:project',
      'stopStarterExcept',
      'openCanvas',
      'reverifyServerBook',
      'projectOpened',
      'restartStarter',
      'setLocation:projects',
      'stopStarterExcept',
      'deactivateCanvas',
      'deactivateServerBook',
    ]);
    expect(await canvasSnapshot()).toEqual({ doc: null });
    await flushCanvas();
  });
});
