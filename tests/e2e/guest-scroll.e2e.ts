// Chromium's own layout is the subject here: a deeper descendant's transition and the viewport's
// propagated overflow are invisible to a faked DOM (ONL-2793). One Electron window, no Studio build.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

const TREE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MODULE = join(TREE, 'apps/studio/src/preload/guest-scroll.ts');

// A hidden window still lays out and keeps its animation frames once background throttling is off;
// Playwright reports it only after it loads a document of its own.
const MAIN = `const { app, BrowserWindow } = require('electron');
const { join } = require('node:path');
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 1000, height: 700, webPreferences: { backgroundThrottling: false } });
  win.loadFile(join(__dirname, 'start.html'));
});
`;

const ENTRY = `import { createGuestScrollController, findScrollSurface } from ${JSON.stringify(MODULE)};

const reports = [];
let controller = null;
let frames = 0;

window.scrollProbe = {
  start() {
    reports.length = 0;
    const raf = window.requestAnimationFrame.bind(window);
    frames = 0;
    window.requestAnimationFrame = (callback) => {
      frames += 1;
      return raf(callback);
    };
    controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, (handler) => handler);
    controller.receive({ type: 'observe', session: 1, enabled: true });
  },
  stop() {
    controller?.dispose();
    controller = null;
  },
  surface() {
    const element = findScrollSurface(document, window);
    if (element === null) return null;
    if (element === document.documentElement) return 'html';
    if (element === document.body) return 'body';
    return element.id === '' ? element.tagName.toLowerCase() : '#' + element.id;
  },
  metrics() {
    return reports.at(-1)?.metrics ?? null;
  },
  measure(selector) {
    const element = selector === 'html' ? document.documentElement : document.querySelector(selector);
    if (element === null) return null;
    return { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
  },
  mode() {
    return document.compatMode;
  },
  frames() {
    return frames;
  },
  scroll(top, surface) {
    controller.receive({ type: 'scroll', session: 1, surface: surface ?? reports.at(-1)?.metrics?.surface, top });
  },
};
`;

const PAGES: Record<string, string> = {
  'start.html': '<!doctype html><html><head><meta charset="utf-8"><title>harness</title></head><body></body></html>',
  // A fixed-height panel, a fixed-height overflow:visible wrapper, and a grandchild that grows by transition.
  'deep-transition.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; }
  #panel { width: 600px; height: 300px; overflow-y: auto; }
  #wrap { height: 200px; overflow: visible; }
  #deep { height: 100px; transition: height 150ms linear; }
  #deep.tall { height: 1200px; }
</style></head><body><div id="panel"><div id="wrap"><div id="deep"></div></div></div></body></html>`,
  // A spinner that never changes size, inside the surface the scrollbar drives.
  'spinner.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; }
  #panel { width: 600px; height: 300px; overflow-y: auto; }
  #inner { height: 2000px; }
  #spinner { width: 40px; height: 40px; animation: spin 600ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head><body><div id="panel"><div id="spinner"></div><div id="inner"></div></div></body></html>`,
  // An explicit root overflow keeps body's hidden on body: the document still scrolls.
  'body-hidden.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  html { overflow-y: auto; }
  body { margin: 0; overflow: hidden; }
  #tall { height: 3000px; }
</style></head><body><div id="tall"></div></body></html>`,
  // The same page with a large panel: the document still wins.
  'body-hidden-panel.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  html { overflow-y: auto; }
  body { margin: 0; overflow: hidden; }
  #panel { width: 900px; height: 500px; overflow-y: auto; }
  #inner { height: 2400px; }
  #tall { height: 3000px; }
</style></head><body><div id="panel"><div id="inner"></div></div><div id="tall"></div></body></html>`,
  // A visible root lets body's hidden propagate to the viewport: a real lock, as an open modal makes.
  'viewport-lock.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; overflow: hidden; }
  #tall { height: 3000px; }
  #panel { position: fixed; inset: 40px; overflow-y: auto; }
  #inner { height: 2400px; }
</style></head><body><div id="tall"></div><div id="panel"><div id="inner"></div></div></body></html>`,
  // A locked root with a scrolling body.
  'body-scroller.html': `<!doctype html><html><head><meta charset="utf-8"><style>
  html { overflow-y: hidden; height: 100%; }
  body { margin: 0; height: 100%; overflow-y: auto; }
  #tall { height: 3000px; }
</style></head><body><div id="tall"></div></body></html>`,
};

interface Metrics {
  session: number;
  surface: number;
  top: number;
  viewport: number;
  height: number;
}

interface Box {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

declare global {
  interface Window {
    scrollProbe: {
      start(): void;
      stop(): void;
      surface(): string | null;
      metrics(): Metrics | null;
      measure(selector: string): Box | null;
      mode(): string;
      frames(): number;
      scroll(top: number, surface?: number): void;
    };
  }
}

let root: string;
let bundle: string;
let app: ElectronApplication;
let page: Page;

async function open(name: string): Promise<void> {
  await page.goto(`file://${join(root, name)}`);
  await page.addScriptTag({ content: bundle });
  expect(await page.evaluate(() => window.scrollProbe.mode())).toBe('CSS1Compat');
  await page.evaluate(() => window.scrollProbe.start());
}

