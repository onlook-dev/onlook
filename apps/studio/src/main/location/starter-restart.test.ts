import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { WorkspaceOrigin } from '@studio/events';
import { createServerEntry, resetServerBookCache } from '../server/book.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { restartStarterOnOpen, type StarterRestartDeps } from './starter-restart.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function makeWorktree(name: string): string {
  const root = makeWorkspaceRoot({ name: `starter-restart-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  resetWorkspaceCache();
  const worktree = join(root, 'blank', 'teal-skylark');
  mkdirSync(worktree, { recursive: true });
  return worktree;
}

function remember(worktree: string, origin: WorkspaceOrigin): void {
  rememberProject({
    workspacePath: worktree,
    workspaceName: 'teal-skylark',
    branchName: 'studio/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'blank',
    sourcePath: join(worktree, '..', 'source'),
    sourceRepoRoot: join(worktree, '..', 'source'),
    repoIdentity: 'blank',
    origin,
    copiedEnvFiles: [],
  });
}

function makeDeps(script: { present: boolean; running?: number }): {
  deps: StarterRestartDeps;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      isBlankProject: () => true,
      starter: {
        isPresent: () => script.present,
        portFor: () => script.running,
      },
      start: async (_worktree, port) => {
        calls.push(`start:${String(port)}`);
      },
    },
  };
}

describe('restartStarterOnOpen', () => {
  it('starts the starter on the book-remembered port when server.mjs is present', async () => {
    const worktree = makeWorktree('present');
    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    const { deps, calls } = makeDeps({ present: true });

    expect(await restartStarterOnOpen(worktree, deps)).toBe('spawned');
    expect(calls).toEqual(['start:4310']);
  });

  it('does nothing when the book holds no `studio-started` entry — a retired project\'s leftover file is never forked', async () => {
    const worktree = makeWorktree('no-entry');
    createServerEntry(worktree, { folder: worktree, port: 3000, ownership: 'agent-started' });
    const { deps, calls } = makeDeps({ present: true });

    expect(await restartStarterOnOpen(worktree, deps)).toBe('absent');
    expect(calls).toEqual([]);
  });

  it('does nothing when server.mjs is absent, even with a remembered port — the project opens as an imported one', async () => {
    const worktree = makeWorktree('absent');
    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    const { deps, calls } = makeDeps({ present: false });

    expect(await restartStarterOnOpen(worktree, deps)).toBe('absent');
    expect(calls).toEqual([]);
  });

  it('reads the origin off the workspace registry by default: blank spawns, imported does not', async () => {
    const worktree = makeWorktree('registry');
    const { deps, calls } = makeDeps({ present: true });
    delete deps.isBlankProject;

    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    remember(worktree, 'imported');
    expect(await restartStarterOnOpen(worktree, deps)).toBe('absent');
    expect(calls).toEqual([]);

    remember(worktree, 'blank');
    expect(await restartStarterOnOpen(worktree, deps)).toBe('spawned');
    expect(calls).toEqual(['start:4310']);
  });

  it('does nothing when the starter already runs — the creation path just reported it', async () => {
    const worktree = makeWorktree('running');
    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    const { deps, calls } = makeDeps({ present: true, running: 4310 });

    expect(await restartStarterOnOpen(worktree, deps)).toBe('already-running');
    expect(calls).toEqual([]);
  });

  it('does nothing without a starter host', async () => {
    const worktree = makeWorktree('no-host');
    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    const { deps, calls } = makeDeps({ present: true });
    deps.starter = undefined;

    expect(await restartStarterOnOpen(worktree, deps)).toBe('absent');
    expect(calls).toEqual([]);
  });
});
