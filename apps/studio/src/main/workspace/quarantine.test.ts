import { accessSync, chmodSync, constants, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot } from '@studio/fixtures';
import type { DisplayNameSource } from '@studio/events';
import { acceptsStoredSourcePath, readQuarantinedProjects } from './quarantine.js';

afterAll(() => {
  cleanupTempFixtures();
});

const QUARANTINE_PREFIX = 'workspaces.json.corrupt-';

function plant(root: string, stamp: string, contents: unknown): void {
  writeFileSync(join(root, `${QUARANTINE_PREFIX}${stamp}`), `${JSON.stringify(contents)}\n`);
}

function canRead(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function worktree(root: string, name: string): { path: string; canonical: string } {
  const path = join(root, 'github-com-fixture-react-project-v1', name);
  mkdirSync(path, { recursive: true });
  return { path, canonical: realpathSync.native(path) };
}

function storedRecord(workspacePath: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    workspacePath,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'react-project-v1',
    sourcePath: '/Users/fixture/react-project-v1',
    sourceRepoRoot: '/Users/fixture/react-project-v1',
    repoIdentity: 'github.com/fixture/react-project-v1',
    origin: 'imported',
    createdAt: '2026-09-01T10:00:00.000Z',
    lastOpenedAt: '2026-09-02T10:00:00.000Z',
    copiedEnvFiles: [],
    ...extra,
  };
}

function envelope(records: Record<string, unknown>, extra: Record<string, unknown> = {}): unknown {
  return { version: 4, data: { workspaces: records, archivedRepos: {}, workspaceNames: {}, workspaceOrder: [], ...extra } };
}

