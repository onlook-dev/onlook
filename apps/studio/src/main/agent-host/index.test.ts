import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { query } from '@anthropic-ai/claude-agent-sdk';
import {
  CLAUDE_LOGIN_COMMAND,
  DEFAULT_DEV_PORT,
  foldSessionState,
  type AgentConnection,
  type AgentConnectionStatus,
  type ClaudeSetupStatus,
  type ClaudeSetupState,
  type ConnectorInventory,
  type StudioEvent,
} from '@studio/events';
import { previousChatInstruction } from '../../instructions/handoff.js';
import { renameInstruction } from '../../instructions/naming.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from '../canvas/registry.js';
import { resetThumbnailServiceForTesting, thumbnailService } from '../canvas/thumbnail/index.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from 'bun:test';
import {
  cleanupTempFixtures,
  fakeElapsed,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { resetOnboardingCache } from '../onboarding/state.js';
import { resetSettingsCache, setSettingsHarness } from '../settings/state.js';
import { setRendererSource } from '../tabs/broadcast.js';
import { views } from '../tabs/views.js';
import { everyRenderer } from '../window/host.js';
import type { AgentBackend, BackendState, ModelPick } from './backend.js';
import { createCancelToken } from '../workspace/cancel.js';
import { awaitStartOutcome, resetSetupSignals } from '../workspace/setup-signals.js';
import { knownProject, rememberProject, renameProject, resetWorkspaceCache, setProjectHarness } from '../workspace/store.js';
import type { StudioToolSinks } from './studio-tools.js';
import { deriveClaudeConnection, marksSessionsStale } from './claude-connection.js';
import { DISPOSE_SESSION_LIMIT_MS } from './close-limits.js';
import { AgentHost, sessionResumable, startModel } from './index.js';
import { AgentSession } from './session.js';
import { SessionMap } from './session-map.js';
import { preferenceFor, rememberAllowRules, resetPreferencesCache } from './preferences.js';
import { readTranscript, resetTranscriptCache, writeTranscript } from './transcript.js';
import { archiveChat, readArchivedChats, resetChatHistoryCache } from './chat-history.js';
import {
  rememberAppServerThread,
  rememberSession,
  resetSessionsCache,
  storedAppServerThread,
  storedClaudeSession,
} from './sessions.js';
import { resetProjectHarnessCache } from './project-harness.js';
import { gcSweep, readImage, registerImage, resetImagesStore } from '../images/store.js';
import { noteServerStart, noteServerStop } from '../server/user-stop.js';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);

function imageRow(cwd: string, id: string): StudioEvent {
  return {
    type: 'message.user',
    turnId: 't',
    text: 'look at this',
    attachments: [{ id, mediaType: 'image/png' }],
    sessionId: 's',
    cwd,
    eventId: 'img-1',
    seq: 1,
    ts: 0,
  } as StudioEvent;
}

