import { describe, expect, it, jest } from 'bun:test';
import { settle } from '@studio/fixtures';
import type { Query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConnector } from '@studio/events';
import { claudeConnectorSignIn } from './claude-connector-sign-in.js';
import { CONNECTOR_ENDPOINTS } from './connector-sign-in.js';

describe('Claude connector external management', () => {
  it('opens Connectors rather than the Claude home page for account-managed sign-in', async () => {
    const opened: string[] = [];
    const adapter = claudeConnectorSignIn({ reloadPlugins: async () => {}, mcpServerStatus: async () => [{ name: 'claude.ai Mobbin', status: 'connected' }] } as unknown as Query, '/workspace', {
      openExternal: async (url) => { opened.push(url); },
      returnedToForeground: async () => {},
    });
    await adapter.manageExternally!('claude.ai Mobbin', new AbortController().signal, () => {});
    expect(opened).toEqual(['https://claude.ai/customize/connectors']);
  });

  it('arms the return before the browser opens, so the blur that raises it is never missed', async () => {
    const order: string[] = [];
    const adapter = claudeConnectorSignIn({ reloadPlugins: async () => {}, mcpServerStatus: async () => [{ name: 'claude.ai Mobbin', status: 'connected' }] } as unknown as Query, '/workspace', {
      openExternal: async () => { order.push('open'); },
      returnedToForeground: async () => { order.push('armed'); },
    });
    await adapter.manageExternally!('claude.ai Mobbin', new AbortController().signal, () => {});
    expect(order).toEqual(['armed', 'open']);
  });

  it('keeps waiting when the person comes back without having connected it', async () => {
    const calls: string[] = [];
    const returns = [Promise.withResolvers<void>(), Promise.withResolvers<void>()];
    let taken = 0;
    let connected = false;
    const adapter = claudeConnectorSignIn({
      reloadPlugins: async () => { calls.push('reload'); },
      mcpServerStatus: async () => [{ name: 'claude.ai Mobbin', status: connected ? 'connected' : 'needs-auth' }],
    } as unknown as Query, '/workspace', {
      openExternal: async () => { calls.push('open'); },
      returnedToForeground: async () => { await returns[taken++]!.promise; },
      refreshInventory: async () => { calls.push('refresh'); },
    });
    const pending = adapter.manageExternally!('claude.ai Mobbin', new AbortController().signal, () => {});
    returns[0]!.resolve();
    await settle();
    expect(calls).toEqual(['open', 'reload', 'refresh']);
    expect(taken).toBe(2);
    connected = true;
    returns[1]!.resolve();
    await pending;
    expect(calls).toEqual(['open', 'reload', 'refresh', 'reload', 'refresh']);
  });

  it('re-reads account connectors only once the person comes back to Onlook', async () => {
    const calls: string[] = [];
    const returned = Promise.withResolvers<void>();
    let browsers = 0;
    const adapter = claudeConnectorSignIn({ reloadPlugins: async () => { calls.push('reload'); }, mcpServerStatus: async () => [{ name: 'claude.ai Mobbin', status: 'connected' }] } as unknown as Query, '/workspace', {
      openExternal: async () => { calls.push('open'); },
      returnedToForeground: async () => { await returned.promise; },
      refreshInventory: async () => { calls.push('refresh'); },
    });
    const pending = adapter.manageExternally!('claude.ai Mobbin', new AbortController().signal, () => { browsers += 1; });
    await settle();
    expect(calls).toEqual(['open']);
    expect(browsers).toBe(1);
    returned.resolve();
    await pending;
    expect(calls).toEqual(['open', 'reload', 'refresh']);
  });

  it('an abandoned hand-off neither reloads plugins nor refreshes the inventory', async () => {
    const calls: string[] = [];
    const abort = new AbortController();
    const adapter = claudeConnectorSignIn({ reloadPlugins: async () => { calls.push('reload'); } } as unknown as Query, '/workspace', {
      openExternal: async () => { calls.push('open'); },
      returnedToForeground: (signal) => new Promise<void>((_resolve, reject) => {
        if (signal.aborted) { reject(signal.reason); return; }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
      refreshInventory: async () => { calls.push('refresh'); },
    });
    const rejected = adapter.manageExternally!('claude.ai Mobbin', abort.signal, () => {}).catch((error: unknown) => error);
    await settle();
    const reason = new Error('hand-off abandoned');
    abort.abort(reason);
    expect(await rejected).toBe(reason);
    expect(calls).toEqual(['open']);
  });
});

function interceptRetryPauses() {
  const scheduled: { callback: () => void; timer: ReturnType<typeof setTimeout> }[] = [];
  const nativeTimeout = globalThis.setTimeout;
  const schedule = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    if (delay !== 500) return nativeTimeout(callback, delay, ...args);
    const timer = nativeTimeout(() => undefined, 60_000);
    timer.unref();
    scheduled.push({ callback: () => callback(...args), timer });
    return timer;
  }) as typeof setTimeout);
  return {
    async next(): Promise<() => void> {
      for (let attempt = 0; attempt < 50 && scheduled.length === 0; attempt += 1) {
        await new Promise<void>((resolve) => nativeTimeout(resolve, 0));
      }
      const pause = scheduled.shift();
      if (pause === undefined) throw new Error('Connector retry did not schedule its next pause');
      clearTimeout(pause.timer);
      return pause.callback;
    },
    restore(): void {
      schedule.mockRestore();
      for (const pause of scheduled) clearTimeout(pause.timer);
    },
  };
}

