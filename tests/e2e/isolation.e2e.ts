// A worktree cut from local HEAD instead of the base ref looks identical everywhere else; the SHA assertions here are the only catch (ONL-1869).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { TESTID } from './contract.js';
import {
  cleanupTempFixtures,
  hashTree,
  makeCopySourceDir,
  makeSourceCheckout,
  makeGitRepo,
  makeWorkspaceRoot,
} from '@studio/fixtures';
import { addCodebaseFromFolder, FIRST_RUN_ENV, agentSnapshot, closeStudio, connectClaude, editorPage, isTargetPresent, launchStudio, missingHint, stubFolderPicker, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

// A single read races the session start and reports `cwd: undefined`, the same as a refusal.
async function waitForAgentCwd(page: Page): Promise<string> {
  await expect
    .poll(() => agentSnapshot(page).then((snapshot) => snapshot.cwd), { timeout: 15_000 })
    .toBeDefined();
  const { cwd } = await agentSnapshot(page);
  return cwd as string;
}

async function pickFolderInFirstRun(window: Page): Promise<void> {
  await connectClaude(window);

  await addCodebaseFromFolder(window);
}

async function openConnectEntry(window: Page): Promise<void> {
  await pickFolderInFirstRun(window);
}

async function withIsolatedStudio(
  body: (window: Page, app: ElectronApplication, workspaceRoot: string) => Promise<void>,
): Promise<void> {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  const workspaceRoot = makeWorkspaceRoot();
  // The shim answers `auth status`, never a turn, so the verdict is pinned (ONL-2541).
  const app = await launchStudio(target, {
    STUDIO_WORKSPACE_ROOT: workspaceRoot,
    ...FIRST_RUN_ENV,
    STUDIO_AGENT_VERIFY: 'ok',
  });
  try {
    const window = await editorPage(app);
    await window.waitForLoadState('domcontentloaded');
    await body(window, app, workspaceRoot);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
}

test('a connected folder gets a project worktree cut from the remote — env copied, nothing local reachable', async () => {
  await withIsolatedStudio(async (window, app, workspaceRoot) => {
    const source = makeSourceCheckout({
      envFiles: ['.env', 'apps/web/.env.local', 'node_modules/pkg/.env'],
    });

    // Premise: origin/HEAD unset, or the resolution rung stops being covered.
    expect(() =>
      execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
        cwd: source.path,
        stdio: 'ignore',
      }),
    ).toThrow();

    await stubFolderPicker(app, source.path);
    await openConnectEntry(window);

    await expect(window.getByTestId(TESTID.canvas)).toBeVisible();
    await expect(window.getByTestId(TESTID.workspaceRefused)).toHaveCount(0);
    await expect(window.getByTestId(TESTID.connectDialog)).toBeHidden();

    const workspacePath = await waitForAgentCwd(window);

    expect(workspacePath).not.toBe(source.path);
    expect(workspacePath.startsWith(workspaceRoot)).toBe(true);
    expect(existsSync(join(workspacePath, 'index.js'))).toBe(true);

    // Commit identity, not merge-base: merge-base passes whichever ref was used.
    const git = (cwd: string, args: string[]): string =>
      execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
    expect(git(workspacePath, ['rev-parse', 'HEAD'])).toBe(
      git(source.path, ['rev-parse', 'origin/main']),
    );
    expect(git(workspacePath, ['rev-parse', 'HEAD'])).not.toBe(
      git(source.path, ['rev-parse', 'HEAD']),
    );

    const workspaceIndex = readFileSync(join(workspacePath, 'index.js'), 'utf8');
    expect(workspaceIndex).toBe(source.pushedContent);
    expect(workspaceIndex).not.toBe(source.localOnlyContent);
    expect(workspaceIndex).not.toBe(source.uncommittedContent);

    expect(readFileSync(join(source.path, 'index.js'), 'utf8')).toBe(
      source.uncommittedContent,
    );

    expect(() => git(workspacePath, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();

    expect(existsSync(join(workspacePath, '.env'))).toBe(true);
    expect(existsSync(join(workspacePath, 'apps/web/.env.local'))).toBe(true);
    expect(existsSync(join(workspacePath, 'node_modules/pkg/.env'))).toBe(false);

    expect(git(workspacePath, ['status', '--porcelain'])).not.toContain('.env');
  });
});

test('a repo with no remote gets a worktree cut from local main — never HEAD, nothing tracked', async () => {
  await withIsolatedStudio(async (window, app, workspaceRoot) => {
    const source = makeGitRepo({ remote: false });
    const git = (cwd: string, args: string[]): string =>
      execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

    expect(git(source.path, ['remote'])).toBe('');

    // HEAD moved off main: with HEAD equal to main, a HEAD-cut worktree passes every assertion below.
    const branchOnlyContent = '// COMMITTED ON A BRANCH, not on main\n';
    const uncommittedContent = '// UNCOMMITTED EDIT in the working tree\n';
    git(source.path, ['checkout', '--quiet', '-b', 'scratch']);
    writeFileSync(join(source.path, 'index.js'), branchOnlyContent);
    git(source.path, ['commit', '--quiet', '-am', 'branch-only']);
    writeFileSync(join(source.path, 'index.js'), uncommittedContent);
    expect(git(source.path, ['rev-parse', 'HEAD'])).not.toBe(
      git(source.path, ['rev-parse', 'refs/heads/main']),
    );

    await stubFolderPicker(app, source.path);
    await openConnectEntry(window);

    await expect(window.getByTestId(TESTID.canvas)).toBeVisible();
    await expect(window.getByTestId(TESTID.workspaceRefused)).toHaveCount(0);
    await expect(window.getByTestId(TESTID.connectDialog)).toBeHidden();

    const workspacePath = await waitForAgentCwd(window);

    expect(workspacePath).not.toBe(source.path);
    expect(workspacePath.startsWith(workspaceRoot)).toBe(true);

    expect(git(workspacePath, ['rev-parse', 'HEAD'])).toBe(
      git(source.path, ['rev-parse', 'refs/heads/main']),
    );
    expect(git(workspacePath, ['rev-parse', 'HEAD'])).not.toBe(
      git(source.path, ['rev-parse', 'HEAD']),
    );

    const workspaceIndex = readFileSync(join(workspacePath, 'index.js'), 'utf8');
    expect(workspaceIndex).toBe(source.pushedContent);
    expect(workspaceIndex).not.toBe(branchOnlyContent);
    expect(workspaceIndex).not.toBe(uncommittedContent);
    expect(readFileSync(join(source.path, 'index.js'), 'utf8')).toBe(uncommittedContent);

    expect(() => git(workspacePath, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(git(workspacePath, ['remote'])).toBe('');
  });
});

test('a folder with no git history is copied into a Studio bucket — the folder untouched, nothing tracked', async () => {
  await withIsolatedStudio(async (window, app, workspaceRoot) => {
    const folder = makeCopySourceDir();
    const git = (cwd: string, args: string[]): string =>
      execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

    expect(() =>
      execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: folder.path, stdio: 'ignore' }),
    ).toThrow();
    const before = hashTree(folder.path);

    await stubFolderPicker(app, folder.path);
    await openConnectEntry(window);

    await expect(window.getByTestId(TESTID.canvas)).toBeVisible({ timeout: 30_000 });
    await expect(window.getByTestId(TESTID.workspaceRefused)).toHaveCount(0);
    await expect(window.getByTestId(TESTID.connectDialog)).toBeHidden();

    const workspacePath = await waitForAgentCwd(window);

    expect(hashTree(folder.path)).toBe(before);
    expect(existsSync(join(folder.path, '.git'))).toBe(false);

    expect(workspacePath).not.toBe(folder.path);
    expect(workspacePath.startsWith(workspaceRoot)).toBe(true);
    expect(readFileSync(join(workspacePath, 'src/index.js'), 'utf8')).toBe(folder.files['src/index.js']);

    expect(() => git(workspacePath, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(git(workspacePath, ['remote'])).toBe('');
    expect(git(workspacePath, ['rev-list', '--count', 'HEAD'])).toBe('1');

    const tracked = git(workspacePath, ['ls-files']).split('\n');
    expect(existsSync(join(workspacePath, '.env'))).toBe(true);
    expect(tracked).not.toContain('.env');
    expect(tracked).not.toContain('credentials.json');
    expect(existsSync(join(workspacePath, 'node_modules'))).toBe(false);
    expect(git(workspacePath, ['status', '--porcelain'])).toBe('');

    // The registry backstop: an unregistered repo announced through the bridge does not move the session. Polled, since an immediate read passes even when the guard did nothing.
    const raw = makeSourceCheckout().path;
    await window.evaluate((path) => globalThis.studio.notifyProjectSelected({ path }), raw);
    await expect
      .poll(async () => (await agentSnapshot(window)).cwd, { timeout: 5_000 })
      .toBe(workspacePath);
  });
});
