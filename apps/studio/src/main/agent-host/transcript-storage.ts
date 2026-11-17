import type { StudioEvent } from '@studio/events';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync, readdirSync, renameSync } from 'node:fs';
import { basename, join } from 'node:path';
import { canonicalPath } from '../lib/canonical-path.js';
import { canWriteStateFile, eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import type { SessionHarness } from './backend.js';
import { isStoredHarness, STORED_HARNESSES } from './harness.js';
import { transcriptKey, type ProjectTranscripts } from './transcript-protocol.js';

export const TRANSCRIPT_FILE_VERSION = 1;
const PROJECT_QUARANTINE = /^[a-f0-9]{64}\.json\.corrupt-[a-f0-9-]+$/;

export function transcriptProjectPaths(root: string, cwd: string): string[] {
  const path = transcriptFilePath(root, cwd);
  const directory = join(root, 'transcripts');
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [path];
    throw error;
  }
  return [path, ...names.filter(name => name.startsWith(`${basename(path)}.corrupt-`) && PROJECT_QUARANTINE.test(name))
    .map(name => join(directory, name))];
}
export const TRANSCRIPT_SAVE_DELAY_MS = 1_500;

export function transcriptFilePath(root: string, cwd: string): string {
  const hash = createHash('sha256').update(cwd).digest('hex');
  return join(root, 'transcripts', `${hash}.json`);
}

function eventsFrom(value: unknown): StudioEvent[] {
  if (!Array.isArray(value)) throw new Error('invalid transcript events');
  if (!value.every((event: unknown) => typeof event === 'object' && event !== null &&
    typeof (event as StudioEvent).seq === 'number' && typeof (event as StudioEvent).type === 'string')) {
    throw new Error('invalid transcript event');
  }
  return value as StudioEvent[];
}

function projectFrom(value: unknown): ProjectTranscripts {
  if (typeof value !== 'object' || value === null) throw new Error('invalid transcript Project');
  const data = value as Partial<ProjectTranscripts>;
  if (typeof data.cwd !== 'string' || typeof data.byHarness !== 'object' || data.byHarness === null) {
    throw new Error('invalid transcript ownership');
  }
  const byHarness: ProjectTranscripts['byHarness'] = {};
  for (const harness of STORED_HARNESSES) {
    const rows = data.byHarness[harness];
    if (rows !== undefined) byHarness[harness] = eventsFrom(rows);
  }
  return { cwd: data.cwd, byHarness };
}

function recoverProjectFile(path: string): ReturnType<typeof readStateFile> {
  try {
    return readStateFile(path, TRANSCRIPT_FILE_VERSION);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    renameSync(path, `${path}.corrupt-${randomUUID()}`);
    return { kind: 'missing' };
  }
}

function eventContent(event: StudioEvent): string {
  return JSON.stringify(Object.entries(event).filter(([key]) => key !== 'seq').sort(([left], [right]) => left.localeCompare(right)));
}

function eventKeys(events: StudioEvent[]): string[] {
  const occurrences = new Map<string, number>();
  return events.map((event) => {
    const identity = eventContent(event);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return JSON.stringify([identity, occurrence]);
  });
}

function wireReferences(event: StudioEvent): string[] {
  const references: string[] = [];
  if ('turnId' in event) references.push(`turn:${event.turnId}`);
  if ('blockId' in event) references.push(`block:${event.blockId}`);
  if ('toolCallId' in event) references.push(`tool:${event.toolCallId}`);
  if ('parentToolUseId' in event && event.parentToolUseId !== undefined) references.push(`tool:${event.parentToolUseId}`);
  if ('messageId' in event && event.messageId !== undefined) references.push(`message:${event.messageId}`);
  if ('requestId' in event) references.push(`request:${event.requestId}`);
  if ('agentId' in event && event.agentId !== undefined) references.push(`agent:${event.agentId}`);
  return references;
}

