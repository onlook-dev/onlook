import { useEffect } from 'react';
import { useStoreApi } from '@xyflow/react';

export function useFrameZoomStyle(): void {
  const store = useStoreApi();
  useEffect(() => {
    const update = (): void => {
      const { domNode, transform } = store.getState();
      domNode?.style.setProperty('--frame-zoom', String(transform[2]));
    };
    update();
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.transform[2] !== previous.transform[2] || state.domNode !== previous.domNode) update();
    });
    return unsubscribe;
  }, [store]);
}
