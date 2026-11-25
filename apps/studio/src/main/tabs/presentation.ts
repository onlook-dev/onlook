import { app, type WebContents, type WebContentsView } from 'electron';
import { IPC_EMIT, IPC_SEND, type ChromeSlotsPush, type TabAssignment } from '@studio/events';
import type { TabFreeze } from '../canvas/capture-view.js';
import { readSmallExistingCanvasDoc } from '../canvas/fs-backend.js';
import { knownCanvasDocId } from '../canvas/registry.js';
import { onView, onceView } from '../ipc/bridge.js';
import { showTelemetryRenderer } from '../telemetry/index.js';
import { projectCreations } from '../workspace/create-project.js';
import { knownProject } from '../workspace/store.js';
import { assignmentFor } from './assignment.js';
import type { TabBook } from './book.js';
import { birthFacts, loadTab } from './load.js';
import { logger } from './log.js';
import { createTabPaintGate, TAB_FIRST_PAINT_TIMEOUT_MS, TAB_PAINT_TIMEOUT_MS, TAB_PRESENT_DEADLINE_MS, type TabCaptureResult, type TabPaintGate } from './paint.js';
import { awaitsFirstPaint, PresentationMachine, type PresentationEvent, type Verdict } from './presentation-machine.js';
import { PREWARM_GAP_MS, PREWARM_READY_TIMEOUT_MS, prewarmQueue } from './prewarm.js';
import { presentationStep } from './reveal.js';
import { restoreCanvasEligibleAcrossAllPages, restoreWithinBudget } from './restore-budget.js';
import { send } from './send.js';
import { SlotBook } from './slot-book.js';
import type { Owned, Tab } from './tab.js';
import { unrefTimer } from './timers.js';
import type { TabViewPool } from './view-pool.js';
import type { TabWindow } from './window.js';

type Pressed = Owned<'presentationStartedAt'>;

/** `cancel` retires a paint wait silently; `giveUp` first reports the Tab that never painted (ONL-3121). */
interface TabPaintWait extends TabPaintGate {
  giveUp(): void;
}

export const PRESENT_CAPTURE_DELAY_MS = 150;

/** About two frames: long enough for a view that was already drawn to redraw at its current size, short enough that nobody reads the Tab they left (ONL-2744, ONL-3153). */
export const COVER_HOLD_MS = 50;

/** The longest a press whose warm had no frame yet waits for the Tab's own ground before an empty view becomes the lesser evil (ONL-3153). */
export const COVER_GROUND_MS = 1_000;

/** Every step a press takes to the screen, so a stall names itself in the log (ONL-3153). */
type PresentationTransition =
  | 'press' | 'warm' | 'first-paint-requested' | 'waiting-ui-ready' | 'ui-ready'
  | 'revealed' | 'revealed-loading' | 'forced' | `capture-${TabCaptureResult}`;

/** What a first-paint watch holds while it runs. Its phase is on the Tab (`firstPaint`); this is only what has to be let go. */
interface WatchRig {
  readonly run: number;
  readonly tab: Tab;
  readonly view: WebContentsView;
  readonly contents: WebContents;
  readonly paint: TabPaintWait;
  readonly unhearReady: () => void;
  readonly navigating: (event: unknown, url: string, isInPlace: boolean, isMainFrame: boolean) => void;
  readonly gone: () => void;
}

/** What the cover in force holds: the two views, the incoming Tab's paint wait, its two listeners and its two timers. */
interface CoverRig {
  readonly run: number;
  readonly tab: Tab;
  readonly outgoing: WebContentsView;
  readonly outgoingContents: WebContents;
  readonly incoming: WebContents;
  readonly paint: TabPaintWait;
  readonly unhearPresented: () => void;
  readonly unhearReady: () => void;
  readonly hold: ReturnType<typeof setTimeout>;
  readonly capture: ReturnType<typeof setTimeout>;
}

/** What a background warm holds: how to stop its frame wait, and how to hand the queue's turn on. */
interface WarmRig {
  readonly stop: () => void;
  readonly pass: () => void;
}

/**
 * What a Tab shows and when: the press, the warm, covers, first paint and the deadlines.
 *
 * The phases and the rules for moving between them are `PresentationMachine`'s; every change
 * goes through `dispatch`. This class is the effects: it attaches, shows, times and listens,
 * and it keeps only what an operation in flight has to let go of (the rigs).
 */
