import type {
  DeliveryOutcome,
  PromptOrigin,
  StudioEvent,
  ToolKind,
  ToolStatus,
  ToolFileChange,
} from '@studio/events';
import { CLAUDE_PRESENTATION } from './reduce.js';
import { CAPTURE_FRAME_TOOL, CREATE_PROJECT_TAB_TOOL, EVALUATE_IN_FRAME_TOOL, LIST_FRAMES_TOOL, READ_FRAME_TOOL, SET_FRAME_URL_TOOL, STUDIO_MCP_SERVER } from './tool-names.js';
import { reportWrittenPaths } from './written-paths.js';
import { toolFileChanges } from './tool-file-changes.js';
import { TurnWatchdog } from './turn-watchdog.js';
import { emptyToolKindCounts, emptyUnfinishedByKind, turnToolKind, type TurnToolKind, type TurnToolKindCounts, type UnfinishedByKind, type UnfinishedOutcome } from './turn-tool-kinds.js';

const FRAME_INSPECTION_TOOLS: ReadonlySet<string> = new Set([CAPTURE_FRAME_TOOL, EVALUATE_IN_FRAME_TOOL, LIST_FRAMES_TOOL, READ_FRAME_TOOL]);

// Presented as edits in the chat; they change no file (ONL-2857).
const NAVIGATION_TOOLS: ReadonlySet<string> = new Set([SET_FRAME_URL_TOOL, CREATE_PROJECT_TAB_TOOL]);

// Distributive: a plain `Omit` collapses the union, and `push({type:'tool.end'})` compiles without `toolCallId`.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type EventInput = DistributiveOmit<
  StudioEvent,
  'sessionId' | 'eventId' | 'seq' | 'ts'
>;

export type AnnounceSource = 'hook' | 'permission' | 'assistant' | 'stream';

/** `present()` may rewrite `name`: `classify.ts` keys off `Bash`, and codex sends `bash` (ONL-2018). */
export interface EventPresentation {
  present(
    name: string,
    input: unknown,
    cwd: string,
  ): { name: string; kind: ToolKind; title: string; target?: string; changedTargets?: string[] };
  resultLanguage(kind: ToolKind, name: string): string;
  diffStats(name: string, input: unknown): { additions?: number; deletions?: number };
}

export type BlockKind = 'text' | 'thinking';

function completeStringFields(partialJson: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of partialJson.matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    try {
      fields[JSON.parse(`"${match[1] ?? ''}"`) as string] = JSON.parse(
        `"${match[2] ?? ''}"`,
      ) as string;
    } catch {
      // An escape the regex accepted but JSON does not.
    }
  }
  return fields;
}

/** Counts only; the telemetry guardrail allows volume, never content. */
export interface TurnTally {
  turnId: string;
  durationMs: number;
  toolCallCount: number;
  mcpToolCallCount: number;
  permissionRequestCount: number;
  permissionDeniedCount: number;
  promptChars: number;
  responseChars: number;
  filesChanged: number;
  /** Completed `execute` targets — every command, not only a writing one (ONL-2463). */
  executeTargets: number;
  /** Of `durationMs`, the part spent holding a question for the designer (ONL-2295). */
  waitedMs: number;
  hadFailedEdit: boolean;
  hadQuestion: boolean;
  userMessages?: number;
  hadPlan?: boolean;
  attemptedFrameInspection?: boolean;
  hadProviderStall?: boolean;
  toolKinds?: TurnToolKindCounts;
  failedToolCount?: number;
  deniedToolCount?: number;
  canceledToolCount?: number;
  inSubagentToolCount?: number;
  unfinishedByKind?: UnfinishedByKind;
}

export type TurnCallOutcome = 'completed' | 'failed' | 'denied' | 'canceled';

export interface SessionEndSummary {
  reason: 'completed' | 'error' | 'interrupted' | 'max_turns';
  durationMs: number;
  turnCount: number;
  /** The last cumulative figure the backend reported. Absent when no turn cost anything, or when it reports no cost at all. */
  totalCostUsd?: number;
}

/** A turn the session teardown killed, kept separable from a user's own Stop (ONL-2463). */
export const SESSION_CLOSED = 'session_closed';

