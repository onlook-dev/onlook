import { sample } from '../motion/timeline.js';
import type { StageState } from './choreography.js';
import { partStyles, type PartName } from './parts.js';

export interface Film {
  /** Jumps every part to its last keyframe. */
  finish: () => void;
  cancel: () => void;
  /** Resolves once every part has played or been finished; never on a cancel. */
  finished: Promise<void>;
}

/** Plays every `[data-idea-part]` under `root` from one shared start time, now unless given, each sampled from the same `at`. */
export function playFilm(root: Element, at: (t: number) => StageState, end: number, startTime = Number(document.timeline.currentTime ?? performance.now())): Film {
  const frames = sample(end, (t) => partStyles(at(t)));
  const animations: Animation[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-idea-part]')) {
    const name = el.dataset['ideaPart'] as PartName;
    const keyframes = frames.map(({ offset, value }) => ({ offset, ...value[name] }));
    const animation = el.animate(keyframes, { duration: end, fill: 'both', easing: 'linear' });
    animation.id = `ideas:${name}`;
    animation.startTime = startTime;
    animations.push(animation);
  }
  return {
    finish: () => {
      for (const animation of animations) animation.finish();
    },
    cancel: () => {
      for (const animation of animations) animation.cancel();
    },
    finished: Promise.all(animations.map((animation) => animation.finished)).then(() => undefined),
  };
}

/** Any pointer, wheel, key or resize ends the film in place. */
export function finishOnInterruption(film: Film): () => void {
  const stop = () => film.finish();
  const options = { capture: true, passive: true } as const;
  const events = ['pointerdown', 'wheel', 'keydown', 'resize'] as const;
  for (const event of events) window.addEventListener(event, stop, options);
  return () => {
    for (const event of events) window.removeEventListener(event, stop, options);
  };
}
