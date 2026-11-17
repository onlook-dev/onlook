import { createHash } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCANNER_VERSION = '8.24.3';
const CONFIG = fileURLToPath(new URL('../.gitleaks.toml', import.meta.url));
const FINDINGS_EXIT = 23;
// The last commit of the previous product's history in the public repository (onlook-dev/onlook).
export const PREVIOUS_PRODUCT_LAST_COMMIT = '423e2e924366419e418ee049093872d535eea41a';
const ASSETS: Record<string, { name: string; sha256: string }> = {
  'darwin-arm64': { name: 'darwin_arm64.tar.gz', sha256: 'b90f13bb8c90ab72083d9b0c842e39dafb82c0e5c3f872f407366b7a58909013' },
  'darwin-x64': { name: 'darwin_x64.tar.gz', sha256: '41c44ae8ad1d6eef57d4526ad0fd67d8129eee9a856f55c2b3b9395fd3d9ec0f' },
  'linux-arm64': { name: 'linux_arm64.tar.gz', sha256: '5f2edbe1f49f7b920f9e06e90759947d3c5dfc16f752fb93aaafc17e9d14cf07' },
  'linux-x64': { name: 'linux_x64.tar.gz', sha256: '9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c' },
  'win32-x64': { name: 'windows_x64.zip', sha256: '3f1a35578631dbfe633cc5b49e6c906e55ff14a4bfd7336a10fb27fe33b6dcd2' },
};

export interface HistoryScope {
  /** Revision arguments for `git log` and `git rev-list`. */
  revisions: string[];
  commits: number;
  /** The commit the scan starts after, or null when all fetched history is scanned. */
  after: string | null;
}

export interface SecretLocation {
  file: string;
  line: number;
  rule: string;
  commit: string;
}

export function verifyArchive(bytes: Uint8Array, expected: string): void {
  if (createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error('Secret scanner download failed checksum verification.');
  }
}