const surface = (): Promise<string | null> => page.evaluate(() => window.scrollProbe.surface());
const metrics = (): Promise<Metrics | null> => page.evaluate(() => window.scrollProbe.metrics());
const measure = (selector: string): Promise<Box | null> =>
  page.evaluate((target) => window.scrollProbe.measure(target), selector);
const frames = (): Promise<number> => page.evaluate(() => window.scrollProbe.frames());
const scroll = (top: number, surface?: number): Promise<void> =>
  page.evaluate(([value, which]) => window.scrollProbe.scroll(value as number, which as number | undefined), [top, surface]);

async function wheel(x: number, y: number, deltaY: number): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, deltaY);
}

test.beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'studio-guest-scroll-'));
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(root, name), html);
  const entry = join(root, 'entry.ts');
  writeFileSync(entry, ENTRY);
  execFileSync('bun', ['build', entry, '--target=browser', '--format=iife', '--outfile', join(root, 'bundle.js')], {
    cwd: TREE,
    stdio: 'pipe',
  });
  bundle = readFileSync(join(root, 'bundle.js'), 'utf8');
  writeFileSync(join(root, 'main.cjs'), MAIN);
  app = await electron.launch({ args: [join(root, 'main.cjs')], cwd: join(TREE, 'apps/studio') });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app?.close();
  rmSync(root, { recursive: true, force: true });
});

test('follows a transition on a descendant deeper than the surface it observes', async () => {
  await open('deep-transition.html');
  expect(await metrics()).toBeNull();

  await page.evaluate(() => document.getElementById('deep')?.classList.add('tall'));

  await expect.poll(() => metrics().then((value) => value?.height), { timeout: 5_000 }).toBe(1200);
  expect((await measure('#panel'))?.scrollHeight).toBe(1200);
  expect(await surface()).toBe('#panel');

  const settled = await frames();
  await page.waitForTimeout(400);
  expect(await frames()).toBe(settled);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('stops measuring once the page settles, and never starts for a spinner that holds its size', async () => {
  await open('spinner.html');
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(2040);
  await page.waitForTimeout(400);

  const settled = await frames();
  await page.waitForTimeout(600);
  expect(await frames()).toBe(settled);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('scrolls the document when body hides its own overflow under an explicit root overflow', async () => {
  await open('body-hidden.html');

  expect(await surface()).toBe('html');
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(3000);

  await wheel(500, 350, 400);
  await expect.poll(() => measure('html').then((value) => value?.scrollTop)).toBe(400);
  await expect.poll(() => metrics().then((value) => value?.top)).toBe(400);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('moves the page from a scroll command and ignores one aimed at a surface that is gone', async () => {
  await open('body-hidden.html');
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(3000);

  await scroll(900);
  await expect.poll(() => measure('html').then((value) => value?.scrollTop)).toBe(900);
  await expect.poll(() => metrics().then((value) => value?.top)).toBe(900);

  await scroll(100, 99);
  await page.waitForTimeout(200);
  expect((await measure('html'))?.scrollTop).toBe(900);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('keeps the document ahead of a panel on that same page', async () => {
  await open('body-hidden-panel.html');

  expect(await surface()).toBe('html');
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(3500);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('leaves a genuinely locked viewport alone and takes the panel', async () => {
  await open('viewport-lock.html');

  expect(await surface()).toBe('#panel');
  await wheel(10, 10, 400);
  expect((await measure('html'))?.scrollTop).toBe(0);
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(2400);
  await page.evaluate(() => window.scrollProbe.stop());
});

test('takes a scrolling body under a locked root', async () => {
  await open('body-scroller.html');

  expect(await surface()).toBe('body');
  await expect.poll(() => metrics().then((value) => value?.height)).toBe(3000);
  await page.evaluate(() => window.scrollProbe.stop());
});
