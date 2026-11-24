import { isHarnessId } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { setupFailureContext } from './setup-failure.js';

const projectFailures = new Map<string, Record<string, unknown>>();

function known(value: unknown): unknown {
  return value === undefined || value === 'unknown' ? undefined : value;
}

export function failureContext(event: string, properties: object, preview: { cause?: string }, workspacePath?: string): Record<string, unknown> {
  const values = properties as Record<string, unknown>;
  const project = workspacePath === undefined ? undefined : canonicalPath(workspacePath);
  if ((event === 'project_created' || event === 'project_setup_started' || event === 'project_setup_completed') && project !== undefined) projectFailures.delete(project);
  const isFailure = ['project_creation_failed', 'project_setup_failed', 'project_folder_refused', 'dead_end_shown'].includes(event);
  if (!isFailure) return {};
  const harness = isHarnessId(values['harness']) ? values['harness'] : undefined;
  const setup = event === 'dead_end_shown' && values['state'] === 'setup_failed' && known(values['error_class']) === undefined ? setupFailureContext(harness) : undefined;
  const saved = event === 'dead_end_shown' && harness === undefined && project !== undefined ? projectFailures.get(project) : undefined;
  const errorClass = known(values['error_class']) ?? setup?.error_class ?? saved?.['error_class'];
  const cause = known(values['failure_cause']) ?? known(preview.cause) ?? setup?.error_class ?? saved?.['failure_cause'] ?? errorClass ?? (event === 'project_folder_refused' ? values['reason'] : undefined);
  const step = known(values['failure_step']) ?? saved?.['failure_step'] ?? values['stage'] ?? (event === 'project_folder_refused' ? 'folder_validation' : values['state']);
  const result = { ...setup, ...(errorClass === undefined ? {} : { error_class: errorClass }), failure_cause: cause ?? 'unknown', failure_step: step ?? 'unknown' };
  if (event === 'project_setup_failed' && project !== undefined) {
    if (projectFailures.size >= 64) projectFailures.delete(projectFailures.keys().next().value!);
    projectFailures.set(project, result);
  }
  return result;
}

export function resetFailureContext(): void {
  projectFailures.clear();
}
