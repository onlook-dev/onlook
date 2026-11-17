import { useEffect, useRef, useState, type ReactNode } from 'react';
import './artifact.css';

const SPEED_PX_PER_S = 40;
const PAUSE_MS = 900;
const EDGE = 24;
/* `--marquee-left` is registered in styles.css so it can animate (ONL-2593). */
const FADE = 'linear-gradient(to right, transparent, #000 var(--marquee-left, 0px), #000 calc(100% - 24px), transparent)';

/** One line; an overflowing line scrolls to its end on hover and back, and fades at the edge at rest (ONL-2593). */
export function MarqueeText({ children, title }: { children: ReactNode; title?: string }): React.JSX.Element {
  const box = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const running = useRef<Animation[]>([]);
  const [isOverflowing, setIsOverflowing] = useState(false);
  // A field inside (a rename) takes the row as it is: no scroll, full width (ONL-2593).
  const [isEditing, setIsEditing] = useState(false);

  const measure = (): number => {
    const overflow = (line.current?.scrollWidth ?? 0) - (box.current?.clientWidth ?? 0);
    setIsOverflowing(overflow > 1);
    return overflow;
  };

  useEffect(() => {
    if (box.current === null || line.current === null) return undefined;
    const observer = new ResizeObserver(() => {
      if (running.current.length > 0) start();
      else measure();
    });
    observer.observe(box.current);
    observer.observe(line.current);
    return () => {
      observer.disconnect();
      for (const animation of running.current) animation.cancel();
    };
  }, []);

  const start = (): void => {
    const overflow = measure();
    if (overflow <= 1 || line.current === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const travel = (overflow / SPEED_PX_PER_S) * 1000;
    const total = travel * 2 + PAUSE_MS * 2;
    for (const animation of running.current) animation.cancel();
    const at = (ms: number): number => ms / total;
    const ramp = Math.min(200, travel / 4);
    const timing = { duration: total, iterations: Infinity, easing: 'linear' } as const;
    running.current = [
      line.current.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: at(PAUSE_MS) },
          { transform: `translateX(${String(-overflow)}px)`, offset: at(PAUSE_MS + travel) },
          { transform: `translateX(${String(-overflow)}px)`, offset: at(PAUSE_MS * 2 + travel) },
          { transform: 'translateX(0)', offset: 1 },
        ],
        timing,
      ),
      ...(box.current === null ? [] : [box.current.animate(
        [
          { '--marquee-left': '0px', offset: 0 },
          { '--marquee-left': '0px', offset: at(PAUSE_MS) },
          { '--marquee-left': `${String(EDGE)}px`, offset: at(PAUSE_MS + ramp) },
          { '--marquee-left': `${String(EDGE)}px`, offset: at(total - ramp) },
          { '--marquee-left': '0px', offset: 1 },
        ],
        timing,
      )]),
    ];
  };

  const stop = (): void => {
    for (const animation of running.current) animation.cancel();
    running.current = [];
  };

  return (
    <span
      ref={box}
      title={title}
      onPointerEnter={() => { if (!isEditing) start(); }}
      onPointerLeave={stop}
      onFocus={(event) => {
        if (event.target instanceof HTMLInputElement) { stop(); setIsEditing(true); } else start();
      }}
      onBlur={(event) => {
        stop();
        if (event.target instanceof HTMLInputElement) setIsEditing(false);
      }}
      style={{
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        ...(isOverflowing && !isEditing ? { maskImage: FADE, WebkitMaskImage: FADE } : {}),
      }}
    >
      <span ref={line} style={isEditing ? { display: 'block', width: '100%' } : { display: 'inline-block', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </span>
  );
}
