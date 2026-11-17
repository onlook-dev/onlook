import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useOverflows<T extends HTMLElement>(text: string): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const box = ref.current;
    if (box === null) return;
    const read = (): void => setOverflows(box.scrollWidth > box.clientWidth + 1);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(box);
    if (box.firstElementChild !== null) observer.observe(box.firstElementChild);
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) read();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [text]);
  return [ref, overflows];
}
