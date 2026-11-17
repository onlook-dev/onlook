import { expect, test } from 'bun:test';
import type { MachineHelpId } from '@studio/events';
import { openMachineHelp, type MachineHelpDeps } from './machine-help.js';

function deps(partial: Partial<MachineHelpDeps> = {}): MachineHelpDeps & { paths: string[]; urls: string[] } {
  const paths: string[] = [];
  const urls: string[] = [];
  return {
    platform: 'darwin',
    home: '/var/example-home',
    exists: () => false,
    openPath: async (path) => { paths.push(path); return ''; },
    openExternal: async (url) => { urls.push(url); },
    paths,
    urls,
    ...partial,
  };
}

test('the agent opens in its own app when it is installed', async () => {
  const help = deps({ exists: (path) => path === '/Applications/Claude.app' });
  expect(await openMachineHelp('claude', help)).toBe(true);
  expect(help.paths).toEqual(['/Applications/Claude.app']);
  expect(help.urls).toEqual([]);
});

test('an app installed for this account alone is still found', async () => {
  const help = deps({ exists: (path) => path === '/var/example-home/Applications/ChatGPT.app' });
  expect(await openMachineHelp('chatgpt', help)).toBe(true);
  expect(help.paths).toEqual(['/var/example-home/Applications/ChatGPT.app']);
});

test('no app, and the agent opens on the web instead', async () => {
  const help = deps();
  expect(await openMachineHelp('chatgpt', help)).toBe(true);
  expect(help.paths).toEqual([]);
  expect(help.urls).toEqual(['https://chatgpt.com/']);
});

test('an app that refuses to open falls back to the web', async () => {
  const help = deps({ exists: () => true, openPath: async () => 'Claude.app is damaged' });
  expect(await openMachineHelp('claude', help)).toBe(true);
  expect(help.urls).toEqual(['https://claude.ai/new']);
});

test('off a Mac the apps are not even looked for', async () => {
  const help = deps({ platform: 'win32', exists: () => true });
  expect(await openMachineHelp('claude', help)).toBe(true);
  expect(help.paths).toEqual([]);
  expect(help.urls).toEqual(['https://claude.ai/new']);
});

test('Activity Monitor is a Mac utility, and nowhere else is told it opened', async () => {
  const mac = deps();
  expect(await openMachineHelp('activity-monitor', mac)).toBe(true);
  expect(mac.paths).toEqual(['/System/Applications/Utilities/Activity Monitor.app']);
  expect(await openMachineHelp('activity-monitor', deps({ platform: 'linux' }))).toBe(false);
});

test('the developer tools page is the same page on every platform', async () => {
  const help = deps({ platform: 'linux' });
  expect(await openMachineHelp('developer-tools', help)).toBe(true);
  expect(help.urls).toEqual(['https://developer.apple.com/download/all/']);
});

test('an id from outside the vocabulary opens nothing', async () => {
  const help = deps();
  expect(await openMachineHelp('finder' as MachineHelpId, help)).toBe(false);
  expect(help.paths).toEqual([]);
  expect(help.urls).toEqual([]);
});
