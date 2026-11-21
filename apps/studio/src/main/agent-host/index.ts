import { appendFileSync, existsSync } from 'node:fs';
import { createArtifactAccess } from '../artifacts/access.js';
import { artifactCodebaseTarget } from './artifact-target.js';
import { artifactStore } from '../artifacts/instance.js';
import { importArtifactFromProject } from '../artifacts/import.js';
import { MAX_ARTIFACT_RASTER_PIXELS } from '../artifacts/assets.js';
import { artifactGrantSessionId, artifactSessionGrants, rememberArtifactSessionGrant } from '../artifacts/grants.js';
import type { ArtifactToolReport } from './artifact-tools.js';
import { ARTIFACT_TOOL_NAMES } from './tool-names.js';
import type { ArtifactToolResult, DebugArtifactToolRequest } from '@studio/events';
import { electronImageOps } from '../canvas/thumbnail/compose.js';
import { handle } from '../ipc/bridge.js';
import { flagOn } from '../flags/index.js';
import {
  isCredentialRejected,
  isSignInFixable,
  failedOnService,
  foldSessionState,
  DEFAULT_DEV_PORT,
  IPC_EMIT,
  IPC_INVOKE,
  frameLinkMarkdown,
  isUserSpoken,
  latestTurnOpensSetupSteps,
  originForPort,
  opensSetupSteps,
  type AgentConnection,
  type AgentCommandAcceptance,
  type AgentSessionInfo,
  type AgentSnapshot,
  type AgentSnapshotRequest,
  type AgentStateEvent,
  type AgentProbeRequest,
  type AgentSwitchEntry,
  type ClaudeSetupState,
  type ClaudeSetupStatus,
  type ClientCommand,
  type CodexSetupStatus,
  type HarnessId,
  type PenView,
  type ProjectSelected,
  type QuestionEndOutcome,
  type ResumeMethod,
  type SessionState,
  type StudioEvent,
  type TabStatus,
  type WelcomeProject,
} from '@studio/events';
import {
  applyAgentCreateFrame,
  applyAgentCreateArtifact,
  canvasSnapshotFor,
  applyAgentCreateImage,
  applyAgentCreatePage,
  applyAgentCreateText,
  applyAgentDeletePage,
  applyAgentFrameUrl,
  applyAgentSetText,
  applyAgentDuplicateFrames,
  applyAgentMoveFrame,
  applyAgentMoveFrames,
  applyAgentMoveNodesToPage,
  applyAgentRemoveFrame,
  applyAgentRemoveFrames,
  applyAgentRenameFrame,
  applyAgentRenamePage,
  applyAgentReorderFrame,
  applyAgentReorderPage,
  canvasImageIds,
  captureAgentFrame,
  readAgentFrame,
  clipAgentFramePictures,
  evaluateInAgentFrame,
  framePagesLive,
  frameShowsPage,
  listAgentFrames,
  listAgentPages,
  markProjectDirty,
  applyStartingFrame,
  canvasPagedSnapshotFor,
  removeStartingFrame,
  setFrameQuoteSource,
} from '../canvas/index.js';
import { inspirationOpeningFor } from './inspiration.js';
import { knownCanvasDocId } from '../canvas/registry.js';
import { projectKey, type ProjectKey } from '../project/key.js';
import { projectMap, projectSet } from '../project/state.js';
import { deleteProjectFile } from './delete-project-file.js';
import { gitStatusHost } from '../git-status/index.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';
import { log } from '../log/index.js';
import { isRegisteredBlankProject, serverHost } from '../server/index.js';
import { t } from '@studio/i18n';
import { quotedFrameInstruction } from '../../instructions/frame-quote.js';
import { FrameQuoteBook, quoteTargetOf, studioQuotePlacement, type FrameQuotePlacer, type QuoteTarget } from './frame-quotes.js';
import { observeStartIntent } from '../server/start-intent.js';
import { observeServerStop, serverStopContext } from '../server/user-stop.js';
import { respectServerStop } from './project-setup-tools.js';
import { DURING_SETUP_CONTEXT, startPrompt } from '../../instructions/start.js';
import { previousChatInstruction } from '../../instructions/handoff.js';
import { dismissedQuestionsContext } from '../../instructions/dismissed-questions.js';
import { starterBriefingFor } from '../starter/adapter.js';
import { starterHost } from '../starter/index.js';
import { resolveReportedFolder } from '../server/owner.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { observeTabClosed } from '../tabs/closed.js';
import { observeSessionResumable } from '../tabs/resumable.js';
import { noteTabStatus, noteTabWorking } from '../tabs/signals.js';
import { agentTabStatus } from '../tabs/status.js';
import { registerView, views } from '../tabs/views.js';
import type { HeldPromptOutcome } from '../telemetry/events.js';
import { capture, resolveWorkspaceTelemetryProperties, workspaceTelemetryProperties, recordAgentCost } from '../telemetry/index.js';
import { connectorInventoryProperties, connectorMenuProperties, connectorToolProperties } from './connector-telemetry.js';
import { rememberReportedApp } from '../workspace/detect.js';
import { knownProject, noteWorkspaceOpened } from '../workspace/index.js';
import { renameProjectByAgent } from '../workspace/rename.js';
import { createProjectTabByAgent } from '../workspace/agent-tab.js';
import { noteSetupEvent, noteSetupParked, noteSetupReport, noteSetupStreaming, noteSetupTabClosed, noteSetupTurnStopped } from '../workspace/setup-signals.js';
import { setProjectHarness, workspaceOrigin } from '../workspace/store.js';
import { isRemovingProject } from '../workspace/remove-project.js';
import { codexSetupStatus } from '../codex/index.js';
import { pinnedHarness, readOnboardingState } from '../onboarding/state.js';
import { broadcastSettingsChanged } from '../settings/changed.js';
import { probeConnection, probeMemo } from './connection.js';
import { canvasHistorySinks } from './canvas-history-sinks.js';
import { DISPOSE_SESSION_LIMIT_MS, settleWithin } from './close-limits.js';
import { holdStartForProof, installLandingProofHook } from './landing-proof.js';
import { deriveClaudeConnection, marksSessionsStale, sameConnection } from './claude-connection.js';
import { overlayMove, WorkingFrames, type FrameChangeWords } from './working-frames.js';
import { probeCodexConnection } from './codex-connection.js';
import { shareInFlight, type InFlight } from './single-flight.js';
import { recordProjectOpened } from './project-opened.js';
import {
  recordAgentError,
  recordAgentSessionEnded,
  recordAgentSessionStarted,
  recordAgentTurnEnded,
  recordAgentTurnSeen,
  recordAgentTurnStarted,
  recordAgentTurnStalled,
  recordSetupStepsEnded,
  recordSetupStepsShown,
  recordChatMessageSent,
  recordNextTaskPicturesClipped,
  recordNextTasksOffered,
  recordHeldPromptResolved,
  recordQuestionEnded,
  recordPermissionModeChanged,
  recordAgentSwitched,
  recordChatNewStarted,
  recordPromptSubmitted,
  type AgentSessionRef,
} from './session-telemetry.js';
import { acceptPromptCommand, type PromptAdmission } from './command-acceptance.js';
import { questionAnsweredProperties } from './question-telemetry.js';
import { observeNotificationEvent } from '../notifications/index.js';
import { TurnNotifications } from './turn-notifications.js';
import {
  isTap,
  reducePen,
  restoresOnRefusal,
  type PenAction,
  type PenOutcome,
  type PenPrompt,
  type PenState,
} from './pen.js';
import { joinNamingContext, namingContextFor } from './naming-context.js';
import {
  forgetSession,
  harnessIdOf,
  planSession,
  rememberSession,
  storedAppServerThread,
  storedHarness,
  type SessionHarness,
} from './sessions.js';
import {
  type ChatPreference,
  forgetAllowRules,
  preferenceFor,
  rememberAllowRules,
  rememberCatalog,
  rememberEffortChoice,
  rememberPermissionMode,
  rememberModelChoice,
  seedPreference,
  usableAllowRules,
} from './preferences.js';
import { clearTranscript, readTranscript, writeTranscript } from './transcript.js';
import {
  releaseAllPending,
  scheduleGc,
  setArchiveRootsProvider,
  setCanvasRootsProvider,
  setDraftRootsProvider,
  setLiveRootsProvider,
  settlePending,
} from '../images/store.js';
import { splitAttachments } from './prompt-content.js';
import { draftImageIds, prependComposerDraft } from '../drafts/state.js';
import { archiveChat, archivedImageIds } from './chat-history.js';
import { AgentSession, type AgentSessionOptions } from './session.js';
import { agentStream } from '../diagnostics/gate.js';
import { recordingQuery } from './recorded-stream.js';
import { replayedQuery } from './replayed-stream.js';
import type { StudioToolSinks } from './studio-tools.js';
import { projectSetupService } from '../project-setup/service.js';
import { finalTabClose } from './final-tab-close.js';
import { harnessStoredAs, STORED_HARNESSES } from './harness.js';
import { saveAttachment } from '../images/save-attachment.js';
import type { AgentBackend, BackendState, ModelPick } from './backend.js';
import { SessionMap } from './session-map.js';
import { codexRoot, createAppServerSession, selectedHarness } from './appserver/index.js';
import { bindProjectHarness, hasAgentAnswer, projectHarness } from './project-harness.js';
import { hasUserMessage } from './user-message.js';
import { devSwitches } from '../env/dev-switches.js';

const logger = log('agent-host');

const CODEX_REFUSED: AgentConnection = { status: 'unauthenticated', harness: 'codex' };

/** A `replaced` stop keeps the pen loaded: the view stays open, and it reads a draft once per landing, so one written now is never read back (ONL-2294). */
type SessionStop = 'destroyed' | 'replaced';

interface PenSlot {
  pen: PenState | null;
  turnId?: string;
  /** When the waiting started: a join and a put-back keep it, so the wait is the designer's, not the last action's (ONL-2294). */
  heldAt?: number;
}

function penView(pen: PenState | null): PenView | undefined {
  if (pen === null) return undefined;
  return {
    penId: pen.penId,
    text: pen.text,
    ...(pen.attachments === undefined ? {} : { attachments: pen.attachments }),
    ...(pen.verdict === undefined ? {} : { verdict: pen.verdict }),
  };
}

function isResumable(method: ResumeMethod, state: SessionState): boolean {
  if (method === 'play-button' || method === 'enter') return state.interrupted === true;
  return method === 'error-line' && failedOnService(state);
}

function samePenView(before: PenView | undefined, after: PenView | undefined): boolean {
  if (before === undefined || after === undefined) return before === after;
  return (
    before.penId === after.penId &&
    before.text === after.text &&
    before.verdict === after.verdict &&
    before.attachments === after.attachments
  );
}

function backendState(session: AgentBackend | undefined): BackendState {
  return {
    isStreaming: session?.isStreaming ?? false,
    midTurn: session?.midTurn ?? 'steer',
    needsAttention: session?.needsAttention ?? false,
    isTurnLive: session?.isTurnLive ?? false,
    ...(session?.questionParkedSince === undefined
      ? {}
      : { questionParkedSince: session.questionParkedSince }),
    turnWaitedMs: session?.turnWaitedMs ?? 0,
  };
}

