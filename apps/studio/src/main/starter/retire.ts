import { constants, copyFileSync, lstatSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

export async function restoreRetiredStarterServerFile(worktree: string, options: { run?: typeof git; signal?: AbortSignal } = {}): Promise<void> {
  const run = options.run ?? git;
  if (options.signal?.aborted) return;
  if (projectHasNoHistory(worktree)) return;
  if (lstatSync(join(worktree, STARTER_SERVER_FILE), { throwIfNoEntry: false }) !== undefined) return;
  const head = await run(worktree, ['rev-parse', 'HEAD']);
  if (!head.ok || options.signal?.aborted) return;
  const latest = await run(worktree, ['log', '-1', '--format=%H%x00%s%x00%an%x00%ae', head.out, '--', STARTER_SERVER_FILE]);
  if (!latest.ok) return;
  const [commit, subject, author, email] = latest.out.split('\0');
  if (!commit || subject !== RETIRE_COMMIT_MESSAGE || email !== STUDIO_SYSTEM_AUTHOR.email || (author !== STUDIO_SYSTEM_AUTHOR.name && author !== 'Onlook Studio')) return;
  const recovered = await run(worktree, ['rev-parse', '--path-format=absolute', '--git-path', `onlook-starter-restored-${commit}`]);
  if (!recovered.ok || lstatSync(recovered.out, { throwIfNoEntry: false }) !== undefined) return;
  const deleted = await run(worktree, ['diff-tree', '--no-commit-id', '--name-status', '-r', commit, '--', STARTER_SERVER_FILE]);
  if (!deleted.ok || deleted.out !== `D\t${STARTER_SERVER_FILE}`) return;
  const original = await run(worktree, ['ls-tree', `${commit}^`, '--', STARTER_SERVER_FILE]);
  if (!original.ok || !/^100(?:644|755) blob /.test(original.out)) return;
  const status = await run(worktree, ['status', '--porcelain', '--', STARTER_SERVER_FILE]);
  if (!status.ok || status.out !== '') return;
  const directory = mkdtempSync(join(tmpdir(), 'onlook-server-recovery-'));
  try {
    const output = join(directory, STARTER_SERVER_FILE);
    const restored = await run(worktree, [`--work-tree=${directory}`, 'restore', `--source=${commit}^`, '--worktree', '--', STARTER_SERVER_FILE]);
    if (!restored.ok) throw new Error(restored.err);
    const currentStatus = await run(worktree, ['status', '--porcelain', '--', STARTER_SERVER_FILE]);
    const currentHead = await run(worktree, ['rev-parse', 'HEAD']);
    if (!currentStatus.ok || currentStatus.out !== '' || !currentHead.ok || currentHead.out !== head.out || options.signal?.aborted) return;
    try {
      writeFileSync(recovered.out, '', { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return;
      throw error;
    }
    try {
      copyFileSync(output, join(worktree, STARTER_SERVER_FILE), constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        rmSync(recovered.out);
        throw error;
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
