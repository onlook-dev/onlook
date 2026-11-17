import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtifactsPage } from './ArtifactsPage.js';

it('opens a large library with every preview and title before mounting card controls', () => {
  const records = Array.from({length: 512}, (_, index) => ({id: `aaaaaaaa-1111-4111-8111-${String(index).padStart(12, '0')}`, title: `Study ${index}`, updatedAt: '', pagePath: 'pages/index.html', readOnly: false}));
  const markup = renderToStaticMarkup(<ArtifactsPage records={records} error={false} />);
  expect(markup.match(/data-testid="artifact-page-preview"/g)).toHaveLength(512);
  expect(markup.match(/data-testid="artifact-title-button"/g)).toHaveLength(512);
  expect(markup.match(/data-testid="artifact-export-menu"/g) ?? []).toHaveLength(0);
});

it('browses a responsive grid of single-document sketches and disambiguates identity without a creation or agent surface', () => {
  const records = ['12340000-1111-4111-8111-000000000001', '12340001-1111-4111-8111-000000000002'].map((id) => ({ id, title: 'Pricing', pagePath: 'pages/index.html', pages: [{ path: 'pages/index.html', name: 'Home' }], updatedAt: '', readOnly: false }));
  const markup = renderToStaticMarkup(<ArtifactsPage records={records} error={false} />);
  expect(markup).toContain('Pricing · 12340000');
  expect(markup).toContain('Pricing · 12340001');
  expect(markup).not.toContain('title="12340000');
  expect(markup).toContain('data-gap="8"');
  expect(markup).not.toContain('Legacy artifact');
  expect(markup.match(/data-testid="artifact-page-preview"/g)).toHaveLength(2);
  expect(markup).not.toContain('Copy for a project');
  expect(markup).not.toContain('Add to canvas');
  expect(markup).toContain('Inspect Home');
  expect(markup).not.toContain('aria-label="Artifact options"');
  expect(markup.match(/role="menuitem"/g) ?? []).toHaveLength(0);
  expect(markup).not.toContain('New Artifact');
  expect(markup).not.toContain('composer');
  expect(markup).not.toContain('webview');
});

it('keeps unavailable/loading distinct from empty and newer-reader actions disabled', () => {
  expect(renderToStaticMarkup(<ArtifactsPage records={null} error={false} />)).toContain('Reading artifacts');
  const error = renderToStaticMarkup(<ArtifactsPage records={null} error />);
  expect(error).toContain('role="alert"');
  expect(error).toContain('Try again');
  expect(error).not.toContain('No artifacts.');
  expect(renderToStaticMarkup(<ArtifactsPage records={[]} error={false} />)).toContain('No artifacts.');
  const newer = renderToStaticMarkup(<ArtifactsPage records={[{ id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Future', pagePath: 'pages/index.html', updatedAt: '', readOnly: true }]} error={false} />);
  const buttons = [...newer.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);
  expect(buttons.find((button) => button.includes('aria-label="Artifact options"'))).toBeUndefined();
  expect(buttons.find((button) => button.includes('aria-label="Rename artifact"'))).toContain('disabled=""');
  expect(newer).toContain('Made in a newer Onlook version');
});
