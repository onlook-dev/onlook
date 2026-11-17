import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

function metaHeld(event: Event): boolean {
  return (event as Partial<KeyboardEvent & PointerEvent & WheelEvent>).metaKey === true;
}

export function installZoomModifier(target: EventTarget, onHeld: (held: boolean) => void): () => void {
  let asked = false;
  // Each change commits before the handler returns, so React Flow already holds the matching wheel handler and no wheel is ever read against the old one (ONL-2890).
  const update = (next: boolean): void => {
    if (asked === next) return;
    asked = next;
    flushSync(() => onHeld(next));
  };
  const onKey = (event: Event): void => {
    const key = event as KeyboardEvent;
    update(key.type === 'keydown' ? metaHeld(key) : key.key !== 'Meta' && metaHeld(key));
  };
  const onModifier = (event: Event): void => {
    update(metaHeld(event));
  };
  const reset = (event: Event): void => {
    if (event.target === target) update(false);
  };
  const controller = new AbortController();
  // Capture, so this runs before React Flow's own wheel listener on the pane.
  const options = { capture: true, signal: controller.signal };
  target.addEventListener('keydown', onKey, options);
  target.addEventListener('keyup', onKey, options);
  target.addEventListener('blur', reset, options);
  target.addEventListener('pointermove', onModifier, options);
  target.addEventListener('pointerdown', onModifier, options);
  target.addEventListener('wheel', onModifier, { ...options, passive: true });
  return () => controller.abort();
}

export function useZoomModifier(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => installZoomModifier(window, setHeld), []);
  return held;
}
