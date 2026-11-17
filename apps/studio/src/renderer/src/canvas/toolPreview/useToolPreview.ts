import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { SHORTCUTS } from '../../shortcuts/registry.js';
import { matchesHotkey, parseHotkey } from '../../shortcuts/matchHotkey.js';
import { PREVIEWS, PREVIEW_ATTR, previewIdOf, type PreviewId } from './registry.js';

export interface ToolPreviewState {
  id: PreviewId;
  x: number;
}

const CLOSE_DELAY = 140;
/** A press can fire a leave without the pointer moving; a dismissal lapses only after a real absence. */
const RESET_AFTER = 600;

const controlOf = (root: Element, id: PreviewId): HTMLButtonElement | null =>
  root.querySelector<HTMLButtonElement>(`[${PREVIEW_ATTR}="${id}"] button, button[${PREVIEW_ATTR}="${id}"]`);

function isBetweenControls(root: Element, clientX: number): boolean {
  const boxes = PREVIEWS.flatMap((p) => {
    const control = controlOf(root, p.id);
    const box = control?.getBoundingClientRect();
    return box && box.width > 0 ? [box] : [];
  });
  if (boxes.length === 0) return false;
  return clientX >= Math.min(...boxes.map((b) => b.left)) && clientX <= Math.max(...boxes.map((b) => b.right));
}

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

export function useToolPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const closeTimer = useRef<number | undefined>(undefined);
  const resetTimer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<ToolPreviewState | null>(null);
  /** The control just used; its preview stays down until another control is hovered. */
  const dismissed = useRef<PreviewId | null>(null);
  /** Window handlers act only while a preview is open. */
  const openId = useRef<PreviewId | null>(null);

  useLayoutEffect(() => {
    openId.current = state?.id ?? null;
  }, [state]);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setState(null), CLOSE_DELAY);
  }, []);

  const dismiss = useCallback((id: PreviewId | null) => {
    window.clearTimeout(closeTimer.current);
    dismissed.current = id;
    setState(null);
  }, []);

  const onEnter = useCallback(
    (event: React.SyntheticEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target as Element;
      // Focus restored by a click or a returning Tab is not a keyboard visit (ONL-2593).
      if (event.type === 'focus' && !target.matches(':focus-visible')) return;
      const id = previewIdOf(target);
      const control = id === undefined ? null : controlOf(root, id);
      if (id === undefined || control === null) {
        if ('clientX' in event && isBetweenControls(root, (event as React.PointerEvent).clientX)) {
          window.clearTimeout(closeTimer.current);
          return;
        }
        close();
        return;
      }
      window.clearTimeout(resetTimer.current);
      if (dismissed.current === id) return;
      dismissed.current = null;
      window.clearTimeout(closeTimer.current);
      const rootBox = root.getBoundingClientRect();
      const box = control.getBoundingClientRect();
      const x = box.left + box.width / 2 - rootBox.left;
      setState((prev) => (prev?.id === id ? prev : { id, x }));
    },
    [close],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const id = previewIdOf(event.target as Element);
      if (id !== undefined) dismiss(id);
    },
    [dismiss],
  );

  const onLeave = useCallback(() => {
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      dismissed.current = null;
    }, RESET_AFTER);
    close();
  }, [close]);

  useEffect(() => {
    const root = rootRef.current;
    const control = state === null || root === null ? null : controlOf(root, state.id);
    control?.setAttribute('aria-describedby', popoverId);
    return () => control?.removeAttribute('aria-describedby');
  }, [state, popoverId]);

  useEffect(() => {
    const hotkeys = PREVIEWS.flatMap((p): { id: PreviewId; parsed: ReturnType<typeof parseHotkey> }[] =>
      'shortcut' in p ? [{ id: p.id, parsed: parseHotkey(SHORTCUTS[p.shortcut].keys) }] : [],
    );
    const onKey = (event: KeyboardEvent) => {
      const open = openId.current;
      if (open === null) return;
      if (event.key === 'Escape') {
        dismiss(open);
        return;
      }
      if (isEditable(event.target)) return;
      if (hotkeys.some((h) => matchesHotkey(event, h.parsed))) dismiss(open);
    };
    const onBlur = () => {
      if (openId.current !== null) dismiss(openId.current);
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') onBlur();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', onBlur);
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(resetTimer.current);
    };
  }, [dismiss]);

  return { rootRef, popoverId, state, onEnter, onLeave, onPointerDown };
}
