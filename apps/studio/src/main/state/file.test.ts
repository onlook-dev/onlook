import { afterAll, describe, expect, it } from 'bun:test';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { decodeStateFile, eraseStateFile, readStateFile, writeStateFile } from './file.js';

afterAll(cleanupTempFixtures);

describe('versioned saved files', () => {
  it('recognises legacy and inline versioned formats without changing their payloads', () => {
    expect(decodeStateFile([1, 2], 1)).toEqual({ kind: 'data', version: 0, data: [1, 2] });
    expect(decodeStateFile({ schemaVersion: 2, title: 'kept' }, 1, { inline: true, versionKey: 'schemaVersion' })).toEqual({ kind: 'future', version: 2, data: { schemaVersion: 2, title: 'kept' } });
  });

  it('writes a private envelope, reads it back and erases only its own file', () => {
    const root = makeStateRoot({ name: 'state-file' });
    const path = join(root, 'thing.json');
    expect(readStateFile(path, 1)).toEqual({ kind: 'missing' });
    expect(writeStateFile(path, 1, { value: 'kept' })).toBe(true);
    expect(readStateFile(path, 1)).toEqual({ kind: 'data', version: 1, data: { value: 'kept' } });
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(eraseStateFile(path, 1)).toBe(true);
    expect(readStateFile(path, 1)).toEqual({ kind: 'missing' });
  });

  it('refuses replacements and erases of future inline formats without changing a byte', () => {
    const root = makeStateRoot({ name: 'state-future-inline' });
    const path = join(root, 'manifest.json');
    const bytes = '{ "schemaVersion": 90, "title": "future" }\n';
    const format = { inline: true, versionKey: 'schemaVersion' } as const;
    writeFileSync(path, bytes);
    expect(writeStateFile(path, 1, { title: 'old' }, format)).toBe(false);
    expect(eraseStateFile(path, 1, format)).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });
});
