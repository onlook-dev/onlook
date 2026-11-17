import type { ConnectorInventory } from '@studio/events';

export function connectorInstructions(inventory: ConnectorInventory): string {
  const status = (featured: 'figma' | 'mobbin'): string => {
    if (inventory.unavailable) return 'status unavailable';
    const servers = inventory.servers.filter((server) => server.featured === featured);
    if (servers.some((server) => server.state === 'connected')) return 'connected';
    if (servers.some((server) => server.state === 'needs-sign-in' || server.state === 'sign-in-failed')) return 'needs sign-in';
    return servers[0]?.state ?? 'not added';
  };
  return `Connectors in this Project: Figma: ${status('figma')}. Mobbin: ${status('mobbin')}.
Use their MCP tools for requested design and reference work when available. If a requested connector needs sign-in, explain that in chat and direct the user to the connectors menu to sign in, then try again. If it is not added, direct the user to Add in the connectors menu. Do not invent connector results or attempt to manage credentials in the terminal.`;
}
