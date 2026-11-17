import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeDirWithFiles,
  makeGitRepo,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { canonicalPath, pathSpellings } from '../lib/canonical-path.js';
import { type CandidateFacts, type CandidateInput, classifyCandidate } from './candidate.js';
import { candidateFactsFor as factsFor } from './discover.js';
import { addWorktree } from './git.js';

setDefaultTimeout(30_000);

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  return root;
}

function seedRepo(dir: string): string {
  mkdirSync(dir, { recursive: true });
  sh(dir, ['init', '--quiet', '-b', 'main']);
  sh(dir, ['config', 'user.email', 'fixture@example.com']);
  sh(dir, ['config', 'user.name', 'Fixture User']);
  writeFileSync(join(dir, 'index.js'), '// seed\n');
  sh(dir, ['add', '-A']);
  sh(dir, ['commit', '--quiet', '-m', 'init']);
  return dir;
}

async function cutWorktree(repo: string, worktree: string): Promise<string> {
  mkdirSync(dirname(worktree), { recursive: true });
  await addWorktree({ root: repo, worktreePath: worktree, branch: 'fixture/cut', startPoint: 'main' });
  return worktree;
}

function withNothingHeld(facts: CandidateFacts): CandidateInput {
  return { facts, registered: () => false, creating: () => false, removing: () => false };
}

async function classify(path: string): Promise<ReturnType<typeof classifyCandidate>> {
  return classifyCandidate(withNothingHeld(await factsFor(path)));
}

describe('classifyCandidate — the refusals (ONL-2522)', () => {
  it('a worktree whose repository has been deleted is the repository-gone refusal, not not-a-repository', async () => {
    const { path: repo, root } = makeGitRepo({ name: 'cand-orphan' });
    const worktree = await cutWorktree(repo, join(root, 'orphan-ws'));
    expect((await classify(worktree)).ok).toBe(true);

    rmSync(repo, { recursive: true, force: true });

    expect(await classify(worktree)).toEqual({ ok: false, reason: 'repository-gone' });
  });

  it('a directory that is not a git repository at all is the not-a-repository refusal', async () => {
    const plain = makeDirWithFiles({ name: 'cand-plain', files: { 'notes.md': '# notes\n' } });
    expect(await classify(plain)).toEqual({ ok: false, reason: 'not-a-repository' });
  });

  it("a repository's own checkout is the refusal that says to pick a worktree", async () => {
    const { path: repo } = makeGitRepo({ name: 'cand-checkout' });
    expect(await classify(repo)).toEqual({ ok: false, reason: 'is-the-repository' });
  });

  it("a subdirectory of the user's own checkout is still the repository, not a nested path", async () => {
    const { path: repo } = makeGitRepo({ name: 'cand-checkout-sub' });
    const inside = join(repo, 'src', 'components');
    mkdirSync(inside, { recursive: true });

    expect(await classify(inside)).toEqual({ ok: false, reason: 'is-the-repository' });
  });

  it('a subdirectory inside a worktree is the nested-path refusal, because its toplevel is not the path given', async () => {
    const { path: repo, root } = makeGitRepo({ name: 'cand-nested' });
    const worktree = await cutWorktree(repo, join(root, 'nested-ws'));
    const inside = join(worktree, 'src', 'components');
    mkdirSync(inside, { recursive: true });

    expect(await classify(inside)).toEqual({ ok: false, reason: 'inside-a-project' });
  });

  it('a worktree reached through a symlinked parent still classifies as a worktree', async () => {
    const { path: repo, root } = makeGitRepo({ name: 'cand-symlink' });
    const real = join(root, 'real');
    const worktree = await cutWorktree(repo, join(real, 'symlink-ws'));
    const link = join(root, 'through-a-link');
    symlinkSync(real, link);

    const reached = join(link, 'symlink-ws');
    // Without this the fixture cannot fail: the two spellings have to actually differ.
    expect(resolve(reached)).not.toBe(canonicalPath(reached));

    const decided = await classify(reached);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.path).toBe(canonicalPath(worktree));
  });

  it('a worktree whose administrative commondir names a repository it was never cut from is not-a-repository', async () => {
    const root = useOwnWorkspaceRoot('cand-forged');
    const victim = seedRepo(join(makeDirWithFiles({ name: 'cand-forged-victim' }), 'victim'));
    const { path: attacker } = makeGitRepo({ name: 'cand-forged-attacker', remote: false });
    const worktree = await cutWorktree(attacker, join(root, 'github-com-fixture-victim', 'teal-skylark'));
    writeFileSync(join(attacker, '.git', 'worktrees', 'teal-skylark', 'commondir'), `${join(victim, '.git')}\n`);

    const facts = await factsFor(worktree);
    // Without this the fixture cannot fail: the forged pointer has to actually reach the victim.
    expect(facts.repository?.sourceRepoRoot).toBe(canonicalPath(victim));

    expect(classifyCandidate(withNothingHeld(facts))).toEqual({ ok: false, reason: 'not-a-repository' });
  });

  it('a candidate the registry already holds under the other spelling is refused as already-a-project', async () => {
    const { path: repo, root } = makeGitRepo({ name: 'cand-known' });
    const real = join(root, 'held');
    await cutWorktree(repo, join(real, 'known-ws'));
    const link = join(root, 'held-link');
    symlinkSync(real, link);
    const stored = join(link, 'known-ws');

    const facts = await factsFor(stored);
    expect(facts.path).not.toBe(resolve(stored));

    const decided = classifyCandidate({
      ...withNothingHeld(facts),
      registered: (path) => pathSpellings(stored).includes(path),
    });
    expect(decided).toEqual({ ok: false, reason: 'already-a-project' });
  });

  it('a candidate whose creation or removal is in flight is refused as busy', async () => {
    const { path: repo, root } = makeGitRepo({ name: 'cand-busy' });
    const worktree = await cutWorktree(repo, join(root, 'busy-ws'));
    const facts = await factsFor(worktree);
    const isCandidate = (path: string): boolean => path === facts.path;

    expect(classifyCandidate({ ...withNothingHeld(facts), creating: isCandidate })).toEqual({
      ok: false,
      reason: 'busy',
    });
    expect(classifyCandidate({ ...withNothingHeld(facts), removing: isCandidate })).toEqual({
      ok: false,
      reason: 'busy',
    });
  });
});

