import { useLayoutEffect, useRef, type RefObject } from 'react';

const EXPAND_MS = 220;

interface Before { height: number; color: string; opacity: string; transform: string }

export interface ExpandParts {
  list: RefObject<HTMLDivElement | null>;
  label: RefObject<HTMLSpanElement | null>;
  summary: RefObject<HTMLSpanElement | null>;
  chevron: RefObject<HTMLSpanElement | null>;
}

/** Plays a toggle of Other tools from where its parts stood, so the row carries no CSS transition and hover stays instant (ONL-3181, ONL-3193). */
export function useExpandMotion(expanded: boolean): { parts: ExpandParts; capture: () => void } {
  const list = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const summary = useRef<HTMLSpanElement>(null);
  const chevron = useRef<HTMLSpanElement>(null);
  const before = useRef<Before | null>(null);

  const capture = (): void => {
    if (!list.current || !label.current || !summary.current || !chevron.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    before.current = {
      height: list.current.getBoundingClientRect().height,
      color: getComputedStyle(label.current).color,
      opacity: getComputedStyle(summary.current).opacity,
      transform: getComputedStyle(chevron.current).transform,
    };
  };

  useLayoutEffect(() => {
    const from = before.current;
    before.current = null;
    const box = list.current;
    const name = label.current;
    const words = summary.current;
    const turn = chevron.current;
    if (!from || !box || !name || !words || !turn) return;
    for (const element of [box, name, words, turn]) for (const animation of element.getAnimations()) animation.cancel();
    const timing = { duration: EXPAND_MS, easing: getComputedStyle(box).getPropertyValue('--ease-standard').trim() || 'ease' };
    const shown = { overflow: 'hidden', visibility: 'visible' };
    box.animate(
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      [{ ...shown, height: `${String(from.height)}px` }, { ...shown, height: `${String(box.getBoundingClientRect().height)}px` }],
      timing,
    );
    name.animate([{ color: from.color }, { color: getComputedStyle(name).color }], timing);
    words.animate([{ visibility: 'visible', opacity: from.opacity }, { visibility: 'visible', opacity: expanded ? 0 : 1 }], timing);
    turn.animate([{ transform: from.transform }, { transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }], timing);
  }, [expanded]);

  return { parts: { list, label, summary, chevron }, capture };
}
