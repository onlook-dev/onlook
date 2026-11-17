import { IPC_EMIT, type WorkspaceSummary } from '@studio/events';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { listWorkspaces } from './store.js';

const removing = new Set<string>();

export function visibleWorkspaces(): WorkspaceSummary[] {
  return listWorkspaces().map((workspace) => ({
    ...workspace,
    projects: workspace.projects.filter((project) => !removing.has(project.workspacePath)),
  })).filter((workspace) => workspace.projects.length > 0);
}

export function hideRemovingProjects(workspacePaths: string[]): () => void {
  for (const workspacePath of workspacePaths) removing.add(workspacePath);
  broadcastWorkspacesChanged();
  return () => {
    for (const workspacePath of workspacePaths) removing.delete(workspacePath);
    broadcastWorkspacesChanged();
  };
}

export function broadcastWorkspacesChanged(): void {
  broadcastToRenderers(IPC_EMIT.workspacesChanged, visibleWorkspaces());
}
