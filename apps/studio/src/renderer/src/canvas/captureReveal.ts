import {
  captureCamera,
  type CanvasCamera,
  type CaptureGeometry,
  type CaptureViewAnswer,
  type CaptureViewRequest,
} from '@studio/events';

export const BUSY_LIMIT_MS = 1_500;
const BUSY_POLL_MS = 50;
const SETTLE_LIMIT_MS = 300;

export interface CaptureRevealDeps {
  camera(): CanvasCamera;
  setCamera(camera: CanvasCamera): void;
  geometry(frameId: string): CaptureGeometry | null;
  busy(): boolean;
  /** Resolves once the camera reads `camera` and the next frame has drawn, or the bound passed. */
  settled(camera: CanvasCamera, limitMs: number): Promise<void>;
  /** Marks the revealed camera as not the person's, so it is never saved (`noteCameraSettled`). */
  holdCamera(isHeld: boolean): void;
  /** The camera the person left during the reveal, saved as theirs. */
  keepCamera(camera: CanvasCamera): void;
  answer(answer: CaptureViewAnswer): void;
  wait(ms: number): Promise<void>;
}

interface Reveal {
  requestId: number;
  saved: CanvasCamera;
  revealed: CanvasCamera;
}

/** A pointer moving with no button down means every press before it was released, seen or not. */
export function createPressTracker(): {
  down(pointerId: number): void;
  up(pointerId: number): void;
  moved(buttons: number): void;
  reset(): void;
  held(): boolean;
} {
  const pressed = new Set<number>();
  return {
    down: (pointerId) => { pressed.add(pointerId); },
    up: (pointerId) => { pressed.delete(pointerId); },
    moved: (buttons) => { if (buttons === 0) pressed.clear(); },
    reset: () => { pressed.clear(); },
    held: () => pressed.size > 0,
  };
}

export function sameCamera(a: CanvasCamera, b: CanvasCamera): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.zoom - b.zoom) < 1e-4;
}

export function createCaptureReveal(deps: CaptureRevealDeps): {
  handle(request: CaptureViewRequest): Promise<void>;
  dispose(): void;
} {
  let reveal: Reveal | null = null;

  const restore = async (requestId: number): Promise<'restored' | 'kept'> => {
    const current = reveal;
    if (current === null || current.requestId !== requestId) return 'restored';
    reveal = null;
    deps.holdCamera(false);
    const live = deps.camera();
    if (!sameCamera(live, current.revealed)) {
      deps.keepCamera(live);
      return 'kept';
    }
    deps.setCamera(current.saved);
    await deps.settled(current.saved, SETTLE_LIMIT_MS);
    return 'restored';
  };

  const waitForStill = async (): Promise<boolean> => {
    for (let waited = 0; deps.busy(); waited += BUSY_POLL_MS) {
      if (waited >= BUSY_LIMIT_MS) return false;
      await deps.wait(BUSY_POLL_MS);
    }
    return true;
  };

  type Answer = CaptureViewAnswer extends infer A ? A extends CaptureViewAnswer ? Omit<A, 'requestId' | 'step'> : never : never;

  const check = async (request: CaptureViewRequest): Promise<Answer> => {
    if (!(await waitForStill())) return { state: 'busy' };
    const geometry = deps.geometry(request.frameId);
    if (geometry === null) return { state: 'unknown-frame' };
    const needsMove = captureCamera(deps.camera(), geometry) !== null;
    return { state: needsMove ? 'needs-move' : 'in-place', geometry };
  };

  const move = async (request: CaptureViewRequest): Promise<Answer> => {
    if (deps.busy()) return { state: 'busy' };
    const geometry = deps.geometry(request.frameId);
    if (geometry === null) return { state: 'unknown-frame' };
    const saved = deps.camera();
    const target = captureCamera(saved, geometry);
    if (target === null) return { state: 'moved', geometry };
    if (reveal !== null) await restore(reveal.requestId);
    deps.holdCamera(true);
    deps.setCamera(target);
    await deps.settled(target, SETTLE_LIMIT_MS);
    reveal = { requestId: request.requestId, saved, revealed: deps.camera() };
    const moved = deps.geometry(request.frameId);
    if (moved === null) return { state: 'unknown-frame' };
    return { state: 'moved', geometry: moved };
  };

  const answered = async (request: CaptureViewRequest): Promise<Answer> => {
    if (request.step === 'check') return check(request);
    if (request.step === 'move') return move(request);
    return { state: await restore(request.requestId) };
  };

  let ahead: Promise<void> = Promise.resolve();

  return {
    handle: (request) => {
      const mine = ahead.then(async () => {
        deps.answer({ ...(await answered(request)), requestId: request.requestId, step: request.step } as CaptureViewAnswer);
      });
      ahead = mine.catch(() => undefined);
      return mine;
    },
    dispose: () => {
      if (reveal !== null) void restore(reveal.requestId);
    },
  };
}

export function measureCaptureGeometry(frameId: string): CaptureGeometry | null {
  const node = document.querySelector(`.react-flow__node[data-id="${CSS.escape(frameId)}"]`);
  const webview = node?.querySelector('webview');
  const pane = document.querySelector('.react-flow');
  if (!(webview instanceof HTMLElement) || pane === null) return null;
  const rect = webview.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  return {
    tab: { width: window.innerWidth, height: window.innerHeight },
    pane: { left: paneRect.left, top: paneRect.top },
    frame: { width: webview.offsetWidth, height: webview.offsetHeight },
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    hidden: document.visibilityState === 'hidden',
  };
}

/** A hidden document draws no frames and throttles its timers to a second, so it waits for neither. */
export function nextFrame(): Promise<void> {
  if (document.visibilityState === 'hidden') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 50);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
