import { useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../reducedMotion.js';
import type { InlinePlacement } from './inlinePlacement.js';

// The surface stays the card's size so the popover never re-anchors; only the shape's size springs, and everything else derives from it, so nothing runs on its own clock (ONL-2455).

export const ORB_SIZE = 32;

export interface Spring {
  stiffness: number;
  damping: number;
}

function spring(stiffness: number, ratio: number): Spring {
  return { stiffness, damping: 2 * ratio * Math.sqrt(stiffness) };
}

export const ORB_SPRINGS = {
  open: { width: spring(640, 0.8), height: spring(380, 0.9) },
  close: { width: spring(700, 0.8), height: spring(800, 0.8) },
} as const;

/** Semi-implicit Euler, stable at the loop's few-millisecond substeps. */
export function stepSpring(
  position: number,
  velocity: number,
  target: number,
  { stiffness, damping }: Spring,
  dt: number,
): [number, number] {
  const acceleration = -stiffness * (position - target) - damping * velocity;
  const next = velocity + acceleration * dt;
  return [position + next * dt, next];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export interface MorphFrame {
  shape: { width: number; height: number; radius: number };
  clip: string | null;
  content: number;
  orb: number;
  turn: number;
}

export interface CardShape {
  width: number;
  height: number;
  radius: number;
}

export function morphFrame(
  width: number,
  height: number,
  card: CardShape,
  side: InlinePlacement,
): MorphFrame {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const openW = card.width > ORB_SIZE ? (w - ORB_SIZE) / (card.width - ORB_SIZE) : 1;
  const openH = card.height > ORB_SIZE ? (h - ORB_SIZE) / (card.height - ORB_SIZE) : 1;
  const openness = clamp01(Math.min(openW, openH));
  const orbRadius = ORB_SIZE / 2;
  const radius = Math.max(
    0,
    Math.min(w / 2, h / 2, card.radius + (orbRadius - card.radius) * (1 - openness)),
  );
  const x = (card.width - w) / 2;
  const y = card.height - h;
  const round = `round ${radius.toFixed(2)}px`;
  let clip: string | null = null;
  if (x > 0 || y > 0) {
    const inX = `${x.toFixed(2)}px`;
    const inY = `${y.toFixed(2)}px`;
    clip =
      side === 'below'
        ? `inset(0px ${inX} ${inY} ${inX} ${round})`
        : `inset(${inY} ${inX} 0px ${inX} ${round})`;
  }
  return {
    shape: { width: w, height: h, radius },
    clip,
    content: smoothstep(0.55, 0.95, openness),
    orb: 1 - smoothstep(0, 0.28, openness),
    turn: 40 * smoothstep(0, 0.35, openness),
  };
}

interface Sim {
  surface: HTMLElement;
  shape: HTMLElement;
  content: HTMLElement;
  side: InlinePlacement;
  card: CardShape;
  w: number;
  h: number;
  vw: number;
  vh: number;
  open: boolean;
  raf: number;
  last: number;
}

const SUBSTEP_S = 0.004;
const MAX_FRAME_S = 0.064;
const REST = 0.05;

function goalOf(sim: Sim): { width: number; height: number } {
  return sim.open
    ? { width: sim.card.width, height: sim.card.height }
    : { width: ORB_SIZE, height: ORB_SIZE };
}

function paint(sim: Sim): void {
  const frame = morphFrame(sim.w, sim.h, sim.card, sim.side);
  const { style } = sim.shape;
  style.width = `${frame.shape.width.toFixed(2)}px`;
  style.height = `${frame.shape.height.toFixed(2)}px`;
  style.borderRadius = `${frame.shape.radius.toFixed(2)}px`;
  sim.content.style.clipPath = frame.clip ?? '';
  sim.surface.style.setProperty('--morph-content', frame.content.toFixed(3));
  sim.surface.style.setProperty('--morph-orb', frame.orb.toFixed(3));
  sim.surface.style.setProperty('--morph-turn', `${frame.turn.toFixed(2)}deg`);
}

function settle(sim: Sim): void {
  const goal = goalOf(sim);
  sim.w = goal.width;
  sim.h = goal.height;
  sim.vw = 0;
  sim.vh = 0;
}

function tick(sim: Sim, now: number): void {
  const elapsed = Math.min(MAX_FRAME_S, Math.max(0, (now - sim.last) / 1000));
  sim.last = now;
  const springs = sim.open ? ORB_SPRINGS.open : ORB_SPRINGS.close;
  const goal = goalOf(sim);
  const steps = Math.max(1, Math.ceil(elapsed / SUBSTEP_S));
  const dt = elapsed / steps;
  for (let i = 0; i < steps; i += 1) {
    [sim.w, sim.vw] = stepSpring(sim.w, sim.vw, goal.width, springs.width, dt);
    [sim.h, sim.vh] = stepSpring(sim.h, sim.vh, goal.height, springs.height, dt);
  }
  const resting =
    Math.abs(sim.w - goal.width) < REST &&
    Math.abs(sim.h - goal.height) < REST &&
    Math.abs(sim.vw) < REST &&
    Math.abs(sim.vh) < REST;
  if (resting) {
    settle(sim);
    sim.raf = 0;
  } else {
    sim.raf = requestAnimationFrame((next) => {
      tick(sim, next);
    });
  }
  paint(sim);
}

function kick(sim: Sim): void {
  if (prefersReducedMotion()) {
    cancelAnimationFrame(sim.raf);
    sim.raf = 0;
    settle(sim);
    paint(sim);
    return;
  }
  // Already moving: the springs retarget on the next frame, velocity intact.
  if (sim.raf !== 0) return;
  sim.last = performance.now();
  sim.raf = requestAnimationFrame((now) => {
    tick(sim, now);
  });
}

/** The surface element holds a `.inline-morph-shape` and a `.inline-morph-content`. */
export function useOrbMorph({
  expanded,
  side,
}: {
  expanded: boolean;
  side: InlinePlacement;
}): (surface: HTMLDivElement | null) => void {
  const sim = useRef<Sim | null>(null);
  const initial = useRef({ expanded, side });
  // Into state, not a ref: the surface mounts after this hook, once its side is latched.
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (surface === null) return undefined;
    const shape = surface.querySelector<HTMLElement>('.inline-morph-shape');
    const content = surface.querySelector<HTMLElement>('.inline-morph-content');
    if (shape === null || content === null) return undefined;
    const readRadius = (): number =>
      Number.parseFloat(getComputedStyle(content).getPropertyValue('--inline-bubble-radius')) || 12;
    const state: Sim = {
      surface,
      shape,
      content,
      side: initial.current.side,
      card: { width: content.offsetWidth, height: content.offsetHeight, radius: readRadius() },
      w: ORB_SIZE,
      h: ORB_SIZE,
      vw: 0,
      vh: 0,
      open: initial.current.expanded,
      raf: 0,
      last: 0,
    };
    if (state.open) settle(state);
    paint(state);
    sim.current = state;
    const observer = new ResizeObserver(() => {
      state.card = {
        width: content.offsetWidth,
        height: content.offsetHeight,
        radius: readRadius(),
      };
      // A settled card snaps to its new size: a spring would read as not fully open and fade the text on every new line.
      if (state.open && state.raf !== 0) kick(state);
      else {
        if (state.open) settle(state);
        paint(state);
      }
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(state.raf);
      sim.current = null;
    };
  }, [surface]);

  useLayoutEffect(() => {
    initial.current = { expanded, side };
    const state = sim.current;
    if (state === null) return;
    if (state.side !== side) {
      state.side = side;
      paint(state);
    }
    if (state.open === expanded) return;
    state.open = expanded;
    // The keyboard leaves with the input: no keystroke lands in a closing card.
    const active = document.activeElement;
    if (!expanded && active instanceof HTMLElement && state.surface.contains(active)) active.blur();
    kick(state);
  }, [expanded, side]);

  return setSurface;
}
