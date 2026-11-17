import { useEffect, useState } from 'react';
import { useStoreApi } from '@xyflow/react';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';

import { t } from '@studio/i18n';
import { usePanelCover } from './panelCover.js';
import { RecenterIcon } from '../icons/glyphs.js';
import { useCameraControls } from './camera.js';
import { hasVisibleNodes } from './visibility.js';

function shouldShow(state: {
  nodes: readonly { position: { x: number; y: number }; width?: number | null; height?: number | null }[];
  transform: readonly [number, number, number];
  width: number;
  height: number;
}): boolean {
  const { nodes, transform, width, height } = state;
  return nodes.length > 0 && !hasVisibleNodes(nodes, transform, { width, height });
}

export function RecenterButton(): React.JSX.Element | null {
  const storeApi = useStoreApi();
  const { fitAll } = useCameraControls();
  const cover = usePanelCover();

  // A lazy initialiser: starting at `false` and correcting in an effect flashes the pill on every canvas that opens panned away.
  const [showButton, setShowButton] = useState(() => shouldShow(storeApi.getState()));

  // A store subscription coalesced per frame, not `useNodes()` + `useViewport()`: those re-render at frame rate through every pan and zoom.
  useEffect(() => {
    let rafId: number | null = null;
    let cancelled = false;

    const evaluate = (): void => {
      rafId = null;
      if (cancelled) return;
      const next = shouldShow(storeApi.getState());
      setShowButton((previous) => (previous === next ? previous : next));
    };

    const schedule = (): void => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(evaluate);
    };

    evaluate();

    const unsubscribe = storeApi.subscribe(schedule);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [storeApi]);

  if (!showButton) return null;

  return (
    <Center
      style={{
        position: 'absolute',
        insetBlock: 0,
        insetInlineStart: cover.start,
        insetInlineEnd: cover.end,
        pointerEvents: 'none',
      }}
    >
      <Button
        variant="secondary"
        size="lg"
        label={t('canvas.recenter')}
        icon={<RecenterIcon />}
        onClick={fitAll}
        data-testid="canvas-recenter"
        style={{ pointerEvents: 'auto', cornerShape: 'superellipse(1.5)' } as React.CSSProperties}
      />
    </Center>
  );
}