/** A stored `'default'` is no choice: older builds persisted it as a model. */
export function startModel(requested: string | undefined, stored: string | undefined): string | undefined {
  const model = requested ?? stored;
  return model === 'default' ? undefined : model;
}

export class AgentHost {
  private readonly busySessions = projectSet('agent.busy');
  private readonly publishedOtherTabBusy = projectMap<boolean>('agent.other-tab-busy');
  private machine: AgentConnection = { status: 'unknown' };
  private readonly machineByHarness = new Map<SessionHarness, AgentConnection>();
  private readonly own = projectMap<{ cwd: string; harness: SessionHarness; connection: AgentConnection }>('agent.connection');
  private readonly probing: InFlight<AgentConnection> = {};
  /** Kept apart from `machine`, which sessions and the setup machines overwrite. */
  private probed: AgentConnection | undefined;
  private claudeSetup: ClaudeSetupStatus = 'idle';
  /** Sessions started before a credential landed; their next prompt restarts them (ONL-2186). */
  private readonly stale = projectSet('agent.stale');
  /** Outlives the session that met it: a new codex session connects fine on the same credential (ONL-2114). */
  private codexRefused = false;
  private readonly restarting = projectMap<Promise<void>>('agent.restarting');
  /** Recorded at request time, read by the queued steps (ONL-2264). */
  private readonly intents = projectMap<{ wanted: boolean; generation: number }>('agent.intent');
  private generation = 0;
  private readonly lifecycle = createKeyedQueue<string>();
  private readonly workingFrames = projectMap<WorkingFrames>('agent.working-frames');
  private readonly artifactReporters = projectMap<ArtifactToolReport>('agent.artifact-reporter');
  /** A prompt waiting in main; it becomes a `message.user` row only once it is sent (ONL-2294). */
  private readonly pens = projectMap<PenSlot>('agent.pen');
  private readonly inspirationsOpened = new Set<string>();
  /** Workspaces with a verdict pass already scheduled on this falling edge (ONL-2519). */
  private readonly unreported = new Set<string>();

  constructor(
    private readonly isDev: boolean,
    private readonly sessions: SessionMap = new SessionMap(),
    private readonly makeBackend?: (
      cwd: string,
      harness: SessionHarness,
      tools: StudioToolSinks,
      onEvent: (event: StudioEvent) => void,
      onConnection: (connection: AgentConnection) => void,
      onState: (state: BackendState) => void,
    ) => AgentBackend,
    private readonly onClaudeUnauthenticated: (cause: 'signed-out' | 'rejected') => void = () => undefined,
  ) {
    for (const session of this.sessions.values()) {
      if (session.isStreaming) this.busySessions.add(projectKey(session.cwd));
    }
    // One root set over every live session, never re-pointed per start (ONL-2226).
    setLiveRootsProvider(() => this.sessions.values().flatMap((session) => session.events));
    // Beside it, and not per session: `stopSession` releases the holds a cooled tab's un-sent attachment had (ONL-2207).
    setDraftRootsProvider(() => draftImageIds());
    // An archived chat is no longer in any transcript, so the sweep would take its blobs (ONL-2198).
    setArchiveRootsProvider(() => archivedImageIds());
    // Every document on disk, so one chat message in project B cannot collect project A's reference images (ONL-2486).
    setCanvasRootsProvider(() => canvasImageIds());
    setFrameQuoteSource({
      view: (cwd) => this.frameQuotes.view(cwd),
      guestLoaded: (cwd, frameId) => this.frameQuotes.guestLoaded(cwd, frameId),
      looked: (cwd, frameId) => this.frameQuotes.looked(cwd, frameId),
      documentChanged: (cwd, doc) => this.frameQuotes.documentChanged(cwd, doc),
    });
  }

  private readonly superseded = new WeakSet<AgentBackend>();
  private readonly connectorInventories = new WeakMap<AgentBackend, import('@studio/events').ConnectorInventory>();
  /** Memory only: a quit before the first prompt after a switch loses it (ONL-2903). */
  private readonly pendingHandoff = projectMap<string>('agent.handoff');
  private readonly notifications = new TurnNotifications(observeNotificationEvent);
  private readonly frameQuotes = new FrameQuoteBook({
    emit: (cwd, quotes) => {
      const docId = knownCanvasDocId(cwd);
      if (docId !== undefined) views.routeTo(cwd, IPC_EMIT.canvasFrameQuotes, { docId, ...quotes });
    },
    lifted: (cwd, msToLift, node, trigger) => {
      capture('frame_quote_lifted', { ...resolveWorkspaceTelemetryProperties(cwd), ms_to_lift: msToLift, node, trigger });
    },
    now: () => Date.now(),
    liftsAtTurnEnd: () => true,
    showsPage: (cwd, frameId) => frameShowsPage(cwd, frameId),
  });

  private placeFrameQuote(cwd: string, target: QuoteTarget, quote: string, by: FrameQuotePlacer, onto: 'new' | 'existing' = 'new'): void {
    this.frameQuotes.place(cwd, target, quote);
    capture('frame_quote_placed', { ...resolveWorkspaceTelemetryProperties(cwd), by, node: target.kind, onto });
  }

  /** `own` is the emitting session, never a map lookup: that misses a closing session's tail (ONL-2254). */
  private handleEvent(event: StudioEvent, own: AgentBackend | undefined): void {
    // Before the route and the transcript write: one late row from a replaced session would empty the fresh chat (ONL-2198).
    if (own !== undefined && this.superseded.has(own)) return;
    if (!own?.isRestoringTranscript) noteSetupEvent(event);
    if (own !== undefined && event.type === 'session.settings' && event.connectors !== undefined) {
      if (event.connectors === null) this.connectorInventories.delete(own);
      else {
        this.connectorInventories.set(own, event.connectors);
        if (flagOn('connectors') && !own.isRestoringTranscript) capture('connector_inventory_observed', connectorInventoryProperties(own.harness, event.connectors));
      }
    }
    if (own !== undefined && !own.isRestoringTranscript && event.type === 'tool.start' && flagOn('connectors')) {
      const properties = connectorToolProperties(own.harness, event.name, this.connectorInventories.get(own));
      if (properties !== undefined) capture('connector_tool_used', properties);
    }
    this.notifications.observe(event, own);
    views.routeTo(event.cwd, IPC_EMIT.agentEvent, event);
    if (event.cwd !== undefined) {
      this.frameQuotes.observe(event.cwd, event);
      if (event.type === 'permission.requested') noteSetupParked(event.cwd, 1);
      else if (event.type === 'permission.resolved') noteSetupParked(event.cwd, -1);
      // The reduced count, never a tool row: `tool.end` carries no kind, and the count covers a new editing tool the day the reducer classifies it (ONL-2471).
      if (event.type === 'turn.ended' && (event.filesChanged ?? 0) > 0) {
        const docId = knownCanvasDocId(event.cwd);
        if (docId !== undefined) markProjectDirty(docId);
        if (own !== undefined) {
          const properties = artifactCodebaseTarget(event, own.events);
          if (properties !== null) capture('artifact_codebase_target', properties);
        }
      }
    }
    if (own !== undefined) writeTranscript(own.cwd, own.harness, own.events);
    if (own !== undefined && hasAgentAnswer([event])) bindProjectHarness(own.cwd, own.harness);
    // An empty report means "told us nothing", not "no models" (ONL-2115).
    if (own !== undefined && event.type === 'session.settings' && event.models?.length) {
      if (rememberCatalog(own.harness, event.models)) broadcastSettingsChanged();
    }
    // After the route: a release pushes its own rows, and they must land behind this one (ONL-2294).
    if (own !== undefined) this.observeTurn(event, own);
    scheduleGc();
  }

  private penSlot(cwd: string): PenSlot {
    const key = projectKey(cwd);
    const held = this.pens.get(key);
    if (held !== undefined) return held;
    const slot: PenSlot = { pen: null };
    this.pens.set(key, slot);
    return slot;
  }

  /** `isTurnLive` is read now, not from the last published state: the two backends order the ending and the falling edge differently (ONL-2294). */
  private observeTurn(event: StudioEvent, own: AgentBackend): void {
    if (event.type === 'turn.started') {
      this.penSlot(own.cwd).turnId = event.turnId;
      this.penAction(own.cwd, { type: 'turnStarted', turnId: event.turnId });
      return;
    }
    if (event.type !== 'turn.ended') return;
    this.penAction(own.cwd, {
      type: 'turnEnded',
      turnId: event.turnId,
      ...(event.stopReason === undefined ? {} : { stopReason: event.stopReason }),
      isLive: own.isTurnLive,
    });
    this.penSlot(own.cwd).turnId = undefined;
  }

  /** The pen's one door: a `send` leaves through the ordinary prompt path, so what reaches the agent is a sent message (ONL-2294). */
  penAction(cwd: string, action: PenAction, takenByPen = false): PenOutcome {
    return this.penDispatch(cwd, action, takenByPen).outcome;
  }

  pen(cwd: string): PenState | null {
    return this.pens.get(projectKey(cwd))?.pen ?? null;
  }

  private penDispatch(
    cwd: string,
    action: PenAction,
    takenByPen = false,
  ): { outcome: PenOutcome; sent: boolean } {
    const slot = this.penSlot(cwd);
    const waiting = slot.pen;
    // A local, not the slot: a delivery re-enters here with the next turn's events and empties it (ONL-2294).
    const heldAt = slot.heldAt;
    const { pen, outcome } = reducePen(waiting, action);
    slot.pen = pen;
    if (outcome.kind === 'held') slot.heldAt = heldAt ?? Date.now();
    if (outcome.kind === 'emptied' && outcome.reason === 'discard' && waiting !== null) {
      this.settlePenImages(cwd, waiting);
      this.recordPenOutcome(cwd, 'discarded', waiting.text, heldAt);
    }
    // No `settlePenImages`: the composer re-reads those bytes to restore its chips (ONL-2294).
    if (outcome.kind === 'taken') {
      // The caller's own word, not the verdict: Edit stays live on a held prompt, so a verdict cannot tell the two apart (ONL-2519).
      this.recordPenOutcome(cwd, takenByPen ? 'returned' : 'taken', outcome.prompt.text, heldAt);
    }
    if (outcome.kind !== 'send') {
      if (slot.pen === null) slot.heldAt = undefined;
      this.republishPen(cwd, waiting);
      return { outcome, sent: false };
    }
    const session = this.sessions.get(cwd);
    // Read before the delivery: the row it pushes is the one `is_first_in_session` must not see (ONL-2380).
    const spoken = session === undefined ? [] : [...session.events];
    const sent =
      session?.prompt(
        outcome.prompt.text,
        outcome.prompt.attachments ?? [],
        serverStopContext(cwd, outcome.prompt.context),
        isTap(outcome.prompt) ? 'suggestion' : 'user',
      ) ?? false;
    if (!sent && restoresOnRefusal(outcome.cause, waiting)) {
      slot.pen = waiting;
      slot.heldAt = heldAt;
    } else if (sent) {
      this.settlePenImages(cwd, outcome.prompt);
      // A tap that passed a waiting prompt resolved nothing that waited (ONL-2901).
      this.recordPenOutcome(
        cwd,
        outcome.cause === 'released' ? 'released' : 'sent',
        outcome.prompt.text,
        pen === null ? heldAt : undefined,
      );
      if (session !== undefined) this.recordSentPrompt(session, spoken, outcome.prompt);
    }
    if (slot.pen === null) slot.heldAt = undefined;
    // After the prompt, never before: the state read here is the one the delivery left behind (ONL-2294).
    this.republishPen(cwd, waiting);
    return { outcome, sent };
  }

