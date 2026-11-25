import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { windowsSigning } from './windows-signing.js';

const SIGNED_ENV = { AZURE_TENANT_ID: 'tenant', AZURE_CLIENT_ID: 'client', AZURE_CLIENT_SECRET: 'fixture', ONLOOK_AZURE_SIGN_ENDPOINT: 'https://example.test', ONLOOK_AZURE_SIGN_ACCOUNT: 'account', ONLOOK_AZURE_SIGN_PROFILE: 'profile' };

test('the Windows updater accepts the certificate common name and rejects the old spelling', () => {
  const script = `
    const { createRequire } = require('node:module');
    const appRequire = createRequire(process.argv[1]);
    const builderRequire = createRequire(appRequire.resolve('electron-builder'));
    const { WindowsSignAzureManager } = builderRequire('app-builder-lib/out/codeSign/windowsSignAzureManager.js');
    const childProcess = require('node:child_process');
    childProcess.execFile = (...args) => args.at(-1)(null, JSON.stringify({
      Status: 0, Path: 'update.exe', SignerCertificate: { Subject: 'CN="On Off, Inc.", O="On Off, Inc.", C=US' }
    }), '');
    const { verifySignature } = appRequire('electron-updater/out/windowsExecutableCodeSignatureVerifier.js');
    const logger = { info() {}, warn() {}, error() {} };
    const signing = new WindowsSignAzureManager({ platformSpecificBuildOptions: JSON.parse(process.argv[2]) });
    signing.computedPublisherName.value.then(publishers => Promise.all([publishers, ['On Off, Inc']].map(names => verifySignature(names, 'update.exe', logger))))
      .then(results => process.stdout.write(JSON.stringify(results)));
  `;
  const signing = windowsSigning(SIGNED_ENV);
  const result = spawnSync('node', ['-e', script, join(import.meta.dirname, '../apps/studio/package.json'), JSON.stringify(signing.win)], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  const results = JSON.parse(result.stdout) as (string | null)[];
  expect(results[0]).toBeNull();
  expect(results[1]).toContain('publisherNames: On Off, Inc,');
});

test('both Windows signing modes and the shared Mac configuration satisfy the pinned builder schema', async () => {
  const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
  const builderRequire = createRequire(appRequire.resolve('electron-builder'));
  const { validateConfiguration } = builderRequire('app-builder-lib/out/util/config/config.js');
  const { load } = builderRequire('js-yaml');
  const config = load(readFileSync(join(import.meta.dirname, '../apps/studio/electron-builder.yml'), 'utf8'));
  for (const env of [SIGNED_ENV, { ONLOOK_WINDOWS_ALLOW_UNSIGNED: '1' }]) {
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
