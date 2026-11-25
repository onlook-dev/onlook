import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WINDOWS_PUBLISHER_NAME } from './windows-signing.js';
import { assertWindowsUpdateSignature, readWindowsSignature } from './windows-update-signature.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function packagedApp(config: string): string {
  const root = mkdtempSync(join(tmpdir(), 'studio-win-signature-'));
  roots.push(root);
  mkdirSync(join(root, 'resources'));
  writeFileSync(join(root, 'resources/app-update.yml'), config);
  return root;
}

test('Windows release check accepts matching packaged metadata and a valid installer signature', () => {
  for (const publisherName of [WINDOWS_PUBLISHER_NAME, [WINDOWS_PUBLISHER_NAME]]) {
    const root = packagedApp(JSON.stringify({ publisherName }));
    const inspected: string[] = [];
    assertWindowsUpdateSignature(root, 'installer.exe', (file) => {
      inspected.push(file);
      return { status: 0, publisher: WINDOWS_PUBLISHER_NAME };
    });
    expect(inspected).toEqual(['installer.exe']);
  }
});

test('Windows release check rejects stale, missing, disabled and widened packaged publisher names', () => {
  for (const config of [{ publisherName: 'On Off, Inc' }, {}, { publisherName: null }, { publisherName: [] }, { publisherName: [WINDOWS_PUBLISHER_NAME, 'On Off, Inc'] }, null]) {
    const root = packagedApp(JSON.stringify(config));
    expect(() => assertWindowsUpdateSignature(root, 'installer.exe', () => { throw new Error('must not inspect'); })).toThrow('Packaged Windows updater publisher');
  }
});

test('Windows release check fails closed on an invalid, absent or mismatched installer signature', () => {
  const root = packagedApp(JSON.stringify({ publisherName: WINDOWS_PUBLISHER_NAME }));
  for (const signature of [{ status: 0, publisher: 'On Off, Inc' }, { status: 0, publisher: 'Another Publisher' }, { status: 2, publisher: WINDOWS_PUBLISHER_NAME }, { status: 1, publisher: null }]) {
    expect(() => assertWindowsUpdateSignature(root, 'installer.exe', () => signature)).toThrow('valid signature');
  }
  expect(() => assertWindowsUpdateSignature(root, 'installer.exe', () => { throw new Error('PowerShell failed'); })).toThrow('PowerShell failed');
  rmSync(join(root, 'resources/app-update.yml'));
  expect(() => assertWindowsUpdateSignature(root, 'installer.exe')).toThrow();
});

test('signed Windows cuts check the staged installer before marking signing complete', () => {
  const source = readFileSync(join(import.meta.dirname, 'cut-windows.ts'), 'utf8');
  expect(source).toContain('if (officialBuild && !signing.unsigned)');
  expect(source.indexOf('    assertWindowsUpdateSignature(')).toBeLessThan(source.indexOf("writeFileSync(join(release, 'signing-win.txt')"));
});

test.skipIf(process.platform !== 'win32')('Windows Authenticode inspection reads a trusted system executable and rejects unsigned input', () => {
  const systemRoot = process.env['SystemRoot'];
  expect(systemRoot).toBeDefined();
  const signature = readWindowsSignature(join(systemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'));
  expect(signature.status).toBe(0);
  expect(signature.publisher).toBeString();
  expect(signature.publisher!.length).toBeGreaterThan(0);
  const root = packagedApp(JSON.stringify({ publisherName: WINDOWS_PUBLISHER_NAME }));
  const unsigned = join(root, "unsigned ' installer.ps1");
  writeFileSync(unsigned, "Write-Output 'unsigned'\n");
  expect(readWindowsSignature(unsigned).status).not.toBe(0);
  expect(() => assertWindowsUpdateSignature(root, unsigned)).toThrow('valid signature');
});