  /** At the backend, never at acceptance: a prompt waiting in the pen may yet be discarded (ONL-2294). */
  private recordSentPrompt(
    session: AgentBackend,
    spoken: readonly StudioEvent[],
    prompt: PenPrompt,
  ): void {
    const record = knownProject(session.cwd);
    if (record === undefined) return;
    const ref: AgentSessionRef = {
      repoIdentity: record.repoIdentity,
      sessionId: session.id,
      harness: session.harness,
    };
    // The prompt's own text, not its context: the naming instruction would inflate every first prompt.
    recordChatMessageSent(
      ref,
      { harness: session.harness, events: spoken },
      { text: prompt.text, attachmentCount: prompt.attachments?.length ?? 0 },
    );
    recordPromptSubmitted(ref, {
      text: prompt.text,
      ...(prompt.attachments === undefined ? {} : { attachments: prompt.attachments }),
      ...(prompt.suggestion === undefined ? {} : { suggestion: prompt.suggestion }),
      ...(prompt.resends === undefined ? {} : { resends: prompt.resends }),
    });
  }

  /** No `heldAt` is a prompt that never waited, and the pen has nothing to report about it. */
  private recordPenOutcome(
    cwd: string,
    outcome: HeldPromptOutcome,
    text: string,
    heldAt: number | undefined,
  ): void {
    const record = knownProject(cwd);
    const session = this.sessions.get(cwd);
    if (heldAt === undefined || record === undefined || session === undefined) return;
    recordHeldPromptResolved(
      { repoIdentity: record.repoIdentity, harness: session.harness },
      { outcome, promptChars: text.length, waitedMs: Date.now() - heldAt },
    );
  }

  /** Deferred, never latched on the edge: codex drops the live turn before it pushes `turn.ended`, and a latch landing first refuses a clean finish (ONL-2519). */
  private scheduleVerdictPass(cwd: string): void {
    const key = projectKey(cwd);
    if (this.unreported.has(key)) return;
    this.unreported.add(key);
    queueMicrotask(() => {
      this.unreported.delete(key);
      const pen = this.pen(cwd);
      if (pen === null || pen.verdict !== undefined) return;
      if (this.sessions.get(cwd)?.isTurnLive === true) return;
      this.penAction(cwd, { type: 'endedUnreported' });
    });
  }

  /** `turnId` is not published, so binding one is a new object the chat cannot tell apart (ONL-2294). */
  private republishPen(cwd: string, before: PenState | null): void {
    if (samePenView(penView(before), penView(this.penSlot(cwd).pen))) return;
    const session = this.sessions.get(cwd);
    this.publishState(cwd, session?.id, backendState(session));
  }

  /** The row now names them, so the hold stops being their root (ONL-2294). */
  private settlePenImages(cwd: string, prompt: PenPrompt): void {
    const { images, files } = splitAttachments(prompt.attachments ?? []);
    settlePending(
      cwd,
      [...images, ...files].map((ref) => ref.id),
    );
  }

  private answerQuestion(target: AgentBackend | undefined, prompt: PenPrompt): boolean {
    if (target === undefined) return false;
    const ending = this.questionEnding(target);
    if (ending === undefined) return false;
    if (!target.answerQuestion(prompt.text, prompt.attachments, serverStopContext(target.cwd, prompt.context))) return false;
    ending('replied');
    return true;
  }

  /** Read before the question resolves: the count and the wait are gone once it has (ONL-2583). */
  private questionEnding(target: AgentBackend): ((outcome: QuestionEndOutcome) => void) | undefined {
    const parkedSince = target.questionParkedSince;
    const record = knownProject(target.cwd);
    if (parkedSince === undefined || record === undefined) return undefined;
    const events = [...target.events];
    return (outcome) =>
      recordQuestionEnded(
        { repoIdentity: record.repoIdentity, harness: target.harness },
        { outcome, events, parkedSince },
      );
  }

  private async placeStudioQuote(target: AgentBackend, quote: string | undefined): Promise<{ frame: { id: string; homeUrl: string }; quote: string; context: string } | undefined> {
    const cwd = target.cwd;
    const placement = studioQuotePlacement({
      isOn: flagOn('frame-covers'),
      isBlank: isRegisteredBlankProject(cwd),
      starterPort: starterHost()?.portFor(cwd),
      quote,
    });
    const repoIdentity = knownProject(cwd)?.repoIdentity;
    if (placement === undefined || repoIdentity === undefined) return undefined;
    const node = await applyStartingFrame(cwd, { url: originForPort(placement.port), name: t('canvas.startingFrame.name') });
    if (node === undefined) return undefined;
    return {
      frame: { id: node.id, homeUrl: node.content.homeUrl },
      quote: placement.quote,
      context: quotedFrameInstruction({
        link: frameLinkMarkdown({ repoIdentity, frameId: node.id }, node.name),
        frameId: node.id,
        url: node.content.homeUrl,
        liftsAtTurnEnd: true,
      }),
    };
  }

  private admitPrompt(target: AgentBackend | undefined, prompt: PenPrompt): PromptAdmission {
    if (target === undefined) return 'refused';
    const canSteer = steers(target);
    const slot = this.penSlot(target.cwd);
    const { outcome, sent } = this.penDispatch(target.cwd, {
      type: 'hold',
      prompt,
      isLive: target.isTurnLive && !canSteer,
      ...(slot.turnId === undefined ? {} : { turnId: slot.turnId }),
    });
    if (outcome.kind === 'held') return 'held';
    return sent ? 'sent' : 'refused';
  }

  private makeEmitState(
    cwd: string,
    sessionId: { current?: string },
    workingFrames: WorkingFrames,
  ): (state: BackendState) => void {
    let lastStreaming = false;
    let lastParked = false;
    let lastTurnLive = false;
    let lastTabStatus: TabStatus | undefined;
    return (state) => {
      // On the transition only: a repeated `isStreaming: false` would cancel a queued Start.
      if (state.isStreaming !== lastStreaming) {
        lastStreaming = state.isStreaming;
        noteTabWorking(cwd, state.isStreaming);
        noteSetupStreaming(cwd, state.isStreaming);
        if (state.isStreaming) {
          serverHost()?.turnStarted(cwd);
          workingFrames.turnStarted();
        } else {
          serverHost()?.turnEnded(cwd);
          gitStatusHost()
            ?.turnEnded(cwd)
            .catch((err: unknown) => logger.error('git-status turn-end measurement failed', { error: err }));
          workingFrames.turnEnded();
        }
      }
      const tabStatus = agentTabStatus(lastTabStatus, {
        isStreaming: state.isStreaming,
        needsAttention: state.needsAttention ?? false,
        turnEnding: state.turnEnding ?? false,
      });
      if (tabStatus !== lastTabStatus) {
        lastTabStatus = tabStatus;
        noteTabStatus(cwd, tabStatus);
      }
      // After the streaming transition: a turn boundary owns the set, and a hold must not survive it (ONL-2295).
      const parked = state.questionParkedSince !== undefined;
      if (parked !== lastParked) {
        lastParked = parked;
        const move = overlayMove(parked, state.turnEnding);
        if (move === 'hold') workingFrames.hold();
        else if (move === 'resume') workingFrames.resume();
      }
      this.publishState(cwd, sessionId.current, state);
      // Last: a release re-enters here with the next turn's state, and this payload would overwrite it (ONL-2294).
      if (state.isTurnLive !== lastTurnLive) {
        lastTurnLive = state.isTurnLive;
        if (!state.isTurnLive) {
          this.penAction(cwd, { type: 'liveSettled' });
          this.scheduleVerdictPass(cwd);
        }
      }
    };
  }

  /** The one builder of an `agent:state` payload; a pen change rides it with the live backend's own state (ONL-2294). */
  private publishState(cwd: string, sessionId: string | undefined, state: BackendState, key = projectKey(cwd)): void {
    const changed = this.busySessions.has(key) !== state.isStreaming;
    if (state.isStreaming) this.busySessions.add(key);
    else this.busySessions.delete(key);
    const waiting = penView(this.pen(cwd));
    const otherTabAgentBusy = this.busySessions.size > (this.busySessions.has(key) ? 1 : 0);
    this.publishedOtherTabBusy.set(key, otherTabAgentBusy);
    const payload: AgentStateEvent = {
      isStreaming: state.isStreaming,
      otherTabAgentBusy,
      midTurn: state.midTurn,
      cwd,
      sessionId,
      // Carried, not dropped: a re-announce mid-pause otherwise reads as nothing held (ONL-2455, ONL-2295).
      needsAttention: state.needsAttention ?? false,
      ...(state.questionParkedSince === undefined
        ? {}
        : { questionParkedSince: state.questionParkedSince }),
      turnWaitedMs: state.turnWaitedMs ?? 0,
      ...(waiting === undefined ? {} : { pen: waiting }),
      hasUserMessage: hasUserMessage(this.sessions.get(cwd)?.events ?? []),
    };
    views.routeTo(cwd, IPC_EMIT.agentState, payload);
    if (changed) this.publishOtherSessionStates(key);
  }

  private otherTabAgentBusy(cwd: string | undefined): boolean {
    const key = cwd === undefined ? undefined : projectKey(cwd);
    return this.busySessions.size > (key !== undefined && this.busySessions.has(key) ? 1 : 0);
  }

  private publishOtherSessionStates(changedKey: string): void {
    for (const session of this.sessions.values()) {
      const key = projectKey(session.cwd);
      const otherTabAgentBusy = this.busySessions.size > (this.busySessions.has(key) ? 1 : 0);
      if (key !== changedKey && this.publishedOtherTabBusy.get(key) !== otherTabAgentBusy) {
        this.publishState(session.cwd, session.id, backendState(session), key);
      }
    }
  }

  /** `error`/`ok` are this project's, the rest are machine facts (ONL-2247), and a refused codex credential is every codex tab's (ONL-2114). */
  private makeEmitConnection(cwd: string, harness: SessionHarness): (connection: AgentConnection) => void {
    return (connection) => {
      if (
        harness === 'appserver' &&
        (connection.status === 'unauthenticated' || (connection.status === 'ok' && this.codexRefused))
      ) {
        this.holdCodexRefusal();
        return;
      }
      if (connection.status !== 'error' && connection.status !== 'ok') {
        if (harness === 'appserver' && connection.status === 'cli_missing') {
          const key = projectKey(cwd);
          this.own.set(key, { cwd, harness, connection });
          this.stale.add(key);
        }
        this.emitMachine(connection, harness);
        return;
      }
      this.own.set(projectKey(cwd), { cwd, harness, connection });
      views.routeTo(cwd, IPC_EMIT.agentConnection, connection);
    };
  }

