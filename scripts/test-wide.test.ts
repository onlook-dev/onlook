import { describe, expect, test } from 'bun:test';
import { attribute, descendants } from './test-wide.ts';

const RUN = '/tmp/studio-wide-abc';
const TREE = '/repo/worktree';

describe('the wide run names what it left behind', () => {
  test('a process sampled under the run is its own after reparenting, until its pid holds another command', () => {
    const watch = { before: new Set([50]), seen: new Map([[50, 'sleep 30']]) };
    expect(attribute([{ pid: 50, ppid: 1, command: 'sleep 30' }], watch, [RUN, TREE], new Map(), 1).map((p) => p.pid)).toEqual([50]);
    expect(attribute([{ pid: 50, ppid: 1, command: 'vim notes' }], watch, [RUN, TREE], new Map(), 1)).toEqual([]);
  });

  test('a process born during the run is its own when its command or cwd is in the run root or the checkout, and no other is', () => {
    const watch = { before: new Set([7]), seen: new Map<number, string>() };
    const table = [
      { pid: 7, ppid: 1, command: `node ${TREE}/server.js` },
      { pid: 8, ppid: 1, command: `node ${RUN}/fake.mjs` },
      { pid: 9, ppid: 1, command: 'sleep 127' },
      { pid: 10, ppid: 1, command: 'sleep 127' },
    ];
    const cwds = new Map([[9, `${TREE}/apps/studio`], [10, '/elsewhere']]);
    expect(attribute(table, watch, [RUN, TREE], cwds, 1).map((p) => p.pid)).toEqual([8, 9]);
  });

  test('descendants follow the parent chain below the root only', () => {
    const table = [
      { pid: 2, ppid: 1, command: 'runner' },
      { pid: 3, ppid: 2, command: 'bun test' },
      { pid: 4, ppid: 3, command: 'git' },
      { pid: 5, ppid: 1, command: 'other' },
    ];
    expect(descendants(table, 2).map((p) => p.pid)).toEqual([3, 4]);
  });
});
