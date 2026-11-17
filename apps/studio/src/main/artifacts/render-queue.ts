import { ARTIFACT_PREVIEW_CONCURRENCY, ARTIFACT_RENDER_QUEUE_LIMIT } from './preview-cache.js';

export function createArtifactRenderQueue() {
  const queue: (() => Promise<void>)[] = [];
  let running = 0;
  function drain(): void {
    while (running < ARTIFACT_PREVIEW_CONCURRENCY && queue.length > 0) {
      const task = queue.shift()!;
      running += 1;
      void task().finally(() => { running -= 1; drain(); });
    }
  }
  return {
    run<Result>(wanted: () => boolean, operation: () => Promise<Result>): Promise<Result> {
      if (queue.length >= ARTIFACT_RENDER_QUEUE_LIMIT) return Promise.reject(new Error('artifact rendering queue full'));
      const result = new Promise<Result>((resolve, reject) => {
        queue.push(async () => {
          try {
            if (!wanted()) throw new Error('artifact rendering canceled');
            resolve(await operation());
          } catch (error) { reject(error); }
        });
      });
      drain();
      return result;
    },
  };
}

export const artifactRenderQueue = createArtifactRenderQueue();
