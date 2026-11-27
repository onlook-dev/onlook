import { mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  createServerEntry,
  extendServerEntry,
  portHeldByOtherProject,
  recordPortMeasurement,
  resetServerBookCache,
  serverBookEntries,
} from './book.js';
import { createServerHost, type ServerHostDeps } from './index.js';
import type { IdentifyListener, ListenerIdentity } from './owner.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function deferred<Value>(): { promise: Promise<Value>; resolve(value: Value): void } {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => { resolve = done; });
  return { promise, resolve };
}

const nextTurn = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor(condition: () => boolean, description: string): Promise<void> {
  for (let turn = 0; turn < 500; turn += 1) {
    if (condition()) return;
    await nextTurn();
  }
  throw new Error(`timed out waiting for ${description}`);
}

function makeWorld(name: string) {
  const root = realpathSync(makeWorkspaceRoot({ name: `port-ownership-${name}` }));
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  const projectA = join(root, 'a', 'main');
  const projectB = join(root, 'b', 'main');
  const sourceRepo = join(root, 'source');
  for (const folder of [projectA, projectB, sourceRepo]) mkdirSync(folder, { recursive: true });
  return { root, projectA, projectB, sourceRepo };
}

function makeHost(
  world: ReturnType<typeof makeWorld>,
  identify: IdentifyListener,
  overrides: Partial<ServerHostDeps> = {},
) {
  const parked = deferred<void>();
  return createServerHost({
    emit: () => undefined,
    createPortFollow: () => ({ observed: () => undefined }),
    authorPortMove: () => undefined,
    attributionRoots: () => ({ workspaceRoot: world.root, sourceRepoRoot: world.sourceRepo }),
    isBlankProject: () => true,
    probe: async () => true,
    identify,
    signalProcess: () => undefined,
    delay: () => parked.promise,
    ...overrides,
  });
}

function expectOwner(owner: string, other: string): void {
  expect(portHeldByOtherProject(owner, 'http://localhost:3000')).toBe(false);
  expect(portHeldByOtherProject(other, 'http://localhost:3000')).toBe(true);
}