  /** Broadcast reaches the unregistered projects list; the re-send after it keeps each tab's own verdict on top. */
  private emitMachine(connection: AgentConnection, harness: SessionHarness): void {
    this.machine = connection;
    this.machineByHarness.set(harness, connection);
    // Errors only: dropping a held `ok` lets another runtime's verdict stick on that tab.
    for (const [key, held] of this.own) {
      if (held.harness === harness && held.connection.status === 'error') this.own.delete(key);
    }
    broadcastToRenderers(IPC_EMIT.agentConnection, connection);
    for (const held of this.own.values()) views.routeTo(held.cwd, IPC_EMIT.agentConnection, held.connection);
    for (const session of this.sessions.values()) {
      if (session.harness === harness || this.own.has(projectKey(session.cwd))) continue;
      const verdict = this.verdictFor(session.cwd);
      if (!sameConnection(verdict, connection)) views.routeTo(session.cwd, IPC_EMIT.agentConnection, verdict);
    }
  }

  /** Not the machine verdict: that one is read by Claude tabs and the projects list. */
  private holdCodexRefusal(): void {
    this.codexRefused = true;
    for (const session of this.sessions.values()) {
      if (session.harness !== 'appserver') continue;
      this.own.set(projectKey(session.cwd), { cwd: session.cwd, harness: 'appserver', connection: CODEX_REFUSED });
      views.routeTo(session.cwd, IPC_EMIT.agentConnection, CODEX_REFUSED);
    }
  }

  /** A live app-server never re-reads a credential written by the sign-in's own codex, so each refused session restarts. */
  private answerCodexRefusal(answer: AgentConnection): void {
    this.codexRefused = false;
    for (const [key, held] of this.own) {
      if (held.harness !== 'appserver' || held.connection.status !== 'unauthenticated') continue;
      this.own.set(key, { ...held, connection: answer });
      this.stale.add(key);
    }
  }

  private holdsError(harness: SessionHarness): boolean {
    return [...this.own.values()].some((held) => held.harness === harness && held.connection.status === 'error');
  }

  private verdictFor(cwd: string | undefined): AgentConnection {
    const held = cwd === undefined ? undefined : this.own.get(projectKey(cwd));
    if (held !== undefined) return held.connection;
    const harness = cwd === undefined ? undefined : this.sessions.get(cwd)?.harness ?? this.offDefaultHarness(cwd);
    if (harness === undefined) return this.machine;
    return this.machineByHarness.get(harness) ?? { status: 'unknown', harness: harnessStoredAs(harness).id };
  }

  private emitSession(payload: AgentSessionInfo): void {
    views.routeTo(payload.cwd, IPC_EMIT.agentSession, payload);
  }

  private reannounce(session: AgentBackend): void {
    this.emitSession({ sessionId: session.id, cwd: session.cwd });
    this.publishState(session.cwd, session.id, backendState(session));
  }

  // Before onboarding the reader is the chooser's Claude tile; a codex verdict there mis-arms the gate (ONL-2108).
  private defaultHarness(): SessionHarness {
    if (!readOnboardingState().hasOnboarded) return 'claude';
    return storedHarness(selectedHarness());
  }

  /** A Project on the default keeps reading the machine verdict (ONL-2914). */
  private offDefaultHarness(cwd: string): SessionHarness | undefined {
    if (knownProject(cwd) === undefined) return undefined;
    const harness = storedHarness(projectHarness(cwd));
    return harness === this.defaultHarness() ? undefined : harness;
  }

  private inPlay(harness: SessionHarness): boolean {
    const live = this.sessions.values();
    if (live.length > 0) return live.some((session) => session.harness === harness);
    return this.defaultHarness() === harness;
  }

  /** `probed` may be codex's after a default flip; deriving Claude's banner from it stamps a codex miss `claude`. */
  private claudeProbe(): AgentConnection | undefined {
    return this.probed?.harness === 'codex' ? undefined : this.probed;
  }

  async probe(req: AgentProbeRequest = {}, cwd?: string): Promise<AgentConnection> {
    // A fresh ask from a tab holding a verdict is about that runtime, not the default.
    const held = cwd === undefined ? undefined : this.own.get(projectKey(cwd));
    await this.probeMachine(req, req.fresh ? held?.harness : undefined);
    return this.verdictFor(cwd);
  }

  private async probeMachine(req: AgentProbeRequest, runtimeOfAsker?: SessionHarness): Promise<AgentConnection> {
    this.machine = probeMemo(this.machine, req);
    if (this.machine.status !== 'unknown') return this.machine;
    return shareInFlight(this.probing, async () => {
      const runtime = runtimeOfAsker ?? this.defaultHarness();
      const result = await (runtime === 'appserver'
        ? Promise.resolve(probeCodexConnection(codexSetupStatus(), codexRoot()))
        : probeConnection());
      this.probed = result;
      this.emitMachine(result, runtime);
      return result;
    });
  }

  // Unlike codex, a live Claude session never reports its own `ok`, so no verdict here yields to one.
  noteClaudeSetup(state: ClaudeSetupState, meta: { afterLogin: boolean }): void {
    const previous = this.claudeSetup;
    if (state.status !== 'checking' && state.status !== 'verifying') this.claudeSetup = state.status;
    if (marksSessionsStale(previous, state.status, meta.afterLogin)) {
      for (const session of this.sessions.values()) {
        if (session.harness === 'claude') this.stale.add(projectKey(session.cwd));
      }
    }
    const derived = deriveClaudeConnection(this.claudeProbe(), state.status, state.detail);
    if (derived === undefined) return;
    this.machineByHarness.set('claude', derived);
    if (!this.inPlay('claude')) return;
    // A held Claude session error makes it a change: a recovery finds the machine already `ok`.
    if (sameConnection(derived, this.machine) && !this.holdsError('claude')) return;
    this.emitMachine(derived, 'claude');
  }

  async noteHarnessDefaultChanged(): Promise<void> {
    if (this.sessions.size > 0) return;
    this.probed = undefined;
    this.machine = { status: 'unknown' };
    // Cleared with the memo, or `shareInFlight` hands back the previous default's probe.
    this.probing.current = undefined;
    await this.probe();
  }

  private intend(cwd: string, wanted: boolean): { key: ProjectKey; generation: number } {
    const key = projectKey(cwd);
    this.generation += 1;
    this.intents.set(key, { wanted, generation: this.generation });
    return { key, generation: this.generation };
  }

  /** No recorded intent reads as wanted: a session seeded or restarted outside the wrappers is one somebody wants. */
  private isWanted(cwd: string): boolean {
    return this.intents.get(projectKey(cwd))?.wanted ?? true;
  }

  private requestStart(cwd: string, model?: string): Promise<void> {
    const { key } = this.intend(cwd, true);
    return this.lifecycle.run(key, () => this.startSession(cwd, model));
  }

  private requestStop(cwd: string): Promise<void> {
    const { key, generation } = this.intend(cwd, false);
    return this.lifecycle.run(key, async () => {
      // A later request supersedes this one: close-then-reopen keeps the live session.
      if (this.intents.get(key)?.generation !== generation) return;
      await this.stopSession(cwd, 'destroyed');
    });
  }

  /** One queued step: a `requestStop`/`requestStart` pair's stop would see the start's generation and skip, keeping the live session (ONL-2198). */
  private async newChat(cwd: string): Promise<boolean> {
    // The renderer disables the control; these are the backstops (ONL-2198).
    const live = this.sessions.get(cwd);
    if (live === undefined || live.isStreaming) return false;
    // The archive caps: archiving a welcome row or a Studio-sent prompt evicts the oldest real chat, its only copy.
    if (!live.events.some(isUserSpoken)) return false;

    const { key } = this.intend(cwd, true);
    let started = false;
    await this.lifecycle.run(key, async () => {
      const session = this.sessions.get(cwd);
      if (session === undefined) return;
      // Archived undebounced and before anything clears: a kill after this point keeps the chat, and `startSession` clears the transcript (ONL-2198).
      archiveChat(cwd, session.harness, { sessionId: session.id, events: session.events });
      this.frameQuotes.forget(cwd);
      this.superseded.add(session);
      this.pendingHandoff.delete(key);
      // Both runtimes: after a switch, the other runtime's record would resume (ONL-2198).
      for (const harness of STORED_HARNESSES) {
        // Before the record, so a write that throws leaves the chat resumable with its grants intact,
        // which is this step's contract; the session holding them is stopped below (ONL-2933).
        forgetAllowRules(cwd, harness);
        forgetSession(cwd, harness);
      }
      await this.stopSession(cwd, 'replaced');
      await this.startSession(cwd);
      // Reported after the work: `startSession` has several silent refusals.
      started = this.sessions.get(cwd) !== undefined;
      const record = knownProject(cwd);
      if (started && record !== undefined) recordChatNewStarted(record.repoIdentity, session);
    });
    return started;
  }

  /** `newChat`'s order, with this Project's agent written between the stop and the start (ONL-2903). */
  private async switchHarness(cwd: string, harness: HarnessId, entry: AgentSwitchEntry): Promise<boolean> {
    const live = this.sessions.get(cwd);
    if (live === undefined || live.isStreaming) return false;
    if (live.harness === storedHarness(harness)) return false;
    // A pin outranks the Project's own agent, so the switch could only restart the same one.
    const pinned = pinnedHarness();
    if (pinned !== undefined && pinned !== harness) return false;
    if (knownProject(cwd) === undefined) return false;

    const { key } = this.intend(cwd, true);
    let started = false;
    await this.lifecycle.run(key, async () => {
      const session = this.sessions.get(cwd);
      if (session === undefined || session.isStreaming) return;
      if (session.events.some(isUserSpoken)) archiveChat(cwd, session.harness, { sessionId: session.id, events: session.events });
      this.frameQuotes.forget(cwd);
      const savedAt = session.transcriptPath;
      this.superseded.add(session);
      for (const stored of STORED_HARNESSES) {
        forgetAllowRules(cwd, stored);
        forgetSession(cwd, stored);
      }
      await this.stopSession(cwd, 'replaced');
      setProjectHarness(cwd, harness);
      await this.startSession(cwd);
      started = this.sessions.get(cwd) !== undefined;
      if (started && savedAt !== undefined) this.pendingHandoff.set(key, previousChatInstruction(harnessIdOf(session.harness), savedAt));
      const record = knownProject(cwd);
      if (started && record !== undefined) recordAgentSwitched(record.repoIdentity, session.harness, harness, entry);
    });
    return started;
  }

