import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { SetupHarnessId } from '@studio/events';
import {
  claudeShimLogins,
  cleanupTempFixtures,
  makeSourceCheckout,
  makeWorkspaceRoot,
  readClaudeShimState,
  setClaudeShimState,
} from '@studio/fixtures';
import { TESTID } from './contract.js';
import { addCodebaseFromFolder, claudeShimFor, closeStudio, editorPage, FIRST_RUN_ENV, isTargetPresent, launchStudio, missingHint, openedExternal, recordOpenExternal, settledDialog, stubClipboardText, stubFolderPicker, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

const tile = (page: Page, harness: SetupHarnessId) =>
  page.getByTestId(harness === 'claude' ? TESTID.onboardingTileClaude : TESTID.onboardingTileCodex);
// A row opens setup only from its end button, the last one in the row.
const open = (page: Page, harness: SetupHarnessId) => tile(page, harness).getByRole('button').last().click();
const dialog = (page: Page, harness: SetupHarnessId) =>
  page.getByTestId(harness === 'claude' ? TESTID.onboardingDialogClaude : TESTID.onboardingDialogCodex);
const action = (page: Page, name: string) => page.getByTestId(`${TESTID.setupActionPrefix}${name}`);
const paste = (page: Page) => page.getByTestId(`${TESTID.signInActionPrefix}paste`);

async function expectSettled(page: Page, harness: SetupHarnessId, state: string): Promise<void> {
  await expect(settledDialog(page, harness, state)).toBeVisible({ timeout: 15_000 });
}

async function done(page: Page, harness: SetupHarnessId): Promise<void> {
  await action(page, 'done').click();
  await expect(dialog(page, harness)).toBeHidden();
}

async function firstWindow(app: ElectronApplication): Promise<Page> {
  const window = await editorPage(app);
  await window.waitForLoadState('domcontentloaded');
  await expect(window.getByTestId(TESTID.onboardingAgents)).toBeVisible();
  return window;
}

test('a stored credential connects only once a turn answers; a broken binary lands on fallback; Check again and Sign in re-detect — one launch, the state file flipped between taps', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  // The verify pin is a diagnostics switch, and a packaged build carries none, so this walk has no pinned verdict there (ONL-2496).
  test.skip(target === 'packaged', 'the verify pin is shut on a packaged build');
  // The shim answers `auth status`, never a turn, so the verdict is pinned — opted into here, never a harness default (ONL-2496).
  const app = await launchStudio(target, { ...FIRST_RUN_ENV, STUDIO_AGENT_VERIFY: 'ok' });
  const shim = claudeShimFor(app);
  try {
    const window = await firstWindow(app);
    const claude = tile(window, 'claude');

    await expect(claude).toHaveAttribute('data-state', 'idle');
    await expect(claude).not.toHaveAttribute('data-mark', /.+/);
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();

    await open(window, 'claude');
    await expectSettled(window, 'claude', 'signed-in');
    expect(claudeShimLogins(shim.statePath)).toBe(0);
    await expect(claude).toHaveAttribute('data-state', 'signed-in');
    await expect(claude).toHaveAttribute('data-mark', 'connected');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeEnabled();
    await done(window, 'claude');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeEnabled();

    setClaudeShimState(shim.statePath, { state: 'failed' });
    await open(window, 'claude');
    await expectSettled(window, 'claude', 'fallback');
    await expect(dialog(window, 'claude').getByTestId(TESTID.signInField)).toHaveCount(1);
    await expect(dialog(window, 'claude').getByTestId(TESTID.signInDetail)).toHaveCount(1);
    expect(claudeShimLogins(shim.statePath)).toBe(0);
    await expect(claude).toHaveAttribute('data-mark', 'attention');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();

    setClaudeShimState(shim.statePath, { state: 'signed-in', email: 'e2e@onlook.test', plan: 'max' });
    await action(window, 'check-again').click();
    await expectSettled(window, 'claude', 'signed-in');
    expect(claudeShimLogins(shim.statePath)).toBe(0);
    await done(window, 'claude');

    setClaudeShimState(shim.statePath, { state: 'signed-out' });
    await open(window, 'claude');
    await expectSettled(window, 'claude', 'not-signed-in');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();
    await action(window, 'sign-in').click();
    await expectSettled(window, 'claude', 'signed-in');
    expect(claudeShimLogins(shim.statePath)).toBe(1);
    expect(readClaudeShimState(shim.statePath).state).toBe('signed-in');
    await expect(claude).toHaveAttribute('data-mark', 'connected');
    await done(window, 'claude');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeEnabled();
    await window.getByTestId(TESTID.onboardingContinue).click();
    await expect(window.getByTestId(TESTID.onboardingImport)).toBeVisible();
  } finally {
    await closeStudio(app);
  }
});

