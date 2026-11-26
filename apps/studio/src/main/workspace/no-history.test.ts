import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';
import { resetUserEnvForTests } from '../env/shell-env.js';
import { STATIC_ADAPTER, STATIC_FILES } from '../starter/adapters/static.js';
import { restoreRetiredStarterServerFile } from '../starter/retire.js';
import { STARTER_SERVER_FILE } from '../starter/scaffold.js';
import { measure } from '../git-status/measure.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { resetServerBookCache } from '../server/book.js';
import { flushAllDomains } from '../state/store.js';
import { createBlankProject, type BlankCreateDeps } from './create-blank.js';
import { createCancelToken } from './cancel.js';
import { knownProject, listWorkspaces, projectHasNoHistory, rememberProject, resetWorkspaceCache } from './store.js';
import { teardownProject } from './remove.js';
import { completeDuplicateRegistration, fabricateDuplicate, planDuplicate } from './duplicate.js';
import { renameProjectByAgent } from './rename.js';
import { fabricateFromPlan, planWorkspace, rollbackFromPlan } from './index.js';
import { newProjectSource } from './store.js';

const originalPath = process.env['PATH'];

afterEach(() => {
  if (originalPath === undefined) delete process.env['PATH'];
  else process.env['PATH'] = originalPath;
  resetUserEnvForTests();
});

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function setup() {
  const root = makeWorkspaceRoot({ name: 'blank-no-history' });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  process.env['PATH'] = '';
  resetUserEnvForTests(async () => ({ PATH: '' }));
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  const announced: WorkspaceCreated[] = [];
  const events: string[] = [];
  const deps: BlankCreateDeps = {
    adapter: async () => ({ adapter: STATIC_ADAPTER }),
    starter: { spawn: async () => 4310, stop: async () => {} },
    server: { openProject: async () => {}, report: async () => {}, awaitRunning: async () => 'running' },
    canvas: { open: async () => {} },
    emitStage: () => {},
    capture: (event) => { events.push(event); },
    announce: (workspace) => { announced.push(workspace); },
  };
  return { root, deps, announced, events };
}

