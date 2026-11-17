import { HStack, VStack } from '@astryxdesign/core/Layout';
import { useEffect } from 'react';
import type { PanelsState } from '@studio/events';
import { leftOverlayWidth } from './rail/leftPanel.js';
import { subscribeToPanelWidths, usePanelsStore } from './panels/store.js';

interface ParkedScreenProps {
  panels: PanelsState;
}

export function ParkedTab(): React.JSX.Element {
  useEffect(() => subscribeToPanelWidths(), []);
  const panels = usePanelsStore();
  return <ParkedScreen panels={panels} />;
}

/** Painted from birth facts alone so a `+` tab's first commit carries rails; a read, store or bridge here makes that paint wait (ONL-2318). */
export function ParkedScreen({ panels }: ParkedScreenProps): React.JSX.Element {
  return (
    <HStack width="100%" height="100%" style={{ background: 'var(--studio-ground)' }} data-testid="parked-surface">
      <Rail width={leftOverlayWidth('designs', panels)} side="left" />
      <VStack style={{ flex: '1 1 auto', minWidth: 0 }} />
      <Rail width={panels.end} side="right" />
    </HStack>
  );
}

function Rail({ width, side }: { width: number; side: 'left' | 'right' }): React.JSX.Element {
  return (
    <VStack
      height="100%"
      data-testid={`parked-rail-${side}`}
      style={{
        width,
        flex: `0 0 ${String(width)}px`,
        background: 'var(--color-background-surface)',
        [side === 'left' ? 'borderRight' : 'borderLeft']: 'var(--border-width) solid var(--color-border)',
      }}
    />
  );
}
