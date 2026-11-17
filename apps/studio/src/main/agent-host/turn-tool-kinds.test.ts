import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPSERVER_PRESENTATION } from './appserver/presentation.js';
import { createAppServerTurnState, handleAppServerFrame } from './appserver/translate.js';
import { EventLog, type TurnSummary } from './event-log.js';
import { handleSdkMessage } from './reduce.js';
import { STUDIO_MCP_SERVER } from './tool-names.js';
import {
  BUILT_IN_KINDS,
  CODEX_EXTERNAL_MCP_ITEM,
  CODEX_NON_TOOL_ITEMS,
  CODEX_ROW_ITEMS,
  CODEX_UNROWED_ITEM_KINDS,
  turnToolKind,
  type UnfinishedByKind,
} from './turn-tool-kinds.js';

const CWD = '/tmp/studio-workspace';

function nonZero(byKind: UnfinishedByKind | undefined): Record<string, Record<string, number>> {
  return Object.fromEntries(Object.entries(byKind ?? {}).map(([outcome, kinds]) => [outcome, Object.fromEntries(Object.entries(kinds).filter(([, count]) => count > 0))]));
}
const CLAUDE_RECORDINGS = fileURLToPath(new URL('../../../../../tests/live/recordings/claude/', import.meta.url));
const CODEX_PROTOCOL = fileURLToPath(new URL('./appserver/protocol/', import.meta.url));

function recordedClaudeTools(): string[] {
  const tools = new Set<string>();
  for (const file of readdirSync(CLAUDE_RECORDINGS).filter((name) => name.endsWith('.jsonl'))) {
    for (const line of readFileSync(`${CLAUDE_RECORDINGS}${file}`, 'utf8').split('\n')) {
      if (!line.includes('"subtype":"init"')) continue;
      const message = JSON.parse(line) as { type?: string; subtype?: string; tools?: string[] };
      if (message.type === 'system' && message.subtype === 'init') for (const tool of message.tools ?? []) tools.add(tool);
    }
  }
  return [...tools];
}

function pinnedCodexItemTypes(): string[] {
  const [file] = readdirSync(CODEX_PROTOCOL).filter((name) => name.endsWith('.protocol.json'));
  const protocol = JSON.parse(readFileSync(`${CODEX_PROTOCOL}${file!}`, 'utf8')) as {
    definitions: { ThreadItem: { oneOf: Array<{ properties: { type: { enum: string[] } } }> } };
  };
  return protocol.definitions.ThreadItem.oneOf.flatMap((variant) => variant.properties.type.enum);
}

describe('which kind a tool call counts as', () => {
  it('names every built-in tool the pinned Claude CLI offers, as its recorded init lists them', () => {
    const builtIns = recordedClaudeTools().filter((name) => !name.startsWith('mcp__'));
    expect(builtIns.length).toBeGreaterThan(0);
    expect(builtIns.filter((name) => BUILT_IN_KINDS[name] === undefined)).toEqual([]);
  });

  it('places every item type the pinned codex protocol declares, as a row, an unrowed call, external MCP or not a call', () => {
    const types = pinnedCodexItemTypes();
    expect(types.length).toBeGreaterThan(0);
    const placed = (type: string): boolean =>
      CODEX_ROW_ITEMS.has(type) || CODEX_NON_TOOL_ITEMS.has(type) || type === CODEX_EXTERNAL_MCP_ITEM || CODEX_UNROWED_ITEM_KINDS[type] !== undefined;
    expect(types.filter((type) => !placed(type))).toEqual([]);
  });

  it('classifies the rows codex presents under the names Claude uses', () => {
    expect(['Bash', 'Edit', 'Write', 'Delete', 'AskUserQuestion'].map((name) => BUILT_IN_KINDS[name])).toEqual(['shell', 'file_edit', 'file_edit', 'file_delete', 'question']);
  });

  it('classifies canvas tools by name, not by the verb that makes create_frame look like a file edit', () => {
    expect(turnToolKind(`mcp__${STUDIO_MCP_SERVER}__create_frame`)).toBe('canvas_edit');
    expect(turnToolKind(`mcp__${STUDIO_MCP_SERVER}__set_frame_url`)).toBe('canvas_navigate');
    expect(turnToolKind(`mcp__${STUDIO_MCP_SERVER}__evaluate_in_frame`)).toBe('frame_check');
    expect(turnToolKind(`mcp__${STUDIO_MCP_SERVER}__not_a_tool_yet`)).toBe('other');
  });

  it('leaves an external MCP tool out of the per-kind counts', () => {
    expect(turnToolKind('mcp__figma__create_node')).toBeUndefined();
  });
});

