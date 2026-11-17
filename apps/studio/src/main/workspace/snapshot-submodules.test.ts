import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, gitOutput, makeGitRepo } from '@studio/fixtures';
import { captureDiskSnapshot } from './git.js';

afterAll(() => cleanupTempFixtures());

describe('copy snapshots with nested Git repositories', () => {
  it('refuses a submodule rather than silently dropping its uncommitted files', async () => {
    const parent = makeGitRepo({ name: 'snapshot-submodule-parent', seedFile: 'app.ts', seedContent: 'parent\n' });
    const child = makeGitRepo({ name: 'snapshot-submodule-child', seedFile: 'nested.ts', seedContent: 'committed\n' });
    gitOutput(parent.path, ['-c', 'protocol.file.allow=always', 'submodule', 'add', child.path, 'nested']);
    gitOutput(parent.path, ['commit', '--quiet', '-am', 'nested fixture']);
    writeFileSync(join(parent.path, 'nested', 'nested.ts'), 'uncommitted nested work\n');
    writeFileSync(join(parent.path, 'nested', 'new.ts'), 'untracked nested work\n');
    const index = gitOutput(parent.path, ['rev-parse', '--git-path', 'index']);
    const before = readFileSync(join(parent.path, index));
    const head = gitOutput(parent.path, ['rev-parse', 'HEAD']);

    await expect(captureDiskSnapshot(parent.path)).rejects.toThrow('Git submodules');

    expect(readFileSync(join(parent.path, index))).toEqual(before);
    expect(gitOutput(parent.path, ['rev-parse', 'HEAD'])).toBe(head);
    expect(readFileSync(join(parent.path, 'nested', 'nested.ts'), 'utf8')).toBe('uncommitted nested work\n');
    expect(readFileSync(join(parent.path, 'nested', 'new.ts'), 'utf8')).toBe('untracked nested work\n');
  });
});
