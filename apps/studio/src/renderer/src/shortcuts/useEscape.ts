import { useEffect } from 'react';
import { useLatestRef } from '../useLatestRef.js';
import { isInteractiveTarget } from './isInteractiveTarget.js';

/** `true` if this handler consumed the key; anything else declines it. */
export type EscapeHandler = () => boolean | void;

const stack: { handler: EscapeHandler }[] = [];
let listening = false;

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;

  // Bubble phase, no stopPropagation: inline editors handle Escape on their own element and must win over an armed picker.
  if (isInteractiveTarget(event.target) || event.defaultPrevented) return;

  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i]?.handler() === true) {
      // Only on a handled key, or a native control loses its own dismiss.
      event.preventDefault();
      return;
    }
  }
}

/** The handler is read through a ref at press time, so a new closure does not move its stack position. */
export function useEscape(handler: EscapeHandler): void {
  const held = useLatestRef(handler);

  useEffect(() => {
    const entry = { handler: () => held.current() };
    stack.push(entry);
    if (!listening) {
      window.addEventListener('keydown', onKeyDown);
      listening = true;
    }
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      if (stack.length === 0) {
        window.removeEventListener('keydown', onKeyDown);
        listening = false;
      }
    };
  }, [held]);
}