/** What a backend reports about a finished turn: counts, lengths and enumerated ids, never content. */
export interface TurnSummary extends TurnTally {
  /** The backend's own terminal word for the turn, from its closed set. */
  stopReason?: string;
  /** Absent reads as the user's, the same polarity `isUserSpoken` uses (ONL-2463). */
  origin?: PromptOrigin;
  /** Claude reports attempt counts; Codex's retry notifications provide observations, not an attempt ordinal. */
  retryAttempts?: number | null;
  retryObservedCount?: number;
  retryLastStatus?: number | null;
  retryErrorKind?: string;
}

function freshTally() {
  return {
    toolCallCount: 0,
    permissionRequestCount: 0,
    permissionDeniedCount: 0,
    promptChars: 0,
    responseChars: 0,
    hadFailedEdit: false,
    hadQuestion: false,
    userMessages: 0,
    hadPlan: false,
    attemptedFrameInspection: false,
    toolKinds: emptyToolKindCounts(),
  };
}

// A replayed `session.settings` catalog would re-announce a dead session's list over the live one (ONL-2115).
function replayable(row: StudioEvent): StudioEvent {
  if (row.type !== 'session.settings' || row.models === undefined) return row;
  const { models: _catalog, ...rest } = row;
  return rest;
}

export interface TurnObservationOptions {
  onTurnStarted?: (turnId: string, origin: PromptOrigin) => void;
  onTurnStalled?: (turnId: string, silentMs: number) => void;
}

export interface EventLogOptions extends TurnObservationOptions {
  sessionId: string;
  cwd: string;
  emit: (event: StudioEvent) => void;
  /** Dev only: triples the payload crossing IPC. */
  keepRaw?: boolean;
  presentation?: EventPresentation;
  connectorToolNames?: () => boolean;
  onToolFailed?: (name: string, result: string) => string | undefined;
}

export class EventLog {
  readonly events: StudioEvent[] = [];
  readonly sessionId: string;
  readonly cwd: string;

  private readonly emit: (event: StudioEvent) => void;
  private readonly presentation: EventPresentation;
  private readonly keepRaw: boolean;
  private restoring = false;
  private seq = 0;
  private eventCounter = 0;

  private readonly announced = new Set<string>();
  private readonly ended = new Set<string>();
  private readonly approvalRows = new Set<string>();
  private readonly signInFailed = new Set<string>();
  private readonly startedAt = new Map<string, number>();
  private readonly waitedMs = new Map<string, number>();
  private readonly toolNames = new Map<string, string>();
  /** Diff stats at `tool.end` read this; the result payload has no `old_string`/`new_string`. */
  private readonly toolInputs = new Map<string, unknown>();
  private readonly toolPresentations = new Map<string, ReturnType<EventPresentation['present']>>();
  readonly unmappedTypes = new Map<string, number>();

  private readonly openBlocks = new Map<string, string>();
  private readonly blockKinds = new Map<string, BlockKind>();
  private readonly toolBlocks = new Map<
    string,
    { toolCallId: string; partialJson: string; targeted: boolean }
  >();
  private blockCounter = 0;
  private turnCounter = 0;
  private currentTurnId = 't0';
  private turnStartedAt?: number;
  private turnWaited = 0;
  private questionParkedAt?: number;
  private tallyCounts = freshTally();
  private readonly mcpToolCalls = new Set<string>();
  private readonly toolCallKinds = new Map<string, TurnToolKind>();
  private readonly turnCallOutcomes = new Map<string, TurnCallOutcome | 'open'>();
  private readonly turnSubagentCalls = new Set<string>();
  private mcpServerNames: string[] = [];
  private planMode = false;
  private changedTargets = new Set<string>();
  private readonly fileChanges = new Map<string, Map<string, ToolFileChange>>();
  private executeTargets = new Set<string>();
  private readonly watchdog: TurnWatchdog;
  private readonly onTurnStarted?: TurnObservationOptions['onTurnStarted'];
  private readonly onToolFailed?: EventLogOptions['onToolFailed'];
  private readonly connectorToolNames?: EventLogOptions['connectorToolNames'];

