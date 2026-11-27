import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

export const repositoryRoot = resolve(import.meta.dirname, '../../..');
export const inventoryPath = join(repositoryRoot, 'compliance/dependencies.json');

/** `node_modules/<name>/package.json` in the nearest directory above `parent` that has one, or null. */
function installedManifest(name, parent) {
  for (let directory = dirname(parent); ; directory = dirname(directory)) {
    const path = join(directory, 'node_modules', name, 'package.json');
    if (existsSync(path)) return path;
    if (dirname(directory) === directory) return null;
  }
}

export function packagePath(name, parent) {
  const require = createRequire(parent);
  let entry;
  try { entry = require.resolve(`${name}/package.json`); } catch {
    // A types-only package such as type-fest exports neither `.` nor its manifest, so look where Node would.
    try { entry = require.resolve(name); } catch (error) { entry = installedManifest(name, parent); if (!entry) throw error; }
  }
  let directory = dirname(realpathSync(entry));
  while (dirname(directory) !== directory) {
    const path = join(directory, 'package.json');
    if (existsSync(path) && JSON.parse(readFileSync(path, 'utf8')).name === name) return path;
    directory = dirname(directory);
  }
  throw new Error(`Cannot locate dependency ${name} from ${parent}`);
}

export function licenseFlag(license) {
  if (!license || license === 'UNKNOWN' || license === 'UNLICENSED') return 'unknown';
  if (/\b(A?GPL|LGPL|MPL|EPL|CDDL|OSL|SSPL)/i.test(license)) return 'copyleft-review';
  if (!/^(MIT|ISC|Apache-2\.0|BSD-[23]-Clause|0BSD|CC0-1\.0|Unlicense|OFL-1\.1|BlueOak-1\.0\.0)$/.test(license)) return 'custom-or-compound-review';
  return 'permissive';
}

export function isNoticeFile(name) {
  return /^(licen[cs]e|copying|notice|copyright)([.-]|$)/i.test(name) || /^third[-_]?party.*(notice|licen[cs]e)/i.test(name);
}

export function archiveNoticeFiles(files) {
  const roots = [...new Set(files.map((file) => file.split('/')[0]))];
  if (roots.length !== 1 || !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(roots[0]) || files.some((file) => file.split('/').includes('..'))) throw new Error('Invalid package archive root');
  const prefix = `${roots[0]}/`;
  return { prefix, notices: files.filter((file) => !file.slice(prefix.length).includes('/') && isNoticeFile(file.slice(prefix.length))).sort() };
}

