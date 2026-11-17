import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { closeStudio, createProjectWithoutStart, editorPage, isTargetPresent, launchStudio, missingHint, repoRoot, type Target } from './launch.js';

test('Project Chat opens Connectors and keeps permissions in the model menu', async () => {
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(target, {
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_AGENT_PROBE: 'ok',
    STUDIO_FLAGS: 'connectors',
    STUDIO_AGENT_REPLAY: join(repoRoot, 'tests/live/recordings/claude/tools.jsonl'),
    // Without the pin the verification runs for real on a launch that is signed out of Claude, and the sign-in card it raises covers the composer this walk opens the menu from.
    STUDIO_AGENT_VERIFY: 'ok',
  });
  try {
    const page = await editorPage(app);
    await createProjectWithoutStart(page, makeSourceCheckout().path);
    await expect(page.getByRole('button', { name: 'Connectors', exact: true })).toHaveCount(0);
    await page.getByTestId('chat-add-menu').click();
    await page.getByRole('menuitem', { name: 'Connectors', exact: true }).click();
    await expect(page.getByTestId(TESTID.chatConnectorsMenu)).toBeVisible();
    await expect(page.getByTestId(TESTID.chatConnectorsMenu).getByText('Figma', { exact: true })).toBeVisible();
    await expect(page.getByTestId(TESTID.chatConnectorsMenu).getByText('Mobbin', { exact: true })).toBeVisible();
    await expect.poll(async () => (await page.evaluate(() => window.studio.settingsState())).connectorsNoticeDismissed).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(TESTID.chatConnectorsMenu)).toBeHidden();
    await expect(page.getByTestId('chat-add-menu')).toBeFocused();
    await page.getByTestId(TESTID.chatModelEffort).click();
    await expect(page.getByTestId(TESTID.chatPermissionRow)).toBeVisible();
    // What a settled Claude session reports: `CLAUDE_PERMISSION_MODE`, not the mode the row holds before one answers.
    await expect(page.getByTestId(TESTID.chatPermissionRow).getByTestId('chat-permission-value')).toHaveText('Auto');
    await expect(page.getByTestId('chat-permission-mode')).toHaveCount(0);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
