import type { CanvasTextSize } from './canvas.js';
import type { ImageRefusalReason } from './images.js';
import type { AttachmentRejectReason, AttachmentSource } from './attachments.js';
import type { SetupEntryPoint } from './claude-setup.js';
import type { UsageLimitWindow } from './events.js';
import type { CanvasPanSummary, ChatTypingSummary, SlowInteraction } from './perf.js';
import type { HarnessId } from './models.js';
import type { ScrubbedFrame } from './scrub.js';
import type { ArtifactCreateMethod } from './artifacts.js';
import type { OnboardingImportChoice, OnboardingScreen } from './onboarding.js';

export const TIPS_OPEN_SOURCES = ['button', 'shortcut', 'help', 'pill', 'rail_tip'] as const;

/** `menu` is main's app-command dispatch, behind the rail mark, Windows' app menu and a cloud build's account menu; `sidebar` is the Projects row (ONL-2499). */
export const SETTINGS_OPEN_SOURCES = ['menu', 'sidebar'] as const;
export type SettingsOpenSource = (typeof SETTINGS_OPEN_SOURCES)[number];

/** How the code panel came to be showing this file. */
export const CODE_OPEN_METHODS = ['selection', 'files-view', 'search', 'candidate', 'menu'] as const;
export type CodeOpenMethod = (typeof CODE_OPEN_METHODS)[number];

export const CODE_OPEN_TARGETS = ['element', 'component', 'file'] as const;
export type CodeOpenTarget = (typeof CODE_OPEN_TARGETS)[number];

/** The three grades plus `declined`, so an open that could not be placed stays in the denominator. The grade union itself is closed (ONL-2563). */
export const CODE_OPEN_CONFIDENCES = ['exact', 'likely', 'best-guess', 'declined'] as const;
export type CodeOpenConfidence = (typeof CODE_OPEN_CONFIDENCES)[number];
export type TipsOpenSource = (typeof TIPS_OPEN_SOURCES)[number];
/** `close` is the pill's own ×; `selection` is the first element picked on a frame (ONL-2984). */
export const TIPS_PILL_DISMISS_SOURCES = ['close', 'selection'] as const;
export type TipsPillDismissSource = (typeof TIPS_PILL_DISMISS_SOURCES)[number];
/** The first-run tour's doors: shown on its own once, then reopened from Tips or Help. */
export const TOUR_OPEN_SOURCES = ['first_run', 'tips', 'help'] as const;
export type TourOpenSource = (typeof TOUR_OPEN_SOURCES)[number];
export const AGENT_STATUS_LINE_STATES = ['working', 'done', 'needs-you'] as const;
export type AgentStatusLineState = (typeof AGENT_STATUS_LINE_STATES)[number];
/** Where a status line leads: a frame, or the chat's open question or permission (ONL-2973). */
export const AGENT_STATUS_TARGETS = ['frame', 'question', 'approval'] as const;
export type AgentStatusTarget = (typeof AGENT_STATUS_TARGETS)[number];
export const TOUR_STEP_IDS = ['canvas', 'chat', 'variations', 'layouts', 'riff', 'carousels', 'wrap'] as const;
export type TourStepId = (typeof TOUR_STEP_IDS)[number];
/** The first-run moments a person can see and act on; one pair of events for all of them. */
export const FIRST_RUN_SURFACES = ['inspire_tip', 'scroll_tip', 'prompt_tip', 'chat_welcome'] as const;
export type FirstRunSurface = (typeof FIRST_RUN_SURFACES)[number];
export const FIRST_RUN_ACTIONS = ['add', 'not_now', 'show_shortcuts', 'show_prompts', 'screens', 'user_flow', 'inspiration', 'timed_out', 'resolved'] as const;
export type FirstRunAction = (typeof FIRST_RUN_ACTIONS)[number];
/** What ended a tip's moment when the person did not act on the tip itself (ONL-2960). */
export const TIP_RESOLVE_REASONS = ['question', 'approval', 'other_path', 'used'] as const;
export type TipResolveReason = (typeof TIP_RESOLVE_REASONS)[number];
/** Where the notification invite sits; the chat's own invite sends neither event (ONL-2995). */
export const NOTIFICATION_INVITE_SURFACES = ['rail_tip'] as const;
export type NotificationInviteSurface = (typeof NOTIFICATION_INVITE_SURFACES)[number];
export const NOTIFICATION_INVITE_ACTIONS = ['enable', 'dismiss', 'resolved'] as const;
export type NotificationInviteAction = (typeof NOTIFICATION_INVITE_ACTIONS)[number];
/** `inspiration` is the "Add inspiration" tip's frame, counted apart from frames people draw (ONL-2960). */
export const FRAME_CREATE_METHODS = ['click', 'drag', 'inspiration'] as const;
export type FrameCreateMethod = (typeof FRAME_CREATE_METHODS)[number];

