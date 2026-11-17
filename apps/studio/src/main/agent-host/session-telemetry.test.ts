import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { PROJECT_SETUP_REPAIR_PROMPT, type StudioEvent } from '@studio/events';
import type { AppLike } from '../telemetry/index.js';
import { STUDIO_MCP_SERVER } from './tool-names.js';
import { connectorMenuProperties, connectorToolProperties, recordConnectorActivity } from './connector-telemetry.js';
import { ConnectorSignIn } from './connector-sign-in.js';

const { classifySessionError } = await import('./connection.js');
const { EventLog } = await import('./event-log.js');
const { handleSdkMessage, sessionEndReason } = await import('./reduce.js');
const { createAppServerTurnState, handleAppServerFrame } = await import('./appserver/translate.js');
const { APPSERVER_PRESENTATION } = await import('./appserver/presentation.js');
const {
  recordAgentError,
  recordAgentSessionEnded,
  recordAgentSessionStarted,
  recordAgentTurnEnded,
  recordAgentTurnStarted,
  recordAgentTurnStalled,
  recordChatMessageSent,
  recordAgentSwitched,
  recordChatNewStarted,
  recordSetupApprovalWithheld,
  recordSetupStepsEnded,
  recordSetupStepsShown,
} = await import('./session-telemetry.js');
const { capture, initTelemetry, peekQueueForTesting, workspaceTelemetryId, workspaceTelemetryProperties, resetTelemetryForTesting, setAppForTesting } =
  await import('../telemetry/index.js');
const { pendingBatches, readBatch } = await import('../telemetry/outbox.js');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-session-telemetry-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const REPO_IDENTITY = 'github.com/acme/site';
const SESSION_ID = 'stest1';
const REF = { repoIdentity: REPO_IDENTITY, sessionId: SESSION_ID, harness: 'claude' } as const;
const CODEX_REF = { repoIdentity: REPO_IDENTITY, sessionId: SESSION_ID, harness: 'appserver' } as const;

const ENV_KEYS = [
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
  'STUDIO_STATE_ROOT',
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

const realFetch = globalThis.fetch;

beforeEach(() => {
  resetTelemetryForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  setAppForTesting(fakeApp(makeRoot('userdata')));
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
  initTelemetry();
});

afterEach(() => {
  resetTelemetryForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const PROMPT_TEXT = 'make the hero button cobalt blue';
const RESPONSE_TEXT = 'Done — the button now uses the cobalt token.';

describe('connector analytics', () => {
  it.each(['claude', 'appserver'] as const)('captures bounded menu inventory and actual private connection outcomes on %s', async (harness) => {
    const inventory = { servers: [
      { id: 'private-client', name: 'A secret project', state: 'needs-sign-in' as const, error: 'Rust::Internal https://secret.test/oauth' },
      { id: 'design', name: 'Private Figma alias', featured: 'figma' as const, state: 'connected' as const },
    ] };
    capture('connector_menu_opened', connectorMenuProperties(harness, 'notice', inventory));
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('not adding'); },
      authenticate: async (_name, _signal, onBrowser) => { onBrowser(); },
    }, () => {}, 120_000, (event) => recordConnectorActivity(harness, event));
    controller.update(inventory);
    controller.act('private-client');
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.close();
    const properties = connectorToolProperties(harness, 'mcp__design__get_design_context', inventory)!;
    capture('connector_tool_used', properties);
    const rows = peekQueueForTesting().filter((event) => event.event.startsWith('connector_'));
    expect(rows.map((row) => row.event)).toEqual(['connector_menu_opened', 'connector_connection_started', 'connector_connection_finished', 'connector_tool_used']);
    expect(rows[0]?.properties).toMatchObject({ harness: harness === 'appserver' ? 'codex' : 'claude', source: 'notice', inventory_known: true, connector_count: 2, needs_sign_in_count: 1, connected_count: 1, failed_count: 0 });
    expect(rows[1]?.properties['attempt_id']).toBe(rows[2]?.properties['attempt_id']);
    expect(rows[2]?.properties).toMatchObject({ connector: 'other', outcome: 'connected', action: 'sign-in' });
    expect(rows[3]?.properties).toMatchObject({ connector: 'figma', connection_state: 'connected' });
    expect(connectorToolProperties(harness, 'mcp__studio__create_frame', inventory)).toBeUndefined();
    if (harness === 'appserver') for (const server of ['codex_apps', 'codex_app', 'cua_repl', 'node_repl']) expect(connectorToolProperties(harness, `mcp__${server}__run`, inventory)).toBeUndefined();
    expect(connectorToolProperties(harness, 'mcp__private-client__lookup', inventory)?.connector).toBe('other');
    const serialized = JSON.stringify(rows);
    for (const secret of ['private-client', 'A secret project', 'Private Figma alias', 'Rust::', 'secret.test', 'get_design_context']) expect(serialized).not.toContain(secret);
  });

  it('an unavailable inventory is unknown, not an observed empty menu', () => {
    expect(connectorMenuProperties('claude', 'plug', undefined)).toMatchObject({ inventory_known: false });
    expect(connectorMenuProperties('claude', 'plug', { servers: [], unavailable: true })).toMatchObject({ inventory_known: false });
    expect(connectorMenuProperties('claude', 'plug', { servers: [] })).toMatchObject({ inventory_known: true, connector_count: 0 });
  });
});

