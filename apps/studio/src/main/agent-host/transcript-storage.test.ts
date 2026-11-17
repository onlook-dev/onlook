import { afterAll, beforeEach, expect, it, spyOn } from 'bun:test';
import { foldSessionState, type StudioEvent } from '@studio/events';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { canonicalPath } from '../lib/canonical-path.js';
import * as stateFiles from '../state/file.js';
import { TranscriptStorage, transcriptFilePath } from './transcript-storage.js';

let root: string;
let project: string;
let other: string;

beforeEach(() => {
  root = canonicalPath(makeStateRoot({ name: 'transcript-storage' }));
  project = canonicalPath(join(root, 'project'));
  other = canonicalPath(join(root, 'other'));
});

afterAll(() => cleanupTempFixtures());

function rows(count: number): StudioEvent[] {
  return Array.from({ length: count }, (_, index) => ({ type: 'message.user', seq: index + 1, text: `prompt ${String(index)}` } as StudioEvent));
}

function legacy(version: number, byWorkspace: Record<string, StudioEvent[]>): string {
  const bytes = JSON.stringify({ version, data: { byWorkspace } });
  writeFileSync(join(root, 'transcripts.json'), bytes);
  return bytes;
}

it('migrates many version-one Projects without dropping long conversations', () => {
  const byWorkspace = Object.fromEntries(Array.from({ length: 24 }, (_, index) => [canonicalPath(join(root, `project-${String(index)}`)), rows(index + 1)]));
  byWorkspace[project] = rows(4_101);
  legacy(1, byWorkspace);
  const storage = new TranscriptStorage(root);
  storage.migrate();
  expect(existsSync(join(root, 'transcripts.json'))).toBe(false);
  expect(Object.keys(storage.all())).toHaveLength(25);
  const reopened = new TranscriptStorage(root);
  expect(reopened.read(project, 'claude')).toEqual(byWorkspace[project]);
  expect(statSync(transcriptFilePath(root, project)).mode & 0o777).toBe(0o600);
});

it('returns every conversation ending with the thread it closed, which is what marks a loss once (ONL-2925)', () => {
  const saved: StudioEvent[] = [
    { type: 'message.user', sessionId: 's1', cwd: project, eventId: 'e1', seq: 1, ts: 1, turnId: 't1', text: 'make the header blue' },
    { type: 'session.boundary', sessionId: 's1', cwd: project, eventId: 'e2', seq: 2, ts: 2, message: 'ChatGPT can’t continue this conversation. Your next message starts a new one.', threadId: 'thread-1' },
    { type: 'message.user', sessionId: 's2', cwd: project, eventId: 'e3', seq: 3, ts: 3, turnId: 't2', text: 'and the footer' },
    { type: 'session.boundary', sessionId: 's2', cwd: project, eventId: 'e4', seq: 4, ts: 4, message: 'ChatGPT can’t continue this conversation. Your next message starts a new one.', threadId: 'thread-2' },
  ];
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'appserver', 0, saved, 1);
  storage.flush();
  const reopened = new TranscriptStorage(root).read(project, 'appserver');
  expect(reopened.flatMap((row) => (row.type === 'session.boundary' ? [row.threadId] : []))).toEqual(['thread-1', 'thread-2']);
  expect(foldSessionState(reopened).items.map((item) => item.kind)).toEqual(['user', 'boundary', 'user', 'boundary']);
});

