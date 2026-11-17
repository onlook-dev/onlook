import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportPanelSurface } from './ExportPanel.js';
import { IMAGE_FORMATS } from './exportPanelState.js';

const target = { nodeId: 'browser', title: 'Quarterly update', artifact: undefined };
const disabledExport = /<button[^>]*data-testid="artifact-export-run"[^>]*disabled|<button[^>]*disabled[^>]*data-testid="artifact-export-run"/;

function render(overrides: Partial<React.ComponentProps<typeof ExportPanelSurface>> = {}) {
  return renderToStaticMarkup(<ExportPanelSurface targets={[target]} formats={['png']} allowed={IMAGE_FORMATS} isExporting={false} refusal={null} savedName={null} unexportable={null} onExport={() => {}} onClose={() => {}} {...overrides} />);
}

it('names the selected frame and offers the chosen image format', () => {
  const markup = render();
  expect(markup).toContain('Quarterly update');
  expect(markup).toContain('PNG 1x');
  expect(markup).toContain('data-testid="artifact-export-run"');
  expect(markup).not.toContain('role="alert"');
});

it('disables export when no frame or no format is selected', () => {
  for (const overrides of [{ targets: [] }, { formats: [] }]) {
    const markup = render(overrides);
    expect(markup).toMatch(disabledExport);
  }
  expect(render({ targets: [] })).toContain('data-testid="artifact-export-empty"');
});

it('shows export progress, accessible refusal and saved filename states', () => {
  expect(render({ isExporting: true })).toMatch(disabledExport);
  expect(render({ refusal: 'Frame unavailable' })).toContain('role="alert"');
  expect(render({ savedName: 'Quarterly update@2x.png' })).toContain('Saved Quarterly update@2x.png.');
});