test('a credential the turn cannot use never reads as connected: the sheet names the reason and offers the other agent', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  // The verify pin is a diagnostics switch, and a packaged build carries none, so this walk has no pinned verdict there (ONL-2496).
  test.skip(target === 'packaged', 'the verify pin is shut on a packaged build');
  // The recorded machine: `auth status` answers signed in, the turn does not go through (ONL-2496).
  const app = await launchStudio(target, { ...FIRST_RUN_ENV, STUDIO_AGENT_VERIFY: 'turn-provider-refused' });
  try {
    const window = await firstWindow(app);
    const claude = tile(window, 'claude');

    await open(window, 'claude');
    await expectSettled(window, 'claude', 'cannot-connect');
    // A pinned verdict carries no words from Claude, so the sheet says so and draws no empty box (ONL-2903).
    await expect(dialog(window, 'claude').getByTestId(TESTID.signInDetail)).toHaveCount(0);
    await expect(dialog(window, 'claude').getByTestId('setup-other-agent')).toBeVisible();
    await expect(action(window, 'check-again')).toBeVisible();
    await expect(action(window, 'use-other-agent')).toBeVisible();
    await expect(action(window, 'sign-in')).toHaveCount(0);

    await expect(claude).toHaveAttribute('data-state', 'cannot-connect');
    await expect(claude).toHaveAttribute('data-mark', 'attention');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();

    // Check again spends another turn and lands the same way; the verdict is not cached into a pass.
    await action(window, 'check-again').click();
    await expectSettled(window, 'claude', 'cannot-connect');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();

    await action(window, 'use-other-agent').click();
    await expect(dialog(window, 'codex')).toBeVisible();
  } finally {
    await closeStudio(app);
  }
});

