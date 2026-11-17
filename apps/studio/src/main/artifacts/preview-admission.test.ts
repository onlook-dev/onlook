import { expect, it } from 'bun:test';
import { createArtifactPreviewHandler } from './preview-admission.js';

const request = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', pagePath: 'pages/index.html', updatedAt: 'one' };
const frame = {} as Electron.WebFrameMain;
const sender = () => ({ mainFrame: frame, isDestroyed: () => false });

it('admits registered Projects and project renderers without requiring a project workspace', async () => {
  const projects = sender();
  const project = sender();
  const admitted: (() => boolean)[] = [];
  const handler = createArtifactPreviewHandler({ renderers: () => [projects, project], request: async (_request, wanted) => { admitted.push(wanted); return { outcome: 'ready', image: 'pixels' }; } });
  expect((await handler({ sender: projects, senderFrame: frame }, request)).outcome).toBe('ready');
  expect((await handler({ sender: project, senderFrame: frame }, request)).outcome).toBe('ready');
  expect(admitted.every((wanted) => wanted())).toBe(true);
});

it('rejects unknown/guest/offscreen senders, subframes and destroyed renderers before touching the store', async () => {
  const registered = sender();
  let calls = 0;
  const handler = createArtifactPreviewHandler({ renderers: () => [registered], request: async () => { calls += 1; return { outcome: 'missing' }; } });
  for (const event of [{ sender: sender(), senderFrame: frame }, { sender: registered, senderFrame: null }, { sender: registered, senderFrame: {} as Electron.WebFrameMain }]) {
    expect((await handler(event, request)).outcome).toBe('unavailable');
  }
  registered.isDestroyed = () => true;
  expect((await handler({ sender: registered, senderFrame: frame }, request)).outcome).toBe('unavailable');
  expect(calls).toBe(0);
});

it('revokes queued demand when its renderer leaves the registry or is destroyed', async () => {
  const registered = sender();
  let renderers = [registered];
  let stillWanted!: () => boolean;
  const handler = createArtifactPreviewHandler({ renderers: () => renderers, request: async (_request, wanted) => { stillWanted = wanted; return { outcome: 'missing' }; } });
  await handler({ sender: registered, senderFrame: frame }, request);
  renderers = [];
  expect(stillWanted()).toBe(false);
  renderers = [registered];
  registered.isDestroyed = () => true;
  expect(stillWanted()).toBe(false);
});
