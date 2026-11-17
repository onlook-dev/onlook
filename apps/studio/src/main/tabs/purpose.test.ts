import { describe, expect, it } from 'bun:test';
import { tabPurpose } from './purpose.js';

describe('tabPurpose', () => {
  it('a tab showing a project is a project tab', () => {
    expect(tabPurpose({ workspacePath: '/w/one', isCreating: false })).toBe('project');
  });

  it('a tab MAKING one is a project tab before its worktree exists — the chip cannot wait for the cut', () => {
    expect(tabPurpose({ isCreating: true })).toBe('project');
  });

  it('a tab with neither is the projects list, which is a place rather than a tab', () => {
    expect(tabPurpose({ isCreating: false })).toBe('projects');
  });
});