export class TabPresentation {
  private readonly book: TabBook;
  private readonly window: TabWindow;
  private readonly views: TabViewPool;
  private readonly tabsChanged: () => void;
  private readonly slots = new SlotBook();
  private readonly machine = new PresentationMachine((refusal) => {
    logger.warn('refused a tab presentation event', { tab_id: refusal.tabId, event: refusal.event, phase: refusal.phase });
  });

  private coverRig: CoverRig | undefined;
  private deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly watches = new WeakMap<Tab, WatchRig>();
  private readonly warms = new WeakMap<Tab, WarmRig>();
  private restoring: { tab: Tab; contents: WebContents; baselineKb: number } | undefined;
  private restoreTimer: ReturnType<typeof setTimeout> | undefined;
  private restoreAttempted = false;
  private restoreGeneration = 0;

  constructor(book: TabBook, window: TabWindow, views: TabViewPool, tabsChanged: () => void) {
    this.book = book;
    this.window = window;
    this.views = views;
    this.tabsChanged = tabsChanged;
  }

  private dispatch(event: PresentationEvent): Verdict {
    return this.machine.dispatch(event);
  }

  /** The start of a press: every later step of its way to the screen is timed from here. */
  pressed(tab: Tab): void {
    (tab as Pressed).presentationStartedAt = Date.now();
    this.tracePresentation(tab, 'press');
  }

  private tracePresentation(tab: Tab, transition: PresentationTransition): void {
    logger.info('tab presentation', {
      tab_id: tab.id,
      transition,
      elapsed_ms: tab.presentationStartedAt === undefined ? 0 : Date.now() - tab.presentationStartedAt,
    });
  }

  /** Reconciles the strip's selection with what is on screen (ONL-3121). */
  present(): void {
    const selectedId = this.book.selectedId;
    const selected = selectedId === undefined ? undefined : this.book.tabById(selectedId);
    const step = presentationStep({
      selectedId,
      shownId: this.machine.shown,
      ...(selected === undefined ? {} : { selected: { hasView: selected.view !== undefined, awaitsFirstPaint: awaitsFirstPaint(selected) } }),
    });
    if (selected === undefined || step.kind === 'wait') {
      this.clearPresentDeadline();
      return;
    }
    if (step.kind === 'settled') {
      this.clearPresentDeadline();
      this.publishVisibleSlots(selected);
      return;
    }
    if (step.kind === 'reveal') this.reveal(selected);
    else {
      this.showLoading(selected);
      this.requestFirstPaint(selected);
    }
    if (this.machine.shown === this.book.selectedId) this.clearPresentDeadline();
    else this.armPresentDeadline(selected.id);
  }

  /** One deadline at a time, and a repeated press on the same Tab never extends it (ONL-3121). */
  private armPresentDeadline(tabId: string): void {
    const deadline = this.machine.deadline;
    if (deadline.kind === 'armed' && deadline.tabId === tabId) return;
    this.clearPresentDeadline();
    const run = this.machine.nextRun();
    this.deadlineTimer = unrefTimer(() => {
      if (this.dispatch({ type: 'deadline-elapsed', run }) === 'stale') return;
      this.deadlineTimer = undefined;
      this.forcePresent(tabId);
    }, TAB_PRESENT_DEADLINE_MS);
    this.dispatch({ type: 'deadline-armed', tabId, run });
  }

  clearPresentDeadline(): void {
    clearTimeout(this.deadlineTimer);
    this.deadlineTimer = undefined;
    this.dispatch({ type: 'deadline-cleared' });
  }

  /** Past the deadline the loading ground of the Tab the user picked beats the Tab they did not (ONL-3121). */
  private forcePresent(tabId: string): void {
    const tab = this.book.tabById(tabId);
    if (this.book.selectedId !== tabId || tab?.view === undefined || this.machine.shown === tabId || this.window.window.isDestroyed()) return;
    logger.info('presenting a Tab without its paint', { tab_id: tabId });
    this.tracePresentation(tab, 'forced');
    this.showLoading(tab);
  }

