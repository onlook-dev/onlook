import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

// `resolve()` alone does not follow symlinks: on macOS `/var` and `/private/var` are two keys for one directory.
export function canonicalPath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
}

/** Both spellings one path can key under: the resolved one while it exists, the lexical one once it is gone (ONL-2315). */
export function pathSpellings(path: string): string[] {
  const canonical = canonicalPath(path);
  const lexical = resolve(path);
  return canonical === lexical ? [canonical] : [canonical, lexical];
}

// The image blob store's id-shape gate is built on 12; changing it orphans every existing blob directory.
export const WORKSPACE_HASH_LEN = 12;

// Not `workspaceTelemetryId()`: that hashes the Workspace's repo identity for telemetry and is shared by every project of one repo.
export function workspaceHash(cwd: string): string {
  return createHash('sha256').update(canonicalPath(cwd)).digest('hex').slice(0, WORKSPACE_HASH_LEN);
}

export function workspaceHashes(cwd: string): string[] {
  return pathSpellings(cwd).map((spelling) =>
    createHash('sha256').update(spelling).digest('hex').slice(0, WORKSPACE_HASH_LEN));
}
