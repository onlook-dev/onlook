import { useEffect, useState } from 'react';
import type { FrameShows } from './coverState.js';

export const COVER_WAIT_MS = 700;

const PAGE: FrameShows = { kind: 'page' };

/** A waiting cover stays off until it has held for the wait; once a cover is on, the next one replaces it at once. */
export function useHeldCover(shows: FrameShows, waitMs: number = COVER_WAIT_MS): FrameShows {
  const isCover = shows.kind === 'cover';
  const isWaiting = isCover && shows.waits;
  const [isOn, setIsOn] = useState(isCover && !isWaiting);
  if (isOn !== isCover && !(isCover && isWaiting)) setIsOn(isCover);
  useEffect(() => {
    if (!isWaiting || isOn) return;
    const timer = setTimeout(() => setIsOn(true), waitMs);
    return () => clearTimeout(timer);
  }, [isWaiting, isOn, waitMs]);
  return isWaiting && !isOn ? PAGE : shows;
}
