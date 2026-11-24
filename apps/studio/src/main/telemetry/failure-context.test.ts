import { afterEach, expect, test } from 'bun:test';
import { failureContext, resetFailureContext } from './failure-context.js';

afterEach(resetFailureContext);

test('a project dead end keeps its failed setup stage without borrowing another project’s cause', () => {
  const firstPath = '/workspaces/fixture-a';
  const secondPath = '/workspaces/fixture-b';
  const properties = { project_id: 'fixture-shared', state: 'setup_failed', error_class: 'unknown' };
  const firstFailure = failureContext('project_setup_failed', { project_id: 'fixture-shared', stage: 'installing', error_class: 'dependency_install_failed' }, {}, firstPath);
  expect(failureContext('dead_end_shown', properties, {}, secondPath)['failure_cause']).toBe('unknown');
  const secondFailure = failureContext('project_setup_failed', { project_id: 'fixture-shared', stage: 'starting', error_class: 'agent_turn_failed' }, {}, secondPath);
  const firstDeadEnd = failureContext('dead_end_shown', properties, {}, firstPath);
  const secondDeadEnd = failureContext('dead_end_shown', properties, {}, secondPath);
  expect(firstDeadEnd).toEqual({ error_class: 'dependency_install_failed', failure_cause: 'dependency_install_failed', failure_step: 'installing' });
  expect(secondDeadEnd).toEqual({ error_class: 'agent_turn_failed', failure_cause: 'agent_turn_failed', failure_step: 'starting' });
  failureContext('project_setup_completed', { project_id: 'fixture-shared' }, {}, firstPath);
  expect(failureContext('dead_end_shown', properties, {}, firstPath)['failure_cause']).toBe('unknown');
  expect(failureContext('dead_end_shown', properties, {}, secondPath)).toEqual(secondDeadEnd);
  const serialized = JSON.stringify([firstFailure, secondFailure, firstDeadEnd, secondDeadEnd]);
  expect(serialized).not.toContain(firstPath);
  expect(serialized).not.toContain(secondPath);
});

test('project lifecycle resets use canonical Project scope without clearing a sibling Project', () => {
  for (const event of ['project_created', 'project_setup_started', 'project_setup_completed']) {
    failureContext('project_setup_failed', { project_id: 'fixture-shared', stage: 'installing', error_class: 'dependency_install_failed' }, {}, '/workspaces/fixture-a');
    failureContext('project_setup_failed', { project_id: 'fixture-shared', stage: 'starting', error_class: 'agent_turn_failed' }, {}, '/workspaces/fixture-b');
    const properties = { project_id: 'fixture-shared', state: 'setup_failed' };
    expect(failureContext('dead_end_shown', properties, {}, '/workspaces/fixture-a/../fixture-a')['failure_cause']).toBe('dependency_install_failed');
    failureContext(event, { project_id: 'fixture-shared' }, {}, '/workspaces/fixture-a/../fixture-a');
    expect(failureContext('dead_end_shown', properties, {}, '/workspaces/fixture-a')['failure_cause']).toBe('unknown');
    expect(failureContext('dead_end_shown', properties, {}, '/workspaces/fixture-b')['failure_cause']).toBe('agent_turn_failed');
  }
});

test('events without Project scope neither borrow nor replace or clear remembered Project failures', () => {
  const properties = { project_id: 'fixture-shared', state: 'setup_failed' };
  failureContext('project_setup_failed', { ...properties, stage: 'installing', error_class: 'dependency_install_failed' }, {}, '/workspaces/fixture-a');
  expect(failureContext('dead_end_shown', properties, {})['failure_cause']).toBe('unknown');
  failureContext('project_setup_failed', { ...properties, stage: 'starting', error_class: 'agent_turn_failed' }, {});
  expect(failureContext('dead_end_shown', properties, {})['failure_cause']).toBe('unknown');
  failureContext('project_created', { project_id: 'fixture-shared' }, {});
  expect(failureContext('dead_end_shown', properties, {}, '/workspaces/fixture-a')['failure_cause']).toBe('dependency_install_failed');
  expect(failureContext('dead_end_shown', properties, {}, '/workspaces/fixture-b')['failure_cause']).toBe('unknown');
});

test('known creation and preview causes survive common failure enrichment', () => {
  expect(failureContext('project_creation_failed', { failure_cause: 'git_not_found', failure_step: 'git_init', stage: 'setting-up' }, {})).toEqual({ failure_cause: 'git_not_found', failure_step: 'git_init' });
  expect(failureContext('dead_end_shown', { state: 'preview_failed', error_class: 'port_unreachable' }, { cause: 'process_exited' })).toEqual({ error_class: 'port_unreachable', failure_cause: 'process_exited', failure_step: 'preview_failed' });
  expect(failureContext('project_folder_refused', { reason: 'no-base-ref' }, {})).toEqual({ failure_cause: 'no-base-ref', failure_step: 'folder_validation' });
});
