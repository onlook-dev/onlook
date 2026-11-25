import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { git } from '../workspace/git.js';
import { STARTER_SERVER_FILE } from './scaffold.js';
import { projectHasNoHistory } from '../workspace/store.js';

export const STUDIO_SYSTEM_AUTHOR = {
  name: 'Onlook',
  email: 'studio@noreply.onlook.com',
} as const;

export const RETIRE_COMMIT_MESSAGE = 'chore: retire the starter page server';

export function systemAuthorArgs(): string[] {
  return [
    '-c',
    `user.name=${STUDIO_SYSTEM_AUTHOR.name}`,
    '-c',
    `user.email=${STUDIO_SYSTEM_AUTHOR.email}`,
    '-c',
    // The user's global `commit.gpgsign` would reach for their key on a commit that is not theirs (ONL-2152).
    'commit.gpgsign=false',
  ];
}

export async function removeStarterServerFile(worktree: string): Promise<void> {
  if (!existsSync(join(worktree, STARTER_SERVER_FILE))) return;
  if (projectHasNoHistory(worktree)) {
    unlinkSync(join(worktree, STARTER_SERVER_FILE));
    return;
  }
  // `-f`: the agent may have edited the file since the scaffold commit (ONL-2152).
  const rm = await git(worktree, ['rm', '--quiet', '-f', STARTER_SERVER_FILE]);
  if (!rm.ok) throw new Error(`git rm ${STARTER_SERVER_FILE} failed: ${rm.err}`);
  const commit = await git(worktree, [
    ...systemAuthorArgs(),
    'commit',
    '--quiet',
    '--only',
    STARTER_SERVER_FILE,
    '-m',
    RETIRE_COMMIT_MESSAGE,
  ]);
  if (commit.ok) return;
  const restored = await git(worktree, ['checkout', '--quiet', 'HEAD', '--', STARTER_SERVER_FILE]);
  throw new Error(
    restored.ok
      ? `retire commit failed, ${STARTER_SERVER_FILE} restored: ${commit.err}`
      : `retire commit failed AND ${STARTER_SERVER_FILE} could not be restored (deletion left staged): ${commit.err}; ${restored.err}`,
  );
}
