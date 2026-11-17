import { afterEach, describe, expect, it } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkHealth, resolveCodex } from './resolve.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'studio-codex-layout-'));
  roots.push(root);
  const install = join(root, 'install');
  mkdirSync(join(install, 'bin'), { recursive: true });
  for (const name of ['codex', 'codex-code-mode-host']) {
    writeFileSync(join(install, 'bin', name), '#!/bin/sh\nexit 0\n');
    chmodSync(join(install, 'bin', name), 0o755);
  }
  const descriptor = { layoutVersion: 1, version: 'test', target: 'test', variant: 'codex', entrypoint: 'bin/codex', resourcesDir: '.', pathDir: 'bin' };
  const save = (value: unknown) => writeFileSync(join(install, 'codex-package.json'), JSON.stringify(value));
  save(descriptor);
  return { root, install, descriptor, save };
}

describe('managed Codex path security', () => {
  it('security retains a valid contained Codex layout', () => {
    const { install } = fixture();
    expect(checkHealth(resolveCodex(install), install).ok).toBe(true);
  });

  it('security refuses malformed descriptors without falling back to another executable', () => {
    const { install, descriptor, save } = fixture();
    writeFileSync(join(install, 'codex'), 'fallback');
    chmodSync(join(install, 'codex'), 0o755);
    for (const value of [null, [], {}, { ...descriptor, layoutVersion: 2 }, { ...descriptor, entrypoint: 7 }, { ...descriptor, pathDir: '' }]) {
      save(value);
      expect(resolveCodex(install)).toBeNull();
    }
  });

  it('security refuses descriptor paths escaping the managed layout', () => {
    const { root, install, descriptor, save } = fixture();
    writeFileSync(join(root, 'outside'), 'executable');
    for (const field of ['entrypoint', 'pathDir', 'resourcesDir']) {
      for (const path of ['../../outside', join(root, 'outside')]) {
        save({ ...descriptor, [field]: path });
        expect(resolveCodex(install)).toBeNull();
      }
    }
    symlinkSync(join(root, 'outside'), join(install, 'escape'));
    save({ ...descriptor, entrypoint: 'escape' });
    expect(resolveCodex(install)).toBeNull();
  });

  it('security refuses a code-mode helper symlink escaping the executable directory', () => {
    const { root, install } = fixture();
    const helper = join(install, 'bin/codex-code-mode-host');
    const outside = join(root, 'outside');
    writeFileSync(outside, '#!/bin/sh\nexit 0\n');
    chmodSync(outside, 0o755);
    rmSync(helper);
    symlinkSync(outside, helper);
    expect(checkHealth(resolveCodex(install), install).ok).toBe(false);
  });

  it('security refuses a flat-directory executable symlink escaping the managed install', () => {
    const { root, install } = fixture();
    rmSync(join(install, 'codex-package.json'));
    const outside = join(root, 'outside');
    writeFileSync(outside, '#!/bin/sh\nexit 0\n');
    chmodSync(outside, 0o755);
    symlinkSync(outside, join(install, 'codex'));
    expect(resolveCodex(install)).toBeNull();
  });
});
