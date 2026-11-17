import { describe, expect, it } from 'bun:test';
import { tabClosed, tabCreated, tabSelected } from './telemetry.js';

const WORKTREE_A = '/Users/someone/.onlook/workspaces/acme/crimson-avocet';
const WORKTREE_B = '/Users/someone/.onlook/workspaces/acme/teal-heron';
const projectIdOf = (path: string): string | undefined => (path === WORKTREE_A ? 'hash-a' : path === WORKTREE_B ? 'hash-b' : undefined);
const workspacePropertiesOf = (path: string) => {
  const project_id = projectIdOf(path);
  return project_id === undefined ? undefined : { project_id, workspace_instance_id: `instance-${project_id}` };
};

describe('tab_selected', () => {
  it('carries both hashed ids, the count after the switch, and whether the target was working', () => {
    const props = tabSelected(
      { from: { workspacePath: WORKTREE_A, isWorking: false }, to: { workspacePath: WORKTREE_B, isWorking: true }, openCount: 2, method: 'click' },
      projectIdOf,
    );
    expect(props).toEqual({ method: 'click', open_count: 2, from_project_id: 'hash-a', to_project_id: 'hash-b', to_was_working: true });
    expect(JSON.stringify(props)).not.toContain('/');
  });

  it('a tab with no project sends no id for its side', () => {
    const props = tabSelected({ from: undefined, to: { isWorking: false }, openCount: 1, method: 'tab_created' }, projectIdOf);
    expect(props).toEqual({ method: 'tab_created', open_count: 1, to_was_working: false });
  });
});

describe('tab_created', () => {
  it('a landed tab carries its hashed id; one still cutting carries none', () => {
    expect(tabCreated({ tab: { workspacePath: WORKTREE_A, isWorking: false }, openCount: 3, method: 'plus' }, workspacePropertiesOf)).toEqual({ method: 'plus', open_count: 3, project_id: 'hash-a', workspace_instance_id: 'instance-hash-a' });
    expect(tabCreated({ tab: { isWorking: false }, openCount: 3, method: 'plus' }, workspacePropertiesOf)).toEqual({ method: 'plus', open_count: 3 });
  });

  it('a path the registry does not know sends no id rather than the path', () => {
    const props = tabCreated({ tab: { workspacePath: '/Users/someone/elsewhere', isWorking: false }, openCount: 1, method: 'launch' }, workspacePropertiesOf);
    expect(props).toEqual({ method: 'launch', open_count: 1 });
  });
});

describe('tab_closed', () => {
  it('names whether work was running and the modal choice only when a modal showed', () => {
    expect(tabClosed({ tab: { workspacePath: WORKTREE_A, isWorking: true }, openCount: 1, method: 'close_button' })).toEqual({
      method: 'close_button',
      open_count: 1,
      had_running_work: true,
    });
    expect(tabClosed({ tab: { isWorking: false }, openCount: 0, method: 'hotkey', modalChoice: 'wait' })).toEqual({
      method: 'hotkey',
      open_count: 0,
      had_running_work: false,
      modal_choice: 'wait',
    });
  });
});