describe('the per-kind tally a turn reports', () => {
  it('counts Claude calls by kind and outcome, external MCP in the outcomes only', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {} });
    log.beginTurn();
    log.ensureToolStart('read', 'Read', { file_path: `${CWD}/a.ts` }, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('bash', 'Bash', { command: 'sed -i s/a/b/ index.html' }, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('task', 'Task', { description: 'look' }, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('todo', 'TaskCreate', {}, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('frame', `mcp__${STUDIO_MCP_SERVER}__create_frame`, {}, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('external', 'mcp__figma__get_node', {}, 'in_progress', { source: 'assistant' });
    log.ensureToolStart('edit', 'Edit', { file_path: `${CWD}/a.ts` }, 'in_progress', { source: 'assistant' });
    log.endTool('bash', 'failed');
    log.endTool('edit', 'denied');
    log.endTool('external', 'failed');
    log.endTool('read', 'completed');
    log.endTool('task', 'completed');
    log.endTool('todo', 'completed');
    log.endTool('frame', 'completed');
    const tally = log.turnTally();
    expect(tally?.toolKinds).toMatchObject({ read: 1, shell: 1, subagent: 1, plan: 1, canvas_edit: 1, file_edit: 1, other: 0 });
    expect(tally).toMatchObject({ mcpToolCallCount: 1, failedToolCount: 2, deniedToolCount: 1, canceledToolCount: 0 });
    expect(nonZero(tally?.unfinishedByKind)).toEqual({ failed: { shell: 1, external_mcp: 1 }, denied: { file_edit: 1 }, canceled: {} });
  });

  it('keeps the kind of a codex call it never shows as a row when that call fails or is declined', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    log.beginTurn();
    const search = { type: 'webSearch', id: 'ws', query: 'x' };
    const view = { type: 'imageView', id: 'iv', path: 'x.png' };
    for (const item of [search, view]) handleAppServerFrame(log, { method: 'item/started', params: { item } }, state);
    handleAppServerFrame(log, { method: 'item/completed', params: { item: { ...search, status: 'failed' } } }, state);
    handleAppServerFrame(log, { method: 'item/completed', params: { item: { ...view, status: 'declined' } } }, state);
    expect(nonZero(log.turnTally()?.unfinishedByKind)).toEqual({ failed: { fetch: 1 }, denied: { read: 1 }, canceled: {} });
  });

  it('counts an approval-only row in no outcome', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    log.beginTurn();
    log.ensureToolStart('approval', 'mcpToolCall', {}, 'in_progress', { source: 'permission', approvalOnly: true });
    log.endTool('approval', 'denied');
    expect(log.turnTally()).toMatchObject({ deniedToolCount: 0, unfinishedByKind: { denied: { other: 0, external_mcp: 0 } } });
  });

  it('counts a sub-agent call whichever announcer reaches the log first', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {} });
    log.beginTurn();
    log.ensureToolStart('by-hook', 'Grep', {}, 'in_progress', { source: 'hook', agentId: 'agent-1' });
    log.ensureToolStart('by-permission', 'Bash', {}, 'pending', { source: 'permission' });
    log.ensureToolStart('by-permission', 'Bash', {}, 'in_progress', { source: 'assistant', parentToolUseId: 'task' });
    log.ensureToolStart('main-thread', 'Read', {}, 'in_progress', { source: 'hook' });
    log.ensureToolStart('main-thread', 'Read', {}, 'in_progress', { source: 'assistant' });
    expect(log.turnTally()?.inSubagentToolCount).toBe(2);
  });

  it('moves a codex call to its kind once codex names it, and counts the calls it never shows as a row', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    log.beginTurn();
    log.ensureToolStart('call', 'dynamicToolCall', {}, 'pending', { source: 'stream', provisional: true });
    log.ensureToolStart('call', 'capture_frame', {}, 'in_progress', { source: 'hook' });
    log.ensureToolStart('cmd', 'commandExecution', { command: 'ls' }, 'in_progress', { source: 'stream' });
    log.ensureToolStart('change', 'fileChange', { changes: [{ path: `${CWD}/x`, kind: { type: 'delete' } }] }, 'in_progress', { source: 'stream' });
    const state = createAppServerTurnState();
    handleAppServerFrame(log, { method: 'turn/plan/updated', params: {} }, state);
    for (const item of [{ type: 'webSearch', id: 'ws', query: 'x' }, { type: 'imageView', id: 'iv', path: 'x.png' }, { type: 'collabAgentToolCall', id: 'sub', status: 'inProgress' }, { type: 'contextCompaction', id: 'cc' }]) {
      handleAppServerFrame(log, { method: 'item/started', params: { item } }, state);
    }
    expect(log.turnTally()?.toolKinds).toMatchObject({ frame_check: 1, other: 0, shell: 1, file_delete: 1, plan: 1, fetch: 1, read: 1, subagent: 1 });
  });

  it('counts a command the user declined on codex as denied, matching its row', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    log.beginTurn();
    const item = { type: 'commandExecution', id: 'cmd', command: 'rm -rf dist', status: 'declined' };
    handleAppServerFrame(log, { method: 'item/started', params: { item: { ...item, status: 'inProgress' } } }, state);
    handleAppServerFrame(log, { method: 'item/completed', params: { item } }, state);
    expect(log.events.filter((event) => event.type === 'tool.end').map((event) => event.status)).toEqual(['denied']);
    expect(log.turnTally()).toMatchObject({ deniedToolCount: 1, failedToolCount: 0 });
  });

  it('starts each turn from zero', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {} });
    log.beginTurn();
    log.ensureToolStart('bash', 'Bash', {}, 'in_progress', { source: 'assistant' });
    log.endTool('bash', 'failed');
    log.turnTally();
    log.beginTurn();
    expect(log.turnTally()).toMatchObject({ toolKinds: { shell: 0 }, failedToolCount: 0 });
  });
});

