type PreviewFailureCause = 'unknown' | 'install_failed' | 'prepare_failed' | 'process_exited' | 'process_error' | 'readiness_timeout' | 'port_occupied' | 'listener_foreign' | 'listener_unseen' | 'reported_port_mismatch' | 'user_stop' | 'server_down' | 'not_started' | 'start_turn_no_report' | 'start_request_failed';

export interface PreviewDiagnostics {
  cause: PreviewFailureCause;
  expected_port: number | null;
  actual_port: number | null;
  reported_port: number | null;
  port_occupied: boolean | null;
  port_owner: 'project' | 'other' | 'unknown' | null;
  process_exited: boolean | null;
  exit_code: number | null;
  exit_signal: string | null;
  stderr_tail: string;
  spawn_to_failure_ms: number | null;
  framework: 'Next.js' | 'Remix' | 'Gatsby' | 'Astro' | 'SvelteKit' | 'Svelte' | 'Nuxt' | 'Vue' | 'Angular' | 'Solid' | 'Vite' | 'unknown';
  package_manager: 'bun' | 'npm' | 'pnpm' | 'yarn' | 'unknown';
  project_source: 'template' | 'imported' | 'unknown';
  install_succeeded: boolean | null;
  was_live: boolean;
}

const EMPTY_DIAGNOSTICS: PreviewDiagnostics = {
  cause: 'unknown', expected_port: null, actual_port: null, reported_port: null,
  port_occupied: null, port_owner: null, process_exited: null, exit_code: null,
  exit_signal: null, stderr_tail: '', spawn_to_failure_ms: null,
  framework: 'unknown', package_manager: 'unknown', project_source: 'unknown',
  install_succeeded: null, was_live: false,
};

const diagnostics = new Map<string, PreviewDiagnostics>();
const endpoints = new Map<string, Map<number, PreviewDiagnostics>>();

export function notePreviewDiagnostics(workspacePath: string, patch: Partial<PreviewDiagnostics>): void {
  const key = canonicalPath(workspacePath);
  const previous = previewDiagnostics(workspacePath);
  const baseline = patch.expected_port === undefined ? previous : patch.expected_port === null ? EMPTY_DIAGNOSTICS : previewDiagnostics(workspacePath, patch.expected_port);
  const next = { ...baseline, ...patch };
  next.framework = next.framework === 'unknown' ? previous.framework : next.framework;
  next.package_manager = next.package_manager === 'unknown' ? previous.package_manager : next.package_manager;
  next.project_source = next.project_source === 'unknown' ? previous.project_source : next.project_source;
  if (patch.install_succeeded === undefined && next.install_succeeded === null) next.install_succeeded = previous.install_succeeded;
  if (patch.expected_port === null && previous.expected_port !== null) endpoints.get(key)?.delete(previous.expected_port);
  diagnostics.set(key, next);
  if (next.expected_port !== null) {
    let ports = endpoints.get(key);
    if (ports === undefined) { ports = new Map(); endpoints.set(key, ports); }
    ports.set(next.expected_port, next);
  }
}

export function previewDiagnostics(workspacePath?: string, port?: number): PreviewDiagnostics {
  const key = workspacePath === undefined ? undefined : canonicalPath(workspacePath);
  const project = key === undefined ? undefined : diagnostics.get(key);
  const ports = key === undefined ? undefined : endpoints.get(key);
  const endpoint = port === undefined ? project : ports?.get(port) ?? [...(ports?.values() ?? [])].find(candidate => candidate.actual_port === port);
  return { ...EMPTY_DIAGNOSTICS, ...endpoint, ...(project === undefined ? {} : { framework: project.framework, package_manager: project.package_manager, project_source: project.project_source }) };
}

export function resetPreviewDiagnostics(): void {
  diagnostics.clear();
  endpoints.clear();
}

export function newPreviewAttempt(): PreviewDiagnostics {
  return { ...EMPTY_DIAGNOSTICS };
}

const STDERR_CODES = /\b(?:EADDRINUSE|EACCES|EPERM|ENOENT|ENOSPC|ENOMEM|ECONNREFUSED|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_PNPM_OUTDATED_LOCKFILE|ERESOLVE|ENOTFOUND|ETIMEDOUT|CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE)\b/g;

export function previewStderrTail(stderr: string): string {
  return (stderr.slice(-8192).split('\n').slice(-5).map(line => {
    const codes = line.match(STDERR_CODES);
    return codes ? [...new Set(codes)].join(' ') : line.trim() ? '[redacted]' : '';
  }).filter(Boolean).join('\n')).slice(-512);
}

export function reportedPreviewPort(output: string): number | null {
  const matches = [...output.slice(-32768).matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d{1,5})(?=[/\s\x1b]|$)/g)];
  const port = Number(matches.at(-1)?.[1]);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

export function previewFailureDiagnostics(event: string, properties: object, workspacePath?: string): Partial<PreviewDiagnostics> {
  const values = properties as Record<string, unknown>;
  if (event === 'dead_end_shown' && values['state'] === 'preview_failed') {
    if (typeof values['server_port'] === 'number') {
      const endpoint = previewDiagnostics(workspacePath, values['server_port']);
      return { ...endpoint, cause: endpoint.cause === 'unknown' && values['cover'] === 'non-started' ? 'not_started' : endpoint.cause };
    }
    const project = previewDiagnostics(workspacePath);
    return {
      ...EMPTY_DIAGNOSTICS,
      framework: project.framework,
      package_manager: project.package_manager,
      project_source: project.project_source,
      install_succeeded: project.install_succeeded,
      was_live: project.was_live,
      cause: values['cover'] === 'non-started' ? 'not_started' : 'unknown',
    };
  }
  const failed = (event === 'project_setup_failed' && values['error_class'] === 'dev_server_failed') ||
    (event === 'preview_ready' && values['outcome'] === 'failure') ||
    (event === 'dead_end_shown' && values['state'] === 'preview_failed') ||
    (event === 'frame_state_changed' && values['state'] === 'unreachable') ||
    event === 'dev_server_exited' ||
    (event === 'project_setup_run_completed' && values['ok'] === false);
  return failed ? previewDiagnostics(workspacePath) : {};
}
import { canonicalPath } from '../lib/canonical-path.js';
