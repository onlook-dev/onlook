import {
  deriveSetupSteps,
  foldSessionState,
  isElementEvidence,
  isUserSpoken,
  setupTurnCards,
  type AgentSwitchEntry,
  type DestructiveClass,
  type HarnessId,
  type PermissionMode,
  type PermissionOutcome,
  type PromptAttachment,
  type PromptOrigin,
  type SuggestionSend,
  type QuestionEndOutcome,
  type SessionErrorCode,
  type StudioEvent,
} from '@studio/events';
import { log } from '../log/index.js';
import { takeFirstPrompt } from '../telemetry/first-prompt.js';
import type { HeldPromptOutcome, NoEditReason, TelemetryProperties } from '../telemetry/events.js';
import { capture, captureDurable, resolveWorkspaceTelemetryProperties, workspaceTelemetryProperties } from '../telemetry/index.js';
import { noteTurnEnded } from '../telemetry/turn-seen.js';
import type { WithheldSetupTool } from '../project-setup/approval.js';
import type { SessionHarness } from './backend.js';
import { SESSION_CLOSED, type SessionEndSummary, type TurnSummary } from './event-log.js';
import { harnessStoredAs } from './harness.js';
import { emptyToolKindCounts, emptyUnfinishedByKind, OUTCOME_TOOL_KINDS, UNFINISHED_OUTCOMES, type OutcomeToolKind, type UnfinishedByKind, type UnfinishedOutcome } from './turn-tool-kinds.js';
import type { FramePictures } from '../canvas/clip.js';

/** `repoIdentity` is the Workspace's, never the project's path; `workspaceTelemetryId()` hashes it (ONL-1829). */
export interface AgentSessionRef {
  repoIdentity: string;
  sessionId: string;
  harness: SessionHarness;
}

/** The telemetry spelling, which is not the stored one: the persisted key stays `appserver` (ONL-2431). */
function telemetryHarness(harness: SessionHarness): HarnessId {
  return harnessStoredAs(harness).telemetry;
}

/** Scalars only: the mode and the backend, never the command the gate stopped (ONL-2190). */
export function recordPermissionModeChanged(input: {
  mode: PermissionMode;
  harness: SessionHarness;
}): void {
  capture('permission_mode_changed', {
    mode: input.mode,
    harness: telemetryHarness(input.harness),
  });
}

export function recordPermissionDecided(input: {
  outcome: PermissionOutcome;
  harness: SessionHarness;
  destructiveClass: DestructiveClass;
}): void {
  capture('permission_decided', {
    outcome: input.outcome,
    harness: telemetryHarness(input.harness),
    destructive_class: input.destructiveClass,
  });
}

/** The cwd resolves to the Workspace's hash and never travels itself (ONL-2499). */
export function recordSetupApprovalWithheld(input: {
  cwd: string;
  tool: WithheldSetupTool;
  harness: SessionHarness;
}): void {
  // The grant it measures has already been decided: a throw here would strand the call it let through (ONL-2499).
  try {
    const workspaceProperties = resolveWorkspaceTelemetryProperties(input.cwd);
    capture('project_setup_approval_withheld', {
      ...workspaceProperties,
      tool: input.tool,
      harness: telemetryHarness(input.harness),
    });
  } catch {
    log('agent-host').error('setup approval analytics failed');
  }
}

export function recordAgentSessionStarted(
  ref: AgentSessionRef,
  opts: { model?: string; isAuthenticated: boolean | null },
): void {
  capture('agent_session_started', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    ...(opts.model === undefined ? {} : { model: opts.model }),
    is_authenticated: opts.isAuthenticated,
  });
}

/** `events` is read before the prompt is pushed, or `is_first_in_session` is never true (ONL-2380). */
export function recordChatMessageSent(
  ref: AgentSessionRef,
  session: { harness: SessionHarness; events: readonly StudioEvent[] },
  prompt: { text: string; attachmentCount: number },
): void {
  const spoken = session.events.some(isUserSpoken);
  capture('chat_message_sent', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(session.harness),
    is_first_in_session: !spoken,
    prompt_chars: prompt.text.length,
    attachment_count: prompt.attachmentCount,
  });
}

