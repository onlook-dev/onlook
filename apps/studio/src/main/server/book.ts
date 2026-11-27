import { randomUUID } from 'node:crypto';
import type { ServerAttribution, ServerPortMeasurement, ServerPortState } from '@studio/events';
import { localPort } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { normalizePath, workspaceRoot } from '../workspace/store.js';

export type PortListener = NonNullable<ServerPortState['listener']>;

interface BookPort {
  port: number;
  measured: ServerPortMeasurement;
  everLive: boolean;
  listener?: PortListener;
}

export interface ServerBookEntry {
  id: string;
  folder: string;
  ownership: ServerAttribution;
  ports: BookPort[];
  /** Stored, not derived from `ports`: a move replaces the port that lived. */
  everMeasuredLive: boolean;
}

interface ServerBookFile {
  projects: Record<string, Record<string, ServerBookEntry>>;
}

const domain = defineDomain<ServerBookFile>({
  name: 'server-book',
  version: 1,
  fallback: () => ({ projects: {} }),
  // Under workspaceRoot(): the e2e teardown's one rm takes worktrees and their claims together.
  root: workspaceRoot,
});

const removedProjects = new Set<string>();
const livePortOwners = new Map<number, { projectKey: string; entryId: string }>();
const measurementVersions = new Map<number, number>();

export function capturePortMeasurement(port: number): () => boolean {
  const version = measurementVersions.get(port);
  return () => measurementVersions.get(port) === version;
}

function advanceMeasurement(port: number): void {
  measurementVersions.set(port, (measurementVersions.get(port) ?? 0) + 1);
}

export function invalidatePortMeasurements(worktreePath: string): void {
  const projectKey = normalizePath(worktreePath);
  for (const [port, owner] of livePortOwners) {
    if (owner.projectKey === projectKey) {
      livePortOwners.delete(port);
      advanceMeasurement(port);
    }
  }
}

export function portMeasurementInvalidator(worktreePath: string, port: number): () => boolean {
  const projectKey = normalizePath(worktreePath);
  const measured = livePortOwners.get(port);
  const current = capturePortMeasurement(port);
  return () => {
    if (!current() || livePortOwners.get(port) !== measured) return false;
    if (measured !== undefined && measured.projectKey !== projectKey) return false;
    advanceMeasurement(port);
    return measured !== undefined && livePortOwners.delete(port);
  };
}

export function reopenServerBookProject(worktreePath: string): void {
  removedProjects.delete(worktreePath);
  removedProjects.delete(normalizePath(worktreePath));
}

export function serverBookEntries(worktreePath: string): ServerBookEntry[] {
  return Object.values(domain.read().projects[normalizePath(worktreePath)] ?? {});
}

export function portHeldByOtherProject(worktreePath: string, url: string): boolean {
  const port = localPort(url);
  if (port === null) return false;
  const projectKey = normalizePath(worktreePath);
  const owner = livePortOwners.get(port);
  if (owner === undefined || owner.projectKey === projectKey) return false;
  const entry = domain.read().projects[owner.projectKey]?.[owner.entryId];
  return entry?.ports.some((claim) => claim.port === port && claim.measured === 'live') === true;
}

export function entryForFolder(worktreePath: string, folder: string): ServerBookEntry | undefined {
  const key = normalizePath(folder);
  return serverBookEntries(worktreePath).find((entry) => entry.folder === key);
}

function mutate(
  worktreePath: string,
  entryId: string,
  change: (entry: ServerBookEntry) => ServerBookEntry,
): void {
  const projectKey = normalizePath(worktreePath);
  domain.update((state) => {
    const entries = state.projects[projectKey];
    const entry = entries?.[entryId];
    if (entry === undefined) return state;
    return {
      projects: {
        ...state.projects,
        [projectKey]: { ...entries, [entryId]: change(entry) },
      },
    };
  });
}

/** Never merges: a second claim for a known folder goes through `discriminatePortReport`. */
export function createServerEntry(
  worktreePath: string,
  input: { folder: string; port: number; ownership: ServerAttribution },
): ServerBookEntry {
  const projectKey = normalizePath(worktreePath);
  const entry: ServerBookEntry = {
    id: randomUUID(),
    folder: normalizePath(input.folder),
    ownership: input.ownership,
    ports: [{ port: input.port, measured: 'unverified', everLive: false }],
    everMeasuredLive: false,
  };
  if (removedProjects.has(projectKey)) return entry;
  domain.update((state) => ({
    projects: {
      ...state.projects,
      [projectKey]: { ...state.projects[projectKey], [entry.id]: entry },
    },
  }));
  return entry;
}

