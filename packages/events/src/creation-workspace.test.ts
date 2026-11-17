import { describe, expect, it } from 'bun:test';
import { creationWorkspace, type ProjectCreateState, type WorkspaceCreated } from './workspace.js';

const workspace = { workspacePath: '/w/one', workspaceName: 'amber-heron' } as unknown as WorkspaceCreated;

describe('the worktree a creation names', () => {
  for (const state of [
    { kind: 'ready', workspace },
    { kind: 'installing', workspace },
    { kind: 'starting', workspace },
    { kind: 'live', workspace },
  ] as ProjectCreateState[]) {
    it(`answers for ${state.kind}`, () => {
      expect(creationWorkspace(state)?.workspacePath).toBe('/w/one');
    });
  }

  for (const state of [
    { kind: 'planning', sourceRepoName: 'silt' },
    { kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' },
    { kind: 'refused', sourceRepoName: 'silt', reason: 'no-base-ref' },
    { kind: 'canceled' },
  ] as ProjectCreateState[]) {
    it(`answers nothing for ${state.kind}, which has no worktree`, () => {
      expect(creationWorkspace(state)).toBeUndefined();
    });
  }

  it('answers for a failure that already had one', () => {
    expect(creationWorkspace({ kind: 'failed', sourceRepoName: 'silt', phase: 'starting', workspace })).toBe(workspace);
  });

  it('answers nothing for a failure that never got one', () => {
    expect(creationWorkspace({ kind: 'failed', sourceRepoName: 'silt', phase: 'copying' })).toBeUndefined();
  });
});