export function recordNextTaskPicturesClipped(ref: AgentSessionRef, clipped: FramePictures, byRef: number): void {
  const missed = (reason: string): number =>
    clipped.pictures.filter((picture) => (picture.ok ? picture.missed : picture.reason) === reason).length;
  const fellBack = (source: string): number => clipped.pictures.filter((picture) => picture.ok && picture.source === source && picture.missed !== undefined).length;
  capture('next_task_picture_clipped', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    targets: clipped.pictures.length,
    clipped: clipped.pictures.filter((picture) => picture.ok && picture.missed === undefined).length,
    no_match: missed('no-match') + missed('invalid-selector'),
    hidden: missed('hidden'),
    not_in_view: missed('not-in-view'),
    stale_ref: missed('stale-ref'),
    by_ref: byRef,
    whole_frame_fallback: fellBack('frame'),
    remembered_fallback: fellBack('remembered'),
    capture_failure: clipped.captureFailure,
    retried: clipped.retried,
    duration_ms: clipped.durationMs,
  });
}

export function recordNextTasksOffered(ref: AgentSessionRef, taskCount: number): void {
  capture('next_tasks_offered', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    task_count: taskCount,
  });
}

/** The length that waited and how long, never the text: a prompt reaching the agent reports separately (ONL-2294). */
export function recordHeldPromptResolved(
  ref: { repoIdentity: string; harness: SessionHarness },
  resolution: { outcome: HeldPromptOutcome; promptChars: number; waitedMs: number },
): void {
  capture('held_prompt_resolved', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    harness: telemetryHarness(ref.harness),
    outcome: resolution.outcome,
    prompt_chars: resolution.promptChars,
    waited_ms: resolution.waitedMs,
  });
}

export function recordQuestionEnded(
  ref: { repoIdentity: string; harness: SessionHarness },
  ended: { outcome: QuestionEndOutcome; events: readonly StudioEvent[]; parkedSince: number },
): void {
  capture('question_ended', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    harness: telemetryHarness(ref.harness),
    outcome: ended.outcome,
    question_count: openQuestionCount(ended.events),
    waited_ms: Math.max(0, Date.now() - ended.parkedSince),
  });
}

function openQuestionCount(events: readonly StudioEvent[]): number {
  const open = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'permission.requested' && (event.questions?.length ?? 0) > 0) {
      open.set(event.requestId, event.questions?.length ?? 0);
    } else if (event.type === 'permission.resolved') {
      open.delete(event.requestId);
    }
  }
  return [...open.values()].reduce((sum, count) => sum + count, 0);
}

export function recordChatNewStarted(
  repoIdentity: string,
  session: { harness: SessionHarness; events: readonly StudioEvent[] },
): void {
  capture('chat_new_started', {
    ...workspaceTelemetryProperties(repoIdentity),
    harness: telemetryHarness(session.harness),
    turn_count: session.events.filter(isUserSpoken).length,
  });
}

export function recordAgentSwitched(repoIdentity: string, from: SessionHarness, to: HarnessId, entry: AgentSwitchEntry): void {
  capture('chat_agent_switched', {
    ...workspaceTelemetryProperties(repoIdentity),
    from_harness: telemetryHarness(from),
    to_harness: to,
    entry_point: entry,
  });
}

function turnOutcome(stopReason: string | undefined): 'success' | 'error' | 'interrupted' {
  if (stopReason === undefined) return 'success';
  if (stopReason === SESSION_CLOSED) return 'interrupted';
  if (/interrupt|cancel|abort/i.test(stopReason)) return 'interrupted';
  if (/error|fail|refus/i.test(stopReason)) return 'error';
  return 'success';
}

