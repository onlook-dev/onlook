/** SDK stream -> Studio event vocabulary. Only `agent-host` imports the Claude Agent SDK; nothing downstream does, and that boundary is why the log is replayable. */

import type {
  SDKAssistantMessageError,
  SDKMessage,
  SDKResultError,
  TerminalReason,
} from '@anthropic-ai/claude-agent-sdk';
import {
  isCredentialRefusalKind,
  isBillingFailure,
  isSignInFixable,
  RETRY_ERROR_KINDS as RETRY_KIND_VALUES,
  type AgentConnection,
  type ImageRef,
  type PermissionOption,
  type Question,
  type QuestionOption,
  type RateLimitWindow,
  type SessionErrorCode,
  type ToolKind,
  type TurnTokens,
} from '@studio/events';
// Button labels are user-facing, so the i18n guardrail applies even here in main.
import { t } from '@studio/i18n';
import type { AlwaysAllowGrant } from './permission-grant.js';
import { classifySessionError } from './connection.js';
import { num, str } from './coerce.js';
import type { EventLog, EventPresentation, SessionEndSummary, TurnSummary } from './event-log.js';
import { DELETE_PROJECT_FILE_TOOL } from './tool-names.js';

/**
 * Name-based with an MCP-verb fallback, because the SDK reports no kind of its
 * own. `delete` and `move` map from no built-in tool — they arise only from Bash
 * and MCP, and stay in the vocabulary on purpose.
 */
const KIND_BY_TOOL: Record<string, ToolKind> = {
  Read: 'read',
  NotebookRead: 'read',
  Write: 'edit',
  Edit: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Bash: 'execute',
  PowerShell: 'execute',
  BashOutput: 'execute',
  KillShell: 'execute',
  Glob: 'search',
  Grep: 'search',
  WebFetch: 'fetch',
  WebSearch: 'fetch',
  Task: 'think',
  Agent: 'think',
  TodoWrite: 'think',
  ExitPlanMode: 'think',
  AskUserQuestion: 'other',
};

export function toolKind(name: string): ToolKind {
  const direct = KIND_BY_TOOL[name];
  if (direct) return direct;

  // MCP tools arrive as mcp__<server>__<tool>; infer from the verb. A heuristic,
  // but an unknown MCP tool rendering as `other` is the failure being avoided.
  const leaf = name.split('__').pop()?.toLowerCase() ?? '';
  if (/^(read|get|list|fetch_?file|view|open|cat)/.test(leaf)) return 'read';
  if (/^(write|edit|update|create|set|patch|append|duplicate|undo|redo)/.test(leaf)) return 'edit';
  if (/^(delete|remove|rm|destroy|drop)/.test(leaf)) return 'delete';
  if (/^(move|rename|mv)/.test(leaf)) return 'move';
  if (/^(search|find|query|grep|glob)/.test(leaf)) return 'search';
  if (/^(run|exec|execute|shell|invoke)/.test(leaf)) return 'execute';
  if (/^(fetch|http|request|curl|browse)/.test(leaf)) return 'fetch';
  return 'other';
}

function rel(p: unknown, cwd: string): string {
  if (typeof p !== 'string') return '';
  return p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p;
}

export function toolPresentation(
  name: string,
  input: unknown,
  cwd: string,
): { title: string; target?: string } {
  const i = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case DELETE_PROJECT_FILE_TOOL:
      return { title: 'Delete', target: rel(i.path, cwd) };
    case 'Read':
      return { title: 'Read', target: rel(i.file_path, cwd) };
    case 'Write':
      return { title: 'Write', target: rel(i.file_path, cwd) };
    case 'Edit':
    case 'MultiEdit':
      return { title: 'Edit', target: rel(i.file_path, cwd) };
    case 'Bash':
      return { title: 'Bash', target: str(i.command) };
    case 'PowerShell':
      return { title: 'PowerShell', target: str(i.command) };
    case 'Glob':
      return { title: 'Glob', target: str(i.pattern) };
    case 'Grep':
      return { title: 'Grep', target: str(i.pattern) };
    case 'WebFetch':
      return { title: 'Fetch', target: str(i.url) };
    case 'WebSearch':
      return { title: 'Search', target: str(i.query) };
    case 'Task':
    case 'Agent':
      return { title: 'Task', target: str(i.description) };
    case 'TodoWrite':
      return {
        title: 'Todos',
        target: `${Array.isArray(i.todos) ? i.todos.length : 0} items`,
      };
    case 'AskUserQuestion':
      return {
        title: 'Question',
        target: Array.isArray(i.questions)
          ? str((i.questions[0] as Record<string, unknown> | undefined)?.header)
          : undefined,
      };
    default: {
      // MCP: mcp__figma__get_node -> title "figma", target "get node".
      const parts = name.split('__');
      if (parts.length === 3 && parts[1] && parts[2]) {
        return { title: parts[1], target: parts[2].replace(/_/g, ' ') };
      }
      return { title: name };
    }
  }
}

