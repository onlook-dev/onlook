import type { ElementEvidence } from './elements.js';
import type { HarnessId } from './models.js';
import type { PenVerdict } from './pen.js';

export type ToolKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'think'
  | 'fetch'
  | 'other';

/** No `awaiting_approval`: waiting is derived in the projection (`ToolDisplayStatus`), never written. */
export type ToolStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'denied'
  | 'canceled';

export type ToolDisplayStatus = ToolStatus | 'awaiting_approval';

export type PermissionOutcome =
  | 'allow_once'
  | 'allow_always'
  | 'deny'
  | 'canceled';

export interface EventBase {
  sessionId: string;
  /** Raw, not canonicalized, matching `AgentBackend.cwd` (ONL-2203). */
  cwd?: string;
  eventId: string;
  seq: number;
  /** ms. */
  ts: number;
  /** Stripped in production. */
  raw?: unknown;
}

export type KnownEffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra';

/** Open on purpose: codex enumerates effort per model, and a closed union dropped real levels. */
// eslint-disable-next-line @typescript-eslint/ban-types -- the `string & {}` idiom is the point
export type EffortLevel = KnownEffortLevel | (string & {});

/** Applied by main at connect and named by the composer before that lands (ONL-1885). */
export const DEFAULT_EFFORT: EffortLevel = 'medium';

/** Counts only; no price is derived from them (ONL-2070). */
export interface TurnTokens {
  input?: number;
  /** Part of `input`, not additional. */
  cachedInput?: number;
  cacheWriteInput?: number;
  output?: number;
  /** Part of `output`, not additional. */
  reasoningOutput?: number;
  /** The runtime's own figure, not a sum of the parts. */
  total?: number;
  /** The last request's context, never `threadTotal` (ONL-2381). */
  context?: number;
  threadTotal?: number;
  contextWindow?: number;
}

export type KnownRateLimitWindowKind =
  // Claude names its windows; codex reports two unnamed slots.
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_opus'
  | 'seven_day_sonnet'
  | 'seven_day_overage_included'
  | 'overage'
  | 'primary'
  | 'secondary';

/** Open on purpose: each provider enumerates its own windows, and a closed union dropped real rows (ONL-2197). */
// eslint-disable-next-line @typescript-eslint/ban-types -- the `string & {}` idiom is the point
export type RateLimitWindowKind = KnownRateLimitWindowKind | (string & {});

/** Every member comes from a closed enum the backend declares; `unknown` stays reachable because a plain bad request has no enumerated name (ONL-2463). */
export type SessionErrorCode =
  | 'unauthenticated'
  | 'credential_rejected'
  | 'cli_missing'
  | 'spawn_failed'
  | 'rate_limited'
  | 'usage_limit_exceeded'
  | 'billing_error'
  | 'api_error'
  | 'prompt_too_long'
  | 'image_error'
  | 'model_error'
  | 'hook_stopped'
  | 'tool_use_failed'
  | 'turn_setup_failed'
  | 'max_turns'
  | 'max_budget'
  | 'unknown';

/** Only a subscription sign-out is fixed by signing in, so only it suppresses the row for the card (ONL-2491). */
export function isSignInFixable(code: string | undefined): boolean {
  return code === 'unauthenticated';
}

/** The provider refused the credential itself: the row names that and offers no Retry, which would re-send into the same refusal (ONL-2491). */
export function isCredentialRejected(code: string | undefined): boolean {
  return code === 'credential_rejected';
}

/** The provider's service failed (5xx, or no status); the conversation itself is intact, so the turn can be continued (ONL-2973). */
export function isServiceFailure(code: string | undefined, status: number | undefined): boolean {
  return code === 'api_error' && (status === undefined || (status >= 500 && status <= 599));
}

/** The turn failed on the provider's service and nothing has started since (ONL-2973). */
export function failedOnService(state: Pick<SessionState, 'failedTurn' | 'items'>): boolean {
  if (state.failedTurn === undefined) return false;
  const last = state.items.filter((item) => item.kind === 'error').at(-1);
  return last?.kind === 'error' && isServiceFailure(last.code, last.apiErrorStatus);
}

