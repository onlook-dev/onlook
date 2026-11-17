import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { NAME, TESTID } from './contract.js';
import { addCodebaseFromFolder, FIRST_RUN_ENV, TERMINAL_ENV, chromePage, closeStudio, connectClaude, editorPage, expectCanvasDocument, isTargetPresent, launchStudio, missingHint, stubFolderPicker, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

let editorApp: ElectronApplication;
/** The second app of the file: one build with the alpha flags on, so the gated feature has an end-to-end floor too (ONL-2661). */
let alphaApp: ElectronApplication | undefined;

test.beforeAll(() => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
});

test.afterAll(async () => {
  await closeStudio(editorApp);
  if (alphaApp) await closeStudio(alphaApp);
  cleanupTempFixtures();
});

async function openEditor(flags?: string): Promise<ElectronApplication> {
  // The shim answers `auth status`, never a turn, so the verdict is pinned (ONL-2541).
  const app = await launchStudio(target, {
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    ...FIRST_RUN_ENV,
    /* The flow shows on a fresh state root anyway, and a forced run writes no completion, so the band would keep
       its onboarding slots for the whole launch and the editor shell below would never be reached (ONL-3182). */
    STUDIO_FIRST_RUN: '',
    STUDIO_AGENT_VERIFY: 'ok',
    ...(flags === undefined ? {} : { STUDIO_FLAGS: flags }),
  });
  const created = await editorPage(app);
  await created.waitForLoadState('domcontentloaded');
  await stubFolderPicker(app, makeSourceCheckout().path);

  await connectClaude(created);
  await addCodebaseFromFolder(created);
  await expect(created.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 30_000 });
  await expectCanvasDocument(created);
  return app;
}

/* The pane spans the window behind the rails and the project's own frames, so a press at a fixed point is
   whatever stands there: this one lands where the pane itself is the topmost thing (ONL-3182). */
async function pressEmptyCanvas(window: Page, button: 'left' | 'right' = 'left'): Promise<void> {
  const point = await window.locator('.react-flow__pane').evaluate((pane) => {
    const box = pane.getBoundingClientRect();
    for (let y = box.top + 60; y < box.bottom - 60; y += 40) {
      for (let x = box.left + 60; x < box.right - 60; x += 40) {
        if (document.elementFromPoint(x, y) === pane) return { x: x - box.left, y: y - box.top };
      }
    }
    return null;
  });
  if (point === null) throw new Error('The canvas has no empty spot to press');
  await window.locator('.react-flow__pane').click({ button, position: point });
}

function canvasMenu(window: Page): Locator {
  return window.getByRole('menu', { name: NAME.canvasMenu, exact: true });
}

async function editorWindow(): Promise<Page> {
  editorApp ??= await openEditor();
  return editorPage(editorApp);
}

async function alphaWindow(): Promise<Page> {
  alphaApp ??= await openEditor('sections');
  return editorPage(alphaApp);
}

/* This build carries the shipping defaults; the case below it opens one with `STUDIO_FLAGS=sections` (ONL-2661). */
test('the blank Canvas menu pastes, and offers no Section while the flag is off', async () => {
  const window = await editorWindow();
  await pressEmptyCanvas(window);
  await window.keyboard.press('Shift+S');
  await pressEmptyCanvas(window);
  await expect(window.getByTestId(TESTID.canvasSection)).toHaveCount(0);
  await expect(window.getByTestId(TESTID.canvasTool).getByRole('button', { name: 'Section' })).toHaveCount(0);
  await pressEmptyCanvas(window, 'right');
  const menu = canvasMenu(window);
  await expect(menu.getByRole('menuitem', { name: /^Paste/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Section/ })).toHaveCount(0);
  await window.keyboard.press('Escape');
});

test('with the flag on, a Section can be created, named, and removed without replacing the Canvas menu', async () => {
  const window = await alphaWindow();
  await pressEmptyCanvas(window);
  await window.keyboard.press('Shift+S');
  /* The press that draws comes after the tool is armed, which the toolbar reports (ONL-3182). */
  await expect.poll(() => window.getByTestId(TESTID.canvasToolbar).getAttribute('data-tool'), { timeout: 15_000 }).toBe('section');
  await pressEmptyCanvas(window);
  const section = window.getByTestId(TESTID.canvasSection);
  await expect(section).toHaveCount(1);
  await window.getByTestId(TESTID.canvasSectionName).dblclick();
  await window.getByTestId(TESTID.canvasSectionRename).fill('Venue tile explorations');
  await window.getByTestId(TESTID.canvasSectionRename).press('Enter');
  await expect(window.getByTestId(TESTID.canvasSectionName)).toHaveText('Venue tile explorations');
  await window.keyboard.press('Backspace');
  await expect(section).toHaveCount(0);
  await pressEmptyCanvas(window, 'right');
  const menu = canvasMenu(window);
  await expect(menu.getByRole('menuitem', { name: /^Paste/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Section/ })).toBeVisible();
  await window.keyboard.press('Escape');
});

