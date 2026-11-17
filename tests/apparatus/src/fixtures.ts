import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Process-wide: `cleanupTempFixtures()` drops every suite's dirs, safe only because `bun test` runs files one at a time.
const created: string[] = [];

export function cleanupTempFixtures(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function tempDir(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `studio-${name}-`));
  created.push(dir);
  return dir;
}

// Canonicalised to match git's output; `tempDir` is not, because the app joins onto the env string it was handed.
function realTempDir(name: string, under?: string): string {
  if (under !== undefined) mkdirSync(under, { recursive: true });
  const dir = realpathSync.native(mkdtempSync(join(under ?? tmpdir(), `studio-${name}-`)));
  created.push(dir);
  return dir;
}

// `GIT_TERMINAL_PROMPT=0`: a misconfigured machine fails instead of hanging the suite on a credential prompt.
export function gitOutput(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

export function makeDirWithFiles(
  options: { name?: string; files?: Record<string, string> } = {},
): string {
  const dir = tempDir(options.name ?? 'dir');
  for (const [relPath, contents] of Object.entries(options.files ?? {})) {
    const target = join(dir, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return dir;
}

export const FIXTURE_SECRET_LINE = 'FIXTURE_ONLY=not-a-real-secret\n';

export interface CopySourceDir {
  path: string;
  files: Record<string, string>;
  symlink: { path: string; target: string };
}

export const COPY_SOURCE_FILES: Record<string, string> = {
  'package.json': '{ "name": "copy-fixture", "private": true, "scripts": { "dev": "node src/index.js" } }\n',
  'src/index.js': 'console.log("copy fixture");\n',
  'src/components/Hero.jsx': 'export function Hero() { return null; }\n',
  '.editorconfig': 'root = true\n',
  '.env': FIXTURE_SECRET_LINE,
  'credentials.json': '{ "FIXTURE_ONLY": "not-a-real-secret" }\n',
  'certs/dev.pem': '-----BEGIN FIXTURE-----\nnot-a-real-key\n-----END FIXTURE-----\n',
  '.DS_Store': 'not-really-finder-metadata\n',
  'dist/bundle.js': '// built output\n',
  'node_modules/left-pad/index.js': 'module.exports = (s) => s;\n',
  'node_modules/left-pad/.env': FIXTURE_SECRET_LINE,
};

export const COPY_SOURCE_SYMLINK = { path: 'docs/entry', target: '../src/index.js' } as const;

export function makeCopySourceDir(
  options: { name?: string; gitignore?: string } = {},
): CopySourceDir {
  const files = { ...COPY_SOURCE_FILES, ...(options.gitignore === undefined ? {} : { '.gitignore': options.gitignore }) };
  const path = realTempDir(options.name ?? 'copy-source');
  for (const [relPath, contents] of Object.entries(files)) {
    const target = join(path, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  const link = join(path, COPY_SOURCE_SYMLINK.path);
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(COPY_SOURCE_SYMLINK.target, link);
  return { path, files, symlink: { ...COPY_SOURCE_SYMLINK } };
}

export interface MonorepoApp {
  /** `.` makes a single-package repository and must be the only entry. */
  dir: string;
  name?: string;
  dev?: string;
  dependencies?: Record<string, string>;
  env?: { file: string; port: number };
}

export interface MonorepoDir {
  path: string;
  apps: MonorepoApp[];
}

export const MONOREPO_APPS: readonly MonorepoApp[] = [
  { dir: 'apps/web', name: 'web', dev: 'next dev', dependencies: { next: '15.0.0', react: '19.0.0' } },
  { dir: 'apps/admin', name: 'admin', dev: 'vite -p 4000', dependencies: { vite: '6.0.0' } },
];

export function makeMonorepoDir(
  options: { name?: string; apps?: readonly MonorepoApp[]; manager?: 'workspaces' | 'pnpm' | 'turbo' } = {},
): MonorepoDir {
  const apps = [...(options.apps ?? MONOREPO_APPS)];
  const path = realTempDir(options.name ?? 'monorepo');
  const single = apps.length === 1 && apps[0]?.dir === '.';
  const manager = options.manager ?? 'workspaces';
  if (!single) {
    const root: Record<string, unknown> = { name: 'fixture-mono', private: true };
    if (manager === 'workspaces') root['workspaces'] = ['apps/*'];
    writeFileSync(join(path, 'package.json'), `${JSON.stringify(root, null, 2)}\n`);
    if (manager === 'pnpm') writeFileSync(join(path, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n');
    if (manager === 'turbo') writeFileSync(join(path, 'turbo.json'), '{ "tasks": { "dev": { "cache": false } } }\n');
  }
  for (const app of apps) {
    const dir = join(path, app.dir);
    mkdirSync(dir, { recursive: true });
    const manifest: Record<string, unknown> = {
      name: app.name ?? (app.dir === '.' ? 'fixture-app' : app.dir.slice(app.dir.lastIndexOf('/') + 1)),
      private: true,
      ...(app.dev === undefined ? {} : { scripts: { dev: app.dev } }),
      ...(app.dependencies === undefined ? {} : { dependencies: app.dependencies }),
    };
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (app.env !== undefined) {
      writeFileSync(join(dir, app.env.file), `PORT=${String(app.env.port)}\n${FIXTURE_SECRET_LINE}`);
    }
  }
  return { path, apps };
}

export function hashTree(dir: string): string {
  const hash = createHash('sha256');
  const walk = (rel: string): void => {
    const full = rel === '' ? dir : join(dir, rel);
    const entries = readdirSync(full, { withFileTypes: true }).map((e) => e.name).sort();
    for (const name of entries) {
      const relPath = rel === '' ? name : `${rel}/${name}`;
      const stat = lstatSync(join(dir, relPath));
      const mode = (stat.mode & 0o777).toString(8);
      if (stat.isSymbolicLink()) {
        hash.update(`L ${relPath} ${mode} ${readlinkSync(join(dir, relPath))}\0`);
      } else if (stat.isDirectory()) {
        hash.update(`D ${relPath} ${mode}\0`);
        walk(relPath);
      } else {
        hash.update(`F ${relPath} ${mode} `);
        hash.update(readFileSync(join(dir, relPath)));
        hash.update('\0');
      }
    }
  };
  walk('');
  return hash.digest('hex');
}

// A run without `STUDIO_WORKSPACE_ROOT` registers real git worktrees in the runner's own userData.
export function makeWorkspaceRoot(options: { name?: string } = {}): string {
  return tempDir(options.name ?? 'workspaces');
}

// Read at first import, before any suite body runs, so it is the runner's value and not a sibling's.
const enteringWorkspaceRoot = process.env['STUDIO_WORKSPACE_ROOT'];

export function restoreWorkspaceRoot(): void {
  if (enteringWorkspaceRoot === undefined) delete process.env['STUDIO_WORKSPACE_ROOT'];
  else process.env['STUDIO_WORKSPACE_ROOT'] = enteringWorkspaceRoot;
}

// A run without `STUDIO_STATE_ROOT` writes into the userData `bun dev` and the packaged app share (ONL-1880).
export function makeStateRoot(options: { name?: string } = {}): string {
  return tempDir(options.name ?? 'state');
}

export interface GitRepoFixture {
  root: string;
  origin: string | undefined;
  path: string;
  pushedContent: string;
}

export interface MakeGitRepoOptions {
  name?: string;
  seedFile?: string;
  seedContent?: string;
  remote?: boolean;
  root?: string;
}

export function makeGitRepo(
  options: MakeGitRepoOptions & { remote: false },
): GitRepoFixture & { origin: undefined };
export function makeGitRepo(
  options?: MakeGitRepoOptions & { remote?: true },
): GitRepoFixture & { origin: string };
export function makeGitRepo(options: MakeGitRepoOptions = {}): GitRepoFixture {
  const seedFile = options.seedFile ?? 'index.js';
  const pushedContent = options.seedContent ?? '// pushed to the remote\n';

  const withRemote = options.remote ?? true;
  const root = realTempDir(options.name ?? 'gitrepo', options.root);
  const origin = withRemote ? join(root, 'origin.git') : undefined;
  const checkout = join(root, 'checkout');

  if (origin) {
    mkdirSync(origin, { recursive: true });
    gitOutput(root, ['init', '--quiet', '--bare', origin]);
    gitOutput(root, ['clone', '--quiet', origin, checkout]);
  } else {
    mkdirSync(checkout, { recursive: true });
    gitOutput(checkout, ['init', '--quiet', '-b', 'main']);
  }
  gitOutput(checkout, ['config', 'user.email', 'fixture@example.com']);
  gitOutput(checkout, ['config', 'user.name', 'Fixture User']);

  writeFileSync(join(checkout, '.gitignore'), 'node_modules\n.env*\n');
  const seedTarget = join(checkout, seedFile);
  mkdirSync(dirname(seedTarget), { recursive: true });
  writeFileSync(seedTarget, pushedContent);
  gitOutput(checkout, ['add', '-A']);
  gitOutput(checkout, ['commit', '--quiet', '-m', 'init']);
  if (origin) {
    gitOutput(checkout, ['branch', '-M', 'main']);
    gitOutput(checkout, ['push', '--quiet', '-u', 'origin', 'main']);
  }

  return { root, origin, path: checkout, pushedContent };
}

export interface SourceCheckout extends GitRepoFixture {
  envFiles: string[];
  localOnlyContent: string;
  uncommittedContent: string;
}

export function makeSourceCheckout(
  options: { envFiles?: string[]; name?: string; root?: string } = {},
): SourceCheckout {
  const base = makeGitRepo({
    name: options.name ?? 'source-checkout',
    ...(options.root === undefined ? {} : { root: options.root }),
  });
  const checkout = base.path;

  const localOnlyContent = '// LOCAL-ONLY COMMIT, never pushed\n';
  const uncommittedContent = '// UNCOMMITTED work in progress\n';

  // Ahead of origin and dirty: at `origin/main`, branching from the remote and from local HEAD are indistinguishable.
  gitOutput(checkout, ['commit', '--quiet', '--allow-empty', '-m', 'local only']);
  writeFileSync(join(checkout, 'index.js'), localOnlyContent);
  gitOutput(checkout, ['add', '-A']);
  gitOutput(checkout, ['commit', '--quiet', '-m', 'local only change']);
  writeFileSync(join(checkout, 'index.js'), uncommittedContent);

  const envFiles = options.envFiles ?? [];
  for (const relPath of envFiles) {
    const full = join(checkout, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `FIXTURE_ONLY=not-a-real-secret\n`);
  }

  return { ...base, envFiles, localOnlyContent, uncommittedContent };
}

// `core.hooksPath`, not `.git/hooks`: the real failure arrives through a hooksPath git-lfs configures globally.
export function installPostCheckoutHook(
  repo: string,
  body: string,
  options: { name?: string } = {},
): string {
  const dir = tempDir(`hooks-${options.name ?? 'default'}`);
  const hook = join(dir, 'post-checkout');
  writeFileSync(hook, body);
  chmodSync(hook, 0o755);
  gitOutput(repo, ['config', 'core.hooksPath', dir]);
  return dir;
}

// `canvas` is the canvas registry's own directory, not a bucket.
export function bucketsIn(root: string): string[] {
  return existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name !== 'canvas')
        .map((e) => e.name)
    : [];
}
