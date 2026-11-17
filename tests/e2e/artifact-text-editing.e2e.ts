import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { ArtifactSummary, ArtifactToolInput, ArtifactToolVerb } from '@studio/events';
import { freePort, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import {
  chromePage,
  closeStudio,
  createProjectWithoutStart,
  editorPage,
  isTargetPresent,
  launchStudio,
  missingHint,
  repoRoot,
  type Target,
} from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
const HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Literal text</title>
<style>body{margin:0;padding:32px;font:20px sans-serif}h1{font-size:32px}p{margin:32px 0}</style></head>
<body><h1 id="headline">Room for a slower day</h1>
<p id="first-label">Explore the collection</p>
<p id="second-label">Explore the collection</p></body></html>\n`;

interface GuestText {
  text: string | null;
  viewportWidth: number;
  rect: { x: number; y: number; width: number; height: number } | null;
}

async function guestText(app: ElectronApplication, artifactId: string, selector: string): Promise<GuestText | null> {
  return app.evaluate(async ({ webContents }, input) => {
    const guest = webContents.getAllWebContents().find((contents) =>
      contents.getType() === 'webview' && contents.getURL().split(/[?#]/)[0] === `studio-artifact://${input.artifactId}/pages/index.html`);
    if (!guest) return null;
    return guest.executeJavaScript(`(() => {
      const element = document.querySelector(${JSON.stringify(input.selector)});
      if (!element) return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getClientRects()[0];
      return {
        text: element.textContent,
        viewportWidth: innerWidth,
        rect: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      };
    })()`);
  }, { artifactId, selector });
}

async function doubleClickText(app: ElectronApplication, page: Page, artifactId: string, selector: string): Promise<void> {
  await expect.poll(async () => (await guestText(app, artifactId, selector))?.rect?.width ?? 0).toBeGreaterThan(0);
  const facts = await guestText(app, artifactId, selector);
  const view = await page.getByTestId(TESTID.artifactWebview).boundingBox();
  if (!facts?.rect || !view || facts.viewportWidth <= 0) throw new Error(`No visible Artifact text at ${selector}`);
  const scale = view.width / facts.viewportWidth;
  const point = {
    x: view.x + (facts.rect.x + facts.rect.width / 2) * scale,
    y: view.y + (facts.rect.y + facts.rect.height / 2) * scale,
  };
  await expect.poll(() => page.evaluate((at) => document.elementFromPoint(at.x, at.y)?.getAttribute('data-testid'), point))
    .toBe(TESTID.canvasArtifactShield);
  await page.mouse.move(point.x, point.y);
  await page.mouse.dblclick(point.x, point.y, { delay: 90 });
  await expect(page.getByTestId(TESTID.artifactTextEditor)).toBeVisible();
  await expect(page.getByTestId(TESTID.artifactTextInput)).toBeFocused();
}

async function fitCanvas(page: Page): Promise<void> {
  const point = await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane');
    for (let vertical = innerHeight - 30; vertical > 100; vertical -= 30) {
      for (let horizontal = innerWidth - 30; horizontal > 100; horizontal -= 30) {
        const hit = document.elementFromPoint(horizontal, vertical);
        if (hit === pane || hit?.classList.contains('react-flow__background')) return { x: horizontal, y: vertical };
      }
    }
    throw new Error('No exposed canvas point for Zoom to Fit');
  });
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press('Shift+Digit1');
  let previous: string | null = null;
  let stableSince = Date.now();
  await expect.poll(async () => {
    const current = await page.locator('.react-flow__viewport').getAttribute('style');
    if (current !== previous) {
      previous = current;
      stableSince = Date.now();
    }
    return Date.now() - stableSince;
  }).toBeGreaterThanOrEqual(600);
}