function driveCompletedTurn(): InstanceType<typeof EventLog> {
  const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
  const turnId = log.beginTurn();
  log.push({ type: 'turn.started', turnId });
  log.push({ type: 'message.user', turnId, text: PROMPT_TEXT });

  log.ensureToolStart('tu1', 'Bash', { command: 'rm -rf dist' }, 'pending', {
    source: 'permission',
  });
  log.push({
    type: 'permission.requested',
    requestId: 'r1',
    toolCallId: 'tu1',
    toolName: 'Bash',
    title: 'Claude wants to run Bash',
    input: { command: 'rm -rf dist' },
    options: [],
  });
  log.push({
    type: 'permission.resolved',
    requestId: 'r1',
    toolCallId: 'tu1',
    outcome: 'deny',
  });
  log.ensureToolStart(
    'tu2',
    'Edit',
    { file_path: '/tmp/studio-ws/Button.tsx', old_string: 'red', new_string: 'cobalt' },
    'in_progress',
    { source: 'hook' },
  );
  log.endTool('tu2', 'completed');

  const blockId = log.openBlock('root:0');
  log.push({ type: 'text.start', blockId });
  log.push({ type: 'text.delta', blockId, delta: RESPONSE_TEXT });

  handleSdkMessage(
    log,
    { type: 'result', subtype: 'success', total_cost_usd: 0.04, duration_ms: 1200 },
    { onTurnEnded: (summary) => recordAgentTurnEnded(REF, summary) },
  );
  return log;
}