it('retains a partial migration source and never resurrects a cleared drawer on retry or relaunch', () => {
  const source = legacy(2, {
    [`${project}::claude`]: rows(2),
    [`${project}::appserver`]: rows(3),
    [`${other}::claude`]: rows(4),
  });
  mkdirSync(join(root, 'transcripts'));
  const blocked = `${transcriptFilePath(root, other)}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  const storage = new TranscriptStorage(root);
  expect(() => storage.migrate()).toThrow();
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  expect(storage.read(other, 'claude')).toHaveLength(4);
  storage.clear(project, 'claude');
  const restarted = new TranscriptStorage(root);
  expect(() => restarted.migrate()).toThrow();
  expect(restarted.read(project, 'claude')).toEqual([]);
  expect(restarted.read(project, 'appserver')).toHaveLength(3);
  rmSync(blocked, { recursive: true });
  restarted.migrate();
  expect(existsSync(join(root, 'transcripts.json'))).toBe(false);
  expect(new TranscriptStorage(root).read(project, 'claude')).toEqual([]);
});

it('merges both legacy Harness drawers into an existing destination without dropping history', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'appserver', 0, rows(1), 1);
  storage.flush();
  legacy(2, { [`${project}::claude`]: rows(2), [`${project}::appserver`]: rows(3) });
  const restarted = new TranscriptStorage(root);
  restarted.migrate();
  expect(restarted.read(project, 'claude')).toEqual(rows(2));
  expect(restarted.read(project, 'appserver')).toEqual(rows(3));
});

it('preserves a future destination and its legacy source through migration, save and teardown', () => {
  const source = legacy(2, { [`${project}::claude`]: rows(2), [`${other}::claude`]: rows(3) });
  mkdirSync(join(root, 'transcripts'));
  const destination = transcriptFilePath(root, project);
  const future = '{"version":42,"data":{"cwd":"future"}}\n';
  writeFileSync(destination, future);
  const storage = new TranscriptStorage(root);
  storage.migrate();
  expect(storage.rootsComplete()).toBe(false);
  expect(() => storage.patch(project, 'claude', 0, rows(1), 1)).toThrow('read-only');
  expect(() => storage.clear(project, 'claude')).toThrow('read-only');
  expect(() => storage.forget(project)).toThrow('read-only');
  storage.flush();
  expect(readFileSync(destination, 'utf8')).toBe(future);
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  expect(storage.read(other, 'claude')).toHaveLength(3);
});

it('writes only the changed Project and retains dirty work after a real replacement failure', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.patch(other, 'claude', 0, rows(3), 2);
  storage.flush();
  const untouched = readFileSync(transcriptFilePath(root, other), 'utf8');
  const previous = readFileSync(transcriptFilePath(root, project), 'utf8');
  const blocked = `${transcriptFilePath(root, project)}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  storage.patch(project, 'claude', 2, rows(1), 3);
  expect(() => storage.flush()).toThrow();
  expect(readFileSync(transcriptFilePath(root, project), 'utf8')).toBe(previous);
  expect(readFileSync(transcriptFilePath(root, other), 'utf8')).toBe(untouched);
  rmSync(blocked, { recursive: true });
  expect(storage.flush()[project]).toBe(3);
  expect(new TranscriptStorage(root).read(project, 'claude')).toHaveLength(3);
});

it('seals both Harnesses on removal but leaves New Chat clears writable', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.patch(project, 'appserver', 0, rows(3), 2);
  storage.clear(project, 'claude');
  storage.patch(project, 'claude', 0, rows(1), 3);
  storage.flush();
  storage.forget(project);
  expect(existsSync(transcriptFilePath(root, project))).toBe(false);
  expect(() => storage.patch(project, 'claude', 0, rows(1), 4)).toThrow('forgotten');
  expect(() => storage.patch(project, 'appserver', 0, rows(1), 5)).toThrow('forgotten');
  storage.flush();
  expect(existsSync(transcriptFilePath(root, project))).toBe(false);
});

