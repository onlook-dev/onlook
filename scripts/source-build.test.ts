import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const appRequire = createRequire(join(root, 'apps/studio/package.json'));
const builderRequire = createRequire(appRequire.resolve('electron-builder'));
const { load } = builderRequire('js-yaml') as { load(source: string): Record<string, unknown> };
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const source = load(read('apps/studio/electron-builder.yml'));
const official = load(read('apps/studio/electron-builder.official.yml'));

test('default source packaging has no official identity, protocol or update feed', () => {
  expect(source.appId).toBe('com.onlook.studio.source');
  expect(source.productName).toBe('Onlook Source');
  expect(source.protocols).toEqual([]);
  expect(source.publish).toBeNull();
  expect(source.generateUpdatesFilesForAllChannels).toBe(false);
});

test('official packaging retains the established identity, protocol and update feed', async () => {
  expect(official.extends).toBe('./electron-builder.yml');
  expect(official.appId).toBe('com.onlook.studio');
  expect(official.productName).toBe('Onlook');
  expect(official.protocols).toEqual([{ name: 'Onlook attribution', schemes: ['onlook'] }]);
  expect(official.publish).toEqual({ provider: 'generic', url: 'https://pub-9ae0145bf4194910900ac1b79bf65df3.r2.dev/', channel: 'latest', useMultipleRangeRequest: false });
  expect(official.generateUpdatesFilesForAllChannels).toBe(true);
  const { validateConfiguration } = builderRequire('app-builder-lib/out/util/config/config.js');
  await validateConfiguration({ ...source, ...official }, { isEnabled: false });
});

test('both native cuts select build and packaging together', () => {
  for (const path of ['scripts/cut-dmg.ts', 'scripts/cut-windows.ts']) {
    const script = read(path);
    expect(script).toContain("process.env['STUDIO_CLOUD_BUILD'] === '1'");
    expect(script).toContain("officialBuild ? 'electron-builder.official.yml' : 'electron-builder.yml'");
    expect(script).toContain("STUDIO_CLOUD_BUILD: officialBuild ? '1' : '0'");
  }
  expect(read('.github/workflows/source-build.yml')).toContain("STUDIO_CLOUD_BUILD: '0'");
});

test('local Mac cuts sign without a key and never require or rewrite an official feed', () => {
  const script = read('scripts/cut-dmg.ts');
  expect(script).toContain("if (!officialBuild && !identity) builderArgs.push('-c.mac.identity=-')");
  expect(script).toContain('(!dmg || !zip || (officialBuild && !feed))');
  expect(script).toContain('officialBuild ? patchFeedsForDmg(');
  expect(script).toContain('if (!ok && (!dirOnly || !officialBuild))');
});

test('local Mac cuts explain expected unsigned output without release credential instructions', () => {
  const script = read('scripts/cut-dmg.ts');
  expect(script).toContain("officialBuild ? red('none in keychain') : dim('not needed for a local build')");
  expect(script).toContain('if (officialBuild && notaryEnv.env === undefined && !notaryProfile)');
  expect(script).not.toContain('~/.config/apple-notary.env');
  expect(script).not.toContain('There is no bypass');
  expect(script).not.toContain('Do not send this');
  expect(script).toContain("observedTier !== 'unsigned' && await validateStapledTicket(packagedApp)");
  expect(script).toContain('stampedVersion ?? appManifest.version');
});
