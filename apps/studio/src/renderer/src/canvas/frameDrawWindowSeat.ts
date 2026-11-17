interface FrameDrawWindowSeatHandlers {
  onMove: (event: PointerEvent) => void;
  onFinish: (event: PointerEvent) => void;
  onCancel: () => void;
}

export function installFrameDrawWindowSeat(
  target: EventTarget,
  pointerId: number,
  handlers: FrameDrawWindowSeatHandlers,
): () => void {
  const controller = new AbortController();
  const cleanup = (): void => controller.abort();
  const onMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId === pointerId) handlers.onMove(pointer);
  };
  const onFinish = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId !== pointerId) return;
    cleanup();
    handlers.onFinish(pointer);
  };
  const onPointerCancel = (event: Event): void => {
    if ((event as PointerEvent).pointerId !== pointerId) return;
    cleanup();
    handlers.onCancel();
  };
  const onBlur = (): void => {
    cleanup();
    handlers.onCancel();
  };

  const options = { signal: controller.signal };
  target.addEventListener('pointermove', onMove, options);
  target.addEventListener('pointerup', onFinish, options);
  target.addEventListener('pointercancel', onPointerCancel, options);
  target.addEventListener('blur', onBlur, options);

  return cleanup;
}
