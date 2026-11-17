// Real timers: a fake clock that never fires passes every negative case here.

import { describe, expect, it } from 'bun:test';
import type { UpdateState, UpdateStatus } from '@studio/events';
import { UpdateMachine } from './machine.js';

const LINGER_MS = 5;

async function waitFor(condition: () => boolean, what: string): Promise<void> {
  for (let turn = 0; turn < 5_000; turn += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function quiesce(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, LINGER_MS * 6));
}

function record(): { seen: UpdateState[]; statuses: () => UpdateStatus[] } {
  const seen: UpdateState[] = [];
  return { seen, statuses: () => seen.map((state) => state.status) };
}

describe('the up-to-date linger', () => {
  it('returns to idle exactly once', async () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.upToDate();
    expect(statuses()).toEqual(['up-to-date']);

    await waitFor(() => seen.length >= 2, 'the linger to return to idle');
    expect(statuses()).toEqual(['up-to-date', 'idle']);

    await quiesce();
    expect(statuses()).toEqual(['up-to-date', 'idle']);
  });

  it('a second up-to-date re-arms the timer rather than stacking a second idle', async () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.upToDate();
    machine.upToDate();
    await quiesce();

    expect(statuses()).toEqual(['up-to-date', 'up-to-date', 'idle']);
    expect(statuses().filter((status) => status === 'idle')).toHaveLength(1);
  });

  it('a state transition during the linger cancels it', async () => {
    const cancelled = record();
    const control = record();
    const machine = new UpdateMachine({
      emit: (state) => cancelled.seen.push(state),
      lingerMs: LINGER_MS,
    });
    const untouched = new UpdateMachine({
      emit: (state) => control.seen.push(state),
      lingerMs: LINGER_MS,
    });

    machine.upToDate();
    untouched.upToDate();
    machine.checking();

    await quiesce();

    expect(control.statuses()).toEqual(['up-to-date', 'idle']);
    expect(cancelled.statuses()).toEqual(['up-to-date', 'checking']);
  });
});

describe('unsupported vs error', () => {
  it('error is recoverable — the update a later check finds moves off it', async () => {
    const { statuses, seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.checking();
    machine.available('2.0.0');

    expect(statuses()).toEqual(['checking', 'error', 'available']);
  });

  it('a background check leaves a shown failure up instead of blinking the pill away', () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.checking();
    expect(machine.current()).toEqual({ status: 'error', message: 'offline' });

    machine.failed('offline');
    expect(statuses()).toEqual(['checking', 'error', 'error']);
  });

  it('the user asking moves off a shown failure, because they are watching', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.requestCheck();

    expect(seen.at(-1)).toEqual({ status: 'checking', requested: true });
  });

  it('a click adopting the background check under a shown failure draws the checking it suppressed', () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.checking();
    machine.claimCheck();

    expect(statuses()).toEqual(['checking', 'error', 'checking']);
    expect(seen.at(-1)).toEqual({ status: 'checking', requested: true });
  });

  it('a click landing after the verdict leaves it alone rather than stranding the pill on checking', () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.checking();
    machine.upToDate();
    machine.claimCheck();

    expect(statuses()).toEqual(['checking', 'up-to-date']);
  });

  it('the verdict of a check nobody asked for clears a failure it has disproved', async () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.checkFinished();
    machine.checking();
    machine.upToDate();

    expect(seen.at(-1)).toEqual({ status: 'up-to-date' });
    await waitFor(() => statuses().at(-1) === 'idle', 'the linger to return to idle');
  });

  it('reaching unsupported takes the configure-phase entry point, which no check calls', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.unsupported('This is a development build and does not update itself.');
    expect(machine.current().status).toBe('unsupported');

    for (const drive of [
      (m: UpdateMachine) => m.checking(),
      (m: UpdateMachine) => m.available('1.0.0'),
      (m: UpdateMachine) => m.downloading(10),
      (m: UpdateMachine) => m.downloaded('1.0.0'),
      (m: UpdateMachine) => m.upToDate(),
      (m: UpdateMachine) => m.failed('boom'),
    ]) {
      const fresh = new UpdateMachine({ emit: () => {}, lingerMs: LINGER_MS });
      drive(fresh);
      expect(fresh.current().status).not.toBe('unsupported');
    }
  });
});

