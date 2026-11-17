import { describe, expect, it } from 'bun:test';
import { clipTimeline, parseStills } from './clip-timeline.js';

const at = (...ms: number[]) => ms.map((atMs) => ({ atMs }));
const options = { holdMs: 600, tailMs: 1500 };

describe('clipTimeline', () => {
  it('shows a still longer than the hold for the hold, and keeps real time on either side of it', () => {
    const shown = clipTimeline(at(0, 100, 5100, 5200), [{ startMs: 100, endMs: 5100 }], options);
    expect(shown.map((s) => s.shownMs)).toEqual([100, 600, 100, 1500]);
  });

  it('leaves a still no longer than the hold at its real length', () => {
    const shown = clipTimeline(at(0, 100, 600, 700), [{ startMs: 100, endMs: 600 }], options);
    expect(shown.map((s) => s.shownMs)).toEqual([100, 500, 100, 1500]);
  });

  it('gives every event inside a shortened still one caption, and drops the events it swallowed', () => {
    const shown = clipTimeline(at(0, 300, 500, 2000, 3000), [{ startMs: 300, endMs: 3000 }], options);
    expect(shown.map((s) => s.event.atMs)).toEqual([0, 300, 500, 3000]);
    expect(shown[1]?.caption).toBe(shown[2]?.caption);
    expect(shown.reduce((sum, s) => sum + s.shownMs, 0)).toBe(300 + 600 + 1500);
  });

  it('captions the change that ends a still with its own time, not the still', () => {
    const shown = clipTimeline(at(0, 100, 2990, 3100), [{ startMs: 100, endMs: 3000 }], options);
    expect(shown[2]?.caption).toBe('t+3.0s');
  });
});

describe('parseStills', () => {
  it('closes a still the stream ended inside at the end of the stream', () => {
    const log = [
      '[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 1.2',
      '[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 2',
      '[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 3.2',
      '[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 5.5',
    ].join('\n');
    expect(parseStills(log, 7000)).toEqual([
      { startMs: 1200, endMs: 3200 },
      { startMs: 5500, endMs: 7000 },
    ]);
  });
});
