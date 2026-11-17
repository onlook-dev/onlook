import type { BaseWindow, WebContents } from 'electron';
import {
  IPC_EMIT,
  type ChromeExtent,
  type ChromeExtentApplied,
  type ChromeSlotAction,
  type ChromeSlotsPush,
  type DuplicateProjectRequest,
  type ProjectCreateState,
  type TabAssignment,
  type TabCommand,
  type TabLinkTarget,
  type TabPreview,
  type TabStatus,
  type TabsState,
  type WorkspaceCreated,
} from '@studio/events';
import { seatTabFreezer, type TabFreeze } from '../canvas/capture-view.js';
import { canonicalPath } from '../lib/canonical-path.js';
import { readWindows } from '../location/state.js';
import { announceImportLanding, setNotificationHost } from '../notifications/index.js';
import { setTelemetryRendererWorkspace } from '../telemetry/index.js';
import { setTurnSeenLocator, type ProjectPresence } from '../telemetry/turn-seen.js';
import { setViewSource } from '../window/host.js';
import type { ProjectCreateRequest } from '../workspace/create-project.js';
import { focusBackgroundTab } from './background-focus.js';
import { setRendererSource } from './broadcast.js';
import { installChordHint, type ChordHint } from './chord-hint.js';
import { confirmClose } from './close-dialog.js';
import { composeTabs, type TabPieces } from './compose.js';
import { registerTabIpc } from './ipc.js';
import { retireWorktree } from './retire.js';
import { send } from './send.js';
import { tabTarget } from './shortcuts.js';
import { observeTabSignals, type TabCommandSource } from './signals.js';
import type { TabCloseMethod, TabCreateMethod, TabSelectMethod } from './telemetry.js';
import type { TabViewPool } from './view-pool.js';
import { workspaceOf } from './views.js';
import { TabWindow } from './window.js';

/** The window's Tabs: one call into the piece that owns each job. `compose.ts` builds the pieces and fills their ports. */
export class TabHost {
  private readonly pieces: TabPieces;

  constructor() {
    this.pieces = composeTabs({
      window: (events) => new TabWindow(events),
      saved: readWindows()[0],
      confirmClose,
      retire: retireWorktree,
    });
  }

  get chordHint(): ChordHint {
    return this.pieces.chordHint;
  }

  get window(): BaseWindow {
    return this.pieces.window.window;
  }

  get chromeContents(): WebContents {
    return this.pieces.window.chromeContents;
  }

  isBandContents(webContentsId: number): boolean {
    return this.pieces.window.isBandContents(webContentsId);
  }

  expand(extent: ChromeExtent): ChromeExtentApplied {
    return this.pieces.window.expand(extent);
  }

  show(): void {
    this.pieces.window.show();
  }

  state(): TabsState {
    return this.pieces.strip.state();
  }

  previewOf(tabId: string): TabPreview {
    return this.pieces.strip.previewOf(tabId);
  }

  rename(tabId: string, name: string): void {
    this.pieces.strip.rename(tabId, name);
  }

  reorder(tabId: string, toIndex: number): void {
    this.pieces.strip.reorder(tabId, toIndex);
  }

  noteContext(viewId: number, repoIdentity: string | undefined): void {
    this.pieces.strip.noteContext(viewId, repoIdentity);
  }

  noteWorking(cwd: string, isWorking: boolean): void {
    this.pieces.strip.noteWorking(cwd, isWorking);
  }

  noteStatus(cwd: string, status: TabStatus | undefined): void {
    this.pieces.strip.noteStatus(cwd, status);
  }

  noteLabelsChanged(): void {
    this.pieces.strip.broadcast();
  }

  get openTabCount(): number {
    return this.pieces.book.openTabCount;
  }

  tabForWorkspace(workspacePath: string): string | undefined {
    return this.pieces.book.tabForWorkspace(workspacePath);
  }

  createFromFor(tabId: string): string | undefined {
    return this.pieces.book.createFromFor(tabId);
  }

  contentsFor(id: string): WebContents | undefined {
    return this.pieces.book.contentsFor(id);
  }

  activeContents(): WebContents | undefined {
    return this.pieces.book.activeContents();
  }

