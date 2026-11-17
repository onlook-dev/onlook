import { createServer, type Server } from 'node:http';
import { describe, expect, it } from 'bun:test';
import type { ServerState } from '@studio/events';
import { ServerMonitor, type FrameStateChange } from './monitor.js';
import type { IdentifyListener } from './owner.js';
import { identifyListener, verifiesFor } from './owner.js';
import { probePort } from './probe.js';
import { createWorkActivity } from '../background-work/activity.js';

const OWN_FOLDER = '/repos/ours';
const verifyAgainstOwnFolder = (identity: Parameters<typeof verifiesFor>[0]) =>
  verifiesFor(identity, OWN_FOLDER);

/** Finds nobody: the real resolver reads a developer's own server on the scripted port as foreign (ONL-2255). */
const resolvesNoIdentity: IdentifyListener = async () => undefined;

async function listen(host: string): Promise<{ port: number; close: () => Promise<void> }> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRNOTAVAIL' || error.code === 'ENETUNREACH'
          ? new Error(`this machine cannot bind ${host} — the probe is not what is failing`)
          : error,
      );
    });
    server.listen(0, host, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('did not bind');
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

// A macrotask: `Promise.resolve()` never yields to the timers the tests wait on, and the suite spins forever.
const immediately = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

it('slows running server probes in the background and notices a stopped server promptly on focus', async () => {
  const activity = createWorkActivity();
  activity.update({ focused: false });
  let probes = 0;
  let answered = true;
  const monitor = new ServerMonitor({
    emit: () => {}, identify: resolvesNoIdentity, adjudicate: () => 'ours', activity,
    timing: { runningMs: 20, runningFailures: 1 },
    probe: async () => { probes += 1; return answered; },
  });
  try {
    monitor.watch(4000);
    await waitFor(() => monitor.state?.status === 'running', 'initial server probe');
    const before = probes;
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(probes).toBe(before);
    answered = false;
    activity.update({ focused: true });
    await waitFor(() => monitor.state?.status === 'stopped', 'focus refresh');
    expect(probes).toBe(before + 1);
  } finally {
    monitor.stop(false);
  }
});

it('cancels adaptive waits when the watched server is replaced or stopped', async () => {
  const activity = createWorkActivity();
  activity.update({ focused: false });
  const subscribe = activity.subscribe;
  let subscriptions = 0;
  activity.subscribe = (listener) => {
    subscriptions += 1;
    const unsubscribe = subscribe(listener);
    return () => { subscriptions -= 1; unsubscribe(); };
  };
  const ports: number[] = [];
  const monitor = new ServerMonitor({
    emit: () => {}, identify: resolvesNoIdentity, adjudicate: () => 'ours',
    activity,
    timing: { runningMs: 1_000, runningFailures: 1 },
    probe: async (port) => { ports.push(port); return true; },
  });
  try {
    monitor.watch(4000);
    await waitFor(() => monitor.state?.status === 'running', 'first server');
    expect(subscriptions).toBe(1);
    monitor.watch(5000);
    await waitFor(() => ports.includes(5000) && monitor.state?.status === 'running', 'replacement server');
    expect(subscriptions).toBe(1);
    const refreshedAt = performance.now();
    activity.update({ focused: true });
    await waitFor(() => ports.length >= 3, 'replacement focus refresh');
    expect(performance.now() - refreshedAt).toBeLessThan(500);
    expect(ports).toEqual([4000, 5000, 5000]);
    activity.update({ focused: false });
    monitor.stop(false);
    expect(subscriptions).toBe(0);
    const stoppedCount = ports.length;
    activity.update({ focused: true });
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(ports).toHaveLength(stoppedCount);
  } finally {
    monitor.stop(false);
  }
});

async function waitFor(condition: () => boolean, what: string): Promise<void> {
  for (let turn = 0; turn < 5_000; turn += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function quiesce(): Promise<void> {
  for (let turn = 0; turn < 50; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('probePort — the instrument', () => {
  it('answers true for a socket that is actually listening', async () => {
    const server = await listen('127.0.0.1');
    try {
      expect(await probePort(server.port)).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('answers false once that same socket is gone', async () => {
    const server = await listen('127.0.0.1');
    const { port } = server;
    await server.close();
    expect(await probePort(port)).toBe(false);
  });

  it('answers true for a server bound ONLY to ::1 (ONL-1896)', async () => {
    const server = await listen('::1');
    try {
      expect(await probePort(server.port)).toBe(true);
    } finally {
      await server.close();
    }
  });
});

describe('ServerMonitor', () => {
  it('passively recovers an unexpectedly lost listener only after proving ownership', async () => {
    const seen: ServerState[] = [];
    let listening = true;
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      emit: (state) => seen.push(state),
      probe: async () => listening,
      identify: async () => ({ pid: listening ? 222 : 111, cwd: '/repos/ours/apps/web' }),
      delay: immediately,
      timing: { runningFailures: 1 },
    });

    monitor.watch(4321);
    await waitFor(() => seen.at(-1)?.status === 'running', 'the owned listener to start');

    listening = false;
    await waitFor(() => seen.at(-1)?.status === 'stopped', 'the lost listener to be noticed');
    expect(seen.at(-1)).toEqual({ status: 'stopped' });

    listening = true;
    await waitFor(
      () => seen.filter((state) => state.status === 'running').length === 2,
      'the owned listener to recover without another watch',
    );
    expect(seen).toEqual([
      { status: 'starting', port: 4321 },
      { status: 'running', port: 4321 },
      { status: 'stopped' },
      { status: 'running', port: 4321 },
    ]);
    monitor.stop(false);
  });

  it('reaches running against a real server, and stopped when it goes away', async () => {
    const server = await listen('127.0.0.1');
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: (identity) => verifiesFor(identity, process.cwd()),
      identify: identifyListener,
      emit: (state) => seen.push(state),
      delay: immediately,
      timing: { runningFailures: 1 },
    });

    monitor.watch(server.port);
    await waitFor(() => seen.length >= 2, 'the real port to answer');
    expect(seen).toEqual([
      { status: 'starting', port: server.port },
      { status: 'running', port: server.port },
    ]);

    await server.close();
    await waitFor(() => seen.at(-1)?.status === 'stopped', 'the closed port to be noticed');
    expect(seen.at(-1)).toEqual({ status: 'stopped' });
    monitor.stop(false);
  });

  it('announces starting before it has looked at anything', () => {
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      identify: resolvesNoIdentity,
      emit: (state) => seen.push(state),
      probe: async () => false,
      delay: immediately,
      timing: { waitingAttempts: 1 },
    });

    monitor.watch(4321);
    expect(seen[0]).toEqual({ status: 'starting', port: 4321 });
    monitor.stop(false);
  });

  it('waits out a server that is still binding', async () => {
    const seen: ServerState[] = [];
    let probes = 0;
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      identify: resolvesNoIdentity,
      emit: (state) => seen.push(state),
      probe: async () => {
        probes += 1;
        return probes >= 3;
      },
      delay: immediately,
      timing: { waitingAttempts: 10 },
    });

    monitor.watch(4321);
    await waitFor(() => seen.length >= 2, 'the third probe to answer');
    expect(seen).toEqual([
      { status: 'starting', port: 4321 },
      { status: 'running', port: 4321 },
    ]);
    monitor.stop(false);
  });

  it('a second watch supersedes the first, which stops emitting', async () => {
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      identify: resolvesNoIdentity,
      emit: (state) => seen.push(state),
      probe: async (port) => port === 5555,
      delay: immediately,
      timing: { waitingAttempts: 50 },
    });

    monitor.watch(4321);
    monitor.watch(5555);
    await waitFor(() => seen.some((state) => state.status === 'running'), 'port 5555 to answer');
    await quiesce();
    monitor.stop(false);

    expect(seen.filter((state) => state.status === 'running')).toEqual([
      { status: 'running', port: 5555 },
    ]);
    expect(seen.at(-1)).toEqual({ status: 'running', port: 5555 });
  });
});

