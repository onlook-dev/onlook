/** Injected: the unit tests have no document for `requestAnimationFrame` (ONL-2455). */
export type FrameScheduler = (flush: () => void) => void;

export interface HoverCoalescer<T> {
  post: (value: T) => void;
  clear: () => void;
}

export function createHoverCoalescer<In, Out>(options: {
  /** Runs in the flush: a reflow or cross-process read costs one call per frame, not one per pointer move (ONL-2455). */
  convert: (value: In) => Out;
  send: (value: Out) => void;
  schedule: FrameScheduler;
  isSuspended?: () => boolean;
  /** A leave, not a sample: suspension may not swallow it, or the outline stays painted behind the pointer (ONL-2455). */
  isClear?: (value: In) => boolean;
}): HoverCoalescer<In> {
  let pending: { value: In } | null = null;
  let scheduled = false;

  const isSuspended = (): boolean => options.isSuspended?.() ?? false;
  const isWithheld = (value: In): boolean =>
    isSuspended() && !(options.isClear?.(value) ?? false);

  // Emptied, not cancelled: a scheduler with no handle is the one every caller can supply.
  const flush = (): void => {
    scheduled = false;
    const held = pending;
    pending = null;
    if (held === null || isWithheld(held.value)) return;
    options.send(options.convert(held.value));
  };

  return {
    post: (value: In): void => {
      if (isWithheld(value)) return;
      pending = { value };
      if (scheduled) return;
      scheduled = true;
      options.schedule(flush);
    },
    clear: (): void => {
      pending = null;
    },
  };
}
