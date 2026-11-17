import type { ArtifactReadState } from './artifacts.js';
import type { ArtifactToolInput, ArtifactToolVerb } from './artifacts.js';
import type { CanvasDoc, CanvasNodeId, CanvasPageId } from './canvas.js';
import type { AgentConnectionStatus } from './events.js';
import type { AuthState } from './identity.js';
import type { HarnessId } from './models.js';
import type { ProjectImportEntryPoint, WorkspaceSummary } from './projects.js';
import type { ServerBookState } from './server.js';
import type { TabSummary } from './tabs.js';
import type { ComfortChoice } from './workspace.js';
import type { CanvasTool } from './canvas.js';

/** Main's answer to "is the diagnostics gate open", carried where `app.isPackaged` cannot be read (ONL-2377). */
export const DIAGNOSTICS_ARG = '--studio-diagnostics';

export interface DebugAppInfo {
  version: string;
  commit: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  isPackaged: boolean;
}

/** Scalars only: the event log carries prompts and tool objects, and this payload is read by a shell (ONL-2371). */
export interface DebugSessionState {
  sessionId?: string;
  cwd?: string;
  isStreaming: boolean;
  lastSeq: number;
  eventCount: number;
  status: AgentConnectionStatus;
  harness?: HarnessId;
}

/** Counts and ids, never the nodes: a canvas document is unbounded. */
export interface DebugCanvasState {
  docId: string;
  schemaVersion: number;
  revision: number;
  nodeCount: number;
}

/** Counts every page's nodes, not the open page's. Main and the renderer both answer through this one projection, so their canvas states diff field for field (ONL-2423). */
export function debugCanvasStateEveryPage(doc: CanvasDoc | null): DebugCanvasState | null {
  if (doc === null) return null;
  return {
    docId: doc.docId,
    schemaVersion: doc.schemaVersion,
    revision: doc.revision,
    nodeCount: Object.keys(doc.nodes).length,
  };
}

export interface DebugTabState extends TabSummary {
  isActive: boolean;
  /** `null` when the tab has no view: cold or cooled, as much as gone (ONL-2208, ONL-2210). */
  webContentsId: number | null;
  /** The source a `+` pressed while this tab is in front cuts a project from; `null` disables `+`. */
  createFrom: string | null;
  /** `null` when the tab has no project yet — a `+` tab before `location:set`. */
  server: ServerBookState | null;
  session: DebugSessionState | null;
  canvas: DebugCanvasState | null;
}

export interface DebugLogTail {
  path: string;
  /** Parsed log lines, oldest first; a line that will not parse arrives as `{ raw }`. */
  lines: Record<string, unknown>[];
}

/** Appended only while the diagnostics gate is open; the renderer installs `window.__ONLOOK_DEBUG__` only on it (ONL-2372). */
export const DIAGNOSTICS_HASH = '#debug';

export const DEBUG_SELECTOR_MAX = 2048;

/** Main's half of the performance probe, on the diagnostics gate (ONL-2471). */
export const PERF_PROBE_GLOBAL = '__studioPerfProbe';

/** The two spans the capture path and the compositor mark under, named apart so a regression carries its cause. */
export const PERF_SPAN = {
  guestCapture: 'thumbnail-guest-capture',
  composite: 'thumbnail-composite',
} as const;

export type PerfSpanName = (typeof PERF_SPAN)[keyof typeof PERF_SPAN];

