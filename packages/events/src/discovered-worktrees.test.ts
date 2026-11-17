import { describe, expect, it } from 'bun:test';
import { discoveredWorktreesFor, type DiscoveredWorktree } from './projects.js';

const ZEST: DiscoveredWorktree = {
  handle: '/workspaces/zest-maps/red-skylark',
  name: 'red-skylark',
  branchName: 'fixture/red-skylark',
  groupName: 'zest-maps',
  repoIdentity: 'github.com/fixture/zest-maps',
  completedBy: 'record',
};

const OTHER: DiscoveredWorktree = {
  handle: '/workspaces/atlas/blue-harron',
  name: 'blue-harron',
  branchName: 'fixture/blue-harron',
  groupName: 'atlas',
  repoIdentity: 'github.com/fixture/atlas',
  completedBy: 'git',
};

const CANDIDATES = [ZEST, OTHER];

describe('discoveredWorktreesFor', () => {
  it('Recent carries every candidate, which is where a user who lost every Project looks', () => {
    expect(discoveredWorktreesFor({ kind: 'recent' }, CANDIDATES)).toEqual(CANDIDATES);
  });

  it('a workspace carries its own repository’s candidates', () => {
    expect(
      discoveredWorktreesFor(
        { kind: 'workspace', repoIdentity: 'github.com/fixture/zest-maps' },
        CANDIDATES,
      ),
    ).toEqual([ZEST]);
  });

  it('an unrelated workspace carries none, so one stray worktree does not appear under every repository', () => {
    expect(
      discoveredWorktreesFor(
        { kind: 'workspace', repoIdentity: 'github.com/fixture/unrelated' },
        CANDIDATES,
      ),
    ).toEqual([]);
  });
});
