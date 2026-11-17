import { describe, expect, it, spyOn } from 'bun:test';
import { claudeConnectors, codexConnectors, ConnectorMonitor, featuredConnector } from './connectors.js';
import type { AgentConnector, ConnectorInventory } from '@studio/events';

describe('connector inventory', () => {
  it('retries failed reads on its scheduled timer and cancels the next read on close', async () => {
    const callbacks: (() => void)[] = [];
    const timer = { unref: () => undefined } as unknown as ReturnType<typeof setTimeout>;
    const schedule = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => { callbacks.push(callback); return timer; }) as typeof setTimeout);
    const cancel = spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    let reads = 0;
    const published: ConnectorInventory[] = [];
    const monitor = new ConnectorMonitor(async () => { reads += 1; if (reads === 1) throw new Error('offline'); return []; }, (inventory) => published.push(inventory));
    try {
      await monitor.refresh();
      expect(published).toEqual([{ servers: [], unavailable: true }]);
      const retry = callbacks.shift();
      expect(retry).toBeDefined();
      retry!();
      expect(reads).toBe(2);
      await monitor.refresh();
      expect(reads).toBe(2);
      expect(published.at(-1)).toEqual({ servers: [] });
      monitor.close();
      expect(cancel).toHaveBeenLastCalledWith(timer);
      callbacks.shift()?.();
      await monitor.refresh();
      expect(reads).toBe(2);
    } finally {
      monitor.close();
      schedule.mockRestore();
      cancel.mockRestore();
    }
  });
  it('maps all Claude states and excludes the SDK host, not user server names', () => {
    expect(claudeConnectors([
      { name: 'studio', source: 'sdk', status: 'connected' },
      { name: 'studio', source: 'user', status: 'connected' },
      { name: 'design', status: 'pending', config: { url: 'http://localhost:3845/mcp' } },
      { name: 'reference', status: 'needs-auth', config: { url: 'https://api.mobbin.com/mcp' } },
      { name: 'broken', status: 'failed', error: 'Connection refused\ninternal trace' },
      { name: 'paused', status: 'disabled' },
    ])).toEqual([
      { id: 'studio', name: 'studio', state: 'connected' },
      { id: 'design', name: 'design', state: 'starting', featured: 'figma' },
      { id: 'reference', name: 'reference', state: 'needs-sign-in', featured: 'mobbin' },
      { id: 'broken', name: 'broken', state: 'failed', error: 'Connection refused' },
      { id: 'paused', name: 'paused', state: 'off' },
    ]);
  });

  it('reads sign-in before startup errors and never returns Codex errors', () => {
    const result = codexConnectors([
      { name: 'design', authStatus: 'notLoggedIn', runtimeStatus: 'failed', toolsError: 'secret error', httpOrigin: 'https://mcp.figma.com' },
      { name: 'empty-tools', authStatus: 'unsupported', runtimeStatus: 'connected' },
      { name: 'boot', authStatus: 'unknown', runtimeStatus: 'starting' },
      { name: 'off', authStatus: 'notLoggedIn', runtimeStatus: 'disabled' },
      { name: 'broken', authStatus: 'oAuth', toolsError: 'private stack trace' },
      { name: 'pencil', authStatus: 'unknown', pluginId: 'openai-bundled' },
      { name: 'codex_apps', authStatus: 'unknown' },
      { name: 'codex_app', authStatus: 'unknown' },
      { name: 'cua_repl', authStatus: 'unknown' },
      { name: 'node_repl', authStatus: 'unknown' },
      { name: 'computer-use', authStatus: 'unsupported' },
    ]);
    expect(result.map((server) => server.state)).toEqual(['needs-sign-in', 'connected', 'starting', 'off', 'failed', 'starting']);
    expect(result[0]?.featured).toBe('figma');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('private');
    expect(result.some((server) => ['pencil', 'codex_apps', 'codex_app', 'cua_repl', 'node_repl'].includes(server.name))).toBe(false);
  });

  it('does not claim an unavailable or changed Codex runtime is connected', () => {
    expect(codexConnectors([
      { name: 'changed', authStatus: 'oAuth', runtimeStatus: null },
      { name: 'unknown', authStatus: 'unsupported' },
      { name: 'future', authStatus: 'bearerToken', runtimeStatus: 'new-state' },
    ]).map((server) => server.state)).toEqual(['starting', 'starting', 'starting']);
  });

  it('recognizes remote, desktop and claude.ai aliases without trusting lookalike hosts', () => {
    expect(featuredConnector('https://mcp.figma.com/mcp', 'renamed')).toBe('figma');
    expect(featuredConnector('http://127.0.0.1:3845/sse', 'desktop')).toBe('figma');
    expect(featuredConnector(undefined, 'claude.ai Figma')).toBe('figma');
    expect(featuredConnector('https://mcp.figma.com.attacker.test/mcp', 'renamed')).toBeUndefined();
    expect(featuredConnector('http://localhost:9999/mcp', 'other')).toBeUndefined();
  });

  it('coalesces concurrent reads, emits changes only, and never publishes after close', async () => {
    let reads = 0;
    let release: ((servers: AgentConnector[]) => void) | undefined;
    const published: ConnectorInventory[] = [];
    const monitor = new ConnectorMonitor(() => { reads += 1; return new Promise((resolve) => { release = resolve; }); }, (inventory) => published.push(inventory));
    const first = monitor.refresh();
    expect(monitor.refresh()).toBe(first);
    expect(reads).toBe(1);
    release?.([]);
    await first;
    expect(published).toEqual([{ servers: [] }]);
    const unchanged = monitor.refresh();
    release?.([]);
    await unchanged;
    expect(published).toHaveLength(1);
    const pending = monitor.refresh();
    monitor.close();
    release?.([{ id: 'late', name: 'late', state: 'connected' }]);
    await pending;
    await monitor.refresh();
    expect(reads).toBe(3);
    expect(published).toHaveLength(1);
  });

  it('revalidation reads again rather than riding a poll that began before it', async () => {
    let reads = 0;
    const releases: ((servers: AgentConnector[]) => void)[] = [];
    const published: ConnectorInventory[] = [];
    const monitor = new ConnectorMonitor(() => { reads += 1; return new Promise((resolve) => { releases.push(resolve); }); }, (inventory) => published.push(inventory));
    const poll = monitor.refresh();
    expect(reads).toBe(1);
    const revalidated = monitor.revalidate();
    releases[0]!([]);
    await poll;
    expect(published).toEqual([{ servers: [] }]);
    expect(reads).toBe(2);
    releases[1]!([{ id: 'claude.ai Mobbin', name: 'claude.ai Mobbin', state: 'connected' }]);
    await revalidated;
    expect(published.at(-1)?.servers.map((server) => server.id)).toEqual(['claude.ai Mobbin']);
    monitor.close();
    await monitor.revalidate();
    expect(reads).toBe(2);
  });

  it('distinguishes an unreadable inventory from no configured servers and recovers', async () => {
    let fail = true;
    const published: ConnectorInventory[] = [];
    const monitor = new ConnectorMonitor(async () => { if (fail) throw new Error('provider detail'); return []; }, (inventory) => published.push(inventory));
    await monitor.refresh();
    fail = false;
    await monitor.refresh();
    monitor.close();
    expect(published).toEqual([{ servers: [], unavailable: true }, { servers: [] }]);
  });
});
