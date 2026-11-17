import { useLayoutEffect, useState, type RefObject } from 'react';
import { connectorsMenuMaxHeight } from './model.js';

export function useConnectorsMenuMaxHeight(isOpen: boolean, trigger: RefObject<HTMLElement | null>): number | undefined {
  const [maxHeight, setMaxHeight] = useState<number>();
  useLayoutEffect(() => {
    const anchor = trigger.current;
    const header = anchor?.closest('[data-testid="chat-panel"]')?.querySelector('[data-testid="chat-header"]');
    if (!isOpen || !anchor || !header) return;
    const measure = (): void => setMaxHeight(connectorsMenuMaxHeight({ header: header.getBoundingClientRect(), trigger: anchor.getBoundingClientRect() }));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen, trigger]);
  return maxHeight;
}
