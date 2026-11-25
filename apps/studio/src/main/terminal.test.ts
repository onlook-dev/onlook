import { expect, test } from 'bun:test';
import { openWindowsTerminal } from './terminal.js';

test('Windows opens an interactive Command Prompt in a new window', async () => {
  const calls: unknown[][] = [];
  await openWindowsTerminal(async (...args) => {
    calls.push(args);
    return { stdout: '', stderr: '' };
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.[0]).toMatch(/cmd\.exe$/);
  expect(calls[0]?.[1]).toEqual(['/d', '/s', '/c', 'start "" "%SystemRoot%\\System32\\cmd.exe" /d /k']);
  expect(calls[0]?.[2]).toMatchObject({ env: 'app-env', windowsHide: true, windowsVerbatimArguments: true, timeout: 5_000 });
});

test('a failed terminal launcher rejects instead of silently succeeding', async () => {
  await expect(openWindowsTerminal(async () => {
    throw new Error('launcher unavailable');
  })).rejects.toThrow('launcher unavailable');
});
