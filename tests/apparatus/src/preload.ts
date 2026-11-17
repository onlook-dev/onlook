import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, mock } from 'bun:test';
import { mockMainProcessElectron } from './electron.js';

process.env['STUDIO_TEST_OFFICIAL_BUILD'] = '1';

// Removed per run, not at exit: `process.on('exit')` never fires under `bun test`, and `--rerun-each` is several runs.
const processRoot = mkdtempSync(join(tmpdir(), 'studio-test-'));
process.env['TMPDIR'] = processRoot;
beforeAll(() => {
  mkdirSync(processRoot, { recursive: true });
});
afterAll(() => {
  rmSync(processRoot, { recursive: true, force: true });
});

// `userEnv()` spawns `$SHELL -i -l`; this shell runs the fenced command and reads no rc file (ONL-2368).
process.env['SHELL'] = fileURLToPath(new URL('./no-rc-shell.sh', import.meta.url));

// Bun's module registry is process-global: the first `electron` registration decides every suite (canary: `apps/studio/src/main/electron-mock.test.ts`).
mock.module('electron', () => mockMainProcessElectron());

// A global `core.hooksPath` (git-lfs, lefthook) overrides every fixture repo's own `.git/hooks`; set here so a bare `bun test <file>` matches CI (ONL-2255, ONL-2216).
if (process.env['GIT_CONFIG_GLOBAL'] === undefined) {
  const inherited = inheritedHooksPath();
  process.env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  if (inherited !== undefined) {
    console.warn(
      `[fixtures] ignoring your global git config for this run — core.hooksPath=${inherited} would reach every fixture repo, override its own .git/hooks, and add ~0.8s per commit (ONL-2255).`,
    );
  }
}

// Called before `GIT_CONFIG_GLOBAL` is set above, or it reads the neutralised config.
function inheritedHooksPath(): string | undefined {
  try {
    const configured = execFileSync('git', ['config', '--global', '--get', 'core.hooksPath'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return configured === '' ? undefined : configured;
  } catch {
    // `--get` exits non-zero when the key is unset.
    return undefined;
  }
}