function mergeEvents(legacy: StudioEvent[], current: StudioEvent[]): StudioEvent[] {
  const legacyKeys = eventKeys(legacy);
  const currentKeys = eventKeys(current);
  const legacyKeySet = new Set(legacyKeys);
  const currentKeySet = new Set(currentKeys);
  const legacyReferences = new Set(legacy.flatMap((event, index) => currentKeySet.has(legacyKeys[index]!) ? [] : wireReferences(event)));
  for (const [index, event] of current.entries()) {
    if (!legacyKeySet.has(currentKeys[index]!) && wireReferences(event).some((reference) => legacyReferences.has(reference))) {
      throw new Error('conflicting transcript migration identity');
    }
  }
  const eventIds = new Map<string, string>();
  for (const events of [legacy, current]) {
    for (const event of events) {
      if (typeof event.eventId !== 'string') continue;
      const content = eventContent(event);
      const previous = eventIds.get(event.eventId);
      if (previous !== undefined && previous !== content) throw new Error('conflicting transcript migration identity');
      eventIds.set(event.eventId, content);
    }
  }
  const currentIndices = new Map(currentKeys.map((key, index) => [key, index]));
  const merged: StudioEvent[] = [];
  const append = (events: StudioEvent[], start: number, end: number): void => {
    for (let index = start; index < end; index++) {
      const event = events[index];
      if (event !== undefined) merged.push(event);
    }
  };
  let legacyStart = 0;
  let currentStart = 0;
  for (const [index, key] of legacyKeys.entries()) {
    const currentIndex = currentIndices.get(key);
    if (currentIndex === undefined) continue;
    if (currentIndex < currentStart) throw new Error('conflicting transcript migration order');
    append(legacy, legacyStart, index);
    append(current, currentStart, currentIndex + 1);
    legacyStart = index + 1;
    currentStart = currentIndex + 1;
  }
  append(legacy, legacyStart, legacy.length);
  append(current, currentStart, current.length);
  let previous = -1;
  return merged.map((event) => {
    const seq = Math.max(event.seq, previous + 1);
    previous = seq;
    return seq === event.seq ? event : { ...event, seq };
  });
}

export class TranscriptStorage {
  private readonly root: string;
  private readonly projects = new Map<string, ProjectTranscripts>();
  private readonly dirty = new Map<string, number>();
  private readonly sealed = new Set<string>();
  private loaded = false;

  constructor(root: string) {
    this.root = root;
  }

  private loadProject(cwd: string): ProjectTranscripts {
    const cached = this.projects.get(cwd);
    if (cached !== undefined) return cached;
    const path = transcriptFilePath(this.root, cwd);
    const file = recoverProjectFile(path);
    if (file.kind === 'future') throw new Error('newer transcript Project is read-only');
    const project = file.kind === 'missing' ? { cwd, byHarness: {} } : projectFrom(file.data);
    if (project.cwd !== cwd) throw new Error('transcript ownership mismatch');
    this.projects.set(cwd, project);
    return project;
  }