describe('frame_state_changed through the injected seam', () => {
  const workspaceTelemetry = { project_id: 'a1b2c3d4e5f60718', workspace_instance_id: 'instance-1' };
  const otherWorkspaceTelemetry = { project_id: 'b2c3d4e5f6071829', workspace_instance_id: 'instance-2' };

  it("a same-port rewatch to a DIFFERENT project mid-'starting' still records", async () => {
    const recorded: FrameStateChange[] = [];
    const seen: ServerState[] = [];
    let answering = false;
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      identify: resolvesNoIdentity,
      emit: (state) => seen.push(state),
      onFrameState: (change) => recorded.push(change),
      probe: async () => answering,
      delay: immediately,
      timing: { waitingAttempts: 5_000 },
    });

    monitor.watch(4321, workspaceTelemetry);
    await waitFor(
      () => recorded.some((change) => change.workspaceTelemetry.project_id === workspaceTelemetry.project_id),
      "project A's loading recording",
    );

    monitor.watch(4321, { ...workspaceTelemetry });
    expect(recorded).toHaveLength(1);

    monitor.watch(4321, otherWorkspaceTelemetry);
    await waitFor(
      () => recorded.some((change) => change.workspaceTelemetry.project_id === otherWorkspaceTelemetry.project_id),
      "project B's loading recording",
    );
    expect(seen.filter((state) => state.status === 'starting')).toHaveLength(1);
    expect(recorded.map((change) => ({ workspaceTelemetry: change.workspaceTelemetry, state: change.state }))).toEqual(
      [
        { workspaceTelemetry, state: 'loading' },
        { workspaceTelemetry: otherWorkspaceTelemetry, state: 'loading' },
      ],
    );

    answering = true;
    await waitFor(() => recorded.some((change) => change.state === 'live'), "project B's live");
    monitor.stop(false);
    expect(recorded.at(-1)).toEqual(
      expect.objectContaining({ workspaceTelemetry: otherWorkspaceTelemetry, state: 'live' }),
    );
  });
});