describe('classifyCandidate — origin and identity (ONL-2522)', () => {
  it('a candidate under a blank- bucket is held, with the identity the prefix encodes', async () => {
    const root = useOwnWorkspaceRoot('cand-blank');
    const identity = `blank/${randomUUID()}`;
    const bucket = join(root, identity.replace('/', '-'));
    const source = seedRepo(join(bucket, 'source'));
    const worktree = await cutWorktree(source, join(bucket, 'teal-skylark'));

    const decided = await classify(worktree);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.origin).toBe('blank');
    expect(decided.candidate.repoIdentity).toBe(identity);
    expect(decided.candidate.sourceRepoRoot).toBe(canonicalPath(source));
  });

  it('a candidate under a copied- bucket is held, with the identity the prefix encodes', async () => {
    const root = useOwnWorkspaceRoot('cand-copied');
    const identity = `copied/${'a1b2c3'.repeat(10)}`;
    const bucket = join(root, identity.replace('/', '-'));
    const source = seedRepo(join(bucket, 'source'));
    const worktree = await cutWorktree(source, join(bucket, 'amber-heron'));

    const decided = await classify(worktree);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.origin).toBe('copied');
    expect(decided.candidate.repoIdentity).toBe(identity);
  });

  it('a blank- parent outside the workspace root holds nothing: the candidate is imported, off its own repository', async () => {
    useOwnWorkspaceRoot('cand-outside');
    const elsewhere = makeDirWithFiles({ name: 'cand-elsewhere' });
    const bucket = join(elsewhere, 'blank-0000');
    const source = seedRepo(join(bucket, 'source'));
    const worktree = await cutWorktree(source, join(bucket, 'teal-skylark'));

    const decided = await classify(worktree);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.origin).toBe('imported');
    expect(decided.candidate.repoIdentity).toBe(canonicalPath(source).toLowerCase());
    expect(decided.candidate.sourceRepoRoot).toBe(canonicalPath(source));
  });

  it('a candidate under a remote-shaped identity directory is imported, with the identity re-derived from the remote', async () => {
    const root = makeWorkspaceRoot({ name: 'cand-imported' });
    const { path: repo } = makeGitRepo({ name: 'cand-imported-src' });
    sh(repo, ['remote', 'set-url', 'origin', 'git@github.com:acme/widgets.git']);
    const worktree = await cutWorktree(repo, join(root, 'github-com-acme-widgets', 'indigo-plover'));

    const decided = await classify(worktree);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.origin).toBe('imported');
    expect(decided.candidate.repoIdentity).toBe('github.com/acme/widgets');
  });

  it('an imported candidate whose repository has no readable remote still classifies, off the repository own path', async () => {
    const root = makeWorkspaceRoot({ name: 'cand-noremote' });
    const { path: repo } = makeGitRepo({ name: 'cand-noremote-src', remote: false });
    const worktree = await cutWorktree(repo, join(root, 'local-only', 'jade-wren'));

    const facts = await factsFor(worktree);
    expect(facts.repository?.remote).toBeUndefined();

    const decided = classifyCandidate(withNothingHeld(facts));
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.origin).toBe('imported');
    expect(decided.candidate.repoIdentity).toBe(canonicalPath(repo).toLowerCase());
  });

  it('a remote whose URL cannot be read falls to the repository path and the remote name, as planning does', async () => {
    const root = makeWorkspaceRoot({ name: 'cand-nourl' });
    const { path: repo } = makeGitRepo({ name: 'cand-nourl-src', remote: false });
    const worktree = await cutWorktree(repo, join(root, 'no-url', 'copper-swift'));

    const facts = await factsFor(worktree);
    const repository = facts.repository;
    expect(repository).toBeDefined();
    if (repository === undefined) return;

    const decided = classifyCandidate(
      withNothingHeld({
        ...facts,
        repository: { ...repository, remote: 'upstream', remoteUrl: undefined },
      }),
    );
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.candidate.repoIdentity).toBe(
      `${canonicalPath(repo).toLowerCase()}#upstream`,
    );
  });
});
