import { useEffect } from 'react';
import { create } from 'zustand';

import { isInteractiveTarget } from '../../shortcuts/isInteractiveTarget.js';
import { wheelPageDelta } from './scrollbarGeometry.js';

export type ScrollKeyEvent =
  | { type: 'keydown'; code: string; isChord: boolean; isInField: boolean; isRepeat: boolean }
  | { type: 'keyup'; code: string }
  | { type: 'blur' };

/** Bare S pressed fresh, never in a field and never with a modifier: ⇧S is the Section tool and ⌘S saves code. */
export function scrollKeyAfter(isHeld: boolean, event: ScrollKeyEvent): boolean {
  if (event.type === 'blur') return false;
  if (event.code !== 'KeyS') return isHeld;
  if (event.type === 'keyup') return false;
  return !event.isChord && !event.isInField && (isHeld || !event.isRepeat);
}

interface ScrollKeyState {
  isHeld: boolean;
  /** The Frame under the pointer, whether or not S is held. */
  overFrame: string | null;
  /** Counts held-S scrolls of a Frame's page; each change is one scroll. */
  pageKeyScrolls: number;
}

export const useScrollKeyStore = create<ScrollKeyState>()(() => ({ isHeld: false, overFrame: null, pageKeyScrolls: 0 }));

type Wheel = Parameters<typeof wheelPageDelta>[0];

/** How far a wheel over a Frame's shield scrolls its page while S is held, and whether it found the page; null leaves the wheel to the canvas, selected Frame or not (ONL-2960). */
export function frameWheelScroll(wheel: Wheel, frame: { viewport: number | null; isKeyHeld: boolean; zoom: number }): { delta: number; movesPageByKey: boolean } | null {
  if (!frame.isKeyHeld) return null;
  const delta = frame.viewport === null ? wheelPageDelta(wheel, 1, 0) : wheelPageDelta(wheel, frame.zoom, frame.viewport);
  return delta === null ? null : { delta, movesPageByKey: frame.viewport !== null };
}

export function noteKeyScroll(): void {
  useScrollKeyStore.setState((state) => ({ pageKeyScrolls: state.pageKeyScrolls + 1 }));
}

export function pointFrame(frameId: string, isOver: boolean): void {
  const { overFrame } = useScrollKeyStore.getState();
  if (isOver && overFrame !== frameId) useScrollKeyStore.setState({ overFrame: frameId });
  else if (!isOver && overFrame === frameId) useScrollKeyStore.setState({ overFrame: null });
}

export const isScrollKeyOn = (state: ScrollKeyState, frameId: string): boolean => state.isHeld && state.overFrame === frameId;

export function useScrollKeyHold(): void {
  useEffect(() => {
    const apply = (event: ScrollKeyEvent): void => {
      const isHeld = scrollKeyAfter(useScrollKeyStore.getState().isHeld, event);
      if (isHeld !== useScrollKeyStore.getState().isHeld) useScrollKeyStore.setState({ isHeld });
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      apply({ type: 'keydown', code: event.code, isChord: event.metaKey || event.ctrlKey || event.altKey || event.shiftKey, isInField: isInteractiveTarget(event.target), isRepeat: event.repeat });
    };
    const onKeyUp = (event: KeyboardEvent): void => apply({ type: 'keyup', code: event.code });
    const onBlur = (): void => apply({ type: 'blur' });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      useScrollKeyStore.setState({ isHeld: false });
    };
  }, []);
}
