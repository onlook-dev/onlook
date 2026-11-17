import type { GithubCredential } from './backend.js';
import { withGitCredential } from './git.js';

export function headBranches(output: string): string[] {
  return output.split('\n').flatMap((line) => {
    const match = /^[a-f0-9]+\s+refs\/heads\/(.+)$/.exec(line.trim());
    return match?.[1] === undefined ? [] : [match[1]];
  });
}

/** @parked ONL-3182 — the picker offers no branch control today; cloning a branch other than the default needs this list. */
export async function listRemoteBranches(credential: Extract<GithubCredential, { status: 'ready' }>): Promise<string[]> {
  return withGitCredential(credential, async (run) => {
    const result = await run(['ls-remote', '--heads', '--', credential.remoteUrl], { timeoutMs: 25_000 });
    if (!result.ok) throw new Error('Branch listing failed');
    return headBranches(result.out);
  });
}
