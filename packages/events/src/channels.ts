import { ANY, CHROME, TAB, TASK_MANAGER, fields, ignored, none, of, one, optional, optionalOrNull, type ChannelTable } from './channel.js';
import type { StudioFlags } from './flags.js';
import type { NotificationSoundPreference } from './notification-sounds.js';
import type { OnlookActionResult, OnlookSignInMethod, OnlookState, TeamCommand, TeamResult } from './onlook.js';
import type { NotificationAction, TabNotice } from './notifications.js';
import type {
  AgentConnection,
  AgentSnapshot,
  AgentStateEvent,
  AgentWorkingFramesEvent,
  ClientCommand,
  StudioEvent,
} from './events.js';
import type {
  GitPillDefaults,
  GitPillDefaultsPatch,
  GitStatusChange,
  GitStatusList,
} from './git-status.js';

import type {
  CanvasCameraSave,
  CanvasCurrentPageSave,
  CanvasOpRequest,
  CanvasPageCameras,
  CanvasPageCamerasRequest,
  CanvasRejection,
  CanvasSnapshot,
  CanvasFrameQuotes,
  CanvasUndoRequest,
  CanvasUpdate,
} from './canvas.js';
import type {
  ArtifactCreated,
  ArtifactDeleteResult,
  ArtifactId,
  ArtifactSummary,
  ArtifactPreviewRequest,
  ArtifactPickRequest,
  ArtifactPickResult,
  ArtifactPreviewResult,
  ArtifactPageState,
} from './artifacts.js';
import type { FrameFactsPush } from './frame-facts.js';
import type { AppCommand, AppCommandRequest, HelpAction } from './app-commands.js';
import type { TabLinkTarget } from './frame-link.js';
import type {
  ChromeExtent,
  ChromeExtentApplied,
  TabPreview,
  ChromeSlotAction,
  ChromeSlotsPush,
  TabAssignment,
  TabsState,
} from './tabs.js';
import type { ArtifactSnapshot, ArtifactSnapshotRequest, FrameIdleRequest, FrameIdleResult, FramePictureRequest, FramePictureResult, PickFolderRequest, PickFolderResult } from './frames.js';

import type { AuthState, StudioIdentity } from './identity.js';
import type { ComposerDraft, ComposerDraftRequest, ComposerDraftSave } from './drafts.js';
import type { AttachmentBytes, RegisterAttachmentRequest, RegisterAttachmentResult, PickAttachmentsRequest, PickAttachmentsResult } from './attachments.js';
import type {
  ImageBytes,
  PickImagesRequest,
  PickImagesResult,
  RegisterImageRequest,
  RegisterCanvasImageResult,
} from './images.js';
import type {
  CodeListRequest,
  CodeListResult,
  CodeReadRequest,
  CodeReadResult,
  CodeSearchRequest,
  CodeSearchResult,
  CodeDirtyReport,
  CodeIdentifyRequest,
  CodeIdentifyResult,
  CodeComponentMapRequest,
  CodeComponentMapResult,
  CodeMapRequest,
  CodeMapResult,
  CodeWriteRequest,
  CodeWrittenReport,
  CodeWriteResult,
} from './code.js';
import type { LaunchLocation, StudioLocation } from './location.js';
import type { OnboardingCompletion, OnboardingState, SurveyAnswer } from './onboarding.js';
import type { MachineHelpId, MachineInstallResult, MachineSnapshot } from './machine.js';
import type { PanelsState } from './panels.js';
import type { SidebarLayout } from './sidebar-layout.js';
import type {
  SetDefaultRequest,
  SetHarnessRequest,
  SettingsDefaults,
  SettingsState,
} from './settings.js';
import type {
  DiscoveredWorktree,
  OpenProjectRequest,
  OpenProjectResult,
  ProjectImportOutcome,
  ProjectImportRequest,
  RemoveProjectRequest,
  RemoveProjectResult,
  RenameRequest,
  ReorderWorkspacesRequest,
  RevealProjectRequest,
  RevealProjectResult,
  SetArchivedRequest,
  WorkspaceSummary,
} from './projects.js';
import type {
  ReportOpen,
  ReportSubmitOutcome,
  ReportSubmitRequest,
} from './report.js';
import type { RunIntent, ServerBookState } from './server.js';
import type { ProjectSetupAskResult, ProjectSetupSnapshot } from './project-setup.js';
import type { DevThrowRequest, RendererExceptionReport, RendererTelemetryEvent, ReplaySessionReport, TelemetryConfig } from './telemetry.js';
import type { RendererLogLine } from './log.js';
import type { TaskManagerAction, TaskManagerSnapshot } from './task-manager.js';
import type { DebugAgentFrames, DebugAgentFramesRequest, DebugCaptureFrame, DebugCaptureFrameRequest, DebugState } from './debug.js';
import type { CaptureViewAnswer, CaptureViewRequest } from './capture-view.js';
import type { CodexSetupState } from './codex.js';
import type { ClaudeSetupState, ClaudeStatusRequest, SetupEntryPoint } from './claude-setup.js';
import type { UpdateState } from './update.js';
import type {
  BlankCreateResult,
  BlankCreateStage,
  ComfortChoice,
  CreateBlankRequest,
  CreationEntryPoint,
  DuplicateProjectRequest,
  ProjectCreateState,
  WorkspaceCreated,
  WorkspacePlan,
  WorkspacePlanRequest,
} from './workspace.js';

import type {
  AgentCommandAcceptance,
  AgentProbeRequest,
  AgentSessionInfo,
  AgentSnapshotRequest,
  AppInfo,
  CanvasZoomCommand,
  FrameDestinationReadiness,
  ProjectSelected,
  PtyEchoRequest,
  PtyEchoResult,
} from './ipc-payloads.js';

/**
 * Every channel between a Studio view and main, declared once. `invoke` asks and gets one answer, `send` goes
 * renderer → main with no reply, `emit` is a main → renderer stream. `ipc.ts` derives the contract from it.
 */