describe('external MCP telemetry', () => {
  function drive(harness: 'claude' | 'appserver', names: string[], stopReason = 'success') {
    const ref = harness === 'claude' ? REF : CODEX_REF;
    const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {}, ...(harness === 'appserver' ? { presentation: APPSERVER_PRESENTATION } : {}) });
    const state = createAppServerTurnState();
    const opts = { onTurnEnded: (summary: Parameters<typeof recordAgentTurnEnded>[1]) => recordAgentTurnEnded(ref, summary) };
    if (harness === 'claude') handleSdkMessage(log, { type: 'system', subtype: 'init', mcp_servers: names.filter((name) => name !== 'builtin').map((name) => ({ name, status: 'connected' })) });
    log.beginTurn();
    for (const [index, server] of names.entries()) {
      const id = `call-${index}`;
      if (harness === 'claude') {
        const content = [{ type: 'tool_use', id, name: server === 'builtin' ? 'Read' : `mcp__${server}__private_tool`, input: { secret: 'private-input' } }];
        handleSdkMessage(log, { type: 'assistant', message: { content } });
        handleSdkMessage(log, { type: 'assistant', message: { content } });
        handleSdkMessage(log, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'private-result' }] } });
      } else {
        const item = server === 'builtin'
          ? { type: 'commandExecution', id, command: 'private-input', status: 'completed', exitCode: 0 }
          : { type: 'mcpToolCall', id, server, tool: 'private_tool', arguments: { secret: 'private-input' }, status: 'completed', result: { content: [{ type: 'text', text: 'private-result' }] } };
        for (const method of ['item/started', 'item/started', 'item/completed', 'item/completed']) handleAppServerFrame(log, { method, params: { item } }, state);
      }
    }
    if (harness === 'claude') handleSdkMessage(log, { type: 'result', subtype: stopReason }, opts);
    else handleAppServerFrame(log, { method: 'turn/completed', params: { turn: { status: stopReason === 'success' ? 'completed' : stopReason } } }, state, opts);
    return { log, state, opts };
  }

  function mcpEvents() {
    return peekQueueForTesting().filter((event) => event.event === 'agent_mcp_tools_used');
  }

  for (const harness of ['claude', 'appserver'] as const) {
    it(`external MCP telemetry counts ${harness === 'claude' ? 'Claude' : 'Codex'} calls once per turn`, () => {
      drive(harness, [STUDIO_MCP_SERVER, `${STUDIO_MCP_SERVER}__private`, 'private-server', 'builtin']);
      expect(mcpEvents()).toHaveLength(1);
      expect(mcpEvents()[0]?.properties).toMatchObject({ harness: harness === 'claude' ? 'claude' : 'codex', mcp_tool_call_count: 2, turn_id: 't1', agent_session_id: SESSION_ID, project_id: workspaceTelemetryId(REPO_IDENTITY), outcome: 'success', origin: 'user' });
      const turn = peekQueueForTesting().find((event) => event.event === 'agent_turn_ended');
      expect(turn?.properties['tool_call_count']).toBe(harness === 'claude' ? 4 : 1);
      expect(turn?.properties).not.toHaveProperty('mcp_tool_call_count');
    });

    it(`external MCP telemetry excludes built-ins and Studio tools on ${harness}`, () => {
      drive(harness, [STUDIO_MCP_SERVER, 'builtin']);
      drive(harness, []);
      expect(mcpEvents()).toHaveLength(0);
      expect(peekQueueForTesting().filter((event) => event.event === 'agent_turn_ended')).toHaveLength(2);
    });

    it(`external MCP telemetry sends only allowed properties on ${harness}`, () => {
      capture('text_tool_armed', {});
      const superKeys = Object.keys(peekQueueForTesting().find((event) => event.event === 'text_tool_armed')!.properties);
      drive(harness, ['secret-server']);
      const event = mcpEvents()[0];
      expect(event).toBeDefined();
      const turn = peekQueueForTesting().find((row) => row.event === 'agent_turn_ended');
      const companionOnly = Object.keys(event!.properties).filter((key) => !Object.hasOwn(turn!.properties, key));
      expect(companionOnly).toEqual(['mcp_tool_call_count']);
      const ownKeys = ['project_id', 'agent_session_id', 'harness', 'turn_id', 'mcp_tool_call_count', 'origin', 'outcome'];
      expect(Object.keys(event!.properties).sort()).toEqual([...ownKeys, ...superKeys].sort());
      const serialized = JSON.stringify(event);
      for (const secret of ['secret-server', 'private_tool', 'private-input', 'private-result', REPO_IDENTITY, '/tmp/studio-ws', 'call-0']) expect(serialized).not.toContain(secret);
    });

    it(`sends agent_turn_tools once per turn on ${harness}, zeros included, with counts and join ids only`, () => {
      drive(harness, ['private-server', 'builtin']);
      drive(harness, [], harness === 'claude' ? 'error_during_execution' : 'failed');
      const tools = peekQueueForTesting().filter((event) => event.event === 'agent_turn_tools');
      expect(tools).toHaveLength(2);
      expect(tools[0]?.properties).toMatchObject({
        ...workspaceTelemetryProperties(REPO_IDENTITY),
        harness: harness === 'claude' ? 'claude' : 'codex',
        turn_id: 't1',
        outcome: 'success',
        external_mcp_calls: 1,
        read_calls: harness === 'claude' ? 1 : 0,
        shell_calls: harness === 'claude' ? 0 : 1,
        other_calls: 0,
      });
      expect(tools[1]?.properties).toMatchObject({ outcome: 'error', external_mcp_calls: 0, read_calls: 0, shell_calls: 0 });
      const serialized = JSON.stringify(tools);
      for (const secret of ['private-server', 'private_tool', 'private-input', 'private-result', REPO_IDENTITY, '/tmp/studio-ws']) expect(serialized).not.toContain(secret);
    });
  }

  it('splits a failed command by kind on both Harnesses, and the split adds up to the total', () => {
    const claude = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
    claude.beginTurn();
    const command = [{ type: 'tool_use', id: 'cmd', name: 'Bash', input: { command: 'private-input' } }];
    handleSdkMessage(claude, { type: 'assistant', message: { content: command } });
    handleSdkMessage(claude, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'cmd', content: 'private-result', is_error: true }] } });
    handleSdkMessage(claude, { type: 'result', subtype: 'success' }, { onTurnEnded: (summary) => recordAgentTurnEnded(REF, summary) });
    const codex = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    codex.beginTurn();
    const item = { type: 'commandExecution', id: 'cmd', command: 'private-input', status: 'failed', exitCode: 1 };
    for (const method of ['item/started', 'item/completed']) handleAppServerFrame(codex, { method, params: { item } }, state);
    handleAppServerFrame(codex, { method: 'turn/completed', params: { turn: { status: 'completed' } } }, state, { onTurnEnded: (summary) => recordAgentTurnEnded(CODEX_REF, summary) });
    const tools = peekQueueForTesting().filter((event) => event.event === 'agent_turn_tools');
    expect(tools.map((event) => [event.properties['harness'], event.properties['failed_calls'], event.properties['shell_failed_calls'], event.properties['other_failed_calls']])).toEqual([['claude', 1, 1, 0], ['codex', 1, 1, 0]]);
    for (const tool of tools) {
      for (const outcome of ['failed', 'denied', 'canceled']) {
        const byKind = Object.entries(tool.properties).filter(([key]) => key.endsWith(`_${outcome}_calls`));
        expect(byKind).toHaveLength(14);
        expect(byKind.reduce((sum, [, count]) => sum + (count as number), 0)).toBe(tool.properties[`${outcome}_calls`] as number);
      }
    }
  });

  it('external MCP telemetry counts late Codex metadata and resets on the next turn', () => {
    const { log, state, opts } = drive('appserver', []);
    log.beginTurn('suggestion');
    handleAppServerFrame(log, { method: 'item/started', params: { item: { type: 'mcpToolCall', id: 'late' } } }, state);
    const item = { type: 'mcpToolCall', id: 'late', server: `${STUDIO_MCP_SERVER}__private`, tool: 'private_tool', status: 'failed' };
    handleAppServerFrame(log, { method: 'item/completed', params: { item } }, state);
    handleAppServerFrame(log, { method: 'item/completed', params: { item } }, state);
    recordAgentTurnEnded(CODEX_REF, { ...log.turnTally()!, stopReason: 'interrupted', origin: 'suggestion' });
    expect(mcpEvents()[0]?.properties).toMatchObject({ mcp_tool_call_count: 1, turn_id: 't2', origin: 'suggestion', outcome: 'interrupted' });
    log.beginTurn();
    handleAppServerFrame(log, { method: 'turn/completed', params: { turn: { status: 'completed' } } }, state, opts);
    expect(mcpEvents()).toHaveLength(1);
  });

  it('external MCP telemetry retains unsuccessful calls on both Harnesses', () => {
    const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
    log.beginTurn();
    for (const status of ['failed', 'denied', 'canceled'] as const) {
      log.ensureToolStart(status, 'mcp__private-server__private_tool', {}, 'in_progress', { source: 'assistant' });
      log.endTool(status, status);
    }
    handleSdkMessage(log, { type: 'result', subtype: 'error_during_execution' }, { onTurnEnded: (summary) => recordAgentTurnEnded(REF, summary) });
    drive('appserver', ['private-server'], 'interrupted');
    expect(mcpEvents().map((event) => [event.properties['harness'], event.properties['mcp_tool_call_count'], event.properties['outcome']])).toEqual([['claude', 3, 'error'], ['codex', 1, 'interrupted']]);
  });

  it('external MCP telemetry respects opt-out', () => {
    resetTelemetryForTesting();
    process.env['STUDIO_TELEMETRY'] = '0';
    initTelemetry();
    drive('claude', ['private-server']);
    drive('appserver', ['private-server']);
    expect(mcpEvents()).toHaveLength(0);
  });
});

