import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtifactPageViewer } from './ArtifactPageViewer.js';

it('opens one live page viewport with an explicit pending state instead of stretching a thumbnail', () => {
  const markup = renderToStaticMarkup(<ArtifactPageViewer artifact={{id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shop', pagePath: 'pages/index.html', updatedAt: 'one', readOnly: false, pages: [{path: 'pages/index.html', name: 'Welcome'}, {path: 'pages/cart.html', name: 'Basket'}]}} pagePath="pages/index.html" onNavigate={() => {}} onClose={() => {}} />);
  expect(markup).toContain('artifact-live-page');
  expect(markup).toContain('role="region"');
  expect(markup).toContain('artifact-detail-close');
  expect(markup).not.toContain('<dialog');
  expect(markup).not.toContain('transform:');
  expect(markup).not.toContain('Previous page');
  expect(markup).not.toContain('Next page');
  expect(markup).toContain('Rendering page');
  expect(markup).not.toContain('<img');
  expect(markup).not.toContain('artifact-page-preview');
});
