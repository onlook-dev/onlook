import type { WebContents } from 'electron';
import {
  IPC_EMIT,
  MAX_PROJECT_TABS,
  workspaceDisplayName,
  type DuplicateProjectRequest,
  type ProjectCreateState,
} from '@studio/events';
import type { TurnSeenShownBy } from '../telemetry/events.js';
import {
  appProjectCreateDeps,
  projectCreations,
  type ProjectCreateDeps,
  type ProjectCreateRequest,
} from '../workspace/create-project.js';
import { isRemovingProject } from '../workspace/remove-project.js';
import { knownProject, projectAt } from '../workspace/store.js';
import type { TabBook } from './book.js';
import { sendToRenderer } from './broadcast.js';
import { send } from './send.js';
import type { Tab } from './tab.js';
import type { TabCloseMethod, TabCreateMethod, TabSelectMethod } from './telemetry.js';
import type { TabViewPool } from './view-pool.js';

/** The verbs a Project landing in a Tab can end in, and who is told. */
export interface ProjectOpensPort {
  open(createFrom: string, method: TabCreateMethod, request: ProjectCreateRequest): string | undefined;
  activate(id: string, method: TabSelectMethod): void;
  close(id: string, method: TabCloseMethod): void;
  /** The selected Tab now shows a Project. */
  projectShown(by: TurnSeenShownBy): void;
  tabsChanged(): void;
}

/** What happens when a Tab is asked to open or create a Project: the limit, the draft in flight, the opens reserved ahead of their landing, and the landing itself. */
export class ProjectOpens {
  private readonly book: TabBook;
  private readonly views: TabViewPool;
  private readonly port: ProjectOpensPort;

  /** Held until taken: a Projects view still mounting misses the push, and pulls it instead. */
  private draftRequestFor: string | undefined;
  private isCreatingDraft = false;
  private readonly reservations = new Map<number, Map<string, number>>();

  constructor(book: TabBook, views: TabViewPool, port: ProjectOpensPort) {
    this.book = book;
    this.views = views;
    this.port = port;
  }

  createInTab(viewId: number, request: ProjectCreateRequest): void {
    const tab = this.book.tabForViewId(viewId);
    if (!tab) return;
    // The projects-list tab becomes a project here, so it counts against the limit.
    if (tab.workspacePath === undefined && this.isAtProjectLimit()) return;
    this.views.noteActivity(tab.id);
    this.startCreate(tab, request);
  }

  duplicateInTab(viewId: number, request: DuplicateProjectRequest): void {
    if (this.book.tabForViewId(viewId) === undefined || this.isAtProjectLimit()) return;
    if (request === null || typeof request !== 'object' || Array.isArray(request)
      || typeof request.workspacePath !== 'string' || request.workspacePath.length === 0) return;
    const source = knownProject(request.workspacePath);
    if (source === undefined || !projectAt(source.workspacePath).ok || isRemovingProject(source.workspacePath)) return;
    this.port.open(source.workspacePath, 'projects_view', {
      sourcePath: source.workspacePath, duplicateSourceName: workspaceDisplayName(source),
      ...(source.comfort === undefined ? {} : { comfort: source.comfort }), entryPoint: 'projects',
    });
  }

  startCreate(tab: Tab, request: ProjectCreateRequest): void {
    const contents = tab.view?.webContents;
    if (contents === undefined) return;
    // Without this `canCreate` is false until the cut lands, and the `+` just pressed vanishes for the whole cut (ONL-2312).
    this.book.setContextSource(tab, request.sourcePath);
    void projectCreations.start(tab.id, request, this.depsFor(tab, contents));
  }

  retryCreate(viewId: number): void {
    const tab = this.book.tabForViewId(viewId);
    if (!tab?.view) return;
    void projectCreations.retry(tab.id, this.depsFor(tab, tab.view.webContents));
  }

  dismissCreate(viewId: number): void {
    const tab = this.book.tabForViewId(viewId);
    if (!tab?.view) return;
    projectCreations.dismiss(tab.id, this.depsFor(tab, tab.view.webContents));
  }

  private depsFor(tab: Tab, contents: WebContents): ProjectCreateDeps {
    return appProjectCreateDeps(contents, (state: ProjectCreateState | null) => {
      if (!this.book.hasTab(tab.id)) return;
      sendToRenderer(contents, IPC_EMIT.tabsCreateChanged, state);
      this.port.tabsChanged();
    });
  }

