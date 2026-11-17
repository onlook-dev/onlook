import { expect, it } from 'bun:test';
import type { ArtifactNode } from '@studio/events';
import { artifactPageUrl } from '@studio/events';
import { artifactPointScript, createArtifactPickHandler } from './pick.js';

const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const pagePath = 'pages/index.html';
const node: ArtifactNode & {artifactUpdatedAt: string} = { kind: 'artifact', id: 'node', artifactUpdatedAt: 'one', pageId: 'page', name: '', x: 0, y: 0, width: 480, height: 640, order: 0, content: { artifactId, title: 'Idea', pagePath } };
const picked = { tag: 'h1', domPath: 'html:nth-of-type(1)>body:nth-of-type(1)>h1:nth-of-type(1)', classes: [], textContent: 'Hello', rect: { x: 10, y: 20, width: 90, height: 30 } };
function fixture() {
  const frame = {} as Electron.WebFrameMain;
  const sender = { id: 1, mainFrame: frame, isDestroyed: () => false } as Electron.WebContents;
  const session = {} as Electron.Session;
  let reads = 0;
  let current: typeof node | undefined = node;
  let value: unknown = picked;
  let revision = 0;
  const guest = { id: 2, isDestroyed: () => false, hostWebContents: sender, session, getURL: () => artifactPageUrl(artifactId, pagePath), getType: () => 'webview', executeJavaScriptInIsolatedWorld: async (world: number) => { expect(world).toBe(999); reads += 1; return value; } } as unknown as Electron.WebContents;
  const handler = createArtifactPickHandler({ renderers: () => [sender], node: async () => current, guest: () => guest, session: () => session, revision: () => revision });
  return { handler, guest, sender, frame, request: { nodeId: 'node', guestId: 2, updatedAt: 'one', point: {x: 20, y: 30} }, reads: () => reads, node: (next: typeof node | undefined) => { current = next; }, value: (next: unknown) => { value = next; }, change: () => { revision += 1; } };
}

it('reads bounded DOM evidence only from the owning renderer’s actual artifact guest', async () => {
  const test = fixture();
  const result = await test.handler({sender: test.sender, senderFrame: test.frame}, test.request);
  expect(result).toMatchObject({ outcome: 'selected', evidence: { tag: 'h1', textContent: 'Hello', outerHtmlSnippet: '<h1>', frameUrl: artifactPageUrl(artifactId, pagePath) }, rect: picked.rect });
  expect(test.reads()).toBe(1);
  test.value(null);
  expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'none'});
});

it('refuses subframes, wrong hosts, partitions, URLs, guest types and malformed requests before execution', async () => {
  const variants = [
    (test: ReturnType<typeof fixture>) => ({ sender: test.sender, senderFrame: null }),
    (test: ReturnType<typeof fixture>) => { Object.assign(test.guest, {hostWebContents: {}}); return {sender: test.sender, senderFrame: test.frame}; },
    (test: ReturnType<typeof fixture>) => { Object.assign(test.guest, {session: {}}); return {sender: test.sender, senderFrame: test.frame}; },
    (test: ReturnType<typeof fixture>) => { test.guest.getURL = () => 'http://localhost:3000'; return {sender: test.sender, senderFrame: test.frame}; },
    (test: ReturnType<typeof fixture>) => { test.guest.getType = () => 'window'; return {sender: test.sender, senderFrame: test.frame}; },
  ];
  for (const change of variants) {
    const test = fixture();
    expect(await test.handler(change(test), test.request)).toEqual({outcome: 'unavailable'});
    expect(test.reads()).toBe(0);
  }
  for (const point of [{x: NaN, y: 1}, {x: -1, y: 1}, {x: 1, y: Infinity}]) {
    const test = fixture();
    expect(await test.handler({sender: test.sender, senderFrame: test.frame}, {...test.request, point})).toEqual({outcome: 'unavailable'});
    expect(test.reads()).toBe(0);
  }
});

it('drops an in-flight read if the node disappears, changes page or its live guest navigates', async () => {
  for (const change of ['removed', 'page', 'url', 'revision'] as const) {
    const test = fixture();
    test.guest.executeJavaScriptInIsolatedWorld = async () => {
      if (change === 'removed') test.node(undefined);
      if (change === 'page') test.node({...node, content: {...node.content, pagePath: 'pages/other.html'}});
      if (change === 'url') test.guest.getURL = () => 'about:blank';
      if (change === 'revision') test.change();
      return picked;
    };
    expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'unavailable'});
  }
});

it('refuses unbounded/invalid page evidence and keeps the isolated reader free of privileged APIs', async () => {
  for (const value of [{...picked, domPath: 'a'.repeat(2049)}, {...picked, tag: 'script>alert(1)'}, {...picked, rect: {...picked.rect, width: Infinity}}, {...picked, textContent: 'x'.repeat(513)}]) {
    const test = fixture();
    test.value(value);
    expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'unavailable'});
  }
  const script = artifactPointScript({x: 12, y: 34});
  expect(script).toContain('[redacted]');
  expect(script).not.toMatch(/studio\.|require\(|fetch\(|postMessage|addEventListener/);
});
