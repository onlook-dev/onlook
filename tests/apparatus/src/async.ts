import { existsSync, watch } from 'node:fs';
import { dirname } from 'node:path';

export function held(): { wait: () => Promise<void>; open: () => void } {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait: () => gate, open: () => release() };
}

/** `expect(await outcome(p)).toThrow(…)`: unlike Bun's `.rejects`, a `p` that never settles fails at the test's timeout (ONL-2368). */
export async function outcome<T>(promise: Promise<T>): Promise<() => T> {
  try {
    const value = await promise;
    return () => value;
  } catch (error) {
    return () => {
      throw error;
    };
  }
}

export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Event-driven, so it runs under a fake clock; write the file by rename when its contents matter. */
export function untilExists(path: string): Promise<void> {
  return new Promise((resolve) => {
    const watcher = watch(dirname(path), () => {
      if (!existsSync(path)) return;
      watcher.close();
      resolve();
    });
    if (existsSync(path)) {
      watcher.close();
      resolve();
    }
  });
}

/** Under a fake clock: steps it a millisecond at a time, a real turn between steps, until `work` settles. Answers the fake milliseconds taken, or `undefined` past `limitMs`. */
export async function fakeElapsed(
  work: Promise<unknown>,
  { advance, limitMs }: { advance: (ms: number) => void; limitMs: number },
): Promise<number | undefined> {
  let settled = false;
  const done = (): void => {
    settled = true;
  };
  work.then(done, done);
  for (let elapsed = 0; elapsed <= limitMs; elapsed += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (settled) return elapsed;
    advance(1);
  }
  return undefined;
}

export interface UntilOptions<T> {
  what: string;
  limitMs?: number;
  everyMs?: number;
  describe?: (value: T) => string;
}

/** A read that throws is retried until the deadline. */
export async function until<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  { what, limitMs = 60_000, everyMs = 500, describe }: UntilOptions<T>,
): Promise<T> {
  const deadline = Date.now() + limitMs;
  let last: { value: T } | undefined;
  let lastError: unknown;
  for (;;) {
    try {
      const value = await read();
      last = { value };
      if (done(value)) return value;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      const seen = last === undefined ? 'no answer' : `last answer: ${describe ? describe(last.value) : JSON.stringify(last.value)}`;
      const failed = lastError === undefined ? '' : `; last error: ${String(lastError)}`;
      throw new Error(`Timed out after ${String(limitMs / 1000)}s waiting for ${what} (${seen}${failed}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
}
