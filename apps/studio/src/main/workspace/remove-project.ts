import { existsSync } from 'node:fs';
import { dialog } from 'electron';
import {
  type RemoveProjectResult,
  workspaceDisplayName,
  type WorkspaceOrigin,
} from '@studio/events';
import { canonicalPath, pathSpellings } from '../lib/canonical-path.js';
import { t } from '@studio/i18n';
import { capture } from '../telemetry/index.js';
import { dialogParent } from '../window/host.js';
import { broadcastWorkspacesChanged, hideRemovingProjects } from './workspaces-changed.js';
import {
  removeConfirmFor,
  type RemoveConfirm,
  type WorkspaceRemoveConfirm,
  workspaceRemoveConfirmFor,
} from './remove-confirm.js';
import type { TeardownResult } from './remove.js';
import {
  byFounding,
  listWorkspaces,
  projectsOfRepo,
  registeredProject,
  workspaceOrigin,
  workspaceHeldOrigin,
  type ProjectRecord,
} from './store.js';
import { type Capture, recordProjectRemoved, recordWorkspaceRemoved } from './telemetry.js';

export interface RemoveFlowDeps {
  confirm: (record: ProjectRecord, choice: RemoveConfirm) => Promise<boolean>;
  reportFailure: (failure: string) => Promise<void>;
  closeTabs: (workspacePath: string) => Promise<boolean>;
  remove: (workspacePath: string) => Promise<TeardownResult>;
  changed: () => void;
  hide: (workspacePaths: string[]) => () => void;
  capture: Capture;
}

/** Assembled in the flow, not in the dialog: the sentences are readable without one (ONL-2523). */
export interface WorkspaceRemoveAsk {
  message: string;
  detail: string;
}

export interface RemoveWorkspaceFlowDeps {
  confirm: (ask: WorkspaceRemoveAsk) => Promise<boolean>;
  reportFailure: (failure: string) => Promise<void>;
  closeTabs: (workspacePath: string) => Promise<boolean>;
  remove: (workspacePath: string) => Promise<TeardownResult>;
  changed: () => void;
  hide: (workspacePaths: string[]) => () => void;
  capture: Capture;
}

const SURVIVES = {
  imported: 'projects.remove.confirm.imported',
  'held-last': 'projects.remove.confirm.heldLast',
  'held-sibling': 'projects.remove.confirm.heldSibling',
} as const;

const WORKSPACE_SURVIVES = {
  imported: 'projects.remove.workspace.confirm.imported',
  held: 'projects.remove.workspace.confirm.held',
} as const;

async function show(options: Electron.MessageBoxOptions): Promise<number> {
  const parent = dialogParent();
  const chosen = await (parent
    ? dialog.showMessageBox(parent, options)
    : dialog.showMessageBox(options));
  return chosen.response;
}

/** The name the card shows, from the one place that composes it: a confirm must not name something the user has never seen (ONL-2315). */
export function cardName(workspacePath: string): string | undefined {
  const key = canonicalPath(workspacePath);
  for (const group of listWorkspaces()) {
    for (const project of group.projects) {
      if (canonicalPath(project.workspacePath) === key) return project.name;
    }
  }
  return undefined;
}

/** The label the rail's row shows, from the one place that composes it (ONL-2523). */
function workspaceRowName(repoIdentity: string): string | undefined {
  return listWorkspaces().find((group) => group.repoIdentity === repoIdentity)?.name;
}

function workspaceScope(choice: WorkspaceRemoveConfirm): string {
  if (choice.count === 1) {
    return t(
      choice.deletesFolder
        ? 'projects.remove.workspace.confirm.folderOne'
        : 'projects.remove.workspace.confirm.canvasOnlyOne',
    );
  }
  return t(
    choice.deletesFolder
      ? 'projects.remove.workspace.confirm.folder'
      : 'projects.remove.workspace.confirm.canvasOnly',
    { count: choice.count },
  );
}

function workspaceAsk(name: string, choice: WorkspaceRemoveConfirm): WorkspaceRemoveAsk {
  return {
    message: t('projects.remove.confirm.message', { name }),
    detail: [
      workspaceScope(choice),
      ...(choice.warnsUncommitted ? [t('projects.remove.workspace.confirm.uncommitted')] : []),
      t(WORKSPACE_SURVIVES[choice.variant]),
    ].join('\n\n'),
  };
}

