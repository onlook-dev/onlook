import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveNoticeFiles, inventoryPath, licenseFlag, packagePath, packageRecord, renderNotice, repositoryRoot } from '../apps/studio/build/third-party.mjs';
import { REACT_PINS } from '../apps/studio/src/main/starter/adapters/react.js';

const records = new Map<string, ReturnType<typeof packageRecord>>();
for (const target of ['main', 'preload', 'renderer']) {
  const entries = JSON.parse(readFileSync(join(repositoryRoot, `apps/studio/out/${target}/third-party.json`), 'utf8'));
  for (const entry of entries) {
    const key = `${entry.name}@${entry.version}`;
    const previous = records.get(key);
    records.set(key, { ...entry, surfaces: [...new Set([...(previous?.surfaces ?? []), target])] });
  }
}
for (const path of process.argv.slice(2)) {
  for (const entry of JSON.parse(readFileSync(path, 'utf8'))) {
    const key = `${entry.name}@${entry.version}`;
    records.set(key, { ...entry, surfaces: [...new Set([...(records.get(key)?.surfaces ?? []), 'other-production-build'])] });
  }
}
for (const name of ['@fontsource-variable/inter', '@fontsource-variable/jetbrains-mono']) {
  const entry = packageRecord(packagePath(name, join(repositoryRoot, 'apps/studio/package.json')));
  records.set(`${entry.name}@${entry.version}`, { ...entry, surfaces: ['renderer-font'] });
}
const electron = packageRecord(packagePath('electron', join(repositoryRoot, 'apps/studio/package.json')));
electron.additionalNotices = [{ file: 'LICENSES.chromium.html', sha256: createHash('sha256').update(readFileSync(join(repositoryRoot, 'apps/studio/node_modules/electron/dist/LICENSES.chromium.html'))).digest('hex') }];
electron.surfaces = ['electron'];
records.set(`${electron.name}@${electron.version}`, electron);
mkdirSync(join(repositoryRoot, '.scratch/tmp/starter'), { recursive: true });
const requests = new Map(Object.entries(REACT_PINS).map(([name, version]) => [`${name}@${version}`, { name, version: String(version), surface: 'react-starter-pin' }]));
for (const entry of [...records.values()]) {
  for (const component of entry.embeddedComponents ?? []) {
    const key = `${component.name}@${component.version}`;
    if (component.version.startsWith('unresolved-')) {
      const license = 'UNKNOWN';
      const texts: { file: string; text: string }[] = [];
      records.set(key, { ...component, license, flag: 'unknown', textStatus: 'missing-owner-review', texts,
        evidence: createHash('sha256').update(JSON.stringify({ license, texts })).digest('hex'), surfaces: ['publisher-embedded-unresolved'] });
    } else requests.set(key, { name: component.name, version: component.version, surface: 'publisher-embedded' });
  }
  if (entry.name === 'esbuild') {
    const response = await fetch(entry.source);
    if (!response.ok) throw new Error(`Cannot inspect esbuild platform manifest: ${entry.version}`);
    const metadata = await response.json();
    for (const platform of ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64']) {
      const name = `@esbuild/${platform}`;
      const version = metadata.optionalDependencies[name];
      if (!version) throw new Error(`Missing declared build-host binary: ${name}`);
      requests.set(`${name}@${version}`, { name, version, surface: 'build-host-optional' });
    }
  }
}
for (const { name, version, surface } of requests.values()) {
  const key = `${name}@${version}`;
  if (records.has(key)) {
    const entry = records.get(key)!;
    entry.surfaces = [...new Set([...(entry.surfaces ?? []), surface])];
    continue;
  }
  const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
  if (!response.ok) throw new Error(`Cannot fetch package license metadata: ${key} (${response.status})`);
  const metadata = await response.json();
  if (metadata.name !== name || metadata.version !== version) throw new Error(`Wrong starter metadata: ${key}`);
  const tarResponse = await fetch(metadata.dist.tarball);
  if (!tarResponse.ok) throw new Error(`Cannot fetch starter package: ${key}`);
  const bytes = Buffer.from(await tarResponse.arrayBuffer());
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (integrity !== metadata.dist.integrity) throw new Error(`Starter package integrity mismatch: ${key}`);
  const archive = join(repositoryRoot, '.scratch/tmp/starter', `${name.replaceAll('/', '-')}-${version}.tgz`);
  writeFileSync(archive, bytes);
  const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
  if (listing.status !== 0) throw new Error(`Cannot list starter package: ${key}`);
  const files = listing.stdout.split('\n').filter((file) => file && !file.endsWith('/'));
  const { prefix, notices } = archiveNoticeFiles(files);
  const manifestResult = spawnSync('tar', ['-xOf', archive, `${prefix}package.json`], { encoding: 'utf8' });
  if (manifestResult.status !== 0) throw new Error(`Missing archived manifest: ${key}`);
  const archivedManifest = JSON.parse(manifestResult.stdout);
  if (archivedManifest.name !== name || archivedManifest.version !== version) throw new Error(`Wrong archived package: ${key}`);
  const texts = notices.map((file) => {
      const result = spawnSync('tar', ['-xOf', archive, file], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      if (result.status !== 0) throw new Error(`Cannot read starter attribution: ${key}/${file}`);
      return { file: file.slice(prefix.length), text: result.stdout };
    });
  const license = typeof metadata.license === 'string' ? metadata.license : 'UNKNOWN';
  records.set(key, {
    name, version, license, flag: licenseFlag(license), source: response.url,
    texts, textStatus: texts.length ? 'preserved' : 'missing-owner-review', evidence: createHash('sha256').update(JSON.stringify({ license, texts })).digest('hex'),
    integrity, surfaces: [surface],
  });
}
const sdk = JSON.parse(readFileSync(packagePath('@anthropic-ai/claude-agent-sdk', join(repositoryRoot, 'apps/studio/package.json')), 'utf8'));
for (const [name, version] of Object.entries(sdk.optionalDependencies) as [string, string][]) {
  const key = `${name}@${version}`;
  if (records.has(key)) continue;
  const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
  if (!response.ok) throw new Error(`Cannot fetch platform SDK license metadata: ${key}`);
  const metadata = await response.json();
  if (metadata.name !== name || metadata.version !== version) throw new Error(`Wrong platform SDK metadata: ${key}`);
  const licenseSource = `https://unpkg.com/${name}@${version}/LICENSE.md`;
  const textResponse = await fetch(licenseSource);
  if (!textResponse.ok) throw new Error(`Cannot fetch platform SDK license: ${key}`);
  const texts = [{ file: 'LICENSE.md', text: await textResponse.text() }];
  const license = metadata.license;
  records.set(key, {
    name, version, license, flag: licenseFlag(license), source: response.url, licenseSource,
    texts, textStatus: 'preserved', evidence: createHash('sha256').update(JSON.stringify({ license, texts })).digest('hex'),
    integrity: metadata.dist.integrity, surfaces: ['platform-sdk'],
  });
}
const entries = [...records.values()].sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`, 'en'));
writeFileSync(inventoryPath, JSON.stringify(entries, null, 2) + '\n');
writeFileSync(join(repositoryRoot, 'NOTICE'), renderNotice(entries));
console.log(`Wrote ${entries.length} third-party entries and NOTICE`);