function claude(status: ClaudeSetupStatus): ClaudeSetupState {
  switch (status) {
    case 'failed': return { status, detail: 'exited', command: CLAUDE_LOGIN_COMMAND };
    case 'verification-failed': return { status, detail: 'turn-no-answer', command: CLAUDE_LOGIN_COMMAND };
    default: return { status, command: CLAUDE_LOGIN_COMMAND };
  }
}

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function registerWorkspaces(name: string, names: readonly string[]): string[] {
  const root = makeWorkspaceRoot({ name: `agent-host-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: `agent-host-${name}` });
  resetWorkspaceCache();
  return names.map((workspaceName) => {
    const workspacePath = join(root, workspaceName, 'main');
    mkdirSync(workspacePath, { recursive: true });
    rememberProject({
      workspacePath,
      workspaceName,
      branchName: `test/${workspaceName}`,
      baseBranch: 'main',
      sourceRepoName: `${workspaceName}-source`,
      sourcePath: join(root, `${workspaceName}-source`),
      sourceRepoRoot: join(root, `${workspaceName}-source`),
      repoIdentity: `agent-host-${workspaceName}`,
      copiedEnvFiles: [],
    });
    return workspacePath;
  });
}

function fakeSession(
  cwd: string,
  harness: AgentBackend['harness'] = 'claude',
  options: {
    onClose?: (push: (event: StudioEvent) => void) => Promise<void>;
    emit?: (event: StudioEvent) => void;
    modelPick?: ModelPick;
    transcriptPath?: string;
  } = {},
): {
  session: AgentBackend;
  push: (event: StudioEvent) => void;
  setModelCalls: string[];
  answered: string[];
  prompts: string[];
  origins: string[];
  displayOrigins: string[];
  contexts: (string | undefined)[];
  opened: () => boolean;
  opens: () => number;
  closed: () => boolean;
} {
  const setModelCalls: string[] = [];
  const answered: string[] = [];
  const prompts: string[] = [];
  const origins: string[] = [];
  const displayOrigins: string[] = [];
  const contexts: (string | undefined)[] = [];
  const events: StudioEvent[] = [];
  let opens = 0;
  let closed = false;
  const push = (event: StudioEvent): void => {
    events.push(event);
    options.emit?.(event);
  };
  const session: AgentBackend = {
    id: `session-${cwd}`,
    cwd,
    harness,
    events,
    isStreaming: false,
    isTurnLive: false,
    midTurn: 'steer',
    lastSeq: 7,
    ...(options.transcriptPath === undefined ? {} : { transcriptPath: options.transcriptPath }),
    eventsSince: () => [],
    welcome: () => {},
    open: () => {
      opens += 1;
    },
    prompt: (text, _attachments, context, origin, display) => {
      prompts.push(text);
      origins.push(origin ?? 'user');
      displayOrigins.push(display?.origin ?? origin ?? 'user');
      contexts.push(context);
      events.push({
        type: 'message.user',
        turnId: 't',
        text,
        origin: origin ?? 'user',
        sessionId: session.id,
        cwd,
        eventId: `e${String(prompts.length)}`,
        seq: prompts.length,
        ts: 0,
      } as StudioEvent);
      return true;
    },
    answerQuestion: () => false,
    dismissQuestion: () => Promise.resolve(false),
    respond: (requestId) => {
      answered.push(requestId);
      return true;
    },
    setPermissionMode: async () => true,
    setModel: async (model) => {
      setModelCalls.push(model);
      return options.modelPick ?? { accepted: true };
    },
    setEffort: async () => {},
    interrupt: async () => {},
    close: async () => {
      closed = true;
      await options.onClose?.(push);
    },
  };
  return {
    session,
    push,
    setModelCalls,
    answered,
    prompts,
    origins,
    displayOrigins,
    contexts,
    opened: () => opens > 0,
    opens: () => opens,
    closed: () => closed,
  };
}

test('connector commands respect the flag, provider allowlist and asking project', async () => {
  const saved = process.env['STUDIO_FLAGS'];
  const map = new SessionMap();
  const first = fakeSession('/workspaces/connector-first');
  const second = fakeSession('/workspaces/connector-second');
  const calls: string[] = [];
  first.session.addConnector = (provider) => { calls.push(`first:${provider}`); return true; };
  second.session.addConnector = (provider) => { calls.push(`second:${provider}`); return true; };
  second.session.actOnConnector = (id) => { calls.push(`second-row:${id}`); return true; };
  map.set(first.session); map.set(second.session);
  const host = new AgentHost(false, map);
  try {
    delete process.env['STUDIO_FLAGS'];
    expect(await host.command({ type: 'connectors.add', provider: 'figma' }, second.session.cwd)).toEqual({ accepted: false });
    expect(await host.command({ type: 'connectors.act', id: 'private' }, second.session.cwd)).toEqual({ accepted: false });
    expect(await host.command({ type: 'connectors.open', source: 'notice' }, second.session.cwd)).toEqual({ accepted: false });
    process.env['STUDIO_FLAGS'] = 'connectors';
    expect(await host.command({ type: 'connectors.add', provider: 'mobbin' }, second.session.cwd)).toEqual({ accepted: true });
    expect(await host.command({ type: 'connectors.add', provider: 'other' as 'figma' }, first.session.cwd)).toEqual({ accepted: false });
    expect(await host.command({ type: 'connectors.add', provider: 'figma' }, undefined)).toEqual({ accepted: false });
    expect(calls).toEqual(['second:mobbin']);
    expect(await host.command({ type: 'connectors.act', id: 'private' }, second.session.cwd)).toEqual({ accepted: true });
    expect(await host.command({ type: 'connectors.act', id: 'private' }, undefined)).toEqual({ accepted: false });
    expect(await host.command({ type: 'connectors.open', source: 'notice' }, second.session.cwd)).toEqual({ accepted: true });
    expect(calls).toEqual(['second:mobbin', 'second-row:private']);
  } finally { if (saved === undefined) delete process.env['STUDIO_FLAGS']; else process.env['STUDIO_FLAGS'] = saved; }
});

describe('connector telemetry through AgentHost', () => {
  const environmentKeys = [
    'STUDIO_STATE_ROOT',
    'STUDIO_WORKSPACE_ROOT',
    'STUDIO_FIRST_RUN',
    'STUDIO_HARNESS',
    'STUDIO_AGENT_PROBE',
    'STUDIO_FLAGS',
    'STUDIO_TELEMETRY',
    'STUDIO_POSTHOG_KEY',
    'STUDIO_POSTHOG_HOST',
    'MAIN_VITE_POSTHOG_KEY',
  ] as const;
  const savedEnvironment = new Map<string, string | undefined>();
  let savedFetch: typeof globalThis.fetch;
  let projects: [string, string];
  let currentHost: AgentHost | undefined;

  const firstInventory: ConnectorInventory = { servers: [
    { id: 'private-design', name: 'Private design client', featured: 'figma', state: 'connected' },
    { id: 'private-sign-in', name: 'Private sign-in client', state: 'needs-sign-in' },
    { id: 'private-retry', name: 'Private retry client', state: 'failed', error: 'Rust::Internal https://private.test/oauth' },
  ] };
  const secondInventory: ConnectorInventory = { servers: [
    { id: 'private-design', name: 'Private other account', featured: 'mobbin', state: 'sign-in-failed' },
    { id: 'private-connected', name: 'Private connected client', state: 'connected' },
  ] };

  function resetCaches(): void {
    resetWorkspaceCache();
    resetSettingsCache();
    resetOnboardingCache();
    resetSessionsCache();
    resetPreferencesCache();
    resetChatHistoryCache();
    resetTranscriptCache();
    resetProjectHarnessCache();
  }

  beforeEach(() => {
    for (const key of environmentKeys) {
      savedEnvironment.set(key, process.env[key]);
      delete process.env[key];
    }
    savedFetch = globalThis.fetch;
    resetTelemetryForTesting();
    process.env['STUDIO_FIRST_RUN'] = '0';
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
    process.env['STUDIO_FLAGS'] = 'connectors';
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    projects = registerWorkspaces('connector-telemetry', ['first', 'second']) as [string, string];
    resetCaches();
    const userData = makeStateRoot({ name: 'agent-host-connector-telemetry-userdata' });
    setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    globalThis.fetch = (() => Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
    initTelemetry();
    expect(peekQueueForTesting().filter((event) => event.event === 'app_opened')).toHaveLength(1);
  });

  afterEach(async () => {
    try {
      await currentHost?.dispose();
    } finally {
      currentHost = undefined;
      resetTelemetryForTesting();
      setAppForTesting(undefined);
      globalThis.fetch = savedFetch;
      for (const key of environmentKeys) {
        const value = savedEnvironment.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      resetCaches();
    }
  });

  function connectorEvents() {
    return peekQueueForTesting().filter((event) => event.event.startsWith('connector_'));
  }

  async function startHost(harness: AgentBackend['harness']) {
    const backends = new Map<string, ReturnType<typeof fakeSession>>();
    const restoring = new Set<string>();
    let sequence = 0;
    setProjectHarness(projects[0], harness === 'appserver' ? 'codex' : 'claude');
    setProjectHarness(projects[1], harness === 'appserver' ? 'claude' : 'codex');
    const host = new AgentHost(false, new SessionMap(), (cwd, ownHarness, _tools, onEvent) => {
      const backend = fakeSession(cwd, ownHarness, { emit: onEvent });
      Object.defineProperty(backend.session, 'isRestoringTranscript', { get: () => restoring.has(cwd) });
      backends.set(cwd, backend);
      return backend.session;
    });
    currentHost = host;
    for (const cwd of projects) {
      expect(await host.command({ type: 'session.start', cwd }, cwd)).toEqual({ accepted: true });
      expect(backends.has(cwd)).toBe(true);
    }
    expect(backends.get(projects[0])!.session.harness).toBe(harness);
    expect(backends.get(projects[1])!.session.harness).toBe(harness === 'appserver' ? 'claude' : 'appserver');

    function stamp(cwd: string) {
      sequence += 1;
      return { sessionId: backends.get(cwd)!.session.id, cwd, eventId: `connector-event-${sequence}`, seq: sequence, ts: 0 };
    }

    return {
      host,
      restoring,
      inventory: (cwd: string, connectors: ConnectorInventory | null): void => {
        backends.get(cwd)!.push({ ...stamp(cwd), type: 'session.settings', connectors });
      },
      tool: (cwd: string, name: string): void => {
        const event = stamp(cwd);
        backends.get(cwd)!.push({
          ...event,
          type: 'tool.start',
          toolCallId: event.eventId,
          name,
          kind: 'other',
          title: name,
          status: 'in_progress',
          input: { url: 'https://private.test/tool', query: 'Private tool argument' },
        });
      },
    };
  }

  test.each(['claude', 'appserver'] as const)('%s attributes inventories, menu sources and pre-menu tools to the asking Project', async (harness) => {
    const given = await startHost(harness);
    const [first, second] = projects;
    const firstHarness = harness === 'appserver' ? 'codex' : 'claude';
    const secondHarness = harness === 'appserver' ? 'claude' : 'codex';
    given.inventory(first, firstInventory);
    given.inventory(second, secondInventory);
    given.tool(first, 'mcp__private-design__get_design_context');
    given.tool(second, 'mcp__private-design__search_screens');
    expect(connectorEvents().map((event) => event.event)).toEqual([
      'connector_inventory_observed', 'connector_inventory_observed', 'connector_tool_used', 'connector_tool_used',
    ]);
    expect(await given.host.command({ type: 'connectors.open', source: 'add-menu' }, first)).toEqual({ accepted: true });
    expect(await given.host.command({ type: 'connectors.open', source: 'notice' }, second)).toEqual({ accepted: true });
    const rows = connectorEvents();
    expect(rows.map((event) => event.event)).toEqual([
      'connector_inventory_observed', 'connector_inventory_observed', 'connector_tool_used', 'connector_tool_used',
      'connector_menu_opened', 'connector_menu_opened',
    ]);
    expect(rows[0]!.properties).toMatchObject({ harness: firstHarness, inventory_known: true, connector_count: 3, needs_sign_in_count: 1, connected_count: 1, failed_count: 1, figma_connected_count: 1, mobbin_connected_count: 0, other_connected_count: 0 });
    expect(rows[1]!.properties).toMatchObject({ harness: secondHarness, inventory_known: true, connector_count: 2, needs_sign_in_count: 1, connected_count: 1, failed_count: 0, figma_connected_count: 0, mobbin_connected_count: 0, other_connected_count: 1 });
    expect(rows[2]!.properties).toMatchObject({ harness: firstHarness, connector: 'figma', connection_state: 'connected' });
    expect(rows[3]!.properties).toMatchObject({ harness: secondHarness, connector: 'mobbin', connection_state: 'sign-in-failed' });
    expect(rows[4]!.properties).toMatchObject({ harness: firstHarness, source: 'add-menu', inventory_known: true, connector_count: 3, needs_sign_in_count: 1, connected_count: 1, failed_count: 1 });
    expect(rows[5]!.properties).toMatchObject({ harness: secondHarness, source: 'notice', inventory_known: true, connector_count: 2, needs_sign_in_count: 1, connected_count: 1, failed_count: 0 });
    const serialized = JSON.stringify(rows);
    for (const secret of ['private-design', 'private-sign-in', 'private-retry', 'private-connected', 'Private', 'Rust::', 'private.test', 'get_design_context', 'search_screens']) {
      expect(serialized).not.toContain(secret);
    }
  });

  test.each(['claude', 'appserver'] as const)('%s suppresses replay analytics but retains restored inventory for live use', async (harness) => {
    const given = await startHost(harness);
    const [first] = projects;
    given.restoring.add(first);
    given.inventory(first, firstInventory);
    given.tool(first, 'mcp__private-design__get_design_context');
    expect(connectorEvents()).toEqual([]);
    given.restoring.delete(first);
    given.tool(first, 'mcp__private-design__get_design_context');
    expect(connectorEvents().map((event) => event.event)).toEqual(['connector_tool_used']);
    expect(connectorEvents()[0]!.properties).toMatchObject({ harness: harness === 'appserver' ? 'codex' : 'claude', connector: 'figma', connection_state: 'connected' });
    given.inventory(first, secondInventory);
    given.tool(first, 'mcp__private-design__search_screens');
    expect(connectorEvents().map((event) => event.event)).toEqual(['connector_tool_used', 'connector_inventory_observed', 'connector_tool_used']);
    expect(connectorEvents()[2]!.properties).toMatchObject({ harness: harness === 'appserver' ? 'codex' : 'claude', connector: 'mobbin', connection_state: 'sign-in-failed' });
  });

  test.each(['claude', 'appserver'] as const)('%s emits no connector analytics with the flag off', async (harness) => {
    const given = await startHost(harness);
    const [first, second] = projects;
    delete process.env['STUDIO_FLAGS'];
    given.inventory(first, firstInventory);
    given.inventory(second, secondInventory);
    given.tool(first, 'mcp__private-design__get_design_context');
    given.tool(second, 'mcp__private-design__search_screens');
    expect(await given.host.command({ type: 'connectors.open', source: 'plug' }, first)).toEqual({ accepted: false });
    expect(await given.host.command({ type: 'connectors.open', source: 'notice' }, second)).toEqual({ accepted: false });
    expect(connectorEvents()).toEqual([]);
    process.env['STUDIO_FLAGS'] = 'connectors';
    given.tool(first, 'mcp__private-design__get_design_context');
    expect(connectorEvents().map((event) => event.event)).toEqual(['connector_tool_used']);
    expect(connectorEvents()[0]!.properties).toMatchObject({ harness: harness === 'appserver' ? 'codex' : 'claude', connector: 'figma', connection_state: 'connected' });
  });

  test.each(['claude', 'appserver'] as const)('%s excludes Studio and Harness-internal tools without suppressing external use', async (harness) => {
    const given = await startHost(harness);
    const [first] = projects;
    given.tool(first, 'mcp__studio__create_frame');
    given.tool(first, 'Bash');
    if (harness === 'appserver') {
      for (const server of ['codex_app', 'codex_apps', 'cua_repl', 'node_repl']) {
        given.tool(first, `mcp__${server}__lookup`);
      }
    }
    expect(connectorEvents()).toEqual([]);
    given.tool(first, 'mcp__private-external__lookup');
    expect(connectorEvents().map((event) => event.event)).toEqual(['connector_tool_used']);
    expect(connectorEvents()[0]!.properties).toMatchObject({ harness: harness === 'appserver' ? 'codex' : 'claude', connector: 'other', connection_state: 'unknown' });
    if (harness === 'claude') {
      given.tool(first, 'mcp__codex_apps__lookup');
      expect(connectorEvents()).toHaveLength(2);
      expect(connectorEvents()[1]!.properties).toMatchObject({ harness: 'claude', connector: 'other', connection_state: 'unknown' });
    }
  });
});

function gate(): { wait: () => Promise<void>; reached: Promise<void>; open: () => void } {
  let open: () => void = () => undefined;
  let reach: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    open = resolve;
  });
  const reached = new Promise<void>((resolve) => {
    reach = resolve;
  });
  return {
    wait: () => {
      reach();
      return held;
    },
    reached,
    open,
  };
}

class RestartHost extends AgentHost {
  readonly starts: string[] = [];
  onStart: (cwd: string) => void | Promise<void> = () => undefined;

  protected override async startSession(cwd: string): Promise<void> {
    this.starts.push(cwd);
    await this.onStart(cwd);
  }
}

describe('AgentHost session isolation (ONL-2226 phase 3)', () => {
  test('snapshot for project B never answers with A\'s session', () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    const snapshotB = host.snapshot({}, '/workspaces/b');

    expect(snapshotB.sessionId).toBe(b.session.id);
    expect(snapshotB.cwd).toBe('/workspaces/b');
    expect(snapshotB.sessionId).not.toBe(a.session.id);
  });

  test('a command addressed to B only ever touches B\'s session', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    await host.command({ type: 'session.setModel', model: 'sonnet' }, '/workspaces/b');

    expect(b.setModelCalls).toEqual(['sonnet']);
    expect(a.setModelCalls).toEqual([]);
  });

  test('stopping B\'s session leaves A running', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    await host.command({ type: 'session.stop' }, '/workspaces/b');

    expect(b.closed()).toBe(true);
    expect(a.closed()).toBe(false);
    expect(map.get('/workspaces/a')).toBe(a.session);
    expect(map.get('/workspaces/b')).toBeUndefined();
  });

  test('a read with no resolved project touches nothing', () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = new AgentHost(false, map);

    const snapshot = host.snapshot({}, undefined);

    expect(snapshot.sessionId).toBeUndefined();
    expect(snapshot.cwd).toBeUndefined();
  });
});

describe('AgentHost with two live sessions (ONL-2243)', () => {
  test('starting a session in one project does not stop an unrelated one', async () => {
    const [held, starting] = registerWorkspaces('start-leaves-others', ['held', 'starting']) as [string, string];
    const map = new SessionMap();
    const a = fakeSession(held);
    map.set(a.session);
    const started = fakeSession(starting);
    const host = new AgentHost(false, map, () => started.session);

    await host.command({ type: 'session.start', cwd: starting }, starting);

    // Positive control: a start refused at the guard would also touch nothing.
    expect(started.opened()).toBe(true);
    expect(map.get(starting)).toBe(started.session);

    expect(a.closed()).toBe(false);
    expect(map.get(held)).toBe(a.session);
  });

  test('a tab closing stops that project and no other', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    await host.releaseWorkspace('/workspaces/b');

    expect(b.closed()).toBe(true);
    expect(map.get('/workspaces/b')).toBeUndefined();
    expect(a.closed()).toBe(false);
    expect(map.get('/workspaces/a')).toBe(a.session);
  });

  test('quit stops every live session', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    await host.dispose();

    expect(a.closed()).toBe(true);
    expect(b.closed()).toBe(true);
    expect(map.size).toBe(0);
  });

  test("a permission answer goes to the asking view's session alone", async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    await host.command(
      { type: 'permission.respond', requestId: 'req-1', optionId: 'allow' },
      '/workspaces/b',
    );

    expect(b.answered).toEqual(['req-1']);
    expect(a.answered).toEqual([]);
  });

  test('Resume sends a fixed user-origin prompt on both Harnesses and cannot replay it twice', async () => {
    for (const harness of ['claude', 'appserver'] as const) {
      const map = new SessionMap();
      const stopped = fakeSession(`/workspaces/resume-${harness}`, harness);
      stopped.push({ type: 'turn.ended', turnId: 't1', stopReason: 'interrupted', sessionId: stopped.session.id, eventId: 'stopped', seq: 1, ts: 0 });
      map.set(stopped.session);
      const host = new AgentHost(false, map);
      expect(await host.command({ type: 'turn.resume', method: 'Private message' as never }, stopped.session.cwd)).toEqual({ accepted: false });
      expect(stopped.prompts).toEqual([]);
      expect(await host.command({ type: 'turn.resume', method: 'play-button' }, stopped.session.cwd)).toEqual({ accepted: true });
      expect(stopped.prompts).toEqual(['continue']);
      expect(stopped.origins).toEqual(['user']);
      expect(stopped.displayOrigins).toEqual(['studio']);
      expect(await host.command({ type: 'turn.resume', method: 'enter' }, stopped.session.cwd)).toEqual({ accepted: false });
    }
  });

  test('Continue picks up a turn that failed on the service, and nothing else (ONL-2973)', async () => {
    const failed = (name: string, error: Record<string, unknown>) => {
      const session = fakeSession(`/workspaces/${name}`);
      const id = session.session.id;
      session.push({ type: 'turn.started', turnId: 't1', sessionId: id, eventId: 'started', seq: 1, ts: 0 });
      session.push({ type: 'message.user', turnId: 't1', text: 'Make the button stand out', sessionId: id, eventId: 'user', seq: 2, ts: 0 });
      session.push({ type: 'session.error', message: 'API Error', ...error, sessionId: id, eventId: 'error', seq: 3, ts: 0 } as StudioEvent);
      session.push({ type: 'turn.ended', turnId: 't1', stopReason: 'failed', sessionId: id, eventId: 'ended', seq: 4, ts: 0 });
      return session;
    };
    const map = new SessionMap();
    const overloaded = failed('continue-529', { code: 'api_error', apiErrorStatus: 529 });
    const crashed = failed('continue-crash', { code: 'spawn_failed' });
    map.set(overloaded.session);
    map.set(crashed.session);
    const host = new AgentHost(false, map);
    expect(await host.command({ type: 'turn.resume', method: 'play-button' }, overloaded.session.cwd)).toEqual({ accepted: false });
    expect(await host.command({ type: 'turn.resume', method: 'error-line' }, crashed.session.cwd)).toEqual({ accepted: false });
    expect(overloaded.prompts).toEqual([]);
    expect(await host.command({ type: 'turn.resume', method: 'error-line' }, overloaded.session.cwd)).toEqual({ accepted: true });
    expect(overloaded.prompts).toEqual(['continue']);
    expect(overloaded.displayOrigins).toEqual(['studio']);
  });

  test('Resume refuses finished work and a live turn', async () => {
    const map = new SessionMap();
    const idle = fakeSession('/workspaces/not-stopped');
    map.set(idle.session);
    const host = new AgentHost(false, map);
    expect(await host.command({ type: 'turn.resume', method: 'enter' }, idle.session.cwd)).toEqual({ accepted: false });
    expect(idle.prompts).toEqual([]);
  });

  test('an answer naming its project reaches it from a view that owns no session (ONL-2190)', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = new AgentHost(false, map);

    const acceptance = await host.command(
      { type: 'permission.respond', requestId: 'req-1', optionId: 'allow', cwd: '/workspaces/a' },
      undefined,
    );

    expect(acceptance).toEqual({ accepted: true });
    expect(a.answered).toEqual(['req-1']);
  });

  test('an answer that reaches no session is reported as not accepted (ONL-2190)', async () => {
    const host = new AgentHost(false, new SessionMap());

    const acceptance = await host.command(
      { type: 'permission.respond', requestId: 'req-1', optionId: 'allow' },
      undefined,
    );

    expect(acceptance).toEqual({ accepted: false });
  });
});

describe("a project's starts and stops resolve to the latest intent (ONL-2264)", () => {
  test('a release landing while a start is still planning leaves no session, and the backend is never made', async () => {
    const [cwd] = registerWorkspaces('start-then-release', ['w']) as [string];
    const map = new SessionMap();
    let made = 0;
    const host = new AgentHost(false, map, () => {
      made += 1;
      return fakeSession(cwd).session;
    });

    const start = host.command({ type: 'session.start', cwd }, cwd);
    const release = host.releaseWorkspace(cwd);
    await Promise.all([start, release]);

    expect(map.size).toBe(0);
    expect(made).toBe(0);
  });

  test('two starts asked for together make one backend, opened once', async () => {
    const [cwd] = registerWorkspaces('double-start', ['w']) as [string];
    const map = new SessionMap();
    const made: ReturnType<typeof fakeSession>[] = [];
    const host = new AgentHost(false, map, () => {
      const next = fakeSession(cwd);
      made.push(next);
      return next.session;
    });

    await Promise.all([
      host.command({ type: 'session.start', cwd }, cwd),
      host.command({ type: 'session.start', cwd }, cwd),
    ]);

    expect(made).toHaveLength(1);
    expect(made[0]?.opens()).toBe(1);
    expect(map.get(cwd)).toBe(made[0]?.session);
  });

  test('start, release, start again before the first resolves: one session, opened once, never closed', async () => {
    const [cwd] = registerWorkspaces('reopen-mid-start', ['w']) as [string];
    const map = new SessionMap();
    const made: ReturnType<typeof fakeSession>[] = [];
    const host = new AgentHost(false, map, () => {
      const next = fakeSession(cwd);
      made.push(next);
      return next.session;
    });

    await Promise.all([
      host.command({ type: 'session.start', cwd }, cwd),
      host.releaseWorkspace(cwd),
      host.command({ type: 'session.start', cwd }, cwd),
    ]);

    expect(made).toHaveLength(1);
    expect(made[0]?.opens()).toBe(1);
    expect(made[0]?.closed()).toBe(false);
    expect(map.get(cwd)).toBe(made[0]?.session);
  });

  test('a start that finished, then a release, then a start: the first session closed, the second live', async () => {
    const [cwd] = registerWorkspaces('close-then-reopen', ['w']) as [string];
    const map = new SessionMap();
    const made: ReturnType<typeof fakeSession>[] = [];
    const host = new AgentHost(false, map, () => {
      const next = fakeSession(cwd);
      made.push(next);
      return next.session;
    });

    await host.command({ type: 'session.start', cwd }, cwd);
    await host.releaseWorkspace(cwd);
    await host.command({ type: 'session.start', cwd }, cwd);

    expect(made).toHaveLength(2);
    expect(made[0]?.closed()).toBe(true);
    expect(made[1]?.closed()).toBe(false);
    expect(map.get(cwd)).toBe(made[1]?.session);
  });

  test('a release with neither a session nor a start touches nothing', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = new AgentHost(false, map);

    await host.releaseWorkspace('/workspaces/none');

    expect(map.size).toBe(1);
    expect(a.closed()).toBe(false);
  });
});

function row(
  type: 'message.user' | 'session.ended' | 'session.welcome',
  cwd: string,
  seq: number,
  id = 'e',
  origin: 'user' | 'studio' = 'user',
): StudioEvent {
  const envelope = { sessionId: 's', cwd, eventId: `${id}-${String(seq)}`, seq, ts: 0 };
  if (type === 'session.ended') return { type, reason: 'completed', ...envelope } as StudioEvent;
  if (type === 'session.welcome') {
    const workspace = {
      sourceRepoName: 'site',
      workspaceName: 'w',
      branchName: 'studio/w',
      baseBranch: 'main',
    };
    return { type, workspace, ...envelope } as StudioEvent;
  }
  return { type, turnId: 't', text: 'x', origin, ...envelope } as StudioEvent;
}

const never = (): Promise<void> => new Promise<void>(() => undefined);

async function drain(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function outcomeWithin(work: Promise<unknown>, ms: number): Promise<'settled' | 'rejected' | 'hung'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.then(
        () => 'settled' as const,
        () => 'rejected' as const,
      ),
      new Promise<'hung'>((resolve) => {
        timer = setTimeout(() => resolve('hung'), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function hangingQuery(): typeof query {
  return (() => ({
    [Symbol.asyncIterator]: (): AsyncIterator<unknown> => ({
      next: () => new Promise<IteratorResult<unknown>>(() => undefined),
    }),
    interrupt: never,
    setModel: async (): Promise<void> => undefined,
    applyFlagSettings: async (): Promise<void> => undefined,
    supportedModels: async (): Promise<never[]> => [],
    setMcpPermissionModeOverride: async (): Promise<void> => undefined,
  })) as unknown as typeof query;
}

describe('a session writes its own tail, and every close has a limit (ONL-2254)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = (ms: number): void => {
    jest.advanceTimersByTime(ms);
  };

  test('quit with three sessions whose close never returns: every closing row persists, and quit costs one limit', async () => {
    const cwds = registerWorkspaces('quit-three', ['a', 'b', 'c']);
    const map = new SessionMap();
    const host = new AgentHost(false, map, (cwd, _harness, _tools, emit) =>
      fakeSession(cwd, 'claude', {
        emit,
        onClose: (push) => {
          push(row('session.ended', cwd, 1));
          return never();
        },
      }).session,
    );
    for (const cwd of cwds) await host.command({ type: 'session.start', cwd }, cwd);

    jest.useFakeTimers();
    const took = await fakeElapsed(host.dispose(), { advance, limitMs: DISPOSE_SESSION_LIMIT_MS * 3 });
    jest.useRealTimers();
    expect(took).toBeLessThan(DISPOSE_SESSION_LIMIT_MS * 2);
    expect(map.size).toBe(0);
    for (const cwd of cwds) {
      expect(readTranscript(cwd, 'claude').map((event) => event.type)).toEqual(['session.ended']);
    }
  });

  test('a row pushed during close reaches the persisted transcript under its own project', async () => {
    const [cwd] = registerWorkspaces('close-row', ['w']) as [string];
    const host = new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) =>
      fakeSession(c, 'claude', {
        emit,
        onClose: async (push) => {
          push(row('session.ended', c, 1));
        },
      }).session,
    );
    await host.command({ type: 'session.start', cwd }, cwd);

    await host.releaseWorkspace(cwd);

    expect(readTranscript(cwd, 'claude').map((event) => event.type)).toEqual(['session.ended']);
  });

  test("a reopen while the old session is still closing: the old tail persists from the old session's events, and the new session writes only its own", async () => {
    const [cwd] = registerWorkspaces('reopen-tail', ['w']) as [string];
    const closing = gate();
    const made: ReturnType<typeof fakeSession>[] = [];
    const host = new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) => {
      const next = fakeSession(c, 'claude', made.length === 0 ? { emit, onClose: closing.wait } : { emit });
      made.push(next);
      return next.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    const old = made[0];
    if (old === undefined) throw new Error('the backend seam was never reached');
    old.push(row('message.user', cwd, 1));

    const release = host.releaseWorkspace(cwd);
    await closing.reached;
    const reopen = host.command({ type: 'session.start', cwd }, cwd);
    await drain();
    old.push(row('session.ended', cwd, 2));

    expect(readTranscript(cwd, 'claude').map((event) => event.type)).toEqual(['message.user', 'session.ended']);

    closing.open();
    await Promise.all([release, reopen]);
    const fresh = made[1];
    if (fresh === undefined) throw new Error('the reopen made no session');
    fresh.push(row('message.user', cwd, 1, 'fresh'));
    expect(readTranscript(cwd, 'claude').map((event) => event.eventId)).toEqual(['fresh-1']);
  });

  test('a close that rejects fails only itself: the others still close, and quit resolves', async () => {
    const cwds = registerWorkspaces('quit-reject', ['a', 'b', 'c']);
    const [, failing] = cwds;
    const map = new SessionMap();
    const made: ReturnType<typeof fakeSession>[] = [];
    const host = new AgentHost(false, map, (c, _harness, _tools, emit) => {
      const next = fakeSession(
        c,
        'claude',
        c === failing
          ? {
              emit,
              onClose: async () => {
                throw new Error('close failed');
              },
            }
          : { emit },
      );
      made.push(next);
      return next.session;
    });
    for (const cwd of cwds) await host.command({ type: 'session.start', cwd }, cwd);

    expect(await outcomeWithin(host.dispose(), DISPOSE_SESSION_LIMIT_MS * 3)).toBe('settled');
    expect(made.map((fake) => fake.closed())).toEqual([true, true, true]);
    expect(map.size).toBe(0);
  });

  test('quit with one live, one closing and one start in flight: all three under one limit, the start never adopts, and each Claude session records its end first', async () => {
    const [live, closingCwd, starting] = registerWorkspaces('quit-mixed', ['live', 'closing', 'starting']) as [
      string,
      string,
      string,
    ];
    const map = new SessionMap();
    const made: string[] = [];
    const ended: string[] = [];
    const host = new AgentHost(false, map, (c, _harness, _tools, emit) => {
      made.push(c);
      return new AgentSession({
        cwd: c,
        sessionId: `sid-${String(made.length)}`,
        query: hangingQuery(),
        onEvent: emit,
        onState: () => undefined,
        onConnection: () => undefined,
        onEnded: () => {
          ended.push(c);
        },
      });
    });
    await host.command({ type: 'session.start', cwd: live }, live);
    await host.command({ type: 'session.start', cwd: closingCwd }, closingCwd);
    const release = host.releaseWorkspace(closingCwd);
    const start = host.command({ type: 'session.start', cwd: starting }, starting);

    jest.useFakeTimers();
    const took = await fakeElapsed(host.dispose(), { advance, limitMs: DISPOSE_SESSION_LIMIT_MS * 3 });
    jest.useRealTimers();

    expect([...ended].sort()).toEqual([live, closingCwd].sort());
    expect(took).toBeLessThan(DISPOSE_SESSION_LIMIT_MS);
    await Promise.all([release, start]);
    expect(made).toEqual([live, closingCwd]);
    expect(map.size).toBe(0);
    for (const cwd of [live, closingCwd]) {
      expect(readTranscript(cwd, 'claude').at(-1)?.type).toBe('session.ended');
    }
  });
});

describe("the session's server_running report reaches the setup machine (ONL-2179)", () => {
  test.each(['claude', 'appserver'] as const)('a %s start failure reaches setup after the streaming edge falls', async (harness) => {
    resetSetupSignals();
    const [cwd] = registerWorkspaces(`start-failure-${harness}`, ['app']) as [string];
    const started = fakeSession(cwd, harness);
    let publish: ((event: StudioEvent) => void) | undefined;
    let stateChanged: ((state: BackendState) => void) | undefined;
    const host = new AgentHost(false, new SessionMap(), (_cwd, _harness, _tools, onEvent, _connection, onState) => {
      publish = onEvent;
      stateChanged = onState;
      return started.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    if (!publish || !stateChanged) throw new Error('backend callbacks missing');
    const outcome = awaitStartOutcome(cwd, createCancelToken(), async () => ({ kind: 'no-setup' }));
    stateChanged({ isStreaming: true, isTurnLive: true, midTurn: 'steer' });
    stateChanged({ isStreaming: false, isTurnLive: false, midTurn: 'steer' });
    publish({ type: 'turn.ended', cwd, turnId: 'start', stopReason: harness === 'claude' ? 'api_error' : 'failed', isError: true, sessionId: started.session.id, eventId: 'ended', seq: 1, ts: 0 });
    expect(await outcome).toEqual({ kind: 'turn-failed' });
  });

  test('a report through the sinks the host hands the backend settles a pending Start wait with its port, and the default port when none was named', async () => {
    resetSetupSignals();
    const [cwd] = registerWorkspaces('report-reaches-setup', ['reported']) as [string];
    const map = new SessionMap();
    const started = fakeSession(cwd);
    let sinks: StudioToolSinks | undefined;
    const host = new AgentHost(false, map, (_cwd, _harness, tools) => {
      sinks = tools;
      return started.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    if (sinks === undefined) throw new Error('the backend seam was never reached');

    const declined = { kind: 'not-placed', reason: 'no canvas in this test' } as const;
    const named = awaitStartOutcome(cwd, createCancelToken(), async () => declined);
    expect(await sinks.onServerRunning(4321, undefined)).toEqual({ frame: declined });
    expect(await named).toEqual({ kind: 'reported', port: 4321, frame: declined });

    const unnamed = awaitStartOutcome(cwd, createCancelToken(), async () => declined);
    await sinks.onServerRunning(undefined, undefined);
    expect(await unnamed).toEqual({ kind: 'reported', port: DEFAULT_DEV_PORT, frame: declined });
  });

  test('the report waits for the setup to place its first frame, and a report with no setup waiting says so (ONL-2424)', async () => {
    resetSetupSignals();
    const [cwd] = registerWorkspaces('report-answers-frame', ['reported']) as [string];
    const map = new SessionMap();
    const started = fakeSession(cwd);
    let sinks: StudioToolSinks | undefined;
    const host = new AgentHost(false, map, (_cwd, _harness, tools) => {
      sinks = tools;
      return started.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    if (sinks === undefined) throw new Error('the backend seam was never reached');

    let release: () => void = () => undefined;
    const placing = new Promise<void>((resolve) => {
      release = resolve;
    });
    void awaitStartOutcome(cwd, createCancelToken(), async () => {
      await placing;
      return { kind: 'not-placed', reason: 'released' };
    });
    let answered = false;
    const ack = sinks.onServerRunning(4321, undefined);
    void Promise.resolve(ack).then(() => {
      answered = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(answered).toBe(false);
    release();
    expect(await ack).toEqual({ frame: { kind: 'not-placed', reason: 'released' } });

    expect(await sinks.onServerRunning(4321, undefined)).toEqual({ frame: { kind: 'no-setup' } });
  });
});

describe('deriveClaudeConnection (ONL-2186)', () => {
  const table: Array<[AgentConnectionStatus | undefined, ClaudeSetupStatus, AgentConnectionStatus | undefined]> = [
    ['ok', 'signed-in', 'ok'],
    ['ok', 'signed-out', 'unauthenticated'],
    ['ok', 'failed', undefined],
    ['ok', 'checking', undefined],
    ['ok', 'idle', undefined],
    ['ok', 'signing-in', undefined],
    ['ok', 'awaiting-code', undefined],
    ['cli_missing', 'signed-in', 'cli_missing'],
    ['cli_missing', 'signed-out', 'cli_missing'],
    ['error', 'signed-in', 'error'],
    ['unknown', 'signed-in', 'ok'],
    ['unknown', 'signed-out', 'unauthenticated'],
    [undefined, 'signed-in', 'ok'],
    [undefined, 'failed', undefined],
  ];

  test.each(table)('probe %s + machine %s -> %s, stamped claude', (probe, setup, expected) => {
    const derived = deriveClaudeConnection(probe === undefined ? undefined : { status: probe }, setup);
    if (expected === undefined) expect(derived).toBeUndefined();
    else expect(derived).toEqual({ status: expected, harness: 'claude' });
  });

  test('the probe verdict keeps its detail when it wins', () => {
    expect(deriveClaudeConnection({ status: 'cli_missing', detail: 'no binary' }, 'signed-in')).toEqual({
      status: 'cli_missing',
      detail: 'no binary',
      harness: 'claude',
    });
  });

  test.each([[undefined, 'cli_missing'], ['ok', 'cli_missing'], ['error', 'error']] as const)('a spawn failure maps probe %s to %s (ONL-2671)', (status, expected) => {
    expect(deriveClaudeConnection(status === undefined ? undefined : { status }, 'failed', 'spawn')).toEqual({
      status: expected,
      harness: 'claude',
    });
  });

  test('a spawn failure preserves an existing missing-runtime diagnosis and its detail', () => {
    expect(deriveClaudeConnection({ status: 'cli_missing', detail: 'no bundled runtime' }, 'failed', 'spawn')).toEqual({
      status: 'cli_missing',
      detail: 'no bundled runtime',
      harness: 'claude',
    });
  });

  test('a failed setup without a spawn diagnosis retains the probe verdict', () => {
    for (const status of [undefined, 'ok'] as const) {
      expect(deriveClaudeConnection(status === undefined ? undefined : { status }, 'failed')).toBeUndefined();
      expect(deriveClaudeConnection(status === undefined ? undefined : { status }, 'failed', 'exited')).toBeUndefined();
    }
    expect(deriveClaudeConnection({ status: 'error', detail: 'probe error' }, 'failed')).toEqual({
      status: 'error',
      detail: 'probe error',
      harness: 'claude',
    });
  });

  test('stale marking: only a login-following transition INTO signed-in', () => {
    expect(marksSessionsStale('signed-out', 'signed-in', true)).toBe(true);
    expect(marksSessionsStale('failed', 'signed-in', true)).toBe(true);
    expect(marksSessionsStale('idle', 'signed-in', true)).toBe(true);
    expect(marksSessionsStale('signed-in', 'signed-in', true)).toBe(false);
    expect(marksSessionsStale('signed-out', 'signed-in', false)).toBe(false);
    expect(marksSessionsStale('signed-out', 'signed-out', true)).toBe(false);
    expect(marksSessionsStale('signed-out', 'failed', true)).toBe(false);
    expect(marksSessionsStale('signed-out', 'verifying', true)).toBe(false);
  });

  test('a verification in flight writes nothing, so the composer is neither opened nor closed mid-check (ONL-2496)', () => {
    expect(deriveClaudeConnection({ status: 'ok' }, 'verifying')).toBeUndefined();
    expect(deriveClaudeConnection(undefined, 'verifying')).toBeUndefined();
  });

  test('a failed verification is unauthenticated only when a sign-in would fix it (ONL-2496)', () => {
    expect(deriveClaudeConnection({ status: 'ok' }, 'verification-failed', 'turn-signed-out')).toEqual({
      status: 'unauthenticated',
      harness: 'claude',
    });
    for (const detail of ['turn-provider-refused', 'turn-usage-limit', 'turn-rate-limited', 'turn-service-error', 'turn-billing', 'turn-agent-error', 'turn-no-answer'] as const) {
      expect(deriveClaudeConnection({ status: 'ok' }, 'verification-failed', detail), detail).toEqual({
        status: 'error',
        harness: 'claude',
      });
    }
    expect(deriveClaudeConnection({ status: 'ok' }, 'verification-failed')).toEqual({ status: 'error', harness: 'claude' });
  });

  test('a probe that already failed still outranks a failed verification', () => {
    expect(deriveClaudeConnection({ status: 'cli_missing' }, 'verification-failed', 'turn-signed-out')).toEqual({
      status: 'cli_missing',
      harness: 'claude',
    });
  });
});

describe('AgentHost and the Claude machine (ONL-2186)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_FIRST_RUN', 'STUDIO_HARNESS', 'STUDIO_AGENT_PROBE'] as const;
  let stateRoot: string;
  const workspaceDirs: string[] = [];

  beforeAll(() => {
    stateRoot = mkdtempSync(join(tmpdir(), 'studio-agent-host-claude-'));
  });
  afterAll(() => {
    rmSync(stateRoot, { recursive: true, force: true });
    for (const dir of workspaceDirs) rmSync(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env['STUDIO_STATE_ROOT'] = stateRoot;
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_HARNESS'];
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  const connection = (host: AgentHost) => host.snapshot({}, undefined).connection;

  async function probed(probe: AgentConnectionStatus, map = new SessionMap()): Promise<AgentHost> {
    process.env['STUDIO_AGENT_PROBE'] = probe;
    const host = new AgentHost(false, map);
    await host.probe();
    return host;
  }

  test('probe ok + machine signed-out writes unauthenticated stamped claude; signed-in writes ok', async () => {
    const host = await probed('ok');
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    expect(connection(host)).toEqual({ status: 'unauthenticated', harness: 'claude' });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    expect(connection(host)).toEqual({ status: 'ok', harness: 'claude' });
  });

  test('a re-detect landing on the same verdict emits nothing; a changed one emits once', async () => {
    const sent: string[] = [];
    setRendererSource(() => [{ isDestroyed: () => false, send: (channel: string) => void sent.push(channel) }] as never);
    try {
      const host = await probed('ok');
      host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
      const emittedOnce = sent.filter((channel) => channel === 'agent:connection').length;
      host.noteClaudeSetup(claude('checking'), { afterLogin: true });
      host.noteClaudeSetup(claude('signed-out'), { afterLogin: true });
      expect(sent.filter((channel) => channel === 'agent:connection').length).toBe(emittedOnce);
      host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });
      expect(sent.filter((channel) => channel === 'agent:connection').length).toBe(emittedOnce + 1);
      expect(connection(host)).toEqual({ status: 'ok', harness: 'claude' });
    } finally {
      setRendererSource(everyRenderer);
    }
  });

  test('machine failed and the busy statuses leave the probe verdict as it was', async () => {
    const host = await probed('ok');
    const before = connection(host);
    for (const status of ['checking', 'failed', 'signing-in', 'awaiting-code'] as const) {
      host.noteClaudeSetup(claude(status), { afterLogin: true });
      expect(connection(host)).toEqual(before);
    }
  });

  test('a signed-out machine reaches the tab of a live Claude session, and a later sign-in clears it', async () => {
    const map = new SessionMap();
    map.set(fakeSession('/workspaces/a').session);
    const host = await probed('ok', map);
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    expect(host.snapshot({}, '/workspaces/a').connection).toEqual({ status: 'unauthenticated', harness: 'claude' });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });
    expect(host.snapshot({}, '/workspaces/a').connection).toEqual({ status: 'ok', harness: 'claude' });
  });

  test('the write is skipped when the chosen harness is codex and onboarding is complete', async () => {
    process.env['STUDIO_HARNESS'] = 'codex';
    const host = await probed('ok');
    const before = connection(host);
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    expect(connection(host)).toEqual(before);
    expect(before.harness).not.toBe('claude');
  });

  test('after a login, a stale Claude session Studio could not restart, its project unregistered, is prompted in place rather than torn down', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = await probed('ok', map);
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    host.noteClaudeSetup(claude('checking'), { afterLogin: true });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });

    const stale = await host.command({ type: 'prompt', text: 'hi' }, '/workspaces/a');
    expect(a.closed()).toBe(false);
    expect(a.prompts).toEqual(['hi']);
    expect(stale).toEqual({ accepted: true });
    expect(map.get('/workspaces/a')).toBe(a.session);
  });

  function registeredWorkspace(): string {
    const dir = mkdtempSync(join(tmpdir(), 'studio-agent-host-ws-'));
    workspaceDirs.push(dir);
    rememberProject({
      workspacePath: dir,
      workspaceName: 'teal-skylark',
      branchName: 'ldavinci/teal-skylark',
      baseBranch: 'main',
      sourceRepoName: 'react-project-v1',
      sourcePath: dir,
      sourceRepoRoot: dir,
      repoIdentity: 'fixture-repo',
      copiedEnvFiles: [],
    });
    return dir;
  }

  async function staleRestartHost(map: SessionMap): Promise<RestartHost> {
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
    const host = new RestartHost(false, map);
    await host.probe();
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });
    return host;
  }

  test('two prompts arriving across one stale restart both land on the new session', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const before = fakeSession(cwd);
    map.set(before.session);
    const host = await staleRestartHost(map);

    const after = fakeSession(cwd);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    host.onStart = async () => {
      await held;
      map.set(after.session);
    };

    const first = host.command({ type: 'prompt', text: 'one' }, cwd);
    const second = host.command({ type: 'prompt', text: 'two' }, cwd);
    release();

    expect(await first).toEqual({ accepted: true });
    expect(await second).toEqual({ accepted: true });
    expect(host.starts).toEqual([cwd]);
    expect(before.closed()).toBe(true);
    expect([...after.prompts].sort()).toEqual(['one', 'two']);
  });

  test('a server Start cancelled by Stop during stale-session replacement sends no late recovery prompt', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const before = fakeSession(cwd);
    map.set(before.session);
    const host = await staleRestartHost(map);
    const after = fakeSession(cwd);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    host.onStart = async () => { await held; map.set(after.session); };
    const pending = new AbortController();
    const start = host.studioPrompt(cwd, 'Start the app', undefined, pending.signal);
    pending.abort();
    release();
    expect(await start).toBe(false);
    expect(after.prompts).toEqual([]);
  });

  test('a start that lands no session re-arms the mark, so the session that returns is restarted too', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const first = fakeSession(cwd);
    map.set(first.session);
    const host = await staleRestartHost(map);

    expect(await host.command({ type: 'prompt', text: 'one' }, cwd)).toEqual({ accepted: false });
    expect(first.closed()).toBe(true);
    expect(host.starts).toEqual([cwd]);

    const returned = fakeSession(cwd);
    map.set(returned.session);
    const restarted = fakeSession(cwd);
    host.onStart = () => {
      map.set(restarted.session);
    };
    expect(await host.command({ type: 'prompt', text: 'two' }, cwd)).toEqual({ accepted: true });
    expect(host.starts).toEqual([cwd, cwd]);
    expect(returned.closed()).toBe(true);
    expect(restarted.prompts).toEqual(['two']);
  });

  test('a login leaves a codex session in a registered project running: its next prompt lands in place', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const codex = fakeSession(cwd, 'appserver');
    map.set(codex.session);
    const host = await staleRestartHost(map);

    expect(await host.command({ type: 'prompt', text: 'hi' }, cwd)).toEqual({ accepted: true });
    expect(host.starts).toEqual([]);
    expect(codex.closed()).toBe(false);
    expect(codex.prompts).toEqual(['hi']);
  });

  test('a release landing while the restart closes the stale session leaves nothing, and the prompt is refused (ONL-2264)', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const closing = gate();
    const before = fakeSession(cwd, 'claude', { onClose: closing.wait });
    map.set(before.session);
    let made = 0;
    const host = new AgentHost(false, map, () => {
      made += 1;
      return fakeSession(cwd).session;
    });
    await host.probe();
    host.noteClaudeSetup(claude('signed-out'), { afterLogin: false });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });

    const prompt = host.command({ type: 'prompt', text: 'one' }, cwd);
    await closing.reached;
    const release = host.releaseWorkspace(cwd);
    closing.open();

    expect(await prompt).toEqual({ accepted: false });
    await release;
    expect(map.size).toBe(0);
    expect(made).toBe(0);
    expect(before.prompts).toEqual([]);
  });

  test('a restart released between its halves never asks for its start', async () => {
    const cwd = registeredWorkspace();
    const map = new SessionMap();
    const closing = gate();
    const before = fakeSession(cwd, 'claude', { onClose: closing.wait });
    map.set(before.session);
    const host = await staleRestartHost(map);

    const prompt = host.command({ type: 'prompt', text: 'one' }, cwd);
    await closing.reached;
    const release = host.releaseWorkspace(cwd);
    closing.open();

    expect(await prompt).toEqual({ accepted: false });
    await release;
    expect(host.starts).toEqual([]);
  });

  test('the boot pre-check landing on signed-in marks nothing, and neither does a signed-in reconfirmation', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = await probed('ok', map);
    host.noteClaudeSetup(claude('checking'), { afterLogin: false });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    host.noteClaudeSetup(claude('checking'), { afterLogin: true });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });
    expect(await host.command({ type: 'prompt', text: 'still here' }, '/workspaces/a')).toEqual({ accepted: true });
    expect(a.closed()).toBe(false);
    expect(a.prompts).toEqual(['still here']);
  });
});

describe('studioPrompt (ONL-2179)', () => {
  test("pushes with origin studio into that project's session alone; a user command stays user", async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    const b = fakeSession('/workspaces/b');
    map.set(a.session);
    map.set(b.session);
    const host = new AgentHost(false, map);

    expect(await host.studioPrompt('/workspaces/a', 'start it', 'ctx')).toBe(true);
    expect(await host.command({ type: 'prompt', text: 'and this' }, '/workspaces/a')).toEqual({ accepted: true });

    expect(a.prompts).toEqual(['start it', 'and this']);
    expect(a.origins).toEqual(['studio', 'user']);
    expect(b.prompts).toEqual([]);
  });

  test('a send from the next-tasks card reaches the backend as a suggestion (ONL-2899)', async () => {
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = new AgentHost(false, map);

    expect(await host.command({ type: 'prompt', text: 'Show the page on mobile', suggestion: { index: 0, taps: 1 } }, '/workspaces/a')).toEqual({ accepted: true });

    expect(a.origins).toEqual(['suggestion']);
  });

  test('answers false, and pushes nothing, when no session holds the project', async () => {
    const host = new AgentHost(false, new SessionMap());
    expect(await host.studioPrompt('/workspaces/none', 'start it')).toBe(false);
  });
});

describe('the naming instruction on the first user prompt (ONL-2181)', () => {
  test('the backend rename tool refuses a provisional copy during setup and allows it after a user message', async () => {
    const [cwd] = registerWorkspaces('naming-copy-tool', ['copy']);
    if (cwd === undefined) throw new Error('expected registered copy fixture');
    renameProject(cwd, 'Landing copy', 'provisional');
    const map = new SessionMap();
    const copy = fakeSession(cwd);
    let sinks: StudioToolSinks | undefined;
    const host = new AgentHost(false, map, (_cwd, _harness, tools) => {
      sinks = tools;
      return copy.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    if (sinks === undefined) throw new Error('expected backend tool sinks');
    await host.studioPrompt(cwd, 'start the copied app');
    expect((await sinks.onRenameProject('Setup Name')).ok).toBe(false);
    await host.command({ type: 'prompt', text: 'make a pricing page' }, cwd);
    expect((await sinks.onRenameProject('Pricing Page')).ok).toBe(true);
    expect((await sinks.onRenameProject('Second Name')).ok).toBe(false);
  });

  test('copy setup carries no naming instruction; the first user prompt can name the provisional copy once', async () => {
    const [cwd] = registerWorkspaces('naming-provisional-copy', ['copy']);
    if (cwd === undefined) throw new Error('expected registered copy fixture');
    renameProject(cwd, 'Landing copy', 'provisional');
    const map = new SessionMap();
    const copy = fakeSession(cwd);
    map.set(copy.session);
    const host = new AgentHost(false, map);

    expect(await host.studioPrompt(cwd, 'start the copied app', 'setup-context')).toBe(true);
    expect(await host.command({ type: 'prompt', text: 'make the pricing page', context: 'selection' }, cwd)).toEqual({ accepted: true });
    expect(await host.command({ type: 'prompt', text: 'add a footer' }, cwd)).toEqual({ accepted: true });
    expect(copy.contexts).toEqual(['setup-context', `selection\n\n${renameInstruction()}`, undefined]);
  });

  test('a user rename of a provisional copy suppresses first-prompt naming', async () => {
    const [cwd] = registerWorkspaces('naming-user-copy', ['copy']);
    if (cwd === undefined) throw new Error('expected registered copy fixture');
    renameProject(cwd, 'Landing copy', 'provisional');
    renameProject(cwd, 'My Design', 'user');
    const map = new SessionMap();
    const copy = fakeSession(cwd);
    map.set(copy.session);
    const host = new AgentHost(false, map);

    await host.studioPrompt(cwd, 'start the copied app');
    await host.command({ type: 'prompt', text: 'make it green' }, cwd);
    expect(copy.contexts).toEqual([undefined, undefined]);
  });

  test('rides the first user prompt of a registered, unnamed project; Studio prompts never consume it; the second user prompt carries none', async () => {
    const [a, b] = registerWorkspaces('naming', ['a', 'b']);
    const map = new SessionMap();
    const sa = fakeSession(a ?? '');
    const sb = fakeSession(b ?? '');
    map.set(sa.session);
    map.set(sb.session);
    const host = new AgentHost(false, map);

    expect(await host.studioPrompt(a ?? '', 'start it', 'start-ctx')).toBe(true);
    expect(await host.command({ type: 'prompt', text: 'make a pricing page', context: 'sel' }, a)).toEqual({ accepted: true });
    expect(await host.command({ type: 'prompt', text: 'and a footer' }, a)).toEqual({ accepted: true });

    expect(sa.contexts).toEqual(['start-ctx', `sel\n\n${renameInstruction()}`, undefined]);
    expect(await host.command({ type: 'prompt', text: 'hello' }, b)).toEqual({ accepted: true });
    expect(sb.contexts).toEqual([renameInstruction()]);
  });

  test('a project already named carries none, and neither does a session with no registered record', async () => {
    const [a] = registerWorkspaces('naming-named', ['a']);
    renameProject(a ?? '', 'Mine', 'user');
    const map = new SessionMap();
    const sa = fakeSession(a ?? '');
    const stray = fakeSession('/workspaces/unregistered');
    map.set(sa.session);
    map.set(stray.session);
    const host = new AgentHost(false, map);

    await host.command({ type: 'prompt', text: 'hello' }, a);
    await host.command({ type: 'prompt', text: 'hello' }, '/workspaces/unregistered');

    expect(sa.contexts).toEqual([undefined]);
    expect(stray.contexts).toEqual([undefined]);
  });
});

describe('selectProject (ONL-1829)', () => {
  test('an unknown path registers no view and starts nothing', async () => {
    registerWorkspaces('select-unknown', ['known']);
    const host = new RestartHost(false, new SessionMap());
    let registered = 0;

    await host.selectProject({ path: join(tmpdir(), 'not-a-workspace') }, () => {
      registered += 1;
    });

    expect(registered).toBe(0);
    expect(host.starts).toEqual([]);
  });

  test('a known project registers the view, then starts its session', async () => {
    const [known] = registerWorkspaces('select-known', ['known']) as [string];
    const host = new RestartHost(false, new SessionMap());
    const order: string[] = [];
    host.onStart = () => {
      order.push('start');
    };

    await host.selectProject({ path: known }, () => {
      order.push('register');
    });

    expect(order).toEqual(['register', 'start']);
    expect(host.starts).toEqual([known]);
  });
});

describe('a view that returns to a project whose session is still live (ONL-2456)', () => {
  const viewIds: number[] = [];
  afterEach(() => {
    for (const id of viewIds.splice(0)) views.unregister(id);
  });

  test('is told that session and its streaming state, and its snapshot then carries the log with the model list; the session is not restarted', async () => {
    const [workspace] = registerWorkspaces('reopen-live', ['reopened']) as [string];
    const live = fakeSession(workspace);
    const base = { sessionId: live.session.id, cwd: workspace, ts: 0 };
    const models = [{ value: 'opus', displayName: 'Opus 5.5' }];
    const names = {
      sourceRepoName: 'reopened-source',
      workspaceName: 'reopened',
      branchName: 'test/reopened',
      baseBranch: 'main',
    };
    live.push({ ...base, type: 'session.welcome', eventId: 'w', seq: 1, workspace: names });
    live.push({ ...base, type: 'session.settings', eventId: 's', seq: 2, models, model: 'opus' });
    live.session.eventsSince = (sinceSeq = 0) => live.session.events.filter((event) => event.seq > sinceSeq);
    const map = new SessionMap();
    map.set(live.session);
    const host = new AgentHost(false, map);

    const sent: Array<{ channel: string; payload: unknown }> = [];
    await host.selectProject({ path: workspace }, () => {
      viewIds.push(9_500);
      views.register(9_500, workspace, { send: (channel, payload) => sent.push({ channel, payload }) });
    });

    const received = (channel: string): unknown[] =>
      sent.filter((message) => message.channel === channel).map((message) => message.payload);
    expect(received('agent:session')).toEqual([{ sessionId: live.session.id, cwd: workspace }]);
    expect(foldSessionState(host.snapshot({}, views.workspaceOf(9_500)).events).models).toEqual(models);
    expect(received('agent:state')).toEqual([
      {
        isStreaming: false,
        otherTabAgentBusy: false,
        midTurn: 'steer',
        cwd: workspace,
        sessionId: live.session.id,
        needsAttention: false,
        turnWaitedMs: 0,
        hasUserMessage: false,
      },
    ]);
    expect(live.opens()).toBe(0);
    expect(live.closed()).toBe(false);
    expect(map.get(workspace)).toBe(live.session);
  });
});

describe('AgentHost and the settings default (ONL-2115)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = [
    'STUDIO_STATE_ROOT',
    'STUDIO_WORKSPACE_ROOT',
    'STUDIO_FIRST_RUN',
    'STUDIO_HARNESS',
    'STUDIO_AGENT_PROBE',
    'STUDIO_CODEX_ROOT',
  ] as const;

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_HARNESS'];
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    resetSettingsCache();
    resetOnboardingCache();
    setRendererSource(everyRenderer);
  });

  const PINNED_OK: AgentConnection = { status: 'ok', detail: 'pinned by STUDIO_AGENT_PROBE' };
  const connection = (host: AgentHost) => host.snapshot({}, undefined).connection;

  function dropCaches(): void {
    resetSettingsCache();
    resetOnboardingCache();
  }

  function captureConnections(): AgentConnection[] {
    const sent: AgentConnection[] = [];
    setRendererSource(
      () =>
        [
          {
            isDestroyed: () => false,
            send: (channel: string, payload: AgentConnection) => {
              if (channel === 'agent:connection') sent.push(payload);
            },
          },
        ] as never,
    );
    return sent;
  }

  test('with no session live, a flip to codex re-probes and broadcasts the codex verdict', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-flip-idle' });
    dropCaches();
    const sent = captureConnections();
    const host = new AgentHost(false);

    expect(await host.probe()).toEqual(PINNED_OK);
    expect(await host.probe()).toEqual(PINNED_OK);
    expect(sent).toEqual([PINNED_OK]);

    setSettingsHarness('codex');
    await host.noteHarnessDefaultChanged();

    const after = connection(host);
    expect(after.harness).toBe('codex');
    expect(sent).toEqual([PINNED_OK, after]);
    expect(await host.probe()).toEqual(after);
  });

  test('a live Claude session outlives a flip to codex: backend untouched, its machine still writes, the next start opens on codex', async () => {
    const [held, next] = registerWorkspaces('flip-live', ['held', 'next']) as [string, string];
    dropCaches();
    const map = new SessionMap();
    const a = fakeSession(held);
    map.set(a.session);
    const picks: string[] = [];
    const host = new AgentHost(false, map, (cwd, harness) => {
      picks.push(harness);
      return fakeSession(cwd, harness).session;
    });
    expect(await host.probe()).toEqual(PINNED_OK);

    setSettingsHarness('codex');
    await host.noteHarnessDefaultChanged();

    expect(connection(host)).toEqual(PINNED_OK);
    expect(a.closed()).toBe(false);
    expect(map.get(held)).toBe(a.session);
    expect(a.session.harness).toBe('claude');

    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    expect(connection(host)).toEqual({ status: 'ok', harness: 'claude' });
    host.noteCodexSetup('ready');
    expect(connection(host)).toEqual({ status: 'ok', harness: 'claude' });

    await host.command({ type: 'session.start', cwd: next }, next);
    expect(picks).toEqual(['appserver']);
    expect(map.get(next)?.harness).toBe('appserver');
    expect(a.closed()).toBe(false);
  });

  test('a live codex session keeps codex in play under a claude default, and takes Claude out of it', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-codex-live' });
    dropCaches();
    const map = new SessionMap();
    map.set(fakeSession('/workspaces/b', 'appserver').session);
    const host = new AgentHost(false, map);
    expect(await host.probe()).toEqual(PINNED_OK);

    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    expect(connection(host)).toEqual(PINNED_OK);

    host.noteCodexSetup('ready');
    expect(connection(host)).toEqual({ status: 'ok', harness: 'codex' });
  });

  test('codex setup states reach the machine even with an open session', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-codex-live-guard' });
    dropCaches();
    const map = new SessionMap();
    map.set(fakeSession('/workspaces/b', 'appserver').session);
    const host = new AgentHost(false, map);
    expect(await host.probe()).toEqual(PINNED_OK);

    for (const status of ['signed-out', 'broken', 'outdated', 'failed'] as const) {
      host.noteCodexSetup(status);
      expect(connection(host)).toEqual({ status: status === 'signed-out' ? 'unauthenticated' : 'cli_missing', harness: 'codex' });
    }

    host.noteCodexSetup('ready');
    expect(connection(host)).toEqual({ status: 'ok', harness: 'codex' });
  });

  test('two flips across an unresolved probe leave the SECOND default’s verdict, not the first’s', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-flip-twice' });
    // An empty root: the codex miss is constructed, not the runner machine's.
    process.env['STUDIO_CODEX_ROOT'] = makeStateRoot({ name: 'agent-host-flip-twice-no-codex' });
    dropCaches();
    const host = new AgentHost(false);
    expect(await host.probe()).toEqual(PINNED_OK);

    // Not awaited between flips: the pinned probe settles on a microtask, and an await would hide the shared slot.
    setSettingsHarness('codex');
    const toCodex = host.noteHarnessDefaultChanged();
    setSettingsHarness('claude');
    const backToClaude = host.noteHarnessDefaultChanged();
    await Promise.all([toCodex, backToClaude]);

    expect(connection(host)).toEqual(PINNED_OK);
    expect(await host.probe()).toEqual(PINNED_OK);
  });

  test('a codex probe left in the memo never captions a Claude verdict', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-stale-probe' });
    // An empty root: the codex miss is constructed, not the runner machine's.
    process.env['STUDIO_CODEX_ROOT'] = makeStateRoot({ name: 'agent-host-no-codex' });
    dropCaches();
    const map = new SessionMap();
    const host = new AgentHost(false, map);
    setSettingsHarness('codex');
    await host.noteHarnessDefaultChanged();
    expect(connection(host).harness).toBe('codex');
    expect(connection(host).status).toBe('cli_missing');

    map.set(fakeSession('/workspaces/a').session);
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    expect(connection(host)).toEqual({ status: 'ok', harness: 'claude' });
  });
});

describe('one tab’s wire failure stays in that tab (ONL-2247)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = [
    'STUDIO_STATE_ROOT',
    'STUDIO_WORKSPACE_ROOT',
    'STUDIO_FIRST_RUN',
    'STUDIO_HARNESS',
    'STUDIO_AGENT_PROBE',
  ] as const;
  const viewIds: number[] = [];
  let nextViewId = 9_000;

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_HARNESS'];
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    for (const id of viewIds.splice(0)) views.unregister(id);
    wire.splice(0);
    resetSettingsCache();
    resetOnboardingCache();
    setRendererSource(everyRenderer);
  });

  const PINNED_OK: AgentConnection = { status: 'ok', detail: 'pinned by STUDIO_AGENT_PROBE' };
  const WIRE_ERROR: AgentConnection = { status: 'error', detail: 'exited with code 1', harness: 'claude' };
  const CODEX_OK: AgentConnection = { status: 'ok', harness: 'codex' };
  const CLAUDE_OK: AgentConnection = { status: 'ok', harness: 'claude' };

  const wire: Array<{ to: string; connection: AgentConnection }> = [];

  function openView(cwd: string, label: string): void {
    const id = nextViewId++;
    viewIds.push(id);
    views.register(id, cwd, {
      send: (channel, payload) => {
        if (channel === 'agent:connection') wire.push({ to: label, connection: payload as AgentConnection });
      },
    });
  }

  function captureBroadcasts(): void {
    setRendererSource(
      () =>
        [
          {
            isDestroyed: () => false,
            send: (channel: string, payload: AgentConnection) => {
              if (channel === 'agent:connection') wire.push({ to: 'all', connection: payload });
            },
          },
        ] as never,
    );
  }

  async function twoTabs(
    name: string,
    runtimeOfA: 'claude' | 'codex' = 'claude',
  ): Promise<{ host: AgentHost; a: string; b: string; raiseIn: (cwd: string) => (c: AgentConnection) => void }> {
    const [a, b] = registerWorkspaces(name, ['a', 'b']) as [string, string];
    resetSettingsCache();
    resetOnboardingCache();
    const map = new SessionMap();
    const raise = new Map<string, (connection: AgentConnection) => void>();
    const host = new AgentHost(false, map, (cwd, harness, _tools, _emit, onConnection) => {
      raise.set(cwd, onConnection);
      return fakeSession(cwd, harness).session;
    });
    expect(await host.probe()).toEqual(PINNED_OK);
    if (runtimeOfA === 'codex') setSettingsHarness('codex');
    await host.command({ type: 'session.start', cwd: a }, a);
    if (runtimeOfA === 'codex') setSettingsHarness('claude');
    await host.command({ type: 'session.start', cwd: b }, b);
    expect(map.get(a)?.harness).toBe(runtimeOfA === 'codex' ? 'appserver' : 'claude');
    expect(map.get(b)?.harness).toBe('claude');
    captureBroadcasts();
    openView(a, 'a');
    openView(b, 'b');
    const raiseIn = (cwd: string) => {
      const fn = raise.get(cwd);
      if (fn === undefined) throw new Error(`no session started in ${cwd}`);
      return fn;
    };
    return { host, a, b, raiseIn };
  }

  test("A's wire error reaches A alone: B's snapshot and probe answer the machine verdict", async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-error-own');

    raiseIn(a)(WIRE_ERROR);

    expect(host.snapshot({}, b).connection).toEqual(PINNED_OK);
    expect(await host.probe({}, b)).toEqual(PINNED_OK);
    expect(wire).toEqual([{ to: 'a', connection: WIRE_ERROR }]);
    expect(host.snapshot({}, a).connection).toEqual(WIRE_ERROR);
    expect(await host.probe({}, a)).toEqual(WIRE_ERROR);
  });

  test('after one tab failed on the wire, a probe for another tab or for no project answers the machine verdict', async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-error-later');
    raiseIn(a)(WIRE_ERROR);

    expect(await host.probe({}, b)).toEqual(PINNED_OK);
    expect(await host.probe({}, undefined)).toEqual(PINNED_OK);
    expect(await host.probe()).toEqual(PINNED_OK);
    expect(host.snapshot({}, undefined).connection).toEqual(PINNED_OK);
  });

  test("a codex machine write beside a Claude tab's wire error is followed by that error, re-sent to its own tab", async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-mixed', 'codex');
    raiseIn(b)(WIRE_ERROR);
    wire.splice(0);

    host.noteCodexSetup('ready');

    expect(wire).toEqual([
      { to: 'all', connection: CODEX_OK },
      { to: 'b', connection: WIRE_ERROR },
    ]);
    expect(host.snapshot({}, b).connection).toEqual(WIRE_ERROR);
    expect(host.snapshot({}, a).connection).toEqual(CODEX_OK);
  });

  test("a codex tab's connect ok is its own: the Claude tab's error and the machine verdict are untouched", async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-codex-connect', 'codex');
    raiseIn(b)(WIRE_ERROR);
    wire.splice(0);

    raiseIn(a)(CODEX_OK);

    expect(wire).toEqual([{ to: 'a', connection: CODEX_OK }]);
    expect(host.snapshot({}, a).connection).toEqual(CODEX_OK);
    expect(host.snapshot({}, b).connection).toEqual(WIRE_ERROR);
    expect(host.snapshot({}, undefined).connection).toEqual(PINNED_OK);
  });

  test('an unusable codex replaces its optimistic ok and follows setup through failure and recovery', async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-codex-repair', 'codex');
    raiseIn(a)(CODEX_OK);
    raiseIn(a)({ status: 'cli_missing', harness: 'codex' });
    expect(host.snapshot({}, a).connection.status).toBe('cli_missing');
    for (const [setup, status] of [['downloading', 'unknown'], ['failed', 'cli_missing'], ['validating', 'unknown'], ['ready', 'ok']] as const) {
      host.noteCodexSetup(setup);
      expect(host.snapshot({}, a).connection).toEqual({ status, harness: 'codex' });
      expect(host.snapshot({}, b).connection).toEqual(PINNED_OK);
    }
  });

  test('setup checks cannot replace a healthy codex tab verdict', async () => {
    const { host, a, raiseIn } = await twoTabs('conn-codex-healthy', 'codex');
    raiseIn(a)(CODEX_OK);
    host.noteCodexSetup('checking');
    host.noteCodexSetup('failed');
    expect(host.snapshot({}, a).connection).toEqual(CODEX_OK);
  });

  test('a missing Codex copy recovered to ready restarts the stale session on the next prompt (ONL-3177)', async () => {
    const [cwd] = registerWorkspaces('codex-copy-recovered', ['a']) as [string];
    resetSettingsCache();
    resetOnboardingCache();
    setSettingsHarness('codex');
    const map = new SessionMap();
    const made: ReturnType<typeof fakeSession>[] = [];
    let raise: (connection: AgentConnection) => void = () => { throw new Error('session not started'); };
    const host = new AgentHost(false, map, (path, harness, _tools, _emit, onConnection) => {
      raise = onConnection;
      const session = fakeSession(path, harness);
      made.push(session);
      return session.session;
    });
    await host.command({ type: 'session.start', cwd }, cwd);
    host.noteCodexSetup('idle');
    raise({ status: 'cli_missing', harness: 'codex' });
    expect(host.snapshot({}, cwd).connection.status).toBe('cli_missing');
    host.noteCodexSetup('checking');
    host.noteCodexSetup('ready');
    expect(host.snapshot({}, cwd).connection.status).toBe('ok');
    expect(await host.command({ type: 'prompt', text: 'continue after setup' }, cwd)).toEqual({ accepted: true });
    expect(made).toHaveLength(2);
    expect(made[0]?.closed()).toBe(true);
    expect(made[0]?.prompts).toEqual([]);
    expect(made[1]?.prompts).toEqual(['continue after setup']);
  });

  test('codex setup preserves the normal Claude machine verdict in snapshots and broadcasts', async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-codex-repair-claude', 'codex');
    raiseIn(a)(CODEX_OK);
    for (const status of ['checking', 'failed', 'ready'] as const) {
      wire.splice(0);
      host.noteCodexSetup(status);
      expect(host.snapshot({}, b).connection).toEqual(PINNED_OK);
      expect(wire.at(-1)).toEqual({ to: 'b', connection: PINNED_OK });
    }
  });

  test('a Codex-first launch remembers Claude setup before its first project opens', async () => {
    const [a, b] = registerWorkspaces('conn-codex-first', ['a', 'b']) as [string, string];
    resetSettingsCache();
    resetOnboardingCache();
    setSettingsHarness('codex');
    const host = new AgentHost(false, new SessionMap(), (cwd, harness) => fakeSession(cwd, harness).session);
    host.noteCodexSetup('ready');
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    await host.command({ type: 'session.start', cwd: a }, a);
    setSettingsHarness('claude');
    await host.command({ type: 'session.start', cwd: b }, b);
    captureBroadcasts();
    openView(b, 'b');
    for (const status of ['checking', 'failed'] as const) {
      wire.splice(0);
      host.noteCodexSetup(status);
      expect(host.snapshot({}, b).connection).toEqual(CLAUDE_OK);
      expect(wire.at(-1)).toEqual({ to: 'b', connection: CLAUDE_OK });
    }
  });

  test.each(['unauthenticated', 'cli_missing'] as const)(
    "a session's %s is a machine fact: broadcast, and every view's snapshot answers it",
    async (status) => {
      const { host, a, b, raiseIn } = await twoTabs(`conn-machine-${status}`);
      const verdict: AgentConnection = { status, detail: 'from the wire', harness: 'claude' };

      raiseIn(a)(verdict);

      expect(wire).toEqual([{ to: 'all', connection: verdict }]);
      for (const cwd of [a, b, undefined]) expect(host.snapshot({}, cwd).connection).toEqual(verdict);
    },
  );

  test("a Claude login recovery clears a Claude tab's wire error, and is announced though the machine was already ok", async () => {
    const { host, a, raiseIn } = await twoTabs('conn-recovery');
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });
    raiseIn(a)(WIRE_ERROR);
    wire.splice(0);

    host.noteClaudeSetup(claude('checking'), { afterLogin: true });
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });

    expect(wire).toEqual([{ to: 'all', connection: CLAUDE_OK }]);
    expect(host.snapshot({}, a).connection).toEqual(CLAUDE_OK);
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: true });
    expect(wire).toHaveLength(1);
  });

  test("a codex tab's held ok survives a codex machine write, so a later Claude verdict never lands on it", async () => {
    const { host, a, raiseIn } = await twoTabs('conn-codex-held-ok', 'codex');
    raiseIn(a)(CODEX_OK);

    host.noteCodexSetup('ready');
    host.noteClaudeSetup(claude('signed-in'), { afterLogin: false });

    expect(host.snapshot({}, a).connection).toEqual(CODEX_OK);
  });

  test('a reopened project gets its held wire error back once its view registers again', async () => {
    const { host, a, raiseIn } = await twoTabs('conn-reopen');
    raiseIn(a)(WIRE_ERROR);
    views.unregister(viewIds[0]!);
    wire.splice(0);

    await host.selectProject({ path: a }, () => {
      openView(a, 'a-reopened');
    });

    expect(wire).toEqual([{ to: 'a-reopened', connection: WIRE_ERROR }]);
  });

  test("a view that leaves an errored project for a healthy one receives the machine verdict, not the old error", async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-switch');
    raiseIn(a)(WIRE_ERROR);
    views.unregister(viewIds[0]!);
    wire.splice(0);

    await host.selectProject({ path: b }, () => {
      openView(b, 'a-switched');
    });

    expect(wire.filter((sent) => sent.to === 'a-switched')).toEqual([{ to: 'a-switched', connection: PINNED_OK }]);
    expect(wire.some((sent) => sent.connection === WIRE_ERROR)).toBe(false);
    expect(host.snapshot({}, a).connection).toEqual(WIRE_ERROR);
  });

  test("a fresh recheck from a Claude tab holding an error re-probes Claude, even when the default is codex", async () => {
    const { host, a, b, raiseIn } = await twoTabs('conn-recheck-mixed', 'codex');
    setSettingsHarness('codex');
    expect(host.snapshot({}, a).connection).toEqual({ status: 'unknown', harness: 'codex' });
    raiseIn(a)(CODEX_OK);
    raiseIn(b)(WIRE_ERROR);
    wire.splice(0);

    const answer = await host.probe({ fresh: true }, b);

    expect(answer).toEqual(PINNED_OK);
    expect(host.snapshot({}, b).connection).toEqual(PINNED_OK);
    expect(wire).toEqual([{ to: 'all', connection: PINNED_OK }, { to: 'a', connection: CODEX_OK }]);
    expect(host.snapshot({}, a).connection).toEqual(CODEX_OK);
  });

  test("stopping A's session drops its error: the next session's snapshot reads the machine verdict", async () => {
    const { host, a, raiseIn } = await twoTabs('conn-stop');
    raiseIn(a)(WIRE_ERROR);

    await host.releaseWorkspace(a);
    await host.command({ type: 'session.start', cwd: a }, a);

    expect(host.snapshot({}, a).sessionId).toBeDefined();
    expect(host.snapshot({}, a).connection).toEqual(PINNED_OK);
  });

  test('boot, a renderer prime and a concurrent ask share one probe', async () => {
    const [a] = registerWorkspaces('conn-one-probe', ['a']) as [string];
    resetSettingsCache();
    resetOnboardingCache();
    captureBroadcasts();
    const host = new AgentHost(false);

    const answers = await Promise.all([host.probe(), host.probe({}, a), host.probe({}, undefined)]);

    expect(answers).toEqual([PINNED_OK, PINNED_OK, PINNED_OK]);
    // One broadcast per probe run, so this counts probes.
    expect(wire).toEqual([{ to: 'all', connection: PINNED_OK }]);
  });

  test("before onboarding the probe answers Claude's verdict, never codex's, whatever the settings default says", async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-conn-first-run' });
    process.env['STUDIO_FIRST_RUN'] = '1';
    resetSettingsCache();
    resetOnboardingCache();
    setSettingsHarness('codex');
    const host = new AgentHost(false);

    const verdict = await host.probe();

    expect([undefined, 'claude']).toContain(verdict.harness);
  });
});

describe('a codex credential the API refuses (ONL-2114)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = [
    'STUDIO_STATE_ROOT',
    'STUDIO_WORKSPACE_ROOT',
    'STUDIO_FIRST_RUN',
    'STUDIO_HARNESS',
    'STUDIO_AGENT_PROBE',
  ] as const;
  const viewIds: number[] = [];
  let nextViewId = 9_500;
  const wire: Array<{ to: string; connection: AgentConnection }> = [];

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_HARNESS'];
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    for (const id of viewIds.splice(0)) views.unregister(id);
    wire.splice(0);
    resetSettingsCache();
    resetOnboardingCache();
    setRendererSource(everyRenderer);
  });

  const PINNED_OK: AgentConnection = { status: 'ok', detail: 'pinned by STUDIO_AGENT_PROBE' };
  const CODEX_OK: AgentConnection = { status: 'ok', harness: 'codex' };
  const REFUSED: AgentConnection = { status: 'unauthenticated', harness: 'codex' };

  interface Made {
    cwd: string;
    harness: AgentBackend['harness'];
    fake: ReturnType<typeof fakeSession>;
    raise: (connection: AgentConnection) => void;
  }

  /** A codex fake reports its connect on open, as `AppServerSession` does. */
  async function tabs(
    name: string,
    runtimes: readonly ('claude' | 'codex')[],
  ): Promise<{ host: AgentHost; cwds: string[]; made: Made[]; latest: (cwd: string) => Made }> {
    const cwds = registerWorkspaces(name, runtimes.map((_, index) => `t${String(index)}`));
    resetSettingsCache();
    resetOnboardingCache();
    const made: Made[] = [];
    const host = new AgentHost(false, new SessionMap(), (cwd, harness, _tools, _emit, onConnection) => {
      const fake = fakeSession(cwd, harness);
      made.push({ cwd, harness, fake, raise: onConnection });
      return {
        ...fake.session,
        open: () => {
          fake.session.open();
          if (harness === 'appserver') onConnection(CODEX_OK);
        },
      };
    });
    expect(await host.probe()).toEqual(PINNED_OK);
    for (const [index, runtime] of runtimes.entries()) {
      setSettingsHarness(runtime);
      await host.command({ type: 'session.start', cwd: cwds[index]! }, cwds[index]!);
    }
    setRendererSource(
      () =>
        [
          {
            isDestroyed: () => false,
            send: (channel: string, payload: AgentConnection) => {
              if (channel === 'agent:connection') wire.push({ to: 'all', connection: payload });
            },
          },
        ] as never,
    );
    for (const cwd of cwds) {
      const id = nextViewId++;
      viewIds.push(id);
      views.register(id, cwd, {
        send: (channel, payload) => {
          if (channel === 'agent:connection') wire.push({ to: cwd, connection: payload as AgentConnection });
        },
      });
    }
    const latest = (cwd: string): Made => {
      const found = made.filter((entry) => entry.cwd === cwd).at(-1);
      if (found === undefined) throw new Error(`no session started in ${cwd}`);
      return found;
    };
    return { host, cwds, made, latest };
  }

  const lastTo = (cwd: string): AgentConnection | undefined => wire.filter((sent) => sent.to === cwd).at(-1)?.connection;

  test('the tab whose turn was refused answers signed out, not the connect its session reported on open', async () => {
    const { host, cwds, latest } = await tabs('refused-own', ['codex']);
    const [codex] = cwds as [string];

    latest(codex).raise(REFUSED);

    expect(host.snapshot({}, codex).connection).toEqual(REFUSED);
    expect(lastTo(codex)).toEqual(REFUSED);
  });

  test('every codex tab answers the refusal: the credential is the machine’s, not the tab’s', async () => {
    const { host, cwds, latest } = await tabs('refused-both', ['codex', 'codex']);
    const [first, second] = cwds as [string, string];

    latest(first).raise(REFUSED);

    expect(host.snapshot({}, second).connection).toEqual(REFUSED);
    expect(lastTo(second)).toEqual(REFUSED);
  });

  test('a Claude tab beside it hears nothing, and the machine verdict is untouched', async () => {
    const { host, cwds, latest } = await tabs('refused-claude-beside', ['codex', 'claude']);
    const [codex, claudeTab] = cwds as [string, string];

    latest(codex).raise(REFUSED);

    expect(wire.filter((sent) => sent.to !== codex)).toEqual([]);
    expect(host.snapshot({}, claudeTab).connection).toEqual(PINNED_OK);
    expect(host.snapshot({}, undefined).connection).toEqual(PINNED_OK);
  });

  test('a codex session that connects while the refusal stands answers the refusal', async () => {
    const { host, cwds, made, latest } = await tabs('refused-new-chat', ['codex']);
    const [codex] = cwds as [string];
    await host.command({ type: 'prompt', text: 'the prompt the API refused' }, codex);
    latest(codex).raise(REFUSED);
    setSettingsHarness('codex');

    expect(await host.command({ type: 'session.newChat' }, codex)).toEqual({ accepted: true });

    expect(made.filter((entry) => entry.cwd === codex)).toHaveLength(2);
    expect(host.snapshot({}, codex).connection).toEqual(REFUSED);
    expect(lastTo(codex)).toEqual(REFUSED);
  });

  test('a sign-in answers it: the tab reads ok, and its session restarts on the next prompt to pick up the new credential', async () => {
    const { host, cwds, latest } = await tabs('refused-sign-in', ['codex', 'claude']);
    const [codex, claudeTab] = cwds as [string, string];
    const refused = latest(codex);
    const beside = latest(claudeTab);
    refused.raise(REFUSED);
    setSettingsHarness('codex');

    host.noteCodexSetup('ready');

    expect(host.snapshot({}, codex).connection).toEqual(CODEX_OK);
    expect(lastTo(codex)).toEqual(CODEX_OK);
    expect(await host.command({ type: 'prompt', text: 'again' }, codex)).toEqual({ accepted: true });
    expect(refused.fake.closed()).toBe(true);
    expect(refused.fake.prompts).toEqual([]);
    expect(latest(codex)).not.toBe(refused);
    expect(latest(codex).harness).toBe('appserver');
    expect(latest(codex).fake.prompts).toEqual(['again']);
    expect(host.snapshot({}, codex).connection).toEqual(CODEX_OK);

    expect(await host.command({ type: 'prompt', text: 'here' }, claudeTab)).toEqual({ accepted: true });
    expect(latest(claudeTab)).toBe(beside);
  });

  test('a codex setup that reads ready with nothing refused restarts nothing', async () => {
    const { host, cwds, latest } = await tabs('ready-unrefused', ['codex']);
    const [codex] = cwds as [string];
    const first = latest(codex);

    host.noteCodexSetup('ready');

    expect(await host.command({ type: 'prompt', text: 'hi' }, codex)).toEqual({ accepted: true });
    expect(latest(codex)).toBe(first);
    expect(first.fake.prompts).toEqual(['hi']);
  });
});

describe("a stored 'default' is no model choice (ONL-2075)", () => {
  test('it starts the session on no model, which is DEFAULT_MODEL, while a real choice still wins', () => {
    expect(startModel(undefined, 'default')).toBeUndefined();
    expect(startModel('default', 'sonnet')).toBeUndefined();
    expect(startModel(undefined, 'sonnet')).toBe('sonnet');
    expect(startModel('opus[1m]', 'default')).toBe('opus[1m]');
    expect(startModel(undefined, undefined)).toBeUndefined();
  });
});

describe('a new chat keeps the conversation and starts fresh (ONL-2198)', () => {
  function host(made: ReturnType<typeof fakeSession>[], harness: 'claude' | 'appserver' = 'claude') {
    return new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) => {
      const next = fakeSession(c, harness, { emit });
      made.push(next);
      return next.session;
    });
  }

  test('retains user Stop across new chat, user prompts, Resume and question answers on both Harnesses', async () => {
    for (const harness of ['claude', 'appserver'] as const) {
      const [cwd] = registerWorkspaces(`retained-server-stop-${harness}`, ['w']) as [string];
      const made: ReturnType<typeof fakeSession>[] = [];
      const agent = host(made, harness);
      await agent.command({ type: 'session.start', cwd }, cwd);
      made[0]?.push(row('message.user', cwd, 1));
      noteServerStop(cwd);
      try {
        await agent.command({ type: 'session.newChat' }, cwd);
        const fresh = made[1]!;
        await agent.command({ type: 'prompt', text: 'Make the heading smaller', context: 'selection' }, cwd);
        expect(fresh.contexts.at(-1)).toContain('The user pressed Stop');
        expect(fresh.contexts.at(-1)).toContain('selection');
        fresh.push({ type: 'turn.ended', turnId: 't1', stopReason: 'interrupted', sessionId: fresh.session.id, eventId: 'stopped', seq: 3, ts: 0 });
        expect(await agent.command({ type: 'turn.resume', method: 'play-button' }, cwd)).toEqual({ accepted: true });
        expect(fresh.contexts.at(-1)).toContain('The user pressed Stop');
        let answerContext: string | undefined;
        Object.assign(fresh.session, { questionParkedSince: Date.now(), answerQuestion: (_text: string, _attachments: unknown, context?: string) => { answerContext = context; return true; } });
        await agent.command({ type: 'prompt', text: 'Use the smaller one', answersQuestion: true }, cwd);
        expect(answerContext).toContain('The user pressed Stop');
        Object.assign(fresh.session, { questionParkedSince: undefined });
        noteServerStart(cwd);
        await agent.studioPrompt(cwd, 'Start the app', 'original');
        expect(fresh.contexts.at(-1)).toBe('original');
      } finally { noteServerStart(cwd); }
    }
  });

  test('archives the old rows, forgets the stored record, and comes back empty', async () => {
    const [cwd] = registerWorkspaces('new-chat', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    const old = made[0];
    if (old === undefined) throw new Error('the backend seam was never reached');
    old.push(row('message.user', cwd, 1));
    rememberSession(cwd, 'stored-claude-session');

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    const archived = readArchivedChats(cwd, 'claude');
    expect(archived).toHaveLength(1);
    expect(archived[0]?.events.map((event) => event.eventId)).toEqual(['e-1']);
    // Not `planSession`: it answers `fresh` for a made-up id whether or not the record was forgotten.
    expect(storedClaudeSession(cwd)).toBeUndefined();
    expect(readTranscript(cwd, 'claude')).toEqual([]);
    expect(made).toHaveLength(2);
  });

  test('a new chat is how the user takes back what they always-allowed in it (ONL-2933)', async () => {
    const [cwd] = registerWorkspaces('new-chat-grants', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('message.user', cwd, 1));
    rememberAllowRules(cwd, 'claude', ['Bash(npm run build)']);
    // Both runtimes, like the records beside them: a switch would otherwise bring one back.
    rememberAllowRules(cwd, 'appserver', ['Bash(npm run build)']);

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    // The fresh session is built after the forget, from a record that no longer holds them.
    expect(preferenceFor(cwd, 'claude')?.allowRules).toBeUndefined();
    expect(preferenceFor(cwd, 'appserver')?.allowRules).toBeUndefined();
    expect(made).toHaveLength(2);
  });

  test('the codex arm forgets its thread too, so it cannot resume', async () => {
    const [cwd] = registerWorkspaces('new-chat-codex', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made, 'appserver');
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('message.user', cwd, 1));
    rememberAppServerThread(cwd, 'stored-thread');

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    expect(readArchivedChats(cwd, 'appserver')).toHaveLength(1);
    expect(storedAppServerThread(cwd)).toBeUndefined();
  });

  test('a late row from the replaced session never lands on the fresh chat (ONL-2254 still holds for an ordinary close)', async () => {
    const [cwd] = registerWorkspaces('new-chat-late', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    const old = made[0];
    if (old === undefined) throw new Error('the backend seam was never reached');
    old.push(row('message.user', cwd, 1));

    await agent.command({ type: 'session.newChat' }, cwd);
    const fresh = made[1];
    if (fresh === undefined) throw new Error('the new chat made no session');
    fresh.push(row('message.user', cwd, 1, 'fresh'));
    old.push(row('session.ended', cwd, 2));
    await drain();

    expect(readTranscript(cwd, 'claude').map((event) => event.eventId)).toEqual(['fresh-1']);
  });

  test('refused mid-turn: nothing is archived and the session is untouched', async () => {
    const [cwd] = registerWorkspaces('new-chat-busy', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) => {
      const next = fakeSession(c, 'claude', { emit });
      made.push(next);
      return next.session;
    });
    await agent.command({ type: 'session.start', cwd }, cwd);
    const live = made[0];
    if (live === undefined) throw new Error('the backend seam was never reached');
    live.push(row('message.user', cwd, 1));
    (live.session as { isStreaming: boolean }).isStreaming = true;

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: false });

    expect(readArchivedChats(cwd, 'claude')).toEqual([]);
    expect(made).toHaveLength(1);
  });

  test('with no live session it refuses rather than archiving an empty chat', async () => {
    const [cwd] = registerWorkspaces('new-chat-none', ['w']) as [string];
    const agent = host([]);

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: false });
    expect(readArchivedChats(cwd, 'claude')).toEqual([]);
  });

  test('the host itself roots archived images — not just the store (ONL-2198)', async () => {
    const [cwd] = registerWorkspaces('new-chat-gc', ['w']) as [string];
    resetImagesStore();
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    const registered = registerImage(cwd, PNG_BYTES, { hold: false });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(imageRow(cwd, registered.image.id));
    await agent.command({ type: 'session.newChat' }, cwd);
    gcSweep();

    expect(readImage(registered.image.id)).not.toBeNull();
  });

  test('a welcome row is not a conversation, so main refuses before spending a retention slot', async () => {
    const [cwd] = registerWorkspaces('new-chat-welcome', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('session.welcome', cwd, 1));

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: false });

    expect(readArchivedChats(cwd, 'claude')).toEqual([]);
    expect(made).toHaveLength(1);
  });

  test('the archive is on disk before the fresh session is constructed', async () => {
    const [cwd] = registerWorkspaces('new-chat-order', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const archivedAtConstruction: number[] = [];
    const agent = new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) => {
      archivedAtConstruction.push(readArchivedChats(cwd, 'claude').length);
      const next = fakeSession(c, 'claude', { emit });
      made.push(next);
      return next.session;
    });
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('message.user', cwd, 1));

    await agent.command({ type: 'session.newChat' }, cwd);

    expect(archivedAtConstruction).toEqual([0, 1]);
  });

  test("a prompt Studio sent on the user's behalf is not the user's conversation", async () => {
    const [cwd] = registerWorkspaces('new-chat-studio', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('session.welcome', cwd, 1));
    made[0]?.push(row('message.user', cwd, 2, 'e', 'studio'));

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: false });

    expect(readArchivedChats(cwd, 'claude')).toEqual([]);
    expect(made).toHaveLength(1);
  });

  test('a new chat on Claude forgets the codex thread too, so a runtime flip cannot resume it', async () => {
    const [cwd] = registerWorkspaces('new-chat-cross', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('message.user', cwd, 1));
    rememberAppServerThread(cwd, 'stored-codex-thread');

    expect(await agent.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    expect(storedAppServerThread(cwd)).toBeUndefined();
  });

  test('a second new chat archives beside the first, never over it', async () => {
    const [cwd] = registerWorkspaces('new-chat-twice', ['w']) as [string];
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    made[0]?.push(row('message.user', cwd, 1, 'first'));
    await agent.command({ type: 'session.newChat' }, cwd);
    made[1]?.push(row('message.user', cwd, 1, 'second'));
    await agent.command({ type: 'session.newChat' }, cwd);

    const archived = readArchivedChats(cwd, 'claude');
    expect(archived).toHaveLength(2);
    expect(archived[0]?.events.map((event) => event.eventId)).toEqual(['first-1']);
    expect(archived[1]?.events.map((event) => event.eventId)).toEqual(['second-1']);
  });
});

describe('a turn that edited files marks the project dirty (ONL-2471)', () => {
  function turnEnded(cwd: string, filesChanged?: number): StudioEvent {
    return {
      type: 'turn.ended',
      turnId: 't',
      ...(filesChanged === undefined ? {} : { filesChanged }),
      sessionId: 's',
      cwd,
      eventId: 'turn-1',
      seq: 9,
      ts: 0,
    } as StudioEvent;
  }

  function host(made: ReturnType<typeof fakeSession>[]): AgentHost {
    return new AgentHost(false, new SessionMap(), (c, _harness, _tools, emit) => {
      const next = fakeSession(c, 'claude', { emit });
      made.push(next);
      return next.session;
    });
  }

  async function started(name: string): Promise<{
    cwd: string;
    docId: string;
    push: (event: StudioEvent) => void;
  }> {
    const [cwd] = registerWorkspaces(name, ['w']) as [string];
    resetCanvasRegistryCache();
    resetThumbnailServiceForTesting();
    const docId = canvasDocIdFor(cwd);
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);
    const session = made[0];
    if (session === undefined) throw new Error('the backend seam was never reached');
    return { cwd, docId, push: session.push };
  }

  /** The gate's own answer is the only readable dirty bit: it declines a project nothing marked. */
  async function isDirty(docId: string): Promise<boolean> {
    const outcome = await thumbnailService().captureIfDirtyNow(docId);
    return !(outcome.status === 'skipped' && outcome.reason === 'not_dirty');
  }

  test('a turn whose end reports files changed marks dirty, with no canvas op anywhere in it', async () => {
    const { cwd, docId, push } = await started('thumb-files-changed');
    push(turnEnded(cwd, 3));
    expect(await isDirty(docId)).toBe(true);
  });

  test('a turn that changed no file marks nothing', async () => {
    const { cwd, docId, push } = await started('thumb-files-none');
    push(turnEnded(cwd, 0));
    expect(await isDirty(docId)).toBe(false);
  });

  test('a turn whose end carries no count at all marks nothing', async () => {
    const { cwd, docId, push } = await started('thumb-files-absent');
    push(turnEnded(cwd));
    expect(await isDirty(docId)).toBe(false);
  });

  test('marks the project whose turn it was, never a sibling project', async () => {
    const cwds = registerWorkspaces('thumb-two-projects', ['a', 'b']);
    const [a, b] = cwds as [string, string];
    resetCanvasRegistryCache();
    resetThumbnailServiceForTesting();
    const aId = canvasDocIdFor(a);
    const bId = canvasDocIdFor(b);
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd: a }, a);
    await agent.command({ type: 'session.start', cwd: b }, b);

    made[0]?.push(turnEnded(a, 2));

    expect(await isDirty(aId)).toBe(true);
    expect(await isDirty(bId)).toBe(false);
  });

  test('marks nothing for a project no canvas document was ever minted for', async () => {
    const [cwd] = registerWorkspaces('thumb-no-doc', ['w']) as [string];
    resetCanvasRegistryCache();
    resetThumbnailServiceForTesting();
    const made: ReturnType<typeof fakeSession>[] = [];
    const agent = host(made);
    await agent.command({ type: 'session.start', cwd }, cwd);

    made[0]?.push(turnEnded(cwd, 4));

    // Minted only now: a mark on the turn would have minted one and photographed an unopened project.
    expect(await isDirty(canvasDocIdFor(cwd))).toBe(false);
  });

  test('marks inside the push itself, and starts no capture: nothing holds the turn open', async () => {
    const { cwd, docId, push } = await started('thumb-not-awaited');
    const outcomes: unknown[] = [];
    thumbnailService().onOutcome((outcome) => outcomes.push(outcome));

    push(turnEnded(cwd, 1));

    expect(outcomes).toEqual([]);
    expect(await isDirty(docId)).toBe(true);
  });
});

describe('the pause a re-announce and a snapshot carry (ONL-2295)', () => {
  const viewIds: number[] = [];
  afterEach(() => {
    for (const id of viewIds.splice(0)) views.unregister(id);
  });

  test('a view returning mid-pause is told the agent is still waiting, and the snapshot agrees', async () => {
    const [workspace] = registerWorkspaces('reopen-parked', ['parked']) as [string];
    const live = fakeSession(workspace);
    // A session holding a question when the view comes back: the pause has to survive the trip.
    Object.defineProperty(live.session, 'needsAttention', { get: () => true });
    Object.defineProperty(live.session, 'questionParkedSince', { get: () => 1_700_000_000_000 });
    Object.defineProperty(live.session, 'turnWaitedMs', { get: () => 4_000 });
    const map = new SessionMap();
    map.set(live.session);
    const host = new AgentHost(false, map);

    const sent: Array<{ channel: string; payload: unknown }> = [];
    await host.selectProject({ path: workspace }, () => {
      viewIds.push(9_600);
      views.register(9_600, workspace, { send: (channel, payload) => sent.push({ channel, payload }) });
    });

    const states = sent.filter((m) => m.channel === 'agent:state').map((m) => m.payload);
    expect(states).toEqual([
      {
        isStreaming: false,
        otherTabAgentBusy: false,
        midTurn: 'steer',
        cwd: workspace,
        sessionId: live.session.id,
        needsAttention: true,
        questionParkedSince: 1_700_000_000_000,
        turnWaitedMs: 4_000,
        hasUserMessage: false,
      },
    ]);

    const snapshot = host.snapshot({}, views.workspaceOf(9_600));
    expect(snapshot.questionParkedSince).toBe(1_700_000_000_000);
    expect(snapshot.turnWaitedMs).toBe(4_000);
    expect(snapshot.needsAttention).toBe(true);
  });

  test('a snapshot of a session holding nothing reports no pause', async () => {
    const [workspace] = registerWorkspaces('reopen-unparked', ['unparked']) as [string];
    const live = fakeSession(workspace);
    const map = new SessionMap();
    map.set(live.session);
    const host = new AgentHost(false, map);

    await host.selectProject({ path: workspace }, () => {
      viewIds.push(9_601);
      views.register(9_601, workspace, { send: () => undefined });
    });

    const snapshot = host.snapshot({}, views.workspaceOf(9_601));
    expect(snapshot.questionParkedSince).toBeUndefined();
    expect(snapshot.turnWaitedMs).toBe(0);
  });
});

describe('cross-tab busy telemetry (ONL-2407)', () => {
  const viewIds = [9_700, 9_701, 9_702];
  afterEach(() => {
    for (const id of viewIds) views.unregister(id);
  });

  test('a host initialized with live sessions excludes the asking project from its busy flag', () => {
    const map = new SessionMap();
    const foreground = fakeSession('/workspaces/foreground').session;
    const background = fakeSession('/workspaces/background').session;
    Object.defineProperty(background, 'isStreaming', { get: () => true });
    map.set(foreground);
    map.set(background);
    const host = new AgentHost(false, map);

    expect(host.snapshot({}, foreground.cwd)).toMatchObject({ isStreaming: false, otherTabAgentBusy: true });
    expect(host.snapshot({}, background.cwd)).toMatchObject({ isStreaming: true, otherTabAgentBusy: false });
  });

  test('only busy edges fan out, exclude the own session, and clear when a busy session closes', async () => {
    const [foreground, background, third] = registerWorkspaces('cross-tab-busy', ['foreground', 'background', 'third']) as [string, string, string];
    const states = new Map<string, (state: BackendState) => void>();
    const streaming = new Map<string, boolean>();
    const sent = new Map<string, Array<{ isStreaming: boolean; otherTabAgentBusy?: boolean }>>();
    const host = new AgentHost(false, new SessionMap(), (cwd, _harness, _tools, _emit, _connection, state) => {
      states.set(cwd, state);
      const live = fakeSession(cwd).session;
      Object.defineProperty(live, 'isStreaming', { get: () => streaming.get(cwd) ?? false });
      return live;
    });
    for (const [index, cwd] of [foreground, background, third].entries()) {
      sent.set(cwd, []);
      views.register(viewIds[index]!, cwd, { send: (channel, payload) => {
        if (channel === 'agent:state') sent.get(cwd)!.push(payload as { isStreaming: boolean; otherTabAgentBusy?: boolean });
      } });
      await host.command({ type: 'session.start', cwd }, cwd);
    }
    const publish = (cwd: string, busy: boolean): void => {
      streaming.set(cwd, busy);
      states.get(cwd)!({ isStreaming: busy, isTurnLive: busy, midTurn: 'steer' });
    };
    for (const messages of sent.values()) messages.length = 0;

    publish(background, true);
    expect(sent.get(foreground)).toMatchObject([{ isStreaming: false, otherTabAgentBusy: true }]);
    expect(host.snapshot({}, foreground).otherTabAgentBusy).toBe(true);
    expect(host.snapshot({}, background).otherTabAgentBusy).toBe(false);
    publish(third, true);
    expect(sent.get(foreground)).toHaveLength(1);
    publish(third, false);
    expect(sent.get(foreground)).toHaveLength(1);
    publish(background, true);
    expect(sent.get(foreground)).toHaveLength(1);
    publish(foreground, true);
    expect(host.snapshot({}, foreground)).toMatchObject({ isStreaming: true, otherTabAgentBusy: true });
    expect(host.snapshot({}, background).otherTabAgentBusy).toBe(true);
    publish(background, false);
    expect(host.snapshot({}, foreground)).toMatchObject({ isStreaming: true, otherTabAgentBusy: false });
    expect(host.snapshot({}, background)).toMatchObject({ isStreaming: false, otherTabAgentBusy: true });
    publish(background, true);
    await host.releaseWorkspace(background);
    expect(host.snapshot({}, foreground)).toMatchObject({ isStreaming: true, otherTabAgentBusy: false });
    expect(sent.get(foreground)!.at(-1)).toMatchObject({ isStreaming: true, otherTabAgentBusy: false });
  });
});

describe("a composer pick is the project's stored choice (ONL-2541)", () => {
  afterEach(() => {
    resetPreferencesCache();
  });

  test("a model and effort set on a project's session are what its next start reads", async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-composer-pick' });
    resetPreferencesCache();
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a');
    map.set(a.session);
    const host = new AgentHost(false, map);

    await host.command({ type: 'session.setModel', model: 'sonnet' }, '/workspaces/a');
    await host.command({ type: 'session.setEffort', effort: 'high' }, '/workspaces/a');
    resetPreferencesCache();

    expect(preferenceFor('/workspaces/a', 'claude')).toStrictEqual({ model: 'sonnet', effort: 'high' });
  });

  test('a pick the session refuses is not stored, and the answer names why (ONL-2542)', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-refused-pick' });
    resetPreferencesCache();
    const map = new SessionMap();
    const a = fakeSession('/workspaces/a', 'claude', { modelPick: { accepted: false, refusal: 'signed-out' } });
    map.set(a.session);
    const host = new AgentHost(false, map);

    const answer = await host.command({ type: 'session.setModel', model: 'claude-fable-5-1' }, '/workspaces/a');
    resetPreferencesCache();

    expect(answer).toStrictEqual({ accepted: false, modelRefusal: 'signed-out' });
    expect(preferenceFor('/workspaces/a', 'claude')?.model).toBeUndefined();
  });

  test('a pick with no live session is refused rather than stored (ONL-2542)', async () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'agent-host-sessionless-pick' });
    resetPreferencesCache();
    const host = new AgentHost(false, new SessionMap());

    const answer = await host.command({ type: 'session.setModel', model: 'sonnet' }, '/workspaces/a');
    resetPreferencesCache();

    expect(answer).toStrictEqual({ accepted: false });
    expect(preferenceFor('/workspaces/a', 'claude')?.model).toBeUndefined();
  });
});

describe('each Project keeps the runtime that answered it (ONL-2914)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_WORKSPACE_ROOT', 'STUDIO_FIRST_RUN', 'STUDIO_HARNESS', 'STUDIO_AGENT_PROBE'] as const;

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_HARNESS'];
    process.env['STUDIO_AGENT_PROBE'] = 'ok';
  });
  afterEach(() => {
    jest.useRealTimers();
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    resetSettingsCache();
    resetOnboardingCache();
  });

  function projects(name: string, names: readonly string[]): string[] {
    const paths = registerWorkspaces(`keeps-${name}`, names);
    resetSettingsCache();
    resetOnboardingCache();
    resetSessionsCache();
    resetPreferencesCache();
    resetChatHistoryCache();
    resetTranscriptCache();
    resetProjectHarnessCache();
    return paths;
  }

  function row(cwd: string, event: Partial<StudioEvent> & Pick<StudioEvent, 'type'>): StudioEvent {
    return { sessionId: 's', cwd, eventId: `${event.type}-1`, seq: 1, ts: 0, ...event } as StudioEvent;
  }
  const answerRow = (cwd: string): StudioEvent => row(cwd, { type: 'text.start', blockId: 'b' } as Partial<StudioEvent> & Pick<StudioEvent, 'type'>);

  function host(): {
    host: AgentHost;
    picks: string[];
    emit: (cwd: string, event: StudioEvent) => void;
    restart: (cwd: string) => Promise<void>;
    live: (cwd: string) => AgentBackend | undefined;
  } {
    const map = new SessionMap();
    const picks: string[] = [];
    const emitters = new Map<string, (event: StudioEvent) => void>();
    const agentHost = new AgentHost(false, map, (cwd, harness, _tools, onEvent) => {
      picks.push(harness);
      emitters.set(cwd, onEvent);
      return fakeSession(cwd, harness).session;
    });
    return {
      host: agentHost,
      picks,
      emit: (cwd, event) => emitters.get(cwd)?.(event),
      restart: async (cwd) => {
        await agentHost.command({ type: 'session.stop' }, cwd);
        await agentHost.command({ type: 'session.start', cwd }, cwd);
      },
      live: (cwd) => map.get(cwd),
    };
  }

  test('after an answer, a flip of the default moves neither a restart nor a new chat', async () => {
    const [cwd] = projects('answered', ['a']) as [string];
    const h = host();
    await h.host.command({ type: 'session.start', cwd }, cwd);
    h.emit(cwd, answerRow(cwd));
    expect(knownProject(cwd)?.harness).toBe('claude');

    setSettingsHarness('codex');
    await h.restart(cwd);
    h.live(cwd)?.prompt('again', undefined, undefined, 'user');
    expect(await h.host.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    expect(h.picks).toEqual(['claude', 'claude', 'claude']);
  });

  test('a Project whose turns only failed follows the default', async () => {
    const [cwd] = projects('failed-only', ['a']) as [string];
    const h = host();
    await h.host.command({ type: 'session.start', cwd }, cwd);
    h.emit(cwd, row(cwd, { type: 'message.user', turnId: 't', text: 'hi' } as Partial<StudioEvent> & Pick<StudioEvent, 'type'>));
    h.emit(cwd, row(cwd, { type: 'session.error', message: 'overloaded', code: 'api_error' } as Partial<StudioEvent> & Pick<StudioEvent, 'type'>));

    setSettingsHarness('codex');
    await h.restart(cwd);

    expect(knownProject(cwd)?.harness).toBeUndefined();
    expect(h.picks).toEqual(['claude', 'appserver']);
  });

  test('a Project from before the field takes the runtime that answered it, the later-opened when both did', async () => {
    const [onlyCodex, both, neither] = projects('history', ['only-codex', 'both', 'neither']) as [string, string, string];
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    writeTranscript(onlyCodex, 'appserver', [answerRow(onlyCodex)]);
    rememberAppServerThread(onlyCodex, 'thread-old');
    archiveChat(both, 'claude', { sessionId: 'old', events: [answerRow(both)] });
    rememberSession(both, 'claude-old');
    rememberSession(neither, 'claude-unanswered');
    jest.setSystemTime(new Date('2026-10-02T00:00:00Z'));
    rememberSession(onlyCodex, 'claude-newer');
    writeTranscript(both, 'appserver', [answerRow(both)]);
    rememberAppServerThread(both, 'thread-newer');
    jest.useRealTimers();

    const h = host();
    for (const cwd of [onlyCodex, both, neither]) await h.host.command({ type: 'session.start', cwd }, cwd);

    expect(h.picks).toEqual(['appserver', 'appserver', 'claude']);
    expect(knownProject(onlyCodex)?.harness).toBe('codex');
    expect(knownProject(both)?.harness).toBe('codex');
    expect(knownProject(neither)?.harness).toBeUndefined();
  });

  test("a Project's own write decides its next start, and the pin still beats it", async () => {
    const [cwd] = projects('set', ['a']) as [string];
    setProjectHarness(cwd, 'codex');
    const h = host();
    await h.host.command({ type: 'session.start', cwd }, cwd);
    process.env['STUDIO_HARNESS'] = 'claude';
    await h.restart(cwd);
    expect(h.picks).toEqual(['appserver', 'claude']);
  });

  test('a Project off the default reports its own runtime before its session starts', () => {
    const [cwd] = projects('verdict', ['a']) as [string];
    setProjectHarness(cwd, 'codex');
    const h = host();
    h.host.noteCodexSetup('ready');
    expect(h.host.snapshot({}, cwd).connection).toEqual({ status: 'ok', harness: 'codex' });
  });

  test('cooling asks the runtime the Project is on', async () => {
    const [cwd] = projects('cooling', ['a']) as [string];
    rememberAppServerThread(cwd, 'thread-1');
    expect(await sessionResumable(cwd)).toBe(false);
    setProjectHarness(cwd, 'codex');
    expect(await sessionResumable(cwd)).toBe(true);
  });

  test('starting a Project on ChatGPT leaves its Claude transcript alone', async () => {
    const [cwd] = projects('claude-kept', ['a']) as [string];
    writeTranscript(cwd, 'claude', [answerRow(cwd)]);
    setProjectHarness(cwd, 'codex');
    const h = host();
    await h.host.command({ type: 'session.start', cwd }, cwd);
    expect(h.picks).toEqual(['appserver']);
    expect(readTranscript(cwd, 'claude').map((event) => event.type)).toEqual(['text.start']);
  });

  describe('switching one Project to the other agent (ONL-2903)', () => {
    interface Started { harness: string; projectAgent: string | undefined; archived: number; claudeRecord: string | undefined }

    function switchHost(savedAt?: string): {
      host: AgentHost;
      starts: Started[];
      contexts: (cwd: string) => (string | undefined)[];
      live: (cwd: string) => AgentBackend | undefined;
      map: SessionMap;
    } {
      const map = new SessionMap();
      const starts: Started[] = [];
      const fakes = new Map<string, ReturnType<typeof fakeSession>>();
      const agentHost = new AgentHost(false, map, (cwd, harness) => {
        starts.push({
          harness,
          projectAgent: knownProject(cwd)?.harness,
          archived: readArchivedChats(cwd, 'claude').length,
          claudeRecord: storedClaudeSession(cwd),
        });
        const fake = fakeSession(cwd, harness, savedAt === undefined || harness !== 'claude' ? {} : { transcriptPath: savedAt });
        fakes.set(cwd, fake);
        return fake.session;
      });
      return { host: agentHost, starts, contexts: (cwd) => fakes.get(cwd)?.contexts ?? [], live: (cwd) => map.get(cwd), map };
    }

    test("archives, forgets, writes the Project's agent, then starts it", async () => {
      const [cwd, other] = projects('switch-order', ['a', 'b']) as [string, string];
      const h = switchHost('/state/claude/a.jsonl');
      await h.host.command({ type: 'session.start', cwd }, cwd);
      rememberSession(cwd, 'claude-old');
      h.live(cwd)?.prompt('make it warmer', undefined, undefined, 'user');

      expect(await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, cwd)).toEqual({ accepted: true });

      expect(h.starts.at(-1)).toEqual({ harness: 'appserver', projectAgent: 'codex', archived: 1, claudeRecord: undefined });
      expect(h.live(cwd)?.harness).toBe('appserver');
      expect(knownProject(other)?.harness).toBeUndefined();
    });

    test('a switch is a new chat, so it takes back the always-allows too (ONL-2933)', async () => {
      const [cwd] = projects('switch-grants', ['a']) as [string];
      const h = switchHost('/state/claude/a.jsonl');
      await h.host.command({ type: 'session.start', cwd }, cwd);
      h.live(cwd)?.prompt('make it warmer', undefined, undefined, 'user');
      rememberAllowRules(cwd, 'claude', ['Bash(npm run build)']);

      expect(await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, cwd)).toEqual({ accepted: true });

      expect(preferenceFor(cwd, 'claude')?.allowRules).toBeUndefined();
    });

    test('the breadcrumb rides exactly one user prompt, beside what that prompt carried', async () => {
      const [cwd] = projects('switch-crumb', ['a']) as [string];
      renameProject(cwd, 'Named', 'user');
      const h = switchHost('/state/claude/a.jsonl');
      await h.host.command({ type: 'session.start', cwd }, cwd);
      h.live(cwd)?.prompt('make it warmer', undefined, undefined, 'user');
      await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, cwd);

      await h.host.studioPrompt(cwd, 'start the app');
      await h.host.command({ type: 'prompt', text: 'make it warmer', context: 'selection' }, cwd);
      await h.host.command({ type: 'prompt', text: 'and the footer' }, cwd);

      expect(h.contexts(cwd)).toEqual([undefined, `selection\n\n${previousChatInstruction('claude', '/state/claude/a.jsonl')}`, undefined]);
    });

    test('an agent that never said where it saved the chat leaves no breadcrumb', async () => {
      const [cwd] = projects('switch-no-path', ['a']) as [string];
      renameProject(cwd, 'Named', 'user');
      const h = switchHost();
      await h.host.command({ type: 'session.start', cwd }, cwd);
      h.live(cwd)?.prompt('make it warmer', undefined, undefined, 'user');
      await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, cwd);
      await h.host.command({ type: 'prompt', text: 'make it warmer' }, cwd);
      expect(h.contexts(cwd)).toEqual([undefined]);
    });

    test('refused mid-turn, onto the agent it already runs, and under a pin, each before anything is archived', async () => {
      const [busy, same, pinned] = projects('switch-refused', ['busy', 'same', 'pinned']) as [string, string, string];
      const h = switchHost();
      for (const cwd of [busy, same, pinned]) {
        await h.host.command({ type: 'session.start', cwd }, cwd);
        h.live(cwd)?.prompt('hi', undefined, undefined, 'user');
      }
      const streaming = h.live(busy);
      if (streaming === undefined) throw new Error('expected a live session');
      h.map.set({ ...streaming, isStreaming: true } as AgentBackend);

      expect(await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, busy)).toEqual({ accepted: false });
      expect(await h.host.command({ type: 'session.switchHarness', harness: 'claude', entry: 'menu' }, same)).toEqual({ accepted: false });
      process.env['STUDIO_HARNESS'] = 'claude';
      expect(await h.host.command({ type: 'session.switchHarness', harness: 'codex', entry: 'menu' }, pinned)).toEqual({ accepted: false });

      for (const cwd of [busy, same, pinned]) expect(readArchivedChats(cwd, 'claude')).toEqual([]);
      expect(h.starts.map((start) => start.harness)).toEqual(['claude', 'claude', 'claude']);
    });
  });
});
