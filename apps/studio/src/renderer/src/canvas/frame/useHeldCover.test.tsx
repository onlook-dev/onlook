import { afterEach, beforeEach, expect, it, jest } from 'bun:test';
import '../../testing/dom.js';
import { mountHook } from '../../testing/mountHook.js';
import type { FrameShows } from './coverState.js';
import { COVER_WAIT_MS, useHeldCover } from './useHeldCover.js';

const page: FrameShows = { kind: 'page' };
const notStarted: FrameShows = { kind: 'cover', cover: 'not-started', actions: ['start'], waits: true };
const failed: FrameShows = { kind: 'cover', cover: 'nothing', actions: ['try-again'], waits: false };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('keeps a waiting cover off until it has held for the wait', async () => {
  const hook = await mountHook<FrameShows, FrameShows>(useHeldCover, notStarted);
  expect(hook.current).toEqual(page);
  await hook.settle(() => jest.advanceTimersByTime(COVER_WAIT_MS - 1));
  expect(hook.current).toEqual(page);
  await hook.settle(() => jest.advanceTimersByTime(1));
  expect(hook.current).toEqual(notStarted);
  await hook.unmount();
});

it('never shows the cover for a page that loads inside the wait', async () => {
  const hook = await mountHook<FrameShows, FrameShows>(useHeldCover, notStarted);
  await hook.settle(() => jest.advanceTimersByTime(COVER_WAIT_MS / 2));
  await hook.rerender(page);
  await hook.settle(() => jest.advanceTimersByTime(COVER_WAIT_MS * 2));
  expect(hook.current).toEqual(page);
  await hook.unmount();
});

it('shows a cover that does not wait at once, and keeps a waiting one that follows it on', async () => {
  const hook = await mountHook<FrameShows, FrameShows>(useHeldCover, failed);
  expect(hook.current).toEqual(failed);
  await hook.rerender(notStarted);
  expect(hook.current).toEqual(notStarted);
  await hook.unmount();
});

it('starts the wait over once the cover has gone', async () => {
  const hook = await mountHook<FrameShows, FrameShows>(useHeldCover, failed);
  await hook.rerender(page);
  await hook.rerender(notStarted);
  expect(hook.current).toEqual(page);
  await hook.unmount();
});
