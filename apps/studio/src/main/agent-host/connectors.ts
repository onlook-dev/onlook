import type { AgentConnector, ConnectorInventory, ConnectorState, FeaturedConnector } from '@studio/events';

interface ClaudeServer {
  name: string;
  status: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled';
  source?: string;
  scope?: string;
  config?: unknown;
  error?: string;
}

export interface CodexServer {
  name: string;
  authStatus: string;
  pluginId?: string | null;
  httpOrigin?: string | null;
  runtimeStatus?: string | null;
  toolsError?: string | null;
}

export function connectorForTool(name: string, servers: readonly AgentConnector[]): AgentConnector | undefined {
  let match: AgentConnector | undefined;
  for (const server of servers) {
    if ((match === undefined || server.id.length > match.id.length) && name.startsWith(`mcp__${server.id}__`)) match = server;
  }
  return match;
}

export function featuredConnector(endpoint: unknown, name: string): FeaturedConnector | undefined {
  if (typeof endpoint === 'string') {
    try {
      const url = new URL(endpoint);
      if (url.hostname === 'mcp.figma.com' || ((url.hostname === '127.0.0.1' || url.hostname === 'localhost') && url.port === '3845')) return 'figma';
      if (url.hostname === 'api.mobbin.com') return 'mobbin';
    } catch {}
  }
  const canonical = name.replace(/^claude\.ai\s+/i, '').toLowerCase();
  return canonical === 'figma' || canonical === 'mobbin' ? canonical : undefined;
}

export function claudeConnectors(servers: readonly ClaudeServer[]): AgentConnector[] {
  const states: Record<ClaudeServer['status'], ConnectorState> = {
    connected: 'connected', failed: 'failed', 'needs-auth': 'needs-sign-in', pending: 'starting', disabled: 'off',
  };
  return servers.filter((server) => server.source !== 'sdk' && !(server.source === undefined && server.name === 'studio')).map((server) => {
    const config = server.config as { url?: unknown } | undefined;
    const featured = featuredConnector(config?.url, server.name);
    const error = server.status === 'failed' ? server.error?.split('\n')[0]?.slice(0, 240) : undefined;
    const managedExternally = server.source === 'claudeai' || server.scope === 'claudeai' || config !== undefined && (config as { type?: string }).type === 'claudeai-proxy' || (server.source === undefined && /^claude\.ai\s+/i.test(server.name));
    return { id: server.name, name: server.name, state: states[server.status], ...(featured === undefined ? {} : { featured }), ...(error ? { error } : {}), ...(managedExternally ? { managedExternally: true } : {}) };
  });
}

const CODEX_INTERNAL_SERVERS = new Set(['studio', 'codex_app', 'codex_apps', 'cua_repl', 'node_repl']);

export function codexInternalServer(name: string, pluginId?: string | null): boolean {
  return CODEX_INTERNAL_SERVERS.has(name) || pluginId === 'openai-bundled' || pluginId?.startsWith('openai-bundled/') === true || pluginId?.endsWith('@openai-bundled') === true;
}

export function codexConnectors(servers: readonly CodexServer[]): AgentConnector[] {
  return servers.filter((server) => !codexInternalServer(server.name, server.pluginId)).map((server) => {
    let state: ConnectorState;
    if (server.runtimeStatus === 'disabled') state = 'off';
    else if (server.authStatus === 'notLoggedIn' || server.runtimeStatus === 'authenticationRequired') state = 'needs-sign-in';
    else if (server.runtimeStatus === 'starting' || server.runtimeStatus === 'notStarted') state = 'starting';
    else if (server.runtimeStatus === 'failed' || server.runtimeStatus === 'cancelled' || server.toolsError) state = 'failed';
    else state = server.runtimeStatus === 'connected' ? 'connected' : 'starting';
    const featured = featuredConnector(server.httpOrigin, server.name);
    return { id: server.name, name: server.name, state, ...(featured === undefined ? {} : { featured }) };
  });
}

export class ConnectorMonitor {
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private fingerprint?: string;
  private active?: Promise<void>;
  private readonly read: () => Promise<AgentConnector[]>;
  private readonly publish: (inventory: ConnectorInventory) => void;
  private readonly intervalMs: number;

  constructor(read: () => Promise<AgentConnector[]>, publish: (inventory: ConnectorInventory) => void, intervalMs = 5000) {
    this.read = read;
    this.publish = publish;
    this.intervalMs = intervalMs;
  }

  refresh(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.active !== undefined) return this.active;
    clearTimeout(this.timer);
    this.active = this.read().then((servers) => this.emit({ servers })).catch(() => this.emit({ servers: [], unavailable: true })).finally(() => {
      this.active = undefined;
      if (!this.stopped) {
        this.timer = setTimeout(() => { void this.refresh(); }, this.intervalMs);
        this.timer.unref();
      }
    });
    return this.active;
  }

  /** A read already in flight began before the caller's reason for asking, so it cannot answer for it (ONL-3181). */
  revalidate(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    const inFlight = this.active;
    return inFlight === undefined ? this.refresh() : inFlight.then(() => this.refresh());
  }

  close(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private emit(inventory: ConnectorInventory): void {
    if (this.stopped) return;
    const fingerprint = JSON.stringify(inventory);
    if (fingerprint === this.fingerprint) return;
    this.fingerprint = fingerprint;
    this.publish(inventory);
  }
}
