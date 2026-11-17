import { IPC_EMIT } from '@studio/events';
import { captureThumbnailOnLeave } from '../canvas/index.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { projectCreations } from '../workspace/create-project.js';
import { isRemovingProject } from '../workspace/remove-project.js';
import { projectAt } from '../workspace/store.js';
import type { TabBook } from './book.js';
import type { CloseLoss } from './close-confirm.js';
import { tabCloseDecision } from './closing.js';
import { tabName } from './name.js';
import type { TabPresentation } from './presentation.js';
import { ClosedTabs, reopenPlan } from './reopen.js';
import { send } from './send.js';
import type { Tab } from './tab.js';
import { tabClosed, tabCreated, type TabCloseMethod, type TabSelectMethod } from './telemetry.js';
import type { TabViewPool } from './view-pool.js';
import { unregisterView, workspaceOf } from './views.js';
import { closeEveryTab } from './workspace-close.js';

export interface TabCloserPort {
  activate(id: string, method: TabSelectMethod): void;
  isAtProjectLimit(): boolean;
  /** Asks the person before a close that would lose something; resolves false on `Wait`. */
  confirmClose(name: string, losses: readonly CloseLoss[]): Promise<boolean>;
  /** No Tab holds this worktree any more: what ran for it stops. */
  retire(worktree: string): void;
  tabsChanged(): void;
}

/** How a Tab leaves and comes back: the confirmation, the close itself, and the Tabs closed that can be reopened. */
export class TabCloser {
  private readonly book: TabBook;
  private readonly views: TabViewPool;
  private readonly presentation: TabPresentation;
  private readonly port: TabCloserPort;
  private readonly closed = new ClosedTabs();

  constructor(book: TabBook, views: TabViewPool, presentation: TabPresentation, port: TabCloserPort) {
    this.book = book;
    this.views = views;
    this.presentation = presentation;
    this.port = port;
  }

  get canReopen(): boolean {
    return this.closed.has(canReopenWorkspace);
  }

  reopenClosed(): void {
    const plan = reopenPlan(this.closed, {
      canReopen: canReopenWorkspace,
      openTabFor: (workspacePath) => this.book.tabForWorkspace(workspacePath),
      isAtLimit: this.port.isAtProjectLimit(),
      openCount: this.book.openTabCount,
    });
    if (plan.kind === 'none') {
      this.port.tabsChanged();
      return;
    }
    if (plan.kind === 'activate') {
      this.port.activate(plan.tabId, 'click');
      return;
    }
    if (plan.kind === 'blocked') return;
    const id = this.book.nextTabId();
    const tab: Tab = { id, workspacePath: plan.workspacePath, isWorking: false };
    this.book.enter(tab, plan.index);
    capture('tab_created', tabCreated({ tab, openCount: this.book.openTabCount, method: 'reopen' }, resolveWorkspaceTelemetryProperties));
    this.port.activate(id, 'tab_created');
    this.book.persist();
  }

  closeActive(): void {
    if (this.book.selectedId !== undefined) void this.requestClose(this.book.selectedId, 'hotkey');
  }

  /**
   * An active session always confirms; the teardown stays synchronous, so nothing half-closes while the modal is up.
   * Resolves false only on `Wait`; a tab already gone is nothing to close, not a refusal (ONL-2315).
   */
  async requestClose(id: string, method: TabCloseMethod = 'close_button'): Promise<boolean> {
    const tab = this.book.tabById(id);
    if (!tab) return true;
    const confirmation = this.book.decisionsFor(tab).close;
    if (!confirmation.needsConfirm) {
      this.close(id, method);
      return true;
    }
    const chosen = await this.port.confirmClose(tabName(tab), confirmation.losses);
    if (!this.book.hasTab(id)) return true;
    if (!chosen) {
      // `Wait` cancels: the tab keeps its activity signal and its view, and only the refusal is recorded.
      capture('tab_closed', tabClosed({ tab, openCount: this.book.recordCount, method, modalChoice: 'wait' }));
      return false;
    }
    this.close(id, method, 'close_anyway');
    return true;
  }

