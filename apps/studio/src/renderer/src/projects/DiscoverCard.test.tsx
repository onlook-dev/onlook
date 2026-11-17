// Markup only: Bun has no DOM, so the card's copy arrives here as the catalog values it renders.

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { DiscoverCard, ONLOOK_REPOSITORY_URL, type DiscoverCardProps } from './DiscoverCard.jsx';
import { en } from '@studio/i18n/strings';

function markup(over: Partial<DiscoverCardProps> = {}): string {
  return renderToStaticMarkup(
    <DiscoverCard onStar={() => undefined} onDismiss={() => undefined} {...over} />,
  );
}

function action(html: string, name: 'star' | 'dismiss'): string {
  const start = html.indexOf(`data-testid="projects-discover-${name}"`);
  expect(start).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', start);
  const end = html.indexOf('</button>', start);
  return html.slice(open, end);
}

describe('the discover card (ONL-2443)', () => {
  it('offers exactly the two actions, each reachable on its own', () => {
    const html = markup();
    expect(html).toContain('data-testid="projects-discover-star"');
    expect(html).toContain('data-testid="projects-discover-dismiss"');
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it('nests no interactive element inside another', () => {
    expect(markup()).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  });

  it('draws every word from the catalog rather than a literal in the component', () => {
    const html = markup();
    expect(html).toContain(en['projects.discover.title']);
    expect(html).toContain(en['projects.discover.star']);
  });

  it('draws the dismiss as an icon-only ✕ that keeps its catalog name', () => {
    const dismiss = action(markup(), 'dismiss');
    expect(dismiss).toContain('<svg');
    expect(dismiss).toContain(`aria-label="${en['projects.discover.dismiss']}"`);
  });

  it('points the star at the project repository over https', () => {
    expect(ONLOOK_REPOSITORY_URL).toBe('https://github.com/onlook-dev/onlook');
  });
});
