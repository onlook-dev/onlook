import type { StudioBridge } from '@studio/events';

export interface Deferred<T> {
  promise: Promise<T>;
  settle: (value: T) => void;
  refuse: (reason: unknown) => void;
}

/** An IPC answer the test holds open, so a race has somewhere to happen. */
export function deferred<T>(): Deferred<T> {
  let settle!: (value: T) => void;
  let refuse!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    settle = resolve;
    refuse = reject;
  });
  return { promise, settle, refuse };
}

/** The one cast to the bridge under test: a call nobody wired is a named failure, never `undefined`. */
export function installBridge(calls: Partial<StudioBridge>): void {
  window.studio = new Proxy(calls, {
    get: (wired, name: string) => wired[name as keyof StudioBridge]
      ?? (() => { throw new Error(`this test did not wire window.studio.${name}`); }),
  }) as StudioBridge;
}
