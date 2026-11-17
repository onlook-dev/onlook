export interface FrameTarget {
  url: string;
  seq: number;
}

export interface TargetGuest {
  getWebContentsId(): number;
  loadURL(url: string): Promise<void>;
  addEventListener(type: 'dom-ready', listener: () => void): void;
  removeEventListener(type: 'dom-ready', listener: () => void): void;
}

export function navigateFrameTarget(
  element: TargetGuest | null,
  target: FrameTarget | undefined,
  completed: { current: FrameTarget | null },
  ready: boolean,
  /** Retires the target so `framePointedUrl` means a navigation still in flight (ONL-2897). */
  onReached?: (target: FrameTarget) => void,
): (() => void) | undefined {
  if (!ready || !element || !target || completed.current === target) return;
  let active = true;
  try {
    element.getWebContentsId();
    const settled = (): void => {
      if (!active) return;
      completed.current = target;
      onReached?.(target);
    };
    void element.loadURL(target.url).then(settled, settled);
  } catch {
    return;
  }
  return () => {
    active = false;
  };
}
