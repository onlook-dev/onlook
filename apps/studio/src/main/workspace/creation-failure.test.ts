import { describe, expect, it } from 'bun:test';
import { StarterFailure } from '../starter/failure.js';
import { pickStarterPort } from '../starter/port.js';
import { gitFailure, systemErrorCode, thrownFailure } from './creation-failure.js';
import type { GitResult } from './git.js';

const failed = (err: string, exitCode: number | null = 128, extra: Partial<GitResult> = {}): GitResult => ({
  ok: false,
  out: '',
  err,
  timedOut: false,
  missing: false,
  exitCode,
  ...extra,
});

function caught(error: unknown, code: string): Error {
  return Object.assign(error as Error, { code });
}

const PRIVATE = '/var/folders/acme-secret-project';
const BRANCH = 'onlook/teal-heron';

describe('a git failure is named without keeping its text', () => {
  const cases: [string, GitResult, Record<string, unknown>][] = [
    ['no git on the PATH', failed('Host executable not found in trusted PATH', null, { missing: true }), { failure_cause: 'git_not_found' }],
    ['a step that ran past its bound', failed('', null, { timedOut: true }), { failure_cause: 'git_timed_out' }],
    ['the macOS stub with no tools installed', failed('xcode-select: note: No developer tools were found, requesting install.\nSee `man xcode-select` for more details.', 1), { failure_cause: 'developer_tools_missing', exit_code: 1 }],
    ['a broken developer directory', failed(`xcrun: error: missing DEVELOPER_DIR path: ${PRIVATE}`, 1), { failure_cause: 'developer_tools_missing', exit_code: 1 }],
    ['an unreadable git config', failed(`fatal: bad config line 1 in file ${PRIVATE}/.gitconfig`), { failure_cause: 'git_config_invalid', exit_code: 128 }],
    ['a full disk', failed(`fatal: could not write to '${PRIVATE}/.git/config': No space left on device`), { failure_cause: 'disk_full', exit_code: 128 }],
    ['a refused write', failed(`${PRIVATE}/.git: Permission denied`, 1), { failure_cause: 'permission_denied', exit_code: 1 }],
    ['a read-only volume', failed(`fatal: cannot mkdir ${PRIVATE}: Read-only file system`), { failure_cause: 'permission_denied', exit_code: 128 }],
    ['anything else', failed(`Preparing worktree (new branch '${BRANCH}')\nfatal: ${PRIVATE} already exists`), { failure_cause: 'git_failed', exit_code: 128 }],
    ['an unaccepted Xcode license', failed('You have not agreed to the Xcode license agreements.', 69), { failure_cause: 'git_license_unaccepted', exit_code: 69 }],
  ];

  for (const [name, result, expected] of cases) {
    it(name, () => {
      const failure = gitFailure('git_init', result);
      expect(failure).toStrictEqual({ failure_step: 'git_init', ...expected } as typeof failure);
      expect(JSON.stringify(failure)).not.toContain('acme-secret-project');
      expect(JSON.stringify(failure)).not.toContain(BRANCH);
    });
  }
});

describe('a thrown failure is named by its code, never its message', () => {
  const cases: [string, unknown, Record<string, unknown>][] = [
    ['a full disk', caught(new Error(`ENOSPC: no space left, write '${PRIVATE}'`), 'ENOSPC'), { failure_cause: 'disk_full', system_error: 'ENOSPC' }],
    ['a refused write', caught(new Error(`EACCES: permission denied, mkdir '${PRIVATE}'`), 'EACCES'), { failure_cause: 'permission_denied', system_error: 'EACCES' }],
    ['a read-only volume', caught(new Error(PRIVATE), 'EROFS'), { failure_cause: 'permission_denied', system_error: 'EROFS' }],
    ['another system error', caught(new Error(PRIVATE), 'EMFILE'), { failure_cause: 'system_error', system_error: 'EMFILE' }],
    ['a plain error', new Error(PRIVATE), { failure_cause: 'unknown' }],
    ['a code that is not a system error code', caught(new Error('x'), PRIVATE), { failure_cause: 'unknown' }],
    ['a node internal code', caught(new Error('x'), 'ERR_INVALID_ARG_TYPE'), { failure_cause: 'unknown' }],
    ['a thrown non-error', PRIVATE, { failure_cause: 'unknown' }],
  ];

  for (const [name, error, expected] of cases) {
    it(name, () => {
      const failure = thrownFailure('scaffold', error);
      expect(failure).toStrictEqual({ failure_step: 'scaffold', ...expected } as typeof failure);
      expect(JSON.stringify(failure)).not.toContain('acme-secret-project');
    });
  }

  it('a dead starter keeps its exit code and not the output it printed', () => {
    const failure = thrownFailure('starter_spawn', new StarterFailure('starter_exited', `starter exited (code 7) before it was ready: ${PRIVATE}`, 7));
    expect(failure).toStrictEqual({ failure_step: 'starter_spawn', failure_cause: 'starter_exited', exit_code: 7 });
  });

  it('a port range with nothing free is named', async () => {
    const error = await pickStarterPort(undefined, async () => false).catch((e: unknown) => e);
    expect(thrownFailure('starter_spawn', error)).toStrictEqual({ failure_step: 'starter_spawn', failure_cause: 'no_free_port' });
    expect(String(error)).toBe('Error: no free port between 4700 and 4799');
  });

  it('reads no system code from nothing', () => {
    expect(systemErrorCode(undefined)).toBeUndefined();
    expect(systemErrorCode(null)).toBeUndefined();
  });
});
