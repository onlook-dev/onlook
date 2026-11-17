import { expect, it } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import type { ArtifactManifest } from '@studio/events';
import { artifactPdfPrintOptions, joinArtifactPdf } from './pdf.js';

const manifest = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shop', pages: [{ path: 'pages/basket.html', name: 'Basket' }] } as ArtifactManifest;
async function section(widths: number[]): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (const width of widths) document.addPage([width, 400]);
  return document.save({ addDefaultPage: false });
}

it('preserves every physical printed sheet of one document and its dimensions', async () => {
  const calls: string[] = [];
  const bytes = await joinArtifactPdf(manifest, { current: async () => true, print: async (page) => {
    calls.push(page.path);
    return section(page.name === 'Basket' ? [300, 301] : [500]);
  } });
  const document = await PDFDocument.load(bytes);
  expect(calls).toEqual(['pages/basket.html']);
  expect(document.getPages().map((page) => page.getWidth())).toEqual([300, 301]);
  expect(document.getTitle()).toBe('Shop');
});

it('escapes user names in print headers and requests full background A4 printing', () => {
  const options = artifactPdfPrintOptions('<script>bad</script>', 'A & B');
  expect(options.headerTemplate).toContain('&lt;script&gt;');
  expect(options.headerTemplate).toContain('A &amp; B');
  expect(options.headerTemplate).not.toContain('<script>');
  expect(options).toMatchObject({ pageSize: 'A4', printBackground: true, displayHeaderFooter: true, preferCSSPageSize: false });
});

it('refuses deleted, newer-reader, changed or closed consumers before printing and after asynchronous rendering', async () => {
  let calls = 0;
  await expect(joinArtifactPdf(manifest, { current: async () => false, print: async () => { calls += 1; return section([300]); } })).rejects.toThrow('changed');
  expect(calls).toBe(0);
  let current = true;
  await expect(joinArtifactPdf({ ...manifest, pages: manifest.pages.slice(0, 1) }, { current: async () => current, print: async () => { current = false; return section([300]); } })).rejects.toThrow('changed');
});

it('rejects malformed, empty and over-budget printed documents without producing an export', async () => {
  await expect(joinArtifactPdf(manifest, { current: async () => true, print: async () => new Uint8Array([1, 2]) })).rejects.toThrow();
  await expect(joinArtifactPdf(manifest, { current: async () => true, print: async () => section([]) })).rejects.toThrow('sheet budget');
  await expect(joinArtifactPdf(manifest, { current: async () => true, print: async () => new Uint8Array(64 * 1024 * 1024 + 1) })).rejects.toThrow('size budget');
  await expect(joinArtifactPdf({ ...manifest, pages: [] }, { current: async () => true, print: async () => section([300]) })).rejects.toThrow('page list');
  await expect(joinArtifactPdf(manifest, { current: async () => true, print: async () => section(Array.from({ length: 513 }, () => 300)) })).rejects.toThrow('sheet budget');
});