/** The built-in prompts of the Tips guide; telemetry names one, never its words (ONL-2468). */
export const TIPS_PROMPT_IDS = ['text', 'routes', 'vars', 'ds', 'page', 'compare', 'mobile', 'tidy', 'ref', 'refLayout', 'refColor', 'empty', 'flow', 'harmonize', 'states', 'showcase'] as const;
export type TipsPromptId = (typeof TIPS_PROMPT_IDS)[number];

/** `worktreePath` never leaves main: swapped for the hashed project id, or the event is dropped (ONL-2173). */
export interface RendererTelemetryEventMap {
  touched_file_opened: {
    during_turn: boolean;
  };
  activation_surface: ActivationSurfaceReport;
  preview_recovery_pressed: { action: PreviewRecoveryAction };
  connector_action: { action: ConnectorAction };
  agent_setup_opened: { provider: HarnessId; entry_point: SetupEntryPoint };
  agent_setup_skipped: { provider: HarnessId; entry_point: SetupEntryPoint };
  cloud_update_required_shown: Record<string, never>;
  cloud_update_download_clicked: Record<string, never>;
  git_pill_no_action: {
    worktreePath: string;
    state: string;
    reason: GitPillNoActionReason;
  };
  attachment_rejected: { kind: RejectedAttachmentKind; coarse_type: RejectedAttachmentKind; size_bucket: AttachmentSizeBucket; source: AttachmentSource; agent: HarnessId; reason: AttachmentRejectReason };
  skill_menu_opened: { item_kind: 'skill'; agent: HarnessId; source: SkillMenuSource };
  skill_chosen: { item_kind: 'skill'; agent: HarnessId };
  message_action: {
    action: MessageAction;
    role: MessageActionRole;
    harness: HarnessId;
  };
  prompt_recall: {
    steps_back: number;
    had_attachments: boolean;
    next_action: PromptRecallNextAction;
    harness: HarnessId;
  };
  /** Not activation; `agent_turn_ended.had_visible_edit` is. */
  frame_created: {
    method: FrameCreateMethod;
    worktreePath?: string;
  };

  first_run_shown: { worktreePath?: string; surface: FirstRunSurface; delay_ms?: number };
  first_run_acted: { worktreePath?: string; surface: FirstRunSurface; action: FirstRunAction; reason?: TipResolveReason };
  notification_invite_shown: { worktreePath?: string; surface: NotificationInviteSurface };
  notification_invite_acted: { worktreePath?: string; surface: NotificationInviteSurface; action: NotificationInviteAction; reason?: TipResolveReason };

  /** `visit` counts this screen's showings in one walk, so 2 or more is a return through Back (ONL-3259). */
  onboarding_screen_shown: {
    screen: OnboardingScreen;
    visit: number;
  };
  /** `choice` rides the import screen alone (ONL-3259). */
  onboarding_screen_passed: {
    screen: OnboardingScreen;
    choice?: OnboardingImportChoice;
  };

  frame_tool_armed: Record<string, never>;
  frame_scrolled: { worktreePath?: string; method: FrameScrollMethod };
  section_created: {
    worktreePath?: string;
    method: 'tool' | 'paste' | 'duplicate';
    count: number;
  };
  canvas_menu_used: {
    action: CanvasMenuAction;
  };

  /** A label that exists, by whichever path put it there; its words never ride (ONL-2486). */
  text_node_created: {
    worktreePath?: string;
    method: Exclude<CanvasTextCreateMethod, 'agent'>;
    count: number;
  };

  artifact_refreshed: { count: number };

