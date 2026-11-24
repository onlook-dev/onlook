// Points at private codebases: every property is a hash, a count or an enumerated id. A path, repo or branch name, prompt or assistant text, file content, diff, or tool input or result does not ship; two exceptions do — the signed-in email (`index.ts`), and `report_submitted.message`, which main trims, length-bounds and rate-bounds without inspecting, because the user asked to send it (ONL-2350).
// Renaming an event or property breaks dashboards, not the build.

import type {
  AppCommand,
  AppCommandEntryPoint,
  CopyFailure,
  FrameCaptureStep,
  ActivationSurface,
  ActivationDeadEnd,
  ActivationErrorClass,
  AppResourcesSample,
  TaskGroup,
  NotificationSound,
  NoticeKind,
  ArtifactCreateMethod,
  ArtifactIntegrityOutcome,
  CanvasImageCreateMethod,
  CanvasPageCreateMethod,
  CanvasPageMethod,
  CanvasPageMoveMethod,
  CanvasTextCreateMethod,
  DestructiveClass,
  FrameSource,
  FrameCreateMethod,
  HarnessId,
  MachineFailureCause,
  PermissionMode,
  PermissionOutcome,
  ProjectImportEntryPoint,
  ProjectImportRefusalReason,
  ProcessGone,
  PromptOrigin,
  QuestionEndOutcome,
  SessionErrorCode,
  WorkspaceOrigin,
  WorkspaceRefusalReason,
  BlankEntryPoint,
  FOUND_US_QUESTION,
  ROLE_QUESTION,
  RoleOption,
  FoundUsOption,
  OnboardingImportChoice,
  OnboardingScreen,
  RendererTelemetryEventMap,
  RendererTelemetryEventName,
} from '@studio/events';
import type { Locale } from '@studio/i18n/locale';
import type { GitStateReason } from './git-state.js';
import type { PreviewDiagnostics } from './preview-diagnostics.js';

/** An enum, not the message: the message is a shell command, which names a directory. */
export type SetupErrorClass =
  | 'canceled'
  | 'dependency_install_failed'
  | 'dev_server_failed'
  | 'agent_turn_failed'
  | 'agent_turn_stopped'
  | 'port_unreachable'
  | 'clone_failed'
  | 'timeout'
  | 'unknown';

export type BlankCreationStep =
  | 'claim'
  | 'scaffold'
  | 'git_init'
  | 'git_add'
  | 'git_commit'
  | 'worktree_cut'
  | 'install'
  | 'starter_spawn'
  | 'open_project'
  | 'await_running';

export type BlankCreationCause =
  | MachineFailureCause
  | 'git_timed_out'
  | 'system_error'
  | 'name_taken'
  | 'install_failed'
  | 'starter_exited'
  | 'starter_never_ready'
  | 'never_running'
  | 'unknown';

export type SetupRunFailureReason = 'port_occupied' | 'listener_foreign' | 'listener_unseen' | 'readiness_timeout';

export type HeldPromptOutcome = 'released' | 'sent' | 'taken' | 'returned' | 'discarded';

export type TurnSeenResolution = 'visible_at_end' | 'shown' | 'cap_reached' | 'quit';

export type TurnSeenShownBy = 'window_focus' | 'project_opened' | TelemetryEventMap['tab_selected']['method'];

/** Why a successful turn changed zero files. */
export type NoEditReason = 'question_asked' | 'plan_only' | 'explanation_only' | 'edit_failed' | 'other';

/** Which surface the user was on when the app closed. */
export type LastSurface = ActivationSurface;

/** Why agent setup was skipped. */
export type SetupSkipReason = 'provider_detected';

/** The state that was showing when a dead end was hit. */
export type DeadEndState = ActivationDeadEnd;

/** An error class for dead-end events. */
export type DeadEndErrorClass = ActivationErrorClass;

export type CpuFamily = 'apple-m1' | 'apple-m2' | 'apple-m3' | 'apple-m4' | 'apple-other' | 'intel' | 'other';

export type FrameCaptureFailure = 'none' | 'project-closed' | 'off-page' | 'missing-page' | 'timeout' | 'page-changed' | 'viewport-changed' | 'incomplete-image' | 'view-busy' | 'view-late' | 'compositor-error' | 'capture-error' | 'internal-error';

export interface WorkspaceTelemetryProperties {
  project_id: string;
  workspace_instance_id: string;
}

export interface TelemetrySuperProperties {
  build_kind: 'official' | 'source';
  app_version: string;
  electron_version: string;
  chrome_version: string;
  /** The product surface, not the OS: the web app shares this PostHog project and its queries key on `platform`. */
  platform: 'desktop';
  /** PostHog's native property, in the web SDK's vocabulary ('Mac OS X', 'Windows', 'Linux'). */
  $os: string;
  $lib: 'studio-desktop';
  arch: string;
  under_rosetta: boolean;
  cpu_family: CpuFamily;
  is_packaged: boolean;
  launch_id: string;
  release_channel: string;
}

/** `agent_setup_step` and `agent_setup_completed` carry the same value: `recordAgentSetupStep` forwards one outcome into both. */
type AgentSetupOutcome =
  | 'ok'
  | 'invalid_code'
  | 'rejected'
  | 'failed'
  | 'timeout'
  | 'not_logged_in'
  | 'provider_refused'
  | 'agent_busy'
  | 'agent_error';

