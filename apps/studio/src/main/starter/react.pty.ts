// `*.pty.ts`: under `bun test` the child would run Vite under Bun.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { reactFiles } from './adapters/react.js';
import { freePort, get, getWithHost, nodeFork } from './pty-harness.js';
import { createStarterRunner, type StarterChildLike } from './runner.js';
import { writeScaffold } from './scaffold.js';

const OPT_IN = process.env['STUDIO_TEST_INSTALL'] === '1';
// Probed only when opted in: a default `test:pty` run must not execute the user's managers.
const MANAGER = OPT_IN
  ? (['bun', 'npm'] as const).find((name) => spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0)
  : undefined;
const SKIP =
  !OPT_IN ? 'set STUDIO_TEST_INSTALL=1 to run the install-backed react starter case'
  : MANAGER === undefined ? 'no bun or npm on PATH'
  : false;

const INSTALL_MS = 5 * 60_000;

const workDir = realpathSync.native(mkdtempSync(join(tmpdir(), 'starter-react-')));
const children: StarterChildLike[] = [];
after(() => {
  for (const child of children) child.kill();
  rmSync(workDir, { recursive: true, force: true });
});

describe('the react starter over a real install', { skip: SKIP }, () => {
  it('installs, answers the ready line through the runner, serves the page, refuses a foreign Host and a dotfile, and stops with the runner', { timeout: INSTALL_MS + 60_000 }, async () => {
    const dir = join(workDir, 'project');
    writeScaffold(dir, reactFiles({ name: MANAGER! }));
    writeFileSync(join(dir, '.env'), 'SECRET=1\n');
    const install = spawnSync(MANAGER!, ['install'], { cwd: dir, encoding: 'utf8', timeout: INSTALL_MS });
    assert.equal(install.status, 0, install.stderr);

    const runner = createStarterRunner({
      fork: nodeFork(children),
      env: async () => ({ ...process.env } as Record<string, string>),
      pickPort: () => freePort(),
      timing: { readyMs: 30_000, heartbeatMs: 100, heartbeatWindowMs: 600 },
      log: () => undefined,
    });
    const port = await runner.spawn(dir);
    const page = await get(port, '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /src="\/src\/main\.tsx"/);
    assert.equal((await getWithHost(port, '/', 'evil.example')).status, 403);
    assert.notEqual((await get(port, '/.env')).status, 200);

    const [entry] = children;
    runner.dispose();
    const started = Date.now();
    while (entry!.pid !== undefined && Date.now() - started < 5_000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(entry!.pid, undefined, 'the child outlived the disposed runner');
  });
});
