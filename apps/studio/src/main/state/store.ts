import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { decodeStateFile, eraseStateFile, writeStateFile } from './file.js';
import { stateRoot } from './root.js';

/** Where a domain reports a file it could not read, set aside or save. */
export interface StateFaultLog {
  error(msg: string, fields?: Record<string, unknown>): void;
}

/** Until `reportStateFaultsTo` runs, a fault is dropped. */
const UNREPORTED: StateFaultLog = { error: () => undefined };

let logger = UNREPORTED;

export function reportStateFaultsTo(log: StateFaultLog): void {
  logger = log;
}

export interface DomainSpec<T> {
  name: string;
  version: number;
  fallback: () => T;
  readFuture?: (data: unknown) => T;
  /** `fromVersion` 0 is a pre-envelope file, the whole parsed value as `data`; throwing quarantines it. */
  migrate?: (data: unknown, fromVersion: number) => T;
  root?: () => string;
  debounceMs?: number;
}

export interface Domain<T> {
  read(): T;
  /** The last read fell back because the file could not be read or decoded, not because it was absent (ONL-2499). */
  degraded(): boolean;
  /** Throws on a failed write only when undebounced; a debounced write logs instead. */
  write(next: T): void;
  update(fn: (current: T) => T): void;
  subscribe(listener: (value: T) => void): () => void;
  flush(): void;
  erase(): void;
  reset(): void;
}

const registry = new Set<Domain<unknown>>();

export function defineDomain<T>(spec: DomainSpec<T>): Domain<T> {
  const resolveRoot = spec.root ?? stateRoot;
  // Resolved per call: main's modules are imported before `app.whenReady()`, so a captured path is frozen.
  const filePath = (): string => join(resolveRoot(), `${spec.name}.json`);

  let cache: T | undefined;
  let fellBack = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sealed = false;
  const listeners = new Set<(value: T) => void>();

  const quarantine = (path: string, why: string): void => {
    const aside = `${path}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      renameSync(path, aside);
      logger.error('state file set aside; starting fresh', { name: spec.name, why, aside });
    } catch (err) {
      logger.error('state file could not be set aside', { name: spec.name, why, error: err });
    }
  };

  const decode = (parsed: unknown): { value: T; migrated: boolean } => {
    const decoded = decodeStateFile(parsed, spec.version);
    if (decoded.kind === 'future') {
      let value = spec.fallback();
      try {
        if (spec.readFuture !== undefined) value = spec.readFuture(decoded.data);
      } catch {
        value = spec.fallback();
      }
      return { value, migrated: false };
    }
    const { version, data } = decoded;
    if (version === spec.version) return { value: data as T, migrated: false };
    if (!spec.migrate) throw new Error('unversioned file with no migration');
    return { value: spec.migrate(data, version), migrated: true };
  };

  const load = (): T => {
    if (cache !== undefined) return cache;
    const path = filePath();

    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch (err) {
      // Absent or unreadable, never quarantined: renaming bytes never seen destroys the only copy.
      // Absent is a real empty state; unreadable is a read nothing downstream should trust (ONL-2499).
      fellBack = (err as NodeJS.ErrnoException).code !== 'ENOENT';
      cache = spec.fallback();
      return cache;
    }

    try {
      const decoded = decode(JSON.parse(raw) as unknown);
      fellBack = false;
      cache = decoded.value;
      // Written back, or a clock-stamping migration reruns every launch and re-stamps every project as just-opened (ONL-1913).
      if (decoded.migrated) {
        const written = persist();
        if (!written.ok) {
          logger.error('migration could not be saved', { name: spec.name, error: written.err });
        }
      }
    } catch (err) {
      quarantine(path, `could not be read (${String(err)})`);
      fellBack = true;
      cache = spec.fallback();
    }
    return cache;
  };

  const persist = (): { ok: true } | { ok: false; err: unknown } => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (cache === undefined) return { ok: true };
    // Sealed is not a failure: the write was never meant to land.
    if (sealed) return { ok: true };
    try {
      writeStateFile(filePath(), spec.version, cache);
      return { ok: true };
    } catch (err) {
      return { ok: false, err };
    }
  };

  const domain: Domain<T> = {
    read: load,

    degraded() {
      load();
      return fellBack;
    },

    write(next) {
      fellBack = false;
      cache = next;
      for (const listener of listeners) listener(next);

      if (spec.debounceMs !== undefined && spec.debounceMs > 0) {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          const result = persist();
          if (!result.ok) {
            logger.error('write failed', { name: spec.name, error: result.err });
          }
        }, spec.debounceMs);
        return;
      }

      const result = persist();
      if (!result.ok) throw result.err;
    },

    update(fn) {
      domain.write(fn(load()));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    flush() {
      if (timer === undefined) return;
      const result = persist();
      if (!result.ok) logger.error('flush failed', { name: spec.name, error: result.err });
    },

    erase() {
      // The seal outlives the unlink: the quit flush and a still-live renderer would write the file back (ONL-1944).
      sealed = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      fellBack = false;
      cache = spec.fallback();
      eraseStateFile(filePath(), spec.version);
    },

    reset() {
      // Flushes first: clearing the timer alone discarded a pending debounced write with no error anywhere.
      domain.flush();
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      fellBack = false;
      cache = undefined;
    },
  };

  registry.add(domain as Domain<unknown>);
  return domain;
}

export function flushAllDomains(): void {
  for (const domain of registry) domain.flush();
}