export const CHANNELS = {
  invoke: {
    projectSetupRead: { name: 'projectSetup:read', from: TAB, scope: 'project', request: none, response: of<ProjectSetupSnapshot>(), tab: 'projectSetupRead' },
    projectSetupAsk: { name: 'projectSetup:ask', from: TAB, scope: 'project', request: none, response: of<ProjectSetupAskResult>(), tab: 'projectSetupAsk' },
    onlookState: { name: 'onlook:state', from: TAB, request: none, response: of<OnlookState>(), tab: 'onlookState' },
    onlookSignOut: { name: 'onlook:sign-out', from: TAB, request: none, response: of<OnlookActionResult>(), tab: 'onlookSignOut' },
    onlookSignIn: { name: 'onlook:sign-in', from: TAB, request: one<OnlookSignInMethod>(), response: of<OnlookActionResult>(), tab: 'onlookSignIn' },
    onlookDeleteAccount: { name: 'onlook:delete-account', from: TAB, request: one<number>(), response: of<OnlookActionResult>(), tab: 'onlookDeleteAccount' },
    onlookAnswerSurvey: { name: 'onlook:answer-survey', from: TAB, request: one<SurveyAnswer>(), response: of<void>(), tab: 'onlookAnswerSurvey' },
    onlookTeamCommand: { name: 'onlook:team-command', from: TAB, request: one<TeamCommand>(), response: of<TeamResult>(), tab: 'onlookTeamCommand' },
    appInfo: { name: 'app:info', from: TAB, request: none, response: of<AppInfo>(), tab: 'appInfo' },
    githubStars: { name: 'app:github-stars', from: TAB, request: none, response: of<number | null>(), tab: 'githubStars' },
    appFlags: { name: 'app:flags', from: TAB, request: none, response: of<StudioFlags>(), tab: 'appFlags' },
    githubImport: { name: 'github:import', from: TAB, request: one<import('./github-import.js').GithubImportCommand>(), response: of<import('./github-import.js').GithubImportState>(), tab: 'githubImport' },
    ptyEcho: { name: 'pty:echo', from: TAB, request: one<PtyEchoRequest>(), response: of<PtyEchoResult>(), tab: 'ptyEcho' },
    pickFolder: { name: 'folder:pick', from: TAB, request: one<PickFolderRequest>(), response: of<PickFolderResult>(), tab: 'pickFolder' },
    frameIdle: { name: 'frame:idle', from: TAB, request: one<FrameIdleRequest>(), response: of<FrameIdleResult>(), tab: 'frameIdle' },
    framePicture: { name: 'frame:picture', from: TAB, request: one<FramePictureRequest>(), response: of<FramePictureResult>(), tab: 'framePicture' },
    artifactSnapshot: { name: 'artifact:snapshot', from: TAB, request: one<ArtifactSnapshotRequest>(), response: of<ArtifactSnapshot | null>(), tab: 'artifactSnapshot' },
    pickImages: { name: 'image:pick', from: TAB, scope: 'project', names: 'cwd', request: one<PickImagesRequest>(), response: of<PickImagesResult>(), tab: 'pickImages' },
    registerAttachment: { name: 'attachment:register', from: TAB, scope: 'project', names: 'cwd', request: one<RegisterAttachmentRequest>(), response: of<RegisterAttachmentResult>(), tab: 'registerAttachment' },
    pickAttachments: { name: 'attachment:pick', from: TAB, scope: 'project', names: 'cwd', request: one<PickAttachmentsRequest>(), response: of<PickAttachmentsResult>(), tab: 'pickAttachments' },
    attachmentBytes: { name: 'attachment:get', from: TAB, scope: 'project', request: one<{ id: string }>(), response: of<AttachmentBytes | null>(), tab: 'attachmentBytes' },
    registerImage: { name: 'image:register', from: TAB, scope: 'project', names: 'cwd', request: one<RegisterImageRequest>(), response: of<RegisterCanvasImageResult>(), tab: 'registerImage' },
    imageBytes: { name: 'image:get', from: TAB, scope: 'project', request: one<{ id: string }>(), response: of<ImageBytes | null>(), tab: 'imageBytes' },
    /** Main writes the starter page, so its copy goes through the string catalogue (ONL-2568). */
    artifactCreate: { name: 'artifact:create', from: TAB, request: one<{ title?: string }>(), response: of<ArtifactCreated>(), tab: 'artifactCreate' },
    /** `null` for an artifact this build cannot find, which the node renders as missing (ONL-2568). */
    artifactRead: { name: 'artifact:read', from: TAB, request: one<{ artifactId: ArtifactId }>(), response: of<ArtifactSummary | null>(), tab: 'artifactRead' },
    artifactDelete: { name: 'artifact:delete', from: TAB, request: one<{ artifactId: ArtifactId; updatedAt?: string }>(), response: of<ArtifactDeleteResult>(), tab: 'artifactDelete' },
    artifactList: { name: 'artifact:list', from: TAB, request: none, response: of<ArtifactSummary[]>(), tab: 'artifactList' },
    artifactRename: { name: 'artifact:rename', from: TAB, request: one<import('./artifacts.js').ArtifactRenameRequest>(), response: of<import('./artifacts.js').ArtifactRenameResult>(), tab: 'artifactRename' },
    artifactSearch: { name: 'artifact:search', from: TAB, request: one<import('./artifacts.js').ArtifactSearchRequest>(), response: of<import('./artifacts.js').ArtifactSearchResult>(), tab: 'artifactSearch' },
    artifactPreview: { name: 'artifact:preview', from: TAB, request: one<ArtifactPreviewRequest>(), response: of<ArtifactPreviewResult>(), tab: 'artifactPreview' },
    /** Answers only from what main already kept, in memory or on disk, and renders nothing: `missing` means nothing is held (ONL-2791). */
    artifactPreviewHeld: { name: 'artifact:preview-held', from: TAB, request: one<ArtifactPreviewRequest>(), response: of<ArtifactPreviewResult>(), tab: 'artifactPreviewHeld' },
    artifactPageState: { name: 'artifact:page-state', from: TAB, request: one<ArtifactPreviewRequest>(), response: of<ArtifactPageState>(), tab: 'artifactPageState' },
    artifactPick: { name: 'artifact:pick', from: TAB, scope: 'project', request: one<ArtifactPickRequest>(), response: of<ArtifactPickResult>(), tab: 'artifactPick' },
    artifactTextPrepare: { name: 'artifact:text-prepare', from: TAB, scope: 'project', request: one<import('./artifacts.js').ArtifactTextPrepareRequest>(), response: of<import('./artifacts.js').ArtifactTextPrepareResult>(), tab: 'artifactTextPrepare' },
    artifactTextSave: { name: 'artifact:text-save', from: TAB, scope: 'project', request: one<import('./artifacts.js').ArtifactTextSaveRequest>(), response: of<import('./artifacts.js').ArtifactTextSaveResult>(), tab: 'artifactTextSave' },
    artifactExport: { name: 'artifact:export', from: TAB, scope: 'project', request: one<import('./artifacts.js').ArtifactExportRequest>(), response: of<import('./artifacts.js').ArtifactExportResult>(), tab: 'artifactExport' },
    canvasExportImage: { name: 'canvas:export-image', from: TAB, scope: 'project', request: one<import('./artifacts.js').CanvasImageExportRequest>(), response: of<import('./artifacts.js').ArtifactExportResult>(), tab: 'canvasExportImage' },
    canvasFrameAttach: { name: 'canvas:frame-attach', from: TAB, scope: 'project', request: one<{ nodeId: string }>(), response: of<{ url: string } | null>(), tab: 'canvasFrameAttach' },
    canvasFrameReady: { name: 'canvas:frame-ready', from: TAB, scope: 'project', request: one<{ nodeId: string; webContentsId: number }>(), response: of<FrameDestinationReadiness>(), tab: 'canvasFrameReady' },
    /** Resolves on acceptance; effects arrive as events. Answers a view with no Project too: `session.start` is how a view enters one. */
    agentCommand: { name: 'agent:command', from: TAB, scope: 'project-or-none', request: one<ClientCommand>(), response: of<AgentCommandAcceptance>(), tab: 'agentCommand' },
    listGitStatus: { name: 'git-status:list', from: TAB, request: none, response: of<GitStatusList>(), tab: 'listGitStatus' },
    gitPillDefaults: { name: 'git-status:defaults', from: TAB, request: none, response: of<GitPillDefaults>(), tab: 'gitPillDefaults' },
    setGitPillDefault: { name: 'git-status:set-default', from: TAB, request: one<GitPillDefaultsPatch>(), response: of<GitPillDefaults>(), tab: 'setGitPillDefault' },
    /** This and `agent:probe` answer a view with no Project too: the connection verdict is the machine's. */
    agentSnapshot: { name: 'agent:snapshot', from: TAB, scope: 'project-or-none', request: optional<AgentSnapshotRequest>(), response: of<AgentSnapshot>(), tab: 'agentSnapshot' },
    agentProbe: { name: 'agent:probe', from: TAB, scope: 'project-or-none', request: optional<AgentProbeRequest>(), response: of<AgentConnection>(), tab: 'agentProbe' },
    /** An invoke with a void answer; an `ipcMain.on` handler leaves the caller hanging. The host picks the project up from its next snapshot, and a rejection would take the folder-open flow down. */
    projectSelected: { name: 'project:selected', from: TAB, request: one<ProjectSelected>(), response: of<void>(), tab: 'notifyProjectSelected', refusal: 'ignored' },
    workspacePlan: { name: 'workspace:plan', from: TAB, request: one<WorkspacePlanRequest>(), response: of<WorkspacePlan>(), tab: 'workspacePlan' },
    workspaceCreateBlank: { name: 'workspace:createBlank', from: TAB, request: one<CreateBlankRequest>(), response: of<BlankCreateResult>(), tab: 'workspaceCreateBlank' },
    onboardingState: { name: 'onboarding:state', from: TAB, request: none, response: of<OnboardingState>(), tab: 'onboardingState' },
    machineCheck: { name: 'machine:check', from: TAB, request: none, response: of<MachineSnapshot>(), tab: 'machineCheck' },
    machineChooseFolder: { name: 'machine:chooseFolder', from: TAB, request: none, response: of<'chosen' | 'canceled' | 'unavailable'>(), tab: 'machineChooseFolder' },
    /** Settles when the install is done or has stopped, not when it is requested. */
    machineInstallTools: { name: 'machine:installTools', from: TAB, request: none, response: of<MachineInstallResult>(), tab: 'machineInstallTools' },
    machineOpenHelp: { name: 'machine:openHelp', from: TAB, request: one<MachineHelpId>(), response: of<boolean>(), tab: 'machineOpenHelp' },
    /** Await it: a failed write otherwise reappears as the flow at next launch. */
    onboardingComplete: { name: 'onboarding:complete', from: TAB, request: optional<OnboardingCompletion>(), response: of<void>(), tab: 'onboardingComplete' },
    updateStatus: { name: 'update:status', from: ANY, request: none, response: of<UpdateState>(), tab: 'updateStatus', chrome: 'updateStatus' },
    codexStatus: { name: 'codex:status', from: TAB, request: none, response: of<CodexSetupState>(), tab: 'codexStatus' },
    /** Idempotent; a call while one runs joins it. Resolves on acceptance. */
    codexInstall: { name: 'codex:install', from: TAB, request: none, response: of<{ accepted: boolean }>(), tab: 'codexInstall' },
    codexSignIn: { name: 'codex:signIn', from: TAB, request: optionalOrNull<{ entryPoint?: SetupEntryPoint; browserId?: string }>(), response: of<{ accepted: boolean }>(), tab: 'codexSignIn' },
    codexSignInCancel: { name: 'codex:signInCancel', from: TAB, request: none, response: of<void>(), tab: 'codexSignInCancel' },
    claudeStatus: { name: 'claude:status', from: TAB, request: optional<ClaudeStatusRequest>(), response: of<ClaudeSetupState>(), tab: 'claudeStatus' },
    claudeSignIn: { name: 'claude:signIn', from: TAB, request: one<{ entryPoint: SetupEntryPoint; browserId?: string }>(), response: of<{ accepted: boolean }>(), tab: 'claudeSignIn' },
    claudeOpenPageAgain: { name: 'claude:openPageAgain', from: TAB, request: none, response: of<{ accepted: boolean }>(), tab: 'claudeOpenPageAgain' },
    claudeSubmitCode: { name: 'claude:submitCode', from: TAB, request: one<{ code: string }>(), response: of<{ accepted: boolean }>(), tab: 'claudeSubmitCode' },
    claudeSignInCancel: { name: 'claude:signInCancel', from: TAB, request: none, response: of<void>(), tab: 'claudeSignInCancel' },
    openTerminal: { name: 'app:openTerminal', from: TAB, request: none, response: of<void>(), tab: 'openTerminal' },
    /** In main: the renderer's clipboard API needs a focused document, which a driven window lacks. */
    readClipboardText: { name: 'app:readClipboardText', from: TAB, request: none, response: of<{ text: string }>(), tab: 'readClipboardText' },
    pasteClipboard: { name: 'app:pasteClipboard', from: TAB, request: none, response: of<void>(), tab: 'pasteClipboard' },
    /** Never rejects on a read problem; answers `identity: null`. */
    authState: { name: 'auth:state', from: TAB, request: none, response: of<AuthState>(), tab: 'authState' },
    listWorkspaces: { name: 'workspaces:list', from: TAB, request: none, response: of<WorkspaceSummary[]>(), tab: 'listWorkspaces' },
    /** Walks the workspace root and reads git; never awaited on the boot path (ONL-2522). */
    listDiscoveredWorktrees: { name: 'workspaces:listDiscovered', from: TAB, request: none, response: of<DiscoveredWorktree[]>(), tab: 'listDiscoveredWorktrees' },
    /** Registers the worktree and lists it; it opens nothing. Emits `workspaces:discoveredChanged` before it resolves, so the imported row is already gone. */
    importWorktree: { name: 'workspaces:import', from: TAB, request: one<ProjectImportRequest>(), response: of<ProjectImportOutcome>(), tab: 'importWorktree' },
    /** Starts no session: the caller announces on `project:selected`, the one admitted door. */
    openProject: { name: 'projects:open', from: TAB, request: one<OpenProjectRequest>(), response: of<OpenProjectResult>(), tab: 'openProject' },
    /** A label; nothing on disk or in git changes. */
    setArchived: { name: 'projects:setArchived', from: TAB, request: one<SetArchivedRequest>(), response: of<void>(), tab: 'setArchived' },
    /** Presentation only; nothing on disk or in git is renamed (ONL-1953). */
    rename: { name: 'projects:rename', from: TAB, request: one<RenameRequest>(), response: of<void>(), tab: 'rename' },
    /** Hands the project's own working folder to the file manager; nothing on disk, in git or in the registry changes (ONL-2315). */
    revealProject: { name: 'projects:reveal', from: TAB, request: one<RevealProjectRequest>(), response: of<RevealProjectResult>(), tab: 'revealProject' },
    /** Asks first, then deletes the folder, the canvas and the record; main shows the confirm, so no sentence crosses this channel (ONL-2315). */
    removeProject: { name: 'projects:remove', from: TAB, request: one<RemoveProjectRequest>(), response: of<RemoveProjectResult>(), tab: 'removeProject' },
    reorderWorkspaces: { name: 'projects:reorderWorkspaces', from: TAB, request: one<ReorderWorkspacesRequest>(), response: of<void>(), tab: 'reorderWorkspaces' },
    locationState: { name: 'location:state', from: TAB, request: none, response: of<LaunchLocation>(), tab: 'locationState' },
    /** Await it; a lost write misplaces the next launch. */
    locationSet: { name: 'location:set', from: TAB, request: one<StudioLocation>(), response: of<void>(), tab: 'locationSet' },
    locationRestore: { name: 'location:restore', from: TAB, request: one<StudioLocation>(), response: of<void>(), tab: 'locationRestore' },
    /** Answers whether a tab for this repo is now forward; false means there is nothing to open (ONL-2212). */
    revealTab: { name: 'tabs:reveal', from: TAB, request: one<TabLinkTarget>(), response: of<boolean>(), tab: 'revealTab' },
    /** Which of the application menu's commands this build actually offers; Reset Studio is the one that can be absent (`main/reset/`). */
    appCommands: { name: 'appCommands:available', from: ANY, request: none, response: of<readonly AppCommand[]>(), tab: 'appCommands', chrome: 'appCommands' },
    panelsState: { name: 'panels:state', from: TAB, request: none, response: of<PanelsState>(), tab: 'panelsState' },
    /** The widths that moved, never the whole record: a drag of one panel must not carry, and so overwrite, another's (ONL-2563). */
    panelsSave: { name: 'panels:save', from: TAB, request: one<Partial<PanelsState>>(), response: of<void>(), tab: 'panelsSave' },
    /** No path in either direction: main takes the project from the asking view (ONL-2488). */
    sidebarLayoutState: { name: 'sidebarLayout:state', from: TAB, scope: 'project', request: none, response: of<SidebarLayout>(), tab: 'sidebarLayoutState' },
    sidebarLayoutSave: { name: 'sidebarLayout:save', from: TAB, scope: 'project', request: one<SidebarLayout>(), response: of<void>(), tab: 'sidebarLayoutSave' },
    /** Worktree-relative paths only: main takes the project from the asking view, and each channel contains its own target inside it (ONL-2563). */
    codeRead: { name: 'code:read', from: TAB, scope: 'project', request: one<CodeReadRequest>(), response: of<CodeReadResult>(), tab: 'codeRead' },
    codeList: { name: 'code:list', from: TAB, scope: 'project', request: one<CodeListRequest>(), response: of<CodeListResult>(), tab: 'codeList' },
    codeSearch: { name: 'code:search', from: TAB, scope: 'project', request: one<CodeSearchRequest>(), response: of<CodeSearchResult>(), tab: 'codeSearch' },
    /** The expected snapshot travels in and the new one travels out, so the same tab can be saved twice (ONL-2563). */
    codeWrite: { name: 'code:write', from: TAB, scope: 'project', request: one<CodeWriteRequest>(), response: of<CodeWriteResult>(), tab: 'codeWrite' },
    /** Every outcome is a typed decline rather than a rejection: an unmappable Frame is an answer, not a bridge failure (ONL-2563). */
    codeIdentify: { name: 'code:identify', from: TAB, scope: 'project', names: 'docId', request: one<CodeIdentifyRequest>(), response: of<CodeIdentifyResult>(), tab: 'codeIdentify' },
    codeMap: { name: 'code:map', from: TAB, scope: 'project', names: 'docId', request: one<CodeMapRequest>(), response: of<CodeMapResult>(), tab: 'codeMap' },
    codeComponentMap: { name: 'code:componentMap', from: TAB, scope: 'project', names: 'docId', request: one<CodeComponentMapRequest>(), response: of<CodeComponentMapResult>(), tab: 'codeComponentMap' },
    /** An unknown project answers an empty draft (ONL-2207). */
    draftState: { name: 'drafts:state', from: TAB, scope: 'project', names: 'cwd', request: one<ComposerDraftRequest>(), response: of<ComposerDraft>(), tab: 'draftState' },
    settingsState: { name: 'settings:state', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsState' },
    settingsSetHarness: { name: 'settings:setHarness', from: TAB, request: one<SetHarnessRequest>(), response: of<SettingsState>(), tab: 'settingsSetHarness' },
    settingsSetNotificationSound: { name: 'settings:setNotificationSound', from: TAB, request: one<NotificationSoundPreference>(), response: of<SettingsState>(), tab: 'settingsSetNotificationSound' },
    notificationAction: { name: 'notifications:action', from: TAB, request: one<NotificationAction>(), response: of<SettingsState>(), tab: 'notificationAction' },
    settingsSetCodePanel: { name: 'settings:setCodePanel', from: TAB, request: one<boolean>(), response: of<SettingsState>(), tab: 'settingsSetCodePanel' },
    settingsSetAnalytics: { name: 'settings:setAnalytics', from: TAB, request: one<boolean>(), response: of<SettingsState>(), tab: 'settingsSetAnalytics' },
    /** One direction: a resolved card never comes back, so there is no request shape and no un-resolve (ONL-2443). */
    settingsResolveDiscoverCta: { name: 'settings:resolveDiscoverCta', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsResolveDiscoverCta' },
    settingsDismissTipsPill: { name: 'settings:dismissTipsPill', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsDismissTipsPill' },
    settingsDismissConnectorsNotice: { name: 'settings:dismissConnectorsNotice', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsDismissConnectorsNotice' },
    settingsMarkTourSeen: { name: 'settings:markTourSeen', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsMarkTourSeen' },
    settingsResetTips: { name: 'settings:resetTips', from: TAB, request: none, response: of<SettingsState>(), tab: 'settingsResetTips' },
    settingsDefaults: { name: 'settings:defaults', from: TAB, request: none, response: of<SettingsDefaults>(), tab: 'settingsDefaults' },
    settingsSetDefault: { name: 'settings:setDefault', from: TAB, request: one<SetDefaultRequest>(), response: of<SettingsDefaults>(), tab: 'settingsSetDefault' },
    /** The same key and off-switch as main's pipeline; the renderer reads no env var and mints no id. */
    telemetryConfig: { name: 'telemetry:config', from: TAB, request: none, response: of<TelemetryConfig>(), tab: 'telemetryConfig' },
    telemetryConsent: { name: 'telemetry:consent', from: TAB, request: none, response: of<boolean | null>(), tab: 'telemetryConsent' },
    /** Reachable without the form, so main re-checks the lane, the trim, the length and the volume (ONL-2350). */
    reportSubmit: { name: 'report:submit', from: TAB, request: one<ReportSubmitRequest>(), response: of<ReportSubmitOutcome>(), tab: 'reportSubmit' },
    reportCapability: { name: 'report:capability', from: TAB, request: none, response: of<boolean>(), tab: 'reportCapability' },
    canvasSnapshot: { name: 'canvas:snapshot', from: TAB, scope: 'project', request: none, response: of<CanvasSnapshot>(), tab: 'canvasSnapshot' },
    /** Every page's durable camera, so a page first visited this session opens where it was left in the last one (ONL-2488). */
    canvasPageCameras: { name: 'canvas:pageCameras', from: TAB, scope: 'project', names: 'docId', request: one<CanvasPageCamerasRequest>(), response: of<CanvasPageCameras>(), tab: 'canvasPageCameras' },
    /** Answered synchronously from state main holds; not a read at mount (ONL-1948). */
    tabsState: { name: 'tabs:state', from: ANY, request: none, response: of<TabsState>(), tab: 'tabsState', chrome: 'tabsState' },
    /** Pulled at mount: a push sent before the chrome page subscribed is lost (a dev reload while blurred). */
    chromeWindowFocusState: { name: 'chrome:windowFocusState', from: CHROME, request: none, response: of<{ isFocused: boolean }>(), chrome: 'windowFocus' },
    /** True once per request: a Projects view mounting after the push still sees it. */
    tabsTakeDraftRequest: { name: 'tabs:takeDraftRequest', from: TAB, request: none, response: of<boolean>(), tab: 'takeDraftRequest' },
    /** Held until taken: a Projects view still mounting misses the push, and pulls it instead (ONL-2563). */
    tabsTakeSettingsRequest: { name: 'tabs:takeSettingsRequest', from: TAB, request: none, response: of<boolean>(), tab: 'takeSettingsRequest' },
    /** Awaited before a popover shows: in the band-height viewport, CSS anchor positioning lands the layer on its own trigger. */
    chromeExpand: { name: 'chrome:expand', from: CHROME, request: one<ChromeExtent>(), response: of<ChromeExtentApplied>(), chrome: 'expandChrome' },
    tabsPreview: { name: 'tabs:preview', from: ANY, request: fields<{ tabId: string }>()('tabId'), response: of<TabPreview>(), chrome: 'tabPreview' },
    /** Read, not consumed: a reload lands on the creation's current phase (ONL-2244). */
    tabsCreateState: { name: 'tabs:createState', from: TAB, request: none, response: of<ProjectCreateState | null>(), tab: 'tabCreateState' },
    /** Pulled at mount by a parked view: a push can land before its listener exists (ONL-2318). */
    tabsAssignment: { name: 'tabs:assignment', from: TAB, request: none, response: of<TabAssignment | null>(), tab: 'tabAssignment' },
    /** Pulled at mount, as `tabs:assignment` is: a push can land before its listener exists. */
    tabOnScreenState: { name: 'tab:onScreenState', from: TAB, request: none, response: of<{ isOnScreen: boolean }>(), tab: 'tabOnScreen' },
    /** Registered only while the diagnostics gate is open (`main/diagnostics/gate.ts`); a shipped build has no handler (ONL-2371, ONL-2377). */
    debugState: { name: 'debug:state', from: ANY, request: none, response: of<DebugState>(), chrome: 'debugState', gate: 'diagnostics' },
    /** Same gate as `debug:state`: the agent's view of the canvas, read without an inspector (ONL-2297). */
    debugAgentFrames: { name: 'debug:agentFrames', from: ANY, request: one<DebugAgentFramesRequest>(), response: of<DebugAgentFrames>(), chrome: 'debugAgentFrames', gate: 'diagnostics' },
    /** Same gate: `capture_frame`'s own capture, with what the reveal did (ONL-3031). */
    debugCaptureFrame: { name: 'debug:captureFrame', from: ANY, request: one<DebugCaptureFrameRequest>(), response: of<DebugCaptureFrame>(), chrome: 'debugCaptureFrame', gate: 'diagnostics' },
    debugArtifactTool: { name: 'debug:artifactTool', from: ANY, request: one<import('./debug.js').DebugArtifactToolRequest>(), response: of<import('./artifacts.js').ArtifactToolResult>(), chrome: 'debugArtifactTool', gate: 'diagnostics' },
    taskManagerSnapshot: { name: 'taskManager:snapshot', from: TASK_MANAGER, request: none, response: of<TaskManagerSnapshot | null>(), taskManager: 'snapshot' },
  },
  send: {
    /** Main shows the window on a timer if this never arrives (ONL-1948). */
    uiReady: { name: 'ui:ready', from: ANY, request: none, tab: 'uiReady', chrome: 'uiReady' },
    /** A revealed tab has drawn a fresh frame, so the one it replaced can go (ONL-2744). */
    tabPresented: { name: 'tab:presented', from: TAB, request: none, tab: 'tabPresented' },
    tabFramesApplied: { name: 'tab:framesApplied', from: TAB, request: one<number>(), tab: 'tabFramesApplied' },
    /** Pushed on every clean-to-dirty transition: the idle sweep, a close and a quit all decide in main, and none can wait on a renderer that may already be gone (ONL-2563). */
    codeDirty: { name: 'code:dirty', from: TAB, request: one<CodeDirtyReport>(), tab: 'codeDirty' },
    updateRestart: { name: 'update:restart', from: ANY, request: none, tab: 'updateRestart', chrome: 'updateRestart' },
    updateCheck: { name: 'update:check', from: TAB, request: none, tab: 'updateCheck' },
    /** One of the application menu's own commands, asked for from the rail's logo menu (ONL-2563). */
    runAppCommand: { name: 'appCommands:run', from: ANY, request: one<AppCommandRequest>(), tab: 'runAppCommand', chrome: 'runAppCommand' },
    /** The app menu's Help row, forwarded by main to the active tab. */
    runHelpAction: { name: 'help:run', from: CHROME, request: one<HelpAction>(), chrome: 'runHelpAction' },
    telemetryEvent: { name: 'telemetry:event', from: TAB, request: one<RendererTelemetryEvent>(), tab: 'telemetryEvent' },
    telemetrySession: { name: 'telemetry:session', from: TAB, request: one<ReplaySessionReport>(), tab: 'telemetrySession' },
    /** `renderer/src/log.ts` is the caller; it scrubs first. */
    logLine: { name: 'log:line', from: [...ANY, ...TASK_MANAGER], request: one<RendererLogLine>(), tab: 'log', chrome: 'log', taskManager: 'log' },
    /** `renderer/src/errors.ts` is the caller; it scrubs first. */
    telemetryException: { name: 'telemetry:exception', from: [...ANY, ...TASK_MANAGER], request: one<RendererExceptionReport>(), tab: 'telemetryException', chrome: 'telemetryException', taskManager: 'telemetryException' },
    taskManagerRefresh: { name: 'taskManager:refresh', from: TASK_MANAGER, request: none, taskManager: 'refresh' },
    taskManagerShowTab: { name: 'taskManager:showTab', from: TASK_MANAGER, request: fields<{ tabId: string }>()('tabId'), taskManager: 'showTab' },
    taskManagerNoted: { name: 'taskManager:noted', from: TASK_MANAGER, request: one<TaskManagerAction>(), taskManager: 'noted' },
    devThrow: { name: 'dev:throw', from: TAB, request: one<DevThrowRequest>(), tab: 'devThrow' },
    /** Intent only, never a port or a path; ids name book entries (ONL-1931). */
    serverIntent: { name: 'server:intent', from: TAB, scope: 'project', request: one<RunIntent>(), tab: 'serverIntent' },
    /** A send so ordering against other ops holds; main stamps the author. */
    canvasOp: { name: 'canvas:op', from: TAB, scope: 'project', names: 'docId', request: one<CanvasOpRequest>(), tab: 'canvasOp' },
    /** An empty stack is a silent no-op (ONL-2042). */
    canvasUndo: { name: 'canvas:undo', from: TAB, scope: 'project', names: 'docId', request: one<CanvasUndoRequest>(), tab: 'canvasUndo' },
    canvasRedo: { name: 'canvas:redo', from: TAB, scope: 'project', names: 'docId', request: one<CanvasUndoRequest>(), tab: 'canvasRedo' },
    canvasViewport: { name: 'canvas:viewport', from: TAB, scope: 'project', names: 'docId', request: one<CanvasCameraSave>(), tab: 'canvasViewport' },
    canvasCurrentPage: { name: 'canvas:currentPage', from: TAB, scope: 'project', names: 'docId', request: one<CanvasCurrentPageSave>(), tab: 'canvasCurrentPage' },
    /** Read by the agent's tools alone; nothing durable derives from it (ONL-1995). */
    canvasFrames: { name: 'canvas:frames', from: TAB, scope: 'project', names: 'docId', request: one<FrameFactsPush>(), tab: 'canvasFrames' },
    canvasCaptureViewed: { name: 'canvas:captureViewed', from: TAB, request: one<CaptureViewAnswer>(), tab: 'canvasCaptureViewed' },
    /** An empty draft forgets the project's entry; main debounces the write (ONL-2207). */
    draftSave: { name: 'drafts:save', from: TAB, scope: 'project', names: 'cwd', request: one<ComposerDraftSave>(), tab: 'draftSave' },
    blankCreateCancel: { name: 'blankCreate:cancel', from: TAB, request: none, tab: 'blankCreateCancel' },
    tabsSelect: { name: 'tabs:select', from: ANY, request: fields<{ tabId: string }>()('tabId'), chrome: 'selectTab' },
    tabsClose: { name: 'tabs:close', from: ANY, request: fields<{ tabId: string }>()('tabId'), chrome: 'closeTab' },
    tabsNew: { name: 'tabs:new', from: ANY, request: none, chrome: 'newTab' },
    tabsReopen: { name: 'tabs:reopen', from: ANY, request: none, chrome: 'reopenTab' },
    tabsNewDraft: { name: 'tabs:newDraft', from: ANY, request: none, chrome: 'newDraft' },
    tabsRename: { name: 'tabs:rename', from: ANY, request: fields<{ tabId: string; name: string }>()('tabId', 'name'), chrome: 'renameTab' },
    /** `toIndex` counts project tabs only; main maps it onto its own order (ONL-2364). */
    tabsReorder: { name: 'tabs:reorder', from: ANY, request: fields<{ tabId: string; toIndex: number }>()('tabId', 'toIndex'), chrome: 'reorderTab' },
    tabsReload: { name: 'tabs:reload', from: ANY, request: fields<{ tabId: string }>()('tabId'), chrome: 'reloadTab' },
    /** The projects view's workspace in context (ONL-2237). Absent = recent projects, nothing to create under. */
    tabsContext: { name: 'tabs:context', from: TAB, request: one<{ repoIdentity?: string }>(), tab: 'tabsContext' },
    tabsCreateProject: { name: 'tabs:createProject', from: TAB, request: one<{ sourcePath: string; comfort?: ComfortChoice; entryPoint: CreationEntryPoint }>(), tab: 'tabsCreateProject' },
    tabsDuplicateProject: { name: 'tabs:duplicateProject', from: TAB, request: one<DuplicateProjectRequest>(), tab: 'tabsDuplicateProject' },
    tabsCreateRetry: { name: 'tabs:createRetry', from: TAB, request: none, tab: 'tabsCreateRetry' },
    tabsCreateDismiss: { name: 'tabs:createDismiss', from: TAB, request: none, tab: 'tabsCreateDismiss' },
    /** Dropped by main unless the sender is the named tab and it is forward (ONL-2206). */
    chromeSlots: { name: 'chrome:slots', from: TAB, request: one<ChromeSlotsPush>(), tab: 'chromeSlots' },
    chromeAction: { name: 'chrome:action', from: CHROME, request: one<ChromeSlotAction>(), chrome: 'action' },
  },
  emit: {
    projectSetupChanged: { name: 'projectSetup:changed', payload: of<ProjectSetupSnapshot>(), tab: 'onProjectSetupChanged' },
    onlookState: { name: 'onlook:state', payload: of<OnlookState>(), tab: 'onOnlookState' },
    artifactChanged: { name: 'artifact:changed', payload: of<{ artifactId: ArtifactId }>(), tab: 'onArtifactChanged' },
    agentEvent: { name: 'agent:event', payload: of<StudioEvent>(), tab: 'onAgentEvent' },
    /** Host-owned; deriving it from events flickers around an interrupt. */
    agentState: { name: 'agent:state', payload: of<AgentStateEvent>(), tab: 'onAgentState' },
    agentWorkingFrames: { name: 'agent:workingFrames', payload: of<AgentWorkingFramesEvent>(), tab: 'onAgentWorkingFrames' },
    agentConnection: { name: 'agent:connection', payload: of<AgentConnection>(), tab: 'onAgentConnection' },
    /** Emitted before the new session's first event. */
    agentSession: { name: 'agent:session', payload: of<AgentSessionInfo>(), tab: 'onAgentSession' },
    workspaceCreated: { name: 'workspace:created', payload: of<WorkspaceCreated>(), tab: 'onWorkspaceCreated' },
    blankCreateStage: { name: 'blankCreate:stage', payload: of<BlankCreateStage>(), tab: 'onBlankCreateStage' },
    tabsCreateChanged: { name: 'tabs:createChanged', payload: of<ProjectCreateState | null>(), tab: 'onTabCreateState' },
    /** Measured by main: a renderer fetch to localhost is cross-origin from `file://` and reports "down" for an up server (ONL-1832). */
    serverState: { name: 'server:state', payload: of<ServerBookState>(), tab: 'onServerState' },
    /** From main: a focused guest delivers no key events to the host document (ONL-1989). */
    canvasZoom: { name: 'canvas:zoom', payload: of<CanvasZoomCommand>(), tab: 'onCanvasZoom' },
    /** Main moves the camera for a capture and puts it back; the renderer answers each step on `canvas:captureViewed` (ONL-3031). */
    canvasCaptureView: { name: 'canvas:captureView', payload: of<CaptureViewRequest>(), tab: 'onCanvasCaptureView' },
    /** ⌘S, from the same seat and for the same reason. Carries nothing: the panel knows which tab is active (ONL-2563). */
    codeSave: { name: 'code:save', payload: of<void>(), tab: 'onCodeSave' },
    chatFocus: { name: 'chat:focus', payload: of<void>(), tab: 'onChatFocus' },
    tabNotice: { name: 'notifications:toast', payload: of<TabNotice>(), tab: 'onTabNotice' },
    /** Per write, as the agent makes it; the panel decides what a change means for each tab (ONL-2563). */
    codeWritten: { name: 'code:written', payload: of<CodeWrittenReport>(), tab: 'onCodeWritten' },
    updateState: { name: 'update:state', payload: of<UpdateState>(), tab: 'onUpdateState', chrome: 'onUpdateState' },
    codexState: { name: 'codex:state', payload: of<CodexSetupState>(), tab: 'onCodexState' },
    claudeState: { name: 'claude:state', payload: of<ClaudeSetupState>(), tab: 'onClaudeState' },
    authChanged: { name: 'auth:changed', payload: of<StudioIdentity>(), tab: 'onAuthChanged' },
    telemetryIdentityChanged: { name: 'telemetry:identity-changed', payload: of<TelemetryConfig>(), tab: 'onTelemetryIdentityChanged' },
    workspacesChanged: { name: 'workspaces:changed', payload: of<WorkspaceSummary[]>(), tab: 'onWorkspacesChanged' },
    discoveredWorktreesChanged: { name: 'workspaces:discoveredChanged', payload: of<DiscoveredWorktree[]>(), tab: 'onDiscoveredWorktreesChanged' },
    settingsChanged: { name: 'settings:changed', payload: of<SettingsState>(), tab: 'onSettingsChanged' },
    gitStatusChanged: { name: 'git-status:changed', payload: of<GitStatusChange>(), tab: 'onGitStatusChanged' },
    canvasUpdate: { name: 'canvas:update', payload: of<CanvasUpdate>(), tab: 'onCanvasUpdate' },
    canvasRejected: { name: 'canvas:rejected', payload: of<CanvasRejection>(), tab: 'onCanvasRejected' },
    canvasFrameQuotes: { name: 'canvas:frameQuotes', payload: of<CanvasFrameQuotes>(), tab: 'onCanvasFrameQuotes' },
    /** Main cannot tell text undo from canvas undo; the renderer branches on editable focus (ONL-2042). */
    editUndo: { name: 'edit:undo', payload: of<void>(), tab: 'onEditUndo' },
    editRedo: { name: 'edit:redo', payload: of<void>(), tab: 'onEditRedo' },
    tabsChanged: { name: 'tabs:changed', payload: of<TabsState>(), tab: 'onTabsState', chrome: 'onTabsChanged' },
    tabFrames: { name: 'tab:frames', payload: of<{ discarded: boolean; request: number }>(), tab: 'onTabFrames' },
    tabOnScreen: { name: 'tab:onScreen', payload: of<{ isOnScreen: boolean }>(), tab: 'onTabOnScreen' },
    tabsAssigned: { name: 'tabs:assigned', payload: of<TabAssignment>(), tab: 'onTabAssigned' },
    tabsDraftRequested: { name: 'tabs:draftRequested', payload: of<void>(), tab: 'onDraftRequested' },
    chromeSlotsChanged: { name: 'chrome:slotsChanged', payload: of<ChromeSlotsPush>(), chrome: 'onSlots' },
    chromeActionForwarded: { name: 'chrome:actionForwarded', payload: of<ChromeSlotAction>(), tab: 'onChromeAction' },
    chromeWindowFocus: { name: 'chrome:windowFocus', payload: of<{ isFocused: boolean }>(), chrome: 'onWindowFocus' },
    /** Read by main off the input stream: the chrome view never has the keyboard (ONL-2364). */
    chromeChordHint: { name: 'chrome:chordHint', payload: of<{ isHeld: boolean }>(), chrome: 'onChordHint' },
    /** The menu's door to the form; the canvas button opens it in the renderer (ONL-2350). */
    reportOpen: { name: 'report:open', payload: of<ReportOpen>(), tab: 'onReportOpen' },
    /** A Help row picked in the app menu, which the active tab runs: it hosts what each row opens (ONL-3127). */
    helpAction: { name: 'help:action', payload: of<HelpAction>(), tab: 'onHelpAction' },
    /** Reveals settings inside the Projects Screen, which is the only host it has (ONL-2563). */
    settingsOpen: { name: 'settings:open', payload: ignored, tab: 'onSettingsOpen' },
    /** Another Tab moved a panel; widths are one setting across Projects (ONL-2593). */
    panelsChanged: { name: 'panels:changed', payload: of<PanelsState>(), tab: 'onPanelsChanged' },
    taskManagerSnapshot: { name: 'taskManager:snapshot', payload: of<TaskManagerSnapshot>(), taskManager: 'onSnapshot' },
  },
} as const satisfies ChannelTable;
