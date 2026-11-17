import { PDFDocument } from 'pdf-lib';
import type { ArtifactManifest } from '@studio/events';
import { artifactRenderQueue } from './render-queue.js';
import { withArtifactPageContents } from './preview.js';

const MAX_PDF_BYTES = 64 * 1024 * 1024;
const MAX_PDF_SHEETS = 512;
const escapeHtml = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function artifactPdfPrintOptions(title: string, pageName: string): Electron.PrintToPDFOptions {
  return {
    pageSize: 'A4',
    printBackground: true,
    preferCSSPageSize: false,
    displayHeaderFooter: true,
    margins: { top: 0.7, bottom: 0.5, left: 0.4, right: 0.4 },
    headerTemplate: `<div style="font-family:system-ui;font-size:10px;width:100%;text-align:center">${escapeHtml(title)} · ${escapeHtml(pageName)}</div>`,
    footerTemplate: '<div style="font-family:system-ui;font-size:9px;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    generateTaggedPDF: true,
  };
}

export function printArtifactPage(manifest: ArtifactManifest, page: ArtifactManifest['pages'][number], wanted: () => boolean): Promise<Uint8Array> {
  const request = { artifactId: manifest.id, pagePath: page.path, updatedAt: manifest.updatedAt };
  return artifactRenderQueue.run(wanted, () => withArtifactPageContents(request, (contents) => contents.printToPDF(artifactPdfPrintOptions(manifest.title, page.name)), 20_000));
}

export async function joinArtifactPdf(manifest: ArtifactManifest, deps: {
  current(): Promise<boolean>;
  print(page: ArtifactManifest['pages'][number]): Promise<Uint8Array>;
}): Promise<Uint8Array> {
  if (manifest.pages.length !== 1) throw new Error('invalid PDF page list');
  const document = await PDFDocument.create();
  document.setTitle(manifest.title);
  document.setProducer('Onlook');
  let bytes = 0;
  for (const page of manifest.pages) {
    if (!await deps.current()) throw new Error('artifact changed during PDF export');
    const printed = await deps.print(page);
    bytes += printed.byteLength;
    if (bytes > MAX_PDF_BYTES) throw new Error('PDF size budget exceeded');
    const section = await PDFDocument.load(printed);
    if (section.getPageCount() === 0 || document.getPageCount() + section.getPageCount() > MAX_PDF_SHEETS) throw new Error('PDF sheet budget exceeded');
    const copied = await document.copyPages(section, section.getPageIndices());
    for (const sheet of copied) document.addPage(sheet);
  }
  if (!await deps.current()) throw new Error('artifact changed during PDF export');
  const result = await document.save();
  if (result.byteLength > MAX_PDF_BYTES) throw new Error('PDF size budget exceeded');
  return result;
}
