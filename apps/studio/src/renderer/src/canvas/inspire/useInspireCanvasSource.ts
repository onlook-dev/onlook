import { useEffect } from 'react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import { restingFitNow, restingInsetsNow } from '../camera.js';
import { ZOOM_BOUNDS } from '../model.js';
import { pageOpenCamera } from '../mountFit.js';
import { setInspireCanvasSource } from './run.js';

/** Mounted inside `<ReactFlow>`: the camera and the pane are React Flow's. */
export function useInspireCanvasSource(): void {
  const { getViewport } = useReactFlow();
  const storeApi = useStoreApi();
  useEffect(() => {
    setInspireCanvasSource({
      camera: getViewport,
      pane: () => document.querySelector('.react-flow')?.getBoundingClientRect() ?? null,
      insets: restingInsetsNow,
      firstFit: (box, pane) => {
        const options = restingFitNow();
        return pageOpenCamera({
          boxes: [box],
          viewport: pane,
          zoom: { min: storeApi.getState().minZoom || ZOOM_BOUNDS.min, max: options.maxZoom },
          padding: options.padding,
        });
      },
    });
    return () => setInspireCanvasSource(null);
  }, [getViewport, storeApi]);
}
