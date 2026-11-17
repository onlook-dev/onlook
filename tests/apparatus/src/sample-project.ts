import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { promisify } from 'node:util';

export interface SampleProject {
  name: string;
  url: string;
  commit: string;
}

const run = promisify(execFile);

/** No global or system git config, so none of the machine's credentials or URL rewrites reach the fetch. */
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' };

async function git(cwd: string, args: string[]): Promise<void> {
  await run('git', ['-c', 'credential.helper=', ...args], { cwd, env: GIT_ENV, timeout: 900_000, maxBuffer: 16 * 1024 * 1024 });
}

export async function cloneSampleProject(sample: SampleProject, into: string): Promise<string> {
  mkdirSync(into, { recursive: true });
  await git(into, ['init', '--quiet', '--initial-branch=main']);
  await git(into, ['remote', 'add', 'origin', sample.url]);
  await git(into, ['fetch', '--quiet', '--no-tags', 'origin', sample.commit]);
  await git(into, ['update-ref', 'refs/remotes/origin/main', sample.commit]);
  await git(into, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  await git(into, ['checkout', '--quiet', '-B', 'main', '--track', 'origin/main']);
  return into;
}
