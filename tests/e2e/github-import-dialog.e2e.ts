import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { cleanupTempFixtures, makeStateRoot, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { closeStudio, connectClaude, editorPage, FIRST_RUN_ENV, isTargetPresent, launchStudio, missingHint, recordOpenExternal, type Target } from './launch.js';

const WINDOW = { width: 1100, height: 640 };

const RING = 5;

type Failure = 'cancelled' | 'disk' | 'access' | 'network';
type Mode = 'disconnected' | 'connecting' | 'connected';
type CloneRequest = { repository: string; branch: string; parent: string };
type LayoutFixture = { failure: Failure; mode: Mode; parent: string; clones: CloneRequest[] };

async function installFixture(app: ElectronApplication, parent: string): Promise<void> {
  await app.evaluate((_electron, parent: string) => {
    const global = globalThis as typeof globalThis & {
      __studioGithubProof?: { install(deps: unknown): void };
      __githubLayout?: LayoutFixture;
    };
    const hook = global.__studioGithubProof;
    if (!hook) throw new Error('GitHub proof capability missing');
    global.__githubLayout = { failure: 'disk', mode: 'disconnected', parent, clones: [] };
    const repositories = [{ id: 1, fullName: 'design-team/website', private: true, defaultBranch: 'main', archived: false, canPull: true, canPush: true }];
    hook.install({
      subject: () => 'layout-fixture',
      backend: () => ({
        start: async () => {
          global.__githubLayout!.mode = 'connecting';
          return { status: 'connecting', url: 'https://github.test/connect' };
        },
        status: async () => {
          const mode = global.__githubLayout!.mode;
          if (mode === 'connected') return { status: 'connected', scopes: ['repo'], expiresAt: Date.now() + 300_000 };
          if (mode === 'connecting') return { status: 'connecting' };
          return { status: 'disconnected' };
        },
        repositories: async () => ({ status: 'connected', repositories, nextPage: null }),
        credential: async (repository: string) => ({ status: 'ready', remoteUrl: `https://github.com/${repository}.git`, username: 'x-access-token', password: 'offline-only', expiresAt: Date.now() + 300_000 }),
      }),
      parent: async () => global.__githubLayout!.parent,
      clone: async ({ signal, repository, branch, parent }: CloneRequest & { signal: AbortSignal }) => {
        global.__githubLayout!.clones.push({ repository, branch, parent });
        const failure = global.__githubLayout!.failure;
        if (failure === 'cancelled') await new Promise<void>((resolve) => {
          if (signal.aborted) resolve(); else signal.addEventListener('abort', () => resolve(), { once: true });
        });
        return { ok: false, failure };
      },
    });
  }, parent);
}

async function setFixture(app: ElectronApplication, next: Partial<LayoutFixture>): Promise<void> {
  await app.evaluate((_electron, next: Partial<LayoutFixture>) => {
    const global = globalThis as typeof globalThis & { __githubLayout?: LayoutFixture };
    Object.assign(global.__githubLayout!, next);
  }, next);
}

async function resize(app: ElectronApplication, page: Page): Promise<void> {
  await app.evaluate(({ BaseWindow }, size) => {
    const [window] = BaseWindow.getAllWindows();
    if (!window) throw new Error('Studio window is missing');
    if (window.isMaximized()) window.unmaximize();
    window.setSize(size.width, size.height);
  }, WINDOW);
  await page.waitForFunction((width) => window.innerWidth === width, WINDOW.width);
  let last = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const height = await page.evaluate(() => window.innerHeight);
    if (height === last) break;
    last = height;
    await page.waitForTimeout(50);
  }
  expect(last).toBeLessThan(WINDOW.height);
}

function trigger(page: Page): Locator {
  return page.getByTestId(TESTID.projectsSidebar).getByTestId(TESTID.addCodebase);
}

async function sidebarPopover(page: Page): Promise<Locator> {
  const button = trigger(page);
  await expect(button).toHaveAttribute('aria-controls', /.+/);
  const layerId = await button.getAttribute('aria-controls');
  if (!layerId) throw new Error('The sidebar Add codebase trigger has no controlled layer');
  return page.locator(`[id=${JSON.stringify(layerId)}]`).getByTestId(TESTID.addCodebasePopover);
}

/* The Projects Screen carries two Add codebase buttons, the Left Rail's and the empty state's, so each holds its own
   closed `<dialog>`; `[open]` picks the one the user is in. */
function dialogOf(page: Page): Locator {
  return page.locator(`dialog[data-testid="${TESTID.addCodebaseDialog}"][open]`);
}

