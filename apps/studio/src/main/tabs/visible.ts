import type { TabsState } from '@studio/events';

export function visibleWorktree(state: TabsState): string | undefined {
  if (state.activeId === undefined) return undefined;
  return state.tabs.find((tab) => tab.id === state.activeId)?.workspacePath;
}
