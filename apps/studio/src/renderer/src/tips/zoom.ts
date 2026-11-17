export const ZOOM = { duration: 420, easing: 'cubic-bezier(0.24, 1, 0.4, 1)' } as const;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: string;
}

export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, radius: getComputedStyle(el).borderTopLeftRadius };
}

const FLY = 'tips-fly';
const FADE = 'tips-fade-';

function cancelFlight(el: Element): void {
  for (const a of el.getAnimations()) if (a.id === FLY) a.cancel();
}

/** Animates the element's real box, not a scale, so its border and corners stay true and its contents reflow by container size. */
export function fly(el: HTMLElement, from: Box, to: Box, onDone: () => void): void {
  cancelFlight(el);
  const home = el.getBoundingClientRect();
  const frame = (b: Box): Keyframe => ({
    translate: `${b.left - home.left}px ${b.top - home.top}px`,
    width: `${b.width}px`,
    height: `${b.height}px`,
    borderRadius: b.radius,
  });
  const flight = el.animate([frame(from), frame(to)], { ...ZOOM, fill: 'both' });
  flight.id = FLY;
  flight.onfinish = onDone;
}

/** Starts from whatever the element shows now, so a reversal mid-way never jumps. */
export function fadeTo(el: HTMLElement, prop: 'opacity' | 'backgroundColor', to: string, options: KeyframeAnimationOptions = {}): void {
  const current = getComputedStyle(el)[prop];
  for (const a of el.getAnimations()) if (a.id === FADE + prop) a.cancel();
  const fade = el.animate([{ [prop]: current }, { [prop]: to }], {
    duration: 240,
    easing: ZOOM.easing,
    fill: 'forwards',
    ...options,
  });
  fade.id = FADE + prop;
}

export function settleAnimations(root: Element): void {
  for (const a of root.getAnimations({ subtree: true })) {
    if (a.id === FLY || a.id.startsWith(FADE)) a.cancel();
  }
}
