// A compromised renderer is not bound by the type: every value is re-checked and dropped silently (an explained rejection helps the probe), and properties are picked field by field, since a spread lets a smuggled path cross the `events.ts` guardrail.

import { handle, on } from '../ipc/bridge.js';
import { registerTelemetryRequestGuard } from './renderer-requests.js';
import {
  ARTIFACT_EXPORT_BATCH_OUTCOMES,
  type ArtifactExportBatchOutcome,
  HARNESS_IDS,
  CODE_OPEN_CONFIDENCES,
  CODE_OPEN_METHODS,
  CODE_OPEN_TARGETS,
  SETTINGS_OPEN_SOURCES,
  TIPS_OPEN_SOURCES,
  AGENT_STATUS_LINE_STATES,
  AGENT_STATUS_TARGETS,
  FIRST_RUN_ACTIONS,
  FIRST_RUN_SURFACES,
  NOTIFICATION_INVITE_ACTIONS,
  NOTIFICATION_INVITE_SURFACES,
  ONBOARDING_IMPORT_CHOICES,
  ONBOARDING_SCREENS,
  TIP_RESOLVE_REASONS,
  type NotificationInviteAction,
  type NotificationInviteSurface,
  FRAME_CREATE_METHODS,
  type FirstRunAction,
  type FirstRunSurface,
  type TipResolveReason,
  type FrameCreateMethod,
  TIPS_PILL_DISMISS_SOURCES,
  TOUR_OPEN_SOURCES,
  TOUR_STEP_IDS,
  TIPS_PROMPT_IDS,
  type CodeOpenConfidence,
  type CodeOpenMethod,
  type CodeOpenTarget,
  CANVAS_PAN_COUNTS,
  CHAT_TYPING_COUNTS,
  INTERACTION_INPUTS,
  INTERACTION_SURFACES,
  SCRIPT_CATEGORIES,
  SLOW_INTERACTION_COUNTS,
  type CanvasPanSummary,
  type ChatTypingSummary,
  type SlowInteraction,
  type SettingsOpenSource,
  type TipsOpenSource,
  type AgentStatusLineState,
  type AgentStatusTarget,
  type TipsPillDismissSource,
  type TourOpenSource,
  type TourStepId,
  type TipsPromptId,
  IPC_INVOKE,
  IPC_EMIT,
  IPC_SEND,
  failureOwner,
  isCanvasTextSize,
  isRecord,
  isResizeObserverNotice,
  scrubClass,
  scrubFrame,
  scrubMessage,
  ACTIVATION_DEAD_ENDS,
  ACTIVATION_ERROR_CLASSES,
  PREVIEW_COVERS,
  ACTIVATION_SURFACES,
  ATTACHMENT_REJECT_REASONS,
  ATTACHMENT_SIZE_BUCKETS,
  ATTACHMENT_SOURCES,
  CANVAS_IMAGE_ARRIVAL_METHODS,
  CANVAS_MENU_ACTIONS,
  CANVAS_PAGE_SWITCH_METHODS,
  CANVAS_RESIZE_METHODS,
  CONNECTOR_ACTIONS,
  DISCOVER_CTA_OUTCOMES,
  FRAME_SCROLL_METHODS,
  GIT_PILL_NO_ACTION_REASONS,
  GIT_PILL_OUTCOMES,
  IMAGE_REFUSAL_REASONS,
  INLINE_CHAT_ANCHORS,
  INLINE_DISMISS_METHODS,
  INLINE_SEND_REFUSALS,
  MESSAGE_ACTIONS,
  MESSAGE_ACTION_ROLES,
  PREVIEW_RECOVERY_ACTIONS,
  PROJECT_RECOVERY_ACTIONS,
  PROMPT_RECALL_NEXT_ACTIONS,
  REJECTED_ATTACHMENT_KINDS,
  RENDERER_ARTIFACT_CREATE_METHODS,
  RENDERER_EXCEPTION_SURFACES,
  RENDERER_IMAGE_CREATE_METHODS,
  RENDERER_PAGE_CREATE_METHODS,
  RENDERER_PAGE_METHODS,
  RENDERER_PAGE_MOVE_METHODS,
  RENDERER_TEXT_CREATE_METHODS,
  SETUP_ENTRY_POINTS,
  SKILL_MENU_SOURCES,
  USAGE_LIMIT_WINDOWS,
  type CanvasImageArrivalMethod,
  type CanvasPageSwitchMethod,
  type CanvasResizeMethod,
  type DiscoverCtaOutcome,
  type HarnessId,
  type ImageRefusalReason,
  type InlineChatAnchor,
  type InlineDismissMethod,
  type InlineSendRefusal,
  type RendererExceptionReport,
  type RendererTelemetryEvent,
  type ReplaySessionReport,
} from '@studio/events';
import { captureError } from '../errors/index.js';
import { adoptSessionId, capture, currentTelemetryConfig, launchIsFirst, onTelemetryIdentityChanged, recordActivationSurface, resolveWorkspaceTelemetryProperties } from './index.js';
import type { WorkspaceTelemetryProperties } from './events.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { isUuidV7 } from './session-id.js';
import { recordAgentSetupOpened, recordAgentSetupStep } from './setup-step.js';


