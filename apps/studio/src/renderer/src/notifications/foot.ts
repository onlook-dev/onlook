import { useCallback, type RefCallback } from 'react';

import { TOAST_FOOT_PROPERTY } from './lane.js';

export interface ClaimBox {
  top: number;
  width: number;
  height: number;
}

/** How far a claim reaches above the window's bottom edge, so furniture already lifted carries its lift; a box with no size is drawn nowhere and claims nothing (ONL-3182). */
export function claimHeight(windowHeight: number, box: ClaimBox): number {
  if (box.width === 0 && box.height === 0) return 0;
  const reach = windowHeight - box.top;
  if (!Number.isFinite(reach) || reach <= 0) return 0;
  return Math.min(Math.ceil(reach), Math.ceil(windowHeight));
}

/** The tallest live claim, or nothing at all, which is what leaves the floor in charge (ONL-3182). */
export function footValue(claims: Iterable<number>): string | null {
  let tallest = 0;
  for (const claim of claims) if (claim > tallest) tallest = claim;
  return tallest <= 0 ? null : `${String(tallest)}px`;
}

const claims = new Map<HTMLElement, number>();
const observers = new Map<HTMLElement, ResizeObserver>();
let published: string | null = null;
let isListening = false;

function publish(): void {
  if (typeof document === 'undefined') return;
  const value = footValue(claims.values());
  if (value === published) return;
  published = value;
  if (value === null) document.documentElement.style.removeProperty(TOAST_FOOT_PROPERTY);
  else document.documentElement.style.setProperty(TOAST_FOOT_PROPERTY, value);
}

function measure(element: HTMLElement): number {
  return claimHeight(window.innerHeight, element.getBoundingClientRect());
}

/** Reads every claim again: a claim that is lifted rather than grown never resizes, so its own observer stays quiet (ONL-3182). */
export function remeasureFootClaims(): void {
  if (typeof window === 'undefined' || claims.size === 0) return;
  for (const element of claims.keys()) claims.set(element, measure(element));
  publish();
}

function release(element: HTMLElement): void {
  observers.get(element)?.disconnect();
  observers.delete(element);
  claims.delete(element);
  if (claims.size === 0 && isListening) {
    window.removeEventListener('resize', remeasureFootClaims);
    isListening = false;
  }
  publish();
}

function hold(element: HTMLElement): () => void {
  claims.set(element, measure(element));
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      claims.set(element, measure(element));
      publish();
    });
    observer.observe(element);
    observers.set(element, observer);
  }
  if (!isListening) {
    window.addEventListener('resize', remeasureFootClaims);
    isListening = true;
  }
  publish();
  return () => {
    release(element);
  };
}

/** The ref callback an occupant of the lower-left corner wears, so the toast lane clears what is drawn there; usable inside an effect too (ONL-3182). */
export function useToastFootClaim(): RefCallback<HTMLElement> {
  return useCallback((node: HTMLElement | null): (() => void) | undefined => {
    if (node === null || typeof window === 'undefined') return undefined;
    /* The returned release is React 19's ref cleanup, called when the node detaches. */
    return hold(node);
  }, []);
}
