import { tmpdir } from 'node:os';
import type { MachineInstallResult } from '@studio/events';
import { runCli } from '../env/cli.js';
import { runGit, USER_GIT_CONFIG } from '../env/git.js';
import { resetSelectedDeveloperTools } from '../env/git-available.js';

export interface InstallToolsDeps {
  /** The tools are usable, not merely requested. */
  present(): Promise<boolean>;
  /** Apple's own installer is on screen. */
  installerRunning(): Promise<boolean>;
  /** False when macOS was never asked, so no dialog is coming. */
  request(): Promise<boolean>;
  wait(ms: number): Promise<void>;
  now(): number;
}

export const INSTALL_POLL_MS = 3_000;
/** Apple's dialog takes a moment to appear; before this, its absence says nothing. */
export const INSTALL_APPEAR_MS = 60_000;
export const INSTALL_LIMIT_MS = 30 * 60_000;

const INSTALLER_PROCESS = 'Install Command Line Developer Tools';

/** `xcode-select --install` returns as soon as macOS has been asked, so its exit code says nothing about the install (ONL-3111). */
export async function installDeveloperTools(deps: InstallToolsDeps): Promise<MachineInstallResult> {
  if (await deps.present()) return 'installed';
  // A refused request with no dialog on screen is a failure; refused because one is already up is not.
  if (!await deps.request() && !await deps.installerRunning()) return 'failed';
  const started = deps.now();
  let seen = false;
  let gone = false;
  for (;;) {
    await deps.wait(INSTALL_POLL_MS);
    if (await deps.present()) return 'installed';
    if (await deps.installerRunning()) { seen = true; gone = false; }
    // One poll's grace: the installer exits before its last files land, and that is a finished install, not a dismissed one.
    else if (seen) { if (gone) return 'failed'; gone = true; }
    else if (deps.now() - started >= INSTALL_APPEAR_MS) return 'failed';
    if (deps.now() - started >= INSTALL_LIMIT_MS) return 'failed';
  }
}

export function installToolsDeps(): InstallToolsDeps {
  const run = (bin: string, args: string[]): Promise<boolean> =>
    runCli(bin, tmpdir(), args, { timeoutMs: 8_000 }).then((result) => result.ok, () => false);
  return {
    present: async () => {
      if (!await run('xcode-select', ['-p'])) return false;
      resetSelectedDeveloperTools();
      return await runGit(tmpdir(), ['--version'], { config: USER_GIT_CONFIG, timeoutMs: 8_000 }).then((result) => result.ok, () => false);
    },
    installerRunning: () => run('pgrep', ['-f', INSTALLER_PROCESS]),
    request: () => run('xcode-select', ['--install']),
    wait: (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
    now: () => Date.now(),
  };
}
