import { useEffect } from 'react';

export function useCanvasMenuDismissal(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return undefined;
    let withheld: { target: Element; x: number; y: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      withheld = { target: event.target, x: event.clientX, y: event.clientY };
      clearTimeout(timer);
      timer = setTimeout(() => {
        const missed = withheld;
        withheld = null;
        missed?.target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: missed.x, clientY: missed.y }));
      }, 0);
    };
    const onMouseDown = (event: MouseEvent): void => {
      if (event.isTrusted) withheld = null;
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mousedown', onMouseDown, true);
    };
  }, [isOpen]);
}
