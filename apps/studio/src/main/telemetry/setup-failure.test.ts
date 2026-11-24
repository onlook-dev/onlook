import { expect, test } from 'bun:test';
import { classifySetupFailure } from './setup-failure.js';

test('setup failures retain a cause and exit code without sending stderr', () => {
  for (const [error, expected] of [
    ['Node.js is not installed', 'node_missing'], ['npm is not found', 'npm_missing'],
    ['npm ERR! install failed C:\\private\\project', 'npm_install_failed'], ['spawn EACCES C:\\private\\agent.exe', 'spawn_eacces'],
    ['ERROR_VIRUS_INFECTED', 'antivirus_blocked'], ['spawn ENOENT', 'path_not_found'],
    ['fetch failed https://private.invalid/token', 'network'], ['took-too-long', 'sign_in_timeout'],
    ['turn-provider-refused', 'provider_refused'], ['turn-signed-out', 'not_logged_in'], ['exited', 'process_exited'],
  ] as const) {
    const diagnostics = classifySetupFailure({ error, exitCode: 9 });
    expect(diagnostics).toEqual({ error_class: expected, stderr_class: expected, exit_code: 9 });
    expect(JSON.stringify(diagnostics)).not.toContain('private');
  }
  expect(classifySetupFailure({ error: { code: 'EACCES', message: 'private' } }).error_class).toBe('spawn_eacces');
  expect(classifySetupFailure({ error: 'EACCES' }).error_class).not.toBe('antivirus_blocked');
});
