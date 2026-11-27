import { describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUpdateRecovery } from './recovery.js';

describe('update authorization recovery on disk', () => {
  it('restores a far-future refused release without changing its version', () => {
    const directory = mkdtempSync(join(tmpdir(), 'update-recovery-future-'));
    const root = () => directory;
    createUpdateRecovery('1.2.2', root).onRefusedVersionChange('9999.0.0');
    expect(createUpdateRecovery('1.2.2', root).refusedVersion).toBe('9999.0.0');
  });
  it('keeps the refused release paused across relaunch and clears the saved pause after recovery', () => {
    const directory = mkdtempSync(join(tmpdir(), 'update-recovery-'));
    const root = () => directory;
    const first = createUpdateRecovery('1.2.3', root);
    expect(first.refusedVersion).toBeNull();
    first.onRefusedVersionChange('1.2.4');
    expect(JSON.parse(readFileSync(join(directory, 'update-authorization-paused.json'), 'utf8')).data).toBe('1.2.4');
    const relaunched = createUpdateRecovery('1.2.3', root);
    expect(relaunched.refusedVersion).toBe('1.2.4');
    relaunched.onRefusedVersionChange(null);
    expect(createUpdateRecovery('1.2.3', root).refusedVersion).toBeNull();
  });

  it('lets a manually replaced version check automatically without inheriting an old pause', () => {
    const directory = mkdtempSync(join(tmpdir(), 'update-recovery-version-'));
    const root = () => directory;
    createUpdateRecovery('1.2.3', root).onRefusedVersionChange('1.2.4');
    expect(createUpdateRecovery('1.2.4', root).refusedVersion).toBeNull();
    expect(createUpdateRecovery('1.2.5', root).refusedVersion).toBeNull();
    expect(createUpdateRecovery('1.2.3', root).refusedVersion).toBe('1.2.4');
  });
});
