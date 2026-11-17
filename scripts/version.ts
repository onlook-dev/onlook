import { spawnSync } from 'node:child_process';
import type { ReleaseChannel } from './release-channel.js';

// A stamped build is public, so it is outside the reset gate (`src/main/reset/index.ts`), which takes `-alpha.N` (ONL-2796).
const PRERELEASE_TAG = 'beta';

export function stamp(base: string, count: number, channel: ReleaseChannel = PRERELEASE_TAG): string {
  if (!/^\d+\.\d+\.\d+$/.test(base)) {
    throw new Error(
      `version base must be a bare MAJOR.MINOR.PATCH — received "${base}". ` +
        'The prerelease half is this function\'s to add.',
    );
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`commit count must be a positive integer — received ${count}`);
  }
  return channel === 'latest' ? base : `${base}-${channel}.${count}`;
}

function git(args: string[], cwd: string): string {
  const result = spawnSync('git', args, { encoding: 'utf8', cwd });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr ?? '').trim()}`);
  }
  return (result.stdout ?? '').trim();
}

// A shallow clone answers 1, stamping every build -beta.1, a permanent downgrade; CI sets fetch-depth: 0.
export function commitCount(cwd: string): number {
  return Number.parseInt(git(['rev-list', '--count', 'HEAD'], cwd), 10);
}

export function shortSha(cwd: string): string {
  return git(['rev-parse', '--short', 'HEAD'], cwd);
}

export function fullSha(cwd: string): string {
  return git(['rev-parse', 'HEAD'], cwd);
}
