import {
  APP_COMMAND_ORDER,
  CHANNELS,
  type BridgeOf,
  type EmitRow,
  type SendRow,
  MACHINE_CHECK_IDS,
  type CanvasDoc,
  type CanvasNode,
  classifyImageBytes,
  classifyAttachmentBytes,
  type AttachmentBytes,
  TEXT_ATTACHMENT_MAX_BYTES,
  classifyCanvasImageBytes,
  type CodeSnapshot,
  EMPTY_COMPOSER_DRAFT,
  GIT_PILL_SHIPPED_DEFAULTS,
  IDLE_CLAUDE_SETUP_STATE,
  IDLE_CODEX_SETUP_STATE,
  IDLE_UPDATE_STATE,
  PANEL_DEFAULTS,
  type ImageBytes,
  type PenView,
  type SettingsDefaults,
  type StudioBridge,
} from '@studio/events';
import { LAB_EVENTS, LAB_LAST_SEQ } from './transcript.js';
import { useWorkspaceStore } from '@renderer/workspace/store.js';

/** `?pen=1` seeds a queued prompt behind a live turn; `?pen=hold` seeds one on its way back, with no turn live (ONL-2519). */
const LAB_PEN_FLAG = new URLSearchParams(window.location.search).get('pen');
const LAB_PEN_HELD = LAB_PEN_FLAG === 'hold';
const LAB_PEN_VIEW: PenView = {
  penId: 1,
  text: 'Also make the CTA button full-width on mobile.',
  ...(LAB_PEN_HELD ? { verdict: 'hold' as const } : {}),
};
const agentStateListeners = new Set<Parameters<StudioBridge['onAgentState']>[0]>();

const LAB_SETTINGS_DEFAULTS: SettingsDefaults = {
  claude: { models: [] },
  codex: { models: [] },
  opencode: { models: [] },
  freebuff: { models: [] },
};

const noop = (): void => {};
const subscribe = (): (() => void) => noop;

type Channels = typeof CHANNELS;
/** The tab methods that ask main nothing back: every send and every stream. */
type Inert = keyof BridgeOf<{ invoke: Record<never, never>; send: Channels['send']; emit: Channels['emit'] }, 'tab'>;

/** A send goes nowhere and a stream never fires, unless the bridge below gives the method a body. */
function inertMethods(): Pick<StudioBridge, Inert> {
  const methods: Record<string, unknown> = {};
  const sends: Record<string, SendRow> = CHANNELS.send;
  const emits: Record<string, EmitRow> = CHANNELS.emit;
  for (const row of Object.values(sends)) if (row.tab !== undefined) methods[row.tab] = noop;
  for (const row of Object.values(emits)) if (row.tab !== undefined) methods[row.tab] = subscribe;
  return methods as Pick<StudioBridge, Inert>;
}

const LAB_CWD = '/workspaces/skylark';

const LAB_CODE_FILES: readonly string[] = [
  'package.json',
  'src/App.tsx',
  'src/components/Hero.tsx',
  'src/styles/tokens.css',
];

const LAB_CODE_TEXT = `export function Hero() {\n  return <h1 className="hero">Skylark</h1>;\n}\n`;

const LAB_CODE_SNAPSHOT: CodeSnapshot = {
  hash: 'lab',
  size: LAB_CODE_TEXT.length,
  mtimeMs: 0,
  eol: '\n',
  mode: 0o644,
  bom: false,
};

const LAB_DESIGNS: { name: string; homeUrl: string }[] = [
  { name: 'Home', homeUrl: 'http://localhost:4321/' },
  { name: 'Pricing', homeUrl: 'http://localhost:4321/pricing' },
  { name: 'Pricing — dense', homeUrl: 'http://localhost:4321/pricing/dense.html' },
  { name: 'Checkout', homeUrl: 'http://localhost:4321/checkout?step=2' },
  { name: 'Settings / Billing', homeUrl: 'http://localhost:4321/settings/billing' },
  { name: 'Onboarding — step 2', homeUrl: 'http://localhost:4321/onboarding/step-2.html?v=2' },
  { name: 'Empty states', homeUrl: 'http://localhost:4321/kitchen-sink.html#empty' },
  { name: 'Sketch (from disk)', homeUrl: 'file:///Users/designer/sketches/sketch.html' },
  {
    name: 'A very long design name that runs past the panel edge',
    homeUrl: 'http://localhost:4321/very/long/route',
  },
];

const LAB_FRAME_COLUMNS = 4;
const LAB_FRAME_PITCH_X = 1680;
const LAB_FRAME_PITCH_Y = 1140;

/** `?canvas=empty` opens the editor on a canvas with no frames. */
const LAB_CANVAS_EMPTY = new URLSearchParams(window.location.search).get('canvas') === 'empty';

