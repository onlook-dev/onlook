import { existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, gitOutput, makeGitRepo } from '@studio/fixtures';
import { withHostileGlobalGitConfig } from '../env/hostile-git-config.js';
import { git } from '../workspace/git.js';
import { RETIRE_COMMIT_MESSAGE, restoreRetiredStarterServerFile, systemAuthorArgs } from './retire.js';
import { STARTER_SERVER_FILE } from './scaffold.js';

afterAll(cleanupTempFixtures);

const content = 'export const ready = true;\n\n';

function retiredRepo(message = RETIRE_COMMIT_MESSAGE, author = 'Onlook'): string {
  const { path } = makeGitRepo({ name: 'server-recovery', remote: false });
  writeFileSync(join(path, STARTER_SERVER_FILE), content);
  gitOutput(path, ['add', STARTER_SERVER_FILE]);
  gitOutput(path, ['commit', '--quiet', '-m', 'Add site server']);
  gitOutput(path, ['rm', '--quiet', STARTER_SERVER_FILE]);
  gitOutput(path, [...systemAuthorArgs(), '-c', `user.name=${author}`, 'commit', '--quiet', '-m', message]);
  return path;
}

describe('restoreRetiredStarterServerFile', () => {
  it('recovers the exact retired file without changing history or unrelated staged work', async () => {
    const path = retiredRepo();
    const head = gitOutput(path, ['rev-parse', 'HEAD']);
    writeFileSync(join(path, 'notes.txt'), 'notes\n');
    gitOutput(path, ['add', 'notes.txt']);
    await restoreRetiredStarterServerFile(path);
    expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe(content);
    expect(gitOutput(path, ['rev-parse', 'HEAD'])).toBe(head);
    expect(gitOutput(path, ['diff', '--cached', '--name-only'])).toBe('notes.txt');
    await restoreRetiredStarterServerFile(path);
    expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe(content);
  });

  it('recognizes the earlier Studio author name', async () => {
    const path = retiredRepo(RETIRE_COMMIT_MESSAGE, 'Onlook Studio');
    await restoreRetiredStarterServerFile(path);
    expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe(content);
  });

  it('does not undo a user deletion or a different author using the same subject', async () => {
    for (const [message, author] of [['Remove unused server', 'Onlook'], [RETIRE_COMMIT_MESSAGE, 'Designer']]) {
      const path = retiredRepo(message, author);
      await restoreRetiredStarterServerFile(path);
      expect(existsSync(join(path, STARTER_SERVER_FILE))).toBe(false);
    }
  });

  it('leaves an existing replacement, including a dangling symlink, alone', async () => {
    for (const symlink of [false, true]) {
      const path = retiredRepo();
      if (symlink) symlinkSync('missing.mjs', join(path, STARTER_SERVER_FILE));
      else writeFileSync(join(path, STARTER_SERVER_FILE), 'replacement');
      await restoreRetiredStarterServerFile(path);
      if (symlink) expect(existsSync(join(path, 'missing.mjs'))).toBe(false);
      else expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe('replacement');
    }
  });

  it('does not restore an intentionally deleted later replacement or a staged deletion', async () => {
    for (const committed of [false, true]) {
      const path = retiredRepo();
      writeFileSync(join(path, STARTER_SERVER_FILE), 'replacement');
      gitOutput(path, ['add', STARTER_SERVER_FILE]);
      gitOutput(path, ['commit', '--quiet', '-m', 'Replace site server']);
      gitOutput(path, ['rm', '--quiet', STARTER_SERVER_FILE]);
      if (committed) gitOutput(path, ['commit', '--quiet', '-m', 'Remove replacement']);
      await restoreRetiredStarterServerFile(path);
      expect(existsSync(join(path, STARTER_SERVER_FILE))).toBe(false);
    }
  });

  it('recovers without making a commit under a global signing requirement', async () => {
    const path = retiredRepo();
    await withHostileGlobalGitConfig(() => restoreRetiredStarterServerFile(path));
    expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe(content);
  });

  it('never overwrites a replacement created while history is being read', async () => {
    const path = retiredRepo();
    await restoreRetiredStarterServerFile(path, { run: async (cwd, args) => {
      const result = await git(cwd, args);
      if (args.includes('restore')) writeFileSync(join(path, STARTER_SERVER_FILE), 'new replacement');
      return result;
    } });
    expect(readFileSync(join(path, STARTER_SERVER_FILE), 'utf8')).toBe('new replacement');
  });

  it('abandons recovery when history changes while the file is being recovered', async () => {
    const path = retiredRepo();
    await restoreRetiredStarterServerFile(path, { run: async (cwd, args) => {
      const result = await git(cwd, args);
      if (args.includes('restore')) {
        writeFileSync(join(path, STARTER_SERVER_FILE), 'new replacement');
        gitOutput(path, ['add', STARTER_SERVER_FILE]);
        gitOutput(path, ['commit', '--quiet', '-m', 'Replace site server']);
        gitOutput(path, ['rm', '--quiet', STARTER_SERVER_FILE]);
        gitOutput(path, ['commit', '--quiet', '-m', 'Remove site server']);
      }
      return result;
    } });
    expect(existsSync(join(path, STARTER_SERVER_FILE))).toBe(false);
  });

  it('cannot write project files after the setup run is canceled', async () => {
    const path = retiredRepo();
    const controller = new AbortController();
    await restoreRetiredStarterServerFile(path, { signal: controller.signal, run: async (cwd, args) => {
      const result = await git(cwd, args);
      if (args.includes('restore')) controller.abort();
      return result;
    } });
    expect(existsSync(join(path, STARTER_SERVER_FILE))).toBe(false);
  });
});
