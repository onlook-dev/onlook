import { expect, it } from 'bun:test';
import { compatibleExportFormats, exportOperations, EXPORT_FORMATS, IMAGE_FORMATS, removeExportFormat, replaceExportFormat, useExportPanel } from './exportPanelState.js';

it('keeps browser formats image-only without resurrecting the last removed format', () => {
  expect(compatibleExportFormats(['html'], IMAGE_FORMATS)).toEqual(['png']);
  expect(compatibleExportFormats([], IMAGE_FORMATS)).toEqual([]);
  expect(compatibleExportFormats(['png-2x'], IMAGE_FORMATS)).toEqual(['png']);
  expect(EXPORT_FORMATS).not.toContain('png-2x');
  useExportPanel.setState({ formats: ['html', 'jpeg'] });
  removeExportFormat('jpeg', IMAGE_FORMATS);
  expect(useExportPanel.getState().formats).toEqual([]);
  useExportPanel.setState({ formats: ['html', 'png'] });
  removeExportFormat('png', IMAGE_FORMATS);
  expect(useExportPanel.getState().formats).toEqual([]);
  useExportPanel.setState({ formats: ['html'] });
  replaceExportFormat('png', 'jpeg', IMAGE_FORMATS);
  expect(useExportPanel.getState().formats).toEqual(['jpeg']);
  useExportPanel.setState({ formats: ['html'] });
});

it('deduplicates HTML/PDF for shared Artifacts but exports each selected image viewport', () => {
  const artifact = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shared', pagePath: 'pages/index.html', updatedAt: 'now', readOnly: false };
  const targets = [{ nodeId: 'a', title: 'Shared', artifact }, { nodeId: 'b', title: 'Shared', artifact }];
  const operations = exportOperations(targets, EXPORT_FORMATS);
  expect(operations.filter(operation => operation.format === 'html')).toHaveLength(1);
  expect(operations.filter(operation => operation.format === 'pdf')).toHaveLength(1);
  for (const format of IMAGE_FORMATS) expect(operations.filter(operation => operation.format === format)).toHaveLength(2);
  expect(exportOperations(targets, ['png-2x'])).toEqual([]);
});
