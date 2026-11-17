import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hardenElectron, packagedElectronPath } from '../apps/studio/build/harden-electron.mjs';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('packaged Electron security', () => {
  it('security flips and verifies real Electron fuse wires in both universal slices', async () => {
    const root = mkdtempSync(join(tmpdir(), 'studio-fuses-'));
    roots.push(root);
    const binary = join(root, 'electron');
    const sentinel = 'dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX';
    const slice = Buffer.concat([Buffer.from(sentinel), Buffer.from([1, 8]), Buffer.from('10110011')]);
    writeFileSync(binary, Buffer.concat([slice, Buffer.from('binary-content'), slice]));
    await hardenElectron(binary);
    const actual = readFileSync(binary);
    for (const offset of [sentinel.length + 2, slice.length + 'binary-content'.length + sentinel.length + 2]) {
      expect(actual.subarray(offset, offset + 8).toString()).toBe('01001111');
    }
  });

  it('security aborts packaging when the binary has no fuse wire', async () => {
    const root = mkdtempSync(join(tmpdir(), 'studio-no-fuses-'));
    roots.push(root);
    const binary = join(root, 'electron');
    writeFileSync(binary, 'not an Electron binary');
    await expect(hardenElectron(binary)).rejects.toThrow();
  });

  it('security aborts packaging if Electron cannot retain every required fuse', async () => {
    const root = mkdtempSync(join(tmpdir(), 'studio-short-fuses-'));
    roots.push(root);
    const binary = join(root, 'electron');
    writeFileSync(binary, Buffer.concat([Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'), Buffer.from([1, 3]), Buffer.from('101')]));
    await expect(hardenElectron(binary)).rejects.toThrow('fuse wire in this version of Electron is not long enough');
  });

  it('security selects the packaged app, not the development Electron binary', () => {
    const context = { appOutDir: '/output', packager: { appInfo: { productFilename: 'Onlook' }, executableName: 'onlook' } };
    expect(packagedElectronPath({ ...context, electronPlatformName: 'darwin' })).toBe('/output/Onlook.app');
    expect(packagedElectronPath({ ...context, electronPlatformName: 'win32' })).toBe('/output/Onlook.exe');
    expect(readFileSync(join(import.meta.dirname, '../apps/studio/electron-builder.yml'), 'utf8')).toContain('afterPack: ./build/harden-electron.mjs');
  });
});
