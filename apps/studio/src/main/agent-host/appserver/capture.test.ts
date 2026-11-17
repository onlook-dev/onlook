import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it, spyOn } from 'bun:test';
import {
  APPSERVER_CAPTURE_MAX_BYTES,
  APPSERVER_CAPTURE_MAX_FILES,
  APPSERVER_CAPTURE_TOTAL_MAX_BYTES,
  canClearProjectCaptures,
  capturePath,
  clearProjectCaptures,
  openCapture,
  readCaptureFile,
  reopenProjectCaptures,
} from './capture.js';

const scratch = mkdtempSync(join(tmpdir(), 'bounded-capture-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function open(root: string, threadId: string, cwd = '/project/first') {
  return openCapture({ root, threadId, cwd, codexVersion: 'test' });
}

describe('bounded versioned captures', () => {
  it('streams ordinary frames without a directory scan or fsync per frame', () => {
    const root = join(scratch, 'streaming-hot-path');
    const capture = open(root, 'thread');
    const flush = spyOn(fs, 'fsyncSync');
    const scan = spyOn(fs, 'readdirSync');
    try {
      for (let index = 0; index < 500; index += 1) capture.write('in', { delta: String(index) });
      expect(flush).not.toHaveBeenCalled();
      expect(scan).not.toHaveBeenCalled();
    } finally {
      flush.mockRestore();
      scan.mockRestore();
    }
    expect(readCaptureFile(capture.path!).frames).toHaveLength(500);
  });

  it('enforces the aggregate cap when already-open streams grow past it', () => {
    const root = join(scratch, 'concurrent-growth');
    const captures = Array.from({ length: 12 }, (_, index) => open(root, `thread-${index}`));
    const payload = 'x'.repeat(1_048_576);
    for (let round = 0; round < 3; round += 1) for (const capture of captures) capture.write('in', { payload });
    const directory = dirname(capturePath(root, 'thread')!);
    const paths = readdirSync(directory).map(name => join(directory, name));
    expect(paths.reduce((total, path) => total + statSync(path).size, 0)).toBeLessThanOrEqual(APPSERVER_CAPTURE_TOTAL_MAX_BYTES);
    expect(paths.length).toBeLessThan(captures.length);
    expect(paths.every(path => statSync(path).size <= APPSERVER_CAPTURE_MAX_BYTES)).toBe(true);
    expect(paths.every(path => readCaptureFile(path).frames.length > 0)).toBe(true);
  });

  it('shares the byte budget between simultaneously usable handles for the same thread', () => {
    const root = join(scratch, 'shared-handles');
    const pairs = Array.from({ length: 9 }, (_, index) => [open(root, `thread-${index}`), open(root, `thread-${index}`)] as const);
    for (const [first] of pairs) first.write('in', { payload: 'x'.repeat(2 * 1_048_576) });
    for (const [, second] of pairs) second.write('out', { payload: 'x'.repeat(1.75 * 1_048_576) });
    const directory = dirname(pairs[0]![0].path!);
    const paths = readdirSync(directory).map(name => join(directory, name));
    expect(paths.reduce((total, path) => total + statSync(path).size, 0)).toBeLessThanOrEqual(APPSERVER_CAPTURE_TOTAL_MAX_BYTES);
    expect(paths.length).toBeLessThan(pairs.length);
    expect(paths.every(path => readCaptureFile(path).frames.length === 2)).toBe(true);
  });

  it.each(['previous', 'current'])('reopens a re-registered Project with %s thread without reviving old handles', threadId => {
    const root = join(scratch, `same-path-registration-${threadId}`);
    const previous = open(root, 'previous');
    clearProjectCaptures(root, '/project/first');
    reopenProjectCaptures(root, '/project/first');
    const current = open(root, threadId);
    previous.write('in', { stale: true });
    current.write('in', { fresh: true });
    if (threadId !== 'previous') expect(existsSync(previous.path!)).toBe(false);
    expect(readCaptureFile(current.path!).frames.map(row => row.frame)).toEqual([{ fresh: true }]);
  });

  it.each(['remove-grown', 'reopen-shrunk'])('reconciles active-writer budgets after %s files change outside capture', scenario => {
    const root = join(scratch, `external-budget-${scenario}`);
    const first = open(root, 'first');
    const siblings = Array.from({ length: 9 }, (_, index) => open(root, `sibling-${index}`, '/project/second'));
    if (scenario === 'remove-grown') {
      for (const sibling of siblings) sibling.write('in', { payload: 'x'.repeat(3 * 1_048_576) });
      fs.appendFileSync(first.path!, `${JSON.stringify({ at: 1, dir: 'in', frame: 'x'.repeat(3 * 1_048_576) })}\n`);
      clearProjectCaptures(root, '/project/first');
    } else {
      siblings[0]!.write('in', { payload: 'x'.repeat(3 * 1_048_576) });
      const header = readCaptureFile(siblings[0]!.path!).header;
      writeFileSync(siblings[0]!.path!, `${JSON.stringify(header)}\n`);
      open(root, 'refresh', '/project/second');
    }
    const payload = 'x'.repeat((scenario === 'remove-grown' ? 0.75 : 3.75) * 1_048_576);
    for (const sibling of siblings) sibling.write('in', { payload });
    const directory = dirname(first.path!);
    const paths = readdirSync(directory).map(name => join(directory, name));
    expect(paths.reduce((total, path) => total + statSync(path).size, 0)).toBeLessThanOrEqual(APPSERVER_CAPTURE_TOTAL_MAX_BYTES);
    expect(paths.every(path => statSync(path).size <= APPSERVER_CAPTURE_MAX_BYTES)).toBe(true);
  });

  it('reads a complete header across small chunks and preserves future headers across those boundaries', () => {
    for (const mappingVersion of [1, 99]) {
      const root = join(scratch, `chunked-header-${String(mappingVersion)}`);
      const path = capturePath(root, 'thread')!;
      mkdirSync(dirname(path), { recursive: true });
      const header = { kind: 'appserver-capture-header', mappingVersion, codexVersion: 'test', startedAt: 1, padding: 'x'.repeat(2048) };
      const bytes = `${JSON.stringify(header)}\n`;
      writeFileSync(path, bytes);
      const writer = open(root, 'thread');
      writer.write('in', { method: 'a-frame' });
      if (mappingVersion === 99) {
        expect(writer.path).toBeUndefined();
        expect(readFileSync(path, 'utf8')).toBe(bytes);
      } else {
        expect(writer.path).toBe(path);
        expect(readCaptureFile(path).frames).toHaveLength(1);
      }
    }
  });

  it('keeps capturePath compatibility and rejects traversal', () => {
    expect(capturePath('/root', 'thread')).toBe('/root/appserver-capture/thread.jsonl');
    expect(capturePath('/root', '../thread')).toBeUndefined();
  });

  it('drops oversized frames, preserves the header and resumes within the byte cap', () => {
    const root = join(scratch, 'oversized');
    const capture = open(root, 'thread');
    expect(capture.path).toBe(capturePath(root, 'thread'));
    capture.write('in', { payload: 'x'.repeat(APPSERVER_CAPTURE_MAX_BYTES) });
    capture.write('in', { method: 'small' });
    const path = capture.path!;
    expect(statSync(path).size).toBeLessThanOrEqual(APPSERVER_CAPTURE_MAX_BYTES);
    expect(readCaptureFile(path).frames).toHaveLength(1);
    open(root, 'thread').write('out', { method: 'resumed' });
    expect(readCaptureFile(path).header?.mappingVersion).toBe(1);
    expect(readCaptureFile(path).frames).toHaveLength(2);
  });

  it('bounds count and aggregate bytes and seals a writer pruned by retention', () => {
    const root = join(scratch, 'retention');
    const oldest = open(root, 'oldest');
    const payload = 'x'.repeat(APPSERVER_CAPTURE_MAX_BYTES - 2048);
    for (let index = 0; index < APPSERVER_CAPTURE_MAX_FILES + 2; index += 1) {
      open(root, `thread-${index}`).write('in', { payload });
    }
    const directory = dirname(oldest.path!);
    const paths = readdirSync(directory).filter((name) => name.endsWith('.jsonl')).map((name) => join(directory, name));
    expect(paths.length).toBeLessThanOrEqual(APPSERVER_CAPTURE_MAX_FILES);
    expect(paths.reduce((bytes, path) => bytes + statSync(path).size, 0)).toBeLessThanOrEqual(APPSERVER_CAPTURE_TOTAL_MAX_BYTES);
    expect(existsSync(oldest.path!)).toBe(false);
    oldest.write('in', { late: true });
    expect(existsSync(oldest.path!)).toBe(false);
    open(root, 'restart');
    expect(readdirSync(directory).length).toBeLessThanOrEqual(APPSERVER_CAPTURE_MAX_FILES);
  });

  it('applies the count cap to small captures already present on disk after restart', () => {
    const root = join(scratch, 'restarted-count');
    const directory = dirname(capturePath(root, 'thread')!);
    mkdirSync(directory, { recursive: true });
    for (let index = 0; index < APPSERVER_CAPTURE_MAX_FILES + 4; index += 1) {
      writeFileSync(capturePath(root, `thread-${index}`)!, `${JSON.stringify({ kind: 'appserver-capture-header', codexVersion: 'old', mappingVersion: 1, startedAt: index })}\n`);
    }
    open(root, 'reopened');
    expect(readdirSync(directory)).toHaveLength(APPSERVER_CAPTURE_MAX_FILES);
  });

  it('bounds an oversized existing stream on reopen and removes a partial final record', () => {
    const root = join(scratch, 'reopen-large');
    const path = capturePath(root, 'thread')!;
    mkdirSync(dirname(path), { recursive: true });
    const header = `${JSON.stringify({ kind: 'appserver-capture-header', mappingVersion: 1, codexVersion: 'old', startedAt: 0 })}\n`;
    const small = `${JSON.stringify({ at: 1, dir: 'in', frame: { method: 'small' } })}\n`;
    const huge = `${JSON.stringify({ at: 2, dir: 'in', frame: 'x'.repeat(APPSERVER_CAPTURE_MAX_BYTES) })}\n`;
    writeFileSync(path, header + small + huge);
    const capture = open(root, 'thread');
    capture.write('out', { method: 'new' });
    expect(statSync(path).size).toBeLessThanOrEqual(APPSERVER_CAPTURE_MAX_BYTES);
    expect(readCaptureFile(path).frames).toHaveLength(2);
    writeFileSync(path, `${readFileSync(path, 'utf8')}{"at":`);
    open(root, 'thread').write('out', { method: 'after-partial' });
    expect(readCaptureFile(path).frames).toHaveLength(3);
    expect(readFileSync(path, 'utf8').trimEnd().split('\n').every((line) => typeof JSON.parse(line) === 'object')).toBe(true);
  });

  it('preserves future captures through reopen, Project cleanup and retention', () => {
    const root = join(scratch, 'future');
    const path = capturePath(root, 'future')!;
    mkdirSync(dirname(path), { recursive: true });
    const original = `${JSON.stringify({ kind: 'appserver-capture-header', mappingVersion: 99, codexVersion: 'later', startedAt: 0 })}\n${JSON.stringify({ at: 1, dir: 'in', frame: 'x'.repeat(APPSERVER_CAPTURE_MAX_BYTES) })}\n`;
    writeFileSync(path, original);
    open(root, 'future').write('in', { overwrite: true });
    expect(canClearProjectCaptures(root, '/project/first', ['future'])).toBe(false);
    expect(() => clearProjectCaptures(root, '/project/first', ['future'])).toThrow();
    for (let index = 0; index < APPSERVER_CAPTURE_MAX_FILES + 1; index += 1) open(root, `new-${index}`);
    expect(readFileSync(path, 'utf8')).toBe(original);
  });

  it('clears only one Project, includes legacy ids and seals its active writers', () => {
    const root = join(scratch, 'owners');
    const first = open(root, 'first');
    const sibling = open(root, 'second', '/project/second');
    const legacy = openCapture({ root, threadId: 'legacy', codexVersion: 'test' });
    const temp = `${first.path!}.4242.tmp`;
    writeFileSync(temp, 'interrupted header');
    clearProjectCaptures(root, '/project/first', ['legacy']);
    first.write('in', { late: true });
    legacy.write('in', { late: true });
    expect(existsSync(first.path!)).toBe(false);
    expect(existsSync(legacy.path!)).toBe(false);
    expect(existsSync(sibling.path!)).toBe(true);
    expect(existsSync(temp)).toBe(false);
    expect(open(root, 'late-reopen').path).toBeUndefined();
  });

  it('checks a future header installed after a writer opens before appending', () => {
    const root = join(scratch, 'future-active');
    const capture = open(root, 'thread');
    const original = `${JSON.stringify({ ...readCaptureFile(capture.path!).header, mappingVersion: 99 })}\n`;
    writeFileSync(capture.path!, original);
    capture.write('in', { late: true });
    expect(readFileSync(capture.path!, 'utf8')).toBe(original);
    expect(canClearProjectCaptures(root, '/project/first')).toBe(false);
  });

  it('preserves a future temporary stream instead of overwriting or removing it', () => {
    const root = join(scratch, 'future-temp');
    const capture = open(root, 'thread');
    const temp = `${capture.path!}.${process.pid}.tmp`;
    const original = `${JSON.stringify({ ...readCaptureFile(capture.path!).header, mappingVersion: 99 })}\n`;
    writeFileSync(temp, original);
    expect(open(root, 'thread').path).toBeUndefined();
    expect(canClearProjectCaptures(root, '/project/first')).toBe(false);
    for (let index = 0; index < APPSERVER_CAPTURE_MAX_FILES + 1; index += 1) open(root, `other-${index}`, '/project/second');
    expect(readFileSync(temp, 'utf8')).toBe(original);
  });
});
