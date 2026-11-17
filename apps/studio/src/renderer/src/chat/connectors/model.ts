import { type AgentConnector, type ConnectorInventory, type FeaturedConnector } from '@studio/events';

export interface FeaturedSlot {
  featured: FeaturedConnector;
  server?: AgentConnector;
}

export function connectorRows(inventory: ConnectorInventory | undefined): { featured: FeaturedSlot[]; others: AgentConnector[]; known: boolean } {
  const servers = inventory?.servers ?? [];
  return {
    featured: (['figma', 'mobbin'] as const).map((featured) => ({ featured, server: servers.find((server) => server.featured === featured && server.state === 'connected') ?? servers.find((server) => server.featured === featured) })),
    /* By name alone, so a row never moves when its status changes (ONL-3193). */
    others: servers.filter((server) => server.featured === undefined).sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'accent' })),
    known: inventory !== undefined && inventory.unavailable !== true,
  };
}

export const CONNECTORS_NOTICE_MIN_PROJECTS = 3;

export interface ConnectorsNoticeFacts {
  primed: boolean;
  dismissed: boolean;
  projectCount: number;
  isInvitationAsking: boolean;
}

export function showsConnectorsNotice(inventory: ConnectorInventory | undefined, { primed, dismissed, projectCount, isInvitationAsking }: ConnectorsNoticeFacts): boolean {
  return primed && !dismissed && !isInvitationAsking && projectCount >= CONNECTORS_NOTICE_MIN_PROJECTS && inventory !== undefined && !inventory.unavailable && !inventory.servers.some((server) => server.featured !== undefined && server.state === 'connected');
}

type Edges = Pick<DOMRect, 'top' | 'bottom'>;

const HEADER_CLEARANCE = 8;

/** The menu grows upward from its trigger and stops short of the panel header (ONL-3193). */
export function connectorsMenuMaxHeight({ header, trigger }: { header: Edges; trigger: Edges }): number {
  return Math.max(0, trigger.top - header.bottom - HEADER_CLEARANCE);
}
