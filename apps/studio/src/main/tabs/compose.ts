import { IPC_EMIT, type WindowRecord } from '@studio/events';
import { TabActivation } from './activation.js';
import { TabBook } from './book.js';
import { ChordHint } from './chord-hint.js';
import type { CloseLoss } from './close-confirm.js';
import { TabCloser } from './closer.js';
import { TabOpener } from './opener.js';
import { TabPresence } from './presence.js';
import { TabPresentation } from './presentation.js';
import { ProjectOpens } from './project-opens.js';
import { send } from './send.js';
import { SettingsRequest } from './settings-request.js';
import { TabStrip } from './strip.js';
import type { TabSelectMethod } from './telemetry.js';
import { TabViewPool } from './view-pool.js';
import type { TabWindow, TabWindowEvents } from './window.js';

export interface TabPieces {
  readonly book: TabBook;
  readonly window: TabWindow;
  readonly views: TabViewPool;
  readonly presentation: TabPresentation;
  readonly presence: TabPresence;
  readonly activation: TabActivation;
  readonly opens: ProjectOpens;
  readonly closer: TabCloser;
  readonly opener: TabOpener;
  readonly strip: TabStrip;
  readonly settingsRequest: SettingsRequest;
  readonly chordHint: ChordHint;
}

/** What the composition is handed from outside the folder. */
export interface TabSeams {
  window(events: TabWindowEvents): TabWindow;
  /** The window record a relaunch restores from, read before anything this window does can reach it (ONL-2208). */
  saved: WindowRecord | undefined;
  confirmClose(name: string, losses: readonly CloseLoss[]): Promise<boolean>;
  retire(worktree: string): void;
}

/**
 * Builds the pieces lowest first and fills every port. A piece is handed the pieces below it
 * outright; what it asks of one above it goes through its port, and this is the only place a
 * port is filled, so the whole of who-calls-whom upward is the closures in this function.
 */
export function composeTabs(seams: TabSeams): TabPieces {
  const tabsChanged = (): void => pieces.strip.broadcast();
  const activate = (id: string, method: TabSelectMethod, tookSpare?: boolean): void => pieces.activation.activate(id, method, tookSpare);

  const book = new TabBook(seams.saved);
  const window = seams.window({
    // ⌘-tab away and the keyup never arrives, so the legends would stay up forever.
    focusTold: (isFocused) => {
      if (!isFocused) pieces.chordHint.push(false);
    },
    focusChanged: (isFocused) => {
      pieces.presence.pushOnScreen();
      if (isFocused) pieces.presence.noteActiveProjectShown('window_focus');
    },
    laidOut: (body) => pieces.views.resize(body),
    closed: () => {
      pieces.presentation.clearPresentDeadline();
      // A closed window has no screen to uncover onto, and `uncover` would reach a destroyed view.
      pieces.presentation.dropCover();
    },
  });
  const views = new TabViewPool(book, window, {
    shownId: () => pieces.presentation.shownId,
    wakingId: () => pieces.activation.wakingTabId,
    viewReleased: (viewId) => pieces.opens.releaseProjectOpen(viewId),
    healthReported: (tab) => pieces.presentation.healthReported(tab),
    viewDiscarded: (tab) => pieces.presentation.viewDiscarded(tab),
    retire: (worktree) => seams.retire(worktree),
    tabsChanged,
  });
  const presentation = new TabPresentation(book, window, views, tabsChanged);
  const presence = new TabPresence(book, window);
  const activation = new TabActivation(book, window, views, presentation, presence, {
    followSettingsRequest: (leavingId) => pieces.settingsRequest.follow(leavingId),
    tabsChanged,
  });
  const opens = new ProjectOpens(book, views, {
    open: (createFrom, method, request) => pieces.opener.open(createFrom, method, request),
    activate,
    close: (id, method) => pieces.closer.close(id, method),
    projectShown: (by) => pieces.presence.noteActiveProjectShown(by),
    tabsChanged,
  });
  const closer = new TabCloser(book, views, presentation, {
    activate,
    isAtProjectLimit: () => pieces.opens.isAtProjectLimit(),
    confirmClose: (name, losses) => seams.confirmClose(name, losses),
    retire: (worktree) => seams.retire(worktree),
    tabsChanged,
  });
  const opener = new TabOpener(book, window, views, presentation, opens, {
    activate,
    canCreate: () => pieces.strip.state().canCreate,
    tabsChanged,
  });
  const strip = new TabStrip(book, views, {
    isCreatingDraft: () => pieces.opens.draftCreating,
    reservedOpenCount: () => pieces.opens.reservedOpenCount,
    canReopen: () => pieces.closer.canReopen,
  });
  const settingsRequest = new SettingsRequest({
    selectedId: () => book.selectedId,
    contentsFor: (id) => book.contentsFor(id),
  });
  const chordHint = new ChordHint((isHeld) => send(window.chromeContents, IPC_EMIT.chromeChordHint, { isHeld }));

  const pieces: TabPieces = { book, window, views, presentation, presence, activation, opens, closer, opener, strip, settingsRequest, chordHint };
  return pieces;
}
