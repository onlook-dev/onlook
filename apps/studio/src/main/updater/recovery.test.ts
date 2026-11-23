import { describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUpdateRecovery } from './recovery.js';

describe('update authorization recovery on disk', () => {
  it('keeps the same installed version paused across relaunch and clears the saved pause after recovery', () => {
    const directory = mkdtempSync(join(tmpdir(), 'update-recovery-'));
    const root = () => directory;
    const first = createUpdateRecovery('1.2.3', root);
    expect(first.authorizationPaused).toBe(false);
    first.onAuthorizationPauseChange(true);
    expect(JSON.parse(readFileSync(join(directory, 'update-authorization-paused.json'), 'utf8')).data).toBe('1.2.3');
    const relaunched = createUpdateRecovery('1.2.3', root);
    expect(relaunched.authorizationPaused).toBe(true);
    relaunched.onAuthorizationPauseChange(false);
    expect(createUpdateRecovery('1.2.3', root).authorizationPaused).toBe(false);
  });

  it('lets a manually replaced version check automatically without inheriting an old pause', () => {
    const directory = mkdtempSync(join(tmpdir(), 'update-recovery-version-'));
    const root = () => directory;
    createUpdateRecovery('1.2.3', root).onAuthorizationPauseChange(true);
    expect(createUpdateRecovery('1.2.4', root).authorizationPaused).toBe(false);
    expect(createUpdateRecovery('1.2.3', root).authorizationPaused).toBe(true);
  });
});
