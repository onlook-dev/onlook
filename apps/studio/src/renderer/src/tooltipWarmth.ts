/** How long after the last tooltip closed a neighbour's still opens at once and without its entrance. */
export const TOOLTIP_WARM_MS = 450;

export function isTooltipWarm(openNow: number, lastClosedAt: number, now: number): boolean {
  return openNow > 0 || now - lastClosedAt < TOOLTIP_WARM_MS;
}

/** Astryx 0.1.9 has no tooltip group, so warmth is read from every `.astryx-tooltip` popover. */
export function trackTooltipWarmth(): void {
  const shown = new Set<HTMLElement>();
  let lastClosedAt = Number.NEGATIVE_INFINITY;
  // A popover removed while showing fires no toggle, so the set is pruned rather than trusted.
  const prune = (): void => {
    for (const element of shown) if (!element.isConnected || !element.matches(':popover-open')) shown.delete(element);
  };
  const isWarm = (): boolean => {
    prune();
    return isTooltipWarm(shown.size, lastClosedAt, performance.now());
  };
  (globalThis as { __astryxTooltipIsWarm?: () => boolean }).__astryxTooltipIsWarm = isWarm;
  document.addEventListener(
    'beforetoggle',
    (event) => {
      const tooltip = event.target;
      if (!(tooltip instanceof HTMLElement) || !tooltip.classList.contains('astryx-tooltip')) return;
      if ((event as Event & { newState?: string }).newState === 'open') {
        tooltip.toggleAttribute('data-tooltip-warm', isWarm());
        // The one it replaces would linger through the library's 100ms hover bridge beside it.
        for (const other of [...shown]) if (other !== tooltip) other.hidePopover();
        shown.add(tooltip);
        return;
      }
      shown.delete(tooltip);
      lastClosedAt = performance.now();
    },
    { capture: true },
  );
}