  /** The right rail's export panel opened from the canvas (ONL-2593). */
  artifact_export_panel_opened: {
    selected_count: number;
  };

  /** One run of the export panel: per-file results still ride `artifact_export_result` (ONL-2593). */
  artifact_export_batch: {
    outcome: ArtifactExportBatchOutcome;
    artifact_count: number;
    format_count: number;
  };

  /** The artifact exists; its title never rides (ONL-2568). */
  artifact_created: {
    worktreePath?: string;
    method: Exclude<ArtifactCreateMethod, 'agent'>;
  };

  artifact_placed: {
    worktreePath?: string;
    method: Exclude<ArtifactCreateMethod, 'agent'>;
    count: number;
  };
  artifact_handoff_requested: {
    count: number;
  };

  /** Once per gesture, not per picture: a drop of five is one arrival (ONL-2486). */
  image_node_created: {
    worktreePath?: string;
    method: Exclude<CanvasImageCreateMethod, 'agent'>;
    count: number;
  };

  /** `reason` is the classifier's id or the gesture's own; the filename never rides (ONL-2486). */
  image_refused: {
    worktreePath?: string;
    method: CanvasImageArrivalMethod;
    reason: ImageRefusalReason;
    count: number;
  };

  text_size_changed: {
    worktreePath?: string;
    size: CanvasTextSize;
    node_count: number;
  };

  image_resized: {
    worktreePath?: string;
    method: CanvasResizeMethod;
  };

  text_resized: {
    worktreePath?: string;
    method: 'handle';
  };

  text_tool_armed: Record<string, never>;

  inline_chat_opened: {
    worktreePath?: string;
    anchor?: InlineChatAnchor;
  };

  /** A design dragged to a new place in the Designs list, which is its place in the canvas's stack. */
  frame_reordered: {
    worktreePath?: string;
  };

  tips_opened: {
    worktreePath?: string;
    source: TipsOpenSource;
  };

  /** A tap on a line of the agent status list; `position` counts from the top, 0 first. */
  agent_status_opened: {
    worktreePath?: string;
    state: AgentStatusLineState;
    target: AgentStatusTarget;
    position: number;
    line_count: number;
  };

  /** A tap on the collapsed status list's count, which opens the list. */
  agent_status_expanded: {
    worktreePath?: string;
    line_count: number;
  };

  tips_pill_dismissed: {
    worktreePath?: string;
    source: TipsPillDismissSource;
  };

  tour_opened: {
    worktreePath?: string;
    source: TourOpenSource;
  };

  /** `completed` is true only when Start on the last step closed it; Skip, Esc and the close button are not. */
  tour_closed: {
    worktreePath?: string;
    step: TourStepId;
    completed: boolean;
  };

  /** Which of the two doors opened Settings; a request over an open modal is not a second open (ONL-2499). */
  settings_opened: {
    worktreePath?: string;
    source: SettingsOpenSource;
  };

  /** Every property is an enum: no path, no component name, no file contents (ONL-2563). */
  code_opened: {
    worktreePath?: string;
    method: CodeOpenMethod;
    target: CodeOpenTarget;
    confidence: CodeOpenConfidence;
  };

  tips_prompt_chosen: {
    worktreePath?: string;
    tip_id: TipsPromptId;
  };

  inline_chat_dismissed: {
    worktreePath?: string;
    method: InlineDismissMethod;
    draft_lost: boolean;
  };

  inline_chat_send_refused: {
    worktreePath?: string;
    outcome: InlineSendRefusal;
    anchor?: InlineChatAnchor;
  };

  /** Counts and one flag: no tag, no DOM path, no prompt text (ONL-2455). */
  inline_chat_submitted: {
    worktreePath?: string;
    element_count: number;
    frame_count: number;
    image_count: number;
    prompt_chars: number;
    rail_open: boolean;
    anchor?: InlineChatAnchor;
  };

  git_pill_shown: {
    worktreePath: string;
    state: string;
  };

  git_pill_clicked: {
    worktreePath: string;
    state: string;
    action: string;
  };

  /** A press the pen is holding until the turn ends (ONL-2379). */
  git_pill_queued: {
    worktreePath: string;
    state: string;
    action: string;
  };

