import { shell } from 'electron';
import type { FeaturedConnector } from '@studio/events';
import { configuredConnector, connectorOriginMatches, unusedConnectorName, CONNECTOR_ENDPOINTS, ConnectorFailure, connectorAuthorizationUrl, connectorPause, type ConnectorSignInAdapter } from '../connector-sign-in.js';
import { codexConnectors, type CodexServer } from '../connectors.js';

interface ConnectorTransport {
  request(method: string, params: unknown, timeoutMs?: number): Promise<unknown>;
}

interface Completion {
  name: string;
  loginId?: string | null;
  success: boolean;
}

interface ConnectorConfig {
  config: { mcp_servers?: Record<string, { url?: unknown }> };
  layers?: { name: { type: string; file?: string; profile?: string | null }; version: string }[];
}

function ready(server: CodexServer | undefined): boolean {
  return server?.runtimeStatus === 'connected' && server.authStatus !== 'notLoggedIn' && !server.toolsError;
}

export class CodexConnectorSignIn implements ConnectorSignInAdapter {
  private readonly listeners = new Set<(completion: Completion) => void>();

  private readonly transport: ConnectorTransport;
  private readonly threadId: string;
  private readonly cwd: string;
  private readonly readServers: () => Promise<CodexServer[]>;
  private readonly openExternal: (url: string) => Promise<void>;

  constructor(transport: ConnectorTransport, threadId: string, cwd: string, readServers: () => Promise<CodexServer[]>, openExternal = (url: string) => shell.openExternal(url)) {
    this.transport = transport;
    this.threadId = threadId;
    this.cwd = cwd;
    this.readServers = readServers;
    this.openExternal = openExternal;
  }

  completed(params: unknown): void {
    const completion = params as Partial<Completion> | null;
    if (completion === null || typeof completion !== 'object' || typeof completion.name !== 'string' || typeof completion.success !== 'boolean') return;
    for (const listener of this.listeners) listener(completion as Completion);
  }

  async retry(name: string, signal: AbortSignal): Promise<import('@studio/events').AgentConnector> {
    signal.throwIfAborted();
    await this.transport.request('config/mcpServer/reload', {}, 15_000);
    for (;;) {
      signal.throwIfAborted();
      const server = codexConnectors(await this.readServers()).find((candidate) => candidate.id === name);
      if (server !== undefined && server.state !== 'starting') return server;
      await connectorPause(signal);
    }
  }

  async prepare(provider: FeaturedConnector, signal: AbortSignal): Promise<{ name: string; connected: boolean }> {
    signal.throwIfAborted();
    const [result, effective, servers] = await Promise.all([
      this.transport.request('config/read', { cwd: null, includeLayers: true }, 15_000) as Promise<ConnectorConfig>,
      this.transport.request('config/read', { cwd: this.cwd, includeLayers: false }, 15_000) as Promise<ConnectorConfig>,
      this.readServers(),
    ]);
    signal.throwIfAborted();
    const runtime = Object.fromEntries(servers.map((server) => [server.name, { url: server.httpOrigin }]));
    const configured = { ...result.config.mcp_servers, ...effective.config.mcp_servers };
    const eligible = Object.fromEntries(Object.entries(configured).filter(([name]) => typeof runtime[name]?.url !== 'string' || connectorOriginMatches(runtime[name]?.url, provider)));
    const all = { ...configured, ...runtime };
    const existing = servers.find((server) => connectorOriginMatches(server.httpOrigin, provider))?.name ?? configuredConnector(eligible, provider);
    const name = existing ?? unusedConnectorName(all, provider);
    if (existing === undefined) {
      const user = result.layers?.find((layer) => layer.name.type === 'user' && !layer.name.profile);
      if (user === undefined) throw new Error('Codex user configuration layer unavailable');
      signal.throwIfAborted();
      await this.transport.request('config/batchWrite', {
        edits: [{ keyPath: `mcp_servers.${name}`, value: { url: CONNECTOR_ENDPOINTS[provider] }, mergeStrategy: 'replace' }],
        filePath: user.name.file,
        expectedVersion: user.version,
        reloadUserConfig: true,
      }, 15_000);
    }
    signal.throwIfAborted();
    await this.transport.request('config/mcpServer/reload', {}, 15_000);
    signal.throwIfAborted();
    const current = (await this.readServers()).find((server) => server.name === name);
    if (current?.runtimeStatus === 'disabled') throw new Error('Connector is disabled');
    if (current !== undefined && !connectorOriginMatches(current.httpOrigin, provider)) throw new Error('Requested connector is shadowed by another configuration');
    if (current?.toolsError && current.authStatus !== 'notLoggedIn' && current.runtimeStatus !== 'authenticationRequired') throw new Error('Connector tool discovery failed');
    return { name, connected: ready(current) };
  }

  async authenticate(name: string, signal: AbortSignal, onBrowser: () => void): Promise<void> {
    signal.throwIfAborted();
    const completions: Completion[] = [];
    const listener = (completion: Completion): void => { if (completion.name === name) completions.push(completion); };
    this.listeners.add(listener);
    try {
      const response = await this.transport.request('mcpServer/oauth/login', { name, threadId: this.threadId, timeoutSecs: 120 }, 15_000) as { authorizationUrl: string; loginId?: string | null };
      signal.throwIfAborted();
      if (!response.loginId) throw new ConnectorFailure('integration');
      await this.openExternal(connectorAuthorizationUrl(response.authorizationUrl));
      signal.throwIfAborted();
      onBrowser();
      for (;;) {
        const completion = completions.find((candidate) => candidate.loginId === response.loginId);
        if (completion !== undefined) {
          if (!completion.success) throw new ConnectorFailure('authorization', 'Connector sign-in was not approved');
          break;
        }
        await connectorPause(signal);
      }
      signal.throwIfAborted();
      await this.transport.request('config/mcpServer/reload', {}, 15_000);
      for (;;) {
        signal.throwIfAborted();
        const server = (await this.readServers()).find((candidate) => candidate.name === name);
        if (ready(server)) return;
        await connectorPause(signal);
      }
    } finally {
      this.listeners.delete(listener);
    }
  }
}
