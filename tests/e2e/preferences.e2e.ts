import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  cleanupTempFixtures,
  makeSourceCheckout,
  makeStateRoot,
  makeWorkspaceRoot,
} from '@studio/fixtures';
import { TESTID } from './contract.js';
import { closeStudio, createProjectWithoutStart, editorPage, isTargetPresent, launchStudio, missingHint, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

/** A model row other than the selected one, by short name: a signed-out CLI refuses a full model id and resolves a short name offline (ONL-2541). */
const OTHER_SHORT_NAME = ':not([data-selected="true"]):not([data-value*="-"])';

/** The model and effort the composer's control reports selected, read from the menu's rows. */
async function selectedChoice(window: Page): Promise<{ model: string | null; effort: string | null }> {
  await window.getByTestId(TESTID.chatModelEffort).click();
  const model = window.getByTestId(TESTID.chatModelRow).and(window.locator('[data-selected="true"]'));
  const modelValue = (await model.count()) > 0 ? await model.first().getAttribute('data-value') : null;
  let effortValue: string | null = null;
  if (modelValue !== null) {
    // The flyout opens on the row's hover; its rows exist only while it is open.
    await model.first().hover();
    // Every row's flyout is in the DOM while closed; only the hovered one is visible.
    const openEffortRows = window.locator(`[data-testid="${TESTID.chatEffortRow}"]:visible`);
    await openEffortRows.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
    const effort = openEffortRows.and(window.locator('[data-selected="true"]'));
    effortValue = (await effort.count()) > 0 ? await effort.first().getAttribute('data-value') : null;
  }
  await window.keyboard.press('Escape');
  return { model: modelValue, effort: effortValue };
}

/** The preference file's records, read back from the state root this spec owns. */
function storedRecords(stateRoot: string): { model?: string; effort?: string }[] {
  try {
    const file = JSON.parse(readFileSync(join(stateRoot, 'chat-preferences.json'), 'utf8')) as {
      data: { byWorkspace: Record<string, { model?: string; effort?: string }> };
    };
    return Object.values(file.data.byWorkspace);
  } catch {
    return [];
  }
}

/** The settings domain's own file, read off the state root this spec owns. */
function storedAgent(stateRoot: string): string | undefined {
  try {
    const file = JSON.parse(readFileSync(join(stateRoot, 'settings.json'), 'utf8')) as {
      data?: { harness?: string };
    };
    return file.data?.harness;
  } catch {
    return undefined;
  }
}

/** The per-runtime defaults drawer — what the settings pane writes and what the v1 migration fills. */
function storedDefaults(stateRoot: string): Record<string, { model?: string } | undefined> {
  try {
    const file = JSON.parse(readFileSync(join(stateRoot, 'chat-preferences.json'), 'utf8')) as {
      data?: { defaults?: Record<string, { model?: string }> };
    };
    return file.data?.defaults ?? {};
  } catch {
    return {};
  }
}

/** Settings is a modal over the Projects Screen, raised by the sidebar row under Recent (ONL-2499). */
async function openSettings(window: Page): Promise<void> {
  await expect(window.getByTestId(TESTID.projectsView)).toBeVisible();
  await window.getByTestId(TESTID.projectsSettings).click();
  await expect(window.getByTestId(TESTID.settingsDialog)).toBeVisible();
  // Global, with no Project area: this Tab holds the Projects Screen, not a project (ONL-2499).
  await expect(window.getByTestId(TESTID.settingsDialog)).toHaveAttribute('data-area', 'global');
  await expect(window.getByTestId(TESTID.settingsAreaProject)).toHaveCount(0);
  await expect(window.getByTestId(TESTID.settingsPane)).toBeVisible();
}

/** The modal covers the Projects Screen, so anything done to that screen next needs it gone. */
async function closeSettings(window: Page): Promise<void> {
  await window.getByTestId(TESTID.settingsDialogClose).click();
  await expect(window.getByTestId(TESTID.settingsDialog)).toBeHidden();
}

/** By `aria-selected`, never by label: the option's copy is the shared agent-name string. */
async function pickOtherAgent(window: Page): Promise<void> {
  await window.getByTestId(TESTID.settingsAgentSelector).click();
  const other = window.locator('[role="option"][aria-selected="false"]:visible').first();
  await other.waitFor({ state: 'visible', timeout: 5_000 });
  await other.click();
}

/** The Set up button is drawn only for an agent that is not ready; whichever of the two offers one raises the sheet. */
async function raiseSetupSheet(window: Page): Promise<boolean> {
  const setUp = window.getByTestId(TESTID.settingsAgentSetup);
  for (const attempt of [0, 1]) {
    // The readiness a detection answers with decides whether the button exists at all.
    const offered = await setUp
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => setUp.isEnabled(), () => false);
    if (offered) {
      await setUp.click();
      return true;
    }
    if (attempt === 0) await pickOtherAgent(window);
  }
  return false;
}