describe('ownership, through the driver', () => {
  it('does not ask who holds a port that nothing answered', async () => {
    const seen: ServerState[] = [];
    let asked = 0;
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      emit: (state) => seen.push(state),
      probe: async () => false,
      identify: async (port) => {
        asked += 1;
        return { pid: 1, cwd: `/nowhere/${port}` };
      },
      delay: immediately,
      timing: { waitingAttempts: 3 },
    });

    monitor.watch(4321);
    await waitFor(() => seen.at(-1)?.status === 'stopped', 'the give-up sequence to finish');
    expect(asked).toBe(0);
  });

  it('refuses to call a port running when its listener is outside the claimed folder', async () => {
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      emit: (state) => seen.push(state),
      probe: async () => true,
      identify: async () => ({ pid: 999, cwd: '/somebody/elses/project' }),
      delay: immediately,
    });

    monitor.watch(4321);
    await waitFor(() => seen.at(-1)?.status === 'stopped', 'the foreign port to be rejected');
    expect(seen.map((state) => state.status)).toEqual(['starting', 'stopped']);
  });

  it('calls the same answering port running when the listener verifies', async () => {
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      emit: (state) => seen.push(state),
      probe: async () => true,
      identify: async () => ({ pid: 111, cwd: '/repos/ours/apps/web' }),
      delay: immediately,
    });

    monitor.watch(4321);
    await waitFor(() => seen.at(-1)?.status === 'running', 'our port to be accepted');
    expect(seen.map((state) => state.status)).toEqual(['starting', 'running']);
  });

  it('treats a resolver that throws as unknown rather than dying', async () => {
    const seen: ServerState[] = [];
    const monitor = new ServerMonitor({
      adjudicate: verifyAgainstOwnFolder,
      emit: (state) => seen.push(state),
      probe: async () => true,
      identify: async () => {
        throw new Error('lsof is not on this machine');
      },
      delay: immediately,
    });

    monitor.watch(4321);
    await waitFor(() => seen.at(-1)?.status === 'running', 'the loop to survive a broken resolver');
    expect(seen.map((state) => state.status)).toEqual(['starting', 'running']);
  });
});
