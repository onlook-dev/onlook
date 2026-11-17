import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

interface Review {
  path: string;
  sha256: string;
  evidence: string;
}

export interface PublicFinding {
  path: string;
  revision: string;
  reason: string;
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides', 'resolutions', 'patchedDependencies', 'workspaces', 'bundledDependencies', 'bundleDependencies'];
const ASSET = /\.(?:svg|png|jpe?g|gif|webp|avif|ico|icns|pdf|woff2?|ttf|otf|mp[34]|wav|ogg|webm|zip|gz|dmg|exe)$/i;
const SENSITIVE = /(?:^|\/)(?:\.env(?:\.(?!example$|sample$|template$)[^/]+)?|id_(?:rsa|ed25519)|credentials(?:\.json)?|[^/]+\.(?:pem|key|p12|pfx|mobileprovision))$/i;
const PERSONAL_HOME = /(?:[/]Users[/]|[/]home[/]|[A-Z]:\\Users\\)(?!example(?:[/\\\s"'`]|$)|Public(?:[/\\\s"'`]|$)|<)[A-Za-z0-9_.-]+(?=[/\\\s"'`]|$)/i;

function git(cwd: string, args: string[]): Buffer {
  const result = spawnSync('git', ['--literal-pathspecs', ...args], { cwd, encoding: 'buffer', timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Public-readiness check could not read Git. Fetch complete history and check the base reference.');
  return result.stdout;
}

function list(buffer: Buffer): string[] {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function relativePath(value: string): boolean {
  return value.length > 0 && !value.includes('\\') && !value.includes('\0') && !value.startsWith('/') && posix.normalize(value) === value && !value.startsWith('../') && value !== '..';
}

function dependencyMap(bytes: Buffer | undefined): string {
  const manifest = (bytes?.length ? parseJson(bytes.toString('utf8')) : {}) as Record<string, unknown> | null;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Public-readiness check needs package manifests to be JSON objects.');
  return JSON.stringify(DEPENDENCY_FIELDS.map((field) => [field, manifest[field] ?? {}]));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Public-readiness JSON is invalid. Check the manifests and review ledger.');
  }
}

function needsReview(path: string, bytes: Buffer, before: Buffer | undefined): boolean {
  if (/(?:^|\/)package\.json$/.test(path)) return dependencyMap(bytes) !== dependencyMap(before);
  return ASSET.test(path) || bytes.includes(0) || before?.includes(0) === true || path.startsWith('patches/') || /(?:^|\/)(?:bun\.lockb?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|(?:LICENSE|COPYING|NOTICE)(?:[.-][^/]*)?)$/i.test(path);
}

function readReviews(cwd: string, tracked: Set<string>): Review[] {
  if (!tracked.has('public-readiness.json')) throw new Error('Track public-readiness.json before running the check.');
  if (!lstatSync(join(cwd, 'public-readiness.json')).isFile()) throw new Error('The public-review ledger must be a regular file.');
  const ledger = parseJson(readFileSync(join(cwd, 'public-readiness.json'), 'utf8')) as { reviews?: unknown } | null;
  if (!ledger || !Array.isArray(ledger.reviews)) throw new Error('public-readiness.json must contain a reviews array.');
  return ledger.reviews.map((value: unknown) => {
    const review = value as Partial<Review> | null;
    if (!review || typeof review.path !== 'string' || !relativePath(review.path) || typeof review.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(review.sha256) || typeof review.evidence !== 'string' || !relativePath(review.evidence) || !review.evidence.endsWith('.md') || !tracked.has(review.evidence)) {
      throw new Error('Each public review needs a relative path, SHA-256 and tracked Markdown evidence.');
    }
    const evidence = join(cwd, review.evidence);
    if (!lstatSync(evidence).isFile() || !readFileSync(evidence, 'utf8').trim()) throw new Error('Public-review evidence must be a nonempty regular file.');
    return review as Review;
  });
}

function addedLines(patch: string): string {
  let inHunk = false;
  return patch.split('\n').filter((line) => {
    if (line.startsWith('@@')) inHunk = true;
    return inHunk && line.startsWith('+');
  }).join('\n');
}

export function checkPublicReadiness(cwd: string, baseRef = 'origin/main', branchName?: string): PublicFinding[] {
  if (git(cwd, ['rev-parse', '--is-shallow-repository']).toString().trim() !== 'false') throw new Error('Public-readiness check needs complete Git history.');
  const base = git(cwd, ['rev-parse', '--verify', '--end-of-options', `${baseRef}^{commit}`]).toString().trim();
  const ancestor = git(cwd, ['merge-base', base, 'HEAD']).toString().trim();
  const baseHistory = new Set(git(cwd, ['rev-list', base]).toString().trim().split('\n'));
  const tracked = new Set(list(git(cwd, ['ls-files', '-z'])));
  const reviews = readReviews(cwd, tracked);
  const findings: PublicFinding[] = [];
  const inspect = (path: string, bytes: Buffer, before: Buffer | undefined, revision: string, added: string, deleted: boolean) => {
    if (!deleted && SENSITIVE.test(path)) findings.push({ path, revision, reason: 'Sensitive filename. Keep credentials outside Git and use an example file.' });
    if (PERSONAL_HOME.test(added)) findings.push({ path, revision, reason: 'Personal home path. Use a portable path or the example user.' });
    if (needsReview(path, bytes, before)) {
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (!reviews.some((review) => review.path === path && review.sha256 === sha256)) {
        findings.push({ path, revision, reason: `Dependency, asset or license change needs review evidence for SHA-256 ${sha256}.` });
      }
    }
  };
  const revisions = git(cwd, ['rev-list', '--reverse', `${ancestor}..HEAD`]).toString().trim().split('\n').filter(Boolean);
  for (const revision of revisions) {
    const parents = git(cwd, ['rev-list', '--parents', '-n', '1', revision]).toString().trim().split(' ').slice(1);
    const parent = parents.find((candidate) => baseHistory.has(candidate)) ?? parents[0]!;
    const paths = list(git(cwd, ['diff', '--name-only', '-z', '--no-renames', '--diff-filter=ACDMT', parent, revision, '--']));
    const oldPaths = new Set(list(git(cwd, ['ls-tree', '-r', '--name-only', '-z', parent])));
    const newPaths = new Set(list(git(cwd, ['ls-tree', '-r', '--name-only', '-z', revision])));
    for (const path of paths) {
      const bytes = newPaths.has(path) ? git(cwd, ['show', `${revision}:${path}`]) : Buffer.alloc(0);
      const before = oldPaths.has(path) ? git(cwd, ['show', `${parent}:${path}`]) : undefined;
      const patch = git(cwd, ['diff', '--text', '--no-ext-diff', '--no-textconv', '--unified=0', parent, revision, '--', path]).toString('utf8');
      inspect(path, bytes, before, revision.slice(0, 12), addedLines(patch), !newPaths.has(path));
    }
    if (PERSONAL_HOME.test(git(cwd, ['show', '-s', '--format=%B', revision]).toString())) findings.push({ path: '(commit message)', revision: revision.slice(0, 12), reason: 'Personal home path in commit message.' });
  }
  const mergeHeadPath = resolve(cwd, git(cwd, ['rev-parse', '--git-path', 'MERGE_HEAD']).toString().trim());
  const mergeParents = existsSync(mergeHeadPath) ? readFileSync(mergeHeadPath, 'utf8').trim().split('\n') : [];
  const workingParent = mergeParents.find((candidate) => baseHistory.has(candidate)) ?? 'HEAD';
  const headPaths = new Set(list(git(cwd, ['ls-tree', '-r', '--name-only', '-z', workingParent])));
  const changed = list(git(cwd, ['diff', workingParent, '--name-only', '-z', '--no-renames', '--diff-filter=ACDMT', '--']));
  for (const path of changed) {
    const file = join(cwd, path);
    const deleted = !tracked.has(path);
    if (!deleted && !lstatSync(file, { throwIfNoEntry: false })?.isFile()) throw new Error('Public-readiness check needs regular files for working changes. Stage deletions or commit links before checking.');
    const bytes = deleted ? Buffer.alloc(0) : readFileSync(file);
    const before = headPaths.has(path) ? git(cwd, ['show', `${workingParent}:${path}`]) : undefined;
    const patch = git(cwd, ['diff', workingParent, '--text', '--no-ext-diff', '--no-textconv', '--unified=0', '--', path]).toString('utf8');
    inspect(path, bytes, before, 'working tree', addedLines(patch), deleted);
  }
  const branch = branchName ?? git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
  if (!branchName && branch === 'HEAD') throw new Error('A detached checkout needs PUBLIC_READINESS_BRANCH set to the submitted branch name.');
  try {
    git(cwd, ['check-ref-format', `refs/heads/${branch}`]);
  } catch {
    throw new Error('Public-readiness branch name is invalid.');
  }
  if (PERSONAL_HOME.test(branch)) findings.push({ path: '(branch name)', revision: 'HEAD', reason: 'Personal home path in branch name.' });
  return findings;
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 0 && (args.length !== 2 || args[0] !== '--base' || !args[1])) throw new Error('Use bun run check:public [--base <reference>].');
    const findings = checkPublicReadiness(process.cwd(), args[1], process.env.PUBLIC_READINESS_BRANCH);
    for (const finding of findings) process.stderr.write(`${JSON.stringify(finding.path)} (${finding.revision}): ${finding.reason}\n`);
    if (findings.length) process.exitCode = 1;
    else process.stdout.write('Public-readiness checks passed. Privacy and licensing still need independent review.\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Public-readiness check could not finish.'}\n`);
    process.exitCode = 1;
  }
}
