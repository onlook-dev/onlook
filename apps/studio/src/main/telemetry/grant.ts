// The grant gates the outbox and lives outside the preference file: a batch on disk is sendable only while that file still names a boolean choice (ONL-2904).

import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { writeAtomicFile } from '../fs-atomic.js';
import { encodeStateFile, readStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';

const GRANT = /^[0-9a-f]{32}$/;

function grantPath(): string {
  return join(stateRoot(), 'telemetry', 'grant.json');
}

export function readGrant(): string | undefined {
  try {
    const file = readStateFile(grantPath(), 1);
    if (file.kind !== 'data') return undefined;
    const parsed = file.data as { grant?: unknown } | null;
    const value: unknown = parsed?.grant;
    return typeof value === 'string' && GRANT.test(value) ? value : undefined;
  } catch {
    // Unreadable or truncated: no grant, so no batch already on disk can be sent.
    return undefined;
  }
}

/** Random, never a clock reading or a count, so no later mint repeats a grant a batch on disk already carries (ONL-2904). */
export function mintGrant(): string | undefined {
  const grant = randomBytes(16).toString('hex');
  try {
    // Past the version gate a state file usually keeps: a grant this build cannot read authorizes nothing, so refusing to replace it would only brick the outbox (ONL-2904).
    writeAtomicFile(grantPath(), encodeStateFile(1, { grant }), { mode: 0o600 });
    return grant;
  } catch {
    // An unwritable state root grants nothing, so nothing is written down to send later.
    return undefined;
  }
}
