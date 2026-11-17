import { afterAll, afterEach, expect, it, spyOn } from 'bun:test';
import { scheduleSettledZoom, ZOOM_SETTLE_MS } from './settledZoom.js';

const pending = new Map<number, () => void>();
let sequence = 0;
const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
  expect(ms).toBe(ZOOM_SETTLE_MS);
  const handle = ++sequence;
  pending.set(handle, callback);
  return handle;
}) as unknown as typeof setTimeout);
const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: number) => {
  pending.delete(handle);
}) as unknown as typeof clearTimeout);
afterEach(() => { pending.clear(); });
afterAll(() => { set.mockRestore(); clear.mockRestore(); });

it('sends only the final zoom after a burst settles, not during rendering', () => {
  const sent: number[] = [];
  let cancel: (() => void) | undefined;
  for (const zoom of [1, 0.9, 0.8, 0.7]) {
    cancel?.();
    cancel = scheduleSettledZoom(() => sent.push(zoom));
  }
  expect(sent).toEqual([]);
  expect(pending.size).toBe(1);
  for (const callback of pending.values()) callback();
  expect(sent).toEqual([0.7]);
});

it('cancels pending guest zoom on unmount or document replacement', () => {
  let sent = false;
  const cancel = scheduleSettledZoom(() => { sent = true; });
  cancel();
  expect(pending.size).toBe(0);
  expect(sent).toBe(false);
});
