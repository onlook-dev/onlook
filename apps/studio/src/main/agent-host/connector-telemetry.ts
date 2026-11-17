import type { ConnectorInventory } from '@studio/events';
import type { ConnectorActivity } from './connector-sign-in.js';
import { capture } from '../telemetry/index.js';
import type { SessionHarness } from './backend.js';
import { codexInternalServer, connectorForTool } from './connectors.js';
import { harnessStoredAs } from './harness.js';

export function connectorMenuProperties(harness: SessionHarness, source: 'plug' | 'add-menu' | 'notice', inventory: ConnectorInventory | undefined) {
  const servers = inventory?.servers ?? [];
  return {
    harness: harnessStoredAs(harness).telemetry,
    source,
    inventory_known: inventory !== undefined && inventory.unavailable !== true,
    connector_count: servers.length,
    needs_sign_in_count: servers.filter((server) => server.state === 'needs-sign-in' || server.state === 'sign-in-failed').length,
    connected_count: servers.filter((server) => server.state === 'connected').length,
    failed_count: servers.filter((server) => server.state === 'failed').length,
  };
}

export function connectorInventoryProperties(harness: SessionHarness, inventory: ConnectorInventory) {
  const { source: _source, ...counts } = connectorMenuProperties(harness, 'plug', inventory);
  const connected = inventory.servers.filter((server) => server.state === 'connected');
  return {
    ...counts,
    figma_connected_count: connected.filter((server) => server.featured === 'figma').length,
    mobbin_connected_count: connected.filter((server) => server.featured === 'mobbin').length,
    other_connected_count: connected.filter((server) => server.featured === undefined).length,
  };
}

export function recordConnectorActivity(harness: SessionHarness, activity: ConnectorActivity): void {
  const properties = {
    harness: harnessStoredAs(harness).telemetry,
    action: activity.action,
    connector: activity.connector,
    attempt_id: activity.attemptId,
  };
  if (activity.phase === 'started') capture('connector_connection_started', properties);
  else capture('connector_connection_finished', {
    ...properties,
    outcome: activity.outcome!,
    ...(activity.failure ? { failure_category: activity.failure } : {}),
  });
}

export function connectorToolProperties(harness: SessionHarness, name: string, inventory: ConnectorInventory | undefined) {
  const server = connectorForTool(name, inventory?.servers ?? []);
  const fallback = /^mcp__(.+?)__.+$/.exec(name)?.[1];
  if (fallback === undefined || server?.id === 'studio' || server === undefined && fallback === 'studio') return undefined;
  if (harness === 'appserver' && codexInternalServer(server?.id ?? fallback)) return undefined;
  return {
    harness: harnessStoredAs(harness).telemetry,
    connector: server?.featured ?? 'other' as const,
    connection_state: server?.state ?? 'unknown' as const,
  };
}
