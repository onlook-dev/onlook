import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, type Plugin, type Rollup } from 'vite';
import { packageRecord, renderNotice, thirdPartyPlugin } from './third-party.mjs';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'studio-build-notices-'));
  roots.push(root);
  mkdirSync(join(root, 'apps/studio'), { recursive: true });
  mkdirSync(join(root, 'compliance'));
  writeFileSync(join(root, 'apps/studio/package.json'), '{"name":"@studio/app","version":"1.0.0"}');
  const entries = ['first', 'second', 'starter'].map((name) => {
    const directory = join(root, 'node_modules', name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name, version: '1.0.0', license: 'MIT', main: 'index.js' }));
    writeFileSync(join(directory, 'LICENSE'), `Permission for ${name}\n`);
    writeFileSync(join(directory, 'index.js'), `export const value = ${JSON.stringify(name)};`);
    writeFileSync(join(root, `${name}.js`), `export { value } from './node_modules/${name}/index.js';`);
    return packageRecord(join(directory, 'package.json'));
  });
  writeFileSync(join(root, 'compliance/dependencies.json'), JSON.stringify(entries));
  writeFileSync(join(root, 'NOTICE'), renderNotice(entries));
  return { root, entries };
}

async function bundle(root: string, notices: Plugin, names: string[], nested = true) {
  const warnings: Rollup.RollupLog[] = [];
  const onwarn = (warning: Rollup.RollupLog) => { warnings.push(warning); };
  const output = await build({
    root, configFile: false, envFile: false, logLevel: 'silent', plugins: [notices, ...(nested ? [{
      name: 'isolated-entry-fixture',
      resolveId(id: string) { if (id === 'isolated-entry-fixture') return '\0isolated-entry-fixture'; },
      async load(id: string) {
        if (id !== '\0isolated-entry-fixture') return;
        const emitted = new Set<string>();
        for (const name of names) {
          const child = await build({
            root, configFile: false, envFile: false, logLevel: 'silent', plugins: [notices],
            build: { ssr: true, write: false, minify: false, rollupOptions: { input: join(root, `${name}.js`), onwarn } },
          }) as Rollup.RollupOutput;
          for (const asset of child.output) {
            if (emitted.has(asset.fileName)) continue;
            this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.type === 'chunk' ? asset.code : asset.source });
            emitted.add(asset.fileName);
          }
        }
        return 'export {};';
      },
    } satisfies Plugin] : [])],
    build: { ssr: true, write: false, minify: false, rollupOptions: { input: nested ? 'isolated-entry-fixture' : join(root, `${names[0]}.js`), onwarn } },
  }) as Rollup.RollupOutput;
  return { output: output.output, warnings };
}

test('isolated entries emit one complete inventory and preserve the reviewed NOTICE without overwrite warnings', async () => {
  const { root, entries } = fixture();
  const { output, warnings } = await bundle(root, thirdPartyPlugin(root, { starter: '1.0.0' }), ['first', 'second']);
  expect(warnings.filter((warning) => warning.code === 'FILE_NAME_CONFLICT')).toEqual([]);
  const inventories = output.filter((asset) => asset.fileName === 'third-party.json');
  expect(inventories).toHaveLength(1);
  const inventory = inventories[0];
  if (inventory?.type !== 'asset') throw new Error('Inventory missing');
  expect(JSON.parse(String(inventory.source)).map((entry: { name: string }) => entry.name).sort()).toEqual(['first', 'second']);
  const notices = output.filter((asset) => asset.fileName === 'NOTICE');
  expect(notices).toHaveLength(1);
  expect(notices[0]?.type === 'asset' && notices[0].source).toBe(renderNotice(entries));
});

test('a reused plugin forgets dependencies from the preceding build', async () => {
  const { root } = fixture();
  const notices = thirdPartyPlugin(root);
  await bundle(root, notices, ['first', 'second']);
  const { output } = await bundle(root, notices, ['first'], false);
  const inventory = output.find((asset) => asset.fileName === 'third-party.json');
  if (inventory?.type !== 'asset') throw new Error('Inventory missing');
  expect(JSON.parse(String(inventory.source)).map((entry: { name: string }) => entry.name)).toEqual(['first']);
});

test('an uncovered dependency in a later isolated entry still fails the build', async () => {
  const { root, entries } = fixture();
  writeFileSync(join(root, 'compliance/dependencies.json'), JSON.stringify(entries.filter((entry) => entry.name !== 'second')));
  await expect(bundle(root, thirdPartyPlugin(root), ['first', 'second'])).rejects.toThrow('Missing third-party notice: second@1.0.0');
});

test('isolated builds still check starter pins and stale NOTICE text', async () => {
  const { root } = fixture();
  await expect(bundle(root, thirdPartyPlugin(root, { starter: '2.0.0' }), ['first', 'second'])).rejects.toThrow('Missing third-party notice: starter@2.0.0');
  writeFileSync(join(root, 'NOTICE'), 'stale');
  await expect(bundle(root, thirdPartyPlugin(root), ['first', 'second'])).rejects.toThrow('NOTICE is stale');
});

test('collection mode emits the union without requiring a reviewed inventory', async () => {
  const { root } = fixture();
  writeFileSync(join(root, 'compliance/dependencies.json'), '[]');
  const saved = process.env.STUDIO_COLLECT_NOTICES;
  process.env.STUDIO_COLLECT_NOTICES = '1';
  try {
    const { output, warnings } = await bundle(root, thirdPartyPlugin(root), ['first', 'second']);
    expect(warnings.filter((warning) => warning.code === 'FILE_NAME_CONFLICT')).toEqual([]);
    expect(output.some((asset) => asset.fileName === 'NOTICE')).toBe(false);
    const inventory = output.find((asset) => asset.fileName === 'third-party.json');
    if (inventory?.type !== 'asset') throw new Error('Inventory missing');
    expect(JSON.parse(String(inventory.source)).map((entry: { name: string }) => entry.name).sort()).toEqual(['first', 'second']);
  } finally {
    if (saved === undefined) delete process.env.STUDIO_COLLECT_NOTICES;
    else process.env.STUDIO_COLLECT_NOTICES = saved;
  }
});