/** The website reference and its first-touch values, as both attribution events publish them and the link `$set_once`s them. */
export interface WebAttributionProperties {
  website_person_id: string;
  first_utm_source?: string;
  first_utm_medium?: string;
  first_utm_campaign?: string;
  first_utm_content?: string;
  first_utm_term?: string;
  first_referrer?: string;
  first_referring_domain?: string;
  first_landing_page?: string;
}

/** A renderer event as main captures it: the properties the renderer declared, `worktreePath` swapped for the hashed project id. */
type Forwarded<N extends RendererTelemetryEventName> = RendererTelemetryEventMap[N] extends { worktreePath: string }
  ? Omit<RendererTelemetryEventMap[N], 'worktreePath'> & { project_id: string }
  : 'worktreePath' extends keyof RendererTelemetryEventMap[N]
    ? Omit<RendererTelemetryEventMap[N], 'worktreePath'> & { project_id?: string }
    : RendererTelemetryEventMap[N];

export interface TelemetryEventMap {
  machine_check_failed: { check_id: import('@studio/events').MachineCheckId };
  machine_install_tools: { outcome: import('@studio/events').MachineInstallResult; elapsed_ms: number };
  machine_help_opened: { help: import('@studio/events').MachineHelpId; opened: boolean };
  web_attribution_candidate: WebAttributionProperties & { $process_person_profile: false };
  web_attribution_linked: WebAttributionProperties & { $process_person_profile: true };
  github_connect_finished: {
    outcome: 'connected' | 'waiting' | 'no_connection';
    next_action: 'clone' | 'folder' | 'retry' | 'dismiss' | 'waiting';
    entry_point: import('@studio/events').GithubEntryPoint;
  };
  github_clone: {
    outcome: 'started' | 'done' | import('@studio/events').GithubCloneFailure;
    entry_point: import('@studio/events').GithubEntryPoint;
  };
  workspace_creation_flow: {
    source: 'folder' | 'scratch' | 'github';
    step: 'started' | 'created' | 'preview';
    outcome: 'started' | 'success' | 'failure';
    project_id?: string;
  };
  account_action: {
    action: 'sign-in' | 'sign-out' | 'delete-account';
    method?: import('@studio/events').OnlookSignInMethod;
    outcome: 'ok' | Extract<import('@studio/events').OnlookActionResult, { ok: false }>['code'];
  };
  session_ended_at_launch: {
    reason: 'expired' | 'revoked' | 'ended';
    unopened_ms: number | null;
  };
  sign_in_completed: {
    method: import('@studio/events').OnlookSignInMethod;
  };
  sign_in_failed: {
    method: import('@studio/events').OnlookSignInMethod;
    code: import('@studio/events').SignInFailureCode;
  };
  cloud_update_required_shown: Record<string, never>;
  cloud_update_download_clicked: Record<string, never>;
  team_command_completed: {
    operation: import('@studio/events').TeamCommand['type'];
    outcome: 'success' | 'refused';
    error: import('@studio/events').TeamError | null;
  };
  git_state_measured: {
    project_id: string;
    trigger: import('@studio/events').GitMeasureTrigger;
    reason: GitStateReason;
    git_installed: boolean | null;
    gh_installed: boolean | null;
    gh_authenticated: boolean | null;
    origin: import('@studio/events').GitOriginKind | null;
    head: import('@studio/events').GitHead | null;
    access: import('@studio/events').GitRepoAccess | null;
    partial: boolean | null;
    fetch_succeeded: boolean | null;
    ahead: number | null;
    behind: number | null;
  };

  git_pill_no_action: Forwarded<'git_pill_no_action'>;
  notification_shown: { event_kind: NoticeKind; focused: boolean };
  notification_clicked: { event_kind: NoticeKind };
  notification_toast_opened: { event_kind: NoticeKind };
  notification_wait_answered: { event_kind: 'question' | 'approval'; waited_ms: number };
  notification_invite_shown: Forwarded<'notification_invite_shown'>;
  notification_invite_acted: Forwarded<'notification_invite_acted'>;
  question_answered: {
    /** Questions answered with the option the agent listed first, its recommendation. */
    first_option_picks: number;
    /** Questions answered with a pick and typed words beside it. */
    notes: number;
    option_count: number;
    question_count: number;
    multi_select: boolean;
    used_other: boolean;
    input: 'tap' | 'number-key' | 'typed';
    /** The person used a step number to return to an earlier question before sending. */
    went_back: boolean;
    time_to_answer_bucket: 'under-10s' | '10-30s' | '30-120s' | 'over-120s';
    harness: HarnessId;
  };
  turn_resumed: { method: import('@studio/events').ResumeMethod };
  attachment_added: { kind: 'image' | 'text' | 'pdf' | 'unknown'; coarse_type: 'image' | 'text' | 'pdf' | 'unknown'; size_bucket: 'small' | 'medium' | 'large'; source: 'drop' | 'paste' | 'picker'; agent: HarnessId };
  attachment_rejected: TelemetryEventMap['attachment_added'] & { reason: import('@studio/events').AttachmentRejectReason };
  skill_menu_opened: Forwarded<'skill_menu_opened'>;
  skill_chosen: Forwarded<'skill_chosen'>;
  message_action: Forwarded<'message_action'>;
  prompt_recall: Forwarded<'prompt_recall'>;
  touched_file_opened: Forwarded<'touched_file_opened'>;
  experimental_toggled: {
    feature: 'code_panel';
    enabled: boolean;
  };
  notification_sound_changed: {
    enabled: boolean;
    sound: NotificationSound;
  };
  app_opened: {
    startup_ms?: number;
    is_first_launch: boolean;
    locale: string;
    ui_language?: Locale;
    boot_outcome?: 'reported' | 'timeout' | 'renderer-gone';
    // Its own property, not folded into `startup_ms`, which measures from process start (ONL-2950).
    flag_wait_ms?: number;
  };

