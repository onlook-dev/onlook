import { useLayoutEffect, useRef } from 'react';
import type { WorkspaceCreated } from '@studio/events';
import { RegionErrorBoundary } from '../../RegionErrorBoundary.js';
import { Sidebar } from '../../sidebar/Sidebar.js';
import { HAIRLINE, SURFACE } from '../../panels/rowGeometry.js';
import { useWorkspaceStore } from '../../workspace/store.js';
import type { Category } from './Showroom.js';

function UnavailableSidebar(): React.JSX.Element {
  throw new TypeError("Cannot read properties of undefined (reading 'slice')");
}

function RecoveryPanel({ state }: { state: 'missing' | 'error' | 'focus' }): React.JSX.Element {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const before = useWorkspaceStore.getState().workspace;
    const workspace: WorkspaceCreated = {
      workspacePath: '/showroom/recovered-project', workspaceName: 'teal-skylark',
      branchName: 'fixture/teal-skylark',
      baseBranch: 'main', sourceRepoName: 'Project', sourcePath: '/showroom/source',
      sourceRepoRoot: '/showroom/source', repoIdentity: 'blank/showroom',
      copiedEnvFiles: [], origin: 'blank',
    };
    delete (workspace as Partial<WorkspaceCreated>).branchName;
    useWorkspaceStore.setState({ workspace });
    const focus = requestAnimationFrame(() => {
      if (state === 'focus') panel.current?.querySelector('button')?.focus();
    });
    return () => { cancelAnimationFrame(focus); useWorkspaceStore.setState({ workspace: before }); };
  }, [state]);
  return <div ref={panel} style={{ width: 259, height: 520, background: 'var(--studio-ground)' }}>
    <RegionErrorBoundary region="sidebar" fallbackStyle={{ flex: '1 1 auto', minWidth: 0, ...SURFACE, borderRight: HAIRLINE }}>
      {state === 'missing' ? <Sidebar /> : <UnavailableSidebar />}
    </RegionErrorBoundary>
  </div>;
}

export const SIDEBAR_RECOVERY: Category = {
  id: 'recovery', title: 'Recovery', stories: [
    { id: 'sidebar-missing-branch', title: 'A restored project without branch details', render: () => <RecoveryPanel state="missing" /> },
    { id: 'sidebar-error', title: 'A Sidebar failure', render: () => <RecoveryPanel state="error" /> },
    { id: 'sidebar-error-focus', title: 'Retry with keyboard focus', render: () => <RecoveryPanel state="focus" /> },
  ],
};
