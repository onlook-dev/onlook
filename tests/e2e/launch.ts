import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { _electron as electron, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import type { AgentSnapshot } from '@studio/events';
import { FIRST_RUN_ENV, prepareLaunch, studioPaths, type ClaudeShim, type ClaudeShimOptions, type SeededPerson } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { packagedAppPath } from '../../scripts/release-targets.js';

export { FIRST_RUN_ENV };

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const { appDir, mainEntry: BUILD_MAIN } = studioPaths(repoRoot);

export type Target = 'build' | 'packaged';

export function agentSnapshot(page: Page): Promise<AgentSnapshot> {
  return page.evaluate(() => globalThis.studio.agentSnapshot());
}

export function panelResizeState(page: Page) {
  return page.evaluate(async () => {
    const bridge = globalThis.studio;
    return { panels: await bridge.panelsState(), split: await bridge.sidebarLayoutState() };
  });
}

const { productName: officialProductName } = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')) as {
  productName: string;
};
const productName = process.env['STUDIO_CLOUD_BUILD'] === '1' ? officialProductName : 'Onlook Source';
const PACKAGED_APP = packagedAppPath(join(repoRoot, 'release'), productName, process.arch === 'x64' ? 'x64' : 'arm64');
const PACKAGED_BIN = process.platform === 'win32'
  ? join(repoRoot, 'release/win-unpacked', `${productName}.exe`)
  : join(PACKAGED_APP, `Contents/MacOS/${productName}`);

export function targetPath(target: Target): string {
  return target === 'packaged' ? PACKAGED_BIN : BUILD_MAIN;
}

export function missingHint(target: Target): string {
  return target === 'packaged'
    ? `Packaged app missing at ${PACKAGED_APP} — run \`bun run build:dmg\` first.`
    : `Build output missing at ${BUILD_MAIN} — run \`bun run build\` first.`;
}

export function isTargetPresent(target: Target): boolean {
  return existsSync(targetPath(target));
}

export const TERMINAL_ENV = { STUDIO_NO_PTY: '0' } as const;

export interface LaunchOptions {
  telemetryConsent?: 'unanswered';
  analyticsConsent?: 'ask' | 'decline';
  identity?: 'seeded' | 'none';
  /** Seeded beside the email, so `identity: 'none'` writes neither (ONL-2701). */
  person?: SeededPerson;
  claudeShim?: ClaudeShimOptions;
  tourSeen?: boolean;
  /** Caller-owned, like a caller's `STUDIO_STATE_ROOT`: neither minted nor released, so a second launch is the same Chromium profile (ONL-2324). */
  profileDir?: string;
}

const READY_TIMEOUT_MS = 30_000;

const CLOSE_TIMEOUT_MS = 15_000;

export async function launchStudio(
  target: Target,
  extraEnv: Record<string, string> = {},
  options: LaunchOptions = {},
): Promise<ElectronApplication> {
  const callerStateRoot = extraEnv['STUDIO_STATE_ROOT'];
  const stateRoot = callerStateRoot ?? mkdtempSync(join(tmpdir(), 'studio-e2e-state-'));
  // Shares userData with `bun dev` otherwise; a shared Chromium profile presents as random launch and teardown flake.
  const callerProfileDir = options.profileDir;
  const userDataDir = callerProfileDir ?? mkdtempSync(join(tmpdir(), 'studio-e2e-profile-'));
  const launch = prepareLaunch({
    stateRoot,
    userDataDir,
    tourSeen: options.tourSeen ?? true,
    telemetryConsent: options.telemetryConsent ?? (options.analyticsConsent === 'ask' ? 'unanswered' : 'declined'),
    ...(options.identity === 'none' ? { email: null } : {}),
    ...(options.person === undefined ? {} : { person: options.person }),
    ...(options.claudeShim === undefined ? {} : { claudeShim: options.claudeShim }),
    headed: process.env['STUDIO_E2E_HEADED'] === '1',
    env: extraEnv,
  });
  const app =
    target === 'packaged'
      ? await electron.launch({ executablePath: PACKAGED_BIN, args: launch.args, env: launch.processEnv })
      : await electron.launch({ args: [BUILD_MAIN, ...launch.args], cwd: appDir, env: launch.processEnv });

  if (!callerProfileDir) profileDirs.set(app, userDataDir);
  if (!callerStateRoot) stateDirs.set(app, stateRoot);
  if (launch.shim) claudeShims.set(app, launch.shim);
  // Closing before the first window loads segfaults the browser process (ONL-1820); `firstWindow()` may resolve the band, not the tab.
  const page = await editorPage(app);
  const source = await app.evaluate(({ app }) => app.getName() === 'Onlook Source');
  const instrument = ['STUDIO_SHOWROOM', 'STUDIO_ONBOARDING', 'STUDIO_PROJECTS', 'STUDIO_CHAT_FIXTURE', 'STUDIO_DIAGNOSTICS'].some((key) => Boolean(extraEnv[key]));
  if (source && !instrument && options.analyticsConsent !== 'ask' && options.telemetryConsent !== 'unanswered' && await page.evaluate(() => window.studio.telemetryConsent()) === null) {
    await page.getByTestId('telemetry-decline').click();
  }
  return app;
}

