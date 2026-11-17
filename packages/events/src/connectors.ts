export type ConnectorState = 'connected' | 'starting' | 'needs-sign-in' | 'failed' | 'off' | 'adding' | 'awaiting-sign-in' | 'sign-in-failed';
export type FeaturedConnector = 'figma' | 'mobbin';

export interface AgentConnector {
  id: string;
  name: string;
  state: ConnectorState;
  featured?: FeaturedConnector;
  error?: string;
  managedExternally?: boolean;
}

export interface ConnectorInventory {
  servers: AgentConnector[];
  unavailable?: boolean;
}

export function connectorRowAction(server: AgentConnector): 'sign-in' | 'retry' | 'manage-externally' | undefined {
  if (server.state !== 'needs-sign-in' && server.state !== 'sign-in-failed' && server.state !== 'failed') return undefined;
  if (server.managedExternally) return 'manage-externally';
  return server.state === 'failed' ? 'retry' : 'sign-in';
}
