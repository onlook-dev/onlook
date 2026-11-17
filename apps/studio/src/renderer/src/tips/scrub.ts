import { prefersReducedMotion } from '../reducedMotion.js';
import { BEFORE_MS, RESULT_MS } from './previews.js';

export interface ScrubController {
  /** The preview's place in its loop, in ms. */
  time: () => number;
  /** Jumps to a moment, then finishes the pass to the result; used when a zoom hands the moment back. */
  seek: (to: number) => void;
  /** One unprompted pass, unless the card is hovered or already playing. */
  ambient: () => void;
  isHovered: () => boolean;
  /** While a detail view owns the moment, leaving the card must not reset it. */
  setFrozen: (frozen: boolean) => void;
  /** After a zoom lands back on the card under the cursor, that hover does not replay it. */
  setQuiet: (quiet: boolean) => void;
  dispose: () => void;
}

type Snapshot = [Element, Record<string, string>][];

const BLEND_EASE = 'cubic-bezier(.22, 1, .36, 1)';
const SKIP_PROPS = new Set(['offset', 'easing', 'composite', 'computedOffset']);

/**
 * Drives a tile's CSS animations by hand: at rest it shows the finished result; hover blends to the before
 * state and plays one pass into the result, then holds.
 */
export function bindScrub(card: HTMLElement, tile: HTMLElement): ScrubController {
  const anims = tile.getAnimations({ subtree: true });
  let t = RESULT_MS;
  let v = 0;
  let hovered = false;
  let auto = false;
  let frozen = false;
  let quiet = false;
  let frame: number | undefined;
  let last: number | undefined;
  let blends: Animation[] = [];

  const paint = (): void => {
    for (const a of anims) a.currentTime = t;
  };
  for (const a of anims) a.pause();
  paint();

  const snapshot = (): Snapshot =>
    anims.flatMap((a) => {
      const effect = a.effect as KeyframeEffect | null;
      const target = effect?.target;
      if (!effect || !target) return [];
      const props = Object.keys(effect.getKeyframes()[0] ?? {}).filter((k) => !SKIP_PROPS.has(k));
      const cs = getComputedStyle(target);
      return [[target, Object.fromEntries(props.map((k) => [k, cs.getPropertyValue(k) || (cs as unknown as Record<string, string>)[k] || '']))]];
    });
  const blendFrom = (from: Snapshot, duration: number): void => {
    for (const b of blends) b.cancel();
    blends = from.map(([el, kf]) => el.animate([kf, {}], { duration, easing: BLEND_EASE }));
  };

  const tick = (now: number): void => {
    const dt = Math.min(32, now - (last ?? now));
    last = now;
    v += (1 - v) * (1 - Math.exp(-dt / 70));
    t += v * dt;
    const done = t >= RESULT_MS;
    if (done) {
      t = RESULT_MS;
      auto = false;
    }
    paint();
    const go = (hovered || auto) && !done;
    frame = go ? requestAnimationFrame(tick) : undefined;
    if (!go) last = undefined;
  };
  const run = (): void => {
    if (frame === undefined) frame = requestAnimationFrame(tick);
  };

  const reduced = prefersReducedMotion();

  const onEnter = (): void => {
    hovered = true;
    if (quiet || reduced) return;
    auto = false;
    const from = snapshot();
    t = BEFORE_MS;
    v = 0.8;
    paint();
    blendFrom(from, 260);
    run();
  };
  const onLeave = (): void => {
    quiet = false;
    hovered = false;
    if (frozen || reduced) return;
    const from = snapshot();
    t = RESULT_MS;
    v = 0;
    paint();
    blendFrom(from, 320);
  };
  card.addEventListener('pointerenter', onEnter);
  card.addEventListener('pointerleave', onLeave);

  return {
    time: () => t,
    seek: (to) => {
      t = to;
      paint();
      if (t < RESULT_MS && !reduced) {
        auto = true;
        v = 1;
        run();
        return;
      }
      const from = snapshot();
      t = RESULT_MS;
      paint();
      blendFrom(from, 320);
    },
    ambient: () => {
      if (hovered || auto || frozen || reduced) return;
      const from = snapshot();
      auto = true;
      t = BEFORE_MS;
      v = 1;
      paint();
      blendFrom(from, 260);
      run();
    },
    isHovered: () => hovered,
    setFrozen: (next) => {
      frozen = next;
    },
    setQuiet: (next) => {
      quiet = next;
    },
    dispose: () => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      if (frame !== undefined) cancelAnimationFrame(frame);
      for (const b of blends) b.cancel();
    },
  };
}

/** One card plays its pass, then a long rest, so the grid hints at motion without competing with itself. */
export const AMBIENT_GAP_MS = 5000;
export const AMBIENT_LEAD_MS = 1200;
