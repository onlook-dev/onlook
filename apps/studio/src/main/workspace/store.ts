import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { app } from 'electron';
import type {
  DisplayNameSource,
  HarnessId,
  HeldOrigin,
  ProjectSummary,
  WorkspaceCreated,
  WorkspaceOrigin,
  WorkspaceSummary,
} from '@studio/events';
import { t } from '@studio/i18n';
import { canonicalPath, pathSpellings } from '../lib/canonical-path.js';
import { defineDomain } from '../state/store.js';
import { repoIdentityDirName } from './naming.js';
import { heldBy } from './candidate.js';
import { chosenProjectsFolder } from './root.js';
import { reopenRemovedState } from './removed-state.js';
import { devSwitches } from '../env/dev-switches.js';

// Without this door an e2e run cuts real worktrees in the real user-data directory and leaves them there.
// Not behind `machine-check`: only that screen can choose a folder, and a build with it off must still find the projects a build with it on saved there (ONL-3111).
export function workspaceRoot(): string {
  const override = devSwitches.workspaceRoot;
  if (override) return resolve(override);
  return chosenProjectsFolder() ?? join(app.getPath('userData'), 'workspaces');
}

export function projectsFolderMayChange(): boolean {
  try { if (statSync(workspaceRoot()).isFile()) return true; } catch {}
  if (domain.degraded() || Object.keys(domain.read().workspaces).length > 0) return false;
  try { return readdirSync(workspaceRoot()).every((name) => name === 'workspaces.json'); }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
}

export function workspacePathFor(repoIdentity: string, workspaceName: string): string {
  return join(workspaceRoot(), repoIdentityDirName(repoIdentity), workspaceName);
}

export interface ProjectRecord extends WorkspaceCreated {
  createdAt: string;
  lastOpenedAt: string;
  archivedAt?: string;
  /** Absent until the Project's agent first answers; then the Settings default no longer moves it (ONL-2914). */
  harness?: HarnessId;
  /** Present only on a Project GitHub import cloned; it names that Project in every notification (ONL-3182). */
  githubImport?: GithubImportRecord;
}

interface GithubImportRecord {
  repository: string;
  clonedAt: string;
  /** Set when the Project's landing was announced; one import announces it once, across relaunches (ONL-3182). */
  announcedAt?: string;
}

interface RegistryState {
  workspaces: Record<string, ProjectRecord>;
  archivedRepos: Record<string, string>;
  workspaceNames: Record<string, string>;
  workspaceOrder: string[];
  /** Optional so the file version did not move (ONL-2182). */
  appChoices?: Record<string, string>;
}

const domain = defineDomain<RegistryState>({
  name: 'workspaces',
  version: 4,
  fallback: () => ({ workspaces: {}, archivedRepos: {}, workspaceNames: {}, workspaceOrder: [] }),
  // Under the workspace root, not the state root: one `rm` takes the worktrees and the record of them together.
  root: workspaceRoot,
  migrate: (data, from) => {
    if (from === 3) {
      // `?? {}` on every arm: a malformed envelope written back without its maps throws on every later read.
      const previous = (data ?? {}) as Partial<Omit<RegistryState, 'workspaceOrder'>>;
      return {
        workspaces: previous.workspaces ?? {},
        archivedRepos: previous.archivedRepos ?? {},
        workspaceNames: previous.workspaceNames ?? {},
        workspaceOrder: [],
      };
    }
    if (from === 2) {
      const previous = (data ?? {}) as Partial<Omit<RegistryState, 'workspaceNames'>>;
      return {
        workspaces: previous.workspaces ?? {},
        archivedRepos: previous.archivedRepos ?? {},
        workspaceNames: {},
        workspaceOrder: [],
      };
    }
    if (from !== 0 && from !== 1) throw new Error(`no migration from version ${String(from)}`);
    const now = new Date().toISOString();
    const source =
      from === 0
        ? ((data ?? {}) as Record<string, WorkspaceCreated>)
        : (((data as { workspaces?: Record<string, ProjectRecord> } | null)?.workspaces ??
            {}) as Record<string, ProjectRecord>);

    const workspaces: Record<string, ProjectRecord> = {};
    for (const [path, workspace] of Object.entries(source)) {
      // Skipped, not thrown: the old file is a returning user's whole projects view.
      if (typeof workspace?.workspacePath !== 'string') continue;
      const record: ProjectRecord = {
        ...workspace,
        createdAt: (workspace as ProjectRecord).createdAt ?? now,
        lastOpenedAt: (workspace as ProjectRecord).lastOpenedAt ?? now,
      };
      // An identity starting with `/` is a local-path remote, whose stored name was read off orchestrator plumbing.
      if (record.repoIdentity.startsWith('/') && record.sourceRepoRoot) {
        record.sourceRepoName = basename(record.sourceRepoRoot);
      }
      workspaces[path] = record;
    }
    return { workspaces, archivedRepos: {}, workspaceNames: {}, workspaceOrder: [] };
  },
});