export function isLimitShaped(code: string | undefined, status: number | undefined): boolean {
  return code === 'usage_limit_exceeded' || code === 'rate_limited' || (code === 'api_error' && status === 429);
}

/** A backend's error kind, where `isCredentialRejected` reads a settled failure's code (ONL-2491). */
export function isCredentialRefusalKind(
  kind: string | undefined,
  status: number | null | undefined,
): boolean {
  if (kind === 'cloud_credential_error') return true;
  return kind === 'authentication_failed' && (status === 401 || status === 403);
}

export type RateLimitStatus = 'allowed' | 'allowed_warning' | 'rejected';

/** Counts only, and every one optional: an absent figure is absent, never zero (ONL-2197). */
export interface RateLimitWindow {
  kind: RateLimitWindowKind;
  /** Provider-controlled and open; shape-checked before telemetry or a log line. */
  label?: string;
  usedPercent?: number;
  /** Unix epoch seconds. */
  resetsAt?: number;
  windowDurationMins?: number;
  status?: RateLimitStatus;
}

export const USAGE_LIMIT_WINDOWS = ['session', 'weekly', 'credits', 'unknown'] as const;
export type UsageLimitWindow = (typeof USAGE_LIMIT_WINDOWS)[number];

export interface UsageLimitHit {
  window: UsageLimitWindow;
  resetsAt?: number;
}

export function isBillingFailure(kind?: string, status?: number | null, message?: string): boolean {
  return kind === 'billing_error' || status === 402 ||
    /(?:API Error:|HTTP(?: status)?|status(?: code)?)\s*402\b|credit balance (?:is )?too low|exceeds your available credits|insufficient (?:credits|credit balance)|(?:run out of|out of) credits/i.test(message ?? '');
}

export function rateLimitHit(windows: readonly RateLimitWindow[], nowSeconds: number): UsageLimitHit {
  const exhausted = windows.filter((window) =>
    (window.status === 'rejected' || (window.usedPercent !== undefined && window.usedPercent >= 100)) &&
    (window.resetsAt === undefined || window.resetsAt > nowSeconds));
  const window = exhausted.sort((left, right) => (right.resetsAt ?? 0) - (left.resetsAt ?? 0))[0];
  if (!window) return { window: 'unknown' };
  const kind = window.kind === 'five_hour' || (window.windowDurationMins !== undefined && window.windowDurationMins <= 300)
    ? 'session'
    : window.kind.startsWith('seven_day') || (window.windowDurationMins !== undefined && window.windowDurationMins >= 10080)
      ? 'weekly' : 'unknown';
  return { window: kind, ...(window.resetsAt === undefined ? {} : { resetsAt: window.resetsAt }) };
}

export interface ModelChoice {
  value: string;
  resolvedModel?: string;
  displayName: string;
  description?: string;
  supportsEffort?: boolean;
  /** Absent means unknown, offer none: the SDK silently downgrades an unsupported effort. */
  supportedEffortLevels?: EffortLevel[];
}

/** Resolved by the app: which state is live needs a clock, which the chat package may not hold (ONL-2491). */
export interface ProviderNotice {
  state: 'retrying' | 'silent';
  text: string;
  /** How long the silent turn has heard nothing. */
  seconds?: number;
  /** A retry as one line: the provider's words, then what Onlook is doing, the rest on hover (ONL-2973). */
  line?: { words: string; doing: string; detail: string };
}

/** `error-line` continues a turn that failed on the provider's service, from the failure's own line (ONL-2973). */
export type ResumeMethod = 'play-button' | 'enter' | 'error-line';

/** The per-attempt error kinds a `ProviderRetry` may carry. */
export const RETRY_ERROR_KINDS = [
  'authentication_failed', 'oauth_org_not_allowed', 'account_on_hold',
  'verification_required', 'billing_error', 'rate_limit', 'overloaded',
  'invalid_request', 'model_not_found', 'server_error', 'unknown',
  'max_output_tokens', 'cloud_credential_error',
] as const;

/** No denominator: a no-response retry's cap is its own, not the session's budget (ONL-2491). */
export interface ProviderRetry {
  /** Absent from a backend that counts no attempts. */
  attempt?: number;
  /** `null` when the attempt got no HTTP response at all. */
  status: number | null;
  /** The backend's own closed enum, crossing as a string. */
  kind?: string;
}

