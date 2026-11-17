import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { McpServerStatus, Query } from '@anthropic-ai/claude-agent-sdk';
import type { FeaturedConnector } from '@studio/events';
import { shell } from 'electron';
import { captureError } from '../errors/index.js';
import { claudeChildEnv } from '../claude/env.js';
import { runChildOutput } from '../env/child.js';
import { appReturnedToForeground } from './app-return.js';
import { claudeBinaryPath } from './cli-path.js';
import { configuredConnector, unusedConnectorName, CONNECTOR_ENDPOINTS, ConnectorFailure, connectorAuthorizationUrl, connectorPause, type ConnectorSignInAdapter } from './connector-sign-in.js';
import { claudeConnectors, featuredConnector } from './connectors.js';

function matchesProvider(server: McpServerStatus, provider: FeaturedConnector): boolean {
  if (server.source === 'sdk') return false;
  const cloud = server.source === 'claudeai' || server.scope === 'claudeai' || (server.source === undefined && /^claude\.ai\s+/i.test(server.name));
  if (cloud && (server.config === undefined || server.config.type === 'claudeai-proxy')) return featuredConnector(undefined, server.name) === provider;
  return configuredConnector({ [server.name]: (server.config ?? {}) as { url?: unknown } }, provider) === server.name;
}

interface ClaudeConnectorServices {
  environment: typeof claudeChildEnv;
  readFile: (path: string) => Promise<string>;
  binary: typeof claudeBinaryPath;
  execute: (binary: string, args: string[], options: { env: NodeJS.ProcessEnv; cwd: string; signal: AbortSignal; timeout: number; maxBuffer: number }) => Promise<unknown>;
  openExternal: (url: string) => Promise<void>;
  authenticationFailed: () => void;
  returnedToForeground: (signal: AbortSignal) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

export function claudeConnectorSignIn(query: Query, cwd: string, overrides: Partial<ClaudeConnectorServices> = {}): ConnectorSignInAdapter {
  const services: ClaudeConnectorServices = {
    environment: claudeChildEnv, readFile: (path) => readFile(path, 'utf8'), binary: claudeBinaryPath, execute: runChildOutput,
    openExternal: (url) => shell.openExternal(url),
    authenticationFailed: () => captureError(new Error('Claude connector authentication call failed'), { owner: 'ours', subsystem: 'connectors', mechanism: 'claude-mcp-authenticate' }),
    returnedToForeground: (signal) => appReturnedToForeground(signal),
    refreshInventory: async () => {},
    ...overrides,
  };
  return {
    async manageExternally(name, signal, onBrowser) {
      // Armed before the browser opens, or the blur that raises it lands before anything is listening (ONL-3181).
      let returned = services.returnedToForeground(signal);
      await services.openExternal('https://claude.ai/customize/connectors');
      signal.throwIfAborted();
      onBrowser();
      for (;;) {
        await returned;
        signal.throwIfAborted();
        // Only a reload makes the SDK re-read account-managed connectors (ONL-3181).
        await query.reloadPlugins();
        signal.throwIfAborted();
        await services.refreshInventory();
        signal.throwIfAborted();
        if ((await query.mcpServerStatus()).some((server) => server.name === name && server.status === 'connected')) return;
        // They came back without finishing, so the hand-off waits for the next return rather than spending itself.
        returned = services.returnedToForeground(signal);
      }
    },
    async retry(name, signal) {
      signal.throwIfAborted();
      await query.reconnectMcpServer(name);
      for (;;) {
        signal.throwIfAborted();
        const server = claudeConnectors(await query.mcpServerStatus()).find((candidate) => candidate.id === name);
        if (server !== undefined && server.state !== 'starting') return server;
        await connectorPause(signal);
      }
    },
    async prepare(provider, signal) {
      const env = await services.environment();
      signal.throwIfAborted();
      const path = env['CLAUDE_CONFIG_DIR'] ? join(env['CLAUDE_CONFIG_DIR'], '.claude.json') : join(homedir(), '.claude.json');
      let stored: { mcpServers?: Record<string, { url?: unknown }> };
      try { stored = JSON.parse(await services.readFile(path)) as typeof stored; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; stored = {}; }
      const servers = await query.mcpServerStatus();
      const effective = Object.fromEntries(servers.map((server) => [server.name, (server.config ?? {}) as { url?: unknown }]));
      const configured = { ...stored.mcpServers, ...effective };
      const existing = servers.find((server) => matchesProvider(server, provider))?.name ?? configuredConnector(configured, provider);
      const name = existing ?? unusedConnectorName(configured, provider);
      if (existing === undefined) {
        const binary = services.binary();
        if (binary === undefined) throw new Error('Bundled Claude executable unavailable');
        signal.throwIfAborted();
        await services.execute(binary, ['mcp', 'add', '--transport', 'http', '--scope', 'user', name, CONNECTOR_ENDPOINTS[provider]], { env, cwd, signal, timeout: 15_000, maxBuffer: 64 * 1024 });
      }
      for (;;) {
        signal.throwIfAborted();
        await query.reloadPlugins();
        signal.throwIfAborted();
        const current = (await query.mcpServerStatus()).find((server) => server.name === name);
        if (current !== undefined && current.status !== 'pending') {
          if (!matchesProvider(current, provider)) throw new Error('Requested connector is shadowed by another configuration');
          if (current.status === 'disabled') throw new Error('Connector is disabled');
          if (current.status === 'failed') throw new ConnectorFailure('server');
          return { name, connected: current.status === 'connected' };
        }
        await connectorPause(signal);
      }
    },
    async authenticate(name, signal, onBrowser) {
      signal.throwIfAborted();
      let result: { authUrl?: string; requiresUserAction?: boolean };
      try {
        const runtime = query as Query & { mcpAuthenticate?: (name: string) => Promise<typeof result> };
        if (typeof runtime.mcpAuthenticate !== 'function') throw new Error('Claude connector authentication API unavailable');
        result = await runtime.mcpAuthenticate(name);
        if (result === null || typeof result !== 'object' || typeof result.requiresUserAction !== 'boolean') throw new Error('Claude connector authentication response changed');
      } catch {
        if (!signal.aborted) services.authenticationFailed();
        throw new ConnectorFailure('integration', 'Claude connector authentication failed');
      }
      signal.throwIfAborted();
      if (result.requiresUserAction) {
        await services.openExternal(connectorAuthorizationUrl(result.authUrl));
        signal.throwIfAborted();
        onBrowser();
      }
      for (;;) {
        signal.throwIfAborted();
        const servers = await query.mcpServerStatus();
        if (servers.some((server) => server.name === name && server.status === 'connected')) {
          await query.reloadPlugins();
          signal.throwIfAborted();
          if ((await query.mcpServerStatus()).some((server) => server.name === name && server.status === 'connected')) return;
        }
        await connectorPause(signal);
      }
    },
  };
}