  everyRenderer(): WebContents[] {
    return this.pieces.views.everyRenderer();
  }

  viewRoles(): ReturnType<TabViewPool['viewRoles']> {
    return this.pieces.views.viewRoles();
  }

  firstPaintSources(): WebContents[] {
    return this.pieces.views.firstPaintSources();
  }

  reload(id: string): void {
    this.pieces.views.reload(id);
  }

  /** Armed once the window is up, and with it the warming of the Tabs a relaunch restored cold. */
  armSpare(): void {
    this.pieces.views.arm();
    this.pieces.presentation.warmRestored();
  }

  beginQuit(): void {
    this.pieces.window.beginQuit();
    this.pieces.presentation.clearPresentDeadline();
    this.pieces.views.dispose();
  }

  activate(id: string, method: TabSelectMethod = 'click', tookSpare = false): void {
    this.pieces.activation.activate(id, method, tookSpare);
  }

  assignmentFrom(sender: WebContents): TabAssignment | null {
    return this.pieces.presentation.assignmentFrom(sender);
  }

  handleSlots(sender: WebContents, push: ChromeSlotsPush): void {
    this.pieces.presentation.handleSlots(sender, push);
  }

  freezeTab(contentsId: number): Promise<TabFreeze> {
    return this.pieces.presentation.freezeTab(contentsId);
  }

  onScreenFrom(sender: WebContents): { isOnScreen: boolean } {
    return this.pieces.presence.onScreenFrom(sender);
  }

  presenceFor(cwd: string): ProjectPresence {
    return this.pieces.presence.presenceFor(cwd);
  }

  open(createFrom?: string, method: TabCreateMethod = 'launch', request?: ProjectCreateRequest): string | undefined {
    return this.pieces.opener.open(createFrom, method, request);
  }

  openFromActive(method: 'plus' | 'hotkey' = 'plus'): string | undefined {
    return this.pieces.opener.openFromActive(method);
  }

  openBackground(createFrom: string, method: TabCreateMethod): Promise<WorkspaceCreated | null> | 'at-limit' | undefined {
    return this.pieces.opener.openBackground(createFrom, method);
  }

  revealWorkspace(target: TabLinkTarget): boolean {
    return this.pieces.opener.revealWorkspace(target);
  }

  restoreSaved(): void {
    this.pieces.opener.restoreSaved();
  }

  reopenClosed(): void {
    this.pieces.closer.reopenClosed();
  }

  closeActive(): void {
    this.pieces.closer.closeActive();
  }

  requestClose(id: string, method: TabCloseMethod = 'close_button'): Promise<boolean> {
    return this.pieces.closer.requestClose(id, method);
  }

  closeForWorkspace(workspacePath: string): Promise<boolean> {
    return this.pieces.closer.closeForWorkspace(workspacePath);
  }

  createInTab(viewId: number, request: ProjectCreateRequest): void {
    this.pieces.opens.createInTab(viewId, request);
  }

  duplicateInTab(viewId: number, request: DuplicateProjectRequest): void {
    this.pieces.opens.duplicateInTab(viewId, request);
  }

  retryCreate(viewId: number): void {
    this.pieces.opens.retryCreate(viewId);
  }

  dismissCreate(viewId: number): void {
    this.pieces.opens.dismissCreate(viewId);
  }

  createStateFor(sender: WebContents): ProjectCreateState | null {
    return this.pieces.opens.createStateFor(sender);
  }

  setDraftCreating(isCreating: boolean): void {
    this.pieces.opens.setDraftCreating(isCreating);
  }

  beginDraftCreation(): boolean {
    return this.pieces.opens.beginDraftCreation();
  }

  newDraft(): void {
    this.pieces.opens.newDraft();
  }

  takeDraftRequest(senderId: number): boolean {
    return this.pieces.opens.takeDraftRequest(senderId);
  }

  reserveProjectOpen(viewId: number, workspacePath: string): boolean {
    return this.pieces.opens.reserveProjectOpen(viewId, workspacePath);
  }

  releaseProjectOpen(viewId: number, workspacePath?: string): void {
    this.pieces.opens.releaseProjectOpen(viewId, workspacePath);
  }

