import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { beginCreation, creationPreview, creationRegistered, creationStarted, forgetCreation, holdBlankPreview, settleCreationPreview } from './telemetry.js';
import { importedRepository, importLandingPending } from './announced.js';
import type { GithubObservation } from './capture.js';
import { workspaceTelemetryProperties } from '../telemetry/index.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';

const originalFlags = process.env['STUDIO_FLAGS'];
type ProofGlobal = typeof globalThis & { __studioGithubProof?: { observe(event: GithubObservation): void } };

beforeEach(() => {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeStateRoot({ name: 'import-creation-registry' });
  resetWorkspaceCache();
});

afterEach(() => {
  if (originalFlags === undefined) delete process.env['STUDIO_FLAGS']; else process.env['STUDIO_FLAGS'] = originalFlags;
  delete (globalThis as ProofGlobal).__studioGithubProof;
});

afterAll(() => {
  restoreWorkspaceRoot();
  resetWorkspaceCache();
  cleanupTempFixtures();
});

const register = (workspacePath: string, repoIdentity: string, origin?: 'duplicate'): void => {
  rememberProject({ workspacePath, workspaceName: 'slate-swift', branchName: 'tester/slate-swift', baseBranch: 'main', sourceRepoName: 'test', sourcePath: '/private-source', sourceRepoRoot: '/private-source', repoIdentity, copiedEnvFiles: [], ...(origin === undefined ? {} : { origin }) });
};

test('folder, scratch and GitHub funnels reach preview with bounded source fields and no repository metadata', () => {
  process.env['STUDIO_FLAGS'] = 'github-import';
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  for (const source of ['folder', 'scratch', 'github'] as const) {
    const path = `/private/designer/${source}/secret-repository`;
    const identity = `github.com/private-owner/${source}-secret`;
    beginCreation(path, source);
    creationRegistered(path, identity);
    const created = events.at(-1)!.properties as { project_id: string };
    creationPreview(created.project_id, 'success');
  }
  expect(events.map((event) => event.properties)).toMatchObject([
    { source: 'folder', step: 'started' }, { source: 'folder', step: 'created' }, { source: 'folder', step: 'preview' },
    { source: 'scratch', step: 'started' }, { source: 'scratch', step: 'created' }, { source: 'scratch', step: 'preview' },
    { source: 'github', step: 'started' }, { source: 'github', step: 'created' }, { source: 'github', step: 'preview' },
  ]);
  expect(JSON.stringify(events)).not.toContain('secret'); expect(JSON.stringify(events)).not.toContain('private-owner');
  for (const event of events) expect(Object.keys(event.properties).every((key) => ['source', 'step', 'outcome', 'project_id'].includes(key))).toBe(true);
});

test('with every flag at its public default, folder and blank creations record started, created and preview', () => {
  process.env['STUDIO_FLAGS'] = '';
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  for (const source of ['folder', 'scratch'] as const) {
    const identity = `github.com/public/${source}-default`;
    beginCreation(`/private/public/${source}`, source);
    creationRegistered(`/private/public/${source}`, identity, `/private/public-workspaces/${source}`);
    creationPreview(workspaceTelemetryProperties(identity).project_id, 'success', `/private/public-workspaces/${source}`);
  }
  expect(events.map((event) => event.properties)).toMatchObject([
    { source: 'folder', step: 'started' }, { source: 'folder', step: 'created' }, { source: 'folder', step: 'preview', outcome: 'success' },
    { source: 'scratch', step: 'started' }, { source: 'scratch', step: 'created' }, { source: 'scratch', step: 'preview', outcome: 'success' },
  ]);
});

test('a creation whose workspace is removed before any preview leaves nothing to record', () => {
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  const identity = 'github.com/team/removed-before-preview';
  beginCreation('/private/removed-before-preview', 'folder');
  creationRegistered('/private/removed-before-preview', identity);
  forgetCreation(identity);
  expect(creationPreview(workspaceTelemetryProperties(identity).project_id, 'success')).toBeUndefined();
  expect(events.map((event) => event.properties)).toMatchObject([{ step: 'started' }, { step: 'created' }]);
});

