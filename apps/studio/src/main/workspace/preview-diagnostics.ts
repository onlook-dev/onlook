import { knownProject, workspaceOrigin } from './store.js';
import { previewProjectTools } from './preview-tools.js';
import { newPreviewAttempt, notePreviewDiagnostics, previewDiagnostics, type PreviewDiagnostics } from '../telemetry/preview-diagnostics.js';

export function recordProjectPreviewDiagnostics(cwd: string, patch: Partial<PreviewDiagnostics>, reset = false): void {
  const record = knownProject(cwd);
  notePreviewDiagnostics(cwd, {
    ...(reset ? { ...newPreviewAttempt(), was_live: previewDiagnostics(cwd).was_live } : {}),
    ...(record === undefined ? {} : { project_source: workspaceOrigin(record) === 'blank' ? 'template' as const : 'imported' as const }),
    ...previewProjectTools(cwd),
    ...patch,
  });
}
