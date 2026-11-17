/** `id` is the identity, not `children`: React elements are new objects every render, and comparing them fades on every commit. */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Layout';

/** Trading places: the box holds still, so it is quick. */
const FADE_MS = 180;
/** Closing: a layout move, so it runs on `CharMorphText`'s slide beat. */
const COLLAPSE_MS = 260;
const EASE = 'cubic-bezier(0.24, 1, 0.4, 1)';
const BLUR = '3px';
const OVERHANG = 2;
const DRAW_PX = 4;

const HREF = 'studio-morph-glyph';
const CLASS = 'studio-morph-glyph';
const RULES = `
@keyframes studio-morph-glyph-in {
  from { opacity: 0; filter: blur(${BLUR}); }
  to   { opacity: 1; filter: blur(0); }
}
@keyframes studio-morph-glyph-out {
  from { opacity: 1; filter: blur(0); }
  to   { opacity: 0; filter: blur(${BLUR}); }
}
@keyframes studio-morph-glyph-collapse {
  from { opacity: 1; filter: blur(0); transform: translateX(0); }
  to   { opacity: 0; filter: blur(${BLUR}); transform: translateX(-${String(DRAW_PX)}px); }
}
/* ⚠️ Centred on a track pinned to the box (grid-template-rows below). An auto
   track grows to the tallest child, and the icons render larger than the slot. */
.${CLASS} > * {
  grid-area: 1 / 1;
  align-self: center;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.${CLASS} [data-glyph-entering] {
  animation: studio-morph-glyph-in ${FADE_MS}ms ${EASE} both;
}
.${CLASS} [data-glyph-leaving] {
  animation: studio-morph-glyph-out ${FADE_MS}ms ${EASE} both;
  pointer-events: none;
}
.${CLASS} [data-glyph-leaving][data-glyph-collapsing] {
  animation: studio-morph-glyph-collapse ${COLLAPSE_MS}ms ${EASE} both;
}
@media (prefers-reduced-motion: reduce) {
  .${CLASS} [data-glyph-entering],
  .${CLASS} [data-glyph-leaving] {
    animation: none;
  }
  .${CLASS} [data-glyph-leaving] {
    display: none;
  }
}
`;

interface Held {
  id: string | undefined;
  node: ReactNode;
}

export interface MorphGlyphProps {
  /** `undefined` is a state the box crosses to, not a reason to unmount it. */
  id: string | undefined;
  size: number;
  color?: string;
  /** The gap to the label, held here so it closes with the box. */
  gap?: number;
  children: ReactNode;
}

export function MorphGlyph({ id, size, color, gap = 0, children }: MorphGlyphProps): React.JSX.Element {
  const [leaving, setLeaving] = useState<Held | undefined>(undefined);
  const heldRef = useRef<Held>({ id, node: children });
  const isFirstRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* In the effect, never during render: a ref written during render is overwritten by whichever commit lands last. */
  useEffect(() => {
    const previous = heldRef.current;
    heldRef.current = { id, node: children };
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    if (previous.id === id || previous.id === undefined) return;
    setLeaving(previous);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLeaving(undefined), id === undefined ? COLLAPSE_MS : FADE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const isEmpty = id === undefined;
  const box: CSSProperties = {
    width: isEmpty ? 0 : size,
    marginInlineEnd: isEmpty ? 0 : gap,
    height: size,
    flex: '0 0 auto',
    color,
    display: 'grid',
    gridTemplateColumns: '100%',
    gridTemplateRows: '100%',
    /** ⚠️ `clip` with a margin, not `hidden`: the icons exceed the slot and would be shaved. */
    overflow: 'clip',
    overflowClipMargin: OVERHANG,
    transition: `width ${COLLAPSE_MS}ms ${EASE}, margin-inline-end ${COLLAPSE_MS}ms ${EASE}`,
  };

  return (
    <HStack vAlign="center" aria-hidden="true" className={CLASS} style={box}>
      <style href={HREF} precedence="medium">
        {RULES}
      </style>
      {/* Keyed by id, so a new mark enters rather than swapping in place. */}
      {isEmpty ? null : (
        <span key={id} {...(isFirstRef.current ? {} : { 'data-glyph-entering': '' })}>
          {children}
        </span>
      )}
      {leaving === undefined || leaving.id === undefined ? null : (
        <span
          key={`leaving:${leaving.id}`}
          data-glyph-leaving=""
          {...(isEmpty ? { 'data-glyph-collapsing': '' } : {})}
        >
          {leaving.node}
        </span>
      )}
    </HStack>
  );
}
