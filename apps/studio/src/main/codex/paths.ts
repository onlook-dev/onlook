import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { hostPlatform, isMac, isWindows, windowsLocalAppData } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';

/** Also pins the committed protocol snapshot; the app-server has no version negotiation, so a bump is `bun run codex:drift` plus a read. */
export const CODEX_VERSION = '0.171.0';

/** A version suffix of `@openai/codex`, not a separate package name. */
export function codexPlatformTag(
  platform: NodeJS.Platform = hostPlatform(),
  arch: string = process.arch,
): string | undefined {
  if (isWindows(platform) && arch === 'x64') return 'win32-x64';
  if (!isMac(platform)) return undefined;
  if (arch === 'arm64') return 'darwin-arm64';
  if (arch === 'x64') return 'darwin-x64';
  return undefined;
}

/** Outside the workspace root: a beta reset wipes projects and would re-download 111MB. `app.getPath('cache')` throws. */
export function machineCodexCacheRoot(): string {
  if (isWindows()) return join(windowsLocalAppData() ?? join(homedir(), 'AppData', 'Local'), 'onlook-studio', 'Cache');
  return join(homedir(), 'Library', 'Caches', 'onlook-studio');
}

/** A scratch `STUDIO_STATE_ROOT` holds its own codex, so a driven app never reads or writes the operator's (ONL-2116). */
export function codexCacheRoot(): string {
  const override = devSwitches.codexCacheRoot;
  if (override) return override;
  const stateRoot = devSwitches.stateRoot;
  if (stateRoot) return join(resolve(stateRoot), 'codex-cache');
  return machineCodexCacheRoot();
}

export function codexInstallRoot(
  version: string = CODEX_VERSION,
  cacheRoot: string = codexCacheRoot(),
): string {
  return join(cacheRoot, `codex-${version}`);
}
