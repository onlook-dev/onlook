export type TabPurpose = 'projects' | 'project';

/** Derived on every read; stored at birth it drew no chip from a card and left one behind after the last close (ONL-2244). */
export function tabPurpose(tab: { workspacePath?: string; isCreating: boolean }): TabPurpose {
  if (tab.workspacePath !== undefined) return 'project';
  return tab.isCreating ? 'project' : 'projects';
}
