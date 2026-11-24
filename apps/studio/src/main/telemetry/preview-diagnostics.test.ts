import { afterEach, expect, it } from 'bun:test';
import { newPreviewAttempt, notePreviewDiagnostics, previewDiagnostics, previewFailureDiagnostics, previewStderrTail, reportedPreviewPort, resetPreviewDiagnostics } from './preview-diagnostics.js';

afterEach(resetPreviewDiagnostics);

it('attaches a cause and explicit unknown diagnostics to every preview failure path', () => {
  for (const [event, properties] of [
    ['project_setup_failed', { error_class: 'dev_server_failed' }],
    ['preview_ready', { outcome: 'failure' }],
    ['dead_end_shown', { state: 'preview_failed' }],
    ['project_setup_run_completed', { ok: false }],
  ] as const) expect(previewFailureDiagnostics(event, properties)).toMatchObject({ cause: 'unknown', actual_port: null, process_exited: null, install_succeeded: null });
  expect(previewFailureDiagnostics('preview_ready', { outcome: 'success' })).toEqual({});
});

it('isolates project diagnostics and clears stale failures on a new start', () => {
  notePreviewDiagnostics('one', { cause: 'process_exited', exit_code: 17, expected_port: 4100, stderr_tail: 'ENOENT', install_succeeded: false });
  expect(previewFailureDiagnostics('project_setup_failed', { project_id: 'shared-workspace', error_class: 'dev_server_failed' }, 'one')).toMatchObject({ cause: 'process_exited', exit_code: 17 });
  expect(previewFailureDiagnostics('project_setup_failed', { project_id: 'shared-workspace', error_class: 'dev_server_failed' }, 'two')).toMatchObject({ cause: 'unknown', exit_code: null });
  expect(previewDiagnostics('two')).toMatchObject({ cause: 'unknown', exit_code: null });
  notePreviewDiagnostics('one', newPreviewAttempt());
  expect(previewDiagnostics('one')).toMatchObject({ cause: 'unknown', exit_code: null, stderr_tail: '', install_succeeded: null });
});

it('exports only allowlisted error codes from a bounded stderr tail', () => {
  const privateOutput = 'contact person@example.test at /workspace/sample-app\nTOKEN=secret-value https://private.example.test\nError: EADDRINUSE in sample-component.ts\ncustom user text';
  expect(previewStderrTail(privateOutput)).toBe('[redacted]\n[redacted]\nEADDRINUSE\n[redacted]');
  expect(previewStderrTail('secret '.repeat(10000))).toBe('[redacted]');
});

it('does not attribute an unaddressed canvas cover to a different endpoint in the Project', () => {
  notePreviewDiagnostics('one', { cause: 'process_exited', expected_port: 4100, actual_port: 4100, exit_code: 17, was_live: true, framework: 'Vite' });
  for (const cover of ['nothing', 'mixed', 'dead']) {
    expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover }, 'one')).toMatchObject({
      cause: 'unknown', expected_port: null, actual_port: null, exit_code: null, process_exited: null, was_live: true, framework: 'Vite',
    });
  }
});

it('attributes a single-server canvas cover to its measured endpoint rather than the latest server', () => {
  notePreviewDiagnostics('one', { cause: 'process_exited', expected_port: 4100, actual_port: 4101, reported_port: 4101, exit_code: 17 });
  notePreviewDiagnostics('one', { ...newPreviewAttempt(), cause: 'user_stop', expected_port: 4200 });
  expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover: 'dead', server_port: 4100 }, 'one')).toMatchObject({
    cause: 'process_exited', expected_port: 4100, actual_port: 4101, reported_port: 4101, exit_code: 17,
  });
  expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover: 'dead', server_port: 4300 }, 'one')).toMatchObject({ cause: 'unknown', expected_port: null });
  expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover: 'dead', server_port: 4101 }, 'one')).toMatchObject({ cause: 'process_exited', expected_port: 4100, actual_port: 4101 });
});

it('keeps the not-started cause for an identified server with no measurements yet', () => {
  expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover: 'non-started', server_port: 4100 }, 'one')).toMatchObject({ cause: 'not_started', actual_port: null, process_exited: null });
  notePreviewDiagnostics('one', { expected_port: 4100, cause: 'readiness_timeout' });
  expect(previewFailureDiagnostics('dead_end_shown', { state: 'preview_failed', cover: 'non-started', server_port: 4100 }, 'one')).toMatchObject({ cause: 'readiness_timeout', expected_port: 4100 });
});

it('keeps detected project metadata when an endpoint changes state or starts a new attempt', () => {
  notePreviewDiagnostics('one', { framework: 'Vite', package_manager: 'pnpm', project_source: 'imported', expected_port: 4100 });
  notePreviewDiagnostics('one', { ...newPreviewAttempt(), expected_port: 4200, cause: 'not_started' });
  expect(previewDiagnostics('one')).toMatchObject({ framework: 'Vite', package_manager: 'pnpm', project_source: 'imported', expected_port: 4200, cause: 'not_started' });
});

it('merges process updates with their own endpoint rather than the latest Project endpoint', () => {
  notePreviewDiagnostics('one', { install_succeeded: true });
  notePreviewDiagnostics('one', { expected_port: 4100, actual_port: 4101, framework: 'Vite' });
  notePreviewDiagnostics('one', { expected_port: 4200, actual_port: 4201 });
  notePreviewDiagnostics('one', { expected_port: 4100, cause: 'process_exited', exit_code: 17 });
  expect(previewDiagnostics('one', 4100)).toMatchObject({ actual_port: 4101, cause: 'process_exited', exit_code: 17, install_succeeded: true });
  expect(previewDiagnostics('one', 4200)).toMatchObject({ actual_port: 4201, cause: 'unknown', exit_code: null });
  expect(previewDiagnostics('one', 4300)).toMatchObject({ actual_port: null, cause: 'unknown', framework: 'Vite' });
});

it('clears attempted endpoint failures and aliases without erasing another server', () => {
  notePreviewDiagnostics('one', { expected_port: 4100, actual_port: 4101, cause: 'process_exited', exit_code: 17 });
  notePreviewDiagnostics('one', { expected_port: 4200, actual_port: 4201, cause: 'user_stop' });
  notePreviewDiagnostics('one', newPreviewAttempt());
  for (const port of [4200, 4201]) expect(previewDiagnostics('one', port)).toMatchObject({ expected_port: null, actual_port: null, cause: 'unknown', exit_code: null });
  expect(previewDiagnostics('one', 4101)).toMatchObject({ expected_port: 4100, cause: 'process_exited', exit_code: 17 });
  notePreviewDiagnostics('one', { ...newPreviewAttempt(), expected_port: 4100 });
  expect(previewDiagnostics('one', 4101)).toMatchObject({ expected_port: null, actual_port: null, cause: 'unknown', exit_code: null });
  expect(previewDiagnostics('one', 4100)).toMatchObject({ expected_port: 4100, actual_port: null, cause: 'unknown', exit_code: null });
});

it('records only valid advertised loopback ports, not URLs or untrusted hostnames', () => {
  expect(reportedPreviewPort('Local: http://localhost:5174/\n')).toBe(5174);
  expect(reportedPreviewPort('http://127.0.0.1:3001\nhttp://[::1]:3002/')).toBe(3002);
  for (const output of ['https://private.example.test:3000/', 'http://localhost:99999/', 'http://localhost:3000.evil.test', 'no ready line']) expect(reportedPreviewPort(output)).toBeNull();
});
