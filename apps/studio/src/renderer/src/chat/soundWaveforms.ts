import type { NotificationSound } from '@studio/events';

/** Each sound's own envelope, the ported design's tuned values: the leading low bars are the silence before the hit. */
const ENVELOPES: Record<NotificationSound, readonly number[]> = {
  chirp: [2, 2, 2, 2, 20, 8, 7, 14, 7, 30, 19, 23, 17, 13, 9, 6, 6, 6, 7, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3, 2],
  'two-tone': [2, 2, 2, 2, 2, 30, 25, 16, 12, 10, 8, 6, 6, 5, 4, 2, 11, 14, 13, 12, 9, 6, 4, 3, 3, 3, 2, 2, 2, 2],
};

export function waveformFor(sound: NotificationSound): readonly number[] {
  return ENVELOPES[sound].map((height) => Math.round((height / 18) * 14) + 2);
}