  app_closed: {
    duration_ms: number;
    session_duration_seconds: number;
    last_surface?: LastSurface;
  };

  crash_detected: {
    previous_launch_id: string;
    app_version: string | null;
    reporter_app_version: string;
  };

  /** `project_id` is `workspaceTelemetryId()`'s hash; the path does not ship. `oldest_text_node_days` is absent when the op log reads back empty, where zero would read as "every label is new" (ONL-2486). */
  project_opened: {
    project_id: string;
    dev_server_source: 'entered' | 'remembered';
    source: WorkspaceOrigin;
    text_node_count: number;
    image_node_count: number;
    artifact_node_count: number;
    oldest_text_node_days?: number;
    page_count: number;
    non_divider_page_count: number;
    oldest_page_days?: number;
  };

  /** One per refusal a person is shown at the folder pick; the folder and the existing project's name do not ship (ONL-2895). */
  project_folder_refused: {
    reason: WorkspaceRefusalReason;
    entry_point: BlankEntryPoint;
  };

  project_creation_started: {
    creation_id: string;
    source: 'blank';
    entry_point: BlankEntryPoint;
  };

  /** Creation completed, not universal server readiness: blanks have measured running, imports have copied and registered. `project_id` hashes the minted identity; paths and names do not ship. Blank attempts carry `creation_id` and `duration_ms` (ONL-2861). */
  project_created: {
    project_id: string;
    source: WorkspaceOrigin;
    entry_point: 'onboarding' | 'projects' | 'switcher' | 'band' | 'setup-failure';
    creation_id?: string;
    duration_ms?: number;
  };

  /** A recovery, not an activation, so it stays out of `project_created`, which the activation funnel is built on. `project_id`, `origin` and `completed_by` are absent for a refusal that never resolved an identity (ONL-2522). */
  project_imported: {
    project_id?: string;
    origin?: WorkspaceOrigin;
    entry_point: ProjectImportEntryPoint;
    completed_by?: 'record' | 'git';
    refusal?: ProjectImportRefusalReason;
  };

  /** One per scan of the workspace root, counts only: `offered` is the rows the user is shown, `refused` the candidates the scan looked at and did not offer (ONL-2522). */
  worktrees_discovered: {
    offered: number;
    refused: number;
  };

  /** The `failure_*` fields are absent on a cancel. Closed lists and codes only, never the failure's text: git's output names branches and paths (ONL-3103). */
  project_creation_failed: {
    creation_id: string;
    source: 'blank';
    duration_ms: number;
    stage: 'setting-up' | 'installing' | 'starting';
    reason: 'canceled' | 'failed';
    entry_point: 'onboarding' | 'projects';
    failure_step?: BlankCreationStep;
    failure_cause?: BlankCreationCause;
    exit_code?: number;
    system_error?: string;
  };

  tab_view_failed: {
    project_id?: string;
    reason: 'renderer-gone' | 'load-failed';
    exit_reason?: string;
    error_code?: number;
  };

  workspace_created: {
    project_id: string;
    head_matches: boolean;
    base_kind: 'remote' | 'local-main';
  };

  /** Setup details stay local: tool output can contain arbitrary repo names and contents. */
  project_setup_failed: Partial<PreviewDiagnostics> & {
    failure_step?: CopyFailure['step'];
    failure_cause?: CopyFailure['cause'];
    project_id?: string;
    stage: 'planning' | 'copying' | 'installing' | 'starting';
    duration_ms?: number;
    error_class?: SetupErrorClass;
    entry_point?: 'onboarding' | 'projects' | 'switcher';
  };

  project_setup_run_completed: Partial<PreviewDiagnostics> & {
    project_id?: string;
    action: 'start' | 'stop' | 'restart';
    ok: boolean;
    duration_ms: number;
    failure_stage?: 'prepare' | 'install' | 'start' | 'ready' | 'stop';
    failure_reason?: SetupRunFailureReason;
  };

  dev_server_exited: Partial<PreviewDiagnostics> & {
    project_id?: string;
  };

  project_setup_installation_checked: {
    project_id?: string;
    reused: boolean;
  };

  /** What Project settings asked this project's agent for, and whether it reached it (ONL-2499). */
  project_setup_agent_requested: {
    project_id?: string;
    intent: 'setup' | 'repair' | 'none';
    outcome: 'sent' | 'busy' | 'not-applicable' | 'unavailable' | 'no-project';
  };

  /** The approval card a project with no verified setup never saw; the only record that Studio ran a setup script unasked (ONL-2499). */
  project_setup_approval_withheld: {
    project_id?: string;
    tool: 'save_project_setup' | 'run_project_setup';
    harness: HarnessId;
  };

