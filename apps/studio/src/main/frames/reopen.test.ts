import { afterAll, expect, it } from 'bun:test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ServerBookState, StudioLocation } from '@studio/events';
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
import { createServerHost } from '../server/index.js';
import type { ListenerIdentity } from '../server/owner.js';
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
    const reloadedOlder = structuredClone(serverBookEntries(older));
    expect(reloadedOlder).toEqual([{
      ...oldEntry,
      everMeasuredLive: true,
      ports: [{ port: 4700, measured: 'dead', everLive: true }],
    }]);

    const newEntry = createServerEntry(newer, { folder: newer, port: 4700, ownership: 'agent-started' });
    recordPortMeasurement(newer, newEntry.id, 4700, 'live');
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

for (const lifecycle of [
  'closeProject',
  'closeWorkspace',
  'stopStarterExcept',
  'pending starter stop',
  'rejected starter stop',
  'fresh sibling measurement during starter stop',
  'dispose',
  'restart',
  'resetServerBookCache',
  'live replacement',
] as const) {
  const title = lifecycle === 'pending starter stop'
    ? 'blocks a saved Frame until the sibling starter finishes stopping'
    : lifecycle === 'rejected starter stop'
      ? 'keeps a saved Frame blocked when the sibling starter fails to stop'
      : lifecycle === 'fresh sibling measurement during starter stop'
        ? 'keeps a fresh non-starter sibling measurement when its earlier starter stop completes'
        : `attaches a saved Frame after ${lifecycle} despite another project's saved live claim`;
  it(title, async () => {
    const root = makeWorkspaceRoot({ name: `frame-reopen-${lifecycle.replaceAll(' ', '-')}` });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetServerBookCache();
    resetCanvasRegistryCache();
    const project = join(root, 'synthetic-repo', 'design');
    const sibling = join(root, 'synthetic-repo', 'preview');
    mkdirSync(project, { recursive: true });
    mkdirSync(sibling, { recursive: true });
    const port = 4700;
    const homeUrl = `http://localhost:${port}/design`;
    const nodeId = 'saved-frame';
    const owner = { id: 471 } as Electron.WebContents;
    const listeners = new Map<number, ListenerIdentity>([[port, { pid: 470, cwd: sibling }]]);
    const delayedStop = lifecycle === 'pending starter stop' || lifecycle === 'rejected starter stop'
      || lifecycle === 'fresh sibling measurement during starter stop';
    const hasStarter = lifecycle === 'stopStarterExcept' || delayedStop;
    const running = new Map(hasStarter ? [[sibling, port]] : []);
    const stopped: string[] = [];
    const emitted: { cwd: string; state: ServerBookState }[] = [];
    let finishStop: () => void = () => undefined;
    let failStop: (error: Error) => void = () => undefined;
    const stopGate = new Promise<void>((resolve, reject) => {
      finishStop = resolve;
      failStop = reject;
    });
    const makeHost = () => createServerHost({
      emit: (cwd, state) => { emitted.push({ cwd, state }); },
      createPortFollow: () => ({ observed: () => undefined }),
      authorPortMove: () => undefined,
      attributionRoots: () => ({ workspaceRoot: root }),
      isBlankProject: () => true,
      probe: async (candidate) => listeners.has(candidate),
      identify: async (candidate) => listeners.get(candidate),
      signalProcess: () => undefined,
      delay: () => new Promise<void>(() => undefined),
      starter: {
        portFor: (cwd) => running.get(cwd),
        running: () => [...running.keys()],
        isPresent: () => true,
        stop: async (cwd) => {
          stopped.push(cwd);
          if (delayedStop) await stopGate;
          const stoppedPort = running.get(cwd);
          running.delete(cwd);
          if (stoppedPort !== undefined) listeners.delete(stoppedPort);
        },
        spawn: async () => { throw new Error('unexpected starter spawn'); },
      },
    });
    let host = makeHost();
    let canvas = makeCanvas();
    const blocked: string[] = [];
    const issued: { ownerId: number; docId: string; nodeId: string; url: string }[] = [];
    const bindings = createFrameBindings(Date.now, {
      allows: (sender, url) => sender === owner && !portHeldByOtherProject(project, url),
      blocked: (_sender, _nodeId, url) => { blocked.push(url); },
    });
    const admitted = (event: { sender: Electron.WebContents }) => event.sender === owner;
    const workspace = (senderId: number) => senderId === owner.id ? project : undefined;
    const attach = createFrameAttachHandler({
      admitted,
      workspace,
      snapshot: (cwd) => canvas.snapshotFor(cwd),
      artifactUrl: async () => undefined,
      browserUrl: (sender, docId, node) => bindings.browserUrl(sender, docId, node),
      issue: (sender, docId, node, url) => {
        issued.push({ ownerId: sender.id, docId, nodeId: node.id, url });
        return bindings.issue(sender, docId, node, url);
      },
    });

    try {
      await canvas.open(project);
      const created = await canvas.apply('user', (doc) => [{
        type: 'create',
        node: {
          id: nodeId, pageId: firstCanvasPageId(doc.docId), kind: 'browser', name: 'Saved app',
          x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl },
        },
      }]);
      if (!created.ok) throw new Error(`expected a saved frame, got: ${created.reason}`);
      await canvas.flushAll();
      await canvas.open(project);
      const attachSavedFrame = async () => {
        const snapshot = await canvas.snapshotFor(project);
        expect(snapshot).toEqual({ doc: created.doc });
        expect(snapshot.doc?.nodes[nodeId]).toMatchObject({
          id: nodeId, kind: 'browser', content: { homeUrl },
        });
        const event = { sender: owner };
        expect(admitted(event)).toBe(true);
        expect(workspace(event.sender.id)).toBe(project);
        const previousIssues = issued.length;
        const attached = await attach(event, { nodeId });
        expect(issued.slice(previousIssues)).toEqual([{
          ownerId: owner.id, docId: created.doc.docId, nodeId, url: homeUrl,
        }]);
        return attached;
      };
      await host.openProject(project);
      const unchangedProject = host.snapshotFor(project);
      expect(unchangedProject.entries).toEqual([]);
      const projectEmissions = () => emitted.filter((event) => event.cwd === project).map((event) => event.state);
      const siblingEntry = createServerEntry(sibling, {
        folder: sibling,
        port,
        ownership: hasStarter ? 'studio-started' : 'agent-started',
      });
      await host.openProject(sibling);
      const savedSibling = structuredClone(serverBookEntries(sibling));
      expect(savedSibling).toEqual([{
        ...siblingEntry,
        everMeasuredLive: true,
        ports: [{ port, measured: 'live', everLive: true }],
      }]);
      expect(portHeldByOtherProject(project, homeUrl)).toBe(true);
      expect(await attachSavedFrame()).toBeNull();
      expect(blocked).toEqual([homeUrl]);
      blocked.length = 0;
      emitted.length = 0;

      switch (lifecycle) {
        case 'closeProject':
          await host.closeProject(sibling);
          break;
        case 'closeWorkspace':
          await host.openProject(project);
          emitted.length = 0;
          await host.closeWorkspace(sibling);
          break;
        case 'stopStarterExcept': {
          host.stopStarterExcept(new Set([project]));
          await Promise.resolve();
          await Promise.resolve();
          expect(stopped).toEqual([sibling]);
          expect(running.has(sibling)).toBe(false);
          expect(listeners.has(port)).toBe(false);
          break;
        }
        case 'pending starter stop':
        case 'rejected starter stop': {
          host.stopStarterExcept(new Set([project]));
          expect(stopped).toEqual([sibling]);
          expect(portHeldByOtherProject(project, homeUrl)).toBe(true);
          expect(await attachSavedFrame()).toBeNull();
          expect(blocked).toEqual([homeUrl]);
          expect(running.has(sibling)).toBe(true);
          expect(listeners.get(port)?.cwd).toBe(sibling);
          expect(serverBookEntries(sibling)).toEqual(savedSibling);
          expect(projectEmissions()).toEqual([]);
          if (lifecycle === 'rejected starter stop') {
            failStop(new Error('synthetic starter stop failed'));
            await expect(stopGate).rejects.toThrow('synthetic starter stop failed');
            await Promise.resolve();
            blocked.length = 0;
            expect(portHeldByOtherProject(project, homeUrl)).toBe(true);
            expect(await attachSavedFrame()).toBeNull();
            expect(blocked).toEqual([homeUrl]);
            expect(running.has(sibling)).toBe(true);
            expect(listeners.get(port)?.cwd).toBe(sibling);
            expect(serverBookEntries(sibling)).toEqual(savedSibling);
            expect(projectEmissions()).toEqual([]);
            expect(host.snapshotFor(project)).toEqual(unchangedProject);
            return;
          }
          finishStop();
          await stopGate;
          await Promise.resolve();
          expect(running.has(sibling)).toBe(false);
          expect(listeners.has(port)).toBe(false);
          blocked.length = 0;
          break;
        }
        case 'fresh sibling measurement during starter stop': {
          host.stopStarterExcept(new Set([project]));
          expect(stopped).toEqual([sibling]);
          expect(projectEmissions()).toEqual([]);
          running.delete(sibling);
          listeners.set(port, { pid: 472, cwd: sibling });
          await host.report(sibling, sibling, port);
          expect(await attachSavedFrame()).toBeNull();
          expect(blocked).toEqual([homeUrl]);
          expect(running.get(sibling)).toBeUndefined();
          const refreshedSibling = structuredClone(serverBookEntries(sibling));
          expect(refreshedSibling).toEqual([{
            ...siblingEntry,
            ownership: 'agent-started',
            everMeasuredLive: true,
            ports: [{ port, measured: 'live', everLive: true }],
          }]);
          expect(projectEmissions()).toEqual([]);
          const ownershipState = () => structuredClone({
            held: portHeldByOtherProject(project, homeUrl),
            starterPort: running.get(sibling),
            listener: listeners.get(port),
            book: serverBookEntries(sibling),
            snapshot: host.snapshotFor(sibling),
            projectEmissions: projectEmissions(),
          });
          const refreshedState = ownershipState();
          expect(refreshedState.held).toBe(true);
          expect(refreshedState.starterPort).toBeUndefined();
          expect(refreshedState.listener).toEqual({ pid: 472, cwd: sibling });
          expect(refreshedState.snapshot.entries.map((entry) => ({
            entryId: entry.entryId, ownership: entry.ownership, status: entry.status, port: entry.port,
          }))).toEqual([{
            entryId: siblingEntry.id, ownership: 'agent-started', status: 'running', port,
          }]);
          blocked.length = 0;
          emitted.length = 0;
          finishStop();
          await stopGate;
          await Promise.resolve();
          expect(running.get(sibling)).toBeUndefined();
          expect(listeners.get(port)).toEqual({ pid: 472, cwd: sibling });
          expect(ownershipState()).toEqual(refreshedState);
          expect(await attachSavedFrame()).toBeNull();
          expect(blocked).toEqual([homeUrl]);
          expect(serverBookEntries(sibling)).toEqual(refreshedSibling);
          expect(projectEmissions()).toEqual([]);
          expect(host.snapshotFor(project)).toEqual(unchangedProject);
          return;
        }
        case 'dispose':
          host.dispose();
          break;
        case 'restart':
          host.dispose();
          resetServerBookCache();
          resetCanvasRegistryCache();
          host = makeHost();
          canvas = makeCanvas();
          await canvas.open(project);
          await host.openProject(project);
          expect(await canvas.snapshotFor(project)).toEqual({ doc: created.doc });
          break;
        case 'resetServerBookCache':
          resetServerBookCache();
          break;
        case 'live replacement': {
          listeners.set(port, { pid: 471, cwd: project });
          createServerEntry(project, { folder: project, port, ownership: 'agent-started' });
          await host.report(project, project, port);
          expect(serverBookEntries(project)[0]?.ports).toEqual([
            { port, measured: 'live', everLive: true },
          ]);
          expect(portHeldByOtherProject(sibling, homeUrl)).toBe(true);
          break;
        }
      }

      if (lifecycle === 'closeProject' || lifecycle === 'closeWorkspace'
        || lifecycle === 'stopStarterExcept' || lifecycle === 'pending starter stop') {
        expect(host.snapshotFor(project)).toEqual(unchangedProject);
        expect(projectEmissions()).toContainEqual(unchangedProject);
      }
      listeners.set(port, { pid: 471, cwd: project });
      expect(serverBookEntries(sibling)).toEqual(savedSibling);
      expect(portHeldByOtherProject(project, homeUrl)).toBe(false);
      const attached = await attachSavedFrame();
      expect(attached?.url).toStartWith('about:blank#studio-frame-attach=');
      expect(blocked).toEqual([]);
      expect(serverBookEntries(sibling)).toEqual(savedSibling);
    } finally {
      host.dispose();
      await canvas.flushAll();
    }
  });
}
