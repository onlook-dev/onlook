import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot, RunIntent, ServerEntryState, StudioBridge, WorkspaceCreated } from '@studio/events';
import { deferred } from '../testing/bridge.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { deriveRunControl, useServerStore } from '../server/store.js';
import { useRunFeedbackStore } from '../server/runFeedbackStore.js';
import { reportProjectRunIntent } from './runControl.js';
import { askProjectSetup, connectProjectSetup, resetProjectSetup, selectProjectSetupReadFailed, selectProjectSetupSnapshot, useProjectSetupStore, type SnapshotRead } from './store.js';
import { setupSnapshot } from './fixtures.test-support.js';

const WORKSPACE: WorkspaceCreated = {
  workspacePath: '/workspace/project', workspaceName: 'project', sourcePath: '/source/project',
  sourceRepoRoot: '/source/project', sourceRepoName: 'project', repoIdentity: 'project',
  baseBranch: 'main', branchName: 'studio/project', copiedEnvFiles: [],
};

let dispose: (() => void) | undefined;

beforeEach(() => {
  resetProjectSetup();
  useServerStore.getState().clearStopPressed();
  useServerStore.getState().apply({ entries: [], pending: false });
  useWorkspaceStore.setState({ workspace: WORKSPACE, session: { kind: 'none' }, run: 0 });
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  resetProjectSetup();
  useServerStore.getState().clearStopPressed();
});

describe('project setup snapshot read lifecycle', () => {
  it('derives existing UI props from every read state', () => {
    const snapshot = setupSnapshot();
    const cases: { read: SnapshotRead; snapshot: ProjectSetupSnapshot | null; readFailed: boolean }[] = [
      { read: { kind: 'unloaded' }, snapshot: null, readFailed: false },
      { read: { kind: 'reading' }, snapshot: null, readFailed: false },
      { read: { kind: 'ready', snapshot }, snapshot, readFailed: false },
      { read: { kind: 'failed' }, snapshot: null, readFailed: true },
    ];
    for (const expected of cases) {
      useProjectSetupStore.setState({ read: expected.read });
      const state = useProjectSetupStore.getState();
      expect(selectProjectSetupSnapshot(state)).toBe(expected.snapshot);
      expect(selectProjectSetupReadFailed(state)).toBe(expected.readFailed);
    }
  });

  it('moves from unloaded through reading to ready on a successful read', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    const snapshot = setupSnapshot();
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'unloaded' });
    dispose = connectProjectSetup({
      onProjectSetupChanged: () => {
        expect(useProjectSetupStore.getState().read).toEqual({ kind: 'reading' });
        return () => undefined;
      },
      projectSetupRead: () => initial.promise,
    });
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'reading' });
    initial.settle(snapshot);
    await initial.promise;
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
  });

  it('keeps a broadcast received during subscription ahead of the initial read', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    const snapshot = setupSnapshot('installing');
    dispose = connectProjectSetup({
      onProjectSetupChanged: (listener) => { listener(snapshot); return () => undefined; },
      projectSetupRead: () => initial.promise,
    });
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
    initial.settle(setupSnapshot());
    await initial.promise;
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
  });

  it('does not replace a broadcast with a rejected initial read', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; },
      projectSetupRead: () => initial.promise,
    });
    const snapshot = setupSnapshot('installing');
    push(snapshot);
    initial.refuse(new Error('unavailable'));
    await initial.promise.catch(() => undefined);
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
    expect(selectProjectSetupReadFailed(useProjectSetupStore.getState())).toBe(false);
  });

  it('leaves an active project reading when the previous project read rejects', async () => {
    const first = deferred<ProjectSetupSnapshot>();
    const second = deferred<ProjectSetupSnapshot>();
    let reads = 0;
    dispose = connectProjectSetup({
      onProjectSetupChanged: () => () => undefined,
      projectSetupRead: () => (++reads === 1 ? first.promise : second.promise),
    });
    useWorkspaceStore.getState().setWorkspace({ ...WORKSPACE, workspacePath: '/workspace/other' });
    first.refuse(new Error('previous project unavailable'));
    await first.promise.catch(() => undefined);
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'reading' });
    const snapshot = setupSnapshot('running');
    second.settle(snapshot);
    await second.promise;
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
  });

  it('stays unloaded when switching away during a read and ignores its late rejection and subscription', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    let reads = 0;
    dispose = connectProjectSetup({
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; },
      projectSetupRead: () => { reads += 1; return initial.promise; },
    });
    useWorkspaceStore.setState((state) => ({ run: state.run + 1, session: { kind: 'opening', covered: true } }));
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'unloaded' });
    expect(reads).toBe(1);
    initial.refuse(new Error('previous project unavailable'));
    await initial.promise.catch(() => undefined);
    push(setupSnapshot('failed'));
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'unloaded' });
  });
});

