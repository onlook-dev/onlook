/**
 * `:focus-visible` alone re-promotes a mouse-focused control on the next
 * ESCAPE, ringing something the keyboard never navigated to — so only keys that
 * MOVE focus count as keyboard modality.
 */

const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

export function trackInputModality(): void {
  const root = document.documentElement;
  root.dataset.input = 'pointer';
  window.addEventListener(
    'pointerdown',
    () => {
      root.dataset.input = 'pointer';
    },
    { capture: true },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (NAVIGATION_KEYS.has(event.key)) root.dataset.input = 'keyboard';
    },
    { capture: true },
  );
}