test('Artifact double-click edits literal source and rerenders, targets one repeated label, and Escape never writes', async () => {
  test.skip(target === 'packaged', 'Artifact fixture tools are available only on an unpackaged build');
  test.setTimeout(90_000);
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const scratch = mkdtempSync(join(tmpdir(), 'studio-artifact-text-e2e-'));
  const stateRoot = join(scratch, 'state');
  const source = makeSourceCheckout();
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: stateRoot,
    AGENT_CDP_PORT: String(await freePort()),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot({ name: 'artifact-text-e2e' }),
    STUDIO_AGENT_REPLAY: join(repoRoot, 'tests/live/recordings/claude/tools.jsonl'),
  }, { profileDir: join(scratch, 'profile') });
  try {
    const page = await editorPage(app);
    await createProjectWithoutStart(page, source.path);
    const band = await chromePage(app);
    await expect.poll(async () => (await page.evaluate(() => window.studio.agentSnapshot())).sessionId).toEqual(expect.any(String));
    const state = await band.evaluate(() => window.studioChrome.debugState!());
    const worktreePath = state.tabs.find((tab) => tab.isActive)?.workspacePath;
    if (!worktreePath) throw new Error('No active registered Project');
    const tool = async (verb: ArtifactToolVerb, input: ArtifactToolInput): Promise<unknown> => {
      const result = await band.evaluate((request) => window.studioChrome.debugArtifactTool!(request), { worktreePath, verb, input });
      if (!result.ok) throw new Error(`Artifact ${verb} refused: ${result.reason}`);
      return result.value;
    };
    const artifact = await tool('create', { title: 'Literal text', html: HTML }) as ArtifactSummary;
    expect(artifact.id).toEqual(expect.any(String));
    await tool('place', { artifactId: artifact.id, x: 0, y: 0 });
    await expect(page.getByTestId(TESTID.canvasArtifactShield)).toBeVisible();
    await fitCanvas(page);
    const sourcePath = join(stateRoot, 'artifacts', artifact.id, 'pages', 'index.html');
    expect(readFileSync(sourcePath)).toEqual(Buffer.from(HTML));
    const input = page.getByTestId(TESTID.artifactTextInput);

    await doubleClickText(app, page, artifact.id, '#headline');
    await expect(input).toHaveValue('Room for a slower day');
    await expect(page.getByTestId(TESTID.artifactTextSave)).toBeVisible();
    await expect(page.getByTestId(TESTID.artifactTextCancel)).toBeVisible();
    await page.keyboard.type('Room for everyday magic');
    await expect(input).toHaveValue('Room for everyday magic');
    expect(readFileSync(sourcePath)).toEqual(Buffer.from(HTML));
    await page.getByTestId(TESTID.artifactTextSave).click();
    await expect(page.getByTestId(TESTID.artifactTextEditor)).toHaveCount(0);
    let expectedHtml = HTML.replace('Room for a slower day', 'Room for everyday magic');
    await expect.poll(() => readFileSync(sourcePath)).toEqual(Buffer.from(expectedHtml));
    await expect.poll(async () => (await guestText(app, artifact.id, '#headline'))?.text).toBe('Room for everyday magic');

    await doubleClickText(app, page, artifact.id, '#second-label');
    await expect(input).toHaveValue('Explore the collection');
    await page.keyboard.type('Explore & discover');
    await expect(input).toHaveValue('Explore & discover');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId(TESTID.artifactTextEditor)).toHaveCount(0);
    expectedHtml = expectedHtml.replace('id="second-label">Explore the collection', 'id="second-label">Explore &amp; discover');
    const expectedBytes = Buffer.from(expectedHtml);
    await expect.poll(() => readFileSync(sourcePath)).toEqual(expectedBytes);
    await expect.poll(async () => (await guestText(app, artifact.id, '#second-label'))?.text).toBe('Explore & discover');
    await expect.poll(async () => (await guestText(app, artifact.id, '#first-label'))?.text).toBe('Explore the collection');

    await doubleClickText(app, page, artifact.id, '#headline');
    await expect(input).toHaveValue('Room for everyday magic');
    await page.keyboard.type('This canceled draft must not reach the source');
    await expect(input).toHaveValue('This canceled draft must not reach the source');
    expect(readFileSync(sourcePath)).toEqual(expectedBytes);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(TESTID.artifactTextEditor)).toHaveCount(0);
    const canceledAt = Date.now();
    let sourceUnchanged = true;
    await expect.poll(() => {
      sourceUnchanged = readFileSync(sourcePath).equals(expectedBytes) && sourceUnchanged;
      return Date.now() - canceledAt;
    }, { intervals: [50, 100, 200] }).toBeGreaterThanOrEqual(750);
    expect(sourceUnchanged).toBe(true);
    expect(readFileSync(sourcePath)).toEqual(expectedBytes);
    await expect.poll(async () => (await guestText(app, artifact.id, '#headline'))?.text).toBe('Room for everyday magic');
    await expect(page.getByTestId(TESTID.artifactTextError)).toHaveCount(0);
    await expect(page.getByTestId(TESTID.artifactTextRefusal)).toHaveCount(0);
  } finally {
    await closeStudio(app);
  }
});