describe('server host port ownership reverification', () => {
  it('extends B claims when a fresh monitor verification supersedes an old dead report probe', async () => {
    const world = makeWorld('stale-dead-report');
    const initialIdentity = deferred<ListenerIdentity | undefined>();
    const oldProbe = deferred<boolean>();
    let initialIdentityStarted = false;
    let reporting = false;
    let oldProbeStarted = false;
    const identity = { pid: 30304, cwd: world.projectB };
    const host = makeHost(world, async (port) => {
      if (port === 3000) {
        initialIdentityStarted = true;
        return initialIdentity.promise;
      }
      return identity;
    }, {
      probe: async (port) => {
        if (reporting && port === 3000) {
          oldProbeStarted = true;
          return oldProbe.promise;
        }
        return true;
      },
    });
    let pendingReport: Promise<void> | undefined;
    try {
      await host.openProject(world.projectB);
      await host.report(world.projectB, world.projectB, 3000);
      await waitFor(() => initialIdentityStarted, 'B initial monitor awaiting identity');
      expect(portHeldByOtherProject(world.projectA, 'http://localhost:3000')).toBe(false);

      reporting = true;
      pendingReport = host.report(world.projectB, world.projectB, 5173);
      await waitFor(() => oldProbeStarted, 'B report awaiting its old port probe');

      initialIdentity.resolve(identity);
      await waitFor(() => host.snapshotFor(world.projectB).entries[0]?.status === 'running', 'B fresh monitor verification');
      expectOwner(world.projectB, world.projectA);
      expect(serverBookEntries(world.projectB)[0]?.ports).toMatchObject([{ port: 3000, measured: 'live' }]);

      oldProbe.resolve(false);
      await pendingReport;
      await waitFor(() => {
        const entry = host.snapshotFor(world.projectB).entries[0];
        return entry?.status === 'running' && entry.port === 5173;
      }, 'B monitor on the newly reported port');
      expect(serverBookEntries(world.projectB)[0]?.ports.map(({ port }) => port)).toEqual([3000, 5173]);
      expect(serverBookEntries(world.projectB)[0]?.ports[0]).toMatchObject({ port: 3000, measured: 'live' });
      expectOwner(world.projectB, world.projectA);
    } finally {
      initialIdentity.resolve(identity);
      oldProbe.resolve(false);
      host.dispose();
      await pendingReport;
    }
  });

  it('invalidates an initial starter verification when stop fulfills before any owner exists', async () => {
    const world = makeWorld('stop-before-first-owner');
    createServerEntry(world.projectB, {
      folder: world.projectB,
      port: 3000,
      ownership: 'studio-started',
    });
    const initialIdentity = deferred<ListenerIdentity | undefined>();
    const stopCompletion = deferred<void>();
    let identityReadings = 0;
    let stopStarted = false;
    let stopped = false;
    let blockedAAfterStop = false;
    let probesAfterStop = 0;
    const host = makeHost(world, async () => {
      identityReadings += 1;
      return initialIdentity.promise;
    }, {
      emit: () => {
        if (stopped && portHeldByOtherProject(world.projectA, 'http://localhost:3000')) {
          blockedAAfterStop = true;
        }
      },
      probe: async () => {
        if (stopped) probesAfterStop += 1;
        return !stopped;
      },
      starter: {
        portFor: (worktree) => worktree === world.projectB && !stopped ? 3000 : undefined,
        running: () => stopped ? [] : [world.projectB],
        isPresent: () => true,
        spawn: async () => { throw new Error('unexpected starter spawn'); },
        stop: async (worktree) => {
          expect(worktree).toBe(world.projectB);
          stopStarted = true;
          await stopCompletion.promise;
          stopped = true;
        },
      },
    });
    const opening = host.openProject(world.projectB);
    const identity = { pid: 30305, cwd: world.projectB };
    try {
      await waitFor(() => identityReadings === 1, 'initial open verification awaiting identity');
      expect(portHeldByOtherProject(world.projectA, 'http://localhost:3000')).toBe(false);

      host.stopStarterExcept(new Set());
      await waitFor(() => stopStarted, 'starter stop request');
      stopCompletion.resolve();
      await waitFor(() => stopped, 'starter stop fulfillment');
      await nextTurn();
      expect(host.snapshotFor(world.projectB).entries).toHaveLength(1);
      expect(portHeldByOtherProject(world.projectA, 'http://localhost:3000')).toBe(false);

      initialIdentity.resolve(identity);
      await opening;
      await nextTurn();
      expect(identityReadings).toBe(1);
      expect(probesAfterStop).toBeLessThanOrEqual(1);
      expect(blockedAAfterStop).toBe(false);
      expect(portHeldByOtherProject(world.projectA, 'http://localhost:3000')).toBe(false);
      expect(portHeldByOtherProject(world.projectB, 'http://localhost:3000')).toBe(false);
    } finally {
      stopCompletion.resolve();
      initialIdentity.resolve(identity);
      host.dispose();
      await opening;
    }
  });

  for (const unknown of [undefined, { pid: 30300 }]) {
    it(`keeps B's verified owner when A reopens with ${unknown === undefined ? 'no identity' : 'a pid without cwd'}`, async () => {
      const world = makeWorld(unknown === undefined ? 'unknown-identity' : 'unknown-cwd');
      const saved = createServerEntry(world.projectA, {
        folder: world.projectA,
        port: 3000,
        ownership: 'agent-started',
      });
      recordPortMeasurement(world.projectA, saved.id, 3000, 'live');
      const monitorIdentity = deferred<ListenerIdentity | undefined>();
      let reopening = false;
      let unknownReadings = 0;
      const host = makeHost(world, async () => {
        if (!reopening) return { pid: 30301, cwd: world.projectB };
        unknownReadings += 1;
        return unknownReadings === 1 ? unknown : monitorIdentity.promise;
      });
      try {
        await host.openProject(world.projectB);
        await host.report(world.projectB, world.projectB, 3000);
        await waitFor(() => host.snapshotFor(world.projectB).entries[0]?.status === 'running', 'B verification');
        expectOwner(world.projectB, world.projectA);

        reopening = true;
        await host.openProject(world.projectA);
        await waitFor(() => unknownReadings === 2, 'A monitor identity reading');
        expect(serverBookEntries(world.projectA)[0]?.ports[0]?.measured).toBe('live');
        expectOwner(world.projectB, world.projectA);

        monitorIdentity.resolve(unknown);
        await waitFor(() => host.snapshotFor(world.projectA).entries[0]?.status === 'running', 'A unknown monitor callback');
        expectOwner(world.projectB, world.projectA);
        expect(serverBookEntries(world.projectA)[0]?.ports[0]?.measured).toBe('live');
      } finally {
        monitorIdentity.resolve(unknown);
        host.dispose();
      }
    });
  }

  for (const delayedPort of [5173, 3000]) {
    it(delayedPort === 5173
      ? 'does not replay a completed B reading after a later port delays the report batch'
      : 'ignores an old B identity that resolves after A verifies ownership', async () => {
      const world = makeWorld(`delayed-${delayedPort}`);
      const saved = createServerEntry(world.projectB, {
        folder: world.projectB,
        port: 3000,
        ownership: 'agent-started',
      });
      extendServerEntry(world.projectB, saved.id, 5173);
      const oldIdentity = { pid: 30302, cwd: world.projectB };
      const delayedIdentity = deferred<ListenerIdentity | undefined>();
      let reporting = false;
      let delayedReadingStarted = false;
      let ownerIsA = false;
      let port3000Readings = 0;
      const host = makeHost(world, async (port) => {
        if (port === 3000) port3000Readings += 1;
        if (reporting && !ownerIsA && port === delayedPort) {
          delayedReadingStarted = true;
          return delayedIdentity.promise;
        }
        return port === 3000 && ownerIsA ? { pid: 30303, cwd: world.projectA } : oldIdentity;
      });
      let pendingReport: Promise<void> | undefined;
      try {
        await host.openProject(world.projectB);
        await waitFor(() => host.snapshotFor(world.projectB).entries[0]?.status === 'running', 'B initial monitor');
        expect(port3000Readings).toBe(2);
        expectOwner(world.projectB, world.projectA);

        reporting = true;
        let reportCompleted = false;
        pendingReport = host.report(world.projectB, world.projectB, 5173).then(() => { reportCompleted = true; });
        await waitFor(() => delayedReadingStarted, 'B delayed report identity');
        await nextTurn();
        expect(port3000Readings).toBe(3);
        expect(reportCompleted).toBe(false);

        ownerIsA = true;
        await host.openProject(world.projectA);
        await host.report(world.projectA, world.projectA, 3000);
        await waitFor(() => host.snapshotFor(world.projectA).entries[0]?.status === 'running', 'A strong verification in another lane');
        expectOwner(world.projectA, world.projectB);

        delayedIdentity.resolve(oldIdentity);
        await pendingReport;
        await waitFor(() => {
          const entry = host.snapshotFor(world.projectB).entries[0];
          return entry?.status === 'running' && entry.port === 5173;
        }, 'B monitor on 5173 only');
        expect(port3000Readings).toBe(4);
        expectOwner(world.projectA, world.projectB);
      } finally {
        delayedIdentity.resolve(oldIdentity);
        host.dispose();
        await pendingReport;
      }
    });
  }
});
