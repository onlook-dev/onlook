import { randomUUID } from 'node:crypto';
import { AppServerTurnLifecycle } from './turn-lifecycle.js';
import { codexConnectors, codexInternalServer, ConnectorMonitor, type CodexServer } from '../connectors.js';
import { ConnectorSignIn } from '../connector-sign-in.js';
import { recordConnectorActivity } from '../connector-telemetry.js';
import { CodexConnectorSignIn } from './connector-sign-in.js';
import { flagOn } from '../../flags/index.js';

import type {
  AgentConnection,
  EffortLevel,
  ElementEvidence,
  MidTurnPolicy,
  ModelChoice,
  PromptAttachment,
  PromptOrigin,
  QuestionAnswers,
  StudioEvent,
  PermissionMode,
  ToolStatus,
  WelcomeProject,
} from '@studio/events';
import { asksQuestion } from '@studio/events';
import { QUESTION_TOOL } from '../reduce.js';
import { classifyDestructiveGit } from '../destructive-git.js';
import { recordPermissionDecided, recordSetupApprovalWithheld } from '../session-telemetry.js';
import { withheldSetupTool } from '../../project-setup/approval.js';

import { briefing, type StarterBriefing } from '../../../instructions/context.js';
import { sessionBriefingContext } from '../briefing-context.js';
import { t } from '@studio/i18n';
import { userEnv } from '../../env/shell-env.js';
import { wslProject } from '../../env/wsl.js';
import { checkWslTools } from '../../env/wsl-tools.js';
import { log } from '../../log/index.js';
import type { AgentBackend, BackendState, ModelPick } from '../backend.js';
import type { StudioToolSinks } from '../studio-tools.js';
import type { AgentSkill, SkillAttachment } from '@studio/events';
import { selectedSkillsAvailable } from '../skills.js';
import { readProjectAttachment, canSendAttachedFiles } from '../../images/store.js';
import {
  APPSERVER_APPROVAL_TOOLS,
  appServerToolRunner,
  appServerToolSpecs,
  appServerToolTitles,
  type DynamicToolResult,
} from './tools.js';
import { EventLog, SESSION_CLOSED, settleUndelivered } from '../event-log.js';
import { publishChangedSkills, recordQuestionReply, settleQuestionPark, type PublishedSkills } from '../session-core.js';
import type { SessionEndSummary, TurnSummary } from '../event-log.js';
import type { SessionErrorCode } from '@studio/events';
import {
  buildAppServerInput,
  formatArtifactAttachments,
  resolveAttachments,
  splitAttachments,
  type ResolvedAttachment,
} from '../prompt-content.js';
import {
  ChangeRegistry,
  decisionResult,
  dispatchServerRequest,
  questionResult,
  toStudioQuestions,
} from './approvals.js';
import type { FileChangeDecision, HostToolCall, PendingApproval, PendingQuestion } from './approvals.js';
import { NO_CAPTURE, openCapture } from './capture.js';
import { HARNESSES } from '../harness.js';
import { retryTelemetry } from '../../telemetry/retries.js';
import { APPSERVER_PRESENTATION } from './presentation.js';
import type { FrameCapture } from './capture.js';
import { checkHealth, resolveCodex } from './resolve.js';
import { createAppServerTurnState, handleAppServerFrame, mergeRateLimits, type AppServerAccountState } from './translate.js';
import { obj } from '../coerce.js';
import type { AppServerTurnState } from './translate.js';
import { rememberAppServerThread, storedAppServerThread } from '../sessions.js';
import { clearTranscript } from '../transcript.js';
import { scheduleGc } from '../../images/store.js';
import { AppServerTransport } from './transport.js';
import type { SpawnOptions, TransportHandlers } from './transport.js';

const logger = log('agent-host');

/** How long a steer waits for `turn/start` to name the turn before it gives up and refuses (ONL-2383). */
const STEER_ADDRESSABLE_MS = 15_000;

export type SessionTransport = Pick<
  AppServerTransport,
  'request' | 'notify' | 'respond' | 'respondError' | 'close'
>;

export interface AppServerSessionOptions {
  readonly cwd: string;
  readonly codexRoot: string;
  readonly captureRoot: string;
  readonly onEvent: (event: StudioEvent) => void;
  readonly onState: (state: BackendState) => void;
  readonly onConnection: (state: AgentConnection) => void;
  readonly onTurnEnded?: (summary: TurnSummary) => void;
  readonly onTurnStarted?: (turnId: string, origin: PromptOrigin) => void;
  readonly onTurnStalled?: (turnId: string, silentMs: number) => void;
  readonly onEnded?: (end: SessionEndSummary) => void;
  readonly onError?: (code: SessionErrorCode, apiErrorStatus: number | null) => void;
  /** The child died under a live session; the host restarts it on the next prompt (ONL-2903). */
  readonly onExited?: () => void;
  readonly model?: string;
  readonly effort?: EffortLevel;
  readonly restoredEvents?: readonly StudioEvent[];
  readonly workspace?: WelcomeProject;
  readonly starter?: StarterBriefing;
  readonly tools?: StudioToolSinks;
  readonly reasoningSummary?: string;
  readonly setupProblem?: string;
  readonly prepare?: () => Promise<void>;
  readonly connect?: (
    handlers: TransportHandlers,
    spawn: () => Promise<SpawnOptions>,
  ) => SessionTransport | Promise<SessionTransport>;
}

/** The resolved model and effort ride the `thread/start` response, not the `thread/started` notification. */
interface ThreadResponse {
  /** `path` is `[UNSTABLE]` and nullable in the protocol. */
  thread?: { id?: string; path?: string | null };
  model?: string;
  reasoningEffort?: string;
}

const APPSERVER_SANDBOX: PermissionMode = 'danger-full-access';

/**
 * One entry, so the composer's control renders disabled rather than offering a choice codex
 * cannot keep. Widening this waits on a sandbox that escalates to an approval instead of
 * failing the command outright, which `workspace-write` does not do at 0.156.1 (ONL-2190).
 */
const APPSERVER_PERMISSION_MODES: readonly PermissionMode[] = [APPSERVER_SANDBOX];

interface WireModel {
  id?: string;
  model?: string;
  displayName?: string;
  description?: string;
  hidden?: boolean;
  isDefault?: boolean;
  supportedReasoningEfforts?: { reasoningEffort?: string }[];
}

const DECISIONS: Record<string, FileChangeDecision> = {
  allow_once: 'accept',
  allow_always: 'acceptForSession',
  reject_once: 'decline',
};

function prepareTurnInput(
  text: string,
  attachments: readonly ResolvedAttachment[],
  elements: readonly ElementEvidence[],
  context: string | undefined,
  skills: readonly SkillAttachment[] = [],
): { modelText: string; input: ReturnType<typeof buildAppServerInput> } {
  const modelText = [text, context ?? ''].filter((part) => part !== '').join('\n\n');
  return { modelText, input: buildAppServerInput(modelText, attachments, elements, skills) };
}

export class AppServerSession implements AgentBackend {
  readonly id = `a${Date.now().toString(36)}`;
  readonly harness = 'appserver' as const;
  readonly cwd: string;