function diffStats(
  name: string,
  input: unknown,
): { additions?: number; deletions?: number } {
  const i = (input ?? {}) as Record<string, unknown>;
  const count = (s: unknown): number =>
    typeof s === 'string' && s.length > 0 ? s.split('\n').length : 0;
  if (name === 'Write') return { additions: count(i.content) };
  if (name === 'Edit') {
    return { additions: count(i.new_string), deletions: count(i.old_string) };
  }
  return {};
}

function flattenResult(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b: unknown) => {
        if (typeof b === 'string') return b;
        const block = b as Record<string, unknown>;
        if (block?.type === 'text') return str(block.text) ?? '';
        if (block?.type === 'image') return '[image]';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return String(content);
}

function imageBlocksIn(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const payloads: string[] = [];
  for (const raw of content) {
    const block = obj(raw);
    if (block?.type !== 'image') continue;
    const source = obj(block.source);
    const data = str(source?.data);
    if (source?.type === 'base64' && data) payloads.push(data);
  }
  return payloads;
}

/**
 * `tool_use_result` is a field on the user MESSAGE, not on a content block, so
 * with several `tool_result`s batched there is no rule for which it describes —
 * joined ONLY when the message carries exactly one image. Display dimensions are
 * the ones carried (R9): what the model was shown, not the file on disk.
 */
