import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathSpellings } from '../lib/canonical-path.js';
import type { CliResult } from '../env/cli.js';
import { runGit, USER_GIT_CONFIG, worktreeGitConfig } from '../env/git.js';
import { t } from '@studio/i18n';

const GIT_TIMEOUT_MS = 20_000;

export const WORKTREE_TIMEOUT_MS = 120_000;

export type GitResult = CliResult;

const NO_SWITCH = /unknown (?:switch|option)/i;

/** Git before 2.28 has no `-b`, and refusing it is the only thing that opens the second way in: `-b main` also overrides an `init.defaultBranch` git would reject (ONL-3111). */
export async function initializeRepository(cwd: string, run: (cwd: string, args: string[]) => Promise<GitResult> = git): Promise<GitResult> {
  const named = await run(cwd, ['init', '--quiet', '-b', 'main']);
  if (named.ok || !NO_SWITCH.test(named.err)) return named;
  const initialized = await run(cwd, ['init', '--quiet']);
  if (!initialized.ok) return initialized;
  const branch = await run(cwd, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  // Its caller reports this as `init`, which it is not; the detail says which command spoke.
  return branch.ok ? branch : { ...branch, err: gitFailureDetail('symbolic-ref', branch) };
}

export function gitFailureDetail(command: string, result: GitResult): string {
  if (result.err) return result.err;
  const verdict = result.out
    .split('\n')
    .filter((line) => line.trim() !== '' && !/^\s/.test(line))
    .at(-1);
  const exited = `git ${command} exited with code ${result.exitCode ?? 'none'}`;
  return verdict === undefined ? exited : `${exited}: ${verdict}`;
}

export interface DiskSnapshot {
  head: string;
  tree: string;
}

export async function captureDiskSnapshot(sourcePath: string): Promise<DiskSnapshot> {
  const head = await worktreeHead(sourcePath);
  if (head === undefined) throw new Error(t('projects.copy.error.noHead'));
  const directory = mkdtempSync(join(tmpdir(), 'studio-copy-index-'));
  const indexPath = join(directory, 'index');
  const env = { GIT_INDEX_FILE: indexPath };
  try {
    const sourceIndex = await git(sourcePath, ['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    if (!sourceIndex.ok) throw new Error(sourceIndex.err);
    if (existsSync(sourceIndex.out)) copyFileSync(sourceIndex.out, indexPath);
    else {
      const seeded = await git(sourcePath, ['read-tree', head], { env });
      if (!seeded.ok) throw new Error(seeded.err);
    }
    const added = await git(sourcePath, ['add', '-A', '--', '.', ':(exclude,glob)**/node_modules/**'], { env });
    if (!added.ok) throw new Error(added.err);
    const refreshed = await git(sourcePath, ['add', '--renormalize', '--', '.', ':(exclude,glob)**/node_modules/**'], { env });
    if (!refreshed.ok) throw new Error(refreshed.err);
    const dependencies = await git(sourcePath, ['rm', '-r', '--cached', '--ignore-unmatch', '--', ':(glob)**/node_modules/**'], { env });
    if (!dependencies.ok) throw new Error(dependencies.err);
    const tree = await git(sourcePath, ['write-tree'], { env });
    if (!tree.ok) throw new Error(tree.err);
    const modes = await git(sourcePath, ['ls-tree', '-r', '--format=%(objectmode)', tree.out]);
    if (!modes.ok) throw new Error(modes.err);
    if (modes.out.split('\n').includes('160000')) throw new Error(t('projects.copy.error.submodules'));
    return { head, tree: tree.out };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function materializeDiskSnapshot(destination: string, snapshot: DiskSnapshot): Promise<void> {
  const checkout = await git(destination, ['read-tree', '--reset', '-u', snapshot.tree]);
  if (!checkout.ok) throw new Error(checkout.err);
  const reset = await git(destination, ['read-tree', snapshot.head]);
  if (!reset.ok) throw new Error(reset.err);
}

export async function git(
  cwd: string,
  args: string[],
  options: { timeoutMs?: number; env?: Record<string, string> } = {},
): Promise<GitResult> {
  const safety = worktreeGitConfig();
  const env = { GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0', ...options.env };
  const filters = await runGit(cwd, ['config', '--null', '--get-regexp', '^filter\\..*\\.(clean|smudge|process|required)$'], {
    config: safety,
    // A caller may only tighten this read: a worktree's own 120s is for the work, not for reading config (ONL-3111).
    timeoutMs: Math.min(options.timeoutMs ?? GIT_TIMEOUT_MS, GIT_TIMEOUT_MS), env,
  });
  if (!filters.ok && filters.exitCode !== 1) return filters;
  const drivers = new Set(filters.out.split('\0').map((entry) => entry.split('\n')[0]?.replace(/\.(clean|smudge|process|required)$/, '')).filter((key): key is string => !!key));
  for (const driver of drivers) {
    for (const key of ['clean', 'smudge', 'process']) safety.push(`${driver}.${key}=`);
    safety.push(`${driver}.required=false`);
  }
  if (args[0] === 'fetch') {
    const helpers = await runGit(cwd, ['config', '--includes', '--null', '--show-scope', '--get-regexp', '^credential(\\..*)?\\.helper$'], { config: USER_GIT_CONFIG, timeoutMs: GIT_TIMEOUT_MS, env });
    if (!helpers.ok && helpers.exitCode !== 1) return helpers;
    const entries = helpers.out.split('\0');
    for (let index = 0; index + 1 < entries.length; index += 2) {
      if (entries[index] !== 'system' && entries[index] !== 'global') continue;
      const entry = entries[index + 1]!;
      const separator = entry.indexOf('\n');
      if (separator < 0) continue;
      safety.push(`${entry.slice(0, separator)}=${entry.slice(separator + 1)}`);
    }
  }
  const command = args[0] === 'fetch' ? ['fetch', '--no-auto-maintenance', '--upload-pack=git-upload-pack', ...args.slice(1)] : args;
  return runGit(cwd, command, {
    config: safety,
    timeoutMs: options.timeoutMs ?? GIT_TIMEOUT_MS,
    env,
    unset: ['GIT_SSH', 'GIT_PROXY_COMMAND', ...(options.env?.['GIT_SSH_COMMAND'] === undefined ? ['GIT_SSH_COMMAND'] : [])],
  });
}

export async function repoRoot(path: string): Promise<string | undefined> {
  const result = await git(path, ['rev-parse', '--show-toplevel']);
  return result.ok && result.out ? result.out : undefined;
}

export async function defaultRemote(root: string): Promise<string | undefined> {
  const result = await git(root, ['remote']);
  if (!result.ok) return undefined;
  const remotes = result.out.split('\n').filter(Boolean);
  if (remotes.length === 0) return undefined;
  if (remotes.includes('origin')) return 'origin';
  // Several non-origin remotes resolve to none: a guessed trunk is wrong invisibly.
  return remotes.length === 1 ? remotes[0] : undefined;
}

type BaseRefSource =
  | 'upstream'
  | 'remote-head'
  | 'sole-remote-branch'
  | 'conventional-name'
  | 'local-main';

export type BaseRefResolution =
  | { ok: true; ref: string; branch: string; source: BaseRefSource }
  | { ok: false; candidates: string[] };

// Every rung is a local read: `git remote show` round-trips and hangs offline until the timeout, with the connect dialog open.
export async function resolveBaseRef(
  root: string,
  remote: string,
): Promise<BaseRefResolution> {
  const prefix = `${remote}/`;

  const upstream = await git(root, ['rev-parse', '--abbrev-ref', '@{upstream}']);
  if (upstream.ok && upstream.out.startsWith(prefix)) {
    return {
      ok: true,
      ref: upstream.out,
      branch: upstream.out.slice(prefix.length),
      source: 'upstream',
    };
  }

  return resolveBaseRefBelowUpstream(root, remote);
}

/** `resolveBaseRef` without its `@{upstream}` rung, which answers for whichever branch the repository is sitting on now (ONL-2522). */
export async function resolveBaseRefBelowUpstream(
  root: string,
  remote: string,
): Promise<BaseRefResolution> {
  const prefix = `${remote}/`;

  // `origin/HEAD` is often unset (`init` + `remote add` + `push` leaves none), so the rungs below carry real repos.
  const head = await git(root, ['symbolic-ref', '--short', `refs/remotes/${remote}/HEAD`]);
  if (head.ok && head.out.startsWith(prefix)) {
    return {
      ok: true,
      ref: head.out,
      branch: head.out.slice(prefix.length),
      source: 'remote-head',
    };
  }

  const listed = await git(root, [
    'for-each-ref',
    '--format=%(refname:short)',
    `refs/remotes/${remote}`,
  ]);
  const branches = listed.ok
    ? listed.out
        .split('\n')
        .filter(Boolean)
        .filter((name) => name !== `${remote}/HEAD`)
    : [];

  const sole = branches[0];
  if (branches.length === 1 && sole !== undefined) {
    return {
      ok: true,
      ref: sole,
      branch: sole.slice(prefix.length),
      source: 'sole-remote-branch',
    };
  }

  // Order matters: a repo carrying both has migrated.
  for (const candidate of ['main', 'master']) {
    if (branches.includes(`${prefix}${candidate}`)) {
      return {
        ok: true,
        ref: `${prefix}${candidate}`,
        branch: candidate,
        source: 'conventional-name',
      };
    }
  }

  // A refusal, not a fifth guess: a wrong base surfaces long after its cause.
  return { ok: false, candidates: branches };
}

export async function resolveLocalBaseRef(root: string): Promise<BaseRefResolution> {
  // Local `main` by name, for a repo with no remote; HEAD is the user's current branch, which isolation keeps unreachable (ONL-2152).
  const main = await git(root, ['rev-parse', '--verify', '--quiet', 'refs/heads/main^{commit}']);
  if (main.ok && main.out) {
    return { ok: true, ref: 'main', branch: 'main', source: 'local-main' };
  }
  return { ok: false, candidates: [] };
}

export async function remoteUrl(root: string, remote: string): Promise<string | undefined> {
  const result = await git(root, ['remote', 'get-url', remote]);
  return result.ok && result.out ? result.out : undefined;
}

export async function configuredUserName(root: string): Promise<string | undefined> {
  const result = await git(root, ['config', 'user.name']);
  return result.ok && result.out ? result.out : undefined;
}

export async function branchExists(root: string, branch: string): Promise<boolean> {
  const result = await git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  return result.ok;
}

export async function addWorktree(options: {
  root: string;
  worktreePath: string;
  branch: string;
  startPoint: string;
}): Promise<GitResult> {
  return git(
    options.root,
    [
      'worktree',
      'add',
      // Without it the upstream is `origin/main`, and git's refusal of a bare push tells an agent to run `git push origin HEAD:main`.
      '--no-track',
      '-b',
      options.branch,
      options.worktreePath,
      options.startPoint,
    ],
    { timeoutMs: WORKTREE_TIMEOUT_MS },
  );
}

export async function resolveCommit(root: string, ref: string): Promise<string | undefined> {
  const result = await git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return result.ok && result.out ? result.out : undefined;
}

export async function worktreeHead(worktreePath: string): Promise<string | undefined> {
  const result = await git(worktreePath, ['rev-parse', 'HEAD']);
  return result.ok && result.out ? result.out : undefined;
}

// Absolute, not `--git-dir`: below a checkout's top folder that prints an absolute path while the common dir prints a relative one, and the two stop comparing (ONL-2522).
export async function gitDir(path: string): Promise<string | undefined> {
  const result = await git(path, ['rev-parse', '--absolute-git-dir']);
  return result.ok && result.out ? result.out : undefined;
}

// Equal to `gitDir` in a repository's own checkout at any depth and different in a linked worktree, which is the only test that separates them (ONL-2522).
export async function gitCommonDir(path: string): Promise<string | undefined> {
  const result = await git(path, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return result.ok && result.out ? result.out : undefined;
}

// Inside a worktree whose repository is gone every `rev-parse` fails exactly as in a plain directory, so the pointer is the only surviving signal (ONL-2522).
export function worktreePointer(path: string): string | undefined {
  const dotGit = join(path, '.git');
  if (statSync(dotGit, { throwIfNoEntry: false })?.isFile() !== true) return undefined;
  let contents: string;
  try {
    // `statSync` proved a file, not a readable one, and the whole scan runs on directories the user owns nothing of (ONL-2522).
    contents = readFileSync(dotGit, 'utf8');
  } catch {
    return undefined;
  }
  const gitdir = /^gitdir:[ \t]*(.+)$/m.exec(contents)?.[1]?.trim();
  if (gitdir === undefined || gitdir === '') return undefined;
  return resolve(path, gitdir);
}

/** `worktree <path>` from each porcelain block the filter keeps. */
export function porcelainWorktreePaths(
  out: string,
  keeps: (block: string) => boolean = () => true,
): string[] {
  return out
    .split('\n\n')
    .filter(keeps)
    .map((block) => /^worktree (.+)$/m.exec(block)?.[1])
    .filter((path): path is string => path !== undefined);
}

/** Asked of the repository, not of the candidate: a crafted `.git` gitfile names whichever repository it likes (ONL-2522). */
export async function listsWorktree(root: string, worktreePath: string): Promise<boolean> {
  const listed = await git(root, ['worktree', 'list', '--porcelain']);
  if (!listed.ok) return false;
  const spellings = new Set(pathSpellings(worktreePath));
  return porcelainWorktreePaths(listed.out).some((path) =>
    pathSpellings(path).some((spelling) => spellings.has(spelling)),
  );
}

export async function removeWorktree(root: string, worktreePath: string): Promise<GitResult> {
  return git(root, ['worktree', 'remove', '--force', worktreePath]);
}

export async function deleteBranch(root: string, branch: string): Promise<GitResult> {
  return git(root, ['branch', '-D', branch]);
}

export type RenameBranchResult =
  | { ok: true; branch: string; moved: boolean }
  | { ok: false; detail: string };

const RENAME_SUFFIX_BOUND = 9;

export async function renameBranch(worktreePath: string, target: string): Promise<RenameBranchResult> {
  const current = await git(worktreePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!current.ok || !current.out || current.out === 'HEAD') {
    return { ok: false, detail: current.err || 'the worktree is not on a branch' };
  }
  if (current.out === target) return { ok: true, branch: target, moved: false };

  let lastError = '';
  for (let n = 1; n <= RENAME_SUFFIX_BOUND; n += 1) {
    const candidate = n === 1 ? target : `${target}-${String(n)}`;
    if (candidate === current.out) return { ok: true, branch: candidate, moved: false };
    // `-m` carries no upstream across, so a `--no-track` worktree stays one (ONL-2181).
    const moved = await git(worktreePath, ['branch', '-m', candidate]);
    if (moved.ok) return { ok: true, branch: candidate, moved: true };
    lastError = moved.err;
  }
  return { ok: false, detail: lastError || `every name from ${target} to ${target}-${String(RENAME_SUFFIX_BOUND)} is taken` };
}

/** The newest commit's subject that is the branch's own; none when it has nothing past its base, so a row never shows the base's work (ONL-2593). */
export async function latestOwnCommitSubject(path: string, baseBranch: string): Promise<string | undefined> {
  const result = await git(path, ['log', '-1', '--no-merges', '--format=%s', `${baseBranch}..HEAD`]);
  return result.ok && result.out ? result.out : undefined;
}

export async function currentBranch(path: string): Promise<string | undefined> {
  const result = await git(path, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!result.ok || !result.out || result.out === 'HEAD') return undefined;
  return result.out;
}
