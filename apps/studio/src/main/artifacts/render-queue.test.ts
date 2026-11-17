import { expect, it } from 'bun:test';
import { createArtifactRenderQueue } from './render-queue.js';

it('shares two rendering slots across preview and PDF demand, releasing them on errors', async () => {
  const queue = createArtifactRenderQueue();
  const releases: (() => void)[] = [];
  let active = 0;
  let peak = 0;
  const jobs = Array.from({ length: 5 }, (_, index) => queue.run(() => true, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => releases.push(resolve));
    active -= 1;
    if (index === 1) throw new Error('printing refused');
    return index;
  }).catch(() => -1));
  expect(releases).toHaveLength(2);
  for (let index = 0; index < 5; index += 1) {
    releases[index]();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(await Promise.all(jobs)).toEqual([0, -1, 2, 3, 4]);
  expect(peak).toBe(2);
});

it('does not open queued contents when its renderer or revision has gone away', async () => {
  const queue = createArtifactRenderQueue();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  const first = queue.run(() => true, () => wait);
  const second = queue.run(() => true, () => wait);
  let wanted = true;
  let opened = false;
  const canceled = queue.run(() => wanted, async () => { opened = true; });
  const observed = canceled.then(() => '', (error: Error) => error.message);
  wanted = false;
  release();
  await Promise.all([first, second]);
  expect(await observed).toContain('canceled');
  expect(opened).toBe(false);
});