describe('the quarantined registry reader', () => {
  it('keeps every naming source and a duplicate’s held ownership without accepting unknown names', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-naming-sources' });
    const records: Record<string, unknown> = {};
    const nameSources = [
      ['user', 'user'], ['agent', 'agent'], ['provisional', 'provisional'], ['unknown', undefined],
    ] as const;
    const expectedByPath = new Map<string, DisplayNameSource | undefined>();
    for (const [nameSource, expected] of nameSources) {
      const project = worktree(root, nameSource);
      expectedByPath.set(project.canonical, expected);
      records[project.canonical] = storedRecord(project.path, {
        displayName: 'Landing copy', displayNameSource: nameSource, origin: 'duplicate', heldOrigin: 'copied',
      });
    }
    plant(root, '2026-10-14T12-00-00-000Z', envelope(records));
    const found = readQuarantinedProjects(root);
    for (const [path, project] of found.projects) {
      expect(project.origin).toBe('duplicate');
      expect(project.heldOrigin).toBe('copied');
      expect(project.displayNameSource).toBe(expectedByPath.get(path));
    }
    expect(found.projects.size).toBe(4);
  });

  it('recovers every valid record from one quarantine, keyed by canonical path', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-two-records' });
    const first = worktree(root, 'teal-skylark');
    const second = worktree(root, 'amber-vireo');
    plant(root, '2026-10-01T12-00-00-000Z', envelope({
      [first.canonical]: storedRecord(first.path, { displayName: 'Checkout flow' }),
      [second.canonical]: storedRecord(second.path, { workspaceName: 'amber-vireo', displayName: 'Pricing page' }),
    }));

    const found = readQuarantinedProjects(root);

    expect([...found.projects.keys()].sort()).toEqual([second.canonical, first.canonical].sort());
    expect(found.projects.get(first.canonical)?.displayName).toBe('Checkout flow');
    expect(found.projects.get(first.canonical)?.baseBranch).toBe('main');
    expect(found.projects.get(first.canonical)?.createdAt).toBe('2026-09-01T10:00:00.000Z');
    expect(found.projects.get(first.canonical)?.origin).toBe('imported');
    // Carried as-read: whether the claim holds is `acceptsStoredSourcePath`, against a repository root this reader does not know.
    expect(found.projects.get(first.canonical)?.sourcePath).toBe('/Users/fixture/react-project-v1');
    expect(found.projects.get(second.canonical)?.displayName).toBe('Pricing page');
    expect(found.unreadable).toEqual([]);
    expect(found.malformed).toEqual([]);
  });

  it('takes the newer file when two quarantines name one worktree', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-newest-wins' });
    const project = worktree(root, 'teal-skylark');
    plant(root, '2026-09-20T08-00-00-000Z', envelope({
      [project.canonical]: storedRecord(project.path, { displayName: 'The older name' }),
    }));
    plant(root, '2026-10-01T12-00-00-000Z', envelope({
      [project.canonical]: storedRecord(project.path, { displayName: 'The newer name' }),
    }));

    const found = readQuarantinedProjects(root);

    expect(found.projects.get(project.canonical)?.displayName).toBe('The newer name');
  });

  it('skips a malformed file and still returns its valid sibling', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-malformed' });
    const project = worktree(root, 'teal-skylark');
    writeFileSync(join(root, `${QUARANTINE_PREFIX}2026-10-01T12-00-00-000Z`), '{ "version": 4, "data": {');
    plant(root, '2026-09-20T08-00-00-000Z', envelope({
      [project.canonical]: storedRecord(project.path, { displayName: 'Still here' }),
    }));

    const found = readQuarantinedProjects(root);

    expect(found.projects.get(project.canonical)?.displayName).toBe('Still here');
    expect(found.malformed).toEqual([`${QUARANTINE_PREFIX}2026-10-01T12-00-00-000Z`]);
    expect(found.unreadable).toEqual([]);
  });

  it('skips a record with no workspacePath and one whose repoIdentity is not a string', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-bad-records' });
    const valid = worktree(root, 'teal-skylark');
    const identityless = worktree(root, 'amber-vireo');
    const { workspacePath: _dropped, ...pathless } = storedRecord(join(root, 'nowhere'));
    plant(root, '2026-10-01T12-00-00-000Z', envelope({
      pathless,
      [identityless.canonical]: storedRecord(identityless.path, { repoIdentity: 42 }),
      [valid.canonical]: storedRecord(valid.path, { displayName: 'The survivor' }),
    }));

    const found = readQuarantinedProjects(root);

    expect([...found.projects.keys()]).toEqual([valid.canonical]);
    expect(found.projects.get(valid.canonical)?.displayName).toBe('The survivor');
    expect(found.malformed).toEqual([]);
  });

  it('does not read another domain’s quarantine in the same root', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-other-domain' });
    const project = worktree(root, 'teal-skylark');
    writeFileSync(
      join(root, 'canvas-registry.json.corrupt-2026-10-01T12-00-00-000Z'),
      `${JSON.stringify(envelope({ [project.canonical]: storedRecord(project.path) }))}\n`,
    );

    const found = readQuarantinedProjects(root);

    expect(found.projects.size).toBe(0);
    expect(found.malformed).toEqual([]);
    expect(found.unreadable).toEqual([]);
  });

  it('yields the records of an envelope carrying a version this build does not know', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-future-version' });
    const project = worktree(root, 'teal-skylark');
    plant(root, '2026-10-01T12-00-00-000Z', {
      version: 99,
      data: { workspaces: { [project.canonical]: storedRecord(project.path, { displayName: 'From the future' }) }, somethingNew: true },
    });

    const found = readQuarantinedProjects(root);

    expect(found.projects.get(project.canonical)?.displayName).toBe('From the future');
  });

  it('yields the records of a pre-envelope quarantine, whose records sit at the top level', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-pre-envelope' });
    const project = worktree(root, 'teal-skylark');
    plant(root, '2026-10-01T12-00-00-000Z', {
      [project.canonical]: storedRecord(project.path, { displayName: 'Before the envelope' }),
    });

    const found = readQuarantinedProjects(root);

    expect(found.projects.get(project.canonical)?.displayName).toBe('Before the envelope');
  });

  it('surfaces the stored Workspace names and ignores the archived flags', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-workspace-names' });
    const project = worktree(root, 'teal-skylark');
    plant(
      root,
      '2026-10-01T12-00-00-000Z',
      envelope(
        { [project.canonical]: storedRecord(project.path, { archivedAt: '2026-09-30T10:00:00.000Z' }) },
        {
          workspaceNames: { 'github.com/fixture/react-project-v1': 'Checkout rewrite' },
          archivedRepos: { 'github.com/fixture/react-project-v1': '2026-09-30T10:00:00.000Z' },
        },
      ),
    );

    const found = readQuarantinedProjects(root);

    expect(found.workspaceNames.get('github.com/fixture/react-project-v1')).toBe('Checkout rewrite');
    expect(Object.keys(found).sort()).toEqual(['malformed', 'projects', 'unreadable', 'workspaceNames']);
    expect(found.projects.get(project.canonical)).not.toHaveProperty('archivedAt');
  });

  it('reports a file it cannot open apart from one that parsed and held nothing', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-unreadable' });
    const sealed = `${QUARANTINE_PREFIX}2026-10-01T12-00-00-000Z`;
    writeFileSync(join(root, sealed), `${JSON.stringify(envelope({}))}\n`);
    chmodSync(join(root, sealed), 0o000);
    plant(root, '2026-09-20T08-00-00-000Z', envelope({}));

    if (canRead(join(root, sealed))) {
      console.warn('[workspace quarantine] a mode-000 file is still readable here — skipping the read-failure case');
      return;
    }

    const found = readQuarantinedProjects(root);

    expect(found.unreadable).toEqual([sealed]);
    expect(found.malformed).toEqual([]);
    expect(found.projects.size).toBe(0);
  });

  it('returns an empty lookup and no failure when the root holds no quarantine', () => {
    const root = makeWorkspaceRoot({ name: 'quarantine-none' });
    writeFileSync(join(root, 'workspaces.json'), `${JSON.stringify(envelope({}))}\n`);

    const found = readQuarantinedProjects(root);

    expect(found.projects.size).toBe(0);
    expect(found.workspaceNames.size).toBe(0);
    expect(found.unreadable).toEqual([]);
    expect(found.malformed).toEqual([]);
  });
});

describe('a quarantine-supplied sourcePath', () => {
  it('is accepted inside the repository the candidate’s own pointer names, and rejected outside it', () => {
    const repoRoot = makeWorkspaceRoot({ name: 'quarantine-source-repo' });

    expect(acceptsStoredSourcePath(repoRoot, repoRoot)).toBe(true);
    expect(acceptsStoredSourcePath(join(repoRoot, 'apps', 'web'), repoRoot)).toBe(true);
    expect(acceptsStoredSourcePath(join(repoRoot, '..', 'elsewhere'), repoRoot)).toBe(false);
    expect(acceptsStoredSourcePath('/Users/fixture/some-other-checkout', repoRoot)).toBe(false);
  });
});
