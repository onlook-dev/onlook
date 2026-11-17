// Markup only: Bun has no DOM, so the rail's footer arrives here as the HTML it renders.

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProjectsSidebar, type ProjectsSidebarProps } from './ProjectsSidebar.js';

const CARD = 'data-testid="projects-discover"';
const VERSION = 'data-testid="projects-version"';

const WORKSPACES = [{ id: 'zest-maps', name: 'zest-maps' }];

/** Enough rows to overflow the column, so the card is proven to follow the scroller. */
const MANY_WORKSPACES = Array.from({ length: 40 }, (_, i) => ({
  id: `folder-${String(i)}`,
  name: `folder-${String(i)}`,
}));

function markup(over: Partial<ProjectsSidebarProps> = {}): string {
  return renderToStaticMarkup(<ProjectsSidebar workspaces={WORKSPACES} {...over} />);
}

describe('the rail footer (ONL-2443)', () => {
  it('shows an existing-artifact view alongside Recent and Settings only on a positive store answer', () => {
    expect(markup()).not.toContain('projects-artifacts');
    const html = markup({ hasArtifacts: true, isArtifactsSelected: true, onSelectArtifacts: () => undefined });
    expect(html).toContain('projects-artifacts');
    expect(html.indexOf('Recent Projects')).toBeLessThan(html.indexOf('projects-artifacts'));
    expect(html.indexOf('projects-artifacts')).toBeLessThan(html.indexOf('projects-settings'));
    expect(html.slice(html.indexOf('projects-artifacts'))).toContain('data-selected="true"');
    expect(html).not.toContain('New Artifact');
    expect(html).not.toContain('Open Artifacts');
  });
  it('keeps Settings an action row, which no selection in the rail can mark (ONL-2499)', () => {
    for (const over of [
      { isRecentSelected: true },
      { hasArtifacts: true, isArtifactsSelected: true, onSelectArtifacts: () => undefined },
      { selectedWorkspaceId: 'zest-maps' },
    ]) {
      const html = markup(over);
      const row = html.slice(html.indexOf('projects-settings'));
      expect(row).toContain('Settings');
      expect(row.slice(0, row.indexOf('</div>'))).not.toContain('data-selected');
    }
  });

  it('keeps draft creation but has no repo-free artifact entry', () => {
    const html = markup({ onCreateBlank: () => undefined });
    expect(html).toContain('projects-new-draft');
    expect(html).not.toContain('projects-new-artifact');
    expect(html).not.toContain('Open Artifacts');
    expect(html).not.toContain('New Artifact');
  });

  it('draws the card on the answer it is handed, and nothing on a false one', () => {
    expect(markup({ isDiscoverVisible: true })).toContain(CARD);
    expect(markup({ isDiscoverVisible: false })).not.toContain(CARD);
  });

  it('draws the card while the version is still absent', () => {
    const html = markup({ isDiscoverVisible: true });
    expect(html).toContain(CARD);
    expect(html).not.toContain(VERSION);
  });

  it('draws the version label whether or not the card is there', () => {
    expect(markup({ version: '0.4.0-beta.812' })).toContain(VERSION);
    expect(markup({ version: '0.4.0-beta.812', isDiscoverVisible: true })).toContain(VERSION);
  });

  it('puts the card above the version label', () => {
    const html = markup({ version: '0.4.0-beta.812', isDiscoverVisible: true });
    expect(html.indexOf(CARD)).toBeLessThan(html.indexOf(VERSION));
  });

  it('puts the card after the scrolling workspace list, at any workspace count', () => {
    const html = markup({ workspaces: MANY_WORKSPACES, isDiscoverVisible: true });
    expect(html.indexOf('data-workspace-id="folder-39"')).toBeLessThan(html.indexOf(CARD));
  });

  it('seats the account between the card and the version label, and leaves it there when the card goes (ONL-2701)', () => {
    const account = '<span data-testid="fake-account"></span>';
    const over = { version: '0.4.0-beta.812', account: <span data-testid="fake-account" /> };
    const withCard = markup({ ...over, isDiscoverVisible: true });
    expect(withCard.indexOf(CARD)).toBeLessThan(withCard.indexOf(account));
    expect(withCard.indexOf(account)).toBeLessThan(withCard.indexOf(VERSION));
    const without = markup(over);
    expect(without).not.toContain(CARD);
    expect(without.indexOf(account)).toBeLessThan(without.indexOf(VERSION));
  });

  it('draws the account with no card and no version, and holds no empty footer without one', () => {
    expect(markup({ account: <span data-testid="fake-account" /> })).toContain('fake-account');
    expect(markup({ account: null })).not.toContain('projects-footer-group');
  });
});