  private initialise(): void {
    if (this.loaded) return;
    let names: string[];
    try {
      names = readdirSync(join(this.root, 'transcripts'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      names = [];
    }
    for (const name of names) {
      if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
      try {
        const path = join(this.root, 'transcripts', name);
        const file = readStateFile(path, TRANSCRIPT_FILE_VERSION);
        if (file.kind !== 'data') continue;
        const project = projectFrom(file.data);
        if (transcriptFilePath(this.root, project.cwd) !== path) throw new Error('transcript filename ownership mismatch');
        this.projects.set(project.cwd, project);
      } catch {
        continue;
      }
    }
    this.loaded = true;
  }

  migrate(): void {
    this.initialise();
    const source = join(this.root, 'transcripts.json');
    const legacy = readStateFile(source, 2);
    if (legacy.kind === 'missing') {
      this.retireTombstones();
      return;
    }
    if (legacy.kind === 'future') return;
    if (legacy.version !== 1 && legacy.version !== 2) throw new Error('unsupported legacy transcript version');
    const data = legacy.data as { byWorkspace?: unknown } | null;
    if (typeof data?.byWorkspace !== 'object' || data.byWorkspace === null || Array.isArray(data.byWorkspace)) {
      throw new Error('invalid legacy transcripts');
    }
    const destinations = new Map<string, ProjectTranscripts>();
    let complete = true;
    for (const [key, value] of Object.entries(data.byWorkspace)) {
      try {
        const delimiter = key.lastIndexOf('::');
        const suffix = delimiter < 0 ? 'claude' : key.slice(delimiter + 2);
        if (!isStoredHarness(suffix)) throw new Error('invalid legacy transcript Harness');
        const cwd = canonicalPath(delimiter < 0 ? key : key.slice(0, delimiter));
        const project = destinations.get(cwd) ?? { cwd, byHarness: {} };
        project.byHarness[suffix] = mergeEvents(project.byHarness[suffix] ?? [], eventsFrom(value));
        destinations.set(cwd, project);
      } catch {
        complete = false;
      }
    }
    let failure: unknown;
    for (const [cwd, legacyProject] of destinations) {
      try {
        const path = transcriptFilePath(this.root, cwd);
        if (this.sealed.has(cwd)) {
          complete = false;
          continue;
        }
        const existing = readStateFile(path, TRANSCRIPT_FILE_VERSION);
        if (existing.kind === 'future') {
          complete = false;
          continue;
        }
        const stored = existing.kind === 'missing' ? undefined : projectFrom(existing.data);
        if (stored !== undefined && stored.cwd !== cwd) throw new Error('transcript migration ownership mismatch');
        const current = this.projects.get(cwd) ?? stored;
        const project: ProjectTranscripts = { cwd, byHarness: { ...current?.byHarness } };
        for (const harness of STORED_HARNESSES) {
          const rows = legacyProject.byHarness[harness];
          if (rows !== undefined) project.byHarness[harness] = mergeEvents(rows, current?.byHarness[harness] ?? []);
        }
        this.projects.set(cwd, project);
        if (!isDeepStrictEqual(stored, project) && !writeStateFile(path, TRANSCRIPT_FILE_VERSION, project)) {
          complete = false;
          continue;
        }
        const verified = readStateFile(path, TRANSCRIPT_FILE_VERSION);
        if (verified.kind !== 'data') throw new Error('transcript migration destination did not persist');
        if (!isDeepStrictEqual(projectFrom(verified.data), project)) {
          throw new Error('transcript migration verification mismatch');
        }
      } catch (error) {
        complete = false;
        failure = error;
      }
    }
    if (complete) {
      if (!eraseStateFile(source, 2)) throw new Error('newer transcript migration source is read-only');
      this.retireTombstones();
    }
    if (failure !== undefined) throw failure;
  }

  private retireTombstones(): void {
    for (const [cwd, project] of this.projects) {
      if (Object.keys(project.byHarness).length !== 0 || this.dirty.has(cwd)) continue;
      if (!eraseStateFile(transcriptFilePath(this.root, cwd), TRANSCRIPT_FILE_VERSION)) continue;
      this.projects.delete(cwd);
    }
  }

  read(cwd: string, harness: SessionHarness): StudioEvent[] {
    this.initialise();
    return this.loadProject(cwd).byHarness[harness] ?? [];
  }

  all(): Record<string, StudioEvent[]> {
    this.initialise();
    const result: Record<string, StudioEvent[]> = {};
    for (const project of this.projects.values()) {
      for (const harness of STORED_HARNESSES) {
        const rows = project.byHarness[harness];
        if (rows !== undefined) result[transcriptKey(project.cwd, harness)] = rows;
      }
    }
    return result;
  }

  rootsComplete(): boolean {
    try {
      const source = readStateFile(join(this.root, 'transcripts.json'), 2);
      if (source.kind !== 'missing') return false;
      let names: string[];
      try {
        names = readdirSync(join(this.root, 'transcripts'));
      } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'ENOENT';
      }
      for (const name of names) {
        if (PROJECT_QUARANTINE.test(name)) return false;
        if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
        const path = join(this.root, 'transcripts', name);
        const file = readStateFile(path, TRANSCRIPT_FILE_VERSION);
        if (file.kind !== 'data' || file.version !== TRANSCRIPT_FILE_VERSION) return false;
        const project = projectFrom(file.data);
        if (transcriptFilePath(this.root, project.cwd) !== path) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  patch(cwd: string, harness: SessionHarness, start: number, rows: StudioEvent[], revision: number): void {
    this.initialise();
    if (this.sealed.has(cwd)) throw new Error('transcript Project was forgotten');
    const project = this.loadProject(cwd);
    const current = project.byHarness[harness] ?? [];
    if (!Number.isInteger(start) || start < 0 || start > current.length) throw new Error('transcript suffix is out of sequence');
    const suffix = eventsFrom(rows);
    current.length = start;
    for (const event of suffix) current.push(event);
    project.byHarness[harness] = current;
    this.dirty.set(cwd, revision);
  }

  clear(cwd: string, harness: SessionHarness): void {
    this.initialise();
    if (this.sealed.has(cwd)) throw new Error('transcript Project was forgotten');
    const path = transcriptFilePath(this.root, cwd);
    if (recoverProjectFile(path).kind === 'future') throw new Error('newer transcript Project is read-only');
    const project = this.loadProject(cwd);
    const byHarness = { ...project.byHarness, [harness]: [] };
    this.pruneLegacy(cwd, harness);
    if (!writeStateFile(path, TRANSCRIPT_FILE_VERSION, { cwd, byHarness })) {
      throw new Error('newer transcript Project is read-only');
    }
    project.byHarness = byHarness;
    this.dirty.delete(cwd);
  }

  private pruneLegacy(cwd: string, onlyHarness?: SessionHarness): void {
    const sourcePath = join(this.root, 'transcripts.json');
    const source = readStateFile(sourcePath, 2);
    if (source.kind === 'future') {
      if (onlyHarness !== undefined) return;
      throw new Error('newer transcript source is read-only');
    }
    if (source.kind === 'data') {
      if (source.version !== 1 && source.version !== 2) throw new Error('unsupported legacy transcript version');
      const data = source.data as Record<string, unknown> | null;
      if (typeof data?.byWorkspace !== 'object' || data.byWorkspace === null || Array.isArray(data.byWorkspace)) {
        throw new Error('invalid legacy transcripts');
      }
      const canonical = canonicalPath(cwd);
      const byWorkspace = Object.fromEntries(Object.entries(data.byWorkspace).filter(([key]) => {
        const delimiter = key.lastIndexOf('::');
        const harness = delimiter < 0 ? 'claude' : key.slice(delimiter + 2);
        if (!isStoredHarness(harness)) return true;
        if (onlyHarness !== undefined && harness !== onlyHarness) return true;
        return canonicalPath(delimiter < 0 ? key : key.slice(0, delimiter)) !== canonical;
      }));
      if (Object.keys(byWorkspace).length !== Object.keys(data.byWorkspace).length) {
        const record = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, unknown>;
        const pruned = 'data' in record ? { ...record, data: { ...data, byWorkspace } } : { ...record, byWorkspace };
        if (!writeStateFile(sourcePath, source.version, pruned, { inline: true })) throw new Error('transcript source pruning refused');
      }
    }
  }

  reopen(cwd: string): void {
    this.sealed.delete(cwd);
  }

  forget(cwd: string): void {
    this.initialise();
    const paths = transcriptProjectPaths(this.root, cwd);
    if (!paths.every(path => canWriteStateFile(path, TRANSCRIPT_FILE_VERSION))) throw new Error('newer transcript Project is read-only');
    this.pruneLegacy(cwd);
    this.sealed.add(cwd);
    this.projects.delete(cwd);
    this.dirty.delete(cwd);
    for (const path of paths) {
      if (!eraseStateFile(path, TRANSCRIPT_FILE_VERSION)) throw new Error('transcript forget refused');
    }
  }

  flush(): Record<string, number> {
    this.initialise();
    const revisions: Record<string, number> = {};
    let failure: unknown;
    for (const [cwd, revision] of this.dirty) {
      try {
        const project = this.projects.get(cwd);
        if (project === undefined) throw new Error('missing pending transcript');
        const path = transcriptFilePath(this.root, cwd);
        if (!writeStateFile(path, TRANSCRIPT_FILE_VERSION, project)) throw new Error('newer transcript Project is read-only');
        this.dirty.delete(cwd);
        revisions[cwd] = revision;
      } catch (error) {
        failure = error;
      }
    }
    if (failure !== undefined && Object.keys(revisions).length === 0) throw failure;
    try {
      this.migrate();
    } catch {
      return revisions;
    }
    return revisions;
  }
}
