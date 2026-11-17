import { useEffect, useLayoutEffect, useRef } from 'react';

const STIFFNESS = 380;
const DAMPING = 34;
const REST = 0.002;

export interface Spring {
  value: number;
  velocity: number;
  target: number;
}

/** True once settled. `scale` loosens the rest test for px values. */
export const step = (spring: Spring, dt: number, scale = 1): boolean => {
  const force = -STIFFNESS * (spring.value - spring.target) - DAMPING * spring.velocity;
  spring.velocity += force * dt;
  spring.value += spring.velocity * dt;
  return Math.abs(spring.value - spring.target) * scale < REST && Math.abs(spring.velocity) * scale < REST * 10;
};

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SPRING_EASING = ((): { easing: string; duration: number } => {
  const spring: Spring = { value: 0, velocity: 0, target: 1 };
  const points: number[] = [0];
  const dt = 1 / 120;
  let frames = 0;
  while (!step(spring, dt) && frames < 240) {
    frames += 1;
    if (frames % 3 === 0) points.push(Number(spring.value.toFixed(4)));
  }
  points.push(1);
  return { easing: `linear(${points.join(', ')})`, duration: Math.round(frames * dt * 1000) };
})();

export function useSpring(target: number, paint: (value: number) => void): void {
  const spring = useRef<Spring | null>(null);
  const paintRef = useRef(paint);

  useLayoutEffect(() => {
    paintRef.current = paint;
  });

  useEffect(() => {
    if (spring.current === null || prefersReducedMotion()) {
      spring.current = { value: target, velocity: 0, target };
      paintRef.current(target);
      return undefined;
    }
    // The spring outlives the effect, so a retarget keeps its velocity.
    spring.current.target = target;
    let frame = 0;
    let last: number | undefined;
    const tick = (now: number) => {
      const s = spring.current;
      if (!s) return;
      const dt = Math.min(0.032, (now - (last ?? now)) / 1000);
      last = now;
      const settled = step(s, dt);
      paintRef.current(settled ? s.target : s.value);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
}
