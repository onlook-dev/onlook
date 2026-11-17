import {
  isSignInFixable,
  isBillingFailure,
  type AgentConnection,
  type RateLimitWindow,
  type SessionErrorCode,
  type ToolStatus,
  type TurnTokens,
} from '@studio/events';
import type { EventLog, TurnCallOutcome, TurnSummary } from '../event-log.js';
import { codexUnrowedItemKind } from '../turn-tool-kinds.js';
import { codexInternalServer } from '../connectors.js';
import { num, obj, str } from '../coerce.js';

/** `TurnStatus`'s terminal members. A value outside them is drift, and reports no summary (ONL-2463). */
const TERMINAL_TURN_STATUSES = new Set(['completed', 'interrupted', 'failed']);

export interface AppServerTurnState {
  readonly openToolCalls: Set<string>;
  readonly openBlocks: Map<string, 'text' | 'thinking'>;
  /** `turn/completed` carries a null `usage`; the last `thread/tokenUsage/updated` is held here. */
  tokens?: TurnTokens;
}

/** Account-scoped, so it outlives the turn state `run()` replaces on every prompt (ONL-2197). */
export interface AppServerAccountState {
  rateLimits?: Record<string, RateLimitWindow>;
}

export function createAppServerTurnState(): AppServerTurnState {
  return { openToolCalls: new Set<string>(), openBlocks: new Map() };
}

/** `last` is this turn, `total` is the thread; neither derives from the other. */
export function tokenUsage(usage: Record<string, unknown> | undefined): TurnTokens | undefined {
  if (usage === undefined) return undefined;
  const last = obj(usage['last']);
  const total = obj(usage['total']);
  if (last === undefined && total === undefined) return undefined;
  return {
    input: num(last?.['inputTokens']),
    cachedInput: num(last?.['cachedInputTokens']),
    cacheWriteInput: num(last?.['cacheWriteInputTokens']),
    output: num(last?.['outputTokens']),
    reasoningOutput: num(last?.['reasoningOutputTokens']),
    total: num(last?.['totalTokens']),
    context: num(last?.['totalTokens']),
    threadTotal: num(total?.['totalTokens']),
    contextWindow: num(usage['modelContextWindow']),
  };
}

export interface AppServerHandleOptions {
  connectors?: boolean;
  internalMcpServers?: ReadonlySet<string>;
  onTurnEnded?: (summary: TurnSummary) => void;
  onError?: (code: SessionErrorCode, apiErrorStatus: number | null) => void;
  /** Held by the session, not the turn: a rolling update between turns must not be discarded. */
  account?: AppServerAccountState;
  onConnection?: (connection: AgentConnection) => void;
}

/** Observed in real turns and rendering nothing; an unlisted method is counted as drift. */
const IGNORED = new Set([
  'thread/started',
  'thread/status/changed',
  'remoteControl/status/changed',
  'mcpServer/startupStatus/updated',
  'hook/started',
  'hook/completed',
]);