// The key the session guard looks a project up by; `main/canvas/registry.ts` keys the same way.
export const normalizePath = canonicalPath;

// The timestamps are optional so a recovered record keeps its own dates without a second way into the registry (ONL-2522).
export function rememberProject(
  workspace: WorkspaceCreated & Partial<Pick<ProjectRecord, 'createdAt' | 'lastOpenedAt'>>,
): void {
  const isNew = locate(domain.read().workspaces, workspace.workspacePath) === undefined;
  const now = new Date().toISOString();
  domain.update((state) => ({
    ...state,
    workspaces: {
      ...state.workspaces,
      [normalizePath(workspace.workspacePath)]: {
        ...workspace,
        createdAt: workspace.createdAt ?? now,
        lastOpenedAt: workspace.lastOpenedAt ?? now,
      },
    },
  }));
  if (isNew) reopenRemovedState(pathSpellings(workspace.workspacePath));
}

// Absent means imported; `origin` is optional so the file version did not move.
export function workspaceOrigin(record: Pick<WorkspaceCreated, 'origin'>): WorkspaceOrigin {
  return record.origin ?? 'imported';
}

// The session guard's oracle.
export function knownProject(path: string): ProjectRecord | undefined {
  return domain.read().workspaces[normalizePath(path)];
}

export function projectHasNoHistory(path: string): boolean {
  const project = knownProject(path);
  return project?.history === 'none' && workspaceHeldOrigin(project) === 'blank' && !existsSync(join(path, '.git'));
}

// `canonicalPath` falls back to a lexical resolve once the directory is gone, which on macOS is a second key for one project; the stored path is the fallback (ONL-2315).
function locate(
  workspaces: Record<string, ProjectRecord>,
  workspacePath: string,
): { key: string; record: ProjectRecord } | undefined {
  const key = normalizePath(workspacePath);
  const direct = workspaces[key];
  if (direct) return { key, record: direct };
  const target = resolve(workspacePath);
  for (const [held, record] of Object.entries(workspaces)) {
    if (resolve(record.workspacePath) === target) return { key: held, record };
  }
  return undefined;
}

/** Answers for a project whose directory has already gone, which `knownProject` cannot (ONL-2315). */
export function registeredProject(workspacePath: string): ProjectRecord | undefined {
  return locate(domain.read().workspaces, workspacePath)?.record;
}

export function registeredProjectKey(workspacePath: string): string | undefined {
  return locate(domain.read().workspaces, workspacePath)?.key;
}

export function projectCount(): number {
  return Object.values(domain.read().workspaces).filter((record) => record.internal !== 'artifacts').length;
}

export function projectsOfRepo(repoIdentity: string): ProjectRecord[] {
  return forRepo(repoIdentity);
}

// The group's archived flag, name and order slot leave with its last project: a re-import would otherwise land in a collapsed disclosure the user never archived (ONL-2315).
export function forgetProject(workspacePath: string): void {
  domain.update((state) => {
    const found = locate(state.workspaces, workspacePath);
    if (!found) return state;
    const workspaces = { ...state.workspaces };
    delete workspaces[found.key];
    const { repoIdentity } = found.record;
    if (Object.values(workspaces).some((record) => record.repoIdentity === repoIdentity)) {
      return { ...state, workspaces };
    }
    const archivedRepos = { ...state.archivedRepos };
    const workspaceNames = { ...state.workspaceNames };
    const appChoices = { ...state.appChoices };
    delete archivedRepos[repoIdentity];
    delete workspaceNames[repoIdentity];
    // The app chosen for a group that no longer exists would pre-fill the question on a re-import of the same repository (ONL-2523).
    delete appChoices[repoIdentity];
    return {
      ...state,
      workspaces,
      archivedRepos,
      workspaceNames,
      appChoices,
      workspaceOrder: state.workspaceOrder.filter((id) => id !== repoIdentity),
    };
  });
}

