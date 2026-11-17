// The family is read from the SDK's structured fields; `connection.ts` owns the prose classifiers ONL-2080 was filed against.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { query } from '@anthropic-ai/claude-agent-sdk';
import { isBillingFailure, rateLimitHit, type ClaudeVerificationDetail, type ClaudeTurnFacts, type RateLimitWindow } from '@studio/events';
import { agentVerify } from '../diagnostics/gate.js';
import type { Env } from '../env/shell-env.js';
import { log } from '../log/index.js';
import { filledStr as str, num } from './coerce.js';
import { rateLimitWindow } from './reduce.js';

const logger = log('agent-host');

/** Studio's bounds beat a value the user set for their own shell; they never reach the sign-in child's env (ONL-2496). */
const VERIFY_ENV: Env = {
  CLAUDE_CODE_MAX_RETRIES: '1',
  API_TIMEOUT_MS: '8000',
  CLAUDE_CODE_STARTUP_FAILURE_RESULTS: '1',
};

/** `verifying` offers the user one button; an unbounded turn is a spinner only force-quit ends. */
export const VERIFY_BUDGET_MS = 30_000;

/** Model-facing, never rendered, so not a `strings.ts` key. */
const VERIFY_SYSTEM_PROMPT = 'Reply with the single word OK and nothing else.';
const VERIFY_PROMPT = 'ping';

interface Pinned {
  /** A pinned verdict records no telemetry (ONL-2496). */
  pinned?: true;
}

export type ClaudeVerifyVerdict =
  | ({ outcome: 'ok' } & Pinned)
  | ({ outcome: 'cancelled' } & Pinned)
  | ({ outcome: 'launch-failed'; errorClass?: string; sentence?: string } & Pinned)
  | ({ outcome: 'failed'; detail: ClaudeVerificationDetail; sentence?: string; facts?: ClaudeTurnFacts } & Pinned);

export interface ClaudeVerifyOptions {
  env: Env;
  /** `claudeExecutablePath()`, never `claudeBinary()`: certifying a path the SDK will not use is ONL-1871. */
  executablePath?: string;
  budgetMs?: number;
  signal?: AbortSignal;
  /** Test seam, as `AgentSessionOptions`' is. */
  query?: typeof query;
}

const PINNED_VERDICTS = [
  'ok',
  'cancelled',
  'launch-failed',
  'turn-signed-out',
  'turn-sign-in-rejected',
  'turn-provider-refused',
  'turn-usage-limit',
  'turn-rate-limited',
  'turn-service-error',
  'turn-billing',
  'turn-agent-error',
  'turn-no-answer',
] as const;

type PinnedVerdict = (typeof PINNED_VERDICTS)[number];

function pinnedVerdict(pin: string | undefined): ClaudeVerifyVerdict | undefined {
  if (pin === undefined) return undefined;
  const found = PINNED_VERDICTS.find((candidate) => candidate === pin);
  // A typo'd pin throws; falling through would make the claim machine-dependent again.
  if (found === undefined) {
    throw new Error(
      `STUDIO_AGENT_VERIFY="${pin}" is not a verification verdict. Expected one of: ${PINNED_VERDICTS.join(', ')}.`,
    );
  }
  return verdictForPin(found);
}

function verdictForPin(pin: PinnedVerdict): ClaudeVerifyVerdict {
  if (pin === 'ok') return { outcome: 'ok', pinned: true };
  if (pin === 'cancelled') return { outcome: 'cancelled', pinned: true };
  if (pin === 'launch-failed') return { outcome: 'launch-failed', pinned: true };
  return { outcome: 'failed', detail: pin, pinned: true };
}

interface Drained {
  thrown?: { errorClass?: string; sentence: string };
  terminal?: Record<string, unknown>;
  errorKind?: string;
  retryKind?: string;
  retryStatus?: number;
  windows: RateLimitWindow[];
}

/** `errorClass` is real at 0.3.284 and absent from `sdk.d.ts`, so the read is guarded. */
function thrownOf(error: unknown): { errorClass?: string; sentence: string } {
  const errorClass = str(((error ?? {}) as Record<string, unknown>)['errorClass']);
  return {
    sentence: String((error as Error)?.message ?? error),
    ...(errorClass === undefined ? {} : { errorClass }),
  };
}

/** Resolves, never rejects: a late spawn failure would be an unhandled rejection in main. */
async function drainInto(turn: AsyncIterable<unknown>, seen: Drained): Promise<void> {
  try {
    for await (const raw of turn) {
      const msg = raw as Record<string, unknown>;
      if (msg['type'] === 'assistant') {
        seen.errorKind = str(msg['error']) ?? seen.errorKind;
        continue;
      }
      if (msg['type'] === 'system' && msg['subtype'] === 'api_retry') {
        seen.retryKind = str(msg['error']) ?? seen.retryKind;
        seen.retryStatus = num(msg['error_status']) ?? seen.retryStatus;
        continue;
      }
      if (msg['type'] === 'rate_limit_event') {
        const info = msg['rate_limit_info'];
        const window = rateLimitWindow(typeof info === 'object' && info !== null ? (info as Record<string, unknown>) : {});
        if (window !== undefined) seen.windows = [...seen.windows.filter((known) => known.kind !== window.kind), window];
        continue;
      }
      if (msg['type'] === 'result') {
        seen.terminal = msg;
        return;
      }
    }
  } catch (error) {
    seen.thrown = thrownOf(error);
  }
}