/** An `inputImage` is a base64 `data:` URI of hundreds of KB; the transcript crosses IPC and is persisted. */
function contentItemsText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => {
      const item = obj(entry);
      if (str(item?.['type']) === 'inputText') return str(item?.['text']) ?? '';
      if (str(item?.['type']) === 'inputImage') return '[image]';
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function ended(text: string, isError: boolean): { result: string; isError: boolean; errorMessage: string | undefined } {
  return { result: text, isError, errorMessage: isError ? text.slice(0, 400) : undefined };
}

function unrowedOutcome(item: Record<string, unknown>): TurnCallOutcome {
  const status = str(item['status']);
  if (status === 'failed') return 'failed';
  if (status === 'declined') return 'denied';
  if (status === 'interrupted') return 'canceled';
  return 'completed';
}

export function commandResult(item: Record<string, unknown>): { text: string; isError: boolean } {
  const status = str(item['status']);
  const exitCode = num(item['exitCode']);
  return {
    text: str(item['aggregatedOutput']) ?? '',
    // The exit code backstops a status this version does not name.
    isError: status !== 'declined' && (status === 'failed' || (exitCode !== undefined && exitCode !== 0)),
  };
}

/** Provider-controlled and open, so it is shape-checked before it can reach telemetry or a log line (ONL-2197). */
const LABEL_SHAPE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/;

/** codex documents every timestamp in this schema as epoch seconds. */
function codexWindow(kind: string, value: unknown, label: string | undefined): RateLimitWindow | undefined {
  const window = obj(value);
  if (window === undefined) return undefined;
  const usedPercent = num(window['usedPercent']);
  const resetsAt = num(window['resetsAt']);
  const windowDurationMins = num(window['windowDurationMins']);
  return {
    kind,
    // The field is dropped, never the event.
    ...(label !== undefined && LABEL_SHAPE.test(label) ? { label } : {}),
    ...(usedPercent === undefined ? {} : { usedPercent }),
    ...(resetsAt === undefined ? {} : { resetsAt }),
    ...(windowDurationMins === undefined ? {} : { windowDurationMins }),
  };
}

/**
 * Sparse by contract: "Nullable account metadata may be unavailable in a rolling update and does
 * not clear a previously observed value." Assigning the payload would erase a window codex simply
 * did not resend (ONL-2197).
 */
export function mergeRateLimits(
  held: Record<string, RateLimitWindow> | undefined,
  snapshot: Record<string, unknown> | undefined,
): Record<string, RateLimitWindow> {
  const merged = { ...held };
  const label = str(snapshot?.['limitName']);
  for (const kind of ['primary', 'secondary']) {
    const window = codexWindow(kind, snapshot?.[kind], label);
    // Field-wise: a re-sent window omits what has not moved, and omission is not a clear.
    if (window !== undefined) merged[kind] = { ...merged[kind], ...window };
  }
  return merged;
}

/** codex sends a 401 it has no recovery left for as `other`, so only its message says so (ONL-2114). */
const REFUSED_STATUS = /^unexpected status 401\b/;

/** Exhaustive over the snapshot's `CodexErrorInfo` strings; `null` falls through. The protocol ships as JSON, so `codex:drift` guards this, not the typechecker (ONL-2463). */
export const CODE_BY_CODEX_ERROR: Readonly<Record<string, SessionErrorCode | null>> = {
  contextWindowExceeded: 'prompt_too_long',
  sessionBudgetExceeded: 'max_budget',
  usageLimitExceeded: 'usage_limit_exceeded',
  rateLimitExceeded: 'rate_limited',
  flexUnavailable: 'api_error',
  serverOverloaded: 'api_error',
  policyCapacityUnavailable: 'api_error',
  modelNotFound: 'model_error',
  internalServerError: 'api_error',
  badRequest: 'api_error',
  unauthorized: 'unauthenticated',
  cyberPolicy: null,
  misalignmentPolicyViolation: null,
  tooManyDenials: null,
  threadRollbackFailed: null,
  sandboxError: null,
  other: null,
};

/** The `httpStatusCode`-bearing variants: a transport or retry-exhaustion failure, which is an API error. */
const STATUS_BEARING_CODEX_ERRORS: ReadonlySet<string> = new Set([
  'httpConnectionFailed',
  'responseStreamConnectionFailed',
  'responseStreamDisconnected',
  'responseTooManyFailedAttempts',
]);

/** The object variants forward an upstream status on `httpStatusCode`; the string members carry none. */
function codexObjectError(
  record: Record<string, unknown> | undefined,
): { code: SessionErrorCode | null; apiErrorStatus: number | null } {
  const info = obj(record?.['codexErrorInfo']);
  if (info === undefined) return { code: null, apiErrorStatus: null };
  for (const [variant, value] of Object.entries(info)) {
    if (!STATUS_BEARING_CODEX_ERRORS.has(variant)) continue;
    return { code: 'api_error', apiErrorStatus: num(obj(value)?.['httpStatusCode']) ?? null };
  }
  return { code: null, apiErrorStatus: null };
}

/** `usageLimitExceeded` is the plan running out, not a broken turn. */
function turnErrorCode(error: unknown): {
  code: SessionErrorCode;
  apiErrorStatus: number | null;
} {
  const record = obj(error);
  const info = str(record?.['codexErrorInfo']);
  const object = codexObjectError(record);
  if (info === 'other' && REFUSED_STATUS.test(str(record?.['message']) ?? '')) {
    return { code: 'unauthenticated', apiErrorStatus: object.apiErrorStatus };
  }
  const mapped = info === undefined ? object.code : CODE_BY_CODEX_ERROR[info];
  return { code: mapped === 'rate_limited' || mapped === 'usage_limit_exceeded' ? mapped :
    isBillingFailure(undefined, object.apiErrorStatus, str(record?.['message'])) ? 'billing_error' : mapped ?? 'unknown',
    apiErrorStatus: object.apiErrorStatus };
}

function turnErrorMessage(error: unknown): string {
  const record = obj(error);
  return str(record?.['message']) ?? (error == null ? 'error' : String(error));
}

export function handleAppServerFrame(
  log: EventLog,
  frame: Record<string, unknown>,
  state: AppServerTurnState,
  opts: AppServerHandleOptions = {},
): void {
  const method = str(frame['method']);
  if (method === undefined) return;
  const params = obj(frame['params']) ?? {};

  switch (method) {
    case 'turn/started': {
      if (!log.isTurnLive) log.beginTurn();
      log.push({ type: 'turn.started', turnId: log.turnId });
      return;
    }

    case 'item/started': {
      const item = obj(params['item']);
      const type = str(item?.['type']);
      const id = str(item?.['id']);
      if (item === undefined || type === undefined || id === undefined) return;
      switch (type) {
        case 'mcpToolCall':
          if (opts.connectors && !codexInternalServer(str(item['server']) ?? '') && !opts.internalMcpServers?.has(str(item['server']) ?? '')) {
            log.noteMcpToolCall(id, str(item['server']));
            state.openToolCalls.add(id);
            log.ensureToolStart(id, type, item, 'in_progress', { source: 'stream' });
          } else if (log.noteMcpToolCall(id, str(item['server']))) log.openUnrowedCall(id);
          return;
        case 'agentMessage': {
          state.openBlocks.set(id, 'text');
          log.push({ type: 'text.start', blockId: log.openBlock(id, 'text') });
          return;
        }
        case 'reasoning': {
          state.openBlocks.set(id, 'thinking');
          log.push({ type: 'thinking.start', blockId: log.openBlock(id, 'thinking') });
          return;
        }
        // The approval card groups under the row carrying this id and renders nowhere without it.
        case 'dynamicToolCall':
        case 'fileChange':
        case 'commandExecution': {
          state.openToolCalls.add(id);
          log.ensureToolStart(id, type, item, 'in_progress' as ToolStatus, {
            source: 'stream',
          });
          return;
        }
        // The server's echo of the user's message; the panel rendered it at send time.
        case 'userMessage':
          return;
        default: {
          const kind = codexUnrowedItemKind(type);
          if (kind !== undefined) log.openUnrowedCall(id, kind);
          log.noteUnmapped(`item/started:${type}`);
          return;
        }
      }
    }

    case 'item/fileChange/patchUpdated': {
      const id = str(params['itemId']);
      if (id === undefined || log.hasEnded(id)) return;
      log.ensureToolStart(id, 'fileChange', { changes: params['changes'] }, 'in_progress', { source: 'stream' });
      return;
    }

    // Account-scoped: it arrives between turns too, so it opens and closes nothing.
    case 'account/rateLimits/updated': {
      const account = opts.account;
      if (account === undefined) return;
      const merged = mergeRateLimits(account.rateLimits, obj(params['rateLimits']));
      account.rateLimits = merged;
      const windows = Object.values(merged);
      if (windows.length > 0) log.push({ type: 'usage.limits', windows });
      return;
    }

    case 'thread/tokenUsage/updated': {
      state.tokens = tokenUsage(obj(params['tokenUsage']));
      return;
    }

    case 'item/agentMessage/delta': {
      const blockId = log.currentBlock(str(params['itemId']) ?? '');
      if (blockId === undefined) return;
      log.push({ type: 'text.delta', blockId, delta: str(params['delta']) ?? '' });
      return;
    }

    // Only `summaryTextDelta` fires, and only with `model_reasoning_summary` configured; a config change moves thinking to the other.
    case 'item/reasoning/summaryTextDelta':
    case 'item/reasoning/textDelta': {
      const blockId = log.currentBlock(str(params['itemId']) ?? '');
      if (blockId === undefined) return;
      log.push({ type: 'thinking.delta', blockId, delta: str(params['delta']) ?? '' });
      return;
    }

    case 'item/reasoning/summaryPartAdded': {
      if ((num(params['summaryIndex']) ?? 0) === 0) return;
      const blockId = log.currentBlock(str(params['itemId']) ?? '');
      if (blockId === undefined) return;
      log.push({ type: 'thinking.delta', blockId, delta: '\n\n' });
      return;
    }

    case 'item/completed': {
      const item = obj(params['item']);
      const type = str(item?.['type']);
      const id = str(item?.['id']);
      if (item === undefined || type === undefined || id === undefined) return;
      switch (type) {
        case 'mcpToolCall': {
          if (opts.connectors && !codexInternalServer(str(item['server']) ?? '') && !opts.internalMcpServers?.has(str(item['server']) ?? '')) {
            log.noteMcpToolCall(id, str(item['server']));
            state.openToolCalls.delete(id);
            log.ensureToolStart(id, type, item, 'in_progress', { source: 'stream' });
            const result = obj(item['result']);
            const content = result?.['content'];
            const text = Array.isArray(content) ? content.flatMap((entry: unknown) => {
              const block = obj(entry);
              return str(block?.['type']) === 'text' && typeof block?.['text'] === 'string' ? [block['text']] : [];
            }).join('\n') : '';
            const error = obj(item['error']);
            const outcome = unrowedOutcome(item);
            const failed = outcome === 'failed' || result?.['isError'] === true || error !== undefined;
            log.endTool(id, failed ? 'failed' : outcome, ended(str(error?.['message']) ?? text, failed));
          } else {
            if (log.noteMcpToolCall(id, str(item['server']))) log.openUnrowedCall(id);
            log.endUnrowedCall(id, unrowedOutcome(item));
          }
          return;
        }
        case 'agentMessage': {
          const blockId = log.currentBlock(id);
          if (blockId !== undefined) log.push({ type: 'text.end', blockId, text: '' });
          state.openBlocks.delete(id);
          log.closeBlock(id);
          return;
        }
        case 'reasoning': {
          const blockId = log.currentBlock(id);
          if (blockId !== undefined) log.push({ type: 'thinking.end', blockId, text: '' });
          state.openBlocks.delete(id);
          log.closeBlock(id);
          return;
        }
        case 'fileChange': {
          state.openToolCalls.delete(id);
          if (log.hasEnded(id)) return;
          log.ensureToolStart(id, type, item, 'in_progress', { source: 'stream' });
          const changes = Array.isArray(item['changes']) ? item['changes'] : [];
          // `declined` is a `PatchApplyStatus` member: the user rejected the patch, so it landed nothing
          // and must not count as a changed target (ONL-2286, ONL-2463).
          log.endTool(id, unrowedOutcome(item), {
            result: changes
              .map((change) => {
                const record = obj(change);
                return `${str(record?.['path']) ?? '?'}\n${str(record?.['diff']) ?? ''}`;
              })
              .join('\n'),
          });
          return;
        }
        case 'commandExecution': {
          const result = commandResult(item);
          state.openToolCalls.delete(id);
          log.endTool(id, str(item['status']) === 'declined' ? 'denied' : result.isError ? 'failed' : 'completed', ended(result.text, result.isError));
          return;
        }
        case 'dynamicToolCall': {
          state.openToolCalls.delete(id);
          // `success` is the tool's verdict, `status` is codex's; a declined call already ended `denied` and `endTool` is terminal-once (ONL-2304).
          const failed = str(item['status']) === 'failed' || item['success'] === false;
          log.endTool(id, failed ? 'failed' : 'completed', ended(contentItemsText(item['contentItems']), failed));
          return;
        }
        case 'userMessage':
          return;
        default: {
          log.endUnrowedCall(id, unrowedOutcome(item));
          log.noteUnmapped(`item/completed:${type}`);
          return;
        }
      }
    }

    case 'turn/completed': {
      const turn = obj(params['turn']);
      const status = str(turn?.['status']) ?? 'unknown';
      const error = turn?.['error'];
      if (status === 'failed' && error != null) {
        const { code, apiErrorStatus } = turnErrorCode(error);
        log.push({
          type: 'session.error',
          message: turnErrorMessage(error),
          code,
          ...(apiErrorStatus === null ? {} : { apiErrorStatus }),
        });
        opts.onError?.(code, apiErrorStatus);
        if (isSignInFixable(code)) opts.onConnection?.({ status: 'unauthenticated', harness: 'codex' });
      } else if (status === 'failed') {
        // No `onError`: the row is new, the telemetry code is not (ONL-2903).
        log.push({ type: 'session.error', message: '', code: 'unknown' });
      }
      // Duration, turn end and `isError` are stated by the protocol; a fallback here invents one.
      const durationMs = num(turn?.['durationMs']);
      // An interrupted turn leaves in-flight items with no `item/completed`: blocks as well as tool calls.
      for (const toolCallId of state.openToolCalls) log.endTool(toolCallId, 'canceled');
      state.openToolCalls.clear();
      for (const [itemId, kind] of state.openBlocks) {
        const blockId = log.currentBlock(itemId);
        if (blockId !== undefined) {
          log.push(kind === 'text' ? { type: 'text.end', blockId, text: '' } : { type: 'thinking.end', blockId, text: '' });
        }
        log.closeBlock(itemId);
      }
      state.openBlocks.clear();
      // Before the tally: a turn ending on a question still parked banks that wait or loses it (ONL-2295).
      log.unparkQuestion();
      // The summary takes only a declared status; the row below keeps whatever was sent (ONL-2463).
      if (TERMINAL_TURN_STATUSES.has(status)) {
        const tally = log.turnTally();
        if (tally !== undefined) opts.onTurnEnded?.({ ...tally, stopReason: status });
      }
      log.push({
        type: 'turn.ended',
        turnId: log.turnId,
        stopReason: status,
        durationMs,
        waitedMs: log.turnWaitedMs,
        filesChanged: log.turnFilesChanged,
        ...(state.tokens === undefined ? {} : { tokens: state.tokens }),
      });
      return;
    }

    case 'turn/plan/updated':
      log.notePlan();
      return;

    // Non-terminal: the turn is live until `turn/completed`, which carries the failure if the retries run out.
    case 'error': {
      if (params['willRetry'] !== true) {
        log.noteUnmapped(method);
        return;
      }
      const { apiErrorStatus } = codexObjectError(obj(params['error']));
      // No attempt: the number lives only inside the message, beside a denominator the notice never shows (ONL-2491).
      log.push({ type: 'session.retrying', status: apiErrorStatus });
      return;
    }

    default: {
      if (!IGNORED.has(method)) log.noteUnmapped(method);
    }
  }
}
