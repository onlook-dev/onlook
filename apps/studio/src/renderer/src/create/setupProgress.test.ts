import { afterEach, describe, expect, it } from 'bun:test';
import type { ProjectCreateState, ProjectSetupSnapshot, WorkspaceCreated } from '@studio/events';
import { FRAME_NODE_TYPE, type CanvasFlowNode } from '../canvas/model.js';
import { useCanvasStore } from '../canvas/store.js';
import { useProjectSetupStore } from '../project-setup/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { useProjectCreateStore } from './projectCreate.js';
import { connectSetupLanding, landingFacts, projectSetupProgress } from './setupProgress.js';

const imported = { workspacePath: '/w/halde-site', sourceRepoName: 'halde-site', repoIdentity: 'r1' } as WorkspaceCreated;
const otherImport = { workspacePath: '/w/silt', sourceRepoName: 'silt', repoIdentity: 'r2' } as WorkspaceCreated;
const draft = { workspacePath: '/w/amber-heron', sourceRepoName: 'amber-heron', repoIdentity: 'r3', origin: 'blank' } as WorkspaceCreated;
const heldDraft = { workspacePath: '/w/still-pond', sourceRepoName: 'still-pond', repoIdentity: 'r4', heldOrigin: 'blank' } as WorkspaceCreated;

const saved = { revision: 'r1', definition: { prepare: '', install: { script: 'npm i', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 5173 }] } };
const machine = (state: ProjectSetupSnapshot['state']): ProjectSetupSnapshot => ({ saved, verified: null, state, failure: null });
const failedStart: ProjectSetupSnapshot = {
  saved,
  verified: null,
  state: 'failed',
  failure: { revision: 'r1', stage: 'start', command: 'npm run dev', reason: 'The command exited with code 1.', outputTail: 'Error: port taken', elapsedMs: 10 },
};
const noFrames = { liveFramePorts: [] };
const liveOf = (workspace: WorkspaceCreated): ProjectCreateState => ({ kind: 'live', workspace });

describe('a blank draft hides only its initial starter progress', () => {
  it('shows nothing though the tab still holds an earlier import that went live', () => {
    expect(projectSetupProgress(draft, { create: liveOf(imported), snapshot: null, canvas: noFrames })).toBeNull();
  });

  it('shows nothing for the draft\'s own server starting, running or failing', () => {
    for (const snapshot of [machine('starting'), machine('installing'), failedStart].map((snapshot) => ({ ...snapshot, saved: null }))) {
      expect(projectSetupProgress(draft, { create: null, snapshot, canvas: noFrames })).toBeNull();
      expect(projectSetupProgress(heldDraft, { create: null, snapshot, canvas: noFrames })).toBeNull();
    }
  });

  it('shows nothing for a setup turn running in the draft', () => {
    const turn = { steps: [{ id: 'find' as const, status: 'done' as const }, { id: 'install' as const, status: 'done' as const }, { id: 'start' as const, status: 'done' as const }, { id: 'canvas' as const, status: 'running' as const }], outcome: 'running' as const };
    expect(projectSetupProgress(draft, { create: null, turn, snapshot: { ...machine('running'), saved: null }, canvas: noFrames })).toBeNull();
  });

  it('shows saved setup reruns and failures for blank and held blank projects', () => {
    for (const workspace of [draft, heldDraft]) {
      expect(projectSetupProgress(workspace, { create: null, snapshot: machine('installing'), canvas: noFrames })).toEqual({ state: 'running', at: 2 });
      expect(projectSetupProgress(workspace, { create: null, snapshot: machine('starting'), canvas: noFrames })).toEqual({ state: 'running', at: 3 });
      expect(projectSetupProgress(workspace, { create: null, snapshot: failedStart, canvas: noFrames })).toMatchObject({ state: 'failed', at: 3, failure: { stage: 'start' } });
      expect(projectSetupProgress(workspace, { create: null, snapshot: machine('running'), canvas: noFrames })).toBeNull();
      expect(projectSetupProgress(workspace, { create: null, snapshot: machine('idle'), canvas: noFrames })).toBeNull();
    }
  });
});

