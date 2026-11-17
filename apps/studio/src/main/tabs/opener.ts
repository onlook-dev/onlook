import type { WebContentsView } from 'electron';
import type { TabLinkTarget, WindowRecord, WorkspaceCreated } from '@studio/events';
import { readOnboardingState } from '../onboarding/state.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { projectCreations, type ProjectCreateRequest } from '../workspace/create-project.js';
import { isRemovingProject } from '../workspace/remove-project.js';
import { knownProject, listWorkspaces, projectAt } from '../workspace/store.js';
import type { TabBook } from './book.js';
import { birthFacts, loadTab } from './load.js';
import type { TabPresentation } from './presentation.js';
import type { ProjectOpens } from './project-opens.js';
import { planRestore } from './restore.js';
import { revealsOnPaint } from './reveal.js';
import type { Tab } from './tab.js';
import { tabCreated, type TabCreateMethod, type TabSelectMethod } from './telemetry.js';
import type { TabViewPool } from './view-pool.js';
import type { TabWindow } from './window.js';

export interface TabOpenerPort {
  activate(id: string, method: TabSelectMethod, tookSpare?: boolean): void;
  /** Whether the strip offers a new Tab from the selected one. */
  canCreate(): boolean;
  tabsChanged(): void;
}

/** Every way a Tab comes to exist: a new one with its view, a link to a Project, and the Tabs a relaunch brings back. */
export class TabOpener {
  private readonly book: TabBook;
  private readonly window: TabWindow;
  private readonly views: TabViewPool;
  private readonly presentation: TabPresentation;
  private readonly opens: ProjectOpens;
  private readonly port: TabOpenerPort;

  constructor(book: TabBook, window: TabWindow, views: TabViewPool, presentation: TabPresentation, opens: ProjectOpens, port: TabOpenerPort) {
    this.book = book;
    this.window = window;
    this.views = views;
    this.presentation = presentation;
    this.opens = opens;
    this.port = port;
  }

  open(createFrom?: string, method: TabCreateMethod = 'launch', request?: ProjectCreateRequest): string | undefined {
    if (createFrom !== undefined && this.opens.isAtProjectLimit()) return undefined;
    const spare = createFrom === undefined ? undefined : this.views.takeSpare();
    // The tab takes the spare's id: its renderer answers only to the id it was born with (ONL-2318).
    let id: string;
    let view: WebContentsView;
    const purpose = createFrom === undefined ? 'projects' : 'parked';
    const holdsBack = purpose === 'projects'
      ? this.window.window.isVisible()
      : revealsOnPaint({ ...(spare === undefined ? {} : { spare }), isParked: true });
    if (spare === undefined) {
      id = this.book.nextTabId();
      view = this.views.newView(!holdsBack);
      if (holdsBack) {
        if (purpose === 'projects') this.window.attach(view, 0);
        else view.setVisible(false);
      }
    } else {
      ({ id, view } = spare);
    }
    const tab: Tab = { id, isWorking: false };
    this.views.adopt(tab, view);
    if (holdsBack) this.presentation.holdBack(tab);
    this.book.enter(tab);
    this.window.layout();
    // Held back until it paints: revealed at creation it shows bare ground for the whole bundle load (ONL-2318).
    if (holdsBack) this.presentation.revealWhenPainted(tab, view);
    if (spare === undefined) loadTab(view.webContents, birthFacts(id, purpose));
    // Before the reveal, so the tab's first broadcast already carries the create phase (ONL-2244).
    if (createFrom !== undefined)
      this.opens.startCreate(tab, request ?? { sourcePath: createFrom, entryPoint: 'band' });
    capture('tab_created', tabCreated({ tab, openCount: this.book.openTabCount, method }, resolveWorkspaceTelemetryProperties));
    // ⚠️ Every `open` not waiting on a paint re-arms here, home included; a held-back one re-arms in `revealWhenPainted`, and one that misses both leaves no spare.
    if (!holdsBack) this.views.scheduleSpare();
    this.port.activate(id, 'tab_created', spare !== undefined);
    this.book.persist();
    return id;
  }

