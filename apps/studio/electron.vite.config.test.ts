import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, type InlineConfig, type Rollup } from 'vite';
import { parse } from 'yaml';
import studioConfig, { createStudioConfig, type StudioConfigOptions } from './electron.vite.config.js';

const root = join(import.meta.dirname, '../..');

function buildConfig(values: Record<string, string>, config = studioConfig) {
  const inputs = { STUDIO_CLOUD_BUILD: '', STUDIO_WORKOS_CLIENT_ID: '', STUDIO_CLOUD_URL: '', STUDIO_CONVEX_URL: '', STUDIO_FLAG_DEFAULTS: '', ...values };
  const saved = Object.keys(inputs).map((key) => [key, process.env[key]] as const);
  try {
    Object.assign(process.env, inputs);
    return config({ command: 'build', mode: 'production' });
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('source builds select the local slot and discard cloud configuration', () => {
  const config = buildConfig({ STUDIO_CLOUD_URL: 'https://ignored.test' });
  expect(config.main?.resolve?.alias).toEqual({ '@onlook/cloud-provider': join(root, 'apps/studio/src/main/cloud/local.ts') });
  expect(JSON.stringify(config.main?.define)).not.toContain('ignored');
  expect(config.main?.define?.['import.meta.env.MAIN_VITE_ONLOOK_CLOUD']).toBe('"false"');
  expect(config.main?.define?.['__OFFICIAL_BUILD__']).toBe('false');
});

const CLOUD_INPUTS = { STUDIO_CLOUD_BUILD: '1', STUDIO_WORKOS_CLIENT_ID: 'client_ambient', STUDIO_CLOUD_URL: 'https://ambient.test' };

function created(options?: StudioConfigOptions, values: Record<string, string> = {}) {
  return buildConfig(values, createStudioConfig(options));
}

test('a created config takes the local provider and the source edition, whatever the environment says', () => {
  for (const values of [{}, CLOUD_INPUTS]) {
    const config = created(undefined, values);
    expect(config.main?.resolve?.alias).toEqual({ '@onlook/cloud-provider': join(root, 'apps/studio/src/main/cloud/local.ts') });
    expect(config.main?.define?.['import.meta.env.MAIN_VITE_ONLOOK_CLOUD']).toBe('"false"');
    expect(config.renderer?.define?.['import.meta.env.RENDERER_VITE_ONLOOK_CLOUD']).toBe('"false"');
    expect(config.main?.define?.['__OFFICIAL_BUILD__']).toBe('false');
    expect(config.main?.define?.['import.meta.env.MAIN_VITE_CLOUD_BUILD']).toBe('0');
    expect(Object.keys(config.main?.define ?? {}).filter((key) => /WORKOS|CLOUD_URL/.test(key))).toEqual([]);
    expect(JSON.stringify(config.main?.define)).not.toContain('ambient');
  }
});

test('a created config validates build flag defaults as the environment-driven one does', () => {
  expect(created(undefined, { STUDIO_FLAG_DEFAULTS: 'teams' }).main?.define?.['import.meta.env.MAIN_VITE_FLAG_DEFAULTS']).toBe('"teams"');
  expect(() => created(undefined, { STUDIO_FLAG_DEFAULTS: 'bogus' })).toThrow('bogus');
});

test('the default config is the created one with no options, whatever the environment says', () => {
  for (const values of [{}, CLOUD_INPUTS]) {
    const standing = buildConfig(values);
    const handed = created(undefined, values);
    expect(JSON.stringify(standing.main?.define)).toBe(JSON.stringify(handed.main?.define));
    expect(JSON.stringify(standing.renderer?.define)).toBe(JSON.stringify(handed.renderer?.define));
    expect(standing.main?.resolve?.alias).toEqual(handed.main?.resolve?.alias);
  }
});

test('build flag defaults are validated and baked into the main process only', () => {
  expect(buildConfig({}).main?.define?.['import.meta.env.MAIN_VITE_FLAG_DEFAULTS']).toBe('""');
  const config = buildConfig({ STUDIO_FLAG_DEFAULTS: ' teams, , ' });
  expect(config.main?.define?.['import.meta.env.MAIN_VITE_FLAG_DEFAULTS']).toBe('"teams"');
  expect(config.renderer?.define?.['import.meta.env.MAIN_VITE_FLAG_DEFAULTS']).toBeUndefined();
  expect(config.preload?.define?.['import.meta.env.MAIN_VITE_FLAG_DEFAULTS']).toBeUndefined();
});

// The cloud edition's catalogs are in `electron.vite.config.cloud-edition.test.ts`, built around a handed provider.
test('main and renderer catalogs of the default config name the source edition and carry no account text', async () => {
  const config = buildConfig({ STUDIO_CLOUD_BUILD: '1', STUDIO_WORKOS_CLIENT_ID: 'client_test', STUDIO_CLOUD_URL: 'https://cloud.test' });
  for (const surface of ['main', 'renderer'] as const) {
    const plugins = (config[surface]?.plugins ?? []).flat().filter((plugin) => (plugin as { name?: string } | null)?.name === 'edition-strings');
    expect(plugins).toHaveLength(1);
    const output = await build({
      configFile: false, logLevel: 'silent', define: config[surface]?.define, plugins,
      build: { ssr: true, write: false, minify: false, rollupOptions: { input: join(root, 'packages/i18n/src/index.ts'), preserveEntrySignatures: 'strict', output: { format: 'es' } } },
    }) as Rollup.RollupOutput;
    const code = output.output.find((chunk) => chunk.type === 'chunk');
    if (!code || code.type !== 'chunk') throw new Error('Catalog bundle missing');
    const catalog = await import(`data:text/javascript;base64,${Buffer.from(code.code).toString('base64')}`) as { t: (key: string) => string };
    const name = 'Onlook Source';
    expect(catalog.t('app.name')).toBe(name);
    expect(catalog.t('menu.about')).toBe(`About ${name}`);
    expect(catalog.t('menu.hide')).toBe(`Hide ${name}`);
    expect(catalog.t('menu.quit')).toBe(`Quit ${name}`);
    expect(code.code).not.toContain('Sign in to Onlook');
  }
});

test('build flag defaults reject unknown names including inherited object keys', () => {
  for (const unknown of ['bogus', 'toString', '__proto__']) {
    expect(() => buildConfig({ STUDIO_FLAG_DEFAULTS: `teams,${unknown}` })).toThrow(unknown);
  }
});

test('the source module graph is the local provider alone, with no hosted provider or backend SDK', async () => {
  const config = buildConfig({ STUDIO_CLOUD_BUILD: '1', STUDIO_WORKOS_CLIENT_ID: 'client_test', STUDIO_CLOUD_URL: 'https://cloud.test' });
  const modules: string[] = [];
  const bundle: InlineConfig = {
    configFile: false, logLevel: 'silent', resolve: config.main?.resolve,
    ssr: { noExternal: ['convex', '@workos-inc/node'] },
    plugins: [{
      name: 'cloud-slot-boundary',
      resolveId(id) { if (id === 'cloud-slot-entry') return '\0cloud-slot-entry'; },
      load(id) { if (id === '\0cloud-slot-entry') return 'export { createOnlookClient, identity } from "@onlook/cloud-provider";'; },
      generateBundle(_options, output) {
        for (const chunk of Object.values(output)) {
          if (chunk.type === 'chunk') modules.push(...Object.keys(chunk.modules));
        }
      },
    }],
    build: { ssr: true, write: false, minify: false, rollupOptions: { input: 'cloud-slot-entry', preserveEntrySignatures: 'strict', output: { format: 'es' } } },
  };
  const output = await build(bundle) as Rollup.RollupOutput;
  expect(modules.some((id) => id.includes('/cloud/providers/'))).toBe(false);
  expect(modules.some((id) => id.includes('/convex/'))).toBe(false);
  expect(modules.some((id) => id.includes('/node_modules/'))).toBe(false);
  expect(modules.some((id) => id.endsWith('/cloud/local.ts'))).toBe(true);
  const sourceOutput = JSON.stringify(output.output).toLowerCase();
  for (const forbidden of ['convex', 'workos', 'safestorage', 'refreshtoken']) expect(sourceOutput).not.toContain(forbidden);
});

test('cloud build configuration separates the cached source and official variants', () => {
  const turbo = JSON.parse(readFileSync(join(root, 'turbo.json'), 'utf8').replace(/^\s*\/\/.*$/gm, '')) as {
    globalDependencies: string[]; tasks: { build: { env: string[] } };
  };
  expect(turbo.tasks.build.env).toEqual(['STUDIO_CLOUD_BUILD', 'STUDIO_FLAG_DEFAULTS', 'STUDIO_TELEMETRY']);
  expect(turbo.globalDependencies).toContain('.env.*');
});

test('Studio source workflow selects the local provider even with ambient cloud inputs', () => {
  const release = parse(readFileSync(join(root, '.github/workflows/source-build.yml'), 'utf8')) as {
    jobs: Record<string, { env: Record<string, string> }>;
  };
  const config = buildConfig({
    STUDIO_WORKOS_CLIENT_ID: 'client_ignored',
    STUDIO_CLOUD_URL: 'https://ignored.test',
    STUDIO_CONVEX_URL: 'https://legacy-ignored.test',
    ...release.jobs['source-build']!.env,
  });
  expect(config.main?.resolve?.alias).toEqual({ '@onlook/cloud-provider': join(root, 'apps/studio/src/main/cloud/local.ts') });
  expect(config.main?.define?.['import.meta.env.MAIN_VITE_ONLOOK_CLOUD']).toBe('"false"');
  expect(Object.keys(config.main?.define ?? {}).filter((key) => /WORKOS|CLOUD_URL/.test(key))).toEqual([]);
  expect(JSON.stringify(config.main?.define)).not.toContain('ignored');
});
