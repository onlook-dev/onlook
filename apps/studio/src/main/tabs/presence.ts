import type { WebContents } from 'electron';
import { IPC_EMIT } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { tabsOnScreenPinned } from '../diagnostics/gate.js';
import type { TurnSeenShownBy } from '../telemetry/events.js';
import { noteProjectShown, type ProjectPresence } from '../telemetry/turn-seen.js';
import type { TabBook } from './book.js';
import { tabOnScreen } from './on-screen.js';
import { send } from './send.js';
import type { TabWindow } from './window.js';

/** Whether a person is looking at a Tab: the selected one, in a focused window. */
export class TabPresence {
  private readonly book: TabBook;
  private readonly window: TabWindow;

  constructor(book: TabBook, window: TabWindow) {
    this.book = book;
    this.window = window;
  }

  onScreenFrom(sender: WebContents): { isOnScreen: boolean } {
    return { isOnScreen: tabOnScreen({ isActive: sender.id === this.book.activeContents()?.id, isWindowFocused: this.window.window.isFocused(), isPinned: tabsOnScreenPinned() }) };
  }

  pushOnScreen(): void {
    for (const id of this.book.tabIds) {
      const contents = this.book.contentsFor(id);
      if (contents !== undefined) send(contents, IPC_EMIT.tabOnScreen, this.onScreenFrom(contents));
    }
  }

  noteActiveProjectShown(by: TurnSeenShownBy): void {
    if (!this.window.window.isFocused()) return;
    const path = this.book.activeWorkspacePath();
    if (path !== undefined) noteProjectShown(path, by);
  }

  presenceFor(cwd: string): ProjectPresence {
    const active = this.book.activeWorkspacePath();
    return { windowFocused: this.window.window.isFocused(), projectTabActive: active !== undefined && canonicalPath(active) === canonicalPath(cwd) };
  }
}
