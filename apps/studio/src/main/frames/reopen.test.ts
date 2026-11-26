import { afterAll, expect, it } from 'bun:test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { StudioLocation } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { createFrameAttachHandler } from '../canvas/frame-attach.js';
import { firstCanvasPageId } from '../canvas/document.js';
import { createFsDocumentStore } from '../canvas/fs-backend.js';
import { createCanvasHost } from '../canvas/host.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { applyLocationTransition, type LocationTransitionDeps } from '../location/transition.js';
import {
  createServerEntry,
  portHeldByOtherProject,
  recordPortMeasurement,
  resetServerBookCache,
  serverBookEntries,
} from '../server/book.js';
import { createFrameBindings } from './bindings.js';

afterAll(() => {
  resetServerBookCache();
  resetCanvasRegistryCache();
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function makeCanvas() {
  return createCanvasHost({
    store: createFsDocumentStore(),
    emitUpdate: () => undefined,
    emitRejection: () => undefined,
    markDirty: () => undefined,
  });
}

it('refuses a reopened project’s saved port before its own reverification when another project has reused it', async () => {
  const root = makeWorkspaceRoot({ name: 'frame-reopen-reused-port' });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  resetCanvasRegistryCache();
  const older = join(root, 'synthetic-repo', 'older');
  const newer = join(root, 'synthetic-repo', 'newer');
  mkdirSync(older, { recursive: true });
  mkdirSync(newer, { recursive: true });
  const homeUrl = 'http://localhost:4700/design';
  const nodeId = 'saved-frame';
  const owner = { id: 470 } as Electron.WebContents;
  let location: StudioLocation = { kind: 'projects' };
  let canvas = makeCanvas();
  const reverificationRequests: string[] = [];
  const deps: LocationTransitionDeps = {
    setLocation: (next) => { location = next; },
    stopStarterExcept: () => undefined,
    openCanvas: (cwd) => canvas.open(cwd),
    deactivateCanvas: () => canvas.deactivate(),
    deactivateServerBook: () => undefined,
    reverifyServerBook: (cwd) => { reverificationRequests.push(cwd); },
    projectOpened: () => undefined,
    restartStarter: () => undefined,
  };
  const workspace = (senderId: number): string | undefined =>
    senderId === owner.id && location.kind === 'project' ? location.workspacePath : undefined;

  try {
    await applyLocationTransition({ kind: 'project', repoIdentity: 'synthetic-repo', workspacePath: older }, deps);
    const created = await canvas.apply('user', (doc) => [{
      type: 'create',
      node: {
        id: nodeId, pageId: firstCanvasPageId(doc.docId), kind: 'browser', name: 'Saved app',
        x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl },
      },
    }]);
    if (!created.ok) throw new Error(`expected a saved frame, got: ${created.reason}`);
    const savedDoc = created.doc;
    const oldEntry = createServerEntry(older, { folder: older, port: 4700, ownership: 'agent-started' });
    recordPortMeasurement(older, oldEntry.id, 4700, 'live');
    recordPortMeasurement(older, oldEntry.id, 4700, 'dead');

    await canvas.flushAll();
    resetServerBookCache();
    resetCanvasRegistryCache();
    canvas = makeCanvas();
    reverificationRequests.length = 0;
    const reloadedOlder = serverBookEntries(older);
    expect(reloadedOlder).toEqual([expect.objectContaining({
      id: oldEntry.id,
      everMeasuredLive: true,
      ports: [{ port: 4700, measured: 'dead', everLive: true }],
    })]);

    const newEntry = createServerEntry(newer, { folder: newer, port: 4700, ownership: 'agent-started' });
    recordPortMeasurement(newer, newEntry.id, 4700, 'live');
    resetServerBookCache();
    expect(serverBookEntries(newer)[0]?.ports).toEqual([{ port: 4700, measured: 'live', everLive: true }]);

    await applyLocationTransition({ kind: 'projects' }, deps);
    expect(await canvas.snapshot()).toEqual({ doc: null });
    await applyLocationTransition({ kind: 'project', repoIdentity: 'synthetic-repo', workspacePath: older }, deps);
    expect(await canvas.snapshotFor(older)).toEqual({ doc: savedDoc });
    expect(reverificationRequests).toEqual([older]);
    expect(serverBookEntries(older)).toEqual(reloadedOlder);
    expect(portHeldByOtherProject(older, homeUrl)).toBe(true);
    expect(portHeldByOtherProject(newer, homeUrl)).toBe(false);

    const blocked: { ownerId: number; nodeId: string | undefined; url: string }[] = [];
    const guarded = createFrameBindings(Date.now, {
      allows(sender, url) {
        const cwd = workspace(sender.id);
        return cwd !== undefined && !portHeldByOtherProject(cwd, url);
      },
      blocked(sender, frameId, url) { blocked.push({ ownerId: sender.id, nodeId: frameId, url }); },
    });
    const handlerFor = (bindings: ReturnType<typeof createFrameBindings>) => createFrameAttachHandler({
      admitted: (event) => event.sender === owner && workspace(event.sender.id) !== undefined,
      workspace,
      snapshot: (cwd) => canvas.snapshotFor(cwd),
      artifactUrl: async () => undefined,
      browserUrl: (sender, docId, node) => bindings.browserUrl(sender, docId, node),
      issue: (sender, docId, node, url) => bindings.issue(sender, docId, node, url),
    });

    expect(await handlerFor(guarded)({ sender: owner }, { nodeId })).toBeNull();
    expect(blocked).toEqual([{ ownerId: owner.id, nodeId, url: homeUrl }]);
    expect(serverBookEntries(older)).toEqual(reloadedOlder);

    const unguarded = await handlerFor(createFrameBindings())({ sender: owner }, { nodeId });
    expect(unguarded?.url).toStartWith('about:blank#studio-frame-attach=');
  } finally {
    await canvas.flushAll();
  }
});
