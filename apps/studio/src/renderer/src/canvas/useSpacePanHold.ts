import { useEffect } from 'react';

import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { useCanvasStore } from './store.js';

/** Reports a Space hold to the toolbar (React Flow's `panActivationKeyCode` does the pan), and keeps typed spaces out of it. */
export function useSpacePanHold(): void {
  useEffect(() => {
    const set = (isHeld: boolean): void => {
      useCanvasStore.getState().setSpacePanning(isHeld);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== 'Space' || event.repeat) return;
      if (isInteractiveTarget(event.target)) return;
      set(true);
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      // No interactive-target guard on the way up: a hold that started on the canvas releases after focus moved.
      if (event.code === 'Space') set(false);
    };

    // On `document`: after the editor has the Space, before React Flow's `window` listener pans on it.
    const shieldTyping = (event: KeyboardEvent): void => {
      if (event.code === 'Space' && isInteractiveTarget(event.target)) event.stopPropagation();
    };

    // A keyup delivered to another window never arrives: without this a ⌘-tab mid-hold latches the hand on.
    const onBlur = (): void => {
      set(false);
    };

    document.addEventListener('keydown', shieldTyping);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', shieldTyping);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      set(false);
    };
  }, []);
}