  constructor(options: EventLogOptions) {
    this.sessionId = options.sessionId;
    this.cwd = options.cwd;
    this.emit = options.emit;
    this.keepRaw = options.keepRaw ?? false;
    this.presentation = options.presentation ?? CLAUDE_PRESENTATION;
    this.onTurnStarted = options.onTurnStarted;
    this.onToolFailed = options.onToolFailed;
    this.connectorToolNames = options.connectorToolNames;
    this.watchdog = new TurnWatchdog(options.onTurnStalled === undefined ? undefined : (silentMs) => options.onTurnStalled?.(this.currentTurnId, silentMs));
  }

  get lastSeq(): number {
    return this.seq;
  }

  private presentTool(name: string, input: unknown): ReturnType<EventPresentation['present']> {
    const presented = this.presentation.present(name, input, this.cwd);
    if (!this.connectorToolNames?.() || !presented.name.startsWith('mcp__')) return presented;
    const explicit = name === 'mcpToolCall' ? (input as { server?: unknown } | null)?.server : undefined;
    const server = typeof explicit === 'string' ? explicit : this.mcpServerNames.find((candidate) => presented.name.startsWith(`mcp__${candidate}__`)) ?? presented.name.split('__')[1];
    if (!server || server === STUDIO_MCP_SERVER) return presented;
    const tool = presented.name.slice(`mcp__${server}__`.length).replace(/_/g, ' ');
    return { ...presented, title: server, target: `${server}: ${tool}` };
  }

  get isRestoringTranscript(): boolean { return this.restoring; }

  since(sinceSeq?: number): StudioEvent[] {
    if (sinceSeq == null) return [...this.events];
    return this.events.filter((e) => e.seq > sinceSeq);
  }

  /** Rows are restamped (a foreign sessionId wipes the renderer's buffer, a low seq reads as seen) and emitted (ONL-2124, ONL-2125). */
  restore(rows: readonly StudioEvent[]): void {
    this.restoring = true;
    try { this.restoreRows(rows); }
    finally { this.restoring = false; }
  }

  private restoreRows(rows: readonly StudioEvent[]): void {
    const open = new Map<string, { name: string; kind: ToolKind }>();
    const unsettled = new Set<string>();
    for (const row of rows) {
      if ('turnId' in row && /^t\d+$/.test(row.turnId)) {
        const counter = Number(row.turnId.slice(1));
        if (Number.isSafeInteger(counter)) this.turnCounter = Math.max(this.turnCounter, counter);
      }
      if ('blockId' in row && /^b\d+$/.test(row.blockId)) {
        const counter = Number(row.blockId.slice(1));
        if (Number.isSafeInteger(counter)) this.blockCounter = Math.max(this.blockCounter, counter);
      }
      const full = {
        ...replayable(row),
        sessionId: this.sessionId,
        cwd: this.cwd,
        eventId: `e${++this.eventCounter}`,
        seq: ++this.seq,
      } as StudioEvent;
      this.events.push(full);
      this.emit(full);
      if (full.type === 'tool.start') open.set(full.toolCallId, { name: full.name, kind: full.kind });
      if (full.type === 'tool.end') open.delete(full.toolCallId);
      if (full.type === 'message.user' && full.delivery !== undefined && full.messageId !== undefined) unsettled.add(full.messageId);
      if (full.type === 'message.delivery') unsettled.delete(full.messageId);
    }
    for (const messageId of unsettled) {
      this.push({ type: 'message.delivery', messageId, outcome: 'discarded' });
    }
    // A row persisted open would spin forever; nothing in this session ends it.
    for (const [toolCallId, { name, kind }] of open) {
      this.push({
        type: 'tool.end',
        toolCallId,
        status: 'canceled',
        errorMessage: 'Session ended',
        resultLanguage: this.presentation.resultLanguage(kind, name),
      });
    }
  }

  push(event: EventInput): StudioEvent {
    this.watchdog.observe(event);
    this.observeForTally(event);
    const full = {
      ...event,
      sessionId: this.sessionId,
      cwd: this.cwd,
      eventId: `e${++this.eventCounter}`,
      seq: ++this.seq,
      ts: Date.now(),
      raw: this.keepRaw ? event.raw : undefined,
    } as StudioEvent;
    this.events.push(full);
    this.emit(full);
    return full;
  }

  get isTurnLive(): boolean {
    return this.turnStartedAt !== undefined;
  }

