import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { installationReusable, installFingerprint } from './fingerprint.js';

afterAll(cleanupTempFixtures);
it('requires unchanged activation/install/input bytes and every sentinel, not unchanged start text', () => {
  const project = makeDirWithFiles({ files: { 'package.json': '{}', 'bun.lock': 'first' } });
  mkdirSync(join(project, 'node_modules'));
  const definition = { prepare: 'node --version', install: { script: 'bun install', inputs: ['package.json', 'bun.lock', '.node-version'], outputs: ['node_modules'] }, servers: [{ id: 'web', cwd: '.', start: 'bun run dev', port: 3000 }] };
  const fingerprint = installFingerprint(project, definition);
  expect(installationReusable(project, definition, fingerprint)).toBe(true);
  expect(installationReusable(project, { ...definition, servers: [{ ...definition.servers[0]!, start: 'bun run serve' }] }, fingerprint)).toBe(true);
  expect(installationReusable(project, { ...definition, prepare: 'node --version && corepack enable' }, fingerprint)).toBe(false);
  writeFileSync(join(project, '.node-version'), '22');
  expect(installationReusable(project, definition, fingerprint)).toBe(false);
  const next = installFingerprint(project, definition);
  writeFileSync(join(project, 'bun.lock'), 'second');
  expect(installationReusable(project, definition, next)).toBe(false);
  expect(installationReusable(project, { ...definition, install: { ...definition.install, outputs: [] } }, next)).toBe(false);
  rmSync(join(project, 'node_modules'), { recursive: true });
  expect(installationReusable(project, definition, installFingerprint(project, definition))).toBe(false);
});