  private async restartIfStale(cwd: string | undefined): Promise<AgentBackend | undefined> {
    if (cwd === undefined) return undefined;
    const key = projectKey(cwd);
    const inFlight = this.restarting.get(key);
    if (inFlight !== undefined) {
      await inFlight;
      return this.sessions.get(cwd);
    }
    const session = this.sessions.get(cwd);
    if (this.stale.size === 0) return session;
    if (session === undefined) return session;
    if (!this.stale.has(key)) return session;
    // `startSession` refuses these quietly, after the teardown had already run.
    if (!knownProject(cwd) || !existsSync(cwd)) return session;

    const run = this.lifecycle.run(key, async () => {
      if (!this.isWanted(cwd) || !this.stale.has(key)) return;
      this.stale.delete(key);
      await this.stopSession(cwd, 'replaced');
      if (!this.isWanted(cwd)) return;
      await this.startSession(cwd);
      if (this.sessions.get(cwd) === undefined && this.isWanted(cwd)) this.stale.add(key);
    });
    this.restarting.set(key, run);
    try {
      await run;
    } finally {
      this.restarting.delete(key);
    }
    return this.sessions.get(cwd);
  }

  noteCodexSetup(status: CodexSetupStatus): void {
    const derived = probeCodexConnection(status, codexRoot());
    this.machineByHarness.set('appserver', derived);
    if (!this.inPlay('appserver')) return;
    if (derived.status === 'ok' && this.codexRefused) this.answerCodexRefusal(derived);
    for (const [key, held] of this.own) {
      if (held.harness !== 'appserver' || !this.stale.has(key)) continue;
      this.own.set(key, { ...held, connection: derived });
    }
    this.emitMachine(derived, 'appserver');
  }

  snapshot(req: AgentSnapshotRequest = {}, cwd: string | undefined): AgentSnapshot {
    const session = cwd === undefined ? undefined : this.sessions.get(cwd);
    const waiting = cwd === undefined ? undefined : penView(this.pen(cwd));
    return {
      sessionId: session?.id,
      cwd: session?.cwd,
      events: session?.eventsSince(req.sinceSeq) ?? [],
      isStreaming: session?.isStreaming ?? false,
      otherTabAgentBusy: this.otherTabAgentBusy(cwd),
      needsAttention: session?.needsAttention ?? false,
      ...(session?.questionParkedSince === undefined
        ? {}
        : { questionParkedSince: session.questionParkedSince }),
      turnWaitedMs: session?.turnWaitedMs ?? 0,
      ...(waiting === undefined ? {} : { pen: waiting }),
      hasUserMessage: hasUserMessage(session?.events ?? []),
      midTurn: session?.midTurn ?? 'steer',
      lastSeq: session?.lastSeq ?? 0,
      connection: this.verdictFor(cwd),
    };
  }

  async command(command: ClientCommand, cwd: string | undefined): Promise<AgentCommandAcceptance> {
    const session = cwd === undefined ? undefined : this.sessions.get(cwd);
    const harness = session?.harness ?? 'claude';
    switch (command.type) {
      case 'connectors.open': {
        if (!flagOn('connectors') || session === undefined || (command.source !== 'plug' && command.source !== 'add-menu' && command.source !== 'notice')) return { accepted: false };
        capture('connector_menu_opened', connectorMenuProperties(harness, command.source, this.connectorInventories.get(session)));
        return { accepted: true };
      }
      case 'connectors.act':
        if (!flagOn('connectors') || typeof command.id !== 'string') return { accepted: false };
        return { accepted: session?.actOnConnector?.(command.id) ?? false };
      case 'connectors.add':
        if (!flagOn('connectors') || (command.provider !== 'figma' && command.provider !== 'mobbin')) return { accepted: false };
        return { accepted: session?.addConnector?.(command.provider) ?? false };
      case 'turn.resume': {
        if (session === undefined || session.isTurnLive || !isResumable(command.method, foldSessionState(session.events))) return { accepted: false };
        const target = await this.restartIfStale(cwd);
        if (target === undefined || target.isTurnLive) return { accepted: false };
        // The resume prompt is matched by its exact English text, so it never goes through the catalog or a translation (ONL-2665).
        const accepted = target.prompt('continue', undefined, serverStopContext(target.cwd), 'user', { origin: 'studio' });
        if (accepted) capture('turn_resumed', { method: command.method });
        return { accepted };
      }
      case 'session.start':
        await this.requestStart(command.cwd, command.model);
        return { accepted: true };
      case 'session.stop':
        if (cwd !== undefined) await this.requestStop(cwd);
        return { accepted: true };
      case 'session.newChat':
        if (cwd === undefined) return { accepted: false };
        return { accepted: await this.newChat(cwd) };
      case 'session.switchHarness':
        if (cwd === undefined) return { accepted: false };
        return { accepted: await this.switchHarness(cwd, command.harness, command.entry) };
      case 'skills.refresh':
        if (session?.refreshSkills === undefined) return { accepted: false };
        await session.refreshSkills();
        return { accepted: true };
      case 'prompt': {
        const answersQuestion = command.answersQuestion === true;
        const target = await this.restartIfStale(cwd);
        if (command.attachments !== undefined) {
          const admitted = [];
          for (const attachment of command.attachments) {
            if ('kind' in attachment && attachment.kind === 'artifact') {
              const read = await artifactStore().read(attachment.artifactId);
              if (read.outcome !== 'resolved') return { accepted: false };
              if (attachment.pagePath !== undefined && !read.manifest.pages.some((page) => page.path === attachment.pagePath)) return { accepted: false };
              admitted.push({ ...attachment, title: read.manifest.title });
            } else admitted.push(attachment);
          }
          command = { ...command, attachments: admitted };
        }
        const record = target === undefined ? undefined : knownProject(target.cwd);
        const naming = target === undefined ? undefined : namingContextFor(target.events, record);
        const dismissed = target === undefined ? undefined : dismissedQuestionsContext(target.events);
        const handoffKey = target === undefined ? undefined : projectKey(target.cwd);
        const handoff = handoffKey === undefined ? undefined : this.pendingHandoff.get(handoffKey);
        const duringSetup = target !== undefined && steers(target) && latestTurnOpensSetupSteps(target.events) ? DURING_SETUP_CONTEXT : undefined;
        const starting = target === undefined || answersQuestion ? undefined : await this.placeStudioQuote(target, command.quote);
        const context = joinNamingContext(
          joinNamingContext(joinNamingContext(joinNamingContext(joinNamingContext(command.context, naming), starting?.context), handoff), dismissed),
          duringSetup,
        );
        // The funnel fires at the backend, not here: a held prompt may never go (ONL-2294).
        const acceptance = acceptPromptCommand(
          context === undefined ? command : { ...command, context },
          target,
          settlePending,
          (prompt) =>
            answersQuestion && this.answerQuestion(target, prompt)
              ? 'sent'
              : this.admitPrompt(target, prompt),
        );
        if (acceptance.accepted && handoffKey !== undefined) this.pendingHandoff.delete(handoffKey);
        if (starting !== undefined && target !== undefined) {
          if (acceptance.accepted) {
            this.placeFrameQuote(target.cwd, { kind: 'frame', ...starting.frame }, starting.quote, 'studio');
            this.workingFrames.get(projectKey(target.cwd))?.markNextTurn(starting.frame.id);
          } else {
            await removeStartingFrame(target.cwd, starting.frame.id);
          }
        }
        return acceptance;
      }
      case 'inspiration.start': {
        if (cwd === undefined || typeof command.frameId !== 'string') return { accepted: false };
        const target = await this.restartIfStale(cwd);
        if (target === undefined) return { accepted: false };
        const key = projectKey(target.cwd);
        const opening = inspirationOpeningFor({
          isOn: flagOn('blank-first-moment'),
          isBusy: target.isTurnLive || target.isStreaming || this.pen(target.cwd) !== null,
          alreadyOpened: this.inspirationsOpened.has(`${key}\n${command.frameId}`),
          doc: (await canvasPagedSnapshotFor(target.cwd)).doc,
          frameId: command.frameId,
          repoIdentity: knownProject(target.cwd)?.repoIdentity,
        });
        if (opening === undefined) return { accepted: false };
        const accepted = target.prompt(opening, [], undefined, 'studio', { origin: 'studio', hidden: true });
        if (accepted) this.inspirationsOpened.add(`${key}\n${command.frameId}`);
        return { accepted };
      }
      case 'permission.respond': {
        // Never every held session: request ids are unique per runtime only (ONL-2243), so the answer names its own.
        const target = command.cwd === undefined ? session : this.sessions.get(command.cwd);
        const requestId = command.requestId;
        const request = target?.events.findLast((event) => event.type === 'permission.requested' && event.requestId === requestId);
        const ending = target === undefined || command.answers === undefined ? undefined : this.questionEnding(target);
        const accepted = target?.respond(command.requestId, command.optionId, command.answers) ?? false;
        if (accepted && ending !== undefined) ending('picked');
        if (accepted && command.answers !== undefined && request?.type === 'permission.requested' && request.questions !== undefined && target !== undefined) {
          capture('question_answered', questionAnsweredProperties(request.questions, command.answers, command.input ?? 'tap', request.ts, target.harness, command.wentBack === true));
        }
        return { accepted };
      }
      case 'session.setModel': {
        const pick: ModelPick = (await session?.setModel(command.model)) ?? { accepted: false };
        if (!pick.accepted) {
          return { accepted: false, ...(pick.refusal === undefined ? {} : { modelRefusal: pick.refusal }) };
        }
        if (cwd) rememberModelChoice(cwd, harness, command.model);
        return { accepted: true };
      }
      case 'session.setEffort':
        await session?.setEffort(command.effort);
        if (cwd) rememberEffortChoice(cwd, harness, command.effort);
        return { accepted: true };
      case 'session.setPermissionMode': {
        // Refused rather than remembered when the backend does not enforce it (ONL-2190).
        const applied = (await session?.setPermissionMode(command.mode)) ?? false;
        if (applied && cwd) {
          rememberPermissionMode(cwd, harness, command.mode);
          recordPermissionModeChanged({ mode: command.mode, harness });
        }
        return { accepted: applied };
      }
      case 'interrupt': {
        const ending = session === undefined ? undefined : this.questionEnding(session);
        if (session !== undefined) this.notifications.cancel(session);
        await session?.interrupt();
        // A skip hands the turn back to the agent; a Stop ends it, and codex keeps streaming with no `turn.ended` (ONL-3343).
        if (cwd !== undefined && command.cause !== 'question.skip') noteSetupTurnStopped(cwd);
        ending?.(command.cause === 'question.skip' ? 'skipped' : 'stopped');
        return { accepted: true };
      }
      case 'question.dismiss': {
        if (session === undefined) return { accepted: false };
        const ending = this.questionEnding(session);
        if (session.questionParkedSince !== undefined) this.notifications.cancel(session);
        const accepted = await session.dismissQuestion();
        if (accepted) ending?.('dismissed');
        return { accepted };
      }
      case 'pen.take': {
        if (cwd === undefined) return { accepted: false };
        const outcome = this.penAction(
          cwd,
          { type: 'take', penId: command.penId },
          command.auto === true,
        );
        if (outcome.kind !== 'taken') return { accepted: false };
        return {
          accepted: true,
          taken: {
            text: outcome.prompt.text,
            ...(outcome.prompt.attachments === undefined
              ? {}
              : { attachments: outcome.prompt.attachments }),
          },
        };
      }
      case 'pen.discard': {
        if (cwd === undefined) return { accepted: false };
        const outcome = this.penAction(cwd, { type: 'discard', penId: command.penId });
        return { accepted: outcome.kind === 'emptied' };
      }
    }
  }