  openFromActive(method: 'plus' | 'hotkey' = 'plus'): string | undefined {
    if (!this.port.canCreate()) return undefined;
    return this.open(this.book.sourceForActive(), method);
  }

  /** Answers the landing, so a caller can report an identity that exists (ONL-2212). */
  openBackground(createFrom: string, method: TabCreateMethod): Promise<WorkspaceCreated | null> | 'at-limit' | undefined {
    if (this.opens.isAtProjectLimit()) return 'at-limit';
    const keep = this.book.selectedId;
    const id = this.open(createFrom, method);
    if (id === undefined) return undefined;
    if (keep !== undefined && keep !== id) this.port.activate(keep, 'agent');
    return projectCreations.landing(id) ?? Promise.resolve(null);
  }

  goHome(): void {
    for (const tab of this.book.everyTab()) {
      if (this.book.purposeOf(tab) === 'projects') {
        this.port.activate(tab.id, 'click');
        return;
      }
    }
    this.open(undefined, 'projects_view');
  }

  /** One worktree, named exactly: a repo identity alone cannot say which tab it means (ONL-2212). */
  revealWorkspace(target: TabLinkTarget): boolean {
    const matches = (path: string | undefined): boolean => {
      if (path === undefined) return false;
      const workspace = knownProject(path);
      return (
        workspace?.repoIdentity === target.repoIdentity &&
        workspace.workspaceName === target.workspaceName
      );
    };
    const open = this.book.tabIds.find((id) => matches(this.book.tabById(id)?.workspacePath));
    if (open !== undefined) {
      this.port.activate(open, 'agent');
      return true;
    }
    const record = listWorkspaces()
      .find((summary) => summary.repoIdentity === target.repoIdentity)
      ?.projects.find((project) => !project.missing && matches(project.workspacePath));
    if (record === undefined || this.opens.isAtProjectLimit()) return false;
    // A link the agent printed can arrive mid-teardown, and the tab would land on a deleted path (ONL-2315).
    if (isRemovingProject(record.workspacePath)) return false;
    const id = this.book.nextTabId();
    this.book.enter({ id, workspacePath: record.workspacePath, isWorking: false });
    this.port.activate(id, 'agent');
    this.book.persist();
    return true;
  }

  restoreSaved(): void {
    try {
      if (this.book.isUsable()) this.restore(this.book.saved);
    } finally {
      // ⚠️ `finally`: a throw in the restore that left this set would silently stop the session persisting anything at all.
      this.book.finishBoot();
    }
  }

  /** Cold, never warm: a restored tab starts no backend until its first activation (ONL-2208). */
  restore(record: WindowRecord | undefined): void {
    const plan = planRestore(record, {
      exists: (workspacePath) => projectAt(workspacePath).ok,
      isOpen: (workspacePath) => this.book.tabForWorkspace(workspacePath) !== undefined,
    });
    for (const entry of plan.tabs) {
      const id = this.book.nextTabId();
      this.book.enter({ id, workspacePath: entry.workspacePath, isWorking: false });
      capture(
        'tab_created',
        tabCreated(
          { tab: { workspacePath: entry.workspacePath, isWorking: false }, openCount: this.book.openTabCount, method: 'restore' },
          resolveWorkspaceTelemetryProperties,
        ),
      );
    }
    // Nothing written back: an entry dropped here may be transiently missing, like an unmounted drive (ONL-2208).
    const active = plan.activate === undefined ? undefined : this.book.tabForWorkspace(plan.activate);
    // Not onboarded: the flow owns the window, and a restored tab would activate in front of it.
    if (active !== undefined && readOnboardingState().hasOnboarded) this.port.activate(active, 'click');
    this.port.tabsChanged();
  }
}
