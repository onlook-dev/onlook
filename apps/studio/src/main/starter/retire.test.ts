import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, gitOutput, makeGitRepo } from '@studio/fixtures';
import { withHostileGlobalGitConfig } from '../env/hostile-git-config.js';
import { RETIRE_COMMIT_MESSAGE, STUDIO_SYSTEM_AUTHOR, removeStarterServerFile } from './retire.js';
import { STATIC_FILES } from './adapters/static.js';
import { STARTER_SERVER_FILE, writeScaffold } from './scaffold.js';

afterAll(() => {
  cleanupTempFixtures();
});


function scaffoldedRepo(name: string): string {
  const repo = makeGitRepo({ name, remote: false });
  writeScaffold(repo.path, STATIC_FILES);
  gitOutput(repo.path, ['add', '-A']);
  gitOutput(repo.path, ['commit', '--quiet', '-m', 'scaffold']);
  return repo.path;
}

function expectRetired(path: string, before: string): void {
  expect(gitOutput(path, ['ls-files', STARTER_SERVER_FILE])).toBe('');
  expect(gitOutput(path, ['status', '--porcelain'])).toBe('');
  expect(gitOutput(path, ['rev-parse', 'HEAD'])).not.toBe(before);
  expect(gitOutput(path, ['log', '-1', '--format=%s|%an|%ae|%cn'])).toBe(
    `${RETIRE_COMMIT_MESSAGE}|${STUDIO_SYSTEM_AUTHOR.name}|${STUDIO_SYSTEM_AUTHOR.email}|${STUDIO_SYSTEM_AUTHOR.name}`,
  );
}

describe('removeStarterServerFile', () => {
  it('commits under a global config that demands a signature git cannot produce', async () => {
    const path = scaffoldedRepo('retire-gpgsign');
    const before = gitOutput(path, ['rev-parse', 'HEAD']);
    await withHostileGlobalGitConfig(async () => {
      writeFileSync(join(path, 'probe.txt'), 'probe\n');
      gitOutput(path, ['add', 'probe.txt']);
      expect(() => gitOutput(path, ['commit', '--quiet', '-m', 'probe'])).toThrow();
      gitOutput(path, ['reset', '--quiet', '--hard', 'HEAD']);

      await removeStarterServerFile(path);
    });
    expectRetired(path, before);
  });

  it('security retires the starter without executing repository commit hooks', async () => {
    const path = scaffoldedRepo('retire-hook-refuses');
    const before = gitOutput(path, ['rev-parse', 'HEAD']);
    const hook = join(path, '.git', 'hooks', 'pre-commit');
    const marker = join(path, 'hook-executed');
    writeFileSync(hook, `#!/bin/sh\ntouch '${marker}'\nexit 1\n`);
    chmodSync(hook, 0o755);

    await removeStarterServerFile(path);
    expect(existsSync(marker)).toBe(false);
    expectRetired(path, before);
  });

  it('retires a server.mjs the agent has edited since the scaffold commit', async () => {
    const path = scaffoldedRepo('retire-edited');
    const before = gitOutput(path, ['rev-parse', 'HEAD']);
    writeFileSync(join(path, STARTER_SERVER_FILE), '// edited by the agent\n');

    await removeStarterServerFile(path);

    expectRetired(path, before);
    expect(gitOutput(path, ['ls-files', 'index.html'])).toBe('index.html');

    const retired = gitOutput(path, ['rev-parse', 'HEAD']);
    await removeStarterServerFile(path);
    expect(gitOutput(path, ['rev-parse', 'HEAD'])).toBe(retired);
  });
});
