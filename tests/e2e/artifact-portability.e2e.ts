import { chromium, expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createArtifactStore } from '../../apps/studio/src/main/artifacts/store.js';
import { exportArtifact } from '../../apps/studio/src/main/artifacts/export.js';
import { resetArtifactIndexCache } from '../../apps/studio/src/main/artifacts/state.js';

function fontIn(directory: string): string | undefined {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isFile() && entry.name.endsWith('.woff2')) return path;
    if (entry.isDirectory()) {
      const found = fontIn(path);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

test('one self-contained document is interactive, styled, scrollable and asset-complete over file while offline', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'artifact-portability-'));
  const saved = process.env['STUDIO_STATE_ROOT'];
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetArtifactIndexCache();
  const browser = await chromium.launch({ ...(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? { channel: 'chrome' as const } : {}), headless: true });
  try {
    const fontPath = fontIn(join(process.cwd(), 'apps/studio/out/renderer/assets'));
    expect(fontPath).toBeDefined();
    const store = createArtifactStore();
    const created = await store.create({ title: 'Lemon market', html: '', bundle: {
      pages: [{ path: 'pages/index.html', name: 'Market' }],
      files: [
        { path: 'pages/index.html', bytes: Buffer.from('<link rel="stylesheet" href="theme.css"><h1 id="market">Market</h1><img src="../assets/fruit.png" srcset="../assets/fruit.png 1x"><button id="add">Add lemon</button><a href="#buy">Open cart</a><div style="height:1600px"></div><h2>Cart</h2><button id="buy" onclick="this.textContent=\'Ordered\'">Order</button><a href="#market">Back to market</a><script src="market.js"></script>') },
        { path: 'pages/theme.css', bytes: Buffer.from('@import "owned.css";') },
        { path: 'pages/owned.css', bytes: Buffer.from('@font-face{font-family:Owned;src:url(../assets/font.woff2)}h1{color:rgb(0,128,0);font-family:Owned}') },
        { path: 'pages/market.js', bytes: Buffer.from('document.body.dataset.ready="yes";document.getElementById("add").onclick=()=>document.getElementById("add").textContent="Added";window.closing="</script>";') },
        { path: 'assets/fruit.png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoz2P8z8Dwn4GKgIlhVIPRMBpGw2gYDQBHvAMBuNcZkwAAAABJRU5ErkJggg==', 'base64') },
        { path: 'assets/font.woff2', bytes: readFileSync(fontPath!) },
      ],
    } });
    if ('code' in created) throw new Error(created.reason);
    const exported = await exportArtifact(store, created.id);
    if (!exported.ok) throw new Error(exported.reason);
    const path = join(stateRoot, 'Lemon-market.html');
    writeFileSync(path, exported.html);
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(pathToFileURL(path).href);
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('body')).toHaveAttribute('data-ready', 'yes');
    await expect(frame.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');
    expect(await frame.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(8);
    expect(await frame.locator('body').evaluate(async () => (await document.fonts.load('16px Owned')).length)).toBeGreaterThan(0);
    expect(await frame.locator('body').evaluate(() => (window as unknown as { closing: string }).closing)).toBe('</script>');
    await frame.getByRole('button', { name: 'Add lemon' }).click();
    await expect(frame.getByRole('button', { name: 'Added' })).toBeVisible();
    await frame.getByRole('link', { name: 'Open cart' }).click();
    await expect(frame.getByRole('heading', { name: 'Cart' })).toBeVisible();
    await expect.poll(() => frame.locator('body').evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await frame.getByRole('button', { name: 'Order', exact: true }).click();
    await expect(frame.getByRole('button', { name: 'Ordered' })).toBeVisible();
    await frame.getByRole('link', { name: 'Back to market' }).click();
    await expect(frame.getByRole('heading', { name: 'Market' })).toBeVisible();
    expect(requests.filter((url) => !url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('about:'))).toEqual([]);
  } finally {
    await browser.close();
    if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = saved;
    resetArtifactIndexCache();
  }
});