describe('agent-session telemetry', () => {
  it('durably records unanswered turns and stalls on both providers without waiting for a turn end', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    for (const ref of [REF, CODEX_REF]) {
      recordAgentTurnStarted(ref, { turnId: 't1', origin: 'user' });
      recordAgentTurnStalled(ref, { turnId: 't1', silentMs: 120_000 });
    }
    const events = pendingBatches().flatMap((path) => readBatch(path) ?? []).filter((row) => row.event.startsWith('agent_turn_'));
    expect(events.map((row) => row.event)).toEqual(['agent_turn_started', 'agent_turn_stalled', 'agent_turn_started', 'agent_turn_stalled']);
    expect(events.map((row) => row.properties['harness'])).toEqual(['claude', 'claude', 'codex', 'codex']);
    for (const row of events) {
      expect(row.properties).toMatchObject({ turn_id: 't1', agent_session_id: SESSION_ID, project_id: workspaceTelemetryId(REPO_IDENTITY) });
      expect(JSON.stringify(row)).not.toContain(REPO_IDENTITY);
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it('keeps Onlook-started edits out of activation while user turns remain eligible', () => {
    for (const origin of ['studio', 'user'] as const) {
      const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
      log.beginTurn();
      log.ensureToolStart('edit', 'Edit', { file_path: '/tmp/studio-ws/Button.tsx' }, 'in_progress', { source: 'assistant' });
      log.endTool('edit', 'completed');
      const summary = log.turnTally();
      if (summary === undefined) throw new Error('missing turn');
      recordAgentTurnEnded(REF, { ...summary, origin });
      expect(peekQueueForTesting().filter((row) => row.event === 'agent_turn_ended').at(-1)?.properties).toMatchObject({
        origin, files_changed: 1, had_visible_edit: origin === 'user',
        attempted_frame_inspection: false, had_provider_stall: false,
      });
    }
  });
  it('counts an edit in a Studio turn the person joined as a visible edit (ONL-2961)', () => {
    for (const joined of [false, true]) {
      const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
      const turnId = log.beginTurn('studio');
      log.push({ type: 'message.user', turnId, text: 'First call get_project_setup…', origin: 'studio' });
      if (joined) log.push({ type: 'message.user', turnId, text: 'make the header navy', origin: 'user' });
      log.ensureToolStart('edit', 'Edit', { file_path: '/tmp/studio-ws/Header.tsx' }, 'in_progress', { source: 'assistant' });
      log.endTool('edit', 'completed');
      const summary = log.turnTally();
      if (summary === undefined) throw new Error('missing turn');
      recordAgentTurnEnded(REF, { ...summary, origin: 'studio' });
      expect(peekQueueForTesting().filter((row) => row.event === 'agent_turn_ended').at(-1)?.properties).toMatchObject({
        origin: 'studio', files_changed: 1, user_messages: joined ? 1 : 0, had_visible_edit: joined,
      });
    }
  });
  it('classifies explicit plans, failed edits, explanations and empty turns without inspecting text', () => {
    const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
    const finish = () => {
      const summary = log.turnTally();
      if (summary === undefined) throw new Error('missing tally');
      recordAgentTurnEnded(REF, summary);
      return peekQueueForTesting().filter((row) => row.event === 'agent_turn_ended').at(-1)?.properties;
    };
    log.push({ type: 'session.settings', permissionMode: 'plan' });
    log.beginTurn();
    expect(finish()?.['no_edit_reason']).toBe('plan_only');
    log.push({ type: 'session.settings', permissionMode: 'default' });
    log.beginTurn();
    log.ensureToolStart('edit-failed', 'Edit', { file_path: '/tmp/studio-ws/private.ts', old_string: 'private', new_string: 'secret' }, 'in_progress', { source: 'assistant' });
    log.push({ type: 'tool.end', toolCallId: 'edit-failed', status: 'failed' });
    expect(finish()?.['no_edit_reason']).toBe('edit_failed');
    log.beginTurn();
    log.push({ type: 'text.delta', blockId: 'b-next', delta: 'private explanation' });
    expect(finish()?.['no_edit_reason']).toBe('explanation_only');
    log.beginTurn();
    expect(finish()?.['no_edit_reason']).toBe('other');
    const serialized = JSON.stringify(peekQueueForTesting().filter((row) => row.event === 'agent_turn_ended'));
    expect(serialized).not.toContain('private');
    expect(serialized).not.toContain('secret');
  });
  it('a completed session emits started, turn_ended, ended in order with one agent_session_id', () => {
    recordAgentSessionStarted(REF, { model: 'opus', isAuthenticated: true });
    const log = driveCompletedTurn();
    recordAgentSessionEnded(REF, {
      reason: sessionEndReason({ failed: false, streaming: false, lastResultSubtype: 'success' }),
      durationMs: 5_000,
      turnCount: log.turnCount,
      totalCostUsd: 0.04,
    });

    const agentEvents = peekQueueForTesting().filter((e) => e.event.startsWith('agent_'));
    expect(agentEvents.map((e) => e.event)).toEqual([
      'agent_session_started',
      'agent_turn_ended',
      'agent_turn_tools',
      'agent_session_ended',
    ]);
    for (const event of agentEvents) {
      expect(event.properties['agent_session_id']).toBe(SESSION_ID);
      expect(event.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
    }
    expect(agentEvents[3]?.properties['reason']).toBe('completed');
    expect(agentEvents[3]?.properties['turn_count']).toBe(1);
  });

  it('the turn payload carries counts and lengths, never text', () => {
    driveCompletedTurn();

    const [turn] = peekQueueForTesting().filter((e) => e.event === 'agent_turn_ended');
    expect(turn).toBeDefined();
    expect(turn?.properties['tool_call_count']).toBe(2);
    expect(turn?.properties['permission_request_count']).toBe(1);
    expect(turn?.properties['permission_denied_count']).toBe(1);
    expect(turn?.properties['prompt_chars']).toBe(PROMPT_TEXT.length);
    expect(turn?.properties['response_chars']).toBe(RESPONSE_TEXT.length);
    expect(turn?.properties['files_changed']).toBe(1);
    expect(turn?.properties['stop_reason']).toBe('success');
    expect(typeof turn?.properties['duration_ms']).toBe('number');
    // Its own measure beside the wall clock, so a turn that waited stays comparable (ONL-2295).
    expect(turn?.properties['waited_ms']).toBe(0);

    const serialized = JSON.stringify(turn?.properties);
    expect(serialized).not.toContain(PROMPT_TEXT);
    expect(serialized).not.toContain(RESPONSE_TEXT);
    expect(serialized).not.toContain('cobalt');
    expect(serialized).not.toContain('rm -rf');
    expect(serialized).not.toContain('Button.tsx');
    expect(serialized).not.toContain('/tmp/studio-ws');
  });

  it('a successful turn with files changed omits preview_reflected and no_edit_reason (ONL-2862)', () => {
    driveCompletedTurn();

    const [turn] = peekQueueForTesting().filter((e) => e.event === 'agent_turn_ended');
    expect(turn?.properties['outcome']).toBe('success');
    expect(turn?.properties['files_changed']).toBe(1);
    expect(Object.keys(turn?.properties ?? {})).not.toContain('preview_reflected');
    expect(Object.keys(turn?.properties ?? {})).not.toContain('no_edit_reason');
  });

  it('a successful turn with zero files changed carries no_edit_reason (ONL-2686)', () => {
    const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
    const turnId = log.beginTurn();
    log.push({ type: 'turn.started', turnId });
    log.push({ type: 'message.user', turnId, text: PROMPT_TEXT });

    const blockId = log.openBlock('root:0');
    log.push({ type: 'text.start', blockId });
    log.push({ type: 'text.delta', blockId, delta: RESPONSE_TEXT });

    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', total_cost_usd: 0.01, duration_ms: 500 },
      { onTurnEnded: (summary) => recordAgentTurnEnded(REF, summary) },
    );

    const [turn] = peekQueueForTesting().filter((e) => e.event === 'agent_turn_ended');
    expect(turn?.properties['outcome']).toBe('success');
    expect(turn?.properties['files_changed']).toBe(0);
    expect(turn?.properties['no_edit_reason']).toBe('explanation_only');
    expect(Object.keys(turn?.properties ?? {})).not.toContain('preview_reflected');
  });

  it('a successful turn that asked a question reports no_edit_reason question_asked (ONL-2686)', () => {
    const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
    const turnId = log.beginTurn();
    log.push({ type: 'turn.started', turnId });
    log.push({ type: 'message.user', turnId, text: 'what color is the button?' });

    log.push({
      type: 'permission.requested',
      requestId: 'q1',
      toolCallId: 'tq1',
      toolName: 'AskQuestion',
      title: 'Question',
      input: {},
      options: [],
      questions: [{ question: 'shade', header: 'Which shade of blue?', options: [{ label: 'light', description: 'light blue' }] }],
    });

    const blockId = log.openBlock('root:0');
    log.push({ type: 'text.start', blockId });
    log.push({ type: 'text.delta', blockId, delta: 'Which shade?' });

    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', total_cost_usd: 0.005, duration_ms: 200 },
      { onTurnEnded: (summary) => recordAgentTurnEnded(REF, summary) },
    );

    const [turn] = peekQueueForTesting().filter((e) => e.event === 'agent_turn_ended');
    expect(turn?.properties['no_edit_reason']).toBe('question_asked');
  });

  it('each agent_error code maps from its failure class', () => {
    const failures: Array<[string, string]> = [
      ['Please run /login to authenticate', 'unauthenticated'],
      ['Claude Code native binary not found at /nonexistent/claude', 'cli_missing'],
      ['Claude Code native binary exists but failed to launch', 'cli_missing'],
      ['process exited with code 1', 'spawn_failed'],
      ['an error the classifier has never seen', 'unknown'],
    ];
    for (const [message] of failures) recordAgentError(REF, { code: classifySessionError(message) });

    const errors = peekQueueForTesting().filter((e) => e.event === 'agent_error');
    expect(errors.map((e) => e.properties['code'])).toEqual(failures.map(([, code]) => code));
  });

  it('an interrupted session emits reason interrupted', () => {
    recordAgentSessionEnded(REF, {
      reason: sessionEndReason({ failed: false, streaming: true }),
      durationMs: 800,
      turnCount: 1,
    });

    const [ended] = peekQueueForTesting().filter((e) => e.event === 'agent_session_ended');
    expect(ended?.properties['reason']).toBe('interrupted');
    expect(Object.keys(ended?.properties ?? {})).not.toContain('total_cost_usd');
  });

  it('chat_message_sent carries counts and the first-in-session flag, never the text (ONL-2380)', () => {
    const userRow = (origin?: 'studio'): StudioEvent[] => {
      const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
      const turnId = log.beginTurn();
      log.push({ type: 'message.user', turnId, text: PROMPT_TEXT, ...(origin === undefined ? {} : { origin }) });
      return log.since();
    };
    recordChatMessageSent(REF, { harness: 'claude', events: [] }, { text: PROMPT_TEXT, attachmentCount: 2 });
    recordChatMessageSent(REF, { harness: 'claude', events: userRow() }, { text: PROMPT_TEXT, attachmentCount: 0 });
    recordChatMessageSent(REF, { harness: 'appserver', events: userRow('studio') }, { text: 'x', attachmentCount: 0 });

    const sent = peekQueueForTesting().filter((e) => e.event === 'chat_message_sent');
    expect(sent.map((e) => e.properties['is_first_in_session'])).toEqual([true, false, true]);
    expect(sent[0]!.properties['prompt_chars']).toBe(PROMPT_TEXT.length);
    expect(sent[0]!.properties['attachment_count']).toBe(2);
    expect(sent[0]!.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
    expect(sent.map((e) => e.properties['harness'])).toEqual(['claude', 'claude', 'codex']);
    for (const event of sent) expect(JSON.stringify(event.properties)).not.toContain(PROMPT_TEXT);
  });

  it('setup_steps_ended names the step a setup turn failed at, never the failure text, and skips the repair ask (ONL-2913)', () => {
    const SECRET_LINE = 'npm ERR! ERESOLVE could not resolve /Users/someone/acme';
    const setupTurn = (text: string, origin: 'studio' | undefined): void => {
      const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
      const turnId = log.beginTurn();
      log.push({ type: 'turn.started', turnId });
      log.push({ type: 'message.user', turnId, text, ...(origin === undefined ? {} : { origin }) });
      const failure = { revision: 'r1', stage: 'install', command: 'npm i', reason: 'exit 1', outputTail: SECRET_LINE, elapsedMs: 5 };
      const snapshot = { saved: null, verified: null, state: 'failed', failure };
      log.ensureToolStart('t1', 'mcp__studio__run_project_setup', { action: 'start' }, 'in_progress', { source: 'hook' });
      log.endTool('t1', 'failed', { result: JSON.stringify({ ok: false, reason: 'failed', snapshot }), isError: true });
      handleSdkMessage(
        log,
        { type: 'result', subtype: 'success', total_cost_usd: 0.01, duration_ms: 100 },
        { onTurnEnded: (summary) => recordSetupStepsEnded(REF, { ...summary, ...(origin === undefined ? {} : { origin }) }, log.since()) },
      );
    };
    setupTurn('First call get_project_setup…', 'studio');
    setupTurn(PROJECT_SETUP_REPAIR_PROMPT, 'studio');
    setupTurn('First call get_project_setup…', undefined);

    const ended = peekQueueForTesting().filter((e) => e.event === 'setup_steps_ended');
    expect(ended).toHaveLength(1);
    expect(ended[0]!.properties['outcome']).toBe('failed');
    expect(ended[0]!.properties['failed_step']).toBe(2);
    expect(JSON.stringify(ended[0]!.properties)).not.toContain('ERESOLVE');
  });

  it('setup_steps_shown claims no surface, since main never sees where the checklist draws (ONL-2961)', () => {
    recordSetupStepsShown(REF);
    const shown = peekQueueForTesting().find((e) => e.event === 'setup_steps_shown');
    expect(shown).toBeDefined();
    expect(Object.keys(shown!.properties)).not.toContain('surface');
  });

  it('chat_new_started counts the turns being left and names no path (ONL-2198)', () => {
    const chat = (turns: number, studioPushes = 0): StudioEvent[] => {
      const log = new EventLog({ sessionId: SESSION_ID, cwd: '/tmp/studio-ws', emit: () => {} });
      for (let n = 0; n < studioPushes; n += 1) {
        const turnId = log.beginTurn();
        log.push({ type: 'message.user', turnId, text: 'start the dev server', origin: 'studio' });
      }
      for (let n = 0; n < turns; n += 1) {
        const turnId = log.beginTurn();
        log.push({ type: 'turn.started', turnId });
        log.push({ type: 'message.user', turnId, text: PROMPT_TEXT });
      }
      return log.since();
    };
    recordChatNewStarted(REPO_IDENTITY, { harness: 'claude', events: chat(1) });
    recordChatNewStarted(REPO_IDENTITY, { harness: 'appserver', events: chat(3, 2) });

    const started = peekQueueForTesting().filter((e) => e.event === 'chat_new_started');
    // The user's `message.user` rows only: `turn.started` would double the count, and Studio-sent prompts are not the user's turns.
    expect(started.map((e) => e.properties['turn_count'])).toEqual([1, 3]);
    expect(started.map((e) => e.properties['harness'])).toEqual(['claude', 'codex']);
    expect(started[0]?.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
    for (const event of started) {
      const serialized = JSON.stringify(event.properties);
      expect(serialized).not.toContain(PROMPT_TEXT);
      expect(serialized).not.toContain('/tmp/studio-ws');
      expect(serialized).not.toContain(REPO_IDENTITY);
    }
  });

  it('chat_agent_switched names the project, both agents and where it was chosen, and nothing a chat said (ONL-2903, ONL-2612)', () => {
    recordAgentSwitched(REPO_IDENTITY, 'claude', 'codex', 'menu');
    recordAgentSwitched(REPO_IDENTITY, 'appserver', 'claude', 'failure');

    const switched = peekQueueForTesting().filter((e) => e.event === 'chat_agent_switched');
    expect(switched.map((e) => [e.properties['from_harness'], e.properties['to_harness'], e.properties['entry_point']])).toEqual([
      ['claude', 'codex', 'menu'],
      ['codex', 'claude', 'failure'],
    ]);
    expect(switched[0]?.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
    for (const event of switched) expect(JSON.stringify(event.properties)).not.toContain(REPO_IDENTITY);
  });
});

const CODEX_PATH = '/tmp/studio-ws/Hero.tsx';
const CODEX_COMMAND = 'sed -i s/red/cobalt/ Hero.tsx';

/** Frames shaped like the pinned protocol, driven through the same reducer the session uses. */
function driveCodexTurn(
  over: { status?: string; tool?: 'fileChange' | 'commandExecution' | 'none'; retry?: true; plan?: true } = {},
): void {
  const log = new EventLog({
    sessionId: SESSION_ID,
    cwd: '/tmp/studio-ws',
    emit: () => {},
    presentation: APPSERVER_PRESENTATION,
  });
  const state = createAppServerTurnState();
  const opts = {
    account: {},
    onTurnEnded: (summary: Parameters<typeof recordAgentTurnEnded>[1]) => {
      recordAgentTurnEnded(CODEX_REF, summary);
    },
  };
  const frame = (method: string, params: Record<string, unknown>): void => {
    handleAppServerFrame(log, { method, params }, state, opts);
  };
  frame('turn/started', { turn: { id: 't1' } });
  log.push({ type: 'message.user', turnId: log.turnId, text: PROMPT_TEXT });
  if (over.plan) frame('turn/plan/updated', { plan: [{ step: 'private plan', status: 'completed' }] });
  if (over.retry === true) {
    frame('error', {
      error: { message: 'Reconnecting... 2/5', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } } },
      willRetry: true,
      threadId: 'thread-1',
      turnId: 't1',
    });
  }
  const tool = over.tool ?? 'fileChange';
  if (tool === 'fileChange') {
    const changes = [{ path: CODEX_PATH, kind: { type: 'update' }, diff: '@@ +1 @@\n+cobalt' }];
    frame('item/started', { item: { type: 'fileChange', id: 'c1', status: 'inProgress', changes } });
    frame('item/completed', { item: { type: 'fileChange', id: 'c1', status: 'completed', changes } });
  } else if (tool === 'commandExecution') {
    const item = { type: 'commandExecution', id: 'c1', command: CODEX_COMMAND };
    frame('item/started', { item: { ...item, status: 'inProgress' } });
    frame('item/completed', { item: { ...item, status: 'completed', exitCode: 0, aggregatedOutput: '' } });
  } else {
    frame('item/started', { item: { type: 'agentMessage', id: 'm1' } });
    frame('item/agentMessage/delta', { itemId: 'm1', delta: RESPONSE_TEXT });
    frame('item/completed', { item: { type: 'agentMessage', id: 'm1', text: RESPONSE_TEXT } });
  }
  frame('turn/completed', {
    turn: { id: 't1', status: over.status ?? 'completed', error: null, durationMs: 90 },
  });
}

const turnProps = (): Record<string, unknown> =>
  peekQueueForTesting().filter((e) => e.event === 'agent_turn_ended')[0]?.properties ?? {};

describe('a codex session reports the same turn telemetry a Claude session does (ONL-2463)', () => {
  it('a native Codex plan records plan_only without exporting its contents', () => {
    driveCodexTurn({ tool: 'none', plan: true });
    expect(turnProps()['no_edit_reason']).toBe('plan_only');
    expect(JSON.stringify(turnProps())).not.toContain('private plan');
  });
  it('a turn that landed a file change counts as a visible edit', () => {
    driveCodexTurn();
    expect(turnProps()).toMatchObject({
      harness: 'codex',
      outcome: 'success',
      files_changed: 1,
      had_visible_edit: true,
      execute_targets: 0,
    });
    expect(Object.keys(turnProps())).not.toContain('preview_reflected');
  });

  it('a turn that ran no tool is a success with no visible edit and carries no_edit_reason (ONL-2686)', () => {
    driveCodexTurn({ tool: 'none' });
    expect(turnProps()).toMatchObject({ outcome: 'success', files_changed: 0, had_visible_edit: false, no_edit_reason: 'explanation_only' });
  });

  it('a failed turn reports the error outcome, an interrupted one reports interrupted', () => {
    driveCodexTurn({ status: 'failed' });
    expect(turnProps()).toMatchObject({ outcome: 'error', had_visible_edit: false, files_changed: 1 });
    expect(Object.keys(turnProps())).not.toContain('preview_reflected');
    resetTelemetryForTesting();
    initTelemetry();
    driveCodexTurn({ status: 'interrupted' });
    expect(turnProps()).toMatchObject({ outcome: 'interrupted', files_changed: 1 });
    expect(Object.keys(turnProps())).not.toContain('preview_reflected');
  });

  it('a write through a shell command is a turn the metric cannot see, not one that wrote nothing', () => {
    driveCodexTurn({ tool: 'commandExecution' });
    expect(turnProps()).toMatchObject({
      files_changed: 0,
      had_visible_edit: false,
      execute_targets: 1,
    });
  });

  it('prompt length is null on codex, never a zero that reads as a promptless turn', () => {
    driveCodexTurn();
    expect(turnProps()['prompt_chars']).toBeNull();
  });

  it('defaults the origin to the user when the reducer reports none', () => {
    // The session stamps it; `appserver/session.test.ts` proves that end. Absence reads as the user's.
    driveCodexTurn();
    expect(turnProps()['origin']).toBe('user');
  });

  it('keeps unmeasured Codex retry attempts null rather than reporting zero (ONL-2524)', () => {
    driveCodexTurn({ retry: true });
    expect(turnProps()).toMatchObject({
      outcome: 'success',
      retry_attempts: null,
      retry_observed_count: 0,
      retry_last_status: null,
      retry_error_kind: null,
    });
  });

  it('a codex session start cannot claim an authentication it does not know yet', () => {
    recordAgentSessionStarted(CODEX_REF, { isAuthenticated: null });
    const [started] = peekQueueForTesting().filter((e) => e.event === 'agent_session_started');
    expect(started?.properties).toMatchObject({ harness: 'codex', is_authenticated: null });
  });

  it('a codex session emits no cost event, because the protocol reports no cost', () => {
    driveCodexTurn();
    recordAgentSessionEnded(CODEX_REF, { reason: 'completed', durationMs: 90, turnCount: 1 });
    expect(peekQueueForTesting().filter((e) => e.event === 'agent_cost_recorded')).toEqual([]);
  });

  it('an error names its session and its backend', () => {
    recordAgentError(CODEX_REF, { code: 'prompt_too_long', apiErrorStatus: 400 });
    const [error] = peekQueueForTesting().filter((e) => e.event === 'agent_error');
    expect(error?.properties).toMatchObject({
      harness: 'codex',
      agent_session_id: SESSION_ID,
      code: 'prompt_too_long',
      api_error_status: 400,
    });
    expect(error?.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
  });

  it('carries none of the turn’s text, paths or commands', () => {
    driveCodexTurn();
    const first = JSON.stringify(turnProps());
    resetTelemetryForTesting();
    initTelemetry();
    driveCodexTurn({ tool: 'commandExecution' });
    const serialized = first + JSON.stringify(turnProps());
    expect(serialized).not.toContain(PROMPT_TEXT);
    expect(serialized).not.toContain('cobalt');
    expect(serialized).not.toContain('Hero.tsx');
    expect(serialized).not.toContain('sed -i');
    expect(serialized).not.toContain('/tmp/studio-ws');
  });

  it('records each withheld setup approval under its own Harness, carrying no path', () => {
    const cwd = makeRoot('withheld-workspace');

    recordSetupApprovalWithheld({ cwd, tool: 'save_project_setup', harness: 'claude' });
    recordSetupApprovalWithheld({ cwd, tool: 'run_project_setup', harness: 'appserver' });

    const withheld = peekQueueForTesting().filter((e) => e.event === 'project_setup_approval_withheld');
    expect(withheld.map((e) => [e.properties['tool'], e.properties['harness']])).toEqual([
      ['save_project_setup', 'claude'],
      ['run_project_setup', 'codex'],
    ]);
    expect(JSON.stringify(withheld)).not.toContain(cwd);
  });
});