async function pageMatching(
  app: ElectronApplication,
  what: string,
  choose: (pages: readonly Page[]) => Promise<Page | undefined>,
): Promise<Page> {
  // `windows()` is empty until `firstWindow()` has been awaited; polling it alone never terminates.
  await app.firstWindow({ timeout: READY_TIMEOUT_MS });
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    const page = await choose(app.windows());
    if (page) {
      await page.waitForLoadState('domcontentloaded');
      return page;
    }
    if (Date.now() > deadline) {
      const seen = app.windows().map((candidate) => candidate.url()).join(', ') || '(none)';
      throw new Error(`No ${what} view appeared within ${String(READY_TIMEOUT_MS)}ms. Saw: ${seen}`);
    }
    await app.windows()[0]?.waitForTimeout(100).catch(() => undefined);
  }
}

async function firstOf(pages: readonly Page[], fits: (page: Page) => Promise<boolean>): Promise<Page | undefined> {
  for (const page of pages) if (await fits(page)) return page;
  return undefined;
}

const isBand = (page: Page): boolean => page.url().includes('chrome.html');

function tabIdOf(url: string): string | null {
  try {
    return new URL(url).searchParams.get('tab');
  } catch {
    return null;
  }
}

export async function tabPageOpenedSince(app: ElectronApplication, before: readonly Page[]): Promise<Page> {
  const known = new Set(before);
  return pageMatching(app, 'new tab', (pages) =>
    firstOf(pages, async (page) => !isBand(page) && !known.has(page) && (await isNotParked(page))),
  );
}

export type TabChoice = 'active' | 'projects';

async function chosenTabId(band: Page, choice: TabChoice): Promise<string | undefined> {
  const state = await band
    .evaluate(() => globalThis.studioChrome?.tabsState())
    .catch(() => undefined);
  if (state === undefined) return undefined;
  if (choice === 'active') return state.activeId;
  const lists = state.tabs.filter((tab) => tab.purpose === 'projects');
  return (lists.find((tab) => tab.id === state.activeId) ?? lists[0])?.id;
}

/** By the band's tab state, not window order: a relaunch restores tabs beside the projects list (ONL-2426). */
export function editorPage(app: ElectronApplication, choice: TabChoice = 'active'): Promise<Page> {
  return pageMatching(app, choice === 'active' ? 'active tab' : 'projects-list tab', async (pages) => {
    const band = pages.find(isBand);
    // A dev instrument draws one window and no band.
    if (band === undefined) {
      return firstOf(pages, async (page) => /^(file|https?):/.test(page.url()) && tabIdOf(page.url()) === null);
    }
    const id = await chosenTabId(band, choice);
    if (id === undefined) return undefined;
    return firstOf(pages, async (page) => tabIdOf(page.url()) === id && (await isNotParked(page)));
  });
}

async function isNotParked(page: Page): Promise<boolean> {
  try {
    return (await page.locator('[data-testid="parked-surface"]').count()) === 0;
  } catch {
    // A page still loading cannot be read; the caller's loop comes back.
    return false;
  }
}

export function chromePage(app: ElectronApplication): Promise<Page> {
  return pageMatching(app, 'chrome', async (pages) => pages.find(isBand));
}

const profileDirs = new Map<ElectronApplication, string>();

const stateDirs = new Map<ElectronApplication, string>();

const claudeShims = new Map<ElectronApplication, ClaudeShim>();

export function claudeShimFor(app: ElectronApplication): ClaudeShim {
  const shim = claudeShims.get(app);
  if (!shim) throw new Error('this launch supplied its own STUDIO_CLAUDE_BIN; the harness wrote no shim for it');
  return shim;
}

type Outcome =
  | { kind: 'exit'; code: number }
  | { kind: 'signal'; signal: string }
  | { kind: 'timeout' };

export type CloseOutcome = Extract<Outcome, { kind: 'exit' }>;

function releaseTempDir(dirs: Map<ElectronApplication, string>, app: ElectronApplication): void {
  const dir = dirs.get(app);
  if (!dir) return;
  dirs.delete(app);
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // A wedged process may still hold files; the red run it accompanies is the signal.
  }
}

