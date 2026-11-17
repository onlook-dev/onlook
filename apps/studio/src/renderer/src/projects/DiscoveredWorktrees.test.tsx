import { afterEach, describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import {
  DISCOVERED_OPEN_KEY,
  DiscoveredWorktrees,
  readDiscoveredOpen,
  discoveredMetaFor,
  type DiscoveredWorktreeItem,
} from './DiscoveredWorktrees.js';

const NOW = Date.parse('2026-10-05T12:00:00.000Z');

function item(name: string): DiscoveredWorktreeItem {
  return {
    handle: `/workspaces/zest-maps/${name}`,
    name,
    meta: discoveredMetaFor({ groupName: 'zest-maps', lastEditedAt: '2026-10-02T12:00:00.000Z' }, NOW),
    onImport: () => {},
  };
}

function section(worktrees: DiscoveredWorktreeItem[]): string {
  return renderToStaticMarkup(<DiscoveredWorktrees worktrees={worktrees} />);
}

describe('the discovered worktrees section (ONL-2522)', () => {
  it('renders nothing when nothing was found, rather than an empty heading', () => {
    expect(section([])).toBe('');
  });

  it('draws a row per candidate, each carrying the handle it passes back', () => {
    const markup = section([item('red-skylark'), item('blue-harron')]);

    expect(markup.split('data-testid="discovered-worktree-row"')).toHaveLength(3);
    expect(markup).toContain('data-worktree-path="/workspaces/zest-maps/red-skylark"');
    expect(markup).toContain('data-worktree-path="/workspaces/zest-maps/blue-harron"');
  });

  it('shows the branch’s latest own commit after the meta, and nothing when it has none (ONL-2593)', () => {
    const markup = section([{ ...item('a'), latestCommit: 'feat: tighten the header' }, item('b')]);
    expect(markup).toContain('feat: tighten the header');
    expect(markup.split('data-testid="discovered-worktree-commit"')).toHaveLength(2);
  });

  it('gives each row its own import control', () => {
    const markup = section([item('red-skylark'), item('blue-harron')]);

    expect(markup.split('data-testid="discovered-worktree-import"')).toHaveLength(3);
  });

  it('offers one count summary and a bulk import alongside the row actions', () => {
    const markup = section([item('red-skylark'), item('blue-harron')]);

    expect(markup).toContain('2 projects to import');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup.split('data-testid="discovered-worktrees-import-all"')).toHaveLength(2);
  });

  it('steps non-button text down and compacts controls without shrinking labels (ONL-2615)', () => {
    const markup = section([item('red-skylark')]);

    expect(markup).toContain('font-size:var(--font-size-base)');
    expect(markup).toContain('font-size:var(--font-size-sm)');
    expect(markup).toContain('padding-block:2px;font-size:14px');
    expect(markup).not.toContain('min-height:40px');
    expect(markup).not.toContain('min-width:104px');
  });

  it('says the workspace and when the project was last edited, never a branch or a path', () => {
    const markup = section([item('red-skylark')]);

    expect(markup).toContain('zest-maps');
    expect(markup).toContain('edited');
    expect(markup).not.toContain('fixture/red-skylark');
    expect(markup).not.toContain('/workspaces/zest-maps/red-skylark<');
  });
});

describe('the discovered row’s supporting line (ONL-2522)', () => {
  it('names the workspace and the last edit when a record supplied one', () => {
    const meta = discoveredMetaFor(
      { groupName: 'zest-maps', lastEditedAt: '2026-10-02T12:00:00.000Z' },
      NOW,
    );

    expect(meta).toContain('zest-maps');
    expect(meta).toContain('edited');
  });

  it('names the workspace alone when only git answered, rather than inventing a date', () => {
    const meta = discoveredMetaFor({ groupName: 'zest-maps' }, NOW);

    expect(meta).toBe(t('projects.discovered.meta.undated', { workspace: 'zest-maps' }));
    expect(meta).not.toContain('edited');
  });
});

describe('the discovered card remembers whether it was collapsed (ONL-2593)', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  function withStorage(storage: Partial<Storage>): void {
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });
  }
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  });

  it('opens collapsed when the last choice was to collapse', () => {
    withStorage({ getItem: (key) => (key === DISCOVERED_OPEN_KEY ? 'false' : null) });
    expect(readDiscoveredOpen()).toBe(false);
    expect(section([item('red-skylark')])).toContain('aria-expanded="false"');
  });

  it('opens expanded with no stored choice', () => {
    withStorage({ getItem: () => null });
    expect(readDiscoveredOpen()).toBe(true);
  });

  it('opens expanded when storage refuses the read', () => {
    withStorage({
      getItem: () => {
        throw new Error('denied');
      },
    });
    expect(readDiscoveredOpen()).toBe(true);
  });
});
