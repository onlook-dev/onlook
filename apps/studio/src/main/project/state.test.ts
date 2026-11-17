import { expect, test } from 'bun:test';
import { mkdtempSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectKey } from './key.js';
import { closeProjectState, projectMap, projectSet, projectStateHeld } from './state.js';

function worktree(): { real: string; link: string } {
  const real = realpathSync(mkdtempSync(join(tmpdir(), 'project-state-')));
  const link = join(realpathSync(mkdtempSync(join(tmpdir(), 'project-state-link-'))), 'alias');
  symlinkSync(real, link);
  return { real, link };
}

test('two spellings of one worktree are one Project key', () => {
  const { real, link } = worktree();
  expect(projectKey(link)).toBe(projectKey(real));
  const notes = projectMap<string>('test.spellings');
  notes.set(projectKey(link), 'held');
  expect(notes.get(projectKey(real))).toBe('held');
});

test('a Project\'s state is disposed when it closes, and not before', () => {
  const { real, link } = worktree();
  const other = worktree();
  const disposed: string[] = [];
  const quotes = projectMap<{ text: string }>('test.quotes', { closes: true, dispose: (value) => disposed.push(value.text) });
  const opened = projectSet('test.opened', { closes: true });
  const sessions = projectMap<string>('test.sessions');
  for (const path of [real, other.real]) {
    quotes.set(projectKey(path), { text: path });
    opened.add(projectKey(path));
    sessions.set(projectKey(path), 'running');
  }

  expect(projectStateHeld(real)).toEqual(['test.opened', 'test.quotes', 'test.sessions']);
  expect(disposed).toEqual([]);

  closeProjectState(link);

  expect(disposed).toEqual([real]);
  expect(quotes.has(projectKey(real))).toBe(false);
  expect(opened.has(projectKey(real))).toBe(false);
  expect(projectStateHeld(real)).toEqual(['test.sessions']);
  expect(projectStateHeld(other.real)).toEqual(['test.opened', 'test.quotes', 'test.sessions']);

  closeProjectState(real);
  expect(disposed).toEqual([real]);
});

test('an entry its owner deleted is not disposed again at close', () => {
  const { real } = worktree();
  const disposed: string[] = [];
  const quotes = projectMap<string>('test.owner-deleted', { closes: true, dispose: (value) => disposed.push(value) });
  quotes.set(projectKey(real), 'gone');
  quotes.delete(projectKey(real));
  closeProjectState(real);
  expect(disposed).toEqual([]);
});

test('a collection made again under one name replaces the first in the inventory', () => {
  const { real } = worktree();
  const first = projectSet('test.replaced', { closes: true });
  first.add(projectKey(real));
  const second = projectSet('test.replaced', { closes: true });
  expect(projectStateHeld(real)).not.toContain('test.replaced');
  second.add(projectKey(real));
  closeProjectState(real);
  expect(second.size).toBe(0);
  expect(first.size).toBe(1);
});
