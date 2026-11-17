import { workspaceDisplayName } from '@studio/events';
import { t } from '@studio/i18n';
import { createLabel, projectCreations } from '../workspace/create-project.js';
import { knownProject } from '../workspace/store.js';
import type { Tab } from './tab.js';

export function tabName(tab: Tab): string {
  if (tab.workspacePath !== undefined) {
    const workspace = knownProject(tab.workspacePath);
    // A blank project keeps its drawn name until the first prompt or the user gives it one (ONL-2744).
    if (workspace && workspace.displayName === undefined && (workspace.origin === 'blank' || workspace.heldOrigin === 'blank')) return t('tabs.untitledProject');
    if (workspace) return workspaceDisplayName(workspace);
  }
  const creating = projectCreations.stateFor(tab.id);
  return (creating && createLabel(creating)) ?? t('tabs.untitled');
}
