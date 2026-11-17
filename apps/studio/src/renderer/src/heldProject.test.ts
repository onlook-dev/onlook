import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { heldProjectPath, parkedAssignment } from './heldProject.js';

const PROJECT = { tabId: 'tab-2', purpose: 'project', workspacePath: '/w/red-skylark', repoIdentity: 'r' } as const;

describe('heldProjectPath (ONL-2593)', () => {
  it('reopens the project main still holds for a reloaded tab', () => {
    expect(heldProjectPath('projects', PROJECT)).toBe('/w/red-skylark');
  });

  it('leaves a tab holding no project on Projects', () => {
    expect(heldProjectPath('projects', { tabId: 'tab-1', purpose: 'projects' })).toBeUndefined();
    expect(heldProjectPath('projects', null)).toBeUndefined();
  });

  it('leaves a parked birth to its own assignment path', () => {
    expect(heldProjectPath('parked', PROJECT)).toBeUndefined();
  });
});

describe('parkedAssignment (ONL-2744)', () => {
  const workspace = {
    workspacePath: '/w/red-skylark',
    workspaceName: 'red-skylark',
    branchName: 'studio/red-skylark',
    baseBranch: 'main',
    sourceRepoName: 'site',
    sourcePath: '/src/site',
    sourceRepoRoot: '/src/site',
    repoIdentity: 'r',
    copiedEnvFiles: [],
  } satisfies WorkspaceCreated;
  const failedStarting: ProjectCreateState = { kind: 'failed', sourceRepoName: 'site', phase: 'starting', workspace };

  it('takes no assignment when the creation record already lands the view, so no second switch is raised', () => {
    expect(parkedAssignment(PROJECT, failedStarting)).toBeNull();
  });

  it('takes the assignment when the view has no creation record', () => {
    expect(parkedAssignment(PROJECT, null)).toBe(PROJECT);
  });

  it('takes the assignment when the creation was canceled, which lands nothing', () => {
    expect(parkedAssignment(PROJECT, { kind: 'canceled' })).toBe(PROJECT);
  });
});
