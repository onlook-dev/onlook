import { describe, expect, it, jest } from 'bun:test';
import { settle } from '@studio/fixtures';
import type { AgentConnector } from '@studio/events';
import { CodexConnectorSignIn } from './connector-sign-in.js';
import { CONNECTOR_ENDPOINTS } from '../connector-sign-in.js';

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

describe('Codex connector retry readiness', () => {
  it.each([
    { runtimeStatus: 'connected', state: 'connected' },
    { runtimeStatus: 'failed', state: 'failed' },
    { runtimeStatus: 'authenticationRequired', state: 'needs-sign-in' },
  ] as const)('waits through missing and starting inventory before returning %j without OAuth', async ({ runtimeStatus, state }) => {
    const pauses = interceptRetryPauses();
    const abort = new AbortController();
    try {
      const calls: { method: string; params: unknown; timeoutMs?: number }[] = [];
      let reads = 0;
      let browser = 0;
      let settled: AgentConnector | undefined;
      const transport = { request: async (method: string, params: unknown, timeoutMs?: number) => { calls.push({ method, params, timeoutMs }); return {}; } };
      const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => {
        reads += 1;
        if (reads === 1) return [];
        return [{ name: 'private-local', authStatus: 'oAuth', runtimeStatus: reads === 2 ? 'starting' : runtimeStatus }];
      }, async () => { browser += 1; });
      const pending = adapter.retry('private-local', abort.signal).then((server) => { settled = server; return server; });
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
      expect(calls).toEqual([{ method: 'config/mcpServer/reload', params: {}, timeoutMs: 15_000 }]);
      expect(browser).toBe(0);
    } finally {
      pauses.restore();
      abort.abort();
    }
  });

  it.each(['missing', 'starting'] as const)('rejects an abort while %s and stops polling without OAuth', async (runtimeStatus) => {
    const pauses = interceptRetryPauses();
    const abort = new AbortController();
    try {
      const methods: string[] = [];
      let reads = 0;
      let browser = 0;
      const transport = { request: async (method: string) => { methods.push(method); return {}; } };
      const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => {
        reads += 1;
        return runtimeStatus === 'missing' ? [] : [{ name: 'private-local', authStatus: 'oAuth', runtimeStatus }];
      }, async () => { browser += 1; });
      const pending = adapter.retry('private-local', abort.signal);
      const rejected = pending.catch((error: unknown) => error);
      const wake = await pauses.next();
      expect(reads).toBe(1);
      const reason = new Error('retry canceled');
      abort.abort(reason);
      expect(await rejected).toBe(reason);
      wake();
      await settle();
      expect(reads).toBe(1);
      expect(methods).toEqual(['config/mcpServer/reload']);
      expect(browser).toBe(0);
    } finally {
      pauses.restore();
      abort.abort();
    }
  });

  it('propagates a reload rejection without reading inventory, writing configuration or authenticating', async () => {
    const methods: string[] = [];
    let reads = 0;
    let browser = 0;
    const failure = new Error('reload refused');
    const transport = { request: async (method: string) => { methods.push(method); throw failure; } };
    const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => { reads += 1; return []; }, async () => { browser += 1; });
    await expect(adapter.retry('private-local', new AbortController().signal)).rejects.toBe(failure);
    const abort = new AbortController();
    abort.abort(failure);
    await expect(adapter.retry('private-local', abort.signal)).rejects.toBe(failure);
    expect(reads).toBe(0);
    expect(methods).toEqual(['config/mcpServer/reload']);
    expect(browser).toBe(0);
  });
});

function fixture(provider: 'figma' | 'mobbin', existing = false) {
  const calls: { method: string; params: unknown }[] = [];
  const browser: string[] = [];
  const name = existing ? 'design-alias' : provider;
  let connected = false;
  let installed = existing;
  const config = { mcp_servers: { untouched: { command: 'private-command' }, ...(existing ? { [name]: { url: CONNECTOR_ENDPOINTS[provider] } } : {}) } };
  const before = JSON.stringify(config);
  let adapter: CodexConnectorSignIn;
  const transport = {
    async request(method: string, params: unknown) {
      calls.push({ method, params });
      if (method === 'config/batchWrite') installed = true;
      if (method === 'config/read') return { config, layers: [{ name: { type: 'user', file: '/scratch/config.toml' }, config, version: 'v1' }] };
      if (method === 'mcpServer/oauth/login') {
        adapter.completed({ name, loginId: 'stale', success: false });
        adapter.completed({ name, loginId: 'current', success: true });
        connected = true;
        return { authorizationUrl: 'https://provider.test/authorize?state=secret', loginId: 'current' };
      }
      return {};
    },
  };
  adapter = new CodexConnectorSignIn(transport, 'live-thread', '/workspace', async () => installed ? [{ name, authStatus: connected ? 'oAuth' : 'notLoggedIn', httpOrigin: new URL(CONNECTOR_ENDPOINTS[provider]).origin, runtimeStatus: connected ? 'connected' : 'authenticationRequired' }] : [], async (url) => { browser.push(url); });
  return { adapter, calls, browser, config, before, name };
}

