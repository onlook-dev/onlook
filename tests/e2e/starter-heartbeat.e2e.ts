import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { closeStudio, launchStudio, probeStarterExit, type Target } from './launch.js';

test('Electron identifies a forked starter through details.name', async () => {
  const scratch = makeStateRoot({ name: 'starter-utility' });
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  const application = await launchStudio(target);
  try {
    const actual = await probeStarterExit(application, scratch);
    expect(actual.name).toBe('studio-starter:exit-contract');
    expect(actual.sameParent).toBe(true);
    expect([3, 768]).toContain(actual.exitCode);
    const killed = await probeStarterExit(application, scratch, 'kill');
    expect(killed.name).toBe('studio-starter:exit-contract');
    expect(killed.sameParent).toBe(true);
    expect(killed.reason).toBe('killed');
  } finally {
    await closeStudio(application);
    cleanupTempFixtures();
  }
});
