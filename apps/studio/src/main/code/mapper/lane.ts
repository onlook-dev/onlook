// CDP evaluation takes the frame's exclusive debugger attachment (ONL-2563).
const lanes = new Map<number, Promise<unknown>>();
const cache = new Map<string, unknown>();

/** Per pick, so the same element answered twice does not attach twice. */
const CACHE_LIMIT = 64;

function remember(key: string, value: unknown): void {
  // Oldest out first: a long session picks far more elements than it re-picks.
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
}

/** Behind whatever is already queued on this Frame, answering a cached result for a pick asked before. `remember: false` where the key is fresh every time, or the entry only evicts a pick's (ONL-2563). */
export async function onFrameLane<T>(
  guestId: number,
  cacheKey: string,
  work: () => Promise<T>,
  options: { remember?: boolean } = {},
): Promise<T> {
  const remembers = options.remember ?? true;
  const held = remembers ? cache.get(cacheKey) : undefined;
  if (held !== undefined) return held as T;

  const previous = lanes.get(guestId) ?? Promise.resolve();
  // Settled, not resolved: one call's failure must not cancel the queue behind it.
  const mine = previous.then(work, work);
  lanes.set(
    guestId,
    mine.then(
      () => undefined,
      () => undefined,
    ),
  );
  const answer = await mine;
  if (remembers) remember(cacheKey, answer);
  return answer;
}

/** A page that navigated has a new DOM, so every reading taken against the old one is wrong. */
export function forgetFrameReadings(guestId: number): void {
  lanes.delete(guestId);
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${String(guestId)}:`)) cache.delete(key);
  }
}

export function resetLanesForTests(): void {
  lanes.clear();
  cache.clear();
}
