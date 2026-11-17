import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { addCodebaseFromFolder, FIRST_RUN_ENV, chromePage, closeStudio, connectClaude, editorPage, expectCanvasDocument, launchStudio, stubFolderPicker, type Target } from './launch.js';

test('project preview screenshots contain Canvas text glyphs, not solid grey boxes', async ({}, testInfo) => {
  const workspaceRoot = makeWorkspaceRoot();
  const app = await launchStudio((process.env['STUDIO_TARGET'] ?? 'build') as Target, {
    ...FIRST_RUN_ENV, STUDIO_FIRST_RUN: '', STUDIO_WORKSPACE_ROOT: workspaceRoot, STUDIO_AGENT_VERIFY: 'ok',
  });
  try {
    const page = await editorPage(app);
    await stubFolderPicker(app, makeSourceCheckout().path);
    await connectClaude(page);
    await addCodebaseFromFolder(page);
    await expect(page.getByTestId(TESTID.canvasRegion)).toBeVisible();
    await expectCanvasDocument(page);
    const docId = await page.evaluate(async () => {
      const { doc } = await globalThis.studio.canvasSnapshot();
      if (!doc) throw new Error('no Canvas');
      for (const node of Object.values(doc.nodes)) globalThis.studio.canvasOp({ docId: doc.docId, op: { type: 'remove', id: node.id } });
      globalThis.studio.canvasOp({ docId: doc.docId, op: {
        type: 'create', node: {
          id: 'preview-text', kind: 'text', pageId: Object.values(doc.pages)[0]!.id, name: 'Checkout note',
          x: 0, y: 0, width: 480, height: 130, order: 0,
          content: { text: 'Checkout redesign\nReady for review', size: 'large', wrapWidth: 480 },
        },
      } });
      for (const [id, size, top, height, text] of [
        ['preview-medium', 'medium', 150, 38, 'Address and payment'],
        ['preview-small', 'small', 200, 22, 'A calmer checkout'],
      ] as const) {
        globalThis.studio.canvasOp({ docId: doc.docId, op: { type: 'create', node: {
          id, kind: 'text', pageId: Object.values(doc.pages)[0]!.id, name: text,
          x: 0, y: top, width: 480, height, order: top,
          content: { text, size },
        } } });
      }
      return doc.docId;
    });
    await expect(page.getByTestId(TESTID.canvasTextNode)).toHaveCount(3);
    await expect(page.getByTestId(TESTID.canvasTextNode).first()).toContainText('Ready for review');
    const band = await chromePage(app);
    await band.getByTestId(TESTID.topbarFolder).first().click();
    const grid = await editorPage(app, 'projects');
    const thumbnail = grid.getByTestId(TESTID.projectCardThumbnail).first();
    await expect(thumbnail).toHaveAttribute('data-loaded', 'true', { timeout: 15_000 });
    const pixels = await app.evaluate(({ nativeImage, BrowserWindow }, file) => {
      const image = nativeImage.createFromPath(file);
      const bytes = image.getBitmap() as unknown as Buffer;
      let white = 0;
      let grey = 0;
      let transparent = 0;
      for (let offset = 0; offset < bytes.length; offset += 4) {
        if (bytes[offset + 3] === 0) transparent += 1;
        if (bytes[offset] === 255 && bytes[offset + 1] === 255 && bytes[offset + 2] === 255 && bytes[offset + 3] === 255) white += 1;
        if (bytes[offset] === 148 && bytes[offset + 1] === 148 && bytes[offset + 2] === 148 && bytes[offset + 3] === 255) grey += 1;
      }
      return { white, grey, transparent, size: image.getSize(), transientPages: BrowserWindow.getAllWindows().filter((window) => window.webContents.getURL().startsWith('data:text/html')).length };
    }, join(workspaceRoot, 'canvas', `${docId}.thumb.png`));
    expect(pixels.size).toEqual({ width: 1024, height: 525 });
    expect(pixels.white).toBeGreaterThan(100);
    expect(pixels.grey).toBe(0);
    expect(pixels.transparent).toBeGreaterThan(1000);
    expect(pixels.transientPages).toBe(0);
    await testInfo.attach('project-preview-text', { body: await thumbnail.screenshot(), contentType: 'image/png' });
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