function classifyNoEditReason(summary: TurnSummary): NoEditReason {
  if (summary.hadQuestion) return 'question_asked';
  if (summary.hadFailedEdit) return 'edit_failed';
  if (summary.hadPlan) return 'plan_only';
  if (summary.responseChars > 0) return 'explanation_only';
  return 'other';
}

export function recordSetupStepsShown(ref: AgentSessionRef): void {
  capture('setup_steps_shown', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
  });
}

/** Read from the session's own log at the turn's end, through the derivation the chat draws from. */
export function recordSetupStepsEnded(ref: AgentSessionRef, summary: TurnSummary, events: readonly StudioEvent[]): void {
  if (summary.origin !== 'studio') return;
  const card = setupTurnCards(foldSessionState(events).items).at(-1);
  if (card === undefined || !card.isLast) return;
  const view = deriveSetupSteps(card.calls, false);
  if (view.outcome === 'running') return;
  capture('setup_steps_ended', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    outcome: view.outcome,
    ...(view.failedStep === undefined ? {} : { failed_step: view.failedStep }),
  });
}

export function recordAgentTurnStarted(ref: AgentSessionRef, turn: { turnId: string; origin: PromptOrigin }): void {
  void captureDurable('agent_turn_started', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    turn_id: turn.turnId,
    origin: turn.origin,
  });
}

export function recordAgentTurnStalled(ref: AgentSessionRef, turn: { turnId: string; silentMs: number }): void {
  void captureDurable('agent_turn_stalled', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    turn_id: turn.turnId,
    silent_ms: turn.silentMs,
  });
}

type UnfinishedCallProperties = Pick<TelemetryProperties<'agent_turn_tools'>, `${OutcomeToolKind}_${UnfinishedOutcome}_calls`>;

function unfinishedCallProperties(byKind: UnfinishedByKind): UnfinishedCallProperties {
  return Object.fromEntries(
    OUTCOME_TOOL_KINDS.flatMap((kind) => UNFINISHED_OUTCOMES.map((outcome) => [`${kind}_${outcome}_calls`, byKind[outcome][kind]])),
  ) as UnfinishedCallProperties;
}