  beginTurn(origin: PromptOrigin = 'user'): string {
    this.currentTurnId = `t${++this.turnCounter}`;
    this.turnStartedAt = Date.now();
    this.turnWaited = 0;
    this.questionParkedAt = undefined;
    this.tallyCounts = freshTally();
    this.mcpToolCalls.clear();
    this.toolCallKinds.clear();
    this.turnCallOutcomes.clear();
    this.turnSubagentCalls.clear();
    this.tallyCounts.hadPlan = this.planMode;
    this.changedTargets = new Set();
    this.fileChanges.clear();
    this.executeTargets = new Set();
    this.watchdog.start();
    this.onTurnStarted?.(this.currentTurnId, origin);
    return this.currentTurnId;
  }

  /** Held while the turn is waiting on Studio rather than on the provider (ONL-2925). */
  holdTurnSilence(): void {
    this.watchdog.hold();
  }

  releaseTurnSilence(): void {
    this.watchdog.release();
  }

  /** Earliest park wins: a second question parking does not move the moment the pause began (ONL-2295). */
  parkQuestion(at: number): void {
    this.questionParkedAt ??= at;
  }

  /** Called when the last question clears, so the banked total excludes nothing and double-counts nothing. */
  unparkQuestion(at = Date.now()): void {
    if (this.questionParkedAt === undefined) return;
    this.turnWaited += Math.max(0, at - this.questionParkedAt);
    this.questionParkedAt = undefined;
  }

  get questionParkedSince(): number | undefined {
    return this.questionParkedAt;
  }

  /** Settled, never `?? now`: a reader during the pause gets the banked total and the anchor separately (ONL-2295). */
  get turnWaitedMs(): number {
    return this.turnWaited;
  }

  get turnId(): string {
    return this.currentTurnId;
  }

  get turnCount(): number {
    return this.turnCounter;
  }

  private observeForTally(event: EventInput): void {
    switch (event.type) {
      case 'session.started':
      case 'session.settings':
        if (event.permissionMode !== undefined) this.planMode = event.permissionMode === 'plan';
        if (this.turnStartedAt !== undefined && this.planMode) this.tallyCounts.hadPlan = true;
        return;
      case 'message.user':
        this.tallyCounts.promptChars += event.text.length;
        if (event.origin !== 'studio') this.tallyCounts.userMessages += 1;
        return;
      case 'text.delta':
        this.tallyCounts.responseChars += event.delta.length;
        return;
      case 'tool.start':
        if (this.approvalRows.has(event.toolCallId)) return;
        if (!this.mcpToolCalls.has(event.toolCallId)) this.tallyCounts.toolCallCount += 1;
        this.noteMcpToolCall(event.toolCallId,
          this.mcpServerNames.find((server) => event.name.startsWith(`mcp__${server}__`)) ??
          /^mcp__(.+?)__.+$/.exec(event.name)?.[1]);
        if (FRAME_INSPECTION_TOOLS.has(event.name)) this.tallyCounts.attemptedFrameInspection = true;
        if (this.turnStartedAt === undefined) return;
        this.turnCallOutcomes.set(event.toolCallId, 'open');
        this.classifyToolCall(event.toolCallId, event.name);
        this.noteSubagentCall(event.toolCallId, event.parentToolUseId ?? event.agentId);
        return;
      case 'permission.requested':
        this.tallyCounts.permissionRequestCount += 1;
        if ((event.questions?.length ?? 0) > 0) this.tallyCounts.hadQuestion = true;
        return;
      case 'permission.resolved':
        if (event.outcome === 'deny') this.tallyCounts.permissionDeniedCount += 1;
        return;
      case 'tool.end': {
        if (this.approvalRows.has(event.toolCallId)) return;
        const presented = this.toolPresentations.get(event.toolCallId);
        const name = this.toolNames.get(event.toolCallId);
        if (event.status === 'completed' && (name === 'ExitPlanMode' || name === 'update_plan')) this.tallyCounts.hadPlan = true;
        const edits =
          presented !== undefined &&
          (presented.kind === 'edit' || presented.kind === 'delete') &&
          !NAVIGATION_TOOLS.has(presented.name);
        if (event.status === 'failed' && edits) this.tallyCounts.hadFailedEdit = true;
        this.settleCallOutcome(event.toolCallId, event.status);
        // Completed only: a denied or canceled edit changed nothing (ONL-2286).
        if (event.status !== 'completed') return;
        // Only the correlated tool input names the completed write's files (ONL-2563).
        reportWrittenPaths(
          this.cwd,
          this.toolNames.get(event.toolCallId) ?? '',
          this.toolInputs.get(event.toolCallId),
        );
        if (presented?.target === undefined) return;
        if (edits) {
          for (const target of presented.changedTargets ?? [presented.target]) this.changedTargets.add(target);
        }
        // Counted apart, never folded in: `changedTargets` cannot see a write a command made (ONL-2463).
        if (presented.kind === 'execute') this.executeTargets.add(presented.target);
        return;
      }
      default:
        return;
    }
  }