  git_pill_outcome: {
    worktreePath: string;
    from_state: string;
    to_state: string;
    outcome: GitPillOutcome;
    duration_ms: number;
  };

  project_recovery_action: {
    action: ProjectRecoveryAction;
    count: number;
  };

  /** Two counts, fired once per projects-view render. No project is named (ONL-2471). */
  canvas_thumbnail_displayed: {
    with_image: number;
    placeholder: number;
  };

  transcript_gap: {
    agent_session_id: string;
    from_seq: number;
    to_seq: number;
  };

  transcript_unknown_event: {
    agent_session_id: string;
    event_type: string;
  };

  /** Once per turn whose silence notice showed: such a turn can end with no `result`, so `agent_turn_ended` never fires for it (ONL-2491). */
  agent_silence_shown: {
    worktreePath?: string;
    agent_session_id: string;
    harness: HarnessId;
    silent_ms: number;
  };
  rate_limit_card_shown: {
    agent: HarnessId;
    window_kind: UsageLimitWindow;
  };

  chat_typing_measured: ChatTypingSummary;

  /** Sent as it happens, at most five per tab per window, so its timestamp lands on the replay (ONL-2582). */
  slow_interaction: SlowInteraction;

  canvas_pan_measured: CanvasPanSummary;

  /** The page's name never rides: it is the user's own vocabulary for their product (ONL-2488). */
  page_created: {
    worktreePath?: string;
    method: Exclude<CanvasPageCreateMethod, 'agent'>;
  };

  /** Of the page arrived at, zero included; the `_held_` pair is read before its nodes mount, so each counts what is already held rather than what painted (ONL-2488, ONL-2791). */
  page_switched: {
    worktreePath?: string;
    method: CanvasPageSwitchMethod;
    node_count: number;
    artifact_node_count: number;
    artifact_cover_held_count: number;
    artifact_snapshot_held_count: number;
    /** Absent when this session did not see the document open; the within-a-minute signal cannot be known at open time. */
    ms_since_open?: number;
  };

  page_renamed: {
    worktreePath?: string;
    method: Exclude<CanvasPageMethod, 'agent'>;
    became_divider: boolean;
  };

  /** `confirmed` is false for the empty page that deletes with no prompt (ONL-2488). */
  page_deleted: {
    worktreePath?: string;
    method: Exclude<CanvasPageMethod, 'agent'>;
    had_nodes: boolean;
    confirmed: boolean;
  };

  page_nodes_moved: {
    worktreePath?: string;
    method: Exclude<CanvasPageMoveMethod, 'agent'>;
    node_count: number;
  };

  /** Once per card becoming visible; the Projects Screen has no worktree, so no project is named (ONL-2443). */
  discover_cta_shown: Record<string, never>;

  /** The outcome is the whole payload: no repository, no path and no copy (ONL-2443). */
  discover_cta_resolved: {
    outcome: DiscoverCtaOutcome;
  };
}

export const PREVIEW_RECOVERY_ACTIONS = ['ask-agent', 'restart', 'start', 'try-again', 'back'] as const;
export type PreviewRecoveryAction = (typeof PREVIEW_RECOVERY_ACTIONS)[number];
export const CONNECTOR_ACTIONS = ['open-plug', 'open-add-menu', 'open-notice', 'dismiss-notice', 'add-figma', 'add-mobbin'] as const;
export type ConnectorAction = (typeof CONNECTOR_ACTIONS)[number];
export const GIT_PILL_NO_ACTION_REASONS = ['passive-state', 'working', 'agent-unavailable'] as const;
export type GitPillNoActionReason = (typeof GIT_PILL_NO_ACTION_REASONS)[number];
export const REJECTED_ATTACHMENT_KINDS = ['unknown', 'text'] as const;
export type RejectedAttachmentKind = (typeof REJECTED_ATTACHMENT_KINDS)[number];
export const ATTACHMENT_SIZE_BUCKETS = ['small', 'medium', 'large'] as const;
export type AttachmentSizeBucket = (typeof ATTACHMENT_SIZE_BUCKETS)[number];
export const SKILL_MENU_SOURCES = ['slash', 'control'] as const;
export type SkillMenuSource = (typeof SKILL_MENU_SOURCES)[number];
export const MESSAGE_ACTIONS = ['copy', 'copy_code', 'retry'] as const;
export type MessageAction = (typeof MESSAGE_ACTIONS)[number];
export const MESSAGE_ACTION_ROLES = ['user', 'assistant'] as const;
export type MessageActionRole = (typeof MESSAGE_ACTION_ROLES)[number];
export const PROMPT_RECALL_NEXT_ACTIONS = ['send', 'edit', 'abandon'] as const;
export type PromptRecallNextAction = (typeof PROMPT_RECALL_NEXT_ACTIONS)[number];
export const FRAME_SCROLL_METHODS = ['drag', 'page', 'key'] as const;
export type FrameScrollMethod = (typeof FRAME_SCROLL_METHODS)[number];
export const CANVAS_MENU_ACTIONS = ['paste', 'select-all', 'section', 'text', 'fit'] as const;
export type CanvasMenuAction = (typeof CANVAS_MENU_ACTIONS)[number];
export const PROJECT_RECOVERY_ACTIONS = ['import-all', 'dismiss'] as const;
export type ProjectRecoveryAction = (typeof PROJECT_RECOVERY_ACTIONS)[number];

