import { describe, expect, it } from 'bun:test';
import { relativeTime } from './relativeTime.js';

const NOW =Date.parse('2026-08-04T12:00:00.000Z');
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe('relativeTime', () => {
  it('reads under a minute as just now', () => {
    expect(relativeTime(ago(30_000), NOW)).toEqual({ key: 'projects.time.justNow' });
  });

  it('counts hours once past the minute ceiling', () => {
    expect(relativeTime(ago(3 * HOUR), NOW)).toEqual({
      key: 'projects.time.hours',
      params: { n: 3 },
    });
  });

  it('counts whole days, truncating the remainder rather than rounding up', () => {
    expect(relativeTime(ago(2 * DAY + 23 * HOUR), NOW)).toEqual({
      key: 'projects.time.days',
      params: { n: 2 },
    });
  });

  it('switches to weeks exactly at the seventh day, not after it', () => {
    expect(relativeTime(ago(WEEK), NOW)).toEqual({
      key: 'projects.time.weeks',
      params: { n: 1 },
    });
    expect(relativeTime(ago(WEEK - 1), NOW)).toEqual({
      key: 'projects.time.days',
      params: { n: 6 },
    });
  });

  it('clamps a future timestamp to just now instead of counting backwards', () => {
    const future = new Date(NOW + 6 * HOUR).toISOString();
    expect(relativeTime(future, NOW)).toEqual({ key: 'projects.time.justNow' });
  });

  it('names an unparseable timestamp rather than rendering NaN', () => {
    expect(relativeTime('not-a-date', NOW)).toEqual({ key: 'projects.time.unknown' });
  });
});
