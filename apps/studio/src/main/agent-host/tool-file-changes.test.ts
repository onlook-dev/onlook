import { describe, expect, it } from 'bun:test';
import { toolFileChanges } from './tool-file-changes.js';
import { DELETE_PROJECT_FILE_TOOL, DELETE_PROJECT_FILE_TOOL_NAME } from './tool-names.js';

describe('structured tool file changes', () => {
  it('excludes unchanged context in replacement blocks and matches unified patch counts', () => {
    const before = 'a\nb\nc\nd\ne\n';
    const after = 'a\nx\nc\ny\ne\n';
    const claude = toolFileChanges('Edit', { file_path: 'a.ts', old_string: before, new_string: after }, '/work')[0];
    const codex = toolFileChanges('fileChange', { changes: [{ path: '/work/a.ts', kind: { type: 'update' }, diff: '@@ -1,5 +1,5 @@\n a\n-b\n+x\n c\n-d\n+y\n e' }] }, '/work')[0];
    expect(claude).toEqual({ path: 'a.ts', operation: 'edit', additions: 2, deletions: 2 });
    expect(claude).toEqual(codex);
    expect(toolFileChanges('MultiEdit', { file_path: 'a.ts', edits: [{ old_string: before, new_string: after }, { old_string: 'a\nx\nc\n', new_string: 'a\nc\n' }] }, '/work')[0]).toMatchObject({ additions: 2, deletions: 3 });
    expect(toolFileChanges('Edit', { file_path: 'a.ts', old_string: before, new_string: before }, '/work')[0]).toMatchObject({ additions: 0, deletions: 0 });
  });
  it('bounds replacement diff work while trimming large unchanged prefixes', () => {
    const prefix = 'same\n'.repeat(3000);
    expect(toolFileChanges('Edit', { file_path: 'a.ts', old_string: `${prefix}old\n`, new_string: `${prefix}new\n` }, '/work')[0]).toMatchObject({ additions: 1, deletions: 1 });
    expect(toolFileChanges('Edit', { file_path: 'a.ts', old_string: 'old\n'.repeat(2000), new_string: 'new\n'.repeat(2000) }, '/work')[0]).not.toHaveProperty('additions');
  });
  it('preserves newline-only edits consistently with unified patches', () => {
    for (const [old_string, new_string] of [['hello', 'hello\n'], ['hello\n', 'hello']]) {
      const claude = toolFileChanges('Edit', { file_path: 'a.ts', old_string, new_string }, '/work');
      const codex = toolFileChanges('fileChange', { changes: [{ path: '/work/a.ts', kind: { type: 'update' }, diff: '@@ -1 +1 @@\n-hello\n+hello\n\\ No newline at end of file' }] }, '/work');
      expect(claude).toEqual(codex);
      expect(claude[0]).toMatchObject({ additions: 1, deletions: 1 });
    }
  });
  it('counts supplied edits and new contents without counting trailing newlines twice', () => {
    expect(toolFileChanges('Edit', { file_path: 'a.ts', old_string: 'before\n', new_string: 'after\nmore\n' }, '/work')).toEqual([{ path: 'a.ts', operation: 'edit', additions: 2, deletions: 1 }]);
    expect(toolFileChanges('Write', { file_path: 'a.ts', content: 'one\ntwo\n' }, '/work', () => false)).toEqual([{ path: 'a.ts', operation: 'create', additions: 2, deletions: 0 }]);
    expect(toolFileChanges('Write', { file_path: 'a.ts', content: '' }, '/work', () => false)[0]).toMatchObject({ additions: 0, deletions: 0 });
    expect(toolFileChanges('MultiEdit', { file_path: 'a.ts', edits: [{ old_string: 'one', new_string: 'two\nthree' }, { old_string: 'four', new_string: '' }] }, '/work')[0]).toMatchObject({ additions: 2, deletions: 2 });
  });
  it('does not manufacture counts for overwrites or replace-all with unknown multiplicity', () => {
    expect(toolFileChanges('Write', { file_path: 'a.ts', content: 'new' }, '/work', () => true)[0]).not.toHaveProperty('additions');
    expect(toolFileChanges('Edit', { file_path: 'a.ts', old_string: 'old', new_string: 'new', replace_all: true }, '/work')[0]).not.toHaveProperty('additions');
  });
  it('counts each unified diff without counting headers, including header-like content', () => {
    expect(toolFileChanges('fileChange', { changes: [
      { path: '/work/a.ts', kind: { type: 'update' }, diff: '--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,3 @@\n-old\n+++content\n+new\n context\n@@ -9 +10 @@\n-end\n+done' },
      { path: '/work/new.ts', kind: { type: 'add' }, diff: '@@ -0,0 +1 @@\n+hello\n' },
    ] }, '/work')).toEqual([
      { path: 'a.ts', operation: 'edit', additions: 3, deletions: 2 },
      { path: 'new.ts', operation: 'create', additions: 1, deletions: 0 },
    ]);
  });
  it('normalizes Claude writers and distinguishes create from overwrite before execution', () => {
    expect(toolFileChanges('Write', { file_path: '/work/new.ts' }, '/work', () => false)).toEqual([{ path: 'new.ts', operation: 'create' }]);
    expect(toolFileChanges('Write', { file_path: 'existing.ts' }, '/work', () => true)).toEqual([{ path: 'existing.ts', operation: 'edit' }]);
    expect(toolFileChanges('MultiEdit', { file_path: './src/a.ts' }, '/work')).toEqual([{ path: 'src/a.ts', operation: 'edit' }]);
    expect(toolFileChanges('NotebookEdit', { notebook_path: 'notes.ipynb' }, '/work')).toEqual([{ path: 'notes.ipynb', operation: 'edit' }]);
  });
  it('excludes reads, commands, malformed paths and targets outside the worktree', () => {
    for (const name of ['Read', 'Bash', 'mcp__external__Write']) expect(toolFileChanges(name, { file_path: 'a.ts' }, '/work')).toEqual([]);
    for (const file_path of ['../secret', '/other/a.ts', '', '.', null, 42]) expect(toolFileChanges('Edit', { file_path }, '/work')).toEqual([]);
    expect(toolFileChanges('Edit', null, '/work')).toEqual([]);
  });
  it('does not recheck existence after a Write target was classified', () => {
    const known = new Map([['new.ts', { path: 'new.ts', operation: 'create' as const }]]);
    expect(toolFileChanges('Write', { file_path: 'new.ts' }, '/work', () => { throw new Error('unexpected second existence check'); }, known))
      .toEqual([{ path: 'new.ts', operation: 'create' }]);
  });
  it('recognizes only the owned deletion tool, not similarly named external tools', () => {
    expect(toolFileChanges(DELETE_PROJECT_FILE_TOOL, { path: 'src/old.ts' }, '/work')).toEqual([{ path: 'src/old.ts', operation: 'delete' }]);
    expect(toolFileChanges(DELETE_PROJECT_FILE_TOOL_NAME, { path: 'src/old.ts' }, '/work')).toEqual([{ path: 'src/old.ts', operation: 'delete' }]);
    expect(toolFileChanges('dynamicToolCall', { tool: DELETE_PROJECT_FILE_TOOL_NAME, arguments: { path: 'src/old.ts' } }, '/work')).toEqual([{ path: 'src/old.ts', operation: 'delete' }]);
    expect(toolFileChanges(DELETE_PROJECT_FILE_TOOL, { path: '../outside.ts' }, '/work')).toEqual([]);
    expect(toolFileChanges('mcp__external__delete_project_file', { path: 'src/old.ts' }, '/work')).toEqual([]);
  });
  it('retains each Codex operation in a mixed batch, including move destinations', () => {
    expect(toolFileChanges('fileChange', { changes: [
      { path: '/work/new.ts', kind: { type: 'add' } },
      { path: '/work/old.ts', kind: { type: 'delete' } },
      { path: '/work/src/a.ts', kind: { type: 'update', move_path: '/work/src/b.ts' } },
      { path: '/other/secret', kind: { type: 'update' } },
      null,
    ] }, '/work')).toEqual([
      { path: 'new.ts', operation: 'create' }, { path: 'old.ts', operation: 'delete' },
      { path: 'src/a.ts', operation: 'delete' }, { path: 'src/b.ts', operation: 'create' },
    ]);
  });
});
