import { app } from 'electron';
import {
  IPC_EMIT,
  MAX_PROJECT_TABS,
  selectedWorkspaceFor,
  type TabPreview,
  type TabStatus,
  type TabSummary,
  type TabsState,
} from '@studio/events';
import { projectThumbnail } from '../canvas/thumbnail/index.js';
import { canonicalPath } from '../lib/canonical-path.js';
import { gitStatusCadence } from '../git-status/cadence.js';
import { readGitPillDefaults } from '../git-status/defaults.js';
import { gitStatusRowFor } from '../git-status/store.js';
import { renameProjectByUser } from '../workspace/rename.js';
import { listWorkspaces } from '../workspace/store.js';
import type { TabBook } from './book.js';
import { updateDockBadge } from './dock-badge.js';
import { logger } from './log.js';
import { tabName } from './name.js';
import { reorderedTabs } from './reorder.js';
import { send } from './send.js';
import { statusToRecord } from './status.js';
import type { TabViewPool } from './view-pool.js';
import { visibleWorktree } from './visible.js';

/** The facts about the strip that live with other pieces. */
export interface TabStripFacts {
  isCreatingDraft(): boolean;
  reservedOpenCount(): number;
  canReopen(): boolean;
}

/** What the strip shows: one chip per Tab, what each says, and the telling of every renderer when any of it moves. */
export class TabStrip {
  private readonly book: TabBook;
  private readonly views: TabViewPool;
  private readonly facts: TabStripFacts;

  constructor(book: TabBook, views: TabViewPool, facts: TabStripFacts) {
    this.book = book;
    this.views = views;
    this.facts = facts;
  }

  state(): TabsState {
    const tabs: TabSummary[] = this.book.tabIds.flatMap((id) => {
      const tab = this.book.tabById(id);
      if (!tab) return [];
      const summary: TabSummary = { id: tab.id, name: tabName(tab), purpose: this.book.purposeOf(tab) };
      if (tab.isWorking) summary.isWorking = true;
      if (tab.status !== undefined) summary.status = tab.status;
      if (tab.health !== undefined) summary.health = tab.health;
      if (tab.workspacePath !== undefined) summary.workspacePath = tab.workspacePath;
      return [summary];
    });
    const selectedId = this.book.selectedId;
    const active = selectedId === undefined ? undefined : this.book.tabById(selectedId);
    const isCreatingDraft = this.facts.isCreatingDraft();
    const base = {
      tabs,
      canCreate: !isCreatingDraft && this.book.sourceForActive() !== undefined && tabs.filter((tab) => tab.purpose === 'project').length + this.facts.reservedOpenCount() < MAX_PROJECT_TABS,
      isCreatingDraft,
      isHome: active === undefined || this.book.purposeOf(active) === 'projects',
      ...(this.facts.canReopen() ? { canReopen: true as const } : {}),
    };
    return selectedId === undefined ? base : { ...base, activeId: selectedId };
  }

  previewOf(tabId: string): TabPreview {
    const path = this.book.tabById(tabId)?.workspacePath;
    if (path === undefined) return {};
    const thumb = projectThumbnail(path);
    const row = gitStatusRowFor(path);
    return {
      ...(thumb === undefined ? {} : { previewUrl: thumb.url, editedAt: new Date(thumb.mtimeMs).toISOString() }),
      ...(row === undefined ? {} : { git: { row, defaults: readGitPillDefaults() } }),
    };
  }

  broadcast(): void {
    const state = this.state();
    updateDockBadge(state, app.dock);
    gitStatusCadence()?.aim(visibleWorktree(state));
    for (const contents of this.views.everyRenderer()) {
      send(contents, IPC_EMIT.tabsChanged, state);
    }
  }

  noteContext(viewId: number, repoIdentity: string | undefined): void {
    const tab = this.book.tabForViewId(viewId);
    if (!tab) return;
    this.views.noteActivity(tab.id);
    const source =
      repoIdentity === undefined
        ? undefined
        : selectedWorkspaceFor({ kind: 'workspace', repoIdentity }, listWorkspaces())?.sourcePath;
    this.book.setContextSource(tab, source);
    this.broadcast();
  }

  noteWorking(cwd: string, isWorking: boolean): void {
    const key = canonicalPath(cwd);
    let changed = false;
    for (const tab of this.book.everyTab()) {
      if (tab.workspacePath === undefined) continue;
      if (canonicalPath(tab.workspacePath) !== key) continue;
      // An agent reaching this project is activity, whether or not the flag moved.
      this.views.noteActivity(tab.id);
      if (tab.idle !== undefined) void this.views.resume(tab).catch((error: unknown) => logger.warn('resuming a working tab failed', { tab_id: tab.id, error }));
      if (tab.isWorking === isWorking) continue;
      this.book.setWorking(tab, isWorking);
      changed = true;
    }
    if (changed) this.broadcast();
  }

  noteStatus(cwd: string, status: TabStatus | undefined): void {
    const key = canonicalPath(cwd);
    let changed = false;
    for (const tab of this.book.everyTab()) {
      if (tab.workspacePath === undefined) continue;
      if (canonicalPath(tab.workspacePath) !== key) continue;
      this.views.noteActivity(tab.id);
      if (tab.idle !== undefined) void this.views.resume(tab).catch((error: unknown) => logger.warn('resuming a changed tab failed', { tab_id: tab.id, error }));
      const next = statusToRecord(status, tab.id === this.book.selectedId);
      if (tab.status === next) continue;
      this.book.setStatus(tab, next);
      changed = true;
    }
    if (changed) this.broadcast();
  }

  /** Renaming a tab renames its project; there is no separate tab name. */
  rename(tabId: string, name: string): void {
    const tab = this.book.tabById(tabId);
    if (!tab || tab.workspacePath === undefined) return;
    renameProjectByUser(tab.workspacePath, name);
  }

  /** `toIndex` counts PROJECT tabs — the only sequence the user sees; `reorderedTabs` maps it onto the full order (ONL-2364). */
  reorder(tabId: string, toIndex: number): void {
    const visible = this.state().tabs.filter((tab) => tab.purpose === 'project').map((tab) => tab.id);
    const next = reorderedTabs(this.book.tabIds, visible, tabId, toIndex);
    if (next === this.book.tabIds) return;
    this.book.reorder(next);
    this.broadcast();
    // The drag landed in memory only until here; the new order is what relaunch reads (ONL-2324).
    this.book.persist();
  }
}
