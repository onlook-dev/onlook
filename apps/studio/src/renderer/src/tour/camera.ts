
export interface Shot {
  x: number;
  y: number;
  width: number;
}

export function shotTransform(shot: Shot, viewWidth: number): string {
  const k = viewWidth / shot.width;
  return `translate(${-shot.x * k}px, ${-shot.y * k}px) scale(${k})`;
}

const PAN = 'tour-pan';
/** Moves from the first frame and settles slowly; shared with the canvas move inside the scene so the two never drift apart. */
const PAN_MS = 900;
const PAN_EASING = 'cubic-bezier(.2,.6,.2,1)';

export function isPanning(el: Element): boolean {
  return el.getAnimations().some((a) => a.id === PAN && a.playState === 'running');
}

/** Starts from the transform on screen now, so a reversal mid-pan never jumps. */
export function panTo(el: HTMLElement, transform: string): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const a of el.getAnimations()) if (a.id === PAN) a.cancel();
    el.style.transform = transform;
    return;
  }
  const current = getComputedStyle(el).transform;
  for (const a of el.getAnimations()) if (a.id === PAN) a.cancel();
  const pan = el.animate([{ transform: current === 'none' ? transform : current }, { transform }], {
    duration: PAN_MS,
    easing: PAN_EASING,
    fill: 'forwards',
  });
  pan.id = PAN;
  el.style.transform = transform;
  // The finished pan is kept, not cancelled: dropping its layer at rest re-paints the scene off the GPU and pixel-snaps hairlines along the picture's edges.
}
