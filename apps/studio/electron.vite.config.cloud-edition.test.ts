import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { build, type Rollup } from 'vite';
import { createStudioConfig } from './electron.vite.config.js';

const root = join(import.meta.dirname, '../..');
const providerEntry = join(import.meta.dirname, 'src/main/cloud/provider-fake.ts');
const AMBIENT = { STUDIO_CLOUD_BUILD: '', STUDIO_WORKOS_CLIENT_ID: 'client_ambient', STUDIO_CLOUD_URL: 'https://ambient.test', STUDIO_CONVEX_URL: '', STUDIO_FLAG_DEFAULTS: '' };

/** A cloud edition around a provider that is not in the tree's `providers/`, with the environment naming none. */
function cloudEdition(defines?: Record<string, string>) {
  const saved = Object.keys(AMBIENT).map((key) => [key, process.env[key]] as const);
  try {
    Object.assign(process.env, AMBIENT);
    return createStudioConfig({ providerEntry, edition: 'cloud', ...(defines === undefined ? {} : { defines }) })({ command: 'build', mode: 'production' });
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('a cloud edition created around a handed provider fills the slot with it and bakes the cloud constants, taking none from the environment', () => {
  const config = cloudEdition({ 'import.meta.env.MAIN_VITE_CLOUD_URL': '"https://handed.test"' });
  expect(config.main?.resolve?.alias).toEqual({ '@onlook/cloud-provider': providerEntry });
  expect(config.main?.define?.['import.meta.env.MAIN_VITE_ONLOOK_CLOUD']).toBe('"true"');
  expect(config.renderer?.define?.['import.meta.env.RENDERER_VITE_ONLOOK_CLOUD']).toBe('"true"');
  expect(config.main?.define?.['__OFFICIAL_BUILD__']).toBe('true');
  expect(Number(config.main?.define?.['import.meta.env.MAIN_VITE_CLOUD_BUILD'])).toBeGreaterThan(0);
  expect(config.main?.define?.['import.meta.env.MAIN_VITE_CLOUD_URL']).toBe('"https://handed.test"');
  expect(JSON.stringify(config.main?.define)).not.toContain('ambient');
  expect(JSON.stringify(cloudEdition().main?.define)).not.toContain('CLOUD_URL');
});

test('the main and renderer catalogs of a cloud edition created around a handed provider name Onlook and carry the account text', async () => {
  const config = cloudEdition();
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
    expect(catalog.t('app.name')).toBe('Onlook');
    expect(catalog.t('menu.about')).toBe('About Onlook');
    expect(catalog.t('menu.quit')).toBe('Quit Onlook');
    expect(code.code).toContain('Sign in to Onlook');
  }
});

test('the slot of a cloud edition created around a handed provider bundles that provider and neither in-tree one', async () => {
  const config = cloudEdition();
  const modules: string[] = [];
  await build({
    configFile: false, logLevel: 'silent', resolve: config.main?.resolve,
    plugins: [{
      name: 'cloud-slot-boundary',
      resolveId(id) { if (id === 'cloud-slot-entry') return '\0cloud-slot-entry'; },
      load(id) { if (id === '\0cloud-slot-entry') return 'export { createOnlookClient, identity, capabilities, flag } from "@onlook/cloud-provider";'; },
      generateBundle(_options, output) {
        for (const chunk of Object.values(output)) {
          if (chunk.type === 'chunk') modules.push(...Object.keys(chunk.modules));
        }
      },
    }],
    build: { ssr: true, write: false, minify: false, rollupOptions: { input: 'cloud-slot-entry', preserveEntrySignatures: 'strict', output: { format: 'es' } } },
  });
  expect(modules.some((id) => id.endsWith('/cloud/provider-fake.ts'))).toBe(true);
  expect(modules.some((id) => id.endsWith('/cloud/local.ts'))).toBe(false);
  expect(modules.some((id) => id.includes('/cloud/providers/'))).toBe(false);
  expect(modules.some((id) => id.includes('/node_modules/'))).toBe(false);
});