for (const version of [1, 2]) {
  it(`prunes only a removed Project from legacy v${String(version)} before erasing its files`, () => {
    mkdirSync(project);
    const alias = join(root, 'project-alias');
    symlinkSync(project, alias);
    const storage = new TranscriptStorage(root);
    storage.patch(project, 'claude', 0, rows(2), 1);
    storage.patch(project, 'appserver', 0, rows(3), 2);
    storage.flush();
    const remaining = {
      [version === 1 ? other : `${other}::claude`]: rows(4),
      [`${other}::appserver`]: rows(5),
      [`${project}-kept::claude`]: rows(1),
    };
    const data = {
      metadata: { retained: ['unchanged'] },
      byWorkspace: {
        [version === 1 ? alias : `${alias}::claude`]: rows(2),
        [`${project}::claude`]: rows(2),
        [`${alias}::appserver`]: rows(3),
        ...remaining,
      },
    };
    const sourcePath = join(root, 'transcripts.json');
    writeFileSync(sourcePath, JSON.stringify({ version, extra: { retained: true }, data }));
    const futurePath = transcriptFilePath(root, other);
    const future = '{ "version": 99, "data": { "untouched": "future chat bytes" } }\n';
    writeFileSync(futurePath, future);
    const destination = transcriptFilePath(root, project);
    const temporary = `${destination}.${String(process.pid)}.tmp`;
    const olderTemporary = `${destination}.987654321.tmp`;
    const otherTemporary = `${futurePath}.987654321.tmp`;
    writeFileSync(temporary, 'removed pending chat');
    writeFileSync(olderTemporary, 'removed interrupted chat');
    writeFileSync(otherTemporary, 'unrelated pending chat');
    storage.migrate();
    storage.patch(project, 'claude', 2, rows(1), 3);
    storage.forget(project);
    expect(JSON.parse(readFileSync(sourcePath, 'utf8'))).toEqual({
      version,
      extra: { retained: true },
      data: { ...data, byWorkspace: remaining },
    });
    expect(existsSync(destination)).toBe(false);
    expect(existsSync(temporary)).toBe(false);
    expect(existsSync(olderTemporary)).toBe(false);
    expect(readFileSync(futurePath, 'utf8')).toBe(future);
    expect(readFileSync(otherTemporary, 'utf8')).toBe('unrelated pending chat');
    for (const harness of ['claude', 'appserver'] as const) {
      expect(() => storage.patch(project, harness, 0, rows(1), 4)).toThrow('forgotten');
      expect(() => storage.clear(project, harness)).toThrow('forgotten');
    }
    expect(storage.flush()).toEqual({});
    const restarted = new TranscriptStorage(root);
    restarted.migrate();
    expect(restarted.read(project, 'claude')).toEqual([]);
    expect(restarted.read(project, 'appserver')).toEqual([]);
    expect(existsSync(destination)).toBe(false);
    expect(existsSync(sourcePath)).toBe(true);
    expect(restarted.rootsComplete()).toBe(false);
    expect(readFileSync(futurePath, 'utf8')).toBe(future);
    writeFileSync(futurePath, JSON.stringify({ version: 1, data: { cwd: other, byHarness: { claude: rows(4), appserver: rows(5) } } }));
    restarted.migrate();
    expect(existsSync(sourcePath)).toBe(false);
    expect(existsSync(destination)).toBe(false);
    expect(new TranscriptStorage(root).read(project, 'claude')).toEqual([]);
  });
}

it('preserves inline legacy fields and unrelated keys while pruning a removed Project', () => {
  const remaining = { [`${other}::claude`]: rows(3), [`${other}::unknown`]: { opaque: true } };
  const sourcePath = join(root, 'transcripts.json');
  writeFileSync(sourcePath, JSON.stringify({ version: 2, metadata: ['retained'], byWorkspace: { [`${project}::claude`]: rows(2), ...remaining } }));
  const storage = new TranscriptStorage(root);
  storage.forget(project);
  expect(JSON.parse(readFileSync(sourcePath, 'utf8'))).toEqual({ version: 2, metadata: ['retained'], byWorkspace: remaining });
  expect(existsSync(transcriptFilePath(root, project))).toBe(false);
});

it('durably prunes the source before attempting destination erasure and safely retries an interruption', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.flush();
  const destination = transcriptFilePath(root, project);
  const previous = readFileSync(destination, 'utf8');
  const remaining = { [`${other}::claude`]: rows(3) };
  legacy(2, { [`${project}::claude`]: rows(2), [`${project}::appserver`]: rows(4), ...remaining });
  writeFileSync(transcriptFilePath(root, other), '{"version":99,"data":{}}');
  storage.patch(project, 'claude', 2, rows(1), 2);
  const erasure = spyOn(stateFiles, 'eraseStateFile').mockImplementationOnce((path) => {
    expect(path).toBe(destination);
    expect(JSON.parse(readFileSync(join(root, 'transcripts.json'), 'utf8'))).toEqual({ version: 2, data: { byWorkspace: remaining } });
    expect(readFileSync(destination, 'utf8')).toBe(previous);
    throw new Error('interrupted before destination erasure');
  });
  try {
    expect(() => storage.forget(project)).toThrow('interrupted before destination erasure');
  } finally {
    erasure.mockRestore();
  }
  expect(storage.flush()).toEqual({});
  expect(readFileSync(destination, 'utf8')).toBe(previous);
  expect(() => storage.patch(project, 'claude', 0, rows(1), 3)).toThrow('forgotten');
  const restarted = new TranscriptStorage(root);
  restarted.forget(project);
  restarted.migrate();
  expect(existsSync(destination)).toBe(false);
  expect(restarted.read(project, 'claude')).toEqual([]);
  expect(restarted.read(project, 'appserver')).toEqual([]);
});

