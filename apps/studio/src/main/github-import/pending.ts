import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineDomain } from '../state/store.js';
import { log } from '../log/index.js';

interface PendingClone { path: string; nonce: string }
const pending = defineDomain<PendingClone[]>({ name: 'github-pending-clones', version: 1, fallback: () => [] });
const MARKER = '.onlook-clone-in-progress';
const logger = log('github-import');

function forget(path: string): void {
  try { pending.write(entries().filter((item) => item.path !== path)); }
  catch { logger.warn('Could not update interrupted clone journal'); }
}

function entries(): PendingClone[] {
  const value: unknown = pending.read();
  return Array.isArray(value) ? value.filter((item): item is PendingClone =>
    item !== null && typeof item === 'object' && typeof item.path === 'string' && typeof item.nonce === 'string') : [];
}

export async function trackClone(path: string): Promise<void> {
  const nonce = randomUUID();
  await writeFile(join(path, MARKER), nonce, { mode: 0o600, flag: 'wx' });
  pending.write([...entries(), { path, nonce }]);
}

export async function completeClone(path: string): Promise<void> {
  await rm(join(path, MARKER), { force: true });
  forget(path);
}

export async function cleanupPendingClones(): Promise<void> {
  for (const item of entries()) {
    try {
      if (await readFile(join(item.path, MARKER), 'utf8') !== item.nonce) continue;
      await rm(item.path, { recursive: true, force: true });
      forget(item.path);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        forget(item.path);
      }
    }
  }
}
