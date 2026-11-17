import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { claudeBinaryPath, claudeExecutablePath, resolvePlatformBinary } from './cli-path.js';

describe('cli-path', () => {
  it('claudeBinaryPath is an executable on disk in an unpackaged build', () => {
    const path = claudeBinaryPath();
    expect(path).toBeDefined();
    expect(path).toMatch(/claude-agent-sdk-[a-z0-9]+-[a-z0-9]+[\\/]claude(\.exe)?$/);
    expect(() => accessSync(path!, constants.X_OK)).not.toThrow();
  });

  // Rooted at `apps/studio`: from this file the direct lookup hits and the fallback goes untested (ONL-2186).
  it('resolves through the SDK entry where the direct lookup misses, as the bundle does', () => {
    const fromApp = createRequire(join(import.meta.dir, '../../../package.json'));
    expect(() => fromApp.resolve('@anthropic-ai/claude-agent-sdk-darwin-arm64/claude')).toThrow();
    const path = resolvePlatformBinary(fromApp);
    expect(path).toBeDefined();
    expect(() => accessSync(path!, constants.X_OK)).not.toThrow();
  });

  it('claudeExecutablePath keeps its packaged-only contract: undefined outside app.asar', () => {
    expect(claudeExecutablePath()).toBeUndefined();
  });
});