  /** The Tab's view on screen as it is, painted or not; a wait already running keeps watching for its frame. */
  showLoading(tab: Tab): void {
    if (tab.view === undefined) return;
    // `showLoading` places the view itself, so a watch on it never places or hides it again; the watch stays live, so a Tab that never paints still reports `failed` and a late paint still clears it (ONL-3121).
    this.dispatch({ type: 'handed-over', tab });
    // This Tab's own cover keeps its paint wait, so a Tab that never draws still reports `failed`; another Tab's cover hides the view it owns (ONL-3121).
    const cover = this.machine.cover;
    if (cover.kind !== 'none' && cover.tabId === tab.id) this.dispatch({ type: 'cover-handed-over' });
    else this.dropCover();
    this.window.attach(tab.view);
    tab.view.setVisible(true);
    const shown = this.machine.shown;
    const outgoing = shown === undefined ? undefined : this.book.tabById(shown)?.view;
    if (outgoing !== undefined && outgoing !== tab.view && !outgoing.webContents.isDestroyed()) outgoing.setVisible(false);
    this.dispatch({ type: 'shown', tabId: tab.id });
    this.clearPresentDeadline();
    this.tracePresentation(tab, 'revealed-loading');
    // The `revealWhenPainted` that would have scheduled the spare never completed.
    this.views.scheduleSpare();
    this.publishVisibleSlots(tab);
    showTelemetryRenderer(tab.view.webContents.id);
  }

  private waitForTabPaint(tab: Tab, contents: WebContents, painted: () => void, timedOut: () => void): TabPaintWait {
    const failed = (): void => {
      if (tab.health === undefined) {
        this.dispatch({ type: 'paint-failed', tab });
        this.views.setHealth(tab, 'failed');
        this.tabsChanged();
      }
    };
    const timeoutMs = awaitsFirstPaint(tab) ? TAB_FIRST_PAINT_TIMEOUT_MS : TAB_PAINT_TIMEOUT_MS;
    const deadline = unrefTimer(timedOut, timeoutMs);
    const gate = createTabPaintGate({
      contents,
      painted: () => {
        cancel();
        if (tab.paintFailed === true) {
          this.dispatch({ type: 'paint-recovered', tab });
          if (tab.health === 'failed') {
            this.views.setHealth(tab, undefined);
            this.tabsChanged();
          }
        }
        painted();
      },
      failed,
      timeoutMs,
      captured: (result) => this.tracePresentation(tab, `capture-${result}`),
    });
    const navigating = (_event: unknown, _url: string, _isInPlace: boolean, isMainFrame: boolean): void => {
      if (isMainFrame) gate.restart();
    };
    const loaded = (): void => {
      if (tab.paintFailed === true) failed();
    };
    const cancel = (): void => {
      gate.cancel();
      clearTimeout(deadline);
      contents.removeListener('did-start-navigation', navigating);
      contents.removeListener('did-finish-load', loaded);
      contents.removeListener('destroyed', cancel);
      this.window.window.removeListener('closed', cancel);
    };
    contents.on('did-start-navigation', navigating);
    contents.on('did-finish-load', loaded);
    contents.once('destroyed', cancel);
    this.window.window.once('closed', cancel);
    return { ...gate, cancel, giveUp: () => { failed(); cancel(); } };
  }

