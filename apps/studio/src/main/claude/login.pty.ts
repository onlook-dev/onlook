
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { type ClaudeShim, type ClaudeShimOptions, readClaudeShimState, writeClaudeShim } from '@studio/fixtures';
import type { Env as ChildEnv } from '../env/shell-env.js';
import { startClaudeLogin, type ClaudeLoginHandle } from './login.js';
import { claudeAuthStatus } from './status.js';

const workDir = mkdtempSync(join(tmpdir(), 'claude-login-shim-'));
after(() => {
  rmSync(workDir, { recursive: true, force: true });
});

const DEADLINE_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function until(what: string, check: () => boolean, ms = DEADLINE_MS): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (check()) return;
    await sleep(20);
  }
  assert.fail(`timed out waiting for ${what}`);
}

let shimCount = 0;
function shim(opts?: ClaudeShimOptions): ClaudeShim {
  shimCount += 1;
  return writeClaudeShim(join(workDir, `root-${shimCount}`), opts);
}

function childEnv(target: ClaudeShim): ChildEnv {
  const env: ChildEnv = {};
  for (const [key, value] of Object.entries({ ...process.env, ...target.env })) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}

describe('startClaudeLogin against the shim', () => {
  const start = (target: ClaudeShim): Promise<ClaudeLoginHandle> =>
    startClaudeLogin({ bin: target.bin, env: childEnv(target) });

  it('paste-invalid: the first code is rejected and the handle stays open for the second', async () => {
    const target = shim({ login: 'paste-invalid' });
    const handle = await start(target);
    let rejected = 0;
    handle.onRejected(() => { rejected += 1; });
    assert.equal(handle.submitCode('bad'), true);
    await until('the rejection', () => rejected === 1);
    assert.equal(readClaudeShimState(target.statePath).state, 'signed-out');
    assert.equal(handle.submitCode('good'), true);
    assert.equal(await handle.completed, 'exited');
    assert.equal(rejected, 1);
    assert.equal(readClaudeShimState(target.statePath).state, 'signed-in');
  });

  it('cancel kills the waiting child and completes as cancelled', async () => {
    const handle = await start(shim({ login: 'paste-accept' }));
    handle.cancel();
    assert.equal(await handle.completed, 'cancelled');
    await until('the child to exit', () => handle.exitCode() !== null);
  });
});

describe('the status runner against the shim', () => {
  const verdict = async (target: ClaudeShim): Promise<string> =>
    JSON.stringify(await claudeAuthStatus({ bin: target.bin, env: childEnv(target) }));

  it('reads signed-in, signed-out and failed from the three exits', async () => {
    assert.match(await verdict(shim({ state: 'signed-in', email: 'wren@example.com', plan: 'pro' })), /signed-in/);
    assert.match(await verdict(shim({ state: 'signed-out' })), /signed-out/);
    assert.match(await verdict(shim({ state: 'failed' })), /failed/);
  });
});
