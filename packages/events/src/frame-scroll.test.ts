import { expect, it } from 'bun:test';
import { parseFrameScrollCommand, parseFrameScrollReport } from './frame-scroll.js';

it('admits only finite, bounded scroll metrics from one subscription', () => {
  const metrics = { session: 1, surface: 2, top: 100, viewport: 400, height: 2000 };
  expect(parseFrameScrollReport({ session: 1, metrics })).toEqual({ session: 1, metrics });
  expect(parseFrameScrollReport({ session: 1, metrics: null })).toEqual({ session: 1, metrics: null });
  for (const invalid of [
    { ...metrics, session: 2 }, { ...metrics, surface: 0 }, { ...metrics, top: Infinity },
    { ...metrics, top: -1 }, { ...metrics, top: 2000 }, { ...metrics, viewport: 0 },
    { ...metrics, height: 400 }, { ...metrics, page: 'private' },
  ]) expect(parseFrameScrollReport({ session: 1, metrics: invalid })).toBeNull();
  for (const invalid of [null, [], {}, { session: 0, metrics: null }, { session: 1, metrics, extra: true }]) {
    expect(parseFrameScrollReport(invalid)).toBeNull();
  }
});

it('admits observation, instant and relative scroll commands, refusing malformed inputs', () => {
  expect(parseFrameScrollCommand({ type: 'observe', session: 1, enabled: true })).not.toBeNull();
  expect(parseFrameScrollCommand({ type: 'scroll', session: 1, surface: 2, top: 0 })).not.toBeNull();
  expect(parseFrameScrollCommand({ type: 'scrollBy', session: 1, surface: 2, delta: -40 })).not.toBeNull();
  for (const invalid of [
    { type: 'observe', session: 0, enabled: true }, { type: 'observe', session: 1, enabled: 'yes' },
    { type: 'scroll', session: 1, surface: 2, top: NaN }, { type: 'scroll', session: 1, surface: 2, top: -1 },
    { type: 'scroll', session: 1, surface: 2, top: 2, selector: 'private' }, null,
    { type: 'scrollBy', session: 1, surface: 2, delta: Infinity }, { type: 'scrollBy', session: 1, surface: 2, delta: '40' },
  ]) expect(parseFrameScrollCommand(invalid)).toBeNull();
});