test('the agent sound is chosen on Save and kept from Later, in Project Chat', async () => {
  const window = await editorWindow();
  const dialog = window.getByTestId(TESTID.notificationSoundDialog);
  const chirp = window.getByTestId(TESTID.notificationSoundChirp);
  const twoTone = window.getByTestId(TESTID.notificationSoundTwoTone);
  const open = async (): Promise<void> => {
    await window.getByTestId(TESTID.chatNotifications).click();
    await expect(dialog).toBeVisible();
  };

  await open();
  await window.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(window.getByTestId(TESTID.chatNotifications)).toBeFocused();

  await open();
  await twoTone.click();
  await expect(twoTone).toHaveAttribute('aria-pressed', 'true');
  await window.getByTestId(TESTID.notificationSoundSave).click();
  await expect(dialog).toBeHidden();

  // Later abandons the draft: the saved choice is the one Save committed.
  await open();
  await expect(twoTone).toHaveAttribute('aria-pressed', 'true');
  await chirp.click();
  await window.getByTestId(TESTID.notificationSoundLater).click();
  await expect(dialog).toBeHidden();
  await open();
  await expect(twoTone).toHaveAttribute('aria-pressed', 'true');

  // Muting puts the cards beyond reach, and the saved silence reopens as muted.
  await window.getByTestId(TESTID.notificationSoundMute).click();
  await expect(chirp).toBeDisabled();
  await window.getByTestId(TESTID.notificationSoundSave).click();
  await expect(dialog).toBeHidden();
  await open();
  await expect(window.getByTestId(TESTID.notificationSoundMute)).toContainText('Unmute');
  await window.getByTestId(TESTID.notificationSoundLater).click();
  await expect(dialog).toBeHidden();
});

test('opening a project reaches the editor shell', async ({}, testInfo) => {
  const window = await editorWindow();

  const band = await chromePage(editorApp);
  await expect(band.getByTestId(TESTID.topbar)).toBeVisible();
  await expect(band.getByTestId(TESTID.topbarFolder)).toBeVisible();
  const gitPill = band.getByTestId(TESTID.topbarGitStatus);
  await expect(gitPill).toBeVisible();
  await expect(gitPill).not.toHaveAttribute('data-git-state', 'first-paint', { timeout: 30_000 });
  await expect(window.getByTestId(TESTID.sidebar)).toBeVisible();
  await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible();
  await expect(window.getByTestId(TESTID.chatRegion)).toBeVisible();

  await expect(window.getByTestId(TESTID.sidebarDesigns)).toBeVisible();

  await expect(window.getByTestId(TESTID.modeBand)).toBeVisible();
  await expect(window.getByTestId(TESTID.canvasMode)).toHaveAttribute('data-mode', 'design');

  await expect(window.locator('.react-flow__viewport')).toBeAttached();

  const composer = window.getByTestId(TESTID.chatComposer).getByRole('textbox');
  const canvas = await window.getByTestId(TESTID.canvasRegion).boundingBox();
  if (canvas === null) throw new Error('The editor has no canvas');
  await window.mouse.click(canvas.x + 32, canvas.y + 32);
  await editorApp.evaluate(({ webContents }, url) => {
    const contents = webContents.getAllWebContents().find((view) => view.getURL() === url);
    if (contents === undefined) throw new Error('The editor has no native input target');
    contents.sendInputEvent({ type: 'keyDown', keyCode: 'C', modifiers: ['meta', 'shift'] });
    contents.sendInputEvent({ type: 'keyUp', keyCode: 'C', modifiers: ['meta', 'shift'] });
  }, window.url());
  await expect(composer).toBeFocused();
  await expect(window.getByTestId(TESTID.chatSend)).toHaveAccessibleName('Send');

  const screenshot = await window.screenshot();
  await testInfo.attach(`shell-${target}`, { body: screenshot, contentType: 'image/png' });
});

// A synthetic drop has no drag model to cancel, so a `dropEffect: 'none'` regression stays green here; the real gesture is a hand check (ONL-1981).
test('an image dropped on the editor attaches as a chip', async () => {
  const window = await editorWindow();
  await expect(window.getByTestId(TESTID.chatComposer)).toBeVisible();
  // A drop before the host announces the cwd is refused; Attach enables on the same fact.
  // Attach lives in the composer's "+" menu, so the menu opens to read it and closes before the drop.
  await window.getByTestId(TESTID.chatAddMenu).click();
  await expect(window.getByTestId(TESTID.chatAttach)).toBeEnabled();
  await window.keyboard.press('Escape');

  // Real PNG bytes: main sniffs the magic and refuses labelled filler as `unsupported-format`.
  const PNG_1X1_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  await window.evaluate((base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const file = new File([bytes], 'dropped.png', { type: 'image/png' });

    const transfer = new DataTransfer();
    transfer.items.add(file);

    for (const type of ['dragenter', 'dragover', 'drop']) {
      document.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    }
  }, PNG_1X1_BASE64);

  await expect(window.getByTestId(TESTID.chatAttachmentChip)).toHaveCount(1, { timeout: 10_000 });

  await expect(window.getByTestId(TESTID.chatComposerDropzone)).toHaveAttribute(
    'data-dropping',
    'false',
  );
});

test('node-pty runs under Electron', async () => {
  const diagApp = await launchStudio(target, { STUDIO_DIAGNOSTICS: '1', ...TERMINAL_ENV });
  try {
    const window = await editorPage(diagApp);
    await window.waitForLoadState('domcontentloaded');
    await window.getByTestId(TESTID.ptyCheck).click();
    await expect(window.getByTestId(TESTID.ptyStatus)).toContainText('pty-ok', { timeout: 15_000 });
  } finally {
    // A real pty may SIGABRT main at teardown (ONL-1860), after `closeStudio` has released the launch's dirs.
    await closeStudio(diagApp).catch((error: unknown) => {
      if (!String(error).includes('SIGABRT')) throw error;
    });
  }
});
