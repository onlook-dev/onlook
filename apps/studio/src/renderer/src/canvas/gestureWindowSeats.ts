import { useEffect, useMemo, useRef } from 'react';

export function installDuplicateDragWindowSeat(
  target: EventTarget,
  handlers: { onAltRelease: () => void; onBlur: () => void },
): () => void {
  const controller = new AbortController();
  const cleanup = (): void => controller.abort();
  const onKeyUp = (event: Event): void => {
    if ((event as KeyboardEvent).key !== 'Alt') return;
    cleanup();
    handlers.onAltRelease();
  };
  const onBlur = (): void => {
    cleanup();
    handlers.onBlur();
  };
  const options = { signal: controller.signal };
  target.addEventListener('keyup', onKeyUp, options);
  target.addEventListener('blur', onBlur, options);
  return cleanup;
}

export function installResizeWindowSeat(
  target: EventTarget,
  pointerId: number | null,
  onCancel: () => void,
): () => void {
  const controller = new AbortController();
  const cleanup = (): void => controller.abort();
  const cancel = (): void => {
    cleanup();
    onCancel();
  };
  const onPointerCancel = (event: Event): void => {
    if (pointerId !== null && (event as PointerEvent).pointerId !== pointerId) return;
    cancel();
  };
  const options = { signal: controller.signal };
  target.addEventListener('pointercancel', onPointerCancel, options);
  target.addEventListener('blur', cancel, options);
  return cleanup;
}

export function createWindowEventSeat(onInterrupt: () => void): {
  replace: (cleanup: () => void) => void;
  finish: () => void;
  dispose: () => void;
} {
  let cleanup: (() => void) | null = null;
  const drop = (interrupted: boolean): void => {
    if (cleanup === null) return;
    const previous = cleanup;
    cleanup = null;
    previous();
    if (interrupted) onInterrupt();
  };
  return {
    replace: (next) => {
      drop(true);
      cleanup = next;
    },
    finish: () => drop(false),
    dispose: () => drop(true),
  };
}

export function useWindowEventSeat(onInterrupt: () => void = () => undefined): ReturnType<typeof createWindowEventSeat> {
  const interruptRef = useRef(onInterrupt);
  const seat = useMemo(() => createWindowEventSeat(() => interruptRef.current()), []);
  useEffect(() => {
    interruptRef.current = onInterrupt;
  });
  useEffect(() => () => seat.dispose(), [seat]);
  return seat;
}
