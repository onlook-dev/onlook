export interface InFlight<T> {
  current?: Promise<T>;
}

export function shareInFlight<T>(slot: InFlight<T>, start: () => Promise<T>): Promise<T> {
  // `start()` inside the `??=`: hoisted, it spawns once per concurrent caller (ONL-2108).
  // `finally`, not `then`: a rejection must clear the slot too.
  slot.current ??= start().finally(() => {
    slot.current = undefined;
  });
  return slot.current;
}
