import { BaseWindow, BrowserWindow, shell, type WebContents } from 'electron';
import { ARTIFACT_SCHEME, isArtifactId } from '@studio/events';
import { frameBindings } from '../frames/bindings.js';
import { registerStudioChromeSender } from '../ipc/roles.js';

export function protectAppContents(contents: WebContents, options: { allowGuests?: boolean; role?: 'chrome'; openExternal?: (url: string) => unknown } = {}): void {
  if (options.role === 'chrome') registerStudioChromeSender(contents);
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'http:' || target.protocol === 'https:') void Promise.resolve((options.openExternal ?? shell.openExternal)(target.href)).catch(() => {});
    } catch {}
    return { action: 'deny' };
  });
  const deny = (event: { preventDefault(): void }): void => event.preventDefault();
  contents.on('will-navigate', deny);
  contents.on('will-frame-navigate', deny);
  contents.on('will-redirect', deny);
  contents.on('will-attach-webview', (event, _preferences, params) => {
    if (!options.allowGuests || !appGuestAllowed(frameBindings.preparedDestination(contents, params) ?? params['src'])) event.preventDefault();
  });
}

export function appGuestAllowed(src: string | undefined): boolean {
  if (src === 'about:blank') return true;
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'http:' || url.protocol === 'https:' ||
      (url.protocol === `${ARTIFACT_SCHEME}:` && isArtifactId(url.hostname));
  } catch {
    return false;
  }
}

export function activeContents(): WebContents | undefined {
  return viewSource?.active() ?? BrowserWindow.getAllWindows()[0]?.webContents;
}

// Set, not imported: `tabs/host.js` pulls `BaseWindow` into every unit suite that touches a window lookup.
let viewSource: { active(): WebContents | undefined; all(): WebContents[] } | undefined;

export function setViewSource(source: typeof viewSource): void {
  viewSource = source;
}

const auxiliaryWindows = new WeakSet<object>();

/** A window beside Studio's own, such as the Task Manager: never a dialog's parent, never the one brought forward for Studio. */
export function markAuxiliaryWindow(window: BaseWindow): void {
  auxiliaryWindows.add(window);
}

export function isAuxiliaryWindow(window: object | undefined): boolean {
  return window !== undefined && auxiliaryWindows.has(window);
}

const studioWindows = (): BaseWindow[] => BaseWindow.getAllWindows().filter((window) => !auxiliaryWindows.has(window));

export function dialogParent(): BaseWindow | undefined {
  const focused = BaseWindow.getFocusedWindow();
  return focused !== null && !auxiliaryWindows.has(focused) ? focused : studioWindows()[0];
}

/** `webContents.getAllWebContents()` would also return the canvas frames' webview guests. */
export function everyRenderer(): WebContents[] {
  return viewSource?.all() ?? BrowserWindow.getAllWindows().map((window) => window.webContents);
}

/** Typed as `BrowserWindow` by Electron, but a `WebContentsView`'s owner is the `BaseWindow`, which has no `webContents` (ONL-2430). */
export function ownerOf(contents: WebContents): BaseWindow | undefined {
  return BrowserWindow.fromWebContents(contents) ?? undefined;
}

interface MinimizableWindow {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  focus(): void;
}

const windowSource = (): MinimizableWindow[] => studioWindows();

export function presentPrimaryWindow(): void {
  const [existing] = windowSource();
  if (!existing) return;
  if (existing.isMinimized()) existing.restore();
  existing.focus();
}

/** No `.focus()`: mid-sign-in the frontmost app is the browser, and the caller owns `app.focus({ steal: true })`. */
export function restoreAllMinimized(): void {
  for (const window of windowSource()) {
    if (!window.isDestroyed() && window.isMinimized()) window.restore();
  }
}
