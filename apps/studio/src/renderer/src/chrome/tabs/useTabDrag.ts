/**
 * Drag-to-reorder (ONL-2364).
 *
 * ⚠️ Not per-tab offsets. Shifting neighbours to fake a gap leaves the array in
 * main's order, which forces parking the drop around main's round trip — every
 * step of that is a frame where something moves that should not.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { MIN_TAB_WIDTH, TAB_WIDTH } from './geometry.js';

const THRESHOLD = 4;
const RUBBER = 56;
const DROP_HOLD_MS = 1000;

interface Live {
  id: string;
  startX: number;
  baseOrder: readonly string[];
  baseIndex: number;
  armed: boolean;
  toIndex: number;
}

export interface TabDragState {
  /** What the strip renders. Main's order until a drag moves it. */
  order: readonly string[];
  draggingId?: string;
  /** The pointer's distance less the slots already crossed for real. */
  offset: number;
}

export function useTabDrag(
  ids: readonly string[],
  onDrop: (tabId: string, toIndex: number) => void,
): { state: TabDragState; begin: (tabId: string, event: { clientX: number }) => void } {
  const [drag, setDrag] = useState<{ id: string; order: readonly string[]; offset: number } | null>(null);
  // The dropped order, held until main's arrives: falling back to the old order for the round trip slides every tab back and then forward again.
  const [dropped, setDropped] = useState<{ order: readonly string[]; base: string } | null>(null);
  const live = useRef<Live | null>(null);
  const idsRef = useRef(ids);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    idsRef.current = ids;
    dropRef.current = onDrop;
  });

  const begin = useCallback((tabId: string, event: { clientX: number }): void => {
    const baseOrder = idsRef.current;
    const baseIndex = baseOrder.indexOf(tabId);
    if (baseIndex === -1) return;
    live.current = { id: tabId, startX: event.clientX, baseOrder, baseIndex, armed: false, toIndex: baseIndex };
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent): void => {
      const current = live.current;
      if (!current) return;
      const raw = event.clientX - current.startX;
      if (!current.armed) {
        if (Math.abs(raw) < THRESHOLD) return;
        current.armed = true;
      }
      // Measured: tabs shrink as the count grows, so `TAB_WIDTH` over-steps.
      const width = widthOf(current.id) ?? TAB_WIDTH;
      const last = current.baseOrder.length - 1;
      const held = rubberBand(raw, -current.baseIndex * width, (last - current.baseIndex) * width);
      current.toIndex = clamp(current.baseIndex + Math.round(held / width), 0, last);
      setDrag({
        id: current.id,
        order: moved(current.baseOrder, current.id, current.toIndex),
        offset: held - (current.toIndex - current.baseIndex) * width,
      });
    };

    const onUp = (): void => {
      const current = live.current;
      live.current = null;
      if (!current?.armed) {
        setDrag(null);
        return;
      }
      // From the REF, never a state updater: React may call one twice and a doubled drop reorders twice.
      if (current.toIndex !== current.baseIndex) {
        setDropped({
          order: moved(current.baseOrder, current.id, current.toIndex),
          base: idsRef.current.join('\n'),
        });
        dropRef.current(current.id, current.toIndex);
      }
      setDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const isHeld = dropped !== null && dropped.base === ids.join('\n');
  useEffect(() => {
    if (dropped === null) return undefined;
    if (!isHeld) {
      setDropped(null);
      return undefined;
    }
    // Main refused the move and its order never changed.
    const release = setTimeout(() => setDropped(null), DROP_HOLD_MS);
    return () => clearTimeout(release);
  }, [dropped, isHeld]);

  const state: TabDragState =
    drag !== null
      ? { order: drag.order, draggingId: drag.id, offset: drag.offset }
      : { order: isHeld ? dropped.order : ids, offset: 0 };
  return { state, begin };
}

/** An insert, never a swap. */
function moved(order: readonly string[], id: string, toIndex: number): readonly string[] {
  const rest = order.filter((entry) => entry !== id);
  rest.splice(toIndex, 0, id);
  return rest;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high));
}

/** One-to-one inside `[low, high]` so a drop lands where the user pointed; outside, compressed toward `RUBBER` and never reaching it. */
function rubberBand(offset: number, low: number, high: number): number {
  if (offset > high) return high + resist(offset - high);
  if (offset < low) return low - resist(low - offset);
  return offset;
}

function resist(excess: number): number {
  return (excess / (excess + RUBBER)) * RUBBER;
}

function widthOf(tabId: string): number | undefined {
  const node = document.querySelector(`[data-testid="tab-${tabId}"]`);
  if (!node) return undefined;
  const width = node.getBoundingClientRect().width;
  return width >= MIN_TAB_WIDTH ? width : undefined;
}
