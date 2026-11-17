import { describe, expect, it } from 'bun:test';
import { newProjectTargetFor, type WorkspaceSummary } from './projects.js';

const WORKSPACES: WorkspaceSummary[] = [
  {
    repoIdentity: 'github.com/fixture/monorepo',
    name: 'monorepo',
    sourcePath: '/repo/apps/web',
    lastOpenedAt: '2026-10-01T00:00:00.000Z',
    archived: false,
    projects: [],
  },
];

describe('newProjectTargetFor', () => {
  it('cuts from the selected workspace’s own source', () => {
    expect(newProjectTargetFor({ kind: 'workspace', repoIdentity: 'github.com/fixture/monorepo' }, WORKSPACES)).toEqual({
      kind: 'workspace',
      sourcePath: '/repo/apps/web',
    });
  });

  it('Recent selects no workspace, so New Project asks for a folder', () => {
    expect(newProjectTargetFor({ kind: 'recent' }, WORKSPACES)).toEqual({ kind: 'pick' });
  });

  it('an identity the list does not carry falls back to the picker rather than throwing', () => {
    expect(newProjectTargetFor({ kind: 'workspace', repoIdentity: 'github.com/fixture/gone' }, WORKSPACES)).toEqual({
      kind: 'pick',
    });
  });
});