describe('Codex connector sign-in', () => {
  it('retries arbitrary rows by reloading configuration without OAuth', async () => {
    const methods: string[] = [];
    const adapter = new CodexConnectorSignIn({ request: async (method) => { methods.push(method); return {}; } }, 'thread', '/workspace', async () => [{ name: 'private-local', authStatus: 'unsupported', runtimeStatus: 'connected' }]);
    expect(await adapter.retry('private-local', new AbortController().signal)).toEqual({ id: 'private-local', name: 'private-local', state: 'connected' });
    expect(methods).toEqual(['config/mcpServer/reload']);
  });

  it.each(['figma', 'mobbin'] as const)('%s persists only its entry, reloads the live thread, and correlates early completion', async (provider) => {
    const given = fixture(provider);
    const signal = new AbortController().signal;
    expect(await given.adapter.prepare(provider, signal)).toEqual({ name: provider, connected: false });
    expect(given.calls.find((call) => call.method === 'config/batchWrite')?.params).toEqual({ edits: [{ keyPath: `mcp_servers.${provider}`, value: { url: CONNECTOR_ENDPOINTS[provider] }, mergeStrategy: 'replace' }], expectedVersion: 'v1', filePath: '/scratch/config.toml', reloadUserConfig: true });
    await given.adapter.authenticate(provider, signal, () => {});
    expect(given.browser).toHaveLength(1);
    expect(given.calls.filter((call) => call.method === 'config/mcpServer/reload')).toHaveLength(2);
    expect(given.calls.find((call) => call.method === 'mcpServer/oauth/login')?.params).toEqual({ name: provider, threadId: 'live-thread', timeoutSecs: 120 });
    expect(JSON.stringify(given.config)).toBe(given.before);
  });

  it.each(['figma', 'mobbin'] as const)('%s reuses a configured alias without writing configuration', async (provider) => {
    const given = fixture(provider, true);
    const signal = new AbortController().signal;
    expect((await given.adapter.prepare(provider, signal)).name).toBe('design-alias');
    expect(given.calls.some((call) => call.method === 'config/batchWrite')).toBe(false);
    await given.adapter.authenticate('design-alias', signal, () => {});
    expect(given.browser).toHaveLength(1);
  });

  it('refusal fails without reporting connected and an aborted late login cannot open a browser', async () => {
    let adapter: CodexConnectorSignIn;
    let browser = 0;
    const transport = { request: async () => {
      adapter.completed({ name: 'figma', loginId: 'denied', success: false });
      return { authorizationUrl: 'https://provider.test', loginId: 'denied' };
    } };
    adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => [], async () => { browser++; });
    await expect(adapter.authenticate('figma', new AbortController().signal, () => {})).rejects.toThrow('not approved');
    const abort = new AbortController(); abort.abort();
    await expect(adapter.authenticate('figma', abort.signal, () => {})).rejects.toThrow();
    expect(browser).toBe(1);
  });

  it.each(['figma', 'mobbin'] as const)('%s reuses an origin-only runtime alias absent from user configuration', async (provider) => {
    const methods: string[] = [];
    const transport = { request: async (method: string) => { methods.push(method); return { config: {} }; } };
    const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => [{ name: 'plugin-design', httpOrigin: new URL(CONNECTOR_ENDPOINTS[provider]).origin, runtimeStatus: 'authenticationRequired', authStatus: 'notLoggedIn' }]);
    expect(await adapter.prepare(provider, new AbortController().signal)).toEqual({ name: 'plugin-design', connected: false });
    expect(methods).not.toContain('config/batchWrite');
  });

  it('does not reuse a user alias shadowed by project configuration', async () => {
    const writes: unknown[] = [];
    let installed = false;
    const transport = { request: async (method: string, params: unknown) => {
      if (method === 'config/batchWrite') { writes.push(params); installed = true; }
      if (method === 'config/read') return { config: { mcp_servers: { design: { url: (params as { cwd: string | null }).cwd === null ? CONNECTOR_ENDPOINTS.mobbin : 'https://private.test/mcp' } } }, layers: [{ name: { type: 'user', file: '/scratch/config.toml' }, version: 'v1' }] };
      return {};
    } };
    const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => [{ name: 'design', httpOrigin: 'https://private.test', runtimeStatus: 'connected', authStatus: 'oAuth' }, ...(installed ? [{ name: 'mobbin', httpOrigin: new URL(CONNECTOR_ENDPOINTS.mobbin).origin, runtimeStatus: 'authenticationRequired' as const, authStatus: 'notLoggedIn' as const }] : [])]);
    expect(await adapter.prepare('mobbin', new AbortController().signal)).toEqual({ name: 'mobbin', connected: false });
    expect(writes).toHaveLength(1);
  });

  it('tool discovery errors never report Connected', async () => {
    const transport = { request: async () => ({ config: {} }) };
    const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => [{ name: 'figma', httpOrigin: 'https://mcp.figma.com', runtimeStatus: 'connected', authStatus: 'oAuth', toolsError: 'catalog unavailable' }]);
    await expect(adapter.prepare('figma', new AbortController().signal)).rejects.toThrow('tool discovery failed');
  });

  it.each([
    { runtimeStatus: 'failed', authStatus: 'notLoggedIn' },
    { runtimeStatus: 'authenticationRequired', authStatus: 'unknown' },
  ])('auth-required discovery failures can still start OAuth: %j', async (status) => {
    const transport = { request: async () => ({ config: {} }) };
    const adapter = new CodexConnectorSignIn(transport, 'thread', '/workspace', async () => [{ name: 'design', httpOrigin: 'https://mcp.figma.com', ...status, toolsError: 'sign-in required before discovering tools' }]);
    expect(await adapter.prepare('figma', new AbortController().signal)).toEqual({ name: 'design', connected: false });
  });
});