export function extendServerEntry(worktreePath: string, entryId: string, port: number): void {
  mutate(worktreePath, entryId, (entry) =>
    entry.ports.some((p) => p.port === port)
      ? entry
      : { ...entry, ports: [...entry.ports, { port, measured: 'unverified', everLive: false }] },
  );
}

export function moveServerEntryPort(
  worktreePath: string,
  entryId: string,
  move: { from: number; to: number },
): void {
  mutate(worktreePath, entryId, (entry) => ({
    ...entry,
    ports: entry.ports.map((p) =>
      p.port === move.from ? { port: move.to, measured: 'unverified', everLive: false } : p,
    ),
  }));
}

export function recordPortMeasurement(
  worktreePath: string,
  entryId: string,
  port: number,
  measured: ServerPortMeasurement,
  listener?: PortListener,
  observation?: { verified: boolean; current(): boolean },
): boolean {
  if (observation !== undefined && !observation.current()) return false;
  const projectKey = normalizePath(worktreePath);
  if (!domain.read().projects[projectKey]?.[entryId]?.ports.some((claim) => claim.port === port)) return false;
  const prior = livePortOwners.get(port);
  mutate(worktreePath, entryId, (entry) => ({
    ...entry,
    everMeasuredLive: entry.everMeasuredLive || measured === 'live',
    ports: entry.ports.map((p) => {
      if (p.port !== port) return p;
      const { listener: _stale, ...kept } = p;
      return {
        ...kept,
        measured,
        everLive: p.everLive || measured === 'live',
        ...(listener === undefined ? {} : { listener }),
      };
    }),
  }));
  if (measured === 'live') {
    if (observation?.verified === false) return false;
    livePortOwners.set(port, { projectKey, entryId });
    advanceMeasurement(port);
    return prior?.projectKey !== projectKey || prior.entryId !== entryId;
  }
  if (prior?.projectKey === projectKey && prior.entryId === entryId) {
    advanceMeasurement(port);
    return livePortOwners.delete(port);
  }
  return false;
}

export function setServerEntryOwnership(
  worktreePath: string,
  entryId: string,
  ownership: ServerAttribution,
): void {
  mutate(worktreePath, entryId, (entry) =>
    entry.ownership === ownership ? entry : { ...entry, ownership },
  );
}

/** Only a retired starter comes out this way (ONL-2152); a dead claim stays as the Start prompt's evidence. */
export function removeServerEntry(worktreePath: string, entryId: string): void {
  const projectKey = normalizePath(worktreePath);
  domain.update((state) => {
    const entries = state.projects[projectKey];
    if (entries?.[entryId] === undefined) return state;
    const { [entryId]: _removed, ...rest } = entries;
    return { projects: { ...state.projects, [projectKey]: rest } };
  });
}

/** Only for a worktree being removed (ONL-2152); a live project's dead claims stay. */
export function forgetServerBookProject(worktreePath: string): void {
  const projectKey = normalizePath(worktreePath);
  invalidatePortMeasurements(worktreePath);
  removedProjects.add(projectKey);
  domain.update((state) => {
    if (state.projects[projectKey] === undefined) return state;
    const { [projectKey]: _removed, ...projects } = state.projects;
    return { projects };
  });
}

export type PortReportReading =
  | { kind: 'known' }
  | { kind: 'extend' }
  | { kind: 'move'; deadPort: number; pairedMeasurement: 'dead' | 'stranger' };

export function discriminatePortReport(
  claimedPorts: readonly number[],
  newPort: number,
  measured: ReadonlyMap<number, ServerPortMeasurement>,
): PortReportReading {
  if (claimedPorts.includes(newPort)) return { kind: 'known' };
  const dead = claimedPorts.find((port) => measured.get(port) !== 'live');
  if (dead === undefined) return { kind: 'extend' };
  return {
    kind: 'move',
    deadPort: dead,
    pairedMeasurement: measured.get(dead) === 'stranger' ? 'stranger' : 'dead',
  };
}

export function resetServerBookCache(): void {
  domain.reset();
  removedProjects.clear();
  livePortOwners.clear();
  measurementVersions.clear();
}
