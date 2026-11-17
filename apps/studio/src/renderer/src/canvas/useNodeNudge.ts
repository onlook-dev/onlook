import { useEffect } from 'react';

import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { useCanvasStore } from './store.js';

const STEP = 1;
const SHIFT_STEP = 10;

const MODIFIERS = new Set(['Shift', 'Alt', 'Meta', 'Control']);

const DIRECTION: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** Arrow keys move the selected nodes a pixel, ⇧ ten, as in a design tool. */
export function useNodeNudge(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = DIRECTION[event.key];
      // ⌘Z or Delete mid-burst would act on a document that has not seen the nudge yet.
      if (direction === undefined && !MODIFIERS.has(event.key)) useCanvasStore.getState().flushNudges();
      // ⌥ allowed: nudging under the measuring chord shows the distance change as it happens.
      if (direction === undefined || event.metaKey || event.ctrlKey) return;
      // A menu or list that owns the arrows claims them with preventDefault and lets them bubble on.
      if (event.defaultPrevented || isInteractiveTarget(event.target) || isArrowWidget(event.target)) return;
      const state = useCanvasStore.getState();
      if (state.mode !== 'design' || !state.nodes.some((node) => node.selected === true)) return;
      event.preventDefault();
      const step = event.shiftKey ? SHIFT_STEP : STEP;
      state.nudgeNodes(direction[0] * step, direction[1] * step);
    };
    // A burst saves at its pause; any pointer action, a lost focus or leaving saves it first, so a drag never starts from an unsaved spot.
    const flush = (): void => {
      useCanvasStore.getState().flushNudges();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', flush, true);
    window.addEventListener('blur', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', flush, true);
      window.removeEventListener('blur', flush);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);
}

function isArrowWidget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[role="menu"], [role="listbox"], [role="tablist"], [role="radiogroup"]') !== null
  );
}
