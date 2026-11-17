import type { WebContents } from 'electron';
import type { TabStatus, WindowRecord } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { hasAccountRecord, hasOnlookSession } from '../cloud/access.js';
import { hasUnsavedCode } from '../code/dirty.js';
import { writeWindows } from '../location/state.js';
import { readOnboardingState } from '../onboarding/state.js';
import { projectCreations } from '../workspace/create-project.js';
import { knownProject } from '../workspace/store.js';
import { createFromSource } from './create-from.js';
import { tabDecisions, type TabDecisions } from './decisions.js';
import { windowRecordFor } from './persist.js';
import { rekeyed } from './rekey.js';
import type { Owned, Tab } from './tab.js';

type Identity = Owned<'workspacePath' | 'status' | 'contextSource' | 'isWorking'>;

const own = (tab: Tab): Identity => tab as Identity;

/** Which Tabs exist, their order, which is selected, and the record a relaunch restores them from. */
export class TabBook {
  private readonly tabs = new Map<string, Tab>();
  private order: string[] = [];
  private activeId: string | undefined;
  private seq = 0;

  /** Read before anything this window does can reach the record (ONL-2208). */
  readonly saved: WindowRecord | undefined;

  /** Cleared by `finishBoot`; until then nothing persists, because the home tab is all there is to persist. */
  private isBooting = true;

  constructor(saved: WindowRecord | undefined) {
    this.saved = saved;
  }

  get openTabCount(): number {
    return this.order.length;
  }

  /** Every record held, which trails `openTabCount` by one while a Tab is closing. */
  get recordCount(): number {
    return this.tabs.size;
  }

  tabById(id: string): Tab | undefined {
    return this.tabs.get(id);
  }

  hasTab(id: string): boolean {
    return this.tabs.has(id);
  }

  everyTab(): IterableIterator<Tab> {
    return this.tabs.values();
  }

  get tabIds(): readonly string[] {
    return this.order;
  }

  get selectedId(): string | undefined {
    return this.activeId;
  }

  select(id: string | undefined): void {
    this.activeId = id;
  }

  nextTabId(): string {
    this.seq += 1;
    return `tab-${String(this.seq)}`;
  }

  /** At the end of the order, or at `index` for a Tab coming back to where it was closed. */
  enter(tab: Tab, index?: number): void {
    this.tabs.set(tab.id, tab);
    if (index === undefined) this.order.push(tab.id);
    else this.order.splice(index, 0, tab.id);
  }

  /** The record goes first; `unlist` takes its place in the order once the close has released what the Tab held. */
  remove(id: string): void {
    this.tabs.delete(id);
  }

  unlist(id: string): void {
    this.order = this.order.filter((entry) => entry !== id);
  }

  reorder(next: readonly string[]): void {
    this.order = [...next];
  }

  /** A new record under `to`, holding the old one's place in the order and the selection. */
  rekey(tab: Tab, to: string): Tab {
    const from = tab.id;
    if (from === to) return tab;
    const moved: Tab = { ...tab, id: to };
    this.tabs.delete(from);
    this.tabs.set(to, moved);
    const keying = rekeyed({ order: this.order, activeId: this.activeId }, from, to);
    this.order = [...keying.order];
    this.activeId = keying.activeId;
    return moved;
  }

  setWorkspace(tab: Tab, workspacePath: string | undefined): void {
    if (workspacePath === undefined) delete own(tab).workspacePath;
    else own(tab).workspacePath = workspacePath;
  }

  setContextSource(tab: Tab, source: string | undefined): void {
    if (source === undefined) delete own(tab).contextSource;
    else own(tab).contextSource = source;
  }

  setWorking(tab: Tab, isWorking: boolean): void {
    own(tab).isWorking = isWorking;
  }

  setStatus(tab: Tab, status: TabStatus | undefined): void {
    own(tab).status = status;
  }

  decisionsFor(tab: Tab): TabDecisions {
    return tabDecisions({
      hasUnsavedCode: hasUnsavedCode(tab.view?.webContents.id),
      isWorking: tab.isWorking,
      status: tab.status,
      ...(tab.workspacePath === undefined ? {} : { workspacePath: tab.workspacePath }),
      isCreating: projectCreations.inFlight(tab.id),
      hasCreation: projectCreations.stateFor(tab.id) !== undefined,
    });
  }

  purposeOf(tab: Tab): 'projects' | 'project' {
    return this.decisionsFor(tab).purpose;
  }

  /** The projects-list tab is not a project and never counts. */
  projectTabCount(): number {
    let count = 0;
    for (const id of this.order) {
      const tab = this.tabs.get(id);
      if (tab !== undefined && this.purposeOf(tab) === 'project') count += 1;
    }
    return count;
  }

  hasReachedProduct(): boolean {
    return hasOnlookSession() && hasAccountRecord() && readOnboardingState().hasOnboarded;
  }

  /** The account record ALONE: Reset Studio clears onboarding and nothing else, and widening that once cost users every project (ONL-2123). */
  isUsable(): boolean {
    return hasAccountRecord();
  }

  sourceForActive(): string | undefined {
    return this.activeId === undefined ? undefined : this.createFromFor(this.activeId);
  }

  createFromFor(tabId: string): string | undefined {
    const tab = this.tabs.get(tabId);
    return tab === undefined ? undefined : createFromSource(tab);
  }

  activeWorkspacePath(): string | undefined {
    return this.activeId === undefined ? undefined : this.tabs.get(this.activeId)?.workspacePath;
  }

  heldByAnotherTab(workspacePath: string, except: string): boolean {
    const key = canonicalPath(workspacePath);
    for (const tab of this.tabs.values()) {
      if (tab.id === except || tab.workspacePath === undefined) continue;
      if (canonicalPath(tab.workspacePath) === key) return true;
    }
    return false;
  }

  tabForWorkspace(workspacePath: string): string | undefined {
    return this.tabIdsForWorkspace(workspacePath)[0];
  }

  tabIdsForWorkspace(workspacePath: string): string[] {
    const key = canonicalPath(workspacePath);
    const ids: string[] = [];
    for (const tab of this.tabs.values()) {
      if (tab.workspacePath !== undefined && canonicalPath(tab.workspacePath) === key) ids.push(tab.id);
    }
    return ids;
  }

  tabFor(sender: WebContents): Tab | undefined {
    return this.tabForViewId(sender.id);
  }

  tabForViewId(viewId: number): Tab | undefined {
    for (const tab of this.tabs.values()) {
      if (tab.view?.webContents.id === viewId) return tab;
    }
    return undefined;
  }

  contentsFor(id: string): WebContents | undefined {
    return this.tabs.get(id)?.view?.webContents;
  }

  activeContents(): WebContents | undefined {
    return this.activeId === undefined ? undefined : this.contentsFor(this.activeId);
  }

  /** One window today; the record is a list so detach-to-window needs no migration (ONL-2208). */
  persist(): void {
    const record = windowRecordFor({
      isBooting: this.isBooting,
      isUsable: this.isUsable(),
      order: this.order,
      tabs: this.tabs,
      ...(this.activeId === undefined ? {} : { activeId: this.activeId }),
      repoIdentityOf: (workspacePath) => knownProject(workspacePath)?.repoIdentity,
    });
    if (record === undefined) return;
    writeWindows([record]);
  }

  finishBoot(): void {
    this.isBooting = false;
  }
}
