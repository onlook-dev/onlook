import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot, ServerBookState, ServerEntryState } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { createReverifyMoveAuthor } from '../canvas/authors.js';
import {
  createServerEntry,
  recordPortMeasurement,
  resetServerBookCache,
  serverBookEntries,
} from './book.js';
import {
  createServerHost,
  createServerIntentHandler,
  type ServerHost,
  type ServerHostDeps,
  studioStarterEntry,
  type StarterControl,
} from './index.js';
import type { ListenerIdentity } from './owner.js';
import { noteServerStart, observeServerStop, serverWasStopped } from './user-stop.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

/** The monitor suite's macrotask schedule — a microtask delay wedges the loop. */
const immediately = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor(condition: () => boolean, what: string): Promise<void> {
  for (let turn = 0; turn < 5_000; turn += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`timed out waiting for ${what}`);
}

interface World {
  root: string;
  worktree: string;
  sourceRepo: string;
}

function makeWorld(name: string): World {
  const root = makeWorkspaceRoot({ name: `server-host-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  const worktree = join(root, 'shop', 'main');
  const sourceRepo = join(root, '..', `server-host-${name}-source`);
  mkdirSync(worktree, { recursive: true });
  mkdirSync(sourceRepo, { recursive: true });
  return { root, worktree, sourceRepo };
}

interface Machine {
  listeners: Map<number, ListenerIdentity>;
}

interface Addressed {
  worktree: string;
  state: ServerBookState;
}

function makeHost(
  world: World,
  machine: Machine,
  overrides: Partial<ServerHostDeps> = {},
): { host: ServerHost; emitted: ServerBookState[]; addressed: Addressed[] } {
  const emitted: ServerBookState[] = [];
  const addressed: Addressed[] = [];
  const host = createServerHost({
    emit: (worktree, state) => {
      addressed.push({ worktree, state });
      emitted.push(state);
    },
    createPortFollow: () => ({ observed: () => undefined }),
    authorPortMove: () => undefined,
    attributionRoots: () => ({ workspaceRoot: world.root, sourceRepoRoot: world.sourceRepo }),
    isBlankProject: () => true,
    probe: async (port) => machine.listeners.has(port),
    identify: async (port) => machine.listeners.get(port),
    signalProcess: () => undefined,
    delay: immediately,
    timing: { runningFailures: 1, waitingAttempts: 3 },
    ...overrides,
  });
  return { host, emitted, addressed };
}

function lastEntry(emitted: ServerBookState[]): ServerEntryState | undefined {
  return emitted.at(-1)?.entries[0];
}

function lastFor(addressed: Addressed[], worktree: string): ServerBookState | undefined {
  return addressed.filter((one) => one.worktree === worktree).at(-1)?.state;
}

describe('saved setup direct controls', () => {
  it('records user Stop and interrupts before signaling an agent-owned listener, then Start clears the intent', async () => {
    const world = makeWorld('stop-before-exit');
    const order: string[] = [];
    const machine = { listeners: new Map([[49000, { pid: 30201, cwd: world.worktree }]]) };
    const { host } = makeHost(world, machine, {
      signalProcess: () => { order.push('signal'); machine.listeners.clear(); },
    });
    observeServerStop((cwd) => { expect(serverWasStopped(cwd)).toBe(true); order.push('interrupt'); });
    try {
      await host.openProject(world.worktree);
      await host.report(world.worktree, world.worktree, 49000);
      host.press({ press: 'stop' }, world.worktree);
      await waitFor(() => order.includes('signal'), 'the server signal');
      expect(order).toEqual(['interrupt', 'signal']);
      host.press({ press: 'start' }, world.worktree);
      expect(serverWasStopped(world.worktree)).toBe(false);
    } finally {
      observeServerStop(() => undefined);
      noteServerStart(world.worktree);
      host.dispose();
    }
  });

  it('preserves a newly active Project while the previous close awaits setup Stop', async () => {
    for (const rejected of [false, true]) {
      const world = makeWorld(`close-switch-${rejected}`);
      const other = join(world.root, 'shop', 'other');
      mkdirSync(other);
      const calls: string[] = [];
      const snapshot: ProjectSetupSnapshot = { saved: null, verified: null, failure: null, state: 'idle' };
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => { release = resolve; });
      const { host, addressed } = makeHost(world, { listeners: new Map() }, {
        setup: {
          read: () => snapshot,
          ownsPort: () => false,
          serverIdsForPorts: () => [],
          run: async (cwd) => {
            calls.push(cwd);
            if (cwd === world.worktree) {
              await held;
              if (rejected) throw new Error('setup Stop rejected');
            }
            return { ok: true, snapshot };
          },
        },
      });
      try {
        await host.openProject(world.worktree);
        const closing = host.closeProject(world.worktree);
        await waitFor(() => calls.length === 1, 'previous Project Stop pending');
        await host.openProject(other);
        release();
        await closing;
        await host.closeProject();
        expect(calls).toEqual([world.worktree, other]);
        expect(lastFor(addressed, other)).toEqual({ entries: [], pending: false });
      } finally { release(); host.dispose(); }
    }
  });

  it('tears down seats and closes the active project when setup stop rejects', async () => {
    const world = makeWorld('rejected-project-stop');
    const calls: string[] = [];
    const snapshot: ProjectSetupSnapshot = { saved: null, verified: null, failure: null, state: 'idle' };
    const { host, emitted } = makeHost(world, { listeners: new Map([[49000, { pid: 30201, cwd: world.worktree }]]) }, {
      setup: {
        read: () => snapshot,
        ownsPort: () => false,
        serverIdsForPorts: () => [],
        run: async (cwd) => { calls.push(cwd); throw new Error('unregistered project'); },
      },
    });
    try {
      await host.openProject(world.worktree);
      await host.report(world.worktree, world.worktree, 49000);
      await waitFor(() => lastEntry(emitted)?.status === 'running', 'registered seat running');
      await host.closeProject(world.worktree);
      expect(emitted.at(-1)).toEqual({ entries: [], pending: false });
      expect(host.snapshotFor(world.worktree).entries[0]?.status).toBe('stopped');
      await host.closeProject();
      expect(calls).toEqual([world.worktree]);
      await host.openProject(world.worktree);
      await waitFor(() => lastEntry(emitted)?.status === 'running', 'reopened seat running');
    } finally { host.dispose(); }
  });

  it('tears down a background workspace when setup stop rejects without closing the active project', async () => {
    const world = makeWorld('rejected-workspace-stop');
    const other = join(world.root, 'shop', 'other');
    mkdirSync(other);
    const calls: string[] = [];
    const snapshot: ProjectSetupSnapshot = { saved: null, verified: null, failure: null, state: 'idle' };
    const { host, emitted } = makeHost(world, { listeners: new Map([[49000, { pid: 30201, cwd: world.worktree }]]) }, {
      setup: {
        read: () => snapshot,
        ownsPort: () => false,
        serverIdsForPorts: () => [],
        run: async (cwd) => { calls.push(cwd); throw new Error('unregistered project'); },
      },
    });
    try {
      await host.openProject(world.worktree);
      await host.report(world.worktree, world.worktree, 49000);
      await waitFor(() => lastEntry(emitted)?.status === 'running', 'background seat running');
      await host.openProject(other);
      const before = emitted.length;
      await host.closeWorkspace(world.worktree);
      expect(host.snapshotFor(world.worktree).entries[0]?.status).toBe('stopped');
      expect(emitted.length).toBe(before);
      await host.closeProject();
      expect(calls).toEqual([world.worktree, other]);
      expect(emitted.at(-1)).toEqual({ entries: [], pending: false });
    } finally { host.dispose(); }
  });

  it('stops old live runtime IDs after removal, rename or port change without a legacy double kill', async () => {
    for (const change of ['removed', 'renamed', 'port-changed'] as const) {
      for (const selection of ['singular', 'plural'] as const) {
        const world = makeWorld(`old-live-stop-${change}-${selection}`);
        const api = join(world.worktree, 'api');
        mkdirSync(api);
        const entry = createServerEntry(world.worktree, { folder: world.worktree, port: 49000, ownership: 'agent-started' });
        const currentServer = change === 'removed'
          ? { id: 'api', cwd: 'api', start: 'npm run dev', port: 49001 }
          : { id: change === 'renamed' ? 'new-web' : 'old-web', cwd: '.', start: 'npm run dev', port: change === 'port-changed' ? 49001 : 49000 };
        const snapshot: ProjectSetupSnapshot = { saved: { revision: 'changed', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [currentServer] } }, verified: null, failure: null, state: 'running' };
        const runs: { cwd: string; action: string; serverIds?: string[] }[] = [];
        const selections: { cwd: string; ports: readonly number[] }[] = [];
        const signals: number[] = [];
        let runtimeOwned = true;
        const { host } = makeHost(world, { listeners: new Map([[49000, { pid: 30201, cwd: world.worktree }]]) }, {
          setup: {
            read: () => snapshot,
            ownsPort: (cwd, port) => runtimeOwned && cwd === world.worktree && port === 49000,
            serverIdsForPorts: (cwd, ports) => {
              selections.push({ cwd, ports: [...ports] });
              return runtimeOwned && cwd === world.worktree && ports.includes(49000) ? ['old-web'] : [];
            },
            run: async (cwd, action) => {
              runs.push({ cwd, ...action });
              if (action.action === 'stop') runtimeOwned = false;
              return { ok: true, snapshot };
            },
          },
          signalProcess: (pid) => { signals.push(pid); },
        });
        try {
          await host.openProject(world.worktree);
          host.press(selection === 'singular' ? { press: 'stop', entryId: entry.id } : { press: 'stop', entryIds: [entry.id] }, world.worktree);
          await immediately();
          await immediately();
          expect(selections).toEqual([{ cwd: world.worktree, ports: [49000] }]);
          expect(runs).toEqual([{ cwd: world.worktree, action: 'stop', serverIds: ['old-web'] }]);
          expect(signals).toEqual([]);
        } finally { host.dispose(); }
      }
    }
  });

  it('rejects unmapped and unregistered IPC callers rather than controlling the active project', async () => {
    const world = makeWorld('intent-binding');
    const other = join(world.root, 'shop', 'other');
    mkdirSync(other);
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 49000 }] } }, verified: null, failure: null, state: 'idle' };
    const reads: string[] = [];
    const runs: string[] = [];
    const { host } = makeHost(world, { listeners: new Map() }, { setup: {
      read: (cwd) => { reads.push(cwd); return snapshot; },
      ownsPort: () => false,
      serverIdsForPorts: () => [],
      run: async (cwd) => { runs.push(cwd); return { ok: true, snapshot }; },
    } });
    const senders = new Map([[11, world.worktree], [22, other], [33, '/unregistered']]);
    const handle = createServerIntentHandler({
      workspaceOf: (senderId) => senders.get(senderId),
      registered: (cwd) => cwd === world.worktree || cwd === other,
      press: (intent, cwd) => host.press(intent, cwd),
    });
    try {
      await host.openProject(world.worktree);
      handle(99, { press: 'start' });
      handle(33, { press: 'stop' });
      expect(reads).toEqual([]);
      expect(runs).toEqual([]);
      handle(22, { press: 'start' });
      handle(11, { press: 'start' });
      expect(reads).toEqual([other, world.worktree]);
      expect(runs).toEqual([other, world.worktree]);
    } finally { host.dispose(); }
  });

  it('routes full, singular and plural Stops across runtime, legacy and starter owners without cross-project kills', async () => {
    for (const selection of ['all', 'runtime', 'legacy', 'starter', 'mixed'] as const) {
      const world = makeWorld(`mixed-stop-${selection}`);
      const web = join(world.worktree, 'web');
      const api = join(world.worktree, 'api');
      const foreign = join(world.worktree, 'foreign');
      const other = join(world.root, 'shop', 'other');
      for (const folder of [web, api, foreign, other]) mkdirSync(folder);
      const runtime = createServerEntry(world.worktree, { folder: web, port: 49000, ownership: 'agent-started' });
      const legacy = createServerEntry(world.worktree, { folder: api, port: 49001, ownership: 'agent-started' });
      const starterEntry = createServerEntry(world.worktree, { folder: world.worktree, port: 49002, ownership: 'studio-started' });
      createServerEntry(world.worktree, { folder: world.sourceRepo, port: 49003, ownership: 'users-own' });
      createServerEntry(world.worktree, { folder: foreign, port: 49004, ownership: 'agent-started' });
      createServerEntry(other, { folder: other, port: 49005, ownership: 'agent-started' });
      const snapshot: ProjectSetupSnapshot = { saved: { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: 'web', start: 'npm run dev', port: 49000 }, { id: 'api', cwd: 'api', start: 'npm run dev', port: 49001 }] } }, verified: null, failure: null, state: 'running' };
      const runs: { cwd: string; action: string; serverIds?: string[] }[] = [];
      const signals: number[] = [];
      const starters: string[] = [];
      let runtimeOwned = true;
      const { host } = makeHost(world, { listeners: new Map([
        [49000, { pid: 30101, cwd: web }],
        [49001, { pid: 30102, cwd: api }],
        [49002, { pid: 30103, cwd: world.worktree }],
        [49003, { pid: 30104, cwd: world.sourceRepo }],
        [49004, { pid: 30105, cwd: other }],
        [49005, { pid: 30106, cwd: other }],
      ]) }, {
        setup: {
          read: () => snapshot,
          ownsPort: (cwd, port) => runtimeOwned && cwd === world.worktree && port === 49000,
          serverIdsForPorts: (cwd, ports) => runtimeOwned && cwd === world.worktree && ports.includes(49000) ? ['web'] : [],
          run: async (cwd, action) => { runs.push({ cwd, ...action }); runtimeOwned = false; return { ok: true, snapshot }; },
        },
        signalProcess: (pid) => { signals.push(pid); },
        starter: {
          portFor: (cwd) => cwd === world.worktree ? 49002 : undefined,
          running: () => [world.worktree],
          stop: async (cwd) => { starters.push(cwd); },
          isPresent: () => true,
          spawn: async () => 49002,
        },
      });
      try {
        await host.openProject(other);
        await host.openProject(world.worktree);
        expect(starters).toEqual([]);
        expect(serverBookEntries(world.worktree).find((entry) => entry.id === runtime.id)?.ownership).toBe('agent-started');
        const intent = selection === 'all' ? { press: 'stop' as const }
          : selection === 'mixed' ? { press: 'stop' as const, entryIds: [runtime.id, legacy.id, starterEntry.id] }
          : selection === 'legacy' ? { press: 'stop' as const, entryIds: [legacy.id] }
          : { press: 'stop' as const, entryId: selection === 'runtime' ? runtime.id : starterEntry.id };
        host.press(intent, world.worktree);
        await immediately();
        await immediately();
        expect(runs).toEqual(selection === 'all' ? [{ cwd: world.worktree, action: 'stop' }]
          : selection === 'runtime' || selection === 'mixed' ? [{ cwd: world.worktree, action: 'stop', serverIds: ['web'] }] : []);
        const legacySelected = selection === 'all' || selection === 'mixed' || selection === 'legacy';
        expect(signals.length > 0).toBe(legacySelected);
        expect(signals.every((pid) => pid === 30102)).toBe(true);
        expect(starters).toEqual(selection === 'all' || selection === 'mixed' || selection === 'starter' ? [world.worktree] : []);
      } finally { host.dispose(); }
    }
  });

  it('maps entry ids to saved ids and never sends start discovery for saved commands', async () => {
    const world = makeWorld('saved-direct');
    const api = join(world.worktree, 'api');
    mkdirSync(api);
    const webEntry = createServerEntry(world.worktree, { folder: world.worktree, port: 49000, ownership: 'agent-started' });
    createServerEntry(world.worktree, { folder: api, port: 49001, ownership: 'agent-started' });
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 49000 }, { id: 'api', cwd: 'api', start: 'npm run dev', port: 49001 }] } }, verified: null, failure: null, state: 'idle' };
    const calls: { action: string; serverIds?: string[] }[] = [];
    const { host } = makeHost(world, { listeners: new Map() }, { setup: { read: () => snapshot, ownsPort: () => true, serverIdsForPorts: (_cwd, ports) => snapshot.saved!.definition.servers.filter((server) => ports.includes(server.port)).map((server) => server.id), run: async (_cwd, action) => { calls.push(action); return { ok: true, snapshot }; } } });
    await host.openProject(world.worktree);
    host.press({ press: 'start', entryIds: [webEntry.id] }, world.worktree);
    host.press({ press: 'stop', entryId: webEntry.id }, world.worktree);
    await host.closeWorkspace(world.worktree);
    expect(calls).toEqual([{ action: 'start', serverIds: ['web'] }, { action: 'stop', serverIds: ['web'] }, { action: 'stop' }]);
    host.dispose();
  });

  it('discards a canceled report before it can create a server claim', async () => {
    const world = makeWorld('canceled-saved-report');
    const { host } = makeHost(world, { listeners: new Map() });
    await host.openProject(world.worktree);
    const controller = new AbortController();
    controller.abort();
    await host.report(world.worktree, world.worktree, 49000, undefined, controller.signal);
    expect(serverBookEntries(world.worktree)).toEqual([]);
    host.dispose();
  });

  it('signals only freshly verified legacy listeners, never a source-checkout listener', async () => {
    const world = makeWorld('legacy-direct-stop');
    const source = createServerEntry(world.worktree, { folder: world.sourceRepo, port: 49000, ownership: 'users-own' });
    const owned = createServerEntry(world.worktree, { folder: world.worktree, port: 49001, ownership: 'agent-started' });
    const signals: number[] = [];
    const { host } = makeHost(world, { listeners: new Map([[49000, { pid: 111, cwd: world.sourceRepo }], [49001, { pid: 112, cwd: world.worktree }]]) }, { signalProcess: (pid) => { signals.push(pid); } });
    await host.openProject(world.worktree);
    host.press({ press: 'stop', entryId: source.id }, world.worktree);
    await immediately();
    expect(signals).toEqual([]);
    host.press({ press: 'stop', entryId: owned.id }, world.worktree);
    await immediately();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((pid) => pid === 112)).toBe(true);
    host.dispose();
  });
});

describe('claim → verify → live — the control, first', () => {
  it('an answering port whose listener sits in the claimed folder measures live', async () => {
    const world = makeWorld('control');
    // A real directory: the realpath rule needs one to follow.
    const listenerCwd = join(world.worktree, 'apps', 'web');
    mkdirSync(listenerCwd, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[5173, { pid: 41, cwd: listenerCwd }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 5173);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the claim to verify live');

    const entry = lastEntry(emitted);
    expect(entry?.port).toBe(5173);
    expect(entry?.ownership).toBe('agent-started');
    expect(entry?.everMeasuredLive).toBe(true);
    expect(entry?.ports).toEqual([
      { port: 5173, origin: 'http://localhost:5173', measured: 'live', everLive: true },
    ]);
    host.dispose();
  });

  it('the wire carries the folder BASENAME and no path anywhere in the payload', async () => {
    const world = makeWorld('no-paths');
    const machine: Machine = {
      listeners: new Map([[5173, { pid: 41, cwd: world.worktree }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 5173);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'a payload to inspect');
    host.dispose();

    expect(lastEntry(emitted)?.folderName).toBe('main');
    for (const state of emitted) {
      expect(JSON.stringify(state)).not.toContain(world.worktree);
    }
  });
});

describe('the re-verify seat — persisted claims on project open', () => {
  it('re-attaches to a claim that is still alive, with no report and no restage', async () => {
    const world = makeWorld('reattach');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 7, cwd: world.worktree }]]),
    };
    const first = makeHost(world, machine);
    await first.host.openProject(world.worktree);
    await first.host.report(world.worktree, world.worktree, 3000);
    await waitFor(() => lastEntry(first.emitted)?.status === 'running', "run one's live entry");
    first.host.dispose();

    resetServerBookCache();
    const second = makeHost(world, machine);
    await second.host.openProject(world.worktree);
    await waitFor(
      () => lastEntry(second.emitted)?.status === 'running',
      'the persisted claim to re-verify live',
    );
    expect(lastEntry(second.emitted)?.ports[0]?.measured).toBe('live');
    second.host.dispose();
  });

  it('keeps a dead claim as a non-live entry — no erasure, ever-measured intact', async () => {
    const world = makeWorld('dead-claim');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 7, cwd: world.worktree }]]),
    };
    const first = makeHost(world, machine);
    await first.host.openProject(world.worktree);
    await first.host.report(world.worktree, world.worktree, 3000);
    await waitFor(() => lastEntry(first.emitted)?.status === 'running', 'the live run');
    first.host.dispose();

    machine.listeners.clear();
    resetServerBookCache();
    const second = makeHost(world, machine);
    await second.host.openProject(world.worktree);

    const entry = lastEntry(second.emitted);
    expect(entry?.status).toBe('stopped');
    expect(entry?.ports).toEqual([
      { port: 3000, origin: 'http://localhost:3000', measured: 'dead', everLive: true },
    ]);
    expect(entry?.everMeasuredLive).toBe(true);
    expect(serverBookEntries(world.worktree)).toHaveLength(1);
    second.host.dispose();
  });
});

describe('the discriminator, through a report', () => {
  it('moves the entry when a claimed port is dead — the new port takes its seat', async () => {
    const world = makeWorld('move');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 7, cwd: world.worktree }]]),
    };
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the first port to verify');
    const entryId = lastEntry(emitted)?.entryId;
    expect(moves).toEqual([]);

    machine.listeners.clear();
    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);
    await waitFor(
      () => lastEntry(emitted)?.ports[0]?.port === 5173,
      'the dead port to hand over its seat',
    );

    const entry = lastEntry(emitted);
    expect(entry?.entryId).toBe(entryId);
    expect(entry?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entry?.everMeasuredLive).toBe(true);
    expect(moves).toEqual([[3000, 5173]]);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the new port to verify');
    host.dispose();
  });

  it('an extend never authors a move — every claimed port still lives', async () => {
    const world = makeWorld('extend-no-move');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 7, cwd: world.worktree }]]),
    };
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the first port to verify');

    machine.listeners.set(3001, { pid: 7, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 3001);
    await waitFor(() => lastEntry(emitted)?.ports.length === 2, 'the extend to land');

    expect(moves).toEqual([]);
    host.dispose();
  });

  it('a move against a cold-open dead claim authors BEFORE the moved book broadcasts', async () => {
    const world = makeWorld('cold-move');
    const machine: Machine = {
      listeners: new Map([[4401, { pid: 7, cwd: world.worktree }]]),
    };
    const first = makeHost(world, machine);
    await first.host.openProject(world.worktree);
    await first.host.report(world.worktree, world.worktree, 4401);
    await waitFor(() => lastEntry(first.emitted)?.status === 'running', "run one's live entry");
    first.host.dispose();

    machine.listeners.clear();
    resetServerBookCache();

    const order: string[] = [];
    const second = makeHost(world, machine, {
      authorPortMove: (from, to) =>
        Promise.resolve().then(() => {
          order.push(`move ${String(from)}->${String(to)}`);
        }),
      emit: (_worktree, state) => {
        if (state.entries[0]?.ports.some((p) => p.port === 4402)) order.push('book 4402');
      },
    });
    await second.host.openProject(world.worktree);
    expect(serverBookEntries(world.worktree)[0]?.ports[0]?.measured).toBe('dead');

    second.host.press({ press: 'start' });
    second.host.turnStarted(world.worktree);
    machine.listeners.set(4402, { pid: 8, cwd: world.worktree });
    await second.host.report(world.worktree, world.worktree, 4402);

    expect(order.filter((event) => event.startsWith('move'))).toEqual(['move 4401->4402']);
    expect(order[0]).toBe('move 4401->4402');
    expect(order).toContain('book 4402');
    second.host.dispose();
  });
});

describe('verification is against the claimed folder, not an ownership class', () => {
  it('an agent-started listener from a DIFFERENT folder reads not-live', async () => {
    const world = makeWorld('sibling');
    const sibling = join(world.root, 'shop', 'other');
    mkdirSync(sibling, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 9, cwd: sibling }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => lastEntry(emitted)?.ports[0]?.measured === 'stranger',
      'the stranger to be measured',
    );

    const entry = lastEntry(emitted);
    expect(entry?.status).toBe('stopped');
    expect(entry?.everMeasuredLive).toBe(false);
    host.dispose();
  });

  it('a container runtime holding the port is a stranger that says so (ONL-2359)', async () => {
    const world = makeWorld('container');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 9, cwd: '/', command: 'OrbStack Helper' }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => lastEntry(emitted)?.ports[0]?.measured === 'stranger',
      'the stranger to be measured',
    );

    const entry = lastEntry(emitted);
    expect(entry?.status).toBe('stopped');
    expect(entry?.ports[0]?.listener).toBe('container');
    expect(JSON.stringify(emitted.at(-1))).not.toContain('OrbStack');
    host.dispose();

    const [persisted] = serverBookEntries(world.worktree);
    if (persisted === undefined) throw new Error('the claim did not persist');
    recordPortMeasurement(world.worktree, persisted.id, 3000, 'dead');
    const reopened = makeHost(world, machine);
    await reopened.host.openProject(world.worktree);
    expect(serverBookEntries(world.worktree)[0]?.ports[0]).toMatchObject({
      measured: 'stranger',
      listener: 'container',
    });
    reopened.host.dispose();
  });

  it('a foreign process that is no runtime stays a plain stranger — no listener fact', async () => {
    const world = makeWorld('plain-stranger');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 9, cwd: '/', command: 'node' }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => lastEntry(emitted)?.ports[0]?.measured === 'stranger',
      'the stranger to be measured',
    );

    const entry = lastEntry(emitted);
    expect(entry?.status).toBe('stopped');
    expect(entry?.ports[0]).not.toHaveProperty('listener');
    host.dispose();
  });
});

describe('attribution — whose server the entry says it is', () => {
  it("recognizes the user's own server: live AND labeled users-own", async () => {
    const world = makeWorld('users-own');
    const listenerCwd = join(world.sourceRepo, 'apps', 'web');
    mkdirSync(listenerCwd, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 11, cwd: listenerCwd }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.sourceRepo, 3000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', "the user's server to verify");

    const entry = lastEntry(emitted);
    expect(entry?.ownership).toBe('users-own');
    expect(entry?.folderName).toBe(world.sourceRepo.split('/').at(-1));
    host.dispose();
  });

  it('labels a claim from neither root unknown', async () => {
    const world = makeWorld('unattributed');
    const elsewhere = join(world.root, '..', 'somewhere-else');
    mkdirSync(elsewhere, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 12, cwd: elsewhere }]]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, elsewhere, 3000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the claim to verify');

    expect(lastEntry(emitted)?.ownership).toBe('unknown');
    host.dispose();
    rmSync(elsewhere, { recursive: true, force: true });
  });
});

describe('entries measure independently', () => {
  it('one server dying never moves the other entry', async () => {
    const world = makeWorld('independent');
    const api = join(world.root, 'shop', 'api');
    mkdirSync(api, { recursive: true });
    const machine: Machine = {
      listeners: new Map([
        [3000, { pid: 21, cwd: world.worktree }],
        [4000, { pid: 22, cwd: api }],
      ]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await host.report(world.worktree, api, 4000);
    const bothLive = (): boolean =>
      emitted.at(-1)?.entries.filter((e) => e.status === 'running').length === 2;
    await waitFor(bothLive, 'both entries to verify live');

    machine.listeners.delete(3000);
    const oneDied = (): boolean => {
      const entries = emitted.at(-1)?.entries ?? [];
      return (
        entries.some((e) => e.folderName === 'main' && e.status === 'stopped') &&
        entries.some((e) => e.folderName === 'api' && e.status === 'running')
      );
    };
    await waitFor(oneDied, "one death to leave the other entry's state alone");
    host.dispose();
  });
});

describe('the press and the pending seat', () => {
  it('a Start press reads pending until a report arrives, and a turn ending cancels it', async () => {
    const world = makeWorld('pending');
    const machine: Machine = { listeners: new Map() };
    const { host, emitted } = makeHost(world, machine);
    await host.openProject(world.worktree);

    host.press({ press: 'start' });
    expect(emitted.at(-1)?.pending).toBe(true);

    host.turnStarted(world.worktree);
    host.turnEnded(world.worktree);
    expect(emitted.at(-1)?.pending).toBe(false);

    host.press({ press: 'start' });
    host.turnStarted(world.worktree);
    machine.listeners.set(3000, { pid: 31, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 3000);
    expect(emitted.at(-1)?.pending).toBe(false);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the reported port to verify');
    host.dispose();
  });
});

describe('reports bind to their project', () => {
  it('a report for a project that is not open records the claim and watches nothing', async () => {
    const world = makeWorld('foreign-project');
    const otherWorktree = join(world.root, 'blog', 'main');
    mkdirSync(otherWorktree, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 41, cwd: otherWorktree }]]),
    };
    const { host, emitted } = makeHost(world, machine);
    await host.openProject(world.worktree);
    const before = emitted.length;

    await host.report(otherWorktree, otherWorktree, 3000);

    expect(serverBookEntries(otherWorktree)).toHaveLength(1);
    expect(emitted.length).toBe(before);
    expect(emitted.at(-1)?.entries ?? []).toHaveLength(0);
    host.dispose();
  });
});

function makeStarter(
  machine: Machine,
  running: Map<string, number>,
  options: { hold?: boolean; present?: boolean; onStop?: () => void } = {},
): StarterControl & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    portFor: (worktree) => running.get(worktree),
    running: () => [...running.keys()],
    isPresent: () => options.present ?? true,
    stop: async (worktree) => {
      calls.push(`stop ${basename(worktree)}`);
      const port = running.get(worktree);
      running.delete(worktree);
      if (port !== undefined && options.hold !== true) machine.listeners.delete(port);
      options.onStop?.();
    },
    spawn: async (worktree) => {
      calls.push(`spawn ${basename(worktree)}`);
      running.set(worktree, 4310);
      machine.listeners.set(4310, { pid: 90, cwd: worktree });
      return 4310;
    },
  };
}

describe("Studio's own starter through the report seam (ONL-2152)", () => {
  it('a report from the runner seats a `studio-started` entry, and a live probe keeps it so', async () => {
    const world = makeWorld('starter-own');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host, emitted } = makeHost(world, machine, { starter });

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    expect(lastEntry(emitted)?.ownership).toBe('studio-started');
    expect(serverBookEntries(world.worktree)[0]?.ownership).toBe('studio-started');
    expect(starter.calls).toEqual([]);
    host.dispose();
  });

  it('reopening the open worktree re-broadcasts the book with the `studio-started` entry — never silent', async () => {
    const world = makeWorld('starter-reopen');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host, emitted } = makeHost(world, machine, { starter });

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    const before = emitted.length;

    await host.openProject(world.worktree);

    expect(emitted.length).toBe(before + 1);
    expect(lastEntry(emitted)?.ownership).toBe('studio-started');
    expect(lastEntry(emitted)?.status).toBe('running');
    expect(lastEntry(emitted)?.port).toBe(4310);
    expect(starter.calls).toEqual([]);
    host.dispose();
  });

  it('an agent report for the worktree retires the starter IN ORDER: stop, silent, move, entry gone', async () => {
    const world = makeWorld('starter-retire');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const order: string[] = [];
    const emitted: ServerBookState[] = [];
    const { host } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) =>
        Promise.resolve().then(() => {
          order.push(`move ${String(from)}->${String(to)}`);
        }),
      emit: (_worktree, state) => {
        emitted.push(state);
        if (state.entries.some((e) => e.ports.some((p) => p.port === 5173))) order.push('book 5173');
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(starter.calls).toEqual(['stop main']);
    expect(order[0]).toBe('move 4310->5173');
    expect(order).toContain('book 5173');
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entries[0]?.ownership).toBe('agent-started');
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the new port to verify');
    host.dispose();
  });

  it('a report from a SUBFOLDER retires the same way, then seats its own entry', async () => {
    const world = makeWorld('starter-subfolder');
    const app = join(world.worktree, 'app');
    mkdirSync(app, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: app });
    await host.report(world.worktree, app, 5173);

    expect(moves).toEqual([[4310, 5173]]);
    const entries = serverBookEntries(world.worktree);
    expect(entries.map((e) => basename(e.folder))).toEqual(['app']);
    expect(emitted.at(-1)?.entries).toHaveLength(1);
    host.dispose();
  });

  it("a registered BACKGROUND project's starter retires with the move authored for that project (ONL-2280)", async () => {
    const world = makeWorld('starter-retire-background');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const moves: [number, number, string][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to, worktree) => {
        moves.push([from, to, worktree]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    await host.openProject(other);

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(starter.calls).toEqual(['stop main']);
    expect(moves).toEqual([[4310, 5173, world.worktree]]);
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entries[0]?.ownership).toBe('agent-started');
    host.dispose();
  });

  it('a retirement whose move the canvas declines still removes the old entry', async () => {
    const world = makeWorld('starter-retire-declined');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const declined: (string | undefined)[] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: createReverifyMoveAuthor(async (_author, _resolve, worktree) => {
        declined.push(worktree);
        return { ok: false, reason: "this session's project is no longer open" };
      }),
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(declined).toEqual([world.worktree]);
    expect(starter.calls).toEqual(['stop main']);
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entries[0]?.ownership).toBe('agent-started');
    host.dispose();
  });

  it('keeps the server file when a saved setup reports it on another port', async () => {
    const world = makeWorld('starter-retire-fails');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const content = 'export const ready = true;\n';
    writeFileSync(join(world.worktree, 'server.mjs'), content);
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    expect(await host.report(world.worktree, world.worktree, 5173)).toBeUndefined();

    expect(starter.calls).toEqual(['stop main']);
    expect(readFileSync(join(world.worktree, 'server.mjs'), 'utf8')).toBe(content);
    expect(moves).toEqual([[4310, 5173]]);
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the new port to verify');
    host.dispose();
  });

  it('a project torn down while its starter retires still removes the old entry', async () => {
    const world = makeWorld('starter-retire-closed');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    let hostRef: ServerHost | undefined;
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]), {
      onStop: () => hostRef?.dispose(),
    });
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    hostRef = host;
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(starter.calls).toEqual(['stop main']);
    expect(moves).toEqual([[4310, 5173]]);
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entries[0]?.ownership).not.toBe('studio-started');
  });

  it('no starter → no stop, no move — the negative control', async () => {
    const world = makeWorld('starter-none');
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 7, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map());
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the claim to verify');
    expect(starter.calls).toEqual([]);
    expect(moves).toEqual([]);
    expect(lastEntry(emitted)?.ownership).toBe('agent-started');
    host.dispose();
  });

  it('a port still answering after the bounded wait authors no move; the report reads extend', async () => {
    const world = makeWorld('starter-lingers');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]), { hold: true });
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      timing: { runningFailures: 1, waitingAttempts: 3, stopAttempts: 2 },
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(starter.calls).toEqual(['stop main']);
    expect(moves).toEqual([]);
    expect(serverBookEntries(world.worktree)[0]?.ports.map((p) => p.port)).toEqual([4310, 5173]);
    host.dispose();
  });

  it('awaitRunning resolves running on the first live measurement, timed-out when the port stays silent', async () => {
    const world = makeWorld('await-running');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host } = makeHost(world, machine, { starter });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    expect(await host.awaitRunning(world.worktree, 4310, 1_000)).toBe('running');
    host.dispose();

    const silent = makeWorld('await-silent');
    const quiet: Machine = { listeners: new Map() };
    const second = makeHost(silent, quiet, {
      starter: makeStarter(quiet, new Map([[silent.worktree, 4311]])),
      timing: { runningFailures: 1, waitingAttempts: 2 },
    });
    await second.host.openProject(silent.worktree);
    await second.host.report(silent.worktree, silent.worktree, 4311);
    expect(await second.host.awaitRunning(silent.worktree, 4311, 10)).toBe('timed-out');
    second.host.dispose();
  });

  it('Stop kills the starter and Start re-spawns and reports it — no prompt either way', async () => {
    const world = makeWorld('starter-press');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host, emitted } = makeHost(world, machine, { starter });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    const entryId = lastEntry(emitted)?.entryId ?? '';

    host.press({ press: 'stop', entryId });
    await waitFor(() => lastEntry(emitted)?.status === 'stopped', 'the kill to be measured');
    expect(starter.calls).toEqual(['stop main']);

    host.press({ press: 'start' });
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the re-spawn to verify');
    expect(starter.calls).toEqual(['stop main', 'spawn main']);
    expect(emitted.at(-1)?.pending).toBe(false);
    expect(lastEntry(emitted)?.ownership).toBe('studio-started');
    host.dispose();
  });

  it('Start on a stopped starter reads as starting from the press until the report, and stops reading so if the spawn fails', async () => {
    const world = makeWorld('starter-spawning');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const running = new Map([[world.worktree, 4310]]);
    const base = makeStarter(machine, running);
    let release: (fail: boolean) => void = () => undefined;
    const starter: StarterControl = {
      ...base,
      spawn: (worktree) => new Promise<number>((resolve, reject) => {
        release = (fail) => (fail ? reject(new Error('spawn failed')) : resolve(base.spawn(worktree)));
      }),
    };
    const { host, emitted } = makeHost(world, machine, { starter });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    const entryId = lastEntry(emitted)?.entryId ?? '';
    host.press({ press: 'stop', entryId });
    await waitFor(() => lastEntry(emitted)?.status === 'stopped', 'the kill to be measured');
    expect(emitted.at(-1)?.starterSpawning).toBeUndefined();

    host.press({ press: 'start' });
    await waitFor(() => emitted.at(-1)?.starterSpawning === true, 'the press to read as starting');
    release(false);
    await waitFor(() => lastEntry(emitted)?.status === 'running' && emitted.at(-1)?.starterSpawning === undefined, 'the report to take over');

    host.press({ press: 'stop', entryId });
    await waitFor(() => lastEntry(emitted)?.status === 'stopped', 'the second kill to be measured');
    host.press({ press: 'start' });
    await waitFor(() => emitted.at(-1)?.starterSpawning === true, 'the second press to read as starting');
    release(true);
    await waitFor(() => emitted.at(-1)?.starterSpawning === undefined, 'the failed spawn to stop reading as starting');
    expect(lastEntry(emitted)?.status).toBe('stopped');
    host.dispose();
  });

  it('an agent report after a Stop press still moves frames and removes the old entry', async () => {
    const world = makeWorld('starter-retire-after-stop');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const moves: [number, number][] = [];
    const { host, emitted } = makeHost(world, machine, {
      starter,
      authorPortMove: (from, to) => {
        moves.push([from, to]);
      },
    });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    host.press({ press: 'stop', entryId: lastEntry(emitted)?.entryId ?? '' });
    await waitFor(() => lastEntry(emitted)?.status === 'stopped', 'the kill to be measured');
    expect(starter.portFor(world.worktree)).toBeUndefined();

    machine.listeners.set(5173, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 5173);

    expect(starter.calls).toEqual(['stop main']);
    expect(moves).toEqual([[4310, 5173]]);
    const entries = serverBookEntries(world.worktree);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ports.map((p) => p.port)).toEqual([5173]);
    expect(entries[0]?.ownership).toBe('agent-started');
    expect(studioStarterEntry(world.worktree)).toBeUndefined();
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the new port to verify');
    host.dispose();
  });

  it('a Start press with server.mjs present but no `studio-started` entry is a prompt, never a spawn', async () => {
    const world = makeWorld('starter-press-no-entry');
    const machine: Machine = { listeners: new Map() };
    const starter = makeStarter(machine, new Map(), { present: true });
    const { host, emitted } = makeHost(world, machine, { starter });
    await host.openProject(world.worktree);

    host.press({ press: 'start' });
    await immediately();
    expect(starter.calls).toEqual([]);
    expect(emitted.at(-1)?.pending).toBe(true);
    host.dispose();
  });

  it('closeProject(onlyIf) leaves a different open project alone, and closes its own', async () => {
    const world = makeWorld('close-only-if');
    const other = join(world.root, 'shop', 'other');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map() };
    const { host, addressed } = makeHost(world, machine);
    await host.openProject(other);

    await host.closeProject(world.worktree);
    expect(host.snapshotFor(other).entries).toEqual([]);
    await host.report(other, other, 3000);
    expect(host.snapshotFor(other).entries).toHaveLength(1);

    await host.closeProject(other);
    const settled = addressed.length;
    await host.report(other, other, 3000);
    expect(addressed.length).toBe(settled);
    host.dispose();
  });

  it('after a Stop press, the agent reporting the same port derives to agent-started', async () => {
    const world = makeWorld('starter-handover');
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host, emitted } = makeHost(world, machine, { starter });
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'the starter to verify');
    host.press({ press: 'stop', entryId: lastEntry(emitted)?.entryId ?? '' });
    await waitFor(() => lastEntry(emitted)?.status === 'stopped', 'the kill to be measured');

    machine.listeners.set(4310, { pid: 8, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', "the agent's server to verify");
    expect(lastEntry(emitted)?.ownership).toBe('agent-started');
    host.dispose();
  });

  it('stopStarterExcept stops every worktree outside the open set and leaves the open ones alone', async () => {
    const world = makeWorld('starter-switch');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map() };
    const starter = makeStarter(
      machine,
      new Map([
        [world.worktree, 4310],
        [other, 4311],
      ]),
    );
    const { host } = makeHost(world, machine, { starter });

    host.stopStarterExcept(new Set([other]));
    await immediately();
    expect(starter.calls).toEqual(['stop main']);

    host.stopStarterExcept(new Set());
    await immediately();
    expect(starter.calls).toEqual(['stop main', 'stop main']);
    expect(starter.running()).toEqual([]);
    host.dispose();
  });

  it('keeps a draft starter alive across navigation until creation releases it', async () => {
    const world = makeWorld('retained-starter');
    const machine: Machine = { listeners: new Map() };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host } = makeHost(world, machine, { starter });
    const release = host.retainStarter(world.worktree);
    host.stopStarterExcept(new Set());
    await immediately();
    expect(starter.calls).toEqual([]);
    release();
    host.stopStarterExcept(new Set());
    await immediately();
    expect(starter.calls).toEqual(['stop main']);
    host.dispose();
  });
});

describe('N projects measured concurrently (ONL-2204)', () => {
  it("two registered projects are each measured on their own claim, and each one's views hear only their own", async () => {
    const world = makeWorld('n-workspaces');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([
        [3000, { pid: 1, cwd: world.worktree }],
        [4000, { pid: 2, cwd: other }],
      ]),
    };
    const { host, addressed } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => serverBookEntries(world.worktree)[0]?.ports[0]?.measured === 'live',
      "A's own claim to verify live",
    );

    await host.openProject(other);
    await host.report(other, other, 4000);
    await waitFor(
      () => serverBookEntries(other)[0]?.ports[0]?.measured === 'live',
      "B's own claim to verify live",
    );

    expect(serverBookEntries(world.worktree)[0]?.ports[0]?.measured).toBe('live');
    expect(serverBookEntries(other)[0]?.ports[0]?.measured).toBe('live');

    expect(lastFor(addressed, world.worktree)?.entries[0]?.ports[0]?.port).toBe(3000);
    expect(lastFor(addressed, other)?.entries[0]?.ports[0]?.port).toBe(4000);
    expect(host.snapshotFor(world.worktree).entries).toHaveLength(1);
    expect(host.snapshotFor(other).entries).toHaveLength(1);
    expect(addressed.every((one) => one.state.entries.length <= 1)).toBe(true);
    host.dispose();
  });

  it("a background project's server dying is measured with no report and no refocus", async () => {
    const world = makeWorld('background-dies');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]),
    };
    const { host } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => serverBookEntries(world.worktree)[0]?.ports[0]?.measured === 'live',
      'A live before backgrounding',
    );

    await host.openProject(other);

    machine.listeners.delete(3000);
    await waitFor(
      () => serverBookEntries(world.worktree)[0]?.ports[0]?.measured === 'dead',
      "A's own monitor to notice on its own",
    );
    host.dispose();
  });

  it('refocusing a background project never re-verifies or restages', async () => {
    const world = makeWorld('refocus-no-restage');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[4310, { pid: 90, cwd: world.worktree }]]),
    };
    const starter = makeStarter(machine, new Map([[world.worktree, 4310]]));
    const { host, emitted } = makeHost(world, machine, { starter });

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'A live before backgrounding');
    await host.openProject(other);
    const before = emitted.length;

    await host.openProject(world.worktree);

    expect(emitted.length).toBe(before + 1);
    expect(lastEntry(emitted)?.status).toBe('running');
    expect(lastEntry(emitted)?.port).toBe(4310);
    expect(starter.calls).toEqual([]);
    host.dispose();
  });

  it("a registered background project's move is authored for its OWN worktree (ONL-2280)", async () => {
    const world = makeWorld('registered-background-move');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map() };
    const moves: [number, number, string][] = [];
    const { host } = makeHost(world, machine, {
      authorPortMove: (from, to, worktree) => {
        moves.push([from, to, worktree]);
      },
    });

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await host.openProject(other);

    machine.listeners.set(3001, { pid: 9, cwd: world.worktree });
    await host.report(world.worktree, world.worktree, 3001);

    expect(moves).toEqual([[3000, 3001, world.worktree]]);
    expect(serverBookEntries(world.worktree)[0]?.ports.map((p) => p.port)).toEqual([3001]);
    host.dispose();
  });

  it('awaitRunning resolves for a registered-but-backgrounded project', async () => {
    const world = makeWorld('await-running-background');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]),
    };
    const { host } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await host.openProject(other);

    expect(await host.awaitRunning(world.worktree, 3000, 1_000)).toBe('running');
    host.dispose();
  });

  it('closeWorkspace tears down a background registration without touching the active one', async () => {
    const world = makeWorld('close-workspace');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([
        [3000, { pid: 1, cwd: world.worktree }],
        [4000, { pid: 2, cwd: other }],
      ]),
    };
    const { host, emitted } = makeHost(world, machine);

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => serverBookEntries(world.worktree)[0]?.ports[0]?.measured === 'live',
      'A live',
    );

    await host.openProject(other);
    await host.report(other, other, 4000);
    await waitFor(() => lastEntry(emitted)?.status === 'running', 'B live and active');
    const before = emitted.length;

    await host.closeWorkspace(world.worktree);
    await immediately();

    expect(emitted.length).toBe(before);
    expect(lastEntry(emitted)?.folderName).toBe(basename(other));
    expect(lastEntry(emitted)?.status).toBe('running');
    expect(serverBookEntries(world.worktree)).toHaveLength(1);

    host.dispose();
  });

  it('a dispose mid-open never resurrects seats or broadcasts (the epoch-by-reference guard)', async () => {
    const world = makeWorld('dispose-race');
    const machine: Machine = { listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]) };
    let releaseProbe: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseProbe = resolve;
    });
    let gated = false;
    const { host, emitted } = makeHost(world, machine, {
      probe: async (port) => {
        if (port === 3000 && !gated) {
          gated = true;
          await gate;
        }
        return machine.listeners.has(port);
      },
    });
    createServerEntry(world.worktree, { folder: world.worktree, port: 3000, ownership: 'agent-started' });

    const opening = host.openProject(world.worktree);
    await immediately();
    host.dispose();
    releaseProbe?.();
    await opening;

    expect(emitted).toEqual([]);
    expect(host.snapshotFor(world.worktree).entries[0]?.status).toBe('stopped');
  });

  it('a Stop press addressed to a background project stops ITS starter, not the active one (ONL-2226 phase 3)', async () => {
    const world = makeWorld('press-scoped-a');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = {
      listeners: new Map([
        [4310, { pid: 1, cwd: world.worktree }],
        [4311, { pid: 2, cwd: other }],
      ]),
    };
    const starter = makeStarter(
      machine,
      new Map([
        [world.worktree, 4310],
        [other, 4311],
      ]),
    );
    const { host, emitted } = makeHost(world, machine, { starter });

    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 4310);
    await waitFor(
      () => serverBookEntries(world.worktree)[0]?.ports[0]?.measured === 'live',
      "A's own claim to verify live",
    );

    await host.openProject(other);
    await host.report(other, other, 4311);
    await waitFor(
      () => serverBookEntries(other)[0]?.ports[0]?.measured === 'live',
      "B's own claim to verify live",
    );
    await host.openProject(world.worktree);

    const bEntryId = serverBookEntries(other)[0]?.id ?? '';
    host.press({ press: 'stop', entryId: bEntryId }, other);

    await waitFor(() => starter.portFor(other) === undefined, "B's starter to stop");
    expect(starter.calls).toEqual(['stop main']);
    expect(starter.portFor(world.worktree)).toBe(4310);
    void emitted;
    host.dispose();
  });
});

describe('the wire is addressed per project (ONL-2266)', () => {
  async function openBothWithALive(
    world: World,
    other: string,
    machine: Machine,
  ): Promise<ReturnType<typeof makeHost>> {
    const made = makeHost(world, machine);
    await made.host.openProject(world.worktree);
    await made.host.report(world.worktree, world.worktree, 3000);
    await waitFor(
      () => lastFor(made.addressed, world.worktree)?.entries[0]?.status === 'running',
      'A live before B opens',
    );
    await made.host.openProject(other);
    return made;
  }

  it("a background project's own measurement still reaches its own views", async () => {
    const world = makeWorld('background-measures-to-own-views');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]) };
    const { host, addressed } = await openBothWithALive(world, other, machine);

    machine.listeners.delete(3000);

    await waitFor(
      () => lastFor(addressed, world.worktree)?.entries[0]?.status === 'stopped',
      "A's death to reach A's own views",
    );
    host.dispose();
  });

  it('a Start press is addressed to the project that pressed it, never the active one', async () => {
    const world = makeWorld('press-addressed');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map() };
    const { host, addressed } = makeHost(world, machine);
    await host.openProject(world.worktree);
    await host.openProject(other);

    host.press({ press: 'start' }, world.worktree);

    expect(host.snapshotFor(world.worktree).pending).toBe(true);
    expect(host.snapshotFor(other).pending).toBe(false);
    expect(lastFor(addressed, world.worktree)?.pending).toBe(true);
    expect(lastFor(addressed, other)?.pending).toBe(false);
    host.dispose();
  });

  it("a project's own turn end cancels the Start IT made, with another project active", async () => {
    const world = makeWorld('turn-cancels-own-start');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map() };
    const { host } = makeHost(world, machine);
    await host.openProject(world.worktree);
    await host.openProject(other);

    host.press({ press: 'start' }, world.worktree);
    expect(host.snapshotFor(world.worktree).pending).toBe(true);

    host.turnStarted(other);
    host.turnEnded(other);
    expect(host.snapshotFor(world.worktree).pending).toBe(true);

    host.turnStarted(world.worktree);
    host.turnEnded(world.worktree);
    expect(host.snapshotFor(world.worktree).pending).toBe(false);
    host.dispose();
  });

  it("a Start clears when the pressing project's own report seats a port, with another active", async () => {
    const world = makeWorld('report-clears-own-start');
    const other = join(world.root, 'blog', 'main');
    mkdirSync(other, { recursive: true });
    const machine: Machine = { listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]) };
    const { host } = makeHost(world, machine);
    await host.openProject(world.worktree);
    await host.openProject(other);

    host.press({ press: 'start' }, world.worktree);
    expect(host.snapshotFor(world.worktree).pending).toBe(true);

    await host.report(world.worktree, world.worktree, 3000);
    expect(host.snapshotFor(world.worktree).pending).toBe(false);
    host.dispose();
  });

  it('nothing is emitted when no project is named — a view leaving is never a fan-out', async () => {
    const world = makeWorld('no-addressee');
    const machine: Machine = { listeners: new Map() };
    const { host, addressed } = makeHost(world, machine);

    await host.deactivateProject();
    await host.closeProject();
    expect(addressed).toEqual([]);
    host.dispose();
  });

  it('a project left for the projects list keeps its book in every view still showing it (ONL-2280)', async () => {
    const world = makeWorld('deactivate-keeps-book');
    const machine: Machine = { listeners: new Map([[3000, { pid: 1, cwd: world.worktree }]]) };
    const { host, addressed } = makeHost(world, machine);
    await host.openProject(world.worktree);
    await host.report(world.worktree, world.worktree, 3000);
    const before = addressed.length;

    await host.deactivateProject();
    const emptied = addressed
      .slice(before)
      .filter((one) => one.worktree === world.worktree && one.state.entries.length === 0);
    expect(emptied).toEqual([]);
    expect(lastFor(addressed, world.worktree)?.entries).toHaveLength(1);
    host.dispose();
  });

  it('a Start pressed in a project still reads as starting after it is left for the projects list', async () => {
    const world = makeWorld('deactivate-keeps-start');
    const machine: Machine = { listeners: new Map() };
    const { host, addressed } = makeHost(world, machine);
    await host.openProject(world.worktree);
    host.press({ press: 'start' }, world.worktree);
    expect(host.snapshotFor(world.worktree).pending).toBe(true);

    await host.deactivateProject();

    expect(host.snapshotFor(world.worktree).pending).toBe(true);
    expect(lastFor(addressed, world.worktree)?.pending).toBe(true);
    host.dispose();
  });
});
