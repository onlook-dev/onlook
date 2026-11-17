import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, jest } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const { defineDomain, flushAllDomains } = await import('./store.js');

afterAll(() => {
  cleanupTempFixtures();
});

interface Thing {
  label: string;
  count: number;
}

function makeDomain(
  name: string,
  options: { debounceMs?: number; migrate?: (data: unknown, from: number) => Thing } = {},
): { root: string; domain: ReturnType<typeof defineDomain<Thing>>; path: string } {
  const root = makeStateRoot({ name: `store-${name}` });
  const domain = defineDomain<Thing>({
    name,
    version: 2,
    fallback: () => ({ label: 'fallback', count: 0 }),
    root: () => root,
    ...(options.migrate ? { migrate: options.migrate } : {}),
    ...(options.debounceMs === undefined ? {} : { debounceMs: options.debounceMs }),
  });
  return { root, domain, path: join(root, `${name}.json`) };
}

describe('state store', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes a value and reads it back from disk', () => {
    const { domain, path } = makeDomain('roundtrip');
    domain.write({ label: 'hello', count: 1 });

    expect(existsSync(path)).toBe(true);
    domain.reset();
    expect(domain.read()).toEqual({ label: 'hello', count: 1 });
  });

  it('answers the fallback for a missing file and quarantines nothing', () => {
    const { domain, root } = makeDomain('absent');

    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
    expect(readdirSync(root).filter((f) => f.includes('.corrupt-'))).toHaveLength(0);
  });

  it('sets an unparseable file aside and preserves its bytes', () => {
    const { domain, root, path } = makeDomain('unparseable');
    writeFileSync(path, '{ not json at all');

    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });

    const aside = readdirSync(root).filter((f) => f.includes('.corrupt-'));
    expect(aside).toHaveLength(1);
    expect(readFileSync(join(root, aside[0] as string), 'utf8')).toBe('{ not json at all');
    expect(existsSync(path)).toBe(false);
  });

  it('hands a pre-envelope file to migrate as version 0, whole', () => {
    const seen: { data: unknown; from: number }[] = [];
    const { domain, path } = makeDomain('v0', {
      migrate: (data, from) => {
        seen.push({ data, from });
        return { label: (data as { label: string }).label, count: 99 };
      },
    });
    writeFileSync(path, JSON.stringify({ label: 'ancient' }));

    expect(domain.read()).toEqual({ label: 'ancient', count: 99 });
    expect(seen).toEqual([{ data: { label: 'ancient' }, from: 0 }]);
  });

  it('writes a migration back, so it does not run again on the next read', () => {
    let migrations = 0;
    const { domain, path } = makeDomain('rewrite', {
      migrate: (data, _from) => {
        migrations += 1;
        return { label: (data as { label: string }).label, count: migrations };
      },
    });
    writeFileSync(path, JSON.stringify({ label: 'legacy' }));

    expect(domain.read()).toEqual({ label: 'legacy', count: 1 });
    expect(JSON.parse(readFileSync(path, 'utf8')).version).toBe(2);

    domain.reset();
    expect(domain.read()).toEqual({ label: 'legacy', count: 1 });
    expect(migrations).toBe(1);
  });

  it('quarantines a version it has no migration for, rather than throwing', () => {
    const { domain, root, path } = makeDomain('nomigration');
    writeFileSync(path, JSON.stringify({ version: 1, data: { label: 'old', count: 1 } }));

    expect(() => domain.read()).not.toThrow();
    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
    expect(readdirSync(root).filter((f) => f.includes('.corrupt-'))).toHaveLength(1);
  });

  it('quarantines when migrate itself throws, and still answers', () => {
    const { domain, root, path } = makeDomain('badmigration', {
      migrate: () => {
        throw new Error('cannot read this');
      },
    });
    writeFileSync(path, JSON.stringify({ version: 1, data: { label: 'old', count: 1 } }));

    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
    expect(readdirSync(root).filter((f) => f.includes('.corrupt-'))).toHaveLength(1);
  });

  it('leaves a newer version unchanged across reads, migration, writes, flush and erase', () => {
    let migrations = 0;
    const { domain, path, root } = makeDomain('future', {
      debounceMs: 50,
      migrate: () => {
        migrations += 1;
        return { label: 'discarded', count: 0 };
      },
    });
    const bytes = '{ "version": 99, "data": {"unrecognised": true} }\n';
    writeFileSync(path, bytes);
    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
    domain.write({ label: 'local', count: 1 });
    domain.flush();
    domain.erase();
    domain.reset();
    expect(migrations).toBe(0);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
    expect(readdirSync(root)).toEqual(['future.json']);
  });

  it('protects newer state on a first write or erase without reading it', () => {
    for (const action of ['write', 'erase'] as const) {
      const { domain, path } = makeDomain(`future-first-${action}`);
      const bytes = '{"version":9,"data":{"label":"newer","count":5}}\n';
      writeFileSync(path, bytes);
      if (action === 'write') domain.write({ label: 'older', count: 0 });
      else domain.erase();
      expect(readFileSync(path, 'utf8')).toBe(bytes);
    }
  });

  it('does not overwrite newer bytes that arrive after the cache was loaded', () => {
    const { domain, path } = makeDomain('future-after-read');
    domain.read();
    const bytes = '{"version":9,"data":{"newField":true}}\n';
    writeFileSync(path, bytes);
    domain.update((value) => ({ ...value, count: 3 }));
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('can explicitly salvage a newer payload in memory without persisting the interpretation', () => {
    const root = makeStateRoot({ name: 'store-future-read' });
    const path = join(root, 'future-read.json');
    const bytes = '{"version":8,"data":{"label":"visible","count":2,"extra":true}}\n';
    writeFileSync(path, bytes);
    const domain = defineDomain<Thing>({
      name: 'future-read', version: 2, root: () => root,
      fallback: () => ({ label: 'fallback', count: 0 }),
      readFuture: (data) => ({ label: (data as Thing).label, count: 0 }),
    });
    expect(domain.read()).toEqual({ label: 'visible', count: 0 });
    domain.update((value) => ({ ...value, count: 7 }));
    domain.erase();
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('makes a debounced write readable immediately, without touching disk', () => {
    const { domain, path } = makeDomain('debounce-pending', { debounceMs: 5_000 });
    domain.write({ label: 'pending', count: 3 });

    expect(domain.read()).toEqual({ label: 'pending', count: 3 });
    expect(existsSync(path)).toBe(false);
  });

  it('lands a debounced write on disk once its window passes, and not before', () => {
    jest.useFakeTimers();
    const { domain, path } = makeDomain('debounce-lands', { debounceMs: 50 });
    domain.write({ label: 'pending', count: 3 });

    jest.advanceTimersByTime(49);
    expect(existsSync(path)).toBe(false);
    jest.advanceTimersByTime(1);
    expect(JSON.parse(readFileSync(path, 'utf8')).data).toEqual({ label: 'pending', count: 3 });
  });

  it('flushAllDomains writes a value still inside its debounce window', () => {
    const { domain, path } = makeDomain('flush', { debounceMs: 5_000 });
    domain.write({ label: 'quitting', count: 4 });
    expect(existsSync(path)).toBe(false);

    flushAllDomains();
    expect(JSON.parse(readFileSync(path, 'utf8')).data).toEqual({ label: 'quitting', count: 4 });
  });

  it('reset flushes a pending write rather than discarding it', () => {
    const { domain, path } = makeDomain('reset-flush', { debounceMs: 5_000 });
    domain.write({ label: 'must-survive', count: 7 });
    expect(existsSync(path)).toBe(false);

    domain.reset();
    expect(JSON.parse(readFileSync(path, 'utf8')).data).toEqual({
      label: 'must-survive',
      count: 7,
    });
    expect(domain.read()).toEqual({ label: 'must-survive', count: 7 });
  });

  it('erase leaves nothing for flushAllDomains to write back', () => {
    const { domain, path } = makeDomain('erase-flush', { debounceMs: 5_000 });
    domain.write({ label: 'pending-at-reset', count: 2 });

    domain.erase();
    flushAllDomains();
    expect(existsSync(path)).toBe(false);
  });

  it('an erased domain never writes again, debounced or not', () => {
    jest.useFakeTimers();
    const immediate = makeDomain('erase-seal-immediate');
    const debounced = makeDomain('erase-seal-debounced', { debounceMs: 50 });

    immediate.domain.erase();
    debounced.domain.erase();
    immediate.domain.write({ label: 'too-late', count: 3 });
    debounced.domain.write({ label: 'too-late', count: 3 });

    jest.runAllTimers();
    expect(existsSync(immediate.path)).toBe(false);
    expect(existsSync(debounced.path)).toBe(false);
  });

  it('reads after erase answer the fallback', () => {
    const { domain } = makeDomain('erase-reads');
    domain.write({ label: 'before', count: 9 });

    domain.erase();
    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
  });

  it('erase removes one file, not the directory around it', () => {
    const { domain, root, path } = makeDomain('erase-scope');
    domain.write({ label: 'doomed', count: 1 });
    const bystander = join(root, 'install-id');
    writeFileSync(bystander, 'keep-me', 'utf8');

    domain.erase();
    expect(existsSync(path)).toBe(false);
    expect(readFileSync(bystander, 'utf8')).toBe('keep-me');
  });

  it('writes 0600', () => {
    const { domain, path } = makeDomain('mode');
    domain.write({ label: 'private', count: 5 });

    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('update reads, applies and writes in one step', () => {
    const { domain } = makeDomain('update');
    domain.write({ label: 'start', count: 1 });
    domain.update((current) => ({ ...current, count: current.count + 1 }));

    domain.reset();
    expect(domain.read()).toEqual({ label: 'start', count: 2 });
  });

  it('notifies subscribers on write and stops after unsubscribe', () => {
    const { domain } = makeDomain('subscribe');
    const seen: Thing[] = [];
    const off = domain.subscribe((value) => seen.push(value));

    domain.write({ label: 'one', count: 1 });
    off();
    domain.write({ label: 'two', count: 2 });

    expect(seen).toEqual([{ label: 'one', count: 1 }]);
  });

  it('does not quarantine a path it cannot read', () => {
    const root = makeStateRoot({ name: 'store-unreadable' });
    mkdirSync(join(root, 'unreadable.json'), { recursive: true });
    const domain = defineDomain<Thing>({
      name: 'unreadable',
      version: 2,
      fallback: () => ({ label: 'fallback', count: 0 }),
      root: () => root,
    });

    expect(domain.read()).toEqual({ label: 'fallback', count: 0 });
    expect(readdirSync(root).filter((f) => f.includes('.corrupt-'))).toHaveLength(0);
  });
});