describe('blank projects without Git', () => {
  it('creates the same scaffold in a private project, reaches preview, and reopens without history', async () => {
    const { root, deps, announced, events } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('blank creation failed');
    const workspace = result.workspace;
    expect(workspace.history).toBe('none');
    expect(workspace.workspacePath.startsWith(root)).toBe(true);
    expect(existsSync(join(workspace.workspacePath, '.git'))).toBe(false);
    expect(existsSync(join(workspace.sourceRepoRoot, '.git'))).toBe(false);
    expect(readFileSync(join(workspace.sourceRepoRoot, 'index.html'), 'utf8')).toBe(STATIC_FILES['index.html']!);
    for (const [name, content] of Object.entries(STATIC_FILES)) {
      expect(readFileSync(join(workspace.workspacePath, name), 'utf8')).toBe(content);
    }
    expect(announced).toEqual([workspace]);
    expect(events).toContain('project_created');
    expect(events).not.toContain('project_creation_failed');
    await flushAllDomains();
    resetWorkspaceCache();
    expect(knownProject(workspace.workspacePath)?.history).toBe('none');
    expect(projectHasNoHistory(workspace.workspacePath)).toBe(true);
  });

  it('reports a stable history-free status without attempting GitHub or Git commands', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'onboarding' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    const status = await measure(result.workspace.workspacePath, { baseBranch: 'main', fetch: true });
    expect(status.measurement).toMatchObject({ history: 'none', gitInstalled: false, origin: 'none', head: 'unborn' });
    expect(status.fetched).toBeUndefined();
  });

  it('preserves starter and design files without calling Git for a project without history', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    const cwd = result.workspace.workspacePath;
    writeFileSync(join(cwd, STARTER_SERVER_FILE), 'starter');
    let calls = 0;
    const run = async () => { calls++; throw new Error('must not run Git'); };
    await restoreRetiredStarterServerFile(cwd, { run });
    expect(readFileSync(join(cwd, STARTER_SERVER_FILE), 'utf8')).toBe('starter');
    rmSync(join(cwd, STARTER_SERVER_FILE));
    await restoreRetiredStarterServerFile(cwd, { run });
    expect(calls).toBe(0);
    expect(existsSync(join(cwd, STARTER_SERVER_FILE))).toBe(false);
    expect(readFileSync(join(cwd, 'index.html'), 'utf8')).toBe(STATIC_FILES['index.html']);
  });

  it('rolls back a failed first preview instead of registering a partial project', async () => {
    const { root, deps, announced, events } = setup();
    deps.server.awaitRunning = async () => 'timed-out';
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    expect(result.ok).toBe(false);
    expect(announced).toEqual([]);
    expect(readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expect(events).toContain('project_creation_failed');
  });

  it('cancels without leaving a project directory or registry entry', async () => {
    const { root, deps, announced } = setup();
    const token = createCancelToken();
    deps.starter.spawn = async () => { token.cancel(); return 4310; };
    const result = await createBlankProject({ entryPoint: 'projects' }, deps, token);
    expect(result).toMatchObject({ ok: false, canceled: true });
    expect(announced).toEqual([]);
    expect(readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it('deletes the app-owned bucket without needing Git', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    const cwd = result.workspace.workspacePath;
    const removed = await teardownProject(cwd, {
      closeServer: async () => {}, stopStarter: async () => {}, releaseSession: async () => {},
      closeCanvas: async () => {}, sweep: async () => {},
    });
    expect(removed.ok).toBe(true);
    expect(existsSync(cwd)).toBe(false);
    expect(knownProject(cwd)).toBeUndefined();
  });

  it('duplicates the files and canvas without Git and preserves the original', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    const cwd = result.workspace.workspacePath;
    writeFileSync(join(cwd, 'design.txt'), 'A new design');
    const plan = await planDuplicate(cwd);
    if (plan.kind !== 'ready') throw new Error('duplicate planning failed');
    const duplicated = await fabricateDuplicate(plan);
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) throw new Error('duplicate failed');
    rememberProject(duplicated.workspace);
    completeDuplicateRegistration(duplicated.workspace.workspacePath);
    expect(projectHasNoHistory(duplicated.workspace.workspacePath)).toBe(true);
    expect(readFileSync(join(duplicated.workspace.workspacePath, 'design.txt'), 'utf8')).toBe('A new design');
    expect(existsSync(join(duplicated.workspace.workspacePath, '.git'))).toBe(false);
    expect(readFileSync(join(cwd, 'design.txt'), 'utf8')).toBe('A new design');
  });

  it('renames a history-free project without attempting a branch rename', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    const renamed = await renameProjectByAgent(result.workspace.workspacePath, 'New Design', {
      renameBranch: async () => { throw new Error('no Git command should run'); }, capture: () => {},
    });
    expect(renamed).toMatchObject({ ok: true, name: 'New Design' });
    expect(knownProject(result.workspace.workspacePath)?.displayName).toBe('New Design');
  });

  it('creates a fresh blank sibling from the registered source without Git', async () => {
    const { deps } = setup();
    const result = await createBlankProject({ entryPoint: 'projects' }, deps);
    if (!result.ok) throw new Error('blank creation failed');
    writeFileSync(join(result.workspace.workspacePath, 'index.html'), '<p>Changed design</p>');
    const plan = await planWorkspace(newProjectSource(result.workspace));
    if (plan.kind !== 'ready') throw new Error('sibling planning failed');
    const sibling = await fabricateFromPlan(plan);
    if (!sibling.ok) throw new Error('sibling creation failed');
    expect(sibling.workspace.history).toBe('none');
    expect(sibling.workspace.repoIdentity).toBe(result.workspace.repoIdentity);
    expect(readFileSync(join(sibling.workspace.workspacePath, 'index.html'), 'utf8')).toBe(STATIC_FILES['index.html']!);
    expect(existsSync(join(sibling.workspace.workspacePath, '.git'))).toBe(false);
    await rollbackFromPlan(plan);
    expect(existsSync(sibling.workspace.workspacePath)).toBe(false);
    expect(readFileSync(join(result.workspace.workspacePath, 'index.html'), 'utf8')).toBe('<p>Changed design</p>');
  });
});
