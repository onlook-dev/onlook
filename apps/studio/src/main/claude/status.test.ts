import { CLAUDE_API_KEY_PLAN } from '@studio/events';
import { describe, expect, it } from 'bun:test';
import type { CliResult } from '../env/cli.js';
import { STUDIO_SESSION_VARS } from './env.js';
import { claudeAuthStatus, STATUS_TIMEOUT_MS, type StatusRunner } from './status.js';

const SIGNED_IN = {
  loggedIn: true,
  authMethod: 'claude.ai',
  apiProvider: 'firstParty',
  email: 'wren@example.com',
  orgId: null,
  orgName: null,
  subscriptionType: 'max',
};
const SIGNED_OUT = { loggedIn: false, authMethod: 'none', apiProvider: 'firstParty' };

function answer(partial: Partial<CliResult>): CliResult {
  return { ok: false, out: '', err: '', timedOut: false, missing: false, exitCode: null, ...partial };
}

function scripted(result: CliResult): { run: StatusRunner; calls: Array<{ bin: string; args: string[]; timeoutMs: number; unset: readonly string[] }> } {
  const calls: Array<{ bin: string; args: string[]; timeoutMs: number; unset: readonly string[] }> = [];
  const run: StatusRunner = async (bin, args, options) => {
    calls.push({ bin, args, timeoutMs: options.timeoutMs, unset: options.unset });
    return result;
  };
  return { run, calls };
}

const status = (result: CliResult) => {
  const { run, calls } = scripted(result);
  return { verdict: claudeAuthStatus({ bin: '/bin/claude', env: {}, run }), calls };
};

describe('claudeAuthStatus', () => {
  it('an unexecutable bundled runtime is not a sign-in failure', async () => {
    for (const code of ['EACCES', 'ENOEXEC', 'ENOTDIR']) {
      expect(await status(answer({ err: `spawn /bundled/claude ${code}` })).verdict).toEqual({ status: 'failed', detail: 'spawn' });
    }
    expect(await status(answer({ err: 'EACCES: permission denied, open /config/settings.json' })).verdict).toEqual({ status: 'failed', detail: 'exited' });
  });
  it('runs auth status --json on the binary with the hang guard and the scrub list', async () => {
    const { verdict, calls } = status(answer({ ok: true, exitCode: 0, out: JSON.stringify(SIGNED_IN) }));
    await verdict;
    expect(calls).toEqual([
      { bin: '/bin/claude', args: ['auth', 'status', '--json'], timeoutMs: STATUS_TIMEOUT_MS, unset: STUDIO_SESSION_VARS },
    ]);
  });

  it('exit 0 with loggedIn true is signed-in with the email and the subscription as the plan', async () => {
    const { verdict } = status(answer({ ok: true, exitCode: 0, out: JSON.stringify(SIGNED_IN) }));
    expect(await verdict).toEqual({ status: 'signed-in', email: 'wren@example.com', plan: 'max' });
  });

  it('a credential with no cached profile is signed-in without an email', async () => {
    const { verdict } = status(answer({ ok: true, exitCode: 0, out: JSON.stringify({ ...SIGNED_IN, email: null }) }));
    expect(await verdict).toEqual({ status: 'signed-in', plan: 'max' });
  });

  it('an API key shadowing the subscription reports the key-based plan', async () => {
    const { verdict } = status(
      answer({
        ok: true,
        exitCode: 0,
        out: JSON.stringify({ ...SIGNED_IN, subscriptionType: null, apiKeySource: 'ANTHROPIC_API_KEY' }),
      }),
    );
    expect(await verdict).toEqual({ status: 'signed-in', email: 'wren@example.com', plan: CLAUDE_API_KEY_PLAN });
  });

  it('exit 1 with loggedIn false is signed-out', async () => {
    const { verdict } = status(answer({ exitCode: 1, out: JSON.stringify(SIGNED_OUT) }));
    expect(await verdict).toEqual({ status: 'signed-out' });
  });

  it('exit 0 with loggedIn false is signed-out too: the JSON is the tiebreak', async () => {
    const { verdict } = status(answer({ ok: true, exitCode: 0, out: JSON.stringify(SIGNED_OUT) }));
    expect(await verdict).toEqual({ status: 'signed-out' });
  });

  it('any other exit is failed as exited, JSON or not', async () => {
    expect(await status(answer({ exitCode: 2 })).verdict).toEqual({ status: 'failed', detail: 'exited' });
    expect(await status(answer({ exitCode: 2, out: JSON.stringify(SIGNED_IN) })).verdict).toEqual({
      status: 'failed',
      detail: 'exited',
    });
  });

  it('exit 0 with empty or unparsable stdout is failed as exited', async () => {
    expect(await status(answer({ ok: true, exitCode: 0, out: '' })).verdict).toEqual({ status: 'failed', detail: 'exited' });
    expect(await status(answer({ ok: true, exitCode: 0, out: 'not json' })).verdict).toEqual({
      status: 'failed',
      detail: 'exited',
    });
  });

  it('a missing binary is failed as spawn', async () => {
    const { verdict } = status(answer({ missing: true, err: 'spawn ENOENT' }));
    expect(await verdict).toEqual({ status: 'failed', detail: 'spawn' });
  });

  it('the hang guard firing is failed as did-not-answer, never signed-out', async () => {
    const { verdict } = status(answer({ timedOut: true, exitCode: null }));
    expect(await verdict).toEqual({ status: 'failed', detail: 'did-not-answer' });
  });
});
