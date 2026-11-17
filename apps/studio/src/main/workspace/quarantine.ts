import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMFORT_CHOICES, DISPLAY_NAME_SOURCES } from '@studio/events';
import type { ComfortChoice, DisplayNameSource, HeldOrigin, WorkspaceOrigin } from '@studio/events';
import { canonicalPath, pathSpellings } from '../lib/canonical-path.js';
import { isContainedIn } from '../server/owner.js';

// Every domain `defineDomain` roots here sets its file aside as `<domain>.json.corrupt-<stamp>`, so the prefix is the whole match.
const QUARANTINE_PREFIX = 'workspaces.json.corrupt-';

const ORIGINS: readonly WorkspaceOrigin[] = ['blank', 'imported', 'copied', 'duplicate'];
const HELD_ORIGINS: readonly HeldOrigin[] = ['blank', 'copied'];

/** Only the stored fields a live worktree cannot answer; `sourcePath` is a claim, not a fact (ONL-2522). */
export interface QuarantinedProject {
  workspacePath: string;
  repoIdentity: string;
  origin?: WorkspaceOrigin;
  heldOrigin?: HeldOrigin;
  baseBranch?: string;
  sourcePath?: string;
  displayName?: string;
  displayNameSource?: DisplayNameSource;
  comfort?: ComfortChoice;
  createdAt?: string;
  lastOpenedAt?: string;
}

export interface QuarantineLookup {
  /** Keyed by `canonicalPath(workspacePath)`, newest file wins. */
  projects: Map<string, QuarantinedProject>;
  workspaceNames: Map<string, string>;
  unreadable: string[];
  malformed: string[];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function toProject(value: unknown): QuarantinedProject | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  const workspacePath = text(raw['workspacePath']);
  const repoIdentity = text(raw['repoIdentity']);
  if (workspacePath === undefined || repoIdentity === undefined) return undefined;

  const project: QuarantinedProject = { workspacePath, repoIdentity };
  for (const field of ['baseBranch', 'sourcePath', 'displayName', 'createdAt', 'lastOpenedAt'] as const) {
    const value = text(raw[field]);
    if (value !== undefined) project[field] = value;
  }
  const origin = oneOf(raw['origin'], ORIGINS);
  if (origin !== undefined) project.origin = origin;
  const heldOrigin = oneOf(raw['heldOrigin'], HELD_ORIGINS);
  if (heldOrigin !== undefined) project.heldOrigin = heldOrigin;
  const displayNameSource = oneOf(raw['displayNameSource'], DISPLAY_NAME_SOURCES);
  if (displayNameSource !== undefined) project.displayNameSource = displayNameSource;
  const comfort = oneOf(raw['comfort'], COMFORT_CHOICES);
  if (comfort !== undefined) project.comfort = comfort;
  return project;
}

function bodyOf(parsed: unknown): unknown {
  const envelope = parsed as { version?: unknown; data?: unknown } | null;
  const versioned =
    typeof envelope === 'object' &&
    envelope !== null &&
    typeof envelope.version === 'number' &&
    'data' in envelope;
  return versioned ? envelope.data : parsed;
}

function projectMapOf(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  const nested = (body as { workspaces?: unknown }).workspaces;
  if (typeof nested === 'object' && nested !== null) return nested as Record<string, unknown>;
  return body as Record<string, unknown>;
}

/** A stored `sourcePath` answers `newProjectSource`, so a quarantine's is a claim; both spellings, because a folder that is gone does not canonicalise (ONL-2522, ONL-2315). */
export function acceptsStoredSourcePath(claimed: string, repoRoot: string): boolean {
  return pathSpellings(repoRoot).some((root) =>
    pathSpellings(claimed).some((path) => isContainedIn(path, root)),
  );
}

// `archivedRepos` is deliberately left behind: an import into a collapsed Archive is invisible to the user who went looking for it (ONL-2522).
function namesOf(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  const names = (body as { workspaceNames?: unknown }).workspaceNames;
  if (typeof names !== 'object' || names === null) return {};
  return names as Record<string, unknown>;
}

export function readQuarantinedProjects(root: string): QuarantineLookup {
  const lookup: QuarantineLookup = {
    projects: new Map(),
    workspaceNames: new Map(),
    unreadable: [],
    malformed: [],
  };

  let names: string[];
  try {
    names = readdirSync(root).filter((name) => name.startsWith(QUARANTINE_PREFIX));
  } catch {
    return lookup;
  }

  // The stamp is an ISO timestamp with `:` and `.` replaced, so descending by name is newest first.
  for (const name of names.sort().reverse()) {
    let raw: string;
    try {
      raw = readFileSync(join(root, name), 'utf8');
    } catch {
      lookup.unreadable.push(name);
      continue;
    }

    // Apart from a read failure: a parse failure is this file's whole content, and one of them must not take the lookup down (ONL-2522).
    let body: unknown;
    try {
      body = bodyOf(JSON.parse(raw) as unknown);
    } catch {
      lookup.malformed.push(name);
      continue;
    }

    for (const [identity, value] of Object.entries(namesOf(body))) {
      const stored = text(value);
      if (stored !== undefined && !lookup.workspaceNames.has(identity)) lookup.workspaceNames.set(identity, stored);
    }

    for (const value of Object.values(projectMapOf(body))) {
      const project = toProject(value);
      // Skipped, not thrown: a quarantined envelope failed `migrate`, so one bad record is not the file.
      if (project === undefined) continue;
      const key = canonicalPath(project.workspacePath);
      if (!lookup.projects.has(key)) lookup.projects.set(key, project);
    }
  }

  return lookup;
}
