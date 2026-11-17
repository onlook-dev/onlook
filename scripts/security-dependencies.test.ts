import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

function manifestPath(name: string, parent: string): string {
  const require = createRequire(parent);
  let entry: string;
  try { entry = require.resolve(`${name}/package.json`); } catch { entry = require.resolve(name); }
  let directory = dirname(entry);
  while (dirname(directory) !== directory) {
    const path = join(directory, 'package.json');
    try {
      if ((JSON.parse(readFileSync(path, 'utf8')) as Manifest).name === name) return path;
    } catch {}
    directory = dirname(directory);
  }
  throw new Error(`Cannot locate installed package ${name}`);
}

function runtimeVersions(path: string, seen = new Set<string>(), versions = new Map<string, Set<string>>()): Map<string, Set<string>> {
  if (seen.has(path)) return versions;
  seen.add(path);
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest;
  const installed = versions.get(manifest.name) ?? new Set<string>();
  installed.add(manifest.version);
  versions.set(manifest.name, installed);
  for (const name of new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])) {
    if (manifest.peerDependenciesMeta?.[name]?.optional) continue;
    runtimeVersions(manifestPath(name, path), seen, versions);
  }
  return versions;
}

describe('shipped dependency security', () => {
  it('security resolves the fixed versions throughout runtime externals and their peers', () => {
    const versions = runtimeVersions(join(import.meta.dirname, '../apps/studio/package.json'));
    for (const [name, version] of Object.entries({
      '@modelcontextprotocol/sdk': '1.32.1', 'fast-uri': '3.1.9', 'js-yaml': '4.3.2',
      'proxy-addr': '2.0.8', hono: '4.13.13', 'ip-address': '10.7.4', qs: '6.16.1',
      'body-parser': '2.4.0', zod: '4.6.6',
    })) expect([...versions.get(name) ?? []], name).toEqual([version]);
    for (const name of ['@xmldom/xmldom', 'brace-expansion', 'braces', 'http-cache-semantics', 'nanoid', 'source-map-js', 'sprintf-js', 'undici', 'vite']) {
      expect(versions.has(name)).toBe(false);
    }
  });

  it('security resolves the patched DOMPurify used by renderer analytics', () => {
    const app = join(import.meta.dirname, '../apps/studio/package.json');
    const posthog = manifestPath('posthog-js', app);
    const purifier = JSON.parse(readFileSync(manifestPath('dompurify', posthog), 'utf8')) as Manifest;
    expect(purifier.version).toBe('3.4.17');
  });
});
