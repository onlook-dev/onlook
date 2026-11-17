// Auth is the SDK's: it resolves the machine's own Claude Code login.

import { tmpdir } from 'node:os';
import { isBillingFailure, type AgentConnection, type AgentConnectionStatus, type AgentProbeRequest } from '@studio/events';
import { userEnv } from '../env/shell-env.js';
import { claudeExecutablePath } from './cli-path.js';
import { devSwitches } from '../env/dev-switches.js';

/** Substring matching: the SDK throws with `code`, `exitCode` and `stderr` all empty. */
export function classifyError(message: string): AgentConnectionStatus {
  const s = message.toLowerCase();
  if (
    /not logged in|unauthor|authenticat|invalid api key|please run.*login|oauth/.test(s)
  ) {
    return 'unauthenticated';
  }
  if (/native binary not found|executable not found|enoent|native binary .*failed to launch|command not found|cannot find/.test(s) || /\bspawn\b[^\r\n]*\b(?:eacces|enoexec|enotdir)\b/.test(s)) {
    return 'cli_missing';
  }
  if (/failed to launch|spawn|exited with code/.test(s)) return 'error';
  return 'error';
}

export function classifySessionError(
  message: string,
): 'unauthenticated' | 'cli_missing' | 'spawn_failed' | 'billing_error' | 'unknown' {
  if (isBillingFailure(undefined, undefined, message)) return 'billing_error';
  const status = classifyError(message);
  if (status === 'unauthenticated') return 'unauthenticated';
  if (status === 'cli_missing') return 'cli_missing';
  if (/spawn|exited with code|failed to launch/.test(message.toLowerCase())) {
    return 'spawn_failed';
  }
  return 'unknown';
}

/** Set by `tests/e2e/launch.ts`; not gated on `is.dev` because `test:e2e:packaged` drives the signed app. */
function pinnedConnection(): AgentConnection | undefined {
  const pinned = devSwitches.agentProbe;
  if (!pinned) return undefined;
  const allowed: AgentConnectionStatus[] = [
    'unknown',
    'ok',
    'cli_missing',
    'unauthenticated',
    'error',
  ];
  const status = allowed.find((candidate) => candidate === pinned);
  // A typo'd pin throws; falling through would make the gate machine-dependent again.
  if (!status) {
    throw new Error(
      `STUDIO_AGENT_PROBE="${pinned}" is not an AgentConnectionStatus. ` +
        `Expected one of: ${allowed.join(', ')}.`,
    );
  }
  return { status, detail: 'pinned by STUDIO_AGENT_PROBE' };
}

/**
 * Never prompts, so it cannot wait for `system:init` (the CLI emits it only after
 * a first prompt) and cannot see an invalid login; a bad executable path throws
 * well inside the grace period.
 */
export async function probeConnection(graceMs = 2_500): Promise<AgentConnection> {
  const pinned = pinnedConnection();
  if (pinned) return pinned;

  // Lazy: the e2e apparatus loads this module without the SDK.
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  // `userEnvSync()` here answers `cli_missing` under a Finder launch that beats the login-shell capture (ONL-1948).
  const env = await userEnv();

  const abort = new AbortController();
  // oxlint-disable-next-line eslint/require-yield
  async function* silent(): AsyncGenerator<never> {
    await new Promise<void>((resolve) => {
      abort.signal.addEventListener('abort', () => resolve(), { once: true });
    });
  }

  let timer: NodeJS.Timeout | undefined;
  try {
    const q = query({
      prompt: silent(),
      options: {
        cwd: tmpdir(),
        abortController: abort,
        // The chat session's binary and env, or the probe certifies a path nobody uses (ONL-1871).
        pathToClaudeCodeExecutable: claudeExecutablePath(),
        env,
        // `[]` unlike the chat session: a user's hooks and MCP servers would run inside the grace period.
        settingSources: [],
      },
    });

    const survived = new Promise<AgentConnection>((resolve) => {
      timer = setTimeout(() => resolve({ status: 'ok' }), graceMs);
    });

    // Resolves, never rejects: a late spawn failure would be an unhandled rejection in main.
    const drained = (async (): Promise<AgentConnection> => {
      try {
        // Draining the iterator is what surfaces a spawn failure as a throw.
        for await (const message of q) void message;
        return { status: 'ok' };
      } catch (err) {
        const message = String((err as Error)?.message ?? err);
        return { status: classifyError(message), detail: message };
      }
    })();

    return await Promise.race([drained, survived]);
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    return { status: classifyError(message), detail: message };
  } finally {
    if (timer) clearTimeout(timer);
    abort.abort();
  }
}

/** `fresh` is the only way back to `unknown` (ONL-2080). */
export function probeMemo(current: AgentConnection, req: AgentProbeRequest): AgentConnection {
  return req.fresh ? { status: 'unknown' } : current;
}
