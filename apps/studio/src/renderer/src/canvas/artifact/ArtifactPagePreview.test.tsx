import { expect, it, spyOn } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtifactPagePreview } from './ArtifactPagePreview.js';
import { artifactPreviewDemand, type PreviewState } from './previewDemand.js';

it('puts retry inside failed thumbnail previews and outside the inspection button', () => {
  const artifact = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing', pagePath: 'pages/index.html', updatedAt: 'one', readOnly: false };
  const page = { path: artifact.pagePath, name: 'Home' };
  for (const outcome of ['missing', 'unavailable', 'reading', 'ready'] as const) {
    const state: PreviewState = outcome === 'ready' ? { outcome, image: 'data:image/png;base64,AA==' } : { outcome };
    const peek = spyOn(artifactPreviewDemand, 'peek').mockReturnValue(state);
    try {
      const markup = renderToStaticMarkup(<ArtifactPagePreview artifact={artifact} page={page} onInspect={() => {}} />);
      if (outcome === 'missing' || outcome === 'unavailable') {
        expect(markup).toContain('artifact-preview-retry');
        expect(markup.indexOf('</button>')).toBeLessThan(markup.indexOf('artifact-preview-retry'));
        expect(markup.indexOf('artifact-preview-retry')).toBeLessThan(markup.indexOf('<figcaption'));
      } else {
        expect(markup).not.toContain('Retry preview');
      }
    } finally {
      peek.mockRestore();
    }
  }
});
