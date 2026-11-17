import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import {
  ProjectMenuItems,
  type ProjectMenuProps,
  WorkspaceMenuItems,
  type WorkspaceMenuProps,
} from './menus.js';

function menu(props: ProjectMenuProps = {}): string {
  return renderToStaticMarkup(<ProjectMenuItems onReveal={() => {}} {...props} />);
}

function workspaceMenu(props: WorkspaceMenuProps = {}): string {
  return renderToStaticMarkup(<WorkspaceMenuItems onNewProject={() => {}} {...props} />);
}

/** The opening tag of the row carrying a label — the disabled state rides the row, not the label node. */
function rowWith(markup: string, label: string): string {
  const at = markup.indexOf(label);
  expect(at).toBeGreaterThan(-1);
  const role = markup.lastIndexOf('role="menuitem"', at);
  expect(role).toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf('<', role), markup.indexOf('>', role) + 1);
}

describe('the project card menu (ONL-2315)', () => {
  it('offers Make a copy between rename and reveal on active and archived cards', () => {
    for (const isArchived of [false, true]) {
      const markup = menu({ isArchived, onDuplicate: () => {} });
      const copyAt = markup.indexOf('Make a copy');
      expect(copyAt).toBeGreaterThan(markup.indexOf(t('projects.menu.rename')));
      expect(copyAt).toBeLessThan(markup.indexOf(t('projects.menu.reveal')));
      expect(rowWith(markup, 'Make a copy')).not.toContain('aria-disabled');
    }
  });

  it('disables copying a missing folder without disabling rename or restore', () => {
    const markup = menu({ isMissing: true, isArchived: true, onDuplicate: () => {} });
    expect(rowWith(markup, 'Make a copy')).toContain('aria-disabled="true"');
    expect(rowWith(markup, t('projects.menu.rename'))).not.toContain('aria-disabled');
    expect(rowWith(markup, t('projects.menu.restore'))).not.toContain('aria-disabled');
  });

  it('disables copying at the open-Project limit and explains why', () => {
    const markup = menu({ copyLimitReached: true, onDuplicate: () => {} });
    expect(rowWith(markup, 'Make a copy')).toContain('aria-disabled="true"');
    expect(markup).toContain('Close a Project');
    expect(rowWith(markup, t('projects.menu.reveal'))).not.toContain('aria-disabled');
  });

  it('disables copying while capacity is unresolved without claiming the limit is reached', () => {
    const markup = menu({ copyLimitReached: null, onDuplicate: () => {} });

    expect(rowWith(markup, t('projects.menu.duplicate'))).toContain('aria-disabled="true"');
    expect(markup).not.toContain(t('projects.menu.copyLimit'));
    expect(rowWith(markup, t('projects.menu.reveal'))).not.toContain('aria-disabled');
    expect(rowWith(markup, t('projects.menu.rename'))).not.toContain('aria-disabled');
  });

  it('draws reveal between rename and archive', () => {
    const markup = menu();

    expect(markup.indexOf(t('projects.menu.reveal'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.rename')),
    );
    expect(markup.indexOf(t('projects.menu.archive'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.reveal')),
    );
  });

  it('leaves reveal live on a card whose folder is there', () => {
    expect(rowWith(menu(), t('projects.menu.reveal'))).not.toContain('aria-disabled');
  });

  it('disables reveal on a card whose folder is gone, rather than letting it appear to act', () => {
    const markup = menu({ isMissing: true });

    expect(rowWith(markup, t('projects.menu.reveal'))).toContain('aria-disabled="true"');
    expect(rowWith(markup, t('projects.menu.rename'))).not.toContain('aria-disabled');
    expect(rowWith(markup, t('projects.menu.archive'))).not.toContain('aria-disabled');
  });

  it('draws remove after archive on an active card', () => {
    const markup = menu();

    expect(markup.indexOf(t('projects.menu.remove'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.archive')),
    );
  });

  it('draws remove on an archived card, where restore stands in for archive', () => {
    const markup = menu({ isArchived: true });

    expect(markup).toContain(t('projects.menu.restore'));
    expect(markup.indexOf(t('projects.menu.remove'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.restore')),
    );
  });

  it('leaves remove live on a card whose folder is gone, which is the card that most needs it', () => {
    expect(rowWith(menu({ isMissing: true }), t('projects.menu.remove'))).not.toContain(
      'aria-disabled',
    );
  });
});

describe('the workspace row menu (ONL-2523)', () => {
  it('draws remove after archive on an active folder', () => {
    const markup = workspaceMenu();

    expect(markup.indexOf(t('projects.menu.removeWorkspace'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.archive')),
    );
  });

  it('draws remove on an archived folder, where restore stands in for archive', () => {
    const markup = workspaceMenu({ isArchived: true });

    expect(markup).toContain(t('projects.menu.restore'));
    expect(markup.indexOf(t('projects.menu.removeWorkspace'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.restore')),
    );
  });

  it('keeps new project and rename above the divider, where they were', () => {
    const markup = workspaceMenu();

    expect(markup.indexOf(t('projects.menu.renameWorkspace'))).toBeGreaterThan(
      markup.indexOf(t('projects.newProject')),
    );
    expect(markup.indexOf(t('projects.menu.archive'))).toBeGreaterThan(
      markup.indexOf(t('projects.menu.renameWorkspace')),
    );
  });

  it('leaves remove live, because a folder has no state that should disable it', () => {
    expect(rowWith(workspaceMenu(), t('projects.menu.removeWorkspace'))).not.toContain(
      'aria-disabled',
    );
  });
});
