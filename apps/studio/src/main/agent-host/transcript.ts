import type { StudioEvent } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { log } from '../log/index.js';
import { stateRoot } from '../state/root.js';
import type { SessionHarness } from './backend.js';
import { TranscriptClient } from './transcript-client.js';

const logger = log('transcripts');
let client: TranscriptClient | undefined;
const canonicalProjects = new Map<string, string>();
const projectGenerations = new Map<string, number>();
let writers = new WeakMap<readonly StudioEvent[], { cwd: string; generation: number }>();

function projectPath(cwd: string): string {
  const cached = canonicalProjects.get(cwd);
  if (cached !== undefined) return cached;
  const canonical = canonicalPath(cwd);
  canonicalProjects.set(cwd, canonical);
  return canonical;
}

function persistence(): TranscriptClient {
  if (client === undefined) {
    const source = import.meta.url.endsWith('.ts');
    const workerUrl = new URL(source ? './transcript-worker.ts' : './transcript-worker.js', import.meta.url);
    client = new TranscriptClient(stateRoot(), workerUrl, (error) => logger.error('transcript persistence failed', { error }));
  }
  return client;
}

export function readTranscript(cwd: string, harness: SessionHarness): StudioEvent[] {
  return persistence().read(projectPath(cwd), harness);
}

export function writeTranscript(cwd: string, harness: SessionHarness, events: readonly StudioEvent[]): void {
  const path = projectPath(cwd);
  const generation = projectGenerations.get(path) ?? 0;
  const owner = writers.get(events);
  if (owner !== undefined && (owner.cwd !== path || owner.generation !== generation)) return;
  writers.set(events, { cwd: path, generation });
  persistence().write(path, harness, events);
}

export function clearTranscript(cwd: string, harness: SessionHarness): void {
  persistence().clear(projectPath(cwd), harness);
}

export function forgetProjectTranscripts(cwd: string): void {
  const path = projectPath(cwd);
  persistence().forget(path);
  projectGenerations.set(path, (projectGenerations.get(path) ?? 0) + 1);
}

export function reopenProjectTranscripts(cwd: string): void {
  client?.reopen(cwd);
  const path = canonicalPath(cwd);
  if (path !== cwd) client?.reopen(path);
  canonicalProjects.set(cwd, path);
}

export function readAllTranscripts(): Record<string, StudioEvent[]> {
  return persistence().all();
}

export function transcriptRootsComplete(): boolean {
  return persistence().rootsComplete();
}

export function flushTranscripts(): Promise<void> {
  return client?.flush() ?? Promise.resolve();
}

export function shutdownTranscripts(): Promise<void> {
  return client?.close() ?? Promise.resolve();
}

export function transcriptPersistenceStatus(): ReturnType<TranscriptClient['status']> {
  return client?.status() ?? { pendingProjects: 0, error: undefined, readOnlyProjects: [] };
}

export function resetTranscriptCache(): void {
  client?.reset();
  client = undefined;
  canonicalProjects.clear();
  projectGenerations.clear();
  writers = new WeakMap();
}
