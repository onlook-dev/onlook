import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftPanelContent } from './LeftPanelContent.js';

describe('left panel content', () => {
  it('shows the active view at once, with no fade that would drop the panel blur (ONL-2593)', () => {
    const markup = renderToStaticMarkup(<LeftPanelContent view="code"><div>Active code</div></LeftPanelContent>);
    expect(markup).toContain('Active code');
    expect(markup).not.toContain('inert');
    expect(markup).not.toContain('opacity:');
  });
});