  async diagnosticArtifactTool(request: DebugArtifactToolRequest): Promise<ArtifactToolResult> {
    if (!this.isDev || typeof request !== 'object' || request === null || typeof request.worktreePath !== 'string') return { ok: false, reason: 'No artifact session is available.' };
    const session = this.sessions.get(request.worktreePath);
    const reporter = this.artifactReporters.get(projectKey(request.worktreePath));
    if (session === undefined || reporter === undefined || !this.isWanted(request.worktreePath) || !Object.keys(ARTIFACT_TOOL_NAMES).includes(request.verb)) return { ok: false, reason: 'Choose an open registered project first.' };
    if (typeof request.input !== 'object' || request.input === null) return { ok: false, reason: 'Use a structured artifact request.' };
    try { return await reporter(request.verb, request.input); }
    catch { return { ok: false, reason: 'The artifact tool refused this request.' }; }
  }

  async studioPrompt(cwd: string, text: string, context?: string, signal?: AbortSignal): Promise<boolean> {
    const session = await this.restartIfStale(cwd);
    if (session === undefined || signal?.aborted) return false;
    const sent = session.prompt(text, [], serverStopContext(cwd, context), 'studio');
    const record = knownProject(cwd);
    if (sent && record !== undefined && opensSetupSteps({ text, ...(context === undefined ? {} : { context }) })) {
      recordSetupStepsShown({ repoIdentity: record.repoIdentity, sessionId: session.id, harness: session.harness });
    }
    return sent;
  }

  /** Guarded before `registerSender`: an unknown path must not repoint the view's cwd mapping (ONL-1829). */
  async selectProject(project: ProjectSelected, registerSender: () => void): Promise<void> {
    if (!knownProject(project.path)) {
      logger.warn('ignoring project:selected: not a known workspace (ONL-1829)');
      return;
    }
    if (isRemovingProject(project.path)) {
      logger.warn('ignoring project:selected: the project is being removed (ONL-2315)');
      return;
    }
    registerSender();
    // The chat's snapshot ran before the view re-registered; it needs this workspace's verdict even when nothing is held (ONL-2247).
    views.routeTo(project.path, IPC_EMIT.agentConnection, this.verdictFor(project.path));
    recordProjectOpened(project.path);
    gitStatusHost()
      ?.opened(project.path)
      .catch((err: unknown) => logger.error('git-status open measurement failed', { error: err }));
    await this.command({ type: 'session.start', cwd: project.path }, project.path);
  }

