import { expect, test } from 'bun:test';
import { executableCommand } from './windows.js';
import { windowsJobCommand } from './windows-job.js';
import { requiresShellApproval } from '../agent-host/shell-approval.js';
import { parseWindowsProcesses } from '../server/windows.js';
import { codexPlatformTag } from '../codex/paths.js';

test('Windows shell commands cannot use a Bash wrapper to bypass approval', () => {
  expect(requiresShellApproval('Bash', 'win32')).toBe(true);
  expect(requiresShellApproval('PowerShell', 'win32')).toBe(true);
  expect(requiresShellApproval('powershell', 'win32')).toBe(true);
  expect(requiresShellApproval('Bash', 'darwin')).toBe(false);
  expect(requiresShellApproval('Read', 'win32')).toBe(false);
});

test('batch launch quotes the executable and arguments without enabling autorun or delayed expansion', () => {
  const command = executableCommand('C:\\Program Files\\node & tools\\npm.cmd', ['install'], 'win32');
  expect(command.args).toEqual(['/d', '/s', '/v:off', '/c', '""C:\\Program Files\\node & tools\\npm.cmd" "install""']);
  expect(command.windowsVerbatimArguments).toBe(true);
  expect(() => executableCommand('npm.cmd', ['%UNSAFE%'], 'win32')).toThrow();
  expect(executableCommand('bun.exe', ['install'], 'win32')).toEqual({ bin: 'bun.exe', args: ['install'] });
});

test('Windows CLI jobs keep untrusted arguments out of PowerShell source and attach atomically at creation', () => {
  const command = windowsJobCommand('C:\\Tools\\node.exe', ['-e', 'console.log("hello & $world")', 'trailing\\']);
  const script = Buffer.from(command.args.at(-1)!, 'base64').toString('utf16le');
  expect(script).not.toContain('console.log');
  expect(script).toContain('limits.basic.flags = 0x2000');
  expect(script).toContain('new IntPtr(0x0002000D)');
  expect(script).toContain('0x00080000 | 0x08000000');
  expect(script.indexOf('Check(UpdateProcThreadAttribute(')).toBeLessThan(script.indexOf('Check(CreateProcess('));
  expect(script).toContain('CloseHandle(job)');
  const line = Buffer.from(script.match(/FromBase64String\('([^']+)'\)/)![1]!, 'base64').toString('utf8');
  expect(line).toContain('"console.log(\\"hello & $world\\")"');
  expect(line).toEndWith('"trailing\\\\"');
});

test('unreadable or fabricated process identities never become owned processes', () => {
  const own = { pid: 123, cwd: 'C:\\Projects\\Onlook', creationTime: '134052000000000001', command: 'node', ports: [3000] };
  expect(parseWindowsProcesses(JSON.stringify([own, { ...own, cwd: null }, { ...own, cwd: 'relative' }, { ...own, pid: -1 }, { ...own, ports: ['3000'] }]))).toEqual([own]);
  expect(() => parseWindowsProcesses('{}')).toThrow();
  expect(codexPlatformTag('win32', 'x64')).toBe('win32-x64');
  expect(codexPlatformTag('win32', 'arm64')).toBeUndefined();
  expect(codexPlatformTag('darwin', 'arm64')).toBe('darwin-arm64');
});
