import { describe, expect, it } from 'bun:test';
import type { DebugState, DebugTabState } from '@studio/events';
import { gateComplaint, gateTabId, pickTarget, type CdpTarget } from './cdp.js';

const target = (type: string, url: string, id = url): CdpTarget => ({ id, type, title: 'Onlook', url });

const CHROME = target('page', 'file:///out/renderer/chrome.html');
const TAB = target('page', 'file:///out/renderer/index.html?tab=t1#debug');
const GUEST = target('webview', 'http://localhost:3000/');
const WORKER = target('worker', 'file:///out/main/worker.js');

describe('pickTarget', () => {
  it('finds a page and a guest webview by URL part', () => {
    expect(pickTarget([WORKER, CHROME, TAB, GUEST], '?tab=t1').id).toBe(TAB.id);
    expect(pickTarget([WORKER, CHROME, TAB, GUEST], 'localhost:3000').id).toBe(GUEST.id);
  });

  it('honours the types a caller asks for', () => {
    expect(pickTarget([GUEST, TAB], 'html', ['page']).id).toBe(TAB.id);
    expect(() => pickTarget([GUEST, TAB], 'localhost', ['page'])).toThrow();
    expect(() => pickTarget([GUEST, TAB], '?tab=t1', ['webview'])).toThrow();
  });

  it('never returns a target that is not a view', () => {
    expect(() => pickTarget([WORKER], 'worker.js')).toThrow();
  });
});

const tab = (id: string): DebugTabState =>
  ({ id, isActive: false, webContentsId: null, server: null, session: null, canvas: null }) as unknown as DebugTabState;

const state = (tabs: DebugTabState[], activeTabId: string | null = null): DebugState =>
  ({ tabs, activeTabId }) as unknown as DebugState;

describe('gateTabId', () => {
  it('prefers the active tab and falls back to the first', () => {
    expect(gateTabId(state([tab('a'), tab('b')], 'b'))).toBe('b');
    expect(gateTabId(state([tab('a'), tab('b')]))).toBe('a');
    expect(gateTabId(state([tab('a')], 'gone'))).toBe('a');
    expect(gateTabId(state([]))).toBeNull();
  });
});

describe('gateComplaint', () => {
  it('is silent only once a tab answers the bridge', () => {
    expect(gateComplaint({ state: null, bridgeInstalled: false })).not.toBeNull();
    expect(gateComplaint({ state: state([tab('a')]), bridgeInstalled: true })).toBeNull();
    expect(gateComplaint({ state: state([tab('a')]), bridgeInstalled: false })).not.toBeNull();
  });
});