describe('Claude connector retry readiness', () => {
  it.each([
    { status: 'connected', state: 'connected' },
    { status: 'failed', state: 'failed' },
    { status: 'needs-auth', state: 'needs-sign-in' },
  ] as const)('waits through missing and pending inventory before returning %j without OAuth', async ({ status, state }) => {
    const pauses = interceptRetryPauses();
    const abort = new AbortController();
    try {
      const reconnected: string[] = [];
      let reads = 0;
      let authenticated = 0;
      let settled: AgentConnector | undefined;
      const query = {
        reconnectMcpServer: async (name: string) => { reconnected.push(name); },
        mcpServerStatus: async () => {
          reads += 1;
          if (reads === 1) return [];
          return [{ name: 'private-local', status: reads === 2 ? 'pending' : status }];
        },
        mcpAuthenticate: async () => { authenticated += 1; return { requiresUserAction: false }; },
      } as unknown as Query;
      const adapter = claudeConnectorSignIn(query, '/workspace');
      const pending = adapter.retry!('private-local', abort.signal).then((server) => { settled = server; return server; });
      void pending.catch(() => undefined);
      const missing = await pauses.next();
      expect(reads).toBe(1);
      expect(settled).toBeUndefined();
      missing();
      const starting = await pauses.next();
      expect(reads).toBe(2);
      expect(settled).toBeUndefined();
      starting();
      expect(await pending).toEqual({ id: 'private-local', name: 'private-local', state });
      expect(reads).toBe(3);
      expect(reconnected).toEqual(['private-local']);
      expect(authenticated).toBe(0);
    } finally {
      pauses.restore();
      abort.abort();
    }
  });

  it.each(['missing', 'pending'] as const)('rejects an abort while %s and stops polling without OAuth', async (status) => {
    const pauses = interceptRetryPauses();
    const abort = new AbortController();
    try {
      const calls: string[] = [];
      const query = {
        reconnectMcpServer: async () => { calls.push('reconnect'); },
        mcpServerStatus: async () => { calls.push('inventory'); return status === 'missing' ? [] : [{ name: 'private-local', status }]; },
        mcpAuthenticate: async () => { calls.push('authenticate'); return { requiresUserAction: false }; },
      } as unknown as Query;
      const pending = claudeConnectorSignIn(query, '/workspace').retry!('private-local', abort.signal);
      const rejected = pending.catch((error: unknown) => error);
      const wake = await pauses.next();
      expect(calls).toEqual(['reconnect', 'inventory']);
      const reason = new Error('retry canceled');
      abort.abort(reason);
      expect(await rejected).toBe(reason);
      wake();
      await settle();
      expect(calls).toEqual(['reconnect', 'inventory']);
    } finally {
      pauses.restore();
      abort.abort();
    }
  });

  it('propagates a reconnect rejection without reading inventory or authenticating', async () => {
    const calls: string[] = [];
    const failure = new Error('reconnect refused');
    const query = {
      reconnectMcpServer: async () => { calls.push('reconnect'); throw failure; },
      mcpServerStatus: async () => { calls.push('inventory'); return []; },
      mcpAuthenticate: async () => { calls.push('authenticate'); return { requiresUserAction: false }; },
    } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace');
    await expect(adapter.retry!('private-local', new AbortController().signal)).rejects.toBe(failure);
    const abort = new AbortController();
    abort.abort(failure);
    await expect(adapter.retry!('private-local', abort.signal)).rejects.toBe(failure);
    expect(calls).toEqual(['reconnect']);
  });
});

