import { ignoreRefusal } from './refusal.js';

export interface MirrorSource<T> {
  /** The subsystem and the action a refused read is logged under. */
  name: readonly [subsystem: string, action: string];
  /** Main's current value, asked once. */
  read: () => Promise<T>;
  /** Main's change event; returns its unsubscribe. */
  subscribe: (listener: (value: T) => void) => () => void;
  apply: (value: T) => void;
}

export interface Mirror {
  /** Settles when the read has been applied, stood down or refused. It rejects only if `apply` throws. */
  primed: Promise<void>;
  /** Ends the subscription. A read still in flight lands unless an event was heard first. */
  stop: () => void;
}

/**
 * Keeps a renderer value in step with one main owns. It subscribes before it reads, so no event falls between the
 * two, and an event heard before the read answers stands the answer down: the event is the newer of the two.
 */
export function mirror<T>({ name, read, subscribe, apply }: MirrorSource<T>): Mirror {
  let heard = false;
  const stop = subscribe((value) => {
    heard = true;
    apply(value);
  });
  const primed = read().then((value) => {
    if (!heard) apply(value);
  }, ignoreRefusal(name[0], name[1]));
  return { primed, stop };
}
