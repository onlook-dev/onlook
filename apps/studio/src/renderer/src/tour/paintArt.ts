/** Main-thread side of the tour pictures. The art worker paints; finished bitmaps are kept for the session, so a repeat or a later open is a copy. */
const DONE = new Map<string, Promise<ImageBitmap>>();
const waiting = new Map<number, { resolve: (b: ImageBitmap) => void; reject: (e: Error) => void }>();
let worker: Worker | null = null;
let seq = 0;

type Reply = { id: number; bitmap: ImageBitmap } | { id: number; error: string };

function artWorker(): Worker {
  if (worker) return worker;
  const created = new Worker(new URL('./artWorker.ts', import.meta.url), { type: 'module' });
  created.onmessage = (e: MessageEvent<Reply>) => {
    const pending = waiting.get(e.data.id);
    waiting.delete(e.data.id);
    if ('bitmap' in e.data) pending?.resolve(e.data.bitmap);
    else pending?.reject(new Error(e.data.error));
  };
  // A worker that cannot start fails every request; the next one starts a fresh worker.
  created.onerror = () => {
    for (const pending of waiting.values()) pending.reject(new Error('art worker failed'));
    waiting.clear();
    created.terminate();
    worker = null;
  };
  worker = created;
  return created;
}

function request(art: string, W: number, H: number): Promise<ImageBitmap> {
  const target = artWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    target.postMessage({ id, art, W, H });
  });
}

/** Returns false when the canvas has no size yet, so the caller can try again once it does. */
export function paintArt(cv: HTMLCanvasElement, art: string): boolean {
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  if (!W || !H) return false;
  const key = `${art}@${String(W)}x${String(H)}`;
  let job = DONE.get(key);
  if (!job) {
    job = request(art, W, H);
    DONE.set(key, job);
    job.catch(() => DONE.delete(key));
  }
  job.then(
    (bitmap) => {
      if (!cv.isConnected) return;
      cv.width = bitmap.width;
      cv.height = bitmap.height;
      cv.getContext('2d')?.drawImage(bitmap, 0, 0);
      cv.dataset.ready = '';
    },
    () => {
      // A missing picture leaves its quiet placeholder fill; the tour still works.
    },
  );
  return true;
}