describe('Claude connector sign-in', () => {
  it('reconnects any configured server and reports a persistent failure without OAuth', async () => {
    const reconnected: string[] = [];
    const query = {
      reconnectMcpServer: async (name: string) => { reconnected.push(name); },
      mcpServerStatus: async () => [{ name: 'private-local', status: 'failed', error: 'Connection closed' }],
    } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace');
    expect(await adapter.retry!('private-local', new AbortController().signal)).toEqual({ id: 'private-local', name: 'private-local', state: 'failed', error: 'Connection closed' });
    expect(reconnected).toEqual(['private-local']);
  });

  it.each(['figma', 'mobbin'] as const)('%s installs in user scope and reloads before sign-in and the next turn', async (provider) => {
    const calls: string[] = [];
    const browser: string[] = [];
    let installed = false;
    let connected = false;
    const query = {
      mcpServerStatus: async () => installed ? [{ name: provider, status: connected ? 'connected' : 'needs-auth', config: { url: CONNECTOR_ENDPOINTS[provider] } }] : [],
      reloadPlugins: async () => { calls.push('reload'); },
      mcpAuthenticate: async (name: string) => { expect(name).toBe(provider); calls.push('authenticate'); return { authUrl: 'https://provider.test/oauth', requiresUserAction: true }; },
    } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace', {
      environment: async () => ({ CLAUDE_CONFIG_DIR: '/scratch/claude' }),
      readFile: async (path) => { expect(path).toBe('/scratch/claude/.claude.json'); return JSON.stringify({ mcpServers: { private: { command: 'unchanged' } }, other: 42 }); },
      binary: () => '/bundled/claude',
      execute: async (binary, args, options) => {
        expect(binary).toBe('/bundled/claude');
        expect(args).toEqual(['mcp', 'add', '--transport', 'http', '--scope', 'user', provider, CONNECTOR_ENDPOINTS[provider]]);
        expect(options).toMatchObject({ cwd: '/workspace', env: { CLAUDE_CONFIG_DIR: '/scratch/claude' }, timeout: 15_000 });
        installed = true; calls.push('persist');
        return { stdout: '', stderr: '' };
      },
      openExternal: async (url) => { browser.push(url); connected = true; },
    });
    const signal = new AbortController().signal;
    expect(await adapter.prepare(provider, signal)).toEqual({ name: provider, connected: false });
    await adapter.authenticate(provider, signal, () => {});
    expect(calls).toEqual(['persist', 'reload', 'authenticate', 'reload']);
    expect(browser).toEqual(['https://provider.test/oauth']);
  });

  it.each(['figma', 'mobbin'] as const)('%s reuses a user alias even before the running query discovers it', async (provider) => {
    let visible = false;
    let writes = 0;
    const query = {
      reloadPlugins: async () => { visible = true; },
      mcpServerStatus: async () => visible ? [{ name: 'design', status: 'connected', config: { url: CONNECTOR_ENDPOINTS[provider] } }] : [],
    } as unknown as Query;
    const stored = JSON.stringify({ mcpServers: { design: { url: CONNECTOR_ENDPOINTS[provider] }, figma: { command: 'do-not-change' } } });
    const adapter = claudeConnectorSignIn(query, '/workspace', {
      environment: async () => ({}),
      readFile: async () => stored,
      execute: async () => { writes++; return { stdout: '', stderr: '' }; },
    });
    expect(await adapter.prepare(provider, new AbortController().signal)).toEqual({ name: 'design', connected: true });
    expect(writes).toBe(0);
  });

  it('a missing or failing SDK authentication call is reported as our integration error without provider details', async () => {
    for (const query of [{}, { mcpAuthenticate: async () => { throw new Error('secret OAuth URL'); } }, { mcpAuthenticate: async () => ({ unexpected: 'shape' }) }]) {
      let captured = 0;
      const adapter = claudeConnectorSignIn(query as Query, '/workspace', { authenticationFailed: () => { captured++; } });
      await expect(adapter.authenticate('figma', new AbortController().signal, () => {})).rejects.toThrow('Claude connector authentication failed');
      expect(captured).toBe(1);
    }
  });

  it('does not reuse a user alias shadowed by the running query', async () => {
    let installed = false;
    const query = {
      reloadPlugins: async () => {},
      mcpServerStatus: async () => [{ name: 'design', status: 'connected', config: { url: 'https://private.test/mcp' } }, ...(installed ? [{ name: 'mobbin', status: 'needs-auth', config: { url: CONNECTOR_ENDPOINTS.mobbin } }] : [])],
    } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace', {
      environment: async () => ({}),
      readFile: async () => JSON.stringify({ mcpServers: { design: { url: CONNECTOR_ENDPOINTS.mobbin } } }),
      execute: async (_binary, args) => { expect(args[6]).toBe('mobbin'); installed = true; return { stdout: '', stderr: '' }; },
    });
    expect(await adapter.prepare('mobbin', new AbortController().signal)).toEqual({ name: 'mobbin', connected: false });
  });

  for (const provider of ['figma', 'mobbin'] as const) {
    it.each([
      {},
      { source: 'claudeai' },
      { config: { type: 'claudeai-proxy', url: 'https://proxy.anthropic.test/mcp', id: 'cloud-design' }, source: 'claudeai' },
    ])(`${provider} reuses a cloud alias and authenticates the existing server: %j`, async (fields) => {
      const name = `claude.ai ${provider === 'figma' ? 'Figma' : 'Mobbin'}`;
      let connected = false;
      const query = {
        mcpServerStatus: async () => [{ name, status: connected ? 'connected' : 'needs-auth', ...fields }],
        reloadPlugins: async () => {},
        mcpAuthenticate: async (target: string) => { expect(target).toBe(name); connected = true; return { requiresUserAction: false }; },
      } as unknown as Query;
      const adapter = claudeConnectorSignIn(query, '/workspace', { environment: async () => ({}), readFile: async () => '{}', execute: async () => { throw new Error('Must not install another server'); } });
      const signal = new AbortController().signal;
      expect(await adapter.prepare(provider, signal)).toEqual({ name, connected: false });
      await adapter.authenticate(name, signal, () => {});
    });
  }

  it('reuses an existing desktop Figma SSE transport without installing a remote copy', async () => {
    const query = { mcpServerStatus: async () => [{ name: 'desktop-design', status: 'connected', config: { type: 'sse', url: 'http://localhost:3845/sse' } }], reloadPlugins: async () => {} } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace', { environment: async () => ({}), readFile: async () => '{}', execute: async () => { throw new Error('Must not install another server'); } });
    expect(await adapter.prepare('figma', new AbortController().signal)).toEqual({ name: 'desktop-design', connected: true });
  });

  it.each(['user', 'claudeai'])('does not trust a cloud-looking name with a conflicting explicit URL from %s', async (source) => {
    const query = { mcpServerStatus: async () => [{ name: 'claude.ai Mobbin', status: 'connected', source, config: { type: 'http', url: 'https://private.test/mcp' } }], reloadPlugins: async () => {} } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace', { environment: async () => ({}), readFile: async () => '{}', execute: async (_binary, args) => { expect(args[6]).toBe('mobbin'); throw new Error('install requested'); } });
    await expect(adapter.prepare('mobbin', new AbortController().signal)).rejects.toThrow('install requested');
  });

  it('a late SDK reply after timeout never opens the browser or reports another error', async () => {
    const abort = new AbortController();
    let browser = 0;
    const query = { mcpAuthenticate: async () => { abort.abort(); return { authUrl: 'https://provider.test', requiresUserAction: true }; } } as unknown as Query;
    const adapter = claudeConnectorSignIn(query, '/workspace', { openExternal: async () => { browser++; } });
    await expect(adapter.authenticate('mobbin', abort.signal, () => {})).rejects.toThrow();
    expect(browser).toBe(0);
  });
});