  private reveal(tab: Tab): void {
    const outgoingId = this.machine.shown === tab.id ? undefined : this.machine.shown;
    const outgoing = outgoingId === undefined ? undefined : this.book.tabById(outgoingId)?.view;
    this.dropCover();
    tab.view?.setVisible(true);
    if (outgoing === undefined || tab.view === undefined) {
      if (tab.view !== undefined) this.dispatch({ type: 'shown', tabId: tab.id });
      this.publishVisibleSlots(tab);
      if (tab.view !== undefined) showTelemetryRenderer(tab.view.webContents.id);
      return;
    }
    const outgoingContents = outgoing.webContents;
    if (this.window.window.isDestroyed()) {
      this.dispatch({ type: 'shown', tabId: tab.id });
      if (!outgoingContents.isDestroyed()) outgoing.setVisible(false);
      showTelemetryRenderer(tab.view.webContents.id);
      return;
    }
    // A revealed view first shows the frame from before it hid; the outgoing view covers it until it draws again (ONL-2744).
    this.window.window.contentView.addChildView(outgoing);
    this.window.raiseChrome();
    showTelemetryRenderer(outgoingContents.id);
    const incoming = tab.view.webContents;
    const run = this.machine.nextRun();
    const paint = this.waitForTabPaint(tab, incoming, () => this.coverPainted(run), () => this.liftCover(run));
    const requestPaint = (): void => {
      if (this.dispatch({ type: 'cover-frame-due', run }) !== 'stale') paint.request();
    };
    this.dispatch({ type: 'cover-raised', tabId: tab.id, run });
    /**
     * A view that has drawn needs two frames to redraw at this size, and holding
     * the cover past that reads as the Tab the user left. One the press beat to
     * its first frame has nothing to show yet, so its own paint ends the cover
     * instead and the ceiling is the point where an empty view is the lesser
     * evil; `armPresentDeadline` still backstops a view that never paints.
     */
    const holdMs = tab.warming === undefined || tab.warming.phase === 'primed' ? COVER_HOLD_MS : COVER_GROUND_MS;
    this.coverRig = {
      run, tab, outgoing, outgoingContents, incoming, paint,
      unhearPresented: onceView(incoming, IPC_SEND.tabPresented, paint.presented),
      unhearReady: onView(incoming, IPC_SEND.uiReady, requestPaint),
      hold: unrefTimer(() => this.liftCover(run), holdMs),
      capture: unrefTimer(requestPaint, PRESENT_CAPTURE_DELAY_MS),
    };
  }

  /** The hold ran out, or the incoming Tab's frame is overdue: the incoming Tab is what the user sees from here, drawn or not. */
  private liftCover(run: number): void {
    const rig = this.coverRig;
    if (this.dispatch({ type: 'cover-lifted', run }) !== 'moved' || rig === undefined) return;
    this.uncover(rig);
  }

  /** The incoming Tab drew: the cover is over, and comes off if it was still up. */
  private coverPainted(run: number): void {
    const rig = this.coverRig;
    const wasCovering = this.machine.cover.kind === 'covering';
    if (this.dispatch({ type: 'cover-painted', run }) === 'stale' || rig === undefined) return;
    this.retireCover(rig);
    if (wasCovering) this.uncover(rig);
  }

  private uncover(rig: CoverRig): void {
    this.dispatch({ type: 'shown', tabId: rig.tab.id });
    this.tracePresentation(rig.tab, 'revealed');
    this.present();
    if (!rig.outgoingContents.isDestroyed()) rig.outgoing.setVisible(false);
    if (!rig.incoming.isDestroyed()) showTelemetryRenderer(rig.incoming.id);
  }

  private retireCover(rig: CoverRig): void {
    clearTimeout(rig.hold);
    clearTimeout(rig.capture);
    rig.paint.cancel();
    if (!rig.incoming.isDestroyed()) rig.unhearPresented();
    if (!rig.incoming.isDestroyed()) rig.unhearReady();
    this.coverRig = undefined;
  }

  /** Ends the cover in force unseen, as another press or a closed window does: an incoming Tab still under it goes back off screen. */
  dropCover(): void {
    const rig = this.coverRig;
    const wasCovering = this.machine.cover.kind === 'covering';
    this.dispatch({ type: 'cover-dropped' });
    if (rig === undefined) return;
    this.retireCover(rig);
    if (wasCovering && !rig.incoming.isDestroyed()) rig.tab.view?.setVisible(false);
  }

  /** Holds a view that has never painted off screen until it has a frame to show, or the wait gives up. */
  revealWhenPainted(tab: Tab, view: WebContentsView): void {
    const contents = view.webContents;
    const run = this.machine.nextRun();
    const paint = this.waitForTabPaint(tab, contents, () => this.firstPainted(rig), () => this.firstPaintOverdue(rig));
    this.dispatch({ type: 'watch-started', tab, run });
    const rig: WatchRig = {
      run, tab, view, contents, paint,
      // This view's own channel, not the shared `ipcMain` one the show gate listens on; and `ui:ready`, not `did-finish-load`, which lands long after the parked surface commits (ONL-2244, ONL-2318).
      unhearReady: onView(contents, IPC_SEND.uiReady, () => this.watchedViewReady(rig)),
      navigating: (_event, _url, _isInPlace, isMainFrame) => {
        if (isMainFrame) this.dispatch({ type: 'navigated', tab, run });
      },
      gone: () => this.watchedViewGone(rig),
    };
    this.watches.set(tab, rig);
    contents.on('did-start-navigation', rig.navigating);
    contents.once('destroyed', rig.gone);
    this.window.window.once('closed', rig.gone);
  }

