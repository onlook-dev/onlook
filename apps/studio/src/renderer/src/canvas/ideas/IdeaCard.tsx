import type { CSSProperties, ReactNode } from 'react';
import { Blocking, block, col, rep, row, type Node, type Tone } from './blocking.jsx';
import { CARD, REST } from './choreography.js';
import type { IdeaKind } from './ideas.js';
import { partStyles, type PartStyle } from './parts.js';
import arc from './arc.webp';
import wave from './wave.webp';

const UNIT = 4;

const INKS: Record<Tone, string> = {
  deep: 'var(--studio-illo-card)',
  paper: 'color-mix(in srgb, transparent, white 6%)',
  frame: 'var(--studio-illo-ink-soft)',
  faint: 'var(--studio-illo-ink)',
  ink: 'var(--studio-illo-fill)',
};

const art = (src: string): ReactNode => (
  <img
    src={src}
    alt=""
    draggable={false}
    style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'lighten', opacity: 0.85 }}
  />
);

const COMPONENT: Node = col(
  { align: 'center', justify: 'center', gap: 0 },
  col(
    { cross: 44, gap: 1.5 },
    row({ gap: 1, align: 'center' }, block('faint', { size: 2, cross: 2 }), block('faint', { size: 11, cross: 1 })),
    col(
      { tone: 'paper', stroke: 'frame', pad: 3, gap: 3 },
      block('deep', { size: 20, art: art(arc) }),
      col({ gap: 1.5, align: 'start' }, block('faint', { size: 2, cross: 24 }), block('faint', { size: 1, cross: 33 }), block('faint', { size: 1, cross: 21 })),
      row({ justify: 'between', align: 'center' }, block('faint', { size: 9, cross: 1.5 }), block('ink', { size: 12, cross: 4 })),
    ),
  ),
);

const LANDING: Node = col(
  { pad: 4, gap: 3 },
  row({ justify: 'between', align: 'center' }, block('faint', { size: 3, cross: 3 }), row({ gap: 2 }, block('faint', { size: 5, cross: 1 }), block('faint', { size: 6, cross: 1 }), block('faint', { size: 4, cross: 1 }))),
  block('deep', { size: 23, art: art(wave) }),
  col({ gap: 1.5, align: 'start' }, block('faint', { size: 2.5, cross: 38 }), block('faint', { size: 2.5, cross: 27 }), block('faint', { size: 1, cross: 42 })),
  row({ gap: 1.5 }, block('ink', { size: 14, cross: 4.5 }), block('paper', { size: 14, cross: 4.5 })),
  row({ gap: 2, grow: 1 }, ...rep(3, () => block('paper', { grow: 1 }))),
);

const step = (tone: Tone) => col({ tone, stroke: 'frame', pad: 2, gap: 1.5, size: 13, align: 'start' }, block('faint', { size: 1.5, cross: 7 }), block('faint', { size: 1, cross: 9 }), block('faint', { size: 1, cross: 5 }));
const wire = () => block('frame', { grow: 1, cross: 0.25 });

const bar = (cross: number, tone: Tone = 'faint') => block(tone, { grow: 1, cross });
const meter = (cross: number, tone: Tone = 'faint') => block(tone, { size: 2, cross });

const VISUALIZATION: Node = col(
  { pad: 4, gap: 3 },
  row({ gap: 1.5, align: 'center' }, block('faint', { size: 3, cross: 3 }), block('faint', { size: 16, cross: 1.5 })),
  col(
    { tone: 'deep', pad: 2, justify: 'center' },
    row(
      { align: 'center', gap: 0 },
      step('paper'),
      wire(),
      step('paper'),
      wire(),
      col({ tone: 'ink', pad: 2, gap: 1.5, size: 13, align: 'start' }, block('paper', { size: 1.5, cross: 7 }), block('paper', { size: 1, cross: 9 }), block('paper', { size: 1, cross: 5 })),
    ),
  ),
  row(
    { gap: 2, grow: 1 },
    row({ tone: 'deep', pad: 3, gap: 1.5, grow: 3, align: 'end' }, bar(7), bar(11), bar(9), bar(15), bar(12), bar(19, 'ink')),
    col({ tone: 'deep', pad: 3, gap: 2.5, grow: 2, justify: 'center', align: 'start' }, meter(14, 'ink'), meter(11), meter(8), meter(5)),
  ),
  col({ gap: 1.5, align: 'start' }, block('faint', { size: 2.5, cross: 34 }), block('faint', { size: 1, cross: 44 }), block('faint', { size: 1, cross: 30 })),
);

const FACES: Record<IdeaKind, Node> = { component: COMPONENT, landing: LANDING, visualization: VISUALIZATION };

const SHEEN = 'linear-gradient(105deg, transparent 30%, var(--studio-illo-scan-glow) 46%, var(--studio-illo-highlight) 54%, transparent 70%)';
const LAYER: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const EDGE: CSSProperties = { position: 'absolute', inset: -1, borderRadius: 8, pointerEvents: 'none', boxSizing: 'border-box' };

/** The lift from ghost to card rides three opacities (veil, edge, face) so a WAAPI film can drive it. `style` places the card; its parts take `styles`. */
export function IdeaCard({
  kind,
  styles = partStyles(REST),
  isLit = false,
  style,
}: {
  kind: IdeaKind;
  styles?: Record<string, PartStyle>;
  isLit?: boolean;
  style?: CSSProperties;
}): React.JSX.Element {
  return (
    <div
      data-idea-card={kind}
      aria-hidden
      style={{
        position: 'relative',
        ...CARD,
        borderRadius: 8,
        border: '1px solid var(--studio-illo-hairline)',
        background: 'var(--studio-illo-card)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span data-idea-part={`veil:${kind}`} style={{ ...LAYER, borderRadius: 7, background: 'var(--studio-illo-highlight)', ...styles[`veil:${kind}`] }} />
      <span data-idea-part={`face:${kind}`} style={{ ...LAYER, borderRadius: 7, overflow: 'hidden', ...styles[`face:${kind}`] }}>
        <Blocking tree={FACES[kind]} u={UNIT} inks={INKS} radius={1} />
      </span>
      <span style={{ ...LAYER, borderRadius: 7, overflow: 'hidden' }}>
        <span data-idea-part={`sheen:${kind}`} style={{ ...LAYER, mixBlendMode: 'plus-lighter', background: SHEEN, ...styles[`sheen:${kind}`] }} />
      </span>
      <span data-idea-part={`edge:${kind}`} style={{ ...EDGE, border: '1px solid var(--studio-illo-frost-edge)', ...styles[`edge:${kind}`] }} />
      <span
        style={{
          ...EDGE,
          border: '1px solid var(--studio-illo-lit)',
          opacity: isLit ? 1 : 0,
          transition: 'opacity 120ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      />
    </div>
  );
}