/* The only place two `showModal()` dialogs exist at once: a component test renders
   static markup, and happy-dom's `<dialog>` is not Chromium's top layer (ONL-2499). */
test('Escape over the harness setup sheet closes the sheet and leaves Settings open', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);

  const stateRoot = makeStateRoot({ name: 'settings-escape-state' });
  const workspaceRoot = makeWorkspaceRoot({ name: 'settings-escape-workspaces' });

  try {
    const app = await launchStudio(target, { STUDIO_STATE_ROOT: stateRoot, STUDIO_WORKSPACE_ROOT: workspaceRoot });
    try {
      const window = await editorPage(app);
      await window.waitForLoadState('domcontentloaded');
      await openSettings(window);

      if (!(await raiseSetupSheet(window))) {
        // Skipped, never passed: this is the only executed proof of the nested-sheet Escape, so a
        // green tick it did not earn would hide the whole claim (ONL-2499).
        test.skip(true, 'both agents report ready on this machine, so no setup sheet could be raised');
      }
      const sheet = window
        .getByTestId(TESTID.onboardingDialogClaude)
        .or(window.getByTestId(TESTID.onboardingDialogCodex));
      await expect(sheet).toBeVisible({ timeout: 15_000 });

      await window.keyboard.press('Escape');

      // Both halves: the sheet closing alone would pass with the modal gone under it.
      await expect(sheet).toBeHidden();
      await expect(window.getByTestId(TESTID.settingsDialog)).toBeVisible();
      await expect(window.getByTestId(TESTID.settingsDialog)).toHaveAttribute('data-area', 'global');
      await expect(window.getByTestId(TESTID.settingsPane)).toBeVisible();
    } finally {
      await closeStudio(app);
    }
  } finally {
    cleanupTempFixtures();
  }
});