  /** Stops nothing (ONL-2243); every caller runs it inside the lifecycle queue, which gives the post-plan `isWanted` read its meaning. */
  protected async startSession(cwd: string, requestedModel?: string): Promise<void> {
    const live = this.sessions.get(cwd);
    if (live !== undefined) {
      // The asking view may have read its snapshot before main mapped it here; the announce makes it read again (ONL-2456).
      this.reannounce(live);
      return;
    }

    // Creation is a renderer flow that can be skipped, so the isolation check lives at the start; the quiet refusal is the backstop (ONL-1829).
    const workspace = knownProject(cwd);
    if (!workspace || workspace.internal === 'artifacts') {
      logger.warn('refusing to start a session: not a known workspace (ONL-1829)');
      return;
    }

    // The SDK reports a missing cwd as a libc/binary mismatch, and the registry outlives the worktree.
    if (!existsSync(cwd)) {
      logger.warn('refusing to start a session: the workspace is registered but no longer on disk');
      return;
    }

    this.stale.delete(projectKey(cwd));

    // Here, not in `projects:open`: two entries skip that channel (ONL-1913).
    noteWorkspaceOpened(cwd);

    const harness = storedHarness(projectHarness(cwd));

    // A resume restores the conversation into the model only; the transcript is ours (ONL-1913).
    const plan = harness === 'appserver' ? ({ kind: 'appserver' } as const) : await planSession(cwd);
    await holdStartForProof(cwd);
    // The tab may have closed while this planned (ONL-2264).
    if (!this.isWanted(cwd)) return;

    // A resume keeps its own record; a read that fails starts on defaults (ONL-2183).
    const isResume =
      plan.kind === 'appserver' ? storedAppServerThread(cwd) !== undefined : plan.kind === 'resume';
    const preference = ((): ChatPreference => {
      try {
        return (isResume ? preferenceFor(cwd, harness) : seedPreference(cwd, harness)) ?? {};
      } catch (err) {
        logger.warn('chat preference unreadable, starting on defaults', { error: err });
        return {};
      }
    })();
    const model = startModel(requestedModel, preference.model);
    const effort = preference.effort === undefined ? {} : { effort: preference.effort };
    const permissionMode =
      preference.permissionMode === undefined ? {} : { permissionMode: preference.permissionMode };
    // The grants last as long as this Project Chat: a relaunch keeps them, a new chat forgets them (ONL-2933).
    const held = usableAllowRules(preference.allowRules);
    const allowRules = held.length === 0 ? {} : { allowRules: held };

    // A transcript beside a fresh session shows a conversation the agent has no memory of (ONL-1913).
    const restored = plan.kind === 'resume' ? readTranscript(cwd, 'claude') : [];
    if (plan.kind === 'fresh') {
      clearTranscript(cwd, 'claude');
      // GC, not a workspace-wide delete: the other runtime's drawer may reference blobs here (ONL-2124).
      scheduleGc();
    }

    // `welcome()` is skipped on a restore; the briefing is not.
    const names: WelcomeProject = {
      sourceRepoName: workspace.sourceRepoName,
      workspaceName: workspace.workspaceName,
      branchName: workspace.branchName,
      baseBranch: workspace.baseBranch,
      ...(workspaceOrigin(workspace) === 'copied' ? { copied: true as const } : {}),
    };
    // From the runner, not from "is this a blank project" (ONL-2152).
    const starterPort = starterHost()?.portFor(cwd);
    const starter =
      starterPort === undefined
        ? {}
        : { starter: { paragraph: starterBriefingFor(cwd, starterPort) } };

    const sessionWorkingFrames = new WorkingFrames({
      onChange: (frameIds, changes, waitingOn) => {
        views.routeTo(cwd, IPC_EMIT.agentWorkingFrames, { cwd, frameIds, changes, ...(waitingOn === undefined ? {} : { waitingOn }) });
      },
    });
    this.workingFrames.set(projectKey(cwd), sessionWorkingFrames);
    const markFrame = (frameId: string, words?: FrameChangeWords): void => sessionWorkingFrames.mark(frameId, words);
    const markFrames = (frameIds: string[]): void => {
      for (const frameId of frameIds) markFrame(frameId);
    };

    const studioSinks: StudioToolSinks = {
      projectSetup: respectServerStop(cwd, {
        read: () => projectSetupService().read(cwd),
        save: (definition, expectedRevision) => projectSetupService().save(cwd, definition, expectedRevision),
        run: (action) => projectSetupService().run(cwd, action),
      }),
      onSaveAttachment: (id, path) => saveAttachment(cwd, this.sessions.get(cwd)?.events ?? [], id, path),
      onDeleteProjectFile: (path, signal) => deleteProjectFile(projectKey(cwd), path, signal),
      onArtifact: createArtifactAccess({
        store: artifactStore(),
        givenIds: async () => {
          const session = this.sessions.get(cwd);
          return [
            ...(session === undefined ? [] : artifactSessionGrants(cwd, artifactGrantSessionId(session, storedAppServerThread(cwd)))),
            ...Object.values((await canvasSnapshotFor(cwd)).doc?.nodes ?? {}).flatMap((node) => node.kind === 'artifact' ? [node.content.artifactId] : []),
            ...(this.sessions.get(cwd)?.events ?? restored).flatMap((event) => event.type === 'message.user' ? splitAttachments(event.attachments ?? []).artifacts.map((attachment) => attachment.artifactId) : []),
          ];
        },
        place: async ({ quote, ...input }) => {
          const outcome = await applyAgentCreateArtifact(cwd, input);
          if (outcome.ok && quote !== undefined && flagOn('frame-covers') && outcome.node.kind === 'artifact') {
            this.placeFrameQuote(cwd, { id: outcome.node.id, kind: 'artifact', artifactId: outcome.node.content.artifactId }, quote, 'agent');
            markFrame(outcome.node.id);
          }
          return outcome;
        },
        import: async (path) => importArtifactFromProject(cwd, path, (bytes) => {
          const image = electronImageOps().decode(bytes);
          if (image === null) return null;
          const size = image.getSize();
          if (size.width * size.height > MAX_ARTIFACT_RASTER_PIXELS) return null;
          return image.toPNG();
        }),
        projectNames: [workspace.sourceRepoName],
        created: (artifactId) => {
          const session = this.sessions.get(cwd);
          if (session !== undefined) rememberArtifactSessionGrant(cwd, artifactGrantSessionId(session, storedAppServerThread(cwd)), artifactId);
          capture('artifact_created', { ...workspaceTelemetryProperties(workspace.repoIdentity), method: 'agent' });
        },
        changed: (artifactId) => {
          broadcastToRenderers(IPC_EMIT.artifactChanged, { artifactId });
          // The nodes showing it count as worked on, so their titles shimmer like a frame's (ONL-2593).
          void canvasSnapshotFor(cwd).then((snapshot) => {
            for (const node of Object.values(snapshot.doc?.nodes ?? {})) {
              if (node.kind === 'artifact' && node.content.artifactId === artifactId) markFrame(node.id);
            }
          }, () => undefined);
        },
        edited: (pageCount, firstWrite) => capture('artifact_edited', { page_count: pageCount, first_write: firstWrite }),
        written: (artifactId) => this.frameQuotes.artifactWritten(cwd, artifactId),
        imported: (pageCount) => capture('artifact_imported', { page_count: pageCount }),
      }),
      onServerRunning: async (port, reportedCwd) => {
        if (own.current !== undefined && this.sessions.get(cwd) !== own.current) return;
        const folder = resolveReportedFolder(cwd, reportedCwd);
        // Read BEFORE the report: the report is the thing that retires it.
        const starterPortAtReport = starterHost()?.portFor(cwd);
        const reported = serverHost()?.report(cwd, folder, port, workspaceTelemetryProperties(workspace.repoIdentity));
        void rememberReportedApp({ worktree: cwd, repoIdentity: workspace.repoIdentity, folder, port }).catch(
          (err: unknown) => {
            logger.warn('app choice not remembered', { error: err });
          },
        );
        // After the report has seated the server: the machine's next move is `awaitRunning`.
        const frame = await (reported ?? Promise.resolve())
          .catch((err: unknown) => {
            logger.error('server_running report failed', { error: err });
          })
          .then(() => noteSetupReport(cwd, port ?? DEFAULT_DEV_PORT));
        return starterPortAtReport === undefined || starterPortAtReport === port
          ? { frame }
          : { retiringStarterPort: starterPortAtReport, frame };
      },
      onFrameWorking: markFrame,
      onWaitingOn: (what) => sessionWorkingFrames.waitingOn(what),
      onFrameUrl: (frameId, url) => {
        markFrame(frameId);
        return applyAgentFrameUrl(frameId, url, cwd);
      },
      onRenameProject: (name) => {
        if (knownProject(cwd)?.displayNameSource === 'provisional' && !this.sessions.get(cwd)?.events.some(isUserSpoken)) {
          return Promise.resolve({ ok: false, reason: 'Name this copy after the first user message.' });
        }
        return renameProjectByAgent(cwd, name);
      },
      onCreateProjectTab: () => createProjectTabByAgent(cwd),
      onSuggestNextTasks: (tasks) => {
        const session = this.sessions.get(cwd);
        if (session === undefined) return;
        recordNextTasksOffered({ repoIdentity: workspace.repoIdentity, sessionId: session.id, harness: session.harness }, tasks.length);
      },
      onClipNextTaskPictures: async (frameId, targets) => {
        const clipped = await clipAgentFramePictures(cwd, frameId, targets);
        const session = this.sessions.get(cwd);
        if (session !== undefined) {
          const byRef = targets.filter((target) => target.ref !== undefined).length;
          recordNextTaskPicturesClipped({ repoIdentity: workspace.repoIdentity, sessionId: session.id, harness: session.harness }, clipped, byRef);
        }
        return clipped.pictures;
      },
      onListFrames: (request) => listAgentFrames(cwd, workspace.repoIdentity, request),
      onListPages: () => listAgentPages(cwd),
      // The page events are stamped here, where the author is known: the renderer's own map cannot claim the agent wrote one (ONL-2488).
      onCreatePage: async (request) => {
        const outcome = await applyAgentCreatePage(cwd, request);
        if (outcome.ok) {
          capture('page_created', { ...workspaceTelemetryProperties(workspace.repoIdentity), method: 'agent' });
        }
        return outcome;
      },
      onRenamePage: async (request) => {
        const outcome = await applyAgentRenamePage(cwd, request);
        if (outcome.ok) {
          capture('page_renamed', {
            ...workspaceTelemetryProperties(workspace.repoIdentity),
            method: 'agent',
            became_divider: outcome.page.divider,
          });
        }
        return outcome;
      },
      onReorderPage: (request) => applyAgentReorderPage(cwd, request),
      onDeletePage: async (request) => {
        const outcome = await applyAgentDeletePage(cwd, request);
        if (outcome.ok) {
          capture('page_deleted', {
            ...workspaceTelemetryProperties(workspace.repoIdentity),
            method: 'agent',
            had_nodes: outcome.removed.objects > 0,
            // The approval card is the agent's prompt; no dialog of the user's own was raised.
            confirmed: false,
          });
        }
        return outcome;
      },
      onMoveNodesToPage: async (request) => {
        const outcome = await applyAgentMoveNodesToPage(cwd, request, workspace.repoIdentity);
        if (outcome.ok && outcome.nodes.length > 0) {
          capture('page_nodes_moved', {
            ...workspaceTelemetryProperties(workspace.repoIdentity),
            method: 'agent',
            node_count: outcome.nodes.length,
          });
        }
        return outcome;
      },
      onCreateFrame: async ({ words, quote, ...create }) => {
        const outcome = await applyAgentCreateFrame(cwd, create);
        if (outcome.ok && create.kind !== 'section') {
          markFrame(outcome.node.id, words === undefined ? undefined : { kind: 'created', ...words });
          if (quote !== undefined && flagOn('frame-covers') && outcome.node.kind === 'browser') {
            this.placeFrameQuote(cwd, { id: outcome.node.id, kind: 'frame', homeUrl: outcome.node.content.homeUrl }, quote, 'agent');
          }
          // `click` is the shape: one frame at one place.
          capture('frame_created', {
            ...workspaceTelemetryProperties(workspace.repoIdentity),
            method: 'click',
            source: 'agent',
          });
        }
        return outcome;
      },
      onClearFrameQuote: ({ frameId }) =>
        Promise.resolve(this.frameQuotes.clear(cwd, frameId) ? { ok: true as const } : { ok: false as const, reason: 'that frame or artifact shows no quote' }),
      onMoveFrame: async ({ quote, ...request }) => {
        markFrame(request.frameId);
        const outcome = await applyAgentMoveFrame(cwd, request);
        if (!outcome.ok || quote === undefined || !flagOn('frame-covers')) return outcome;
        const target = quoteTargetOf(outcome.node);
        if (target === undefined) return { ...outcome, quoted: false };
        this.placeFrameQuote(cwd, target, quote, 'agent', 'existing');
        return { ...outcome, quoted: true };
      },
      onMoveFrames: (request) => {
        markFrames(request.frameIds);
        return applyAgentMoveFrames(cwd, request);
      },
      onDuplicateFrames: async ({ words, ...request }) => {
        const outcome = await applyAgentDuplicateFrames(cwd, request);
        if (outcome.ok && words !== undefined) {
          for (const copy of outcome.nodes) markFrame(copy.id, { kind: 'created', ...words });
        }
        return outcome;
      },
      onRenameFrame: async (request) => {
        markFrame(request.frameId);
        // An artifact shows one name, its own title; renaming its node renames the artifact (ONL-2593).
        try {
          const node = (await canvasSnapshotFor(cwd)).doc?.nodes[request.frameId];
          if (node?.kind === 'artifact') {
            const read = await artifactStore().read(node.content.artifactId);
            const title = request.name.trim();
            if (read.outcome === 'resolved' && !read.readOnly && title !== '' && title !== read.manifest.title) {
              const renamed = await artifactStore().rename(node.content.artifactId, title, read.manifest.updatedAt);
              if ('ok' in renamed) broadcastToRenderers(IPC_EMIT.artifactChanged, { artifactId: node.content.artifactId });
              else logger.warn('agent artifact rename refused', { code: renamed.code });
            }
          }
        } catch (error) {
          logger.warn('agent artifact rename failed', { error: error instanceof Error ? error.name : 'unknown' });
        }
        return applyAgentRenameFrame(cwd, request);
      },
      onReorderFrame: (request) => {
        markFrame(request.frameId);
        return applyAgentReorderFrame(cwd, request);
      },
      // Not marked: a canvas object is not a page being worked on.
      onCreateText: (request) => applyAgentCreateText(cwd, request),
      onSetText: (request) => applyAgentSetText(cwd, request),
      onCreateImage: (request) => applyAgentCreateImage(cwd, request),
      // Not marked: the frame is leaving the canvas.
      onRemoveFrame: async (request) => {
        const outcome = await applyAgentRemoveFrame(cwd, request);
        if (!outcome.ok) return outcome;
        return { ...outcome, frames: await listAgentFrames(cwd, workspace.repoIdentity) };
      },
      onRemoveFrames: async (request) => {
        const outcome = await applyAgentRemoveFrames(cwd, request);
        if (!outcome.ok) return outcome;
        return { ...outcome, frames: await listAgentFrames(cwd, workspace.repoIdentity) };
      },
      onEvaluateInFrame: ({ frameId, script }) => {
        markFrame(frameId);
        return evaluateInAgentFrame(cwd, frameId, script);
      },
      onCaptureFrame: ({ frameId }) => {
        markFrame(frameId);
        return captureAgentFrame(cwd, frameId);
      },
      onReadFrame: ({ frameId, scope }) => {
        markFrame(frameId);
        return readAgentFrame(cwd, frameId, scope);
      },
      ...canvasHistorySinks(cwd),
    };
    this.artifactReporters.set(projectKey(cwd), studioSinks.onArtifact);

    const sessionId: { current?: string } = {};
    const own: { current?: AgentBackend } = {};
    const publishState = this.makeEmitState(cwd, sessionId, sessionWorkingFrames);
    const emitState = (state: BackendState): void => {
      if (own.current !== undefined && !this.superseded.has(own.current)) this.notifications.update(own.current, state);
      publishState(state);
    };
    const onEvent = (event: StudioEvent): void => {
      // Drops one event so a proof can watch the transcript resync (ONL-2353).
      if (this.isDev && devSwitches.dropEventSeq === String(event.seq)) return;
      this.handleEvent(event, own.current);
    };
    const emitConnection = this.makeEmitConnection(cwd, harness);

    const adopt = (backend: AgentBackend): void => {
      own.current = backend;
      this.sessions.set(backend);
      sessionId.current = backend.id;
      this.emitSession({ sessionId: backend.id, cwd: backend.cwd });
      backend.open();
    };

    const stub = this.makeBackend?.(cwd, harness, studioSinks, onEvent, emitConnection, emitState);
    if (stub !== undefined) {
      adopt(stub);
      return;
    }

    // No transcript clear: only `thread/resume` knows whether the stored rows are honest (ONL-2124).
    if (plan.kind === 'appserver') {
      const restoredAppServer = readTranscript(cwd, 'appserver');

      const appserver = createAppServerSession({
        cwd,
        ...(model === undefined ? {} : { model }),
        ...effort,
        ...(restoredAppServer.length > 0 ? { restoredEvents: restoredAppServer } : {}),
        workspace: names,
        ...starter,
        tools: studioSinks,
        onEvent,
        onState: emitState,
        onConnection: emitConnection,
        onTurnEnded: (summary) => {
          recordAgentTurnEnded(appServerRef, summary);
          recordAgentTurnSeen(appServerRef, cwd, summary);
          recordSetupStepsEnded(appServerRef, summary, appserver.events);
        },
        onTurnStarted: (turnId, origin) => recordAgentTurnStarted(appServerRef, { turnId, origin }),
        onTurnStalled: (turnId, silentMs) => recordAgentTurnStalled(appServerRef, { turnId, silentMs }),
        onEnded: (end) => {
          recordAgentSessionEnded(appServerRef, end);
        },
        onError: (code, apiErrorStatus) => {
          recordAgentError(appServerRef, { code, apiErrorStatus });
        },
        onExited: () => {
          this.stale.add(projectKey(cwd));
        },
      });
      // The backend mints its own id, and it is the one the renderer and every event key on.
      // Closed over by the callbacks above, which cannot fire before `adopt` opens the session.
      const appServerRef: AgentSessionRef = {
        repoIdentity: workspace.repoIdentity,
        sessionId: appserver.id,
        harness,
      };

      recordAgentSessionStarted(appServerRef, {
        ...(model === undefined ? {} : { model }),
        // Codex reports its connection only after the handshake, which is after this fires (ONL-2463).
        isAuthenticated: null,
      });
      // No fallthrough to Claude, and no welcome: only the session knows at resume time whether this is a first meeting.
      adopt(appserver);
      return;
    }

    const session = new AgentSession({
      cwd,
      model,
      ...effort,
      ...permissionMode,
      ...allowRules,
      workspace: names,
      ...starter,
      ...(plan.kind === 'resume'
        ? { resume: plan.sessionId }
        : { sessionId: plan.sessionId }),
      keepRaw: this.isDev,
      ...streamQuery(),
      onEvent,
      onState: emitState,
      onConnection: emitConnection,
      onCost: (sample) => {
        recordAgentCost({
          ...workspaceTelemetryProperties(workspace.repoIdentity),
          agent_session_id: session.id,
          harness: 'claude',
          at: 'turn_end',
          total_cost_usd: sample.totalCostUsd,
          delta_cost_usd: sample.costDeltaUsd,
          ...(model === undefined ? {} : { model }),
        });
      },
      onAllowRules: (rules) => {
        try {
          rememberAllowRules(cwd, 'claude', rules);
        } catch (err) {
          // The grant still holds for this session; a throw here would refuse the tool the user just allowed.
          logger.warn('could not remember an always-allow for the next session', { error: err });
        }
      },
      onTurnEnded: (summary) => {
        recordAgentTurnEnded(ref, summary);
        recordAgentTurnSeen(ref, cwd, summary);
        recordSetupStepsEnded(ref, summary, session.events);
      },
      onTurnStarted: (turnId, origin) => recordAgentTurnStarted(ref, { turnId, origin }),
      onTurnStalled: (turnId, silentMs) => recordAgentTurnStalled(ref, { turnId, silentMs }),
      onEnded: (end) => {
        recordAgentSessionEnded(ref, end);
      },
      onError: (code, apiErrorStatus) => {
        recordAgentError(ref, { code, apiErrorStatus });
        if (isSignInFixable(code)) this.onClaudeUnauthenticated('signed-out');
        else if (isCredentialRejected(code)) this.onClaudeUnauthenticated('rejected');
      },
      ...studioSinks,
    });
    own.current = session;
    this.sessions.set(session);
    sessionId.current = session.id;
    // Closed over by the callbacks above, which cannot fire before this line.
    const ref: AgentSessionRef = {
      repoIdentity: workspace.repoIdentity,
      sessionId: session.id,
      harness,
    };

    recordAgentSessionStarted(
      ref,
      {
        ...(model === undefined ? {} : { model }),
        // `unknown` reports false; `agent_error` corrects the story later.
        isAuthenticated: this.machine.status === 'ok',
      },
    );

    // Before the spawn: a crash during it still leaves the session findable next launch.
    rememberSession(cwd, plan.sessionId, model);

    // Identity first: `seq` restarts per session and the renderer resets its high-water mark on identity change.
    this.emitSession({ sessionId: session.id, cwd: session.cwd });
    if (restored.length > 0) session.restoreTranscript(restored);
    // The restored rows already open with a welcome.
    if (restored.length === 0) {
      session.welcome(names);
    }

    // Last, so the welcome is seq 1; not gated on `machine`, since `pump()` routes a throw to `session.error` (ONL-1866).
    session.open();
  }

