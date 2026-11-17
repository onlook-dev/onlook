import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { ProjectSetupDefinition, ProjectSetupFailure, ProjectSetupSnapshot, VersionedProjectSetup } from '@studio/events';
import { t } from '@studio/i18n';
import { canonicalPath } from '../lib/canonical-path.js';
import { defineDomain } from '../state/store.js';

export interface SetupRecord {
  saved: VersionedProjectSetup | null;
  verified: VersionedProjectSetup | null;
  failure: ProjectSetupFailure | null;
  installFingerprint: string | null;
}

interface StoredSetupRecord extends SetupRecord { paths?: string[] }

export const emptyRecord = (): SetupRecord => ({ saved: null, verified: null, failure: null, installFingerprint: null });

/** The `revision` a decode failure carries, which tells an empty record that failed to load from one that was never written (ONL-2499). */
export const INVALID_RECORD_REVISION = 'invalid';

const invalidRecord = (): SetupRecord => ({
  ...emptyRecord(),
  failure: { revision: INVALID_RECORD_REVISION, stage: 'prepare', command: '', reason: t('projectSetup.failure.invalidRecord'), outputTail: '', elapsedMs: 0 },
});

export function containedPath(root: string, path: string): string {
  if (!path || isAbsolute(path) || path.includes('\0') || path.split('/').includes('..')) throw new Error(t('projectSetup.failure.pathOutsideProject'));
  const base = realpathSync(root);
  const target = resolve(base, path);
  let existing = target;
  while (true) {
    try {
      lstatSync(existing);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = dirname(existing);
      if (parent === existing) throw error;
      existing = parent;
      continue;
    }
    const real = realpathSync(existing);
    const step = relative(base, real);
    if (step.startsWith('..') || isAbsolute(step)) throw new Error(t('projectSetup.failure.pathEscape'));
    break;
  }
  return target;
}

function validateDefinition(value: unknown): ProjectSetupDefinition {
  const record = value as ProjectSetupDefinition | null;
  if (!record || typeof record.prepare !== 'string' || record.prepare.length > 65536 ||
    typeof record.install?.script !== 'string' || record.install.script.length > 65536 ||
    !Array.isArray(record.install.inputs) || !Array.isArray(record.install.outputs) ||
    ![...record.install.inputs, ...record.install.outputs].every((path) => typeof path === 'string' && path.length > 0 && !isAbsolute(path) && !path.split('/').includes('..') && !path.includes('\0')) ||
    !Array.isArray(record.servers) || record.servers.length === 0 || record.servers.length > 32 ||
    Object.keys(record).some((key) => !['prepare', 'install', 'servers'].includes(key)) ||
    Object.keys(record.install).some((key) => !['script', 'inputs', 'outputs'].includes(key))) throw new Error(t('projectSetup.failure.invalidDefinition'));
  const ids = new Set<string>();
  const folders = new Set<string>();
  const ports = new Set<number>();
  for (const server of record.servers) {
    if (!server || typeof server.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(server.id) || typeof server.cwd !== 'string' || !server.cwd || isAbsolute(server.cwd) || server.cwd.split('/').includes('..') || server.cwd.includes('\0') ||
      typeof server.start !== 'string' || !server.start.trim() || server.start.length > 65536 || !Number.isInteger(server.port) || server.port < 1 || server.port > 65535 ||
      Object.keys(server).some((key) => !['id', 'cwd', 'start', 'port'].includes(key)) ||
      ids.has(server.id) || folders.has(resolve('/', server.cwd)) || ports.has(server.port)) throw new Error(t('projectSetup.failure.invalidServer'));
    ids.add(server.id);
    folders.add(resolve('/', server.cwd));
    ports.add(server.port);
  }
  return {
    prepare: record.prepare,
    install: { script: record.install.script, inputs: [...record.install.inputs], outputs: [...record.install.outputs] },
    servers: record.servers.map(({ id, cwd, start, port }) => ({ id, cwd, start, port })),
  };
}

export function validatePaths(root: string, definition: ProjectSetupDefinition): void {
  const folders = new Set<string>();
  for (const server of definition.servers) {
    const folder = canonicalPath(containedPath(root, server.cwd));
    if (folders.has(folder)) throw new Error(t('projectSetup.failure.duplicateFolder'));
    folders.add(folder);
  }
  for (const path of [...definition.install.inputs, ...definition.install.outputs]) containedPath(root, path);
}

