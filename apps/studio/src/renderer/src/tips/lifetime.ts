import { onTipsReset } from './early.js';

/** How long a tip that only informs stays on screen before it goes by itself (ONL-2960). */
export const TIP_LIFETIME_MS = 45_000;

interface Clock {
  shownMs: number;
  since: number | null;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const clocks = new Map<string, Clock>();

/** Counts only time on screen: hidden, held back or off its panel, the tip keeps what it has used. Returns the stop for when it leaves the screen. */
export function watchTipLifetime(key: string, lifetimeMs: number, onOver: () => void): () => void {
  const clock = clocks.get(key) ?? { shownMs: 0, since: null, timer: undefined };
  clocks.set(key, clock);
  if (clock.timer !== undefined) clearTimeout(clock.timer);
  clock.since = Date.now();
  clock.timer = setTimeout(() => {
    clock.timer = undefined;
    clock.since = null;
    clock.shownMs = lifetimeMs;
    onOver();
  }, Math.max(0, lifetimeMs - clock.shownMs));
  return () => {
    if (clock.timer !== undefined) clearTimeout(clock.timer);
    clock.timer = undefined;
    if (clock.since !== null) clock.shownMs += Date.now() - clock.since;
    clock.since = null;
  };
}

export function resetTipLifetimes(): void {
  for (const clock of clocks.values()) if (clock.timer !== undefined) clearTimeout(clock.timer);
  clocks.clear();
}

onTipsReset(resetTipLifetimes);
