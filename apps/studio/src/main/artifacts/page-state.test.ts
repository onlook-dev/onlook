import { expect, it } from 'bun:test';
import type { ArtifactManifest } from '@studio/events';
import { createArtifactPageStateHandler } from './page-state.js';

const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const manifest = {id, updatedAt: 'one', pages: [{path: 'pages/index.html', name: 'Home'}]} as ArtifactManifest;
function fixture() {
  const frame = {} as Electron.WebFrameMain;
  const sender = { mainFrame: frame, isDestroyed: () => false } as Electron.WebContents;
  let revision = 0;
  let readable = true;
  let reads = 0;
  const store = { read: async () => ({outcome: 'resolved' as const, manifest, readOnly: true}), readPage: async () => { reads += 1; return readable ? '' : null; } };
  const handler = createArtifactPageStateHandler({renderers: () => [sender], store, revision: () => revision});
  return {handler, store, sender, frame, request: {artifactId: id, pagePath: 'pages/index.html', updatedAt: 'one'}, reads: () => reads, change: () => {revision += 1;}, missing: () => {readable = false;} };
}
it('admits readable newer/read-only pages and returns a canonical URL, never bytes or machine paths', async () => {
  const test = fixture();
  expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'ready', url: `studio-artifact://${id}/pages/index.html`});
});
it('refuses unknown senders/subframes, stale revisions, missing pages and non-manifest paths', async () => {
  const test = fixture();
  expect(await test.handler({sender: test.sender, senderFrame: null}, test.request)).toEqual({outcome: 'unavailable'});
  expect(test.reads()).toBe(0);
  expect(await test.handler({sender: test.sender, senderFrame: test.frame}, {...test.request, updatedAt: 'old'})).toEqual({outcome: 'stale'});
  expect(await test.handler({sender: test.sender, senderFrame: test.frame}, {...test.request, pagePath: '../secret.html'})).toEqual({outcome: 'missing'});
  expect(test.reads()).toBe(0);
  test.missing();
  expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'missing'});
});
it('discards an in-flight page-state read if contents change or its requesting tab closes', async () => {
  for (const close of [false, true]) {
    const test = fixture();
    test.store.readPage = async () => { if (close) test.sender.isDestroyed = () => true; else test.change(); return ''; };
    expect(await test.handler({sender: test.sender, senderFrame: test.frame}, test.request)).toEqual({outcome: 'stale'});
  }
});
