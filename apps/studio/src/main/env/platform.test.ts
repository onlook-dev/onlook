import { afterEach, expect, test } from 'bun:test';
import { executableName, hostPlatform, hostSshPath, isLinux, isMac, isWindows, lsofPath, nullDevice, pathSeparator, systemExecutable, windowsLocalAppData } from './platform.js';

const real = Object.getOwnPropertyDescriptor(process, 'platform')!;
const realRoot = process.env['SystemRoot'];
const realLocal = process.env['LOCALAPPDATA'];

function on(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { ...real, value: platform });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', real);
  if (realRoot === undefined) delete process.env['SystemRoot'];
  else process.env['SystemRoot'] = realRoot;
  if (realLocal === undefined) delete process.env['LOCALAPPDATA'];
  else process.env['LOCALAPPDATA'] = realLocal;
});

test('each question reads the platform when it is asked', () => {
  on('win32');
  expect([hostPlatform(), isWindows(), isMac(), isLinux()]).toEqual(['win32', true, false, false]);
  on('darwin');
  expect([hostPlatform(), isWindows(), isMac(), isLinux()]).toEqual(['darwin', false, true, false]);
  on('linux');
  expect([hostPlatform(), isWindows(), isMac(), isLinux()]).toEqual(['linux', false, false, true]);
});

test('a named platform is judged instead of the host', () => {
  on('darwin');
  expect([isWindows('win32'), isMac('win32'), isLinux('linux'), isMac('darwin')]).toEqual([true, false, true, true]);
  expect([executableName('claude', 'win32'), executableName('claude', 'linux')]).toEqual(['claude.exe', 'claude']);
});

test('Windows keeps its own null device, separator, executable names and system tools', () => {
  on('win32');
  process.env['SystemRoot'] = 'D:\\Win';
  expect(nullDevice()).toBe('NUL');
  expect(pathSeparator()).toBe('\\');
  expect(executableName('codex')).toBe('codex.exe');
  expect(lsofPath()).toBe('/usr/sbin/lsof');
  expect(hostSshPath()).toBe(systemExecutable('OpenSSH/ssh.exe').replaceAll('\\', '/'));
  expect(hostSshPath()).not.toContain('\\');
  expect(hostSshPath()).toContain('D:/Win');
});

test('a missing SystemRoot falls back to the default Windows directory', () => {
  delete process.env['SystemRoot'];
  expect(systemExecutable('tar.exe')).toContain('C:\\Windows');
  expect(systemExecutable('tar.exe')).toContain('System32');
});

test('macOS and Linux answers', () => {
  on('darwin');
  expect([nullDevice(), pathSeparator(), executableName('codex'), lsofPath(), hostSshPath()]).toEqual(['/dev/null', '/', 'codex', '/usr/sbin/lsof', '/usr/bin/ssh']);
  on('linux');
  expect([nullDevice(), pathSeparator(), executableName('codex'), lsofPath(), hostSshPath()]).toEqual(['/dev/null', '/', 'codex', '/usr/bin/lsof', '/usr/bin/ssh']);
});

test("Windows' per-user data folder is read as it is set, an empty value included", () => {
  process.env['LOCALAPPDATA'] = 'D:\\Local';
  expect(windowsLocalAppData()).toBe('D:\\Local');
  process.env['LOCALAPPDATA'] = '';
  expect(windowsLocalAppData()).toBe('');
  delete process.env['LOCALAPPDATA'];
  expect(windowsLocalAppData()).toBeUndefined();
});
