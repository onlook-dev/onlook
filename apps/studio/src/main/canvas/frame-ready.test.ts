import { expect, it } from 'bun:test';
import type { BrowserNode, CanvasSnapshot } from '@studio/events';
import { createFrameBindings } from '../frames/bindings.js';
import { createFrameReadyHandler } from './frame-ready.js';

function fixture() {
  const sender = { id: 7 } as Electron.WebContents;
  const node: BrowserNode = { id: 'frame', pageId: 'page', name: 'Design', kind: 'browser', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: 'http://localhost:3000/' } };
  const state = { admitted: true, cwd: '/project' as string | undefined, duringSnapshot: () => {}, node: node as BrowserNode | undefined };
  const bindings = createFrameBindings();
  const guest = { id: 10, hostWebContents: sender, isDestroyed: () => false };
  const params = { src: bindings.issue(sender, 'doc', node, node.content.homeUrl)! };
  bindings.prepare(sender, {}, params);
  bindings.created(guest);
  const handler = createFrameReadyHandler({
    admitted: event => event.sender === sender && state.admitted,
    workspace: id => id === sender.id ? state.cwd : undefined,
    snapshot: async (): Promise<CanvasSnapshot> => {
      state.duringSnapshot();
      return { doc: { schemaVersion: 1, docId: 'doc', revision: 1, pages: {}, nodes: state.node ? { frame: state.node } : {} } };
    },
    readiness: (owner, docId, current, webContentsId) => bindings.readiness(owner, docId, current, webContentsId),
  });
  const ready = async (webContentsId = guest.id) => await handler({ sender }, { nodeId: node.id, webContentsId }) === 'ready';
  const activate = (attachedFirst = true) => {
    if (attachedFirst) bindings.attached(sender, guest);
    bindings.navigating(guest, params.src);
    const launched = bindings.loaded(guest, params.src);
    if (attachedFirst) expect(launched).toBe(node.content.homeUrl);
    else expect(bindings.attached(sender, guest)).toBe(node.content.homeUrl);
    expect(bindings.activate(guest, node.content.homeUrl)).toBe(true);
    bindings.navigating(guest, node.content.homeUrl);
  };
  return { sender, node, state, bindings, guest, params, ready, activate, handler };
}

it('confirms destination readiness only after the native canonical commit, never at bootstrap dom-ready', async () => {
  const test = fixture();
  expect(await test.ready()).toBe(false);
  test.activate();
  expect(await test.ready()).toBe(false);
  test.bindings.navigated(test.guest, test.node.content.homeUrl);
  expect(await test.ready()).toBe(true);
  expect(await test.ready(11)).toBe(false);
  test.bindings.navigating(test.guest, 'http://localhost:3000/next');
  test.bindings.navigated(test.guest, 'http://localhost:3000/next');
  expect(await test.ready()).toBe(true);
});

