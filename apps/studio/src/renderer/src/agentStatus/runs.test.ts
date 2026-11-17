import { describe, expect, it } from 'bun:test';
import { RowRuns, type Playback } from './runs.js';

function playback(): Playback & { stopped: boolean; finish: () => Promise<void> } {
  let done: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    done = resolve;
  });
  const handle = {
    stopped: false,
    stop: () => {
      handle.stopped = true;
    },
    finished,
    finish: async () => {
      done();
      await finished;
    },
  };
  return handle;
}

function counted(): { runs: RowRuns; moving: () => number } {
  let moving = 0;
  const runs = new RowRuns(() => ({
    begin: () => {
      moving += 1;
    },
    end: () => {
      moving -= 1;
    },
  }));
  return { runs, moving: () => moving };
}

describe("a status row's running animations", () => {
  it('count while they run and stop counting when they finish', async () => {
    const { runs, moving } = counted();
    const a = playback();
    runs.run(() => a);
    runs.run(playback);
    expect(moving()).toBe(2);
    await a.finish();
    await a.finish();
    expect(moving()).toBe(1);
  });

  it('a stop ends the count, though a stopped animation never settles', () => {
    const { runs, moving } = counted();
    const a = playback();
    runs.run(() => a);
    runs.stopAll();
    expect(a.stopped).toBe(true);
    expect(moving()).toBe(0);
  });

  it("StrictMode's replayed mount keeps the launch running", async () => {
    const { runs, moving } = counted();
    runs.mount();
    const launch = playback();
    runs.run(() => launch);
    runs.dispose();
    runs.mount();
    await Promise.resolve();
    expect(launch.stopped).toBe(false);
    expect(moving()).toBe(1);
  });

  it('a real unmount stops what is running and ends its count', async () => {
    const { runs, moving } = counted();
    runs.mount();
    const launch = playback();
    runs.run(() => launch);
    runs.dispose();
    await Promise.resolve();
    expect(launch.stopped).toBe(true);
    expect(moving()).toBe(0);
  });
});