  /** Every tab on the path, not the first: a second tab on one worktree is representable, and its session would outlive a delete (ONL-2315). */
  async closeForWorkspace(workspacePath: string): Promise<boolean> {
    const rounds = this.book.tabIdsForWorkspace(workspacePath).length;
    return closeEveryTab(
      () => this.book.tabIdsForWorkspace(workspacePath)[0],
      (id) => this.requestClose(id, 'remove'),
      rounds,
    );
  }

  close(id: string, method: TabCloseMethod = 'close_button', modalChoice?: 'close_anyway' | 'wait'): void {
    const tab = this.book.tabById(id);
    if (!tab) return;
    const registered = tab.view === undefined ? undefined : workspaceOf(tab.view.webContents.id);
    // Held before the exit arm deletes the field it resolves from, so the ask cannot be moved past its own input (ONL-2471).
    const leaving = tab.workspacePath;
    if (leaving !== undefined && method !== 'remove') this.closed.push({ workspacePath: leaving, index: this.book.tabIds.indexOf(id) });
    const decision = tabCloseDecision(
      { workspacePath: tab.workspacePath, registeredWorkspace: registered },
      this.book.recordCount === 1,
      (workspace) => this.book.heldByAnotherTab(workspace, id),
    );
    if (tab.view !== undefined) unregisterView(tab.view.webContents);
    if (decision.exitToProjects && tab.view !== undefined) {
      // The destroy arm past this branch takes none: it closes the guests a capture needs (ONL-2471).
      captureThumbnailOnLeave(leaving);
      // Main retires the project itself; a renderer mid-landing declines a plain folder press (ONL-2265).
      projectCreations.release(id);
      this.book.setWorkspace(tab, undefined);
      // The same retirement as a delete: this is the common close, one tab open (ONL-2209).
      if (decision.stopSession && decision.retire !== undefined) this.port.retire(decision.retire);
      this.port.tabsChanged();
      this.book.persist();
      send(tab.view.webContents, IPC_EMIT.chromeActionForwarded, { tabId: id, slot: 'folder', closing: true });
      // A view still on its scaffold has nobody listening for that push; the assignment is what moves it.
      this.presentation.assign(tab);
      return;
    }
    this.book.remove(id);
    this.presentation.forgetShown(id);
    this.presentation.forgetPresentDeadline(id);
    this.presentation.forgetSlots(id);
    // A frame that arrives while the view is closing would put it back in the window.
    this.presentation.endWatch(tab);
    // Or a reused id inherits the closed tab's clock.
    this.views.forgetCooling(id);
    capture(
      'tab_closed',
      tabClosed({ tab, openCount: this.book.recordCount, method, ...(modalChoice === undefined ? {} : { modalChoice }) }),
    );
    // A worktree cut for a tab nobody can see becomes a project the user never made (ONL-2244).
    projectCreations.release(id);
    this.book.unlist(id);
    if (tab.view !== undefined) this.views.destroyView(tab.view);
    // Nothing else stops a tab's agent (ONL-2243).
    if (decision.stopSession && decision.retire !== undefined) this.port.retire(decision.retire);
    if (this.book.selectedId === id) {
      this.book.select(undefined);
      const next = this.book.tabIds[this.book.tabIds.length - 1];
      if (next !== undefined) this.port.activate(next, 'tab_closed');
    } else {
      // Closing the tab on screen leaves the selected one behind it (ONL-3121).
      if (this.presentation.shownId !== this.book.selectedId) this.presentation.present();
      this.port.tabsChanged();
    }
    this.book.persist();
  }
}

function canReopenWorkspace(workspacePath: string): boolean {
  return projectAt(workspacePath).ok && !isRemovingProject(workspacePath);
}
