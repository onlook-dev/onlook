/**
 * Test handles — the contract between the app's DOM and the e2e specs.
 *
 * This holds only what the surviving specs drive (ONL-1869); components carry
 * `data-testid`s this file no longer names.
 */

export const TESTID = {
  onboardingMachine: 'onboarding-machine',
  githubImport: 'github-import-flow',
  githubBody: 'github-import-body',
  githubActions: 'github-import-actions',
  githubConnect: 'github-import-connect',
  githubBack: 'github-back',
  githubCancel: 'github-cancel',
  githubClone: 'github-clone',
  githubSearch: 'github-search',
  githubSettings: 'github-settings',
  githubSettingsDialog: 'github-settings-dialog',
  addCodebase: 'add-codebase',
  addCodebasePopover: 'add-codebase-popover',
  addCodebaseDialog: 'add-codebase-dialog',
  codebaseFromFolder: 'codebase-from-folder',
  codebaseFromGithub: 'codebase-from-github',
  githubRepository: 'github-repo-1',
  /** The scrolling box the rows sit in, and the listbox inside it that holds the list's one Tab stop. */
  githubList: 'github-list',
  githubRepositories: 'github-repositories',
  githubListActions: 'github-list-actions',
  githubCloneSlow: 'github-clone-slow',
  projectsAddWorkspace: 'projects-add-workspace',
  sidebarRow: 'sidebar-row',
  teamsDialog: 'teams-dialog',
  teamsError: 'teams-error',
  teamsNotice: 'teams-notice',
  accountTeams: 'onlook-account-teams',
  // --- the projects view: the app's ROOT surface once onboarded (ONL-1908) --
  // `projectCardOpen` is the card's open TARGET, not the card — the `⋯` chip is
  // a sibling button, so the card itself cannot be one.
  projectsView: 'projects-view',
  projectsSidebar: 'projects-sidebar',
  projectGrid: 'project-grid',
  projectCardOpen: 'project-card-open',
  projectCardMenu: 'project-card-menu',
  /** Absent, not empty, on a project with no capture yet: the placeholder renders instead (ONL-2471). */
  projectCardThumbnail: 'project-card-thumbnail',
  /** The blank-project door on Recent (ONL-2152) and the row it sits in. */
  projectsNewDraft: 'projects-new-draft',
  projectsEmptyActions: 'projects-empty-actions',
  /** Each row also carries `data-worktree-path`, the handle it passes back (ONL-2522). */
  discoveredWorktrees: 'discovered-worktrees',
  discoveredWorktreeRow: 'discovered-worktree-row',
  discoveredWorktreeImport: 'discovered-worktree-import',
  /** The split control's primary arm, mounted but hidden where there is no Workspace to create into. */
  newProject: 'new-project',
  newProjectMenu: 'new-project-menu',
  /** The Workspaces header's add-control — the projects view's folder pick. */
  sidebarSectionAction: 'sidebar-section-action',
  /** The footer row that reopens the safety screen, and the dialog it opens (ONL-2184). */
  // Settings is a modal over whichever screen the person is on (ONL-2499),
  // opened by `projectsSettings` here and by the rail logo menu's row on the
  // Canvas. `settingsDialog` carries `data-area` (project | global), so a driver
  // reads the area as a fact rather than from the nav's translatable labels;
  // the Project area is absent when the Tab holds no project. `settingsPane` is
  // the Global area's content. The agent row carries `data-value` (the
  // HarnessId) and `data-readiness`, and the readiness line repeats
  // `data-readiness`, so a driver reads the agent as a fact, never as copy.
  // `settingsAgentSetup` exists only when the shown agent is not ready.
  projectsSettings: 'projects-settings',
  settingsDialog: 'settings-dialog',
  settingsDialogClose: 'settings-dialog-close',
  settingsAreaProject: 'settings-area-project',
  settingsAreaGlobal: 'settings-area-global',
  settingsPane: 'settings-pane',
  settingsAnalyticsToggle: 'settings-analytics-toggle',
  settingsAgentRow: 'settings-agent-row',
  settingsAgentSelector: 'settings-agent-selector',
  settingsAgentReadiness: 'settings-agent-readiness',
  settingsAgentSetup: 'settings-agent-setup',
  // The cut-two rows. Both default rows carry `data-value` — the stored id, or
  // `default` when the run picks for itself — plus a count (`data-options`,
  // `data-levels`) that is zero exactly when the selector is disabled, so a
  // driver reads a catalog swap as a fact rather than by opening the menu.
  // A workspace name field carries `data-workspace` (the repoIdentity), so a
  // driver picks its row without depending on order; `settingsWorkspacesEmpty`
  // exists instead of any field when no workspace is connected.
  settingsModelRow: 'settings-model-row',
  settingsModelSelector: 'settings-model-selector',
  settingsEffortRow: 'settings-effort-row',
  settingsEffortSelector: 'settings-effort-selector',

  // --- the shell (smoke: did the app come up at all) -----------------------
  topbar: 'topbar',
  sidebar: 'sidebar',
  sidebarDesigns: 'sidebar-designs',

  // --- the Canvas screen's icon rail (ONL-2563) ----------------------------
  // `canvasRail` carries `data-rail-view` (designs | code), so a driver reads
  // which view the panel is on rather than guessing from what is drawn.
  canvasRail: 'canvas-rail',
  /** The first view. Labelled Files, as the design draws it; the view it opens is the designs list and keeps that name. */
  railViewDesigns: 'rail-view-designs',
  railViewCode: 'rail-view-code',
  railMark: 'rail-mark',
  /** The rule between the mark and the views. */
  railRule: 'rail-rule',
  railLogoMenu: 'rail-logo-menu',
  railLogoMenuItem: 'rail-logo-menu-item',
  /** A rule between two groups of the logo menu; the submenus are one cluster and carry none between them. */
  railLogoMenuRule: 'rail-logo-menu-rule',
  railHelp: 'rail-help',
  helpMenu: 'help-menu',
  helpMenuItem: 'help-menu-item',
  codePanel: 'code-panel',
  codePanelEmpty: 'code-panel-empty',
  codePanelLoading: 'code-panel-loading',
  /** The open file's editor. Its content host is contenteditable, which is what makes the canvas defer its bare-letter shortcuts to it. */
  codeArea: 'code-area',
  codeBreadcrumb: 'code-breadcrumb',
  /** The Files view: the project's own tree, and the search over it. */
  codeFiles: 'code-files',
  codeFilesSearch: 'code-files-search',
  /** The header's own door to the browser, beside the project's name. */
  codeSearchToggle: 'code-search-toggle',
  codeBrowseToggle: 'code-browse-toggle',
  codeBreadcrumbRoot: 'code-breadcrumb-root',
  codeFilesName: 'code-files-name',
  codeFilesLine: 'code-files-line',
  codeTab: 'code-tab',
  codeSaveBar: 'code-save-bar',
  codeSave: 'code-save',
  codeDiscard: 'code-discard',
  /** Carries `data-confidence` — which sentence is said, and the only attribute that tells a pick Studio could not place from a mapping it can no longer confirm — beside `data-confident`, the same judgement read without knowing the keys (ONL-2563). */
  codeTintLabel: 'code-tint-label',
  codeTintComponent: 'code-tint-component',
  codeTintReach: 'code-tint-reach',
  codeClashBanner: 'code-clash-banner',
  /** The canvas's own floating controls. Each is placed from the canvas's corner, past whatever the panels cover (ONL-2563). */
  canvasHelp: 'canvas-help',
  canvasTips: 'canvas-tips',
  /** The Design/Preview switch, which centres on the canvas between the panels rather than on the window. */
  canvasModeSwitch: 'canvas-mode',
  /**
   * Mirrors `TIPS_TESTIDS.dialog`. It carries `data-view` (prompts | hotkeys), and
   * each shortcut row inside it carries `data-hotkey-row` with that row's id — so a
   * driver reads which half is showing, and which keys it lists, rather than their
   * translatable labels.
   */
  tipsDialog: 'tips-dialog',
  /** The welcome tour, which first run opens over the canvas. */
  tourDialog: 'tour-dialog',
  canvasRegion: 'canvas-region',
  projectSetupPanel: 'project-setup-panel',
  projectSetupAsk: 'project-setup-ask',
  projectSetupFailure: 'project-setup-failure',
  appRunNotice: 'app-run-notice',
  appRunNoticeReason: 'app-run-notice-reason',
  appRunNoticeRepair: 'app-run-notice-repair',
  appRunNoticeDismiss: 'app-run-notice-dismiss',
  chatRegion: 'chat-region',
  modeBand: 'mode-band',
  canvasMode: 'canvas-mode',
  canvas: 'canvas',
  canvasEmpty: 'canvas-empty',
  canvasTextNode: 'canvas-text-node',
  /** The ⌥ measurement arms; one child per gap drawn. */
  canvasNodeMeasure: 'canvas-node-measure',
  canvasTextResizeHandle: 'canvas-text-resize-handle',
  canvasTextSizeBar: 'canvas-text-size-bar',
  canvasTextSizeAnchor: 'canvas-text-size-anchor',
  onboardingSkip: 'onboarding-skip',
  sidebarWorkspace: 'sidebar-workspace',
  /**
   * The update affordance (ONL-1844). No spec drives it yet; it carries
   * `data-update-status`, so a driver reads the state machine, not the label.
   */
  topbarUpdate: 'topbar-update',
  /**
   * The EDITOR-ONLY half of the window bar (ONL-1935). `topbar` is on every
   * surface, so it is not the "am I in the editor" tooth — these two are, filled
   * from inside the editor's own subtree and absent everywhere else.
   */
  topbarFolder: 'topbar-folder',
  topbarGitStatus: 'topbar-git-status',
  /**
   * The dot on the chat-panel toggle (ONL-2455). Present only while that panel
   * is closed AND the session has something to say; `data-status` carries which.
   * No spec drives it yet — the collapsed-panel walk is still to be written.
   */
  topbarRailRightStatus: 'topbar-rail-right-status',

  // --- the chat panel's proof of life and ghost honesty (smoke) ------------
  chatHeader: 'chat-header',
  chatNotifications: 'chat-notifications',
  notificationSoundDialog: 'notification-sound-dialog',
  /** The sound cards carry `aria-pressed`, so a driver reads selection as a fact rather than a border colour. */
  notificationSoundChirp: 'notification-sound-chirp',
  notificationSoundTwoTone: 'notification-sound-two-tone',
  notificationSoundMute: 'notification-sound-mute',
  notificationSoundLater: 'notification-sound-later',
  notificationSoundSave: 'notification-sound-save',
  chatComposer: 'chat-composer',
  touchedFiles: 'touched-files',
  touchedFile: 'touched-file',
  touchedFilePreview: 'touched-file-preview',
  touchedFilePreviewContent: 'touched-file-preview-content',
  touchedFilePreviewClose: 'touched-file-preview-close',
  chatNoConnection: 'chat-no-connection',
  /** The signed-out card that replaced the banner on the Claude path (ONL-2187). */
  chatSignInCard: 'chat-sign-in-card',
  /** The card's container; `data-placement` says `band` or `transcript`. */
  chatSignInSlot: 'chat-sign-in-slot',
  chatNew: 'chat-new',
  chatNewConfirm: 'chat-new-confirm',
  chatAttach: 'chat-attach',
  chatAddMenu: 'chat-add-menu',
  chatSkillsMenu: 'chat-skills-menu',
  chatSkillOption: 'chat-skill-option',
  chatSkillMatch: 'chat-skill-match',
  chatSkillToken: 'chat-skill-token',
  chatSkillRemove: 'chat-skill-remove',
  chatAttachmentChip: 'chat-attachment-chip',
  chatAttachmentPreview: 'chat-attachment-preview',
  /**
   * The image-drop affordance (ONL-1981). Carries `data-dropping`, so a driver
   * reads a FACT rather than diffing a background colour a theme could move.
   * The gesture needs no native input synthesis — the listeners take ordinary
   * DOM `DragEvent`s on `document`. This handle only proves the composer offered
   * itself as the target; `chatAttachmentChip` is what proves the attach landed.
   */
  chatComposerDropzone: 'chat-composer-dropzone',
  // The model + effort readout, one control; it replaced `chat-model` and
  // `chat-effort`.
  chatModelEffort: 'chat-model-effort',
  chatPermissionRow: 'chat-permission-row',
  chatConnectors: 'chat-connectors',
  chatConnectorsMenu: 'chat-connectors-menu',
  chatConnectorsNotice: 'chat-connectors-notice',
  /**
   * One model row in that control's menu (ONL-2183). Carries `data-value` (the
   * model id) and `data-selected`, so a spec picks and re-finds a row by fact.
   */
  chatModelRow: 'chat-model-row',
  /** One effort row in a model row's flyout; `data-value` is the level, `default` for the clearing entry. */
  chatEffortRow: 'chat-effort-row',
  chatElementPick: 'chat-element-pick',
  chatElementChip: 'chat-element-chip',
  chatElementRemove: 'chat-element-remove',
  /**
   * The bubble at a picked element (ONL-2455). Its zero-size anchor is the only part in
   * flow coordinates — the surface itself is in the browser's top layer, so a
   * spec reads it by handle and never by position inside the canvas.
   */
  inlineElementBubble: 'inline-element-bubble',
  inlineElementBubbleComposer: 'inline-element-bubble-composer',
  inlineElementBubbleSend: 'inline-element-bubble-send',
  /** The shift-added chips' row inside the bubble; the anchor never appears there. */
  inlineElementBubbleDrawer: 'inline-element-bubble-drawer',
  inlineElementAnchor: 'inline-element-anchor',
  // The frame-selection pills (ONL-2045). No spec drives them; the handles
  // exist for the visual-proof recipes that select frames and read the attachment strip.
  chatFrameChip: 'chat-frame-chip',
  chatFrameRemove: 'chat-frame-remove',
  /** A selected artifact chips as its own kind, not as a frame (ONL-2568). */
  chatArtifactChip: 'chat-artifact-chip',
  chatAttachmentStrip: 'chat-attachment-strip',
  /** Send at rest, STOP while a turn streams — one button, the composer's `isStopShown`. */
  chatSend: 'chat-send',
  /** A conversational turn; `data-role` is `user` | `assistant`, and an error row adds `data-kind="error"`. */
  chatMessage: 'chat-message',
  /** Where a conversation the agent cannot continue ends (ONL-2925); not a turn, so it carries no `chat-message`. */
  chatBoundary: 'chat-boundary',
  /** The mid-turn chip under a user row (ONL-2180); `data-delivery` carries the state, never the label. */
  chatDelivery: 'chat-delivery',
  /** The failing-provider notice (ONL-2491); `data-notice` is `retrying` or `silent`, and the transcript's is `none` when no notice is up. */
  chatProviderNotice: 'chat-provider-notice',
  /** One tool row; `data-verb` names its line (`projectNamed` for `rename_project`) and `data-status` its state. */
  toolRow: 'tool-row',
  chatSubmittedAttachments: 'chat-submitted-attachments',
  chatSubmittedAttachmentPill: 'chat-submitted-attachment-pill',
  chatSubmittedFramePill: 'chat-submitted-frame-pill',

  // --- the diagnostics instrument (smoke: node-pty under Electron's ABI) ---
  ptyCheck: 'pty-check',
  ptyStatus: 'pty-status',

  // --- the showroom (ONL-2172; dev-gated, so build target only) -------------
  showroomGit: 'showroom-git',
  showroomChat: 'showroom-chat',
  gitGalleryPillPrefix: 'git-gallery-pill-',
  // The Better Onboarding gallery (ONL-2176). Tiles are `onboarding-tile-<provider>-<state>`,
  // dialogs `onboarding-dialog-<provider>-<state>`; the specs walk the package's arrays.
  showroomOnboardingUi: 'showroom-onboarding-ui',
  onboardingTilePrefix: 'onboarding-tile-',
  onboardingDialogPrefix: 'onboarding-dialog-',
  onboardingLiveDialogOpen: 'onboarding-live-dialog-open',
  onboardingLiveDialog: 'onboarding-live-dialog',
  onboardingBack: 'onboarding-back',
  // The editor's switcher (ONL-2179).
  projectPicker: 'project-picker',
  // The chat's setup row (ONL-2244) and its in-place Retry on a failed stage (ONL-2179).
  // The row carries `data-setup-phase` (the machine's stage) and `data-setup-failed`,
  // so a driver asserts the stage as a fact; `chatSetupLine` is the sentence's copy.
  chatSetup: 'chat-setup',
  chatSetupLine: 'chat-setup-line',
  chatSetupRetry: 'chat-setup-retry',
  chatSetupDismiss: 'chat-setup-dismiss',
  chatSetupDetail: 'chat-setup-detail',
  // The live turn readout. While a question is held it reads the waiting phrase and stops
  // counting; answering resumes it with the wait taken out (ONL-2295).
  chatTurnTimer: 'chat-turn-timer',
  // The canvas toolbar's run control; while setup runs with no frame it carries the stage label (ONL-2179).
  canvasRun: 'canvas-run',
  gitStatusChevron: 'git-status-chevron',
  gitStatusDropdown: 'git-status-dropdown',

  // The tab-strip gallery (ONL-2205). Story frames are `tabsGalleryPrefix +
  // <story>`; inside one, a tab and its parts are `tabPrefix|tabClosePrefix|
  // tabLabelPrefix + <tab id>`. The strip's own furniture is unprefixed.
  showroomTabs: 'showroom-tabs',
  tabsGalleryPrefix: 'tabs-gallery-',
  tabPrefix: 'tab-',
  tabClosePrefix: 'tab-close-',
  tabLabelPrefix: 'tab-label-',
  tabRenamePrefix: 'tab-rename-',
  tabStrip: 'tab-strip',
  tabStripNew: 'tab-strip-new',
  tabStripFade: 'tab-strip-fade',

  // --- the first-run flow, as the road to the connect entry (isolation) ----
  telemetryConsent: 'telemetry-consent',
  telemetryAccept: 'telemetry-accept',
  telemetryDecline: 'telemetry-decline',
  onboardingAgents: 'onboarding-agents',
  onboardingContinue: 'onboarding-continue',
  /** The footer's ghost help — hidden since ONL-1953; the spec pins its absence. */
  onboardingHelp: 'onboarding-help',
  onboardingImport: 'onboarding-import',
  onboardingImportRow: 'onboarding-import-row',
  /** The "Start from scratch" tile (ONL-2152) — `data-state` says whether it is
   * live (`default`) or the switcher's inert copy (`comingSoon`). */
  onboardingImportBlank: 'onboarding-import-blank',
  /** The import chooser's tiles; the first is the folder pick. */
  agentCard: 'agent-card',

  // --- the connect step (ONL-2186; agent-setup.e2e.ts, and every walker) ----
  // Tiles carry `data-provider`, `data-state` (the tile vocabulary: `idle` until
  // tapped, R3) and `data-mark` (`attention` | `connected`, absent otherwise).
  // The dialog carries `data-state` (the setup vocabulary) and `data-busy` while
  // a detection redraws the previous verdict. ⚠️ TAPPING A TILE IS PART OF
  // GETTING PAST THIS SCREEN: Continue reads the machines only through a tap.
  onboardingAgentRow: 'onboarding-agent-row',
  onboardingTileClaude: 'onboarding-tile-claude',
  onboardingTileCodex: 'onboarding-tile-codex',
  onboardingDialogClaude: 'onboarding-dialog-claude',
  onboardingDialogCodex: 'onboarding-dialog-codex',
  /** Footer buttons are `setupActionPrefix + <action>`; the field row's Paste / Copy is `signInActionPrefix + <action>`. */
  setupActionPrefix: 'setup-action-',
  signInActionPrefix: 'sign-in-action-',
  /** The paste-code field (its text is the pasted code) and the rejection / failure line. */
  signInField: 'sign-in-field',
  signInDetail: 'sign-in-detail',

  // --- the isolation guarantee's own surfaces (isolation) -------------------
  workspaceRefused: 'workspace-refused',
  workspaceRefusedDismiss: 'workspace-refused-dismiss',
  connectDialog: 'connect-dialog',
  /** The project intro itself; a new chat opens without one (ONL-2556). */
  chatWelcome: 'chat-welcome',
  /** The turn's row, which outlived the chat that ran it (ONL-2556). */
  chatWorkingRow: 'chat-working-row',

  // --- blank-project creation (ONL-2152) ------------------------------------
  // Progress is not a dialog: the pressed New Draft row carries `data-busy`
  // and the onboarding tile `data-status="creating"` while main creates.
  // `blankCreateModal` is the FAILURE dialog only; `blankCreateFailed` carries
  // the stage it failed at as `data-stage`, so a driver never reads the copy.
  blankCreateModal: 'blank-create-modal',
  blankCreateFailed: 'blank-create-failed',
  blankCreateRetry: 'blank-create-retry',
  blankCreateDismiss: 'blank-create-dismiss',

  // --- the frame's health contract (canonical proof: frame-health) ----------
  // `frameNode` carries `data-frame-health` beside it — the effective,
  // host-visible state — so a driver asserts health as a fact, never as copy.
  frameNode: 'frame-node',
  frameRecovery: 'frame-recovery',
  /** A page that failed on a server measured live, and its way back (ONL-2336). */
  frameLoadFailed: 'frame-load-failed',
  frameLoadFailedBack: 'frame-load-failed-back',
  /** The loading label a frame wears from its authoring until the guest's first load (ONL-2179). */
  frameLoading: 'frame-loading',
  /** The book-derived cover (non-started, dead, users-own, occupied, container): a covered frame mounts no guest. */
  frameServerCover: 'frame-server-cover',
  frameToolbar: 'frame-toolbar',

  // --- the frames-feedback batch (canonical proof: frames-feedback) --------
  // `frameResizeHandle` carries `data-position` naming which grip; only the
  // ARMED selection member renders any (ONL-2043). `frameUrl` carries
  // `data-state` (default | hover | editing | occluded) so the editing fill
  // is asserted against a fact, not a hover guess (ONL-2046). `sidebarFrame`
  // rows carry `aria-current` when their frame is in the selection set.
  frameResizeHandle: 'frame-resize-handle',
  frameScrollbar: 'frame-scrollbar',
  frameScrollbarThumb: 'frame-scrollbar-thumb',
  frameUrl: 'frame-url',
  /** The address field itself, mounted only while `frameUrl` reads `data-state="editing"`. */
  frameUrlInput: 'frame-url-input',
  sidebarFrame: 'sidebar-frame',
  /** The row's rename input, mounted only while that row is being renamed. */
  sidebarFrameRename: 'sidebar-frame-rename',

  // --- the frames live-feedback round (canonical proof: frames-feedback) ---
  // `frameRing` carries `data-emphasis` (active | rest) — the selection ring
  // is an owned element since the live-feedback round, so a spec asserts its
  // presence as a fact rather than reading an outline off a screenshot.
  // `canvasSnapGuide` and `frameResizeReadout` exist only mid-gesture.
  frameRing: 'frame-ring',
  canvasSnapGuide: 'canvas-snap-guide',
  frameResizeReadout: 'frame-resize-readout',
  // The frame tool (2026-08-20 round): `canvasToolbar` is the toolbar's root
  // and carries `data-tool` (the group component drops data-*); `canvasTool`
  // is the toggle group holding the tool buttons; the draw preview
  // exists only mid-drag.
  canvasToolbar: 'canvas-toolbar',
  canvasTool: 'canvas-tool',
  canvasFrameDrawPreview: 'canvas-frame-draw-preview',
  canvasPlaceImage: 'canvas-place-image',
  canvasSection: 'canvas-section',
  canvasSectionName: 'canvas-section-name',
  canvasSectionRename: 'canvas-section-rename',

  // --- the artifact node ---------------------------------------------------
  canvasArtifactNode: 'canvas-artifact-node',
  canvasArtifactLabel: 'canvas-artifact-label',
  canvasArtifactMissing: 'canvas-artifact-missing',
  canvasArtifactRemoveNode: 'canvas-artifact-remove-node',
  canvasArtifactShield: 'canvas-artifact-shield',
  /** The outline an artifact draws around each element picked inside it. */
  artifactElementOutline: 'artifact-element-outline',
  canvasArtifactResizeHandle: 'canvas-artifact-resize-handle',
  canvasArtifactDeleteConfirm: 'canvas-artifact-delete-confirm',
  artifactWebview: 'artifact-webview',
  artifactSnapshot: 'artifact-snapshot',
  artifactTextEditor: 'artifact-text-editor',
  artifactTextInput: 'artifact-text-input',
  artifactTextSave: 'artifact-text-save',
  artifactTextCancel: 'artifact-text-cancel',
  artifactTextError: 'artifact-text-error',
  artifactTextRefusal: 'artifact-text-refusal',
  /** The kind glyph beside a selected node's dimensions; only an artifact carries one (ONL-2568). */
  frameDimensionKind: 'frame-dimension-kind',
  // Every SELECTED frame wears its W × H at rest (thread feedback,
  // 2026-08-21); a frame's in-flight gesture readout takes over.
  frameDimensionBadge: 'frame-dimension-badge',
} as const;

export type TestId = (typeof TESTID)[keyof typeof TESTID];

/** Names a spec has to match because the element carries no test id of its own. */
export const NAME = {
  /** `canvas.menu.label`. The library draws the open menu outside the element its test id sits on (ONL-3182). */
  canvasMenu: 'Canvas menu',
} as const;