  private watchedViewReady(rig: WatchRig): void {
    if (this.dispatch({ type: 'ui-ready', tab: rig.tab, run: rig.run }) === 'stale') return;
    this.tracePresentation(rig.tab, 'ui-ready');
    this.tracePresentation(rig.tab, 'first-paint-requested');
    rig.paint.request();
  }

  /** Asks a watched Tab for its frame again; one whose renderer has not reported yet is only noted. */
  requestFirstPaint(tab: Tab): void {
    const rig = this.watches.get(tab);
    const phase = tab.firstPaint;
    if (rig === undefined || phase === undefined || phase.kind === 'held' || phase.run !== rig.run) return;
    this.tracePresentation(tab, 'first-paint-requested');
    if (!phase.ready) {
      this.tracePresentation(tab, 'waiting-ui-ready');
      return;
    }
    rig.paint.restart();
    rig.paint.request();
  }

  private firstPainted(rig: WatchRig): void {
    const wasPlaced = isPlaced(rig.tab);
    if (this.dispatch({ type: 'first-painted', tab: rig.tab, run: rig.run }) === 'stale') return;
    this.unwatch(rig);
    if (!wasPlaced) this.place(rig, false);
  }

  private firstPaintOverdue(rig: WatchRig): void {
    if (this.dispatch({ type: 'overdue', tab: rig.tab, run: rig.run }) === 'stale') return;
    const wasPlaced = isPlaced(rig.tab);
    // Off screen nothing reselects this Tab to build a fresh wait, so this one reports the Tab that never painted and retires.
    const retires = this.book.selectedId !== rig.tab.id;
    if (retires) {
      rig.paint.giveUp();
      this.dispatch({ type: 'given-up', tab: rig.tab, run: rig.run });
      this.unwatch(rig);
    }
    if (!wasPlaced) this.place(rig, !retires);
  }

  /** Puts a watched view in the window, once: on screen if its Tab is the selected one, hidden if not. */
  private place(rig: WatchRig, stillWatched: boolean): void {
    if (rig.contents.isDestroyed() || this.window.window.isDestroyed()) return;
    if (stillWatched) this.dispatch({ type: 'placed', tab: rig.tab, run: rig.run });
    this.window.attach(rig.view);
    // Its replacement starts once the view the user is watching has painted.
    this.views.scheduleSpare();
    if (this.book.selectedId !== rig.tab.id) {
      rig.view.setVisible(false);
      return;
    }
    this.present();
  }

  /** The watched view was destroyed, or its window closed: that watch is over. A view's `destroyed` ends its own watch and no other. */
  private watchedViewGone(rig: WatchRig): void {
    this.dispatch({ type: 'view-gone', tab: rig.tab, run: rig.run });
    this.unwatch(rig);
  }

  /** The Tab's view is going (discarded, found dead, or closed with its Tab): its first-paint watch goes with it, so nothing that view answers later places it again or reaches the Tab's next one. */
  endWatch(tab: Tab): void {
    const rig = this.watches.get(tab);
    this.dispatch({ type: 'view-discarded', tab });
    if (rig !== undefined) this.unwatch(rig);
  }

  private unwatch(rig: WatchRig): void {
    rig.paint.cancel();
    rig.unhearReady();
    rig.contents.removeListener('destroyed', rig.gone);
    rig.contents.removeListener('did-start-navigation', rig.navigating);
    this.window.window.removeListener('closed', rig.gone);
    if (this.watches.get(rig.tab) === rig) this.watches.delete(rig.tab);
  }

