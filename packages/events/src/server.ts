/** `stop-failed` is not terminal: the bound elapsed with our listener still up, and a later death still lands `stopped`. */
export type ServerStatus = 'starting' | 'running' | 'stopping' | 'stop-failed' | 'stopped';

/** `unknown` (could not inspect) counts as running: an unconfirmed measurement is never a negative (ONL-1931). */
export type ServerOwnership = 'ours' | 'foreign' | 'unknown';

export type ServerAttribution = 'agent-started' | 'users-own' | 'studio-started' | 'unknown';

export interface ServerState {
  status: ServerStatus;
  port?: number;
}

export type ServerPortMeasurement = 'live' | 'dead' | 'stranger' | 'unverified';

export interface ServerPortState {
  port: number;
  origin: string;
  measured: ServerPortMeasurement;
  everLive: boolean;
  listener?: 'container';
}

export interface ServerEntryState {
  entryId: string;
  folderName: string;
  ownership: ServerAttribution;
  status: ServerStatus;
  port?: number;
  ports: ServerPortState[];
  everMeasuredLive: boolean;
}

export interface ServerBookState {
  entries: ServerEntryState[];
  pending: boolean;
  /** Studio's own starter is spawning, before its port is reported. */
  starterSpawning?: boolean;
}

export function originForPort(port: number): string {
  return `http://localhost:${String(port)}`;
}

export type RunPress = 'start' | 'stop';

export interface RunIntent {
  press: RunPress;
  entryId?: string;
  entryIds?: string[];
}

export const DEFAULT_DEV_PORT = 3000;
