import { expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveConfig } from 'electron-vite';
import { build } from 'vite';

it.each([
  { name: 'telemetry-free', telemetry: false },
  { name: 'telemetry-enabled', telemetry: true },
])('a $name cloud edition built around a handed provider carries only its intended telemetry transports and SDKs', async ({ telemetry }) => {
  // The cloud switch stays off, so only the handed options can make this a cloud edition.
  const environment = { STUDIO_TELEMETRY: telemetry ? '1' : '0', STUDIO_CLOUD_BUILD: '0' };
  const previous = Object.fromEntries(Object.keys(environment).map((name) => [name, process.env[name]]));
  Object.assign(process.env, environment);
  const root = join(import.meta.dirname, '../../..');
  const directory = mkdtempSync(join(tmpdir(), 'studio-telemetry-cloud-edition-'));
  try {
    // `.mts`: the loader bundles it as a module beside the Studio config it imports by path.
    const configFile = join(directory, 'cloud-edition.config.mts');
    writeFileSync(configFile, [
      `import { createStudioConfig } from ${JSON.stringify(join(root, 'electron.vite.config.ts'))};`,
      `export default createStudioConfig({ providerEntry: ${JSON.stringify(join(root, 'src/main/cloud/provider-fake.ts'))}, edition: 'cloud' });`,
    ].join('\n'));
    const resolved = await resolveConfig({ root, configFile, build: { outDir: join(directory, 'out') }, logLevel: 'silent' }, 'build', 'production');
    const key = readFileSync(join(import.meta.dirname, 'index.ts'), 'utf8').match(/const PROD_POSTHOG_KEY = '([^']+)'/)?.[1];
    expect(key).toBeDefined();
    for (const target of ['main', 'renderer'] as const) {
      const configuration = resolved.config?.[target];
      if (!configuration) throw new Error(`Missing ${target} build configuration`);
      const result = await build(configuration);
      const modules = (Array.isArray(result) ? result : [result]).flatMap((bundle) => {
        if (!('output' in bundle)) throw new Error(`Missing ${target} build output`);
        return bundle.output.flatMap((chunk) => chunk.type === 'chunk' ? Object.keys(chunk.modules) : []);
      });
      const sdkModules = modules.filter((name) => /(?:posthog-js|@rrweb|\/rrweb\/)/.test(name));
      const files = readdirSync(join(directory, 'out', target), { recursive: true }).filter((name) => String(name).endsWith('.js'));
      expect(files.length).toBeGreaterThan(0);
      const output = files.map((name) => readFileSync(join(directory, 'out', target, String(name)), 'utf8')).join('\n');
      if (target === 'main') {
        expect(modules.some((name) => name.endsWith('/cloud/provider-fake.ts'))).toBe(true);
        expect(modules.some((name) => name.endsWith('/cloud/local.ts') || name.includes('/cloud/providers/'))).toBe(false);
        expect(output.includes(key!)).toBe(telemetry);
        expect(output.includes('/batch/')).toBe(telemetry);
      } else {
        expect(output).toContain('Sign in to Onlook');
        if (!telemetry) expect(output).not.toContain(key!);
        expect(sdkModules.length > 0).toBe(telemetry);
        expect(output.includes('__PosthogExtensions__')).toBe(telemetry);
      }
      if (!telemetry) expect(output).not.toContain('api_key: apiKey');
      expect(output.includes('/i/v1/logs')).toBe(telemetry);
    }
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
}, 120_000);
