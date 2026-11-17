import { tmpdir } from 'node:os';
import { type ClaudeLoginDetail } from '@studio/events';
import { claudeBillingPlan } from './billing.js';
import { runCli, type CliResult } from '../env/cli.js';
import { type Env } from '../env/shell-env.js';
import { STUDIO_SESSION_VARS } from './env.js';

/** Well above a human answering a keychain dialog; a hit is `did-not-answer`, not signed-out (ONL-2186). */
export const STATUS_TIMEOUT_MS = 60_000;

export type ClaudeStatusVerdict =
  | { status: 'signed-in'; email?: string; plan?: string }
  | { status: 'signed-out' }
  | { status: 'failed'; detail: ClaudeLoginDetail };

export type StatusRunner = (
  bin: string,
  args: string[],
  options: { timeoutMs: number; env: Env; unset: readonly string[] },
) => Promise<CliResult>;

const runThroughCli: StatusRunner = (bin, args, options) => runCli(bin, tmpdir(), args, options);

export interface ClaudeAuthStatusOptions {
  bin: string;
  env: Env;
  run?: StatusRunner;
}

export async function claudeAuthStatus(options: ClaudeAuthStatusOptions): Promise<ClaudeStatusVerdict> {
  const run = options.run ?? runThroughCli;
  const result = await run(options.bin, ['auth', 'status', '--json'], {
    timeoutMs: STATUS_TIMEOUT_MS,
    env: options.env,
    unset: STUDIO_SESSION_VARS,
  });
  if (result.missing || /\bspawn\b[^\r\n]*\b(?:EACCES|ENOEXEC|ENOTDIR)\b/.test(result.err)) return { status: 'failed', detail: 'spawn' };
  if (result.timedOut) return { status: 'failed', detail: 'did-not-answer' };

  const body = parse(result.out);
  if (result.exitCode === 1) return { status: 'signed-out' };
  if (result.exitCode !== 0 || body === undefined) return { status: 'failed', detail: 'exited' };
  if (body['loggedIn'] !== true) return { status: 'signed-out' };

  const email = body['email'];
  const plan = claudeBillingPlan(body, options.env);
  return {
    status: 'signed-in',
    ...(typeof email === 'string' && email.length > 0 ? { email } : {}),
    ...(plan === undefined ? {} : { plan }),
  };
}

function parse(out: string): Record<string, unknown> | undefined {
  if (out.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(out);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}
