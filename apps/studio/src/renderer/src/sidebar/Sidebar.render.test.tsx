import { afterEach, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { WorkspaceCreated } from '@studio/events';
import { t } from '@studio/i18n';
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
  workspace.branchName = 'fixture/teal-skylark';
  const withBranch = renderToStaticMarkup(<Sidebar />);
  expect(withBranch).toContain(t('sidebar.projectTitle.untitled'));
  expect(withBranch).toContain('fixture/teal-skylark');
  workspace.history = 'none';
  const withoutHistory = renderToStaticMarkup(<Sidebar />);
  expect(withoutHistory).not.toContain('data-testid="sidebar-project-branch"');
  expect(withoutHistory).not.toContain('fixture/teal-skylark');
  workspace.displayName = 'Landing Page';
  delete (workspace as Partial<WorkspaceCreated>).branchName;
  expect(renderToStaticMarkup(<Sidebar />)).toContain('Landing Page');
});
