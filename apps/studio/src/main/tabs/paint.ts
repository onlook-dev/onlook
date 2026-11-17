export interface TabPaintSource {
  isDestroyed(): boolean;
  capturePage(rect: { x: number; y: number; width: number; height: number }, options: { stayHidden: true; stayAwake: true }): Promise<{ isEmpty(): boolean }>;
}

export const TAB_PAINT_TIMEOUT_MS = 15_000;
export const TAB_FIRST_PAINT_TIMEOUT_MS = 45_000;
/** A Tab the user picked reaches the screen within this, painted or not (ONL-3121). */
export const TAB_PRESENT_DEADLINE_MS = 4_000;
const CAPTURE_RETRY_MS = 150;

export interface TabPaintGate {
  request(): void;
  presented(): void;
  restart(): void;
  cancel(): void;
}

export type TabCaptureResult = 'empty' | 'painted' | 'rejected';

export interface TabPaintGateDeps {
  contents: TabPaintSource;
  painted: () => void;
  failed: () => void;
  timeoutMs?: number;
  captured?: (result: TabCaptureResult) => void;
}

export function createTabPaintGate({ contents, painted, failed, timeoutMs = TAB_PAINT_TIMEOUT_MS, captured }: TabPaintGateDeps): TabPaintGate {
  let stopped = false;
  let pending = false;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  // ⚠️ Transitions only: a gate that never paints retries every 150ms, and the trace behind this is a synchronous disk write (ONL-3153).
  let reported: TabCaptureResult | undefined;
  const report = (result: TabCaptureResult): void => {
    if (result === reported) return;
    reported = result;
    captured?.(result);
  };
  const invalidate = (): void => {
    generation += 1;
    pending = false;
    reported = undefined;
    clearTimeout(timer);
    clearTimeout(retry);
  };
  const fail = (): void => {
    if (stopped || contents.isDestroyed()) return;
    timedOut = true;
    clearTimeout(retry);
    failed();
  };
  const restart = (): void => {
    if (stopped) return;
    invalidate();
    timedOut = false;
    timer = setTimeout(fail, timeoutMs);
    timer.unref?.();
  };
  const cancel = (): void => {
    stopped = true;
    invalidate();
  };
  const presented = (): void => {
    if (stopped || contents.isDestroyed()) return;
    cancel();
    painted();
  };
  const request = (): void => {
    if (stopped || pending || contents.isDestroyed()) return;
    clearTimeout(retry);
    pending = true;
    const requested = generation;
    void contents.capturePage({ x: 0, y: 0, width: 1, height: 1 }, { stayHidden: true, stayAwake: true }).then(image => {
      if (stopped || requested !== generation || contents.isDestroyed()) return;
      pending = false;
      const empty = image.isEmpty();
      report(empty ? 'empty' : 'painted');
      if (empty) retryCapture();
      else presented();
    }, () => {
      if (stopped || requested !== generation || contents.isDestroyed()) return;
      pending = false;
      report('rejected');
      retryCapture();
    });
  };
  const retryCapture = (): void => {
    if (!timedOut) retry = setTimeout(request, CAPTURE_RETRY_MS);
  };
  restart();
  return { request, presented, restart, cancel };
}