function imageFileMeta(
  toolUseResult: unknown,
): { width?: number; height?: number; originalSize?: number } | undefined {
  const result = obj(toolUseResult);
  if (result?.type !== 'image') return undefined;
  const file = obj(result.file);
  if (!file) return undefined;
  const dimensions = obj(file.dimensions);
  const meta = {
    ...(num(dimensions?.displayWidth) != null ? { width: num(dimensions?.displayWidth) } : {}),
    ...(num(dimensions?.displayHeight) != null ? { height: num(dimensions?.displayHeight) } : {}),
    ...(num(file.originalSize) != null ? { originalSize: num(file.originalSize) } : {}),
  };
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function resultLanguage(kind: ToolKind, name: string): string {
  if (kind === 'execute') return 'shell';
  if (name === 'TodoWrite' || name.startsWith('mcp__')) return 'json';
  return 'plaintext';
}

/** The tool whose permission request is really a question. */
export const QUESTION_TOOL = 'AskUserQuestion';

/**
 * Validated rather than cast: the selected label becomes the answer key, so a
 * malformed question is better dropped than rendered as an unclickable ghost.
 * `undefined` degrades to a plain approve/deny row.
 */
export function parseQuestions(input: unknown): Question[] | undefined {
  const raw = (input as { questions?: unknown } | undefined)?.questions;
  if (!Array.isArray(raw)) return undefined;

  const questions: Question[] = [];
  for (const item of raw) {
    const q = obj(item);
    const question = str(q?.question);
    const header = str(q?.header);
    if (!question || !Array.isArray(q?.options)) continue;

    const options: QuestionOption[] = [];
    for (const rawOption of q.options) {
      const o = obj(rawOption);
      const label = str(o?.label);
      if (!label) continue;
      options.push({
        label,
        description: str(o?.description) ?? '',
        preview: str(o?.preview),
      });
    }
    // A question with fewer than two choices is not a choice.
    if (options.length < 2) continue;

    questions.push({
      question,
      header: header ?? question.slice(0, 12),
      options,
      multiSelect: q?.multiSelect === true,
    });
  }
  return questions.length > 0 ? questions : undefined;
}

/** `answers` is keyed by question text. Anything else, a per-question `selected` field included, returns "The user did not answer the questions." */
export function applyAnswers(
  input: Record<string, unknown>,
  answers: Record<string, string>,
): Record<string, unknown> {
  return { ...input, answers };
}

/** `answers` stays empty: a key the CLI did not show the user is refused, and `response` is its own free-text field (ONL-2583). */
export function applyResponse(input: Record<string, unknown>, response: string): Record<string, unknown> {
  return { ...input, answers: {}, response };
}

type AlwaysAllowLabel = Pick<AlwaysAllowGrant, 'oneRequest' | 'covers'>;

/** The row says what the rule it writes covers, so "always" is never wider than the grant (ONL-2562). */
function alwaysAllowLabel(displayName: string | undefined, always: AlwaysAllowLabel): string {
  if (always.covers !== undefined) {
    return t('chat.permission.alwaysAllowCovers', { target: always.covers });
  }
  if (always.oneRequest) return t('chat.permission.alwaysAllowRequest');
  return displayName === undefined || displayName === ''
    ? t('chat.permission.alwaysAllow')
    : t('chat.permission.alwaysAllowTool', { tool: displayName });
}

/**
 * No `always` row without a grant: a destructive class would retire the gate in one
 * click (ONL-2190), and an ask no rule can silence would keep coming back (ONL-2562).
 */
export function permissionOptions(
  displayName: string | undefined,
  always: AlwaysAllowLabel | undefined,
): PermissionOption[] {
  return [
    { optionId: 'allow', label: t('chat.permission.approve'), kind: 'allow_once' },
    ...(always === undefined
      ? []
      : ([
          {
            optionId: 'allow_always',
            label: alwaysAllowLabel(displayName, always),
            kind: 'allow_always',
          },
        ] as PermissionOption[])),
    { optionId: 'deny', label: t('chat.permission.deny'), kind: 'reject_once' },
  ];
}

/** Deliberately dropped; anything else not handled below is counted in `unmappedTypes` as SDK drift. */
const IGNORED_TYPES: ReadonlySet<string> = new Set([
  'auth_status',
  'tool_progress',
  'prompt_suggestion',
  'tool_use_summary',
  'conversation_reset',
] satisfies readonly SDKMessage['type'][]);

const IGNORED_SYSTEM_SUBTYPES: ReadonlySet<string> = new Set([
  'status',
  'thinking_tokens',
  'session_state_changed',
  'commands_changed',
  'background_tasks_changed',
  'control_request_progress',
  'files_persisted',
  'memory_recall',
  'hook_started',
  'hook_progress',
  'hook_response',
  'task_progress',
  'task_started',
  'task_updated',
  'task_notification',
  'notification',
  'informational',
  'compact_boundary',
  'worker_shutting_down',
] satisfies readonly Extract<SDKMessage, { type: 'system' }>['subtype'][]);

/** Exhaustive over `TerminalReason`, so a bump fails the build; `null` falls through (ONL-2463). */
const CODE_BY_TERMINAL_REASON = {
  blocking_limit: 'rate_limited',
  rapid_refill_breaker: 'rate_limited',
  budget_exhausted: 'rate_limited',
  prompt_too_long: 'prompt_too_long',
  image_error: 'image_error',
  model_error: 'model_error',
  api_error: 'api_error',
  malformed_tool_use_exhausted: 'tool_use_failed',
  structured_output_retry_exhausted: 'tool_use_failed',
  tool_deferred_unavailable: 'tool_use_failed',
  turn_setup_failed: 'turn_setup_failed',
  stop_hook_prevented: 'hook_stopped',
  hook_stopped: 'hook_stopped',
  max_turns: 'max_turns',
  aborted_streaming: null,
  aborted_tools: null,
  tool_deferred: null,
  background_requested: null,
  completed: null,
} satisfies Record<TerminalReason, SessionErrorCode | null>;

/** The error subtypes carry no `result` string. */
const CODE_BY_RESULT_SUBTYPE = {
  error_max_turns: 'max_turns',
  error_max_budget_usd: 'max_budget',
  error_max_structured_output_retries: 'tool_use_failed',
  error_during_execution: null,
} satisfies Record<SDKResultError['subtype'], SessionErrorCode | null>;

/** The declared per-attempt error kinds; a value outside them is dropped rather than shipped (ONL-2197). */
const RETRY_ERROR_KINDS: ReadonlySet<string> = new Set(RETRY_KIND_VALUES satisfies readonly SDKAssistantMessageError[]);

/** Plan exhaustion, then the credential rule, then the auth classifier, all before the reason map (ONL-2197, ONL-2080, ONL-2491). */
function failureCode(
  msg: SdkMessage,
  text: string | undefined,
  credential: boolean,
  assistantError?: string,
): SessionErrorCode {
  const reason = str(msg.terminal_reason);
  const byReason = reason === undefined ? null : (CODE_BY_TERMINAL_REASON[reason as TerminalReason] ?? null);
  if (isBillingFailure(assistantError, num(msg.api_error_status), resultProse(msg))) return 'billing_error';
  if (byReason === 'rate_limited') return byReason;
  // Ahead of the classifier, whose regex claims `invalid api key` for sign-in (ONL-2491).
  if (credential) return 'credential_rejected';
  const classified = text === undefined ? 'unknown' : classifySessionError(text);
  if (classified !== 'unknown') return classified;
  if (byReason !== null) return byReason;
  const subtype = str(msg.subtype);
  const bySubtype =
    subtype === undefined ? null : (CODE_BY_RESULT_SUBTYPE[subtype as SDKResultError['subtype']] ?? null);
  return bySubtype ?? 'unknown';
}

type SdkMessage = Record<string, unknown>;

function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

/** `SDKResultError` declares no `result`; its prose is in `errors` (ONL-2495). */
function resultProse(msg: SdkMessage): string | undefined {
  const result = str(msg.result);
  if (result !== undefined) return result;
  if (!Array.isArray(msg.errors)) return undefined;
  const joined = msg.errors.filter((line): line is string => typeof line === 'string').join('\n').trim();
  return joined === '' ? undefined : joined;
}

/** The turn's last `assistant` message carries the per-request usage; `result.usage` is summed over every request of the turn (ONL-2381). */
const lastRequestUsage = new WeakMap<EventLog, Record<string, unknown>>();

/** The model that produced the last request, so a subagent turn's `modelUsage` can be disambiguated (ONL-2197). */
const lastRequestModel = new WeakMap<EventLog, string>();

/** `SDKAssistantMessageError`, carried as a plain string: the failing result names no kind of its own (ONL-2491). */
const lastAssistantError = new WeakMap<EventLog, string>();

/** The turn-end telemetry roll-up, drained at the result (ONL-2463). */
interface RetryTally {
  attempts: number;
  lastStatus: number | null;
  lastKind?: string;
  /** Held across the storm because `lastKind` is overwritten, and only until a request succeeds (ONL-2491). */
  credential?: true;
}
const retryTally = new WeakMap<EventLog, RetryTally>();

export function retryWasCredentialShaped(log: EventLog): boolean {
  return retryTally.get(log)?.credential === true;
}

/** The result drains these; a turn that dies without one would otherwise code the next turn (ONL-2491). */
export function forgetTurnState(log: EventLog): void {
  retryTally.delete(log);
  lastAssistantError.delete(log);
}

// A clean request ends the storm, so its credential verdict is spent. Held past that, a turn
// that recovered and later hit a budget cap or an overload reports a refused credential and
// withholds the Retry that would have worked (ONL-2491).
function forgetCredentialVerdict(log: EventLog): void {
  lastAssistantError.delete(log);
  const tally = retryTally.get(log);
  if (tally?.credential !== true) return;
  const { credential: _spent, ...kept } = tally;
  retryTally.set(log, kept);
}

/**
 * codex documents its `resetsAt` as epoch seconds and Claude leaves its unit unstated, so a
 * millisecond-scale value is normalised rather than pinned to a guess (ONL-2197).
 */
function resetInstant(value: unknown): number | undefined {
  const at = num(value);
  if (at === undefined) return undefined;
  return at >= 1e11 ? Math.floor(at / 1_000) : at;
}

/** Every figure optional: an absent count is absent, never zero (ONL-2197). */
export function rateLimitWindow(info: Record<string, unknown>): RateLimitWindow | undefined {
  const kind = str(info['rateLimitType']);
  if (kind === undefined) return undefined;
  const status = str(info['status']);
  const usedPercent = num(info['utilization']);
  const resetsAt = resetInstant(info['resetsAt']);
  return {
    kind,
    ...(usedPercent === undefined ? {} : { usedPercent }),
    ...(resetsAt === undefined ? {} : { resetsAt }),
    ...(status === 'allowed' || status === 'allowed_warning' || status === 'rejected'
      ? { status }
      : {}),
  };
}

/**
 * The turn's own model, not the first key: a turn that ran a subagent has two `modelUsage`
 * entries and insertion order is not the main model, so an unresolvable pair reports no
 * window rather than another model's (ONL-2197).
 */
function turnModelUsage(
  modelUsage: Record<string, unknown> | undefined,
  requestModel: string | undefined,
): Record<string, unknown> | undefined {
  if (modelUsage === undefined) return undefined;
  const entries = Object.entries(modelUsage);
  if (entries.length === 1) return obj(entries[0]?.[1]);
  if (requestModel === undefined) return undefined;
  const named = entries.find(
    ([id, entry]) => id === requestModel || str(obj(entry)?.['canonicalModel']) === requestModel,
  );
  return obj(named?.[1]);
}

/**
 * Context is what the model was sent — input plus both cache legs. `total` has no source on this
 * path: `BetaUsage` reports no total at 0.3.220, and a sum would not be the runtime's own figure.
 */
function resultTokens(
  usage: Record<string, unknown> | undefined,
  modelUsage: Record<string, unknown> | undefined,
  requestModel?: string,
): TurnTokens | undefined {
  if (usage === undefined) return undefined;
  const input = num(usage['input_tokens']);
  const cachedInput = num(usage['cache_read_input_tokens']);
  const cacheWriteInput = num(usage['cache_creation_input_tokens']);
  const output = num(usage['output_tokens']);
  const reasoningOutput = num(obj(usage['output_tokens_details'])?.['thinking_tokens']);
  const context =
    input === undefined ? undefined : input + (cachedInput ?? 0) + (cacheWriteInput ?? 0);
  const model = turnModelUsage(modelUsage, requestModel);
  return {
    input,
    cachedInput,
    cacheWriteInput,
    output,
    ...(reasoningOutput === undefined ? {} : { reasoningOutput }),
    context,
    contextWindow: num(model?.['contextWindow']),
  };
}

/** Both figures travel together so they can be reconciled downstream. */
export interface CostSample {
  /** The SDK's cumulative `total_cost_usd`, untouched. */
  totalCostUsd: number;
  /** This turn's share, computed here because the SDK does not report it. */
  costDeltaUsd: number;
}

/**
 * Precedence: a fatal pump error outranks everything (the session died, the close
 * is cleanup); still streaming at close means teardown killed the turn; a last
 * result of 'error_max_turns' means the SDK stopped it, not the user.
 */
export function sessionEndReason(state: {
  failed: boolean;
  streaming: boolean;
  lastResultSubtype?: string;
}): SessionEndSummary['reason'] {
  if (state.failed) return 'error';
  if (state.streaming) return 'interrupted';
  if (state.lastResultSubtype === 'error_max_turns') return 'max_turns';
  return 'completed';
}

export interface HandleOptions {
  /**
   * True between a user Stop and the resulting `result`. Without it an interrupt
   * is indistinguishable from a failure — it arrives as
   * `subtype: 'error_during_execution'`, so every Stop shows an error banner.
   */
  interrupted?: boolean;
  /** `total_cost_usd` is cumulative across a session, so the delta is ours to compute. */
  previousTotalCostUsd?: number;
  onCost?: (sample: CostSample) => void;
  /** Unlike `onCost`, needs no reported cost — every turn that began gets a summary. */
  onTurnEnded?: (summary: TurnSummary) => void;
  /**
   * Answers the ref `tool.end` will carry, or null to skip — a failed store must
   * not fail the tool row. Absent drops the bytes, the pre-ONL-1881 behaviour.
   */
  captureImage?: (bytes: Uint8Array) => ImageRef | null;
  /**
   * A failed turn whose text classifies as an auth failure. The other half of
   * the reactive no-connection state: the pump's catch sees throws, this sees
   * the `is_error` result a logged-out CLI answers with (ONL-2080).
   */
  onConnection?: (connection: AgentConnection) => void;
  /** Same telemetry hook the pump's catch feeds — a result-path failure counts too. */
  onError?: (code: SessionErrorCode, apiErrorStatus: number | null) => void;
}

export function handleSdkMessage(
  log: EventLog,
  msg: SdkMessage,
  opts: HandleOptions = {},
): void {
  switch (msg.type) {
    // Account-scoped: it arrives between turns as well as inside one (ONL-2197).
    case 'rate_limit_event': {
      const window = rateLimitWindow(obj(msg.rate_limit_info) ?? {});
      if (window !== undefined) log.push({ type: 'usage.limits', windows: [window], raw: msg });
      return;
    }

    case 'system': {
      if (msg.subtype === 'init') {
        if (Array.isArray(msg.mcp_servers)) {
          log.setMcpServerNames(msg.mcp_servers.flatMap((server) => {
            const name = str(obj(server)?.name);
            return name ? [name] : [];
          }));
        }
        log.push({
          type: 'session.started',
          cwd: str(msg.cwd) ?? log.cwd,
          model: str(msg.model),
          sdkSessionId: str(msg.session_id),
          tools: Array.isArray(msg.tools) ? (msg.tools as string[]) : undefined,
          // Deliberately not `msg.permissionMode`: the CLI reports what it defaulted to, which is not what Studio passed (ONL-2190).
          raw: msg,
        });
      } else if (msg.subtype === 'permission_denied') {
        // A denial that never reached `canUseTool` — a deny rule, the auto-mode
        // classifier, `dontAsk`. Without this the row spins forever, and the
        // SDK's `message` is the only sentence naming what was refused.
        // `ensureToolStart` first because the row may not exist yet; announcing
        // is idempotent.
        const toolCallId = str(msg.tool_use_id);
        const name = str(msg.tool_name);
        if (toolCallId) {
          if (name) {
            log.ensureToolStart(toolCallId, name, msg.tool_input, 'pending', {
              source: 'permission',
              agentId: str(msg.agent_id),
            });
          }
          log.endTool(toolCallId, 'denied', { errorMessage: str(msg.message) });
        }
      } else if (msg.subtype === 'api_retry') {
        // Cleared at the turn's result, which the SDK sends exactly once: a retry can precede
        // `beginTurn()` on a turn the CLI began, so the turn id is not the boundary (ONL-2463).
        const prior = retryTally.get(log);
        const reported = str(msg.error);
        const kind = reported !== undefined && RETRY_ERROR_KINDS.has(reported) ? reported : undefined;
        const lastKind = kind ?? prior?.lastKind;
        const status = num(msg.error_status) ?? null;
        const attempt = num(msg.attempt);
        // Only the cloud kind is sticky: a 401 on one attempt of a storm must not outlive it and
        // re-code a sign-out the result itself reports (ONL-2491).
        const credential = kind === 'cloud_credential_error';
        retryTally.set(log, {
          attempts: (prior?.attempts ?? 0) + 1,
          lastStatus: status,
          ...(lastKind === undefined ? {} : { lastKind }),
          ...(prior?.credential === true || credential ? { credential: true } : {}),
        });
        log.push({
          type: 'session.retrying',
          ...(attempt === undefined ? {} : { attempt }),
          status,
          ...(kind === undefined ? {} : { kind }),
          raw: msg,
        });
      } else if (!IGNORED_SYSTEM_SUBTYPES.has(String(msg.subtype))) {
        log.noteUnmapped(`system:${String(msg.subtype)}`);
      }
      return;
    }

    case 'stream_event': {
      const ev = obj(msg.event);
      // `event.index` restarts at 0 on every assistant message, so it is NOT a
      // stable render key — deltas resolve through the slot to an opaque id.
      const slot = `${str(msg.parent_tool_use_id) ?? 'root'}:${num(ev?.index) ?? 0}`;

      if (ev?.type === 'content_block_start') {
        const block = obj(ev.content_block);
        const blockId = log.openBlock(
          slot,
          block?.type === 'text' || block?.type === 'thinking' ? block.type : undefined,
        );
        if (block?.type === 'text') {
          log.push({
            type: 'text.start',
            blockId,
            parentToolUseId: str(msg.parent_tool_use_id),
          });
        } else if (block?.type === 'thinking') {
          log.push({
            type: 'thinking.start',
            blockId,
            parentToolUseId: str(msg.parent_tool_use_id),
          });
        } else if (block?.type === 'tool_use') {
          // Provisional: the hook, `canUseTool` and the completed message all
          // land AFTER generation, and a large Write generates for minutes
          // (ONL-2142). The input fills in through `streamToolInput`.
          const id = str(block.id);
          const name = str(block.name);
          if (id && name) {
            log.openToolBlock(slot, id);
            log.ensureToolStart(id, name, {}, 'pending', {
              source: 'stream',
              parentToolUseId: str(msg.parent_tool_use_id),
              provisional: true,
            });
          }
        }
        return;
      }

      // Thinking settles HERE, not at `turn.ended` — a turn holds many blocks and
      // closing them all at the end leaves every earlier one shimmering as live.
      // `text` deliberately does not: its `isStreaming` also drives the markdown
      // fade-in and duration row. The empty `text` is intentional — `foldSessionState()`
      // reads `e.text || it.text`, so the accumulated deltas survive.
      if (ev?.type === 'content_block_stop') {
        const blockId = log.currentBlock(slot);
        if (blockId && log.blockKind(slot) === 'thinking') {
          log.push({ type: 'thinking.end', blockId, text: '' });
        }
        log.closeBlock(slot);
        return;
      }

      if (ev?.type === 'content_block_delta') {
        const delta = obj(ev.delta);
        const blockId = log.currentBlock(slot);
        if (!blockId) return; // a delta for a block we never opened
        if (delta?.type === 'text_delta') {
          log.push({ type: 'text.delta', blockId, delta: str(delta.text) ?? '' });
        } else if (delta?.type === 'thinking_delta') {
          log.push({
            type: 'thinking.delta',
            blockId,
            delta: str(delta.thinking) ?? '',
          });
        } else if (delta?.type === 'input_json_delta') {
          log.streamToolInput(slot, str(delta.partial_json) ?? '');
        }
        return;
      }
      return;
    }

    case 'assistant': {
      const errorKind = str(msg.error);
      if (errorKind === undefined) forgetCredentialVerdict(log);
      else lastAssistantError.set(log, errorKind);
      const message = obj(msg.message);
      const usage = obj(message?.usage);
      if (usage !== undefined) lastRequestUsage.set(log, usage);
      const requestModel = str(message?.['model']);
      if (requestModel !== undefined) lastRequestModel.set(log, requestModel);
      const content = message?.content;
      if (!Array.isArray(content)) return;
      for (const raw of content) {
        const block = obj(raw);
        if (block?.type !== 'tool_use') continue;
        log.ensureToolStart(
          String(block.id),
          String(block.name),
          block.input,
          'in_progress',
          {
            source: 'assistant',
            parentToolUseId: str(msg.parent_tool_use_id),
            raw: block,
          },
        );
      }
      return;
    }

    case 'user': {
      const content = obj(msg.message)?.content;
      if (!Array.isArray(content)) return;

      // Message scope: join `tool_use_result.file` only when the whole message
      // carries exactly one image. See `imageFileMeta`.
      const totalImages = content.reduce(
        (n, raw) =>
          obj(raw)?.type === 'tool_result' ? n + imageBlocksIn(obj(raw)?.content).length : n,
        0,
      );
      const fileMeta = totalImages === 1 ? imageFileMeta(msg.tool_use_result) : undefined;

      for (const raw of content) {
        const block = obj(raw);
        if (block?.type !== 'tool_result') continue;
        const text = flattenResult(block.content);
        const isError = block.is_error === true;

        // The render trigger is exactly this — a tool call that RETURNED an
        // image, never text that looks like a path (ONL-1881).
        let images: ImageRef[] | undefined;
        if (opts.captureImage) {
          for (const base64 of imageBlocksIn(block.content)) {
            let bytes: Buffer;
            try {
              bytes = Buffer.from(base64, 'base64');
            } catch {
              continue;
            }
            const ref = opts.captureImage(bytes);
            if (ref) (images ??= []).push(fileMeta ? { ...ref, ...fileMeta } : ref);
          }
        }

        // Stop mid-command: the CLI answers the aborted tool with an error result
        // before the sweep — the user stopped it, so it is not a failure (ONL-2231).
        const status = isError ? (opts.interrupted === true ? 'canceled' : 'failed') : 'completed';
        log.endTool(String(block.tool_use_id), status, {
          result: text,
          isError,
          errorMessage: isError ? text.slice(0, 400) : undefined,
          ...(images ? { images } : {}),
        });
      }
      return;
    }

    case 'result': {
      // The host's own flag, OR the SDK's word for an abort — a turn the CLI
      // aborted is not a failure to paint red whoever asked (ONL-2180).
      const terminalReason = str(msg.terminal_reason);
      const wasInterrupted =
        opts.interrupted === true ||
        (msg.is_error === true &&
          (terminalReason === 'aborted_streaming' || terminalReason === 'aborted_tools'));
      /**
       * ⚠️ A logged-out or expired-auth CLI answers `subtype: 'success'` with
       * `is_error: true` and the reason in `result` — never a throw, never an
       * error subtype (captured at 0.3.220, ONL-2080). The subtype alone is
       * not the failure signal.
       */
      const isFailed = msg.subtype !== 'success' || msg.is_error === true;
      const stopReason = wasInterrupted
        ? 'interrupted'
        : msg.is_error === true
          ? (str(msg.terminal_reason) ?? 'error')
          : str(msg.subtype);

      // `total_cost_usd` is cumulative, so the per-turn figure is ours to subtract.
      const totalCostUsd = num(msg.total_cost_usd);
      const costDeltaUsd =
        totalCostUsd == null
          ? undefined
          : // Clamped: a difference of two independently reported numbers.
            Math.max(0, totalCostUsd - (opts.previousTotalCostUsd ?? 0));
      if (totalCostUsd != null && costDeltaUsd != null) {
        opts.onCost?.({ totalCostUsd, costDeltaUsd });
      }

      const tokens = resultTokens(
        lastRequestUsage.get(log),
        obj(msg.modelUsage),
        lastRequestModel.get(log),
      );
      lastRequestUsage.delete(log);
      lastRequestModel.delete(log);

      const apiErrorStatus = num(msg.api_error_status);
      // Read before the tally is drained below, and before the kind is spent (ONL-2491).
      const credential =
        retryWasCredentialShaped(log) ||
        isCredentialRefusalKind(lastAssistantError.get(log), apiErrorStatus);
      const assistantError = lastAssistantError.get(log);
      lastAssistantError.delete(log);

      // Guarded by the tally, not the message: a result with no begun turn has
      // nothing to report and must not invent a 't0' row in a dashboard.
      const retries = retryTally.get(log);
      retryTally.delete(log);
      // Before the tally: a turn ending on a question still parked banks that wait or loses it (ONL-2295).
      log.unparkQuestion();
      const tally = log.turnTally();
      if (tally) {
        opts.onTurnEnded?.({
          ...tally,
          ...(stopReason === undefined ? {} : { stopReason }),
          retryAttempts: retries?.attempts ?? 0,
          retryLastStatus: retries?.lastStatus ?? null,
          ...(retries?.lastKind === undefined ? {} : { retryErrorKind: retries.lastKind }),
        });
      }

      // A call still open at the result gets no tool_result (a Stop mid-generation aborts the message first, ONL-2142) and would shimmer forever.
      log.cancelOpenToolCalls(wasInterrupted ? 'Interrupted' : 'Turn ended');

      log.push({
        type: 'turn.ended',
        turnId: log.turnId,
        stopReason,
        totalCostUsd,
        costDeltaUsd,
        durationMs: num(msg.duration_ms),
        apiDurationMs: num(msg.duration_api_ms),
        waitedMs: log.turnWaitedMs,
        filesChanged: log.turnFilesChanged,
        numTurns: num(msg.num_turns),
        ...(tokens === undefined ? {} : { tokens }),
        raw: msg,
      });
      if (isFailed && !wasInterrupted) {
        const text = str(msg.result);
        const code = failureCode(msg, text, credential, assistantError);
        // The provider's prose or nothing: the subtype is a machine token, and the row names the reason from `code` (ONL-2495).
        const prose = resultProse(msg);
        log.push({
          type: 'session.error',
          message: prose ?? '',
          code,
          detail: prose,
          ...(apiErrorStatus === undefined ? {} : { apiErrorStatus }),
          raw: msg,
        });
        // Declared on the success-shaped result only, so an error-subtype failure reports null (ONL-2463).
        opts.onError?.(code, apiErrorStatus ?? null);
        if (isSignInFixable(code)) {
          opts.onConnection?.({
            status: 'unauthenticated',
            ...(text === undefined ? {} : { detail: text }),
            harness: 'claude',
          });
        }
      }
      return;
    }

    default: {
      const type = String(msg.type);
      if (!IGNORED_TYPES.has(type)) log.noteUnmapped(type);
    }
  }
}

/**
 * `present()` returns `name` unchanged: for the Agent SDK the wire name IS the
 * display name. The harness side, where `bash` must become `Bash`, is what needs
 * the indirection (ONL-2018).
 */
export const CLAUDE_PRESENTATION: EventPresentation = {
  present(name, input, cwd) {
    return { name, kind: toolKind(name), ...toolPresentation(name, input, cwd) };
  },
  resultLanguage,
  diffStats,
};
