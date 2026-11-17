import { useEffect, useState } from 'react';

import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';

export type AltEvent =
  | { type: 'keydown' | 'keyup'; key: string; isInField: boolean; hasTyped?: boolean }
  | { type: 'blur' };

/** ⌥ held — the measuring chord. Arrows and ⇧ keep it, so a nudge reads its new distance live; a character key with ⌥ is an option-character being typed, and ends it, as does any key in a field (⌥← there is word navigation). ⌥ in a field already holding text is the next option-character, never a measure (ONL-2593). */
export function altHeldAfter(isHeld: boolean, event: AltEvent): boolean {
  if (event.type === 'blur') return false;
  if (event.type === 'keyup') return event.key === 'Alt' ? false : isHeld;
  if (event.key === 'Alt') return !event.hasTyped;
  if (event.key.length === 1 || event.isInField) return false;
  return isHeld;
}

/** Walks ancestors like `isInteractiveTarget`: a composer's token chip is contentEditable="false" inside the editable host, which is where the words are (ONL-2640). */
export function fieldHasText(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target.value !== '';
  let el = target instanceof HTMLElement ? target : null;
  while (el !== null) {
    if (el.isContentEditable) return (el.textContent ?? '') !== '';
    el = el.parentElement;
  }
  return false;
}

export function useAltHeld(): boolean {
  const [isHeld, setIsHeld] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const type = event.type === 'keydown' ? 'keydown' : 'keyup';
      setIsHeld((held) =>
        altHeldAfter(held, {
          type,
          key: event.key,
          isInField: isInteractiveTarget(event.target),
          hasTyped: fieldHasText(event.target),
        }),
      );
    };
    const onBlur = (): void => {
      setIsHeld(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return isHeld;
}
