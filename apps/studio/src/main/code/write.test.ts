import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CodeSnapshot } from '@studio/events';
import { readCodeFile } from './read.js';
import { writeCodeFile } from './write.js';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-code-write-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The snapshot a tab holds, taken the way the panel takes it. */
function open(path: string): { text: string; snapshot: CodeSnapshot } {
  const answer = readCodeFile(root, { path });
  if (!answer.ok) throw new Error(`fixture unreadable: ${answer.code}`);
  return { text: answer.text, snapshot: answer.snapshot };
}

function seed(path: string, text: string, mode?: number): void {
  const full = join(root, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, text);
  if (mode !== undefined) chmodSync(full, mode);
}

describe('saving a file (ONL-2563)', () => {
  it('refuses text writes to image previews without changing their bytes', () => {
    seed('photo.png', 'original image bytes');
    const tab = open('photo.png');
    expect(writeCodeFile(root, { path: 'photo.png', text: '', expected: tab.snapshot })).toEqual({ ok: false, code: 'unwritable' });
    expect(readFileSync(join(root, 'photo.png'), 'utf8')).toBe('original image bytes');
    expect(writeCodeFile(root, { path: 'gone.svg', text: '', expected: tab.snapshot })).toEqual({ ok: false, code: 'unwritable' });
  });

  it('puts the new text on disk', () => {
    seed('a.css', 'a { color: #aabbcc; }\n');
    const tab = open('a.css');
    const answer = writeCodeFile(root, { path: 'a.css', text: 'a { color: #ddeeff; }\n', expected: tab.snapshot });
    expect(answer.ok).toBe(true);
    expect(readFileSync(join(root, 'a.css'), 'utf8')).toBe('a { color: #ddeeff; }\n');
  });

  /* Without adopting the returned snapshot the second save judges itself
     against a file its own first save superseded. */
  it('returns a snapshot the tab can save against again', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    const first = writeCodeFile(root, { path: 'a.css', text: 'two\n', expected: tab.snapshot });
    if (!first.ok) throw new Error(first.code);
    const second = writeCodeFile(root, { path: 'a.css', text: 'three\n', expected: first.snapshot });
    expect(second.ok).toBe(true);
    expect(readFileSync(join(root, 'a.css'), 'utf8')).toBe('three\n');
  });

  it('refuses a write whose expected snapshot no longer matches disk', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    writeFileSync(join(root, 'a.css'), 'somebody else\n');
    const answer = writeCodeFile(root, { path: 'a.css', text: 'mine\n', expected: tab.snapshot });
    expect(answer).toEqual({ ok: false, code: 'stale' });
    expect(readFileSync(join(root, 'a.css'), 'utf8')).toBe('somebody else\n');
  });

  /* Keeping the designer's version adopts the snapshot the clash was raised
     against, so the next save overwrites deliberately. */
  it('overwrites once the tab has adopted what is actually on disk', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    writeFileSync(join(root, 'a.css'), 'theirs\n');
    expect(writeCodeFile(root, { path: 'a.css', text: 'mine\n', expected: tab.snapshot }).ok).toBe(false);
    const adopted = open('a.css').snapshot;
    expect(writeCodeFile(root, { path: 'a.css', text: 'mine\n', expected: adopted }).ok).toBe(true);
    expect(readFileSync(join(root, 'a.css'), 'utf8')).toBe('mine\n');
  });

  it('does not call a rewrite of identical bytes a foreign change', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    // Same bytes, new modification time.
    writeFileSync(join(root, 'a.css'), 'one\n');
    expect(writeCodeFile(root, { path: 'a.css', text: 'two\n', expected: tab.snapshot }).ok).toBe(true);
  });
});

describe('what a save preserves', () => {
  it('round-trips a file with Windows line endings unchanged', () => {
    seed('w.ts', 'a\r\nb\r\n');
    const tab = open('w.ts');
    const answer = writeCodeFile(root, { path: 'w.ts', text: tab.text, expected: tab.snapshot });
    expect(answer.ok).toBe(true);
    expect(readFileSync(join(root, 'w.ts'), 'utf8')).toBe('a\r\nb\r\n');
  });

  it('writes a changed line back with the file’s own ending, not the editor’s', () => {
    seed('w.ts', 'a\r\nb\r\n');
    const tab = open('w.ts');
    writeCodeFile(root, { path: 'w.ts', text: 'a\nchanged\n', expected: tab.snapshot });
    expect(readFileSync(join(root, 'w.ts'), 'utf8')).toBe('a\r\nchanged\r\n');
  });

  it('keeps a file’s mode', () => {
    seed('run.sh', '#!/bin/sh\n', 0o755);
    const tab = open('run.sh');
    writeCodeFile(root, { path: 'run.sh', text: '#!/bin/sh\necho hi\n', expected: tab.snapshot });
    expect(statSync(join(root, 'run.sh')).mode & 0o777).toBe(0o755);
  });

  it('keeps a byte-order mark', () => {
    writeFileSync(join(root, 'b.ts'), '﻿const a = 1;\n');
    const tab = open('b.ts');
    writeCodeFile(root, { path: 'b.ts', text: 'const a = 2;\n', expected: tab.snapshot });
    expect(readFileSync(join(root, 'b.ts')).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  });
});

describe('what a save refuses', () => {
  it('refuses a path that resolves outside the worktree, and touches nothing', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    const answer = writeCodeFile(root, { path: '../escape.css', text: 'x', expected: tab.snapshot });
    expect(answer).toEqual({ ok: false, code: 'out-of-scope' });
  });

  it('refuses when no project is open', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    expect(writeCodeFile(undefined, { path: 'a.css', text: 'x', expected: tab.snapshot })).toEqual({
      ok: false,
      code: 'no-project',
    });
  });

  it('refuses a path that is a directory rather than writing into it', () => {
    seed('dir/a.css', 'one\n');
    const tab = open('dir/a.css');
    expect(writeCodeFile(root, { path: 'dir', text: 'x', expected: tab.snapshot })).toEqual({
      ok: false,
      code: 'unwritable',
    });
  });

  /* A dirty tab whose file was deleted keeps its text and recreates it on save;
     containment on the nearest EXISTING ancestor is what makes that sound. */
  it('recreates a file that was deleted after it was opened', () => {
    seed('a.css', 'one\n');
    const tab = open('a.css');
    rmSync(join(root, 'a.css'));
    const answer = writeCodeFile(root, { path: 'a.css', text: 'back\n', expected: tab.snapshot });
    expect(answer.ok).toBe(true);
    expect(readFileSync(join(root, 'a.css'), 'utf8')).toBe('back\n');
  });
});
