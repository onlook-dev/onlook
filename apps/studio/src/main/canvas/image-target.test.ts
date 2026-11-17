import { expect, it } from 'bun:test';
import type { CanvasNode, CanvasSnapshot } from '@studio/events';
import { createImageTargetResolver } from './image-target.js';

function bench(artifact = false) {
  const sender = { id: 7 } as Electron.WebContents;
  const session = {} as Electron.Session;
  const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  let url = artifact ? `studio-artifact://${id}/pages/index.html` : 'https://example.test/';
  let node: CanvasNode | undefined = { id: 'frame', pageId: 'pg', name: 'Design', kind: 'browser', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: url } };
  if (artifact) node = { ...node, kind: 'artifact', content: { artifactId: id, title: 'Artifact title' } };
  let revision = 1;
  let guestId: number | undefined = 10;
  let cwd: string | undefined = '/project';
  let admitted = true;
  let destroyed = false;
  let reads = 0;
  let duringRead: (() => void) | undefined;
  let duringArtifact: (() => void) | undefined;
  let navigate = (): void => {};
  let disposed = false;
  const guest = { id: 10, isDestroyed: () => destroyed, getType: () => 'webview' as const, hostWebContents: sender, session, getURL: () => url };
  const replacement = { ...guest, id: 11 };
  const resolver = createImageTargetResolver({
    admitted: () => admitted,
    workspace: () => cwd,
    snapshot: async (): Promise<CanvasSnapshot> => { reads += 1; duringRead?.(); return { doc: { schemaVersion: 1, docId: 'doc', revision: 1, pages: {}, nodes: node ? { frame: node } : {} } }; },
    boundGuest: () => guestId === undefined ? undefined : guestId === 10 ? guest : replacement,
    session: () => session,
    artifact: async () => { duringArtifact?.(); return { title: 'Artifact title', revision, pagePath: 'pages/index.html' }; },
    revision: () => revision,
    navigation: (_id, changed) => { navigate = changed; return () => { disposed = true; }; },
    capture: async () => new Uint8Array([1]),
  });
  return { resolver, sender, guest, reads: () => reads, disposed: () => disposed, reload: () => navigate(), changed: () => { revision += 1; }, navigate: () => { url += '/next'; }, remove: () => { node = undefined; }, resize: () => { node = { ...node!, width: 900 }; }, remirror: () => { guestId = 11; }, unmirror: () => { guestId = undefined; }, leave: () => { cwd = '/other'; }, destroy: () => { destroyed = true; }, revoke: () => { admitted = false; }, duringRead: (action: () => void) => { duringRead = action; }, duringArtifact: (action: () => void) => { duringArtifact = action; } };
}

it('resolves the sender-owned live browser and Artifact with their authoritative names', async () => {
  for (const artifact of [false, true]) {
    const test = bench(artifact);
    const target = await test.resolver({ sender: test.sender }, 'frame');
    expect(target?.title).toBe(artifact ? 'Artifact title' : 'Design');
    expect(await target?.current()).toBe(true);
    target?.dispose?.();
    expect(test.disposed()).toBe(true);
  }
});

it('refuses a foreign host or partition even with a binding', async () => {
  for (const foreignHost of [true, false]) {
    const test = bench();
    if (foreignHost) test.guest.hostWebContents = {} as Electron.WebContents;
    else test.guest.session = {} as Electron.Session;
    const target = await test.resolver({ sender: test.sender }, 'frame');
    expect(await target?.current()).toBe(false);
    target?.dispose?.();
  }
});

it('invalidates deleted, resized, replaced, navigated, reloaded and revoked targets', async () => {
  for (const change of ['remove', 'resize', 'remirror', 'navigate', 'reload', 'leave', 'destroy', 'revoke', 'changed'] as const) {
    const test = bench(true);
    const target = await test.resolver({ sender: test.sender }, 'frame');
    test[change]();
    expect(await target?.current(), change).toBe(false);
    target?.dispose?.();
  }
});

it('rechecks synchronous guest facts after the awaited snapshot', async () => {
  for (const change of ['navigate', 'changed', 'reload', 'destroy', 'revoke', 'leave'] as const) {
    const test = bench(true);
    const target = await test.resolver({ sender: test.sender }, 'frame');
    test.duringRead(test[change]);
    expect(await target?.current(), change).toBe(false);
    target?.dispose?.();
  }
});

it('does not read a canvas for an unadmitted sender or resolve a missing binding', async () => {
  const test = bench();
  test.revoke();
  expect(await test.resolver({ sender: test.sender }, 'frame')).toBeUndefined();
  expect(test.reads()).toBe(0);
  const missing = bench();
  missing.unmirror();
  expect(await missing.resolver({ sender: missing.sender }, 'frame')).toBeUndefined();
});

it('checks the final canvas after awaited Artifact page validation', async () => {
  for (const change of ['remove', 'resize', 'navigate', 'changed'] as const) {
    const test = bench(true);
    const target = await test.resolver({ sender: test.sender }, 'frame');
    test.duringArtifact(test[change]);
    expect(await target?.current(), change).toBe(false);
    target?.dispose?.();
  }
});
