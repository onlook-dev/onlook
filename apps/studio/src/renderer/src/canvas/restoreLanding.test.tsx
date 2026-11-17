import { takeComplaints } from '../testing/dom.js';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { AgentSnapshot, CanvasDoc, CanvasSnapshot, WorkspaceCreated } from '@studio/events';

interface Held<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}
function held<T>(): Held<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

const PAGE = { pg: { id: 'pg', name: 'Canvas', order: 0 } };
const FRAME = { id: 'f1', pageId: 'pg', kind: 'browser', name: 'Home', x: 0, y: 0, width: 640, height: 480, order: 0, content: { homeUrl: 'http://localhost:5180/' } };
const docWith = (nodes: Record<string, unknown>): CanvasDoc => ({ schemaVersion: 1, docId: 'doc-1', revision: 3, pages: PAGE, nodes }) as CanvasDoc;

const main = {
  doc: docWith({}),
  hasUserMessage: false,
  location: held<void>(),
  snapshots: [] as Held<CanvasSnapshot>[],
  sessionListeners: [] as ((info: { sessionId?: string; cwd?: string }) => void)[],
  sessionCwd: undefined as string | undefined,
  chatReads: [] as (() => void)[],
};

const agentSnapshot = (cwd: string | undefined, hasUserMessage: boolean): Partial<AgentSnapshot> => ({
  events: [],
  isStreaming: false,
  midTurn: 'steer',
  lastSeq: 0,
  connection: { status: 'ok' },
  hasUserMessage,
  ...(cwd === undefined ? {} : { cwd, sessionId: 'sess-1' }),
});

(globalThis as { window: { studio?: unknown } }).window.studio = {
  log() {},
  telemetryException() {},
  onWorkspaceCreated: () => () => {},
  locationSet: () => main.location.promise,
  notifyProjectSelected: ({ path }: { path: string }) => {
    main.sessionCwd = path;
    for (const listener of main.sessionListeners) listener({ sessionId: 'sess-1', cwd: path });
    return Promise.resolve();
  },
  canvasSnapshot: () => {
    const answer = held<CanvasSnapshot>();
    main.snapshots.push(answer);
    return answer.promise;
  },
  canvasPageCameras: () => Promise.resolve({ byPage: {} }),
  canvasOp() {},
  canvasUndo() {},
  canvasRedo() {},
  canvasViewport() {},
  canvasCurrentPage() {},
  canvasFrames() {},
  onCanvasUpdate: () => () => {},
  onCanvasRejected: () => () => {},
  onAgentWorkingFrames: () => () => {},
  onCanvasFrameQuotes: () => () => {},
  onAgentSession: (listener: (info: { sessionId?: string; cwd?: string }) => void) => {
    main.sessionListeners.push(listener);
    return () => {
      main.sessionListeners = main.sessionListeners.filter((other) => other !== listener);
    };
  },
  onAgentState: () => () => {},
  onAgentConnection: () => () => {},
  agentSnapshot: (): Promise<Partial<AgentSnapshot>> => {
    const cwd = main.sessionCwd;
    if (cwd === undefined) return Promise.resolve(agentSnapshot(undefined, false));
    return new Promise((resolve) => {
      main.chatReads.push(() => resolve(agentSnapshot(cwd, main.hasUserMessage)));
    });
  },
};

const { setLogMirror } = await import('../log.js');
setLogMirror(false);
const { ConnectFlowProvider } = await import('./ConnectFlow.js');
const { useCanvasDocumentConnection } = await import('./useCanvasConnections.js');
const { useEmptyCanvasState } = await import('./useEmptyCanvasState.js');
const { useCanvasStore } = await import('./store.js');
const { useWorkspaceStore } = await import('../workspace/store.js');
const { installProjectSession, resetProjectSessionForTests } = await import('../workspace/session.js');
const { canvasSessionSurface } = await import('./sessionSurface.js');
installProjectSession({ ...canvasSessionSurface, clearCode: () => undefined });
const { subscribeToAgent, useAgentStore } = await import('../agent/store.js');
const { seedFlags } = await import('../flags/store.js');

