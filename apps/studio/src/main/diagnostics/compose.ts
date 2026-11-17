// A `debug:state` payload carries project paths and raw log lines, so it never feeds `main/telemetry/`, an event or an error report (ONL-2371).

import type {
  AgentSnapshot,
  AuthState,
  CanvasSnapshot,
  DebugCanvasState,
  DebugSessionState,
  DebugState,
  DebugTabState,
  ServerBookState,
  TabsState,
  WorkspaceSummary,
} from '@studio/events';
import type {
  DebugAgentFrames,
  DebugAgentFramesRequest,
  DebugAppInfo,
  DebugLogTail,
} from '@studio/events';
import { debugCanvasStateEveryPage } from '@studio/events';

export const LOG_TAIL_LINES = 100;

export interface AgentFramesReaders {
  /** `null` rather than an empty listing: an unregistered path is not a canvas with nothing on it. */
  workspace(worktreePath: string): { repoIdentity: string } | undefined;
  frames(worktreePath: string, repoIdentity: string): Promise<unknown[]>;
  text(frames: readonly unknown[]): string;
}

export async function composeAgentFrames(
  { worktreePath }: DebugAgentFramesRequest,
  readers: AgentFramesReaders,
): Promise<DebugAgentFrames> {
  const workspace = readers.workspace(worktreePath);
  if (workspace === undefined) return { text: null };
  return { text: readers.text(await readers.frames(worktreePath, workspace.repoIdentity)) };
}

export interface DebugReaders {
  now(): Date;
  app(): DebugAppInfo;
  stateRoot(): string;
  workspaceRoot(): string;
  auth(): AuthState;
  workspaces(): WorkspaceSummary[];
  tabs(): TabsState;
  viewId(tabId: string): number | undefined;
  createFrom(tabId: string): string | undefined;
  server(worktreePath: string): ServerBookState | undefined;
  session(worktreePath: string): AgentSnapshot | undefined;
  canvas(worktreePath: string): Promise<CanvasSnapshot>;
  logTail(): DebugLogTail;
}

export function tailLines(contents: string, limit: number): Record<string, unknown>[] {
  const lines = contents.split('\n').filter((line) => line.trim().length > 0);
  return lines.slice(Math.max(0, lines.length - limit)).map(parseLine);
}

function parseLine(line: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(line);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // A rotated file can start mid-line, and a truncated tail is still worth reading.
  }
  return { raw: line };
}

export function canvasStateOf(snapshot: CanvasSnapshot): DebugCanvasState | null {
  return debugCanvasStateEveryPage(snapshot.doc);
}

export function sessionStateOf(snapshot: AgentSnapshot | undefined): DebugSessionState | null {
  if (snapshot === undefined) return null;
  const state: DebugSessionState = {
    isStreaming: snapshot.isStreaming,
    lastSeq: snapshot.lastSeq,
    eventCount: snapshot.events.length,
    status: snapshot.connection.status,
  };
  if (snapshot.sessionId !== undefined) state.sessionId = snapshot.sessionId;
  if (snapshot.cwd !== undefined) state.cwd = snapshot.cwd;
  if (snapshot.connection.harness !== undefined) state.harness = snapshot.connection.harness;
  return state;
}

export async function composeDebugState(readers: DebugReaders): Promise<DebugState> {
  const tabs = readers.tabs();
  const composed: DebugTabState[] = [];
  for (const tab of tabs.tabs) {
    const path = tab.workspacePath;
    composed.push({
      ...tab,
      isActive: tab.id === tabs.activeId,
      webContentsId: readers.viewId(tab.id) ?? null,
      createFrom: readers.createFrom(tab.id) ?? null,
      server: path === undefined ? null : (readers.server(path) ?? null),
      session: path === undefined ? null : sessionStateOf(readers.session(path)),
      canvas: path === undefined ? null : canvasStateOf(await readers.canvas(path)),
    });
  }

  return {
    capturedAt: readers.now().toISOString(),
    app: readers.app(),
    stateRoot: readers.stateRoot(),
    workspaceRoot: readers.workspaceRoot(),
    auth: readers.auth(),
    workspaces: readers.workspaces(),
    tabs: composed,
    activeTabId: tabs.activeId ?? null,
    isHome: tabs.isHome,
    log: readers.logTail(),
  };
}
