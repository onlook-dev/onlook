import {expect, it} from 'bun:test';
import {artifactRefusal, type ArtifactRenameRequest} from '@studio/events';
import {createArtifactRenameHandler} from './rename.js';

const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
it('rejects guests, subframes and invalid names before any mutation', async () => {
  const frame = {} as Electron.WebFrameMain;
  const sender = {mainFrame: frame, isDestroyed: () => false} as Electron.WebContents;
  let writes = 0;
  const handler = createArtifactRenameHandler({renderers: () => [sender], changed: () => {}, store: {rename: async () => {writes += 1; return {ok: true};}, read: async () => ({outcome: 'missing'})}});
  const request = {artifactId: id, title: 'Title', updatedAt: 'revision'};
  expect(await handler({sender, senderFrame: null}, request)).toEqual({outcome: 'unavailable'});
  for (const title of ['', ' ', '\nSecret', 'x'.repeat(201)]) expect(await handler({sender, senderFrame: frame}, {...request, title})).toEqual({outcome: 'invalid'});
  expect(await handler({sender, senderFrame: frame}, {...request, artifactId: '../../private'} as ArtifactRenameRequest)).toEqual({outcome: 'invalid'});
  expect(writes).toBe(0);
});
it('preserves store version/stale refusals and never broadcasts a failed mutation', async () => {
  const frame = {} as Electron.WebFrameMain;
  const sender = {mainFrame: frame, isDestroyed: () => false} as Electron.WebContents;
  for (const code of ['newerBuild', 'multipleDocuments', 'stale', 'unavailable'] as const) {
    let emits = 0;
    const handler = createArtifactRenameHandler({renderers: () => [sender], changed: () => {emits += 1;}, store: {rename: async () => artifactRefusal(code), read: async () => ({outcome: 'missing'})}});
    expect(await handler({sender, senderFrame: frame}, {artifactId: id, title: 'New', updatedAt: 'old'})).toEqual({outcome: code === 'newerBuild' || code === 'multipleDocuments' ? 'readOnly' : code});
    expect(emits).toBe(0);
  }
});
