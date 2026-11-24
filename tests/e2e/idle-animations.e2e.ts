import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { checkPlaceholderPixels, closeStudio, createProjectWithoutStart, editorPage, launchStudio, measureIdlePaint } from './launch.js';

test('idle Tips and composer animations do not repaint and respect Reduce Motion', async () => {
  test.setTimeout(60_000);
  const app = await launchStudio('build', { STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(), STUDIO_AGENT_PROBE: 'ok' });
  try {
    const page = await editorPage(app);
    await createProjectWithoutStart(page, makeSourceCheckout().path);
    await page.locator('.tips-pill-light').first().waitFor({ state: 'attached' });
    await page.locator('.chat-composer-shimmer').waitFor({ state: 'attached' });
    const headed = process.env['STUDIO_E2E_HEADED'] === '1';
    expect(await app.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]!.isVisible())).toBe(headed);
    await page.waitForTimeout(2000);
    const animationTime = () => page.evaluate(() => document.getAnimations().filter(animation => ['tips-lap', 'chat-composer-placeholder-sweep'].includes((animation as CSSAnimation).animationName)).map(animation => Number(animation.currentTime)));
    const before = await animationTime();
    expect(before.length).toBe(3);
    expect((await measureIdlePaint(app, page)).paintedFrames).toBe(0);
    expect((await animationTime()).every((time, index) => time > before[index]!)).toBe(true);
    await app.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]!.hide());
    expect(await app.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]!.isVisible())).toBe(false);
    await page.waitForTimeout(1000);
    expect((await measureIdlePaint(app, page)).paintedFrames).toBe(0);
    if (headed) await app.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0]!.show());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => /tips-|chat-composer-placeholder-sweep/.test((animation as CSSAnimation).animationName) && animation.playState === 'running').length)).toBe(0);
    const placeholder = page.locator('.chat-composer-shimmer .astryx-chat-composer-input > div[aria-hidden="true"]').first();
    await expect(placeholder).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(async () => (await animationTime()).length).toBe(3);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

test('shimmering placeholder repaints changed text, including wrapped text', async () => {
  const app = await launchStudio('build', { STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(), STUDIO_AGENT_PROBE: 'ok' });
  try {
    const page = await editorPage(app);
    await createProjectWithoutStart(page, makeSourceCheckout().path);
    await page.locator('.chat-composer-shimmer').waitFor({ state: 'attached' });
    for (const width of [480, 100]) {
      const result = await checkPlaceholderPixels(app, page, width);
      expect(result.wrapped).toBe(width === 100);
      expect(result.matches, JSON.stringify(result)).toBe(true);
    }
    await page.waitForTimeout(500);
    expect((await measureIdlePaint(app, page, 4000)).paintedFrames).toBe(0);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
