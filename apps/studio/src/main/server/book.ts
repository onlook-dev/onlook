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
  return Object.entries(domain.read().projects).some(
    ([otherProjectKey, entries]) =>
      Object.values(entries).some((entry) =>
        entry.ports.some((claim) => claim.port === port && claim.measured === 'live'),
      ) && normalizePath(otherProjectKey) !== projectKey,
  );
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
): void {
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
}
