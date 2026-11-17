import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, type Rollup } from 'vite';
import { NO_CAPABILITIES } from '@studio/events';
import { OFFICIAL_BUILD } from '../build-kind.js';
import { capabilities, resolveCapabilities } from './capabilities.js';
import * as local from './local.js';

const saved = process.env['MAIN_VITE_ONLOOK_CLOUD'];

afterEach(() => {
  if (saved === undefined) delete process.env['MAIN_VITE_ONLOOK_CLOUD'];
  else process.env['MAIN_VITE_ONLOOK_CLOUD'] = saved;
});

describe('provider capabilities in main', () => {
  it('the local provider advertises none, whatever the build says', () => {
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
    expect(resolveCapabilities(local)).toEqual(NO_CAPABILITIES);
    expect(capabilities()).toEqual(NO_CAPABILITIES);
  });

  it('a proof switch stands in for the capability its fixture supplies, and for no other', () => {
    for (const [name, capability] of [['STUDIO_GITHUB_PROOF', 'github'], ['STUDIO_REPORT_PROOF', 'report']] as const) {
      process.env[name] = '1';
      try {
        expect(capabilities()).toEqual({ ...NO_CAPABILITIES, [capability]: true });
      } finally {
        delete process.env[name];
      }
    }
  });

  it('a provider that advertises is taken at its word, bounded to the known names', () => {
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'false';
    expect(resolveCapabilities({ capabilities: { account: true, github: true, report: 'yes', other: true } }))
      .toEqual({ ...NO_CAPABILITIES, account: true, github: true });
    expect(resolveCapabilities({ capabilities: null })).toEqual(NO_CAPABILITIES);
  });

  it('a provider built before capabilities gets the answers the build switches and its own reading gave', () => {
    let enabled = true;
    const provider = { identity: { enabled: () => enabled }, createOnlookClient() {} };
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
    expect(resolveCapabilities(provider)).toEqual({ account: true, teams: true, github: true, report: true, survey: true, updates: OFFICIAL_BUILD, links: OFFICIAL_BUILD });
    enabled = false;
    expect(resolveCapabilities(provider).account).toBe(false);
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'false';
    expect(resolveCapabilities(provider)).toEqual({ ...NO_CAPABILITIES, updates: OFFICIAL_BUILD, links: OFFICIAL_BUILD });
  });

  it('builds against a provider module with no capabilities export, and answers from the build', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'provider-without-capabilities-'));
    try {
      const provider = join(directory, 'provider.ts');
      writeFileSync(provider, 'export const identity = { enabled: () => true };\nexport function createOnlookClient() { return {}; }\nexport const flag = undefined;\n');
      const electron = join(directory, 'electron.ts');
      writeFileSync(electron, 'export const app = { isPackaged: true };\nexport default { app };\n');
      const warnings: string[] = [];
      const output = await build({
        configFile: false, logLevel: 'silent',
        resolve: { alias: { '@onlook/cloud-provider': provider, electron } },
        define: { 'import.meta.env.MAIN_VITE_ONLOOK_CLOUD': '"true"', __OFFICIAL_BUILD__: 'true' },
        build: {
          ssr: true, write: false, minify: false,
          rollupOptions: {
            input: join(import.meta.dirname, 'capabilities.ts'), preserveEntrySignatures: 'strict', output: { format: 'es' },
            onwarn(warning) { warnings.push(warning.message); },
          },
        },
      }) as Rollup.RollupOutput;
      expect(warnings).toEqual([]);
      const chunk = output.output.find((entry) => entry.type === 'chunk');
      if (chunk?.type !== 'chunk') throw new Error('capabilities bundle missing');
      const built = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`) as { capabilities(): unknown };
      expect(built.capabilities()).toEqual({ account: true, teams: true, github: true, report: true, survey: true, updates: true, links: true });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
