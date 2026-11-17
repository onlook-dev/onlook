import { expect, test, type Page } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { closeStudio, createProjectWithoutStart, editorPage, isTargetPresent, launchStudio, missingHint, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

/* The toast lane is the layer provider's own region, the one element it promotes to the top layer. */
const LANE = '[role="region"][popover]';

const PROJECTS_FOOTER = 'projects-footer';

interface Reading {
  /** How far the lane's bottom edge sits above the window's bottom edge. */
  inset: number;
  /** How far the tallest named occupant's top edge sits above it, which is what the lane has to clear. */
  claim: number;
  reaches: Record<string, number>;
  gutter: number;
  gap: number;
  floor: number;
}

async function readingOf(page: Page, testIds: readonly string[]): Promise<Reading> {
  return page.evaluate(({ selector, ids }) => {
    const lane = document.querySelector(selector);
    if (lane === null) throw new Error('the toast lane is not in the page');
    const style = getComputedStyle(lane);
    const token = (name: string): number => {
      const raw = style.getPropertyValue(name).trim();
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) throw new Error(`the token ${name} read as ${raw || 'unset'}`);
      return value;
    };
    const reaches: Record<string, number> = {};
    for (const id of ids) {
      const node = document.querySelector(`[data-testid="${id}"]`);
      if (node === null) continue;
      const box = node.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      reaches[id] = Math.ceil(window.innerHeight - box.top);
    }
    return {
      inset: Math.round(window.innerHeight - lane.getBoundingClientRect().bottom),
      claim: Math.max(0, ...Object.values(reaches)),
      reaches,
      gutter: token('--spacing-4'),
      gap: token('--spacing-2'),
      floor: token('--size-element-lg'),
    };
  }, { selector: LANE, ids: [...testIds] });
}

/** Two identical reads in a row: the claim is written from a layout effect, so the first read can precede it. */
async function settledReading(page: Page, testIds: readonly string[]): Promise<Reading> {
  let last: Reading | undefined;
  await expect.poll(async () => {
    const next = await readingOf(page, testIds);
    const settled = last !== undefined && last.inset === next.inset && last.claim === next.claim;
    last = next;
    return settled;
  }).toBe(true);
  if (last === undefined) throw new Error('the lane never read');
  return last;
}

/** The lane's bottom edge is placed from what the corner measured, never from a fixed inset, and sits at or above every occupant's top. */
function expectLaneClears(reading: Reading, where: string): void {
  expect(reading.inset, `the toast lane kept a fixed inset on ${where}, with ${JSON.stringify(reading.reaches)}`).toBe(
    Math.round(reading.gutter + reading.gap + Math.max(reading.floor, reading.claim)),
  );
  for (const [id, reach] of Object.entries(reading.reaches)) {
    expect(reading.inset, `a toast would cover ${id} on ${where}`).toBeGreaterThanOrEqual(reach);
  }
}

test('the toast lane clears the foot that is actually drawn, on both screens', async () => {
  test.setTimeout(180_000);
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const source = makeSourceCheckout();
  const app = await launchStudio(target, { STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot() });
  try {
    const page = await editorPage(app);
    await expect(page.getByTestId(TESTID.projectsView)).toBeVisible();
    await expect(page.locator(LANE)).toHaveCount(1);
    await expect(page.locator(LANE)).toBeVisible();
    /* One of each, since the reading below takes the first match for a handle. */
    await expect(page.getByTestId(PROJECTS_FOOTER)).toHaveCount(1);
    await expect(page.getByTestId('projects-version')).toHaveCount(1);
    await expect(page.getByTestId(PROJECTS_FOOTER)).toBeVisible();

    const projects = await settledReading(page, [PROJECTS_FOOTER, 'projects-version']);
    /* The Projects footer reaches above the corner box the fixed inset was cut for, which is why that
       inset covered it; below this the lane's own placement could not be told from the fixed one (ONL-3182). */
    expect(projects.reaches[PROJECTS_FOOTER]).toBeGreaterThan(projects.floor);
    expect(projects.claim).toBe(projects.reaches[PROJECTS_FOOTER]);
    expectLaneClears(projects, 'the Projects Screen');

    await createProjectWithoutStart(page, source.path);
    await expect(page.getByTestId(TESTID.canvasRegion)).toBeVisible();
    await expect(page.locator(LANE)).toBeVisible();
    /* The left panel is up, so the corner carries the pill and help keeps its other seat (ONL-2350, ONL-2563). */
    await expect(page.getByTestId(TESTID.canvasTips)).toHaveCount(1);
    await expect(page.getByTestId(TESTID.canvasTips)).toBeVisible();
    await expect(page.getByTestId(TESTID.canvasHelp)).toHaveCount(0);

    const canvas = await settledReading(page, [TESTID.canvasTips, PROJECTS_FOOTER]);
    expect(canvas.reaches[PROJECTS_FOOTER], 'the Projects footer kept its claim on the Canvas').toBeUndefined();
    expect(canvas.claim).toBe(canvas.reaches[TESTID.canvasTips]);
    expectLaneClears(canvas, 'the Canvas Screen');
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
