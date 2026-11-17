import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'bun:test';
import { mapSelection } from '../../apps/studio/src/main/code/mapper/pipeline.js';
import { readerSource, readingOf } from '../../apps/studio/src/main/code/mapper/reader.js';
import { tintLabel } from '../../apps/studio/src/renderer/src/code/tintLabel.js';

const worktree = realpathSync.native(mkdtempSync(join(tmpdir(), 'studio-reach-')));
writeFileSync(join(worktree, 'Hero.jsx'), '');
afterAll(() => rmSync(worktree, { recursive: true, force: true }));

async function mapHost(host: Record<string, unknown>) {
  const source = readerSource('h1');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const run = new Function('document', `return ${source}`) as (document: unknown) => unknown;
  const map = JSON.stringify({ version: 3, sources: ['Hero.jsx'], names: [], mappings: ';;;;UACI' });
  const result = await mapSelection({
    worktree,
    identify: async () => ({ ok: true, reading: readingOf(run({ querySelector: () => ({ __reactFiber$test: host }) })) }),
    fetchText: async () => `//# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString('base64')}`,
    search: () => ({ ok: true, names: [], contents: [], truncated: false }),
  }, { docId: 'doc', frameId: 'frame', domPath: 'h1', evidenceId: 'pick' });
  if (!result.ok) throw new Error('expected source mapping');
  return result.mapping;
}

it('reader → mapper → label treats a budget-limited tree as partial for early and late Row picks', async () => {
  const root: Record<string, unknown> = { return: null };
  const Row = function Row() { return null; };
  const rows = [0, 600].map(() => ({ type: Row, return: root, child: null as unknown, sibling: null as unknown }));
  const hosts = rows.map(row => ({ type: 'li', return: row, _debugStack: 'at Row (http://localhost:3000/Hero.js:5:11)' }));
  rows.forEach((row, index) => { row.child = hosts[index]; });
  const fillers = Array.from({ length: 600 }, () => ({ type: 'div', return: root, sibling: null as unknown }));
  const children = [rows[0]!, ...fillers, rows[1]!];
  children.forEach((child, index) => { child.sibling = children[index + 1] ?? null; });
  root['child'] = children[0];
  for (const [index, host] of hosts.entries()) {
    const mapping = await mapHost(host);
    expect(mapping.grade).toBe('exact');
    expect(mapping.producedComplete).toBe(false);
    expect(mapping.produced).toBe(index === 0 ? 1 : 2);
    const label = tintLabel({ mapping, isStale: false });
    expect(label.reachKey).toBe(index === 0 ? 'code.tint.rowsUnknown' : 'code.tint.rowsPartial');
    expect(tintLabel({ mapping, isStale: true }).reachKey).toBe(label.reachKey);
  }
});

it('reader → mapper → label does not promise uniqueness after an ancestor-bound truncation', async () => {
  let parent: Record<string, unknown> = { return: null };
  for (let depth = 0; depth < 70; depth += 1) {
    const child: Record<string, unknown> = { type: 'div', return: parent };
    parent['child'] = child;
    parent = child;
  }
  const row = { type: function Row() { return null; }, return: parent };
  const host = { type: 'li', return: row, _debugStack: 'at Row (http://localhost:3000/Hero.js:5:11)' };
  parent['child'] = row;
  (row as Record<string, unknown>)['child'] = host;
  const mapping = await mapHost(host);
  expect(mapping).toMatchObject({ grade: 'exact', produced: 1, producedComplete: false });
  expect(tintLabel({ mapping, isStale: false }).reachKey).toBe('code.tint.rowsUnknown');
});

it('reader → mapper → label never invents reach from unrelated div wrappers', async () => {
  const fragment: Record<string, unknown> = { return: null };
  const first: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (src/App.jsx:20:3)' };
  const second: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (src/App.jsx:30:3)' };
  const hero: Record<string, unknown> = { type: function Hero() { return null; }, return: first };
  const footer: Record<string, unknown> = { type: function Footer() { return null; }, return: second };
  const heading = { type: 'h1', return: hero, _debugStack: 'at Hero (http://localhost:5319/Hero.jsx:5:11)' };
  fragment['child'] = first;
  first['sibling'] = second;
  first['child'] = hero;
  second['child'] = footer;
  hero['child'] = heading;
  footer['child'] = { type: 'footer', return: footer, _debugStack: 'at Footer (src/Footer.jsx:5:11)' };
  const mapping = await mapHost(heading);
  expect(mapping).toMatchObject({ component: 'Hero', grade: 'exact', produced: 1 });
  expect(tintLabel({ mapping, isStale: false })).toMatchObject({ sentenceKey: 'code.tint.exact', reachKey: null, reachCount: 0 });
});

it('reader → mapper → label keeps four single-li Row instances and stale reach', async () => {
  const Row = function Row() { return null; };
  const parent: Record<string, unknown> = { type: 'ul', return: null };
  const rows = [1, 2, 3, 4].map(() => ({ type: Row, return: parent, child: null as unknown, sibling: null as unknown }));
  const hosts = rows.map((row) => ({ type: 'li', return: row, _debugStack: 'at Row (http://localhost:5319/Hero.jsx:5:11)' }));
  rows.forEach((row, index) => { row.child = hosts[index]; row.sibling = rows[index + 1] ?? null; });
  parent['child'] = rows[0];
  for (const host of hosts) {
    const mapping = await mapHost(host);
    expect(mapping).toMatchObject({ component: 'Row', grade: 'exact', produced: 4 });
    expect(tintLabel({ mapping, isStale: false })).toMatchObject({ sentenceKey: 'code.tint.exact', reachKey: 'code.tint.rows', reachCount: 4 });
    expect(tintLabel({ mapping, isStale: true })).toMatchObject({ sentenceKey: 'code.tint.unconfirmed', reachKey: 'code.tint.rows', reachCount: 4 });
  }
});
