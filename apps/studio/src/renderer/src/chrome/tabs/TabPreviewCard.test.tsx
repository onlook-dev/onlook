import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TabPreviewCard } from './TabPreviewCard.js';

describe('a tab preview name (ONL-2485)', () => {
  it('keeps the transient preview blur separate from persistent panels', () => {
    const markup = renderToStaticMarkup(<TabPreviewCard name="Project" preview={{}} left={8} now={0} />);
    expect(markup).toContain('backdrop-filter:blur(16px)');
    expect(markup).toContain('background-color:var(--color-background-surface)');
    expect(markup).not.toContain('background-image:linear-gradient');
  });

  it('wraps the full name instead of truncating it a second time', () => {
    const name = 'A project with a very long name that cannot fit on its tab';
    const markup = renderToStaticMarkup(<TabPreviewCard name={name} preview={{}} left={8} now={0} />);
    expect(markup).toContain(name);
    expect(markup).toContain('overflow-wrap:anywhere');
    expect(markup).not.toContain('text-overflow:ellipsis');
  });
});
