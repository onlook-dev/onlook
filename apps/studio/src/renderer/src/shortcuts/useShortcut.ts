import { useEffect } from 'react';
import { useLatestRef } from '../useLatestRef.js';
import { isInteractiveTarget } from './isInteractiveTarget.js';
import { isModalOpen, type ModalQuery } from './isModalOpen.js';
import { matchesHotkey, parseHotkey, type KeyStroke, type ParsedHotkey } from './matchHotkey.js';
import { SHORTCUTS, type ShortcutId } from './registry.js';
import type { ShortcutEntry } from './types.js';

export interface UseShortcutOptions {
  enabled?: boolean;
}

export interface ShortcutContext {
  allowRepeat: boolean;
  suppressInEditable: boolean;
  doc: ModalQuery | null;
}

export function shouldFireShortcut(
  event: KeyStroke & { repeat?: boolean; isComposing?: boolean; target?: EventTarget | null },
  parsed: ParsedHotkey,
  context: ShortcutContext,
): boolean {
  // Auto-repeat strobed the chrome toggle ~30 times a second; a stepped binding opts in with `allowRepeat`.
  if (event.repeat === true && !context.allowRepeat) return false;
  // A composing keystroke belongs to the input method.
  if (event.isComposing === true) return false;
  if (!matchesHotkey(event, parsed)) return false;
  if (context.suppressInEditable && isInteractiveTarget(event.target ?? null)) return false;
  // A button inside the dialog is not editable, so the editable check above misses it and the canvas would act behind the dialog (ONL-2350).
  if (isModalOpen(context.doc)) return false;
  return true;
}

export function useShortcut(
  id: ShortcutId,
  handler: (event: KeyboardEvent) => void,
  options?: UseShortcutOptions,
): void {
  const entry: ShortcutEntry = SHORTCUTS[id];
  const enabled = options?.enabled ?? true;
  const suppressInEditable = entry.suppressInEditable ?? true;
  const capture = entry.capture === true;
  const allowRepeat = entry.allowRepeat === true;

  const handlerRef = useLatestRef(handler);

  useEffect(() => {
    if (!enabled) return;

    const parsed = parseHotkey(entry.keys);

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!shouldFireShortcut(event, parsed, { allowRepeat, suppressInEditable, doc: document })) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      handlerRef.current(event);
    };

    window.addEventListener('keydown', onKeyDown, { capture });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture });
    };
  }, [enabled, entry.keys, suppressInEditable, capture, handlerRef]);
}