  /** ⚠️ Taking the spare RE-KEYS the tab: a renderer bakes `TAB_ID` from its birth query, so a grafted view under any other id is dead (ONL-2318). */
  warm(tab: Tab, background = false): Tab {
    if (tab.view !== undefined) {
      // A renderer that died while parked is not a warm Tab: free it and build a fresh one, or the press reveals the corpse (ONL-3153).
      if (!tab.view.webContents.isDestroyed()) return tab;
      this.views.destroyView(tab.view);
      this.views.release(tab);
      this.endWatch(tab);
      this.forgetWarm(tab);
      this.dispatch({ type: 'paint-recovered', tab });
      this.tabsChanged();
    }
    this.tracePresentation(tab, 'warm');
    const purpose = this.book.purposeOf(tab) === 'projects' ? 'projects' : 'parked';
    if (background) {
      // ⚠️ No paint wait: nobody is watching this Tab, and `giveUp` would mark one the user never touched dead 45s after launch (ONL-3153).
      const parked = this.views.newView();
      parked.setVisible(false);
      this.views.adopt(tab, parked);
      loadTab(parked.webContents, birthFacts(tab.id, purpose));
      return tab;
    }
    // A background warm leaves the spare for the `+` it was minted for (ONL-2318).
    const spare = purpose === 'projects' ? undefined : this.views.takeSpare();
    if (spare === undefined) {
      // Held back only once the window is up: at boot the show gate waits on this view's own report (ONL-2318).
      const holdsBack = this.window.window.isVisible();
      const view = this.views.newView(!holdsBack);
      this.views.adopt(tab, view);
      if (holdsBack) {
        this.holdBack(tab);
        if (purpose === 'projects') this.window.attach(view, 0);
        else view.setVisible(false);
        this.revealWhenPainted(tab, view);
      }
      loadTab(view.webContents, birthFacts(tab.id, purpose));
      return tab;
    }
    const rekeyed = this.rekey(tab, spare.id);
    this.views.adopt(rekeyed, spare.view);
    // A spare the wake beat to its own paint is no warmer than a view built here.
    if (spare.hasPainted === true) {
      this.views.scheduleSpare();
      return rekeyed;
    }
    this.holdBack(rekeyed);
    this.revealWhenPainted(rekeyed, spare.view);
    return rekeyed;
  }

  private rekey(tab: Tab, to: string): Tab {
    const from = tab.id;
    if (from === to) return tab;
    const moved = this.book.rekey(tab, to);
    this.slots.forget(from);
    // Not carried over: the new id restarts its hour on the activation that warmed it.
    this.views.forgetCooling(from);
    projectCreations.rekey(from, to);
    return moved;
  }

  /** A Tab entered already holding a view that has not painted: it stays off screen until `revealWhenPainted` shows it. */
  holdBack(tab: Tab): void {
    this.dispatch({ type: 'held-back', tab });
  }

  /** The one way out of a background warm, however it ends; the queue's turn goes on with it. */
  forgetWarm(tab: Tab): void {
    const warming = tab.warming;
    const rig = this.warms.get(tab);
    this.dispatch({ type: 'warm-ended', tab });
    if (warming === undefined || rig === undefined) return;
    this.warms.delete(tab);
    rig.stop();
    if (warming.turn === 'held') rig.pass();
  }

  private assignmentFor(tab: Tab): TabAssignment | null {
    const workspace = tab.workspacePath === undefined ? undefined : knownProject(tab.workspacePath);
    const assignment = assignmentFor({
      tabId: tab.id,
      ...(tab.workspacePath === undefined ? {} : { workspacePath: tab.workspacePath }),
      hasCreation: projectCreations.stateFor(tab.id) !== undefined,
      ...(workspace === undefined ? {} : { repoIdentity: workspace.repoIdentity }),
    });
    return assignment?.purpose === 'project' && this.restoring?.tab === tab
      ? { ...assignment, restoring: true }
      : assignment;
  }

  /** The pull half: a parked view asks at mount, so nothing depends on a push arriving before its listener exists. */
  assignmentFrom(sender: WebContents): TabAssignment | null {
    const tab = this.book.tabFor(sender);
    // `null` is "not yet": only the canvas admitted by the memory guard opens before selection.
    if (tab === undefined || (tab.warming !== undefined && this.restoring?.tab !== tab)) return null;
    return this.assignmentFor(tab);
  }

  /** The push half: tells a view which Project its Tab holds. */
  assign(tab: Tab): void {
    const contents = tab.view?.webContents;
    const assignment = this.assignmentFor(tab);
    if (contents === undefined || assignment === null) return;
    this.forgetWarm(tab);
    send(contents, IPC_EMIT.tabsAssigned, assignment);
  }

