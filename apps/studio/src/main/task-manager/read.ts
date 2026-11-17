import electron from 'electron';
import { ARTIFACT_SCHEME } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { isWindows } from '../env/platform.js';
import { electronProcesses, readPs } from '../perf/sampler.js';
import type { PsRow } from '../perf/resources.js';
import { serverBookEntries } from '../server/book.js';
import { identifyListener } from '../server/owner.js';
import { starterHost } from '../starter/index.js';
import { tabHost } from '../tabs/host.js';
import { isTaskManagerSender } from '../ipc/roles.js';
import type { ServerProcess, SnapshotInputs, TabIdentity, ViewIdentity } from './snapshot.js';

const UNRESOLVED_RETRY_MS = 30_000;

function viewIdentities(): ViewIdentity[] {
  const roles = tabHost()?.viewRoles() ?? [];
  const byId = new Map(roles.map((role) => [role.contents.id, role]));
  const views: ViewIdentity[] = [];
  for (const contents of electron.webContents.getAllWebContents()) {
    if (contents.isDestroyed()) continue;
    const pid = contents.getOSProcessId();
    if (contents.getType() === 'webview') {
      const tabId = contents.hostWebContents === null ? undefined : byId.get(contents.hostWebContents.id)?.tabId;
      let url: URL | undefined;
      try {
        url = new URL(contents.getURL());
      } catch {
        url = undefined;
      }
      const isArtifact = url?.protocol === `${ARTIFACT_SCHEME}:`;
      const isHttp = url !== undefined && (url.protocol === 'http:' || url.protocol === 'https:');
      const address = isHttp ? url!.host : undefined;
      const page = isHttp ? `${url!.host}${url!.pathname === '/' ? '' : url!.pathname}` : undefined;
      views.push({ pid, role: 'frame', isArtifact, ...(tabId === undefined ? {} : { tabId }), ...(address === undefined ? {} : { address }), ...(page === undefined ? {} : { page }) });
      continue;
    }
    const known = byId.get(contents.id);
    if (known !== undefined) views.push({ pid, role: known.role, ...(known.tabId === undefined ? {} : { tabId: known.tabId }) });
    else views.push({ pid, role: isTaskManagerSender(contents) ? 'task_manager' : 'other' });
  }
  return views;
}

function tabIdentities(): TabIdentity[] {
  return (tabHost()?.state().tabs ?? []).map((tab) => ({
    tabId: tab.id,
    name: tab.name,
    purpose: tab.purpose,
    ...(tab.workspacePath === undefined ? {} : { workspacePath: canonicalPath(tab.workspacePath) }),
  }));
}

/** Who listens on each open Project's booked ports, asked of lsof only when a port is new or its listener has gone. */
export function createListenerCache(identify: (port: number) => Promise<number | undefined> = async (port) => (await identifyListener(port))?.pid) {
  const known = new Map<number, { pid?: number; askedAt: number }>();
  return async (ports: readonly number[], livePids: ReadonlySet<number>, now: number): Promise<Map<number, number>> => {
    for (const port of known.keys()) if (!ports.includes(port)) known.delete(port);
    await Promise.all(ports.map(async (port) => {
      const held = known.get(port);
      const isFresh = held !== undefined && (held.pid !== undefined ? livePids.has(held.pid) : now - held.askedAt < UNRESOLVED_RETRY_MS);
      if (isFresh) return;
      const pid = await identify(port).catch(() => undefined);
      known.set(port, { ...(pid === undefined ? {} : { pid }), askedAt: now });
    }));
    const pids = new Map<number, number>();
    for (const [port, held] of known) if (held.pid !== undefined) pids.set(port, held.pid);
    return pids;
  };
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The open Projects' booked ports, then the local ports their Frames show, which may be a server the person started themselves. */
function servedPorts(tabs: readonly TabIdentity[], views: readonly ViewIdentity[]): Map<number, string> {
  const ports = new Map<number, string>();
  const workspaceOf = new Map(tabs.flatMap((tab) => tab.workspacePath === undefined ? [] : [[tab.tabId, tab.workspacePath] as const]));
  for (const tab of tabs) {
    if (tab.workspacePath === undefined) continue;
    for (const entry of serverBookEntries(tab.workspacePath)) {
      for (const booked of entry.ports) if (booked.measured === 'live' && !ports.has(booked.port)) ports.set(booked.port, tab.workspacePath);
    }
  }
  for (const view of views) {
    if (view.role !== 'frame' || view.address === undefined || view.tabId === undefined) continue;
    const workspacePath = workspaceOf.get(view.tabId);
    let url: URL;
    try {
      url = new URL(`http://${view.address}`);
    } catch {
      continue;
    }
    const port = Number(url.port);
    if (workspacePath !== undefined && LOOPBACK.has(url.hostname) && Number.isInteger(port) && port > 0 && !ports.has(port)) ports.set(port, workspacePath);
  }
  return ports;
}

function starterProcesses(tabs: readonly TabIdentity[]): ServerProcess[] {
  const starter = starterHost();
  if (starter === undefined) return [];
  const open = new Set(tabs.flatMap((tab) => tab.workspacePath === undefined ? [] : [tab.workspacePath]));
  return starter.running().flatMap((worktree) => {
    const pid = starter.pidFor(worktree);
    const port = starter.portFor(worktree);
    return pid === undefined || !open.has(worktree) ? [] : [{ pid, workspacePath: worktree, ...(port === undefined ? {} : { port }) }];
  });
}

export function createInputReader(deps: { listeners?: ReturnType<typeof createListenerCache>; readRows?: () => Promise<PsRow[]> } = {}) {
  const listeners = deps.listeners ?? createListenerCache();
  const readRows = deps.readRows ?? (() => readPs());
  const hasProcessList = !isWindows();
  return async (): Promise<SnapshotInputs> => {
    const ps = await readRows();
    const now = Date.now();
    const tabs = tabIdentities();
    const electronMetrics = electronProcesses();
    const views = viewIdentities();
    const ports = servedPorts(tabs, views);
    const livePids = new Set(ps.map((row) => row.pid));
    const listenerPids = hasProcessList ? await listeners([...ports.keys()], livePids, now) : new Map<number, number>();
    const servers: ServerProcess[] = [
      ...starterProcesses(tabs),
      ...[...listenerPids].map(([port, pid]) => ({ pid, port, workspacePath: ports.get(port)! })),
    ];
    return {
      now,
      mainPid: process.pid,
      ps,
      hasProcessList,
      electron: electronMetrics,
      views,
      tabs,
      servers,
    };
  };
}
