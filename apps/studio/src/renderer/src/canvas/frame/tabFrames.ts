import { create } from 'zustand';
import { flushSync } from 'react-dom';
import { useCanvasStore } from '../store.js';
import { composable, recomposed } from '../compose.js';
import { studio } from '../../bridge.js';

export const useTabFrames = create<{ discarded: boolean; epoch: number }>(() => ({ discarded: false, epoch: 0 }));

type CapturePicture = (signal: AbortSignal) => Promise<(() => void) | void>;
const beforeDiscard = new Set<CapturePicture>();

export function beforeTabFramesDiscarded(capture: CapturePicture): () => void {
  beforeDiscard.add(capture);
  return () => { beforeDiscard.delete(capture); };
}

export function installTabFrames(): void {
  let latestRequest = 0;
  let captureController: AbortController | undefined;
  studio().onTabFrames(async ({ discarded, request }) => {
    latestRequest = request;
    captureController?.abort();
    const pictures: (() => void)[] = [];
    if (discarded) {
      const controller = new AbortController();
      captureController = controller;
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        Promise.allSettled([...beforeDiscard].map(async capture => {
          const picture = await capture(controller.signal);
          if (!controller.signal.aborted && picture) pictures.push(picture);
        })),
        new Promise<void>(resolve => { timer = setTimeout(resolve, 1000); }),
      ]);
      clearTimeout(timer);
      controller.abort();
      if (latestRequest !== request) return;
    }
    flushSync(() => {
      if (discarded) {
        for (const picture of pictures) picture();
        const state = useCanvasStore.getState();
        useCanvasStore.setState((current) => {
          const overlay = { ...current.overlay };
          for (const node of Object.values(current.doc?.nodes ?? {})) {
            const facts = overlay[node.id];
            if (node.kind === 'browser' && facts) overlay[node.id] = { ...facts, mountUrl: facts.currentUrl };
          }
          return recomposed(composable(current, { overlay }), current.nodes);
        });
        for (const node of Object.values(state.doc?.nodes ?? {})) {
          if (node.kind !== 'browser') continue;
          state.patchFrame(node.id, { health: 'loading' });
        }
        useTabFrames.setState((previous) => ({ discarded, epoch: previous.epoch + 1 }));
      } else {
        useTabFrames.setState((previous) => ({ discarded, epoch: previous.epoch + (previous.discarded ? 1 : 0) }));
      }
    });
    studio().tabFramesApplied(request);
  });
}