afterAll(() => {
  Reflect.deleteProperty(window, 'studio');
});

const BLANK: WorkspaceCreated = {
  workspacePath: '/state/workspaces/blank-abc/brisk-otter',
  workspaceName: 'brisk-otter',
  branchName: 'brisk-otter',
  baseBranch: 'main',
  sourceRepoName: 'source',
  sourcePath: '/state/workspaces/blank-abc/source',
  sourceRepoRoot: '/state/workspaces/blank-abc/source',
  repoIdentity: 'blank-abc',
  origin: 'blank',
  copiedEnvFiles: [],
};
const IMPORTED: WorkspaceCreated = { ...BLANK, origin: 'imported', workspacePath: '/code/site-ws', repoIdentity: 'site' };

let painted: string[] = [];

function CanvasCentre(): null {
  useCanvasDocumentConnection();
  const nodeCount = useCanvasStore((state) => state.nodes.length);
  const state = useEmptyCanvasState({ hasLiveServer: false, hasNodes: nodeCount > 0 });
  const label = state.kind !== 'unknown' && nodeCount === 0 ? state.kind : 'nothing';
  useLayoutEffect(() => {
    if (painted.at(-1) !== label) painted.push(label);
  });
  return null;
}

let stopAgent: () => void = () => {};
let unmount: () => Promise<void> = () => Promise.resolve();

beforeEach(() => {
  painted = [];
  main.location = held<void>();
  main.snapshots = [];
  main.sessionCwd = undefined;
  main.chatReads = [];
  takeComplaints();
  useCanvasStore.getState().clearFrames();
  resetProjectSessionForTests();
  useAgentStore.setState({ hasSession: false, hasUserMessage: false, heardCwd: undefined });
  seedFlags({ 'blank-first-moment': true });
  stopAgent = subscribeToAgent();
});

afterEach(async () => {
  await unmount();
  stopAgent();
  expect(takeComplaints()).toEqual([]);
});

const drain = async (): Promise<void> => {
  await act(async () => {
    for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
  });
};

async function restore(workspace: WorkspaceCreated): Promise<void> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ConnectFlowProvider restoredWorkspace={workspace}>
        <CanvasCentre />
      </ConnectFlowProvider>,
    );
  });
  unmount = async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    unmount = () => Promise.resolve();
  };
}

async function answerDocument(): Promise<void> {
  await act(async () => {
    main.location.resolve();
    for (const answer of main.snapshots) answer.resolve({ doc: main.doc });
  });
  await drain();
  await act(async () => {
    for (const answer of main.snapshots) answer.resolve({ doc: main.doc });
  });
  await drain();
}

async function answerChat(): Promise<void> {
  await act(async () => {
    for (const read of main.chatReads) read();
  });
  await drain();
}

describe('reopening a project at launch, before its document and chat have landed', () => {
  it('never paints the ready canvas over a blank project that has objects', async () => {
    main.doc = docWith({ f1: FRAME });
    main.hasUserMessage = true;
    await restore(BLANK);
    expect(useWorkspaceStore.getState().workspace?.origin).toBe('blank');
    await answerDocument();
    await answerChat();
    expect(painted).toEqual(['nothing']);
  });

  it('never paints the ready canvas over a blank project whose chat holds a message and whose canvas is empty', async () => {
    main.doc = docWith({});
    main.hasUserMessage = true;
    await restore(BLANK);
    await answerDocument();
    await answerChat();
    expect(painted).toEqual(['nothing', 'quiet']);
  });

  it('never paints the plain illustration over an imported project that has objects', async () => {
    main.doc = docWith({ f1: FRAME });
    main.hasUserMessage = false;
    await restore(IMPORTED);
    await answerDocument();
    await answerChat();
    expect(painted).toEqual(['nothing']);
  });

  it('offers the ideas once a blank project is known to be empty and unspoken', async () => {
    main.doc = docWith({});
    main.hasUserMessage = false;
    await restore(BLANK);
    await answerDocument();
    await answerChat();
    expect(painted).toEqual(['nothing', 'ideas']);
  });
});