  /** From the record, never an empty push: a `+` tab has no renderer yet, and an empty push is ~700ms of no controls (ONL-2312). */
  private publishVisibleSlots(tab: Tab): void {
    if (this.book.selectedId !== tab.id || this.machine.shown !== tab.id || awaitsFirstPaint(tab)) return;
    this.window.pushSlots({ tabId: tab.id, slots: this.slots.forTab(tab.id, this.book.purposeOf(tab), this.book.hasReachedProduct()) });
  }

  isTabShown(contentsId: number): boolean {
    const tab = this.book.tabForViewId(contentsId);
    return tab !== undefined && this.machine.shown === tab.id && !this.window.window.isDestroyed() && this.window.window.isVisible();
  }

  handleSlots(sender: WebContents, push: ChromeSlotsPush): void {
    const tab = this.book.tabFor(sender);
    // A renderer fills only its own tab's slots.
    if (!tab || tab.id !== push.tabId) return;
    this.slots.record(tab.id, push.slots);
    this.views.noteActivity(tab.id);
    this.publishVisibleSlots(tab);
  }

  /** Restored tabs keep no renderer across a launch, so the press that selects one pays for building it (ONL-3153). */
  warmRestored(): void {
    const queue = prewarmQueue(
      this.book.tabIds.map((id) => {
        const tab = this.book.tabById(id);
        return {
          id,
          isCold: tab?.view === undefined,
          isProject: tab !== undefined && this.book.purposeOf(tab) === 'project',
          isSelected: this.book.selectedId === id,
        };
      }),
    );
    const restoreCandidates = [...queue];
    const next = (): void => {
      const id = queue.shift();
      if (this.window.quitting || this.window.window.isDestroyed()) return;
      if (id === undefined) {
        void this.restoreOne(restoreCandidates);
        return;
      }
      const tab = this.book.tabById(id);
      if (tab === undefined || tab.view !== undefined) {
        next();
        return;
      }
      const pass = (): void => {
        unrefTimer(next, PREWARM_GAP_MS);
      };
      this.warmRestoredTab(tab, pass);
    };
    unrefTimer(next, PREWARM_GAP_MS);
  }

  private warmRestoredTab(tab: Tab, pass: () => void): void {
    const warmed = this.warm(tab, true);
    const contents = warmed.view?.webContents;
    if (contents === undefined) {
      pass();
      return;
    }
    logger.info('warming a restored tab in the background', { tab_id: warmed.id });
    const run = this.machine.nextRun();
    // ⚠️ The frame is the point: a hidden view rasterizes nothing until something asks, and
    // without this the press that selects this Tab pays for its first frame itself (ONL-3153).
    const gate = createTabPaintGate({
      contents,
      painted: () => {
        const holdsTurn = warmed.warming?.turn === 'held';
        if (this.dispatch({ type: 'warm-primed', tab: warmed, run }) === 'moved' && holdsTurn) pass();
      },
      // Nobody is watching this Tab, so a frame that never comes ends its turn and reports nothing.
      failed: () => {
        if (this.dispatch({ type: 'warm-overdue', tab: warmed, run }) === 'moved') pass();
      },
      timeoutMs: PREWARM_READY_TIMEOUT_MS,
    });
    this.dispatch({ type: 'warm-started', tab: warmed, run });
    this.warms.set(warmed, { stop: gate.cancel, pass });
    onceView(contents, IPC_SEND.uiReady, () => {
      if (this.dispatch({ type: 'warm-ready', tab: warmed, run }) === 'moved') gate.request();
    });
    // A Tab closed before it was ever pressed reports nothing; the rest of the queue does not wait it out.
    contents.once('destroyed', () => {
      const rig = this.warms.get(warmed);
      const holdsTurn = warmed.warming?.turn === 'held';
      if (this.dispatch({ type: 'warm-view-gone', tab: warmed, run }) !== 'moved' || rig === undefined) return;
      this.warms.delete(warmed);
      rig.stop();
      if (holdsTurn) rig.pass();
    });
  }

  private memoryKb(): number {
    try {
      const metrics = app.getAppMetrics();
      if (metrics.length === 0 || metrics.some((metric) => !Number.isFinite(metric.memory.workingSetSize) || metric.memory.workingSetSize <= 0)) return 0;
      return metrics.reduce((total, metric) => total + metric.memory.workingSetSize, 0);
    } catch {
      return 0;
    }
  }

