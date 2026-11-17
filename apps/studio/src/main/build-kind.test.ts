import { expect, test } from 'bun:test';
import { buildIdentity } from './build-kind.js';
import { spawnSync } from 'node:child_process';

test('source installs have a separate name, bundle identity and data folder', () => {
  expect(buildIdentity(false)).toEqual({ appId: 'com.onlook.studio.source', productName: 'Onlook Source', dataFolder: 'Onlook Studio Source' });
  expect(buildIdentity(true)).toEqual({ appId: 'com.onlook.studio', productName: 'Onlook', dataFolder: 'Onlook Studio' });
  for (const key of ['appId', 'productName', 'dataFolder'] as const) {
    expect(buildIdentity(false)[key]).not.toBe(buildIdentity(true)[key]);
  }
});

test('native module imports default to source without the explicit unit-test profile', () => {
  const result = spawnSync(process.execPath, ['--eval', `const { OFFICIAL_BUILD } = await import(${JSON.stringify(import.meta.resolve('./build-kind.js').replace(/\.js$/, '.ts'))}); process.stdout.write(String(OFFICIAL_BUILD));`], {
    env: { ...process.env, STUDIO_TEST_OFFICIAL_BUILD: '' }, encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe('false');
});
