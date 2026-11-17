import { expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveConfig } from 'electron-vite';
import { build } from 'vite';
import * as telemetry from './index.js';
import * as disabled from './disabled.js';

it.each([
  { name: 'source', official: false },
  { name: 'official', official: true },
])('$name native imports use the shared build identity without Vite defines', ({ official }) => {
  const environment: NodeJS.ProcessEnv = { ...process.env, STUDIO_TEST_OFFICIAL_BUILD: official ? '1' : '0' };
  delete environment['MAIN_VITE_ONLOOK_CLOUD'];
  const result = spawnSync(process.execPath, ['--eval', `const { isSourceBuild } = await import(${JSON.stringify(import.meta.resolve('./build.js').replace(/\.js$/, '.ts'))}); process.stdout.write(String(isSourceBuild()));`], { env: environment, encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(String(!official));
});

it('the disabled implementation covers every production telemetry export', () => {
  const names = Object.keys(telemetry).filter((name) => !name.endsWith('ForTesting'));
  expect(Object.keys(disabled).sort()).toEqual(names.sort());
});

it('Turbo hashes STUDIO_TELEMETRY as a build cache input', () => {
  const configuration = JSON.parse(readFileSync(join(import.meta.dirname, '../../../../..', 'turbo.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  expect(configuration.tasks.build.env).toContain('STUDIO_TELEMETRY');
});

it.each([
  { name: 'telemetry-free source', telemetry: false },
  { name: 'telemetry-enabled source', telemetry: true },
  // The cloud edition's two cases are in `build-cloud-edition.test.ts`, built around a handed provider.
])('$name builds include only their intended telemetry transports and SDKs', async ({ telemetry }) => {
  const environment = { STUDIO_TELEMETRY: telemetry ? '1' : '0', STUDIO_CLOUD_BUILD: '0' };
  const previous = Object.fromEntries(Object.keys(environment).map((name) => [name, process.env[name]]));
  Object.assign(process.env, environment);
  const root = join(import.meta.dirname, '../../..');
  const directory = mkdtempSync(join(tmpdir(), 'studio-telemetry-build-'));
  try {
    const resolved = await resolveConfig({ root, configFile: join(root, 'electron.vite.config.ts'), build: { outDir: directory }, logLevel: 'silent' }, 'build', 'production');
    const implementation = readFileSync(join(import.meta.dirname, 'index.ts'), 'utf8');
    const key = implementation.match(/const PROD_POSTHOG_KEY = '([^']+)'/)?.[1];
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
      const files = readdirSync(join(directory, target), { recursive: true }).filter((name) => String(name).endsWith('.js'));
      expect(files.length).toBeGreaterThan(0);
      const output = files.map((name) => readFileSync(join(directory, target, String(name)), 'utf8')).join('\n');
      if (target === 'main' && telemetry) {
        expect(output).toContain(key!);
        expect(output).toContain('/batch/');
      } else {
        expect(output).not.toContain(key!);
        expect(output).not.toContain('/batch/');
        expect(output).not.toContain('api_key: apiKey');
      }
      expect(output).not.toContain('/i/v1/logs');
      expect(sdkModules).toEqual([]);
      expect(output).not.toContain('__PosthogExtensions__');
    }
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
}, 120_000);