async function askRemove(record: ProjectRecord, choice: RemoveConfirm): Promise<boolean> {
  const detail = [
    t(choice.deletesFolder ? 'projects.remove.confirm.folder' : 'projects.remove.confirm.canvasOnly'),
    ...(choice.warnsUncommitted ? [t('projects.remove.confirm.uncommitted')] : []),
    t(SURVIVES[choice.variant], { branch: record.branchName }),
  ].join('\n\n');
  // macOS draws `buttons` right to left from index 0, so Cancel sits left of Remove and Escape cancels.
  const response = await show({
    title: t('app.name'),
    type: 'question',
    message: t('projects.remove.confirm.message', {
      name: cardName(record.workspacePath) ?? workspaceDisplayName(record),
    }),
    detail,
    buttons: [t('projects.remove.confirm.remove'), t('projects.remove.confirm.cancel')],
    defaultId: 1,
    cancelId: 1,
  });
  return response === 0;
}

async function reportFailure(failure: string): Promise<void> {
  await show({
    title: t('app.name'),
    type: 'error',
    message: t('projects.remove.failed.message'),
    detail: t('projects.remove.failed.detail', { failure }),
    buttons: [t('projects.remove.failed.dismiss')],
    defaultId: 0,
    cancelId: 0,
  });
}

async function askRemoveWorkspace(ask: WorkspaceRemoveAsk): Promise<boolean> {
  const response = await show({
    title: t('app.name'),
    type: 'question',
    message: ask.message,
    detail: ask.detail,
    buttons: [t('projects.remove.confirm.remove'), t('projects.remove.confirm.cancel')],
    defaultId: 1,
    cancelId: 1,
  });
  return response === 0;
}

async function reportWorkspaceFailure(failure: string): Promise<void> {
  await show({
    title: t('app.name'),
    type: 'error',
    message: t('projects.remove.workspace.failed.message'),
    detail: t('projects.remove.workspace.failed.detail', { failure }),
    buttons: [t('projects.remove.failed.dismiss')],
    defaultId: 0,
    cancelId: 0,
  });
}

// Both at call time, not at import: `tabs/host.js` statically pulls `BaseWindow` into every
// workspace unit suite (ONL-2206), and `remove.js` closes a cycle through `agent-host`.
async function closeTabsOn(workspacePath: string): Promise<boolean> {
  const { tabHost } = await import('../tabs/host.js');
  return (await tabHost()?.closeForWorkspace(workspacePath)) ?? true;
}

async function tearDown(workspacePath: string): Promise<TeardownResult> {
  const { teardownProject } = await import('./remove.js');
  return teardownProject(workspacePath);
}

const defaultDeps: RemoveFlowDeps = {
  confirm: askRemove,
  reportFailure,
  closeTabs: closeTabsOn,
  remove: tearDown,
  changed: broadcastWorkspacesChanged,
  hide: hideRemovingProjects,
  capture,
};

const defaultWorkspaceDeps: RemoveWorkspaceFlowDeps = {
  confirm: askRemoveWorkspace,
  reportFailure: reportWorkspaceFailure,
  closeTabs: closeTabsOn,
  remove: tearDown,
  changed: broadcastWorkspacesChanged,
  hide: hideRemovingProjects,
  capture,
};

const inFlight = new Set<string>();

/** An open that completes mid-teardown would leave a tab on a deleted path (ONL-2315). */
export function isRemovingProject(workspacePath: string): boolean {
  // Every spelling: the key went in while the folder was there, and the teardown deletes it underneath.
  return pathSpellings(workspacePath).some((spelling) => inFlight.has(spelling));
}

/**
 * Every destructive step sits after the two asks, so a cancel and a kept tab each
 * leave the project exactly as it was (ONL-2315).
 */