  private readonly log: EventLog;
  private readonly opts: AppServerSessionOptions;
  private readonly registry = new ChangeRegistry();
  private readonly pendingApprovals = new Map<string, PendingApproval>();
  private readonly pendingToolCalls = new Map<string, HostToolCall>();
  private readonly pendingQuestions = new Map<
    string,
    { wireRequestId: string | number; itemId: string; idByText: Map<string, string> }
  >();
  private readonly dismissing = new Set<string>();
  private readonly runTool?: (tool: string, args: unknown) => Promise<DynamicToolResult>;
  private readonly toolTitles: Record<string, string>;
  private transport?: SessionTransport;
  private skills: AgentSkill[] = [];
  private skillsRevision = 0;
  private readonly publishedSkills: PublishedSkills = { fingerprint: undefined };
  private capture: FrameCapture = NO_CAPTURE;
  private turn: AppServerTurnState = createAppServerTurnState();
  /** Survives `run()`'s turn reset: the rate-limit snapshot is account-scoped (ONL-2197). */
  private readonly account: AppServerAccountState = {};
  private threadId?: string;
  private turnId?: string;
  private turnOrigin: PromptOrigin = 'user';
  private readonly createdAt = Date.now();
  private failed = false;
  private readonly lifecycle = new AppServerTurnLifecycle();
  private get closed(): boolean { return this.lifecycle.closed; }
  private get streaming(): boolean { return this.lifecycle.streaming; }
  private get outstanding(): number { return this.lifecycle.outstanding; }
  private get threadActive(): boolean { return this.lifecycle.threadActive; }
  private get interruptPending(): boolean { return this.lifecycle.interruptPending; }
  private prepared = false;
  private pendingPromptId?: string;
  private runSeq = 0;
  /** Each `run()` holds one unit of `outstanding` under the epoch it entered on; `stopStreaming()` moves it on (ONL-2925). */
  private get settleEpoch(): number { return this.lifecycle.settleEpoch; }
  /** The thread the restored rows belong to, read once: the store can be cleared while startup runs (ONL-2925). */
  private restored?: string;
  /** A prompt reached the log before the thread was settled, so a boundary would land under it (ONL-2925). */
  private promptedBeforeThread = false;
  /** Awaited by a steer that beat the turn id onto the wire (ONL-2383). */
  private starting?: Promise<void>;
  private connectors?: ConnectorMonitor;
  private connectorSignIn?: ConnectorSignIn;
  private connectorAdapter?: CodexConnectorSignIn;
  private readonly internalMcpServers = new Set<string>();
  private savedAt: string | undefined;
  /** Scoped to the turn that refused: only a Studio-origin prompt meets it, since the pen holds a typed one above this seam (ONL-2519). */
  private midTurnPolicy: MidTurnPolicy = 'steer';
  private lastState?: {
    isStreaming: boolean;
    midTurn: MidTurnPolicy;
    needsAttention: boolean;
    questionParkedSince?: number;
    turnWaitedMs: number;
    isTurnLive: boolean;
  };
  private readonly undelivered = new Set<string>();
  private readonly steersInFlight = new Set<string>();
  private readonly steersAwaitingTurn = new Set<string>();
  private readonly addressableWaiters = new Set<() => void>();
  private model?: string;
  private effort?: EffortLevel;
  /** `open()` is not awaited by the host; `run()` awaits this or a prompt is silently dropped. */
  private ready?: Promise<void>;

  constructor(options: AppServerSessionOptions) {
    this.opts = options;
    this.cwd = options.cwd;
    this.model = options.model;
    this.runTool = options.tools ? appServerToolRunner(options.tools) : undefined;
    this.toolTitles = options.tools ? appServerToolTitles(options.tools) : {};
    this.log = new EventLog({
      sessionId: this.id,
      cwd: options.cwd,
      emit: options.onEvent,
      onTurnStarted: options.onTurnStarted,
      onTurnStalled: options.onTurnStalled,
      presentation: APPSERVER_PRESENTATION,
      connectorToolNames: () => flagOn('connectors'),
      onToolFailed: (name, result) => {
        if (!flagOn('connectors')) return undefined;
        const connector = this.connectorSignIn?.toolFailed(name, result);
        return connector === undefined ? undefined : t('chat.connectors.tool.signInRequired', { connector });
      },
    });
  }

  /** Every failure reports once; `fatal` is what lets the end reason say `error` rather than `completed` (ONL-2463). */
  private reportError(message: string, code: SessionErrorCode, fatal = true): void {
    if (fatal) this.failed = true;
    if (code === 'cli_missing') this.opts.onConnection({ status: 'cli_missing', harness: 'codex' });
    this.log.push({ type: 'session.error', message, code });
    this.opts.onError?.(code, null);
  }

  get events(): readonly StudioEvent[] {
    return this.log.since();
  }

  get isRestoringTranscript(): boolean { return this.log.isRestoringTranscript; }
  get isStreaming(): boolean {
    return this.streaming;
  }
  get midTurn(): MidTurnPolicy {
    return this.midTurnPolicy;
  }
  get needsAttention(): boolean {
    return (
      this.pendingApprovals.size + this.pendingToolCalls.size + this.pendingQuestions.size > 0
    );
  }
  get questionParkedSince(): number | undefined {
    return this.log.questionParkedSince;
  }
  get turnWaitedMs(): number {
    return this.log.turnWaitedMs;
  }

  /** The asked-for count, not `turnId`: codex raises a turn before `turn/started` names one (ONL-2383). */
  get isTurnLive(): boolean {
    return this.outstanding > 0 || this.threadActive;
  }
  get lastSeq(): number {
    return this.log.lastSeq;
  }
  get transcriptPath(): string | undefined {
    return this.savedAt;
  }
  eventsSince(sinceSeq?: number): StudioEvent[] {
    return this.log.since(sinceSeq);
  }

  welcome(workspace: WelcomeProject): void {
    this.log.push({ type: 'session.welcome', workspace });
  }

  open(): void {
    this.log.push({
      type: 'session.started',
      cwd: this.cwd,
      model: this.opts.model,
      harnessId: 'codex',
      permissionMode: APPSERVER_SANDBOX,
    });
    // The renderer refuses to send until a connection is reported.
    this.opts.onConnection({ status: 'ok', harness: 'codex' });

    // Above the refusal below, so a missing install and a broken one show the same screen (ONL-2925).
    this.restoreTranscript();
    this.log.push({ type: 'session.settings', connectors: null });
    if (this.opts.setupProblem !== undefined) {
      if (this.restored === undefined && this.opts.workspace) this.welcome(this.opts.workspace);
      this.reportError(this.opts.setupProblem, 'cli_missing');
      // The transcript is not cleared: nothing has asked codex whether the thread still resumes (ONL-2124).
      return;
    }
    this.ready = this.start().catch((error: Error) => {
      // `close()` fails every pending request; a teardown is not a startup failure. An exit is:
      // the transport rejects before `onExit` lands, so reading the phase here loses the row (ONL-3104).
      if (this.closed) return;
      logger.warn('app-server failed to start', { error });
      this.reportError(t('chat.codex.failedToStart'), 'spawn_failed');
      this.stopStreaming();
    }).finally(() => {
      this.prepared = true;
    });
  }

  /** Before the first live push: the renderer appends in arrival order, so a prompt typed during the
   * install would otherwise sit above the conversation it continues (ONL-2925). */
  private restoreTranscript(): void {
    const rows = this.opts.restoredEvents;
    if (rows === undefined || rows.length === 0) return;
    const thread = storedAppServerThread(this.cwd);
    if (thread === undefined) return;
    this.restored = thread;
    this.log.restore(rows);
    // Re-announced: the restored stream carries its own stale `session.started`.
    this.log.push({
      type: 'session.started',
      cwd: this.cwd,
      model: this.opts.model,
      harnessId: 'codex',
      permissionMode: APPSERVER_SANDBOX,
    });
  }