describe('an imported project keeps its setup progress', () => {
  it('waits on opening the app until its Frame is live, then is up', () => {
    expect(projectSetupProgress(imported, { create: liveOf(imported), snapshot: machine('running'), canvas: noFrames })).toEqual({ state: 'running', at: 4 });
    expect(projectSetupProgress(imported, { create: liveOf(imported), snapshot: machine('running'), canvas: { liveFramePorts: [5173] } })).toEqual({ state: 'up', at: 4 });
  });

  it('shows the import while it copies, before any project is open', () => {
    expect(projectSetupProgress(null, { create: { kind: 'copying', sourceRepoName: 'halde-site', workspaceName: 'halde-site' }, snapshot: null })).toEqual({ state: 'running', at: 1 });
  });

  it('follows a saved-setup rerun after the import', () => {
    expect(projectSetupProgress(imported, { create: null, snapshot: machine('starting'), canvas: noFrames })).toEqual({ state: 'running', at: 3 });
  });

  it("reads another project's import in the same tab as no import of this one", () => {
    expect(projectSetupProgress(otherImport, { create: liveOf(imported), snapshot: machine('running'), canvas: noFrames })).toBeNull();
    expect(projectSetupProgress(otherImport, { create: liveOf(imported), snapshot: machine('starting'), canvas: noFrames })).toEqual({ state: 'running', at: 3 });
  });
});

describe("an import's landing on the canvas", () => {
  const initial = {
    canvas: useCanvasStore.getState(),
    setup: useProjectSetupStore.getState(),
    workspace: useWorkspaceStore.getState(),
    create: useProjectCreateStore.getState(),
  };
  let disconnect = (): void => undefined;
  afterEach(() => {
    disconnect();
    useCanvasStore.setState(initial.canvas, true);
    useProjectSetupStore.setState(initial.setup, true);
    useWorkspaceStore.setState(initial.workspace, true);
    useProjectCreateStore.setState(initial.create, true);
  });

  const appFrame = (health: 'live' | 'loading'): CanvasFlowNode => ({
    id: 'f1',
    type: FRAME_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { homeUrl: 'http://localhost:5173/', name: 'f1', currentUrl: 'http://localhost:5173/', health, title: '', canGoBack: false, canGoForward: false },
  });
  const progress = (record: ProjectCreateState | null) => projectSetupProgress(imported, { create: record, snapshot: machine('running'), canvas: noFrames, ...landingFacts(useProjectCreateStore.getState().landing, record) });

  it("is remembered once the app's Frame is live, and outlasts the Frame reloading", () => {
    disconnect = connectSetupLanding();
    useWorkspaceStore.setState({ workspace: imported });
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: machine('running') } });
    const record = liveOf(imported);
    useProjectCreateStore.getState().set(record);
    useCanvasStore.setState({ nodes: [appFrame('loading')] });
    expect(useProjectCreateStore.getState().landing).toBeUndefined();
    useCanvasStore.setState({ nodes: [appFrame('live')] });
    expect(useProjectCreateStore.getState().landing?.record).toBe(record);
    useCanvasStore.setState({ nodes: [appFrame('loading')] });
    expect(progress(record)).toBeNull();
  });

  it('belongs to the record that landed, not the next import', () => {
    disconnect = connectSetupLanding();
    useWorkspaceStore.setState({ workspace: imported });
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: machine('running') } });
    useProjectCreateStore.getState().set(liveOf(imported));
    useCanvasStore.setState({ nodes: [appFrame('live')] });
    expect(useProjectCreateStore.getState().landing).toBeDefined();
    const next: ProjectCreateState = { kind: 'planning', sourceRepoName: 'silt' };
    useProjectCreateStore.getState().set(next);
    expect(landingFacts(useProjectCreateStore.getState().landing, next)).toStrictEqual({});
  });
});
