import { app, type App, type BaseWindow, type WebContents } from 'electron';

export function focusBackgroundTab(window: Pick<BaseWindow, 'isMinimized' | 'restore' | 'show' | 'focus'>, contents: Pick<WebContents, 'focus'> | undefined, application: Pick<App, 'focus'> = app): void {
  if (window.isMinimized()) window.restore();
  application.focus({ steal: true });
  window.show();
  window.focus();
  contents?.focus();
}