test('folder choices count from opening the picker including an abandoned choice without duplicate starts', () => {
  process.env['STUDIO_FLAGS'] = 'github-import';
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  creationStarted('folder');
  expect(events).toHaveLength(1);
  creationStarted('folder');
  beginCreation('/private/folder-picker', 'folder', false);
  beginCreation('/private/folder-picker', 'folder');
  creationRegistered('/private/folder-picker', 'github.com/team/picked');
  expect(events.map((event) => event.properties)).toMatchObject([
    { source: 'folder', step: 'started' }, { source: 'folder', step: 'started' }, { source: 'folder', step: 'created' },
  ]);
});

test('only the Project an import cloned carries its repository, and it is still there after a relaunch', () => {
  process.env['STUDIO_FLAGS'] = 'github-import';
  register('/private/workspace-cloned', 'github.com/team/cloned');
  register('/private/workspace-picked', 'github.com/team/picked');
  beginCreation('/private/cloned', 'github');
  creationRegistered('/private/cloned', 'github.com/team/cloned', '/private/workspace-cloned');
  beginCreation('/private/picked', 'folder');
  creationRegistered('/private/picked', 'github.com/team/picked', '/private/workspace-picked');
  expect(importedRepository('/private/workspace-picked')).toBeUndefined();
  expect(importedRepository('/private/workspace-cloned')).toBe('team/cloned');
  expect(importLandingPending('/private/workspace-picked')).toBe(false);
  /* A relaunch reads the Project's own record, so the toast still names the repository (ONL-3182). */
  resetWorkspaceCache();
  expect(importedRepository('/private/workspace-cloned')).toBe('team/cloned');
  expect(importLandingPending('/private/workspace-cloned')).toBe(true);
});

test('a loading frame never completes the creation funnel', () => {
  process.env['STUDIO_FLAGS'] = 'github-import';
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  const identity = 'github.com/team/loading-example';
  beginCreation('/private/loading-example', 'github');
  creationRegistered('/private/loading-example', identity);
  const { project_id } = workspaceTelemetryProperties(identity);
  expect(settleCreationPreview(project_id, 'loading', '/private/loading-example')).toBeUndefined();
  expect(events.filter((event) => 'step' in event.properties && event.properties.step === 'preview')).toEqual([]);
  settleCreationPreview(project_id, 'live', '/private/loading-example');
  expect(events.at(-1)?.properties).toMatchObject({ source: 'github', step: 'preview', outcome: 'success' });
});

const settleLive = (repoIdentity: string, worktreePath: string) =>
  settleCreationPreview(workspaceTelemetryProperties(repoIdentity).project_id, 'live', worktreePath);

test('a creation names its path on its first preview, and a later one reads as a reopen (ONL-3257)', () => {
  const identity = 'github.com/team/entry-import';
  register('/private/designer/workspaces/entry-import', identity);
  beginCreation('/private/designer/source/entry-import', 'folder');
  creationRegistered('/private/designer/source/entry-import', identity, '/private/designer/workspaces/entry-import');
  expect([1, 2].map(() => settleLive(identity, '/private/designer/workspaces/entry-import'))).toEqual(['import', 'reopen']);
});

test('a blank names itself before it is registered (ONL-3257)', () => {
  const release = holdBlankPreview('/private/designer/workspaces/entry-blank');
  expect(settleLive('blank:entry-blank', '/private/designer/workspaces/entry-blank')).toBe('blank');
  release();
  expect(settleLive('blank:entry-blank', '/private/designer/workspaces/entry-blank')).toBeUndefined();
});

test('a sibling project settling first leaves the new project its own first preview (ONL-3257)', () => {
  const identity = 'github.com/team/entry-sibling';
  register('/private/designer/workspaces/entry-sibling-old', identity);
  register('/private/designer/workspaces/entry-sibling-new', identity);
  beginCreation('/private/designer/source/entry-sibling', 'folder');
  creationRegistered('/private/designer/source/entry-sibling', identity, '/private/designer/workspaces/entry-sibling-new');
  expect(settleLive(identity, '/private/designer/workspaces/entry-sibling-old')).toBe('reopen');
  expect(settleLive(identity, '/private/designer/workspaces/entry-sibling-new')).toBe('import');
});

test('a duplicate, or a project the registry does not know, carries no entry point (ONL-3257)', () => {
  register('/private/designer/workspaces/entry-duplicate', 'github.com/team/entry-duplicate', 'duplicate');
  expect(settleLive('github.com/team/entry-duplicate', '/private/designer/workspaces/entry-duplicate')).toBeUndefined();
  expect(settleLive('github.com/team/entry-unknown', '/private/designer/workspaces/entry-unknown')).toBeUndefined();
});
