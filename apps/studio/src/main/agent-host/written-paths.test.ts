import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { canonicalPath } from '../lib/canonical-path.js';
import { DELETE_PROJECT_FILE_TOOL } from './tool-names.js';
import {
  reportWrittenPaths,
  resetWrittenPathsSinkForTests,
  setWrittenPathsSink,
  writtenPath,
  writtenPathsOfCall,
} from './written-paths.js';

let raw = '';
let canonical = '';

beforeEach(() => {
  raw = mkdtempSync(join(tmpdir(), 'studio-written-'));
  canonical = canonicalPath(raw);
});
afterEach(() => {
  rmSync(raw, { recursive: true, force: true });
});

describe('which file a tool call wrote (ONL-2563)', () => {
  it('names the file an Edit wrote, worktree-relative', () => {
    expect(writtenPath('Edit', { file_path: join(canonical, 'src/a.css') }, canonical)).toBe('src/a.css');
  });

  it('names it for Write and MultiEdit too', () => {
    expect(writtenPath('Write', { file_path: join(canonical, 'a.ts') }, canonical)).toBe('a.ts');
    expect(writtenPath('MultiEdit', { file_path: join(canonical, 'a.ts') }, canonical)).toBe('a.ts');
  });

  it('reads NotebookEdit’s own path field', () => {
    expect(writtenPath('NotebookEdit', { notebook_path: join(canonical, 'analysis.ipynb') }, canonical)).toBe('analysis.ipynb');
    expect(writtenPath('NotebookEdit', { notebook_path: '/etc/analysis.ipynb' }, canonical)).toBeNull();
  });
  it('reports the owned deletion path for both direct and dynamic tool inputs', () => {
    expect(writtenPath(DELETE_PROJECT_FILE_TOOL, { path: 'src/old.ts' }, canonical)).toBe('src/old.ts');
    expect(writtenPathsOfCall(DELETE_PROJECT_FILE_TOOL, { arguments: { path: 'src/old.ts' } }, canonical)).toEqual(['src/old.ts']);
    expect(writtenPath(DELETE_PROJECT_FILE_TOOL, { path: '../outside.ts' }, canonical)).toBeNull();
  });

  /* The clash is about what CHANGED. A read marking a tab would raise a banner
     every time the agent looked at a file. */
  it('names nothing for a read', () => {
    expect(writtenPath('Read', { file_path: join(canonical, 'a.ts') }, canonical)).toBeNull();
  });

  /* A write a command made carries no path on either harness. Inventing one
     would mark files the agent never touched; the write-time refusal is what
     makes that gap acceptable rather than silent loss. */
  it('names nothing for a shell command, rather than guessing from it', () => {
    expect(writtenPath('Bash', { command: 'echo hi > a.ts' }, canonical)).toBeNull();
  });

  /**
   * The trap this module exists for: the tool's path and the worktree lookup
   * can be spelled differently on macOS, and a naive prefix test answers an
   * absolute path that then matches no tab.
   */
  it('matches when the tool’s spelling and the worktree’s differ', () => {
    const written = writtenPath('Edit', { file_path: join(canonical, 'src/a.css') }, raw);
    expect(written).toBe('src/a.css');
    expect(written?.startsWith('/')).toBe(false);
  });

  it('names nothing for a file outside the worktree', () => {
    expect(writtenPath('Edit', { file_path: '/etc/hosts' }, canonical)).toBeNull();
  });

  it('names nothing when the input carries no path at all', () => {
    expect(writtenPath('Edit', {}, canonical)).toBeNull();
    expect(writtenPath('Edit', null, canonical)).toBeNull();
  });
});

describe('a codex turn, which writes several files in ONE call', () => {
  /* The row that presents a `fileChange` shows the first change. Taking the
     presented target would mark one tab and leave the other two files changing
     under the designer with nothing on screen. */
  it('names every file the call changed, not only the first', () => {
    expect(
      writtenPathsOfCall(
        'fileChange',
        {
          changes: [
            { path: join(canonical, 'a.ts'), kind: { type: 'update' } },
            { path: join(canonical, 'b.ts'), kind: { type: 'add' } },
            { path: join(canonical, 'c.ts'), kind: { type: 'delete' } },
          ],
        },
        canonical,
      ),
    ).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('drops a change that left the worktree and keeps the rest', () => {
    expect(
      writtenPathsOfCall(
        'fileChange',
        { changes: [{ path: '/etc/passwd' }, { path: join(canonical, 'a.ts') }] },
        canonical,
      ),
    ).toEqual(['a.ts']);
  });

  /* The bug this exists for: the event log stores the PRESENTED name, so this call never
     arrives as `fileChange`. Keying on that name reported nothing on codex. */
  it('reads the changes under the name the row actually took', () => {
    const changes = [{ path: join(canonical, 'a.ts'), kind: { type: 'update' } }];
    for (const name of ['Edit', 'Write', 'Delete']) {
      expect(writtenPathsOfCall(name, { changes }, canonical)).toEqual(['a.ts']);
    }
  });

  it('answers nothing for a fileChange carrying no changes array', () => {
    expect(writtenPathsOfCall('fileChange', { changes: 'all of them' }, canonical)).toEqual([]);
    expect(writtenPathsOfCall('fileChange', {}, canonical)).toEqual([]);
  });
});

describe('reporting a write onward', () => {
  afterEach(resetWrittenPathsSinkForTests);

  it('reports the paths one call wrote, with the Project they are in', () => {
    const sent: { cwd: string; paths: readonly string[] }[] = [];
    setWrittenPathsSink((cwd, paths) => sent.push({ cwd, paths }));
    reportWrittenPaths(canonical, 'Edit', { file_path: join(canonical, 'src/a.css') });
    expect(sent).toEqual([{ cwd: canonical, paths: ['src/a.css'] }]);
  });

  /* A report for a call that wrote nothing would re-read every open tab on
     every Read the agent makes. */
  it('says nothing for a call that wrote no file', () => {
    const sent: unknown[] = [];
    setWrittenPathsSink((_cwd, paths) => sent.push(paths));
    reportWrittenPaths(canonical, 'Read', { file_path: join(canonical, 'a.ts') });
    reportWrittenPaths(canonical, 'Bash', { command: 'sed -i s/a/b/ a.ts' });
    expect(sent).toEqual([]);
  });

  it('says nothing at all before a sink is set', () => {
    expect(() => {
      reportWrittenPaths(canonical, 'Edit', { file_path: join(canonical, 'a.ts') });
    }).not.toThrow();
  });
});
