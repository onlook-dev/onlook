import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { pruneCrashDumps } from './crash-dumps.js';

const made: string[] = [];

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('pruneCrashDumps', () => {
  it('keeps the newest N and drops the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-dumps-'));
    made.push(dir);
    for (let n = 0; n < 12; n += 1) {
      const path = join(dir, `dump-${String(n).padStart(2, '0')}.dmp`);
      writeFileSync(path, 'x');
      const when = new Date(1_700_000_000_000 + n * 1000);
      utimesSync(path, when, when);
    }
    expect(pruneCrashDumps(dir, 10)).toBe(2);
    expect(readdirSync(dir).sort()).toEqual(Array.from({ length: 10 }, (_, i) => `dump-${String(i + 2).padStart(2, '0')}.dmp`));
  });

  it('an absent directory is not an error', () => {
    expect(pruneCrashDumps(join(tmpdir(), 'studio-dumps-nowhere'))).toBe(0);
  });
});
