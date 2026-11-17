import type { CSSProperties, ReactNode } from 'react';
import './frame.css';

const FILL: CSSProperties = { position: 'absolute', inset: 0 };

/** The designed edge and glow were drawn on a 1512px frame; they keep that share of the frame's width. */
const EDGE_SHARE = 4 / 1512;
const GLOW_SHARE = 160 / 1512;

export interface BreathingGroundProps {
  /** In the ground's own px. */
  width: number;
  /** One screen pixel in the ground's own px, the edge's floor. */
  pixel: number;
  isActive: boolean;
  /** Drawn once still, or twice while active: a dim copy under a bright one the sweep lights. */
  words: ReactNode;
  wordsStyle?: CSSProperties;
}

/** The frame's card grey; while active, an edge and the words lit by one sweep, over a glow breathing in step (ONL-2901). */
export function BreathingGround({ width, pixel, isActive, words, wordsStyle }: BreathingGroundProps): React.JSX.Element {
  const edge = Math.max(pixel, width * EDGE_SHARE);
  const centred: CSSProperties = { ...FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...wordsStyle };
  if (!isActive) {
    return (
      <div data-breathing="still" style={{ ...FILL, background: 'var(--color-background-card)' }}>
        <div className="breath-still-words" style={centred}>{words}</div>
      </div>
    );
  }
  return (
    <div
      data-breathing="active"
      className="breath"
      style={{ ...FILL, overflow: 'hidden', background: 'var(--color-background-card)', ['--breath-edge' as string]: `${String(edge)}px`, ['--breath-glow' as string]: `${String(width * GLOW_SHARE)}px` }}
    >
      <div aria-hidden className="breath-rest" style={FILL} />
      <div aria-hidden className="breath-peak" style={FILL} />
      <div className="breath-dim" style={centred}>{words}</div>
      <div aria-hidden className="breath-band">
        <div className="breath-lit">
          <div className="breath-edge" style={FILL} />
          <div className="breath-bright" style={centred}>{words}</div>
        </div>
      </div>
    </div>
  );
}