export async function installScanner(directory: string): Promise<string> {
  const asset = ASSETS[`${process.platform}-${process.arch}`];
  if (!asset) throw new Error('Secret scanner does not support this platform.');
  const name = `gitleaks_${SCANNER_VERSION}_${asset.name}`;
  const response = await fetch(`https://github.com/gitleaks/gitleaks/releases/download/v${SCANNER_VERSION}/${name}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error('Secret scanner download failed.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  verifyArchive(bytes, asset.sha256);
  const archive = join(directory, name);
  writeFileSync(archive, bytes, { mode: 0o600 });
  const executable = process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';
  const extracted = spawnSync('tar', ['-xf', archive, '-C', directory, executable], { stdio: 'pipe', timeout: 30_000 });
  if (extracted.status !== 0) throw new Error('Secret scanner extraction failed.');
  const binary = join(directory, executable);
  chmodSync(binary, 0o700);
  return binary;
}

function git(cwd: string, args: string[]): Buffer {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe', timeout: 30_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Secret scan could not read the Git repository.');
  return result.stdout;
}

function succeeds(cwd: string, args: string[]): boolean {
  return spawnSync('git', args, { cwd, stdio: 'pipe', timeout: 30_000 }).status === 0;
}

function lines(output: Buffer): string[] {
  return output.toString('utf8').split('\n').filter(Boolean);
}

/**
 * The history this repository owns. All fetched history, unless `boundary` is an ancestor of HEAD:
 * then every commit after it that HEAD reaches. Anything else, including a boundary that is
 * present but not an ancestor, is the full scan. History that is not completely fetched throws.
 */
export function historyScope(cwd: string, boundary: string = PREVIOUS_PRODUCT_LAST_COMMIT): HistoryScope {
  if (!/^[0-9a-f]{40}$/.test(boundary)) throw new Error('Secret scan boundary must be a full commit SHA.');
  const shallow = git(cwd, ['rev-parse', '--is-shallow-repository']).toString().trim() !== 'false';
  const incomplete = new Error('Secret scan needs complete Git history. Fetch with --unshallow, then run it again.');
  const bounded = succeeds(cwd, ['cat-file', '-e', `${boundary}^{commit}`])
    && succeeds(cwd, ['merge-base', '--is-ancestor', boundary, 'HEAD']);
  if (!bounded) {
    if (shallow) throw incomplete;
    const revisions = ['--all'];
    return { revisions, commits: Number(git(cwd, ['rev-list', '--count', ...revisions]).toString().trim()), after: null };
  }
  const head = git(cwd, ['rev-parse', '--verify', 'HEAD^{commit}']).toString().trim();
  const revisions = [`${boundary}..${head}`];
  const owned = lines(git(cwd, ['rev-list', ...revisions]));
  if (shallow) {
    // A shallow clone is complete for this range only if no commit in it has its parents cut off.
    const cut = new Set(lines(readFileSync(git(cwd, ['rev-parse', '--path-format=absolute', '--git-path', 'shallow']).toString().trim())));
    if (owned.some((commit) => cut.has(commit))) throw incomplete;
  }
  return { revisions, commits: owned.length, after: boundary };
}

function snapshot(cwd: string, destination: string, metadata: string): void {
  for (const path of git(cwd, ['ls-files', '--cached', '-z']).toString('utf8').split('\0').filter(Boolean)) {
    if (isAbsolute(path) || path.split(/[\\/]/).includes('..')) throw new Error('Secret scan found an invalid tracked path.');
    const source = join(cwd, path);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(source);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('Secret scan does not support tracked submodules.');
    const target = path === '.gitleaksignore' ? join(metadata, 'ignore-file.txt') : join(destination, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stat.isSymbolicLink() ? readlinkSync(source) : readFileSync(source));
  }
}

function scan(binary: string, cwd: string, mode: 'dir' | 'git', source: string, directory: string, revisions: string[] = []): SecretLocation[] {
  const report = join(mkdtempSync(join(directory, 'report-')), 'findings.json');
  const result = spawnSync(binary, [
    mode, mode === 'dir' ? '.' : source, '--config', CONFIG, '--redact=100', '--no-banner', '--no-color', '--log-level=error',
    '--ignore-gitleaks-allow', '--gitleaks-ignore-path', join(directory, 'no-ignore'), '--max-decode-depth=3',
    `--exit-code=${FINDINGS_EXIT}`, '--report-format=json', '--report-path', report,
    ...(mode === 'git' ? [`--log-opts=${[...revisions, '--full-history', '-m'].join(' ')}`] : []),
  ], { cwd: mode === 'dir' ? source : cwd, stdio: 'pipe', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 && result.status !== FINDINGS_EXIT) throw new Error('Secret scanner could not finish.');
  const findings: unknown = JSON.parse(readFileSync(report, 'utf8'));
  if (!Array.isArray(findings) || (result.status === 0) !== (findings.length === 0)) {
    throw new Error('Secret scanner returned an invalid report.');
  }
  return findings.map((finding: { File: string; StartLine: number; RuleID: string; Commit: string }) => ({
    file: finding.File, line: finding.StartLine, rule: finding.RuleID, commit: finding.Commit,
  }));
}

export function scanSecrets(binary: string, cwd: string, scope: HistoryScope = historyScope(cwd)): SecretLocation[] {
  const directory = mkdtempSync(join(tmpdir(), 'studio-secret-scan-'));
  try {
    writeFileSync(join(directory, 'no-ignore'), '');
    const tree = join(directory, 'tree');
    mkdirSync(tree);
    const metadata = join(directory, 'metadata');
    mkdirSync(metadata);
    snapshot(cwd, tree, metadata);
    const gitDirectory = git(cwd, ['rev-parse', '--absolute-git-dir']).toString().trim();
    writeFileSync(join(metadata, 'commits.txt'), git(cwd, ['log', ...scope.revisions, '--format=%H%n%B']));
    writeFileSync(join(metadata, 'tags.txt'), git(cwd, ['for-each-ref', 'refs/tags', '--format=%(refname)%0a%(contents)']));
    return [
      ...scan(binary, cwd, 'dir', tree, directory),
      ...scan(binary, cwd, 'git', gitDirectory, directory, scope.revisions),
      ...scan(binary, cwd, 'dir', metadata, directory),
    ];
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main(): Promise<number> {
  const directory = mkdtempSync(join(tmpdir(), 'studio-secret-scanner-'));
  try {
    const binary = await installScanner(directory);
    const scope = historyScope(process.cwd());
    const findings = scanSecrets(binary, process.cwd(), scope);
    if (findings.length) {
      process.stdout.write(`Secret scan found ${findings.length} potential credential occurrence${findings.length === 1 ? '' : 's'}. Remove credentials before pushing.\n`);
      for (const finding of findings) {
        const location = `${finding.file}:${finding.line} (${finding.rule}, ${finding.commit?.slice(0, 12) || 'working tree'})`;
        process.stdout.write(`${location.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')}\n`);
      }
      return 1;
    }
    const commits = `${scope.commits} commit${scope.commits === 1 ? '' : 's'}`;
    process.stdout.write(scope.after
      ? `Secret scan passed for tracked files and the ${commits} after ${scope.after}, where the previous product's history ends.\n`
      : `Secret scan passed for tracked files and all fetched Git history (${commits}).\n`);
    return 0;
  } catch {
    process.stdout.write('Secret scan could not finish. Check Git, platform support and network access, then run it again.\n');
    return 2;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = await main();
