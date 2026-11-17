import { describe, expect, it } from 'bun:test';
import { createQuitTeardown } from './quit-teardown.js';

function latch(): { signal: () => void; done: Promise<void>; fired: () => boolean } {
  let fired = false;
  let signal!: () => void;
  const done = new Promise<void>((resolve) => {
    signal = (): void => {
      fired = true;
      resolve();
    };
  });
  return { signal, done, fired: () => fired };
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function timerAfter(ms: number): { fired: () => boolean } {
  let fired = false;
  setTimeout(() => {
    fired = true;
  }, ms);
  return { fired: () => fired };
}

describe('createQuitTeardown', () => {
  it('runs once — a second invocation is a no-op', async () => {
    const calls: string[] = [];
    const onDone = latch();
    const teardown = createQuitTeardown({
      synchronous: [() => calls.push('sync')],
      drainChain: [
        async () => {
          calls.push('drain');
        },
      ],
      capMs: 50,
      onDone: onDone.signal,
    });

    expect(teardown.hasRun).toBe(false);
    teardown.run();
    expect(teardown.hasRun).toBe(true);
    teardown.run();
    await onDone.done;
    teardown.run();
    await tick();

    expect(calls).toEqual(['sync', 'drain']);
  });

  it('the drain chain runs in order — dispose resolves before shutdown starts', async () => {
    const order: string[] = [];
    const onDone = latch();
    const teardown = createQuitTeardown({
      synchronous: [],
      drainChain: [
        async () => {
          order.push('dispose:start');
          await tick();
          order.push('dispose:end');
        },
        async () => {
          order.push('shutdown:start');
          order.push('shutdown:end');
        },
      ],
      capMs: 50,
      onDone: onDone.signal,
    });

    teardown.run();
    await onDone.done;

    expect(order).toEqual(['dispose:start', 'dispose:end', 'shutdown:start', 'shutdown:end']);
  });

  it('a hung dispose is capped: onDone fires by capMs, shutdown abandoned', async () => {
    let shutdownRan = false;
    const onDone = latch();
    const teardown = createQuitTeardown({
      synchronous: [],
      drainChain: [
        () => new Promise(() => {}),
        async () => {
          shutdownRan = true;
        },
      ],
      capMs: 25,
      onDone: onDone.signal,
    });

    teardown.run();
    const sameDelayTimer = timerAfter(25);
    await onDone.done;

    expect(sameDelayTimer.fired()).toBe(false);
    expect(shutdownRan).toBe(false);
  });

  it('a fast chain fires onDone before the cap', async () => {
    const onDone = latch();
    const teardown = createQuitTeardown({
      synchronous: [],
      drainChain: [async () => {}, async () => {}],
      capMs: 5_000,
      onDone: onDone.signal,
    });

    teardown.run();
    const nextTurn = timerAfter(0);
    await onDone.done;

    expect(nextTurn.fired()).toBe(false);
  });

  it('synchronous disposers run, in order, before the async chain starts', () => {
    const order: string[] = [];
    const teardown = createQuitTeardown({
      synchronous: [() => order.push('flush'), () => order.push('terminal')],
      drainChain: [
        async () => {
          order.push('dispose:start');
        },
      ],
      capMs: 50,
      onDone: () => {},
    });

    teardown.run();

    expect(order).toEqual(['flush', 'terminal', 'dispose:start']);
  });

  it('a synchronous disposer that throws forfeits its cleanup, not the exit', async () => {
    const order: string[] = [];
    let done = false;
    const teardown = createQuitTeardown({
      synchronous: [
        () => {
          throw new Error('flush blew up');
        },
        () => order.push('terminal'),
      ],
      drainChain: [
        async () => {
          order.push('dispose');
        },
      ],
      capMs: 50,
      onDone: () => {
        done = true;
      },
    });

    teardown.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(['terminal', 'dispose']);
    expect(done).toBe(true);
  });

  it('a first drain step that throws synchronously still reaches onDone', async () => {
    let done = false;
    const teardown = createQuitTeardown({
      synchronous: [],
      drainChain: [
        () => {
          throw new Error('close blew up');
        },
        async () => {},
      ],
      capMs: 50,
      onDone: () => {
        done = true;
      },
    });

    teardown.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(done).toBe(true);
  });
});
