import { afterEach, expect, test } from 'bun:test';
import { failureContext, resetFailureContext } from './failure-context.js';

afterEach(resetFailureContext);

test('a project dead end keeps its failed setup stage without borrowing another project’s cause', () => {
  failureContext('project_setup_failed', { project_id: 'fixture-a', stage: 'installing', error_class: 'dependency_install_failed' }, {});
  expect(failureContext('dead_end_shown', { project_id: 'fixture-a', state: 'setup_failed', error_class: 'unknown' }, {})).toEqual({ error_class: 'dependency_install_failed', failure_cause: 'dependency_install_failed', failure_step: 'installing' });
  expect(failureContext('dead_end_shown', { project_id: 'fixture-b', state: 'setup_failed', error_class: 'unknown' }, {})['failure_cause']).toBe('unknown');
  failureContext('project_setup_completed', { project_id: 'fixture-a' }, {});
  expect(failureContext('dead_end_shown', { project_id: 'fixture-a', state: 'setup_failed' }, {})['failure_cause']).toBe('unknown');
});

test('known creation and preview causes survive common failure enrichment', () => {
  expect(failureContext('project_creation_failed', { failure_cause: 'git_not_found', failure_step: 'git_init', stage: 'setting-up' }, {})).toEqual({ failure_cause: 'git_not_found', failure_step: 'git_init' });
  expect(failureContext('dead_end_shown', { state: 'preview_failed', error_class: 'port_unreachable' }, { cause: 'process_exited' })).toEqual({ error_class: 'port_unreachable', failure_cause: 'process_exited', failure_step: 'preview_failed' });
  expect(failureContext('project_folder_refused', { reason: 'no-base-ref' }, {})).toEqual({ failure_cause: 'no-base-ref', failure_step: 'folder_validation' });
});
