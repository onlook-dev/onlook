// A parked `canUseTool` promise has no deadline: a leaked one wedges the session silently, so every abort route goes through `settleAll()`. No `ANTHROPIC_API_KEY`, no credential reads.

import { randomUUID } from 'node:crypto';
import { wslProject } from '../env/wsl.js';
import { startWslAgent } from './wsl.js';
import { ClaudeTurnLifecycle } from './turn-lifecycle.js';
import { t } from '@studio/i18n';
import { claudeConnectors, ConnectorMonitor } from './connectors.js';
import { ConnectorSignIn } from './connector-sign-in.js';
import { recordConnectorActivity } from './connector-telemetry.js';
import { claudeConnectorSignIn } from './claude-connector-sign-in.js';
import { flagOn } from '../flags/index.js';
import { dirname } from 'node:path';
import {
  query,
  type EffortLevel as SdkEffortLevel,
  type Query,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import {
  asksQuestion,
  withoutSkillMention,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  offeredModels,
  type AgentConnection,
  type DestructiveClass,
  type EffortLevel,
  type ImageRef,
  type MessageDelivery,
  type PermissionMode,
  type PermissionOutcome,
  type PromptAttachment,
  type PromptOrigin,
  type SessionErrorCode,
  type QuestionAnswers,
  type StudioEvent,
  type WelcomeProject,
} from '@studio/events';
import type { BackendState, ModelPick } from './backend.js';
import { registerImage } from '../images/store.js';
import { buildPromptContent, formatArtifactAttachments, resolveAttachments, splitAttachments } from './prompt-content.js';
import { readProjectAttachment, canSendAttachedFiles } from '../images/store.js';
import { claudeSkills, selectedSkillsAvailable } from './skills.js';
import { publishChangedSkills, recordQuestionReply, settleQuestionPark, type PublishedSkills } from './session-core.js';
import { projectSkillBody, readProjectContext, type ProjectSkill } from './project-context.js';
import type { AgentSkill } from '@studio/events';
import { userEnvSync, type Env } from '../env/shell-env.js';
import { pinClaudeConfigDir } from '../claude/env.js';
import { log } from '../log/index.js';
import { claudeExecutablePath } from './cli-path.js';
import { classifySessionError, classifyError } from './connection.js';
import { classifyDestructiveGit, destructiveReason, externallyVisibleGit } from './destructive-git.js';
import { alwaysAllowGrant } from './permission-grant.js';
import { requiresShellApproval } from './shell-approval.js';
import { EventLog, SESSION_CLOSED, settleUndelivered } from './event-log.js';
import { HARNESSES } from './harness.js';
import { recordPermissionDecided, recordSetupApprovalWithheld } from './session-telemetry.js';
import { withheldSetupTool } from '../project-setup/approval.js';
import { retryTelemetry } from '../telemetry/retries.js';
import {
  applyAnswers,
  applyResponse,
  forgetTurnState,
  handleSdkMessage,
  parseQuestions,
  permissionOptions,
  QUESTION_TOOL,
  sessionEndReason,
  toolPresentation,
  type CostSample,
} from './reduce.js';
import type { SessionEndSummary, TurnSummary } from './event-log.js';
import { canvasSinksFrom, DETACHED_CANVAS_SINKS, noCanvas, type CanvasToolSinks } from './canvas-tools.js';
import type { ArtifactToolReport } from './artifact-tools.js';
import type { ProjectSetupToolSinks } from './project-setup-tools.js';
import { briefing, type StarterBriefing } from '../../instructions/context.js';
import { sessionBriefingContext } from './briefing-context.js';
import { STUDIO_AUTO_APPROVED_TOOLS } from './tool-names.js';
import { CLOSE_INTERRUPT_LIMIT_MS, settleWithin } from './close-limits.js';
import {
  STUDIO_MCP_SERVER,
  studioToolServer,
  type FrameUrlReport,
  type FrameWorkingReport,
  type WaitingOnReport,
  type CreateProjectTabReport,
  type NextTasksReport,
  type RenameProjectReport,
  type ServerRunningReport,
} from './studio-tools.js';

const logger = log('agent-host');

export function deliveryClaimFor(
  origin: PromptOrigin,
  turnOpen: boolean,
  pendingSize: number,
): MessageDelivery | undefined {
  if (origin === 'studio' || !turnOpen) return undefined;
  return pendingSize > 0 ? 'waiting' : 'steering';
}

export interface AgentSessionOptions extends Partial<CanvasToolSinks> {
  cwd: string;
  model?: string;
  effort?: EffortLevel;
  /** The project's remembered mode; absent starts on `CLAUDE_PERMISSION_MODE` (ONL-2190). */
  permissionMode?: PermissionMode;
  /** What the user already always-allowed in this project, carried into the spawn's own settings (ONL-2933). */
  allowRules?: readonly string[];
  /** Ignored when `resume` is set. */
  sessionId?: string;
  /** Unchecked here: an id that does not resolve throws out of `query()` (`sessions.ts` checks). */
  resume?: string;
  /** Built into the system prompt by `start()`; a later `welcome()` is too late for the model (ONL-1920). */
  workspace?: WelcomeProject;
  starter?: StarterBriefing;
  keepRaw?: boolean;
  query?: typeof query;
  onEvent: (event: StudioEvent) => void;
  onState: (state: BackendState) => void;
  onConnection: (connection: AgentConnection) => void;
  onCost?: (sample: CostSample) => void;
  /** An always-allow the user just gave, for the host to remember past this session (ONL-2933). */
  onAllowRules?: (rules: string[]) => void;
  onTurnEnded?: (summary: TurnSummary) => void;
  onTurnStarted?: (turnId: string, origin: PromptOrigin) => void;
  onTurnStalled?: (turnId: string, silentMs: number) => void;
  onEnded?: (end: SessionEndSummary) => void;
  onError?: (code: SessionErrorCode, apiErrorStatus: number | null) => void;
  onServerRunning?: ServerRunningReport;
  onFrameUrl?: FrameUrlReport;
  onFrameWorking?: FrameWorkingReport;
  onWaitingOn?: WaitingOnReport;
  onRenameProject?: RenameProjectReport;
  onCreateProjectTab?: CreateProjectTabReport;
  onSuggestNextTasks?: NextTasksReport;
  onClipNextTaskPictures?: import('./studio-tools.js').StudioToolSinks['onClipNextTaskPictures'];
  onArtifact?: ArtifactToolReport;
  projectSetup?: ProjectSetupToolSinks;
  onSaveAttachment?: import('./studio-tools.js').StudioToolSinks['onSaveAttachment'];
  onDeleteProjectFile?: import('./studio-tools.js').StudioToolSinks['onDeleteProjectFile'];
}

/** `undefined` before the capture settles: the child then inherits `process.env`, which already carries the pin. */
function claudeChildSdkEnv(): Env | undefined {
  const env = userEnvSync();
  return env === undefined ? undefined : pinClaudeConfigDir(env);
}

/** The SDK's own, narrowed to what a host may read; set only when an `ask` rule forced the prompt. */
type MatchedAskRule = { source?: string; toolName?: string; ruleContent?: string };

interface PermissionAnswer {
  optionId: string;
  answers?: QuestionAnswers;
  /** The designer's own words in place of an option; the CLI tells the model "The user responded: …" (ONL-2583). */
  response?: string;
}

/** Re-interrupts per Stop: the CLI restarts its queued message ~64ms after the aborted result (0.3.220); bounded so a runtime that re-queues forever cannot spin. */
const STOP_LATCH_BUDGET = 3;

/** Asked before Bash leaves the machine (ONL-2285); read-only git is deliberately absent. */
export const EXTERNALLY_VISIBLE_GIT_RULES: readonly string[] = [
  'Bash(git push:*)',
  'Bash(gh pr create:*)',
  'Bash(gh pr merge:*)',
];

function bashCommand(toolName: string, input: Record<string, unknown>): string | undefined {
  if (toolName !== 'Bash') return undefined;
  const command = (input as { command?: unknown }).command;
  return typeof command === 'string' ? command : undefined;
}

/**
 * The git a bypassed Windows shell still asks about. `destructiveClassOf` reads Bash only, so without
 * this a PowerShell `git push --force` would run unasked once the blanket shell prompt is gone.
 */
function bypassedShellAsk(toolName: string, input: Record<string, unknown>): string | undefined {
  const command = (input as { command?: unknown }).command;
  if (typeof command !== 'string') return undefined;
  try {
    const found = classifyDestructiveGit(command);
    if (found !== undefined) return destructiveReason(found);
    return externallyVisibleGit(command)
      ? 'Publishing to the remote needs the user to approve it first.'
      : undefined;
  } catch {
    // The same safe side as `destructiveClassOf`: a command the classifier cannot read asks.
    return `Onlook could not check this ${toolName} command, so it needs the user to approve it first.`;
  }
}

/** Shared by the hook and the card so one command cannot be a class to one and not the other. */
function destructiveClassOf(
  toolName: string,
  input: Record<string, unknown>,
): DestructiveClass | undefined {
  const command = bashCommand(toolName, input);
  if (command === undefined) return undefined;
  try {
    return classifyDestructiveGit(command);
  } catch {
    return 'force_push';
  }
}

/** A request Studio's gate asks about every time, so an always-allow row would promise a silence no rule can keep (ONL-2933). */
function askedEveryTime(
  toolName: string,
  input: Record<string, unknown>,
  destructive: DestructiveClass | undefined,
  matchedAskRule: MatchedAskRule | undefined,
): boolean {
  if (matchedAskRule !== undefined) return true;
  if (requiresShellApproval(toolName) || toolName === 'mcp__studio__save_attachment') return true;
  if (destructive !== undefined) return true;
  const command = bashCommand(toolName, input);
  if (command === undefined) return false;
  try {
    return externallyVisibleGit(command);
  } catch {
    // Withholding on a classifier fault is the safe side: the row is the thing that would lie.
    return true;
  }
}

/**
 * The mode the session opens under; the gate holds in all of them, so this is a work posture,
 * not a safety level. Literal, not widened: the SDK's own `PermissionMode` is narrower than Studio's.
 */
export const CLAUDE_PERMISSION_MODE = 'auto' as const satisfies PermissionMode;

/** Every one enforced. `bypassPermissions` shadows `canUseTool`, and `dontAsk` refuses instead of asking (ONL-2190). */
export const CLAUDE_PERMISSION_MODES = [
  'default',
  'acceptEdits',
  'auto',
  'plan',
] as const satisfies readonly PermissionMode[];

/**
 * Offered beside the enforced modes but never the default. The SDK approves every call before
 * `canUseTool`, but its deny and ask rules still hold, and the hook keeps its own asks except the
 * blanket Windows shell prompt.
 */
export const CLAUDE_BYPASS_PERMISSION_MODE = 'bypassPermissions' as const satisfies PermissionMode;

/** What the composer offers: the enforced modes, then bypass. */
export const CLAUDE_OFFERED_PERMISSION_MODES = [
  ...CLAUDE_PERMISSION_MODES,
  CLAUDE_BYPASS_PERMISSION_MODE,
] as const satisfies readonly PermissionMode[];

/** Every mode Studio offers is a member of the SDK's own narrower union, so no cast reaches `query()` (ONL-2190). */
type ClaudePermissionMode = (typeof CLAUDE_OFFERED_PERMISSION_MODES)[number];

function isClaudePermissionMode(mode: PermissionMode): mode is ClaudePermissionMode {
  return (CLAUDE_OFFERED_PERMISSION_MODES as readonly PermissionMode[]).includes(mode);
}

interface HookAnswer {
  continue: true;
  hookSpecificOutput?: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'ask' | 'deny';
    permissionDecisionReason: string;
  };
}

