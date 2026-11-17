import { useEffect, useRef, useState, type ReactNode } from 'react';

export const CHROME_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const CHROME_DURATION_MS = 240;

const TRANSITION = ['width', 'margin-inline-end', 'opacity', 'filter']
  .map((property) => `${property} ${String(CHROME_DURATION_MS)}ms ${CHROME_EASE}`)
  .join(', ');

/** `EasedWidth` only: a content change leaves the computed width `auto`, so no CSS transition fires and the width would jump. */
function useEasedWidth(): {
  ref: React.RefObject<HTMLSpanElement | null>;
  width: number | undefined;
} {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new ResizeObserver(() => setWidth(node.offsetWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function EasedWidth({ children }: { children: ReactNode }): React.JSX.Element {
  const { ref, width } = useEasedWidth();
  return (
    <span
      style={{
        display: 'inline-flex',
        width,
        overflow: 'hidden',
        transition: `width ${String(CHROME_DURATION_MS)}ms ${CHROME_EASE}`,
      }}
    >
      <span ref={ref} style={{ display: 'inline-flex', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </span>
  );
}

/** Hidden, it keeps its last content so the exit can play; `gap` cancels the flex gap it would leave. */
export function Presence({
  isShown,
  gap = 0,
  children,
}: {
  isShown: boolean;
  gap?: number;
  children: ReactNode;
}): React.JSX.Element {
  const [kept, setKept] = useState<ReactNode>(children);
  if (isShown && kept !== children) setKept(children);

  return (
    <span
      aria-hidden={isShown ? undefined : true}
      inert={!isShown}
      style={{
        display: 'inline-flex',
        flex: '0 0 auto',
        overflow: 'hidden',
        /* `auto` interpolates against `0` only under this; it is inherited, so the inner span takes it back off the content (ONL-2650). */
        interpolateSize: 'allow-keywords',
        width: isShown ? 'auto' : 0,
        marginInlineEnd: isShown ? 0 : -gap,
        opacity: isShown ? 1 : 0,
        filter: isShown ? 'blur(0)' : 'blur(4px)',
        transition: TRANSITION,
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0, whiteSpace: 'nowrap', interpolateSize: 'numeric-only' }}>
        {isShown ? children : kept}
      </span>
    </span>
  );
}
