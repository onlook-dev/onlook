import { describe, expect, it } from 'bun:test';
import type { ServerState } from '@studio/events';
import { ServerMachine, type FrameStateChange, type MonitorTiming } from './machine.js';

function build(timing?: Partial<MonitorTiming>): {
  machine: ServerMachine;
  states: ServerState[];
  records: FrameStateChange[];
  clock: { value: number };
} {
  const states: ServerState[] = [];
  const records: FrameStateChange[] = [];
  const clock = { value: 1_000 };
  const machine = new ServerMachine({
    emit: (state) => states.push(state),
    onFrameState: (change) => records.push(change),
    now: () => clock.value,
    ...(timing === undefined ? {} : { timing }),
  });
  return { machine, states, records, clock };
}

function reachRunning(machine: ServerMachine, port = 3000, pid = 111): void {
  machine.reportedPort(port);
  machine.observed({ answered: true, ownership: 'ours', pid });
}

const statuses = (states: ServerState[]): string[] => states.map((s) => s.status);

describe('the instrument', () => {
  it('reaches running from nothing, so the negative cases mean something', () => {
    const { machine, states } = build();
    expect(machine.current().status).toBe('stopped');
    reachRunning(machine);
    expect(machine.current().status).toBe('running');
    expect(statuses(states)).toEqual(['starting', 'running']);
  });
});

describe('starting', () => {
  it('shows starting on the press, before any port exists', () => {
    const { machine, states } = build();
    machine.pressedStart();
    expect(machine.current()).toEqual({ status: 'starting' });
    expect(machine.nextPoll()).toBeUndefined();
    expect(statuses(states)).toEqual(['starting']);
  });

  it('takes a target from the agent report, and asks for it immediately', () => {
    const { machine } = build();
    machine.pressedStart();
    machine.reportedPort(5173);
    expect(machine.current()).toEqual({ status: 'starting', port: 5173 });
    expect(machine.nextPoll()).toEqual({ port: 5173, delayMs: 0, resolveOwner: true });
  });

  it('falls back to the default port when the agent named none', () => {
    const { machine } = build();
    machine.reportedPort();
    expect(machine.current().port).toBe(3000);
  });

  it('does NOT reach running when the port belongs to somebody else', () => {
    const { machine } = build();
    machine.reportedPort(3000);
    machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(machine.nextPoll()).toBeUndefined();
  });

  it('DOES reach running when the port answers and we simply could not see', () => {
    const { machine } = build();
    machine.reportedPort(3000);
    machine.observed({ answered: true, ownership: 'unknown' });
    expect(machine.current()).toEqual({ status: 'running', port: 3000 });
  });

  it('backs off between attempts, up to the cap', () => {
    const { machine } = build({ waitingMs: 100, waitingBackoffSteps: 3, waitingAttempts: 10 });
    machine.reportedPort(3000);
    expect(machine.nextPoll()?.delayMs).toBe(0);
    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(100);
    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(200);
    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(300);
    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(300);
  });

  it('gives up on a reported port that never answers', () => {
    const { machine, states } = build({ waitingAttempts: 3 });
    machine.reportedPort(3000);
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    expect(machine.current().status).toBe('starting');
    machine.observed({ answered: false });
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(statuses(states)).toEqual(['starting', 'stopped']);
  });
});

