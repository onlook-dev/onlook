import { sep } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import {
  cleanupTempFixtures,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { revealProject, type RevealDeps } from './reveal.js';
import { rememberProject, resetWorkspaceCache } from './store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function project(name: string, overrides: Partial<WorkspaceCreated> = {}): string {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: `reveal-${name}` });
  resetWorkspaceCache();
  const worktree = makeDirWithFiles({ name: `reveal-${name}`, files: { 'src/app.ts': 'export {};\n' } });
  rememberProject({
    workspacePath: worktree,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: `/somewhere/${name}`,
    sourceRepoRoot: `/somewhere/${name}`,
    repoIdentity: `fixture/${name}`,
    copiedEnvFiles: [],
    ...overrides,
  });
  return worktree;
}

interface Recorder extends RevealDeps {
  shown: string[];
  captured: { event: string; properties: Record<string, unknown> }[];
}

function recorder(onDisk = true): Recorder {
  const shown: string[] = [];
  const captured: Recorder['captured'] = [];
  return {
    shown,
    captured,
    reveal: (path) => {
      shown.push(path);
    },
    exists: () => onDisk,
    capture: (event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
  };
}

describe('revealProject', () => {
  it('refuses a directory no project claims, and shows nothing', () => {
    const worktree = project('unknown');
    const deps = recorder();

    const outcome = revealProject(`${worktree}-elsewhere`, deps);

    expect(outcome).toEqual({ ok: false, reason: 'unknown-project' });
    expect(deps.shown).toEqual([]);
    expect(deps.captured).toEqual([]);
  });

  it('shows the folder the registry holds, not the path the caller sent', () => {
    const worktree = project('equivalent');
    const deps = recorder();
    const sameFolder = `${worktree}${sep}src${sep}..`;

    const outcome = revealProject(sameFolder, deps);

    expect(outcome).toEqual({ ok: true });
    expect(deps.shown).toEqual([worktree]);
    expect(deps.shown[0]).not.toBe(sameFolder);
  });

  it('refuses a folder that is no longer there, and shows nothing', () => {
    // `showItemInFolder` reports nothing, so the path is checked before it is handed over.
    const worktree = project('failing');
    const deps = recorder(false);
    recordLinesForTesting();
    try {
      const outcome = revealProject(worktree, deps);

      expect(outcome).toEqual({ ok: false, reason: 'open-failed' });
      const warned = peekLinesForTesting().filter(
        (line) => line.subsystem === 'workspace' && line.level === 'warn',
      );
      expect(warned).toHaveLength(1);
    } finally {
      resetLogForTesting();
    }
    expect(deps.shown).toEqual([]);
    expect(deps.captured).toEqual([]);
  });

  it('records the reveal with the hashed repo and its origin, and no path, branch or name', () => {
    const worktree = project('telemetry', { displayName: 'Pricing Page', origin: 'blank' });
    const deps = recorder();

    revealProject(worktree, deps);

    expect(deps.captured).toEqual([
      {
        event: 'project_revealed',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          origin: 'blank',
        },
      },
    ]);
    const shipped = JSON.stringify(deps.captured);
    expect(shipped).not.toContain('Pricing');
    expect(shipped).not.toContain('fixture/');
    expect(shipped).not.toContain(worktree);
    expect(shipped).not.toContain('teal-skylark');
  });

  it('a record with no origin reveals as imported', () => {
    const worktree = project('legacy');
    const deps = recorder();

    revealProject(worktree, deps);

    expect(deps.captured[0]?.properties['origin']).toBe('imported');
  });
});
