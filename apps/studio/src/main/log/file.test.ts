import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { createLogFile } from './file.js';

const made: string[] = [];

function dir(): string {
  const d = mkdtempSync(join(tmpdir(), 'studio-logfile-'));
  made.push(d);
  return d;
}

afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

describe('createLogFile', () => {
  it('rotates past the cap, keeps the history bound, and the current file starts fresh', () => {
    const d = dir();
    const file = createLogFile(d, { maxBytes: 100, history: 2 });
    const line = (n: number): string => `${String(n).padStart(2, '0')}${'x'.repeat(37)}\n`; // 40 bytes
    for (let n = 1; n <= 8; n += 1) file.append(line(n));
    expect(readFileSync(join(d, 'studio.log'), 'utf8')).toBe(line(7) + line(8));
    expect(readFileSync(join(d, 'studio.log.1'), 'utf8')).toBe(line(5) + line(6));
    expect(readFileSync(join(d, 'studio.log.2'), 'utf8')).toBe(line(3) + line(4));
    expect(existsSync(join(d, 'studio.log.3'))).toBe(false);
  });

  it('a rotated file and the fresh one are both mode 0600', () => {
    const d = dir();
    const file = createLogFile(d, { maxBytes: 10, history: 1 });
    file.append('aaaaaaaa\n');
    file.append('bbbbbbbb\n');
    expect(statSync(join(d, 'studio.log')).mode & 0o777).toBe(0o600);
    expect(statSync(join(d, 'studio.log.1')).mode & 0o777).toBe(0o600);
  });

  it('a line larger than the cap still lands', () => {
    const d = dir();
    const file = createLogFile(d, { maxBytes: 10, history: 1 });
    file.append('a'.repeat(50));
    expect(readFileSync(join(d, 'studio.log'), 'utf8')).toHaveLength(50);
  });

  it("resumes an existing file's size on a relaunch", () => {
    const d = dir();
    createLogFile(d, { maxBytes: 20, history: 1 }).append('1234567890\n');
    const relaunched = createLogFile(d, { maxBytes: 20, history: 1 });
    relaunched.append('1234567890\n');
    relaunched.append('x\n');
    expect(readFileSync(join(d, 'studio.log'), 'utf8')).toBe('1234567890\nx\n');
    expect(readFileSync(join(d, 'studio.log.1'), 'utf8')).toBe('1234567890\n');
  });
});
