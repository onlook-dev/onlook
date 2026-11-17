import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { packagePath, repositoryRoot } from '../apps/studio/build/third-party.mjs';
import { REACT_PINS } from '../apps/studio/src/main/starter/adapters/react.js';

const require = createRequire(join(repositoryRoot, 'apps/studio/package.json'));
const semver = require('semver');
const rawPath = process.argv[2];
if (!rawPath) throw new Error('Pass the JSON output of a fresh bun audit --json scan');
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const inventory = JSON.parse(readFileSync(join(repositoryRoot, 'compliance/dependencies.json'), 'utf8'));
const shipped = new Set(inventory.filter((entry: { surfaces: string[] }) => entry.surfaces.some((surface) => surface !== 'react-starter-pin')).map((entry: { name: string; version: string }) => `${entry.name}@${entry.version}`));
const git = (...args: string[]) => {
  const result = spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
};
const paths = new Map<string, string[]>();
const gaps: string[] = [];
const manifests = ['package.json', ...git('ls-files', '**/package.json').split('\n')];
for (const relative of manifests) {
  const queue = [{ path: join(repositoryRoot, relative), chain: [relative], development: true }];
  const seen = new Set<string>();
  while (queue.length) {
    const next = queue.shift()!;
    const path = realpathSync(next.path);
    if (seen.has(path)) continue;
    seen.add(path);
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    const key = `${manifest.name}@${manifest.version}`;
    if (!paths.has(key)) paths.set(key, [...next.chain, key]);
    const dependencies = { ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies, ...(next.development ? manifest.devDependencies : {}) };
    for (const name of Object.keys(dependencies)) {
      try { queue.push({ path: packagePath(name, path), chain: [...next.chain, key], development: false }); }
      catch { if (!manifest.optionalDependencies?.[name] && !manifest.peerDependenciesMeta?.[name]?.optional) gaps.push(`${key} -> ${name}`); }
    }
  }
}
interface Advisory {
  id: number;
  url: string;
  severity: string;
  vulnerable_versions: string;
  title: string;
}
const advisories: (Advisory & {
  package: string;
  affected: { version: string; shipped: boolean; path: string[]; firstPublishedOutsideRange: string | null }[];
  classification: string;
})[] = [];
for (const [name, reports] of Object.entries(raw)) {
  const response = await fetch(`https://registry.npmjs.org/${name}`);
  if (!response.ok) throw new Error(`Cannot check published fixes for ${name}: ${response.status}`);
  const metadata = await response.json();
  const versions = Object.keys(metadata.versions).filter((version) => semver.valid(version) && !semver.prerelease(version)).sort(semver.compare);
  for (const report of reports as Advisory[]) {
    const affected = [...paths].filter(([key]) => key.startsWith(`${name}@`) && semver.satisfies(key.slice(name.length + 1), report.vulnerable_versions));
    advisories.push({
      ...report, package: name,
      affected: affected.map(([key, chain]) => {
        const version = key.slice(name.length + 1);
        return {
          version, shipped: shipped.has(key), path: chain,
          firstPublishedOutsideRange: versions.find((candidate) => semver.gt(candidate, version) && !semver.satisfies(candidate, report.vulnerable_versions)) ?? null,
        };
      }),
      classification: affected.some(([key]) => shipped.has(key)) ? 'shipped-review-required' : affected.length ? 'tooling-only-in-this-build' : 'unresolved-install-path',
    });
  }
}
const baseline = [
  ['@xmldom/xmldom', 10], ['brace-expansion', 14], ['braces', 1], ['http-cache-semantics', 1], ['nanoid', 1],
  ['source-map-js', 1], ['sprintf-js', 1], ['undici', 13], ['vite', 3],
].map(([name, previousEntries]) => ({ name, previousEntries, currentEntries: advisories.filter((entry) => entry.package === name).length }));
const starterResponse = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify(Object.fromEntries(Object.entries(REACT_PINS).map(([name, version]) => [name, [version]]))),
});
if (!starterResponse.ok) throw new Error(`Cannot audit React starter pins: ${starterResponse.status}`);
const starterAdvisories = await starterResponse.json();
const inventoryPackages: Record<string, string[]> = {};
for (const entry of inventory as { name: string; version: string }[]) {
  if (!semver.valid(entry.version)) continue;
  inventoryPackages[entry.name] = [...new Set([...(inventoryPackages[entry.name] ?? []), entry.version])].sort();
}
const inventoryResponse = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(inventoryPackages),
});
if (!inventoryResponse.ok) throw new Error(`Cannot audit inventoried package versions: ${inventoryResponse.status}`);
const inventoryAdvisories = await inventoryResponse.json();
writeFileSync(join(repositoryRoot, 'compliance/advisories.json'), JSON.stringify({
  scannedAt: statSync(rawPath).mtime.toISOString(), reassessedAt: new Date().toISOString(), revision: git('rev-parse', 'HEAD'),
  lockSha256: createHash('sha256').update(readFileSync(join(repositoryRoot, 'bun.lock'))).digest('hex'),
  command: 'bun audit --json', raw, advisories, baseline,
  reactStarter: { pins: REACT_PINS, endpoint: 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', advisories: starterAdvisories },
  inventoryAudit: { packages: inventoryPackages, advisories: inventoryAdvisories,
    unresolvedComponents: inventory.filter((entry: { version: string }) => !semver.valid(entry.version)).map((entry: { name: string; version: string; source: string }) => ({ name: entry.name, version: entry.version, source: entry.source })),
  },
  dependencyResolutionGaps: [...new Set(gaps)].sort(),
  limitations: [
    'Counts are advisory range entries, not vulnerabilities or exploitability counts.',
    'A published version outside one vulnerable range is not a validated upgrade or clearance against other advisories.',
    'The historical scan supplied nine package groups and 45 counts, not its individual advisory IDs. Exact ID-level historical reconciliation requires its original JSON.',
    'Shipped classification conservatively includes production bundle modules, watched CSS/assets, their runtime dependency closures, installed runtime/peer/optional closure and Electron. Some conservatively included library dependencies may be tree-shaken or publisher tooling. Foreign optional binaries and embedded binary dependencies require their own platform audit.',
    'React starter direct pins are inventoried separately. Their future install-time transitive resolution is not a committed lockfile and is not covered by this repository audit.',
    'Known publisher-embedded npm versions are covered by inventoryAudit. Components whose publisher did not expose a version remain explicitly unresolved and cannot be declared free of advisories.',
  ],
}, null, 2) + '\n');

const onlookMade = new Set([
  'apps/studio/build/icon.png',
  'apps/studio/resources/brand/app-icon-tile-120.png',
  'apps/studio/resources/brand/dmg-background.jpg',
  'apps/studio/resources/brand/dmg-background@2x.jpg',
  'apps/studio/resources/brand/lockup-black.svg',
  'apps/studio/resources/brand/lockup-white.svg',
  'apps/studio/resources/brand/logomark-black.svg',
  'apps/studio/resources/brand/logomark-white.svg',
  'apps/studio/resources/brand/wordmark-black.svg',
  'apps/studio/resources/brand/wordmark-white.svg',
  'apps/studio/src/renderer/src/assets/chirp.wav',
  'apps/studio/src/renderer/src/assets/two-tone.wav',
  'apps/studio/src/renderer/src/canvas/ideas/arc.webp',
  'apps/studio/src/renderer/src/canvas/ideas/wave.webp',
  'assets/web-preview.png',
]);
const onlookRights = {
  license: 'LicenseRef-Onlook',
  evidence: 'Made by Onlook (ONL-3303). Not covered by the open-source license; see ASSETS.md.',
};
const unknownRights = (path: string) => ({
  license: 'UNKNOWN', evidence: 'Git provenance only; no source grant or rights document found in the tracked tree.',
  owner: path.endsWith('.wav') ? 'Engineering owner (ONL-2878)' : 'Design owner (ONL-2878)',
  ask: path.endsWith('.wav') ? 'Supply the original sound source and redistribution grant, or confirm original authorship.' : 'Supply the original design/photo source, authorship and redistribution grant, including underlying image rights.',
});
const assets = git('ls-files').split('\n').filter((path) => /\.(png|jpe?g|svg|webp|ico|icns|wav|woff2?|ttf|otf)$/i.test(path)).map((path) => ({
  path, sha256: createHash('sha256').update(readFileSync(join(repositoryRoot, path))).digest('hex'),
  source: `git:${git('log', '-1', '--format=%H', '--', path)}:${path}`,
  ...(onlookMade.has(path) ? onlookRights : unknownRights(path)),
}));
const fonts = [];
for (const name of ['inter', 'jetbrains-mono']) {
  const directory = join(repositoryRoot, `apps/studio/node_modules/@fontsource-variable/${name}`);
  const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  for (const file of readdirSync(join(directory, 'files')).filter((file) => /\.woff2?$/.test(file))) {
    fonts.push({ path: `@fontsource-variable/${name}/files/${file}`, version: metadata.version, license: metadata.license,
      sha256: createHash('sha256').update(readFileSync(join(directory, 'files', file))).digest('hex'),
      source: `https://registry.npmjs.org/@fontsource-variable/${name}/${metadata.version}`, evidence: 'Exact package license text preserved in NOTICE. Conservative inventory of all supplied font variants.' });
  }
}
writeFileSync(join(repositoryRoot, 'compliance/assets.json'), JSON.stringify({ assets, fonts }, null, 2) + '\n');
console.log(`${advisories.length} advisory entries, ${advisories.filter((entry) => entry.classification === 'shipped-review-required').length} affecting shipped package versions, ${assets.filter((entry) => entry.license === 'UNKNOWN').length} asset rights asks, ${fonts.length} font files`);