// Not a held project's `sourcePath`: a copied one's is the user's folder, and planning that again is the `already-copied` refusal (ONL-2442).
// An import whose folder the user moved answers its repository root instead: the gone path plans as a fresh copy and fails in the copy (ONL-2480).
export function newProjectSource(record: Pick<WorkspaceCreated, 'origin' | 'sourcePath' | 'sourceRepoRoot'>): string {
  if (workspaceOrigin(record) !== 'imported') return record.sourceRepoRoot;
  return existsSync(record.sourcePath) ? record.sourcePath : record.sourceRepoRoot;
}

export function workspaceHeldOrigin(record: WorkspaceCreated): HeldOrigin | undefined {
  const identityDir = dirname(workspacePathFor(record.repoIdentity, record.workspaceName));
  const classified = heldBy(basename(identityDir));
  if (classified === undefined || classified.repoIdentity !== record.repoIdentity) return undefined;
  const origin = workspaceOrigin(record);
  const heldOrigin = origin === 'duplicate'
    ? record.heldOrigin ?? classified.origin
    : origin === 'blank' || origin === 'copied' ? origin : undefined;
  if (heldOrigin !== classified.origin) return undefined;
  const canonicalBucket = normalizePath(identityDir);
  if (canonicalBucket !== join(normalizePath(workspaceRoot()), basename(identityDir))) return undefined;
  const source = existsSync(record.sourceRepoRoot)
    ? normalizePath(record.sourceRepoRoot)
    : join(normalizePath(dirname(record.sourceRepoRoot)), basename(record.sourceRepoRoot));
  const worktree = existsSync(record.workspacePath)
    ? normalizePath(record.workspacePath)
    : join(normalizePath(dirname(record.workspacePath)), basename(record.workspacePath));
  if (source !== join(canonicalBucket, 'source')) return undefined;
  if (worktree !== join(canonicalBucket, record.workspaceName)) return undefined;
  if (record.workspaceName === 'source') return undefined;
  return heldOrigin;
}

export function heldWorkspaceAt(repoRoot: string): (ProjectRecord & { heldOrigin: HeldOrigin }) | undefined {
  const key = normalizePath(repoRoot);
  for (const record of Object.values(domain.read().workspaces)) {
    if (normalizePath(record.sourceRepoRoot) !== key) continue;
    const heldOrigin = workspaceHeldOrigin(record);
    if (heldOrigin !== undefined) return { ...record, heldOrigin };
  }
  return undefined;
}

// An unknown path is ignored: a record minted here is a second way into the registry the isolation guard trusts.
export function touchProject(path: string): void {
  const key = normalizePath(path);
  const existing = domain.read().workspaces[key];
  if (!existing) return;
  const opened = { ...existing, lastOpenedAt: new Date().toISOString() };
  domain.update((state) => ({ ...state, workspaces: { ...state.workspaces, [key]: opened } }));
}

// An unknown path is ignored, as in `touchProject`.
export function setProjectHarness(path: string, harness: HarnessId): void {
  const key = normalizePath(path);
  if (domain.read().workspaces[key]?.harness === harness) return;
  domain.update((state) => {
    const existing = state.workspaces[key];
    if (!existing) return state;
    return { ...state, workspaces: { ...state.workspaces, [key]: { ...existing, harness } } };
  });
}

// An unknown path is ignored, as in `touchProject`.
export function rememberGithubImport(path: string, repository: string, clonedAt = new Date().toISOString()): void {
  update(path, (record) => ({ ...record, githubImport: { repository, clonedAt } }));
}

/** A clone's landing waits to be announced while its claim is unannounced and `windowMs` young. */
export function githubLandingPending(path: string, windowMs: number, now = Date.now()): boolean {
  const claim = registeredProject(path)?.githubImport;
  return claim !== undefined && claim.announcedAt === undefined && now - Date.parse(claim.clonedAt) <= windowMs;
}

