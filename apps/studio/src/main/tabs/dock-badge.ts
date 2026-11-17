import type { TabsState } from '@studio/events';

export function updateDockBadge(state: TabsState, dock: { setBadge(text: string): void } | undefined): void {
  if (dock === undefined) return;
  const count = state.tabs.filter((tab) => tab.purpose === 'project' && (tab.status === 'waiting' || (tab.status === 'done' && tab.id !== state.activeId))).length;
  dock.setBadge(count === 0 ? '' : String(count));
}
