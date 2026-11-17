import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { useProjectName } from '../projects/useProjectName.js';
import type { LeftPanelView } from '../rail/leftPanel.js';
import './panels.css';

export function LeftPanelContent({ view, width, children }: { view: LeftPanelView; width?: number; children: ReactNode }): React.JSX.Element {
  const projectName = useProjectName();
  return <div data-testid="left-panel-content" data-view={view}
    className={projectName === undefined ? undefined : 'has-shared-project-name'}
    style={{ position: 'relative', display: 'flex', flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    {projectName !== undefined && (
      <div className="left-panel-project-name" aria-hidden="true" data-testid="left-panel-project-name">
        <Text type="body" weight="medium" color="primary" maxLines={1}>{projectName}</Text>
      </div>
    )}
    {/* The editor lays out once at its destination width. Files follows the
        shell instead, so its surface and border shrink with the visible edge. */}
    <div style={{ display: 'flex', flexShrink: 0, width: view === 'code' ? width ?? '100%' : '100%', minWidth: 0, minHeight: 0 }}>
      {children}
    </div>
  </div>;
}