/* The library opens a dialog from `scale(.95)`, so for the animation's length the painted box is shorter than the
   modal; the height the states are held to is the layout box, which no transform reaches (ONL-3182). */
async function dialogHeight(page: Page): Promise<number> {
  return dialogOf(page).evaluate((node: HTMLElement) => node.offsetHeight);
}

/*
 * Equal heights alone cannot fail while the modal carries its pinned height, so each state is measured against
 * `GITHUB_FLOW_HEIGHT` computed from the window instead: dropping the pin hands the height back to the state's own
 * content, and `Dialog`'s own `fit-content` then disagrees with this number.
 */
async function noteHeight(page: Page, heights: Record<string, number>, state: string): Promise<void> {
  heights[state] = await dialogHeight(page);
  const intended = await page.evaluate(() => Math.round(Math.min(650, window.innerHeight - 120)));
  expect(heights[state], `the modal left its fixed height in ${state}`).toBe(intended);
}

async function topmostAt(scope: Locator, testId: string): Promise<boolean> {
  return scope.getByTestId(testId).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit !== null && (node.contains(hit) || hit.contains(node));
  });
}

/** The footer's actions sit inside the modal, under the body, and nothing paints over them. */
async function expectActionsReachable(page: Page): Promise<void> {
  const dialog = dialogOf(page);
  const modal = await dialog.boundingBox();
  const back = await dialog.getByTestId(TESTID.githubBack).boundingBox();
  const clone = await dialog.getByTestId(TESTID.githubClone).boundingBox();
  if (!modal || !back || !clone) throw new Error('The modal did not present its own edge and both actions');
  const bottom = modal.y + modal.height;
  expect(back.y + back.height).toBeLessThanOrEqual(bottom + 1);
  expect(clone.y + clone.height).toBeLessThanOrEqual(bottom + 1);
  expect(back.y).toBeGreaterThanOrEqual(modal.y - 1);
  expect(clone.y).toBeGreaterThanOrEqual(modal.y - 1);
  expect(bottom).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
  expect(await topmostAt(dialog, TESTID.githubActions)).toBe(true);
  expect(await topmostAt(dialog, TESTID.githubClone)).toBe(true);
  const room = await dialog.getByTestId(TESTID.githubBody).evaluate((node) => {
    const left = node.getBoundingClientRect().left;
    const offsets = [...node.querySelectorAll('button')].map((button) => button.getBoundingClientRect().left - left);
    return offsets.length === 0 ? 0 : Math.round(Math.min(...offsets));
  });
  expect(room).toBeGreaterThanOrEqual(RING);
}

async function openGithub(page: Page): Promise<Locator> {
  await trigger(page).click();
  const popover = await sidebarPopover(page);
  await expect(popover).toBeVisible();
  await expect(popover.getByTestId(TESTID.codebaseFromFolder)).toBeVisible();
  await popover.getByTestId(TESTID.codebaseFromGithub).click();
  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(popover).toBeHidden();
  await expect(dialog.getByTestId(TESTID.githubImport)).toBeVisible();
  return dialog;
}

async function cloneRequests(app: ElectronApplication): Promise<CloneRequest[]> {
  return app.evaluate(() => {
    const global = globalThis as typeof globalThis & { __githubLayout?: LayoutFixture };
    return global.__githubLayout!.clones;
  });
}

async function connect(app: ElectronApplication, page: Page, dialog: Locator): Promise<void> {
  await setFixture(app, { mode: 'connected' });
  const check = dialog.getByRole('button', { name: 'Check again', exact: true });
  const connectButton = dialog.getByRole('button', { name: 'Connect GitHub', exact: true });
  if (await check.count()) await check.click();
  else await connectButton.click();
  await expect(dialog.getByTestId(TESTID.githubRepository)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId(TESTID.githubClone)).toBeDisabled();
}

async function closeModal(page: Page): Promise<void> {
  const dialog = dialogOf(page);
  await dialog.getByTestId(TESTID.githubBack).click();
  await expect(dialog).toBeHidden();
  const popover = await sidebarPopover(page);
  await expect(popover).toBeHidden();
  await expect(trigger(page)).toBeFocused();
}

