import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { switchOutcome } from './switchOutcome.js';

const previous = {
  workspacePath: '/w/previous',
  sourcePath: '/s/previous',
  repoIdentity: 'r1',
  branchName: 'wren/one',
} as unknown as WorkspaceCreated;
const incoming = { ...previous, workspacePath: '/w/incoming' } as WorkspaceCreated;
const state = (over: Record<string, unknown>): ProjectCreateState => ({ sourceRepoName: 'repo', ...over }) as ProjectCreateState;

describe('switchOutcome', () => {
  it('restores on a refusal and on a failure that never landed', () => {
    expect(switchOutcome(previous, state({ kind: 'refused', reason: 'already-copied' }))).toBe('restore');
    expect(switchOutcome(previous, state({ kind: 'failed', phase: 'planning' }))).toBe('restore');
    expect(switchOutcome(previous, state({ kind: 'failed', phase: 'copying' }))).toBe('restore');
  });

  it('drops the stash once the machine has landed a project (inverse: a successful switch keeps the new one)', () => {
    expect(switchOutcome(previous, state({ kind: 'failed', phase: 'installing', workspace: incoming }))).toBe('drop');
    expect(switchOutcome(previous, state({ kind: 'ready', workspace: incoming }))).toBe('drop');
    expect(switchOutcome(previous, state({ kind: 'installing', workspace: incoming }))).toBe('drop');
    expect(switchOutcome(previous, state({ kind: 'starting', workspace: incoming }))).toBe('drop');
    expect(switchOutcome(previous, state({ kind: 'live', workspace: incoming }))).toBe('drop');
  });

  it('waits through planning and copying, and drops on a canceled creation', () => {
    expect(switchOutcome(previous, state({ kind: 'planning' }))).toBe('wait');
    expect(switchOutcome(previous, state({ kind: 'copying', workspaceName: 'x' }))).toBe('wait');
    expect(switchOutcome(previous, state({ kind: 'canceled' }))).toBe('drop');
  });

  it('does nothing when the flow was not switching', () => {
    expect(switchOutcome(null, state({ kind: 'refused', reason: 'already-copied' }))).toBe('none');
    expect(switchOutcome(previous, null)).toBe('none');
  });
});

