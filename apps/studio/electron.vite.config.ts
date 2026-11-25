import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin, type UserConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { commitCount } from '../../scripts/version.js';
// By path: the config loader leaves a package import to Node, which cannot load `@studio/events` from source.
import { FLAGS, RETIRED_FLAGS } from '../../packages/events/src/flags.js';
import { thirdPartyPlugin } from './build/third-party.mjs';
import { REACT_PINS } from './src/main/starter/adapters/react.js';

/**
 * A compile-time constant: a packaged .app ships no git to shell out to (ONL-1964).
 * `unknown` rather than a throw — a source-tarball build has no git and is still valid.
 */
function commitSha(): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    cwd: import.meta.dirname,
  });
  return result.status === 0 ? (result.stdout ?? '').trim() : 'unknown';
}

const CLOUD_EDITION = resolve(import.meta.dirname, '../../packages/i18n/src/edition/cloud.js');

export function editionStringsPlugin(cloud: boolean) {
  return {
    name: 'edition-strings',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (cloud || importer === undefined || !source.startsWith('.')) return null;
      return resolve(dirname(importer), source) === CLOUD_EDITION
        ? resolve(import.meta.dirname, '../../packages/i18n/src/edition/source.ts') : null;
    },
  };
}

function zodProseAnnotationPlugin() {
  return {
    name: 'zod-prose-annotation',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!/\/node_modules\/zod\/v4\/core\/(?:util|regexes)\.(?:js|cjs)$/.test(id.replaceAll('\\', '/'))) return null;
      const corrected = code
        .replace('// Wrapped in a `@__PURE__` IIFE:', '// Wrapped in an IIFE:')
        .replace('esbuild will not drop a `@__PURE__` call whose own argument', 'esbuild will not drop a pure call whose own argument');
      return corrected === code ? null : { code: corrected, map: null };
    },
  };
}

// The repo root, not this package: electron-vite's default env dir silently bakes
// nothing from the root `.env` (GH-3).
const envDir = resolve(import.meta.dirname, '../..');

/** Injected ahead of the bundle's tag, never written into the page: a declared tag folds into the bundle's chunk and waits for the megabytes it exists to cover (ONL-3153). */
const bootEntry = resolve(import.meta.dirname, 'src/renderer/src/boot.ts');
const bootScript = {
  name: 'studio-boot-ground',
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, ctx: { filename: string; bundle?: Record<string, { type: string; name?: string; fileName: string; imports?: readonly string[] }> }) {
      if (!ctx.filename.endsWith('index.html')) return html;
      const built = Object.values(ctx.bundle ?? {}).find((output) => output.type === 'chunk' && output.name === 'boot');
      // The dev server has no bundle and serves the entry by path; a build without this chunk would ship the page with no ground and no error.
      if (ctx.bundle !== undefined && built === undefined) throw new Error('studio-boot-ground: the renderer build produced no `boot` chunk');
      if (built?.imports?.length) throw new Error(`studio-boot-ground: \`boot\` must import nothing, or it loads with the bundle it covers; it imports ${built.imports.join(', ')}`);
      if (!html.includes('<script type="module"')) throw new Error('studio-boot-ground: index.html has no module script to inject ahead of');
      const tag = `<script type="module" crossorigin src="${built ? `./${built.fileName}` : '/src/boot.ts'}"></script>\n    `;
      return html.replace('<script type="module"', `${tag}<script type="module"`);
    },
  },
};
export interface StudioConfigOptions {
  /** The module that fills the `@onlook/cloud-provider` slot; the built-in local provider when unsaid. */
  providerEntry?: string;
  /** `cloud` carries the account text, session replay and log export; `source`, the default, carries none of them. */
  edition?: 'source' | 'cloud';
  /** Constants the provider reads in main, keyed and quoted as Vite's `define` takes them. */
  defines?: Record<string, string>;
}

const LOCAL_PROVIDER = resolve(import.meta.dirname, 'src/main/cloud/local.ts');

function buildEnvironment(mode: string): Record<string, string | undefined> {
  return { ...loadEnv(mode, envDir, 'STUDIO_'), ...process.env };
}

