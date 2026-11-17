// Only the batch is persisted, never the key or the host: the spike that persisted the whole request put the ingestion token on disk (ONL-2349).
// At-least-once: a kill between the 2xx and the unlink replays the batch, and the per-event `uuid` stops PostHog counting it twice.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { canWriteStateFile, eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';

// `distinct_id` is stamped at write time, so a replay keeps the person it was captured under.
export interface OutboxEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  uuid: string;
  distinct_id: string;
}

const OUTBOX_CAP_BYTES = 4 * 1024 * 1024;

export function outboxDir(): string {
  return join(stateRoot(), 'telemetry', 'outbox');
}

let seq = 0;

// Zero-padded so lexical order is capture order.
export function writeBatch(launchId: string, batch: readonly OutboxEvent[], grant: string): string | undefined {
  seq += 1;
  const path = join(outboxDir(), `${launchId}-${String(seq).padStart(6, '0')}-g${grant}.json`);
  try {
    return writeStateFile(path, 1, { batch }) ? path : undefined;
  } catch {
    // An unwritable state root drops this batch; telemetry never blocks the app.
    return undefined;
  }
}

/** The grant is in the name, so a replay excludes a batch without reading it, and a name carrying none is never sent (ONL-2904). */
export function batchGrant(path: string): string | undefined {
  return /-g([0-9a-f]{32})\.json$/.exec(path)?.[1];
}

export function removeBatch(path: string): void {
  try {
    eraseStateFile(path, 1);
  } catch {
    // Already gone or unwritable; the replay's own parse settles it.
  }
}

export function pendingBatches(): string[] {
  try {
    return readdirSync(outboxDir())
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => join(outboxDir(), name));
  } catch {
    // The outbox directory does not exist yet; nothing is pending.
    return [];
  }
}

export function readBatch(path: string): OutboxEvent[] | undefined {
  try {
    const file = readStateFile(path, 1);
    if (file.kind !== 'data') return undefined;
    const parsed = file.data as { batch?: unknown } | null;
    if (!Array.isArray(parsed?.batch)) return undefined;
    if (!parsed.batch.every((event: unknown) => {
      if (typeof event !== 'object' || event === null) return false;
      const entry = event as Partial<OutboxEvent>;
      return typeof entry.event === 'string' && typeof entry.distinct_id === 'string' && typeof entry.uuid === 'string' && typeof entry.timestamp === 'string' && typeof entry.properties === 'object' && entry.properties !== null && !Array.isArray(entry.properties);
    })) return undefined;
    return parsed.batch as OutboxEvent[];
  } catch {
    // A truncated or unreadable batch reads as absent; `enforceCap` retires it.
    return undefined;
  }
}

export function enforceCap(
  paths: readonly string[],
  capBytes: number = OUTBOX_CAP_BYTES,
): { kept: string[]; dropped: number; droppedBatches: OutboxEvent[][] } {
  const files = paths.map((path) => {
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      // Vanished between the listing and the stat.
    }
    return { path, size };
  });
  let total = files.reduce((sum, file) => sum + file.size, 0);
  let dropped = 0;
  const kept: string[] = [];
  const droppedBatches: OutboxEvent[][] = [];
  for (const file of files) {
    try {
      if (!canWriteStateFile(file.path, 1)) {
        kept.push(file.path);
        continue;
      }
    } catch {
      kept.push(file.path);
      continue;
    }
    if (total > capBytes) {
      const batch = readBatch(file.path);
      if (batch !== undefined) {
        dropped += batch.length;
        droppedBatches.push([...batch]);
      }
      removeBatch(file.path);
      total -= file.size;
      continue;
    }
    kept.push(file.path);
  }
  return { kept, dropped, droppedBatches };
}

export function resetOutboxForTesting(): void {
  seq = 0;
}