  /** Studio sent a setup prompt that opens the setup checklist; where it drew is the renderer's to say (ONL-2913). */
  setup_steps_shown: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
  };

  /** The turn that drew the checklist ended. Step numbers and the outcome only, never the failure's text (ONL-2913). */
  setup_steps_ended: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    outcome: 'done' | 'failed' | 'incomplete';
    failed_step?: 1 | 2 | 3 | 4;
  };

  /** `error_message` only through `scrubMessage`. */
  preview_ready: Partial<PreviewDiagnostics> & {
    project_id: string;
    outcome: 'success' | 'failure';
    duration_ms: number;
    entry_point?: 'blank' | 'import' | 'repo' | 'reopen';
    error_class?: SetupErrorClass;
    error_message?: string;
  };
  preview_recovery_pressed: Forwarded<'preview_recovery_pressed'>;
  connector_action: Forwarded<'connector_action'>;
  connector_menu_opened: {
    harness: HarnessId;
    source: 'plug' | 'add-menu' | 'notice';
    inventory_known: boolean;
    connector_count: number;
    needs_sign_in_count: number;
    connected_count: number;
    failed_count: number;
  };
  connector_inventory_observed: {
    harness: HarnessId;
    inventory_known: boolean;
    connector_count: number;
    needs_sign_in_count: number;
    connected_count: number;
    failed_count: number;
    figma_connected_count: number;
    mobbin_connected_count: number;
    other_connected_count: number;
  };
  connector_connection_started: {
    attempt_id: string;
    harness: HarnessId;
    action: 'add' | 'sign-in' | 'retry' | 'manage-externally';
    connector: 'figma' | 'mobbin' | 'other';
  };
  connector_connection_finished: {
    attempt_id: string;
    harness: HarnessId;
    action: 'add' | 'sign-in' | 'retry' | 'manage-externally';
    connector: 'figma' | 'mobbin' | 'other';
    outcome: 'connected' | 'failed' | 'opened' | 'cancelled';
    failure_category?: 'integration' | 'server' | 'authorization' | 'timeout' | 'cancelled' | 'unknown';
  };
  connector_tool_used: {
    harness: HarnessId;
    connector: 'figma' | 'mobbin' | 'other';
    connection_state: import('@studio/events').ConnectorState | 'unknown';
  };

  /** Fired in main where a renderer prompt reaches a backend, so a refused send, a prompt still waiting in the pen, and Studio's own `origin: 'studio'` pushes do not count (ONL-2294). `has_frame_context` is any canvas object in context, a label included: `FrameAttachment` carries no kind (ONL-2486). */
  prompt_submitted: {
    project_id: string;
    prompt_chars: number;
    has_selection: boolean;
    has_frame_context: boolean;
    source: 'typed' | 'sample' | 'nudge' | 'suggestion';
    is_first_prompt_in_project: boolean;
    /** Only with `source: 'suggestion'`; `suggestion_taps` counts taps on the card's tasks before Confirm (ONL-2977). */
    suggestion_index?: number;
    suggestion_taps?: number;
    /** Only with `source: 'suggestion'`; true is a retry or stop-and-resend of a tap, which carries no index or taps (ONL-2901). */
    is_resend?: boolean;
  };

  /** The kind only: the app, the port and the path do not ship (ONL-2182). */
  setup_question: {
    project_id: string;
    kind: 'app' | 'plan' | 'port';
    /** Only with `kind: 'plan'`: which unusual start Studio saw (ONL-2960). */
    monorepo?: boolean;
    electron?: boolean;
    no_dev_script?: boolean;
  };

  project_mode_chosen: {
    project_id: string;
    mode: 'design' | 'experiment' | 'ship';
    source: WorkspaceOrigin;
    entry_point: 'onboarding' | 'projects' | 'switcher' | 'band' | 'setup-failure';
  };

  /** The name does not ship (ONL-2181). */
  project_renamed: {
    project_id: string;
    by: 'agent' | 'user';
  };

  /** Covers unarchiving too: `archived` is the state the card moved to. */
  project_archived: {
    project_id: string;
    target: 'project' | 'workspace';
    archived: boolean;
    workspace_count: number;
  };

  /** The card's menu handed the project's folder to the file manager; the item is disabled when the folder is gone, so a reveal that fires had one (ONL-2315). */
  project_revealed: {
    project_id: string;
    origin: WorkspaceOrigin;
  };

  /** The card's menu deleted the project; only a confirmed removal that reached the end records one, so a cancel and a kept tab are absent by construction (ONL-2315). */
  project_removed: {
    project_id: string;
    origin: WorkspaceOrigin;
    missing: boolean;
    last_in_group: boolean;
  };

  /** One event for a whole folder, with no `project_removed` for the projects in it: a removal count summed from `project_removed` under-counts after this (ONL-2523). */
  workspace_removed: {
    project_id: string;
    origin: WorkspaceOrigin;
    project_count: number;
    missing_count: number;
  };

  /** Counts only: `moved_distance` is the largest place a row shifted, so a fizzled drag reads as 0; no identity and no order ship. */
  workspaces_reordered: {
    workspace_count: number;
    moved_distance: number;
  };

  frame_state_changed: Partial<PreviewDiagnostics> & {
    project_id: string;
    state: 'loading' | 'live' | 'unreachable';
    elapsed_ms?: number;
  };

  /** Not the activation signal: `agent_turn_ended.had_visible_edit` is. */
  frame_created: {
    project_id?: string;
    method: FrameCreateMethod;
    source: FrameSource;
  };

  first_run_shown: Forwarded<'first_run_shown'>;

  first_run_acted: Forwarded<'first_run_acted'>;

  onboarding_screen_shown: {
    screen: OnboardingScreen;
    visit: number;
    is_first_launch: boolean;
  };

  onboarding_screen_passed: {
    screen: OnboardingScreen;
    choice?: OnboardingImportChoice;
    is_first_launch: boolean;
  };

  /** Sent on every answer; the person keeps the first (ONL-3259). */
  onboarding_survey_answered: {
    question: typeof FOUND_US_QUESTION | typeof ROLE_QUESTION;
    answer: FoundUsOption | RoleOption;
    has_detail: boolean;
    /** Where the person first heard of us stays the first answer; a role changed on Back is the new one (ONL-3347). */
    $set_once?: { found_us: FoundUsOption };
    $set?: { role: RoleOption };
  };

  frame_tool_armed: Record<string, never>;
  frame_scrolled: Forwarded<'frame_scrolled'>;

  /** By `studio`, it is not a `frame_created`: Studio placed the frame for its own onboarding prompt (ONL-2960). */
  frame_quote_placed: {
    project_id?: string;
    by: 'agent' | 'studio';
    node: 'frame' | 'artifact';
    onto: 'new' | 'existing';
  };

  /** From placement to the lift; a quote cleared, orphaned or forgotten never lifts (ONL-2960). */
  frame_quote_lifted: {
    project_id?: string;
    ms_to_lift: number;
    node: 'frame' | 'artifact';
    trigger: 'look' | 'turn_end' | 'page_load';
  };
  section_created: {
    project_id?: string;
    method: 'tool' | 'paste' | 'duplicate' | 'agent';
    count: number;
  };
  canvas_menu_used: Forwarded<'canvas_menu_used'>;

  /** A label that exists, by whichever path put it there; `method: 'agent'` is stamped in main (ONL-2486). */
  text_node_created: {
    project_id?: string;
    method: CanvasTextCreateMethod;
    count: number;
  };

  /** The artifact exists, by whichever path made it; never its title, which is text the user authored (ONL-2568). */
  artifact_created: {
    project_id?: string;
    method: ArtifactCreateMethod;
  };

  /** A node placed for an artifact that already existed, which a paste and the agent both do. */
  artifact_placed: {
    project_id?: string;
    method: ArtifactCreateMethod;
    count: number;
  };
  artifact_export_result: {
    outcome: 'saved' | 'cancelled' | 'refused';
    count: number;
  };
  artifact_export_panel_opened: Forwarded<'artifact_export_panel_opened'>;
  artifact_export_batch: Forwarded<'artifact_export_batch'>;
  artifact_edited: {
    page_count: number;
    /** The write replaced the empty page an artifact was created with in that session (ONL-2960). */
    first_write: boolean;
  };
  artifact_renamed: { count: number };
  artifact_refreshed: Forwarded<'artifact_refreshed'>;
  artifact_searched: { count: number };
  artifact_deleted: { count: number };
  artifact_imported: {
    page_count: number;
  };
  artifact_codebase_target: {
    count: number;
  };
  artifact_handoff_requested: Forwarded<'artifact_handoff_requested'>;

  /**
   * How "zero artifacts lost" is observable: a set-aside record, a refusal to read one a newer
   * build wrote, and an index rebuilt from disk. Counts and scalars only (ONL-2568).
   */
  artifact_integrity: {
    outcome: ArtifactIntegrityOutcome;
    count: number;
  };

  /** Once per gesture, not per picture; no filename and no byte count (ONL-2486). */
  image_node_created: {
    project_id?: string;
    method: CanvasImageCreateMethod;
    count: number;
  };

  /** `reason` is the classifier's id or the gesture's own, never a sentence and never a filename (ONL-2486). */
  image_refused: Forwarded<'image_refused'>;

  text_size_changed: Forwarded<'text_size_changed'>;

  image_resized: Forwarded<'image_resized'>;

  text_resized: Forwarded<'text_resized'>;

  text_tool_armed: Record<string, never>;

  /** The surface is its own event: `prompt_submitted.source` is fixed in main, which cannot see which surface submitted (ONL-2455). */
  inline_chat_opened: Forwarded<'inline_chat_opened'>;

  frame_reordered: Forwarded<'frame_reordered'>;

  tips_opened: Forwarded<'tips_opened'>;

  agent_status_opened: Forwarded<'agent_status_opened'>;

  agent_status_expanded: Forwarded<'agent_status_expanded'>;

  tips_pill_dismissed: Forwarded<'tips_pill_dismissed'>;

  tour_opened: Forwarded<'tour_opened'>;

  tour_closed: Forwarded<'tour_closed'>;

  settings_opened: Forwarded<'settings_opened'>;

  code_opened: Forwarded<'code_opened'>;

  tips_prompt_chosen: Forwarded<'tips_prompt_chosen'>;

  inline_chat_dismissed: Forwarded<'inline_chat_dismissed'>;

  inline_chat_send_refused: Forwarded<'inline_chat_send_refused'>;

  /** Counts only: `element_count`, `frame_count`, `image_count` and `prompt_chars`; the tag, the DOM path, the text and the image bytes do not ship. */
  inline_chat_submitted: Forwarded<'inline_chat_submitted'>;

  /** `agent_session_id` is the host-assigned id from `@studio/events`, not the SDK's. `is_authenticated` is null on codex, whose connection truth arrives after this fires (ONL-2463). */
  agent_session_started: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    model?: string;
    is_authenticated: boolean | null;
  };

  agent_turn_started: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    origin: PromptOrigin;
  };

  agent_turn_stalled: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    silent_ms: number;
  };

  agent_mcp_tools_used: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    mcp_tool_call_count: number;
    origin: PromptOrigin;
    outcome: 'success' | 'error' | 'interrupted';
  };

  /** Per-kind counts exclude external MCP calls; the outcome counts and `in_subagent_calls` include them. Claude counts a call once the model starts writing it, Codex once it runs; Codex shows no call a sub-agent makes (ONL-2978). */
  agent_turn_tools: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    origin: PromptOrigin;
    outcome: 'success' | 'error' | 'interrupted';
    read_calls: number;
    search_calls: number;
    file_edit_calls: number;
    file_delete_calls: number;
    shell_calls: number;
    canvas_edit_calls: number;
    canvas_navigate_calls: number;
    frame_check_calls: number;
    fetch_calls: number;
    plan_calls: number;
    question_calls: number;
    subagent_calls: number;
    other_calls: number;
    external_mcp_calls: number;
    failed_calls: number;
    denied_calls: number;
    canceled_calls: number;
    in_subagent_calls: number;
    read_failed_calls: number;
    read_denied_calls: number;
    read_canceled_calls: number;
    search_failed_calls: number;
    search_denied_calls: number;
    search_canceled_calls: number;
    file_edit_failed_calls: number;
    file_edit_denied_calls: number;
    file_edit_canceled_calls: number;
    file_delete_failed_calls: number;
    file_delete_denied_calls: number;
    file_delete_canceled_calls: number;
    shell_failed_calls: number;
    shell_denied_calls: number;
    shell_canceled_calls: number;
    canvas_edit_failed_calls: number;
    canvas_edit_denied_calls: number;
    canvas_edit_canceled_calls: number;
    canvas_navigate_failed_calls: number;
    canvas_navigate_denied_calls: number;
    canvas_navigate_canceled_calls: number;
    frame_check_failed_calls: number;
    frame_check_denied_calls: number;
    frame_check_canceled_calls: number;
    fetch_failed_calls: number;
    fetch_denied_calls: number;
    fetch_canceled_calls: number;
    plan_failed_calls: number;
    plan_denied_calls: number;
    plan_canceled_calls: number;
    question_failed_calls: number;
    question_denied_calls: number;
    question_canceled_calls: number;
    subagent_failed_calls: number;
    subagent_denied_calls: number;
    subagent_canceled_calls: number;
    other_failed_calls: number;
    other_denied_calls: number;
    other_canceled_calls: number;
    external_mcp_failed_calls: number;
    external_mcp_denied_calls: number;
    external_mcp_canceled_calls: number;
  };

  /** `waited_ms` runs from turn end until the project's tab is next active in a focused window, the one-hour cap, or quit (ONL-2978). */
  agent_turn_seen: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    origin: PromptOrigin;
    outcome: 'success' | 'error' | 'interrupted';
    resolution: TurnSeenResolution;
    waited_ms: number;
    window_focused_at_end: boolean;
    project_tab_active_at_end: boolean;
    system_idle_ms_at_end: number;
    screen_locked_at_end: boolean;
    shown_by?: TurnSeenShownBy;
    system_idle_ms_at_shown?: number;
  };

  agent_turn_ended: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    turn_id: string;
    duration_ms: number;
    /** Of `duration_ms`, the part the agent spent holding a question for the designer (ONL-2295). */
    waited_ms: number;
    stop_reason?: string;
    tool_call_count: number;
    permission_request_count: number;
    permission_denied_count: number;
    prompt_chars: number | null;
    response_chars: number;
    files_changed: number;
    execute_targets: number;
    origin: PromptOrigin;
    /** The person's messages in the turn, a joined message and an answer to a question included (ONL-2961). */
    user_messages: number;
    retry_attempts: number | null;
    retry_observed_count?: number;
    retry_last_status: number | null;
    retry_error_kind: string | null;
    outcome: 'success' | 'error' | 'interrupted';
    /** Files changed in a turn the person spoke in: one they opened, or a Studio turn they joined or answered, so "yes, run the repair" that changes their code counts (ONL-2961). */
    had_visible_edit: boolean;
    attempted_frame_inspection: boolean;
    had_provider_stall: boolean;
    /** Present when `outcome` is `success` and `files_changed` is 0 (ONL-2686). */
    no_edit_reason?: NoEditReason;
  };

  /** `total_cost_usd` is cumulative straight from the SDK and `delta_cost_usd` sums to it across a session; a dashboard reads either. */
  agent_cost_recorded: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    at: 'turn_end' | 'session_end';
    turn_id?: string;
    total_cost_usd: number;
    delta_cost_usd: number;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_tokens?: number;
    cache_creation_tokens?: number;
    num_turns?: number;
  };

  /** `turn_count` is turns begun in this process, Studio-origin included; `chat_new_started.turn_count` counts user-spoken messages instead. `total_cost_usd` is absent on codex, which reports no cost figure (ONL-2463). */
  agent_session_ended: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    reason: 'completed' | 'error' | 'interrupted' | 'max_turns';
    duration_ms?: number;
    turn_count: number;
    total_cost_usd?: number;
  };

  agent_silence_shown: Forwarded<'agent_silence_shown'>;

  /** The code only; the message does not ship. `api_error_status` is the HTTP status the backend declared, null when it declared none (ONL-2463). */
  agent_error: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    code: SessionErrorCode;
    api_error_status: number | null;
  };
  rate_limit_card_shown: Forwarded<'rate_limit_card_shown'>;

  agent_setup_step: {
    provider: HarnessId;
    step:
      | 'opened'
      | 'sign_in_started'
      | 'page_reopened'
      | 'code_submitted'
      | 'verify_started'
      | 'connected'
      | 'fallback'
      | 'cancelled'
      | 'install_started'
      | 'skipped';
    browser_choice?: 'default' | 'other';
    outcome?: AgentSetupOutcome;
    entry_point: 'onboarding' | 'editor' | 'settings' | 'startup' | 'unknown';
    reason?: SetupSkipReason;
  };

  /** `setting: 'harness'` is the default agent itself moving; `'model'` is that harness's own model or effort default. `model` and `effort` ride only in the enumerated-id shape. */
  agent_default_changed: {
    harness: HarnessId;
    setting: 'harness' | 'model';
    model?: string;
    effort?: string;
  };

  /** `state` is an enumerated pill-state id (ONL-2173); a branch name, PR URL, label string or checks output does not ship. */
  git_pill_shown: Forwarded<'git_pill_shown'>;

  /** `action` is an enumerated action id. */
  git_pill_clicked: Forwarded<'git_pill_clicked'>;

  /** A press the agent's turn left waiting in the pen (ONL-2379). */
  git_pill_queued: Forwarded<'git_pill_queued'>;

  git_pill_outcome: Forwarded<'git_pill_outcome'>;

  /** One of the application's own commands, from whichever menu or key asked (ONL-3127). */
  app_command_run: {
    command: AppCommand;
    entry_point: AppCommandEntryPoint;
  };

  tab_selected: {
    method: 'click' | 'hotkey_jump' | 'hotkey_cycle' | 'tab_created' | 'tab_closed' | 'agent' | 'task_manager';
    open_count: number;
    from_project_id?: string;
    to_project_id?: string;
    to_was_working: boolean;
  };

  /** `restore` has no sender yet (ONL-2208). */
  tab_created: {
    method: 'plus' | 'hotkey' | 'projects_view' | 'agent' | 'restore' | 'launch' | 'reopen';
    open_count: number;
    project_id?: string;
  };

  /** Only a confirmed start records; a cancelled one records nothing (ONL-2198). */
  chat_new_started: {
    project_id: string;
    harness: HarnessId;
    /** Turns in the chat being left, never zero: an empty chat refuses before it records. */
    turn_count: number;
  };

  /** Only a switch that started the other agent records; a refused one records nothing (ONL-2903). */
  chat_agent_switched: {
    project_id: string;
    from_harness: HarnessId;
    to_harness: HarnessId;
    /** Where it was chosen: the model menu, or the action on a failed turn's row (ONL-2612). */
    entry_point: 'menu' | 'failure';
  };

  /** "thumbnail", never "snapshot" or "capture": both already name other things in this tree (ONL-2471). */
  canvas_thumbnail_captured: {
    trigger: 'cooldown' | 'leave';
    outcome:
      | 'written'
      | 'not_dirty'
      | 'not_open'
      | 'no_frames'
      | 'bad_geometry'
      | 'capture_failed'
      | 'compose_failed'
      | 'budget_exceeded'
      | 'too_large'
      | 'run_failed';
    frames: number;
    /** A bucket, not the duration: a millisecond figure on a per-project event is a fingerprint. */
    duration_bucket: 'under_1s' | 'under_3s' | 'under_10s' | 'over_10s';
    capped: boolean;
  };

  project_recovery_action: Forwarded<'project_recovery_action'>;

  canvas_thumbnail_displayed: Forwarded<'canvas_thumbnail_displayed'>;

  /** The perf events carry no `project_id`: millisecond figures beside one are a fingerprint, as on `canvas_thumbnail_captured` (ONL-2582). */
  chat_typing_measured: Forwarded<'chat_typing_measured'>;

  slow_interaction: Forwarded<'slow_interaction'>;

  canvas_pan_measured: Forwarded<'canvas_pan_measured'>;

  app_resources_sampled: AppResourcesSample;

  /** Window → Task Manager opened its window, or brought it forward (ONL-3112). */
  task_manager_opened: { open_tabs: number; was_open: boolean };

  /** The Task Manager window closed: how long it was open, what the person did in it, and which group held the most CPU and memory at its last reading (ONL-3112). */
  task_manager_closed: {
    open_ms: number;
    refreshes: number;
    tab_shows: number;
    expanded: boolean;
    sorted: boolean;
    top_cpu_group: TaskGroup | 'none';
    top_memory_group: TaskGroup | 'none';
  };

  frame_capture_completed: {
    outcome: 'success' | 'failure';
    failure_reason: FrameCaptureFailure;
    duration_ms: number;
    view_moved: boolean;
    /** Checking, moving and restoring the view, without the capture itself. */
    reveal_ms: number;
    capture_ms: number;
    stalled_step: FrameCaptureStep | 'none';
    /** How long the still picture covered the tab; 0 when none was held. */
    freeze_ms: number;
    move_answered_late: boolean;
  };

  process_gone: ProcessGone;

  tab_closed: {
    method: 'close_button' | 'hotkey' | 'agent' | 'switch' | 'remove';
    open_count: number;
    had_running_work: boolean;
    /** `wait` is a refused close: the tab stayed open and `open_count` did not move (ONL-2315). */
    modal_choice?: 'close_anyway' | 'wait';
  };

  transcript_gap: Forwarded<'transcript_gap'>;

  transcript_unknown_event: Forwarded<'transcript_unknown_event'>;

  /** Fired where a renderer prompt reaches a backend, so a prompt waiting in the pen counts once it goes and never before (ONL-2294); Studio's own `origin: 'studio'` prompts do not count, and the text does not ship (ONL-2380). */
  chat_message_sent: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    is_first_in_session: boolean;
    prompt_chars: number;
    attachment_count: number;
  };

  /** The agent offered tappable next tasks; a tap is the next `agent_turn_ended` with `origin: 'suggestion'` (ONL-2899). */
  next_tasks_offered: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    task_count: number;
  };

  /** One per frame a `suggest_next_tasks` call pictured from: a target not clipped falls back to the whole frame, then the frame's last picture, then a sketch or text (ONL-2977). */
  next_task_picture_clipped: {
    project_id: string;
    agent_session_id: string;
    harness: HarnessId;
    targets: number;
    clipped: number;
    no_match: number;
    hidden: number;
    not_in_view: number;
    stale_ref: number;
    by_ref: number;
    whole_frame_fallback: number;
    remembered_fallback: number;
    capture_failure: FrameCaptureFailure;
    retried: boolean;
    duration_ms: number;
  };

  /** What became of a prompt that waited mid-turn: `released` is the pen letting it go on a clean ending, `returned` the pen handing it back on any other, `taken` the designer pulling it back themselves. A prompt put back after a refused send is still waiting and reports nothing (ONL-2294, ONL-2519). */
  held_prompt_resolved: {
    project_id: string;
    harness: HarnessId;
    outcome: HeldPromptOutcome;
    prompt_chars: number;
    waited_ms: number;
  };

  /** How an open question ended; never the question, its options or the reply (ONL-2583). */
  question_ended: {
    project_id: string;
    harness: HarnessId;
    outcome: QuestionEndOutcome;
    question_count: number;
    waited_ms: number;
  };

  /** The mode value and the backend are enumerated ids; no command, path or repo name rides along. */
  permission_mode_changed: {
    mode: PermissionMode;
    harness: HarnessId;
  };

  /** How a destructive-class request was answered, as a scalar; the command never ships. */
  permission_decided: {
    outcome: PermissionOutcome;
    harness: HarnessId;
    destructive_class: DestructiveClass;
  };

  agent_setup_completed: {
    provider: HarnessId;
    success: true;
    entry_point: TelemetryEventMap['agent_setup_step']['entry_point'];
    outcome?: AgentSetupOutcome;
  };

  /** Fired when the visible tab shows a dead end other than the one it last showed, such as "Your app didn't start" or every frame under a server cover (ONL-2686, ONL-3260). */
  dead_end_shown: Partial<PreviewDiagnostics> & {
    state: DeadEndState;
    server_port?: number;
    cover?: NonNullable<import('@studio/events').ActivationSurfaceReport['dead_end']>['cover'];
    error_class?: DeadEndErrorClass;
    project_id?: string;
  };

  /** Fired when setup closes or the app quits without `connected`, `fallback` or `cancelled` (ONL-2686). */
  agent_setup_abandoned: {
    last_step: TelemetryEventMap['agent_setup_step']['step'];
    provider: TelemetryEventMap['agent_setup_step']['provider'];
    entry_point: TelemetryEventMap['agent_setup_step']['entry_point'];
  };

  /** No page name and no object of any kind: a page name is the user's own vocabulary for their product (ONL-2488). */
  page_created: {
    project_id?: string;
    method: CanvasPageCreateMethod;
  };

  /** Of the page arrived at, zero included; the `_held_` pair is read before its nodes mount, so each counts what is already held rather than what painted. `ms_since_open` is what the within-a-minute signal reads (ONL-2488, ONL-2791). */
  page_switched: Forwarded<'page_switched'>;

  page_renamed: {
    project_id?: string;
    method: CanvasPageMethod;
    became_divider: boolean;
  };

  /** `confirmed` is false for the empty page that deletes with no prompt, and for every agent delete, whose card is the approval (ONL-2488). */
  page_deleted: {
    project_id?: string;
    method: CanvasPageMethod;
    had_nodes: boolean;
    confirmed: boolean;
  };

  page_nodes_moved: {
    project_id?: string;
    method: CanvasPageMoveMethod;
    node_count: number;
  };

  /** The Projects Screen has no project, so neither discover event carries one (ONL-2443). */
  discover_cta_shown: Record<string, never>;

  discover_cta_resolved: Forwarded<'discover_cta_resolved'>;

  publish_triggered: {
    project_id: string;
    export_type: 'pr' | 'push' | 'merge';
    route: 'agent';
  };

  code_exported: {
    project_id: string;
    export_type: 'pr' | 'push' | 'merge';
    duration_ms: number;
  };

  /** `message` is the user's own words, sent because they asked: no project name, path, file, prompt or tab title rides along, and `$geoip_disable` and `$ip` keep the location and the address off it (ONL-2350). */
  report_submitted: {
    filed_by?: 'cloud';
    lane: 'bug' | 'feature';
    entry_point: 'menu' | 'canvas' | 'rail';
    install_id: string;
    message: string;
    email?: string;
    account_id?: string;
    $geoip_disable: true;
    $ip: null;
  };

  /** Network failures included, which Error Tracking drops, so an outage of the update host shows here (ONL-2627). `reason` is Chromium's `ERR_*` code or `other`, never the message. */
  update_check_failed: {
    stage: 'check' | 'download' | 'install';
    reason: string;
  };
}

export type TelemetryEventName = keyof TelemetryEventMap;
export type TelemetryProperties<N extends TelemetryEventName> = TelemetryEventMap[N] & (
  'project_id' extends keyof TelemetryEventMap[N] ? Partial<WorkspaceTelemetryProperties> : unknown
);
