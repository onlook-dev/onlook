import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { BlankEntryPoint, WorkspaceCreated, WorkspacePlan } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot, makeWorkspaceRoot } from '@studio/fixtures';
import type { AppLike } from '../telemetry/index.js';

const { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } =
  await import('../telemetry/index.js');
const { rememberProject, resetWorkspaceCache } = await import('./store.js');
const { recordFolderRefused, recordProjectArchived, recordWorkspacesReordered } = await import('./telemetry.js');

const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_WORKSPACE_ROOT', 'STUDIO_POSTHOG_KEY'] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);
const realFetch = globalThis.fetch;

let workspaceRootDir: string;

function register(repoIdentity: string, workspaceName: string): string {
  const workspacePath = join(workspaceRootDir, repoIdentity, workspaceName);
  mkdirSync(workspacePath, { recursive: true });
  const record: WorkspaceCreated = {
    workspacePath,
    workspaceName,
    branchName: `user/${workspaceName}`,
    baseBranch: 'main',
    sourceRepoName: repoIdentity,
    sourcePath: `/nowhere/${repoIdentity}`,
    sourceRepoRoot: `/nowhere/${repoIdentity}`,
    repoIdentity,
    copiedEnvFiles: [],
  };
  rememberProject(record);
  return workspacePath;
}

beforeEach(() => {
  resetTelemetryForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'workspace-telemetry-state' });
  workspaceRootDir = makeWorkspaceRoot({ name: 'workspace-telemetry' });
  process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRootDir;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  resetWorkspaceCache();
  setAppForTesting({
    getPath: () => workspaceRootDir,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  } satisfies AppLike);
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
  initTelemetry();
});

afterEach(() => {
  resetTelemetryForTesting();
  resetWorkspaceCache();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  cleanupTempFixtures();
});

function captured(name: string): Record<string, unknown>[] {
  return peekQueueForTesting()
    .filter((event) => event.event === name)
    .map((event) => event.properties);
}

describe('recordProjectArchived', () => {
  it('a project archive captures the hashed project id, the state and the list size', () => {
    const workspacePath = register('teal-repo', 'teal-skylark');
    register('amber-repo', 'amber-wren');

    recordProjectArchived({ target: 'project', workspacePath, archived: true });

    const [event] = captured('project_archived');
    expect(event).toBeDefined();
    expect(event!['target']).toBe('project');
    expect(event!['archived']).toBe(true);
    expect(event!['workspace_count']).toBe(2);
    expect(event!['project_id']).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(event)).not.toContain('teal-skylark');
    expect(JSON.stringify(event)).not.toContain('teal-repo');
    expect(JSON.stringify(event)).not.toContain(workspaceRootDir);
  });

  it('unarchiving a workspace rides the same event with archived false', () => {
    register('teal-repo', 'teal-skylark');

    recordProjectArchived({ target: 'workspace', repoIdentity: 'teal-repo', archived: false });

    const [event] = captured('project_archived');
    expect(event!['target']).toBe('workspace');
    expect(event!['archived']).toBe(false);
    expect(event!['workspace_count']).toBe(1);
    expect(JSON.stringify(event)).not.toContain('teal-repo');
  });

  it('a project outside the registry captures nothing', () => {
    recordProjectArchived({
      target: 'project',
      workspacePath: '/tmp/not-a-workspace',
      archived: true,
    });

    expect(captured('project_archived')).toHaveLength(0);
  });

  it('the two targets agree on the id for one repo', () => {
    const workspacePath = register('teal-repo', 'teal-skylark');

    recordProjectArchived({ target: 'project', workspacePath, archived: true });
    recordProjectArchived({ target: 'workspace', repoIdentity: 'teal-repo', archived: true });

    const events = captured('project_archived');
    expect(events[0]!['project_id']).toBe(events[1]!['project_id']);
  });
});

describe('recordWorkspacesReordered', () => {
  it('counts the rows and the largest shift, and carries no identity', () => {
    recordWorkspacesReordered(
      ['github.com/acme/alpha', 'github.com/acme/beta', 'github.com/acme/gamma'],
      ['github.com/acme/gamma', 'github.com/acme/alpha', 'github.com/acme/beta'],
    );

    const [event] = captured('workspaces_reordered');
    expect(event!['workspace_count']).toBe(3);
    expect(event!['moved_distance']).toBe(2);
    expect(JSON.stringify(event)).not.toContain('acme');
  });

  it('a drag that changed nothing reads as zero', () => {
    recordWorkspacesReordered(['alpha', 'beta', 'gamma'], ['alpha', 'beta', 'gamma']);

    expect(captured('workspaces_reordered')[0]!['moved_distance']).toBe(0);
  });

  it('a row absent from the previous order does not move the distance', () => {
    recordWorkspacesReordered(['alpha'], ['alpha', 'beta']);

    const [event] = captured('workspaces_reordered');
    expect(event!['workspace_count']).toBe(2);
    expect(event!['moved_distance']).toBe(0);
  });
});

describe('a refused folder pick (ONL-2895)', () => {
  function emitted(plan: WorkspacePlan, entryPoint: BlankEntryPoint | undefined): unknown[] {
    const events: unknown[] = [];
    recordFolderRefused(plan, entryPoint, (event, properties) => events.push({ event, properties }));
    return events;
  }

  it('records the reason and where the pick came from, and nothing else', () => {
    const plan: WorkspacePlan = { kind: 'refused', reason: 'already-copied', projectName: 'acme-site', detail: '/Users/x/acme' };

    expect(emitted(plan, 'onboarding')).toStrictEqual([
      { event: 'project_folder_refused', properties: { reason: 'already-copied', entry_point: 'onboarding' } },
    ]);
  });

  it('records nothing for a plan nobody picked, or one that was not refused', () => {
    expect(emitted({ kind: 'refused', reason: 'nothing-to-copy' }, undefined)).toStrictEqual([]);
    expect(emitted({ kind: 'ready' } as WorkspacePlan, 'projects')).toStrictEqual([]);
  });
});