  get turnFilesChanged(): number {
    return this.changedTargets.size;
  }

  notePlan(): void {
    if (this.turnStartedAt === undefined) return;
    this.tallyCounts.hadPlan = true;
    this.noteToolUse('plan');
  }

  private classifyToolCall(toolCallId: string, name: string): void {
    const previous = this.toolCallKinds.get(toolCallId);
    const next = this.mcpToolCalls.has(toolCallId) ? undefined : turnToolKind(name);
    if (previous === next) return;
    if (previous !== undefined) this.tallyCounts.toolKinds[previous] -= 1;
    if (next === undefined) {
      this.toolCallKinds.delete(toolCallId);
      return;
    }
    this.tallyCounts.toolKinds[next] += 1;
    this.toolCallKinds.set(toolCallId, next);
  }

  private noteToolUse(kind: TurnToolKind): void {
    this.tallyCounts.toolKinds[kind] += 1;
  }

  private settleCallOutcome(toolCallId: string, status: string): void {
    if (this.turnCallOutcomes.get(toolCallId) !== 'open') return;
    if (status === 'completed' || status === 'failed' || status === 'denied' || status === 'canceled') this.turnCallOutcomes.set(toolCallId, status);
  }

  private noteSubagentCall(toolCallId: string, subagent: string | undefined): void {
    if (subagent !== undefined && this.turnCallOutcomes.has(toolCallId)) this.turnSubagentCalls.add(toolCallId);
  }

  openUnrowedCall(toolCallId: string, kind?: TurnToolKind): void {
    if (this.turnStartedAt === undefined || this.turnCallOutcomes.has(toolCallId)) return;
    this.turnCallOutcomes.set(toolCallId, 'open');
    if (kind === undefined) return;
    this.noteToolUse(kind);
    this.toolCallKinds.set(toolCallId, kind);
  }

  endUnrowedCall(toolCallId: string, outcome: TurnCallOutcome): void {
    this.settleCallOutcome(toolCallId, outcome);
  }

  private outcomeCounts(): Pick<TurnTally, 'failedToolCount' | 'deniedToolCount' | 'canceledToolCount' | 'inSubagentToolCount' | 'unfinishedByKind'> {
    const unfinishedByKind = emptyUnfinishedByKind();
    for (const [toolCallId, outcome] of this.turnCallOutcomes) {
      if (outcome === 'completed') continue;
      const kind = this.toolCallKinds.get(toolCallId) ?? (this.mcpToolCalls.has(toolCallId) ? 'external_mcp' : 'other');
      unfinishedByKind[outcome === 'open' ? 'canceled' : outcome][kind] += 1;
    }
    const total = (outcome: UnfinishedOutcome): number => Object.values(unfinishedByKind[outcome]).reduce((sum, count) => sum + count, 0);
    return {
      failedToolCount: total('failed'),
      deniedToolCount: total('denied'),
      canceledToolCount: total('canceled'),
      inSubagentToolCount: this.turnSubagentCalls.size,
      unfinishedByKind,
    };
  }

  setMcpServerNames(names: string[]): void {
    this.mcpServerNames = [...names].sort((left, right) => right.length - left.length);
  }

  noteMcpToolCall(toolCallId: string, server: string | undefined): boolean {
    if (this.turnStartedAt === undefined || !server || server === STUDIO_MCP_SERVER) return false;
    this.mcpToolCalls.add(toolCallId);
    return true;
  }