export function takeGithubLanding(path: string, now = Date.now()): void {
  update(path, (record) => record.githubImport === undefined
    ? record
    : { ...record, githubImport: { ...record.githubImport, announcedAt: new Date(now).toISOString() } });
}

function update(path: string, change: (record: ProjectRecord) => ProjectRecord): void {
  domain.update((state) => {
    const found = locate(state.workspaces, path);
    if (!found) return state;
    return { ...state, workspaces: { ...state.workspaces, [found.key]: change(found.record) } };
  });
}

// Path breaks a `createdAt` tie: the v0/v1 migration stamps one timestamp across every record it carries (ONL-2480).
export function byFounding(a: ProjectRecord, b: ProjectRecord): number {
  return a.createdAt.localeCompare(b.createdAt) || a.workspacePath.localeCompare(b.workspacePath);
}

function byRecency(records: readonly ProjectRecord[]): ProjectRecord[] {
  return [...records].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

function forRepo(repoIdentity: string): ProjectRecord[] {
  return Object.values(domain.read().workspaces).filter((r) => r.repoIdentity === repoIdentity);
}

// Injected, never imported: `main/canvas` reaches this module for the workspace root, so importing it back is a cycle.
let thumbnailFor: ((workspacePath: string) => string | undefined) | undefined;

export function setProjectThumbnailProvider(
  provider: ((workspacePath: string) => string | undefined) | undefined,
): void {
  thumbnailFor = provider;
}

function toProjectSummary(record: ProjectRecord, groupName: string): ProjectSummary {
  const derived =
    workspaceOrigin(record) === 'blank'
      ? record.workspaceName
      : t('project.card.name', { repo: groupName, copy: record.workspaceName });
  // From the provider's own memory, not a stat: this recomputes for every project on every broadcast.
  const previewUrl = thumbnailFor?.(record.workspacePath);
  return {
    ...(previewUrl === undefined ? {} : { previewUrl }),
    workspacePath: record.workspacePath,
    name: record.displayName ?? derived,
    editableName: record.displayName ?? record.workspaceName,
    branchName: record.branchName,
    repoIdentity: record.repoIdentity,
    lastOpenedAt: record.lastOpenedAt,
    createdAt: record.createdAt,
    // A gone directory stays listed.
    missing: !existsSync(record.workspacePath),
    archived: record.archivedAt !== undefined,
  };
}

export function listWorkspaces(): WorkspaceSummary[] {
  const state = domain.read();
  const byRepo = new Map<string, ProjectRecord[]>();
  for (const record of Object.values(state.workspaces)) {
    if (record.internal === 'artifacts') continue;
    const group = byRepo.get(record.repoIdentity);
    if (group) group.push(record);
    else byRepo.set(record.repoIdentity, [record]);
  }

  const summaries: (WorkspaceSummary & { addedAt: string })[] = [];
  for (const [repoIdentity, records] of byRepo) {
    const newestFirst = byRecency(records);
    const newest = newestFirst[0];
    if (!newest) continue;
    // The founding project answers, so opening or archiving a sibling cannot move where the next one is cut from (ONL-2480).
    // The oldest whose source is still reachable, because nothing ever removes a record and a gone folder would answer forever.
    const ordered = [...records].sort(byFounding);
    const founding = ordered.find((record) => existsSync(newProjectSource(record))) ?? newest;
    // From the folder, not `sourceRepoName`, which can predate the local-origin repair.
    const name =
      state.workspaceNames[repoIdentity] ??
      (newest.sourceRepoRoot ? basename(newest.sourceRepoRoot) : newest.sourceRepoName);
    summaries.push({
      repoIdentity,
      name,
      sourcePath: newProjectSource(founding),
      lastOpenedAt: newest.lastOpenedAt,
      archived: state.archivedRepos[repoIdentity] !== undefined,
      addedAt: ordered[0]?.createdAt ?? newest.createdAt,
      projects: newestFirst.map((r) => toProjectSummary(r, name)),
    });
  }

  // Added order under the user's drag order, not recency.
  const rank = new Map(state.workspaceOrder.map((id, i) => [id, i]));
  const place = (id: string): number => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return summaries
    .sort((a, b) => place(a.repoIdentity) - place(b.repoIdentity) || a.addedAt.localeCompare(b.addedAt))
    .map(({ addedAt: _addedAt, ...summary }) => summary);
}

export function reorderWorkspaces(order: string[]): void {
  domain.update((state) => ({ ...state, workspaceOrder: [...order] }));
}

// No sibling fallback: the card names one worktree, and another puts the wrong branch on the canvas.
export function projectAt(
  workspacePath: string,
):
  | { ok: true; workspace: ProjectRecord }
  | { ok: false; reason: 'unknown-project' | 'workspace-missing' } {
  const record = locate(domain.read().workspaces, workspacePath)?.record;
  if (!record || record.internal === 'artifacts') return { ok: false, reason: 'unknown-project' };
  if (!existsSync(record.workspacePath)) return { ok: false, reason: 'workspace-missing' };
  return { ok: true, workspace: record };
}

// Legacy resolution for locations stored before projects were addressable by path; `projectAt` is the current one.
export function resolveProject(
  repoIdentity: string,
):
  | { ok: true; workspace: ProjectRecord }
  | { ok: false; reason: 'unknown-project' | 'workspace-missing' } {
  const records = forRepo(repoIdentity).filter((record) => record.internal !== 'artifacts');
  if (records.length === 0) return { ok: false, reason: 'unknown-project' };

  const live = byRecency(records).find((r) => existsSync(r.workspacePath));
  if (!live) return { ok: false, reason: 'workspace-missing' };
  return { ok: true, workspace: live };
}

export function setProjectArchived(workspacePath: string, archived: boolean): void {
  const key = normalizePath(workspacePath);
  domain.update((state) => {
    const existing = state.workspaces[key];
    if (!existing) return state;
    const next: ProjectRecord = { ...existing };
    if (archived) next.archivedAt = new Date().toISOString();
    else delete next.archivedAt;
    return { ...state, workspaces: { ...state.workspaces, [key]: next } };
  });
}

// Presentation only: `workspaceName` keeps the folder, briefing and telemetry jobs, and no git is written.
export function renameProject(workspacePath: string, name: string, source: DisplayNameSource): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  const key = normalizePath(workspacePath);
  domain.update((state) => {
    const existing = state.workspaces[key];
    if (!existing) return state;
    return {
      ...state,
      workspaces: {
        ...state.workspaces,
        [key]: { ...existing, displayName: trimmed, displayNameSource: source },
      },
    };
  });
}

