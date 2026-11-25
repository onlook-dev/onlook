import { join } from 'node:path';
import { WebContentsView, type WebContents } from 'electron';
import { IPC_SEND } from '@studio/events';
import { setPageLifecycleState } from '../canvas/cdp.js';
import { forgetCodeDirty, hasUnsavedCode } from '../code/dirty.js';
import { onceView } from '../ipc/bridge.js';
import { forgetTelemetryRenderer, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { abandonSetupForRenderer } from '../telemetry/setup-step.js';
import { protectAppContents } from '../window/host.js';
import type { TabBook } from './book.js';
import { broadcastAudience } from './broadcast.js';
import { installCoolingProof } from './cooling-proof.js';
import { COOL_SWEEP_MS, createCooling, type Cooling } from './cooling.js';
import { setTabFramesDiscarded } from './frames.js';
import type { TabHealth } from './health.js';
import { createTabIdle } from './idle.js';
import { birthFacts, loadTab } from './load.js';
import { logger } from './log.js';
import { observeTabHealth } from './observe-health.js';
import { isSessionResumable } from './resumable.js';
import { installSpareProof } from './spare-proof.js';
import { SpareKeeper } from './spare.js';
import type { Owned, Tab } from './tab.js';
import { unrefTimer } from './timers.js';
import { viewPreferences, type TabWindow } from './window.js';

export interface SpareView {
  id: string;
  view: WebContentsView;
  hasPainted?: true;
}

type Held = Owned<'view' | 'idle' | 'health'>;

const held = (tab: Tab): Held => tab as Held;

/** What the pool asks of, and tells, the pieces that decide what is on screen and which Projects are opening. */
export interface ViewPoolPort {
  /** The Tab on screen, which is never put to sleep or discarded. */
  shownId(): string | undefined;
  /** The Tab a press is waking, which is not put back to sleep. */
  wakingId(): string | undefined;
  /** A view was destroyed, navigated or reported its health: whatever was reserved for it is released. */
  viewReleased(viewId: number): void;
  /** A view reported a health of its own, so a paint that failed is no longer the reason it is unwell. */
  healthReported(tab: Tab): void;
  /** A Tab went cold: what was kept for showing its view goes before the view does. */
  viewDiscarded(tab: Tab): void;
  /** No Tab holds this worktree any more: what ran for it stops. */
  retire(worktree: string): void;
  tabsChanged(): void;
}

/** The pool of views behind the Tabs: built, kept spare, put to sleep and discarded here. */
export class TabViewPool {
  private readonly book: TabBook;
  private readonly window: TabWindow;
  private readonly port: ViewPoolPort;
  private readonly cooling: Cooling;
  private readonly spare: SpareKeeper<SpareView>;

  constructor(book: TabBook, window: TabWindow, port: ViewPoolPort) {
    this.book = book;
    this.window = window;
    this.port = port;
    this.cooling = createCooling({
      candidates: () =>
        this.book.tabIds.flatMap((id) => {
          const tab = this.book.tabById(id);
          if (tab === undefined) return [];
          return [
            {
              id,
              isCoolable: tab.view !== undefined && this.book.purposeOf(tab) === 'project',
              isActive: this.book.selectedId === id,
              // A cut in flight is work too: freeing its view mid-copy abandons the worktree.
              isBusy: this.book.decisionsFor(tab).isBusy,
            },
          ];
        }),
      cool: (id) => this.cool(id),
      teardown: (id) => this.teardown(id),
      canCool: async (id) => {
        if (hasUnsavedCode(this.book.tabById(id)?.view?.webContents.id)) return false;
        const path = this.book.tabById(id)?.workspacePath;
        if (path === undefined) return true;
        // Never on the idle clock's say-so: a fresh wake clears the stored transcript (ONL-1913, ONL-2210).
        return isSessionResumable(path);
      },
      onProbeFailed: (id, error) =>
        logger.warn('a resumability probe failed; keeping the tab warm', { tab_id: id, error }),
      // Gated: with the proof env unset this spreads nothing and the defaults stand.
      ...installCoolingProof(COOL_SWEEP_MS),
    });
    this.spare = new SpareKeeper<SpareView>({
      mint: () => this.mintSpare(),
      destroy: (spare) => this.destroyView(spare.view),
      setTimer: (fn, ms) => unrefTimer(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as NodeJS.Timeout),
      isQuitting: () => this.window.quitting,
    });
    // Gated: with the proof env unset this writes no global and reads nothing.
    installSpareProof(() => this.spare.state);
  }

  /** The spare too, or it paints at the wrong size and reflows on promotion (ONL-2318). */
  resize(body: Electron.Rectangle): void {
    for (const tab of this.book.everyTab()) tab.view?.setBounds(body);
    this.spare.peek()?.view.setBounds(body);
  }

  /** ⚠️ `attach: false` keeps it out of the compositor: an attached view emits one frame of bare background before the document paints, and `setVisible(false)` does not suppress it (ONL-2318). */
  newView(attach = true): WebContentsView {
    const view = new WebContentsView({
      webPreferences: viewPreferences(join(import.meta.dirname, '../preload/index.cjs'), {
        // Canvas frames are `<webview>` guests, locked down in `frames/index.ts`.
        webviewTag: true,
      }),
    });
    protectAppContents(view.webContents, { allowGuests: true });
    // Mirrors `--studio-ground`; what the user sees while the bundle loads.
    view.setBackgroundColor('#262626');
    // Sized before it loads whether or not it is attached, or it paints at 0×0 and reflows when it joins.
    view.setBounds(this.window.body);
    if (attach) this.window.attach(view);
    return view;
  }

  destroyView(view: WebContentsView): void {
    this.port.viewReleased(view.webContents.id);
    abandonSetupForRenderer(view.webContents.id);
    forgetTelemetryRenderer(view.webContents.id);
    // The claim goes with the view: nothing is holding that text any more, and
    // a stale id would keep refusing to cool whichever view reuses it.
    forgetCodeDirty(view.webContents.id);
    this.window.detach(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }

  private mintSpare(): SpareView | undefined {
    if (this.window.window.isDestroyed()) return undefined;
    // The last gate before a view exists, and the only one a mint from any caller passes through.
    if (!this.book.isUsable()) return undefined;
    const id = this.book.nextTabId();
    const view = this.newView();
    // Hidden, then revealed by `setVisible(true)` on promotion — the path every background tab already takes (ONL-2201).
    view.setVisible(false);
    const spare: SpareView = { id, view };
    onceView(view.webContents, IPC_SEND.uiReady, () => {
      spare.hasPainted = true;
    });
    loadTab(view.webContents, birthFacts(id, 'parked'));
    return spare;
  }

  /** The Tab's renderer from here on, watched for the ways a renderer fails. */
  adopt(tab: Tab, view: WebContentsView): void {
    held(tab).view = view;
    this.observeHealth(tab, view);
  }

  /** The Tab's renderer is gone or dead; the Tab is cold until the next `adopt`. */
  release(tab: Tab): void {
    delete held(tab).view;
    delete held(tab).health;
  }

  setHealth(tab: Tab, health: TabHealth | undefined): void {
    if (health === undefined) delete held(tab).health;
    else held(tab).health = health;
  }

  private observeHealth(tab: Tab, view: WebContentsView): void {
    const contents = view.webContents;
    const setHealth = (next: TabHealth | undefined): void => {
      if (next !== undefined) this.port.viewReleased(contents.id);
      if (next !== undefined) this.port.healthReported(tab);
      if (tab.health === next) return;
      this.setHealth(tab, next);
      this.port.tabsChanged();
    };
    const workspaceProperties = () => {
      return tab.workspacePath === undefined ? {} : resolveWorkspaceTelemetryProperties(tab.workspacePath) ?? {};
    };
    observeTabHealth(contents, { isLive: () => this.book.tabById(tab.id) === tab && tab.view === view, health: () => tab.health, setHealth, projectFields: workspaceProperties });
    contents.on('did-start-navigation', (_event, _url, _isInPlace, isMainFrame) => {
      if (isMainFrame) {
        this.port.viewReleased(contents.id);
        forgetCodeDirty(contents.id);
      }
    });
  }

  reload(id: string): void {
    const tab = this.book.tabById(id);
    if (!tab || tab.health === undefined || tab.view === undefined) return;
    logger.info('reloading a tab view', { health: tab.health });
    tab.view.webContents.reload();
  }

  async resume(tab: Tab): Promise<void> {
    const idle = tab.idle;
    await idle?.wake();
    if (tab.idle === idle) delete held(tab).idle;
  }

  cool(id: string): Promise<void> | undefined {
    const tab = this.book.tabById(id);
    if (tab?.view === undefined || tab.idle !== undefined) return;
    const view = tab.view;
    const canSleep = (): boolean => this.book.tabById(id) === tab && tab.view === view &&
      this.book.selectedId !== id && this.port.shownId() !== id && this.port.wakingId() !== id &&
      !this.book.decisionsFor(tab).isBusy && !hasUnsavedCode(view.webContents.id);
    if (!canSleep()) return;
    const idle = createTabIdle({
      canSleep,
      frames: (discarded) => setTabFramesDiscarded(view.webContents, discarded),
      lifecycle: (state) => setPageLifecycleState(view.webContents, state),
      fallback: (error) => {
        logger.warn('freezing an idle tab failed; cooling its view', { tab_id: id, error });
        this.teardown(id);
      },
    });
    held(tab).idle = idle;
    return idle.sleep();
  }

  teardown(id: string, { keepProject = false }: { keepProject?: boolean } = {}): void {
    const tab = this.book.tabById(id);
    if (tab?.view === undefined || this.book.selectedId === id || this.port.shownId() === id) return;
    // Refused here as well as in the sweep: this is the destructive verb, and work in flight outranks the clock.
    if (this.book.decisionsFor(tab).isBusy || hasUnsavedCode(tab.view.webContents.id)) return;
    const view = tab.view;
    delete held(tab).idle;
    // With the view goes its health: the badge would outlive the failure, and `reload` now refuses a cold tab (ONL-2210).
    this.release(tab);
    this.port.viewDiscarded(tab);
    this.destroyView(view);
    if (!keepProject && tab.workspacePath !== undefined && !this.book.heldByAnotherTab(tab.workspacePath, id)) {
      this.port.retire(tab.workspacePath);
    }
    this.port.tabsChanged();
  }

  everyRenderer(): WebContents[] {
    return broadcastAudience({
      chrome: this.window.chromeContents,
      tabs: this.book.tabIds.map((id) => this.book.tabById(id)?.view?.webContents),
      spare: this.spare.peek()?.view.webContents,
    });
  }

  /** Which view each live renderer is: the band, a Tab, or the spare a new Tab will take. */
  viewRoles(): { contents: WebContents; role: 'band' | 'tab' | 'spare'; tabId?: string }[] {
    const roles: { contents: WebContents; role: 'band' | 'tab' | 'spare'; tabId?: string }[] = [{ contents: this.window.chromeContents, role: 'band' }];
    for (const id of this.book.tabIds) {
      const contents = this.book.tabById(id)?.view?.webContents;
      if (contents !== undefined && !contents.isDestroyed()) roles.push({ contents, role: 'tab', tabId: id });
    }
    const spare = this.spare.peek()?.view.webContents;
    if (spare !== undefined && !spare.isDestroyed()) roles.push({ contents: spare, role: 'spare' });
    return roles;
  }

  /** The ACTIVE tab, not `order[0]`: a restored set leaves cold tabs first, and a cold tab never reports (ONL-2208). */
  firstPaintSources(): WebContents[] {
    const contents = this.book.activeContents() ?? this.book.contentsFor(this.book.tabIds[0] ?? '');
    return contents ? [this.window.chromeContents, contents] : [this.window.chromeContents];
  }

  /** Never during teardown: the spare has no session, so quit must not wait on it (ONL-2254). */
  dispose(): void {
    this.spare.dispose();
    this.cooling.dispose();
  }

  /** Armed once the window is up: before this the keeper refuses to schedule, so no mint competes with the first paint (ONL-2318). */
  arm(): void {
    this.cooling.start();
    this.spare.arm();
  }

  noteActivity(id: string): void {
    this.cooling.touch(id);
  }

  forgetCooling(id: string): void {
    this.cooling.forget(id);
  }

  takeSpare(): SpareView | undefined {
    return this.spare.take();
  }

  scheduleSpare(): void {
    this.spare.schedule();
  }
}
