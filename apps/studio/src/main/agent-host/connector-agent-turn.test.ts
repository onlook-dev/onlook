import { describe, expect, it } from 'bun:test';
import { foldSessionState, type ConnectorInventory } from '@studio/events';
import { EventLog } from './event-log.js';
import { ConnectorSignIn } from './connector-sign-in.js';
import { handleSdkMessage } from './reduce.js';
import { APPSERVER_PRESENTATION } from './appserver/presentation.js';
import { createAppServerTurnState, handleAppServerFrame } from './appserver/translate.js';

describe('connector tools in a Project turn', () => {
  it('distinguishes replayed connector calls from new use without changing restored events', () => {
    const original = new EventLog({ sessionId: 'original', cwd: '/project', emit: () => {} });
    original.beginTurn();
    original.ensureToolStart('read', 'mcp__figma__get_design_context', {}, 'in_progress', { source: 'assistant' });
    original.endTool('read', 'completed');
    const observed: boolean[] = [];
    const restored = new EventLog({ sessionId: 'restored', cwd: '/project', emit: (event) => { if (event.type === 'tool.start') observed.push(restored.isRestoringTranscript); } });
    restored.restore(original.events);
    restored.ensureToolStart('new', 'mcp__mobbin__search_screens', {}, 'in_progress', { source: 'assistant' });
    expect(observed).toEqual([true, false]);
    expect(restored.isRestoringTranscript).toBe(false);
  });

  it.each(['claude', 'codex'] as const)('%s names Figma read/write and Mobbin calls, then explains an expired sign-in', (harness) => {
    const inventories: ConnectorInventory[] = [];
    const coordinator = new ConnectorSignIn({ prepare: async () => ({ name: 'unused', connected: false }), authenticate: async () => {} }, (inventory) => inventories.push(inventory));
    coordinator.update({ servers: [
      { id: 'figma', name: 'figma', featured: 'figma', state: 'connected' },
      { id: 'mobbin', name: 'mobbin', featured: 'mobbin', state: 'connected' },
    ] });
    const log = new EventLog({
      sessionId: 'connector-turn', cwd: '/project', emit: () => {},
      ...(harness === 'codex' ? { presentation: APPSERVER_PRESENTATION } : {}),
      onToolFailed: (name, result) => {
        const connector = coordinator.toolFailed(name, result);
        return connector ? `${connector} needs sign-in. Open the connectors menu to sign in.` : undefined;
      },
    });
    log.beginTurn();
    const state = createAppServerTurnState();
    const calls = [
      { id: 'read', server: 'figma', tool: 'get_design_context', result: 'Frame design context' },
      { id: 'write', server: 'figma', tool: 'generate_figma_design', result: 'Design sent to Figma' },
      { id: 'search', server: 'mobbin', tool: 'search_screens', result: 'Onboarding references' },
      { id: 'expired', server: 'figma', tool: 'get_design_context', result: '401 Unauthorized', failed: true },
    ];
    for (const call of calls) {
      if (harness === 'claude') {
        handleSdkMessage(log, { type: 'assistant', message: { content: [{ type: 'tool_use', id: call.id, name: `mcp__${call.server}__${call.tool}`, input: {} }] } });
        handleSdkMessage(log, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: call.id, content: call.result, is_error: call.failed ?? false }] } });
      } else {
        const item = { id: call.id, type: 'mcpToolCall', server: call.server, tool: call.tool, arguments: {} };
        handleAppServerFrame(log, { method: 'item/started', params: { item } }, state, { connectors: true });
        handleAppServerFrame(log, { method: 'item/completed', params: { item: { ...item, status: call.failed ? 'failed' : 'completed', result: { content: [{ type: 'text', text: call.result }] } } } }, state, { connectors: true });
      }
    }
    const rows = log.events.filter((event) => event.type === 'tool.start');
    expect(rows.map((event) => event.title)).toEqual(['figma', 'figma', 'mobbin', 'figma']);
    const endings = log.events.filter((event) => event.type === 'tool.end');
    expect(endings.map((event) => event.status)).toEqual(['completed', 'completed', 'completed', 'failed']);
    expect(endings.at(-1)?.result).toBe('Figma needs sign-in. Open the connectors menu to sign in.');
    expect(inventories.at(-1)?.servers.find((server) => server.featured === 'figma')?.state).toBe('needs-sign-in');
    expect(log.events.some((event) => event.type === 'tool.update' && event.title?.startsWith('Figma needs sign-in'))).toBe(true);
    expect(log.events.some((event) => event.type === 'tool.update' && event.target === 'Figma needs sign-in. Open the connectors menu to sign in.')).toBe(true);
    const beforeLateUpdate = log.events.length;
    log.ensureToolStart('expired', harness === 'codex' ? 'mcpToolCall' : 'mcp__figma__get_design_context', { server: 'figma', tool: 'get_design_context' }, 'in_progress', { source: 'assistant' });
    expect(log.events).toHaveLength(beforeLateUpdate);
    expect(foldSessionState(log.events).items.length).toBeGreaterThan(0);
    expect(log.turnTally()?.mcpToolCallCount).toBe(4);
    coordinator.close();
  });
});