  private async restoreOne(ids: readonly string[]): Promise<void> {
    if (this.restoreAttempted) return;
    this.restoreAttempted = true;
    const generation = ++this.restoreGeneration;
    for (const id of ids) {
      const tab = this.book.tabById(id);
      if (tab?.workspacePath === undefined || tab.warming?.phase !== 'primed' || this.book.selectedId === id || tab.view === undefined || tab.view.webContents.isDestroyed()) continue;
      const contents = tab.view.webContents;
      try {
        const docId = knownCanvasDocId(tab.workspacePath);
        if (docId === undefined || !restoreCanvasEligibleAcrossAllPages(await readSmallExistingCanvasDoc(docId))) continue;
      } catch {
        continue;
      }
      if (generation !== this.restoreGeneration) return;
      if (this.window.quitting || this.window.window.isDestroyed() || this.book.tabById(id) !== tab || this.book.selectedId === id || tab.view?.webContents !== contents || contents.isDestroyed() || tab.warming?.phase !== 'primed') continue;
      const baselineKb = this.memoryKb();
      if (!restoreWithinBudget(baselineKb, baselineKb)) return;
      this.restoring = { tab, contents, baselineKb };
      this.assign(tab);
      const check = (): void => {
        const restoring = this.restoring;
        if (restoring === undefined) return;
        if (this.window.quitting || this.window.window.isDestroyed() || this.book.tabById(id) !== tab || tab.view?.webContents !== restoring.contents || restoring.contents.isDestroyed()) {
          this.cancelRestoration();
          return;
        }
        if (!restoreWithinBudget(restoring.baselineKb, this.memoryKb())) {
          this.cancelRestoration();
          this.views.teardown(id);
          if (tab.view === undefined) this.warmRestoredTab(tab, () => {});
          return;
        }
        this.restoreTimer = unrefTimer(check, 1_000);
      };
      this.restoreTimer = unrefTimer(check, 1_000);
      return;
    }
  }

  cancelRestoration(): void {
    this.restoreGeneration += 1;
    clearTimeout(this.restoreTimer);
    this.restoreTimer = undefined;
    this.restoring = undefined;
  }

  promoteRestored(tab: Tab): boolean {
    if (this.restoring?.tab !== tab) return false;
    this.cancelRestoration();
    this.assign(tab);
    return true;
  }

  /** The tab's last picture laid over it, taking its input, until the returned call (ONL-3031). */
  async freezeTab(contentsId: number): Promise<TabFreeze> {
    const view = this.book.tabForViewId(contentsId)?.view;
    if (view === undefined || !this.isTabShown(contentsId)) return { state: 'not-shown' };
    const image = await view.webContents.capturePage().catch(() => null);
    if (this.window.window.isDestroyed() || !this.isTabShown(contentsId)) return { state: 'not-shown' };
    if (image === null || image.isEmpty()) return { state: 'failed' };
    return { state: 'held', lift: this.window.cover(image) };
  }

  get shownId(): string | undefined {
    return this.machine.shown;
  }

  forgetShown(id: string): void {
    this.dispatch({ type: 'forgotten', tabId: id });
  }

  forgetPresentDeadline(id: string): void {
    const deadline = this.machine.deadline;
    if (deadline.kind === 'armed' && deadline.tabId === id) this.clearPresentDeadline();
  }

  forgetSlots(id: string): void {
    this.slots.forget(id);
  }

  /** A view reported a health of its own, so a paint that failed is no longer the reason it is unwell. */
  healthReported(tab: Tab): void {
    this.dispatch({ type: 'paint-recovered', tab });
  }

  /** The Tab's view is about to be discarded: nothing kept for showing it outlives it. */
  viewDiscarded(tab: Tab): void {
    if (this.restoring?.tab === tab) this.cancelRestoration();
    this.endWatch(tab);
    this.forgetWarm(tab);
    this.forgetShown(tab.id);
    this.dispatch({ type: 'paint-recovered', tab });
    this.forgetSlots(tab.id);
  }
}

/** Already in the window: `showLoading` or an overdue watch put it there before its frame. */
function isPlaced(tab: Tab): boolean {
  return tab.firstPaint?.kind === 'loading';
}
