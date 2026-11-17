import { app, BaseWindow } from 'electron';

export interface AppReturnEvents {
  on(event: string, listener: () => void): unknown;
  off(event: string, listener: () => void): unknown;
}

const LEFT = ['browser-window-blur', 'did-resign-active'];
const BACK = ['browser-window-focus', 'did-become-active'];

/**
 * Studio's window is a `BaseWindow`, which raises no `browser-window-*` app event, and
 * `did-become-active` is macOS only, so the windows' own pair is the whole signal off macOS (ONL-3181).
 */
export function appReturnedToForeground(
  signal: AbortSignal,
  events: AppReturnEvents = app,
  windows: readonly AppReturnEvents[] = BaseWindow.getAllWindows(),
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    let left = false;
    const onLeft = (): void => { left = true; };
    const onBack = (): void => { if (left) { detach(); resolve(); } };
    const onAbort = (): void => { detach(); reject(signal.reason); };
    const detach = (): void => {
      for (const event of LEFT) events.off(event, onLeft);
      for (const event of BACK) events.off(event, onBack);
      for (const window of windows) { window.off('blur', onLeft); window.off('focus', onBack); }
      signal.removeEventListener('abort', onAbort);
    };
    for (const event of LEFT) events.on(event, onLeft);
    for (const event of BACK) events.on(event, onBack);
    for (const window of windows) { window.on('blur', onLeft); window.on('focus', onBack); }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