export function publisherEvidence(directory, manifest) {
  const artifacts = [];
  const components = new Map();
  if (manifest.name !== 'posthog-js') return { artifacts, components: [] };
  for (const file of ['dist/module.no-external.js', 'dist/posthog-recorder.js']) {
    const mapFile = `${file}.map`;
    if (!existsSync(join(directory, mapFile))) throw new Error(`Missing publisher provenance: ${manifest.name}/${mapFile}`);
    const mapBytes = readFileSync(join(directory, mapFile));
    const map = JSON.parse(mapBytes.toString('utf8'));
    artifacts.push({ file: mapFile, sha256: createHash('sha256').update(mapBytes).digest('hex') });
    if (existsSync(join(directory, file))) artifacts.push({ file, sha256: createHash('sha256').update(readFileSync(join(directory, file))).digest('hex') });
    for (const source of map.sources) {
      const match = /\/links\/@\/(.+?)\/(\d+\.\d+\.\d+[^/]*)\/[^/]+\/node_modules\//.exec(source);
      if (match) {
        components.set(`${match[1]}@${match[2]}`, {
          name: match[1], version: match[2], source: `https://unpkg.com/${manifest.name}@${manifest.version}/${mapFile}`, publisherSource: source,
        });
      } else if (source.startsWith('../../rrweb/')) {
        const name = `publisher-embedded:${source.slice('../../'.length)}`;
        components.set(name, { name, version: `unresolved-in-${manifest.name}-${manifest.version}`, source: `https://unpkg.com/${manifest.name}@${manifest.version}/${mapFile}`, publisherSource: source });
      }
    }
  }
  return { artifacts, components: [...components.values()].sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`, 'en')) };
}

export function packageRecord(path) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const directory = dirname(path);
  const license = typeof manifest.license === 'string' ? manifest.license : manifest.license?.type ?? 'UNKNOWN';
  const referred = /^SEE LICENSE IN ([\w.-]+)$/i.exec(license)?.[1];
  const noticePaths = readdirSync(directory).filter((name) => isNoticeFile(name) || name === referred)
    .filter((name) => !name.endsWith('.json'));
  if (manifest.name === 'node-pty' && existsSync(join(directory, 'deps/winpty/LICENSE'))) noticePaths.push('deps/winpty/LICENSE');
  const texts = noticePaths
    .sort().flatMap((name) => {
      try { return [{ file: name, text: readFileSync(join(directory, name), 'utf8') }]; } catch { return []; }
    });
  const publisher = publisherEvidence(directory, manifest);
  const provenance = publisher.artifacts.length ? { artifacts: publisher.artifacts, embeddedComponents: publisher.components } : {};
  return {
    name: manifest.name, version: manifest.version, license, flag: licenseFlag(license),
    textStatus: texts.length ? 'preserved' : 'missing-owner-review',
    source: `https://registry.npmjs.org/${manifest.name}/${manifest.version}`,
    texts,
    ...provenance,
    evidence: createHash('sha256').update(JSON.stringify({ license, texts, ...provenance })).digest('hex'),
  };
}

export function runtimePackages(path, seen = new Set(), result = new Map()) {
  path = realpathSync(path);
  if (seen.has(path)) return result;
  seen.add(path);
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.name !== '@studio/app') result.set(`${manifest.name}@${manifest.version}`, packageRecord(path));
  if (manifest.name === 'electron') return result;
  const required = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})]);
  for (const name of required) {
    if (manifest.peerDependenciesMeta?.[name]?.optional || manifest.optionalDependencies?.[name]) continue;
    runtimePackages(packagePath(name, path), seen, result);
  }
  const optionalNames = new Set([
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependenciesMeta ?? {}).filter((name) => manifest.peerDependenciesMeta[name].optional),
  ]);
  for (const name of optionalNames) {
    let optional;
    try { optional = packagePath(name, path); } catch { continue; }
    runtimePackages(optional, seen, result);
  }
  return result;
}

export function assertCovered(records, inventory) {
  const entries = new Map(inventory.map((entry) => [`${entry.name}@${entry.version}`, entry]));
  for (const record of records) {
    const key = `${record.name}@${record.version}`;
    const entry = entries.get(key);
    if (!entry) throw new Error(`Missing third-party notice: ${key}`);
    if (record.evidence && entry.evidence !== record.evidence) throw new Error(`Changed third-party license: ${key}`);
    if (record.license && entry.license !== record.license) throw new Error(`Changed third-party license: ${key}`);
    if (!entry.license || !Array.isArray(entry.texts)) throw new Error(`Invalid third-party inventory: ${key}`);
    if (record.embeddedComponents?.length) assertCovered(record.embeddedComponents, inventory);
  }
}

