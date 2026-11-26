import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { ServerPortMeasurement } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  createServerEntry,
  discriminatePortReport,
  entryForFolder,
  extendServerEntry,
  forgetServerBookProject,
  moveServerEntryPort,
  portHeldByOtherProject,
  recordPortMeasurement,
  removeServerEntry,
  resetServerBookCache,
  serverBookEntries,
} from './book.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): { root: string; worktree: string; folder: string } {
  const root = makeWorkspaceRoot({ name: `server-book-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  // Real directories: normalizePath's realpath arm only fires for paths that exist.
  const worktree = join(root, 'repo', 'main');
  const folder = worktree;
  mkdirSync(worktree, { recursive: true });
  return { root, worktree, folder };
}

describe('the server book — recording, proven first', () => {
  it('a claim reads back, folder-keyed, with its port unverified', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('claim-reads-back');
    const entry = createServerEntry(worktree, { folder, port: 5173, ownership: 'agent-started' });

    const found = entryForFolder(worktree, folder);
    expect(found?.id).toBe(entry.id);
    expect(found?.ownership).toBe('agent-started');
    expect(found?.ports).toEqual([{ port: 5173, measured: 'unverified', everLive: false }]);
    expect(found?.everMeasuredLive).toBe(false);
  });

  it('answers the same entry for a second spelling of the same folder', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('folder-identity');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'unknown' });
    const otherSpelling = join(folder, 'nested', '..');
    mkdirSync(join(folder, 'nested'), { recursive: true });
    expect(entryForFolder(worktree, otherSpelling)?.id).toBe(entry.id);
  });

  it("keeps projects apart — one worktree cannot read another's claims", () => {
    const { root, worktree, folder } = useOwnWorkspaceRoot('project-isolation');
    const otherWorktree = join(root, 'repo', 'other');
    mkdirSync(otherWorktree, { recursive: true });

    createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });
    expect(serverBookEntries(otherWorktree)).toEqual([]);
    expect(entryForFolder(otherWorktree, folder)).toBeUndefined();
  });

  it('survives a cache drop — the claims are on disk, not in the module', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('persistence');
    const entry = createServerEntry(worktree, { folder, port: 4000, ownership: 'users-own' });
    recordPortMeasurement(worktree, entry.id, 4000, 'live');

    resetServerBookCache();
    const reread = entryForFolder(worktree, folder);
    expect(reread?.id).toBe(entry.id);
    expect(reread?.ports).toEqual([{ port: 4000, measured: 'live', everLive: true }]);
    expect(reread?.everMeasuredLive).toBe(true);
  });
});

describe('portHeldByOtherProject', () => {
  it('finds a live port in another saved project without changing either book', () => {
    const { root, worktree } = useOwnWorkspaceRoot('other-project-port');
    const other = join(root, 'repo', 'preview');
    mkdirSync(other, { recursive: true });
    const entry = createServerEntry(other, { folder: other, port: 3000, ownership: 'unknown' });
    extendServerEntry(other, entry.id, 5173);
    recordPortMeasurement(other, entry.id, 5173, 'live');
    const before = serverBookEntries(other);

    resetServerBookCache();

    expect(portHeldByOtherProject(worktree, 'http://localhost:5173/design')).toBe(true);
    expect(portHeldByOtherProject(worktree, 'http://localhost:3000')).toBe(false);
    expect(portHeldByOtherProject(worktree, 'http://localhost:4000')).toBe(false);
    expect(serverBookEntries(worktree)).toEqual([]);
    expect(serverBookEntries(other)).toEqual(before);
  });

  it('still denies another project’s live port when this project has a stale live claim', () => {
    const { root, worktree, folder } = useOwnWorkspaceRoot('shared-live-port');
    const own = createServerEntry(worktree, { folder, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(worktree, own.id, 5173, 'live');
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(false);

    const other = join(root, 'repo', 'preview');
    mkdirSync(other, { recursive: true });
    const held = createServerEntry(other, { folder: other, port: 5173, ownership: 'users-own' });
    recordPortMeasurement(other, held.id, 5173, 'live');

    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(true);
  });

  it('ignores its own project under canonical, dotted, trailing-slash and symlink spellings', () => {
    const { root, worktree, folder } = useOwnWorkspaceRoot('canonical-project-port');
    mkdirSync(join(worktree, 'nested'), { recursive: true });
    const alias = join(root, 'preview-link');
    symlinkSync(worktree, alias, 'dir');
    const entry = createServerEntry(alias, { folder, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(alias, entry.id, 5173, 'live');

    for (const spelling of [worktree, `${worktree}/nested/..`, `${worktree}/`, alias]) {
      expect(portHeldByOtherProject(spelling, 'http://localhost:5173')).toBe(false);
    }
    expect(portHeldByOtherProject(join(root, 'repo', 'preview'), 'http://localhost:5173')).toBe(true);
  });

  it.each(['dead', 'stranger', 'unverified'] as const)(
    'ignores another project’s %s port even if it was previously live',
    (measurement) => {
      const { root, worktree } = useOwnWorkspaceRoot(`other-project-${measurement}-port`);
      const other = join(root, 'repo', 'preview');
      mkdirSync(other, { recursive: true });
      const entry = createServerEntry(other, { folder: other, port: 5173, ownership: 'agent-started' });
      recordPortMeasurement(other, entry.id, 5173, 'live');
      recordPortMeasurement(other, entry.id, 5173, measurement);

      expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(false);
    },
  );

  it.each([
    ['http://localhost:5173', 5173],
    ['http://127.0.0.1:5173/design', 5173],
    ['http://[::1]:5173', 5173],
    ['http://0.0.0.0:5173', 5173],
    ['http://localhost', 80],
    ['http://127.0.0.1:80', 80],
    ['http://[::1]/design', 80],
    ['https://localhost', 443],
    ['https://127.0.0.1:443', 443],
    ['https://[::1]/design', 443],
  ] as const)('uses localPort semantics for %s', (url, port) => {
    const { root, worktree } = useOwnWorkspaceRoot('local-url-port');
    const other = join(root, 'repo', 'preview');
    mkdirSync(other, { recursive: true });
    const entry = createServerEntry(other, { folder: other, port, ownership: 'agent-started' });
    recordPortMeasurement(other, entry.id, port, 'live');

    expect(portHeldByOtherProject(worktree, url)).toBe(true);
  });

  it('ignores absent, invalid, non-HTTP and non-loopback URLs', () => {
    const { root, worktree } = useOwnWorkspaceRoot('ignored-url-port');
    const other = join(root, 'repo', 'preview');
    mkdirSync(other, { recursive: true });
    const entry = createServerEntry(other, { folder: other, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(other, entry.id, 5173, 'live');

    for (const url of [
      '',
      'not a URL',
      'localhost:5173',
      'http://localhost:invalid',
      'http://localhost:65536',
      'ftp://localhost:5173',
      'file://localhost/design',
      'https://preview.example.test:5173',
      'http://127.0.0.1.example.test:5173',
      'http://192.0.2.1:5173',
    ]) {
      expect(portHeldByOtherProject(worktree, url)).toBe(false);
    }
  });

  it('ignores removed entries and removed projects, including late claims', () => {
    const { root, worktree } = useOwnWorkspaceRoot('removed-project-port');
    const other = join(root, 'repo', 'preview');
    mkdirSync(other, { recursive: true });
    const entry = createServerEntry(other, { folder: other, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(other, entry.id, 5173, 'live');
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(true);

    removeServerEntry(other, entry.id);
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(false);

    const replacement = createServerEntry(other, { folder: other, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(other, replacement.id, 5173, 'live');
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(true);

    forgetServerBookProject(`${other}/`);
    const late = createServerEntry(other, { folder: other, port: 5173, ownership: 'agent-started' });
    recordPortMeasurement(other, late.id, 5173, 'live');
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(false);

    resetServerBookCache();
    expect(portHeldByOtherProject(worktree, 'http://localhost:5173')).toBe(false);
  });
});

describe('measurement recording', () => {
  it('live is sticky in everLive and in the entry — ever means ever', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('ever-lived');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });

    recordPortMeasurement(worktree, entry.id, 3000, 'live');
    recordPortMeasurement(worktree, entry.id, 3000, 'dead');

    const after = entryForFolder(worktree, folder);
    expect(after?.ports).toEqual([{ port: 3000, measured: 'dead', everLive: true }]);
    expect(after?.everMeasuredLive).toBe(true);
  });

  it('records against the named port only — a two-port entry keeps them apart', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('per-port');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });
    extendServerEntry(worktree, entry.id, 3001);

    recordPortMeasurement(worktree, entry.id, 3001, 'live');
    expect(entryForFolder(worktree, folder)?.ports).toEqual([
      { port: 3000, measured: 'unverified', everLive: false },
      { port: 3001, measured: 'live', everLive: true },
    ]);
  });

  it('a container stranger carries the listener fact only as long as the caller says so (ONL-2359)', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('container-listener');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });

    recordPortMeasurement(worktree, entry.id, 3000, 'stranger', 'container');
    expect(entryForFolder(worktree, folder)?.ports[0]).toEqual({
      port: 3000,
      measured: 'stranger',
      everLive: false,
      listener: 'container',
    });

    recordPortMeasurement(worktree, entry.id, 3000, 'stranger');
    expect(entryForFolder(worktree, folder)?.ports[0]).not.toHaveProperty('listener');

    recordPortMeasurement(worktree, entry.id, 3000, 'live');
    expect(entryForFolder(worktree, folder)?.ports[0]).not.toHaveProperty('listener');
  });
});

describe('discriminatePortReport — pure', () => {
  const live = (ports: number[]): Map<number, ServerPortMeasurement> =>
    new Map(ports.map((p) => [p, 'live'] as const));

  it('a port already claimed is known — nothing to decide', () => {
    expect(discriminatePortReport([3000, 3001], 3001, live([3000, 3001]))).toEqual({
      kind: 'known',
    });
  });

  it('extends when every previously-claimed port still measures live', () => {
    expect(discriminatePortReport([3000], 5173, live([3000]))).toEqual({ kind: 'extend' });
  });

  it('moves when a previously-claimed port measures dead — paired with that port', () => {
    const measured = new Map<number, ServerPortMeasurement>([
      [3000, 'live'],
      [3001, 'dead'],
    ]);
    expect(discriminatePortReport([3000, 3001], 5173, measured)).toEqual({
      kind: 'move',
      deadPort: 3001,
      pairedMeasurement: 'dead',
    });
  });

  it('a stranger on a claimed port is not "still live" — the report is a move', () => {
    const measured = new Map<number, ServerPortMeasurement>([[3000, 'stranger']]);
    expect(discriminatePortReport([3000], 5173, measured)).toEqual({
      kind: 'move',
      deadPort: 3000,
      pairedMeasurement: 'stranger',
    });
  });

  it('a port the caller never measured counts dead — silence is not liveness', () => {
    expect(discriminatePortReport([3000], 5173, new Map())).toEqual({
      kind: 'move',
      deadPort: 3000,
      pairedMeasurement: 'dead',
    });
  });
});

describe('extend and move, on the book', () => {
  it('extend adds the port to the same entry — one server, more ports', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('extend');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });
    extendServerEntry(worktree, entry.id, 3001);
    extendServerEntry(worktree, entry.id, 3001);

    const after = entryForFolder(worktree, folder);
    expect(serverBookEntries(worktree)).toHaveLength(1);
    expect(after?.ports.map((p) => p.port)).toEqual([3000, 3001]);
  });

  it('move replaces exactly the dead port; the entry and its history survive', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('move');
    const entry = createServerEntry(worktree, { folder, port: 3000, ownership: 'agent-started' });
    extendServerEntry(worktree, entry.id, 3001);
    recordPortMeasurement(worktree, entry.id, 3000, 'live');
    recordPortMeasurement(worktree, entry.id, 3001, 'live');

    moveServerEntryPort(worktree, entry.id, { from: 3000, to: 5173 });

    const after = entryForFolder(worktree, folder);
    expect(after?.id).toBe(entry.id);
    expect(after?.ports.map((p) => p.port)).toEqual([5173, 3001]);
    expect(after?.ports.find((p) => p.port === 5173)).toEqual({
      port: 5173,
      measured: 'unverified',
      everLive: false,
    });
    expect(after?.ports.find((p) => p.port === 3001)?.everLive).toBe(true);
    expect(after?.everMeasuredLive).toBe(true);
  });
});

describe('removeServerEntry — the one single-entry removal (ONL-2152)', () => {
  it('drops exactly the named entry and leaves its neighbours', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('remove');
    const api = join(worktree, 'api');
    mkdirSync(api, { recursive: true });
    const starter = createServerEntry(worktree, { folder, port: 4310, ownership: 'studio-started' });
    const other = createServerEntry(worktree, { folder: api, port: 4000, ownership: 'agent-started' });

    removeServerEntry(worktree, starter.id);

    expect(serverBookEntries(worktree).map((e) => e.id)).toEqual([other.id]);
    expect(entryForFolder(worktree, folder)).toBeUndefined();
  });

  it('an unknown id is a no-op, never a throw', () => {
    const { worktree, folder } = useOwnWorkspaceRoot('remove-unknown');
    const entry = createServerEntry(worktree, { folder, port: 4310, ownership: 'studio-started' });
    removeServerEntry(worktree, 'not-an-entry');
    expect(serverBookEntries(worktree).map((e) => e.id)).toEqual([entry.id]);
  });
});

describe('forgetServerBookProject — a whole bucket, for a worktree that is going (ONL-2152)', () => {
  it("drops every claim of the named project and none of another's", () => {
    const { root, worktree, folder } = useOwnWorkspaceRoot('forget');
    const other = join(root, 'repo', 'other');
    mkdirSync(other, { recursive: true });
    createServerEntry(worktree, { folder, port: 4310, ownership: 'studio-started' });
    createServerEntry(worktree, { folder: join(worktree, 'api'), port: 4000, ownership: 'agent-started' });
    const kept = createServerEntry(other, { folder: other, port: 3000, ownership: 'agent-started' });

    forgetServerBookProject(worktree);

    expect(serverBookEntries(worktree)).toEqual([]);
    expect(serverBookEntries(other).map((e) => e.id)).toEqual([kept.id]);
  });

  it('an unknown project is a no-op', () => {
    const { root } = useOwnWorkspaceRoot('forget-unknown');
    expect(() => forgetServerBookProject(join(root, 'nowhere'))).not.toThrow();
  });
});