function askBecause(reason: string): HookAnswer {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
  };
}

/**
 * The spellings a text rule reaches; `classifyDestructiveGit` covers the rest (ONL-2190).
 * Quote variants are deliberate: a refspec is often quoted.
 */
export const DESTRUCTIVE_GIT_RULES: readonly string[] = [
  'Bash(git push *--force*)',
  'Bash(git push * -f*)',
  // A bundle puts the letter first, so the space these rules lean on is not there (ONL-2190).
  'Bash(git push -f*)',
  'Bash(git push -d*)',
  'Bash(git push * +*)',
  'Bash(git push *"+*)',
  "Bash(git push *'+*)",
  'Bash(git push *--de*)',
  'Bash(git push * -d*)',
  'Bash(git push * :**)',
  'Bash(git push *":**)',
  "Bash(git push *':**)",
  // Anchored on the dash: `*-d*` also matches a branch named `fix-dropdown`, which asks on routine work.
  'Bash(git branch -d*)',
  'Bash(git branch * -d*)',
  'Bash(git branch -D*)',
  'Bash(git branch * -D*)',
  'Bash(git branch *--delete*)',
  'Bash(git reset *--hard*)',
];

function rootStreamEvent(msg: unknown, type: string): boolean {
  const partial = msg as { type?: string; event?: { type?: string }; parent_tool_use_id?: string | null };
  return partial.type === 'stream_event' && partial.event?.type === type && partial.parent_tool_use_id == null;
}

function isRootMessageStart(msg: unknown): boolean {
  return rootStreamEvent(msg, 'message_start');
}

/** The CLI builds its next request only after a root `message_stop` or a tool result. */
function isTurnBoundary(msg: unknown): boolean {
  if (rootStreamEvent(msg, 'message_stop')) return true;
  const partial = msg as { type?: string; message?: { content?: unknown }; parent_tool_use_id?: string | null };
  if (partial.type !== 'user' || partial.parent_tool_use_id != null) return false;
  const content = partial.message?.content;
  return Array.isArray(content) && content.some((block) => (block as { type?: string }).type === 'tool_result');
}

