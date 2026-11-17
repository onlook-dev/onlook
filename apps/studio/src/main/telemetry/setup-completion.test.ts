import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { hasCompletedAgentSetup, markAgentSetupCompleted, resetSetupCompletionCacheForTesting } from './setup-completion.js';

const originalRoot = process.env['STUDIO_STATE_ROOT'];
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-setup-completion-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  resetSetupCompletionCacheForTesting();
});

afterEach(() => {
  resetSetupCompletionCacheForTesting();
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
  rmSync(root, { recursive: true, force: true });
});

describe('setup completion per install', () => {
  it('persists verified providers independently across launches', () => {
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    markAgentSetupCompleted('claude');
    resetSetupCompletionCacheForTesting();
    expect(hasCompletedAgentSetup('claude')).toBe(true);
    expect(hasCompletedAgentSetup('codex')).toBe(false);
    markAgentSetupCompleted('codex');
    resetSetupCompletionCacheForTesting();
    expect(hasCompletedAgentSetup('claude')).toBe(true);
    expect(hasCompletedAgentSetup('codex')).toBe(true);
  });

  it('preserves future metadata and deduplicates only in memory', () => {
    const path = join(root, 'setup-completed-providers.json');
    const bytes = '{"version":99,"data":["claude"]}\n';
    writeFileSync(path, bytes);
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    markAgentSetupCompleted('claude');
    expect(hasCompletedAgentSetup('claude')).toBe(true);
    resetSetupCompletionCacheForTesting();
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('a corrupt marker does not block verification or a replacement marker', () => {
    const path = join(root, 'setup-completed-providers.json');
    writeFileSync(path, 'not json');
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    expect(() => markAgentSetupCompleted('claude')).not.toThrow();
    resetSetupCompletionCacheForTesting();
    expect(hasCompletedAgentSetup('claude')).toBe(true);
  });

  it('an unwritable marker deduplicates this process without breaking setup', () => {
    process.env['STUDIO_STATE_ROOT'] = join(root, 'not-a-directory');
    writeFileSync(process.env['STUDIO_STATE_ROOT'], 'fixture');
    expect(() => markAgentSetupCompleted('claude')).not.toThrow();
    expect(hasCompletedAgentSetup('claude')).toBe(true);
  });

  it('separate installs do not share a cached marker', () => {
    markAgentSetupCompleted('claude');
    process.env['STUDIO_STATE_ROOT'] = join(root, 'other-install');
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    markAgentSetupCompleted('codex');
    process.env['STUDIO_STATE_ROOT'] = root;
    expect(hasCompletedAgentSetup('claude')).toBe(true);
    expect(hasCompletedAgentSetup('codex')).toBe(false);
  });
});