/** `reduce.ts` owns this rule: a signed-out CLI answers `subtype: 'success'` with `is_error: true` (ONL-2080). */
function isFailed(terminal: Record<string, unknown>): boolean {
  return terminal['subtype'] !== 'success' || terminal['is_error'] === true;
}

/** `CODE_BY_TERMINAL_REASON` maps these three to a rate limit; a quota-exhausted turn carries no kind and no status. */
const USAGE_LIMIT_TERMINAL_REASONS: ReadonlySet<string> = new Set([
  'blocking_limit',
  'rapid_refill_breaker',
  'budget_exhausted',
]);

function isExhausted(window: RateLimitWindow): boolean {
  return window.status === 'rejected' || (window.usedPercent !== undefined && window.usedPercent >= 100);
}

function familyByKind(kind: string | undefined, status: number | undefined): ClaudeVerificationDetail | undefined {
  if (kind === 'authentication_failed') {
    if (status === undefined) return 'turn-signed-out';
    return status === 401 || status === 403 ? 'turn-sign-in-rejected' : undefined;
  }
  if (kind === 'cloud_credential_error' || kind === 'model_not_found') return 'turn-provider-refused';
  if (kind === 'server_error') return status === undefined ? 'turn-provider-refused' : undefined;
  return undefined;
}

/** In order: what the account can fix (billing, sign-in), then a limit with a window behind it, then the service's own trouble (ONL-2903). */
function familyOf(seen: Drained, fallback: ClaudeVerificationDetail): ClaudeVerificationDetail {
  const terminal = seen.terminal ?? {};
  if (str(terminal['startup_failure_reason']) !== undefined) return 'turn-agent-error';
  const status = num(terminal['api_error_status']);
  const anyStatus = status ?? seen.retryStatus;
  const kinds = [seen.errorKind, seen.retryKind];
  if (kinds.some((kind) => isBillingFailure(kind, anyStatus, str(terminal['result'])))) return 'turn-billing';
  // Each kind is read with the status from its own message: an assistant kind paired with an earlier retry's status reads an auth failure as busy (ONL-2496).
  const byKind = familyByKind(seen.errorKind, status) ?? familyByKind(seen.retryKind, seen.retryStatus);
  if (byKind !== undefined) return byKind;
  const reason = str(terminal['terminal_reason']);
  const limited = kinds.includes('rate_limit') || anyStatus === 429;
  if ((reason !== undefined && USAGE_LIMIT_TERMINAL_REASONS.has(reason)) || (limited && seen.windows.some(isExhausted))) {
    return 'turn-usage-limit';
  }
  if (limited) return 'turn-rate-limited';
  if (kinds.includes('overloaded') || kinds.includes('server_error')) return 'turn-service-error';
  if (anyStatus !== undefined && anyStatus >= 500 && anyStatus <= 599) return 'turn-service-error';
  return fallback;
}

function factsOf(seen: Drained, detail: ClaudeVerificationDetail, sentence: string | undefined): ClaudeTurnFacts {
  const terminal = seen.terminal ?? {};
  const kind = seen.errorKind ?? seen.retryKind;
  const status = num(terminal['api_error_status']) ?? seen.retryStatus;
  const diagnostic = kind === undefined && status === undefined ? undefined : {
    ...(kind === undefined ? {} : { kind }),
    ...(status === undefined ? {} : { status }),
  };
  return {
    ...(detail === 'turn-usage-limit' ? { limit: rateLimitHit(seen.windows, Date.now() / 1000) } : {}),
    ...(diagnostic === undefined ? {} : { diagnostic }),
    ...(sentence === undefined ? {} : { sentence }),
  };
}

function logVerdict(verdict: ClaudeVerifyVerdict, seen: Drained): void {
  const terminal = seen.terminal ?? {};
  const sentence = verdict.outcome === 'ok' || verdict.outcome === 'cancelled' ? undefined : verdict.sentence;
  const fields = {
    outcome: verdict.outcome,
    detail: verdict.outcome === 'failed' ? verdict.detail : undefined,
    error_kind: seen.errorKind ?? seen.retryKind,
    api_error_status: num(terminal['api_error_status']) ?? seen.retryStatus,
    startup_failure_reason: str(terminal['startup_failure_reason']),
    terminal_reason: str(terminal['terminal_reason']),
    error_class: verdict.outcome === 'launch-failed' ? verdict.errorClass : undefined,
    // `FILE_ONLY_KEYS`, top level: the CLI's sentence names gateways and account ids the exporter must not see (ONL-2496).
    cli_sentence: sentence,
  };
  if (verdict.outcome === 'ok') logger.info('the verification turn answered', fields);
  else logger.warn('the verification turn failed', fields);
}

let scratchSettled: Promise<void> = Promise.resolve();

