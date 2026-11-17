import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { addCodebaseFromFolder, chromePage, closeStudio, connectClaude, editorPage, FIRST_RUN_ENV, isTargetPresent, launchStudio, missingHint, stubFolderPicker, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

test('macOS close and Dock activation keep the Tabs and their renderers, without blocking Quit', async () => {
  test.skip(process.platform !== 'darwin', 'macOS window lifecycle');
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const studio = await launchStudio(target, { ...FIRST_RUN_ENV, STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(), STUDIO_AGENT_VERIFY: 'ok', STUDIO_SETUP_PROOF: '1' });
  let closed = false;
  try {
    const page = await editorPage(studio);
    await stubFolderPicker(studio, makeSourceCheckout().path);
    await connectClaude(page);
    await addCodebaseFromFolder(page);
    await expect(page.getByTestId(TESTID.canvasRegion)).toBeVisible();
    await studio.evaluate(() => { process.env['STUDIO_FIRST_RUN'] = '0'; });
    const band = await chromePage(studio);
    const tabs = () => band.evaluate(() => globalThis.studioChrome.tabsState());
    await expect.poll(async () => (await tabs()).tabs.filter(tab => tab.workspacePath).length).toBe(1);
    await band.evaluate(() => globalThis.studioChrome.newDraft());
    await expect.poll(async () => (await tabs()).tabs.length).toBe(2);
    const projects = await editorPage(studio, 'projects');
    const before = await tabs();
    const rendererIds = () => studio.evaluate(({ webContents }, ids) => webContents.getAllWebContents().filter(contents => ids.includes(new URL(contents.getURL() || 'about:blank').searchParams.get('tab') ?? '')).map(contents => contents.id), before.tabs.map(tab => tab.id));
    const contents = await rendererIds();
    expect(contents).toHaveLength(2);

    for (const attempt of [1, 2]) {
      const hidden = await studio.evaluate(({ BaseWindow }) => {
        const window = BaseWindow.getAllWindows()[0];
        if (!window) throw new Error('Studio window missing');
        window.close();
        return !window.isDestroyed() && !window.isVisible();
      });
      expect(hidden, `close ${String(attempt)} keeps a hidden window`).toBe(true);
      await studio.evaluate(({ app }) => { app.emit('activate', {}, false); });
      await expect.poll(() => studio.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows().filter(window => window.isVisible()).length)).toBe(1);
      expect(await tabs()).toEqual(before);
      expect(await rendererIds()).toEqual(contents);
      expect(page.isClosed() || projects.isClosed() || band.isClosed()).toBe(false);
    }

    await studio.evaluate(({ BaseWindow }) => { BaseWindow.getAllWindows()[0]?.minimize(); });
    await expect.poll(() => studio.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]?.isMinimized())).toBe(true);
    await studio.evaluate(({ app }) => { app.emit('activate', {}, true); });
    await expect.poll(() => studio.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]?.isMinimized())).toBe(false);
    expect(await tabs()).toEqual(before);
    await studio.evaluate(({ BaseWindow }) => { BaseWindow.getAllWindows()[0]?.close(); });
    const exit = await closeStudio(studio);
    closed = true;
    expect(exit).toEqual({ kind: 'exit', code: 0 });
  } finally {
    if (!closed) await closeStudio(studio);
    cleanupTempFixtures();
  }
});

test('macOS native update shutdown can close the window before before-quit', async () => {
  test.skip(process.platform !== 'darwin', 'macOS updater window lifecycle');
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const studio = await launchStudio(target, { ...FIRST_RUN_ENV, STUDIO_AGENT_VERIFY: 'ok' });
  try {
    await editorPage(studio);
    const outcome = await studio.evaluate(({ app, autoUpdater, BaseWindow }) => {
      const window = BaseWindow.getAllWindows()[0];
      if (!window) throw new Error('Studio window missing');
      let beforeQuit = false;
      app.once('before-quit', () => { beforeQuit = true; });
      autoUpdater.emit('before-quit-for-update');
      window.close();
      return { closed: window.isDestroyed(), beforeQuit };
    });
    expect(outcome).toEqual({ closed: true, beforeQuit: false });
  } finally {
    await closeStudio(studio);
  }
});
