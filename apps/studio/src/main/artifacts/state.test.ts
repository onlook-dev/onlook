import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { canWriteArtifactIndex, readArtifactIndex, resetArtifactIndexCache, updateArtifactIndex, writeArtifactIndex } from './state.js';

const originalRoot = process.env['STUDIO_STATE_ROOT'];
const made: string[] = [];
const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const path = (): string => join(process.env['STUDIO_STATE_ROOT']!, 'artifacts-index.json');

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'studio-artifact-state-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  resetArtifactIndexCache();
});

afterEach(() => {
  resetArtifactIndexCache();
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
});

afterAll(() => {
  for (const root of made) rmSync(root, { recursive: true, force: true });
});

describe('artifact index persistence', () => {
  it('throws on a future first write and update instead of reporting a successful commit', () => {
    const bytes = JSON.stringify({ version: 99, data: { artifacts: { [id]: { id, title: 'Future' } }, collections: { pinned: [id] } } });
    writeFileSync(path(), bytes);
    expect(() => writeArtifactIndex({ artifacts: {} })).toThrow();
    expect(canWriteArtifactIndex()).toBe(false);
    expect(readArtifactIndex().artifacts[id]).toMatchObject({ title: 'Future' });
    expect(() => updateArtifactIndex(() => ({ artifacts: {} }))).toThrow();
    resetArtifactIndexCache();
    expect(readArtifactIndex()).toMatchObject({ collections: { pinned: [id] } });
    expect(readFileSync(path(), 'utf8')).toBe(bytes);
  });

  it('migrates a legacy index without losing sibling fields and refreshes the read cache after writes', () => {
    writeFileSync(path(), JSON.stringify({ artifacts: {}, collections: { pinned: [id] } }));
    expect(readArtifactIndex()).toMatchObject({ collections: { pinned: [id] } });
    expect(JSON.parse(readFileSync(path(), 'utf8')).version).toBe(1);
    updateArtifactIndex((index) => ({ ...index, collections: { pinned: [] } }));
    expect(readArtifactIndex()).toMatchObject({ collections: { pinned: [] } });
  });
});
