import { spawn, type IPty } from 'node-pty';
import type {
  AgentConnection,
  EffortLevel,
  PermissionMode,
  PromptAttachment,
  PromptOrigin,
  StudioEvent,
  WelcomeProject,
} from '@studio/events';
import { log as makeLog } from '../../log/index.js';
import type { AgentBackend, BackendState, ModelPick } from '../backend.js';
import { EventLog } from '../event-log.js';
import type { TurnSummary } from '../event-log.js';

const logger = makeLog('agent-host');

/**
 * freebuff ships no protocol mode: `freebuff --help` offers login/doctor, `--continue`, `--cwd` and
 * `--trust-agents`, and the assistant only exists inside its TUI. So this harness owns a pseudo-
 * terminal, types the prompt, and reads the screen back.
 *
 * That bounds what it can do, honestly:
 *  - text only: no tool cards, no thinking, no token or cost figures;
 *  - no permissions: freebuff decides its own, so the composer offers none;
 *  - no model or effort control, and no resume;
 *  - the TUI redraws, so the stream is a best-effort transcript, not a replay of its screen.
 *
 * It is here because a working text turn beats no agent at all, not because it is a peer of ACP.
 */

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007|\u001b[()][A-Z0-9]|\u001b[=>]/g;
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(CONTROL, '');
}

export interface FreebuffSessionOptions {
  readonly cwd: string;
  readonly bin: string;
  readonly onEvent: (event: StudioEvent) => void;
  readonly onState: (state: BackendState) => void;
  readonly onConnection: (connection: AgentConnection) => void;
  readonly onTurnEnded?: (summary: TurnSummary) => void;
  readonly onTurnStarted?: (turnId: string, origin: PromptOrigin) => void;
  readonly onTurnStalled?: (turnId: string, silentMs: number) => void;
  readonly onExited?: () => void;
  readonly restoredEvents?: readonly StudioEvent[];
  readonly keepRaw?: boolean;
}

/** Silence this long after output reads as the turn's end; freebuff draws a spinner while it works. */
const IDLE_END_MS = 2_000;
/** A turn that never draws anything still has to end. */
const FIRST_BYTE_MS = 45_000;

export class FreebuffSession implements AgentBackend {
  readonly id = `f${Date.now().toString(36)}`;
  readonly harness = 'pty' as const;
  readonly cwd: string;
  /** A TUI owns the keyboard: a second prompt would be typed into the first turn's screen. */
  readonly midTurn = 'refuse' as const;

  private readonly log: EventLog;
  private readonly opts: FreebuffSessionOptions;
  private term?: IPty;
  private streaming = false;
  private blockId?: string;
  private idle?: ReturnType<typeof setTimeout>;
  private firstByte?: ReturnType<typeof setTimeout>;
  private lastTurn?: string;
  private closed = false;
  /** Lines already streamed: a full-screen TUI rewrites its own chrome on every keystroke. */
  private readonly seenLines = new Set<string>();
  private attaching = false;

  constructor(options: FreebuffSessionOptions) {
    this.opts = options;
    this.cwd = options.cwd;
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
    return false;
  }

  get turnWaitedMs(): number {
    return this.log.turnWaitedMs;
  }

  get questionParkedSince(): undefined {
    return undefined;
  }

  eventsSince(sinceSeq?: number): StudioEvent[] {
    return this.log.since(sinceSeq);
  }

  welcome(workspace: WelcomeProject): void {
    this.log.push({ type: 'session.welcome', workspace });
  }

