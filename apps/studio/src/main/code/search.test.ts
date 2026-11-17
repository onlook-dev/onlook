import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { CODE_SEARCH_MAX_LINES_PER_FILE, searchCode } from './search.js';

let worktree: string;
let outside: string;

function found(query: string): {
  names: readonly string[];
  contents: readonly { path: string; total: number; lines: readonly { line: number }[] }[];
} {
  const result = searchCode(worktree, { query });
  if (!result.ok) throw new Error(`refused: ${result.code}`);
  return { names: result.names, contents: result.contents };
}

beforeAll(() => {
  outside = makeDirWithFiles({
    name: 'code-search-outside',
    files: { 'secret.ts': 'const token = "spinnaker";\n' },
  });
  worktree = makeDirWithFiles({
    name: 'code-search',
    files: {
      'src/spinnaker.ts': 'export const sail = 1;\n',
      'src/App.tsx': 'import { sail } from "./spinnaker.js";\nexport const App = () => sail;\n',
      'src/styles.css': '.hero { color: red; }\n',
      '.env': 'SPINNAKER_TOKEN=not-a-real-secret\n',
      'node_modules/left-pad/index.js': 'const spinnaker = 1;\n',
      'src/many.ts': `${'spinnaker\n'.repeat(CODE_SEARCH_MAX_LINES_PER_FILE + 5)}`,
    },
  });
  writeFileSync(join(worktree, 'src/icon.bin'), Buffer.from([0x73, 0x70, 0x69, 0x00]));
  symlinkSync(outside, join(worktree, 'escape'));
});

afterAll(() => {
  cleanupTempFixtures();
});

describe('one search over names and contents', () => {
  it('answers a name group and a line group for a term that matches both', () => {
    const result = found('spinnaker');

    expect(result.names).toEqual(['src/spinnaker.ts']);
    expect(result.contents.map((file) => file.path)).toContain('src/App.tsx');
  });

  it('counts every match in a file while returning a capped set of lines', () => {
    const many = found('spinnaker').contents.find((file) => file.path === 'src/many.ts');

    expect(many?.total).toBe(CODE_SEARCH_MAX_LINES_PER_FILE + 5);
    expect(many?.lines).toHaveLength(CODE_SEARCH_MAX_LINES_PER_FILE);
  });

  it('points at the line the match is on, counting from one', () => {
    const app = found('export const App').contents.find((file) => file.path === 'src/App.tsx');

    expect(app?.lines[0]?.line).toBe(2);
  });

  it('answers empty groups for a term nothing holds', () => {
    const result = found('schooner');

    expect(result.names).toEqual([]);
    expect(result.contents).toEqual([]);
  });

  it('answers empty groups for an empty term rather than the whole tree', () => {
    expect(searchCode(worktree, { query: '   ' })).toEqual({
      ok: true,
      names: [],
      contents: [],
      truncated: false,
    });
  });
});

describe('what a search never reaches', () => {
  it('takes no lines from an env file', () => {
    const result = found('spinnaker');

    expect(result.names).not.toContain('.env');
    expect(result.contents.some((file) => file.path === '.env')).toBe(false);
  });

  it('takes no lines from a directory symlink pointing out of the worktree', () => {
    expect(found('spinnaker').contents.some((file) => file.path.startsWith('escape/'))).toBe(false);
  });

  it('takes no lines from an excluded folder', () => {
    expect(
      found('spinnaker').contents.some((file) => file.path.startsWith('node_modules/')),
    ).toBe(false);
  });

  it('takes no lines from a file that is not text', () => {
    expect(found('spi').contents.some((file) => file.path === 'src/icon.bin')).toBe(false);
  });

  it('refuses a view the routing does not place in a Project', () => {
    expect(searchCode(undefined, { query: 'spinnaker' })).toEqual({
      ok: false,
      code: 'no-project',
    });
  });

  it('refuses a path that resolves outside the worktree', () => {
    expect(searchCode(worktree, { query: 'spinnaker', path: 'escape' })).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });
});