  async unsubscribeThread(timeoutMs = 10_000): Promise<unknown> {
    if (this.transport === undefined || this.threadId === undefined) return undefined;
    return this.transport.request('thread/unsubscribe', { threadId: this.threadId }, timeoutMs);
  }

  prompt(
    text: string,
    attachments: PromptAttachment[] = [],
    context?: string,
    origin: PromptOrigin = 'user',
    display?: { origin: PromptOrigin; hidden?: true },
  ): boolean {
    if (this.closed || this.opts.setupProblem !== undefined) return false;
    const steering = this.streaming;
    if (steering && this.midTurnPolicy === 'refuse') return false;
    // The turn's origin is the origin of the prompt that opens it; a steer joins the open turn (ONL-2463).
    if (!steering) this.turnOrigin = origin;
    const trimmed = text.trim();
    const { images, files, skills, elements } = splitAttachments(attachments);
    if (!canSendAttachedFiles(this.cwd, files, 'codex') || !selectedSkillsAvailable(attachments, this.skills)) return false;
    if (!trimmed && images.length === 0 && files.length === 0 && skills.length === 0 && elements.length === 0 && splitAttachments(attachments).artifacts.length === 0) return false;

    // Bytes are read before this returns: the composer releases its hold on `true`.
    const resolved = resolveAttachments([...images, ...files], (id) => readProjectAttachment(this.cwd, id));

    const messageId = randomUUID();
    const claimed = steering && origin !== 'studio';
    if (this.threadId === undefined) this.promptedBeforeThread = true;
    if (!steering) {
      this.log.beginTurn(origin);
    }
    this.log.push({
      type: 'message.user',
      turnId: this.log.turnId,
      messageId,
      text: trimmed,
      origin: display?.origin ?? origin,
      ...(display?.hidden === true ? { hidden: true as const } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(context === undefined || context === '' ? {} : { context }),
      ...(claimed ? { delivery: 'steering' as const } : {}),
    });
    if (claimed) this.undelivered.add(messageId);
    if (resolved.length < images.length) {
      const lost = images.length - resolved.length;
      this.log.push({
        type: 'session.error',
        message:
          lost === 1
            ? t('chat.codex.imageUnreadable')
            : t('chat.codex.imagesUnreadable', { lost, total: images.length }),
        code: 'unknown',
      });
    }
    const modelText = [trimmed, formatArtifactAttachments(attachments)].filter(Boolean).join('\n\n');
    if (steering) void this.steer(messageId, modelText, resolved, elements, context, skills, origin);
    else {
      this.pendingPromptId = messageId;
      this.starting = this.run(modelText, resolved, elements, context, skills, messageId);
    }
    return true;
  }

  private async steer(
    messageId: string,
    text: string,
    attachments: readonly ResolvedAttachment[],
    elements: readonly ElementEvidence[],
    context?: string,
    skills: readonly SkillAttachment[] = [],
    origin: PromptOrigin = 'user',
  ): Promise<void> {
    // Waiting beats refusing a turn that is about to exist (ONL-2383).
    this.steersInFlight.add(messageId);
    // Registered before the wait below: a frame arriving first would otherwise call this steer delivered (ONL-2596).
    if (this.turnId === undefined) this.steersAwaitingTurn.add(messageId);
    // `STEER_ADDRESSABLE_MS` is sized for a `turn/start` round trip, and a runtime still installing outlasts it (ONL-2925).
    if (!this.prepared) await this.ready;
    const addressableUntil = Date.now() + STEER_ADDRESSABLE_MS;
    while (this.turnId === undefined) {
      const ready = await this.addressable(Math.max(0, addressableUntil - Date.now()));
      if (!ready || this.closed || this.interruptPending || (!this.threadActive && this.outstanding === 0)) break;
    }
    this.steersAwaitingTurn.delete(messageId);
    if (this.closed || this.interruptPending || !this.steersInFlight.has(messageId)) {
      this.steersInFlight.delete(messageId);
      if (!this.threadActive && this.outstanding === 0 && this.undelivered.size === 0) this.setStreaming(false);
      return;
    }
    const { transport, threadId, turnId } = this;
    if (turnId === undefined && !this.threadActive && this.outstanding === 0) {
      this.steersInFlight.delete(messageId);
      if (this.undelivered.delete(messageId)) this.log.push({ type: 'message.delivery', messageId, outcome: 'delivered' });
      this.turnOrigin = origin;
      this.starting = this.run(text, attachments, elements, context, skills);
      return;
    }
    if (transport === undefined || threadId === undefined || turnId === undefined) {
      this.steersInFlight.delete(messageId);
      logger.warn('the codex turn never became addressable, so the steer was refused');
      this.refuseSteer(messageId);
      if (!this.threadActive && this.outstanding === 0 && this.undelivered.size === 0) this.setStreaming(false);
      return;
    }
    const connectorContext = flagOn('connectors') ? this.connectorSignIn?.promptContext(text) : undefined;
    const { modelText, input } = prepareTurnInput(text, attachments, elements, [context, connectorContext].filter(Boolean).join('\n\n') || undefined, skills);
    this.capture.write('out', {
      method: 'turn/steer',
      params: { promptChars: modelText.length, imageCount: attachments.length },
    });
    try {
      await transport.request('turn/steer', { threadId, expectedTurnId: turnId, input });
      if (!this.steersInFlight.delete(messageId)) return;
      if (!this.streaming && this.undelivered.delete(messageId)) {
        this.log.push({ type: 'message.delivery', messageId, outcome: 'delivered' });
      }
    } catch (error) {
      if (!this.steersInFlight.delete(messageId)) return;
      logger.warn('turn/steer refused', { error });
      if (this.streaming && this.turnId === turnId) {
        this.refuseSteer(messageId);
        return;
      }
      if (this.closed || this.interruptPending || (origin !== 'studio' && !this.undelivered.has(messageId))) return;
      if (this.streaming) {
        await this.steer(messageId, text, attachments, elements, context, skills, origin);
        return;
      }
      if (this.undelivered.delete(messageId)) this.log.push({ type: 'message.delivery', messageId, outcome: 'delivered' });
      this.turnOrigin = origin;
      this.starting = this.run(text, attachments, elements, context, skills);
    }
  }

  private settleAcceptedSteers(): void {
    for (const messageId of this.undelivered) {
      if (this.steersInFlight.has(messageId)) continue;
      this.undelivered.delete(messageId);
      this.log.push({ type: 'message.delivery', messageId, outcome: 'delivered' });
    }
  }

  private refuseSteer(messageId: string): void {
    if (this.undelivered.delete(messageId)) {
      this.log.push({ type: 'message.delivery', messageId, outcome: 'refused' });
    }
    this.log.push({ type: 'session.error', message: t('chat.codex.midTurnRefused'), code: 'unknown' });
    this.setMidTurn('refuse');
  }

  private setMidTurn(policy: MidTurnPolicy): void {
    if (this.midTurnPolicy === policy) return;
    this.midTurnPolicy = policy;
    this.emitState();
  }

  respond(requestId: string, optionId: string, answers?: QuestionAnswers): boolean {
    const parkedQuestion = this.pendingQuestions.get(requestId);
    if (parkedQuestion !== undefined && this.transport !== undefined) {
      this.answerParked(requestId, optionId, answers ?? {});
      return true;
    }
    const parkedTool = this.pendingToolCalls.get(requestId);
    if (parkedTool !== undefined) {
      this.pendingToolCalls.delete(requestId);
      this.emitState();
      const allowed = optionId === 'allow_once' || optionId === 'allow_always';
      this.log.push({
        type: 'permission.resolved',
        requestId,
        toolCallId: parkedTool.callId,
        outcome: allowed ? 'allow_once' : 'deny',
        optionId,
      });
      if (allowed) void this.executeTool(parkedTool);
      // Ends `denied` before answering: the `item/completed` that follows would end it `failed` first (ONL-2304).
      else {
        this.turn.openToolCalls.delete(parkedTool.callId);
        this.log.endTool(parkedTool.callId, 'denied', { errorMessage: 'The user declined this action.' });
        this.transport?.respond(parkedTool.requestId, {
          success: false,
          contentItems: [{ type: 'inputText', text: 'The user declined this action.' }],
        });
      }
      return true;
    }
    const pending = this.pendingApprovals.get(requestId);
    if (pending === undefined || this.transport === undefined) return false;
    if (pending.mcp !== undefined && optionId !== 'allow_once' && optionId !== 'reject_once') return false;
    this.pendingApprovals.delete(requestId);
    this.emitState();
    const decision = DECISIONS[optionId] ?? 'decline';
    this.transport.respond(pending.requestId, decisionResult(decision, pending.method));
    const outcome =
      decision === 'decline' ? 'deny' : optionId === 'allow_always' ? 'allow_always' : 'allow_once';
    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: pending.itemId,
      outcome,
      optionId,
    });
    if (pending.mcp !== undefined) {
      this.log.endTool(pending.itemId, decision === 'accept' ? 'completed' : 'denied');
    }
    const decided =
      pending.command === undefined ? undefined : classifyDestructiveGit(pending.command);
    if (decided !== undefined) {
      recordPermissionDecided({ outcome, harness: 'appserver', destructiveClass: decided });
    }
    return true;
  }

  /**
   * Codex enforces one posture today, so anything else is refused rather than shown as applied.
   * Widening waits on a sandbox that escalates instead of failing the command (ONL-2190).
   */
  async setPermissionMode(mode: PermissionMode): Promise<boolean> {
    return APPSERVER_PERMISSION_MODES.includes(mode);
  }

  async setModel(model: string): Promise<ModelPick> {
    this.model = model;
    this.log.push({ type: 'session.settings', model });
    return Promise.resolve({ accepted: true });
  }

  async setEffort(effort: EffortLevel | null): Promise<void> {
    this.effort = effort ?? undefined;
    this.log.push({ type: 'session.settings', effort });
    return Promise.resolve();
  }

  async interrupt(): Promise<void> {
    this.lifecycle.dispatch({ type: 'interrupt' });
    this.steersInFlight.clear();
    this.setMidTurn('refuse');
    this.settleParked();
    settleUndelivered(this.log, this.undelivered, 'discarded');
    this.wakeAddressable();
    if (this.transport === undefined || this.threadId === undefined) {
      // Nothing reached codex, so Stop ends the turn here; deferring to the queued run would hold the row for the whole runtime download (ONL-2925).
      this.discardPrompt(this.pendingPromptId);
      // The turn opened with the prompt, and `stopStreaming()` below takes the books from the run
      // that would have closed it, so it is closed here or it stays live under the next one (ONL-2863).
      const stopped = this.log.turnTally();
      if (stopped !== undefined) {
        this.log.push({ type: 'turn.ended', turnId: stopped.turnId, stopReason: 'interrupted', isError: false, filesChanged: stopped.filesChanged });
        this.opts.onTurnEnded?.({ ...stopped, origin: this.turnOrigin, stopReason: 'interrupted' });
      }
      this.stopStreaming();
      return;
    }
    if (this.turnId === undefined) return;
    // Both ids: with only `threadId` the interrupt is rejected and the turn runs on.
    await this.transport.request('turn/interrupt', {
      threadId: this.threadId,
      turnId: this.turnId,
    }).catch(() => {});
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.lifecycle.dispatch({ type: 'close' });
    this.connectors?.close();
    this.connectorSignIn?.close();
    this.steersInFlight.clear();
    this.wakeAddressable();
    const wasStreaming = this.streaming;
    this.settleParked();
    settleUndelivered(this.log, this.undelivered, 'discarded');
    // The turn this close killed, before the teardown await, on the same grounds the
    // session end is: `turnTally()` reports once, so a completed turn adds nothing (ONL-2463).
    const killed = this.log.turnTally();
    if (killed !== undefined) {
      const retries = retryTelemetry(this.log.events, HARNESSES.codex.countsRetryAttempts);
      this.opts.onTurnEnded?.({ ...killed, stopReason: SESSION_CLOSED, origin: this.turnOrigin,
        retryAttempts: retries.retry_attempts, retryObservedCount: retries.retry_observed_count,
        retryLastStatus: retries.retry_last_status,
      });
    }
    // Before the awaited teardown: quit gives up on the dispose cap, and this event was lost that way once (ONL-2254).
    this.opts.onEnded?.({
      // codex has no max-turns stop, so these three are the reachable reasons.
      reason: this.failed ? 'error' : wasStreaming ? 'interrupted' : 'completed',
      durationMs: Date.now() - this.createdAt,
      turnCount: this.log.turnCount,
    });
    await this.transport?.close();
    this.stopStreaming();
  }

  private setStreaming(value: boolean): void {
    if (this.streaming === value) return;
    this.lifecycle.dispatch({ type: 'stream', value });
    this.wakeAddressable();
    this.emitState();
  }

  answerQuestion(text: string, attachments: PromptAttachment[] = [], context?: string): boolean {
    if (this.closed || this.transport === undefined || this.pendingQuestions.size === 0) return false;
    const { images, files, skills, elements } = splitAttachments(attachments);
    if (!canSendAttachedFiles(this.cwd, files, 'codex') || !selectedSkillsAvailable(attachments, this.skills)) return false;
    const { messageId, reply, carriesMore } = recordQuestionReply(this.log, text, attachments, context, { images, files, skills, elements });
    for (const [requestId, parked] of [...this.pendingQuestions]) {
      const answers = Object.fromEntries([...parked.idByText.keys()].map((question) => [question, reply]));
      this.answerParked(requestId, 'reply', answers);
    }
    // A question's answer carries text only, so pictures and picked elements follow as a steer.
    if (carriesMore) {
      this.undelivered.add(messageId);
      void this.steer(messageId, skills.length > 0 ? text : '', resolveAttachments([...images, ...files], (id) => readProjectAttachment(this.cwd, id)), elements, skills.length > 0 ? context : undefined, skills);
    }
    return true;
  }

  async dismissQuestion(): Promise<boolean> {
    if (this.closed || this.transport === undefined || this.pendingQuestions.size === 0) return false;
    for (const requestId of this.pendingQuestions.keys()) this.dismissing.add(requestId);
    await this.interrupt();
    return true;
  }

  private answerParked(requestId: string, optionId: string, answers: QuestionAnswers): void {
    const parked = this.pendingQuestions.get(requestId);
    if (parked === undefined || this.transport === undefined) return;
    this.pendingQuestions.delete(requestId);
    this.syncQuestionPark();
    this.emitState();
    this.turn.openToolCalls.delete(parked.itemId);
    this.transport.respond(parked.wireRequestId, questionResult(parked.idByText, answers));
    this.log.endTool(parked.itemId, 'completed', { result: [...new Set(Object.values(answers))].join(', ') });
    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: parked.itemId,
      outcome: 'allow_once',
      optionId,
      answers,
    });
  }

  /**
   * Writes each parked row terminal. `close()` and `interrupt()` have no turn boundary to do it
   * for them, and a fold with no `permission.resolved` leaves a card nothing can answer (ONL-2190).
   */
  private settleParked(): void {
    for (const [requestId, pending] of this.pendingApprovals) {
      this.retire(requestId, pending.itemId);
    }
    for (const [requestId, call] of this.pendingToolCalls) {
      this.retire(requestId, call.callId);
    }
    for (const [requestId, ask] of this.pendingQuestions) {
      this.retire(requestId, ask.itemId);
    }
    this.pendingApprovals.clear();
    this.pendingToolCalls.clear();
    this.pendingQuestions.clear();
    this.syncQuestionPark();
    // Every caller is a teardown: the turn is finishing, so a cleared question must not read as work resuming (ONL-2295).
    this.emitState(true, false);
  }

  private syncQuestionPark(): void {
    settleQuestionPark(this.log, this.pendingQuestions.size > 0);
  }

  private retire(requestId: string, itemId: string): void {
    const dismissed = this.dismissing.delete(requestId);
    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: itemId,
      outcome: 'canceled',
      ...(dismissed ? { dismissed: true as const } : {}),
    });
    this.log.endTool(itemId, 'canceled', { errorMessage: 'Canceled' });
    this.turn.openToolCalls.delete(itemId);
  }

  /** Its own emit: a request parking mid-turn moves nothing about streaming, and `setStreaming` would swallow it (ONL-2455). */
  private emitState(turnEnding = false, force = turnEnding): void {
    const needsAttention = this.needsAttention;
    const questionParkedSince = this.questionParkedSince;
    const turnWaitedMs = this.turnWaitedMs;
    if (
      !force &&
      this.lastState?.isStreaming === this.streaming &&
      this.lastState.midTurn === this.midTurnPolicy &&
      this.lastState.needsAttention === needsAttention &&
      this.lastState.questionParkedSince === questionParkedSince &&
      this.lastState.turnWaitedMs === turnWaitedMs &&
      this.lastState.isTurnLive === this.isTurnLive
    ) {
      return;
    }
    this.lastState = {
      isStreaming: this.streaming,
      midTurn: this.midTurnPolicy,
      needsAttention,
      questionParkedSince,
      turnWaitedMs,
      isTurnLive: this.isTurnLive,
    };
    this.opts.onState({ ...this.lastState, ...(turnEnding ? { turnEnding: true } : {}) });
  }

  /** Its row stays in the transcript, so a prompt that never reached codex reads as sent without this (ONL-2925). */
  private discardPrompt(messageId: string | undefined): void {
    if (messageId === undefined || this.pendingPromptId !== messageId) return;
    this.log.push({ type: 'message.delivery', messageId, outcome: 'discarded' });
    this.pendingPromptId = undefined;
  }

  /** One turn is done with; another asked for since keeps the row up (ONL-2383). */
  private settleTurn(): void {
    this.lifecycle.dispatch({ type: 'settled' });
    if (this.outstanding === 0 && !this.threadActive) this.setStreaming(false);
    // Its own emit: the count can fall with streaming already down, and the host
    // releases a held prompt on that falling edge (ONL-2294).
    this.emitState();
  }

  /** A dead or closed codex owes no turns, whatever was counted. */
  private stopStreaming(): void {
    this.lifecycle.dispatch({ type: 'stop' });
    this.wakeAddressable();
    this.emitState(true);
  }

  /** Bounded: `turn/start` carries no timeout, and a wedged one must refuse the steer loudly rather than swallow it (ONL-2383). */
  private async addressable(timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const finish = (ready: boolean) => {
        clearTimeout(timer);
        this.addressableWaiters.delete(check);
        resolve(ready);
      };
      const check = () => {
        if (this.turnId !== undefined || this.closed || this.interruptPending || !this.streaming ||
          (!this.threadActive && this.outstanding === 0)) finish(true);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      this.addressableWaiters.add(check);
      void this.starting?.then(check, check);
      check();
    });
  }

  private wakeAddressable(): void {
    for (const check of this.addressableWaiters) check();
  }

  private async publishModels(): Promise<void> {
    try {
      const response = (await this.transport?.request('model/list', {})) as
        | { data?: WireModel[] }
        | undefined;
      const data = response?.data;
      if (!Array.isArray(data)) return;

      const models: ModelChoice[] = data
        .filter((model) => model.hidden !== true)
        .flatMap((model) => {
          const value = model.id ?? model.model;
          if (value === undefined) return [];
          const levels = (model.supportedReasoningEfforts ?? [])
            .map((option) => option.reasoningEffort)
            .filter((level): level is string => typeof level === 'string');
          return [
            {
              value,
              displayName: model.displayName ?? value,
              ...(model.description === undefined ? {} : { description: model.description }),
              supportsEffort: levels.length > 0,
              supportedEffortLevels: levels,
            },
          ];
        });

      // A session reporting no model renders the composer's Anthropic default (ONL-2020).
      const fallback = data.find((model) => model.isDefault === true);
      const chosen = this.model ?? fallback?.id ?? fallback?.model;
      this.log.push({
        type: 'session.settings',
        models,
        ...(chosen === undefined ? {} : { model: chosen }),
      });
      this.model ??= chosen;
    } catch {}
  }

  refreshSkills(): Promise<void> { return this.publishSkills(); }

  addConnector(provider: import('@studio/events').FeaturedConnector): boolean {
    return flagOn('connectors') && !this.closed && (this.connectorSignIn?.start(provider) ?? false);
  }

  actOnConnector(id: string): boolean {
    return flagOn('connectors') && !this.closed && (this.connectorSignIn?.act(id) ?? false);
  }

  private publishSkillCatalog(skills: AgentSkill[], unavailable: boolean): void {
    this.skills = skills;
    publishChangedSkills(this.log, this.publishedSkills, skills, unavailable);
  }

  private async publishSkills(): Promise<void> {
    const revision = ++this.skillsRevision;
    try {
      const response = await this.transport?.request('skills/list', { cwds: [this.cwd], forceReload: true }) as { data?: { cwd: string; skills: { name: string; description: string; shortDescription?: string; path: string; enabled: boolean }[]; errors?: unknown[] }[] } | undefined;
      if (this.closed || revision !== this.skillsRevision) return;
      const entry = response?.data?.find((item) => item.cwd === this.cwd);
      const skills = (entry?.skills ?? []).filter((skill) => skill.enabled && skill.name && skill.path).map((skill) => ({ name: skill.name, description: skill.shortDescription || skill.description, path: skill.path, agent: 'codex' as const }));
      const unavailable = entry === undefined || (entry.errors?.length ?? 0) > 0 || (entry.skills.some((skill) => skill.enabled && (!skill.name || !skill.path)));
      this.publishSkillCatalog(skills, unavailable);
    } catch {
      if (this.closed || revision !== this.skillsRevision) return;
      this.publishSkillCatalog([], true);
    }
  }

  private publishThreadSettings(thread: ThreadResponse | undefined): void {
    if (thread === undefined) return;
    const model = thread.model;
    const effort = thread.reasoningEffort;
    if (model === undefined && effort === undefined) return;
    if (model !== undefined) this.model = model;
    if (effort !== undefined) this.effort = effort;
    this.log.push({
      type: 'session.settings',
      ...(model === undefined ? {} : { model }),
      ...(effort === undefined ? {} : { effort }),
    });
  }

  /** `close()` may run before `start()` holds a transport; closing here is what reaps that codex. */
  private abandoned(): boolean {
    if (!this.closed) return false;
    void this.transport?.close();
    return true;
  }

  private async start(): Promise<void> {
    await this.opts.prepare?.();
    if (this.closed) return;
    const wsl = wslProject(this.cwd);
    if (wsl !== undefined) await checkWslTools(this.cwd, ['codex']);
    const resolved = wsl === undefined ? resolveCodex(this.opts.codexRoot) : { bin: 'codex', descriptor: null, via: 'explicit-binary' as const };
    const health = wsl === undefined ? checkHealth(resolved, this.opts.codexRoot) : { ok: true, problems: [] };
    if (!health.ok || resolved === null) {
      logger.warn('start refused: codex is not usable', { problems: health.problems.join('; ') });
      this.reportError(t('chat.codex.unusable'), 'cli_missing');
      return;
    }

    const config: Record<string, string> = {
      [`projects.${JSON.stringify(wsl?.linuxPath ?? this.cwd)}.trust_level`]: '"untrusted"',
      // Default mode gates `request_user_input` at call time behind this flag (ONL-2215).
      'features.default_mode_request_user_input': 'true',
    };
    if (this.opts.reasoningSummary !== undefined) {
      config['model_reasoning_summary'] = this.opts.reasoningSummary;
    }

    const handlers: TransportHandlers = {
      onFrame: (_raw, frame) => {
        // Not the exited phase: `exit` can beat the last of stdout, and those rows are the
        // agent's last words before the crash (ONL-3104).
        if (this.closed) return;
        this.capture.write('in', frame);
        const bag = frame as unknown as Record<string, unknown>;
        this.registry.observe(bag);
        const retries = frame.method === 'turn/completed' ? retryTelemetry(this.log.events, HARNESSES.codex.countsRetryAttempts) : undefined;
        if (frame.method === 'thread/status/changed') {
          const params = frame.params as { threadId?: string; status?: { type?: string } } | undefined;
          if (params?.threadId === this.threadId) {
            const status = params?.status?.type;
            if (status === 'active') {
              this.lifecycle.dispatch({ type: 'thread', active: true });
              this.setStreaming(true);
            } else if (status === 'idle' || status === 'systemError' || status === 'notLoaded') {
              this.lifecycle.dispatch({ type: 'thread', active: false, keepStreaming: this.addressableWaiters.size > 0 });
            }
            this.wakeAddressable();
            this.emitState(status === 'systemError' || status === 'notLoaded');
          }
        }
        if (frame.method === 'turn/started') {
          const turn = (frame.params as { turn?: { id?: string } } | undefined)?.turn;
          this.lifecycle.dispatch({ type: 'started' });
          this.turnId = turn?.id;
          this.setStreaming(true);
          this.wakeAddressable();
          if (this.interruptPending) void this.interrupt();
        }
        if (frame.method === 'item/started' && this.undelivered.size > 0) {
          for (const messageId of this.undelivered) {
            if (this.steersAwaitingTurn.has(messageId)) continue;
            this.undelivered.delete(messageId);
            this.log.push({ type: 'message.delivery', messageId, outcome: 'delivered' });
          }
        }
        if (frame.method === 'turn/completed') {
          const turn = (frame.params as { turn?: { status?: string; error?: unknown } } | undefined)
            ?.turn;
          if (turn?.status !== 'completed') {
            this.lifecycle.dispatch({ type: 'thread', active: false, keepStreaming: true });
            this.lifecycle.dispatch({ type: 'interrupt-settled' });
            logger.warn('turn ended without completing', {
              status: String(turn?.status),
              hasError: turn?.error !== undefined && turn.error !== null,
            });
          }
          this.settleAcceptedSteers();
          this.settleParked();
          // A steer aimed at a finished turn is refused, then re-runs as its own (ONL-2383).
          this.turnId = undefined;
          this.settleTurn();
        }
        if (frame.method !== undefined && frame.id === undefined) {
          if (frame.method === 'mcpServer/oauthLogin/completed') this.connectorAdapter?.completed(frame.params);
          if (frame.method === 'skills/changed') void this.publishSkills();
          handleAppServerFrame(this.log, bag, this.turn, {
            connectors: flagOn('connectors'),
            internalMcpServers: this.internalMcpServers,
            account: this.account,
            onConnection: this.opts.onConnection,
            onTurnEnded: (summary) => {
              this.opts.onTurnEnded?.({ ...summary, origin: this.turnOrigin,
                retryAttempts: retries?.retry_attempts ?? null,
                retryObservedCount: retries?.retry_observed_count ?? 0,
                retryLastStatus: retries?.retry_last_status ?? null,
              });
            },
            onError: (code, apiErrorStatus) => {
              this.opts.onError?.(code, apiErrorStatus);
            },
          });
          // After the handler, so the turn the log just began publishes its own zeroed wait: the
          // row rose a round trip earlier, carrying the previous turn's banked total (ONL-2295).
          if (frame.method === 'turn/started') this.emitState();
        }
      },
      onServerRequest: (method, id, params) => this.onServerRequest(method, id, params),
      onExit: () => {
        this.connectors?.close();
        this.connectorSignIn?.close();
        const midTurn = this.streaming;
        if (this.closed || this.lifecycle.exited) {
          this.stopStreaming();
          return;
        }
        this.log.push({ type: 'session.settings', connectors: { servers: [], unavailable: true } });
        // A dead child owes no answer: without this the card answers into a transport that drops it (ONL-2190).
        this.settleParked();
        this.discardPrompt(this.pendingPromptId);
        // Before the set that names them: a steer codex answered is delivered, and clearing
        // `steersInFlight` first would discard it as never sent (ONL-3104).
        this.settleAcceptedSteers();
        this.steersInFlight.clear();
        settleUndelivered(this.log, this.undelivered, 'discarded');
        this.log.cancelOpenToolCalls('Session error');
        const ended = this.log.turnTally();
        if (ended !== undefined) {
          const retries = retryTelemetry(this.log.events, HARNESSES.codex.countsRetryAttempts);
          this.log.push({ type: 'turn.ended', turnId: ended.turnId, stopReason: 'provider_error', isError: true, filesChanged: ended.filesChanged });
          this.opts.onTurnEnded?.({
            ...ended, stopReason: 'provider_error', origin: this.turnOrigin,
            retryAttempts: retries.retry_attempts,
            retryObservedCount: retries.retry_observed_count,
            retryLastStatus: retries.retry_last_status,
          });
        }
        // After the turn it ended: a crashed turn's notification is parked while the turn still reads
        // live and cleared by the `turnEnding` state below, so no tab raises a failure toast (ONL-3104).
        this.lifecycle.dispatch({ type: 'transport-ended' });
        this.wakeAddressable();
        this.emitState(true);
        // No `onError`: a crash is not a new telemetry code (ONL-2903).
        if (midTurn) this.log.push({ type: 'session.error', message: '', code: 'spawn_failed' });
        this.opts.onExited?.();
      },
    };
    // No `codexHome`: a scratch one strips the user's auth, config.toml, MCP servers and skills.
    const spawn = async (): Promise<SpawnOptions> => ({ bin: resolved.bin, cwd: this.cwd, config, env: await userEnv() });
    this.transport =
      this.opts.connect === undefined
        ? new AppServerTransport(await spawn(), handlers)
        : await this.opts.connect(handlers, spawn);

    await this.transport.request('initialize', {
      clientInfo: { name: 'onlook-studio', title: 'Onlook', version: '0.0.0' },
      // Required for `thread/start.dynamicTools`.
      capabilities: { experimentalApi: true },
    });
    if (this.abandoned()) return;
    this.transport.notify('initialized');

    try {
      const snapshot = await this.transport.request('account/rateLimits/read', {}, 5000);
      if (this.abandoned()) return;
      const windows = mergeRateLimits(undefined, obj(obj(snapshot)?.['rateLimits']));
      for (const [kind, window] of Object.entries(this.account.rateLimits ?? {})) {
        windows[kind] = { ...windows[kind], ...window };
      }
      this.account.rateLimits = windows;
      if (Object.keys(windows).length > 0) this.log.push({ type: 'usage.limits', windows: Object.values(windows) });
    } catch {}

    await this.publishModels();
    await this.publishSkills();
    if (this.abandoned()) return;

    const toolSpecs = this.opts.tools ? appServerToolSpecs(this.opts.tools) : [];
    const briefingText = briefing(this.opts.workspace, {
      ...sessionBriefingContext('codex'),
      ...(this.opts.starter === undefined ? {} : { starter: this.opts.starter }),
    });

    const params = {
      cwd: this.cwd,
      // Kebab-case here; the per-turn `sandboxPolicy` in `run()` is camel-case.
      sandbox: APPSERVER_SANDBOX,
      // 'never' means never ALLOW for host tools: codex rejects the call with no request.
      approvalPolicy: 'on-request',
      // Unset, codex resolves `auto_review` and a subagent answers our approvals instead of the user (ONL-2190).
      approvalsReviewer: 'user',
      ...(briefingText === undefined ? {} : { developerInstructions: briefingText }),
      // Thread-level only; a resume cannot change the set.
      ...(toolSpecs.length === 0 ? {} : { dynamicTools: toolSpecs }),
      ...(this.model === undefined ? {} : { model: this.model }),
    };

    const resumeId = storedAppServerThread(this.cwd);
    let thread: ThreadResponse | undefined;
    if (resumeId !== undefined) {
      thread = (await this.transport
        .request('thread/resume', { threadId: resumeId, ...params })
        .catch((error: Error) => {
          logger.warn('thread/resume refused; starting fresh', { error });
          return undefined;
        })) as ThreadResponse | undefined;
      if (this.abandoned()) return;
    }
    const resumed = thread !== undefined;
    thread ??= (await this.transport.request('thread/start', params)) as
      | ThreadResponse
      | undefined;
    if (this.abandoned()) return;

    const lost = this.restored;
    if (!resumed && lost !== undefined) {
      // Keyed to the thread codex refused: replaying these rows marks it once, and a later thread marks its own (ONL-2925).
      const marked = this.opts.restoredEvents?.some((row) => row.type === 'session.boundary' && row.threadId === lost);
      // A prompt accepted during startup is already above this row, and it opens the new conversation.
      const message = this.promptedBeforeThread ? t('chat.codex.cannotContinueAfterPrompt') : t('chat.codex.cannotContinue');
      if (marked !== true) this.log.push({ type: 'session.boundary', message, threadId: lost });
    } else if (!resumed) {
      clearTranscript(this.cwd, 'appserver');
      // GC, not a workspace delete: the Claude drawer may still reference these images (ONL-2124).
      scheduleGc();
      if (this.opts.workspace) this.welcome(this.opts.workspace);
    }

    const path = thread?.thread?.path;
    if (typeof path === 'string' && path !== '') this.savedAt = path;
    this.publishThreadSettings(thread);
    // Published beside the backend that enforces it; one entry means the control has no choice to offer (ONL-2190).
    this.log.push({
      type: 'session.settings',
      permissionMode: APPSERVER_SANDBOX,
      permissionModes: [...APPSERVER_PERMISSION_MODES],
    });
    // After the read-back, which would otherwise overwrite it (ONL-2183).
    if (this.opts.effort !== undefined) {
      this.effort = this.opts.effort;
      this.log.push({ type: 'session.settings', effort: this.opts.effort });
    }

    this.threadId = thread?.thread?.id;
    if (this.threadId !== undefined && flagOn('connectors')) {
      const threadId = this.threadId;
      const readServers = async (): Promise<CodexServer[]> => {
        const servers: CodexServer[] = [];
        const cursors = new Set<string>();
        let cursor: string | null | undefined;
        do {
          const result = await this.transport!.request('mcpServerStatus/list', { threadId, detail: 'toolsAndAuthOnly', ...(cursor ? { cursor } : {}) }, 15000) as { data: CodexServer[]; nextCursor?: string | null };
          servers.push(...result.data);
          cursor = result.nextCursor;
          if (cursor) {
            if (cursors.has(cursor)) throw new Error('Connector inventory repeated a pagination cursor');
            cursors.add(cursor);
          }
        } while (cursor && !this.closed);
        this.internalMcpServers.clear();
        for (const server of servers) if (codexInternalServer(server.name, server.pluginId)) this.internalMcpServers.add(server.name);
        return servers;
      };
      this.connectorAdapter = new CodexConnectorSignIn(this.transport, threadId, this.cwd, readServers);
      this.connectorSignIn = new ConnectorSignIn(this.connectorAdapter, (connectors) => this.log.push({ type: 'session.settings', connectors }), 120_000, (activity) => recordConnectorActivity('appserver', activity));
      this.connectors = new ConnectorMonitor(async () => codexConnectors(await readServers()), (connectors) => this.connectorSignIn?.update(connectors));
      void this.connectors.refresh();
    }
    if (this.threadId !== undefined) {
      rememberAppServerThread(this.cwd, this.threadId, this.model);
    }
    if (this.threadId !== undefined) {
      this.capture = openCapture({
        root: this.opts.captureRoot,
        cwd: this.cwd,
        threadId: this.threadId,
        codexVersion: resolved.descriptor?.version ?? 'unknown',
      });
    }
  }

  private onServerRequest(method: string, id: string | number, params: unknown): void {
    if (this.closed) return;
    const handled = dispatchServerRequest(method, id, params, this.registry, {
      onApproval: (pending) => this.pushApproval(pending),
      onQuestion: (ask) => this.onQuestion(ask),
      ...(this.runTool === undefined ? {} : { onHostTool: (call) => this.onHostTool(call) }),
      respond: (rid, result) => this.transport?.respond(rid, result),
      respondError: (rid, message) => this.transport?.respondError(rid, message),
    });
    if (!handled) {
      this.log.noteUnmapped(`serverRequest:${method}`);
      this.transport?.respondError(id, `Onlook does not know the method '${method}'`);
    }
  }

  private onHostTool(call: HostToolCall): void {
    // The row first: the approval card groups under the row carrying its `toolCallId` and renders nowhere without it.
    this.log.ensureToolStart(call.callId, call.tool, call.args, 'in_progress' as ToolStatus, {
      source: 'stream',
    });
    const withheld = withheldSetupTool(this.cwd, call.tool);
    if (withheld !== undefined) {
      recordSetupApprovalWithheld({ cwd: this.cwd, tool: withheld, harness: 'appserver' });
    }
    if (withheld !== undefined || !APPSERVER_APPROVAL_TOOLS.includes(call.tool)) {
      void this.executeTool(call);
      return;
    }
    const requestId = randomUUID();
    this.pendingToolCalls.set(requestId, call);
    this.emitState();
    this.log.push({
      type: 'permission.requested',
      requestId,
      toolCallId: call.callId,
      toolName: call.tool,
      description: this.toolTitles[call.tool] ?? call.tool,
      input: (call.args ?? {}) as Record<string, unknown>,
      options: [
        { optionId: 'allow_once', label: t('chat.permission.approve'), kind: 'allow_once' },
        { optionId: 'reject_once', label: t('chat.permission.deny'), kind: 'reject_once' },
      ],
    });
  }

  /** Never rejects: both callers are `void`, and an unanswered `item/tool/call` parks the turn. */
  private async executeTool(call: HostToolCall): Promise<void> {
    let result: DynamicToolResult;
    try {
      result =
        (await this.runTool?.(call.tool, call.args)) ??
        { success: false, contentItems: [{ type: 'inputText' as const, text: 'Onlook has no tools attached to this session.' }] };
    } catch (error) {
      result = {
        success: false,
        contentItems: [
          {
            type: 'inputText' as const,
            text: `Onlook could not run ${call.tool}: ${(error as Error).message}`,
          },
        ],
      };
    }
    this.transport?.respond(call.requestId, result);
  }

  private pushApproval(pending: PendingApproval): void {
    if (pending.mcp !== undefined) {
      this.log.ensureToolStart(pending.itemId, 'mcpToolCall', pending.mcp, 'in_progress', { source: 'permission', approvalOnly: true });
    }
    const requestId = randomUUID();
    this.pendingApprovals.set(requestId, pending);
    this.emitState();
    // One classifier for both backends, so a command is never a class to one and not the other (ONL-2190).
    const destructive =
      pending.command === undefined ? undefined : classifyDestructiveGit(pending.command);
    this.log.push({
      type: 'permission.requested',
      requestId,
      toolCallId: pending.itemId,
      toolName: pending.mcp !== undefined ? 'mcpToolCall' : pending.command === undefined ? 'fileChange' : 'commandExecution',
      description: pending.reason,
      input:
        pending.mcp ?? (pending.command === undefined
          ? { changes: pending.changes }
          : { command: pending.command, cwd: pending.cwd }),
      options: [
        { optionId: 'allow_once', label: t('chat.permission.approve'), kind: 'allow_once' },
        // No always-allow: codex has no allow rule Studio would honour, and a destructive class must never carry one (ONL-2190).
        { optionId: 'reject_once', label: t('chat.permission.deny'), kind: 'reject_once' },
      ],
      ...(destructive === undefined ? {} : { destructiveClass: destructive }),
    });
  }

  /** No `item/started`/`item/completed` accompanies this request: it mints the row and `respond()` closes it (ONL-2215). */
  private onQuestion(ask: PendingQuestion): void {
    this.log.ensureToolStart(ask.itemId, QUESTION_TOOL, { questions: ask.questions }, 'in_progress' as ToolStatus, {
      source: 'stream',
    });
    this.turn.openToolCalls.add(ask.itemId);

    const questions = toStudioQuestions(ask.questions);
    if (!asksQuestion(questions)) {
      this.turn.openToolCalls.delete(ask.itemId);
      this.log.endTool(ask.itemId, 'failed', { errorMessage: 'No answerable options' });
      this.transport?.respondError(ask.requestId, 'Onlook cannot render a question with no options');
      return;
    }

    const idByText = new Map(ask.questions.map((q) => [q.question, q.id]));
    const requestId = randomUUID();
    this.pendingQuestions.set(requestId, { wireRequestId: ask.requestId, itemId: ask.itemId, idByText });
    this.log.parkQuestion(Date.now());
    this.emitState();
    this.log.push({
      type: 'permission.requested',
      requestId,
      toolCallId: ask.itemId,
      toolName: QUESTION_TOOL,
      questions,
      options: [],
    });
  }

  private async run(
    text: string,
    attachments: readonly ResolvedAttachment[],
    elements: readonly ElementEvidence[],
    context?: string,
    skills: readonly SkillAttachment[] = [],
    queuedMessageId?: string,
  ): Promise<void> {
    if (!this.log.isTurnLive) {
      this.log.beginTurn(this.turnOrigin);
    }
    // `activeTurnNotSteerable` named the turn that refused, not the thread (ONL-2519).
    this.setMidTurn('steer');
    const seq = ++this.runSeq;
    const epoch = this.settleEpoch;
    const ownTurn = this.log.turnId;
    // The row rises on the accept; codex answers `turn/started` a round trip later (ONL-2383).
    this.lifecycle.dispatch({ type: 'request' });
    this.setStreaming(true);
    let running = false;
    // A Stop is not a provider error, and the merged turn accounting reports whichever this was (ONL-2863).
    let ending: 'error' | 'interrupted' = 'error';
    try {
      // The install this waits on is Studio's, and it outlasts the provider-silence window on its own (ONL-2925).
      const holding = !this.prepared;
      if (holding) this.log.holdTurnSilence();
      try {
        await this.ready;
      } finally {
        if (holding) this.log.releaseTurnSilence();
      }
      if (this.closed) return;
      // A prompt sent after this one was stopped owns the shared flag now, so this run reads its own place in line (ONL-2925).
      if (seq !== this.runSeq) {
        this.discardPrompt(queuedMessageId);
        return;
      }
      // A Stop taken during the wait found no turn to interrupt, so this dispatch is the last place it can cancel one (ONL-2925).
      if (this.interruptPending) {
        this.lifecycle.dispatch({ type: 'interrupt-settled' });
        ending = 'interrupted';
        this.discardPrompt(queuedMessageId);
        return;
      }
      if (this.transport === undefined || this.threadId === undefined) {
        this.reportError(t('chat.codex.notRunning'), 'unknown');
        this.discardPrompt(queuedMessageId);
        return;
      }
      this.turn = createAppServerTurnState();
      const connectorContext = flagOn('connectors') ? this.connectorSignIn?.promptContext(text) : undefined;
      const { modelText, input } = prepareTurnInput(text, attachments, elements, [context, connectorContext].filter(Boolean).join('\n\n') || undefined, skills);
      this.pendingPromptId = undefined;
      this.capture.write('out', {
        method: 'turn/start',
        params: { promptChars: modelText.length, imageCount: attachments.length },
      });
      const started = (await this.transport.request('turn/start', {
        threadId: this.threadId,
        input,
        // Without this the turn inherits a restricted policy and an agent-started dev server dies on EPERM (ONL-2069).
        sandboxPolicy: { type: 'dangerFullAccess' },
        // Sent every turn and omitted when unset: a null clears the thread's resolved value (ONL-2071).
        ...(this.model === undefined ? {} : { model: this.model }),
        ...(this.effort === undefined ? {} : { effort: this.effort }),
      })) as { turn?: { id?: string } } | undefined;
      running = true;
      // The response carries the turn before the notification does (ONL-2383).
      this.turnId ??= started?.turn?.id;
    } catch (error) {
      logger.warn('turn/start failed', { error });
      // The turn did not start; the session may still be usable, so this is not fatal to it.
      this.reportError((error as Error).message, 'unknown', false);
    } finally {
      // `turn/completed` settles a turn codex took; every other ending settles here (ONL-2383).
      if (!running) {
        // Its own turn, whoever holds the books: a failed install settles the count from the
        // `start()` catch, and this is still the only place that turn is reported (ONL-2863).
        // A later prompt has begun its own turn, and reporting then ends the wrong one (ONL-2925).
        if (this.log.turnId === ownTurn) {
          const summary = this.log.turnTally();
          if (summary !== undefined) {
            this.log.push({ type: 'turn.ended', turnId: summary.turnId, stopReason: ending, isError: ending === 'error', filesChanged: summary.filesChanged });
            this.opts.onTurnEnded?.({ ...summary, origin: this.turnOrigin, stopReason: ending });
          }
        }
        // Only while this run still holds its unit: a later run or a `stopStreaming()` took the books
        // while it waited, and settling then spends a unit that is no longer its own (ONL-2925).
        if (seq === this.runSeq && epoch === this.settleEpoch) this.settleTurn();
      }
    }
  }
}
