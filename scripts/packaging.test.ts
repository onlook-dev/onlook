import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { windowsSigning } from './windows-signing.js';

test('both Windows signing modes and the shared Mac configuration satisfy the pinned builder schema', async () => {
  const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
  const builderRequire = createRequire(appRequire.resolve('electron-builder'));
  const { validateConfiguration } = builderRequire('app-builder-lib/out/util/config/config.js');
  const { load } = builderRequire('js-yaml');
  const config = load(readFileSync(join(import.meta.dirname, '../apps/studio/electron-builder.yml'), 'utf8'));
  const signed = { AZURE_TENANT_ID: 'tenant', AZURE_CLIENT_ID: 'client', AZURE_CLIENT_SECRET: 'fixture', ONLOOK_AZURE_SIGN_ENDPOINT: 'https://example.test', ONLOOK_AZURE_SIGN_ACCOUNT: 'account', ONLOOK_AZURE_SIGN_PROFILE: 'profile' };
  for (const env of [signed, { ONLOOK_WINDOWS_ALLOW_UNSIGNED: '1' }]) {
    const signing = windowsSigning(env);
    await validateConfiguration({ ...config, win: { ...config.win, ...signing.win }, forceCodeSigning: signing.forceCodeSigning }, { isEnabled: false });
  }
});

test('the pinned MacUpdater selects architecture-matching files from an x64-first feed', () => {
  const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
  const updater = appRequire('electron-updater/out/MacUpdater.js') as {
    MacUpdater: { filterFilesForArch(files: { url: URL; info: { url: string } }[], isArm64: boolean): { url: URL }[] };
  };
  const files = ['Onlook-1.0.0-x64-mac.zip', 'Onlook-1.0.0-arm64-mac.zip'].map((name) => ({ url: new URL(name, 'https://example.test/'), info: { url: name } }));
  expect(updater.MacUpdater.filterFilesForArch(files, false).map((file) => file.url.pathname)).toEqual(['/Onlook-1.0.0-x64-mac.zip']);
  expect(updater.MacUpdater.filterFilesForArch(files, true).map((file) => file.url.pathname)).toEqual(['/Onlook-1.0.0-arm64-mac.zip']);
});