  setDraftCreating(isCreating: boolean): void {
    if (this.isCreatingDraft === isCreating) return;
    this.isCreatingDraft = isCreating;
    this.port.tabsChanged();
  }

  beginDraftCreation(): boolean {
    if (!this.book.hasReachedProduct() || this.isAtProjectLimit() || this.isCreatingDraft) return false;
    this.setDraftCreating(true);
    return true;
  }

  reserveProjectOpen(viewId: number, workspacePath: string): boolean {
    const tab = this.book.tabForViewId(viewId);
    if (tab === undefined) return false;
    if (tab.workspacePath !== undefined || this.book.tabForWorkspace(workspacePath) !== undefined) return true;
    if (!this.reservations.has(viewId) && this.isAtProjectLimit()) return false;
    const targets = this.reservations.get(viewId) ?? new Map<string, number>();
    targets.set(workspacePath, (targets.get(workspacePath) ?? 0) + 1);
    this.reservations.set(viewId, targets);
    this.port.tabsChanged();
    return true;
  }

  releaseProjectOpen(viewId: number, workspacePath?: string): void {
    const targets = this.reservations.get(viewId);
    if (targets === undefined) return;
    if (workspacePath !== undefined) {
      const count = targets.get(workspacePath) ?? 0;
      if (count > 1) targets.set(workspacePath, count - 1);
      else targets.delete(workspacePath);
      if (targets.size > 0) return;
    }
    this.reservations.delete(viewId);
    this.port.tabsChanged();
  }

  newDraft(): void {
    if (!this.book.hasReachedProduct() || this.isAtProjectLimit() || this.isCreatingDraft) return;
    this.draftRequestFor = this.book.selectedId;
    const contents = this.book.selectedId === undefined ? undefined : this.book.contentsFor(this.book.selectedId);
    if (contents !== undefined) send(contents, IPC_EMIT.tabsDraftRequested);
  }

  takeDraftRequest(senderId: number): boolean {
    const id = this.draftRequestFor;
    if (id === undefined || this.book.contentsFor(id)?.id !== senderId) return false;
    this.draftRequestFor = undefined;
    return true;
  }

  /** Every door that adds a project tab asks this. */
  isAtProjectLimit(): boolean {
    return this.book.projectTabCount() + Number(this.isCreatingDraft) + this.reservations.size >= MAX_PROJECT_TABS;
  }

  noteWorkspace(viewId: number, workspacePath: string | undefined): void {
    const tab = this.book.tabForViewId(viewId);
    if (!tab) return;
    const hadReservation = this.reservations.delete(viewId);
    if (workspacePath === undefined) {
      const hadWorkspace = tab.workspacePath !== undefined;
      this.book.setWorkspace(tab, undefined);
      // A record left behind keeps drawing a chip, and an unfinished cut lands a worktree nobody sees (ONL-2244).
      const released = projectCreations.release(tab.id);
      // ⚠️ The home tab reports this on every mount; persisting an unchanged report writes back a restore that dropped an entry (ONL-2208).
      if (!hadWorkspace && !released) {
        if (hadReservation) this.port.tabsChanged();
        return;
      }
      this.port.tabsChanged();
      this.book.persist();
      return;
    }
    // One tab per worktree: the session map, view routing and frame mirror are each keyed by project.
    const existing = this.book.tabForWorkspace(workspacePath);
    if (existing !== undefined && existing !== tab.id) {
      const wasFresh = tab.workspacePath === undefined;
      this.port.activate(existing, 'click');
      if (wasFresh) this.port.close(tab.id, 'switch');
      return;
    }
    this.book.setWorkspace(tab, workspacePath);
    this.port.tabsChanged();
    // Where a tab ACQUIRES its identity; without this a single-tab launch restores nothing (ONL-2208).
    this.book.persist();
    if (tab.id === this.book.selectedId) this.port.projectShown('project_opened');
  }

  createStateFor(sender: WebContents): ProjectCreateState | null {
    const id = this.book.tabFor(sender)?.id;
    return (id === undefined ? undefined : projectCreations.stateFor(id)) ?? null;
  }

  get draftCreating(): boolean {
    return this.isCreatingDraft;
  }

  get reservedOpenCount(): number {
    return this.reservations.size;
  }
}