describe('project setup connection', () => {
  it('reports pre-server setup failure and clears feedback on terminal recovery and teardown', () => {
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({
      projectSetupRead: () => new Promise(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; },
    });
    reportProjectRunIntent(false, true, [], [], { serverIntent: () => undefined });
    push(setupSnapshot('failed'));
    expect(useRunFeedbackStore.getState().notice).toBe('start-failed');
    push(setupSnapshot('running'));
    expect(useRunFeedbackStore.getState().notice).toBeUndefined();
    reportProjectRunIntent(false, true, [], [], { serverIntent: () => undefined });
    push(setupSnapshot('failed'));
    dispose();
    dispose = undefined;
    expect(useRunFeedbackStore.getState().notice).toBeUndefined();
  });
  it('subscribes before reading and does not replace a newer update with the initial read', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    let subscribed = false;
    dispose = connectProjectSetup({
      onProjectSetupChanged: (listener) => { push = listener; subscribed = true; return () => undefined; },
      projectSetupRead: () => { expect(subscribed).toBe(true); return initial.promise; },
    });
    const latest = setupSnapshot('installing');
    push(latest);
    initial.settle(setupSnapshot());
    await initial.promise;
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot: latest });
  });

  it('resets immediately on project changes and ignores the previous project read and subscription', async () => {
    const first = deferred<ProjectSetupSnapshot>();
    const second = deferred<ProjectSetupSnapshot>();
    const callbacks: ((snapshot: ProjectSetupSnapshot) => void)[] = [];
    let reads = 0;
    dispose = connectProjectSetup({
      onProjectSetupChanged: (listener) => { callbacks.push(listener); return () => undefined; },
      projectSetupRead: () => (++reads === 1 ? first.promise : second.promise),
    });
    callbacks[0]!(setupSnapshot('failed'));
    useWorkspaceStore.getState().setWorkspace({ ...WORKSPACE, workspacePath: '/workspace/other' });
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'reading' });
    expect(useProjectSetupStore.getState().ask).toBe('idle');
    first.settle(setupSnapshot('failed'));
    await first.promise;
    callbacks[0]!(setupSnapshot('failed'));
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'reading' });
    second.settle(setupSnapshot('running'));
    await second.promise;
    expect(selectProjectSetupSnapshot(useProjectSetupStore.getState())?.state).toBe('running');
  });

  it('clears tab state on switch and cleanup, discarding late reads', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    let unsubscribed = 0;
    dispose = connectProjectSetup({ projectSetupRead: () => initial.promise,
      onProjectSetupChanged: () => () => { unsubscribed += 1; } });
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot('failed') } });
    useWorkspaceStore.setState((state) => ({ run: state.run + 1, session: { kind: 'opening', covered: true } }));
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'unloaded' });
    expect(unsubscribed).toBe(1);
    dispose();
    dispose = undefined;
    initial.settle(setupSnapshot());
    await initial.promise;
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'unloaded' });
  });

  it('reports read failures without losing a newer emitted snapshot', async () => {
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({ projectSetupRead: () => Promise.reject(new Error('unavailable')),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; } });
    await Promise.resolve();
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'failed' });
    expect(selectProjectSetupReadFailed(useProjectSetupStore.getState())).toBe(true);
    const snapshot = setupSnapshot();
    push(snapshot);
    expect(useProjectSetupStore.getState().read).toEqual({ kind: 'ready', snapshot });
    expect(selectProjectSetupReadFailed(useProjectSetupStore.getState())).toBe(false);
  });

  it('allows immediate Start after stopping preparation or installation before any server report', () => {
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({ projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; } });
    for (const preparingState of ['preparing', 'installing'] as const) {
      for (const terminalState of ['idle', 'failed', 'running'] as const) {
        const intents: RunIntent[] = [];
        const bridge = { serverIntent: (intent: RunIntent) => { intents.push(intent); } };
        push(setupSnapshot(preparingState));
        useServerStore.getState().markStopPressed();
        reportProjectRunIntent(true, true, [], [], bridge);
        push(setupSnapshot('stopping'));
        expect(useServerStore.getState().stopPressed).toBe(true);
        push(setupSnapshot(terminalState));
        const state = useServerStore.getState();
        const runState = deriveRunControl(state.entries, state.pending, [], state.stopPressed).runState;
        expect(state.stopPressed).toBe(false);
        expect(runState).toBe('idle');
        reportProjectRunIntent(runState !== 'idle', true, state.entries, [], bridge);
        expect(intents).toEqual([{ press: 'stop' }, { press: 'start' }]);
      }
    }
  });

  it('does not settle optimistic Stop on a nonterminal or unsaved setup event', () => {
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({ projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; } });
    useServerStore.getState().markStopPressed();
    for (const state of ['preparing', 'installing', 'starting', 'stopping'] as const) {
      push(setupSnapshot(state));
      expect(useServerStore.getState().stopPressed).toBe(true);
    }
    push({ ...setupSnapshot(), saved: null });
    expect(useServerStore.getState().stopPressed).toBe(true);
  });

  it('does not let a stale initial terminal read settle a newer preparation Stop', async () => {
    const initial = deferred<ProjectSetupSnapshot>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({ projectSetupRead: () => initial.promise,
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; } });
    push(setupSnapshot('installing'));
    useServerStore.getState().markStopPressed();
    initial.settle(setupSnapshot());
    await initial.promise;
    expect(selectProjectSetupSnapshot(useProjectSetupStore.getState())?.state).toBe('installing');
    expect(useServerStore.getState().stopPressed).toBe(true);
  });

  it('settles only the optimistic latch and preserves main-measured stopping state', () => {
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({ projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; } });
    const stopping: ServerEntryState = { entryId: 'web', folderName: 'web', ownership: 'agent-started',
      status: 'stopping', everMeasuredLive: true,
      ports: [{ port: 3000, origin: 'http://localhost:3000', measured: 'live', everLive: true }] };
    useServerStore.getState().apply({ entries: [stopping], pending: false });
    for (const terminalState of ['idle', 'failed', 'running'] as const) {
      useServerStore.getState().markStopPressed();
      push(setupSnapshot(terminalState));
      const state = useServerStore.getState();
      expect(state.entries).toEqual([stopping]);
      expect(state.pending).toBe(false);
      expect(state.stopPressed).toBe(false);
      expect(deriveRunControl(state.entries, state.pending, ['http://localhost:3000'], state.stopPressed).runState).toBe('stopping');
    }
  });

  it('ignores old-project, switching and closed terminal events when settling Stop', () => {
    const callbacks: ((snapshot: ProjectSetupSnapshot) => void)[] = [];
    dispose = connectProjectSetup({ projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { callbacks.push(listener); return () => undefined; } });
    useWorkspaceStore.getState().setWorkspace({ ...WORKSPACE, workspacePath: '/workspace/other' });
    useServerStore.getState().markStopPressed();
    callbacks[0]!(setupSnapshot());
    expect(useServerStore.getState().stopPressed).toBe(true);
    callbacks[1]!(setupSnapshot());
    expect(useServerStore.getState().stopPressed).toBe(false);
    useServerStore.getState().markStopPressed();
    useWorkspaceStore.setState((state) => ({ run: state.run + 1, session: { kind: 'opening', covered: true } }));
    callbacks[1]!(setupSnapshot('failed'));
    expect(useServerStore.getState().stopPressed).toBe(true);
    dispose();
    dispose = undefined;
    callbacks[1]!(setupSnapshot('running'));
    expect(useServerStore.getState().stopPressed).toBe(true);
  });
});

