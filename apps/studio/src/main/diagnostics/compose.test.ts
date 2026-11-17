import { describe, expect, it } from 'bun:test';
import type { AgentSnapshot, CanvasSnapshot, TabsState } from '@studio/events';
import {
  canvasStateOf,
  composeAgentFrames,
  composeDebugState,
  sessionStateOf,
  tailLines,
  type DebugReaders,
} from './compose.js';

const EMPTY_TABS: TabsState = { tabs: [], canCreate: false, isHome: true };

function readers(overrides: Partial<DebugReaders> = {}): DebugReaders {
  return {
    now: () => new Date('2026-09-21T00:00:00.000Z'),
    app: () => ({
      version: '0.1.0',
      commit: 'abc1234',
      electronVersion: '43.2.0',
      chromeVersion: '140',
      nodeVersion: '22.0.0',
      platform: 'darwin',
      isPackaged: false,
    }),
    stateRoot: () => '/scratch/state',
    workspaceRoot: () => '/scratch/workspaces',
    auth: () => ({ identity: null, workosEnabled: false }),
    workspaces: () => [],
    tabs: () => EMPTY_TABS,
    viewId: () => undefined,
    createFrom: () => undefined,
    server: () => undefined,
    session: () => undefined,
    canvas: () => Promise.resolve({ doc: null }),
    logTail: () => ({ path: '/scratch/state/logs/studio.log', lines: [] }),
    ...overrides,
  };
}

const TAB: TabsState = {
  tabs: [
    { id: 't1', name: 'one', purpose: 'project', workspacePath: '/w/one' },
    { id: 't2', name: 'two', purpose: 'project', workspacePath: '/w/two' },
  ],
  activeId: 't2',
  canCreate: true,
  isHome: false,
};

const SNAPSHOT: AgentSnapshot = {
  sessionId: 's1',
  cwd: '/w/one',
  events: [],
  isStreaming: true,
  midTurn: 'steer',
  lastSeq: 7,
  connection: { status: 'ok', harness: 'codex' },
};

const DOC: CanvasSnapshot = {
  doc: { schemaVersion: 2, docId: 'doc-1', revision: 4, nodes: { a: {}, b: {} } },
} as unknown as CanvasSnapshot;

describe('composeDebugState', () => {
  it('answers with explicit empties when nothing is open', async () => {
    const state = await composeDebugState(readers());
    expect(state.tabs).toEqual([]);
    expect(state.workspaces).toEqual([]);
    expect(state.activeTabId).toBeNull();
    expect(state.isHome).toBe(true);
    expect(state.auth.identity).toBeNull();
  });

  it('covers every tab and marks the one in front', async () => {
    const state = await composeDebugState(readers({ tabs: () => TAB }));
    expect(state.tabs.map((tab) => tab.id)).toEqual(['t1', 't2']);
    expect(state.tabs.map((tab) => tab.isActive)).toEqual([false, true]);
    expect(state.activeTabId).toBe('t2');
  });

  it('carries each tab\'s webContentsId, null once the view is gone', async () => {
    const state = await composeDebugState(
      readers({ tabs: () => TAB, viewId: (tabId) => (tabId === 't1' ? 42 : undefined) }),
    );
    expect(state.tabs.map((tab) => tab.webContentsId)).toEqual([42, null]);
  });

  it('resolves each tab against its own project path', async () => {
    const seen: string[] = [];
    const state = await composeDebugState(
      readers({
        tabs: () => TAB,
        session: (path) => (path === '/w/one' ? SNAPSHOT : undefined),
        canvas: (path) => {
          seen.push(path);
          return Promise.resolve(path === '/w/two' ? DOC : { doc: null });
        },
      }),
    );
    expect(seen).toEqual(['/w/one', '/w/two']);
    expect(state.tabs[0]?.session?.harness).toBe('codex');
    expect(state.tabs[1]?.session).toBeNull();
    expect(state.tabs[0]?.canvas).toBeNull();
    expect(state.tabs[1]?.canvas?.nodeCount).toBe(2);
  });

  it('leaves a tab with no project null rather than falling back to the active one', async () => {
    const state = await composeDebugState(
      readers({
        tabs: () => ({ ...TAB, tabs: [{ id: 't3', name: 'new', purpose: 'projects' }] }),
        session: () => SNAPSHOT,
        canvas: () => Promise.resolve(DOC),
      }),
    );
    expect(state.tabs[0]?.session).toBeNull();
    expect(state.tabs[0]?.canvas).toBeNull();
    expect(state.tabs[0]?.server).toBeNull();
  });
});

describe('sessionStateOf', () => {
  it('carries scalars and the event count, never the events', () => {
    const state = sessionStateOf(SNAPSHOT);
    expect(state).toEqual({
      isStreaming: true,
      lastSeq: 7,
      eventCount: 0,
      status: 'ok',
      sessionId: 's1',
      cwd: '/w/one',
      harness: 'codex',
    });
    expect(JSON.stringify(state)).not.toContain('events');
  });

  it('is null for a project with no session', () => {
    expect(sessionStateOf(undefined)).toBeNull();
  });
});

describe('canvasStateOf', () => {
  it('counts nodes instead of carrying them', () => {
    expect(canvasStateOf(DOC)).toEqual({ docId: 'doc-1', schemaVersion: 2, revision: 4, nodeCount: 2 });
  });

  it('is null for a project with no document', () => {
    expect(canvasStateOf({ doc: null })).toBeNull();
  });
});

describe('tailLines', () => {
  it('keeps the last N lines, oldest first', () => {
    const contents = ['{"msg":"a"}', '{"msg":"b"}', '{"msg":"c"}'].join('\n');
    expect(tailLines(contents, 2)).toEqual([{ msg: 'b' }, { msg: 'c' }]);
  });

  it('survives a rotated file starting mid-line', () => {
    expect(tailLines('sg":"half"}\n{"msg":"whole"}', 10)).toEqual([
      { raw: 'sg":"half"}' },
      { msg: 'whole' },
    ]);
  });

  it('is empty for an empty file', () => {
    expect(tailLines('', 10)).toEqual([]);
    expect(tailLines('\n\n', 10)).toEqual([]);
  });

  it('does not wrap a JSON array as an object', () => {
    expect(tailLines('[1,2]', 10)).toEqual([{ raw: '[1,2]' }]);
  });
});

describe("the agent's own reading, opened by the diagnostics gate", () => {
  const reading = {
    workspace: (path: string) => (path === '/open/worktree' ? { repoIdentity: 'repo-1' } : undefined),
    frames: (_path: string, _repoIdentity: string) =>
      Promise.resolve([{ id: 'frame-1', pageError: { source: 'vite', message: 'Unexpected token' } }]),
    text: (frames: readonly unknown[]) => JSON.stringify(frames),
  };

  it('answers null for a path no project is registered for (ONL-2297)', async () => {
    expect(await composeAgentFrames({ worktreePath: '/not/registered' }, reading)).toEqual({ text: null });
  });

  it("answers the tool's own text for a worktree that is open", async () => {
    expect(await composeAgentFrames({ worktreePath: '/open/worktree' }, reading)).toEqual({
      text: '[{"id":"frame-1","pageError":{"source":"vite","message":"Unexpected token"}}]',
    });
  });
});
