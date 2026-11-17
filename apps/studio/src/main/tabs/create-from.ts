import { knownProject, newProjectSource } from '../workspace/store.js';

export function createFromSource(tab: { workspacePath?: string; contextSource?: string }): string | undefined {
  if (tab.workspacePath === undefined) return tab.contextSource;
  const record = knownProject(tab.workspacePath);
  return record === undefined ? undefined : newProjectSource(record);
}