/** The clock and abort paths answer before the child settles; a test awaits what the verdict does not (ONL-2496). */
export function verifyScratchSettledForTests(): Promise<void> {
  return scratchSettled;
}

export async function verifyClaudeTurn(options: ClaudeVerifyOptions): Promise<ClaudeVerifyVerdict> {
  const pinned = pinnedVerdict(agentVerify());
  if (pinned !== undefined) return pinned;

  // Lazy: the e2e apparatus loads this module without the SDK.
  const run = options.query ?? (await import('@anthropic-ai/claude-agent-sdk')).query;

  // Cancelled before it began: no scratch directory and no child, since the verdict is already decided.
  if (options.signal?.aborted === true) return { outcome: 'cancelled' };

  const abort = new AbortController();
  let cancelled = false;
  const onCancel = (): void => {
    cancelled = true;
    abort.abort();
  };

  // Registered before the first await: adding a listener to an already-aborted signal never replays the event (ONL-2496).
  options.signal?.addEventListener('abort', onCancel, { once: true });
  const cwd = await mkdtemp(join(tmpdir(), 'studio-claude-verify-'));
  const seen: Drained = { windows: [] };
  let timer: NodeJS.Timeout | undefined;

  try {
    // Cancelled while the directory was being made: no child, so nothing waits on the removal.
    if (cancelled) {
      scratchSettled = rm(cwd, { recursive: true, force: true }).then(
        () => undefined,
        () => undefined,
      );
      return { outcome: 'cancelled' };
    }
    let drained: Promise<void>;
    try {
      drained = drainInto(openTurn(run, cwd, abort, options), seen);
    } catch (error) {
      // `query()` can refuse synchronously, before a drain exists to carry the throw.
      seen.thrown = thrownOf(error);
      drained = Promise.resolve();
    }
    // Chained off the drain, never off the verdict: the child outlives `abort()` by about two seconds, and a cwd pulled from under it reports as a launch failure (ONL-2496).
    scratchSettled = drained.then(
      () => rm(cwd, { recursive: true, force: true }).then(() => undefined, () => undefined),
      () => undefined,
    );

    const clock = new Promise<'clock'>((resolve) => {
      timer = setTimeout(() => resolve('clock'), options.budgetMs ?? VERIFY_BUDGET_MS);
    });

    // A cancel landing inside the budget's last moments wins over the clock, or Cancel reports a failure (ONL-2496).
    const verdict =
      (await Promise.race([drained, clock])) === 'clock' && !cancelled
        ? failedVerdict(seen, familyOf(seen, 'turn-no-answer'), undefined)
        : settledVerdict(seen, cancelled);

    if (verdict.outcome !== 'cancelled') logVerdict(verdict, seen);
    return verdict;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCancel);
    abort.abort();
  }
}

/** No `model` and no `maxBudgetUsd`: a model the provider will not serve answers 404 about the model, and a ceiling we set reads as a Claude failure (ONL-2496). */
function openTurn(
  run: typeof query,
  cwd: string,
  abort: AbortController,
  options: ClaudeVerifyOptions,
): AsyncIterable<unknown> {
  return run({
    prompt: VERIFY_PROMPT,
    options: {
      cwd,
      abortController: abort,
      ...(options.executablePath === undefined ? {} : { pathToClaudeCodeExecutable: options.executablePath }),
      env: { ...options.env, ...VERIFY_ENV },
      systemPrompt: VERIFY_SYSTEM_PROMPT,
      tools: [],
      mcpServers: {},
      strictMcpConfig: true,
      settingSources: [],
      settings: { disableAllHooks: true },
      persistSession: false,
      thinking: { type: 'disabled' },
      maxTurns: 1,
      permissionMode: 'dontAsk',
      permissionPrompts: 'none',
    },
  });
}

function settledVerdict(seen: Drained, cancelled: boolean): ClaudeVerifyVerdict {
  if (seen.thrown !== undefined) {
    // Aborting throws a plain `Error` carrying `errorClass: 'aborted'`, so the caller's own flag is what identifies it (ONL-2496).
    if (cancelled) return { outcome: 'cancelled' };
    return {
      outcome: 'launch-failed',
      ...(seen.thrown.errorClass === undefined ? {} : { errorClass: seen.thrown.errorClass }),
      sentence: seen.thrown.sentence,
    };
  }
  if (cancelled) return { outcome: 'cancelled' };
  const terminal = seen.terminal;
  if (terminal === undefined) return failedVerdict(seen, familyOf(seen, 'turn-no-answer'), undefined);
  if (!isFailed(terminal)) return { outcome: 'ok' };
  return failedVerdict(seen, familyOf(seen, 'turn-agent-error'), str(terminal['result']));
}

function failedVerdict(seen: Drained, detail: ClaudeVerificationDetail, sentence: string | undefined): ClaudeVerifyVerdict {
  const facts = factsOf(seen, detail, sentence);
  return {
    outcome: 'failed',
    detail,
    ...(sentence === undefined ? {} : { sentence }),
    ...(Object.keys(facts).length === 0 ? {} : { facts }),
  };
}