  /** Text and images only: an element snapshot describes a page the agent has since been editing (ONL-2294). */
  private handPenToDraft(cwd: string): void {
    const waiting = this.pen(cwd);
    if (waiting === null) return;
    const { images, files, skills } = splitAttachments(waiting.attachments ?? []);
    prependComposerDraft(cwd, { text: waiting.text, images: [...images, ...files], skills });
  }

  /** Ahead of the session check: a replaced stop whose restart produced none leaves a pen with no session (ONL-2294). */
  private closePen(cwd: string): void {
    // Before `releaseAllPending`, so the drafts provider roots the images the hold is about to stop rooting (ONL-2294).
    this.handPenToDraft(cwd);
    this.penAction(cwd, { type: 'teardown' });
    this.pens.delete(projectKey(cwd));
  }

  private async stopSession(cwd: string, stop: SessionStop): Promise<void> {
    this.artifactReporters.delete(projectKey(cwd));
    const session = this.sessions.get(cwd);
    if (session === undefined) {
      if (stop === 'destroyed') {
        this.closePen(cwd);
        releaseAllPending(cwd);
      }
      return;
    }
    // Before the delete, so a held prompt is never left with nothing to send it into (ONL-2294).
    if (stop === 'replaced') {
      this.penSlot(cwd).turnId = undefined;
      this.penAction(cwd, { type: 'sessionReplaced' });
    } else {
      this.closePen(cwd);
    }
    this.sessions.delete(cwd);
    const busyKey = projectKey(cwd);
    this.publishedOtherTabBusy.delete(busyKey);
    if (this.busySessions.delete(busyKey)) this.publishOtherSessionStates(busyKey);
    this.stale.delete(projectKey(cwd));
    this.own.delete(projectKey(cwd));
    this.workingFrames.get(busyKey)?.dispose();
    this.workingFrames.delete(busyKey);
    if (stop === 'destroyed') this.frameQuotes.forget(cwd);
    // The server book outlives the session (ONL-1994); `location/index.ts` owns that teardown.
    this.notifications.cancel(session);
    await session.close();
    this.superseded.add(session);
    noteSetupTurnStopped(cwd);
    // Not on a replacement: the view, its composer chips and its pen all outlive one (ONL-2294).
    if (stop === 'destroyed') releaseAllPending(session.cwd);
    this.emitSession({ sessionId: undefined, cwd: session.cwd });
  }

  releaseWorkspace(cwd: string): Promise<void> {
    return this.requestStop(cwd);
  }

  async dispose(): Promise<void> {
    const cwds = new Set([
      ...this.sessions.values().map((session) => projectKey(session.cwd)),
      ...this.lifecycle.keys(),
      // A pen outlives a replaced session whose restart produced none, and holds the only copy (ONL-2294).
      ...this.pens.keys(),
    ]);
    await Promise.all(
      [...cwds].map(async (cwd) => {
        const stopped = this.requestStop(cwd).catch((err: unknown) => {
          logger.error('closing a session on quit failed', { error: err });
        });
        if (!(await settleWithin(stopped, DISPOSE_SESSION_LIMIT_MS))) {
          logger.warn('a session was still closing at the quit limit; quitting anyway', { limitMs: DISPOSE_SESSION_LIMIT_MS });
        }
      }),
    );
  }
}

let host: AgentHost | undefined;

function streamQuery(): Pick<AgentSessionOptions, 'query'> {
  const stream = agentStream();
  if (stream === undefined) return {};
  if ('replay' in stream) {
    return { query: replayedQuery(stream.replay, { starterPortFor: (cwd) => starterHost()?.portFor(cwd), framePagesLive }) };
  }
  return { query: recordingQuery((message) => appendFileSync(stream.record, `${JSON.stringify(message)}\n`)) };
}

export function registerAgentHost(options: { isDev: boolean; onClaudeUnauthenticated?: (cause: 'signed-out' | 'rejected') => void; stopProjectSetup?: (cwd: string) => Promise<void> }): AgentHost {
  const agent = new AgentHost(options.isDev, undefined, undefined, options.onClaudeUnauthenticated);
  host = agent;
  installLandingProofHook();

  observeSessionResumable((workspacePath) => sessionResumable(workspacePath));
  // Frame quotes and the opened mark are gone by now: `noteTabClosed` closes the Project's own state first.
  observeTabClosed((workspacePath) => {
    void finalTabClose(workspacePath, {
      stopSetup: options.stopProjectSetup ?? (async (cwd) => {
        const stopped = await projectSetupService().run(cwd, { action: 'stop' });
        if (!stopped.ok) throw new Error(stopped.reason);
      }),
      releaseSession: (cwd) => host?.releaseWorkspace(cwd) ?? Promise.resolve(),
      closed: noteSetupTabClosed,
      failed: (operation, error) => logger.error("stopping a closed tab failed", { operation, error }),
    }).catch((error: unknown) => logger.error('closed tab cleanup failed', { error }));
  });

  const pendingStarts = new Map<string, AbortController>();
  observeStartIntent((worktree, folders) => {
    const key = projectKey(worktree);
    pendingStarts.get(key)?.abort();
    const pending = new AbortController();
    pendingStarts.set(key, pending);
    void host?.studioPrompt(worktree, startPrompt(folders, { pendingFrame: flagOn('frame-covers') }), undefined, pending.signal).then((sent) => {
      if (!sent && !pending.signal.aborted) logger.warn('Start press found no session for the worktree');
    }).finally(() => {
      if (pendingStarts.get(key) === pending) pendingStarts.delete(key);
    });
  });

  observeServerStop((worktree) => {
    pendingStarts.get(projectKey(worktree))?.abort();
    void host?.command({ type: 'interrupt' }, worktree).catch((error: unknown) => {
      logger.error('server Stop could not interrupt the agent', { error });
    });
  });

  // Registered before `command` can emit (ONL-2203).
  // This and the two below answer a view with no Project, and `session.start` is how a view enters one, so none sits behind the Project door.
  handle(IPC_INVOKE.agentCommand, (project, command, event) => {
    if (command?.type === 'session.start') {
      if (typeof command.cwd !== 'string' || !knownProject(command.cwd) || isRemovingProject(command.cwd)) return { accepted: false };
      registerView(event.sender, command.cwd);
    }
    const cwd = command.type === 'session.start' ? command.cwd : project?.root;
    return agent.command(command, cwd);
  });
  handle(IPC_INVOKE.agentSnapshot, (project, req) => agent.snapshot(req ?? {}, project?.root));
  handle(IPC_INVOKE.agentProbe, (project, req) => agent.probe(req ?? {}, project?.root));

  // `handle`, not `on`: the renderer uses `invoke`.
  handle(IPC_INVOKE.projectSelected, (event, project: ProjectSelected) =>
    host?.selectProject(project, () => registerView(event.sender, project.path)),
  );

  return host;
}

function steers(target: AgentBackend): boolean {
  return target.isStreaming && target.midTurn === 'steer' && target.questionParkedSince === undefined;
}

export function agentSnapshotFor(cwd: string): AgentSnapshot | undefined {
  return host?.snapshot({}, cwd);
}

export function startAgentSession(cwd: string): Promise<void> {
  return host?.command({ type: 'session.start', cwd }, cwd).then(() => undefined) ?? Promise.resolve();
}

export function sendStudioPrompt(cwd: string, text: string, context?: string): Promise<boolean> {
  return host?.studioPrompt(cwd, text, context) ?? Promise.resolve(false);
}

/** Idempotent, and a no-op for a workspace with no session; `dispose` is the one that stops every session. */
export function releaseAgentWorkspace(cwd: string): Promise<void> {
  return host?.releaseWorkspace(cwd) ?? Promise.resolve();
}

export function noteCodexSetupChanged(status: CodexSetupStatus): void {
  host?.noteCodexSetup(status);
}

export function noteClaudeSetupChanged(state: ClaudeSetupState, meta: { afterLogin: boolean }): void {
  host?.noteClaudeSetup(state, meta);
}

export function noteHarnessDefaultChanged(): Promise<void> {
  return host?.noteHarnessDefaultChanged() ?? Promise.resolve();
}

export function disposeAgentHost(): Promise<void> {
  return host?.dispose() ?? Promise.resolve();
}

export function diagnosticArtifactTool(request: DebugArtifactToolRequest): Promise<ArtifactToolResult> {
  return host?.diagnosticArtifactTool(request) ?? Promise.resolve({ ok: false, reason: 'No artifact session is available.' });
}

/** A fresh start clears the stored transcript (ONL-1913), so cooling asks this before it frees anything (ONL-2210). */
export async function sessionResumable(cwd: string): Promise<boolean> {
  const harness = storedHarness(projectHarness(cwd));
  if (harness === 'appserver') return storedAppServerThread(cwd) !== undefined;
  const plan = await planSession(cwd);
  return plan.kind === 'resume';
}
