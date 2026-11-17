import type { WebContents } from 'electron';
import { IPC_EMIT } from '@studio/events';
import { send } from './send.js';

interface SelectedTab {
  selectedId(): string | undefined;
  contentsFor(id: string): WebContents | undefined;
}

/** A request to open Settings, held until the Tab it is for takes it: a view still mounting misses the push, and pulls it instead. */
export class SettingsRequest {
  private tabId: string | undefined;
  private readonly tabs: SelectedTab;

  constructor(tabs: SelectedTab) {
    this.tabs = tabs;
  }

  /** No `goHome()`: Settings is a modal over whichever Tab asked for it (ONL-2499). */
  reveal(): void {
    const selectedId = this.tabs.selectedId();
    this.tabId = selectedId;
    const contents = selectedId === undefined ? undefined : this.tabs.contentsFor(selectedId);
    if (contents !== undefined) send(contents, IPC_EMIT.settingsOpen);
  }

  /** An untaken request belongs to the person, not the Tab they left: unmoved, the modal opens behind them (ONL-2499). */
  follow(leavingId: string | undefined): void {
    if (this.tabId === undefined || this.tabId !== leavingId) return;
    this.reveal();
  }

  take(senderId: number): boolean {
    const id = this.tabId;
    if (id === undefined || this.tabs.contentsFor(id)?.id !== senderId) return false;
    this.tabId = undefined;
    return true;
  }
}
