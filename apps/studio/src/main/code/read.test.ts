import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { CODE_READ_MAX_BYTES, readCodeFile } from './read.js';
import { CODE_IMAGE_MAX_BYTES } from '@studio/events';

const CRLF_FILE = 'src/windows.ts';

let worktree: string;

beforeAll(() => {
  worktree = makeDirWithFiles({
    name: 'code-read',
    files: {
      'src/App.tsx': 'export const App = () => null;\n',
      [CRLF_FILE]: 'const a = 1;\r\nconst b = 2;\r\n',
      'src/exec.sh': '#!/bin/sh\necho hi\n',
    },
  });
  writeFileSync(join(worktree, 'src/icon.bin'), Buffer.from([0x50, 0x4b, 0x00, 0x01]));
  writeFileSync(join(worktree, 'src/latin1.txt'), Buffer.from([0x68, 0x69, 0xff, 0x0a]));
  writeFileSync(join(worktree, 'src/bom.ts'), `﻿export const bom = true;\n`);
  writeFileSync(join(worktree, 'src/huge.ts'), 'x'.repeat(CODE_READ_MAX_BYTES + 1));
  chmodSync(join(worktree, 'src/exec.sh'), 0o755);
});

afterAll(() => {
  cleanupTempFixtures();
});

describe('reading a file in the Project', () => {
  it('returns image bytes as a scoped preview instead of editable text', () => {
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    writeFileSync(join(worktree, 'src/photo.PNG'), bytes);
    const result = readCodeFile(worktree, { path: 'src/photo.PNG' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe('');
    expect(result.image?.dataUrl).toBe(`data:image/png;base64,${bytes.toString('base64')}`);
    expect(result.snapshot.size).toBe(bytes.byteLength);
    expect(result.snapshot.hash).toMatch(/^[0-9a-f]{64}$/);
    writeFileSync(join(worktree, 'src/png'), 'ordinary extensionless text');
    const plain = readCodeFile(worktree, { path: 'src/png' });
    expect(plain.ok && plain.image === undefined && plain.text === 'ordinary extensionless text').toBe(true);
  });

  it('uses the image cap without raising the text cap', () => {
    writeFileSync(join(worktree, 'src/large.png'), Buffer.alloc(CODE_READ_MAX_BYTES + 1));
    expect(readCodeFile(worktree, { path: 'src/large.png' }).ok).toBe(true);
    writeFileSync(join(worktree, 'src/oversize.png'), Buffer.alloc(CODE_IMAGE_MAX_BYTES + 1));
    expect(readCodeFile(worktree, { path: 'src/oversize.png' })).toEqual({ ok: false, code: 'too-large' });
    expect(readCodeFile(worktree, { path: '../photo.png' })).toEqual({ ok: false, code: 'out-of-scope' });
    expect(readCodeFile(undefined, { path: 'src/photo.PNG' })).toEqual({ ok: false, code: 'no-project' });
  });

  it('keeps SVG in an image context rather than rendering its markup', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>throw 1</script></svg>';
    writeFileSync(join(worktree, 'src/vector.svg'), svg);
    const result = readCodeFile(worktree, { path: 'src/vector.svg' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe('');
    expect(result.image?.dataUrl).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  });

  it('answers its text with the snapshot a save is judged against', () => {
    const result = readCodeFile(worktree, { path: 'src/App.tsx' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe('src/App.tsx');
    expect(result.text).toBe('export const App = () => null;\n');
    expect(result.snapshot.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.snapshot.size).toBe(31);
    expect(result.snapshot.eol).toBe('\n');
    expect(result.snapshot.bom).toBe(false);
  });

  it('carries the line ending a Windows file was written with', () => {
    const result = readCodeFile(worktree, { path: CRLF_FILE });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.eol).toBe('\r\n');
    expect(result.text).toBe('const a = 1;\r\nconst b = 2;\r\n');
  });

  it("carries the file's permission bits", () => {
    const result = readCodeFile(worktree, { path: 'src/exec.sh' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.mode).toBe(0o755);
  });

  it('takes the byte-order mark off the text and records that it was there', () => {
    const result = readCodeFile(worktree, { path: 'src/bom.ts' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe('export const bom = true;\n');
    expect(result.snapshot.bom).toBe(true);
  });
});

describe('a read that cannot be answered', () => {
  it('names a missing file rather than answering empty text', () => {
    expect(readCodeFile(worktree, { path: 'src/gone.tsx' })).toEqual({
      ok: false,
      code: 'not-found',
    });
  });

  it('refuses a file holding a NUL byte', () => {
    expect(readCodeFile(worktree, { path: 'src/icon.bin' })).toEqual({
      ok: false,
      code: 'not-text',
    });
  });

  it('refuses a file that is not valid UTF-8', () => {
    expect(readCodeFile(worktree, { path: 'src/latin1.txt' })).toEqual({
      ok: false,
      code: 'not-text',
    });
  });

  it('refuses a file past the byte cap with its own code', () => {
    expect(readCodeFile(worktree, { path: 'src/huge.ts' })).toEqual({
      ok: false,
      code: 'too-large',
    });
  });

  it('refuses a directory, which is there but is not a file', () => {
    expect(readCodeFile(worktree, { path: 'src' })).toEqual({ ok: false, code: 'unreadable' });
  });

  it('refuses a path that resolves outside the worktree', () => {
    expect(readCodeFile(worktree, { path: '../../etc/hosts' })).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('refuses a view the routing does not place in a Project', () => {
    expect(readCodeFile(undefined, { path: 'src/App.tsx' })).toEqual({
      ok: false,
      code: 'no-project',
    });
  });
});