test('the paste path: a rejected code keeps the dialog on paste-code, the next one signs in, and no browser opens; a quit mid-login relaunches onto sign-in while a ready codex connects and is what gets recorded', async () => {
  test.setTimeout(180_000);
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  // The verify pin is a diagnostics switch, and a packaged build carries none, so this walk has no pinned verdict there (ONL-2496).
  test.skip(target === 'packaged', 'the verify pin is shut on a packaged build');
  const stateRoot = mkdtempSync(join(tmpdir(), 'studio-e2e-agent-setup-'));
  const roots = { STUDIO_STATE_ROOT: stateRoot, STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot() };
  let app: ElectronApplication | undefined;
  try {
    app = await launchStudio(target, { ...roots, ...FIRST_RUN_ENV, STUDIO_AGENT_VERIFY: 'ok' }, {
      claudeShim: { state: 'signed-out', login: 'paste-invalid' },
    });
    const shim = claudeShimFor(app);
    await recordOpenExternal(app);
    let window = await firstWindow(app);
    const claude = tile(window, 'claude');

    await open(window, 'claude');
    await expectSettled(window, 'claude', 'not-signed-in');
    await action(window, 'sign-in').click();
    await expectSettled(window, 'claude', 'signing-in');
    expect(claudeShimLogins(shim.statePath)).toBe(1);
    await expect(claude).toHaveAttribute('data-state', 'signing-in');

    await action(window, 'open-page-again').click();
    await expectSettled(window, 'claude', 'paste-code');
    expect(await openedExternal(app)).toEqual([]);
    await expect(action(window, 'done')).toBeDisabled();

    await stubClipboardText(app, 'bad-code');
    await paste(window).click();
    await expect(action(window, 'done')).toBeEnabled();
    await action(window, 'done').click();
    await expect(dialog(window, 'claude').getByTestId(TESTID.signInDetail)).toHaveCount(1);
    await expectSettled(window, 'claude', 'paste-code');
    expect(claudeShimLogins(shim.statePath)).toBe(1);

    await stubClipboardText(app, 'good-code');
    await paste(window).click();
    await action(window, 'done').click();
    await expectSettled(window, 'claude', 'signed-in');
    expect(readClaudeShimState(shim.statePath).state).toBe('signed-in');
    expect(await openedExternal(app)).toEqual([]);
    await expect(claude).toHaveAttribute('data-mark', 'connected');
    await done(window, 'claude');

    setClaudeShimState(shim.statePath, { state: 'signed-out' });
    await open(window, 'claude');
    await expectSettled(window, 'claude', 'not-signed-in');
    await action(window, 'sign-in').click();
    await expectSettled(window, 'claude', 'signing-in');
    expect(claudeShimLogins(shim.statePath)).toBe(2);
    await closeStudio(app);
    app = undefined;
    expect(readClaudeShimState(shim.statePath).state).toBe('signed-out');

    // STUDIO_FIRST_RUN empty, not '1': a forced first run skips the onboarding.json write read back below.
    app = await launchStudio(target, {
      ...roots,
      ...shim.env,
      STUDIO_CODEX_SETUP: 'ready',
      STUDIO_FIRST_RUN: '',
      STUDIO_AGENT_PROBE: 'ok',
    });
    window = await firstWindow(app);
    await stubFolderPicker(app, makeSourceCheckout().path);
    await expect(tile(window, 'claude')).toHaveAttribute('data-state', 'idle');
    await expect(tile(window, 'codex')).toHaveAttribute('data-state', 'idle');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();

    await open(window, 'claude');
    await expectSettled(window, 'claude', 'not-signed-in');
    expect(claudeShimLogins(shim.statePath)).toBe(2);
    await window.keyboard.press('Escape');
    await expect(dialog(window, 'claude')).toBeHidden();

    await open(window, 'codex');
    await expectSettled(window, 'codex', 'connected');
    await expect(tile(window, 'codex')).toHaveAttribute('data-state', 'connected');
    await expect(tile(window, 'codex')).toHaveAttribute('data-mark', 'connected');
    await done(window, 'codex');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeEnabled();
    await window.getByTestId(TESTID.onboardingContinue).click();
    await addCodebaseFromFolder(window);
    await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 30_000 });

    const persisted = JSON.parse(readFileSync(join(stateRoot, 'onboarding.json'), 'utf8')) as {
      version: number;
      data: { harness?: string; completedAt?: string };
    };
    expect(persisted.version).toBe(1);
    expect(persisted.data.harness).toBe('codex');
    expect(persisted.data.completedAt).toBeTruthy();
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('a login the server rejects lands on fallback with the child gone, and a downloading codex keeps the gate shut', async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const app = await launchStudio(
    target,
    { STUDIO_CODEX_SETUP: 'downloading', ...FIRST_RUN_ENV },
    { claudeShim: { state: 'signed-out', login: 'server-reject' } },
  );
  const shim = claudeShimFor(app);
  try {
    await recordOpenExternal(app);
    const window = await firstWindow(app);

    await open(window, 'codex');
    await expectSettled(window, 'codex', 'downloading');
    await expect(tile(window, 'codex')).toHaveAttribute('data-state', 'downloading');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();
    await action(window, 'cancel').click();
    await expect(dialog(window, 'codex')).toBeHidden();

    await open(window, 'claude');
    await expectSettled(window, 'claude', 'not-signed-in');
    await action(window, 'sign-in').click();
    await expectSettled(window, 'claude', 'signing-in');
    await action(window, 'open-page-again').click();
    await expectSettled(window, 'claude', 'paste-code');
    await stubClipboardText(app, 'any-code');
    await paste(window).click();
    await action(window, 'done').click();
    await expectSettled(window, 'claude', 'fallback');
    await expect(dialog(window, 'claude').getByTestId(TESTID.signInDetail)).toHaveCount(1);
    await expect(tile(window, 'claude')).toHaveAttribute('data-mark', 'attention');
    await expect(window.getByTestId(TESTID.onboardingContinue)).toBeDisabled();
    expect(claudeShimLogins(shim.statePath)).toBe(1);
    expect(readClaudeShimState(shim.statePath).state).toBe('signed-out');
    expect(await openedExternal(app)).toEqual([]);
  } finally {
    await closeStudio(app);
  }
});
