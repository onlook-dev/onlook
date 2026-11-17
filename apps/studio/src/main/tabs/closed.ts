import { closeProjectState } from '../project/state.js';

/** Electron-free on purpose: an import of `host.ts` here pulls `BaseWindow` into every listener's unit suite (ONL-2206). */
type ClosedListener = (workspacePath: string) => void;

let onClosed: ClosedListener | undefined;

export function observeTabClosed(listener: ClosedListener): void {
  onClosed = listener;
}

/** The Project's last Tab closed. State that lives only while one shows it goes first; the listener then stops what is still running. */
export function noteTabClosed(workspacePath: string): void {
  closeProjectState(workspacePath);
  onClosed?.(workspacePath);
}

export function resetTabClosed(): void {
  onClosed = undefined;
}
