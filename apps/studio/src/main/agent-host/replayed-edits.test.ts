import { afterEach, expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { applyRecordedFileTool } from './replayed-edits.js';

const RECORDED = '<home>/recorded/worktree';

afterEach(cleanupTempFixtures);

function worktree(): string {
  const cwd = makeStateRoot({ name: 'replayed-edits' });
  writeFileSync(join(cwd, 'index.html'), '<h1>Fixture Bakery</h1><p>Fixture Bakery</p>');
  return cwd;
}

test('a recorded Edit lands on the same file in this run', () => {
  const cwd = worktree();
  const outcome = applyRecordedFileTool(
    { name: 'Edit', input: { file_path: `${RECORDED}/index.html`, old_string: '<h1>Fixture Bakery', new_string: '<h1>Fresh from the oven' } },
    RECORDED,
    cwd,
  );
  expect(outcome).toEqual({ applied: join(cwd, 'index.html') });
  expect(readFileSync(join(cwd, 'index.html'), 'utf8')).toBe('<h1>Fresh from the oven</h1><p>Fixture Bakery</p>');
});

test('replace_all and MultiEdit apply every recorded change', () => {
  const cwd = worktree();
  applyRecordedFileTool({ name: 'Edit', input: { file_path: `${RECORDED}/index.html`, old_string: 'Fixture', new_string: 'Crumb', replace_all: true } }, RECORDED, cwd);
  applyRecordedFileTool(
    { name: 'MultiEdit', input: { file_path: `${RECORDED}/index.html`, edits: [{ old_string: 'h1', new_string: 'h2', replace_all: true }, { old_string: '<p>', new_string: '<p class="lede">' }] } },
    RECORDED,
    cwd,
  );
  expect(readFileSync(join(cwd, 'index.html'), 'utf8')).toBe('<h2>Crumb Bakery</h2><p class="lede">Crumb Bakery</p>');
});

test('a recorded Write creates the file, folders included', () => {
  const cwd = worktree();
  applyRecordedFileTool({ name: 'Write', input: { file_path: `${RECORDED}/src/routes/pricing.html`, content: 'pricing' } }, RECORDED, cwd);
  expect(readFileSync(join(cwd, 'src/routes/pricing.html'), 'utf8')).toBe('pricing');
});

test('nothing outside the recorded worktree is written', () => {
  const cwd = worktree();
  expect(applyRecordedFileTool({ name: 'Write', input: { file_path: '<scratchpad-1>/numbers.txt', content: 'x' } }, RECORDED, cwd)).toEqual({ skipped: 'outside-worktree' });
  expect(applyRecordedFileTool({ name: 'Write', input: { file_path: `${RECORDED}/../escape.txt`, content: 'x' } }, RECORDED, cwd)).toEqual({ skipped: 'outside-worktree' });
});

test('an edit whose text is gone, or whose file is missing, is skipped rather than guessed', () => {
  const cwd = worktree();
  expect(applyRecordedFileTool({ name: 'Edit', input: { file_path: `${RECORDED}/index.html`, old_string: 'Sourdough', new_string: 'Rye' } }, RECORDED, cwd)).toEqual({ skipped: 'text-gone' });
  expect(applyRecordedFileTool({ name: 'Edit', input: { file_path: `${RECORDED}/missing.html`, old_string: 'a', new_string: 'b' } }, RECORDED, cwd)).toEqual({ skipped: 'text-gone' });
});
