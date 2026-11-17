import { homedir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';

import { codexInstallRoot } from './paths.js';

const KEYS = ['STUDIO_CODEX_CACHE_ROOT', 'STUDIO_STATE_ROOT'] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>): void {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  for (const key of KEYS) {
    const before = saved[key];
    if (before === undefined) delete process.env[key];
    else process.env[key] = before;
  }
});

describe('where codex installs', () => {
  it('inside a scratch state root, never the machine cache', () => {
    setEnv({ STUDIO_STATE_ROOT: '/scratch/state' });
    expect(codexInstallRoot('1.0.0')).toBe('/scratch/state/codex-cache/codex-1.0.0');
  });

  it('at an explicit cache root even under a state root', () => {
    setEnv({ STUDIO_STATE_ROOT: '/scratch/state', STUDIO_CODEX_CACHE_ROOT: '/shared/cache' });
    expect(codexInstallRoot('1.0.0')).toBe('/shared/cache/codex-1.0.0');
  });

  it('in the machine cache when nothing redirects it', () => {
    setEnv({});
    expect(codexInstallRoot('1.0.0')).toBe(join(homedir(), 'Library', 'Caches', 'onlook-studio', 'codex-1.0.0'));
  });
});
