// Markup only: Bun has no DOM, so a hover layer is read from the tree the strip renders, never opened.

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAX_PROJECT_TABS, type TabPreview } from '@studio/events';

import { previewTab, TabStrip, type TabStripProps } from './TabStrip.js';

const noop = (): void => {};

const LONG = 'A project with a very long name indeed that cannot fit';

const PREVIEW = (): Promise<TabPreview> => Promise.resolve({});

const STRIP = new Map([
  ['active', { id: 'active', name: 'Untitled project' }],
  ['other', { id: 'other', name: 'Project' }],
]);

function admitted(hoveredId: string | undefined, over: Partial<Parameters<typeof previewTab>[0]> = {}): string | undefined {
  return previewTab({ hoveredId, tabs: STRIP, isBlocked: false, ...over });
}

describe('which hovered tab opens a preview', () => {
  it('opens one for the active tab', () => {
    expect(admitted('active')).toBe('active');
  });

  it('opens one for a tab that is not active', () => {
    expect(admitted('other')).toBe('other');
  });

  it('rejects a removed hovered id while another tab remains', () => {
    expect(admitted('closed')).toBeUndefined();
  });

  it('rejects the last closed tab and absent hover', () => {
    expect(admitted('closed', { tabs: new Map() })).toBeUndefined();
    expect(admitted(undefined)).toBeUndefined();
  });

  it('opens none for a tab being renamed or just pressed, or while a drag or the new-tab menu holds the strip', () => {
    expect(admitted('other', { editingId: 'other' })).toBeUndefined();
    expect(admitted('other', { pressedId: 'other' })).toBeUndefined();
    expect(admitted('other', { isBlocked: true })).toBeUndefined();
  });
});

function render(over: Partial<TabStripProps> = {}): string {
  return renderToStaticMarkup(
    <TabStrip
      canCreate
      tabs={[{ id: 't1', name: LONG }]}
      activeTabId="t1"
      onSelect={noop}
      onClose={noop}
      onNew={noop}
      onRename={noop}
      onReload={noop}
      {...over}
    />,
  );
}

it('replaces the new-tab menu with a noninteractive loading indicator while a Blank Draft is being created', () => {
  const markup = render({ onNewDraft: noop, isCreatingDraft: true });
  expect(markup).toContain('data-testid="tab-strip-new-loading"');
  expect(markup).not.toContain('data-testid="tab-strip-new"');
});

/** Mounted layer openings, not visibility: browser checks exercise the hover. */
function layers(markup: string): readonly string[] {
  return markup.match(/<div [^>]*role="tooltip"[^>]*>/gu) ?? [];
}

function full(name: string): readonly { id: string; name: string }[] {
  return Array.from({ length: MAX_PROJECT_TABS }, (_unused, index) => ({
    id: `t${String(index)}`,
    name,
  }));
}

describe('the tab strip\'s hover layers (ONL-2485)', () => {
  it('mounts one tooltip, without duplicating the tab name inside it', () => {
    const [layer, ...rest] = layers(render());
    expect(rest).toHaveLength(0);
    expect(layer).toBeDefined();
    expect(render().replace(/ aria-label="[^"]*"/gu, '').split(LONG)).toHaveLength(2);
  });

  it('mounts one tooltip with a preview handler too', () => {
    expect(layers(render({ onPreview: PREVIEW }))).toHaveLength(1);
  });

  it('mounts one tooltip on a strip of nothing but too-long names', () => {
    expect(layers(render({ tabs: full(LONG), activeTabId: 't0' }))).toHaveLength(1);
  });

  it('still clips a too-long name in place on the tab', () => {
    const markup = render();
    expect(markup).toContain('data-testid="tab-label-t1"');
    expect(markup).toContain('overflow:hidden;white-space:nowrap');
    expect(markup).toContain(LONG);
  });
});

describe('the new-tab control\'s layer, contained (ONL-2485)', () => {
  const TRAILING = 'position-area:self-block-end span-self-inline-start';

  it('opens below the control\'s trailing edge, with no sideways slide', () => {
    const [layer] = layers(render());
    expect(layer).toContain(TRAILING);
    expect(layer).not.toContain('span-left');
    expect(layer).not.toContain('span-right');
  });

  it('opens from that edge when the control carries the draft menu', () => {
    const [layer] = layers(render({ onNewDraft: noop }));
    expect(layer).toContain(TRAILING);
  });

  it('opens from that edge when the strip is full and the control says why', () => {
    const [layer] = layers(render({ tabs: full('Project'), activeTabId: 't0' }));
    expect(layer).toContain(TRAILING);
  });
});