export const ACTIVATION_SURFACES = ['setup', 'project_picker', 'preview_loading', 'chat_idle', 'error_state', 'canvas'] as const;
export type ActivationSurface = (typeof ACTIVATION_SURFACES)[number];
export const ACTIVATION_DEAD_ENDS = ['app_not_started', 'setup_failed', 'preview_failed', 'frame_unreachable', 'other'] as const;
export type ActivationDeadEnd = (typeof ACTIVATION_DEAD_ENDS)[number];
export const ACTIVATION_ERROR_CLASSES = ['canceled', 'dependency_install_failed', 'dev_server_failed', 'port_unreachable', 'clone_failed', 'timeout', 'unknown', 'render_gone', 'load_failed'] as const;
export type ActivationErrorClass = (typeof ACTIVATION_ERROR_CLASSES)[number];
export interface ActivationSurfaceReport {
  surface: ActivationSurface;
  dead_end?: { state: ActivationDeadEnd; error_class: ActivationErrorClass };
}

/** `agent` is main's stamp at the tool; the renderer's own maps exclude it, as the label and picture maps do (ONL-2488). */
export const RENDERER_PAGE_METHODS = ['user'] as const;
export type CanvasPageMethod = (typeof RENDERER_PAGE_METHODS)[number] | 'agent';

export const RENDERER_PAGE_CREATE_METHODS = ['plus'] as const;
export type CanvasPageCreateMethod = (typeof RENDERER_PAGE_CREATE_METHODS)[number] | 'agent';

/** `created` is the page the plus just made; `vacated` is the switch a delete or a divider rename forces, where no gesture named a destination. */
export const CANVAS_PAGE_SWITCH_METHODS = ['click', 'keyboard', 'link', 'created', 'vacated'] as const;
export type CanvasPageSwitchMethod = (typeof CANVAS_PAGE_SWITCH_METHODS)[number];

export const RENDERER_PAGE_MOVE_METHODS = ['menu'] as const;
export type CanvasPageMoveMethod = (typeof RENDERER_PAGE_MOVE_METHODS)[number] | 'agent';

export type FrameSource = 'user_tool' | 'agent' | 'import' | 'restore';

/** `agent` is main's to stamp at the applier; the renderer's own maps exclude it (ONL-2486). */
export const RENDERER_TEXT_CREATE_METHODS = ['tool', 'paste', 'duplicate'] as const;
export type CanvasTextCreateMethod = (typeof RENDERER_TEXT_CREATE_METHODS)[number] | 'agent';

/** The three gestures that bring a picture in from outside. */
export const CANVAS_IMAGE_ARRIVAL_METHODS = ['drop', 'paste', 'picker'] as const;
export type CanvasImageArrivalMethod = (typeof CANVAS_IMAGE_ARRIVAL_METHODS)[number];

export const RENDERER_IMAGE_CREATE_METHODS = [...CANVAS_IMAGE_ARRIVAL_METHODS, 'duplicate'] as const;
export type CanvasImageCreateMethod = (typeof RENDERER_IMAGE_CREATE_METHODS)[number] | 'agent';