interface Pending {
  requestId: string;
  toolCallId: string;
  parkedAt: number;
  /** Decided once, from the same parse the event carries: a question pauses the turn, an approval does not (ONL-2295). */
  question: boolean;
  resolve: (answer: PermissionAnswer) => void;
  cancel: () => void;
}

export class AgentSession {
  readonly id = `s${Date.now().toString(36)}`;
  readonly harness = 'claude' as const;
  readonly cwd: string;
  readonly midTurn = 'steer' as const;

  private readonly log: EventLog;
  private readonly opts: AgentSessionOptions;
  private q?: Query;
  private skills: AgentSkill[] = [];
  private projectSkills: ProjectSkill[] = [];
  private skillsRevision = 0;
  private readonly publishedSkills: PublishedSkills = { fingerprint: undefined };

  private inbox: { text: string; attachments: PromptAttachment[]; origin: PromptOrigin }[] = [];
  private wake?: () => void;
  private readonly lifecycle = new ClaudeTurnLifecycle();
  private get closed(): boolean { return this.lifecycle.closed; }
  private get turnOpen(): boolean { return this.lifecycle.turnOpen; }
  private get interrupting(): boolean { return this.lifecycle.interrupting; }
  private connectors?: ConnectorMonitor;
  private connectorSignIn?: ConnectorSignIn;
  private savedAt: string | undefined;
  private retryEventsFrom = 0;
  private turnOrigin: PromptOrigin = 'user';
  /** The origin of the last message handed to the CLI: the turn it opens on its own is that message's. */
  private cliTurnOrigin: PromptOrigin = 'user';
  private readonly undelivered = new Set<string>();
  private stopLatch = 0;

  private readonly pending = new Map<string, Pending>();
  private readonly dismissing = new Set<string>();
  private readonly parked = new Set<string>();
  private previousTotalCostUsd = 0;
  private readonly createdAt = Date.now();
  private failed = false;
  private lastResultSubtype?: string;
  private spawnedSessionId?: string;

  get isStreaming(): boolean { return this.lifecycle.streaming; }

  private lastState?: {
    isStreaming: boolean;
    needsAttention: boolean;
    questionParkedSince?: number;
    turnWaitedMs: number;
    isTurnLive: boolean;
  };

  get needsAttention(): boolean {
    return this.pending.size > 0;
  }

  get questionParkedSince(): number | undefined {
    return this.log.questionParkedSince;
  }

  get turnWaitedMs(): number {
    return this.log.turnWaitedMs;
  }

  get isTurnLive(): boolean {
    return this.turnOpen;
  }

  /** Apart from `opts`: a re-spawn after a pump error starts from these, so an in-session pick survives. */
  private model?: string;
  private effort?: EffortLevel;
  private permissionMode: ClaudePermissionMode;
  private readonly allowRules: Set<string>;

  constructor(options: AgentSessionOptions) {
    this.opts = options;
    this.cwd = options.cwd;
    this.model = options.model;
    this.effort = options.effort;
    this.allowRules = new Set(options.allowRules ?? []);
    // A remembered mode the backend no longer offers falls back rather than starting on a posture nothing keeps.
    this.permissionMode =
      options.permissionMode !== undefined && isClaudePermissionMode(options.permissionMode)
        ? options.permissionMode
        : CLAUDE_PERMISSION_MODE;
    this.log = new EventLog({
      sessionId: this.id,
      cwd: options.cwd,
      keepRaw: options.keepRaw,
      emit: options.onEvent,
      onTurnStarted: options.onTurnStarted,
      onTurnStalled: options.onTurnStalled,
      onToolFailed: (name, result) => {
        if (!flagOn('connectors')) return undefined;
        const connector = this.connectorSignIn?.toolFailed(name, result);
        return connector === undefined ? undefined : t('chat.connectors.tool.signInRequired', { connector });
      },
      connectorToolNames: () => flagOn('connectors'),
    });
  }

  get events(): StudioEvent[] {
    return this.log.events;
  }

  get isRestoringTranscript(): boolean { return this.log.isRestoringTranscript; }

