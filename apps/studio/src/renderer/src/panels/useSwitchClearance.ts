import { useEffect, useState } from 'react';

const GAP = 12;

export interface SwitchClearance {
  /** Window x where the mode switch starts and ends, less a gap; null until measured. */
  left: number;
  right: number;
}

/** The Design/Preview switch's measured edges, so neither side panel can be dragged under it (ONL-2744). */
export function useSwitchClearance(): SwitchClearance | null {
  const [clearance, setClearance] = useState<SwitchClearance | null>(null);
  useEffect(() => {
    const measure = (): void => {
      const element = document.querySelector('[data-testid="canvas-mode"]');
      const box = element?.getBoundingClientRect();
      if (box === undefined || box.width === 0) return;
      setClearance((prev) => {
        const next = { left: box.left - GAP, right: window.innerWidth - box.right - GAP };
        return prev !== null && prev.left === next.left && prev.right === next.right ? prev : next;
      });
    };
    measure();
    // One layout read per frame however many mutations land, so a streaming transcript costs nothing extra.
    let frame: number | null = null;
    const schedule = (): void => {
      if (frame === null) frame = requestAnimationFrame(() => { frame = null; measure(); });
    };
    // The switch can mount after the panels, behind the project switcher, and its labels can change width.
    const watcher = new MutationObserver(schedule);
    watcher.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      watcher.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return clearance;
}
