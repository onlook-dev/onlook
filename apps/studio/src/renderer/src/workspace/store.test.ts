import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { WorkspaceCreated } from '@studio/events';
import { isForeignSession } from '../chat/useAgentSession.js';
import { canvasImageProjectRoot, sessionCovered, subscribeToWorkspaceCreated, useWorkspaceStore } from './store.js';

const WORKSPACE: WorkspaceCreated = {
  workspacePath: '/ws/a',
  workspaceName: 'a-1',
  branchName: 'studio/a-1',
  baseBranch: 'main',
  sourceRepoName: 'a',
  sourcePath: '/src/a',
  sourceRepoRoot: '/src/a',
  repoIdentity: 'id-a',
  copiedEnvFiles: [],
};

const OTHER: WorkspaceCreated = {
  workspacePath: '/ws/b',
  workspaceName: 'b-1',
  branchName: 'studio/b-1',
  baseBranch: 'main',
  sourceRepoName: 'b',
  sourcePath: '/src/b',
  sourceRepoRoot: '/src/b',
  repoIdentity: 'id-b',
  copiedEnvFiles: [],
};

describe('canvas images belong to the project teardown namespace (ONL-2568)', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspace: null });
  });

  it('uses the Studio worktree rather than the source repository', () => {
    useWorkspaceStore.getState().setWorkspace(WORKSPACE);
    expect(canvasImageProjectRoot()).toBe('/ws/a');
    expect(canvasImageProjectRoot()).not.toBe(WORKSPACE.sourceRepoRoot);
  });

  it('reads the current project at gesture time, including siblings of one repository', () => {
    useWorkspaceStore.getState().setWorkspace(WORKSPACE);
    expect(canvasImageProjectRoot()).toBe('/ws/a');
    useWorkspaceStore.getState().setWorkspace({ ...WORKSPACE, workspacePath: '/ws/a-two' });
    expect(canvasImageProjectRoot()).toBe('/ws/a-two');
  });

  it('offers no namespace after the project closes', () => {
    useWorkspaceStore.getState().setWorkspace(WORKSPACE);
    useWorkspaceStore.setState({ workspace: null });
    expect(canvasImageProjectRoot()).toBeUndefined();
  });
});

function fakeBridge(): { install: () => void; announce: (workspace: WorkspaceCreated) => void } {
  let listener: ((workspace: WorkspaceCreated) => void) | undefined;
  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', {
        value: {
          studio: {
            onWorkspaceCreated(next: (workspace: WorkspaceCreated) => void): () => void {
              listener = next;
              return () => undefined;
            },
          },
        },
        configurable: true,
        writable: true,
      });
    },
    announce(workspace): void {
      listener?.(workspace);
    },
  };
}

describe('the cover over a landing (ONL-2139)', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspace: null, session: { kind: 'none' }, run: 0 });
  });

  it('is up only while a covered open is in flight', () => {
    expect(sessionCovered(useWorkspaceStore.getState())).toBe(false);
    useWorkspaceStore.setState({ session: { kind: 'opening', covered: true } });
    expect(sessionCovered(useWorkspaceStore.getState())).toBe(true);
    useWorkspaceStore.setState({ session: { kind: 'opening', covered: false } });
    expect(sessionCovered(useWorkspaceStore.getState())).toBe(false);
    useWorkspaceStore.setState({ session: { kind: 'open', workspacePath: '/ws/a' } });
    expect(sessionCovered(useWorkspaceStore.getState())).toBe(false);
  });

  it('the incoming project arriving does not lower it — the session does', () => {
    useWorkspaceStore.setState({ session: { kind: 'opening', covered: true } });
    useWorkspaceStore.getState().setWorkspace(WORKSPACE);
    expect(useWorkspaceStore.getState().workspace).toBe(WORKSPACE);
    expect(sessionCovered(useWorkspaceStore.getState())).toBe(true);
  });
});

describe("the store feeds ChatRegion's identity gate", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspace: null, session: { kind: 'none' }, run: 0 });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it("turns this tab's own session foreign if another project's announcement reaches it", () => {
    const bridge = fakeBridge();
    bridge.install();
    const unsubscribe = subscribeToWorkspaceCreated();
    bridge.announce(WORKSPACE);

    bridge.announce(OTHER);

    const expectedCwd = useWorkspaceStore.getState().workspace?.workspacePath;
    expect(expectedCwd).toBe(OTHER.workspacePath);
    expect(isForeignSession({ expectedCwd, sessionCwd: WORKSPACE.workspacePath })).toBe(true);

    unsubscribe();
  });
});