/** Spans of one name aggregate; a second span never replaces the first. */
export interface PerfSpanLeg {
  name: string;
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface PerfEventLoopLeg {
  maxMs: number;
  p99Ms: number;
  meanMs: number;
  samples: number;
}

export interface PerfMemoryLeg {
  /** Taken after a forced collection. */
  baselineKb: number;
  peakKb: number;
  growthKb: number;
  samples: number;
}

export interface PerfProbeResult {
  windowMs: number;
  eventLoop: PerfEventLoopLeg;
  spans: PerfSpanLeg[];
  memory: PerfMemoryLeg;
}

export interface StudioPerfProbe {
  start(): void;
  stop(): Promise<PerfProbeResult>;
  collect(): PerfProbeResult;
}

/** Every `Screen` kind in `activation/advance.ts`, `parked` included: a probe that cannot name a screen reports the app as somewhere it is not (ONL-2318). */
export type DebugScreenKind = 'pending' | 'parked' | 'onboarding' | 'projects' | 'editor';

export interface DebugFrameState {
  id: string;
  name: string;
  homeUrl: string;
  /** The frame has been sent `arm` at the live generation; a pick sent before that is dropped in the guest. */
  isArmed: boolean;
}

/** What the guest's last hover report found; both are `null` on a point that landed on nothing pickable (ONL-2455). */
export interface DebugHoverState {
  frameId: string;
  tag: string | null;
  domPath: string | null;
}

/** The open bubble, in scalars (ONL-2455): the draft's TEXT is prompt content and never rides here. */
export interface DebugInlineChatState {
  anchorId: string;
  draftChars: number;
  placement: 'above' | 'below' | null;
  send: 'idle' | 'sending' | 'failed';
  refusal: 'count-cap' | 'byte-cap' | null;
}

export interface DebugScreenState {
  kind: DebugScreenKind;
  workspacePath: string | null;
  /** The repo identity the projects sidebar has selected; `null` on Recent, on Settings, and off the Projects Screen. */
  selectedWorkspace: string | null;
  isPicking: boolean;
  frames: DebugFrameState[];
  /** The picker's activation, with the tool: Design plus the select tool is a live picker, nothing armed. */
  mode: 'design' | 'interact';
  tool: CanvasTool;
  /** Monotonic, and held against each other rather than against a clock: the ratio is machine-independent (ONL-2455). */
  hoverSends: number;
  /** The guest's own count of `elementFromPoint` calls, so a dropped relay reads as a gap. */
  hitTests: number;
  hovered: DebugHoverState | null;
  inlineChat: DebugInlineChatState | null;
}

export interface DebugSelectionState {
  id: string;
  frameId: string;
  tag: string;
  domPath: string;
  stale: boolean;
}

/** Where the tab thinks it is. Two paths, not one: the canvas's copy is downstream of the landing, so folding them together would hide the drift this read exists to show (ONL-2423). */
export interface DebugLocationStore {
  screen: DebugScreenKind;
  /** What the landing wrote. `null` on an editor tab means the landing never completed, or a switch cleared it and nothing landed after (ONL-2139, ONL-2265). */
  workspacePath: string | null;
  repoIdentity: string | null;
  /** The same landing writes this; set beside a `null` `workspacePath`, it is that cleared switch. */
  canvasProjectPath: string | null;
  isSwitching: boolean;
}

/** One artifact node's read as it changed, in order: the settle lands between two polls, so a sample cannot see it (ONL-2568). */
export interface DebugArtifactRead {
  nodeId: string;
  artifactId: string;
  state: ArtifactReadState;
  /** Monotonic across the tab's life, so a trimmed head reads as a gap rather than as a reorder. */
  seq: number;
}

export interface DebugCanvasStore {
  /** `null` with no document open; the shape main answers with for the same tab, so the two compare directly. Its `nodeCount` spans every page, not `currentPageId`'s. */
  doc: DebugCanvasState | null;
  /** The page the canvas composes, not the stored id, which can name a page the document no longer holds (ONL-2488). */
  currentPageId: CanvasPageId | null;
  /** Order is selection recency: the last id is the primary (ONL-2043). */
  selectedNodeIds: readonly CanvasNodeId[];
  hoveredNodeId: CanvasNodeId | null;
  artifactReads: readonly DebugArtifactRead[];
}

/** The renderer's own copy of what main also holds, by store name; read-only by convention (ONL-2423). */
export interface DebugStores {
  /** The type `DebugState.workspaces` carries, unreshaped: a stale name is a field difference, not an inference. */
  projects: readonly WorkspaceSummary[];
  location: DebugLocationStore;
  canvas: DebugCanvasStore;
}

export type DebugActionResult = { ok: true } | { ok: false; reason: string };

export interface DebugSelectRequest {
  frameId: string;
  selector: string;
  add?: boolean;
}

/** Each method forwards to a control's own action, so an outside caller reaches no path a user cannot (ONL-2372). */
export interface StudioDebugBridge {
  screen(): DebugScreenState;
  /** The renderer's side of a main-versus-renderer comparison; it exposes no setter (ONL-2423). */
  stores(): DebugStores;
  /** The New Draft row's own create; ok means started, and the tab lands in the editor when main answers. */
  createBlank(): DebugActionResult;
  /** The folder picker's own continuation; resolving is acceptance, and a `design` cut stops before install and start. */
  importProject(sourcePath: string, comfort?: ComfortChoice): Promise<DebugActionResult>;
  openProject(workspacePath: string): Promise<DebugActionResult>;
  /** Ok means registered and listed, never opened; a refusal arrives as its reason (ONL-2522). */
  importWorktree(handle: string, entryPoint?: ProjectImportEntryPoint): Promise<DebugActionResult>;
  revealProject(workspacePath: string): DebugActionResult;
  /** Ok means asked, never removed: main's own confirm still decides, and this returns before it opens. */
  removeProject(workspacePath: string): DebugActionResult;
  /** Ok means asked, never removed, as for a single project above. */
  removeWorkspace(repoIdentity: string): DebugActionResult;
  selectWorkspace(repoIdentity: string): DebugActionResult;
  addFrame(homeUrl: string): DebugActionResult;
  removeFrame(frameId: string): DebugActionResult;
  /** The Designs row's own rename; a blank name falls back to the frame's address, as the row does. */
  renameFrame(frameId: string, name: string): DebugActionResult;
  setPicking(isPicking: boolean): DebugActionResult;
  /** Sent to the frame; the pick arrives back through the guest's own evidence builder. */
  selectElement(request: DebugSelectRequest): DebugActionResult;
  selections(): DebugSelectionState[];
  /** Sends the draft standing in the bubble; the text is typed into the surface, never passed here (ONL-2455). */
  submitInline(): Promise<DebugActionResult>;
}

/** The agent's own reading of the canvas, as the text the model receives (ONL-2297). */
export interface DebugAgentFramesRequest {
  worktreePath: string;
}

export interface DebugArtifactToolRequest {
  worktreePath: string;
  verb: ArtifactToolVerb;
  input: ArtifactToolInput;
}

export interface DebugCaptureFrameRequest {
  worktreePath: string;
  frameId: string;
}

export interface DebugCaptureFrame {
  result: import('./ipc-payloads.js').FrameCaptureResult;
  viewMoved: boolean;
  revealMs: number;
  captureMs?: number;
  stalledStep?: import('./capture-view.js').FrameCaptureStep;
  geometry: import('./capture-view.js').CaptureGeometry | null;
  paintMs?: number;
  attempts?: number;
  restore?: 'restored' | 'kept' | 'silent';
  freezeMs?: number;
  moveAnsweredLate?: boolean;
}

export interface DebugAgentFrames {
  /** `list_frames`' answer verbatim; `null` when no project is open at that path. */
  text: string | null;
}

/** Every field is answerable with nothing open: empty lists and nulls, never an error (ONL-2371). */
export interface DebugState {
  capturedAt: string;
  app: DebugAppInfo;
  stateRoot: string;
  workspaceRoot: string;
  auth: AuthState;
  workspaces: WorkspaceSummary[];
  tabs: DebugTabState[];
  activeTabId: string | null;
  isHome: boolean;
  log: DebugLogTail;
}
