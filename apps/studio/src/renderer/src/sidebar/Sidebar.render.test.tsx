import { afterEach, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { WorkspaceCreated } from '@studio/events';
import { Sidebar } from './Sidebar.js';
import { useWorkspaceStore } from '../workspace/store.js';

afterEach(() => { useWorkspaceStore.getInitialState().workspace = null; });

it('renders a restored blank project without a saved branch name', () => {
  const workspace: WorkspaceCreated = {
    workspacePath: '/fixture/project',
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'Project',
    sourcePath: '/fixture/source',
    sourceRepoRoot: '/fixture/source',
    repoIdentity: 'blank/fixture',
    copiedEnvFiles: [],
    origin: 'blank',
  };
  delete (workspace as Partial<WorkspaceCreated>).branchName;
  useWorkspaceStore.getInitialState().workspace = workspace;
  const markup = renderToStaticMarkup(<Sidebar />);
  expect(markup).toContain('teal-skylark');
  expect(markup).toContain('sidebar-project-title');
  expect(markup).not.toContain('data-testid="sidebar-project-branch"');
});