  /** Before the first live push, and only once the caller has confirmed the session resumes (ONL-2125). */
  restoreTranscript(rows: readonly StudioEvent[]): void {
    this.log.restore(rows);
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

  /** Host-called, never from the constructor: a push before the `agent:session` broadcast is dropped by the renderer's buffer reset. */
  welcome(workspace: WelcomeProject): void {
    if (this.closed) return;
    this.log.push({ type: 'session.welcome', workspace });
  }

  /** Streaming input mode is what makes `query.interrupt()` exist. */
  private async *prompts(): AsyncGenerator<SDKUserMessage> {
    while (!this.closed) {
      const queued = this.inbox.shift();
      if (queued === undefined) {
        await new Promise<void>((resolve) => {
          this.wake = resolve;
        });
        continue;
      }
      this.cliTurnOrigin = queued.origin;
      // Split first: `resolveAttachments` drops every element id.
      const { images, files, skills, elements } = splitAttachments(queued.attachments);
      const selected = skills[0];
      const mentioned = /^\/([\w.:-]+)(?:\s|$)/.exec(queued.text)?.[1];
      const projectSkill = this.projectSkills.find(({ skill }) => selected ? skill.name === selected.name && skill.path === selected.path : skill.name === mentioned);
      const argument = projectSkill ? withoutSkillMention(queued.text, projectSkill.skill.name) : queued.text;
      const text = projectSkill ? `Project skill ${projectSkill.skill.name}\nDirectory: ${dirname(projectSkill.skill.path!)}\n${projectSkillBody(projectSkill.body, argument)}\n\n${argument}` : queued.text;
      const resolved = resolveAttachments([...images, ...files], (id) => readProjectAttachment(this.cwd, id));
      yield {
        type: 'user',
        session_id: this.id,
        parent_tool_use_id: null,
        message: {
          role: 'user',
          content: buildPromptContent([text, formatArtifactAttachments(queued.attachments), flagOn('connectors') ? this.connectorSignIn?.promptContext(text) : undefined].filter(Boolean).join('\n\n'), resolved, elements, projectSkill ? [] : skills),
        },
      } as SDKUserMessage;
    }
  }

  /** Spawns at connect with no prompt (ONL-1866); idempotent. `system:init` only arrives after a first prompt, so there is no promptless read-back of the model. */
  open(): void {
    if (this.closed || this.q) return;
    this.connectors?.close();
    this.connectorSignIn?.close();
    this.start();
    this.log.push({ type: 'session.settings', connectors: null });
    // What we started on: without it a session opened on a stored choice shows the default row until the first prompt (ONL-2183).
    if (this.model !== undefined) {
      this.log.push({ type: 'session.settings', model: this.model });
    }
    // Published from here, beside the backend that enforces them, rather than chosen in the renderer (ONL-2190).
    this.log.push({
      type: 'session.settings',
      permissionMode: this.permissionMode,
      permissionModes: [...CLAUDE_OFFERED_PERMISSION_MODES],
    });
    void this.publishModels();
    void this.publishSkills();
    this.monitorConnectors();
    void this.setEffort(this.effort ?? DEFAULT_EFFORT).catch(() => {
      // A thrown default must not take the session down.
    });
  }

  private monitorConnectors(): void {
    if (!flagOn('connectors')) return;
    const connectorQuery = this.q;
    if (connectorQuery !== undefined) this.connectorSignIn = new ConnectorSignIn(claudeConnectorSignIn(connectorQuery, this.cwd, { refreshInventory: async () => { await this.connectors?.revalidate(); } }), (connectors) => this.log.push({ type: 'session.settings', connectors }), 120_000, (activity) => recordConnectorActivity('claude', activity));
    this.connectors = new ConnectorMonitor(async () => {
      if (connectorQuery === undefined) throw new Error('Session not ready');
      return claudeConnectors(await connectorQuery.mcpServerStatus());
    }, (connectors) => this.connectorSignIn?.update(connectors));
    void this.connectors.refresh();
  }

  addConnector(provider: import('@studio/events').FeaturedConnector): boolean {
    return flagOn('connectors') && !this.closed && (this.connectorSignIn?.start(provider) ?? false);
  }

  actOnConnector(id: string): boolean {
    return flagOn('connectors') && !this.closed && (this.connectorSignIn?.act(id) ?? false);
  }

  prompt(
    text: string,
    attachments: PromptAttachment[] = [],
    context?: string,
    origin: PromptOrigin = 'user',
    display?: { origin: PromptOrigin; hidden?: true },
  ): boolean {
    if (this.closed) return false;
    if (!selectedSkillsAvailable(attachments, this.skills)) return false;
    if (!canSendAttachedFiles(this.cwd, splitAttachments(attachments).files, 'claude')) return false;
    // Any prompt, Studio's included, is the user moving on.
    this.stopLatch = 0;
    const delivery = deliveryClaimFor(origin, this.turnOpen, this.pending.size);
    if (!this.turnOpen) {
      this.retryEventsFrom = this.log.events.length;
      const turnId = this.log.beginTurn(origin);
      this.log.push({ type: 'turn.started', turnId });
      this.lifecycle.dispatch({ type: 'begin' });
      // The turn's origin is the origin of the prompt that opened it; a steer joins it (ONL-2463).
      this.turnOrigin = origin;
    }
    const messageId = randomUUID();
    this.log.push({
      type: 'message.user',
      turnId: this.log.turnId,
      messageId,
      text,
      origin: display?.origin ?? origin,
      ...(display?.hidden === true ? { hidden: true as const } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(context === undefined || context === '' ? {} : { context }),
      ...(delivery === undefined ? {} : { delivery }),
    });
    if (delivery !== undefined) {
      this.undelivered.add(messageId);
      this.lifecycle.dispatch({ type: 'prompt-pushed' });
    }
    const modelText = [text, context ?? ''].filter((part) => part !== '').join('\n\n');
    this.inbox.push({ text: modelText, attachments, origin });
    this.wake?.();
    this.wake = undefined;
    this.open();
    this.setStreaming(true);
    this.emitState();
    return true;
  }

  /** Each canvas sink the host gave, read when the tool calls it, else its detached answer. */
  private canvasSinks(): CanvasToolSinks {
    return canvasSinksFrom((name) => (request) => this.opts[name]?.(request) ?? DETACHED_CANVAS_SINKS[name](request));
  }

  /** Sees only what `allowedTools`, the CLI's safe-Bash list and the `'auto'` classifier did not already approve; a quiet approval panel is normal. The PreToolUse hook is the exhaustive view. */
  private canUseTool = async (
    toolName: string,
    input: Record<string, unknown>,
    opts: {
      signal: AbortSignal;
      toolUseID: string;
      requestId: string;
      agentID?: string;
      suggestions?: unknown[];
      /** The CLI's own word that no persistent rule belongs on this ask (ONL-2562). */
      suppressAlwaysAllowRule?: boolean;
      /** Sent only when the tool had a reason of its own, so its absence is not "no ask rule". */
      matchedAskRule?: MatchedAskRule;
      title?: string;
      displayName?: string;
      description?: string;
      decisionReason?: string;
      blockedPath?: string;
    },
  ): Promise<
    | { behavior: 'allow'; updatedInput: Record<string, unknown>; updatedPermissions?: unknown[] }
    | { behavior: 'deny'; message: string }
  > => {
    const withheld =
      this.permissionMode === 'plan' ? undefined : withheldSetupTool(this.cwd, toolName);
    if (withheld !== undefined) {
      recordSetupApprovalWithheld({ cwd: this.cwd, tool: withheld, harness: 'claude' });
      // Before `parked` and the pending row: the `PreToolUse` hook already wrote this call's row (ONL-2499).
      return { behavior: 'allow', updatedInput: input };
    }

    const { signal, toolUseID, requestId, agentID, suggestions } = opts;

    // The request routinely beats the assistant's `tool_use` block; announce now so the approval UI has a row.
    this.parked.add(toolUseID);
    this.log.ensureToolStart(toolUseID, toolName, input, 'pending', {
      source: 'permission',
      agentId: agentID,
    });

    const parkedAt = Date.now();

    // Answerable before announced: `log.push` emits synchronously, and an in-process answerer would find nothing in `pending`.
    let settle!: {
      resolve: (answer: PermissionAnswer) => void;
      reject: (e: Error) => void;
    };
    const answered = new Promise<PermissionAnswer>((resolve, reject) => {
      settle = { resolve, reject };
    });
    const questions = toolName === QUESTION_TOOL ? parseQuestions(input) : undefined;
    const entry: Pending = {
      requestId,
      toolCallId: toolUseID,
      parkedAt,
      question: asksQuestion(questions),
      resolve: settle.resolve,
      cancel: () => settle.reject(new Error('__canceled__')),
    };
    this.pending.set(requestId, entry);
    if (entry.question) this.log.parkQuestion(parkedAt);
    this.emitState();
    // The SDK aborts the signal on interrupt; there is no park deadline.
    if (signal.aborted) entry.cancel();
    else signal.addEventListener('abort', () => entry.cancel(), { once: true });

    const presentation = toolPresentation(toolName, input, this.cwd);
    const destructive = destructiveClassOf(toolName, input);
    const always = askedEveryTime(toolName, input, destructive, opts.matchedAskRule)
      ? undefined
      : alwaysAllowGrant(suggestions, opts.suppressAlwaysAllowRule, bashCommand(toolName, input));
    this.log.push({
      type: 'permission.requested',
      requestId,
      toolCallId: toolUseID,
      toolName,
      title: opts.title ?? `Claude wants to run ${presentation.title}`,
      displayName: opts.displayName ?? presentation.title,
      description: opts.description,
      decisionReason: opts.decisionReason,
      blockedPath: opts.blockedPath,
      input,
      options: permissionOptions(opts.displayName ?? presentation.title, always),
      // `AskUserQuestion` is a permission request on the wire; `questions` makes the row a picker.
      questions,
      destructiveClass: destructive,
    });

    let optionId: string;
    let answers: QuestionAnswers | undefined;
    let response: string | undefined;
    try {
      ({ optionId, answers, response } = await answered);
    } catch {
      this.pending.delete(requestId);
      this.syncQuestionPark();
      this.emitState();
      this.parked.delete(toolUseID);
      this.log.addWaited(toolUseID, Date.now() - parkedAt);
      const dismissed = this.dismissing.delete(requestId);
      this.log.push({
        type: 'permission.resolved',
        requestId,
        toolCallId: toolUseID,
        outcome: 'canceled',
        ...(dismissed ? { dismissed: true as const } : {}),
      });
      this.log.endTool(toolUseID, 'canceled', { errorMessage: 'Canceled' });
      // A throw, not a deny: a deny lets the model keep reasoning on a killed turn.
      throw new Error('Tool use aborted');
    }

    this.pending.delete(requestId);
    this.syncQuestionPark();
    this.emitState();
    this.parked.delete(toolUseID);
    this.log.addWaited(toolUseID, Date.now() - parkedAt);

    // A card that offered no `always` row can still answer with one; without a grant behind it, it allowed once.
    const grant = optionId === 'allow_always' ? always : undefined;
    const outcome: PermissionOutcome =
      grant !== undefined
        ? 'allow_always'
        : optionId === 'allow' || optionId === 'allow_always'
          ? 'allow_once'
          : 'deny';

    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: toolUseID,
      outcome,
      optionId,
      ...(answers === undefined ? {} : { answers }),
    });
    if (destructive !== undefined) {
      recordPermissionDecided({ outcome, harness: 'claude', destructiveClass: destructive });
    }

    if (outcome === 'deny') {
      this.log.endTool(toolUseID, 'denied', { errorMessage: 'Denied by user' });
      // The SDK also synthesizes a `tool_result`; the log's terminal-once rule drops it.
      return { behavior: 'deny', message: 'User denied this action.' };
    }

    this.log.push({
      type: 'tool.update',
      toolCallId: toolUseID,
      status: 'in_progress',
    });

    // Answers ride back as `updatedInput.answers`; without them the model is told the user did not answer.
    const updatedInput =
      response !== undefined
        ? applyResponse(input, response)
        : answers
          ? applyAnswers(input, answers)
          : input;

    if (grant !== undefined) {
      for (const rule of grant.rules) this.allowRules.add(rule);
      this.opts.onAllowRules?.(grant.rules);
      return { behavior: 'allow', updatedInput, updatedPermissions: grant.updates };
    }
    return { behavior: 'allow', updatedInput };
  };

