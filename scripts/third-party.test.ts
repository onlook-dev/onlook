import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { archiveNoticeFiles, assertCovered, buildPackages, inventoryPath, licenseFlag, packagePath, packageRecord, renderNotice, repositoryRoot, runtimePackages, verifyArchive } from '../apps/studio/build/third-party.mjs';
import { REACT_PINS } from '../apps/studio/src/main/starter/adapters/react.js';
import stageElectronNotice, { electronNoticeDirectory, readElectronNotice } from '../apps/studio/build/stage-electron-notice.mjs';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'studio-notices-'));
  roots.push(root);
  return root;
}

function dependency(root: string, name: string, extra = {}) {
  const directory = join(root, 'node_modules', name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name, version: '1.0.0', license: 'MIT', ...extra }));
  writeFileSync(join(directory, 'LICENSE'), 'Copyright (c) Fixture Author\nPermission fixture\n');
  return join(directory, 'package.json');
}

describe('third-party publication notices', () => {
  it('locates a types-only dependency that exports neither its entry nor its manifest', () => {
    const root = fixture();
    const parent = dependency(root, 'consumer');
    dependency(root, 'types-only', { exports: { './source': { types: './source.d.ts' } } });
    expect(packagePath('types-only', parent)).toBe(realpathSync(join(root, 'node_modules', 'types-only', 'package.json')));
    expect(() => packagePath('absent', parent)).toThrow();
  });

  it('notices reject a new shipped dependency and a changed shipped version', () => {
    const entry = packageRecord(dependency(fixture(), 'example'));
    expect(() => assertCovered([{ ...entry, name: 'new-package' }], [entry])).toThrow('Missing third-party notice');
    expect(() => assertCovered([{ ...entry, version: '2.0.0' }], [entry])).toThrow('Missing third-party notice');
  });

  it('notices reject changed license evidence for an unchanged version', () => {
    const path = dependency(fixture(), 'example');
    const previous = packageRecord(path);
    writeFileSync(join(path, '../LICENSE'), 'Different rights');
    expect(() => assertCovered([packageRecord(path)], [previous])).toThrow('Changed third-party license');
  });

  it('notices preserve nested winpty copyright and detect nested-only changes', () => {
    const path = dependency(fixture(), 'node-pty');
    const nested = join(path, '../deps/winpty');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'LICENSE'), 'Copyright (c) Another Fixture Author\n');
    const entry = packageRecord(path);
    expect(renderNotice([entry])).toContain('Copyright (c) Another Fixture Author\n');
    writeFileSync(join(nested, 'LICENSE'), 'Changed nested permission\n');
    expect(() => assertCovered([packageRecord(path)], [entry])).toThrow('Changed third-party license');
  });

  it('notices discover non-package tar roots and supplementary TypeScript notices', () => {
    expect(archiveNoticeFiles(['react/package.json', 'react/LICENSE'])).toEqual({ prefix: 'react/', notices: ['react/LICENSE'] });
    expect(archiveNoticeFiles(['package/package.json', 'package/LICENSE.txt', 'package/ThirdPartyNoticeText.txt']).notices).toEqual(['package/LICENSE.txt', 'package/ThirdPartyNoticeText.txt']);
    expect(() => archiveNoticeFiles(['react/LICENSE', 'other/LICENSE'])).toThrow('Invalid package archive root');
    expect(() => archiveNoticeFiles(['react/../LICENSE'])).toThrow('Invalid package archive root');
  });

  it('notices distinguish publisher-embedded versions from installed dependencies', () => {
    const root = fixture();
    const path = dependency(root, 'posthog-js');
    const directory = join(path, '../dist');
    mkdirSync(directory);
    for (const file of ['module.no-external.js', 'posthog-recorder.js']) {
      writeFileSync(join(directory, file), 'publisher code');
      writeFileSync(join(directory, `${file}.map`), JSON.stringify({ sources: ['/store/links/@/fflate/0.4.8/hash/node_modules/fflate/esm/browser.js', '../../rrweb/record/dist/rrweb-record.js'] }));
    }
    const entry = packageRecord(path);
    expect(entry.embeddedComponents?.find((component) => component.name === 'fflate')?.version).toBe('0.4.8');
    const wrongVersion = packageRecord(dependency(root, 'fflate', { version: '0.4.9' }));
    expect(() => assertCovered([entry], [entry, wrongVersion])).toThrow('Missing third-party notice: fflate@0.4.8');
    expect(entry.embeddedComponents?.some((component) => component.version.startsWith('unresolved-'))).toBe(true);
  });

  it('notices traverse runtime dependencies, required peers and installed optional binaries', () => {
    const root = fixture();
    const path = dependency(root, '@studio/app', {
      dependencies: { runtime: '1.0.0' }, peerDependencies: { peer: '1.0.0', absent: '1.0.0', installed: '1.0.0' },
      peerDependenciesMeta: { absent: { optional: true }, installed: { optional: true } }, optionalDependencies: { binary: '1.0.0', foreign: '1.0.0' },
    });
    dependency(root, 'runtime', { dependencies: { peer: '1.0.0' } });
    dependency(root, 'peer', { dependencies: { runtime: '1.0.0' } });
    dependency(root, 'binary');
    dependency(root, 'installed');
    expect([...runtimePackages(path).keys()].sort()).toEqual(['binary@1.0.0', 'installed@1.0.0', 'peer@1.0.0', 'runtime@1.0.0']);
  });

  it('notices flag copyleft, custom and unknown licenses without granting clearance', () => {
    expect(licenseFlag('MIT')).toBe('permissive');
    for (const license of ['GPL-3.0-only', 'MPL-2.0', '(MIT OR GPL-2.0-or-later)']) expect(licenseFlag(license)).toBe('copyleft-review');
    expect(licenseFlag('SEE LICENSE IN LICENSE.md')).toBe('custom-or-compound-review');
    expect(licenseFlag(undefined)).toBe('unknown');
    expect(licenseFlag('UNLICENSED')).toBe('unknown');
  });

  it('notices cover CSS imports and dependencies prebundled inside a library', () => {
    const root = fixture();
    mkdirSync(join(root, 'apps/studio'), { recursive: true });
    writeFileSync(join(root, 'apps/studio/package.json'), JSON.stringify({ name: '@studio/app', version: '1.0.0' }));
    dependency(root, 'css-package', { dependencies: { prebundled: '1.0.0' } });
    dependency(root, 'prebundled');
    mkdirSync(join(root, 'node_modules/css-package/dist'));
    writeFileSync(join(root, 'node_modules/css-package/dist/package.json'), '{"type":"module"}');
    expect(buildPackages(root, [join(root, 'node_modules/css-package/dist/styles.css')]).map((entry) => entry.name).sort()).toEqual(['css-package', 'prebundled']);
  });

  it('notices treat Electron as a provided peer without shipping its npm installer', () => {
    const root = fixture();
    const path = dependency(root, 'library', { peerDependencies: { electron: '*' } });
    dependency(root, 'electron', { dependencies: { 'installer-only': '1.0.0' } });
    expect([...runtimePackages(path).keys()].sort()).toEqual(['electron@1.0.0', 'library@1.0.0']);
  });

  it('notices preserve exact upstream attribution text and render deterministically', () => {
    const entry = packageRecord(dependency(fixture(), 'example'));
    expect(renderNotice([entry])).toContain('Copyright (c) Fixture Author\nPermission fixture\n');
    const second = { ...entry, name: 'another' };
    expect(renderNotice([entry, second])).toBe(renderNotice([second, entry]));
  });

  it('notices cover the installed runtime closure and all generated React starter pins', () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    expect(() => assertCovered([...runtimePackages(join(repositoryRoot, 'apps/studio/package.json')).values()], inventory)).not.toThrow();
    expect(() => assertCovered(Object.entries(REACT_PINS).map(([name, version]) => ({ name, version })), inventory)).not.toThrow();
    expect(readFileSync(join(repositoryRoot, 'NOTICE'), 'utf8')).toBe(renderNotice(inventory));
    expect(new Set(inventory.map((entry: { name: string; version: string }) => `${entry.name}@${entry.version}`)).size).toBe(inventory.length);
  });

  it('notices cover SDK platforms and existing CI build-host binaries', () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    const sdk = JSON.parse(readFileSync(packagePath('@anthropic-ai/claude-agent-sdk', join(repositoryRoot, 'apps/studio/package.json')), 'utf8'));
    expect(() => assertCovered((Object.entries(sdk.optionalDependencies) as [string, string][]).map(([name, version]) => ({ name, version })), inventory)).not.toThrow();
    for (const entry of inventory.filter((entry: { name: string }) => entry.name === 'esbuild')) {
      expect(() => assertCovered(['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'].map((platform) => ({ name: `@esbuild/${platform}`, version: entry.version })), inventory)).not.toThrow();
    }
  });

  it('notices select root notices using the pinned electron-builder FileSets', async () => {
    const app = join(repositoryRoot, 'apps/studio');
    const require = createRequire(join(app, 'package.json'));
    const builderRequire = createRequire(require.resolve('electron-builder'));
    const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
    const { getFileMatchers } = libraryRequire('./fileMatcher.js');
    const { computeFileSets, getDestinationPath } = libraryRequire('./util/appFileCopier.js');
    const config = require('yaml').parse(readFileSync(join(app, 'electron-builder.yml'), 'utf8'));
    const root = fixture();
    const source = join(root, 'apps/studio');
    const staged = join(source, 'out/third-party-notices/win-x64');
    mkdirSync(staged, { recursive: true });
    writeFileSync(join(root, 'NOTICE'), 'Root notice');
    writeFileSync(join(staged, 'LICENSES.chromium.html'), 'Target notice');
    const destination = join(fixture(), 'app');
    const matchers = getFileMatchers({ files: config.files.filter((entry: unknown) => typeof entry === 'object') }, 'files', destination, {
      defaultSrc: source, macroExpander: (value: string) => value.replaceAll('${os}', 'win').replaceAll('${arch}', 'x64'), customBuildOptions: {}, globalOutDir: join(repositoryRoot, 'release'),
    });
    const sets = await computeFileSets(matchers, null, { info: { areNodeModulesHandledExternally: true } }, false);
    expect(sets.flatMap((set: { files: string[] }) => set.files.map((file) => getDestinationPath(file, set))).sort()).toEqual([join(destination, 'LICENSES.chromium.html'), join(destination, 'NOTICE')].sort());
  });

  it('notices preserve target-specific Chromium text and reject a changed packaged copy', async () => {
    const require = createRequire(join(repositoryRoot, 'apps/studio/package.json'));
    const builderRequire = createRequire(require.resolve('electron-builder'));
    const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
    const asar = libraryRequire('@electron/asar');
    const electronVersion = JSON.parse(readFileSync(inventoryPath, 'utf8')).find((entry: { name: string }) => entry.name === 'electron').version;
    const projectDir = fixture();
    const directories = new Set();
    for (const [platform, arch] of [['mac', 1], ['mac', 3], ['win', 1], ['linux', 1]] as const) {
      const appOutDir = fixture();
      const original = Buffer.from(`${platform}-${arch} upstream Chromium attribution`);
      writeFileSync(join(appOutDir, 'LICENSES.chromium.html'), original);
      const context = { appOutDir, arch, packager: { projectDir, expandMacro: (_pattern: string, architecture: string) => `${platform}-${architecture}`, info: { framework: { version: electronVersion } } } };
      stageElectronNotice(context);
      const staged = readFileSync(join(electronNoticeDirectory(context), 'LICENSES.chromium.html'));
      expect(staged).toEqual(original);
      directories.add(electronNoticeDirectory(context));
      expect(() => stageElectronNotice({ ...context, packager: { ...context.packager, info: { framework: { version: '0.0.0' } } } })).toThrow('Target Electron version differs');
      const source = fixture();
      const entry = { ...packageRecord(dependency(fixture(), 'electron')), additionalNotices: [{ file: 'LICENSES.chromium.html', sha256: 'audit-host-only' }] };
      writeFileSync(join(source, 'NOTICE'), renderNotice([entry]));
      writeFileSync(join(source, 'LICENSES.chromium.html'), original);
      for (const target of ['main', 'preload', 'renderer']) {
        mkdirSync(join(source, 'out', target), { recursive: true });
        writeFileSync(join(source, 'out', target, 'third-party.json'), '[]');
      }
      const archive = join(appOutDir, 'target.asar');
      await finished(await asar.createPackage(source, archive));
      expect(verifyArchive(archive, asar, [entry], { 'LICENSES.chromium.html': staged })).toEqual([]);
      expect(() => verifyArchive(archive, asar, [entry])).toThrow('Packaged notice changed');
      writeFileSync(join(source, 'LICENSES.chromium.html'), 'Wrong target attribution');
      const changed = join(appOutDir, 'changed.asar');
      await finished(await asar.createPackage(source, changed));
      expect(() => verifyArchive(changed, asar, [entry], { 'LICENSES.chromium.html': staged })).toThrow('Packaged notice changed');
    }
    expect(directories.size).toBe(4);
    const universal = { arch: 4, appOutDir: fixture(), packager: { projectDir, expandMacro: (_pattern: string, architecture: string) => `mac-${architecture}`, info: { framework: { version: electronVersion } } } };
    expect(() => readElectronNotice(universal)).toThrow('Universal Electron component notices differ');
    const x64 = readElectronNotice({ ...universal, arch: 1 });
    writeFileSync(join(electronNoticeDirectory({ ...universal, arch: 3 }), 'LICENSES.chromium.html'), x64);
    expect(readElectronNotice(universal)).toEqual(x64);
  });

  it('notices inspect a produced ASAR and reject an unlisted packaged dependency', async () => {
    const require = createRequire(join(repositoryRoot, 'apps/studio/package.json'));
    const builderRequire = createRequire(require.resolve('electron-builder'));
    const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
    const asar = libraryRequire('@electron/asar');
    const root = fixture();
    const source = join(root, 'app');
    mkdirSync(source);
    for (const target of ['main', 'preload', 'renderer']) {
      mkdirSync(join(source, 'out', target), { recursive: true });
      writeFileSync(join(source, 'out', target, 'third-party.json'), '[]');
    }
    const entry = packageRecord(dependency(source, 'packaged'));
    writeFileSync(join(source, 'NOTICE'), renderNotice([entry]));
    const archive = join(root, 'app.asar');
    await finished(await asar.createPackage(source, archive));
    expect(verifyArchive(archive, asar, [entry])).toHaveLength(1);
    expect(() => verifyArchive(archive, asar, [])).toThrow('Packaged NOTICE differs');
    writeFileSync(join(source, 'NOTICE'), renderNotice([]));
    const updated = join(root, 'unlisted.asar');
    await finished(await asar.createPackage(source, updated));
    expect(() => verifyArchive(updated, asar, [])).toThrow('Missing third-party notice: packaged@1.0.0');
    writeFileSync(join(source, 'NOTICE'), renderNotice([entry]));
    writeFileSync(join(source, 'out/renderer/third-party.json'), JSON.stringify([{ name: 'unlisted-bundle', version: '2.0.0' }]));
    const bundleArchive = join(root, 'unlisted-bundle.asar');
    await finished(await asar.createPackage(source, bundleArchive));
    expect(() => verifyArchive(bundleArchive, asar, [entry])).toThrow('Missing third-party notice: unlisted-bundle@2.0.0');
  });
});