test('a model and effort picked in a project are what it opens on after a relaunch', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);

  const stateRoot = makeStateRoot({ name: 'preferences-state' });
  // Both roots, not the state alone: the worktree lives under the workspace root, which a fresh launch would mint anew.
  const workspaceRoot = makeWorkspaceRoot({ name: 'preferences-workspaces' });
  const ROOTS = { STUDIO_STATE_ROOT: stateRoot, STUDIO_WORKSPACE_ROOT: workspaceRoot };
  const source = makeSourceCheckout();

  try {
    // --- Launch 1: create the project, pick a model that is not the running one,
    // then a non-default effort for it.
    let picked: string | null = null;
    let pickedEffort: string | null = null;
    const app = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(app);
      await window.waitForLoadState('domcontentloaded');
      await createProjectWithoutStart(window, source.path);

      const control = window.getByTestId(TESTID.chatModelEffort);
      await expect(control).toBeVisible();
      // The rows arrive once the SDK has answered `supportedModels`, signed in or not.
      try {
        await expect(control).toBeEnabled({ timeout: 30_000 });
      } catch {
        test.skip(true, 'the model menu has no rows — the SDK never answered supportedModels');
      }

      await control.click();
      const rows = window.getByTestId(TESTID.chatModelRow);
      await expect(rows.first()).toBeVisible();
      const candidate = rows.and(window.locator(OTHER_SHORT_NAME)).first();
      picked = await candidate.getAttribute('data-value');
      expect(picked).not.toBeNull();
      await candidate.click();

      // The pick landed: the row is the selected one now…
      await expect.poll(async () => (await selectedChoice(window)).model, { timeout: 15_000 }).toBe(picked);

      // …then an effort that is neither the clearing entry nor the level in force; a model with no levels ends here.
      await control.click();
      const pickedRow = rows.and(window.locator(`[data-value="${picked ?? ''}"]`)).first();
      await pickedRow.hover();
      // Only the hovered row's flyout is visible; the others are in the DOM, closed.
      const effortRows = window.locator(`[data-testid="${TESTID.chatEffortRow}"]:visible`);
      await effortRows.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
      const effortCandidate = effortRows
        .and(window.locator(':not([data-selected="true"]):not([data-value="default"])'))
        .first();
      if ((await effortRows.count()) > 0 && (await effortCandidate.count()) > 0) {
        pickedEffort = await effortCandidate.getAttribute('data-value');
        await effortCandidate.click();
        await expect
          .poll(async () => (await selectedChoice(window)).effort, { timeout: 15_000 })
          .toBe(pickedEffort);
      } else {
        await window.keyboard.press('Escape');
      }

      // …and both reached THE state root this spec controls, which is what makes
      // the relaunch below evidence of the app's own write.
      await expect
        .poll(() => storedRecords(stateRoot).map((record) => record.model), { timeout: 10_000 })
        .toContain(picked);
      if (pickedEffort !== null) {
        await expect
          .poll(() => storedRecords(stateRoot).map((record) => record.effort), { timeout: 10_000 })
          .toContain(pickedEffort);
      }
    } finally {
      await closeStudio(app);
    }

    // --- Launch 2: same roots. The project comes back forward and opens on the
    // picked model, before any prompt, through the real session start.
    const relaunch = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(relaunch);
      await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 30_000 });
      await expect(window.getByTestId(TESTID.chatModelEffort)).toBeEnabled({ timeout: 30_000 });
      await expect.poll(async () => (await selectedChoice(window)).model, { timeout: 15_000 }).toBe(picked);
      if (pickedEffort !== null) {
        await expect
          .poll(async () => (await selectedChoice(window)).effort, { timeout: 15_000 })
          .toBe(pickedEffort);
      }
    } finally {
      await closeStudio(relaunch);
    }
  } finally {
    cleanupTempFixtures();
  }
});

test('the agent picked in settings survives a relaunch and is the one the chat panel reports', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  // The pin beats the settings domain in `resolvedHarness`, so a runner holding
  // one would green this case without the pane's write ever being read.
  expect(process.env['STUDIO_HARNESS'] ?? '', 'STUDIO_HARNESS is set and would decide this case instead of the pane').toBe('');

  const stateRoot = makeStateRoot({ name: 'settings-agent-state' });
  const workspaceRoot = makeWorkspaceRoot({ name: 'settings-agent-workspaces' });
  const ROOTS = { STUDIO_STATE_ROOT: stateRoot, STUDIO_WORKSPACE_ROOT: workspaceRoot };
  const source = makeSourceCheckout();

  try {
    // --- Launch 1: open settings on a state root that has never held a choice,
    // and pick the other agent.
    const app = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(app);
      await window.waitForLoadState('domcontentloaded');
      await openSettings(window);
      // Absence resolves to Claude (ONL-2120) — which is what makes the pick a change.
      await expect(window.getByTestId(TESTID.settingsAgentRow)).toHaveAttribute('data-value', 'claude');

      await pickOtherAgent(window);
      await expect(window.getByTestId(TESTID.settingsAgentRow)).toHaveAttribute('data-value', 'codex');
      // …and it reached THE state root this spec controls, which is what makes
      // the relaunch below evidence of the app's own write.
      await expect.poll(() => storedAgent(stateRoot), { timeout: 10_000 }).toBe('codex');
    } finally {
      await closeStudio(app);
    }

    // --- Launch 2: same roots. The pane reads codex from disk on a cold boot,
    // and a project opened now reports it on the panel that answers.
    const relaunch = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(relaunch);
      await window.waitForLoadState('domcontentloaded');
      await openSettings(window);
      await expect(window.getByTestId(TESTID.settingsAgentRow)).toHaveAttribute('data-value', 'codex');
      await closeSettings(window);

      await createProjectWithoutStart(window, source.path);
      await expect(window.getByTestId(TESTID.chatHeader)).toHaveAttribute('data-harness', 'codex', {
        timeout: 30_000,
      });
    } finally {
      await closeStudio(relaunch);
    }
  } finally {
    cleanupTempFixtures();
  }
});

