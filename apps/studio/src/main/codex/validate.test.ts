import { afterAll, describe, expect, it } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CODEX_API_KEY_PLAN } from '@studio/events';

import {
  accountVerdict,
  codexVersionFrom,
  compareCodexVersions,
  meetsCodexFloor,
  validateCodex,
} from './validate.js';
import { CODEX_VERSION } from './paths.js';

const validationRoot = mkdtempSync(join(tmpdir(), 'codex-validation-'));
afterAll(() => rmSync(validationRoot, { recursive: true, force: true }));

async function validateFixture(name: string, body: string, home: string) {
  const root = join(validationRoot, name);
  mkdirSync(root);
  for (const executable of ['codex', 'codex-code-mode-host']) {
    const binary = join(root, executable);
    writeFileSync(binary, `#!/usr/bin/env node\n${body}`);
    chmodSync(binary, 0o755);
  }
  return validateCodex({ root, codexHome: home });
}

describe('startup failures', () => {
  it('creates a missing CODEX_HOME before starting the cached agent', async () => {
    const home = join(validationRoot, 'missing', 'home');
    const result = await validateFixture('healthy', `
if (!require('node:fs').existsSync(process.env.CODEX_HOME)) process.exit(1);
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  if (!request.id) return;
  const result = request.method === 'initialize'
    ? { userAgent: 'onlook-studio/${CODEX_VERSION}' }
    : { account: null };
  process.stdout.write(JSON.stringify({ id: request.id, result }) + '\\n');
});`, home);
    expect(result.outcome).toBe('signed-out');
    expect(existsSync(home)).toBe(true);
  });

  it('names an unusable CODEX_HOME without calling the download broken', async () => {
    const home = join(validationRoot, 'not-a-directory');
    writeFileSync(home, 'file');
    const result = await validateFixture('bad-home', 'process.exit(1);', home);
    expect(result).toMatchObject({ outcome: 'failed', failure: 'home' });
  });

  it('does not diagnose an unresponsive app-server as a broken download', async () => {
    const result = await validateFixture('startup-error', 'process.stderr.write("invalid configuration"); process.exit(1);', validationRoot);
    expect(result).toMatchObject({ outcome: 'failed', failure: 'unresponsive' });
    expect(result.message).toContain('invalid configuration');
  });
});

/** Measured off a real handshake at the pinned version. */
const REAL_USER_AGENT =
  'onlook-studio/0.147.0 (Mac OS 26.4.1; arm64) ghostty/1.3.2-HEAD-_6143bac (onlook-studio; 0.0.0-spike)';

describe('codexVersionFrom', () => {
  it('reads the token after OUR client name, not the first version in the string', () => {
    expect(codexVersionFrom(REAL_USER_AGENT)).toBe('0.147.0');
  });

  it('yields nothing when the leading name is not the one we sent', () => {
    const foreign = REAL_USER_AGENT.replace('onlook-studio/0.147.0', 'some-other-client/9.9.9');
    expect(codexVersionFrom(foreign)).toBeUndefined();
    expect(codexVersionFrom('Mac OS 26.4.1; arm64')).toBeUndefined();
    expect(codexVersionFrom('')).toBeUndefined();
  });
});

describe('the version floor', () => {
  it('accepts the floor and anything above it', () => {
    expect(meetsCodexFloor('0.147.0', '0.147.0')).toBe(true);
    expect(meetsCodexFloor('0.148.0', '0.147.0')).toBe(true);
    expect(meetsCodexFloor('1.0.0', '0.147.0')).toBe(true);
  });

  it('refuses anything below it, prereleases included', () => {
    expect(meetsCodexFloor('0.146.9', '0.147.0')).toBe(false);
    expect(meetsCodexFloor('0.99.0', '0.147.0')).toBe(false);
    expect(meetsCodexFloor('0.147.0-alpha.4', '0.147.0')).toBe(false);
    expect(compareCodexVersions('0.147.0-alpha.4', '0.147.0')).toBe(-1);
  });
});

describe('accountVerdict', () => {
  it('reads a null account as unusable', () => {
    expect(accountVerdict({ account: null, requiresOpenaiAuth: true }).usable).toBe(false);
    expect(accountVerdict({ requiresOpenaiAuth: true }).usable).toBe(false);
  });

  it('accepts the ChatGPT subscription', () => {
    expect(accountVerdict({ account: { type: 'chatgpt', planType: 'plus' } }).usable).toBe(true);
  });

  it('ONL-2186: hands the usable account\'s email and plan through, and nothing for a null email', () => {
    const named = accountVerdict({ account: { type: 'chatgpt', planType: 'plus', email: 'a@b.c' } });
    expect(named.email).toBe('a@b.c');
    expect(named.plan).toBe('plus');
    const bare = accountVerdict({ account: { type: 'chatgpt', email: null } });
    expect(Object.hasOwn(bare, 'email')).toBe(false);
    expect(Object.hasOwn(bare, 'plan')).toBe(false);
    expect(Object.hasOwn(accountVerdict({ account: { type: 'apiKey', email: 'a@b.c' } }), 'email')).toBe(false);
  });

  it('accepts a stored API-key account and marks it as having no tier', () => {
    const apiKey = accountVerdict({ account: { type: 'apiKey' } });
    expect(apiKey.usable).toBe(true);
    expect(apiKey.plan).toBe(CODEX_API_KEY_PLAN);
  });

  it('refuses an account type it has never heard of, and says which it found', () => {
    const bedrock = accountVerdict({ account: { type: 'amazonBedrock' } });
    expect(bedrock.usable).toBe(false);
    expect(bedrock.description).toContain('amazonBedrock');
  });
});