  /** Reports once: the CLI re-runs a queued message after Stop, and that second result must not reach telemetry (ONL-2180). */
  turnTally(): TurnTally | undefined {
    if (this.turnStartedAt === undefined) return undefined;
    const tally = {
      turnId: this.currentTurnId,
      durationMs: Date.now() - this.turnStartedAt,
      ...this.tallyCounts,
      toolKinds: { ...this.tallyCounts.toolKinds },
      ...this.outcomeCounts(),
      mcpToolCallCount: this.mcpToolCalls.size,
      filesChanged: this.changedTargets.size,
      executeTargets: this.executeTargets.size,
      waitedMs: this.turnWaited,
      hadProviderStall: this.watchdog.stop(),
    };
    this.turnStartedAt = undefined;
    return tally;
  }

  /** An opaque id: `stream_event.event.index` restarts at 0 per assistant message and collided as a React key. */
  openBlock(slot: string, kind?: BlockKind): string {
    const id = `b${++this.blockCounter}`;
    this.openBlocks.set(slot, id);
    if (kind) this.blockKinds.set(slot, kind);
    else this.blockKinds.delete(slot);
    return id;
  }

  currentBlock(slot: string): string | undefined {
    return this.openBlocks.get(slot);
  }

  blockKind(slot: string): BlockKind | undefined {
    return this.blockKinds.get(slot);
  }

  closeBlock(slot: string): void {
    this.openBlocks.delete(slot);
    this.blockKinds.delete(slot);
    this.toolBlocks.delete(slot);
  }

  openToolBlock(slot: string, toolCallId: string): void {
    this.toolBlocks.set(slot, { toolCallId, partialJson: '', targeted: false });
  }

  streamToolInput(slot: string, partialJson: string): void {
    const block = this.toolBlocks.get(slot);
    if (!block || block.targeted) return;
    block.partialJson += partialJson;
    // No quote in this chunk, no field closed; rescanning per delta re-parses a long Bash command.
    if (!partialJson.includes('"')) return;
    const name = this.toolNames.get(block.toolCallId);
    if (!name) return;
    const input = completeStringFields(block.partialJson);
    const presented = this.presentTool(name, input);
    if (!presented.target) return;
    block.targeted = true;
    this.push({
      type: 'tool.update',
      toolCallId: block.toolCallId,
      input,
      title: presented.title,
      target: presented.target,
      fileChanges: this.fileChangesFor(block.toolCallId, name, input),
    });
  }

  hasAnnounced(toolCallId: string): boolean {
    return this.announced.has(toolCallId);
  }

  private fileChangesFor(toolCallId: string, name: string, input: unknown): ToolFileChange[] {
    const known = this.fileChanges.get(toolCallId) ?? new Map<string, ToolFileChange>();
    for (const change of toolFileChanges(name, input, this.cwd, undefined, known)) {
      known.set(change.path, change);
    }
    this.fileChanges.set(toolCallId, known);
    return [...known.values()];
  }

  hasEnded(toolCallId: string): boolean {
    return this.ended.has(toolCallId);
  }

  toolName(toolCallId: string): string | undefined {
    return this.toolNames.get(toolCallId);
  }

  addWaited(toolCallId: string, ms: number): void {
    this.waitedMs.set(toolCallId, (this.waitedMs.get(toolCallId) ?? 0) + ms);
  }

