import { describe, expect, it } from 'bun:test';
import { prepareRestoredLocation, type LocationRestoreDeps } from './restore.js';

const workspacePath = '/projects/example/worktrees/design';
const location = { kind: 'project', repoIdentity: 'example-repo', workspacePath };

function fixture(): { deps: LocationRestoreDeps; calls: string[]; lookups: string[] } {
  const calls: string[] = [];
  const lookups: string[] = [];
  return {
    calls,
    lookups,
    deps: {
      knownProject: (path) => {
        lookups.push(path);
        return path === workspacePath;
      },
      register: (path) => { calls.push(`register:${path}`); },
      openCanvas: async (path) => { calls.push(`openCanvas:${path}`); },
    },
  };
}

describe('prepareRestoredLocation', () => {
  it.each([
    null,
    undefined,
    false,
    42,
    'project',
    [],
    {},
    { kind: 'projects' },
    { ...location, kind: 'unknown' },
    { kind: 'project', workspacePath },
    { ...location, repoIdentity: null },
    { ...location, repoIdentity: 42 },
    { kind: 'project', repoIdentity: 'example-repo' },
    { ...location, workspacePath: null },
    { ...location, workspacePath: 42 },
    { ...location, workspacePath: '' },
    { ...location, workspacePath: ' \t\n' },
  ])('ignores malformed locations without registry lookups or effects: %j', async (malformed) => {
    const { deps, calls, lookups } = fixture();

    await prepareRestoredLocation(malformed, deps);

    expect(lookups).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('ignores unknown projects without registration or canvas effects', async () => {
    const { deps, calls, lookups } = fixture();
    const unknownPath = '/projects/unknown/worktrees/design';

    await prepareRestoredLocation({ ...location, workspacePath: unknownPath }, deps);

    expect(lookups).toEqual([unknownPath]);
    expect(calls).toEqual([]);
  });

  it('only registers the view and opens its canvas, in that order', async () => {
    const { deps, calls, lookups } = fixture();

    await prepareRestoredLocation(location, deps);

    expect(lookups).toEqual([workspacePath]);
    expect(calls).toEqual([`register:${workspacePath}`, `openCanvas:${workspacePath}`]);
  });

  it('preserves the exact workspace path for lookup, registration and canvas opening', async () => {
    const { deps, calls, lookups } = fixture();
    const originalPath = '/projects/Example Repo/worktrees/../design/ ';
    deps.knownProject = (path) => {
      lookups.push(path);
      return true;
    };

    await prepareRestoredLocation({ ...location, workspacePath: originalPath }, deps);

    expect(lookups).toEqual([originalPath]);
    expect(calls).toEqual([`register:${originalPath}`, `openCanvas:${originalPath}`]);
  });

  it('propagates canvas opening failures after registration', async () => {
    const { deps, calls } = fixture();
    const failure = new Error('Canvas could not open');
    deps.openCanvas = async (path) => {
      calls.push(`openCanvas:${path}`);
      throw failure;
    };

    await expect(prepareRestoredLocation(location, deps)).rejects.toBe(failure);

    expect(calls).toEqual([`register:${workspacePath}`, `openCanvas:${workspacePath}`]);
  });
});
