import { afterAll, describe, expect, it } from 'bun:test';
import { chmodSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import manifest from '../package.json';

afterAll(() => cleanupTempFixtures());

const node = spawnSync('node', ['-p', 'process.execPath'], { encoding: 'utf8' }).stdout.trim();

function runScript(script: 'test:pty' | 'verify', version: string) {
  const root = makeDirWithFiles({ files: {
    'package.json': JSON.stringify({ type: 'module', scripts: manifest.scripts }),
    'runtime.cjs': `Object.defineProperty(process, 'version', { value: ${JSON.stringify(version)} });`,
    'scripts/check-node.mjs': readFileSync(new URL('./check-node.mjs', import.meta.url), 'utf8'),
    'calls': '',
    'git-config': '',
  } });
  const shimRoot = makeDirWithFiles({ files: {
    'node': `#!/bin/sh\nprintf '%s\\n' "node $*" >> ${JSON.stringify(join(root, 'calls'))}\nif [ "$1" = scripts/check-node.mjs ]; then\n  exec ${JSON.stringify(node)} --require ${JSON.stringify(join(root, 'runtime.cjs'))} "$@"\nfi\nprintf '%s' "$GIT_CONFIG_GLOBAL" > ${JSON.stringify(join(root, 'git-config'))}\nexit 17\n`,
    'bun': `#!/bin/sh\nprintf '%s\\n' "bun $*" >> ${JSON.stringify(join(root, 'calls'))}\nexit 23\n`,
  } });
  for (const executable of ['node', 'bun']) chmodSync(join(shimRoot, executable), 0o755);
  const result = spawnSync(process.execPath, ['run', script], {
    cwd: root,
    env: { ...process.env, PATH: `${shimRoot}:${process.env['PATH']}` },
    encoding: 'utf8',
  });
  return {
    ...result,
    calls: readFileSync(join(root, 'calls'), 'utf8').trim().split('\n'),
    gitConfig: readFileSync(join(root, 'git-config'), 'utf8'),
  };
}

describe('the Node version preflight', () => {
  it('pins local Node selection to the Node major CI runs', () => {
    const pinned = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
    const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
    const versions = [...workflow.matchAll(/node-version:\s*(\d+)/g)].map((match) => match[1]);
    expect(versions.length).toBeGreaterThan(0);
    expect([...new Set(versions)]).toEqual([pinned]);
    expect(pinned).toBe('24');
  });

  for (const script of ['test:pty', 'verify'] as const) {
    it.each(['v20.18.0', 'v22.20.0', 'v23.11.0'])(`${script} rejects %s before running any checks or tests`, (version) => {
      const result = runScript(script, version);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Node.js 24 or later is required. Found ${version}.`);
      expect(result.stderr).toContain('Install Node.js 24 and make sure node on PATH uses it.');
      expect(result.stderr).not.toContain('Could not find');
      expect(result.calls).toEqual(['node scripts/check-node.mjs']);
    });
  }

  it.each(['v24.0.0', 'v24.13.0', 'v26.0.0'])('test:pty forwards the unchanged Node test command on %s', (version) => {
    const result = runScript('test:pty', version);
    expect(result.status).toBe(17);
    expect(result.calls).toEqual([
      'node scripts/check-node.mjs',
      'node --import ./tests/apparatus/node-test-preload.ts --test --test-timeout=30000 apps/studio/src/main/**/*.pty.ts',
    ]);
    expect(result.stderr).not.toContain('is required');
    expect(result.gitConfig).toBe('/dev/null');
  });

  it('verify starts its existing check chain after the Node 24 preflight', () => {
    const result = runScript('verify', 'v24.0.0');
    expect(result.status).toBe(23);
    expect(result.calls).toEqual(['node scripts/check-node.mjs', 'bun run check:secrets']);
    expect(result.stderr).not.toContain('is required');
  });
});
