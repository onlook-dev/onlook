import type {
  AgentConnection,
  EffortLevel,
  ModelChoice,
  PermissionMode,
  PermissionOption,
  PromptAttachment,
  PromptOrigin,

  StudioEvent,
  ToolKind,
  ToolStatus,
  TurnTokens,
  WelcomeProject,
} from '@studio/events';
import { log as makeLog } from '../../log/index.js';
import type { AgentBackend, BackendState, ModelPick } from '../backend.js';
import { EventLog } from '../event-log.js';
import type { TurnSummary } from '../event-log.js';
import { StdioRpc, type RpcHandlers } from './rpc.js';

const logger = makeLog('agent-host');

/** ACP v1's tool kinds, which happen to be the chat's own (`ToolKind` in packages/events). */
const ACP_TOOL_KINDS: ReadonlySet<string> = new Set(['read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'other']);

const TERMINAL_TOOL_STATUS: ReadonlySet<string> = new Set(['completed', 'failed']);

export interface AcpSessionOptions {
  readonly cwd: string;
  /** The `opencode` executable, resolved by the caller so this module does no PATH walking. */
  readonly bin: string;
  readonly onEvent: (event: StudioEvent) => void;
  readonly onState: (state: BackendState) => void;
  readonly onConnection: (connection: AgentConnection) => void;
  readonly onTurnEnded?: (summary: TurnSummary) => void;
  readonly onTurnStarted?: (turnId: string, origin: PromptOrigin) => void;
  readonly onTurnStalled?: (turnId: string, silentMs: number) => void;
  readonly onEnded?: (end: { reason: 'completed' | 'error' | 'interrupted' | 'max_turns'; durationMs: number; turnCount: number }) => void;
  readonly onExited?: () => void;
  readonly model?: string;
  readonly restoredEvents?: readonly StudioEvent[];
  readonly keepRaw?: boolean;
}

interface ConfigOption {
  id?: string;
  name?: string;
  category?: string;
  type?: string;
  currentValue?: string;
  options?: readonly { value?: string; name?: string; description?: string }[];
}

interface SessionNewResult {
  sessionId?: string;
  configOptions?: readonly ConfigOption[];
  modes?: { currentModeId?: string; availableModes?: readonly { id?: string; name?: string }[] };
  models?: { currentModelId?: string; availableModels?: readonly { modelId?: string; name?: string; description?: string }[] };
}

interface AcpUpdate {
  sessionUpdate?: string;
  [key: string]: unknown;
}

interface PendingPermission {
  rpcId: number | string;
  toolCallId: string;
  toolName: string;
  options: readonly PermissionOption[];
}

/**
 * ACP sends one content block on a chunk and an array of them on a tool result, so both shapes
 * reach this: `{ type: 'text', text }` is the only one that becomes words.
 */
function textOfContent(content: unknown): string {
  if (typeof content === 'string') return content;
  const one = (entry: unknown): string => {
    const block = entry as { type?: unknown; text?: unknown } | null;
    return block?.type === 'text' && typeof block.text === 'string' ? block.text : '';
  };
  if (Array.isArray(content)) return content.map(one).filter((part) => part !== '').join('\n');
  return one(content);
}

function tokensFrom(usage: unknown, held: { used?: number; size?: number }): TurnTokens | undefined {
  const record = usage as Record<string, unknown> | null | undefined;
  const input = typeof record?.['inputTokens'] === 'number' ? record['inputTokens'] : undefined;
  const output = typeof record?.['outputTokens'] === 'number' ? record['outputTokens'] : undefined;
  const total = typeof record?.['totalTokens'] === 'number' ? record['totalTokens'] : undefined;
  const reasoning = typeof record?.['thoughtTokens'] === 'number' ? record['thoughtTokens'] : undefined;
  const cached = typeof record?.['cachedReadTokens'] === 'number' ? record['cachedReadTokens'] : undefined;
  if (input === undefined && output === undefined && total === undefined && held.used === undefined) return undefined;
  return {
    ...(input === undefined ? {} : { input }),
    ...(cached === undefined ? {} : { cachedInput: cached }),
    ...(output === undefined ? {} : { output }),
    ...(reasoning === undefined ? {} : { reasoningOutput: reasoning }),
    ...(total === undefined ? {} : { total }),
    ...(held.used === undefined ? {} : { context: held.used }),
    ...(held.size === undefined ? {} : { contextWindow: held.size }),
  };
}

/**
 * Drives one `opencode acp` child: `initialize`, `session/new`, then one `session/prompt` per turn.
 * ACP carries structured updates, so the chat's tool cards and thinking blocks are real rather than
 * scraped — which is the whole reason opencode is a Harness and not a terminal.
 */
export class AcpSession implements AgentBackend {
  readonly id = `p${Date.now().toString(36)}`;
  readonly harness = 'acp' as const;
  readonly cwd: string;
  readonly midTurn = 'refuse' as const;

  private readonly log: EventLog;
  private readonly opts: AcpSessionOptions;
  private peer?: StdioRpc;
  private sessionId?: string;
  private streaming = false;
  private model?: string;
  /** ACP has no question protocol: a permission request is the only way an agent parks anything. */
  private readonly permissions = new Map<string, PendingPermission>();
  private readonly openTools = new Map<string, { name: string; startedAt: number; status: ToolStatus }>();
  private readonly blocks = new Map<'text' | 'thinking', { blockId: string; text: string }>();
  private contextWindow: { used?: number; size?: number } = {};
  private turnCostUsd?: number;
  private lastTurn?: { id: string };
  private closed = false;

  constructor(options: AcpSessionOptions) {
    this.opts = options;
    this.cwd = options.cwd;
    this.model = options.model;
    this.log = new EventLog({
      sessionId: this.id,
      cwd: options.cwd,
      emit: options.onEvent,
      keepRaw: options.keepRaw ?? false,
      onTurnStarted: options.onTurnStarted,
      onTurnStalled: options.onTurnStalled,
    });
    if (options.restoredEvents !== undefined && options.restoredEvents.length > 0) {
      this.log.restore(options.restoredEvents);
    }
  }

  get events(): readonly StudioEvent[] {
    return this.log.events;
  }

  get isRestoringTranscript(): boolean {
    return this.log.isRestoringTranscript;
  }

  get lastSeq(): number {
    return this.log.lastSeq;
  }

  get isStreaming(): boolean {
    return this.streaming;
  }

  get isTurnLive(): boolean {
    return this.log.isTurnLive;
  }

  get needsAttention(): boolean {
    return this.permissions.size > 0;
  }

  get turnWaitedMs(): number {
    return this.log.turnWaitedMs;
  }

  get questionParkedSince(): number | undefined {
    return this.log.questionParkedSince;
  }

  eventsSince(sinceSeq?: number): StudioEvent[] {
    return this.log.since(sinceSeq);
  }

  welcome(workspace: WelcomeProject): void {
    this.log.push({ type: 'session.welcome', workspace });
  }

  open(): void {
    void this.connect();
  }

  private publishState(): void {
    this.opts.onState({
      isStreaming: this.streaming,
      midTurn: 'refuse',
      needsAttention: this.permissions.size > 0,
      isTurnLive: this.log.isTurnLive,
      turnWaitedMs: this.log.turnWaitedMs,
    });
  }

  private async connect(): Promise<void> {
    const handlers: RpcHandlers = {
      onNotification: (method, params) => this.onNotification(method, params),
      onRequest: (id, method, params) => this.onRequest(id, method, params),
      onExit: (code) => {
        this.opts.onConnection({ status: 'error', harness: 'opencode', detail: `opencode exited (${String(code ?? 'signal')})` });
        this.opts.onExited?.();
        this.endTurn('error', 'the agent process exited');
      },
      onStderr: (text) => logger.debug('opencode acp stderr', { text: text.slice(0, 500) }),
    };

    const peer = new StdioRpc(this.opts.bin, ['acp', '--cwd', this.cwd], { cwd: this.cwd, deadlineMs: 120_000 }, handlers);
    this.peer = peer;

    try {
      await peer.request('initialize', {
        protocolVersion: 1,
        clientCapabilities: {
          // The agent may ask us to read or write files and run terminals; it does its own I/O today,
          // so these stay false rather than promising methods we do not implement.
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
        },
      });

      const created = (await peer.request('session/new', { cwd: this.cwd, mcpServers: [] })) as SessionNewResult;
      this.sessionId = created.sessionId;
      const advertised = this.modelChoices(created);
      const current = created.configOptions?.find((option) => option.id === 'model')?.currentValue ?? created.models?.currentModelId;
      this.model = this.model ?? current;

      this.log.push({
        type: 'session.started',
        cwd: this.cwd,
        harnessId: 'opencode',
        ...(this.model === undefined ? {} : { model: this.model }),
        ...(created.sessionId === undefined ? {} : { sdkSessionId: created.sessionId }),
      });
      this.log.push({
        type: 'session.settings',
        ...(advertised.length === 0 ? {} : { models: advertised }),
        ...(this.model === undefined ? {} : { model: this.model }),
        // Only what this backend actually enforces: the composer offers no dead switches.
        permissionModes: ['default', 'plan'],
        permissionMode: 'default',
      });
      this.opts.onConnection({ status: 'ok', harness: 'opencode' });
      this.publishState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('opencode acp did not connect', { error: message });
      this.log.push({ type: 'session.error', message, code: 'cli_missing' });
      this.opts.onConnection({ status: message.includes('could not start') ? 'cli_missing' : 'error', harness: 'opencode', detail: message });
    }
  }


  private modelChoices(created: SessionNewResult): ModelChoice[] {
    const catalog = created.configOptions?.find((option) => option.id === 'model');
    if (catalog?.options !== undefined) {
      return catalog.options
        .filter((option): option is { value: string; name?: string; description?: string } => typeof option.value === 'string')
        .map((option) => ({
          value: option.value,
          displayName: option.name ?? option.value,
          ...(option.description === undefined ? {} : { description: option.description }),
        }));
    }
    return (created.models?.availableModels ?? [])
      .filter((model): model is { modelId: string; name?: string; description?: string } => typeof model.modelId === 'string')
      .map((model) => ({
        value: model.modelId,
        displayName: model.name ?? model.modelId,
        ...(model.description === undefined ? {} : { description: model.description }),
      }));
  }

  private onNotification(method: string, params: unknown): void {
    if (method !== 'session/update') {
      this.log.noteUnmapped(method);
      return;
    }
    const frame = params as { update?: AcpUpdate } | null;
    const update = frame?.update;
    if (update === undefined) return;
    switch (update.sessionUpdate) {
      case 'agent_message_chunk':
        this.appendBlock('text', textOfContent(update['content']));
        return;
      case 'agent_thought_chunk':
        this.appendBlock('thinking', textOfContent(update['content']));
        return;
      case 'tool_call':
        this.startTool(update);
        return;
      case 'tool_call_update':
        this.updateTool(update);
        return;
      case 'usage_update': {
        const used = typeof update['used'] === 'number' ? update['used'] : undefined;
        const size = typeof update['size'] === 'number' ? update['size'] : undefined;
        this.contextWindow = { ...(used === undefined ? {} : { used }), ...(size === undefined ? {} : { size }) };
        const cost = update['cost'] as { amount?: unknown } | undefined;
        if (typeof cost?.amount === 'number') this.turnCostUsd = cost.amount;
        return;
      }
      default:
        // `plan`, `available_commands_update` and `current_mode_update` draw nothing yet.
        return;
    }
  }

  private appendBlock(kind: 'text' | 'thinking', text: string): void {
    if (text === '') return;
    // Words close the reasoning that led to them, so the chat reads in the order it was thought.
    if (kind === 'text') this.closeBlock('thinking');
    let block = this.blocks.get(kind);
    if (block === undefined) {
      block = { blockId: this.log.openBlock(kind, kind), text: '' };
      this.blocks.set(kind, block);
      this.log.push({ type: kind === 'text' ? 'text.start' : 'thinking.start', blockId: block.blockId });
    }
    block.text += text;
    this.log.push({ type: kind === 'text' ? 'text.delta' : 'thinking.delta', blockId: block.blockId, delta: text });
  }

  private closeBlock(kind: 'text' | 'thinking'): void {
    const block = this.blocks.get(kind);
    if (block === undefined) return;
    this.log.push(
      kind === 'text'
        ? { type: 'text.end', blockId: block.blockId, text: block.text }
        : { type: 'thinking.end', blockId: block.blockId, text: block.text },
    );
    this.log.closeBlock(kind);
    this.blocks.delete(kind);
  }

  private closeBlocks(): void {
    this.closeBlock('thinking');
    this.closeBlock('text');
  }

  private startTool(update: AcpUpdate): void {
    const toolCallId = typeof update['toolCallId'] === 'string' ? update['toolCallId'] : undefined;
    if (toolCallId === undefined) return;
    const title = typeof update['title'] === 'string' ? update['title'] : (typeof update['kind'] === 'string' ? update['kind'] : 'tool');
    const kind = typeof update['kind'] === 'string' && ACP_TOOL_KINDS.has(update['kind']) ? (update['kind'] as ToolKind) : 'other';
    const status = this.statusOf(update['status']);
    const input = update['rawInput'] ?? update['input'];
    this.openTools.set(toolCallId, { name: title, startedAt: Date.now(), status });
    this.log.push({
      type: 'tool.start',
      toolCallId,
      name: title,
      kind,
      title,
      status,
      source: 'assistant',
      ...(input === undefined ? {} : { input }),
    });
  }

  private updateTool(update: AcpUpdate): void {
    const toolCallId = typeof update['toolCallId'] === 'string' ? update['toolCallId'] : undefined;
    if (toolCallId === undefined) return;
    const open = this.openTools.get(toolCallId);
    const status = this.statusOf(update['status'] ?? open?.status);
    const title = typeof update['title'] === 'string' ? update['title'] : undefined;
    const input = update['rawInput'] ?? update['input'];

    if (open === undefined) {
      // An update for an id with no start: ACP allows it, consumers upsert.
      this.startTool({ ...update, status });
      return;
    }

    if (!TERMINAL_TOOL_STATUS.has(status)) {
      this.openTools.set(toolCallId, { ...open, ...(title === undefined ? {} : { name: title }), status });
      this.log.push({
        type: 'tool.update',
        toolCallId,
        status,
        ...(title === undefined ? {} : { title }),
        ...(input === undefined ? {} : { input }),
      });
      return;
    }

    const result = textOfContent(update['content']) || textOfContent(update['rawOutput']);
    this.openTools.delete(toolCallId);
    this.log.push({
      type: 'tool.end',
      toolCallId,
      status: status === 'failed' ? 'failed' : 'completed',
      durationMs: Date.now() - open.startedAt,
      ...(result === '' ? {} : { result }),
      ...(status === 'failed' ? { isError: true, errorMessage: result.slice(0, 400) } : {}),
    });
  }

  private statusOf(value: unknown): ToolStatus {
    switch (value) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'in_progress':
        return 'in_progress';
      default:
        return 'pending';
    }
  }

  private onRequest(id: number | string, method: string, params: unknown): void {
    if (method !== 'session/request_permission') {
      this.peer?.respondError(id, -32601, `unsupported client method ${method}`);
      return;
    }
    const frame = params as
      | {
          toolCall?: { toolCallId?: string; title?: string; kind?: string; rawInput?: unknown };
          options?: readonly { optionId?: string; name?: string; kind?: string }[];
        }
      | null;
    const toolCall = frame?.toolCall;
    const toolCallId = toolCall?.toolCallId ?? `perm-${String(id)}`;
    const options: PermissionOption[] = (frame?.options ?? [])
      .filter((option): option is { optionId: string; name?: string; kind?: string } => typeof option.optionId === 'string')
      .map((option) => ({
        optionId: option.optionId,
        label: option.name ?? option.optionId,
        kind: option.kind === 'allow_always' ? 'allow_always' : option.kind === 'reject_once' ? 'reject_once' : 'allow_once',
      }));
    const requestId = String(id);
    this.permissions.set(requestId, {
      rpcId: id,
      toolCallId,
      toolName: toolCall?.title ?? toolCall?.kind ?? 'tool',
      options,
    });
    if (!this.log.hasAnnounced(toolCallId)) {
      this.startTool({
        toolCallId,
        title: toolCall?.title ?? toolCall?.kind ?? 'tool',
        kind: toolCall?.kind,
        status: 'pending',
        rawInput: toolCall?.rawInput,
      });
    }
    this.log.parkQuestion(Date.now());
    this.log.push({
      type: 'permission.requested',
      requestId,
      toolCallId,
      toolName: toolCall?.title ?? toolCall?.kind ?? 'tool',
      ...(toolCall?.title === undefined ? {} : { title: toolCall.title }),
      ...(toolCall?.rawInput === undefined ? {} : { input: toolCall.rawInput }),
      options,
    });
    this.publishState();
  }

  prompt(
    text: string,
    _attachments?: PromptAttachment[],
    context?: string,
    origin: PromptOrigin = 'user',
    display?: { origin: PromptOrigin; hidden?: true },
  ): boolean {
    if (this.closed || this.sessionId === undefined || this.log.isTurnLive) return false;

    const turnId = this.log.beginTurn(origin);
    this.lastTurn = { id: turnId };
    this.turnCostUsd = undefined;
    const modelText = [text, context ?? ''].filter((part) => part !== '').join('\n\n');
    this.log.push({
      type: 'message.user',
      turnId,
      text,
      origin: display?.origin ?? origin,
      ...(display?.hidden === true ? { hidden: true as const } : {}),
      ...(context === undefined ? {} : { context }),
    });
    this.streaming = true;
    this.publishState();

    void this.peer
      ?.request('session/prompt', { sessionId: this.sessionId, prompt: [{ type: 'text', text: modelText }] })
      .then((result) => {
        const response = result as { stopReason?: string; usage?: unknown } | null;
        this.finishTurn(response?.stopReason ?? 'end_turn', response?.usage);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.log.push({ type: 'session.error', message, code: 'unknown' });
        this.finishTurn('refusal');
      });
    return true;
  }

  private finishTurn(stopReason: string, usage?: unknown): void {
    this.closeBlocks();
    for (const [toolCallId, open] of this.openTools) {
      this.log.push({ type: 'tool.end', toolCallId, status: 'canceled', errorMessage: 'the turn ended' });
      open.status = 'canceled';
    }
    this.openTools.clear();
    const tally = this.log.turnTally();
    this.streaming = false;
    if (this.lastTurn !== undefined && tally !== undefined) {
      const tokens = tokensFrom(usage, this.contextWindow);
      this.log.push({
        type: 'turn.ended',
        turnId: this.lastTurn.id,
        stopReason,
        ...(tally.durationMs === undefined ? {} : { durationMs: tally.durationMs }),
        ...(tokens === undefined ? {} : { tokens }),
        ...(this.turnCostUsd === undefined ? {} : { totalCostUsd: this.turnCostUsd }),
        ...(tally.filesChanged === 0 ? {} : { filesChanged: tally.filesChanged }),
        ...(tally.waitedMs === 0 ? {} : { waitedMs: tally.waitedMs }),
      });
      this.opts.onTurnEnded?.({ ...tally, stopReason });
    }
    this.publishState();
  }

  /** Ends a turn without waiting for the agent, used when the child dies under it. */
  private endTurn(reason: 'completed' | 'error' | 'interrupted' | 'max_turns', message: string): void {
    if (!this.log.isTurnLive) return;
    this.log.push({ type: 'session.error', message });
    this.closeBlocks();
    for (const toolCallId of this.openTools.keys()) {
      this.log.push({ type: 'tool.end', toolCallId, status: 'canceled', errorMessage: message });
    }
    this.openTools.clear();
    this.log.turnTally();
    this.streaming = false;
    this.log.push({ type: 'turn.ended', turnId: this.lastTurn?.id ?? this.log.turnId, stopReason: reason });
    this.publishState();
  }

  async setModel(model: string): Promise<ModelPick> {
    if (this.sessionId === undefined || this.peer === undefined) return { accepted: false };
    try {
      await this.peer.request('session/set_config_option', { sessionId: this.sessionId, configId: 'model', value: model }, 20_000);
    } catch {
      try {
        await this.peer.request('session/set_model', { sessionId: this.sessionId, modelId: model }, 20_000);
      } catch {
        return { accepted: false };
      }
    }
    this.model = model;
    this.log.push({ type: 'session.settings', model });
    return { accepted: true };
  }

  async setEffort(_effort: EffortLevel | null): Promise<void> {
    // ACP exposes no reasoning-effort knob; the composer hides the control when nothing changes.
  }

  async setPermissionMode(mode: PermissionMode): Promise<boolean> {
    if (this.sessionId === undefined || this.peer === undefined) return false;
    const modeId = mode === 'plan' ? 'plan' : 'build';
    try {
      await this.peer.request('session/set_config_option', { sessionId: this.sessionId, configId: 'mode', value: modeId }, 15_000);
    } catch {
      try {
        await this.peer.request('session/set_mode', { sessionId: this.sessionId, modeId }, 15_000);
      } catch {
        return false;
      }
    }
    this.log.push({ type: 'session.settings', permissionMode: mode });
    return true;
  }

  respond(requestId: string, optionId: string): boolean {
    const pending = this.permissions.get(requestId);
    if (pending === undefined || this.peer === undefined) return false;
    this.permissions.delete(requestId);
    this.peer.respond(pending.rpcId, { outcome: { outcome: 'selected', optionId } });
    const chosen = pending.options.find((option) => option.optionId === optionId);
    this.log.unparkQuestion();
    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: pending.toolCallId,
      optionId,
      outcome: chosen?.kind === 'allow_always' ? 'allow_always' : chosen?.kind === 'reject_once' ? 'deny' : 'allow_once',
    });
    this.publishState();
    return true;
  }

  answerQuestion(_text: string, _attachments?: PromptAttachment[], _context?: string): boolean {
    // ACP parks permissions, never questions; a caller with prose has nothing to answer here.
    return false;
  }

  async dismissQuestion(): Promise<boolean> {
    const [first] = this.permissions.entries();
    if (first === undefined || this.peer === undefined) return false;
    const [requestId, pending] = first;
    this.permissions.delete(requestId);
    this.peer.respond(pending.rpcId, { outcome: { outcome: 'cancelled' } });
    this.log.unparkQuestion();
    this.log.push({
      type: 'permission.resolved',
      requestId,
      toolCallId: pending.toolCallId,
      outcome: 'canceled',
      dismissed: true,
    });
    this.publishState();
    return true;
  }

  async interrupt(): Promise<void> {
    if (this.sessionId === undefined || this.peer === undefined) return;
    this.peer.notify('session/cancel', { sessionId: this.sessionId });
    // The prompt's own rejection settles the turn; a child that stays silent is ended here.
    const deadline = setTimeout(() => this.endTurn('interrupted', 'the turn was stopped'), 4_000);
    deadline.unref();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const [requestId, pending] of this.permissions) {
      this.peer?.respond(pending.rpcId, { outcome: { outcome: 'cancelled' } });
      this.permissions.delete(requestId);
    }
    if (this.sessionId !== undefined && this.peer !== undefined && !this.peer.isClosed) {
      this.peer.notify('session/cancel', { sessionId: this.sessionId });
    }
    this.closeBlocks();
    for (const toolCallId of this.openTools.keys()) {
      this.log.push({ type: 'tool.end', toolCallId, status: 'canceled', errorMessage: 'Session ended' });
    }
    this.openTools.clear();
    if (this.log.isTurnLive) {
      const tally = this.log.turnTally();
      this.log.push({ type: 'turn.ended', turnId: this.lastTurn?.id ?? this.log.turnId, stopReason: 'interrupted' });
      if (tally !== undefined) this.opts.onTurnEnded?.({ ...tally, stopReason: 'interrupted' });
    }
    this.streaming = false;
    this.peer?.close();
    this.publishState();
    this.opts.onEnded?.({ reason: 'interrupted', durationMs: 0, turnCount: this.log.turnCount });
  }
}

