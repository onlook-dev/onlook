import type { StringKey, StringParams } from '@studio/i18n';

/* Main sends ISO and the renderer formats: a date string built in main is a
   second dialect no translation catalog can reach. */
export interface RelativeTime {
  key: StringKey;
  params?: StringParams;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(iso: string, now: number): RelativeTime {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return { key: 'projects.time.unknown' };

  const elapsed = now - then;

  if (elapsed < MINUTE) return { key: 'projects.time.justNow' };
  if (elapsed < HOUR) return { key: 'projects.time.minutes', params: { n: Math.floor(elapsed / MINUTE) } };
  if (elapsed < DAY) return { key: 'projects.time.hours', params: { n: Math.floor(elapsed / HOUR) } };
  if (elapsed < WEEK) return { key: 'projects.time.days', params: { n: Math.floor(elapsed / DAY) } };
  if (elapsed < YEAR) return { key: 'projects.time.weeks', params: { n: Math.floor(elapsed / WEEK) } };
  return { key: 'projects.time.years', params: { n: Math.floor(elapsed / YEAR) } };
}
