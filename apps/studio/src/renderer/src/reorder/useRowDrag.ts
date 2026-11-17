import { useEffect, useRef, useState, type RefObject } from 'react';

import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { dropIndexAt, isDragArmed } from '../sidebar/designOrder.js';

interface Live {
  id: string;
  startY: number;
  armed: boolean;
  index: number;
}

export interface RowDrag {
  /** The row being dragged and the gap it would land in, counted over the whole list. */
  drag: { id: string; index: number } | null;
  begin: (id: string, event: React.PointerEvent) => void;
  /** True for the click that ends a drag, which must not also select. */
  wasDrag: () => boolean;
}

/** `wasDrag` is self-clearing, and `rowSelector` is read across the whole list (ONL-2488). */
export function useRowDrag(
  list: RefObject<HTMLElement | null>,
  rowSelector: string,
  onDrop: (id: string, index: number) => void,
): RowDrag {
  const [drag, setDrag] = useState<{ id: string; index: number } | null>(null);
  const live = useRef<Live | null>(null);
  const endedDrag = useRef(false);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  useEffect(() => {
    const onMove = (event: PointerEvent): void => {
      const current = live.current;
      if (current === null) return;
      if (!current.armed) {
        if (!isDragArmed(current.startY, event.clientY)) return;
        current.armed = true;
      }
      // Read per move, not at the press: a scroll or a node an agent adds mid-drag moves the rows.
      const rows = list.current?.querySelectorAll<HTMLElement>(rowSelector) ?? [];
      const index = dropIndexAt(
        [...rows].map((row) => {
          const box = row.getBoundingClientRect();
          return box.top + box.height / 2;
        }),
        event.clientY,
      );
      if (index === current.index) return;
      current.index = index;
      setDrag({ id: current.id, index });
    };
    const onUp = (): void => {
      const current = live.current;
      live.current = null;
      if (current?.armed !== true) return;
      endedDrag.current = true;
      // Only the click this release fires, which dispatches before any timer; a release off the list fires none.
      setTimeout(() => {
        endedDrag.current = false;
      }, 0);
      setDrag(null);
      dropRef.current(current.id, current.index);
    };
    // A cancelled pointer (the OS took it) is no drop.
    const onCancel = (): void => {
      live.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [list, rowSelector]);

  return {
    drag,
    begin: (id, event) => {
      endedDrag.current = false;
      if (event.button !== 0 || isInteractiveTarget(event.target)) return;
      live.current = { id, startY: event.clientY, armed: false, index: -1 };
    },
    wasDrag: () => {
      const was = endedDrag.current;
      endedDrag.current = false;
      return was;
    },
  };
}
