import type { StudioEvent } from '@studio/events';
import type { MessagePort } from 'node:worker_threads';
import type { SessionHarness } from './backend.js';

export type TranscriptOperation =
  | { kind: 'read'; cwd: string; harness: SessionHarness }
  | { kind: 'all' }
  | { kind: 'patch'; cwd: string; harness: SessionHarness; start: number; events: StudioEvent[]; revision: number }
  | { kind: 'clear'; cwd: string; harness: SessionHarness }
  | { kind: 'forget'; cwd: string }
  | { kind: 'reopen'; cwd: string }
  | { kind: 'flush' };

export interface TranscriptRequest {
  id: number;
  operation: TranscriptOperation;
  port?: MessagePort;
  signal?: SharedArrayBuffer;
}

export type TranscriptReply =
  | { kind: 'reply'; id: number; ok: true; value: unknown }
  | { kind: 'reply'; id: number; ok: false; error: string }
  | { kind: 'persisted'; revisions: Record<string, number> }
  | { kind: 'inventory'; rootsComplete: boolean; transcripts?: Record<string, StudioEvent[]> }
  | { kind: 'failure'; error: string };

export interface ProjectTranscripts {
  cwd: string;
  byHarness: Partial<Record<SessionHarness, StudioEvent[]>>;
}

export function transcriptKey(cwd: string, harness: SessionHarness): string {
  return `${cwd}::${harness}`;
}