// `app.close()` resolves normally when the browser process dies on SIGSEGV; the exit status is the verdict (ONL-1820).
export async function closeStudio(app: ElectronApplication | undefined): Promise<CloseOutcome> {
  if (!app) return { kind: 'exit', code: 0 };
  const proc = app.process();

  // Registered before `close()`: an exit that lands immediately is otherwise missed.
  const exited = new Promise<Outcome>((resolve) => {
    if (proc.signalCode !== null) {
      resolve({ kind: 'signal', signal: proc.signalCode });
      return;
    }
    if (proc.exitCode !== null) {
      resolve({ kind: 'exit', code: proc.exitCode });
      return;
    }
    proc.once('exit', (code, signal) => {
      resolve(signal != null ? { kind: 'signal', signal } : { kind: 'exit', code: code ?? 0 });
    });
  });

  let closeError: unknown;
  try {
    await app.close();
  } catch (error) {
    closeError = error;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    exited,
    new Promise<Outcome>((resolve) => {
      timer = setTimeout(() => resolve({ kind: 'timeout' }), CLOSE_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });

  releaseTempDir(profileDirs, app);
  releaseTempDir(stateDirs, app);
  claudeShims.delete(app);

  if (outcome.kind === 'signal') {
    throw new Error(
      `Electron died on ${outcome.signal} during teardown instead of exiting cleanly (ONL-1820). ` +
        `The test result above is not trustworthy evidence of a clean exit. ` +
        `Look for a fresh Electron-*.ips in ~/Library/Logs/DiagnosticReports.`,
    );
  }
  if (outcome.kind === 'timeout') {
    throw new Error(
      `Electron did not exit within ${String(CLOSE_TIMEOUT_MS)}ms of close() (ONL-1820). ` +
        `The process is wedged in teardown; Playwright would otherwise SIGKILL it silently.`,
    );
  }
  if (closeError) throw closeError;
  return outcome;
}

type StubbableDialog = { showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }> };

export async function stubFolderPicker(app: ElectronApplication, path: string | string[]): Promise<void> {
  await app.evaluate(async ({ dialog }, selected) => {
    (dialog as unknown as StubbableDialog).showOpenDialog = async () => ({
      canceled: false,
      filePaths: Array.isArray(selected) ? selected : [selected],
    });
  }, path);
}

export async function createProjectFromProjectsView(
  app: ElectronApplication,
  window: Page,
  sourcePath: string,
): Promise<void> {
  await expect(window.getByTestId(TESTID.projectsView)).toBeVisible();
  await stubFolderPicker(app, sourcePath);
  // The add-control is `pointer-events: none` until the sidebar is hovered.
  await window.getByTestId(TESTID.projectsSidebar).hover();
  await window.getByTestId(TESTID.sidebarSectionAction).click();
  await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 30_000 });
}

type StubbableClipboard = { readText: () => string };

/** No dev-server start and no kickoff turn: the UI's create sends a start that spends a replayed recording and, signed out, disables the composer. */
export async function createProjectWithoutStart(window: Page, sourcePath: string): Promise<void> {
  await expect(window.getByTestId(TESTID.projectsView)).toBeVisible();
  await window.evaluate(async (path) => {
    const bridge = globalThis.studio;
    const plan = await bridge.workspacePlan({ sourcePath: path });
    if (plan.kind !== 'ready') throw new Error(`plan refused: ${plan.kind}`);
    bridge.tabsCreateProject({ sourcePath: plan.sourcePath, comfort: 'design', entryPoint: 'projects' });
  }, sourcePath);
  await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 30_000 });
}

export async function stubClipboardText(app: ElectronApplication, text: string): Promise<void> {
  await app.evaluate(({ clipboard }, seeded) => {
    (clipboard as unknown as StubbableClipboard).readText = () => seeded;
  }, text);
}

type ExternalLog = { __e2eOpened?: string[] };

export async function recordOpenExternal(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ shell }) => {
    const log = globalThis as ExternalLog;
    log.__e2eOpened = [];
    shell.openExternal = async (url: string) => {
      log.__e2eOpened?.push(url);
    };
  });
}

export function openedExternal(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(() => (globalThis as ExternalLog).__e2eOpened ?? []);
}

// `:not([data-busy])`: a detection in flight redraws the previous verdict.
export function settledDialog(page: Page, provider: 'claude' | 'codex', state: string): Locator {
  const id = provider === 'claude' ? TESTID.onboardingDialogClaude : TESTID.onboardingDialogCodex;
  return page.locator(`[data-testid="${id}"][data-state="${state}"]:not([data-busy])`);
}

/** The agents screen, which with `machine-check` off is all there is before the first project. */
export async function connectClaude(page: Page): Promise<void> {
  await expect(page.getByTestId(TESTID.onboardingAgents)).toBeVisible();
  await page.getByTestId(TESTID.onboardingTileClaude).getByRole('button').last().click();
  await expect(settledDialog(page, 'claude', 'signed-in')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId(`${TESTID.setupActionPrefix}done`).click();
  await expect(page.getByTestId(TESTID.onboardingDialogClaude)).toBeHidden();
  await page.getByTestId(TESTID.onboardingContinue).click();
}

/** The first-run step's own door into a folder: the Add codebase card, then From a folder in its menu. */
export async function addCodebaseFromFolder(page: Page): Promise<void> {
  await expect(page.getByTestId(TESTID.onboardingImport)).toBeVisible();
  await page.getByTestId(TESTID.onboardingImportRow).getByTestId(TESTID.addCodebase).click();
  await page.getByTestId(TESTID.codebaseFromFolder).click();
}

/* The region is drawn before the Canvas it will hold arrives; `toPass`, not `poll`, because a bridge call that
   rejects is the transient this waits out (ONL-3182). */
export async function expectCanvasDocument(page: Page): Promise<void> {
  await expect(async () => {
    expect(await page.evaluate(async () => Boolean((await globalThis.studio.canvasSnapshot()).doc))).toBe(true);
  }).toPass({ timeout: 30_000 });
}