test('Add codebase opens the GitHub modal at one height and keeps its actions reachable', async () => {
  test.setTimeout(180_000);
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
    STUDIO_GITHUB_PROOF: '1',
  });
  try {
    const page = await editorPage(app);
    await resize(app, page);
    await recordOpenExternal(app);
    await expect(page.getByTestId(TESTID.projectsView)).toBeVisible();
    const sidebar = page.getByTestId(TESTID.projectsSidebar);
    await expect(sidebar.getByTestId(TESTID.addCodebase)).toHaveCount(1);
    await expect(sidebar.getByRole('button', { name: 'Clone from GitHub', exact: true })).toHaveCount(0);
    const next = await sidebar.getByTestId(TESTID.projectsAddWorkspace).evaluate((node) => node.nextElementSibling?.getAttribute('data-testid') ?? null);
    expect(next).toBe(TESTID.projectsNewDraft);
    await installFixture(app, '/Volumes/Design Archive/Documents');

    const dialog = await openGithub(page);
    const heights: Record<string, number> = {};
    await expect(dialog.getByTestId(TESTID.githubConnect)).toBeVisible();
    await noteHeight(page, heights, 'not connected');
    await dialog.getByRole('button', { name: 'Connect GitHub', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Check again', exact: true })).toBeVisible();
    await noteHeight(page, heights, 'connecting');
    await connect(app, page, dialog);
    await noteHeight(page, heights, 'repository list');
    await dialog.getByTestId(TESTID.githubRepository).click();
    await expect(dialog.getByTestId(TESTID.githubClone)).toBeEnabled();
    await noteHeight(page, heights, 'selected repository');
    expect(await cloneRequests(app)).toEqual([]);

    await expect(dialog.getByTestId(TESTID.githubSearch)).toBeVisible();
    await expectActionsReachable(page);
    await setFixture(app, { failure: 'cancelled' });
    await dialog.getByTestId(TESTID.githubClone).click();
    await expect.poll(() => cloneRequests(app)).toEqual([{ repository: 'design-team/website', branch: 'main', parent: '/Volumes/Design Archive/Documents' }]);
    await expect(dialog.getByTestId(TESTID.githubBack)).toBeDisabled();
    await expect(dialog.getByTestId(TESTID.githubCancel)).toBeVisible();
    await noteHeight(page, heights, 'cloning');
    await dialog.getByTestId(TESTID.githubCancel).click();
    await expect(dialog.getByTestId(TESTID.githubBody).getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await noteHeight(page, heights, 'clone failed');
    await expectActionsReachable(page);

    const measured = Object.values(heights);
    expect(new Set(measured).size, `the modal changed height across ${JSON.stringify(heights)}`).toBe(1);
    expect(measured[0]).toBeGreaterThan(200);
    await closeModal(page);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

test('Add codebase clones the repository the designer picked on its default branch', async () => {
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
    STUDIO_GITHUB_PROOF: '1',
  });
  try {
    const page = await editorPage(app);
    const parent = '/Volumes/Design Archive/Documents';
    await installFixture(app, parent);
    await setFixture(app, { failure: 'cancelled', mode: 'connected' });
    const dialog = await openGithub(page);
    await expect(dialog.getByTestId(TESTID.githubRepository)).toBeVisible({ timeout: 15_000 });
    await dialog.getByTestId(TESTID.githubRepository).click();
    await expect(dialog.getByTestId(TESTID.githubClone)).toBeEnabled();
    expect(await cloneRequests(app)).toEqual([]);
    await dialog.getByTestId(TESTID.githubClone).click();
    await expect(dialog.getByTestId(TESTID.githubCancel)).toBeVisible();
    await expect.poll(() => cloneRequests(app)).toEqual([{ repository: 'design-team/website', branch: 'main', parent }]);
    await dialog.getByTestId(TESTID.githubCancel).click();
    await expect(dialog.getByTestId(TESTID.githubBody).getByRole('alert')).toBeVisible();
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

test('Add codebase offers only a folder when GitHub import is off', async () => {
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: '',
  });
  try {
    const page = await editorPage(app);
    await trigger(page).click();
    const popover = await sidebarPopover(page);
    await expect(popover).toBeVisible();
    await expect(popover.getByTestId(TESTID.codebaseFromFolder)).toBeVisible();
    await expect(popover.getByTestId(TESTID.codebaseFromGithub)).toHaveCount(0);
    await expect(dialogOf(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

/** The rendered box, from the laid-out app: the unit tier has no layout to measure. */
async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('The element has no box');
  return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
}

test('Add codebase stands as tall as the rows beside it, and stays the library’s button in the empty state', async () => {
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
  });
  try {
    const page = await editorPage(app);
    const sidebar = page.getByTestId(TESTID.projectsSidebar);
    await expect(sidebar.getByTestId(TESTID.addCodebase)).toBeVisible();
    const row = sidebar.getByTestId(TESTID.sidebarRow).first();
    await expect(row).toBeVisible();
    const button = await boxOf(sidebar.getByTestId(TESTID.addCodebase));
    expect(button.height).toBe((await boxOf(row)).height);
    /* The rail's own rows are 28px; a control that fixed its height would pass the comparison and fail this. */
    expect(button.height).toBe(28);
    /* The centre of the empty screen is not the onboarding step: its door is the library's 32px button beside New Draft. */
    const actions = page.getByTestId(TESTID.projectsEmptyActions);
    const centre = actions.getByTestId(TESTID.addCodebase);
    await expect(centre).toBeVisible();
    expect(await centre.evaluate((node) => [node.tagName, node.getAttribute('data-state')])).toEqual(['BUTTON', null]);
    const centreBox = await boxOf(centre);
    expect(centreBox.height).toBe(32);
    expect(centreBox.height).toBe((await boxOf(actions.getByRole('button', { name: 'New Draft', exact: true }))).height);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

const paintOf = (locator: Locator): Promise<string> => locator.evaluate((node) => getComputedStyle(node).backgroundColor);

/** The window's own floor is 960x600, so this is the smallest the step is ever laid out in. */
async function shrinkToMinimum(app: ElectronApplication, page: Page): Promise<void> {
  await app.evaluate(({ BaseWindow }) => {
    const [window] = BaseWindow.getAllWindows();
    if (!window) throw new Error('Studio window is missing');
    if (window.isMaximized()) window.unmaximize();
    window.setSize(640, 480);
  });
  await page.waitForFunction(() => window.innerWidth === 960);
}

test('the first-run step offers Add codebase and Start from scratch as two cards of one size', async () => {
  test.setTimeout(180_000);
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
    /* A source build offers GitHub only when something can broker it, which here is the proof's own backend. */
    STUDIO_GITHUB_PROOF: '1',
    STUDIO_AGENT_VERIFY: 'ok',
    ...FIRST_RUN_ENV,
  });
  try {
    const page = await editorPage(app);
    await connectClaude(page);
    const row = page.getByTestId(TESTID.onboardingImportRow);
    await expect(row).toBeVisible();
    const door = row.getByTestId(TESTID.addCodebase);
    const scratch = row.getByTestId(TESTID.onboardingImportBlank);
    const [doorBox, scratchBox] = [await boxOf(door), await boxOf(scratch)];
    expect({ width: doorBox.width, height: doorBox.height }).toEqual({ width: scratchBox.width, height: scratchBox.height });
    /* Side by side, Add codebase first. */
    expect(doorBox.y).toBe(scratchBox.y);
    expect(doorBox.x).toBeLessThan(scratchBox.x);
    expect(await paintOf(door)).toBe(await paintOf(scratch));

    await door.click();
    const popover = page.getByTestId(TESTID.addCodebasePopover);
    await expect(popover).toBeVisible();
    await expect(popover).toHaveClass(/menu-surface/);
    const menu = await boxOf(popover);
    expect(menu.y).toBeGreaterThanOrEqual(doorBox.y + doorBox.height);
    expect(Math.abs(menu.x + menu.width / 2 - (doorBox.x + doorBox.width / 2))).toBeLessThanOrEqual(2);
    await expect(popover.getByTestId(TESTID.codebaseFromFolder)).toBeVisible();
    await expect(popover.getByTestId(TESTID.codebaseFromGithub)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();

    await shrinkToMinimum(app, page);
    const [narrowDoor, narrowScratch] = [await boxOf(door), await boxOf(scratch)];
    expect({ width: narrowDoor.width, height: narrowDoor.height }).toEqual({ width: narrowScratch.width, height: narrowScratch.height });
    /* Narrower, and still two columns: the floor leaves the column room for both. */
    expect(narrowDoor.width).toBeLessThan(doorBox.width);
    expect(narrowDoor.y).toBe(narrowScratch.y);
    expect(narrowDoor.width).toBeGreaterThan(150);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

/** What actually paints behind an element: the nearest ancestor that has a background of its own. */
async function groundBehind(locator: Locator): Promise<string> {
  return locator.evaluate((node) => {
    let element: HTMLElement | null = node.parentElement;
    while (element !== null) {
      const paint = getComputedStyle(element).backgroundColor;
      if (paint !== 'rgba(0, 0, 0, 0)' && paint !== 'transparent') return paint;
      element = element.parentElement;
    }
    return 'none';
  });
}

test('the repository list stands on the modal’s ground, keeps its box, takes one Tab stop, and walks on the arrow keys', async () => {
  test.setTimeout(180_000);
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
    STUDIO_GITHUB_PROOF: '1',
  });
  try {
    const page = await editorPage(app);
    await installFixture(app, '/Volumes/Design Archive/Documents');
    await setFixture(app, { mode: 'connected', failure: 'cancelled' });
    const dialog = await openGithub(page);
    await expect(dialog.getByTestId(TESTID.githubRepository)).toBeVisible({ timeout: 15_000 });
    const list = dialog.getByTestId(TESTID.githubRepositories);
    const scroller = dialog.getByTestId(TESTID.githubList);
    const row = dialog.getByTestId(TESTID.githubRepository);

    /* `.astryx-dialog [role='listbox']` paints a Selector popup's own panel; these rows are on the modal itself. */
    const paint = await list.evaluate((node) => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, shadow: style.boxShadow, radius: style.borderRadius };
    });
    expect(paint).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none', radius: '0px' });
    expect(await scroller.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none');
    await page.mouse.move(2, 2);
    const fill = async (): Promise<string> => row.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(await fill()).toBe('rgba(0, 0, 0, 0)');
    await row.hover();
    /* The handoff's own lift, #1f1f1f, and the black it has to lift from: the panel left it nearly invisible. */
    await expect.poll(fill).toBe('rgb(31, 31, 31)');
    expect(await groundBehind(row)).toBe('rgb(0, 0, 0)');

    const before = await boxOf(scroller);
    await row.click();
    await expect(dialog.getByTestId(TESTID.githubClone)).toBeEnabled();
    expect(await boxOf(scroller)).toEqual(before);

    /* One Tab stop for the whole list: search, the list, then the two controls after it. */
    await dialog.getByTestId(TESTID.githubSearch).focus();
    await page.keyboard.press('Tab');
    await expect(list).toBeFocused();
    await expect(list).toHaveAttribute('aria-activedescendant', /github-repo-option-/);
    /* The ring the keyboard earns is on the box that scrolls, inside its edge, where neither it nor the modal cuts it. */
    const ring = await scroller.evaluate((node) => {
      const style = getComputedStyle(node);
      return { drawn: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), offset: Number.parseFloat(style.outlineOffset),
        ink: (/(\d+), (\d+), (\d+)/.exec(style.outlineColor) ?? []).slice(1).map(Number) };
    });
    expect(ring.drawn).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);
    expect(ring.offset).toBeLessThanOrEqual(0);
    /* It has to read on that black, whatever the theme's accent is called. */
    expect(Math.min(...ring.ink)).toBeGreaterThan(200);
    const modal = await boxOf(dialog.getByTestId(TESTID.githubImport));
    expect(before.x).toBeGreaterThanOrEqual(modal.x);
    expect(before.x + before.width).toBeLessThanOrEqual(modal.x + modal.width);
    expect(before.y).toBeGreaterThanOrEqual(modal.y);
    expect(before.y + before.height).toBeLessThanOrEqual(modal.y + modal.height);

    await page.keyboard.press('Tab');
    await expect(dialog.getByTestId(TESTID.githubListActions).getByRole('button').first()).toBeFocused();
    await list.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(row).toHaveAttribute('aria-selected', 'true');
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});

test('a running clone keeps the modal, and Cancel clone is the way out', async () => {
  test.setTimeout(180_000);
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_STATE_ROOT: makeStateRoot(),
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_FLAGS: 'github-import',
    STUDIO_GITHUB_PROOF: '1',
  });
  try {
    const page = await editorPage(app);
    await installFixture(app, '/Volumes/Design Archive/Documents');
    await setFixture(app, { mode: 'connected', failure: 'cancelled' });
    const dialog = await openGithub(page);
    await expect(dialog.getByTestId(TESTID.githubRepository)).toBeVisible({ timeout: 15_000 });
    await dialog.getByTestId(TESTID.githubRepository).click();
    await dialog.getByTestId(TESTID.githubClone).click();
    await expect(dialog.getByTestId(TESTID.githubCancel)).toBeVisible();
    /* Back and the folder exit are disabled here, so nothing else may take the clone away either. */
    await expect(dialog.getByTestId(TESTID.githubBack)).toBeDisabled();
    const slow = dialog.getByTestId(TESTID.githubCloneSlow);
    const reserved = await boxOf(slow);
    const cancelAtRest = await boxOf(dialog.getByTestId(TESTID.githubCancel));
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId(TESTID.githubCancel)).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId(TESTID.githubCancel)).toBeVisible();
    /* The slow line is drawn from the first frame, so arriving at eight seconds moves no button. */
    await expect(slow).toHaveAttribute('data-state', 'slow', { timeout: 30_000 });
    expect(await boxOf(slow)).toEqual(reserved);
    expect(await boxOf(dialog.getByTestId(TESTID.githubCancel))).toEqual(cancelAtRest);
    await dialog.getByTestId(TESTID.githubCancel).click();
    await expect(dialog.getByTestId(TESTID.githubBody).getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
