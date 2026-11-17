import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { machOArchs, packagedArchProblems } from './app-arch.js';
import { packagedWindowsProblems, peArch } from './windows-arch.js';
import { windowsSigning } from './windows-signing.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function macho(arch: 'x64' | 'arm64'): Buffer {
  const header = Buffer.alloc(32);
  header.writeUInt32LE(0xfeedfacf);
  header.writeUInt32LE(arch === 'x64' ? 0x01000007 : 0x0100000c, 4);
  return header;
}

function pe(arch: 'x64' | 'arm64'): Buffer {
  const header = Buffer.alloc(128);
  header.write('MZ'); header.writeUInt32LE(64, 0x3c); header.writeUInt32LE(0x4550, 64); header.writeUInt16LE(arch === 'x64' ? 0x8664 : 0xaa64, 68);
  return header;
}

function windowsApp() {
  const root = mkdtempSync(join(tmpdir(), 'studio-win-arch-'));
  roots.push(root);
  const modules = 'resources/app.asar.unpacked/node_modules';
  const files = ['Onlook.exe', `${modules}/@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe`, `${modules}/node-pty/prebuilds/win32-x64/conpty.node`, `${modules}/node-pty/prebuilds/win32-x64/conpty_console_list.node`];
  for (const file of files) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), pe('x64')); }
  return { root, modules, files };
}

test('Mach-O inspection rejects truncated fat headers and detects both Mac architectures', () => {
  expect(machOArchs(macho('x64'))).toEqual(['x64']);
  expect(machOArchs(macho('arm64'))).toEqual(['arm64']);
  const fat = Buffer.alloc(48);
  fat.writeUInt32BE(0xcafebabe);
  fat.writeUInt32BE(2, 4);
  fat.writeUInt32BE(0x01000007, 8);
  fat.writeUInt32BE(0x0100000c, 28);
  expect(machOArchs(fat)).toEqual(['x64', 'arm64']);
  expect(machOArchs(fat.subarray(0, 28))).toEqual([]);
  expect(machOArchs(new Uint8Array(2))).toEqual([]);
});

test('packaged validation rejects missing Claude and wrong-priority PTY modules', () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-arch-'));
  roots.push(root);
  const modules = 'Contents/Resources/app.asar.unpacked/node_modules';
  const files = ['Contents/MacOS/Onlook', `${modules}/@anthropic-ai/claude-agent-sdk-darwin-x64/claude`, `${modules}/node-pty/prebuilds/darwin-x64/pty.node`, `${modules}/node-pty/prebuilds/darwin-x64/spawn-helper`];
  for (const file of files) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), macho('x64')); }
  expect(packagedArchProblems(root, 'x64')).toEqual([]);
  rmSync(join(root, files[1]!));
  expect(packagedArchProblems(root, 'x64').join()).toContain('Claude is missing');
  mkdirSync(join(root, modules, 'node-pty/build/Release'), { recursive: true });
  writeFileSync(join(root, modules, 'node-pty/build/Release/pty.node'), macho('arm64'));
  expect(packagedArchProblems(root, 'x64').join()).toContain('terminal module is arm64');
});

test('Windows signing never silently falls back to unsigned', () => {
  expect(() => windowsSigning({})).toThrow('ONLOOK_WINDOWS_ALLOW_UNSIGNED=1');
  const unsigned = windowsSigning({ ONLOOK_WINDOWS_ALLOW_UNSIGNED: '1' });
  expect(unsigned).toMatchObject({ unsigned: true, forceCodeSigning: false, win: { signExecutable: false, verifyUpdateCodeSignature: false } });
  expect(unsigned.win).not.toHaveProperty('signAndEditExecutable');
  expect(() => windowsSigning({ ONLOOK_WINDOWS_ALLOW_UNSIGNED: 'true' })).toThrow();
});

test('PE inspection distinguishes x64 and ARM64 and rejects invalid offsets', () => {
  const header = pe('x64');
  expect(peArch(header)).toBe('x64');
  header.writeUInt16LE(0xaa64, 68);
  expect(peArch(header)).toBe('arm64');
  header.writeUInt32LE(9999, 0x3c);
  expect(peArch(header)).toBeUndefined();
});

test('packaged Windows validation accepts the complete x64 native payload', () => {
  const { root } = windowsApp();
  expect(packagedWindowsProblems(root, 'Onlook')).toEqual([]);
});

test('packaged Windows validation rejects missing app, Claude and console-list binaries', () => {
  for (const index of [0, 1, 3]) {
    const { root, files } = windowsApp();
    const path = join(root, files[index]!);
    rmSync(path);
    expect(packagedWindowsProblems(root, 'Onlook')).toContain(`Missing Windows executable: ${path}`);
  }
});

test('packaged Windows validation rejects a missing terminal module', () => {
  const { root, files } = windowsApp();
  rmSync(join(root, files[2]!));
  expect(packagedWindowsProblems(root, 'Onlook')).toContain('No Windows terminal module found');
});

test('packaged Windows validation rejects ARM64 or malformed binaries at every required path', () => {
  for (const header of [pe('arm64'), Buffer.from('not a PE executable')]) {
    for (const index of [0, 1, 2, 3]) {
      const { root, files } = windowsApp();
      const path = join(root, files[index]!);
      writeFileSync(path, header);
      expect(packagedWindowsProblems(root, 'Onlook')).toContain(`Not an x64 PE executable: ${path}`);
    }
  }
});

test('packaged Windows validation rejects wrong-priority build modules despite valid prebuilds', () => {
  for (const directory of ['Release', 'Debug']) {
    const { root, modules } = windowsApp();
    const build = join(root, modules, 'node-pty/build', directory);
    mkdirSync(build, { recursive: true });
    for (const name of ['conpty.node', 'conpty_console_list.node']) writeFileSync(join(build, name), pe('arm64'));
    const problems = packagedWindowsProblems(root, 'Onlook');
    for (const name of ['conpty.node', 'conpty_console_list.node']) expect(problems).toContain(`Not an x64 PE executable: ${join(build, name)}`);
  }
});

test('packaged Windows validation rejects a foreign Claude platform package', () => {
  const { root, modules } = windowsApp();
  mkdirSync(join(root, modules, '@anthropic-ai/claude-agent-sdk-win32-arm64'), { recursive: true });
  expect(packagedWindowsProblems(root, 'Onlook')).toContain('Foreign Claude package: claude-agent-sdk-win32-arm64');
});
