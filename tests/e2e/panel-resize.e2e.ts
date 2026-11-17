import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { closeStudio, createProjectFromProjectsView, editorPage, isTargetPresent, launchStudio, missingHint, panelResizeState, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
const hideChrome = process.platform === 'darwin' ? 'Meta+.' : 'Control+.';

test('hiding a rail cancels each active resize without changing its saved size afterward', async () => {
  test.setTimeout(90_000);
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const source = makeSourceCheckout();
  const app = await launchStudio(target, {
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_AGENT_PROBE: 'ok',
    STUDIO_AGENT_VERIFY: 'ok',
  });
  try {
    const page = await editorPage(app);
    await createProjectFromProjectsView(app, page, source.path);
    for (const railId of ['sidebar', TESTID.chatRegion]) {
      const rail = page.getByTestId(railId);
      const handles = railId === 'sidebar' ? ['.panel-resize-handle', '.sidebar-split-handle'] : ['.panel-resize-handle'];
      for (const selector of handles) {
        for (const chord of ['p', hideChrome]) {
          const handle = rail.locator(selector);
          const hitArea = handle.locator(':scope > div').first();
          const bounds = await hitArea.boundingBox();
          expect(bounds).not.toBeNull();
          if (!bounds) throw new Error('The visible rail has no resize handle');
          const isVertical = selector === '.sidebar-split-handle';
          const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await page.mouse.move(start.x + (isVertical ? 0 : 20), start.y + (isVertical ? 20 : 0), { steps: 4 });
          const visibleSize = await handle.evaluate((node, vertical) => {
            const target = vertical ? node.previousElementSibling : node.parentElement;
            if (!target) throw new Error('The resize handle has no measured region');
            const bounds = target.getBoundingClientRect();
            return vertical ? bounds.height : bounds.width;
          }, isVertical);
          const fixedRailWidth = railId === 'sidebar' && !isVertical
            ? await rail.getByTestId('canvas-rail').evaluate((node) => node.getBoundingClientRect().width)
            : 0;
          if (railId === 'sidebar' && !isVertical) expect(fixedRailWidth).toBeGreaterThan(0);
          await expect.poll(async () => {
            const state = await panelResizeState(page);
            return isVertical ? state.split.pagesHeight : state.panels[railId === 'sidebar' ? 'sidebar' : 'end'];
          }).toBe(visibleSize - fixedRailWidth);
          const before = await panelResizeState(page);
          await page.keyboard.press(chord);
          await expect(rail).toBeHidden();
          await expect.poll(() => page.evaluate(() => ({ cursor: document.body.style.cursor, selection: document.body.style.userSelect }))).toEqual({ cursor: '', selection: '' });
          await page.mouse.move(start.x + (isVertical ? 0 : 100), start.y + (isVertical ? 100 : 0), { steps: 4 });
          await page.waitForTimeout(350);
          const after = await panelResizeState(page);
          expect(after).toEqual(before);
          await page.mouse.up();
          await page.keyboard.press(chord === 'p' ? 'd' : hideChrome);
          await expect(hitArea).toBeVisible();
          expect(await handle.evaluate((node, vertical) => {
            const target = vertical ? node.previousElementSibling : node.parentElement;
            if (!target) throw new Error('The returned resize handle has no measured region');
            const bounds = target.getBoundingClientRect();
            return vertical ? bounds.height : bounds.width;
          }, isVertical)).toBe(visibleSize);
        }
      }
    }
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
