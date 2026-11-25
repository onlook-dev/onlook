import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { closeStudio, launchStudio, type Target } from './launch.js';
import { probeStarterExit } from './starter-utility.js';

test('Electron identifies a forked starter through details.name', async () => {
  const scratch = makeStateRoot({ name: 'starter-utility' });
  const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  const application = await launchStudio(target);
  try {
    const actual = await probeStarterExit(application, scratch);
    expect(actual.name).toBe('studio-starter:exit-contract');
    expect(actual.sameParent).toBe(true);
    expect([3, 768]).toContain(actual.exitCode);
  } finally {
    await closeStudio(application);
    cleanupTempFixtures();
  }
});
