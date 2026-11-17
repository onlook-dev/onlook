import { use, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ShimmerCloneContext } from './ShimmerText.js';

const SLIDE_MS = 260;
const ENTER_MS = 200;
/** Shorter than SLIDE_MS: departing characters clear before staying ones slide over their ground. */
const EXIT_MS = 110;
const EASE = 'cubic-bezier(0.24, 1, 0.4, 1)';

const CHAR_ATTR = 'data-morph-char';
const LEAVING_ATTR = 'data-morph-leaving';

interface MorphChar {
  key: string;
  char: string;
}

interface LeavingChar extends MorphChar {
  left: number;
}

// `<character>:<nth occurrence>` is a character's identity across two strings, case included; the effect rests on it.
function toChars(text: string): MorphChar[] {
  const seen = new Map<string, number>();
  return [...text].map((char) => {
    const nth = (seen.get(char) ?? 0) + 1;
    seen.set(char, nth);
    return { key: `${char}:${nth}`, char };
  });
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const glyph = (char: string): ReactNode => (char === ' ' ? ' ' : char);

const CHAR_STYLE: CSSProperties = { display: 'inline-block', whiteSpace: 'pre' };

// Clips the departing characters on x only: under `line-height: 1` a y clip shaves the descenders.
const HOST_CLIP: CSSProperties = {
  overflowX: 'clip',
  overflowY: 'visible',
  overflowClipMargin: 2,
};

const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

export interface CharMorphTextProps {
  children: string;
  style?: CSSProperties;
  className?: string;
  testId?: string;
}

export function CharMorphText({ children, style, className, testId }: CharMorphTextProps): React.JSX.Element {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const placesRef = useRef<Map<string, number>>(new Map());
  const widthRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [leaving, setLeaving] = useState<readonly LeavingChar[]>([]);

  const chars = toChars(children);
  // A compositor animation under the clone's text mask leaves the mask frozen mid-move, tinting stale glyphs.
  const isStatic = use(ShimmerCloneContext);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const before = placesRef.current;
    const beforeWidth = widthRef.current;
    const after = new Map<string, HTMLElement>();
    for (const node of host.querySelectorAll<HTMLElement>(`[${CHAR_ATTR}]`)) {
      const key = node.getAttribute(CHAR_ATTR);
      if (key !== null) after.set(key, node);
    }

    const places = new Map<string, number>();
    for (const [key, node] of after) places.set(key, node.offsetLeft);
    const width = host.getBoundingClientRect().width;

    const commit = (): void => {
      placesRef.current = places;
      widthRef.current = width;
    };

    if (beforeWidth === undefined || isStatic || prefersReducedMotion()) {
      commit();
      return;
    }

    for (const [key, node] of after) {
      const from = before.get(key);
      if (from === undefined) {
        node.animate(
          [{ opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)' }],
          { duration: ENTER_MS, easing: EASE },
        );
        continue;
      }
      const shift = from - (places.get(key) ?? 0);
      if (Math.abs(shift) < 0.5) continue;
      node.animate([{ transform: `translateX(${shift}px)` }, { transform: 'none' }], {
        duration: SLIDE_MS,
        easing: EASE,
      });
    }

    // `width`, not `transform`: a transform scales the glyphs instead of moving the edge the chevron sits on.
    if (Math.abs(beforeWidth - width) >= 0.5) {
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      host.animate([{ width: `${beforeWidth}px` }, { width: `${width}px` }], {
        duration: SLIDE_MS,
        easing: EASE,
      });
    }

    const gone: LeavingChar[] = [];
    for (const [key, left] of before) {
      if (after.has(key)) continue;
      gone.push({ key, char: key.slice(0, key.lastIndexOf(':')), left });
    }
    commit();
    // A layout effect: the departing characters paint with the new string, not a frame later.
    setLeaving(gone);
  }, [children, isStatic]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null || leaving.length === 0) return;
    for (const node of host.querySelectorAll<HTMLElement>(`[${LEAVING_ATTR}]`)) {
      node.animate([{ opacity: 1 }, { opacity: 0, filter: 'blur(3px)' }], {
        duration: EXIT_MS,
        easing: 'ease-out',
        fill: 'forwards',
      });
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLeaving([]), EXIT_MS);
    return () => clearTimeout(timerRef.current);
  }, [leaving]);

  return (
    <span
      ref={hostRef}
      className={className}
      data-testid={testId}
      style={{ position: 'relative', display: 'inline-flex', whiteSpace: 'pre', ...HOST_CLIP, ...style }}
    >
      {/* The readable copy: every character span is aria-hidden. */}
      <span style={SR_ONLY}>{children}</span>
      {chars.map(({ key, char }) => (
        <span key={key} {...{ [CHAR_ATTR]: key }} aria-hidden="true" style={CHAR_STYLE}>
          {glyph(char)}
        </span>
      ))}
      {leaving.map(({ key, char, left }) => (
        <span
          key={`leaving:${key}`}
          {...{ [LEAVING_ATTR]: key }}
          aria-hidden="true"
          style={{ ...CHAR_STYLE, position: 'absolute', left, top: 0, pointerEvents: 'none' }}
        >
          {glyph(char)}
        </span>
      ))}
    </span>
  );
}
