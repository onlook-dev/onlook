import { expect, test } from 'bun:test';
import { CHANNELS, IPC_EMIT, IPC_INVOKE, IPC_SEND, type EmitRow, type InvokeRow, type SendRow, type ViewRole } from '@studio/events';
import { bridgeFor, type BridgeTransport } from './bridge.js';

function recorder(answer: () => Promise<unknown> = () => Promise.resolve('answer')) {
  const calls: unknown[][] = [];
  const listeners = new Map<string, (payload: unknown) => void>();
  const ipc: BridgeTransport = {
    invoke: (channel, ...payload) => { calls.push(['invoke', channel, ...payload]); return answer(); },
    send: (channel, ...payload) => { calls.push(['send', channel, ...payload]); },
    subscribe: (channel, listener) => { listeners.set(channel, listener); return () => { listeners.delete(channel); }; },
  };
  return { calls, listeners, ipc };
}

const rows: readonly (InvokeRow | SendRow | EmitRow)[] = [...Object.values(CHANNELS.invoke), ...Object.values(CHANNELS.send), ...Object.values(CHANNELS.emit)];
const named = (view: ViewRole, gated: boolean): string[] =>
  rows.flatMap((row) => (row.gate !== undefined && !gated ? [] : row[view] ?? [])).sort();

test('a view gets exactly the methods the table names for it', () => {
  const { ipc } = recorder();
  expect(Object.keys(bridgeFor('tab', ipc, { diagnostics: false })).sort()).toEqual(named('tab', false));
  expect(Object.keys(bridgeFor('chrome', ipc, { diagnostics: false })).sort()).toEqual(named('chrome', false));
  expect(Object.keys(bridgeFor('chrome', ipc, { diagnostics: true })).sort()).toEqual(named('chrome', true));
  expect(Object.keys(bridgeFor('taskManager', ipc, { diagnostics: false })).sort()).toEqual(named('taskManager', false));
  expect(named('chrome', true).length).toBeGreaterThan(named('chrome', false).length);
});

test('arguments cross as the one payload the row declares', async () => {
  const { calls, ipc } = recorder();
  const tab = bridgeFor('tab', ipc, { diagnostics: false });
  const chrome = bridgeFor('chrome', ipc, { diagnostics: false });
  const stray = { stray: true };
  await (tab.appInfo as (...args: unknown[]) => Promise<unknown>)(stray);
  await tab.agentSnapshot();
  await tab.agentSnapshot({ sinceSeq: 3 });
  await (tab.codexSignIn as (request: unknown) => Promise<unknown>)(null);
  chrome.renameTab('t1', 'Home');
  chrome.newTab();
  expect(calls).toEqual([
    ['invoke', IPC_INVOKE.appInfo],
    ['invoke', IPC_INVOKE.agentSnapshot, {}],
    ['invoke', IPC_INVOKE.agentSnapshot, { sinceSeq: 3 }],
    ['invoke', IPC_INVOKE.codexSignIn, {}],
    ['send', IPC_SEND.tabsRename, { tabId: 't1', name: 'Home' }],
    ['send', IPC_SEND.tabsNew],
  ]);
});

test('a refusal reaches the caller unless the row ignores it', async () => {
  const { ipc } = recorder(() => Promise.reject(new Error('refused')));
  const tab = bridgeFor('tab', ipc, { diagnostics: false });
  await expect(tab.appInfo()).rejects.toThrow('refused');
  expect(await tab.notifyProjectSelected({ path: '/w' })).toBeUndefined();
});

test('a subscription hears each payload until it is undone', () => {
  const { listeners, ipc } = recorder();
  const tab = bridgeFor('tab', ipc, { diagnostics: false });
  const heard: unknown[][] = [];
  const undo = tab.onPanelsChanged((...args) => { heard.push(args); });
  const undoBare = tab.onSettingsOpen((...args: unknown[]) => { heard.push(args); });
  listeners.get(IPC_EMIT.panelsChanged)!('widths');
  listeners.get(IPC_EMIT.settingsOpen)!('dropped');
  expect(heard).toEqual([['widths'], []]);
  undo();
  undoBare();
  expect(listeners.size).toBe(0);
});