const PILL_IDS = new Set([
  'no-access', 'connect-github', 'local-only', 'first-paint', 'merged',
  'pr-closed', 'draft-pr', 'resolve-conflicts', 'fix-checks', 'download-changes',
  'upload-changes', 'checks-running', 'ready-to-merge', 'create-pr', 'push',
  'open-in-browser', 'merge',
]);

const SESSION_ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;
const EVENT_TYPE_SHAPE = /^[a-z][a-z0-9_.-]{0,63}$/;

function isSeq(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** A count of objects that exist: a zero-count arrival is not an arrival. */
function isCount(value: unknown): value is number {
  return isSeq(value) && value > 0;
}

function inlineAnchorField(anchor: unknown): { anchor?: InlineChatAnchor } {
  return (INLINE_CHAT_ANCHORS as readonly unknown[]).includes(anchor)
    ? { anchor: anchor as InlineChatAnchor }
    : {};
}

/** A duration, so zero is a real answer where `isCount` refuses one. */
function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

const EXPORT_TYPES: Record<string, 'pr' | 'push' | 'merge'> = {
  'create-pr': 'pr',
  push: 'push',
  merge: 'merge',
  'ready-to-merge': 'merge',
};

function gitPillWorkspaceProperties(worktreePath: unknown): WorkspaceTelemetryProperties | undefined {
  if (typeof worktreePath !== 'string' || worktreePath.length === 0) return undefined;
  return resolveWorkspaceTelemetryProperties(worktreePath);
}

function pillId(value: unknown): string | undefined {
  return typeof value === 'string' && PILL_IDS.has(value) ? value : undefined;
}

function pickCounts<C extends string>(properties: Record<string, unknown>, counts: readonly C[]): Record<C, number> | undefined {
  const picked: Partial<Record<C, number>> = {};
  for (const key of counts) {
    const value = properties[key];
    if (!isSeq(value)) return undefined;
    picked[key] = value;
  }
  return picked as Record<C, number>;
}

/** `false` refuses the event: a reason rides `resolved` and nothing else. */
function resolveReason(action: unknown, reason: unknown): TipResolveReason | undefined | false {
  if (action !== 'resolved') return reason === undefined ? undefined : false;
  return oneOf(TIP_RESOLVE_REASONS, reason) ? reason : false;
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return (allowed as readonly unknown[]).includes(value);
}

function typingSummary(properties: unknown): ChatTypingSummary | undefined {
  if (!isRecord(properties) || typeof properties['replay_recording'] !== 'boolean') return undefined;
  const counts = pickCounts(properties, CHAT_TYPING_COUNTS);
  if (counts === undefined || counts.chat_panel_keystrokes + counts.inline_chat_keystrokes === 0) return undefined;
  return { ...counts, replay_recording: properties['replay_recording'] };
}

function slowInteraction(properties: unknown): SlowInteraction | undefined {
  if (!isRecord(properties)) return undefined;
  const { surface, input, top_script, agent_busy, other_tab_agent_busy, replay_recording } = properties;
  if (!oneOf(INTERACTION_SURFACES, surface) || !oneOf(INTERACTION_INPUTS, input) || !oneOf(SCRIPT_CATEGORIES, top_script)) {
    return undefined;
  }
  if (typeof agent_busy !== 'boolean' || typeof other_tab_agent_busy !== 'boolean' || typeof replay_recording !== 'boolean') return undefined;
  const counts = pickCounts(properties, SLOW_INTERACTION_COUNTS);
  if (counts === undefined) return undefined;
  return { ...counts, surface, input, top_script, agent_busy, other_tab_agent_busy, replay_recording };
}

function panSummary(properties: unknown): CanvasPanSummary | undefined {
  if (!isRecord(properties) || typeof properties['replay_recording'] !== 'boolean') return undefined;
  const counts = pickCounts(properties, CANVAS_PAN_COUNTS);
  if (counts === undefined || counts.gestures === 0) return undefined;
  return { ...counts, replay_recording: properties['replay_recording'] };
}

export function receiveRendererTelemetry(payload: RendererTelemetryEvent, renderer?: number): void {
  if (payload === null || typeof payload !== 'object') return;
  switch (payload.event) {
    case 'agent_setup_skipped':
    case 'agent_setup_opened': {
      const props = payload.properties;
      if (!isRecord(props) || !oneOf(HARNESS_IDS, props.provider) || !oneOf(SETUP_ENTRY_POINTS, props.entry_point)) return;
      if (payload.event === 'agent_setup_skipped') recordAgentSetupStep(props.provider, 'skipped', { entryPoint: props.entry_point, reason: 'provider_detected' });
      else recordAgentSetupOpened(props.provider, props.entry_point, renderer);
      return;
    }
    case 'activation_surface': {
      const props = payload.properties;
      if (renderer === undefined || !isRecord(props) || !oneOf(ACTIVATION_SURFACES, props.surface)) return;
      const deadEnd = props.dead_end;
      if (deadEnd !== undefined && (!isRecord(deadEnd) || !oneOf(ACTIVATION_DEAD_ENDS, deadEnd.state) || !oneOf(ACTIVATION_ERROR_CLASSES, deadEnd.error_class) || props.surface !== 'error_state')) return;
      if (deadEnd?.cover !== undefined && !oneOf(PREVIEW_COVERS, deadEnd.cover)) return;
      if (deadEnd?.harness !== undefined && !oneOf(HARNESS_IDS, deadEnd.harness)) return;
      if (deadEnd?.server_port !== undefined && (typeof deadEnd.server_port !== 'number' || !Number.isInteger(deadEnd.server_port) || deadEnd.server_port < 1 || deadEnd.server_port > 65535)) return;
      recordActivationSurface(renderer, { surface: props.surface, ...(deadEnd === undefined ? {} : { dead_end: { state: deadEnd.state, error_class: deadEnd.error_class, ...(deadEnd.cover === undefined ? {} : { cover: deadEnd.cover }), ...(deadEnd.server_port === undefined ? {} : { server_port: deadEnd.server_port }), ...(deadEnd.harness === undefined ? {} : { harness: deadEnd.harness }) } }) });
      return;
    }
    case 'cloud_update_required_shown':
    case 'cloud_update_download_clicked':
      capture(payload.event, {});
      return;
    case 'skill_menu_opened':
      if (payload.properties.item_kind === 'skill' && oneOf(HARNESS_IDS, payload.properties.agent) && oneOf(SKILL_MENU_SOURCES, payload.properties.source)) capture('skill_menu_opened', { item_kind: 'skill', agent: payload.properties.agent, source: payload.properties.source });
      break;
    case 'skill_chosen':
      if (payload.properties.item_kind === 'skill' && oneOf(HARNESS_IDS, payload.properties.agent)) capture('skill_chosen', { item_kind: 'skill', agent: payload.properties.agent });
      break;
    case 'attachment_rejected': {
      const props = payload.properties;
      if (!oneOf(REJECTED_ATTACHMENT_KINDS, props.kind) || props.kind !== props.coarse_type || !oneOf(ATTACHMENT_SIZE_BUCKETS, props.size_bucket) || !oneOf(ATTACHMENT_SOURCES, props.source) || !oneOf(HARNESS_IDS, props.agent) || !oneOf(ATTACHMENT_REJECT_REASONS, props.reason)) break;
      capture('attachment_rejected', { kind: props.kind, coarse_type: props.coarse_type, size_bucket: props.size_bucket, source: props.source, agent: props.agent, reason: props.reason });
      break;
    }
    case 'frame_created': {
      if (!isRecord(payload.properties)) return;
      const { method } = payload.properties;
      if (!(FRAME_CREATE_METHODS as readonly unknown[]).includes(method)) return;
      // `source` is not read off the payload: a frame the renderer drew is `user_tool` by construction; main stamps the other origins.
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('frame_created', {
        ...workspaceProperties,
        method: method as FrameCreateMethod,
        source: 'user_tool',
      });
      return;
    }
    case 'first_run_shown': {
      if (!isRecord(payload.properties)) return;
      const { surface, delay_ms } = payload.properties;
      if (!(FIRST_RUN_SURFACES as readonly unknown[]).includes(surface)) return;
      capture('first_run_shown', {
        ...gitPillWorkspaceProperties(payload.properties.worktreePath),
        surface: surface as FirstRunSurface,
        ...(typeof delay_ms === 'number' && Number.isFinite(delay_ms) && delay_ms >= 0 ? { delay_ms: Math.round(delay_ms) } : {}),
      });
      return;
    }
    case 'first_run_acted': {
      if (!isRecord(payload.properties)) return;
      const { surface, action } = payload.properties;
      if (!(FIRST_RUN_SURFACES as readonly unknown[]).includes(surface)) return;
      if (!(FIRST_RUN_ACTIONS as readonly unknown[]).includes(action)) return;
      const reason = resolveReason(action, payload.properties.reason);
      if (reason === false) return;
      capture('first_run_acted', {
        ...gitPillWorkspaceProperties(payload.properties.worktreePath),
        surface: surface as FirstRunSurface,
        action: action as FirstRunAction,
        ...(reason === undefined ? {} : { reason }),
      });
      return;
    }
    case 'onboarding_screen_shown': {
      if (!isRecord(payload.properties)) return;
      const { screen, visit } = payload.properties;
      const isFirstLaunch = launchIsFirst();
      if (!oneOf(ONBOARDING_SCREENS, screen) || !isCount(visit) || isFirstLaunch === undefined) return;
      capture('onboarding_screen_shown', { screen, visit, is_first_launch: isFirstLaunch });
      return;
    }
    case 'onboarding_screen_passed': {
      if (!isRecord(payload.properties)) return;
      const { screen, choice } = payload.properties;
      const isFirstLaunch = launchIsFirst();
      if (!oneOf(ONBOARDING_SCREENS, screen) || isFirstLaunch === undefined) return;
      if (screen === 'import') {
        if (oneOf(ONBOARDING_IMPORT_CHOICES, choice)) capture('onboarding_screen_passed', { screen, choice, is_first_launch: isFirstLaunch });
        return;
      }
      if (choice === undefined) capture('onboarding_screen_passed', { screen, is_first_launch: isFirstLaunch });
      return;
    }
    case 'notification_invite_shown': {
      if (!isRecord(payload.properties)) return;
      const { surface } = payload.properties;
      if (!(NOTIFICATION_INVITE_SURFACES as readonly unknown[]).includes(surface)) return;
      capture('notification_invite_shown', { ...gitPillWorkspaceProperties(payload.properties.worktreePath), surface: surface as NotificationInviteSurface });
      return;
    }
    case 'notification_invite_acted': {
      if (!isRecord(payload.properties)) return;
      const { surface, action } = payload.properties;
      if (!(NOTIFICATION_INVITE_SURFACES as readonly unknown[]).includes(surface)) return;
      if (!(NOTIFICATION_INVITE_ACTIONS as readonly unknown[]).includes(action)) return;
      const reason = resolveReason(action, payload.properties.reason);
      if (reason === false) return;
      capture('notification_invite_acted', {
        ...gitPillWorkspaceProperties(payload.properties.worktreePath),
        surface: surface as NotificationInviteSurface,
        action: action as NotificationInviteAction,
        ...(reason === undefined ? {} : { reason }),
      });
      return;
    }
    case 'frame_tool_armed': {
      capture('frame_tool_armed', {});
      return;
    }
    case 'frame_scrolled': {
      if (!isRecord(payload.properties)) return;
      const { method } = payload.properties;
      if (!oneOf(FRAME_SCROLL_METHODS, method)) return;
      capture('frame_scrolled', { ...gitPillWorkspaceProperties(payload.properties.worktreePath), method });
      return;
    }
    case 'section_created': {
      if (!isRecord(payload.properties)) return;
      const { method, count } = payload.properties;
      if (!(RENDERER_TEXT_CREATE_METHODS as readonly unknown[]).includes(method) || !isCount(count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('section_created', { ...workspaceProperties, method: method as (typeof RENDERER_TEXT_CREATE_METHODS)[number], count });
      return;
    }
    case 'canvas_menu_used': {
      if (!isRecord(payload.properties)) return;
      const { action } = payload.properties;
      if (!oneOf(CANVAS_MENU_ACTIONS, action)) return;
      capture('canvas_menu_used', { action });
      return;
    }
    case 'text_node_created': {
      if (!isRecord(payload.properties)) return;
      const { method, count } = payload.properties;
      // `agent` is main's stamp at the applier: the renderer cannot claim the agent authored a label.
      if (!(RENDERER_TEXT_CREATE_METHODS as readonly unknown[]).includes(method)) return;
      if (!isCount(count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('text_node_created', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_TEXT_CREATE_METHODS)[number],
        count,
      });
      return;
    }
    case 'artifact_handoff_requested': {
      if (!isRecord(payload.properties) || !isCount(payload.properties.count)) return;
      capture('artifact_handoff_requested', { count: payload.properties.count });
      return;
    }
    case 'artifact_created': {
      if (!isRecord(payload.properties)) return;
      const { method } = payload.properties;
      // `agent` is main's own stamp: the renderer cannot claim the agent authored one.
      if (!oneOf(RENDERER_ARTIFACT_CREATE_METHODS, method)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('artifact_created', {
        ...workspaceProperties,
        method,
      });
      return;
    }
    case 'artifact_placed': {
      if (!isRecord(payload.properties)) return;
      const { method, count } = payload.properties;
      if (!oneOf(RENDERER_ARTIFACT_CREATE_METHODS, method)) return;
      if (!isCount(count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('artifact_placed', {
        ...workspaceProperties,
        method,
        count,
      });
      return;
    }
    case 'image_node_created': {
      if (!isRecord(payload.properties)) return;
      const { method, count } = payload.properties;
      if (!(RENDERER_IMAGE_CREATE_METHODS as readonly unknown[]).includes(method)) return;
      if (!isCount(count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('image_node_created', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_IMAGE_CREATE_METHODS)[number],
        count,
      });
      return;
    }
    case 'image_refused': {
      if (!isRecord(payload.properties)) return;
      const { method, reason, count } = payload.properties;
      if (!(CANVAS_IMAGE_ARRIVAL_METHODS as readonly unknown[]).includes(method)) return;
      if (!(IMAGE_REFUSAL_REASONS as readonly unknown[]).includes(reason)) return;
      if (!isSeq(count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('image_refused', {
        ...workspaceProperties,
        method: method as CanvasImageArrivalMethod,
        reason: reason as ImageRefusalReason,
        count,
      });
      return;
    }
    case 'text_size_changed': {
      if (!isRecord(payload.properties)) return;
      const { size, node_count } = payload.properties;
      if (!isCanvasTextSize(size)) return;
      if (!isCount(node_count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('text_size_changed', {
        ...workspaceProperties,
        size,
        node_count,
      });
      return;
    }
    case 'image_resized': {
      if (!isRecord(payload.properties)) return;
      const { method } = payload.properties;
      if (!(CANVAS_RESIZE_METHODS as readonly unknown[]).includes(method)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('image_resized', {
        ...workspaceProperties,
        method: method as CanvasResizeMethod,
      });
      return;
    }
    case 'text_resized': {
      if (!isRecord(payload.properties) || payload.properties.method !== 'handle') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('text_resized', {
        ...workspaceProperties,
        method: 'handle',
      });
      return;
    }
    case 'text_tool_armed': {
      capture('text_tool_armed', {});
      return;
    }
    case 'project_recovery_action': {
      if (!isRecord(payload.properties)) return;
      const { action, count } = payload.properties;
      if (!oneOf(PROJECT_RECOVERY_ACTIONS, action) || !isSeq(count)) return;
      capture('project_recovery_action', { action, count });
      return;
    }
    case 'canvas_thumbnail_displayed': {
      if (!isRecord(payload.properties)) return;
      const { with_image, placeholder } = payload.properties;
      if (!isSeq(with_image) || !isSeq(placeholder)) return;
      capture('canvas_thumbnail_displayed', { with_image, placeholder });
      return;
    }
    case 'inline_chat_opened': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('inline_chat_opened', {
        ...workspaceProperties,
        ...inlineAnchorField(payload.properties.anchor),
      });
      return;
    }
    case 'frame_reordered': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('frame_reordered', { ...workspaceProperties });
      return;
    }
    case 'tips_opened': {
      if (!isRecord(payload.properties)) return;
      const { source } = payload.properties;
      if (!(TIPS_OPEN_SOURCES as readonly unknown[]).includes(source)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('tips_opened', { ...workspaceProperties, source: source as TipsOpenSource });
      return;
    }
    case 'agent_status_opened': {
      if (!isRecord(payload.properties)) return;
      const { state, target, position, line_count } = payload.properties;
      if (!(AGENT_STATUS_LINE_STATES as readonly unknown[]).includes(state)) return;
      if (!(AGENT_STATUS_TARGETS as readonly unknown[]).includes(target)) return;
      if (!isSeq(position) || !isSeq(line_count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('agent_status_opened', {
        ...workspaceProperties,
        state: state as AgentStatusLineState,
        target: target as AgentStatusTarget,
        position,
        line_count,
      });
      return;
    }
    case 'agent_status_expanded': {
      if (!isRecord(payload.properties)) return;
      const { line_count } = payload.properties;
      if (!isSeq(line_count)) return;
      capture('agent_status_expanded', { ...gitPillWorkspaceProperties(payload.properties.worktreePath), line_count });
      return;
    }
    case 'tips_pill_dismissed': {
      if (!isRecord(payload.properties)) return;
      const { source } = payload.properties;
      if (!(TIPS_PILL_DISMISS_SOURCES as readonly unknown[]).includes(source)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('tips_pill_dismissed', { ...workspaceProperties, source: source as TipsPillDismissSource });
      return;
    }
    case 'tour_opened': {
      if (!isRecord(payload.properties)) return;
      const { source } = payload.properties;
      if (!(TOUR_OPEN_SOURCES as readonly unknown[]).includes(source)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('tour_opened', { ...workspaceProperties, source: source as TourOpenSource });
      return;
    }
    case 'tour_closed': {
      if (!isRecord(payload.properties)) return;
      const { step, completed } = payload.properties;
      if (!(TOUR_STEP_IDS as readonly unknown[]).includes(step) || typeof completed !== 'boolean') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('tour_closed', { ...workspaceProperties, step: step as TourStepId, completed });
      return;
    }
    case 'settings_opened': {
      if (!isRecord(payload.properties)) return;
      const { source } = payload.properties;
      if (!(SETTINGS_OPEN_SOURCES as readonly unknown[]).includes(source)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('settings_opened', { ...workspaceProperties, source: source as SettingsOpenSource });
      return;
    }
    case 'touched_file_opened': {
      if (!isRecord(payload.properties) || typeof payload.properties.during_turn !== 'boolean') return;
      capture('touched_file_opened', { during_turn: payload.properties.during_turn });
      return;
    }
    case 'code_opened': {
      if (!isRecord(payload.properties)) return;
      const { method, target, confidence } = payload.properties;
      if (!(CODE_OPEN_METHODS as readonly unknown[]).includes(method)) return;
      if (!(CODE_OPEN_TARGETS as readonly unknown[]).includes(target)) return;
      if (!(CODE_OPEN_CONFIDENCES as readonly unknown[]).includes(confidence)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('code_opened', {
        ...workspaceProperties,
        method: method as CodeOpenMethod,
        target: target as CodeOpenTarget,
        confidence: confidence as CodeOpenConfidence,
      });
      return;
    }
    case 'tips_prompt_chosen': {
      if (!isRecord(payload.properties)) return;
      const { tip_id } = payload.properties;
      if (!(TIPS_PROMPT_IDS as readonly unknown[]).includes(tip_id)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('tips_prompt_chosen', { ...workspaceProperties, tip_id: tip_id as TipsPromptId });
      return;
    }
    case 'connector_action': {
      if (!isRecord(payload.properties)) return;
      const { action } = payload.properties;
      if (!oneOf(CONNECTOR_ACTIONS, action)) return;
      capture('connector_action', { action });
      return;
    }
    case 'preview_recovery_pressed': {
      if (!isRecord(payload.properties)) return;
      const { action } = payload.properties;
      if (!oneOf(PREVIEW_RECOVERY_ACTIONS, action)) return;
      capture('preview_recovery_pressed', { action });
      return;
    }
    case 'inline_chat_dismissed': {
      if (!isRecord(payload.properties)) return;
      const { method, draft_lost } = payload.properties;
      if (!(INLINE_DISMISS_METHODS as readonly unknown[]).includes(method)) return;
      if (typeof draft_lost !== 'boolean') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('inline_chat_dismissed', {
        ...workspaceProperties,
        method: method as InlineDismissMethod,
        draft_lost,
      });
      return;
    }
    case 'inline_chat_send_refused': {
      if (!isRecord(payload.properties)) return;
      const { outcome } = payload.properties;
      if (!(INLINE_SEND_REFUSALS as readonly unknown[]).includes(outcome)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('inline_chat_send_refused', {
        ...workspaceProperties,
        outcome: outcome as InlineSendRefusal,
        ...inlineAnchorField(payload.properties.anchor),
      });
      return;
    }
    case 'inline_chat_submitted': {
      if (!isRecord(payload.properties)) return;
      const { element_count, frame_count, image_count, prompt_chars, rail_open } =
        payload.properties;
      if (!isSeq(element_count) || !isSeq(frame_count) || !isSeq(prompt_chars)) return;
      if (!isSeq(image_count)) return;
      if (typeof rail_open !== 'boolean') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('inline_chat_submitted', {
        ...workspaceProperties,
        element_count,
        frame_count,
        image_count,
        prompt_chars,
        rail_open,
        ...inlineAnchorField(payload.properties.anchor),
      });
      return;
    }
    case 'git_pill_no_action': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      const state = pillId(payload.properties.state);
      const { reason } = payload.properties;
      if (workspaceProperties === undefined || state === undefined) return;
      if (!oneOf(GIT_PILL_NO_ACTION_REASONS, reason)) return;
      capture('git_pill_no_action', { ...workspaceProperties, state, reason });
      return;
    }
    case 'git_pill_shown': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      const state = pillId(payload.properties.state);
      if (workspaceProperties === undefined || state === undefined) return;
      capture('git_pill_shown', { ...workspaceProperties, state });
      return;
    }
    case 'git_pill_clicked': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      const state = pillId(payload.properties.state);
      const action = pillId(payload.properties.action);
      if (workspaceProperties === undefined || state === undefined || action === undefined) return;
      capture('git_pill_clicked', { ...workspaceProperties, state, action });
      const export_type = EXPORT_TYPES[action];
      if (export_type !== undefined) capture('publish_triggered', { ...workspaceProperties, export_type, route: 'agent' });
      return;
    }
    case 'git_pill_queued': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      const state = pillId(payload.properties.state);
      const action = pillId(payload.properties.action);
      if (workspaceProperties === undefined || state === undefined || action === undefined) return;
      capture('git_pill_queued', { ...workspaceProperties, state, action });
      return;
    }
    case 'git_pill_outcome': {
      if (!isRecord(payload.properties)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      const from_state = pillId(payload.properties.from_state);
      const to_state = pillId(payload.properties.to_state);
      const { outcome, duration_ms } = payload.properties;
      if (workspaceProperties === undefined || from_state === undefined || to_state === undefined) return;
      if (!oneOf(GIT_PILL_OUTCOMES, outcome)) return;
      if (typeof duration_ms !== 'number' || !Number.isFinite(duration_ms) || duration_ms < 0) return;
      capture('git_pill_outcome', { ...workspaceProperties, from_state, to_state, outcome, duration_ms });
      const export_type = EXPORT_TYPES[from_state];
      if (outcome === 'advanced' && export_type !== undefined) {
        capture('code_exported', { ...workspaceProperties, export_type, duration_ms });
      }
      return;
    }
    case 'page_created': {
      if (!isRecord(payload.properties)) return;
      const { method } = payload.properties;
      if (!(RENDERER_PAGE_CREATE_METHODS as readonly unknown[]).includes(method)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('page_created', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_PAGE_CREATE_METHODS)[number],
      });
      return;
    }
    case 'page_switched': {
      if (!isRecord(payload.properties)) return;
      const { method, node_count, artifact_node_count, artifact_cover_held_count, artifact_snapshot_held_count, ms_since_open } = payload.properties;
      if (!(CANVAS_PAGE_SWITCH_METHODS as readonly unknown[]).includes(method)) return;
      if (!isSeq(node_count) || !isSeq(artifact_node_count) || !isSeq(artifact_cover_held_count) || !isSeq(artifact_snapshot_held_count)) return;
      if (ms_since_open !== undefined && !isDuration(ms_since_open)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('page_switched', {
        ...workspaceProperties,
        method: method as CanvasPageSwitchMethod,
        node_count,
        artifact_node_count,
        artifact_cover_held_count,
        artifact_snapshot_held_count,
        ...(ms_since_open === undefined ? {} : { ms_since_open }),
      });
      return;
    }
    case 'page_renamed': {
      if (!isRecord(payload.properties)) return;
      const { method, became_divider } = payload.properties;
      if (!(RENDERER_PAGE_METHODS as readonly unknown[]).includes(method)) return;
      if (typeof became_divider !== 'boolean') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('page_renamed', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_PAGE_METHODS)[number],
        became_divider,
      });
      return;
    }
    case 'page_deleted': {
      if (!isRecord(payload.properties)) return;
      const { method, had_nodes, confirmed } = payload.properties;
      if (!(RENDERER_PAGE_METHODS as readonly unknown[]).includes(method)) return;
      if (typeof had_nodes !== 'boolean' || typeof confirmed !== 'boolean') return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('page_deleted', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_PAGE_METHODS)[number],
        had_nodes,
        confirmed,
      });
      return;
    }
    case 'page_nodes_moved': {
      if (!isRecord(payload.properties)) return;
      const { method, node_count } = payload.properties;
      if (!(RENDERER_PAGE_MOVE_METHODS as readonly unknown[]).includes(method)) return;
      if (!isCount(node_count)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('page_nodes_moved', {
        ...workspaceProperties,
        method: method as (typeof RENDERER_PAGE_MOVE_METHODS)[number],
        node_count,
      });
      return;
    }
    case 'discover_cta_shown': {
      capture('discover_cta_shown', {});
      return;
    }
    case 'artifact_refreshed': {
      if (!isRecord(payload.properties) || !isCount(payload.properties.count)) return;
      capture('artifact_refreshed', { count: payload.properties.count });
      return;
    }
    case 'artifact_export_panel_opened': {
      if (!isRecord(payload.properties)) return;
      const { selected_count } = payload.properties;
      if (!isSeq(selected_count)) return;
      capture('artifact_export_panel_opened', { selected_count });
      return;
    }
    case 'artifact_export_batch': {
      if (!isRecord(payload.properties)) return;
      const { outcome, artifact_count, format_count } = payload.properties;
      if (!(ARTIFACT_EXPORT_BATCH_OUTCOMES as readonly unknown[]).includes(outcome) || !isCount(artifact_count) || !isCount(format_count)) return;
      capture('artifact_export_batch', { outcome: outcome as ArtifactExportBatchOutcome, artifact_count, format_count });
      return;
    }
    case 'discover_cta_resolved': {
      if (!isRecord(payload.properties)) return;
      const { outcome } = payload.properties;
      if (!(DISCOVER_CTA_OUTCOMES as readonly unknown[]).includes(outcome)) return;
      capture('discover_cta_resolved', { outcome: outcome as DiscoverCtaOutcome });
      return;
    }
    case 'transcript_gap': {
      if (!isRecord(payload.properties)) return;
      const { agent_session_id, from_seq, to_seq } = payload.properties;
      if (typeof agent_session_id !== 'string' || !SESSION_ID_SHAPE.test(agent_session_id)) return;
      if (!isSeq(from_seq) || !isSeq(to_seq) || to_seq <= from_seq) return;
      capture('transcript_gap', { agent_session_id, from_seq, to_seq });
      return;
    }
    case 'transcript_unknown_event': {
      if (!isRecord(payload.properties)) return;
      const { agent_session_id, event_type } = payload.properties;
      if (typeof agent_session_id !== 'string' || !SESSION_ID_SHAPE.test(agent_session_id)) return;
      if (typeof event_type !== 'string' || !EVENT_TYPE_SHAPE.test(event_type)) return;
      capture('transcript_unknown_event', { agent_session_id, event_type });
      return;
    }
    case 'chat_typing_measured': {
      const summary = typingSummary(payload.properties);
      if (summary !== undefined) capture('chat_typing_measured', summary);
      return;
    }
    case 'slow_interaction': {
      const slow = slowInteraction(payload.properties);
      if (slow !== undefined) capture('slow_interaction', slow);
      return;
    }
    case 'canvas_pan_measured': {
      const summary = panSummary(payload.properties);
      if (summary !== undefined) capture('canvas_pan_measured', summary);
      return;
    }
    case 'rate_limit_card_shown': {
      if (!isRecord(payload.properties)) return;
      const { agent, window_kind } = payload.properties;
      if (!(HARNESS_IDS as readonly unknown[]).includes(agent)) return;
      if (!oneOf(USAGE_LIMIT_WINDOWS, window_kind)) return;
      capture('rate_limit_card_shown', { agent: agent as HarnessId, window_kind });
      return;
    }
    case 'message_action': {
      if (!isRecord(payload.properties)) return;
      const { action, role, harness } = payload.properties;
      if (!oneOf(MESSAGE_ACTIONS, action)) return;
      if (!oneOf(MESSAGE_ACTION_ROLES, role)) return;
      if (!(HARNESS_IDS as readonly unknown[]).includes(harness)) return;
      capture('message_action', { action, role, harness: harness as HarnessId });
      return;
    }
    case 'prompt_recall': {
      if (!isRecord(payload.properties)) return;
      const { steps_back, had_attachments, next_action, harness } = payload.properties;
      if (!isSeq(steps_back) || steps_back < 1 || typeof had_attachments !== 'boolean') return;
      if (!oneOf(PROMPT_RECALL_NEXT_ACTIONS, next_action)) return;
      if (!(HARNESS_IDS as readonly unknown[]).includes(harness)) return;
      capture('prompt_recall', { steps_back, had_attachments, next_action, harness: harness as HarnessId });
      return;
    }
    case 'agent_silence_shown': {
      if (!isRecord(payload.properties)) return;
      const { agent_session_id, harness, silent_ms } = payload.properties;
      if (typeof agent_session_id !== 'string' || !SESSION_ID_SHAPE.test(agent_session_id)) return;
      if (!(HARNESS_IDS as readonly unknown[]).includes(harness)) return;
      if (!isSeq(silent_ms)) return;
      const workspaceProperties = gitPillWorkspaceProperties(payload.properties.worktreePath);
      capture('agent_silence_shown', {
        ...workspaceProperties,
        agent_session_id,
        harness: harness as HarnessId,
        silent_ms,
      });
      return;
    }
    default:
      return;
  }
}

// Only a UUIDv7 is adopted, `null` forgets, anything else is dropped: the value rides every later event (ONL-2343).
export function receiveReplaySession(payload: ReplaySessionReport): void {
  if (!isRecord(payload)) return;
  const { sessionId } = payload;
  if (sessionId === null) {
    adoptSessionId(null);
    return;
  }
  if (!isUuidV7(sessionId)) return;
  adoptSessionId(sessionId);
}

const MECHANISM_SHAPE = /^[a-z0-9-]{1,32}$/;
const REGION_SHAPE = /^[a-z0-9-]{1,32}$/;
const MAX_FRAMES = 30;

// Re-scrubbed, not trusted: a frame that slipped through unscrubbed is a checkout path in an issue (ONL-2348).
export function receiveRendererException(payload: RendererExceptionReport): void {
  if (!isRecord(payload)) return;
  const { type, value, frames, surface, mechanism, region } = payload;
  if (!(RENDERER_EXCEPTION_SURFACES as readonly unknown[]).includes(surface)) return;
  if (typeof type !== 'string' || typeof value !== 'string') return;
  if (typeof mechanism !== 'string' || !MECHANISM_SHAPE.test(mechanism)) return;
  if (region !== undefined && (typeof region !== 'string' || !REGION_SHAPE.test(region))) return;
  if (mechanism === 'resize-observer-loop' && type === 'Error' && isResizeObserverNotice(value) && Array.isArray(frames) && frames.length === 0) return;
  const safeFrames = (Array.isArray(frames) ? frames : []).slice(0, MAX_FRAMES).map((frame) => scrubFrame(frame, 'web:javascript'));
  captureError(
    {
      type: scrubClass(type),
      value: scrubMessage(value),
      ...(safeFrames.length === 0 ? {} : { stacktrace: { type: 'raw' as const, frames: safeFrames } }),
    },
    {
      owner: failureOwner(value),
      subsystem: surface === 'frame-preload' ? 'frame-preload' : 'renderer',
      process_type: 'renderer',
      mechanism,
      surface,
      ...(region === undefined ? {} : { region }),
    },
  );
}

export function registerTelemetryHandlers(): void {
  registerTelemetryRequestGuard();
  onTelemetryIdentityChanged((config) => broadcastToRenderers(IPC_EMIT.telemetryIdentityChanged, config));
  on(IPC_SEND.telemetryEvent, (event, payload: RendererTelemetryEvent) =>
    receiveRendererTelemetry(payload, event.sender.id),
  );
  on(IPC_SEND.telemetrySession, (_event, payload: ReplaySessionReport) =>
    receiveReplaySession(payload),
  );
  on(IPC_SEND.telemetryException, (_event, payload: RendererExceptionReport) =>
    receiveRendererException(payload),
  );
  handle(IPC_INVOKE.telemetryConfig, () => currentTelemetryConfig());
  handle(IPC_INVOKE.telemetryConsent, () => {
    const consent = telemetryConsent();
    if (consent !== undefined) return consent === 'unknown' ? null : consent === 'accepted';
    return analyticsChoiceStored() ? analyticsEnabled() : null;
  });
}
import { analyticsChoiceStored, analyticsEnabled, telemetryConsent } from '../settings/state.js';
