import { mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import {
  creationWorkspace,
  type ComfortChoice,
  type DebugFrameState,
  type DebugScreenKind,
  type DebugScreenState,
  type DebugStores,
  type ProjectCreateState,
  type StudioDebugBridge,
  type WorkspacePlan,
  type WorkspaceSummary,
} from '@studio/events';
import { waitForSetup } from './agent.js';
import { until } from './async.js';
import { debugState, gateCall, listTargets, readJson, readTab, waitForGate } from './cdp.js';
import { goHome } from './home.js';
import type { StudioProcess } from './launch.js';
import { makeFixtureSite, serveFixtureSite, type FixtureSite, type ServedSite } from './site.js';

type QuickStartApp = Pick<StudioProcess, 'port' | 'root' | 'pid'> & Partial<Pick<StudioProcess, 'env'>>;

type ActionMethod = {
  [K in keyof StudioDebugBridge]: Awaited<ReturnType<StudioDebugBridge[K]>> extends { ok: boolean } ? K : never;
}[keyof StudioDebugBridge];

async function act<K extends ActionMethod>(
  port: string,
  tabId: string,
  method: K,
  ...args: Parameters<StudioDebugBridge[K]>
): Promise<void> {
  const result = (await gateCall(port, tabId, method, ...args)) as { ok: true } | { ok: false; reason: string };
  if (!result.ok) throw new Error(`__ONLOOK_DEBUG__.${method} refused: ${result.reason}`);
}

function waitForScreen(port: string, tabId: string, kind: DebugScreenKind): Promise<DebugScreenState> {
  return until(() => gateCall(port, tabId, 'screen'), (screen) => screen.kind === kind, {
    what: `tab ${tabId} to reach the ${kind} screen`,
    limitMs: 15_000,
    everyMs: 100,
    describe: (screen) => screen.kind,
  });
}

export interface FramesSeen {
  /** Every frame seen while the watch ran, one placed and then removed included. */
  frames: DebugFrameState[];
  mostAtOnce: number;
}

export function watchFrames(port: string, tabId: string, everyMs = 200): { stop(): Promise<FramesSeen> } {
  const seen = new Map<string, DebugFrameState>();
  let mostAtOnce = 0;
  let reads = 0;
  let lastError: unknown;
  let running = true;
  const polling = (async () => {
    while (running) {
      try {
        const screen = await gateCall(port, tabId, 'screen');
        reads += 1;
        // Off the editor, `frames` is still the last canvas's.
        if (screen.kind === 'editor') {
          for (const frame of screen.frames) if (!seen.has(frame.id)) seen.set(frame.id, frame);
          mostAtOnce = Math.max(mostAtOnce, screen.frames.length);
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, everyMs));
    }
  })();
  return {
    stop: async () => {
      running = false;
      await polling;
      if (reads === 0) throw new Error(`The frame watch on tab ${tabId} never read the canvas: ${String(lastError)}`);
      return { frames: [...seen.values()], mostAtOnce };
    },
  };
}

const ENDED_BARE: readonly ProjectCreateState['kind'][] = ['failed', 'refused', 'canceled'];

export function recordedServerPorts(recording: string): number[] {
  const ports: number[] = [];
  for (const line of readFileSync(recording, 'utf8').split('\n')) {
    if (!line.includes('mcp__studio__server_running')) continue;
    const row = JSON.parse(line) as { type?: string; message?: { content?: unknown } };
    if (row.type !== 'assistant' || !Array.isArray(row.message?.content)) continue;
    for (const block of row.message.content as { type?: string; name?: string; input?: { port?: unknown } }[]) {
      const port = block.input?.port;
      if (block.type === 'tool_use' && block.name === 'mcp__studio__server_running' && typeof port === 'number' && !ports.includes(port)) {
        ports.push(port);
      }
    }
  }
  return ports;
}

/** Through the tab's own bridge. On a replayed stream it serves the fixture on each recorded port: replay does not run the Bash that started it (ONL-2444). */
export async function importProject(
  app: QuickStartApp,
  tabId: string,
  sourcePath: string,
  comfort?: ComfortChoice,
): Promise<{ state: ProjectCreateState; served: ServedSite[] }> {
  const known = new Set((await debugState(app.port)).workspaces.flatMap((workspace) => workspace.projects.map((p) => p.workspacePath)));
  const readState = () => readTab<ProjectCreateState | null>(app.port, tabId, 'window.studio.tabCreateState()');
  const prior = JSON.stringify(await readState());
  const request = JSON.stringify({ sourcePath, comfort });
  const plan = await readTab<WorkspacePlan>(
    app.port,
    tabId,
    `(async ({ sourcePath, comfort }) => {
      const plan = await window.studio.workspacePlan({ sourcePath });
      if (plan.kind === 'ready') window.studio.tabsCreateProject({ sourcePath: plan.sourcePath, ...(comfort === undefined ? {} : { comfort }), entryPoint: 'projects' });
      return plan;
    })(${request})`,
  );
  if (plan.kind === 'refused') throw new Error(`Studio refused to plan ${sourcePath}: ${plan.detail ?? plan.reason}.`);
  // The tab's previous cut reads on until this one starts; a known worktree is that one.
  const state = (await until(
    readState,
    (read) => {
      if (read === null || JSON.stringify(read) === prior) return false;
      const workspace = creationWorkspace(read);
      return workspace === undefined ? ENDED_BARE.includes(read.kind) : !known.has(workspace.workspacePath);
    },
    { what: `the import of ${sourcePath} to name its worktree`, limitMs: 60_000, everyMs: 100 },
  )) as ProjectCreateState;
  const recording = app.env?.['STUDIO_AGENT_REPLAY'];
  const workspace = creationWorkspace(state);
  if (recording === undefined || comfort === 'design' || workspace === undefined) return { state, served: [] };
  // Live, the agent's server comes up after the project's canvas opens; an instant replay reports it first, and the first frame is declined.
  const worktree = workspace.workspacePath;
  await until(
    () => debugState(app.port),
    (read) => read.tabs.some((tab) => tab.workspacePath === worktree && tab.canvas !== null),
    { what: `the canvas of ${worktree} to open`, limitMs: 30_000, everyMs: 100 },
  );
  const root = join(app.root, 'replayed-servers');
  mkdirSync(root, { recursive: true });
  const served: ServedSite[] = [];
  for (const port of recordedServerPorts(recording)) {
    served.push(await serveFixtureSite({ path: worktree, root }, { port, owner: app.pid }));
  }
  return { state, served };
}

/** Cut in the Projects tab, which becomes the project's own tab. */
async function importForDesign(app: QuickStartApp, source: string): Promise<{ tabId: string; workspacePath: string }> {
  const tabId = await goHome(app.port);
  await importProject(app, tabId, source, 'design');
  const setup = await waitForSetup(app.port, tabId, 60_000);
  if (setup.kind !== 'ready') throw new Error(`Importing ${source} ended ${JSON.stringify(setup)}.`);
  await waitForScreen(app.port, tabId, 'editor');
  await waitForCanvas(app.port, tabId);
  return { tabId, workspacePath: setup.workspace.workspacePath };
}

/** The editor screen mounts before its document loads, and `addFrame` refuses until it has. */
export function waitForCanvas(port: string, tabId: string, limitMs = 30_000): Promise<DebugStores> {
  return until(() => gateCall(port, tabId, 'stores'), (stores) => stores.canvas.doc !== null, {
    what: `tab ${tabId}'s canvas document to load`,
    limitMs,
    everyMs: 100,
  });
}

export interface SelectedWorkspace {
  /** The Projects tab the select was made in. */
  tabId: string;
  workspace: WorkspaceSummary;
}

export async function selectWorkspace(app: QuickStartApp, sourcePath: string): Promise<SelectedWorkspace> {
  const named = new Set([sourcePath, realpathSync(sourcePath)]);
  const { workspaces } = await debugState(app.port);
  const workspace = workspaces.find((held) => named.has(held.sourcePath));
  if (workspace === undefined) {
    throw new Error(`No workspace on the list is from ${sourcePath}; the list has ${workspaces.map((held) => held.sourcePath).join(', ') || 'none'}.`);
  }
  const tabId = await goHome(app.port);
  await act(app.port, tabId, 'selectWorkspace', workspace.repoIdentity);
  await until(
    async () => ({
      selected: (await gateCall(app.port, tabId, 'screen')).selectedWorkspace,
      createFrom: (await debugState(app.port)).tabs.find((tab) => tab.id === tabId)?.createFrom ?? null,
    }),
    (read) => read.selected === workspace.repoIdentity && read.createFrom === workspace.sourcePath,
    { what: `${workspace.name} selected in tab ${tabId}`, limitMs: 10_000, everyMs: 50 },
  );
  return { tabId, workspace };
}

export interface ProjectsStart {
  /** The Projects tab; each imported project stays open in a tab of its own. */
  tabId: string;
  workspaces: WorkspaceSummary[];
  /** One per source, in `sources` order. */
  workspacePaths: string[];
  /** A repo identity; `null` on Recent. */
  selectedWorkspace: string | null;
}

export async function quickStartProjects(
  app: QuickStartApp,
  { sources = [], select }: { sources?: readonly string[]; select?: string } = {},
): Promise<ProjectsStart> {
  await waitForGate(app.port);
  const workspacePaths: string[] = [];
  for (const source of sources) workspacePaths.push((await importForDesign(app, source)).workspacePath);
  const tabId = select === undefined ? await goHome(app.port) : (await selectWorkspace(app, select)).tabId;
  const { selectedWorkspace } = await gateCall(app.port, tabId, 'screen');
  return { tabId, workspaces: (await debugState(app.port)).workspaces, workspacePaths, selectedWorkspace };
}

export interface FramesStart {
  tabId: string;
  workspacePath: string;
  site: FixtureSite;
  /** Served by this library, not the product: the server book does not list it, and it exits with the app. */
  served: ServedSite;
  /** Each at its own path, so `guestTarget(port, frame.homeUrl)` is that frame's page. */
  frames: DebugFrameState[];
}

async function guestLoaded(port: string, url: string): Promise<boolean> {
  const guest = (await listTargets(port)).find((target) => target.type === 'webview' && target.url === url);
  if (guest === undefined) return false;
  return readJson<boolean>(guest, `document.readyState === 'complete'`);
}

export async function quickStartFrames(app: QuickStartApp, { frames = 1 }: { frames?: number } = {}): Promise<FramesStart> {
  await waitForGate(app.port);
  const site = makeFixtureSite({ root: join(app.root, 'sites') });
  const served = await serveFixtureSite(site, { owner: app.pid });
  const { tabId, workspacePath } = await importForDesign(app, site.path);
  const urls = Array.from({ length: frames }, (_, i) => `${served.url}frame-${String(i + 1)}/`);
  for (const url of urls) await act(app.port, tabId, 'addFrame', url);
  const screen = await until(
    () => gateCall(app.port, tabId, 'screen'),
    (read) => urls.every((url) => read.frames.some((frame) => frame.homeUrl === url)),
    { what: `${String(frames)} frames on the canvas`, limitMs: 15_000, everyMs: 100 },
  );
  await until(
    () => Promise.all(urls.map((url) => guestLoaded(app.port, url))),
    (loaded) => loaded.every(Boolean),
    { what: `${String(frames)} frames to load the fixture page`, limitMs: 30_000, everyMs: 200 },
  );
  const ours = urls.map((url) => screen.frames.find((frame) => frame.homeUrl === url) as DebugFrameState);
  return { tabId, workspacePath, site, served, frames: ours };
}