  noteWorkspace(viewId: number, workspacePath: string | undefined): void {
    this.pieces.opens.noteWorkspace(viewId, workspacePath);
  }

  revealSettings(): void {
    this.pieces.settingsRequest.reveal();
  }

  takeSettingsRequest(senderId: number): boolean {
    return this.pieces.settingsRequest.take(senderId);
  }

  handleCommand(command: TabCommand, source: TabCommandSource): boolean {
    if (!this.window.isFocused()) return false;
    if ('windowId' in source) {
      if (source.windowId !== this.window.id) return false;
    } else if (source.viewId !== this.chromeContents.id && source.viewId !== this.activeContents()?.id) {
      return false;
    }
    if (command.kind === 'new') {
      if (!this.state().canCreate) return true;
      this.openFromActive('hotkey');
    } else if (command.kind === 'reopen') {
      this.reopenClosed();
    } else {
      const id = tabTarget(this.state().tabs, this.pieces.book.selectedId, command);
      if (id === undefined || id === this.pieces.book.selectedId) return true;
      this.activate(id, command.kind === 'jump' ? 'hotkey_jump' : 'hotkey_cycle');
      this.pieces.chordHint.noteSwap();
    }
    this.activeContents()?.focus();
    return true;
  }

  handleAction(action: ChromeSlotAction): void {
    if (!this.pieces.book.hasReachedProduct()) return;
    if (action.slot === 'folder') {
      this.pieces.opener.goHome();
      return;
    }
    if (action.tabId !== this.pieces.book.selectedId || action.tabId !== this.pieces.presentation.shownId) return;
    const contents = this.contentsFor(action.tabId);
    if (contents) send(contents, IPC_EMIT.chromeActionForwarded, action);
  }
}

let host: TabHost | undefined;

export function createTabHost(): TabHost {
  host = new TabHost();
  setNotificationHost({
    locate: (cwd) => {
      const state = host?.state();
      const ownerId = host?.tabForWorkspace(cwd);
      const owner = state?.tabs.find((tab) => tab.id === ownerId);
      if (owner === undefined || host === undefined) return undefined;
      const active = state?.tabs.find((tab) => tab.id === state.activeId);
      return { tabId: owner.id, name: owner.name, focused: host.window.isFocused(), activeProject: active?.workspacePath !== undefined && canonicalPath(active.workspacePath) === canonicalPath(cwd) };
    },
    toast: (notice) => host?.activeContents()?.send(IPC_EMIT.tabNotice, notice),
    open: (tabId) => {
      if (host === undefined || !host.state().tabs.some((tab) => tab.id === tabId)) return false;
      host.activate(tabId);
      focusBackgroundTab(host.window, host.activeContents());
      return true;
    },
  });
  setTurnSeenLocator((cwd) => host?.presenceFor(cwd));
  setTelemetryRendererWorkspace(workspaceOf);
  installChordHint(host.chordHint);
  // The window is a `BaseWindow` of views; fan-out or a lookup written against `BrowserWindow` reaches none of them (ONL-2206).
  setRendererSource(() => host?.everyRenderer() ?? []);
  seatTabFreezer((contentsId) => host?.freezeTab(contentsId) ?? Promise.resolve({ state: 'not-shown' }));
  setViewSource({
    active: () => host?.activeContents(),
    all: () => host?.everyRenderer() ?? [],
  });
  observeTabSignals({
    workspace: (viewId, workspacePath) => {
      host?.noteWorkspace(viewId, workspacePath);
      // A Tab naming its Project is where an import's landing becomes announceable (ONL-3182).
      if (workspacePath !== undefined) announceImportLanding(workspacePath);
    },
    working: (cwd, isWorking) => host?.noteWorking(cwd, isWorking),
    status: (cwd, status) => host?.noteStatus(cwd, status),
    closeActive: () => host?.closeActive(),
    labels: () => host?.noteLabelsChanged(),
    command: (command, source) => host?.handleCommand(command, source) ?? false,
    backgroundTab: (sourcePath) => host?.openBackground(sourcePath, 'agent'),
    settings: () => host?.revealSettings(),
  });

  registerTabIpc(host);
  return host;
}

export function tabHost(): TabHost | undefined {
  return host;
}
