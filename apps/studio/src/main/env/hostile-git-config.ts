import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resetUserEnvForTests, userEnv } from './shell-env.js';

export function withHostileGlobalGitConfig(fn: () => Promise<void>): Promise<void> {
  return withGlobalGitConfig('[commit]\n\tgpgsign = true\n[user]\n\tsigningkey = nope\n', fn);
}

/** `git()` spawns in the memoised login-shell environment, captured from `process.env`: without the re-capture the child never sees the config. */
export async function withGlobalGitConfig(text: string, fn: () => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gitconfig-'));
  const config = join(dir, 'gitconfig');
  writeFileSync(config, text);
  const saved = process.env['GIT_CONFIG_GLOBAL'];
  process.env['GIT_CONFIG_GLOBAL'] = config;
  resetUserEnvForTests();
  await userEnv();
  try {
    await fn();
  } finally {
    if (saved === undefined) delete process.env['GIT_CONFIG_GLOBAL'];
    else process.env['GIT_CONFIG_GLOBAL'] = saved;
    resetUserEnvForTests();
    await userEnv();
  }
}
