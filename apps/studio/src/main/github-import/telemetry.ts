import { githubRepository, importedProject } from './announced.js';
import { workspaceTelemetryId, workspaceTelemetryProperties } from '../telemetry/index.js';
import type { TelemetryProperties } from '../telemetry/events.js';
import { captureGithub as capture } from './capture.js';
import { defineDomain } from '../state/store.js';
import { projectKey, type ProjectKey } from '../project/key.js';
import { projectSet } from '../project/state.js';
import { knownProject, workspaceOrigin } from '../workspace/store.js';

export type CreationSource = 'folder' | 'scratch' | 'github';
export type PreviewEntryPoint = NonNullable<TelemetryProperties<'preview_ready'>['entry_point']>;
const CREATION_ENTRY: Record<CreationSource, PreviewEntryPoint> = { scratch: 'blank', folder: 'import', github: 'repo' };
const sources = new Map<string, CreationSource>();
const creationWorktrees = new Map<string, ProjectKey>();
const blanksBeforeRegistration = projectSet('blank-before-registration');
const workspaces = defineDomain<Record<string, CreationSource>>({ name: 'workspace-creation-sources', version: 1, fallback: () => ({}) });

export function creationStarted(source: CreationSource): void {
  capture('workspace_creation_flow', { source, step: 'started', outcome: 'started' });
}

export function creationAbandoned(source: CreationSource): void {
  capture('workspace_creation_flow', { source, step: 'abandoned', outcome: 'abandoned' });
}

export function beginCreation(path: string, source: CreationSource, recordStart = true): void {
  if (sources.has(path)) return;
  sources.set(path, source);
  if (recordStart) creationStarted(source);
}

export function creationRegistered(sourcePath: string, repoIdentity: string, workspacePath?: string): void {
  const source = sources.get(sourcePath);
  if (source === undefined) return;
  sources.delete(sourcePath);
  const repository = githubRepository(repoIdentity);
  if (source === 'github' && workspacePath !== undefined && repository !== undefined) importedProject(workspacePath, repository);
  const { project_id } = workspaceTelemetryProperties(repoIdentity);
  workspaces.update((items) => ({ ...items, [project_id]: source }));
  if (workspacePath !== undefined) creationWorktrees.set(project_id, projectKey(workspacePath));
  capture('workspace_creation_flow', { source, step: 'created', outcome: 'success', project_id });
}

/** Answers the source whose preview step this was; a sibling project's preview leaves a creation from this launch in place. */
export function creationPreview(project_id: string, outcome: 'success' | 'failure', worktreePath?: string): CreationSource | undefined {
  const creator = creationWorktrees.get(project_id);
  if (creator !== undefined && worktreePath !== undefined && creator !== projectKey(worktreePath)) return undefined;
  const source = workspaces.read()?.[project_id];
  if (source !== 'folder' && source !== 'scratch' && source !== 'github') return undefined;
  creationWorktrees.delete(project_id);
  workspaces.update((items) => {
    const next = { ...items };
    delete next[project_id];
    return next;
  });
  capture('workspace_creation_flow', { source, step: 'preview', outcome, project_id });
  return source;
}

export function forgetCreation(repoIdentity: string): void {
  const project_id = workspaceTelemetryId(repoIdentity);
  creationWorktrees.delete(project_id);
  if (workspaces.read()?.[project_id] === undefined) return;
  workspaces.update((items) => {
    const next = { ...items };
    delete next[project_id];
    return next;
  });
}

/** A blank reports its port before it is registered, so its first preview is named from here. */
export function holdBlankPreview(worktreePath: string): () => void {
  const key = projectKey(worktreePath);
  blanksBeforeRegistration.add(key);
  return () => blanksBeforeRegistration.delete(key);
}

/** Absent for a duplicate, whose creation leaves no source to say whether this is its first preview (ONL-3257). */
export function settleCreationPreview(project_id: string, state: 'loading' | 'live' | 'unreachable', worktreePath: string): PreviewEntryPoint | undefined {
  if (state === 'loading') return undefined;
  const created = creationPreview(project_id, state === 'unreachable' ? 'failure' : 'success', worktreePath);
  if (blanksBeforeRegistration.has(projectKey(worktreePath))) return 'blank';
  if (created !== undefined) return CREATION_ENTRY[created];
  const project = knownProject(worktreePath);
  if (project === undefined || workspaceOrigin(project) === 'duplicate') return undefined;
  return 'reopen';
}
