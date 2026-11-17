import { create } from 'zustand';
import { MAX_PROJECT_TABS, type DiscoveredWorktree, type WorkspaceSummary } from '@studio/events';
import { mirror } from '../mirror.js';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

interface ProjectsState {
  workspaces: WorkspaceSummary[];
  discovered: DiscoveredWorktree[];
  copyLimitReached: boolean | null;
}

interface ProjectsStore extends ProjectsState {
  apply: (patch: Partial<ProjectsState>) => void;
}

const useProjectsStore = create<ProjectsStore>()((set) => ({
  workspaces: [],
  discovered: [],
  copyLimitReached: null,
  apply: (patch) => {
    set(patch);
  },
}));

export { useProjectsStore };

let priming: Promise<void> | undefined;

export function primeProjects(): Promise<void> {
  priming ??= (async () => {
    const { apply } = useProjectsStore.getState();

    mirror({
      name: ['projects', 'tab capacity'],
      read: () => studio().tabsState(),
      subscribe: (listener) => studio().onTabsState(listener),
      apply: (state) => {
        apply({
          copyLimitReached: state.tabs.filter((tab) => tab.purpose === 'project').length >= MAX_PROJECT_TABS,
        });
      },
    });

    /* Started, never awaited: the scan's cheap path holds only while the registry has records, so
       the very user this exists for would wait on a git ladder before anything paints (ONL-2522). */
    mirror({
      name: ['projects', 'discover worktrees'],
      read: () => studio().listDiscoveredWorktrees(),
      subscribe: (listener) => studio().onDiscoveredWorktreesChanged(listener),
      apply: (discovered) => { apply({ discovered }); },
    });

    await mirror({
      name: ['projects', 'list workspaces'],
      read: () => studio().listWorkspaces(),
      subscribe: (listener) => studio().onWorkspacesChanged(listener),
      apply: (workspaces) => { apply({ workspaces }); },
    }).primed;
  })();
  return priming;
}

export function resetProjectsPrimeForTests(): void {
  priming = undefined;
  useProjectsStore.getState().apply({ workspaces: [], discovered: [], copyLimitReached: null });
}

export async function refreshProjects(): Promise<void> {
  const workspaces = await studio()
    .listWorkspaces()
    .catch(ignoreRefusal('projects', 'list workspaces'));
  if (workspaces) useProjectsStore.getState().apply({ workspaces });
}
