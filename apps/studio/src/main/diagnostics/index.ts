import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { handle } from '../ipc/bridge.js';
import {
  IPC_INVOKE,
  type DebugAgentFrames,
  type DebugAgentFramesRequest,
  type DebugLogTail,
  type DebugState,
} from '@studio/events';
import { agentSnapshotFor, diagnosticArtifactTool } from '../agent-host/index.js';
import { agentFramesText } from '../agent-host/canvas-tools.js';
import { COMMIT_SHA } from '../build-info.js';
import { canvasSnapshotFor, captureAgentFrame, listAgentFrames } from '../canvas/index.js';
import type { RevealFacts } from '../canvas/capture-view.js';
import { authState } from '../identity/ipc.js';
import { LOG_FILE_NAME } from '../log/file.js';
import { serverHost } from '../server/index.js';
import { stateRoot } from '../state/root.js';
import { tabHost } from '../tabs/host.js';
import { knownProject, listWorkspaces, workspaceRoot } from '../workspace/store.js';
import {
  LOG_TAIL_LINES,
  composeAgentFrames,
  composeDebugState,
  tailLines,
  type AgentFramesReaders,
  type DebugReaders,
} from './compose.js';
import { diagnosticsGateOpen } from './gate.js';
import { hostPlatform } from '../env/platform.js';

function logTail(): DebugLogTail {
  const path = join(stateRoot(), 'logs', LOG_FILE_NAME);
  try {
    return { path, lines: tailLines(readFileSync(path, 'utf8'), LOG_TAIL_LINES) };
  } catch {
    return { path, lines: [] };
  }
}

const readers: DebugReaders = {
  now: () => new Date(),
  app: () => ({
    version: app.getVersion(),
    commit: COMMIT_SHA,
    electronVersion: process.versions.electron ?? 'unknown',
    chromeVersion: process.versions.chrome ?? 'unknown',
    nodeVersion: process.versions.node,
    platform: hostPlatform(),
    isPackaged: app.isPackaged,
  }),
  stateRoot,
  workspaceRoot,
  auth: authState,
  workspaces: listWorkspaces,
  tabs: () => tabHost()?.state() ?? { tabs: [], canCreate: false, isHome: true },
  viewId: (tabId) => {
    const contents = tabHost()?.contentsFor(tabId);
    return contents === undefined || contents.isDestroyed() ? undefined : contents.id;
  },
  createFrom: (tabId) => tabHost()?.createFromFor(tabId),
  server: (worktreePath) => serverHost()?.snapshotFor(worktreePath),
  session: agentSnapshotFor,
  canvas: canvasSnapshotFor,
  logTail,
};

function debugState(): Promise<DebugState> {
  return composeDebugState(readers);
}

/** The agent's own read, not a second one built beside it: what `list_frames` answers is what this returns (ONL-2297). */
const agentFrameReaders: AgentFramesReaders = {
  // `knownProject`, as the agent's own composition does: a summary's `sourcePath` is the user's checkout, not the worktree.
  workspace: knownProject,
  // An observer: `read` would drain the console lines `list_frames` promised the agent.
  frames: (worktreePath, repoIdentity) => listAgentFrames(worktreePath, repoIdentity, { drainConsole: false }),
  text: agentFramesText,
};

function debugAgentFrames(request: DebugAgentFramesRequest): Promise<DebugAgentFrames> {
  return composeAgentFrames(request, agentFrameReaders);
}

/** `capture_frame`'s own capture, and what the reveal did for it (ONL-3031). */
async function debugCaptureFrame(request: import('@studio/events').DebugCaptureFrameRequest): Promise<import('@studio/events').DebugCaptureFrame> {
  const revealed: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
  const result = await captureAgentFrame(request.worktreePath, request.frameId, revealed);
  return { result, ...revealed };
}

export function registerDiagnosticsHandlers(): void {
  if (!diagnosticsGateOpen()) return;
  handle(IPC_INVOKE.debugState, () => debugState());
  handle(IPC_INVOKE.debugAgentFrames, (_event, request: DebugAgentFramesRequest) =>
    debugAgentFrames(request),
  );
  handle(IPC_INVOKE.debugCaptureFrame, (_event, request: import('@studio/events').DebugCaptureFrameRequest) => debugCaptureFrame(request));
  handle(IPC_INVOKE.debugArtifactTool, (_event, request: import('@studio/events').DebugArtifactToolRequest) => diagnosticArtifactTool(request));
}
