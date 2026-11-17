import { expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { resolveConfig } from 'electron-vite';
import { build } from 'vite';

it('security builds standalone app preloads that run with sandbox-only require', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-sandbox-preloads-'));
  const root = join(import.meta.dirname, '../../..');
  try {
    const resolved = await resolveConfig({
      root, configFile: join(root, 'electron.vite.config.ts'),
      build: { outDir: directory }, logLevel: 'silent',
    }, 'build', 'production');
    const config = resolved.config?.preload;
    if (!config) throw new Error('No production preload configuration');
    await build(config);
    const exposed = new Map<string, unknown>();
    for (const entry of ['index', 'chrome']) {
      const source = readFileSync(join(directory, 'preload', `${entry}.cjs`), 'utf8');
      runInNewContext(source, {
        process: { platform: process.platform, argv: [] }, Buffer,
        require: (name: string) => {
          if (name !== 'electron') throw new Error(`Sandbox cannot require ${name}`);
          return {
            contextBridge: { exposeInMainWorld: (name: string, bridge: unknown) => { exposed.set(name, bridge); } },
            ipcRenderer: { on: () => {}, send: () => {}, invoke: async () => undefined },
          };
        },
      }, { timeout: 1_000 });
    }
    expect(exposed.has('studio')).toBe(true);
    expect(exposed.has('studioChrome')).toBe(true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 15_000);