const labNodes: Record<string, CanvasNode> = Object.fromEntries(
  (LAB_CANVAS_EMPTY ? [] : LAB_DESIGNS).map(({ name, homeUrl }, index): [string, CanvasNode] => {
    const id = `lab-frame-${String(index + 1)}`;
    return [
      id,
      {
        id,
        pageId: 'pg_main',
        kind: 'browser',
        name,
        x: (index % LAB_FRAME_COLUMNS) * LAB_FRAME_PITCH_X,
        y: Math.floor(index / LAB_FRAME_COLUMNS) * LAB_FRAME_PITCH_Y,
        width: 1512,
        height: 982,
        order: index,
        content: { homeUrl },
      },
    ];
  }),
);

const LAB_CANVAS_DOC: CanvasDoc = {
  schemaVersion: 1,
  docId: 'lab-doc',
  revision: 1,
  pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
  nodes: labNodes,
};

/** Two working rows, not adjacent, so the per-row stagger shows. Only under `?working`: an always-on shimmer costs the lab CPU on every frame. */
const LAB_WORKING_FRAME_IDS = new URLSearchParams(window.location.search).has('working') ? ['lab-frame-2', 'lab-frame-6'] : [];

const storedImages = new Map<string, ImageBytes>();
const storedAttachments = new Map<string, AttachmentBytes>();
let storedImageSeq = 0;