/** Names only: `WorkspaceCreated`'s paths would sit in the replayable log. */
export interface WelcomeProject {
  sourceRepoName: string;
  workspaceName: string;
  branchName: string;
  baseBranch: string;
  copied?: true;
}

/** Consumers upsert by id: the SDK sends `update`/`end` for ids with no `start`, and `start` twice. */
export type StudioEvent =
  | (EventBase & {
      type: 'session.started';
      cwd: string;
      model?: string;
      /** Absent means Claude: the Agent SDK withholds `system:init` until the first prompt. */
      harnessId?: HarnessId;
      sdkSessionId?: string;
      tools?: string[];
      permissionMode?: PermissionMode;
    })
  /** Pushed by the host from the workspace registry; no SDK message produces it (ONL-1861). */
  | (EventBase & { type: 'session.welcome'; workspace: WelcomeProject })
  /** Fields are optional and the reducer merges; model and effort ride together because effort is downgraded per model. */
  | (EventBase & {
      type: 'session.settings';
      connectors?: import('./connectors.js').ConnectorInventory | null;
      skills?: import('./attachments.js').AgentSkill[];
      skillsUnavailable?: boolean;
      models?: ModelChoice[];
      model?: string;
      /** `null` clears the override; `undefined` leaves it unchanged. */
      effort?: EffortLevel | null;
      /** What the backend is enforcing now — not what a CLI reports it defaulted to (ONL-2190). */
      permissionMode?: PermissionMode;
      /** Decided in main, beside the backend that enforces them; empty means the control has nothing to offer. */
      permissionModes?: PermissionMode[];
    })
  | (EventBase & {
      type: 'session.ended';
      reason: 'completed' | 'error' | 'interrupted' | 'max_turns';
      durationMs?: number;
      costUsd?: number;
    })
  | (EventBase & {
      type: 'session.error';
      /** The provider's own prose, empty when it sent none; the reason a user reads is composed from `code` (ONL-2495). */
      message: string;
      code?: SessionErrorCode;
      detail?: string;
      /** The HTTP status the backend declared, absent where it declared none (ONL-2495). */
      apiErrorStatus?: number;
    })
  /** Where a conversation the agent can no longer continue ends; the rows above it stay, and nothing failed (ONL-2925). */
  | (EventBase & {
      type: 'session.boundary';
      message: string;
      /** The conversation that ended, so a replay marks it once and a later loss marks its own. */
      threadId: string;
    })
  /** Account-scoped: either provider can send it outside a turn, so it is not a `turn.*` shape (ONL-2197). */
  | (EventBase & { type: 'usage.limits'; windows: RateLimitWindow[] })
  /** One per failed attempt, and non-terminal: the turn is still live, so it is not a `session.error` (ONL-2491). */
  | (EventBase & { type: 'session.retrying' } & ProviderRetry)

  | (EventBase & { type: 'turn.started'; turnId: string })
  | (EventBase & {
      type: 'turn.ended';
      turnId: string;
      stopReason?: string;
      /** Cumulative for the session, not this turn. */
      totalCostUsd?: number;
      costDeltaUsd?: number;
      durationMs?: number;
      apiDurationMs?: number;
      numTurns?: number;
      tokens?: TurnTokens;
      /** A count, never paths: it feeds telemetry (ONL-2286). */
      filesChanged?: number;
      /** Of `durationMs`, the part spent holding a question for the designer (ONL-2295). */
      waitedMs?: number;
    })

  | (EventBase & {
      type: 'message.user';
      turnId: string;
      /** Survives a restore, unlike `eventId`; `message.delivery` joins on it. */
      messageId?: string;
      text: string;
      attachments?: PromptAttachment[];
      /** Machine framing the model saw; never rendered (ONL-2196). */
      context?: string;
      /** Absent means `user`. */
      origin?: PromptOrigin;
      /** Studio's own prompt that the chat draws nothing for. */
      hidden?: true;
      delivery?: MessageDelivery;
    })
  | (EventBase & { type: 'message.delivery'; messageId: string; outcome: DeliveryOutcome })

  | (EventBase & {
      type: 'text.start';
      blockId: string;
      parentToolUseId?: string;
    })
  | (EventBase & { type: 'text.delta'; blockId: string; delta: string })
  | (EventBase & { type: 'text.end'; blockId: string; text: string })

  | (EventBase & {
      type: 'thinking.start';
      blockId: string;
      parentToolUseId?: string;
    })
  | (EventBase & { type: 'thinking.delta'; blockId: string; delta: string })
  | (EventBase & { type: 'thinking.end'; blockId: string; text: string })

  | (EventBase & {
      type: 'tool.start';
      toolCallId: string;
      name: string;
      kind: ToolKind;
      title: string;
      target?: string;
      input?: unknown;
      parentToolUseId?: string;
      agentId?: string;
      fileChanges?: ToolFileChange[];
      status: ToolStatus;
      /** First announcer. On the SDK path `stream` is provisional and says nothing about hook coverage (ONL-2142). */
      source?: 'hook' | 'permission' | 'assistant' | 'stream';
    })
  | (EventBase & {
      type: 'tool.update';
      toolCallId: string;
      status?: ToolStatus;
      input?: unknown;
      title?: string;
      target?: string;
      fileChanges?: ToolFileChange[];
    })
  | (EventBase & {
      type: 'tool.end';
      toolCallId: string;
      status: Extract<
        ToolStatus,
        'completed' | 'failed' | 'denied' | 'canceled'
      >;
      result?: string;
      resultLanguage?: string;
      isError?: boolean;
      /** Announce to terminal, approval wait included; `ranMs` is the tool's own. */
      durationMs?: number;
      waitedMs?: number;
      ranMs?: number;
      additions?: number;
      deletions?: number;
      errorMessage?: string;
      images?: ImageRef[];
    })

  | (EventBase & {
      type: 'permission.requested';
      requestId: string;
      toolCallId: string;
      toolName: string;
      title?: string;
      displayName?: string;
      description?: string;
      decisionReason?: string;
      blockedPath?: string;
      input?: unknown;
      options: PermissionOption[];
      /** Present only for `AskUserQuestion`; the UI keys the picker on it. */
      questions?: Question[];
      /** The class the card names in plain words, so consent is not read off model-written text (ONL-2190). */
      destructiveClass?: DestructiveClass;
      parentToolUseId?: string;
    })
  | (EventBase & {
      type: 'permission.resolved';
      requestId: string;
      toolCallId: string;
      outcome: PermissionOutcome;
      optionId?: string;
      answers?: QuestionAnswers;
      /** The person dismissed the question; the turn was interrupted for it, so `outcome` is `canceled` (ONL-2901). */
      dismissed?: true;
    });

