import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { TaskManagerSnapshot } from '@studio/events';

import '../styles.css';
import { installRendererErrorHooks } from '../errors.js';
import { trackInputModality } from '../inputModality.js';
import { registerStudioIcons } from '../icons/registry.js';
import { RegionErrorBoundary } from '../RegionErrorBoundary.js';
import { htmlLang } from '@studio/i18n';
import { AstryxLanguage } from '../AstryxLanguage.js';
import { TaskManager } from './TaskManager.js';
import type { TaskSort } from './lines.js';

installRendererErrorHooks('task-manager');
document.documentElement.lang = htmlLang();
registerStudioIcons();
trackInputModality();

const bridge = window.studioTaskManager;

function TaskManagerWindow(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<TaskManagerSnapshot | null>(null);
  const [sort, setSort] = useState<TaskSort>({ key: 'cpu', direction: 'descending' });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const off = bridge.onSnapshot(setSnapshot);
    void bridge.snapshot().then((first) => {
      if (first !== null) setSnapshot((current) => current ?? first);
    });
    return off;
  }, []);

  const onSortChange = useCallback((next: TaskSort) => {
    setSort(next);
    bridge.noted('sort');
  }, []);
  const onExpandedChange = useCallback((next: boolean) => {
    setIsExpanded(next);
    if (next) bridge.noted('expand');
  }, []);
  const onRefresh = useCallback(() => bridge.refresh(), []);
  const onShowTab = useCallback((tabId: string) => bridge.showTab(tabId), []);

  return (
    <TaskManager
      snapshot={snapshot}
      sort={sort}
      isExpanded={isExpanded}
      onSortChange={onSortChange}
      onExpandedChange={onExpandedChange}
      onRefresh={onRefresh}
      onShowTab={onShowTab}
      windowControls={bridge.windowControls}
    />
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from task-manager.html');
createRoot(container).render(
  <StrictMode>
    <AstryxLanguage>
      <RegionErrorBoundary region="task-manager">
        <TaskManagerWindow />
      </RegionErrorBoundary>
    </AstryxLanguage>
  </StrictMode>,
);