export function renderNotice(inventory) {
  return 'Third-party notices\n\nThis file preserves upstream license and attribution evidence.\n'
    + 'It does not license Onlook or grant rights to trademarks or unverified assets.\n'
    + 'Entries marked for review are not a statement of publication clearance.\n\n'
    + [...inventory].sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`, 'en'))
      .map((entry) => `${'='.repeat(72)}\n${entry.name}@${entry.version}\nLicense: ${entry.license}\nReview: ${entry.flag}\nSource: ${entry.source}\n`
        + (entry.additionalNotices ?? []).map(({ file, sha256 }) => `Additional notice: ${file} (audit snapshot SHA-256 ${sha256}; packaged copy is target-specific)\n`).join('') + '\n'
        + (entry.texts.length ? entry.texts.map(({ file, text }) => `--- ${file} ---\n${text}`).join('\n\n') : 'No upstream license text was found. Owner review is required.\n'))
      .join('\n\n');
}

export function buildPackages(root, moduleFiles) {
  const seen = new Set();
  const records = runtimePackages(join(root, 'apps/studio/package.json'), seen);
  for (const id of moduleFiles) {
    if (!id.includes('/node_modules/') || id.startsWith('\0')) continue;
    let directory = dirname(id.split('?')[0]);
    while (directory.includes('/node_modules/')) {
      const path = join(directory, 'package.json');
      if (existsSync(path)) {
        const manifest = JSON.parse(readFileSync(path, 'utf8'));
        if (manifest.name && manifest.version) {
          runtimePackages(path, seen, records);
          break;
        }
      }
      directory = dirname(directory);
    }
  }
  return [...records.values()];
}

export function thirdPartyPlugin(root, starterPins = {}) {
  const packages = new Map();
  let activeBuilds = 0;
  return {
    name: 'studio-third-party-notices',
    apply: 'build',
    buildStart() {
      if (activeBuilds === 0) packages.clear();
      activeBuilds++;
    },
    buildEnd() {
      activeBuilds--;
    },
    generateBundle() {
      const watchedAssets = this.getWatchFiles().filter((path) => /\.(css|scss|sass|less|woff2?|otf|ttf|png|jpe?g|svg|webp)(\?|$)/i.test(path));
      for (const entry of buildPackages(root, new Set([...this.getModuleIds(), ...watchedAssets]))) {
        packages.set(`${entry.name}@${entry.version}`, entry);
      }
      if (activeBuilds > 0) return;
      const entries = [...packages.values()];
      this.emitFile({ type: 'asset', fileName: 'third-party.json', source: JSON.stringify(entries, null, 2) + '\n' });
      if (process.env.STUDIO_COLLECT_NOTICES === '1') return;
      const inventory = JSON.parse(readFileSync(join(root, 'compliance/dependencies.json'), 'utf8'));
      assertCovered(entries, inventory);
      assertCovered(Object.entries(starterPins).map(([name, version]) => ({ name, version })), inventory);
      const notice = renderNotice(inventory);
      if (readFileSync(join(root, 'NOTICE'), 'utf8') !== notice) throw new Error('NOTICE is stale. Regenerate third-party notices.');
      this.emitFile({ type: 'asset', fileName: 'NOTICE', source: notice });
    },
  };
}

export function verifyArchive(archive, asar, inventory, targetNotices = {}) {
  const notice = asar.extractFile(archive, 'NOTICE').toString('utf8');
  if (notice !== renderNotice(inventory)) throw new Error('Packaged NOTICE differs from the reviewed inventory');
  for (const target of ['main', 'preload', 'renderer']) {
    assertCovered(JSON.parse(asar.extractFile(archive, join('out', target, 'third-party.json')).toString('utf8')), inventory);
  }
  for (const entry of inventory) {
    for (const { file, sha256 } of entry.additionalNotices ?? []) {
      const expectedHash = targetNotices[file] ? createHash('sha256').update(targetNotices[file]).digest('hex') : sha256;
      if (createHash('sha256').update(asar.extractFile(archive, file)).digest('hex') !== expectedHash) throw new Error(`Packaged notice changed: ${file}`);
    }
  }
  const records = asar.listPackage(archive).filter((path) => /[/\\]node_modules[/\\](?:@[^/\\]+[/\\])?[^/\\]+[/\\]package\.json$/.test(path))
    .map((path) => {
      try { return JSON.parse(asar.extractFile(archive, path.replace(/^[/\\]/, '')).toString('utf8')); }
      catch (error) { throw new Error(`Cannot inventory packaged manifest ${path}`, { cause: error }); }
    }).filter((entry) => entry.name && entry.version);
  assertCovered(records, inventory);
  return records;
}