export function versionDefinition(value: unknown): VersionedProjectSetup {
  const definition = validateDefinition(value);
  return { revision: createHash('sha256').update(JSON.stringify(definition)).digest('hex'), definition };
}

function decodeVersion(value: unknown): VersionedProjectSetup | null {
  if (value === null) return null;
  const record = value as VersionedProjectSetup;
  const decoded = versionDefinition(record?.definition);
  if (record.revision !== decoded.revision) throw new Error(t('projectSetup.failure.invalidRevision'));
  return decoded;
}

export function createSetupState(root?: () => string) {
  const domain = defineDomain<Record<string, StoredSetupRecord>>({ name: 'project-setup', version: 1, fallback: () => ({}), ...(root ? { root } : {}) });
  const aliases = new Map<string, string>();
  const key = (cwd: string): string => {
    const canonical = canonicalPath(cwd);
    const lexical = resolve(cwd);
    const data = domain.read();
    let missing = false;
    try { realpathSync(cwd); } catch { missing = true; }
    let found = Object.hasOwn(data, canonical) ? canonical : missing ? aliases.get(lexical) : undefined;
    if (!found && missing) found = Object.entries(data).find(([, record]) => Array.isArray(record?.paths) && record.paths.includes(lexical))?.[0];
    if (!found && missing) {
      let parent = dirname(lexical);
      while (true) {
        try {
          const candidate = resolve(realpathSync(parent), relative(parent, lexical));
          if (Object.hasOwn(data, candidate)) found = candidate;
          break;
        } catch {
          const next = dirname(parent);
          if (next === parent) break;
          parent = next;
        }
      }
    }
    const resolved = found ?? canonical;
    aliases.set(lexical, resolved);
    return resolved;
  };
  return {
    key,
    read(cwd: string): SetupRecord {
      // A file that failed to load reads as every project being new; the invalid marker keeps that out of the approval grant (ONL-2499).
      if (domain.degraded()) return invalidRecord();
      const raw = domain.read()?.[key(cwd)];
      if (!raw) return emptyRecord();
      try {
        const saved = decodeVersion(raw.saved);
        const verified = decodeVersion(raw.verified);
        const failure = raw.failure;
        if (failure !== null && (!failure || typeof failure.revision !== 'string' || !['prepare', 'install', 'start', 'ready', 'stop'].includes(failure.stage) || typeof failure.command !== 'string' || typeof failure.reason !== 'string' || typeof failure.outputTail !== 'string' || !Number.isFinite(failure.elapsedMs) || failure.elapsedMs < 0 ||
          (failure.serverId !== undefined && typeof failure.serverId !== 'string') ||
          (failure.signal !== undefined && typeof failure.signal !== 'string') ||
          (failure.exitCode !== undefined && !Number.isInteger(failure.exitCode)))) throw new Error(t('projectSetup.failure.invalidFailure'));
        return { saved, verified, failure, installFingerprint: typeof raw.installFingerprint === 'string' ? raw.installFingerprint : null };
      } catch {
        return invalidRecord();
      }
    },
    write(cwd: string, record: SetupRecord) {
      const canonical = key(cwd);
      domain.update((data) => ({ ...data, [canonical]: { ...record, paths: [...new Set([
        ...(Array.isArray(data[canonical]?.paths) ? data[canonical]!.paths! : []), canonical, ...[...aliases].filter(([, target]) => target === canonical).map(([path]) => path),
      ])] } }));
    },
    forget(cwd: string) {
      const canonical = key(cwd);
      const data = domain.read();
      if (data == null || !Object.hasOwn(data, canonical)) return;
      const next = { ...data };
      delete next[canonical];
      domain.write(next);
      for (const [path, target] of aliases) if (target === canonical) aliases.delete(path);
    },
    reset() { aliases.clear(); domain.reset(); },
  };
}

export type SetupState = ReturnType<typeof createSetupState>;
export const setupState = createSetupState();
export function snapshotOf(record: SetupRecord, state?: ProjectSetupSnapshot['state']): ProjectSetupSnapshot {
  return { saved: record.saved, verified: record.verified, failure: record.failure, state: state ?? (record.failure ? 'failed' : 'idle') };
}