describe('a turn ending', () => {
  it('cancels a press nothing ever answered', () => {
    const { machine } = build();
    machine.pressedStart();
    machine.turnStarted();
    machine.turnEnded();
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('does NOT cancel a press that main is already measuring', () => {
    const { machine } = build();
    machine.pressedStart();
    machine.turnStarted();
    machine.reportedPort(3000);
    machine.turnEnded();
    expect(machine.current()).toEqual({ status: 'starting', port: 3000 });
  });

  it('does NOT cancel a press whose turn has not begun', () => {
    const { machine } = build();
    machine.pressedStart();
    machine.turnEnded();
    expect(machine.current()).toEqual({ status: 'starting' });
  });
});

describe('running', () => {
  it('does not report stopped for a blip — a restarting server keeps the button', () => {
    const { machine, states } = build({ runningFailures: 3 });
    reachRunning(machine);
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    expect(machine.current().status).toBe('running');
    expect(statuses(states)).toEqual(['starting', 'running']);
  });

  it('reports stopped after enough consecutive failures', () => {
    const { machine } = build({ runningFailures: 3 });
    reachRunning(machine);
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(machine.nextPoll()).toEqual({ port: 3000, delayMs: 2_000, resolveOwner: true });
  });

  it('recovers the unexpectedly lost port only when an owned listener returns', () => {
    const { machine, states } = build({ runningFailures: 1 });
    reachRunning(machine);
    machine.observed({ answered: false });

    machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    expect(machine.current()).toEqual({ status: 'stopped' });
    machine.observed({ answered: true, ownership: 'unknown' });
    expect(machine.current()).toEqual({ status: 'stopped' });

    machine.observed({ answered: true, ownership: 'ours', pid: 222 });
    expect(machine.current()).toEqual({ status: 'running', port: 3000 });
    expect(statuses(states)).toEqual(['starting', 'running', 'stopped', 'running']);
  });

  it('an explicit Stop cancels passive recovery after an unexpected death', () => {
    const { machine } = build({ runningFailures: 1 });
    reachRunning(machine);
    machine.observed({ answered: false });
    expect(machine.nextPoll()).toBeDefined();

    machine.pressedStop();
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(machine.nextPoll()).toBeUndefined();
    machine.observed({ answered: true, ownership: 'ours', pid: 222 });
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('a recovered probe clears the failure count', () => {
    const { machine } = build({ runningFailures: 3 });
    reachRunning(machine);
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    machine.observed({ answered: false });
    machine.observed({ answered: false });
    expect(machine.current().status).toBe('running');
  });

  it('drops out of running when the port comes back in a stranger’s hands', () => {
    const { machine } = build({ runningFailures: 3 });
    reachRunning(machine);
    machine.observed({ answered: false });
    machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(machine.nextPoll()).toEqual({ port: 3000, delayMs: 4_000, resolveOwner: true });
    machine.observed({ answered: true, ownership: 'ours', pid: 222 });
    expect(machine.current()).toEqual({ status: 'running', port: 3000 });
  });

  it('an answering stranger backs the recovery watch off; quiet resets it', () => {
    const { machine } = build({ runningFailures: 1 });
    reachRunning(machine);
    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(2_000);

    machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    expect(machine.nextPoll()?.delayMs).toBe(4_000);
    machine.observed({ answered: true, ownership: 'unknown' });
    expect(machine.nextPoll()?.delayMs).toBe(6_000);

    for (let i = 0; i < 40; i += 1) {
      machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    }
    expect(machine.nextPoll()?.delayMs).toBe(30_000);

    machine.observed({ answered: false });
    expect(machine.nextPoll()?.delayMs).toBe(2_000);
    machine.observed({ answered: true, ownership: 'ours', pid: 222 });
    expect(machine.current()).toEqual({ status: 'running', port: 3000 });
  });

  it('asks who holds the port only while something is off', () => {
    const { machine } = build();
    reachRunning(machine);
    expect(machine.nextPoll()?.resolveOwner).toBe(false);

    machine.observed({ answered: false });
    expect(machine.nextPoll()?.resolveOwner).toBe(true);

    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.nextPoll()?.resolveOwner).toBe(false);
  });
});

describe('stopping', () => {
  it('enters a pending state on the press, without claiming anything', () => {
    const { machine, states } = build();
    reachRunning(machine);
    machine.pressedStop();
    expect(machine.current()).toEqual({ status: 'stopping', port: 3000 });
    expect(statuses(states)).toEqual(['starting', 'running', 'stopping']);
    const poll = machine.nextPoll();
    expect(poll?.delayMs).toBe(500);
    expect(poll?.resolveOwner).toBe(true);
  });

  it('resolves to stopped when the port goes quiet', () => {
    const { machine } = build();
    reachRunning(machine);
    machine.pressedStop();
    machine.observed({ answered: false });
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(machine.nextPoll()).toBeUndefined();
  });

  it('resolves to stopped when the port is answered by a different process', () => {
    const { machine } = build();
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 222 });
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('resolves to stopped when the port is answered by a stranger', () => {
    const { machine } = build();
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'foreign', pid: 999 });
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('admits the stop did not land once the bound elapses', () => {
    const { machine, states } = build({ stopAttempts: 3 });
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.current().status).toBe('stopping');
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.current()).toEqual({ status: 'stop-failed', port: 3000 });
    expect(statuses(states)).toEqual(['starting', 'running', 'stopping', 'stop-failed']);
  });

  it('goes straight to stopped when there is nothing to watch', () => {
    const { machine } = build();
    machine.pressedStart();
    machine.pressedStop();
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('is a no-op when nothing is running', () => {
    const { machine, states } = build();
    machine.pressedStop();
    expect(machine.current()).toEqual({ status: 'stopped' });
    expect(states).toEqual([]);
  });
});

describe('stop-failed', () => {
  it('resolves to stopped if the server finally goes away', () => {
    const { machine } = build({ stopAttempts: 1 });
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.current().status).toBe('stop-failed');

    machine.observed({ answered: false });
    expect(machine.current()).toEqual({ status: 'stopped' });
  });

  it('accepts another stop press', () => {
    const { machine } = build({ stopAttempts: 1 });
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    machine.pressedStop();
    expect(machine.current()).toEqual({ status: 'stopping', port: 3000 });
  });

  it('keeps polling, without paying for an ownership lookup', () => {
    const { machine } = build({ stopAttempts: 1 });
    reachRunning(machine, 3000, 111);
    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.nextPoll()).toEqual({ port: 3000, delayMs: 2_000, resolveOwner: false });
  });
});

describe('emitting', () => {
  it('does not emit the same state twice', () => {
    const { machine, states } = build();
    reachRunning(machine);
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(statuses(states)).toEqual(['starting', 'running']);
  });

  it('a silent reset — the teardown path — announces nothing at all', () => {
    const { machine, states } = build();
    reachRunning(machine);
    states.length = 0;
    machine.reset(false);
    expect(states).toEqual([]);
    expect(machine.nextPoll()).toBeUndefined();
  });
});

describe('frame_state_changed through the injected seam', () => {
  const workspaceTelemetry = { project_id: 'hashed-project', workspace_instance_id: 'instance-1' };

  it("records loading then live, with an elapsed clock that moved", () => {
    const { machine, records, clock } = build();
    machine.reportedPort(3000, workspaceTelemetry);
    clock.value += 250;
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(records).toEqual([
      { workspaceTelemetry, state: 'loading', elapsedMs: 0 },
      { workspaceTelemetry, state: 'live', elapsedMs: 250 },
    ]);
  });

  it('keeps the three-value vocabulary across the new states', () => {
    const { machine, records } = build({ stopAttempts: 1 });
    reachRunning(machine, 3000, 111);
    machine.reportedPort(3000, workspaceTelemetry);
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    records.length = 0;

    machine.pressedStop();
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    expect(machine.current().status).toBe('stop-failed');
    expect(records).toEqual([]);
  });

  it('deduplicates by legacy project id even when the instance changes', () => {
    const { machine, records } = build();
    machine.reportedPort(3000, workspaceTelemetry);
    machine.reportedPort(3000, { ...workspaceTelemetry, workspace_instance_id: 'instance-2' });
    expect(records).toEqual([{ workspaceTelemetry, state: 'loading', elapsedMs: 0 }]);
  });

  it('a watch with no project id emits states but records nothing', () => {
    const { machine, states, records } = build();
    reachRunning(machine);
    expect(statuses(states)).toEqual(['starting', 'running']);
    expect(records).toEqual([]);
  });

  it('a deliberate reset records nothing, while still announcing', () => {
    const { machine, states, records } = build();
    machine.reportedPort(3000, workspaceTelemetry);
    machine.observed({ answered: true, ownership: 'ours', pid: 111 });
    records.length = 0;
    states.length = 0;

    machine.reset();
    expect(statuses(states)).toEqual(['stopped']);
    expect(records).toEqual([]);
  });
});