export interface PermissionOption {
  optionId: string;
  label: string;
  kind: 'allow_once' | 'allow_always' | 'reject_once';
}

/** The git actions the Claude backend's hook always asks about, whatever mode it runs in (ONL-2190). */
export type DestructiveClass = 'force_push' | 'branch_delete' | 'hard_reset';

/** Only modes a backend enforces, so the composer can offer what it shows (ONL-2190). */
export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'auto'
  | 'plan'
  | 'read-only'
  | 'workspace-write'
  | 'danger-full-access';

export interface QuestionOption {
  label: string;
  description: string;
  preview?: string;
}

export interface Question {
  /** Also the answer key; sent back verbatim. */
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

/** Keyed by `Question.question` verbatim; multi-select answers are comma-joined. */
export type QuestionAnswers = Record<string, string>;
export type QuestionAnswerInput = 'tap' | 'number-key' | 'typed';

/** A tool name is not the test: either backend can park a question with no answerable option (ONL-2295). */
export function asksQuestion(questions: readonly Question[] | undefined): boolean {
  return questions !== undefined && questions.length > 0;
}

export type StudioEventType = StudioEvent['type'];

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

export interface ImageRef {
  id: string;
  mediaType: ImageMediaType;
  /** The file's own name, so a sent message names the image its composer named (ONL-2549). */
  name?: string;
  width?: number;
  height?: number;
  originalSize?: number;
}

/** Display only; the model's framing rides the prompt's `context` (ONL-2045). */
export interface FrameAttachment {
  kind: 'frame';
  name: string;
  /** Absent for a frame; a canvas image rides as an `ImageRef` instead. */
  object?: 'text';
}

export interface ArtifactAttachment {
  kind: 'artifact';
  artifactId: string;
  title: string;
  pagePath?: string;
}

export type PromptAttachment = ImageRef | ElementEvidence | FrameAttachment | ArtifactAttachment | import('./attachments.js').FileRef | import('./attachments.js').SkillAttachment;

/** `suggestion` is a task the designer tapped on the agent's next-tasks card: theirs, but drawn as no bubble (ONL-2899). */
export type PromptOrigin = 'user' | 'studio' | 'suggestion';

/** Read by telemetry only; the transcript keeps just the origin (ONL-2959). */
export interface SuggestionSend {
  index: number;
  /** Taps on the card's tasks before this one went; the tap card's one tap counts (ONL-2977). */
  taps: number;
}

export type MessageDelivery = 'steering' | 'waiting';

export type DeliveryOutcome = 'delivered' | 'refused' | 'discarded';

export type UserMessageDelivery = MessageDelivery | Exclude<DeliveryOutcome, 'delivered'>;

/** A runtime fact from `agent:state`, not derived from the harness id. */
export type MidTurnPolicy = 'steer' | 'refuse';

/** The prompt waiting in main, as the chat reads it; host-owned, so it rides `agent:state` (ONL-2294). */
export interface PenView {
  /** Retired by every join; a `pen.take` or `pen.discard` quoting an older one is refused. */
  penId: number;
  text: string;
  attachments?: PromptAttachment[];
  /** A latched `hold` means the turn it was bound to ended without releasing it. */
  verdict?: PenVerdict;
}

/** What a `pen.take` lifted out; the composer rebuilds its own context from the selection (ONL-2294). */
export interface PenTake {
  text: string;
  attachments?: PromptAttachment[];
}

/** Which control ended the turn; only telemetry reads it (ONL-2583). */
export type InterruptCause = 'stop' | 'question.skip';

/** How an open question ended, as telemetry counts it (ONL-2583). */
export type QuestionEndOutcome = 'picked' | 'replied' | 'skipped' | 'stopped' | 'dismissed';

/** Where the user chose the other agent: the model menu, or the action on a failed turn's row (ONL-2612). */
export type AgentSwitchEntry = 'menu' | 'failure';

export type ClientCommand =
  | { type: 'turn.resume'; method: ResumeMethod }
  | { type: 'session.start'; cwd: string; model?: string }
  | { type: 'session.stop' }
  /** Archives the conversation and forgets the stored record, so the next session is fresh (ONL-2198). */
  | { type: 'session.newChat' }
  /** Moves only this Project to the other agent, through a new chat; the old one is archived (ONL-2903). */
  | { type: 'session.switchHarness'; harness: HarnessId; entry: AgentSwitchEntry }
  | { type: 'skills.refresh' }
  | { type: 'connectors.add'; provider: import('./connectors.js').FeaturedConnector }
  | { type: 'connectors.act'; id: string }
  | { type: 'connectors.open'; source: 'plug' | 'add-menu' | 'notice' }
  /** In place, not a restart; carries `ModelChoice.value`. */
  | { type: 'session.setModel'; model: string }
  /** `null` clears the override. */
  | { type: 'session.setEffort'; effort: EffortLevel | null }
  | { type: 'session.setPermissionMode'; mode: PermissionMode }
  | {
      type: 'prompt';
      text: string;
      attachments?: PromptAttachment[];
      context?: string;
      /** Set only by the Project Chat composer: an open question takes the message as its answer instead of holding it (ONL-2583). */
      answersQuestion?: boolean;
      /** A send from the next-tasks card; main stamps the row's origin, so the renderer never names one (ONL-2899). */
      suggestion?: SuggestionSend;
      /** A retry of a tapped task: main stamps it a suggestion, and counts no new tap (ONL-2901). */
      resends?: 'suggestion';
      /** @parked ONL-2960 Studio's own quote for an onboarding prompt; it places the quoted frame. */
      quote?: string;
    }
  /** The inspiration Frame has landed with its page loaded: Studio opens the agent's turn on it, drawing no message (ONL-2960). */
  | { type: 'inspiration.start'; frameId: string }
  | {
      type: 'permission.respond';
      requestId: string;
      optionId: string;
      answers?: QuestionAnswers;
      input?: QuestionAnswerInput;
      wentBack?: boolean;
      /** The project holding the request, so a view that owns no session can still answer (ONL-2190). */
      cwd?: string;
    }
  | { type: 'interrupt'; cause?: InterruptCause }
  /** Every open question closes unanswered and the turn ends; the next move is the person's (ONL-2901). */
  | { type: 'question.dismiss' }
  /** Answers on `AgentCommandAcceptance.taken`. */
  /** `auto` is the pen handing the prompt back rather than the designer pressing Edit; only telemetry reads it (ONL-2519). */
  | { type: 'pen.take'; penId: number; auto?: boolean }
  | { type: 'pen.discard'; penId: number };

export interface AgentSnapshot {
  sessionId?: string;
  cwd?: string;
  events: StudioEvent[];
  isStreaming: boolean;
  otherTabAgentBusy?: boolean;
  /** Absent reads as no attention: a renderer that missed the event catches up here (ONL-2455). */
  needsAttention?: boolean;
  /** A remount mid-pause catches up here, or it resumes a timer the agent is still waiting behind (ONL-2295). */
  questionParkedSince?: number;
  turnWaitedMs?: number;
  /** Absent reads as an empty pen: a view that mounted after the last streaming transition catches up here (ONL-2294). */
  pen?: PenView;
  /** The person has sent the chat a message of their own; Studio's prompts never count. */
  hasUserMessage?: boolean;
  midTurn: MidTurnPolicy;
  lastSeq: number;
  connection: AgentConnection;
}

export type AgentConnectionStatus =
  | 'unknown'
  | 'ok'
  | 'cli_missing'
  | 'unauthenticated'
  | 'error';

export interface AgentConnection {
  status: AgentConnectionStatus;
  detail?: string;
  /** Absent reads as Claude (ONL-2108). */
  harness?: HarnessId;
}

export interface AgentStateEvent {
  isStreaming: boolean;
  otherTabAgentBusy?: boolean;
  midTurn: MidTurnPolicy;
  cwd?: string;
  sessionId?: string;
  /** The session is holding a request for the user; absent from a backend that cannot count them (ONL-2455). */
  needsAttention?: boolean;
  /** When the agent began holding a question; absent means it is not waiting on an answer (ONL-2295). */
  questionParkedSince?: number;
  /** This turn's banked wait, so the resumed readout skips it. */
  turnWaitedMs?: number;
  /** Absent means nothing waits; the host re-emits this channel on every pen change (ONL-2294). */
  pen?: PenView;
  /** The person has sent the chat a message of their own; Studio's prompts never count (ONL-2960). */
  hasUserMessage?: boolean;
}

/** The agent's own words for one change to a frame, as it reported them (ONL-2973). */
export interface FrameEdit {
  kind?: 'edit';
  frameId: string;
  done: string;
  what: string;
}

/** The agent's verb for a frame it added this turn; the frame's name is the rest of its line. */
export interface FrameCreation {
  kind: 'created';
  frameId: string;
  done: string;
}

export type FrameChange = FrameEdit | FrameCreation;

/** Ids only; the renderer holds the names (ONL-2194). */
export interface AgentWorkingFramesEvent {
  cwd: string;
  frameIds: string[];
  /** This turn's changes in the order the agent reported them; a frame marked without words has none. */
  changes?: FrameChange[];
  /** What the agent said it waits on before its latest question this turn. */
  waitingOn?: string;
}

export interface ToolFileChange {
  path: string;
  operation: 'create' | 'edit' | 'delete';
  additions?: number;
  deletions?: number;
}

export interface TouchedFileView {
  path: string;
  status: 'editing' | 'edited' | 'created' | 'deleted' | 'stopped' | 'failed' | 'denied';
  hasSuccessfulChange?: boolean;
  additions?: number;
  deletions?: number;
}

export interface ToolCallView {
  answeredQuestions?: { questions: Question[]; answers: QuestionAnswers };
  dismissedQuestions?: Question[];
  toolCallId: string;
  name: string;
  kind: ToolKind;
  title: string;
  target?: string;
  status: ToolStatus;
  displayStatus: ToolDisplayStatus;
  input?: unknown;
  result?: string;
  resultLanguage?: string;
  errorMessage?: string;
  durationMs?: number;
  waitedMs?: number;
  ranMs?: number;
  additions?: number;
  deletions?: number;
  images?: ImageRef[];
  parentToolUseId?: string;
  startedAt: number;
  permission?: {
    requestId: string;
    title?: string;
    description?: string;
    decisionReason?: string;
    options: PermissionOption[];
    questions?: Question[];
    destructiveClass?: DestructiveClass;
    /** The tool ended first; not actionable. */
    stale?: boolean;
  };
}

export type TranscriptItem =
  /** An ordinary row; it is first because the host pushes it first. */
  | { kind: 'welcome'; id: string; workspace: WelcomeProject }
  | {
      kind: 'user';
      id: string;
      text: string;
      /** Absent means the user typed it; `studio` marks a prompt the app sent on their behalf. */
      origin?: PromptOrigin;
      hidden?: true;
      attachments?: PromptAttachment[];
      context?: string;
      delivery?: UserMessageDelivery;
      /** Sent into a turn already running, not the start of one (ONL-2961). */
      joinsTurn?: true;
    }
  | {
      kind: 'assistant-text';
      id: string;
      text: string;
      isStreaming: boolean;
      durationMs?: number;
      startedAt?: number;
      tokens?: TurnTokens;
    }
  | {
      kind: 'assistant-thinking';
      id: string;
      text: string;
      isStreaming: boolean;
    }
  | { kind: 'tools'; id: string; calls: ToolCallView[] }
  | { kind: 'boundary'; id: string; message: string }
  | {
      kind: 'error';
      id: string;
      message: string;
      code?: string;
      apiErrorStatus?: number;
      limit?: UsageLimitHit;
      retry?: RetryPrompt;
    };

export interface RetryPrompt {
  text: string;
  attachments?: PromptAttachment[];
  context?: string;
  origin?: PromptOrigin;
}

/** Above a cold first turn: CLI spawn plus the studio MCP server's tool registration plus time-to-first-token (ONL-2491). */
export const STALL_NOTICE_MS = 25_000;

/** No cumulative cost: a resumed session's `total_cost_usd` restarts. */
export interface SessionState {
  connectors?: import('./connectors.js').ConnectorInventory;
  interrupted?: boolean;
  sessionId?: string;
  unknownEventTypes?: string[];
  cwd?: string;
  harnessId?: HarnessId;
  model?: string;
  permissionMode?: PermissionMode;
  /** What the composer may offer; empty until a backend publishes its set (ONL-2190). */
  permissionModes: PermissionMode[];
  effort?: EffortLevel;
  models: ModelChoice[];
  skills?: import('./attachments.js').AgentSkill[];
  skillsUnavailable?: boolean;
  isStreaming: boolean;
  midTurn: MidTurnPolicy;
  /** From the state channel, never the fold: the pen lives in main and no event names it (ONL-2294). */
  pen?: PenView;
  /** Anchor for the whole-turn elapsed readout; per-block `startedAt` resets at every `text.start`. */
  turnStartedAt?: number;
  latestTurnId?: string;
  /** Host-owned, like `isStreaming`: when the agent began holding a question, and the wait banked so far (ONL-2295). */
  questionParkedSince?: number;
  turnWaitedMs?: number;
  items: TranscriptItem[];
  touchedFiles: TouchedFileView[];
  awaitingApproval: ToolCallView[];
  error?: { message: string; code?: string };
  failedTurn?: { turnId: string; code?: string };
  /** The provider is failing and the backend is retrying; the latest attempt only. */
  retrying?: ProviderRetry;
  retryingSince?: number;
  limits?: RateLimitWindow[];
  /** When the live turn last heard anything, for a reader with a clock to compare against `STALL_NOTICE_MS`. */
  silentSince?: number;
  lastSeq: number;
}