  /** True only from the call that emitted the `tool.start`. */
  ensureToolStart(
    toolCallId: string,
    name: string,
    input: unknown,
    status: ToolStatus,
    opts: {
      source: AnnounceSource;
      parentToolUseId?: string;
      agentId?: string;
      raw?: unknown;
      provisional?: boolean;
      approvalOnly?: boolean;
    },
  ): boolean {
    if (this.announced.has(toolCallId)) {
      if (this.signInFailed.has(toolCallId)) return false;
      if (opts.provisional) return false;
      // No status from a late announcer (it downgrades `in_progress` to `pending`), except the
      // first real one after a provisional row, and never after `tool.end` (it resurrects a canceled row).
      const claimsLifecycle = !this.startedAt.has(toolCallId) && !this.ended.has(toolCallId);
      if (claimsLifecycle) this.startedAt.set(toolCallId, Date.now());
      this.toolInputs.set(toolCallId, input);
      const refreshed = this.presentTool(name, input);
      if (!this.ended.has(toolCallId) && FRAME_INSPECTION_TOOLS.has(refreshed.name)) this.tallyCounts.attemptedFrameInspection = true;
      if (!this.ended.has(toolCallId) && this.toolCallKinds.has(toolCallId)) this.classifyToolCall(toolCallId, refreshed.name);
      this.noteSubagentCall(toolCallId, opts.parentToolUseId ?? opts.agentId);
      this.toolPresentations.set(toolCallId, refreshed);
      this.push({
        type: 'tool.update',
        toolCallId,
        ...(claimsLifecycle ? { status } : {}),
        input,
        title: refreshed.title,
        target: refreshed.target,
        fileChanges: this.fileChangesFor(toolCallId, name, input),
      });
      return false;
    }

    const presented = this.presentTool(name, input);

    this.announced.add(toolCallId);
    if (opts.approvalOnly) this.approvalRows.add(toolCallId);
    if (!opts.provisional) this.startedAt.set(toolCallId, Date.now());
    // The presented name: codex's wire name differs, and `endTool` reads this back.
    this.toolNames.set(toolCallId, presented.name);
    this.toolInputs.set(toolCallId, input);
    this.toolPresentations.set(toolCallId, presented);

    this.push({
      type: 'tool.start',
      toolCallId,
      name: presented.name,
      kind: presented.kind,
      status,
      input,
      source: opts.source,
      parentToolUseId: opts.parentToolUseId,
      agentId: opts.agentId,
      title: presented.title,
      target: presented.target,
      fileChanges: this.fileChangesFor(toolCallId, name, input),
      raw: opts.raw,
    });
    return true;
  }

  endTool(
    toolCallId: string,
    status: 'completed' | 'failed' | 'denied' | 'canceled',
    extra: {
      result?: string;
      isError?: boolean;
      errorMessage?: string;
      images?: import('@studio/events').ImageRef[];
    } = {},
  ): void {
    // Terminal-once: after a deny the SDK synthesizes a `tool_result` that would map to `failed` over `denied`.
    if (this.ended.has(toolCallId)) return;
    this.ended.add(toolCallId);

    const name = this.toolNames.get(toolCallId) ?? 'unknown';
    const signInMessage = status === 'failed' ? this.onToolFailed?.(name, extra.result ?? extra.errorMessage ?? '') : undefined;
    if (signInMessage !== undefined) {
      this.signInFailed.add(toolCallId);
      this.push({ type: 'tool.update', toolCallId, title: signInMessage, target: signInMessage });
      extra = { ...extra, result: signInMessage, errorMessage: signInMessage };
    }
    const started = this.startedAt.get(toolCallId);
    const durationMs = started == null ? undefined : Date.now() - started;
    const waited = this.waitedMs.get(toolCallId) ?? 0;

    this.push({
      type: 'tool.end',
      toolCallId,
      status,
      durationMs,
      waitedMs: waited || undefined,
      // Clamped at 0 because the two clocks are sampled independently.
      ranMs: durationMs == null ? undefined : Math.max(0, durationMs - waited),
      resultLanguage: this.presentation.resultLanguage(
        this.toolPresentations.get(toolCallId)?.kind ?? 'other',
        name,
      ),
      ...this.presentation.diffStats(name, this.toolInputs.get(toolCallId)),
      ...extra,
    });
  }

  openToolCalls(): string[] {
    return [...this.announced].filter((id) => !this.ended.has(id));
  }

  cancelOpenToolCalls(errorMessage: string): void {
    for (const toolCallId of this.openToolCalls()) {
      this.endTool(toolCallId, 'canceled', { errorMessage });
    }
  }

  noteUnmapped(type: string): void {
    this.unmappedTypes.set(type, (this.unmappedTypes.get(type) ?? 0) + 1);
  }
}

export function settleUndelivered(
  log: EventLog,
  undelivered: Set<string>,
  outcome: DeliveryOutcome,
): void {
  for (const messageId of undelivered) {
    log.push({ type: 'message.delivery', messageId, outcome });
  }
  undelivered.clear();
}
