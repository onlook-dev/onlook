import { knownProject, workspaceOrigin } from './store.js';
import { previewProjectTools } from './preview-tools.js';
import { newPreviewAttempt, notePreviewDiagnostics, previewDiagnostics, type PreviewDiagnostics } from '../telemetry/preview-diagnostics.js';
import { serverBookEntries } from '../server/book.js';

export function restoreProjectPreviewDiagnostics(cwd: string, port: number): void {
  if (previewDiagnostics(cwd, port).expected_port !== null) return;
  const entry = serverBookEntries(cwd).find(candidate => candidate.ports.some(claimed => claimed.port === port));
  const claimed = entry?.ports.find(candidate => candidate.port === port);
  if (entry === undefined || claimed === undefined) return;
  notePreviewDiagnostics(cwd, {
    expected_port: claimed.port,
    actual_port: claimed.everLive ? claimed.port : null,
    was_live: entry.everMeasuredLive,
    cause: entry.everMeasuredLive ? 'server_down' : 'not_started',
    ...projectPreviewMetadata(cwd, entry.folder),
  });
}

export function recordProjectPreviewDiagnostics(cwd: string, patch: Partial<PreviewDiagnostics>, reset = false): void {
  notePreviewDiagnostics(cwd, {
    ...(reset ? { ...newPreviewAttempt(), was_live: previewDiagnostics(cwd).was_live } : {}),
    ...patch,
    ...projectPreviewMetadata(cwd),
  });
}

function projectPreviewMetadata(cwd: string, folder = cwd): Partial<PreviewDiagnostics> {
  const record = knownProject(cwd);
  const tools = previewProjectTools(folder);
  const fallback = folder !== cwd && (tools.framework === 'unknown' || tools.package_manager === 'unknown') ? previewProjectTools(cwd) : tools;
  const framework = tools.framework === 'unknown' ? fallback.framework : tools.framework;
  const manager = tools.package_manager === 'unknown' ? fallback.package_manager : tools.package_manager;
  return {
    ...(record === undefined ? {} : { project_source: workspaceOrigin(record) === 'blank' ? 'template' as const : 'imported' as const }),
    ...(framework === 'unknown' ? {} : { framework }),
    ...(manager === 'unknown' ? {} : { package_manager: manager }),
  };
}