  /**
   * The only exhaustive view of tool activity (`canUseTool` never saw `echo hi`).
   * Hooks run before the mode step, so an `ask` here reaches `canUseTool` in every mode (ONL-2190).
   */
  private sessionStart = async (input: { transcript_path?: string }): Promise<HookAnswer> => {
    this.noteTranscript(input);
    return { continue: true };
  };

  private noteTranscript(input: { transcript_path?: string }): void {
    if (typeof input.transcript_path === 'string' && input.transcript_path !== '') this.savedAt = input.transcript_path;
  }

  private preToolUse = async (
    input: { tool_name?: string; tool_input?: unknown; tool_use_id?: string; transcript_path?: string; agent_id?: string },
    toolUseID: string | undefined,
  ): Promise<HookAnswer> => {
    this.noteTranscript(input);
    const id = input.tool_use_id ?? toolUseID;
    if (id && input.tool_name) {
      this.log.ensureToolStart(id, input.tool_name, input.tool_input, 'in_progress', {
        source: 'hook',
        ...(input.agent_id === undefined ? {} : { agentId: input.agent_id }),
      });
    }
    if (input.tool_name === 'Bash' && (input.tool_input as Record<string, unknown> | undefined)?.run_in_background === true) {
      return {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'Run commands in the foreground. Use run_project_setup for servers so Onlook owns their lifetime and Stop control.',
        },
      };
    }
    // Asking on a classifier fault is the safe side: no opinion would let the wrapped shapes no rule reaches through.
    const toolName = input.tool_name ?? '';
    const toolInput = (input.tool_input as Record<string, unknown> | undefined) ?? {};
    const found = destructiveClassOf(toolName, toolInput);
    if (found !== undefined) return askBecause(destructiveReason(found));
    if (!requiresShellApproval(toolName)) return { continue: true };
    // The opt-in drops only the blanket shell prompt; git that rewrites or publishes still asks, whichever shell runs it.
    if (this.permissionMode === CLAUDE_BYPASS_PERMISSION_MODE) {
      const reason = bypassedShellAsk(toolName, toolInput);
      return reason === undefined ? { continue: true } : askBecause(reason);
    }
    return askBecause('Shell commands on Windows need your approval before they run.');
  };

  respond(requestId: string, optionId: string, answers?: QuestionAnswers): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) {
      return false;
    }
    entry.resolve({ optionId, answers });
    return true;
  }

  answerQuestion(text: string, attachments: PromptAttachment[] = [], context?: string): boolean {
    const open = [...this.pending.values()].filter((entry) => entry.question);
    if (this.closed || open.length === 0) return false;
    const { images, files, skills, elements } = splitAttachments(attachments);
    if (!selectedSkillsAvailable(attachments, this.skills)) return false;
    if (!canSendAttachedFiles(this.cwd, files, 'claude')) return false;
    const { messageId, reply: response, carriesMore } = recordQuestionReply(this.log, text, attachments, context, { images, files, skills, elements });
    for (const entry of open) entry.resolve({ optionId: 'allow', response });
    // A tool answer carries text only, so pictures and picked elements follow as a message of their own.
    if (carriesMore) {
      this.undelivered.add(messageId);
      this.lifecycle.dispatch({ type: 'prompt-pushed' });
      this.inbox.push({ text: skills.length > 0 ? response : '', attachments, origin: 'user' });
      this.wake?.();
      this.wake = undefined;
    }
    return true;
  }

  async dismissQuestion(): Promise<boolean> {
    const open = [...this.pending.values()].filter((entry) => entry.question);
    if (this.closed || open.length === 0) return false;
    for (const entry of open) this.dismissing.add(entry.requestId);
    await this.interrupt();
    return true;
  }

  private settleAll(): void {
    for (const entry of [...this.pending.values()]) entry.cancel();
    this.pending.clear();
    this.syncQuestionPark();
    // Every caller is a teardown: the turn is finishing, so a cleared question must not read as work resuming (ONL-2295).
    this.emitState(true);
    this.parked.clear();
  }

  private syncQuestionPark(): void {
    settleQuestionPark(this.log, [...this.pending.values()].some((entry) => entry.question));
  }

  /** A stream with no Studio turn open: armed, the latch kills it; `system:init` is a real turn; a bare assistant event is a straggler. */
  private onCliTurn(init: boolean): void {
    this.lifecycle.dispatch({ type: 'begin' });
    if (this.stopLatch > 0) {
      this.stopLatch -= 1;
      this.lifecycle.dispatch({ type: 'interrupt' });
      void this.q?.interrupt().catch(() => undefined);
      return;
    }
    // Net zero and no emit: a straggler leaves the live-turn fact where it was (ONL-2294).
    if (!init && this.undelivered.size === 0) {
      this.lifecycle.dispatch({ type: 'turn-abandoned' });
      return;
    }
    const turnId = this.log.beginTurn(this.cliTurnOrigin);
    // The CLI runs the message it was last handed, so that message's origin is this turn's;
    // without this the turn inherits whichever one Studio opened before it (ONL-2463).
    this.turnOrigin = this.cliTurnOrigin;
    this.log.push({ type: 'turn.started', turnId });
    this.emitState();
  }

  private async publishModels(): Promise<void> {
    try {
      const models = await this.q?.supportedModels();
      if (!models) return;
      this.log.push({
        type: 'session.settings',
        models: offeredModels(models).map((m) => ({
          value: m.value,
          resolvedModel: m.resolvedModel,
          displayName: m.displayName,
          description: m.description,
          supportsEffort: m.supportsEffort,
          supportedEffortLevels: m.supportedEffortLevels as EffortLevel[] | undefined,
        })),
      });
    } catch {
      // Leaves `models` empty; the picker renders disabled rather than wrong.
    }
  }

  refreshSkills(): Promise<void> { return this.publishSkills(true); }

  private publishSkillCatalog(skills: AgentSkill[], unavailable: boolean): void {
    this.projectSkills = readProjectContext(this.cwd).skills;
    skills = [...new Map([...skills, ...this.projectSkills.map(({ skill }) => skill)].map((skill) => [skill.name, skill])).values()];
    this.skills = skills;
    publishChangedSkills(this.log, this.publishedSkills, skills, unavailable);
  }

  private async publishSkills(reload = false): Promise<void> {
    const revision = ++this.skillsRevision;
    try {
      const commands = reload ? (await this.q?.reloadSkills())?.skills : await this.q?.supportedCommands();
      if (this.closed || revision !== this.skillsRevision) return;
      this.publishSkillCatalog(claudeSkills(commands ?? []), commands === undefined);
    } catch {
      if (this.closed || revision !== this.skillsRevision) return;
      this.publishSkillCatalog([], true);
    }
  }

  /** Applied live, then re-announced from the backend so the composer shows what is enforced (ONL-2190). */
  async setPermissionMode(mode: PermissionMode): Promise<boolean> {
    if (!isClaudePermissionMode(mode)) return false;
    if (this.q !== undefined) {
      try {
        await this.q.setPermissionMode(mode);
      } catch (error: unknown) {
        // A refused mode is never announced or remembered: the composer rolls back to what is enforced.
        logger.warn('setPermissionMode refused', { error: classifyError(String(error)) });
        return false;
      }
    }
    // A session with no query yet opens on the stored choice; `start()` reads this field.
    this.permissionMode = mode;
    this.log.push({ type: 'session.settings', permissionMode: mode });
    return true;
  }

  async setModel(model: string): Promise<ModelPick> {
    if (this.q !== undefined) {
      try {
        await this.q.setModel(model);
      } catch (error: unknown) {
        const refusal = classifyError(String(error)) === 'unauthenticated' ? 'signed-out' : 'refused';
        logger.warn('setModel refused', { refusal });
        return { accepted: false, refusal };
      }
    }
    this.model = model;
    this.log.push({ type: 'session.settings', model });
    return { accepted: true };
  }

  /** `applyFlagSettings` sits ABOVE the user's settings files; `null` is the only way back to their own `effortLevel`. */
  async setEffort(effort: EffortLevel | null): Promise<void> {
    this.effort = effort ?? undefined;
    if (!this.q) return;
    // The SDK's own union, not `KnownEffortLevel`, which already carries codex's `ultra`.
    await this.q.applyFlagSettings({ effortLevel: effort as SdkEffortLevel | null });
    this.log.push({ type: 'session.settings', effort });
  }

  async interrupt(): Promise<void> {
    this.lifecycle.dispatch({ type: 'interrupt' });
    this.stopLatch = STOP_LATCH_BUDGET;
    this.settleAll();
    // Already in the CLI child; the latch is what stops it running.
    settleUndelivered(this.log, this.undelivered, 'discarded');
    try {
      await this.q?.interrupt();
    } catch {
      // An interrupt that throws is still an interrupt; `result` ends the turn.
    }
    this.setStreaming(false);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.lifecycle.dispatch({ type: 'close' });
    this.connectors?.close();
    this.connectorSignIn?.close();
    // Read before teardown: a turn streaming here is the one this close kills.
    const wasStreaming = this.isStreaming;
    this.settleAll();
    settleUndelivered(this.log, this.undelivered, 'discarded');
    // Each canceled request's own handler writes first; terminal-once means first writer wins.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    this.log.cancelOpenToolCalls('Session ended');
    this.wake?.();
    this.wake = undefined;
    // Bounded: a hung interrupt must not hold `session.ended` past quit's limit (ONL-2254).
    await settleWithin((async () => this.q?.interrupt())(), CLOSE_INTERRUPT_LIMIT_MS);
    const reason = sessionEndReason({
      failed: this.failed,
      streaming: wasStreaming,
      ...(this.lastResultSubtype === undefined
        ? {}
        : { lastResultSubtype: this.lastResultSubtype }),
    });
    // The turn this close killed: `turnTally()` reports once, so a turn that already
    // reached its result reports nothing here (ONL-2463).
    const killed = this.log.turnTally();
    if (killed !== undefined) {
      const retries = retryTelemetry(this.log.events, HARNESSES.claude.countsRetryAttempts, this.retryEventsFrom);
      this.opts.onTurnEnded?.({
        ...killed,
        stopReason: SESSION_CLOSED,
        origin: this.turnOrigin,
        retryAttempts: retries.retry_observed_count,
        retryLastStatus: retries.retry_last_status,
        ...(retries.retry_error_kind === null ? {} : { retryErrorKind: retries.retry_error_kind }),
      });
    }
    this.log.push({ type: 'session.ended', reason });
    this.opts.onEnded?.({
      reason,
      durationMs: Date.now() - this.createdAt,
      turnCount: this.log.turnCount,
      // 0 means never reported: absent, not free.
      ...(this.previousTotalCostUsd > 0 ? { totalCostUsd: this.previousTotalCostUsd } : {}),
    });
    this.setStreaming(false);
  }

  private start(): void {
    const wsl = wslProject(this.cwd);
    const project = readProjectContext(this.cwd);
    const workspaceBriefing = [briefing(this.opts.workspace, {
      ...sessionBriefingContext('claude', this.cwd),
      ...(this.opts.starter === undefined ? {} : { starter: this.opts.starter }),
    }), project.instructions].filter(Boolean).join('\n\n');
    const allowRules = [...this.allowRules];
    // The CLI refuses a second spawn under a chosen id; a re-spawn resumes it (ONL-2196).
    const resume = this.opts.resume ?? this.spawnedSessionId;
    this.spawnedSessionId = resume ?? this.opts.sessionId;
    this.q = (this.opts.query ?? query)({
      prompt: this.prompts(),
      options: {
        cwd: wsl?.linuxPath ?? this.cwd,
        pathToClaudeCodeExecutable: wsl === undefined ? claudeExecutablePath() : 'claude',
        ...(wsl === undefined ? {} : { spawnClaudeCodeProcess: (options: import('@anthropic-ai/claude-agent-sdk').SpawnOptions) => startWslAgent('claude', options.args, this.cwd, { env: options.env, signal: options.signal }) }),
        // REPLACES the child env, no merge with `process.env`; `pinClaudeConfigDir` keeps a driven run's store scratch, not its login.
        env: claudeChildSdkEnv(),
        // Verbatim, no alias table. An explicit `model` OVERRIDES the one a resume restores; with no choice, `'default'` moves a resume off the model it was started on, which an SDK bump retires (ONL-2435).
        ...(resume === undefined
          ? {
              model: this.model ?? DEFAULT_MODEL,
              ...(this.opts.sessionId === undefined ? {} : { sessionId: this.opts.sessionId }),
            }
          : { resume, model: this.model ?? 'default' }),
        // Required for token-level deltas.
        includePartialMessages: true,
        // A classifier, not a bypass: under `bypassPermissions` the SDK approves everything before `canUseTool` is reached, which is why the destructive gate rides the hook instead (ONL-2190).
        permissionMode: this.permissionMode,
        // Required to start in bypass or to switch into it later from the composer; it changes nothing until bypass is chosen.
        allowDangerouslySkipPermissions: true,
        canUseTool: this.canUseTool as never,
        hooks: {
          PreToolUse: [{ hooks: [this.preToolUse as never] }],
          SessionStart: [{ hooks: [this.sessionStart as never] }],
        },
        mcpServers: {
          [STUDIO_MCP_SERVER]: studioToolServer({
            ...(this.opts.projectSetup ? { projectSetup: this.opts.projectSetup } : {}),
            ...(this.opts.onSaveAttachment ? { onSaveAttachment: this.opts.onSaveAttachment } : {}),
            ...(this.opts.onDeleteProjectFile ? { onDeleteProjectFile: this.opts.onDeleteProjectFile } : {}),
            onArtifact: (verb, input) => this.opts.onArtifact?.(verb, input) ??
              Promise.resolve({ ok: false as const, reason: 'No project is attached to this artifact session.' }),
            // Both forward: dropping `cwd` collapsed a monorepo's apps into one server-book entry with every suite green (ONL-1995).
            onServerRunning: (port, cwd) => this.opts.onServerRunning?.(port, cwd),
            onFrameWorking: (frameId, words) => this.opts.onFrameWorking?.(frameId, words),
            onWaitingOn: (what) => this.opts.onWaitingOn?.(what),
            onCreateProjectTab: () =>
              this.opts.onCreateProjectTab?.() ??
              Promise.resolve({ ok: false as const, reason: 'this session has no window to open a tab in' }),
            // No-sink degradation: each tool learns its work had nowhere to land,
            // rather than being handed a success nothing performed.
            onFrameUrl: (frameId, url) => this.opts.onFrameUrl?.(frameId, url) ?? noCanvas(),
            onSuggestNextTasks: (tasks) => this.opts.onSuggestNextTasks?.(tasks),
            onClipNextTaskPictures: (frameId, targets) =>
              this.opts.onClipNextTaskPictures?.(frameId, targets) ?? Promise.resolve(targets.map(() => ({ ok: false as const, reason: 'project-closed' as const }))),
            onRenameProject: (name) =>
              this.opts.onRenameProject?.(name) ??
              Promise.resolve({ ok: false as const, reason: 'no project is attached to this session' }),
            ...this.canvasSinks(),
          }),
        },
        allowedTools: [...STUDIO_AUTO_APPROVED_TOOLS],
        settingSources: ['user'],
        strictMcpConfig: !flagOn('connectors'),
        ...(Object.keys(project.agents).length === 0 ? {} : { agents: project.agents }),
        // A `Read` deny also blocks `cat`/`head`/`grep` on the path, and nothing more: `sh -c "cat .env"` still reads it; a boundary needs `sandbox.enabled` (ONL-1921).
        settings: {
          permissions: {
            deny: ['Read(./.env)', 'Read(./.env.*)', 'Read(**/.env)', 'Read(**/.env.*)'],
            ask: [...EXTERNALLY_VISIBLE_GIT_RULES, ...DESTRUCTIVE_GIT_RULES, 'mcp__studio__save_attachment'],
            // Studio's own, never the project's: `settingSources` leaves out the file the CLI writes a
            // grant to, so an always-allow would be forgotten at every spawn without this (ONL-2933).
            ...(allowRules.length === 0 ? {} : { allow: allowRules }),
          },
        },
        // Model-facing, never rendered, so not a `strings.ts` key.
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          ...(workspaceBriefing === '' ? {} : { append: workspaceBriefing }),
        },
      },
    });

    void this.q.setMcpPermissionModeOverride(STUDIO_MCP_SERVER, 'default').catch(
      (err: unknown) => {
        logger.error('could not scope the Studio MCP server permission mode; Studio mutations may not prompt', {
          server: STUDIO_MCP_SERVER,
          error: err,
        });
      },
    );

    void this.pump();
  }

  private async pump(): Promise<void> {
    if (!this.q) return;
    try {
      for await (const msg of this.q) {
        // Drained, never reduced: a late `result` would land behind `session.ended` (ONL-2254).
        if (this.closed) continue;
        if (msg.type === 'system' && (msg.subtype === 'commands_changed' || msg.subtype === 'init')) void this.publishSkills();
        // Before the streaming check, so a latched kill holds the state down.
        if (
          !this.turnOpen &&
          (msg.type === 'stream_event' ||
            msg.type === 'assistant' ||
            (msg.type === 'system' && msg.subtype === 'init'))
        ) {
          this.onCliTurn(msg.type === 'system');
        }
        if (this.undelivered.size > 0) {
          if (isTurnBoundary(msg)) this.lifecycle.dispatch({ type: 'boundary' });
          else if (this.lifecycle.boundarySeen && isRootMessageStart(msg)) {
            settleUndelivered(this.log, this.undelivered, 'delivered');
          }
        }
        // `stream_event`s keep arriving after `interrupt()` resolves; the state stays down until `result`.
        if ((msg.type === 'stream_event' || msg.type === 'assistant') && !this.interrupting) {
          this.setStreaming(true);
        }

        if (msg.type === 'assistant') {
          // A completed assistant message must not downgrade a parked call to `in_progress`.
          const message = (msg as { message?: { content?: unknown[] } }).message;
          const content = Array.isArray(message?.content) ? message.content : [];
          for (const raw of content) {
            const block = raw as { type?: string; id?: string; input?: unknown };
            if (block.type === 'tool_use' && block.id && this.parked.has(block.id)) {
              this.log.push({
                type: 'tool.update',
                toolCallId: block.id,
                input: block.input,
              });
            }
          }
          handleSdkMessage(
            this.log,
            {
              ...msg,
              message: {
                ...message,
                content: content.filter((raw) => {
                  const block = raw as { type?: string; id?: string };
                  return !(block.type === 'tool_use' && block.id && this.parked.has(block.id));
                }),
              },
            } as unknown as Record<string, unknown>,
            this.handleOptions(),
          );
        } else {
          handleSdkMessage(
            this.log,
            msg as unknown as Record<string, unknown>,
            this.handleOptions(),
          );
        }

        if (msg.type === 'result') {
          this.retryEventsFrom = this.log.events.length;
          settleUndelivered(this.log, this.undelivered, 'delivered');
          this.lastResultSubtype = msg.subtype;
          this.lifecycle.dispatch({ type: 'result' });
          // Last, and after `turn.ended` is already logged: the host releases a held
          // prompt on this falling edge, and it must find the turn closed (ONL-2294).
          this.setStreaming(false);
          this.emitState();
        }
      }
    } catch (err) {
      this.settleAll();
      settleUndelivered(this.log, this.undelivered, 'discarded');
      this.log.cancelOpenToolCalls(this.interrupting ? 'Interrupted' : 'Session error');
      if (!this.closed) {
        const ended = this.log.turnTally();
        if (ended !== undefined) {
          const stopReason = this.interrupting ? 'interrupted' : 'provider_error';
          const retries = retryTelemetry(this.log.events, HARNESSES.claude.countsRetryAttempts, this.retryEventsFrom);
          this.log.push({ type: 'turn.ended', turnId: ended.turnId, stopReason, isError: !this.interrupting, filesChanged: ended.filesChanged });
          this.opts.onTurnEnded?.({
            ...ended, stopReason, origin: this.turnOrigin,
            retryAttempts: retries.retry_observed_count,
            retryLastStatus: retries.retry_last_status,
            ...(retries.retry_error_kind === null ? {} : { retryErrorKind: retries.retry_error_kind }),
          });
        }
      }
      // No `result` reaches the reducer on this path, so its per-turn state is drained here.
      forgetTurnState(this.log);
      this.lifecycle.dispatch({ type: 'turn-abandoned' });
      this.setStreaming(false);
      this.emitState();
      this.q = undefined;

      // A teardown makes the SDK throw on the way out; surfaced, it banners every Stop.
      if (this.closed || this.interrupting) return;

      const message = String((err as Error)?.message ?? err);
      const code = classifySessionError(message);
      this.failed = true;
      this.log.push({
        type: 'session.error',
        message,
        code,
        detail: String((err as Error)?.stack ?? '').slice(0, 2000),
      });
      // The code only; the message can quote paths.
      // A transport death carries no HTTP status; the result path is where one exists (ONL-2463).
      this.opts.onError?.(code, null);
      // The composer stays connected, so its Retry can send (ONL-2196).
      if (code !== 'unknown') {
        this.opts.onConnection({ status: classifyError(message), detail: message, harness: 'claude' });
      }
    } finally {
      this.connectors?.close();
      this.connectorSignIn?.close();
      if (!this.closed) this.log.push({ type: 'session.settings', connectors: { servers: [], unavailable: true } });
    }
  }

  /** Rebuilt per message: a captured-once object goes stale on `interrupting`. */
  private handleOptions(): {
    interrupted: boolean;
    previousTotalCostUsd: number;
    onCost: (sample: CostSample) => void;
    onTurnEnded: (summary: TurnSummary) => void;
    onConnection: (connection: AgentConnection) => void;
    onError: (code: SessionErrorCode, apiErrorStatus: number | null) => void;
    captureImage: (bytes: Uint8Array) => ImageRef | null;
  } {
    return {
      interrupted: this.interrupting,
      previousTotalCostUsd: this.previousTotalCostUsd,
      onCost: (sample) => {
        this.previousTotalCostUsd = sample.totalCostUsd;
        this.opts.onCost?.(sample);
      },
      onTurnEnded: (summary) => {
        this.opts.onTurnEnded?.({ ...summary, origin: this.turnOrigin });
      },
      onError: (code, apiErrorStatus) => {
        this.opts.onError?.(code, apiErrorStatus);
      },
      onConnection: (connection) => {
        this.opts.onConnection(connection);
      },
      // An I/O throw would reach `pump()`'s catch and fail the session; `hold: false` because `tool.end` is logged in this same pass (ONL-1881).
      captureImage: (bytes) => {
        if (this.closed) return null;
        try {
          const stored = registerImage(this.cwd, bytes, { hold: false });
          return stored.ok ? stored.image : null;
        } catch {
          return null;
        }
      },
    };
  }

  private setStreaming(isStreaming: boolean): void {
    if (this.isStreaming === isStreaming) return;
    this.lifecycle.dispatch({ type: 'stream', value: isStreaming });
    this.emitState();
  }

  /** Its own emit: a request parking mid-turn moves nothing about streaming, and `setStreaming` would swallow it (ONL-2455). */
  private emitState(turnEnding = false): void {
    const needsAttention = this.needsAttention;
    const questionParkedSince = this.questionParkedSince;
    const turnWaitedMs = this.turnWaitedMs;
    if (
      this.lastState?.isStreaming === this.isStreaming &&
      this.lastState.needsAttention === needsAttention &&
      this.lastState.questionParkedSince === questionParkedSince &&
      this.lastState.turnWaitedMs === turnWaitedMs &&
      this.lastState.isTurnLive === this.turnOpen
    ) {
      return;
    }
    this.lastState = {
      isStreaming: this.isStreaming,
      needsAttention,
      questionParkedSince,
      turnWaitedMs,
      isTurnLive: this.turnOpen,
    };
    this.opts.onState({ ...this.lastState, midTurn: this.midTurn, ...(turnEnding ? { turnEnding: true } : {}) });
  }

  get unmappedTypes(): Record<string, number> {
    return Object.fromEntries(this.log.unmappedTypes);
  }
}