describe('the periodic check', () => {
  it('keeps checking while an update is downloaded', async () => {
    let skipped = 0;
    let ran = 0;
    const staged = new UpdateMachine({ emit: () => {}, checkIntervalMs: 1 });
    const idle = new UpdateMachine({ emit: () => {}, checkIntervalMs: 1 });

    staged.downloaded('1.2.3');
    staged.startPeriodicChecks(() => {
      skipped += 1;
    });
    idle.startPeriodicChecks(() => {
      ran += 1;
    });

    await waitFor(() => ran > 0, 'the control machine to check at least once');
    await quiesce();
    staged.stopPeriodicChecks();
    idle.stopPeriodicChecks();

    expect(ran).toBeGreaterThan(0);
    expect(skipped).toBeGreaterThan(0);
  });

  it('stops when told to', async () => {
    let checks = 0;
    const machine = new UpdateMachine({ emit: () => {}, checkIntervalMs: 1 });

    machine.startPeriodicChecks(() => {
      checks += 1;
    });
    await waitFor(() => checks > 0, 'the first check');
    machine.stopPeriodicChecks();

    const afterStop = checks;
    await quiesce();
    expect(checks).toBe(afterStop);
  });
});

describe('restart to update', () => {
  const drives: Array<[UpdateStatus, (machine: UpdateMachine) => void]> = [
    ['idle', () => {}],
    ['unsupported', (m) => m.unsupported('dev build')],
    ['checking', (m) => m.checking()],
    ['available', (m) => m.available('1.2.3')],
    ['downloading', (m) => m.downloading(50)],
    ['downloaded', (m) => m.downloaded('1.2.3')],
    ['up-to-date', (m) => m.upToDate()],
    [
      'error',
      (m) => {
        m.requestCheck();
        m.failed('boom');
      },
    ],
  ];

  for (const [status, drive] of drives) {
    const shouldRun = status === 'downloaded';

    it(`${shouldRun ? 'installs' : 'refuses'} in "${status}"`, () => {
      let installs = 0;
      const machine = new UpdateMachine({ emit: () => {}, lingerMs: LINGER_MS });

      drive(machine);
      expect(machine.current().status).toBe(status);

      const ran = machine.restart(() => {
        installs += 1;
      });

      expect(ran).toBe(shouldRun);
      expect(installs).toBe(shouldRun ? 1 : 0);
      expect(machine.canRestart()).toBe(false);
    });
  }

  it('ignores a second restart click', () => {
    let installs = 0;
    const machine = new UpdateMachine({ emit: () => {}, lingerMs: LINGER_MS });

    machine.downloaded('1.2.3');
    expect(machine.restart(() => (installs += 1))).toBe(true);

    machine.checking();
    expect(machine.restart(() => (installs += 1))).toBe(false);
    expect(installs).toBe(1);
  });
});

describe('a waiting update', () => {
  it('clears a stalled restart and reports the install failure', async () => {
    const errors: Error[] = [];
    const machine = new UpdateMachine({ emit: () => {}, restartTimeoutMs: 1, onInstallFailure: (error) => errors.push(error) });
    machine.downloaded('1.2.3');
    machine.restart(() => {});
    expect(machine.current().restarting).toBe(true);
    await waitFor(() => machine.current().status === 'error', 'the restart to time out');
    expect(errors).toHaveLength(1);
    machine.downloaded('1.2.3');
    expect(machine.current().restarting).toBeUndefined();
    expect(machine.canRestart()).toBe(true);
    machine.dispose();
  });

  it('never abandons native preparation on a renderer or timer guess', async () => {
    let installs = 0;
    const machine = new UpdateMachine({ emit: () => {}, waitForNativeStage: true, restartTimeoutMs: 1 });
    machine.downloaded('1.2.3');
    machine.restart(() => { installs += 1; });
    await quiesce();
    expect(installs).toBe(0);
    expect(machine.isStaging()).toBe(true);
    expect(machine.current()).toEqual({ status: 'downloaded', version: '1.2.3', restarting: true });
    machine.nativeStaged();
    expect(installs).toBe(1);
    machine.dispose();
  });

  it('keeps the pill through a check, progress, and a replacement download', () => {
    const seen: UpdateState[] = [];
    const machine = new UpdateMachine({ emit: (state) => seen.push(state) });
    machine.downloaded('1.2.3');
    machine.checking();
    machine.available('1.2.4');
    machine.downloading(50);
    machine.downloaded('1.2.4');
    expect(seen.map((state) => state.status)).toEqual(['downloaded', 'downloaded']);
    expect(machine.current().version).toBe('1.2.4');
  });

  it('shows a staging failure immediately instead of silently hiding the pill', () => {
    const machine = new UpdateMachine({ emit: () => {} });
    machine.downloaded('1.2.3');
    machine.failed('Squirrel could not prepare the update');
    expect(machine.current()).toEqual({ status: 'error', message: 'Squirrel could not prepare the update' });
    expect(machine.canRestart()).toBe(false);
  });
});

