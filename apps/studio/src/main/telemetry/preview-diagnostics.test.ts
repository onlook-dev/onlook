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

it('records only valid advertised loopback ports, not URLs or untrusted hostnames', () => {
  expect(reportedPreviewPort('Local: http://localhost:5174/\n')).toBe(5174);
  expect(reportedPreviewPort('http://127.0.0.1:3001\nhttp://[::1]:3002/')).toBe(3002);
  for (const output of ['https://private.example.test:3000/', 'http://localhost:99999/', 'http://localhost:3000.evil.test', 'no ready line']) expect(reportedPreviewPort(output)).toBeNull();
});
