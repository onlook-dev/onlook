import { expect, it } from 'bun:test';
import type { CanvasNode, CanvasSnapshot } from '@studio/events';
import { createFrameBindings } from '../frames/bindings.js';
import { createFrameMirror } from './mirror.js';
import { createImageTargetResolver } from './image-target.js';
import { createImageExportHandler } from './image-export.js';

function setup(artifact = false) {
  const sender = { id: 7 } as Electron.WebContents;
  const session = {} as Electron.Session;
  const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  const bindings = createFrameBindings();
  const mirror = createFrameMirror();
  const first: CanvasNode = { id: 'a', pageId: 'page', name: 'Frame A', kind: 'browser', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: 'https://same.test/' } };
  const second: CanvasNode = { ...first, id: 'b', name: 'Frame B' };
  const nodes: Record<string, CanvasNode> = artifact ? {
    a: { ...first, kind: 'artifact', content: { artifactId, title: 'Artifact', pagePath: 'pages/a.html' } },
    b: { ...second, kind: 'artifact', content: { artifactId, title: 'Artifact', pagePath: 'pages/b.html' } },
  } : { a: first, b: second };
  const makeGuest = (node: CanvasNode, id: number) => {
    const url = node.kind === 'artifact' ? `studio-artifact://${artifactId}/${node.content.pagePath}` : 'https://same.test/';
    const preferences: Electron.WebPreferences = {};
    const params = { src: bindings.issue(sender, 'doc', node, url)! };
    expect(bindings.prepare(sender, preferences, params)).toBe(true);
    let currentUrl = params.src;
    const guest = { id, hostWebContents: sender, session, isDestroyed: () => false, getType: () => 'webview' as const, getURL: () => currentUrl };
    bindings.created(guest);
    expect(bindings.navigating(guest, params.src)).toBeUndefined();
    expect(bindings.attached(sender, guest)).toBeUndefined();
    expect(bindings.loaded(guest, params.src)).toBe(url);
    expect(bindings.guest(sender, 'doc', node, url)).toBeUndefined();
    expect(bindings.activate(guest, url)).toBe(true);
    bindings.navigating(guest, url);
    currentUrl = url;
    bindings.navigated(guest, url);
    expect(bindings.guest(sender, 'doc', node, url)).toBe(guest);
    return guest;
  };
  const guestA = makeGuest(nodes['a']!, 10);
  const guestB = makeGuest(nodes['b']!, 11);
  const captured: number[] = [];
  const writes: string[] = [];
  const target = createImageTargetResolver({
    admitted: () => true,
    workspace: () => '/project',
    snapshot: async (): Promise<CanvasSnapshot> => ({ doc: { schemaVersion: 1, docId: 'doc', revision: 1, nodes, pages: {} } }),
    boundGuest: (owner, docId, node, pageUrl) => bindings.guest(owner, docId, node, pageUrl) as typeof guestA | undefined,
    session: () => session,
    artifact: async (_id, pagePath) => ({ title: 'Artifact', revision: 1, pagePath: pagePath! }),
    revision: () => 1,
    navigation: () => () => {},
    capture: async guest => { captured.push(guest.id); return new Uint8Array([1]); },
  });
  const save = createImageExportHandler({ admitted: () => true, target, choose: async name => `/exports/${name}`, write: path => { writes.push(path); } });
  const forge = () => mirror.note(sender.id, { docId: 'doc', frames: [{ id: 'a', currentUrl: guestB.getURL(), health: 'live', title: 'Frame A', webContentsId: guestB.id }], console: [] });
  return { sender, bindings, mirror, guestA, guestB, target, save, captured, writes, forge };
}

it('exports A, never B, when a renderer forges an equal-sized same-host/session A-to-B mirror', async () => {
  const test = setup();
  test.forge();
  expect(test.guestA.hostWebContents).toBe(test.guestB.hostWebContents);
  expect(test.guestA.session).toBe(test.guestB.session);
  expect(test.guestA.getURL()).toBe(test.guestB.getURL());
  expect(test.mirror.peek('doc', 'a')?.webContentsId).toBe(test.guestB.id);
  expect((await test.save({ sender: test.sender }, { nodeId: 'a', format: 'png' })).outcome).toBe('saved');
  expect(test.captured).toEqual([test.guestA.id]);
  expect(test.writes).toEqual(['/exports/Frame A.png']);
});

it('fails closed without A’s native binding even when B is a genuine same-owner guest', async () => {
  const test = setup();
  test.bindings.destroyed(test.guestA);
  test.forge();
  expect((await test.save({ sender: test.sender }, { nodeId: 'a', format: 'jpeg' })).outcome).toBe('refused');
  expect(test.captured).toEqual([]);
  expect(test.writes).toEqual([]);
});

it('keeps two pages of the same Artifact independently bound despite a forged mirror', async () => {
  const test = setup(true);
  test.forge();
  expect((await test.save({ sender: test.sender }, { nodeId: 'a', format: 'png' })).outcome).toBe('saved');
  expect(test.captured).toEqual([test.guestA.id]);
  test.bindings.destroyed(test.guestA);
  expect((await test.save({ sender: test.sender }, { nodeId: 'a', format: 'png' })).outcome).toBe('refused');
  expect(test.captured).toEqual([test.guestA.id]);
});