const answers: Omit<StudioBridge, Inert> & Partial<Pick<StudioBridge, Inert>> = {
  githubStars: async () => null,
  githubImport: async () => ({ enabled: false, connection: { status: 'disconnected' }, repositories: [], branches: [], phase: 'idle', progress: 0 }),
  appInfo: async () => ({
    version: '0.0.0-lab',
    commit: 'lab',
    electronVersion: '—',
    chromeVersion: '—',
    nodeVersion: '—',
    platform: 'darwin',
    isPackaged: false,
  }),
  appFlags: async () => ({ sections: false, connectors: false, 'invite-tip': true, 'prompt-tip': true, 'frame-covers': true, 'blank-first-moment': true, 'rail-foot': true, 'start-control': true, 'machine-check': true }),
  ptyEcho: async () => ({ output: '', error: 'no pty in the lab harness' }),

  agentCommand: async (command) => {
    if (LAB_PEN_FLAG === null || (command.type !== 'pen.take' && command.type !== 'pen.discard')) return { accepted: false };
    const pen = LAB_PEN_VIEW;
    // No pen on the patch: the take empties it, as main's own re-emit does.
    for (const listener of agentStateListeners) listener({ isStreaming: !LAB_PEN_HELD, midTurn: 'steer' });
    return command.type === 'pen.take' ? { accepted: true, taken: { text: pen.text } } : { accepted: true };
  },
  agentSnapshot: async () => ({
    sessionId: 'lab-harness',
    cwd: LAB_CWD,
    events: LAB_EVENTS,
    ...(LAB_PEN_FLAG !== null
      ? { isStreaming: !LAB_PEN_HELD, pen: LAB_PEN_VIEW }
      : { isStreaming: false }),
    midTurn: 'steer' as const,
    lastSeq: LAB_LAST_SEQ,
    connection: { status: 'ok' as const },
  }),
  agentProbe: async () => ({ status: 'ok' as const }),
  onAgentState: (listener) => {
    agentStateListeners.add(listener);
    return () => agentStateListeners.delete(listener);
  },
  /* Deferred: connectCanvas subscribes before the snapshot lands, and an early patch is dropped. */
  onAgentWorkingFrames: (listener) => {
    const timer = setTimeout(() => {
      listener({ cwd: LAB_CWD, frameIds: LAB_WORKING_FRAME_IDS });
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  },

  pickFolder: async () => ({ canceled: true }),
  frameIdle: async () => ({ paused: false }),
  framePicture: async () => null,
  artifactSnapshot: async () => null,
  pickImages: async () => ({ canceled: true as const }),
  pickAttachments: async () => ({ canceled: true as const }),
  registerAttachment: async ({ bytes, name, agent, existingIds }) => {
    const verdict = classifyAttachmentBytes(bytes, agent);
    if (!verdict.ok) return verdict;
    const textSize = [...new Set(existingIds ?? [])].reduce((sum, id) => {
      const stored = storedAttachments.get(id);
      return sum + (stored?.mediaType === 'text/plain' ? stored.bytes.byteLength : 0);
    }, 0);
    if (verdict.mediaType === 'text/plain' && textSize + bytes.byteLength > TEXT_ATTACHMENT_MAX_BYTES) return { ok: false as const, reason: 'text-too-large' as const };
    const id = `lab-file-${++storedImageSeq}`;
    storedAttachments.set(id, { bytes, mediaType: verdict.mediaType });
    const metadata = { id, name, mediaType: verdict.mediaType, originalSize: bytes.byteLength };
    return { ok: true as const, ref: verdict.mediaType === 'text/plain' || verdict.mediaType === 'application/pdf' ? { ...metadata, mediaType: verdict.mediaType, kind: 'file' as const } : { ...metadata, mediaType: verdict.mediaType } };
  },
  attachmentBytes: async ({ id }) => storedAttachments.get(id) ?? (storedImages.get(id)?.mediaType === 'image/svg+xml' ? null : storedImages.get(id) as AttachmentBytes | undefined ?? null),
  registerImage: async ({ bytes, target }) => {
    // The function `main/images/store.ts` calls, so the fake cannot accept what the app rejects (ONL-1981).
    const verdict = target === 'canvas' ? classifyCanvasImageBytes(bytes) : classifyImageBytes(bytes);
    if (!verdict.ok) return verdict;
    storedImageSeq += 1;
    const id = `lab-image-${storedImageSeq}`;
    storedImages.set(id, { bytes, mediaType: verdict.mediaType });
    // No width/height: main does not measure either.
    return { ok: true as const, image: { id, mediaType: verdict.mediaType } };
  },
  imageBytes: async ({ id }) => storedImages.get(id) ?? null,
  artifactCreate: async () => ({ code: 'unknown', reason: 'no artifact store in the lab harness' }),
  artifactList: async () => [],
  artifactRename: async () => ({ outcome: 'unavailable' }),
  artifactSearch: async () => ({ outcome: 'unavailable' }),
  artifactPreview: async () => ({ outcome: 'unavailable' }),
  artifactPreviewHeld: async () => ({ outcome: 'missing' }),
  artifactPageState: async () => ({ outcome: 'unavailable' }),
  artifactPick: async () => ({ outcome: 'unavailable' }),
  artifactTextPrepare: async () => ({ outcome: 'unavailable' }),
  artifactTextSave: async () => ({ outcome: 'unavailable' }),
  artifactExport: async () => ({ outcome: 'cancelled' }),
  canvasExportImage: async () => ({ outcome: 'cancelled' }),
  canvasFrameAttach: async () => null,
  canvasFrameReady: async () => 'pending',
  artifactRead: async () => null,
  artifactDelete: async () => ({ code: 'unknown', reason: 'no artifact store in the lab harness' }),
  notifyProjectSelected: async () => {},

  workspacePlan: async () => ({ kind: 'refused' as const, reason: 'already-copied' as const, projectName: 'lemonade' }),
  workspaceCreateBlank: async () => ({ ok: false as const, stage: 'setting-up' as const, canceled: false }),

  projectSetupRead: async () => ({ saved: null, verified: null, state: 'idle', failure: null }),
  projectSetupAsk: async () => ({ ok: false, reason: 'unavailable' }),

  notificationAction: async () => ({}),

  tabOnScreen: async () => ({ isOnScreen: true }),

  onboardingState: async () => ({ hasOnboarded: true }),
  machineCheck: async () => ({ checks: MACHINE_CHECK_IDS.map((id) => ({ id, status: 'inconclusive' })), platform: 'mac', canChooseFolder: false }),
  machineChooseFolder: async () => 'unavailable',
  machineInstallTools: async () => 'unsupported',
  machineOpenHelp: async () => false,
  onboardingComplete: async () => {},

  updateStatus: async () => IDLE_UPDATE_STATE,

  codexStatus: async () => IDLE_CODEX_SETUP_STATE,
  codexInstall: async () => ({ accepted: false }),
  codexSignIn: async () => ({ accepted: false }),
  codexSignInCancel: async () => {},

  claudeStatus: async () => IDLE_CLAUDE_SETUP_STATE,
  claudeSignIn: async () => ({ accepted: false }),
  claudeOpenPageAgain: async () => ({ accepted: false }),
  claudeSubmitCode: async () => ({ accepted: false }),
  claudeSignInCancel: async () => {},
  openTerminal: async () => {},
  readClipboardText: async () => ({ text: '' }),
  pasteClipboard: async () => { document.execCommand('paste'); },

  authState: async () => ({
    identity: { email: 'designer@example.com', source: 'manual' as const },
  }),
  onlookState: async () => (['found', 'about', 'onboarding'].includes(new URLSearchParams(window.location.search).get('screen') ?? '')
    ? { revision: 0, session: 'signed-in' as const, connection: 'connected' as const, me: null, profile: { name: 'Designer', email: 'designer@example.com', picture: null } }
    : { revision: 0, session: 'local' as const, connection: 'idle' as const, me: null, profile: null }),
  onlookSignIn: async () => ({ ok: true }),
  onlookSignOut: async () => ({ ok: true }),
  onlookDeleteAccount: async () => ({ ok: true }),
  onlookAnswerSurvey: async () => {},
  onlookTeamCommand: async () => ({ ok: false, error: 'unavailable' }),

  listWorkspaces: async () => [],
  // Nothing on disk behind the lab, so no worktree is ever found there.
  listDiscoveredWorktrees: async () => [],
  importWorktree: async () => ({ ok: false as const, reason: 'not-a-repository' as const }),
  openProject: async () => ({ ok: false as const, reason: 'unknown-project' as const }),
  setArchived: async () => {},
  // No projects list here, so the rename lands on the open project, as main's broadcast would.
  rename: async (req) => {
    const { workspace, setWorkspace } = useWorkspaceStore.getState();
    if (req.target === 'project' && workspace?.workspacePath === req.workspacePath) {
      setWorkspace({ ...workspace, displayName: req.name });
    }
  },
  // No folder behind a lab project, so nothing to hand the file manager.
  revealProject: async () => ({ ok: false as const, reason: 'unknown-project' as const }),
  // Nothing on disk behind a lab project, so there is nothing to remove.
  removeProject: async () => ({ ok: false as const, reason: 'unknown-project' as const }),
  reorderWorkspaces: async () => {},

  listGitStatus: async () => ({}),
  gitPillDefaults: async () => GIT_PILL_SHIPPED_DEFAULTS,
  setGitPillDefault: async (patch) => ({ ...GIT_PILL_SHIPPED_DEFAULTS, ...patch }),

  locationState: async () => ({ kind: 'projects' as const }),
  tabCreateState: async () => null,
  tabAssignment: async () => null,
  locationSet: async () => {},
  tabsState: async () => ({ tabs: [], canCreate: false, isHome: true }),

  canvasSnapshot: async () => ({ doc: LAB_CANVAS_DOC }),
  canvasPageCameras: async () => ({ byPage: {} }),

  revealTab: async () => false,
  appCommands: async () => APP_COMMAND_ORDER,
  panelsState: async () => PANEL_DEFAULTS,
  panelsSave: async () => {},
  sidebarLayoutState: async () => ({}),
  sidebarLayoutSave: async () => {},

  codeRead: async (req) => ({
    ok: true as const,
    path: req.path,
    text: LAB_CODE_TEXT,
    snapshot: LAB_CODE_SNAPSHOT,
  }),
  codeList: async () => ({ ok: true as const, files: LAB_CODE_FILES, truncated: false }),
  codeSearch: async () => ({ ok: true as const, names: [], contents: [], truncated: false }),
  codeWrite: async (req) => ({ ok: true as const, path: req.path, snapshot: req.expected }),
  codeIdentify: async () => ({
    ok: true as const,
    reading: { ok: true as const, component: 'LabComponent', frames: [], ownerFrames: [], siblings: 1, react: 'development' as const },
  }),
  codeComponentMap: async () => ({ ok: true as const, boundaries: [] }),
  codeMap: async () => ({
    ok: true as const,
    mapping: {
      path: 'src/LabComponent.tsx',
      line: 12,
      column: 3,
      via: 'owner-stack' as const,
      definition: { path: 'src/LabComponent.tsx', line: 1, column: 1, via: 'name-search' as const },
      grade: 'exact' as const,
      component: 'LabComponent',
      others: [],
      uses: 2,
      produced: 1,
      producedComplete: true,
    },
  }),

  draftState: async () => EMPTY_COMPOSER_DRAFT,

  // The first-run tour shows only under `?tour`, so the lab opens on the editor otherwise.
  settingsState: async () => (new URLSearchParams(window.location.search).has('tour') ? {} : { tourSeen: true }),
  settingsSetHarness: async ({ harness }) => ({ harness }),
  settingsSetCodePanel: async (experimentalCodePanel) => ({ experimentalCodePanel }),
  settingsSetAnalytics: async (analyticsEnabled) => ({ analyticsEnabled }),
  settingsSetNotificationSound: async (notificationSound) => ({ notificationSound }),
  settingsResolveDiscoverCta: async () => ({ discoverCtaResolved: true }),
  settingsDismissTipsPill: async () => ({ tipsPillDismissed: true }),
  settingsDismissConnectorsNotice: async () => ({ connectorsNoticeDismissed: true }),
  settingsMarkTourSeen: async () => ({ tourSeen: true }),
  settingsResetTips: async () => ({}),
  settingsDefaults: async () => LAB_SETTINGS_DEFAULTS,
  settingsSetDefault: async () => LAB_SETTINGS_DEFAULTS,

  takeDraftRequest: () => Promise.resolve(false),
  takeSettingsRequest: () => Promise.resolve(false),

  telemetryConfig: async () => ({ enabled: false as const }),
  telemetryConsent: async () => false,

  reportSubmit: async () => ({ kind: 'queued' as const }),
  reportCapability: async () => false,
};

window.studio = { ...inertMethods(), ...answers };