function bakedFlagDefaults(env: Record<string, string | undefined>): string[] {
  const flagDefaults = (env['STUDIO_FLAG_DEFAULTS'] ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
  const unknownFlags = flagDefaults.filter((key) => !Object.hasOwn(FLAGS, key) && !RETIRED_FLAGS.includes(key));
  if (unknownFlags.length) throw new Error(`Unknown STUDIO_FLAG_DEFAULTS: ${unknownFlags.join(', ')}`);
  return flagDefaults;
}

export function createStudioConfig(options: StudioConfigOptions = {}) {
  return defineConfig(({ mode }) => studioConfig(options, buildEnvironment(mode)));
}

/** The source edition around the local provider. A provider built elsewhere passes `createStudioConfig` its own entry, edition and constants. */
export default createStudioConfig();

function studioConfig(options: StudioConfigOptions, env: Record<string, string | undefined>): UserConfig {
  const flagDefaults = bakedFlagDefaults(env);
  const cloud = options.edition === 'cloud';
  const telemetry = env['STUDIO_TELEMETRY'] !== '0';
  return {
  main: {
    envDir,
    resolve: {
      alias: {
        '@onlook/cloud-provider': options.providerEntry ?? LOCAL_PROVIDER,
      },
    },
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha()),
      'import.meta.env.MAIN_VITE_TELEMETRY': JSON.stringify(String(telemetry)),
      __OFFICIAL_BUILD__: JSON.stringify(cloud),
      'import.meta.env.MAIN_VITE_FLAG_DEFAULTS': JSON.stringify(flagDefaults.join(',')),
      'import.meta.env.MAIN_VITE_CLOUD_BUILD': JSON.stringify(cloud ? commitCount(envDir) : 0),
      'import.meta.env.MAIN_VITE_ONLOOK_CLOUD': JSON.stringify(String(cloud)),
      'import.meta.env.RENDERER_VITE_ONLOOK_CLOUD': JSON.stringify(String(cloud)),
      ...options.defines,
    },
    // Externalizes `dependencies`, bundles the rest: workspace packages are
    // devDependencies because electron-builder v26 mis-resolves `workspace:*`.
    plugins: [externalizeDepsPlugin(), thirdPartyPlugin(envDir, REACT_PINS), editionStringsPlugin(cloud), zodProseAnnotationPlugin(), {
      name: 'telemetry-build-selection',
      enforce: 'pre' as const,
      resolveId(source: string, importer: string | undefined) {
        if (importer === undefined || !source.startsWith('.')) return null;
        const path = resolve(dirname(importer), source);
        if (!telemetry && path === resolve(import.meta.dirname, 'src/main/telemetry/index.js')) return resolve(import.meta.dirname, 'src/main/telemetry/disabled.ts');
        if ((!telemetry || !cloud) && path === resolve(import.meta.dirname, 'src/main/log/export.js')) return resolve(import.meta.dirname, 'src/main/log/export-disabled.ts');
        return null;
      },
    }],
    build: {
      rollupOptions: {
        input: {
          index: resolve(import.meta.dirname, 'src/main/index.ts'),
          'transcript-worker': resolve(import.meta.dirname, 'src/main/agent-host/transcript-worker.ts'),
        },
      },
    },
  },
  /**
   * `cjs` for the whole target: the `guest` webview preload is sandboxed and cannot
   * be ESM, and electron-vite's preload validator throws on more than one output
   * format per target (ONL-1779). Flipping it moves the `.cjs` preload paths in
   * `main/index.ts` and `main/frames/index.ts` with it.
   */
  preload: {
    plugins: [thirdPartyPlugin(envDir, REACT_PINS), zodProseAnnotationPlugin()],
    envDir,
    build: {
      isolatedEntries: true,
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: resolve(import.meta.dirname, 'src/preload/index.ts'),
          chrome: resolve(import.meta.dirname, 'src/preload/chrome.ts'),
          'task-manager': resolve(import.meta.dirname, 'src/preload/task-manager.ts'),
          guest: resolve(import.meta.dirname, 'src/preload/guest.ts'),
        },
        output: { format: 'cjs' },
      },
    },
  },
  renderer: {
    define: {
      'import.meta.env.RENDERER_VITE_ONLOOK_CLOUD': JSON.stringify(String(cloud)),
      'import.meta.env.RENDERER_VITE_TELEMETRY': JSON.stringify(String(telemetry)),
    },
    envDir,
    root: resolve(import.meta.dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(import.meta.dirname, 'src/renderer/src'),
        ...(!cloud ? {
          './replay/index.js': resolve(import.meta.dirname, 'src/renderer/src/replay/disabled.ts'),
          '../replay/index.js': resolve(import.meta.dirname, 'src/renderer/src/replay/disabled.ts'),
        } : {}),
      },
    },
    build: {
      rollupOptions: {
        // Both pages sit at the renderer root: electron-vite's dev server serves
        // from there, so `${ELECTRON_RENDERER_URL}/chrome.html` resolves in dev
        // exactly as `out/renderer/chrome.html` does when packaged (ONL-2206).
        input: {
          index: resolve(import.meta.dirname, 'src/renderer/index.html'),
          chrome: resolve(import.meta.dirname, 'src/renderer/chrome.html'),
          'task-manager': resolve(import.meta.dirname, 'src/renderer/task-manager.html'),
          boot: bootEntry,
        },
      },
    },
    // A dependency first seen after a view loaded re-bundles them all and the view's React splits in two, so the subpath families are never discovered late (ONL-2960).
    optimizeDeps: {
      force: true,
      exclude: ['@central-icons-react/round-outlined-radius-1-stroke-1.5'],
      include: ['@astryxdesign/core/[A-Z]*'],
    },
    plugins: [react(), bootScript, thirdPartyPlugin(envDir, REACT_PINS), editionStringsPlugin(cloud), zodProseAnnotationPlugin(), {
      name: 'replay-build-selection',
      enforce: 'pre' as const,
      resolveId(source: string, importer: string | undefined) {
        if (importer === undefined || !source.startsWith('.') || (telemetry && cloud)) return null;
        return resolve(dirname(importer), source) === resolve(import.meta.dirname, 'src/renderer/src/replay/index.js')
          ? resolve(import.meta.dirname, 'src/renderer/src/replay/disabled.ts') : null;
      },
    }],
  },
  };
}