/** A real model id, so the value the pane shows can only have come from the planted file. */
const MIGRATED_MODEL = 'claude-opus-4-1-20250805';

test('a v1 preference file becomes the settings default, and a composer pick never moves it', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);

  const stateRoot = makeStateRoot({ name: 'settings-migration-state' });
  const workspaceRoot = makeWorkspaceRoot({ name: 'settings-migration-workspaces' });
  const ROOTS = { STUDIO_STATE_ROOT: stateRoot, STUDIO_WORKSPACE_ROOT: workspaceRoot };
  const source = makeSourceCheckout();

  // The pre-ONL-2115 file, envelope and all: `latest` was the composer's last
  // pick, doubling as the seed for every new project.
  writeFileSync(
    join(stateRoot, 'chat-preferences.json'),
    `${JSON.stringify(
      { version: 1, data: { byWorkspace: {}, latest: { claude: { model: MIGRATED_MODEL } } } },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );

  try {
    const app = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(app);
      await window.waitForLoadState('domcontentloaded');
      await openSettings(window);
      // The user who never opened settings sees the value they were already
      // seeding from, and the file itself has moved to the v2 drawer.
      await expect(window.getByTestId(TESTID.settingsModelRow)).toHaveAttribute('data-value', MIGRATED_MODEL);
      expect(storedDefaults(stateRoot)['claude']?.model).toBe(MIGRATED_MODEL);
      await closeSettings(window);

      // …and a new project starts on it: the seed lands as that project's own record.
      await createProjectWithoutStart(window, source.path);
      await expect
        .poll(() => storedRecords(stateRoot).map((record) => record.model), { timeout: 15_000 })
        .toContain(MIGRATED_MODEL);

      // The composer writes `byWorkspace` and nothing else.
      const control = window.getByTestId(TESTID.chatModelEffort);
      await expect(control).toBeVisible();
      // `isEnabled` answers with today's state and never waits; the list arrives
      // once the SDK has answered `supportedModels`, so the wait has to retry.
      let hasRows = true;
      try {
        await expect(control).toBeEnabled({ timeout: 30_000 });
      } catch {
        hasRows = false;
      }
      if (hasRows) {
        await control.click();
        const rows = window.getByTestId(TESTID.chatModelRow);
        await expect(rows.first()).toBeVisible();
        const candidate = rows.and(window.locator(OTHER_SHORT_NAME)).first();
        const picked = await candidate.getAttribute('data-value');
        expect(picked).not.toBeNull();
        await candidate.click();
        await expect.poll(async () => (await selectedChoice(window)).model, { timeout: 15_000 }).toBe(picked);
        await expect
          .poll(() => storedRecords(stateRoot).map((record) => record.model), { timeout: 10_000 })
          .toContain(picked);
        expect(storedDefaults(stateRoot)['claude']?.model).toBe(MIGRATED_MODEL);
      } else {
        test.info().annotations.push({
          type: 'not-run',
          description:
            'the model menu has no rows — the SDK never answered supportedModels, so the composer half of this case did not run',
        });
      }
    } finally {
      await closeStudio(app);
    }

    // The settings default is what a cold boot still reads, whatever the
    // composer did to the project.
    const relaunch = await launchStudio(target, ROOTS);
    try {
      const window = await editorPage(relaunch, 'projects');
      await openSettings(window);
      await expect(window.getByTestId(TESTID.settingsModelRow)).toHaveAttribute('data-value', MIGRATED_MODEL);
    } finally {
      await closeStudio(relaunch);
    }
  } finally {
    cleanupTempFixtures();
  }
});
