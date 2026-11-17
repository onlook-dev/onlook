import { useEffect } from 'react';
import type { CanvasCamera, CaptureViewAnswer, CaptureViewRequest } from '@studio/events';
import { resetCameraMotion, useCameraMotion } from './cameraMotion.js';
import { createCaptureReveal, createPressTracker, measureCaptureGeometry, nextFrame, sameCamera } from './captureReveal.js';
import { useCanvasStore } from './store.js';
import { studio } from '../bridge.js';

interface CaptureViewWire {
  onCanvasCaptureView(listener: (request: CaptureViewRequest) => void): () => void;
  canvasCaptureViewed(answer: CaptureViewAnswer): void;
}

export function useCaptureReveal(options: {
  getViewport: () => CanvasCamera;
  setViewport: (camera: CanvasCamera, options: { duration: number }) => unknown;
  wire?: CaptureViewWire;
}): void {
  const { getViewport, setViewport, wire } = options;
  useEffect(() => {
    const transport: CaptureViewWire = wire ?? studio();
    const presses = createPressTracker();
    const press = (event: PointerEvent): void => { presses.down(event.pointerId); };
    const release = (event: PointerEvent): void => { presses.up(event.pointerId); };
    const move = (event: PointerEvent): void => { presses.moved(event.buttons); };
    const reset = (): void => { presses.reset(); };
    window.addEventListener('pointerdown', press, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('blur', reset);
    const reveal = createCaptureReveal({
      camera: getViewport,
      setCamera: (camera) => {
        void setViewport(camera, { duration: 0 });
        resetCameraMotion();
      },
      geometry: measureCaptureGeometry,
      busy: () => {
        const state = useCanvasStore.getState();
        return useCameraMotion.getState().moving || presses.held() || state.isSpacePanning ||
          state.frameDraw !== null || Object.keys(state.gesture).length > 0;
      },
      settled: async (camera, limitMs) => {
        const began = performance.now();
        while (!sameCamera(getViewport(), camera) && performance.now() - began < limitMs) await nextFrame();
        await nextFrame();
      },
      holdCamera: (isHeld) => useCanvasStore.getState().holdCaptureCamera(isHeld),
      keepCamera: (camera) => useCanvasStore.getState().noteCameraSettled(camera),
      answer: (answer) => transport.canvasCaptureViewed(answer),
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });
    const off = transport.onCanvasCaptureView((request) => void reveal.handle(request));
    return () => {
      off();
      reveal.dispose();
      window.removeEventListener('pointerdown', press, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('blur', reset);
    };
  }, [getViewport, setViewport, wire]);
}