// The record follows git; nothing here touches git (ONL-2181).
export function moveProjectBranch(workspacePath: string, branchName: string): void {
  const key = normalizePath(workspacePath);
  domain.update((state) => {
    const existing = state.workspaces[key];
    if (!existing || existing.branchName === branchName) return state;
    return { ...state, workspaces: { ...state.workspaces, [key]: { ...existing, branchName } } };
  });
}

export function renameWorkspace(repoIdentity: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  domain.update((state) => ({
    ...state,
    workspaceNames: { ...state.workspaceNames, [repoIdentity]: trimmed },
  }));
}

export function nameUnnamedWorkspace(repoIdentity: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  domain.update((state) =>
    state.workspaceNames[repoIdentity] === undefined
      ? { ...state, workspaceNames: { ...state.workspaceNames, [repoIdentity]: trimmed } }
      : state,
  );
}

export function appChoiceFor(repoIdentity: string): string | undefined {
  return domain.read().appChoices?.[repoIdentity];
}

// Written from the `server_running` report, not a parsed answer (ONL-2182).
export function rememberAppChoice(repoIdentity: string, relativePath: string): void {
  domain.update((state) => ({
    ...state,
    appChoices: { ...state.appChoices, [repoIdentity]: relativePath },
  }));
}

export function forgetAppChoice(repoIdentity: string): void {
  domain.update((state) => {
    if (state.appChoices?.[repoIdentity] === undefined) return state;
    const appChoices = { ...state.appChoices };
    delete appChoices[repoIdentity];
    return { ...state, appChoices };
  });
}

export function setWorkspaceArchived(repoIdentity: string, archived: boolean): void {
  domain.update((state) => {
    const archivedRepos = { ...state.archivedRepos };
    if (archived) archivedRepos[repoIdentity] = new Date().toISOString();
    else delete archivedRepos[repoIdentity];
    return { ...state, archivedRepos };
  });
}

export function resetWorkspaceCache(): void {
  domain.reset();
}
