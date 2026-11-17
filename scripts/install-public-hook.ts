import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function installPublicHook(cwd: string): void {
  const git = (args: string[]) => spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10_000 });
  const configured = git(['config', '--get', 'core.hooksPath']);
  if (configured.status !== 0 && configured.status !== 1) throw new Error('Could not read the Git hook configuration.');
  if (configured.status === 0 && configured.stdout.trim() !== '.githooks') throw new Error('Another hooksPath is configured. Add the public checks to that hook instead.');
  const hook = git(['rev-parse', '--git-path', 'hooks/pre-push']);
  if (hook.status !== 0) throw new Error('Run the hook installer inside this repository.');
  if (git(['ls-files', '--error-unmatch', '.githooks/pre-push']).status !== 0) throw new Error('Run the installer from the repository root with the tracked public hook present.');
  if (configured.status !== 0 && existsSync(resolve(cwd, hook.stdout.trim()))) throw new Error('A pre-push hook already exists. Add the public checks to that hook instead.');
  if (configured.status !== 0) {
    const hooks = git(['rev-parse', '--git-path', 'hooks']);
    if (hooks.status !== 0) throw new Error('Could not read the Git hooks directory.');
    const directory = resolve(cwd, hooks.stdout.trim());
    if (existsSync(directory) && readdirSync(directory).some((name) => {
      if (name.endsWith('.sample')) return false;
      const file = statSync(resolve(directory, name));
      return file.isFile() && (file.mode & 0o111) !== 0;
    })) throw new Error('Existing Git hooks would be disabled. Add the public checks to your existing hook setup instead.');
  }
  const result = git(['config', '--local', 'core.hooksPath', '.githooks']);
  if (result.status !== 0) throw new Error('Could not install the public-readiness hook.');
}

if (import.meta.main) {
  try {
    installPublicHook(process.cwd());
    process.stdout.write('Public-readiness hook installed for this clone and its worktrees.\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Could not install the public-readiness hook.'}\n`);
    process.exitCode = 1;
  }
}