for (const order of ['attached-first', 'loaded-first']) {
  it(`recovers an initially redirected live guest through a fresh accepted binding (${order})`, async () => {
    const test = fixture();
    const status = (webContentsId = test.guest.id) => test.handler({ sender: test.sender }, { nodeId: test.node.id, webContentsId });
    expect(await status()).toBe('pending');
    test.activate(order === 'attached-first');
    expect(await status()).toBe('pending');
    test.bindings.navigating(test.guest, 'http://localhost:3000/login');
    test.bindings.navigated(test.guest, 'http://localhost:3000/login');
    expect(await status()).toBe('retired');
    expect(test.bindings.guest(test.sender, 'doc', test.node)).toBeUndefined();
    test.bindings.navigated(test.guest, test.node.content.homeUrl);
    expect(await status()).toBe('retired');
    expect(await status(99)).toBe('pending');
    const next = { ...test.node, content: { homeUrl: 'http://localhost:3000/corrected' } };
    const before: NonNullable<CanvasSnapshot['doc']> = { schemaVersion: 1, docId: 'doc', revision: 1, pages: {}, nodes: { frame: test.node } };
    test.bindings.committed(before, { ...before, revision: 2, nodes: { frame: next } }, { type: 'set-home-url', id: next.id, homeUrl: next.content.homeUrl });
    test.state.node = next;
    expect(await status()).toBe('retired');
    const params = { src: test.bindings.issue(test.sender, 'doc', next, next.content.homeUrl)! };
    test.bindings.prepare(test.sender, {}, params);
    const replacement = { id: 11, hostWebContents: test.sender, isDestroyed: () => false };
    test.bindings.created(replacement);
    if (order === 'attached-first') test.bindings.attached(test.sender, replacement);
    test.bindings.navigating(replacement, params.src);
    test.bindings.loaded(replacement, params.src);
    if (order === 'loaded-first') test.bindings.attached(test.sender, replacement);
    expect(await status()).toBe('pending');
    expect(await status(11)).toBe('pending');
    expect(test.bindings.activate(replacement, next.content.homeUrl)).toBe(true);
    test.bindings.navigating(replacement, next.content.homeUrl);
    test.bindings.navigated(replacement, next.content.homeUrl);
    expect(await status(11)).toBe('ready');
    expect(test.bindings.guest(test.sender, 'doc', next)).toBe(replacement);
    test.bindings.navigating(replacement, 'http://localhost:3000/next');
    test.bindings.navigated(replacement, 'http://localhost:3000/next');
    expect(test.bindings.guest(test.sender, 'doc', next)).toBe(replacement);
    expect(await status()).toBe('pending');
  });
}

it('does not accept a genuine redirect, retired guest, removed node or substituted node identity as readiness', async () => {
  const redirected = fixture();
  redirected.activate();
  redirected.bindings.navigating(redirected.guest, 'http://localhost:3000/redirected');
  redirected.bindings.navigated(redirected.guest, 'http://localhost:3000/redirected');
  expect(await redirected.ready()).toBe(false);
  const test = fixture();
  test.activate();
  test.bindings.navigated(test.guest, test.node.content.homeUrl);
  test.state.node = { ...test.node, pageId: 'different-page' };
  expect(await test.ready()).toBe(false);
  test.state.node = undefined;
  expect(await test.ready()).toBe(false);
  test.state.node = test.node;
  test.bindings.destroyed(test.guest);
  expect(await test.ready()).toBe(false);
});

it('never reports terminal retirement for a substituted guest or stale node identity', async () => {
  const test = fixture();
  test.activate();
  test.bindings.navigating(test.guest, 'http://localhost:3000/login');
  test.bindings.navigated(test.guest, 'http://localhost:3000/login');
  const status = (webContentsId = test.guest.id) => test.handler({ sender: test.sender }, { nodeId: test.node.id, webContentsId });
  expect(await status()).toBe('retired');
  expect(await status(11)).toBe('pending');
  test.state.node = { ...test.node, pageId: 'replacement-page' };
  expect(await status()).toBe('pending');
  test.state.node = undefined;
  expect(await status()).toBe('pending');
  test.state.node = test.node;
  test.bindings.issue(test.sender, 'doc', test.node, test.node.content.homeUrl);
  expect(await status()).toBe('pending');
});

it('rechecks admission and workspace after the readiness snapshot and rejects invalid capabilities', async () => {
  const test = fixture();
  test.activate();
  test.bindings.navigated(test.guest, test.node.content.homeUrl);
  test.state.duringSnapshot = () => { test.state.admitted = false; };
  expect(await test.ready()).toBe(false);
  test.state.admitted = true;
  test.state.duringSnapshot = () => { test.state.cwd = '/other'; };
  expect(await test.ready()).toBe(false);
  expect(await test.handler({ sender: { id: test.sender.id } as Electron.WebContents }, { nodeId: 'frame', webContentsId: 10 })).toBe('pending');
  for (const webContentsId of [0, -1, NaN, 1.2, Infinity]) expect(await test.ready(webContentsId)).toBe(false);
});
