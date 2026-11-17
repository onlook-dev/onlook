import { describe, expect, it } from 'bun:test';
import { foldersTo, treeRows } from './tree.js';

/** `src` holds nothing but one folder all the way down, so the chain is collapsible. */
const CHAIN = ['src/components/ui/Button.tsx', 'src/components/ui/Card.tsx', 'README.md'];

/** `src` holds a file beside its folder, which is a real fork. */
const FORK = ['src/components/Button.tsx', 'src/theme.css', 'docs/guide.md'];

const labels = (paths: readonly string[], open: string | null): string[] =>
  treeRows(paths, { openPath: open }).map((row) => row.label);

describe('the Files tree (ONL-2563)', () => {
  it('collapses a chain of single-child folders onto one row', () => {
    expect(labels(CHAIN, null)).toEqual(['src/components/ui', 'README.md']);
  });

  /* A folder holding a file beside its one folder is a fork, not a chain, so it
     keeps its own row — collapsing it would hide the file. */
  it('does not collapse a folder that also holds a file', () => {
    expect(labels(FORK, null)).toContain('src');
    expect(labels(FORK, null)).not.toContain('src/components');
  });

  it('opens exactly the path to the open file and nothing else', () => {
    const rows = treeRows(FORK, { openPath: 'src/components/Button.tsx' });
    const open = rows.filter((row) => row.kind === 'folder' && row.isOpen === true).map((row) => row.path);
    expect(open).toEqual(['src', 'src/components']);
    expect(rows.map((row) => row.path)).toContain('src/components/Button.tsx');
  });

  it('draws no file from a folder that is closed', () => {
    expect(treeRows(CHAIN, { openPath: null }).map((row) => row.path)).not.toContain('src/components/ui/Button.tsx');
  });

  it('puts folders before files, each alphabetical', () => {
    expect(labels(CHAIN, null)).toEqual(['src/components/ui', 'README.md']);
    expect(labels(FORK, null)).toEqual(['docs', 'src']);
  });

  it('indents a file under the folder it was found in', () => {
    const rows = treeRows(CHAIN, { openPath: 'src/components/ui/Button.tsx' });
    const file = rows.find((row) => row.path === 'src/components/ui/Button.tsx');
    const folder = rows.find((row) => row.path === 'src/components/ui');
    expect(file?.depth).toBe((folder?.depth ?? 0) + 1);
  });

  it('draws nothing for an empty project', () => {
    expect(treeRows([], {})).toEqual([]);
  });
});

describe('folders the designer opens (ONL-2563)', () => {
  /* The dead end this fixes: with no open file and no expansion, a nested file
     could only be reached through search. */
  it('opens a folder the designer expanded, with no file open', () => {
    const rows = treeRows(CHAIN, { overrides: new Map([['src/components/ui', true]]) });
    expect(rows.map((row) => row.path)).toContain('src/components/ui/Button.tsx');
  });

  it('keeps a folder nobody opened closed, and its children out of the rows', () => {
    const rows = treeRows(FORK, { overrides: new Map([['src', true]]) });
    expect(rows.map((row) => row.path)).toContain('src/components');
    expect(rows.map((row) => row.path)).not.toContain('src/components/Button.tsx');
  });

  /* A collapsed chain is one row, so the key a press toggles has to be that
     row's own path — keying on a segment inside the chain toggles nothing. */
  it('keys a collapsed chain on the row’s own path', () => {
    const [row] = treeRows(CHAIN, {});
    expect(row?.path).toBe('src/components/ui');
    expect(treeRows(CHAIN, { overrides: new Map([[row?.path ?? '', true]]) }).length).toBeGreaterThan(1);
  });

  it('opens everything for a search, so no match hides behind a closed folder', () => {
    const rows = treeRows(FORK, { isExpandedAll: true });
    expect(rows.map((row) => row.path)).toContain('src/components/Button.tsx');
  });

  it('still opens the path to the file that is open', () => {
    const rows = treeRows(FORK, { openPath: 'src/components/Button.tsx' });
    expect(rows.map((row) => row.path)).toContain('src/components/Button.tsx');
  });

  it('names every folder on the way to a file, and none for none', () => {
    expect(foldersTo('src/components/ui/Button.tsx')).toEqual(['src', 'src/components', 'src/components/ui']);
    expect(foldersTo(null)).toEqual([]);
  });
});

describe('closing a folder the open file is inside (ONL-2563)', () => {
  /* The open file's path forces its folders open. Without an explicit close the
     folder you are working in is the one folder you can never fold away. */
  it('lets the designer close an ancestor of the open file', () => {
    const open = 'src/components/Button.tsx';
    expect(treeRows(FORK, { openPath: open }).map((row) => row.path)).toContain(open);
    const closed = treeRows(FORK, { openPath: open, overrides: new Map([['src', false]]) });
    expect(closed.map((row) => row.path)).not.toContain(open);
    expect(closed.map((row) => row.path)).toContain('src');
  });

  it('reports the folder as closed, so the disclosure points the right way', () => {
    const closed = treeRows(FORK, { openPath: 'src/components/Button.tsx', overrides: new Map([['src', false]]) });
    expect(closed.find((row) => row.path === 'src')?.isOpen).toBe(false);
  });

  it('lets a decision be reversed', () => {
    const rows = treeRows(FORK, { openPath: null, overrides: new Map([['src', true]]) });
    expect(rows.map((row) => row.path)).toContain('src/components');
    const again = treeRows(FORK, { openPath: null, overrides: new Map([['src', false]]) });
    expect(again.map((row) => row.path)).not.toContain('src/components');
  });

  it('closes a folder a search had opened', () => {
    const rows = treeRows(FORK, { isExpandedAll: true, overrides: new Map([['src', false]]) });
    expect(rows.map((row) => row.path)).not.toContain('src/components');
  });
});