export async function removeProjectByUser(
  workspacePath: string,
  deps: RemoveFlowDeps = defaultDeps,
): Promise<RemoveProjectResult> {
  const record = registeredProject(workspacePath);
  if (record === undefined) return { ok: false, reason: 'unknown-project' };
  const keys = pathSpellings(record.workspacePath);
  if (keys.some((key) => inFlight.has(key))) return { ok: false, reason: 'in-flight' };
  for (const key of keys) inFlight.add(key);
  let restoreVisibility: (() => void) | undefined;
  try {
    const missing = !existsSync(record.workspacePath);
    const lastInGroup = projectsOfRepo(record.repoIdentity).length <= 1;
    const choice = removeConfirmFor({ origin: workspaceHeldOrigin(record) ?? 'imported', missing, lastInGroup });
    if (!(await deps.confirm(record, choice))) return { ok: false, reason: 'cancelled' };
    if (!(await deps.closeTabs(record.workspacePath))) return { ok: false, reason: 'tab-held' };

    restoreVisibility = deps.hide([record.workspacePath]);
    const outcome = await deps.remove(record.workspacePath);
    // A failed teardown still forgot the per-project stores, so the grid is stale either way.
    deps.changed();
    if (!outcome.ok) {
      restoreVisibility();
      restoreVisibility = undefined;
      if (outcome.reason === 'folder-remains') await deps.reportFailure(outcome.detail);
      return { ok: false, reason: outcome.reason };
    }
    recordProjectRemoved(record, { missing, last_in_group: outcome.lastInGroup }, deps.capture);
    return { ok: true };
  } finally {
    restoreVisibility?.();
    for (const key of keys) inFlight.delete(key);
  }
}

// Held on any disagreement, the same reading the confirm takes (ONL-2523).
function groupOrigin(origins: readonly WorkspaceOrigin[]): WorkspaceOrigin {
  return origins.find((origin) => origin === 'blank' || origin === 'copied') ?? origins[0] ?? 'imported';
}

// Oldest last: the group's next source path is read from the founding project, which answers until its folder is gone (ONL-2523).
function foundingLast(records: readonly ProjectRecord[]): ProjectRecord[] {
  return [...records].sort((a, b) => byFounding(b, a));
}

/** Every tab of every project closes before anything is deleted; a tab asking to stay abandons the removal with nothing deleted, and the tabs already closed stay closed (ONL-2523). */
export async function removeWorkspaceByUser(
  repoIdentity: string,
  deps: RemoveWorkspaceFlowDeps = defaultWorkspaceDeps,
): Promise<RemoveProjectResult> {
  const records = projectsOfRepo(repoIdentity);
  const name = workspaceRowName(repoIdentity);
  if (records.length === 0 || name === undefined) return { ok: false, reason: 'unknown-project' };
  // One path-keyed read over the group: a card removal running on any project of it is the same race as a second row removal.
  if (records.some((record) => isRemovingProject(record.workspacePath))) {
    return { ok: false, reason: 'in-flight' };
  }

  // Claimed before the ask, as a card's own removal claims its one path: the confirm is an await, and a card removal starting under it would tear the same worktree down twice (ONL-2523).
  const keys = records.flatMap((record) => pathSpellings(record.workspacePath));
  for (const key of keys) inFlight.add(key);
  let restoreVisibility: (() => void) | undefined;
  try {
    const missing = records.filter((record) => !existsSync(record.workspacePath)).length;
    const origins = records.map(workspaceOrigin);
    const choice = workspaceRemoveConfirmFor({
      origins: records.map((record) => workspaceHeldOrigin(record) ?? 'imported'),
      present: records.length - missing,
      count: records.length,
    });
    if (!(await deps.confirm(workspaceAsk(name, choice)))) return { ok: false, reason: 'cancelled' };

    const order = foundingLast(records);
    for (const record of order) {
      if (!(await deps.closeTabs(record.workspacePath))) return { ok: false, reason: 'tab-held' };
    }
    restoreVisibility = deps.hide(order.map((record) => record.workspacePath));
    for (const record of order) {
      const outcome = await deps.remove(record.workspacePath);
      deps.changed();
      if (!outcome.ok) {
        restoreVisibility();
        restoreVisibility = undefined;
        if (outcome.reason === 'folder-remains') await deps.reportFailure(outcome.detail);
        return { ok: false, reason: outcome.reason };
      }
    }
    recordWorkspaceRemoved(
      repoIdentity,
      { origin: groupOrigin(origins), project_count: records.length, missing_count: missing },
      deps.capture,
    );
    return { ok: true };
  } finally {
    restoreVisibility?.();
    for (const key of keys) inFlight.delete(key);
  }
}
