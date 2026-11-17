import { afterAll, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { beginProjectSetupQuit, disposeProjectSetup, forgetProjectSetup, initializeProjectSetup, projectSetupService } from './service.js';
import { createSetupState } from './state.js';

afterAll(cleanupTempFixtures);

it('permits teardown before initialization but requires composition for execution', async () => {
  const root = makeDirWithFiles({ files: { 'package.json': '{}' } });
  expect(projectSetupService).toThrow('not initialized');
  await forgetProjectSetup(root);
  await disposeProjectSetup();
  beginProjectSetupQuit();
  const state = createSetupState(() => root);
  initializeProjectSetup({ state, report: async () => undefined });
  expect(projectSetupService().read(root).saved).toBeNull();
  expect(projectSetupService().ownsPort(root, 48001)).toBe(false);
  expect(projectSetupService().serverIdsForPorts(root, [48001])).toEqual([]);
  expect(() => initializeProjectSetup({ state, report: async () => undefined })).toThrow('already initialized');
  await forgetProjectSetup(root);
  await disposeProjectSetup();
});