describe('the same Stop on both harnesses', () => {
  function stopMidCall(harness: 'claude' | 'codex'): TurnSummary {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, ...(harness === 'codex' ? { presentation: APPSERVER_PRESENTATION } : {}) });
    let summary: TurnSummary | undefined;
    const onTurnEnded = (ended: TurnSummary): void => { summary = ended; };
    log.beginTurn();
    if (harness === 'claude') {
      handleSdkMessage(log, { type: 'system', subtype: 'init', mcp_servers: [{ name: 'figma', status: 'connected' }] });
      handleSdkMessage(log, { type: 'assistant', message: { content: [
        { type: 'tool_use', id: 'cmd', name: 'Bash', input: { command: 'sleep 60' } },
        { type: 'tool_use', id: 'mcp', name: 'mcp__figma__get_node', input: {} },
      ] } });
      handleSdkMessage(log, { type: 'result', subtype: 'error_during_execution', is_error: true, terminal_reason: 'aborted_tools' }, { onTurnEnded });
    } else {
      const state = createAppServerTurnState();
      handleAppServerFrame(log, { method: 'item/started', params: { item: { type: 'commandExecution', id: 'cmd', command: 'sleep 60', status: 'inProgress' } } }, state);
      handleAppServerFrame(log, { method: 'item/started', params: { item: { type: 'mcpToolCall', id: 'mcp', server: 'figma', tool: 'get_node', status: 'inProgress' } } }, state);
      handleAppServerFrame(log, { method: 'turn/completed', params: { turn: { status: 'interrupted' } } }, state, { onTurnEnded });
    }
    return summary!;
  }

  it('reports the open calls as canceled on Claude and codex alike', () => {
    const claude = stopMidCall('claude');
    const codex = stopMidCall('codex');
    expect(claude.stopReason).toBe('interrupted');
    for (const summary of [claude, codex]) {
      expect(summary).toMatchObject({ canceledToolCount: 2, failedToolCount: 0, mcpToolCallCount: 1, toolKinds: { shell: 1 } });
      expect(nonZero(summary.unfinishedByKind)).toEqual({ failed: {}, denied: {}, canceled: { shell: 1, external_mcp: 1 } });
    }
  });

  it('reports the calls a session close kills as canceled on codex as on Claude', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    log.beginTurn();
    handleAppServerFrame(log, { method: 'item/started', params: { item: { type: 'commandExecution', id: 'cmd', command: 'sleep 60', status: 'inProgress' } } }, state);
    expect(log.turnTally()).toMatchObject({ canceledToolCount: 1 });
  });
});