  open(): void {
    try {
      this.term = spawn(this.opts.bin, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: this.cwd,
        env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('freebuff did not start', { error: message });
      this.opts.onConnection({ status: 'cli_missing', harness: 'freebuff', detail: message });
      this.log.push({ type: 'session.error', message, code: 'cli_missing' });
      return;
    }

    this.term.onData((chunk) => this.onData(chunk));
    this.term.onExit(({ exitCode }) => {
      if (this.closed) return;
      this.opts.onConnection({ status: 'error', harness: 'freebuff', detail: `freebuff exited (${String(exitCode)})` });
      this.log.push({ type: 'session.error', message: `freebuff exited (${String(exitCode)})` });
      this.endTurn('error');
      this.opts.onExited?.();
    });

    this.attaching = true;
    this.log.push({ type: 'session.started', cwd: this.cwd, harnessId: 'freebuff', tools: [] });
    this.log.push({
      type: 'session.settings',
      // Nothing to offer: freebuff keeps its own model and permission choices.
      permissionModes: [],
    });
    this.opts.onConnection({ status: 'ok', harness: 'freebuff' });
    this.publishState();
  }

  private publishState(): void {
    this.opts.onState({
      isStreaming: this.streaming,
      midTurn: 'refuse',
      needsAttention: false,
      isTurnLive: this.log.isTurnLive,
      turnWaitedMs: this.log.turnWaitedMs,
    });
  }

  private onData(chunk: string): void {
    const clean = stripAnsi(chunk);
    if (clean.trim() === '') return;
    if (this.firstByte !== undefined) {
      clearTimeout(this.firstByte);
      this.firstByte = undefined;
    }
    if (this.streaming) {
      this.append(clean);
      if (this.idle !== undefined) clearTimeout(this.idle);
      this.idle = setTimeout(() => this.endTurn('completed'), IDLE_END_MS);
      this.idle.unref();
      return;
    }
    // Before the first prompt the TUI's own startup chrome is not the conversation.
    if (this.attaching) this.remember(clean);
  }

  private remember(text: string): void {
    for (const line of text.split('\n')) {
      if (line.trim() !== '') this.seenLines.add(line.trim());
    }
  }

  /**
   * Only lines this turn has not drawn before. The composer, the key hints and the welcome card
   * repeat on every repaint, so without this the chat would read as pages of the same chrome.
   */
  private append(clean: string): void {
    const fresh = clean
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !this.seenLines.has(line) && !/^[\u2500-\u257f\s]+$/.test(line));
    if (fresh.length === 0) return;
    for (const line of fresh) this.seenLines.add(line);
    if (this.blockId === undefined) {
      this.blockId = this.log.openBlock('text', 'text');
      this.log.push({ type: 'text.start', blockId: this.blockId });
    }
    this.log.push({ type: 'text.delta', blockId: this.blockId, delta: `${fresh.join('\n')}\n` });
  }

  prompt(
    text: string,
    _attachments?: PromptAttachment[],
    context?: string,
    origin: PromptOrigin = 'user',
    display?: { origin: PromptOrigin; hidden?: true },
  ): boolean {
    if (this.closed || this.term === undefined || this.log.isTurnLive) return false;
    const turnId = this.log.beginTurn(origin);
    this.lastTurn = turnId;
    this.log.push({
      type: 'message.user',
      turnId,
      text,
      origin: display?.origin ?? origin,
      ...(display?.hidden === true ? { hidden: true as const } : {}),
      ...(context === undefined ? {} : { context }),
    });
    this.streaming = true;
    this.attaching = false;
    this.publishState();

    const spoken = [text, context ?? ''].filter((part) => part !== '').join('\n\n');
    // A bracketed paste keeps a multi-line prompt from submitting one line at a time.
    this.term.write(`\u001b[200~${spoken}\u001b[201~`);
    this.term.write('\r');

    this.firstByte = setTimeout(() => {
      this.log.push({ type: 'session.error', message: 'freebuff did not answer the prompt' });
      this.endTurn('error');
    }, FIRST_BYTE_MS);
    this.firstByte.unref();
    return true;
  }

  private endTurn(reason: 'completed' | 'error' | 'interrupted' | 'max_turns'): void {
    if (this.idle !== undefined) clearTimeout(this.idle);
    if (this.firstByte !== undefined) clearTimeout(this.firstByte);
    this.idle = undefined;
    this.firstByte = undefined;
    if (this.blockId !== undefined) {
      this.log.push({ type: 'text.end', blockId: this.blockId, text: '' });
      this.log.closeBlock('text');
      this.blockId = undefined;
    }
    const tally = this.log.turnTally();
    this.streaming = false;
    if (this.lastTurn !== undefined && tally !== undefined) {
      this.log.push({
        type: 'turn.ended',
        turnId: this.lastTurn,
        stopReason: reason === 'completed' ? 'end_turn' : reason,
        durationMs: tally.durationMs,
      });
      this.opts.onTurnEnded?.({ ...tally, stopReason: reason === 'completed' ? 'end_turn' : reason });
    }
    this.lastTurn = undefined;
    this.publishState();
  }

  async setModel(_model: string): Promise<ModelPick> {
    // freebuff re-reads its own config; there is no wire to push a model over.
    return { accepted: false };
  }

  async setEffort(_effort: EffortLevel | null): Promise<void> {
    return;
  }

  async setPermissionMode(_mode: PermissionMode): Promise<boolean> {
    return false;
  }

  respond(_requestId: string, _optionId: string): boolean {
    return false;
  }

  answerQuestion(_text: string, _attachments?: PromptAttachment[], _context?: string): boolean {
    return false;
  }

  async dismissQuestion(): Promise<boolean> {
    return false;
  }

  async interrupt(): Promise<void> {
    this.term?.write('\u0003');
    this.endTurn('interrupted');
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.log.isTurnLive) this.endTurn('interrupted');
    this.term?.kill();
    this.term = undefined;
    this.publishState();
  }
}
