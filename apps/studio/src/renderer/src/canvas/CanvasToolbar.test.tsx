import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CanvasToolbar } from './CanvasToolbar.js';

const markup = (hasSectionTool: boolean): string =>
  renderToStaticMarkup(<CanvasToolbar hasSectionTool={hasSectionTool} />);

it('keeps the floating toolbar legible without filtering the live Canvas', () => {
  const toolbar = markup(false);
  expect(toolbar).not.toContain('backdrop-filter');
  expect(toolbar).toContain('background-color:var(--studio-ground)');
  expect(toolbar).toContain('background-image:linear-gradient(var(--color-background-surface), var(--color-background-surface))');
});

it('measures collapsing rows at their intrinsic width rather than their animated parent width', () => {
  expect(markup(false)).toContain('width:max-content');
});

describe('the Section tool behind its flag (ONL-2661)', () => {
  it('offers the tool and its preview slot when Sections are on', () => {
    expect(markup(true)).toContain('data-preview="section"');
  });

  it('leaves the toolbar as it ships when Sections are off', () => {
    const off = markup(false);
    expect(off).not.toContain('data-preview="section"');
    expect(off).toContain('data-preview="frame"');
  });
});
