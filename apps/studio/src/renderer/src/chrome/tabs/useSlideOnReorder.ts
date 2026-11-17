import { useLayoutEffect, useRef, type RefObject } from 'react';

const SLIDE_MS = 180;
const SLIDE_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

export function useSlideOnReorder(
  rowRef: RefObject<HTMLElement | null>,
  order: readonly string[],
  exceptId?: string,
): void {
  const previous = useRef(new Map<string, number>());
  const previousOrder = useRef<readonly string[]>(order);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;

    // Chrome beside the strip resizes tabs with no render; only a new order is a reorder.
    const isReorder = order.some((id, index) => previousOrder.current[index] !== id);
    previousOrder.current = order;

    const next = new Map<string, number>();
    for (const id of order) {
      const node = row.querySelector(`[data-testid="tab-${id}"]`);
      if (!(node instanceof HTMLElement)) continue;
      // `offsetLeft`, not the rect: mid-slide the rect measures the animation's own delta and starts another slide.
      const left = node.offsetLeft;
      next.set(id, left);
      if (id === exceptId || !isReorder) continue;

      const before = previous.current.get(id);
      if (before === undefined || before === left) continue;

      // One slide per tab, or a back-and-forth drag runs two and lands between them.
      for (const running of node.getAnimations()) running.cancel();
      // WAAPI, not an inline `transform`: a drag re-renders on every pointer move and React would clobber it mid-flight (ONL-2364).
      node.animate(
        [{ transform: `translateX(${String(before - left)}px)` }, { transform: 'translateX(0px)' }],
        { duration: SLIDE_MS, easing: SLIDE_EASING },
      );
    }
    previous.current = next;
  });

  // The positions follow a resize, or the next reorder slides from a stale spot.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return undefined;
    const observer = new ResizeObserver(() => {
      for (const id of previous.current.keys()) {
        const node = row.querySelector(`[data-testid="tab-${id}"]`);
        if (node instanceof HTMLElement) previous.current.set(id, node.offsetLeft);
      }
    });
    for (const node of row.children) observer.observe(node);
    return () => observer.disconnect();
  }, [rowRef, order.length]);
}
