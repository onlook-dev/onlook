import { workspaceDisplayName } from '@studio/events';
import { useWorkspaceStore } from '../workspace/store.js';
import { useProjectsStore } from './store.js';

/** Renames broadcast through the project list; the open workspace is a snapshot. */
export function useProjectName(): string | undefined {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const listedName = useProjectsStore((state) =>
    workspace === null ? undefined : state.workspaces
      .flatMap((entry) => entry.projects)
      .find((project) => project.workspacePath === workspace.workspacePath)?.editableName,
  );
  return listedName ?? (workspace ? workspaceDisplayName(workspace) : undefined);
}
