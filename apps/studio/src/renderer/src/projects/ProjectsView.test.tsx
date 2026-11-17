import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { type DiscoveredWorktreeItem } from './DiscoveredWorktrees.js';
import { ProjectsView, type ProjectsViewProps } from './ProjectsView.js';

const PROJECTS = [{ id: '/w/red-skylark', name: 'red-skylark', meta: '2d' }];
const WORKSPACES = [{ id: 'id-zest-maps', name: 'zest-maps' }];

const CANDIDATES: DiscoveredWorktreeItem[] = [
  {
    handle: '/workspaces/zest-maps/blue-harron',
    name: 'blue-harron',
    meta: 'zest-maps',
    onImport: () => {},
  },
];

function view(props: Partial<ProjectsViewProps> = {}): string {
  return renderToStaticMarkup(
    <ProjectsView
      title="Recent Projects"
      projects={[]}
      workspaces={WORKSPACES}
      onImportExisting={() => {}}
      {...props}
    />,
  );
}

/** The fixed title row, above the scroller — where the header's own control instance sits. */
function header(markup: string): string {
  const to = markup.indexOf('data-testid="projects-scroll"');
  expect(to).toBeGreaterThan(-1);
  return markup.slice(markup.indexOf('data-testid="projects-content"'), to);
}

function body(markup: string): string {
  const from = markup.indexOf('data-testid="projects-scroll"');
  expect(from).toBeGreaterThan(-1);
  return markup.slice(from);
}

describe('the projects view’s recovery surfaces (ONL-2522)', () => {
  it('offers recovery before the populated grid', () => {
    const markup = view({
      projects: PROJECTS,
      discoveredWorktrees: CANDIDATES,
      selectedWorkspaceId: 'id-zest-maps',
    });

    expect(markup).toContain('data-testid="project-grid"');
    expect(markup.indexOf('data-testid="discovered-worktrees"')).toBeLessThan(
      markup.indexOf('data-testid="project-grid"'),
    );
  });

  it('draws the section in place of the empty state when nothing survived', () => {
    const markup = view({ projects: [], discoveredWorktrees: CANDIDATES, isRecentSelected: true });

    expect(markup).toContain('data-testid="projects-recovery"');
    expect(markup).toContain('data-testid="discovered-worktrees"');
    expect(markup).not.toContain('data-testid="project-grid"');
  });

  it('keeps the recovery container around the panel when the first project returns', () => {
    const before = view({
      projects: [],
      discoveredWorktrees: [...CANDIDATES, { handle: '/w/red-skylark', name: 'red-skylark', meta: 'zest-maps', onImport: () => {} }],
      isRecentSelected: true,
    });
    const after = view({ projects: PROJECTS, discoveredWorktrees: CANDIDATES, isRecentSelected: true });

    expect(before.split('data-testid="projects-recovery"')).toHaveLength(2);
    expect(after.split('data-testid="projects-recovery"')).toHaveLength(2);
    expect(after.indexOf('data-testid="projects-recovery"')).toBeLessThan(after.indexOf('data-testid="discovered-worktrees"'));
    expect(after).toContain('data-testid="project-grid"');
  });

  it('leaves the body empty when there is neither a project nor a candidate', () => {
    const markup = view({ projects: [], discoveredWorktrees: [], isRecentSelected: true });

    expect(markup).not.toContain('data-testid="discovered-worktrees"');
    expect(markup).not.toContain('data-testid="projects-recovery"');
  });
});

describe('the import entry’s reachability', () => {
  it('keeps the Recent header free of creation and manual import', () => {
    const band = header(view({ projects: PROJECTS, isRecentSelected: true }));

    expect(band).not.toContain('data-testid="new-project"');
    expect(band).not.toContain('data-testid="new-project-menu"');
    expect(band).not.toContain('data-testid="import-existing-project"');
    expect(band).not.toContain(t('projects.menu.importExisting'));
  });

  it('is reachable from the header on a workspace, beside a live New Project', () => {
    const band = header(view({ projects: PROJECTS, selectedWorkspaceId: 'id-zest-maps' }));

    expect(band).toContain('data-testid="new-project"');
    expect(band).toContain('data-testid="new-project-menu"');
    expect(band).toContain(t('projects.menu.importExisting'));
  });

  it('keeps import actions inside the recovery panel on Recent', () => {
    const markup = view({ projects: [], discoveredWorktrees: CANDIDATES, isRecentSelected: true });

    expect(body(markup)).not.toContain('data-testid="new-project-menu"');
    expect(header(markup)).not.toContain('data-testid="import-existing-project"');
    expect(markup).not.toContain('data-testid="new-project"');
    expect(header(markup)).not.toContain(t('projects.menu.importExisting'));
    expect(body(markup)).toContain('data-testid="discovered-worktrees"');
    expect(body(markup)).toContain(t('projects.discovered.import'));
  });

  it('leaves the Recent empty state without a manual import action', () => {
    const scroller = body(view({ projects: [], isRecentSelected: true }));

    expect(scroller).not.toContain('data-testid="import-existing-project"');
    expect(scroller).not.toContain('data-testid="new-project"');
    expect(scroller).toContain(t('projects.emptyRecent'));
    expect(scroller).not.toContain(t('projects.empty'));
    expect(scroller).not.toContain(t('projects.menu.importExisting'));
  });

  it('goes with the whole control on a content page, which creates and imports nothing', () => {
    const markup = view({ projects: [], content: 'pane', isArtifactsSelected: true });

    expect(markup).not.toContain('data-testid="new-project-menu"');
    expect(markup).not.toContain('data-testid="new-project"');
    expect(markup).not.toContain('data-testid="import-existing-project"');
  });
});