describe('a refused check (no updater configured)', () => {
  it('walks the pill and RESTORES the verdict it interrupted, never landing on idle', async () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });
    machine.unsupported('dev build');

    machine.refusedCheck(1);
    await waitFor(() => seen.length >= 4, 'the refused walk to land back on unsupported');
    await quiesce();

    expect(statuses()).toEqual(['unsupported', 'checking', 'up-to-date', 'unsupported']);
    expect(seen.at(-1)).toEqual({ status: 'unsupported', message: 'dev build' });
    expect(machine.current()).toEqual({ status: 'unsupported', message: 'dev build' });
  });

  it('a second click mid-walk cannot drop the verdict the first one is restoring', async () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });
    machine.unsupported('dev build');

    machine.refusedCheck(1);
    await waitFor(() => seen.some((state) => state.status === 'up-to-date'), 'the refused walk to reach its verdict');
    machine.refusedCheck(1);
    await waitFor(() => seen.length >= 4, 'the walk to restore what it interrupted');
    await quiesce();

    expect(statuses()).toEqual(['unsupported', 'checking', 'up-to-date', 'unsupported']);
    expect(machine.current()).toEqual({ status: 'unsupported', message: 'dev build' });
  });

  it('is a no-op while a real check is already in flight', () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.checking();
    machine.refusedCheck(1);

    expect(statuses()).toEqual(['checking']);
  });
});

describe('a background failure', () => {
  const N = 3;
  const make = () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({
      emit: (state) => seen.push(state),
      lingerMs: LINGER_MS,
      shownAfterFailures: N,
    });
    return { machine, seen, statuses };
  };
  const backgroundFailure = (machine: UpdateMachine) => {
    machine.checking();
    machine.failed('getaddrinfo ENOTFOUND updates.example.com');
  };

  it('is silent below the threshold and shown on the Nth in a row', () => {
    const { machine, statuses } = make();

    for (let n = 1; n < N; n += 1) {
      backgroundFailure(machine);
      expect(machine.current()).toEqual({ status: 'idle' });
    }
    expect(statuses()).not.toContain('error');

    backgroundFailure(machine);
    expect(machine.current().status).toBe('error');
  });

  it('a success resets the count, so the next single failure is silent again', () => {
    const { machine } = make();

    for (let n = 1; n < N; n += 1) backgroundFailure(machine);
    machine.checking();
    machine.upToDate();

    backgroundFailure(machine);
    expect(machine.current()).toEqual({ status: 'idle' });
  });

  it('once shown, a later background failure keeps it shown', () => {
    const { machine } = make();

    for (let n = 1; n <= N; n += 1) backgroundFailure(machine);
    expect(machine.current().status).toBe('error');

    backgroundFailure(machine);
    expect(machine.current().status).toBe('error');
  });
});

describe('a requested check', () => {
  it('shows its failure at once, even when it is the first', () => {
    const { seen, statuses } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.checking();
    machine.failed('offline');

    expect(statuses()).toEqual(['checking', 'checking', 'error']);
    expect(seen.at(-1)).toEqual({ status: 'error', message: 'offline' });
  });

  it('a shown failure stays through later background failures until a success', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.failed('offline');
    machine.checking();
    machine.failed('offline');
    expect(machine.current().status).toBe('error');

    machine.checking();
    machine.upToDate();
    machine.checking();
    machine.failed('offline');
    expect(machine.current()).toEqual({ status: 'idle' });
  });

  it('the request is spent by its own failure; the next background one is counted, not shown', () => {
    const { seen } = record();
    const machine = new UpdateMachine({
      emit: (state) => seen.push(state),
      lingerMs: LINGER_MS,
      shownAfterFailures: 5,
    });

    machine.requestCheck();
    machine.available('1.0.0');
    machine.checking();
    machine.failed('offline');

    expect(machine.current()).toEqual({ status: 'idle' });
  });
});

describe('who asked for the check', () => {
  it('leaves a background check unclaimed, so its pill states can stay silent', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.checking();
    machine.upToDate();

    expect(seen).toEqual([{ status: 'checking' }, { status: 'up-to-date' }]);
  });

  it('claims a requested check through to its verdict', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.upToDate();

    expect(seen).toEqual([
      { status: 'checking', requested: true },
      { status: 'up-to-date', requested: true },
    ]);
  });

  it('a refused check is the user asking, so its walk is claimed too', async () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });
    machine.unsupported('dev build');

    machine.refusedCheck(1);
    await waitFor(() => seen.length >= 3, 'the refused walk to reach its verdict');

    expect(seen.slice(1, 3)).toEqual([
      { status: 'checking', requested: true },
      { status: 'up-to-date', requested: true },
    ]);
  });

  it('spends the claim on the verdict, so the next background check is unclaimed', () => {
    const { seen } = record();
    const machine = new UpdateMachine({ emit: (state) => seen.push(state), lingerMs: LINGER_MS });

    machine.requestCheck();
    machine.upToDate();
    machine.checking();

    expect(seen.at(-1)).toEqual({ status: 'checking' });
  });
});
