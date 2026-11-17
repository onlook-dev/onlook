import { captureThumbnailOnLeave } from '../canvas/index.js';
import { hasUnsavedCode } from '../code/dirty.js';
import { capture, resolveWorkspaceTelemetryId } from '../telemetry/index.js';
import { projectCreations } from '../workspace/create-project.js';
import { needsTelling } from './assignment.js';
import type { TabBook } from './book.js';
import { logger } from './log.js';
import { awaitsFirstPaint, isWatched } from './presentation-machine.js';
import type { TabPresence } from './presence.js';
import type { TabPresentation } from './presentation.js';
import { tabSelected, type TabSelectMethod } from './telemetry.js';
import type { TabViewPool } from './view-pool.js';
import type { TabWindow } from './window.js';

export interface TabActivationPort {
  /** The selection left this Tab; a Settings request it had not taken goes with the person. */
  followSettingsRequest(leavingId: string | undefined): void;
  tabsChanged(): void;
}

/** A press on a Tab: wakes it, warms it, selects it, puts it on screen and tells everyone who shows the selection. */
export class TabActivation {
  private readonly book: TabBook;
  private readonly window: TabWindow;
  private readonly views: TabViewPool;
  private readonly presentation: TabPresentation;
  private readonly presence: TabPresence;
  private readonly port: TabActivationPort;

  /** Counts presses, so a wake that finishes after a later press does not select its Tab. */
  private activation = 0;
  private wakingId: string | undefined;

  constructor(book: TabBook, window: TabWindow, views: TabViewPool, presentation: TabPresentation, presence: TabPresence, port: TabActivationPort) {
    this.book = book;
    this.window = window;
    this.views = views;
    this.presentation = presentation;
    this.presence = presence;
    this.port = port;
  }

  /** The Tab a press is waking from sleep, until it is awake or another press takes over. */
  get wakingTabId(): string | undefined {
    return this.wakingId;
  }

  /** `setVisible`, never detach/attach: a view once `setVisible(false)` stays invisible through every later `addChildView`, with no error (ONL-2201). */
  activate(id: string, method: TabSelectMethod = 'click', tookSpare = false): void {
    const activation = ++this.activation;
    this.wakingId = undefined;
    const incoming = this.book.tabById(id);
    if (!incoming) return;
    this.presentation.pressed(incoming);
    // A press on the already-selected Tab re-requests its frame now, instead of waiting out the deadline (ONL-3121).
    if (this.book.selectedId === id) {
      this.presentation.present();
      this.presentation.requestFirstPaint(incoming);
      return;
    }
    if (incoming.idle !== undefined) {
      this.wakingId = id;
      this.views.noteActivity(id);
      void this.views.resume(incoming).then(() => {
        if (activation !== this.activation || this.book.tabById(id) !== incoming) return;
        this.activate(id, method, tookSpare);
      }).catch((error: unknown) => {
        logger.warn('resuming an idle tab failed', { tab_id: id, error });
        if (activation !== this.activation || this.book.tabById(id) !== incoming) return;
        if (this.book.decisionsFor(incoming).isBusy || hasUnsavedCode(incoming.view?.webContents.id)) return;
        this.views.teardown(id);
        this.activate(id, method, tookSpare);
      });
      return;
    }
    const outgoing = this.book.selectedId === undefined ? undefined : this.book.tabById(this.book.selectedId);
    capture('tab_selected', tabSelected({ from: outgoing, to: incoming, openCount: this.book.openTabCount, method }, resolveWorkspaceTelemetryId));
    // While the leaving tab's guests are still live; the gate declines it if nothing changed (ONL-2471).
    captureThumbnailOnLeave(outgoing?.workspacePath);

    // Warmed before the reveal: a cold tab promotes the spare, so its first frame already carries rails (ONL-2318).
    // A destroyed view is no renderer: `warm` replaces it, and a Tab counted warm here is never told what it is (ONL-3153).
    const wasCold = incoming.view === undefined || incoming.view.webContents.isDestroyed();
    this.presentation.dropCover();
    // Re-keyed by the promotion, so every id below is the warmed tab's own (ONL-2318).
    const tab = this.presentation.warm(incoming);
    const wasWarmed = tab.warming !== undefined;
    const leavingId = this.book.selectedId;
    this.book.select(tab.id);
    // A Tab still watched for its first frame but no longer held back goes straight to its loading ground.
    if (isWatched(tab) && !awaitsFirstPaint(tab)) {
      this.presentation.showLoading(tab);
      this.presentation.requestFirstPaint(tab);
    } else this.presentation.present();
    // After the reveal, which reads the warm's phase to decide whether this view has a frame to show; the press is still what ends the warm.
    this.presentation.forgetWarm(tab);
    this.port.followSettingsRequest(leavingId);
    if (needsTelling({ wasCold, tookSpare, wasWarmedCold: wasWarmed, isCreating: projectCreations.inFlight(tab.id) })) {
      this.presentation.assign(tab);
    }
    // The acknowledgement lands in the RECORD: hiding the dot in the renderer alone brings it back on the next switch away (ONL-2364).
    if (tab.status === 'done') this.book.setStatus(tab, undefined);
    // A chrome view still grown for the outgoing tab's popover sits over the incoming tab as a dead sheet that eats every click.
    this.window.expand({ kind: 'band' });
    this.views.noteActivity(tab.id);
    this.port.tabsChanged();
    this.book.persist();
    this.presence.pushOnScreen();
    this.presence.noteActiveProjectShown(method);
  }
}
