export interface KeyedQueue<K> {
  run<T>(key: K, step: () => Promise<T>): Promise<T>;
  keys(): K[];
}

export function createKeyedQueue<K>(): KeyedQueue<K> {
  const tails = new Map<K, Promise<void>>();
  return {
    run<T>(key: K, step: () => Promise<T>): Promise<T> {
      const run = (tails.get(key) ?? Promise.resolve()).then(step);
      const settled = run.then(
        () => undefined,
        () => undefined,
      );
      tails.set(key, settled);
      void settled.then(() => {
        if (tails.get(key) === settled) tails.delete(key);
      });
      return run;
    },
    keys: () => [...tails.keys()],
  };
}