export const CANVAS_RESIZE_METHODS = ['handle', 'restore-aspect-ratio'] as const;
export type CanvasResizeMethod = (typeof CANVAS_RESIZE_METHODS)[number];

/** Why a bubble closed without its own send; nothing the frame's page does closes one (ONL-2455, ONL-2518). `unattributed` is a close path that named no reason. */
export const INLINE_DISMISS_METHODS = [
  'escape',
  'click-away',
  'mode-switch',
  'tool-switch',
  'picker-armed',
  'selection-changed',
  'chat-sent',
  'prompt-recalled',
  'window-hidden',
  'canvas-cleared',
  'unattributed',
] as const;
export type InlineDismissMethod = (typeof INLINE_DISMISS_METHODS)[number];

/** Every `submitChatPrompt` outcome but `accepted`. */
export const INLINE_SEND_REFUSALS = ['rejected', 'failed', 'unavailable', 'in-flight', 'empty'] as const;
export type InlineSendRefusal = (typeof INLINE_SEND_REFUSALS)[number];

/** `node`: a whole Frame or Artifact, opened by Enter on its lone selection. */
export const INLINE_CHAT_ANCHORS = ['element', 'node'] as const;
export type InlineChatAnchor = (typeof INLINE_CHAT_ANCHORS)[number];

/** `cancelled` is a press the designer took back out of the pen before it ran (ONL-2379). */
export const GIT_PILL_OUTCOMES = ['advanced', 'unchanged', 'refused', 'cancelled'] as const;
export type GitPillOutcome = (typeof GIT_PILL_OUTCOMES)[number];

/** `starred` is the press that opened the repository, which reports no outcome of its own (ONL-2443). */
export const DISCOVER_CTA_OUTCOMES = ['starred', 'dismissed'] as const;
export type DiscoverCtaOutcome = (typeof DISCOVER_CTA_OUTCOMES)[number];

export const ARTIFACT_EXPORT_BATCH_OUTCOMES = ['saved', 'cancelled', 'refused', 'closed', 'failed'] as const;
export type ArtifactExportBatchOutcome = (typeof ARTIFACT_EXPORT_BATCH_OUTCOMES)[number];

export type RendererTelemetryEventName = keyof RendererTelemetryEventMap;

export type TelemetryConfig = { enabled: false } | EnabledTelemetryConfig;

export interface EnabledTelemetryConfig {
  enabled: true;
  key: string;
  host: string;
  /** Main's live id, never re-derived here: recordings must land on the same person as main's events. */
  distinctId: string;
  isIdentified: boolean;
  /** The id is nobody's — a launch no provider answered for — so linking it to an account would merge a person no account owns (ONL-2882). */
  unowned?: true;
  /** The anonymous id this launch's account has taken. Any other anonymous id a recorder holds is some other launch's, and the account may not take that one (ONL-2882). */
  linkableAnonymousId?: string;
  identityRevision: number;
  /** The launch's UUIDv7, minted by main so recording, main and renderer share one `$session_id` (ONL-2343). */
  sessionId: string;
  /** Unpackaged builds only, from `STUDIO_PERF_WINDOW_MS`. */
  perfWindowMs?: number;
}

/** `null`: the rotation is forgotten and main goes back to stamping the launch id. */
export interface ReplaySessionReport {
  sessionId: string | null;
}

export const RENDERER_EXCEPTION_SURFACES = ['tab', 'chrome', 'task-manager', 'frame-preload'] as const;
export type RendererExceptionSurface = (typeof RENDERER_EXCEPTION_SURFACES)[number];

/** `value` is empty for a React boundary: a region renders model output, which quotes code (ONL-2348). */
export interface RendererExceptionReport {
  type: string;
  value: string;
  frames: ScrubbedFrame[];
  surface: RendererExceptionSurface;
  mechanism: string;
  region?: string;
}

export interface DevThrowRequest {
  layer: 'main' | 'main-rejection';
}

/** The closed union is the allowlist; main re-checks it at runtime, since a compromised renderer is not bound by a type. */
export type RendererTelemetryEvent = {
  [N in RendererTelemetryEventName]: {
    event: N;
    properties: RendererTelemetryEventMap[N];
  };
}[RendererTelemetryEventName];
