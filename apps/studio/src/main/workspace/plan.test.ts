import { existsSync, mkdirSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';

const { planWorkspace } = await import('./index.js');
const { workspacePathFor } = await import('./store.js');
const { generateWorkspaceName, repoIdentityFromRemoteUrl } = await import('./naming.js');

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

// Per case: the electron stub's `app.getPath` answers one tmpdir for the whole run, and the saturation case fills its root.
function useOwnWorkspaceRoot(): string {
  const root = makeWorkspaceRoot();
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  return root;
}

function makeFixture(name: string): { origin: string; repo: string } {
  const { origin, path } = makeGitRepo({ name: `plan-${name}` });
  return { origin, repo: path };
}

function identityOf(repo: string): string {
  return repoIdentityFromRemoteUrl(sh(repo, ['remote', 'get-url', 'origin']));
}

describe('planWorkspace — the refusal ladder', () => {
  it('plans a folder that is not in a git repository as a copy', async () => {
    useOwnWorkspaceRoot();
    const plain = makeDirWithFiles({ name: 'plan-plain', files: { 'index.html': 'x' } });

    const plan = await planWorkspace(plain);

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') return;
    expect(plan.origin).toBe('copied');
    expect(plan.sourcePath).toBe(plain);
    expect(plan.baseRefSource).toBe('local-main');
  });

  it('plans from the remote ref when the repo has one', async () => {
    useOwnWorkspaceRoot();
    const { repo } = makeFixture('remote');
    expect(sh(repo, ['remote'])).toBe('origin');

    const plan = await planWorkspace(repo);

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') return;
    expect(plan.baseRef).toBe('origin/main');
    expect(plan.baseBranch).toBe('main');
    expect(plan.baseRefSource).toBe('upstream');
  });

  it('plans from local main when the repo has no remote', async () => {
    useOwnWorkspaceRoot();
    const { path: repo } = makeGitRepo({ name: 'plan-noremote', remote: false });

    expect(sh(repo, ['rev-parse', '--is-inside-work-tree'])).toBe('true');
    expect(sh(repo, ['remote'])).toBe('');
    expect(sh(repo, ['rev-parse', '--verify', 'refs/heads/main'])).toMatch(/^[0-9a-f]{40}$/);

    const plan = await planWorkspace(repo);

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') return;
    expect(plan.baseRef).toBe('main');
    expect(plan.baseBranch).toBe('main');
    expect(plan.baseRefSource).toBe('local-main');
  });

  it('refuses a no-remote repo that has no branch named main', async () => {
    useOwnWorkspaceRoot();
    const { path: repo } = makeGitRepo({ name: 'plan-nomain', remote: false });
    sh(repo, ['branch', '-m', 'main', 'trunk']);
    expect(() => sh(repo, ['rev-parse', '--verify', '--quiet', 'refs/heads/main'])).toThrow();

    const plan = await planWorkspace(repo);

    expect(plan.kind).toBe('refused');
    if (plan.kind !== 'refused') return;
    expect(plan.reason).toBe('no-base-ref');
  });

  it('does NOT refuse a repo whose origin/HEAD was never set — the ladder resolves it', async () => {
    useOwnWorkspaceRoot();
    const { repo } = makeFixture('nohead');
    // The checkout is the case: the fixture pushes with `-u`, and that upstream answers above `origin/HEAD`.
    sh(repo, ['checkout', '--quiet', '-b', 'local-only']);

    expect(() => sh(repo, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(() => sh(repo, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])).toThrow();

    const plan = await planWorkspace(repo);

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') return;
    expect(plan.baseRef).toBe('origin/main');
    expect(plan.baseBranch).toBe('main');
    expect(plan.baseRefSource).toBe('sole-remote-branch');
  });
});

describe('planWorkspace — the name draw', () => {
  it('re-rolls when the proposed name is already taken', async () => {
    useOwnWorkspaceRoot();
    const { repo } = makeFixture('reroll');

    const first = await planWorkspace(repo);
    expect(first.kind).toBe('ready');
    if (first.kind !== 'ready') return;

    mkdirSync(first.workspacePath, { recursive: true });
    expect(existsSync(first.workspacePath)).toBe(true);

    const second = await planWorkspace(repo);

    expect(second.kind).toBe('ready');
    if (second.kind !== 'ready') return;
    expect(second.workspaceName).not.toBe(first.workspaceName);
    expect(second.workspacePath).not.toBe(first.workspacePath);
    expect(second.branchName.endsWith(`/${second.workspaceName}`)).toBe(true);
    expect(existsSync(second.workspacePath)).toBe(false);
  });

  it('refuses with name-unavailable when every name it can draw is taken', async () => {
    const root = useOwnWorkspaceRoot();
    const { repo } = makeFixture('exhausted');
    const identity = identityOf(repo);

    const before = await planWorkspace(repo);
    expect(before.kind).toBe('ready');

    const names = new Set<string>();
    let sinceNew = 0;
    for (let draw = 0; draw < 20_000 && sinceNew < 2_000; draw += 1) {
      const size = names.size;
      names.add(generateWorkspaceName());
      sinceNew = names.size === size ? sinceNew + 1 : 0;
    }
    // A larger name scheme goes red here rather than passing for the wrong reason.
    expect(sinceNew).toBeGreaterThanOrEqual(2_000);
    expect(names.size).toBeLessThanOrEqual(1_000);

    for (const name of names) {
      mkdirSync(workspacePathFor(identity, name), { recursive: true });
    }
    if (before.kind === 'ready') expect(existsSync(before.workspacePath)).toBe(true);
    expect(process.env['STUDIO_WORKSPACE_ROOT']).toBe(root);

    const plan = await planWorkspace(repo);

    expect(plan.kind).toBe('refused');
    if (plan.kind !== 'refused') return;
    expect(plan.reason).toBe('name-unavailable');
  });
});