it('does not erase or seal the destination when atomic source pruning fails', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.flush();
  const destination = transcriptFilePath(root, project);
  const previous = readFileSync(destination, 'utf8');
  const source = legacy(2, { [`${project}::claude`]: rows(2), [`${other}::claude`]: rows(3) });
  const blocked = `${join(root, 'transcripts.json')}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  expect(() => storage.forget(project)).toThrow();
  expect(readFileSync(destination, 'utf8')).toBe(previous);
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  storage.patch(project, 'appserver', 0, rows(1), 2);
  rmSync(blocked, { recursive: true });
  storage.forget(project);
  expect(storage.flush()).toEqual({});
  expect(existsSync(destination)).toBe(false);
});

for (const source of [
  '{"version":99,"data":{"byWorkspace":{}}}',
  'not json',
  '{"version":0,"data":{"byWorkspace":{}}}',
  '{"version":2,"data":{"byWorkspace":[]}}',
]) {
  it(`refuses removal without changing destination or unreadable/unsupported source ${source}`, () => {
    const storage = new TranscriptStorage(root);
    storage.patch(project, 'claude', 0, rows(2), 1);
    storage.flush();
    const destination = transcriptFilePath(root, project);
    const previous = readFileSync(destination, 'utf8');
    const temporary = `${destination}.${String(process.pid)}.tmp`;
    writeFileSync(temporary, 'pending chat');
    writeFileSync(join(root, 'transcripts.json'), source);
    expect(() => storage.forget(project)).toThrow();
    expect(readFileSync(destination, 'utf8')).toBe(previous);
    expect(readFileSync(temporary, 'utf8')).toBe('pending chat');
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
    expect(() => storage.patch(project, 'appserver', 0, rows(1), 2)).not.toThrow();
  });
}

it('refuses an unopenable legacy source without erasing the Project or its temporaries', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.flush();
  const destination = transcriptFilePath(root, project);
  const previous = readFileSync(destination, 'utf8');
  const temporary = `${destination}.${String(process.pid)}.tmp`;
  writeFileSync(temporary, 'pending chat');
  const sourcePath = join(root, 'transcripts.json');
  mkdirSync(sourcePath);
  writeFileSync(join(sourcePath, 'retained'), 'unreadable source bytes');
  expect(() => storage.forget(project)).toThrow();
  expect(readFileSync(destination, 'utf8')).toBe(previous);
  expect(readFileSync(temporary, 'utf8')).toBe('pending chat');
  expect(readFileSync(join(sourcePath, 'retained'), 'utf8')).toBe('unreadable source bytes');
});

for (const damage of ['events', 'ownership', 'unopenable']) {
  it(`isolates a ${damage} destination from healthy reads, clears, patches and durable acknowledgements`, () => {
    const original = new TranscriptStorage(root);
    original.patch(project, 'claude', 0, rows(2), 1);
    original.patch(project, 'appserver', 0, rows(3), 2);
    original.flush();
    const damagedPath = transcriptFilePath(root, other);
    const damaged = JSON.stringify({
      version: 1,
      data: { cwd: damage === 'ownership' ? project : other, byHarness: { claude: damage === 'events' ? ['invalid event'] : rows(1) } },
    });
    const retainedPath = damage === 'unopenable' ? join(damagedPath, 'retained') : damagedPath;
    if (damage === 'unopenable') mkdirSync(damagedPath);
    writeFileSync(retainedPath, damaged);
    const source = legacy(2, { [`${project}::claude`]: rows(2), [`${other}::claude`]: rows(4) });
    const storage = new TranscriptStorage(root);
    expect(() => storage.migrate()).toThrow();
    expect(storage.read(project, 'claude')).toEqual(rows(2));
    expect(storage.all()[`${project}::claude`]).toEqual(rows(2));
    expect(storage.rootsComplete()).toBe(false);
    storage.clear(project, 'appserver');
    const added = [{ type: 'message.user', seq: 3, text: 'new prompt' } as StudioEvent];
    storage.patch(project, 'claude', 2, added, 3);
    expect(storage.flush()[project]).toBe(3);
    expect(() => storage.read(other, 'claude')).toThrow();
    expect(() => storage.patch(other, 'claude', 0, rows(1), 4)).toThrow();
    expect(() => storage.clear(other, 'claude')).toThrow();
    expect(readFileSync(retainedPath, 'utf8')).toBe(damaged);
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
    const restarted = new TranscriptStorage(root);
    expect(restarted.read(project, 'claude')).toEqual([...rows(2), ...added]);
    expect(restarted.read(project, 'appserver')).toEqual([]);
    expect(restarted.rootsComplete()).toBe(false);
    expect(readFileSync(retainedPath, 'utf8')).toBe(damaged);
  });
}

it('acknowledges a healthy dirty Project even when another dirty destination cannot be replaced', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.patch(other, 'claude', 0, rows(3), 2);
  storage.flush();
  const previous = readFileSync(transcriptFilePath(root, other), 'utf8');
  const blocked = `${transcriptFilePath(root, other)}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  storage.patch(project, 'claude', 2, rows(1), 3);
  storage.patch(other, 'claude', 3, rows(1), 4);
  expect(storage.flush()).toEqual({ [project]: 3 });
  expect(new TranscriptStorage(root).read(project, 'claude')).toHaveLength(3);
  expect(readFileSync(transcriptFilePath(root, other), 'utf8')).toBe(previous);
  rmSync(blocked, { recursive: true });
  expect(storage.flush()).toEqual({ [other]: 4 });
  expect(new TranscriptStorage(root).read(other, 'claude')).toHaveLength(4);
});

