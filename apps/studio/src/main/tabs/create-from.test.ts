import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';
import { listWorkspaces, rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { createFromSource } from './create-from.js';

afterAll(() => {
  restoreWorkspaceRoot();
  resetWorkspaceCache();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `create-from-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  return root;
}

function imported(workspacePath: string, sourcePath: string, sourceRepoRoot: string): WorkspaceCreated {
  return {
    workspacePath,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'monorepo',
    sourcePath,
    sourceRepoRoot,
    repoIdentity: 'github.com/fixture/monorepo',
    copiedEnvFiles: [],
  };
}

function subfolderImport(name: string): { web: string } {
  const root = useOwnWorkspaceRoot(name);
  const web = join(root, 'repo', 'apps', 'web');
  mkdirSync(web, { recursive: true });
  rememberProject(imported('/w/one', web, join(root, 'repo')));
  return { web };
}

describe('createFromSource', () => {
  it('a tab showing a project cuts from that project’s own source, not the repository above it', () => {
    const { web } = subfolderImport('record');

    expect(createFromSource({ workspacePath: '/w/one' })).toBe(web);
  });

  it('a tab naming a project the registry never recorded resolves nothing, so `+` stays disabled', () => {
    useOwnWorkspaceRoot('unknown');

    expect(createFromSource({ workspacePath: '/w/gone' })).toBeUndefined();
  });

  it('a tab with no project of its own takes the context source it was given', () => {
    useOwnWorkspaceRoot('context');

    expect(createFromSource({ contextSource: '/repo/apps/web' })).toBe('/repo/apps/web');
  });

  it('a tab with neither resolves nothing', () => {
    useOwnWorkspaceRoot('neither');

    expect(createFromSource({})).toBeUndefined();
  });

  it('agrees with the workspace’s own answer when every project was cut from one source', () => {
    const { web } = subfolderImport('agree');

    const [workspace] = listWorkspaces();

    expect(workspace?.sourcePath).toBe(web);
    expect(createFromSource({ workspacePath: '/w/one' })).toBe(web);
  });
});