export function recordAgentTurnEnded(ref: AgentSessionRef, summary: TurnSummary): void {
  const outcome = turnOutcome(summary.stopReason);
  const userMessages = summary.userMessages ?? 0;
  const hadVisibleEdit = (summary.origin !== 'studio' || userMessages > 0) && outcome === 'success' && summary.filesChanged > 0;
  const noEditFields =
    outcome === 'success' && summary.filesChanged === 0
      ? { no_edit_reason: classifyNoEditReason(summary) }
      : {};
  capture('agent_turn_ended', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    turn_id: summary.turnId,
    duration_ms: summary.durationMs,
    waited_ms: summary.waitedMs,
    ...(summary.stopReason === undefined ? {} : { stop_reason: summary.stopReason }),
    tool_call_count: summary.toolCallCount,
    permission_request_count: summary.permissionRequestCount,
    permission_denied_count: summary.permissionDeniedCount,
    prompt_chars: harnessStoredAs(ref.harness).reportsPromptChars ? summary.promptChars : null,
    response_chars: summary.responseChars,
    files_changed: summary.filesChanged,
    execute_targets: summary.executeTargets,
    origin: summary.origin ?? 'user',
    user_messages: userMessages,
    retry_attempts: summary.retryAttempts ?? (harnessStoredAs(ref.harness).countsRetryAttempts ? 0 : null),
    retry_observed_count: summary.retryObservedCount ?? summary.retryAttempts ?? 0,
    retry_last_status: summary.retryLastStatus ?? null,
    retry_error_kind: summary.retryErrorKind ?? null,
    outcome,
    had_visible_edit: hadVisibleEdit,
    attempted_frame_inspection: summary.attemptedFrameInspection ?? false,
    had_provider_stall: summary.hadProviderStall ?? false,
    ...noEditFields,
  });
  const kinds = summary.toolKinds ?? emptyToolKindCounts();
  capture('agent_turn_tools', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    turn_id: summary.turnId,
    origin: summary.origin ?? 'user',
    outcome,
    read_calls: kinds.read,
    search_calls: kinds.search,
    file_edit_calls: kinds.file_edit,
    file_delete_calls: kinds.file_delete,
    shell_calls: kinds.shell,
    canvas_edit_calls: kinds.canvas_edit,
    canvas_navigate_calls: kinds.canvas_navigate,
    frame_check_calls: kinds.frame_check,
    fetch_calls: kinds.fetch,
    plan_calls: kinds.plan,
    question_calls: kinds.question,
    subagent_calls: kinds.subagent,
    other_calls: kinds.other,
    external_mcp_calls: summary.mcpToolCallCount,
    failed_calls: summary.failedToolCount ?? 0,
    denied_calls: summary.deniedToolCount ?? 0,
    canceled_calls: summary.canceledToolCount ?? 0,
    in_subagent_calls: summary.inSubagentToolCount ?? 0,
    ...unfinishedCallProperties(summary.unfinishedByKind ?? emptyUnfinishedByKind()),
  });
  if (summary.mcpToolCallCount > 0) {
    capture('agent_mcp_tools_used', {
      project_id: workspaceTelemetryProperties(ref.repoIdentity).project_id,
      agent_session_id: ref.sessionId,
      harness: telemetryHarness(ref.harness),
      turn_id: summary.turnId,
      mcp_tool_call_count: summary.mcpToolCallCount,
      origin: summary.origin ?? 'user',
      outcome,
    });
  }
}

export function recordAgentTurnSeen(ref: AgentSessionRef, cwd: string, summary: TurnSummary): void {
  noteTurnEnded(cwd, {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    turn_id: summary.turnId,
    origin: summary.origin ?? 'user',
    outcome: turnOutcome(summary.stopReason),
  });
}

export function recordAgentSessionEnded(ref: AgentSessionRef, end: SessionEndSummary): void {
  capture('agent_session_ended', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    reason: end.reason,
    duration_ms: end.durationMs,
    turn_count: end.turnCount,
    ...(end.totalCostUsd === undefined ? {} : { total_cost_usd: end.totalCostUsd }),
  });
}

/** The code and the status only; the message can quote paths. */
export function recordAgentError(
  ref: AgentSessionRef,
  failure: { code: SessionErrorCode; apiErrorStatus?: number | null },
): void {
  capture('agent_error', {
    ...workspaceTelemetryProperties(ref.repoIdentity),
    agent_session_id: ref.sessionId,
    harness: telemetryHarness(ref.harness),
    code: failure.code,
    api_error_status: failure.apiErrorStatus ?? null,
  });
}

export function recordPromptSubmitted(
  ref: AgentSessionRef,
  prompt: { text: string; attachments?: PromptAttachment[]; suggestion?: SuggestionSend; resends?: 'suggestion' },
): void {
  const workspace = workspaceTelemetryProperties(ref.repoIdentity);
  const attachments = prompt.attachments ?? [];
  capture('prompt_submitted', {
    ...workspace,
    prompt_chars: prompt.text.length,
    has_selection: attachments.some(isElementEvidence),
    has_frame_context: attachments.some((a) => 'kind' in a && a.kind === 'frame'),
    source: prompt.suggestion === undefined && prompt.resends === undefined ? 'typed' : 'suggestion',
    is_first_prompt_in_project: takeFirstPrompt(workspace.project_id),
    ...(prompt.suggestion === undefined
      ? {}
      : { suggestion_index: prompt.suggestion.index, suggestion_taps: prompt.suggestion.taps, is_resend: false }),
    ...(prompt.resends === undefined ? {} : { is_resend: true }),
  });
}