it('acknowledges healthy saves despite a blocked legacy migration destination', () => {
  const source = legacy(2, { [`${other}::claude`]: rows(3) });
  mkdirSync(join(root, 'transcripts'));
  const blocked = `${transcriptFilePath(root, other)}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  const storage = new TranscriptStorage(root);
  expect(() => storage.migrate()).toThrow();
  storage.patch(project, 'claude', 0, rows(2), 1);
  expect(storage.flush()).toEqual({ [project]: 1 });
  expect(new TranscriptStorage(root).read(project, 'claude')).toEqual(rows(2));
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  rmSync(blocked, { recursive: true });
  storage.flush();
  expect(existsSync(join(root, 'transcripts.json'))).toBe(false);
});

for (const source of ['not json', '{"version":2,"data":{"byWorkspace":[]}}']) {
  it(`acknowledges healthy saves without replacing an invalid legacy source ${source}`, () => {
    writeFileSync(join(root, 'transcripts.json'), source);
    const storage = new TranscriptStorage(root);
    storage.patch(project, 'claude', 0, rows(2), 1);
    expect(storage.flush()).toEqual({ [project]: 1 });
    expect(new TranscriptStorage(root).read(project, 'claude')).toEqual(rows(2));
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
    expect(storage.rootsComplete()).toBe(false);
  });
}

for (const bytes of ['', '{"version":1,"data":{"cwd":']) {
  for (const operation of ['read', 'clear'] as const) {
    it(`quarantines interrupted Project bytes during ${operation} and permits durable writes: ${bytes}`, () => {
      mkdirSync(join(root, 'transcripts'));
      const destination = transcriptFilePath(root, project);
      writeFileSync(destination, bytes);
      const storage = new TranscriptStorage(root);
      if (operation === 'read') expect(storage.read(project, 'claude')).toEqual([]);
      else storage.clear(project, 'claude');
      const quarantines = readdirSync(join(root, 'transcripts')).filter((name) => name.includes('.corrupt-'));
      expect(quarantines).toHaveLength(1);
      expect(readFileSync(join(root, 'transcripts', quarantines[0]!), 'utf8')).toBe(bytes);
      expect(storage.rootsComplete()).toBe(false);
      storage.patch(project, 'claude', 0, rows(2), 1);
      expect(storage.flush()).toEqual({ [project]: 1 });
      const restarted = new TranscriptStorage(root);
      expect(restarted.read(project, 'claude')).toEqual(rows(2));
      expect(restarted.rootsComplete()).toBe(false);
      expect(readFileSync(join(root, 'transcripts', quarantines[0]!), 'utf8')).toBe(bytes);
      restarted.forget(project);
      expect(existsSync(join(root, 'transcripts', quarantines[0]!))).toBe(false);
      expect(restarted.rootsComplete()).toBe(true);
    });
  }

  it(`explicitly forgets interrupted Project bytes and prunes only its legacy history: ${bytes}`, () => {
    mkdirSync(join(root, 'transcripts'));
    const destination = transcriptFilePath(root, project);
    writeFileSync(destination, bytes);
    const remaining = { [`${other}::claude`]: rows(3), [`${other}::unknown`]: rows(1) };
    legacy(2, { [`${project}::claude`]: rows(2), ...remaining });
    const storage = new TranscriptStorage(root);
    expect(stateFiles.canWriteStateFile(destination, 1)).toBe(true);
    storage.forget(project);
    expect(existsSync(destination)).toBe(false);
    expect(JSON.parse(readFileSync(join(root, 'transcripts.json'), 'utf8'))).toEqual({ version: 2, data: { byWorkspace: remaining } });
    expect(storage.flush()).toEqual({});
    expect(() => storage.patch(project, 'claude', 0, rows(1), 1)).toThrow('forgotten');
    expect(existsSync(destination)).toBe(false);
  });
}

it('forgets malformed supported Project data without interpreting it as a newer version', () => {
  mkdirSync(join(root, 'transcripts'));
  const destination = transcriptFilePath(root, project);
  writeFileSync(destination, '{"version":1,"data":{"byHarness":"invalid"}}');
  const storage = new TranscriptStorage(root);
  storage.forget(project);
  expect(existsSync(destination)).toBe(false);
});

it('forgets only its own quarantine siblings and leaves another unresolved history protected', () => {
  mkdirSync(join(root, 'transcripts'));
  for (const cwd of [project, other]) writeFileSync(transcriptFilePath(root, cwd), '{"interrupted":');
  const storage = new TranscriptStorage(root);
  storage.read(project, 'claude');
  storage.read(other, 'claude');
  const otherPrefix = transcriptFilePath(root, other).split('/').at(-1)!;
  storage.forget(project);
  const remaining = readdirSync(join(root, 'transcripts'));
  expect(remaining).toHaveLength(1);
  expect(remaining[0]!.startsWith(`${otherPrefix}.corrupt-`)).toBe(true);
  expect(readFileSync(join(root, 'transcripts', remaining[0]!), 'utf8')).toBe('{"interrupted":');
  expect(new TranscriptStorage(root).rootsComplete()).toBe(false);
});

it('preflights a newer quarantine before pruning legacy history or deleting its destination', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.flush();
  const destination = transcriptFilePath(root, project);
  const previous = readFileSync(destination, 'utf8');
  const source = legacy(2, { [`${project}::claude`]: rows(3) });
  const quarantine = `${destination}.corrupt-00000000-0000-0000-0000-000000000000`;
  const bytes = '{"version":99,"data":{"futureRecovery":true}}\n';
  writeFileSync(quarantine, bytes);
  expect(() => storage.forget(project)).toThrow('read-only');
  expect(readFileSync(quarantine, 'utf8')).toBe(bytes);
  expect(readFileSync(destination, 'utf8')).toBe(previous);
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
});

it('protects a newer Project that replaced the cached file before a clear or forget', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.flush();
  const source = legacy(2, { [`${project}::claude`]: rows(3) });
  const destination = transcriptFilePath(root, project);
  const future = '{"version":42,"data":{"invalid":"newer schema"}}\n';
  writeFileSync(destination, future);
  expect(() => storage.clear(project, 'claude')).toThrow('read-only');
  expect(() => storage.forget(project)).toThrow('read-only');
  expect(readFileSync(destination, 'utf8')).toBe(future);
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  expect(readdirSync(join(root, 'transcripts')).filter((name) => name.includes('.corrupt-'))).toEqual([]);
});

it('isolates invalid legacy Harnesses and events while retaining the complete raw source across retries', () => {
  const byWorkspace = {
    [`${project}::claude`]: rows(2),
    [`${other}::appserver`]: rows(3),
    [join(root, 'a::b')]: rows(4),
    [`${project}::appserver`]: ['invalid event'],
  };
  const source = JSON.stringify({ version: 2, extra: { retained: true }, data: { byWorkspace } });
  writeFileSync(join(root, 'transcripts.json'), source);
  const storage = new TranscriptStorage(root);
  storage.migrate();
  expect(storage.read(project, 'claude')).toEqual(rows(2));
  expect(storage.read(other, 'appserver')).toEqual(rows(3));
  expect(storage.rootsComplete()).toBe(false);
  for (const current of [storage, new TranscriptStorage(root)]) {
    current.migrate();
    current.flush();
    expect(current.read(project, 'claude')).toEqual(rows(2));
    expect(current.read(other, 'appserver')).toEqual(rows(3));
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  }
  legacy(2, { [`${project}::claude`]: rows(2), [`${other}::appserver`]: rows(3) });
  storage.migrate();
  expect(existsSync(join(root, 'transcripts.json'))).toBe(false);
  expect(new TranscriptStorage(root).read(project, 'claude')).toEqual(rows(2));
});

function message(eventId: string, text: string, seq: number, sessionId = 'old-session'): StudioEvent {
  return { type: 'message.user', eventId, messageId: eventId, turnId: eventId, sessionId, text, seq, ts: seq };
}

it('merges preserved legacy and new destination events in order without changing event or message identities', () => {
  const old = [message('old-1', 'old first', 1), message('old-2', 'old second', 2)];
  const updated = { ...old[1]!, seq: 1 };
  const added = message('new-1', 'new chat', 2, 'new-session');
  const initial = new TranscriptStorage(root);
  initial.patch(project, 'claude', 0, [updated, added], 1);
  initial.patch(project, 'appserver', 0, rows(1), 2);
  initial.flush();
  const source = legacy(2, { [`${project}::claude`]: old, [`${other}::unknown`]: rows(1) });
  const expected = [old[0], { ...updated, seq: 2 }, { ...added, seq: 3 }];
  for (const storage of [new TranscriptStorage(root), new TranscriptStorage(root)]) {
    storage.migrate();
    expect(storage.read(project, 'claude')).toEqual(expected);
    expect(storage.read(project, 'appserver')).toEqual(rows(1));
    storage.migrate();
    expect(storage.read(project, 'claude')).toEqual(expected);
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  }
});

it('prepends old history to a disjoint new session and preserves a cleared drawer after later writes and relaunch', () => {
  const old = [message('old-1', 'old history', 1)];
  const added = [message('new-1', 'new history', 1, 'new-session')];
  const initial = new TranscriptStorage(root);
  initial.patch(project, 'claude', 0, added, 1);
  initial.flush();
  legacy(2, { [`${project}::claude`]: old, [`${other}::unknown`]: rows(1) });
  const storage = new TranscriptStorage(root);
  storage.migrate();
  expect(storage.read(project, 'claude')).toEqual([old[0], { ...added[0], seq: 2 }]);
  storage.clear(project, 'claude');
  storage.patch(project, 'claude', 0, added, 2);
  storage.flush();
  const restarted = new TranscriptStorage(root);
  restarted.migrate();
  expect(restarted.read(project, 'claude')).toEqual(added);
  expect(JSON.parse(readFileSync(join(root, 'transcripts.json'), 'utf8'))).toEqual({
    version: 2, data: { byWorkspace: { [`${other}::unknown`]: rows(1) } },
  });
});

it('retains conflicting history instead of choosing an order that reverses an existing conversation', () => {
  const old = [message('old-1', 'first', 1), message('old-2', 'second', 2)];
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, [old[1]!, old[0]!], 1);
  storage.flush();
  const destination = transcriptFilePath(root, project);
  const previous = readFileSync(destination, 'utf8');
  const source = legacy(2, { [`${project}::claude`]: old, [`${other}::claude`]: rows(2) });
  expect(() => storage.migrate()).toThrow('conflicting transcript migration order');
  expect(storage.read(other, 'claude')).toEqual(rows(2));
  expect(readFileSync(destination, 'utf8')).toBe(previous);
  expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
  expect(storage.rootsComplete()).toBe(false);
  const restarted = new TranscriptStorage(root);
  expect(() => restarted.migrate()).toThrow('conflicting transcript migration order');
  expect(restarted.rootsComplete()).toBe(false);
  restarted.clear(project, 'claude');
  restarted.migrate();
  expect(restarted.rootsComplete()).toBe(true);
});

it('reopens a removed Project for a fresh registration without reviving forgotten or pending history', () => {
  const storage = new TranscriptStorage(root);
  storage.patch(project, 'claude', 0, rows(2), 1);
  storage.patch(project, 'appserver', 0, rows(3), 2);
  storage.flush();
  storage.patch(project, 'claude', 2, rows(1), 3);
  storage.forget(project);
  expect(() => storage.clear(project, 'claude')).toThrow('forgotten');
  storage.reopen(project);
  for (const harness of ['claude', 'appserver'] as const) {
    expect(storage.read(project, harness)).toEqual([]);
    storage.clear(project, harness);
    storage.patch(project, harness, 0, rows(1), 4);
  }
  storage.reopen(project);
  expect(storage.flush()).toEqual({ [project]: 4 });
  const restarted = new TranscriptStorage(root);
  expect(restarted.read(project, 'claude')).toEqual(rows(1));
  expect(restarted.read(project, 'appserver')).toEqual(rows(1));
});

for (const collision of ['event', 'turn', 'block', 'message', 'tool', 'request', 'parent-tool']) {
  it(`refuses independent old and new chats with reused ${collision} identities without changing either history`, () => {
    const old: StudioEvent[] = [
      { ...message('e1', 'old prompt', 1), turnId: 't1' } as StudioEvent,
      { type: 'text.start', eventId: 'old-start', sessionId: 'old-session', seq: 2, ts: 2, blockId: 'b1' },
      { type: 'text.end', eventId: 'old-end', sessionId: 'old-session', seq: 3, ts: 3, blockId: 'b1', text: 'old answer' },
    ];
    const added: StudioEvent[] = [
      { ...message('e4', 'new prompt', 1, 'new-session'), turnId: 't2' } as StudioEvent,
      { type: 'text.start', eventId: 'new-start', sessionId: 'new-session', seq: 2, ts: 4, blockId: 'b2' },
      { type: 'text.end', eventId: 'new-end', sessionId: 'new-session', seq: 3, ts: 5, blockId: 'b2', text: 'new answer' },
    ];
    const oldMessage = old[0]!;
    const newMessage = added[0]!;
    if (collision === 'event') added[0] = { ...newMessage, eventId: oldMessage.eventId };
    if (collision === 'turn') added[0] = { ...newMessage, turnId: 't1' } as StudioEvent;
    if (collision === 'message') added[0] = { ...newMessage, messageId: 'e1' } as StudioEvent;
    if (collision === 'block') {
      added[1] = { ...added[1]!, blockId: 'b1' } as StudioEvent;
      added[2] = { ...added[2]!, blockId: 'b1' } as StudioEvent;
    }
    if (collision === 'tool' || collision === 'parent-tool' || collision === 'request') {
      old.push({ type: 'permission.requested', eventId: 'old-permission', sessionId: 'old-session', seq: 4, ts: 4, requestId: 'r1', toolCallId: 'tool1', toolName: 'Read', options: [] });
      if (collision === 'parent-tool') added[1] = { ...added[1]!, parentToolUseId: 'tool1' } as StudioEvent;
      else added.push({ type: 'permission.resolved', eventId: 'new-permission', sessionId: 'new-session', seq: 4, ts: 6, requestId: collision === 'request' ? 'r1' : 'r2', toolCallId: collision === 'tool' ? 'tool1' : 'tool2', outcome: 'allow_once' });
    }
    const storage = new TranscriptStorage(root);
    storage.patch(project, 'claude', 0, added, 1);
    storage.flush();
    const destination = transcriptFilePath(root, project);
    const previous = readFileSync(destination, 'utf8');
    const source = legacy(2, { [`${project}::claude`]: old, [`${other}::claude`]: rows(2), [`${other}::unknown`]: rows(1) });
    expect(() => storage.migrate()).toThrow('conflicting transcript migration identity');
    expect(storage.read(project, 'claude')).toEqual(added);
    expect(storage.read(other, 'claude')).toEqual(rows(2));
    expect(readFileSync(destination, 'utf8')).toBe(previous);
    expect(readFileSync(join(root, 'transcripts.json'), 'utf8')).toBe(source);
    expect(foldSessionState(storage.read(project, 'claude')).items.filter((item) => item.kind === 'assistant-text')).toMatchObject([{ text: 'new answer' }]);
    expect(foldSessionState(old).items.filter((item) => item.kind === 'assistant-text')).toMatchObject([{ text: 'old answer' }]);
  });
}

it('answers incomplete roots for future sources, malformed stores and unlistable directories', () => {
  legacy(99, {});
  expect(new TranscriptStorage(root).rootsComplete()).toBe(false);
  writeFileSync(join(root, 'transcripts.json'), 'not json');
  expect(new TranscriptStorage(root).rootsComplete()).toBe(false);
  rmSync(join(root, 'transcripts.json'));
  writeFileSync(join(root, 'transcripts'), 'not a directory');
  expect(new TranscriptStorage(root).rootsComplete()).toBe(false);
});
