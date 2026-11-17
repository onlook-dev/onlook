import {expect, it} from 'bun:test';
import type {ArtifactManifest} from '@studio/events';
import {createArtifactDeleteHandler} from './delete.js';

const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
it('validates actual Studio main frames, identity, version and revision before deleting and broadcasts only committed success', async () => {
  const frame = {} as Electron.WebFrameMain;
  const sender = {mainFrame: frame, isDestroyed: () => false} as Electron.WebContents;
  const manifest = {id, updatedAt: 'revision', pages: [{path: 'pages/index.html', name: 'Home'}]} as ArtifactManifest;
  let readOnly = false;
  let blockedDocuments = 0;
  let removals = 0;
  let broadcasts = 0;
  const handler = createArtifactDeleteHandler({renderers: () => [sender], changed: () => {broadcasts += 1;}, store: {read: async () => ({outcome: 'resolved', manifest, readOnly, blockedDocuments}), remove: async (_id, revision) => {expect(revision).toBe('revision'); removals += 1; return {ok: true};}}});
  expect(await handler({sender, senderFrame: null}, {artifactId: id})).toMatchObject({code: 'unavailable'});
  expect(await handler({sender, senderFrame: frame}, {artifactId: '../other'})).toMatchObject({code: 'badId'});
  expect(await handler({sender, senderFrame: frame}, {artifactId: id, updatedAt: 'old'})).toMatchObject({code: 'stale'});
  readOnly = true;
  expect(await handler({sender, senderFrame: frame}, {artifactId: id})).toMatchObject({code: 'newerBuild'});
  blockedDocuments = 1;
  expect(await handler({sender, senderFrame: frame}, {artifactId: id})).toMatchObject({code: 'multipleDocuments'});
  blockedDocuments = 0;
  expect({removals, broadcasts}).toEqual({removals: 0, broadcasts: 0});
  readOnly = false;
  expect(await handler({sender, senderFrame: frame}, {artifactId: id, updatedAt: 'revision'})).toEqual({ok: true});
  expect({removals, broadcasts}).toEqual({removals: 1, broadcasts: 1});
});
it('refuses a tab that closes during a read and maps filesystem failure without announcing success', async () => {
  const frame = {} as Electron.WebFrameMain;
  let closed = false;
  const sender = {mainFrame: frame, isDestroyed: () => closed} as Electron.WebContents;
  let calls = 0;
  const handler = createArtifactDeleteHandler({renderers: () => [sender], changed: () => {throw new Error('must not broadcast');}, store: {read: async () => {closed = true; return {outcome: 'resolved', manifest: {id, updatedAt: 'revision'} as ArtifactManifest, readOnly: false};}, remove: async () => {calls += 1; throw new Error('disk');}}});
  expect(await handler({sender, senderFrame: frame}, {artifactId: id})).toMatchObject({code: 'unavailable'});
  expect(calls).toBe(0);
});
