import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { BreathingGround } from './BreathingGround.js';
import { frameQuoteLayout, nextQuoteLayer, quoteRuns, quoteTextShows, type QuoteLayer } from './quoteRules.js';

interface FrameQuoteProps {
  quote: string | undefined;
  isBuilding: boolean;
  width: number;
  height: number;
  canvasZoom: number;
}

/** The page stays mounted under the quote, so a lift is a cross-fade to it with no remount. */
export function FrameQuote({ quote, isBuilding, width, height, canvasZoom }: FrameQuoteProps): React.JSX.Element | null {
  const [layer, setLayer] = useState<QuoteLayer | null>(null);
  const next = nextQuoteLayer(layer, quote, canvasZoom);
  if (next !== layer) setLayer(next);
  if (next === null) return null;
  return (
    <QuoteFace
      quote={next.text}
      isBuilding={isBuilding && !next.isLeaving}
      isLeaving={next.isLeaving}
      width={width}
      height={height}
      canvasZoom={next.canvasZoom}
      onLeft={() => {
        setLayer((current) => (current?.isLeaving === true ? null : current));
      }}
    />
  );
}

function QuoteFace({ quote, isBuilding, isLeaving, width, height, canvasZoom, onLeft }: Omit<FrameQuoteProps, 'quote'> & { quote: string; isLeaving: boolean; onLeft: () => void }): React.JSX.Element {
  const [hasEntered, setEntered] = useState(false);
  const layout = frameQuoteLayout({ width, height });
  const { zoom, measure, maxLines } = layout;
  const zoomOnScreen = Math.max(canvasZoom, 0.01);
  const showsText = quoteTextShows(layout, zoomOnScreen);
  const words = showsText ? (
    <div style={{ zoom, maxWidth: measure / zoom, textWrap: 'balance' }}>
      <Text type="display-1" color="inherit" maxLines={maxLines} style={{ fontWeight: 300, letterSpacing: '-0.01em' }}>
        {quoteRuns(quote).map((run, index) => (run.keepsTogether ? <span key={index} style={{ whiteSpace: 'nowrap' }}>{run.text}</span> : run.text))}
      </Text>
    </div>
  ) : null;
  return (
    <div
      data-testid="frame-quote"
      data-quote-text={showsText ? 'shown' : 'hidden'}
      data-leaving={isLeaving ? 'true' : undefined}
      className={isLeaving ? 'frame-quote-out' : hasEntered ? undefined : 'frame-scale-in'}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (isLeaving) onLeft();
        else setEntered(true);
      }}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <BreathingGround width={width} pixel={1 / zoomOnScreen} isActive={isBuilding} words={words} />
    </div>
  );
}
