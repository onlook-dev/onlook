// Markup only: Bun has no DOM, so the row's state arrives here as the props the list passes.

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { PageRow, type PageRowProps } from './PagesList.js';
import type { PageRowFacts } from './pageRow.js';

const FACTS: PageRowFacts = {
  id: 'pg_a',
  name: 'Checkout',
  order: 0,
  isDivider: false,
  isCurrent: false,
  isWorking: false,
};

function markup(facts: Partial<PageRowFacts> = {}, over: Partial<PageRowProps> = {}): string {
  return renderToStaticMarkup(
    <PageRow
      facts={{ ...FACTS, ...facts }}
      isRenaming={false}
      phase={0}
      onSelect={() => undefined}
      onBeginRename={() => undefined}
      onCommitRename={() => undefined}
      onCancelRename={() => undefined}
      onWarm={() => undefined}
      {...over}
    />,
  );
}

function row(over: Partial<PageRowProps> = {}): React.ReactElement<{
  onPointerEnter?: () => void;
  onFocus?: () => void;
}> {
  return PageRow({
    facts: FACTS,
    isRenaming: false,
    phase: 0,
    onSelect: () => undefined,
    onBeginRename: () => undefined,
    onCommitRename: () => undefined,
    onCancelRename: () => undefined,
    onWarm: () => undefined,
    ...over,
  }) as React.ReactElement<{ onPointerEnter?: () => void; onFocus?: () => void }>;
}

describe('what a page row is made of', () => {
  it('is a button carrying its own name, so a reader hears the page it is on', () => {
    const html = markup();
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Checkout"');
    expect(html).toContain('Checkout');
  });

  it('nests no interactive element inside another while renaming', () => {
    const html = markup({}, { isRenaming: true });
    expect(html).toContain('<input');
    expect(html).not.toContain('<button');
  });

  it('marks the current row, and only it', () => {
    expect(markup({ isCurrent: true })).toContain('aria-current="true"');
    expect(markup()).not.toContain('aria-current');
  });

  it('leaves a divider unpressable and off the focus order, labelled as a rule rather than by its name', () => {
    const html = markup({ name: '---', isDivider: true });
    expect(html).not.toContain('<button');
    expect(html).not.toContain('data-page-focus');
    expect(html).toContain('role="separator"');
    expect(html).not.toContain('aria-label="---"');
  });

  it('keeps the divider row its own rename field, the way back from a mistyped name', () => {
    const html = markup({ name: '---', isDivider: true }, { isRenaming: true });
    expect(html).toContain('<input');
    expect(html).toContain('value="---"');
  });

  it('draws a divider as a rule rather than its name', () => {
    const html = markup({ name: '---', isDivider: true });
    expect(html).toContain('role="separator"');
    expect(html).not.toContain('>---<');
  });

  it('marks the row the agent is working on, and leaves a resting row unmarked (ONL-2488)', () => {
    expect(markup({ isWorking: true })).toContain('data-working');
    expect(markup()).not.toContain('data-working');
  });

  it('warms its page from the pointer resting on it and from keyboard focus landing on it (ONL-2791)', () => {
    const warmed: string[] = [];
    const pressable = row({ onWarm: () => warmed.push('warm') });
    pressable.props.onPointerEnter?.();
    pressable.props.onFocus?.();
    expect(warmed).toEqual(['warm', 'warm']);
  });
});