describe('explicit agent requests from Project settings', () => {
  it('keeps delivery attached to the same script and failure across broadcasts', async () => {
    const result = deferred<Awaited<ReturnType<StudioBridge['projectSetupAsk']>>>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({
      projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; },
    });
    push(setupSnapshot('failed'));
    const sending = askProjectSetup({ projectSetupAsk: () => result.promise });
    push(setupSnapshot('failed'));
    expect(useProjectSetupStore.getState().ask).toBe('sending');
    result.settle({ ok: true });
    await sending;
    expect(useProjectSetupStore.getState().ask).toBe('sent');
    push(setupSnapshot('failed'));
    expect(useProjectSetupStore.getState().ask).toBe('sent');
  });

  it('ignores pending delivery when a broadcast retires its failure', async () => {
    const result = deferred<Awaited<ReturnType<StudioBridge['projectSetupAsk']>>>();
    let push!: (snapshot: ProjectSetupSnapshot) => void;
    dispose = connectProjectSetup({
      projectSetupRead: () => new Promise<ProjectSetupSnapshot>(() => undefined),
      onProjectSetupChanged: (listener) => { push = listener; return () => undefined; },
    });
    push(setupSnapshot('failed'));
    const sending = askProjectSetup({ projectSetupAsk: () => result.promise });
    push(setupSnapshot('running'));
    expect(useProjectSetupStore.getState().ask).toBe('idle');
    result.settle({ ok: false, reason: 'busy' });
    await sending;
    expect(useProjectSetupStore.getState().ask).toBe('idle');
  });

  it('treats a request that is no longer applicable as idle rather than unavailable', async () => {
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot('failed') } });
    await askProjectSetup({ projectSetupAsk: async () => ({ ok: false, reason: 'not-applicable' }) });
    expect(useProjectSetupStore.getState().ask).toBe('idle');
  });

  it('requires something to ask for, and coalesces a double press while delivery is pending', async () => {
    const result = deferred<Awaited<ReturnType<StudioBridge['projectSetupAsk']>>>();
    let calls = 0;
    const bridge = { projectSetupAsk: () => { calls += 1; return result.promise; } };
    await askProjectSetup(bridge);
    expect(calls).toBe(0);
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot('failed') } });
    const sending = askProjectSetup(bridge);
    await askProjectSetup(bridge);
    expect(calls).toBe(1);
    expect(useProjectSetupStore.getState().ask).toBe('sending');
    result.settle({ ok: true });
    await sending;
    expect(useProjectSetupStore.getState().ask).toBe('sent');
  });

  it('retains evidence and exposes busy or unavailable delivery', async () => {
    for (const reason of ['busy', 'unavailable'] as const) {
      const snapshot = setupSnapshot('failed');
      useProjectSetupStore.setState({ read: { kind: 'ready', snapshot }, ask: 'idle' });
      await askProjectSetup({ projectSetupAsk: async () => ({ ok: false, reason }) });
      expect(useProjectSetupStore.getState().ask).toBe(reason);
      expect(selectProjectSetupSnapshot(useProjectSetupStore.getState())).toBe(snapshot);
    }
  });

  it('does not deliver a previous project refusal into a new project', async () => {
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot('failed') } });
    const result = deferred<Awaited<ReturnType<StudioBridge['projectSetupAsk']>>>();
    const sending = askProjectSetup({ projectSetupAsk: () => result.promise });
    resetProjectSetup();
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot() } });
    result.settle({ ok: false, reason: 'busy' });
    await sending;
    expect(useProjectSetupStore.getState().ask).toBe('idle');
  });

  it('treats rejected delivery as unavailable and retains the failure', async () => {
    const snapshot = setupSnapshot('failed');
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot } });
    await askProjectSetup({ projectSetupAsk: async () => { throw new Error('disconnected'); } });
    expect(useProjectSetupStore.getState().ask).toBe('unavailable');
    expect(selectProjectSetupSnapshot(useProjectSetupStore.getState())).toBe(snapshot);
  });

  it('asks for a first script on a project with none, and for nothing on a working one', async () => {
    let calls = 0;
    const bridge = { projectSetupAsk: async () => { calls += 1; return { ok: true } as const; } };
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: { saved: null, verified: null, state: 'idle', failure: null } }, ask: 'idle' });
    await askProjectSetup(bridge);
    expect(calls).toBe(1);
    expect(useProjectSetupStore.getState().ask).toBe('sent');
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: setupSnapshot('running') }, ask: 'idle' });
    await askProjectSetup(bridge);
    expect(calls).toBe(1);
    expect(useProjectSetupStore.getState().ask).toBe('idle');
  });
});
