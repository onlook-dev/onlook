import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';

const { resetFirstPromptCacheForTesting, takeFirstPrompt } = await import('./first-prompt.js');

const made: string[] = [];
const originalRoot = process.env['STUDIO_STATE_ROOT'];

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'studio-first-prompt-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  resetFirstPromptCacheForTesting();
});

afterEach(() => {
  resetFirstPromptCacheForTesting();
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('takeFirstPrompt', () => {
  it('preserves future metadata while deduplicating only in memory', () => {
    const path = join(process.env['STUDIO_STATE_ROOT']!, 'prompted-projects.json');
    const bytes = '{"version":99,"data":["p1"]}\n';
    writeFileSync(path, bytes);
    expect(takeFirstPrompt('p1')).toBe(true);
    expect(takeFirstPrompt('p1')).toBe(false);
    resetFirstPromptCacheForTesting();
    expect(takeFirstPrompt('p1')).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('reads legacy arrays and writes versioned project ids', () => {
    const path = join(process.env['STUDIO_STATE_ROOT']!, 'prompted-projects.json');
    writeFileSync(path, '["legacy"]');
    expect(takeFirstPrompt('legacy')).toBe(false);
    expect(takeFirstPrompt('next')).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ version: 1, data: ['legacy', 'next'] });
  });
  it('stays false across a relaunch — the whole reason this is on disk', () => {
    expect(takeFirstPrompt('p1')).toBe(true);
    resetFirstPromptCacheForTesting();
    expect(takeFirstPrompt('p1')).toBe(false);
  });

  it('tracks projects independently', () => {
    expect(takeFirstPrompt('p1')).toBe(true);
    expect(takeFirstPrompt('p2')).toBe(true);
    expect(takeFirstPrompt('p1')).toBe(false);
  });

  it('a corrupt file reads as nothing prompted rather than throwing in a prompt path', () => {
    const root = process.env['STUDIO_STATE_ROOT'] as string;
    require('node:fs').writeFileSync(join(root, 'prompted-projects.json'), 'not json');
    resetFirstPromptCacheForTesting();
    expect(takeFirstPrompt('p1')).toBe(true);
  });
});
