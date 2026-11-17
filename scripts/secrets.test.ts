import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { historyScope, installScanner, PREVIOUS_PRODUCT_LAST_COMMIT, scanSecrets, verifyArchive } from './secrets.js';

const SCANNER_TIMEOUT = 240_000;
const CLI_TIMEOUT = 180_000; // under SCANNER_TIMEOUT, so a slow scanner hits its own 120s guard in secrets.ts first
const temporary: string[] = [];
let scannerDirectory: string;
let binary: string;

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
  if (result.status !== 0) throw new Error('Git fixture failed.');
  return result.stdout.toString('utf8').trim();
}

function repository(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'secret-fixture-'));
  temporary.push(cwd);
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Secret scan fixture');
  git(cwd, 'config', 'user.email', 'fixture@example.test');
  writeFileSync(join(cwd, 'README'), 'Secret scan fixture\n');
  git(cwd, 'add', 'README');
  git(cwd, 'commit', '-m', 'Initialize fixture');
  return cwd;
}

function tracked(cwd: string, path: string, contents: string): void {
  mkdirSync(dirname(join(cwd, path)), { recursive: true });
  writeFileSync(join(cwd, path), contents);
  git(cwd, 'add', path);
}

// Hex digits without 0, a and e. The scanner drops a generic key that contains one of its stopwords, and the ones hex digits can spell (dead, feed, 000000, aaaaaa) each need one of those three; plain random hex spelled one in about 1 key in 500.
const PLANTED_DIGITS = '123456789bcdf';

function planted(): string {
  return ['sk', 'proj', Array.from(randomBytes(72), (byte) => PLANTED_DIGITS[byte % PLANTED_DIGITS.length]).join('')].join('-');
}

// A repository whose first commits stand for the previous product: a key added and deleted there, and one in a commit message.
function inherited(): { cwd: string; boundary: string } {
  const cwd = repository();
  tracked(cwd, 'old.ts', `const api_key = '${planted()}';\n`);
  git(cwd, 'commit', '-m', `Previous product, api_key = '${planted()}'`);
  git(cwd, 'rm', 'old.ts');
  git(cwd, 'commit', '-m', 'Previous product ends');
  const boundary = git(cwd, 'rev-parse', 'HEAD');
  tracked(cwd, 'new.ts', 'export const next = 1;\n');
  git(cwd, 'commit', '-m', 'This product starts');
  return { cwd, boundary };
}

function shallowClone(source: string, depth: number): string {
  const clone = mkdtempSync(join(tmpdir(), 'secret-shallow-'));
  temporary.push(clone);
  git(source, 'clone', `--depth=${depth}`, `file://${source}`, clone);
  return clone;
}

beforeAll(async () => {
  scannerDirectory = mkdtempSync(join(tmpdir(), 'secret-scanner-test-'));
  binary = await installScanner(scannerDirectory);
}, SCANNER_TIMEOUT);

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

afterAll(() => {
  if (scannerDirectory) rmSync(scannerDirectory, { recursive: true, force: true });
});

describe('secret scan guard', () => {
  it('rejects a planted synthetic key without printing it', () => {
    const cwd = repository();
    const key = planted();
    tracked(cwd, 'credentials.ts', `const api_key = '${key}';\n`);
    const findings = scanSecrets(binary, cwd);
    expect(findings.length > 0).toBe(true);
    expect(findings.some((finding) => finding.file.endsWith('credentials.ts'))).toBe(true);
    expect(JSON.stringify(findings).includes(key)).toBe(false);
    const cli = spawnSync(process.execPath, [fileURLToPath(new URL('./secrets.ts', import.meta.url))], {
      cwd, encoding: 'utf8', timeout: CLI_TIMEOUT,
    });
    expect(cli.status).toBe(1);
    expect((cli.stdout + cli.stderr).includes(key)).toBe(false);
  }, SCANNER_TIMEOUT);

  it('plants keys that no scanner stopword hides', () => {
    const cwd = repository();
    const keys = Array.from({ length: 2000 }, planted);
    tracked(cwd, 'credentials.ts', keys.map((key) => `const api_key = '${key}';\n`).join(''));
    const found = new Set(scanSecrets(binary, cwd).map((finding) => finding.line));
    expect(keys.filter((_, index) => !found.has(index + 1)).length).toBe(0);
  }, SCANNER_TIMEOUT);

  it('allows only the classified fixture values', () => {
    const cwd = repository();
    tracked(cwd, 'apps/studio/src/main/artifacts/privacy.test.ts', `const api_key = '${['sk', '123456789012345678901234'].join('-')}';\n`);
    tracked(cwd, 'apps/studio/src/main/artifacts/access.test.ts', `const secret = '${['ghp', '12345678901234567890'].join('_')}';\n`);
    const modifier = ['Shift', 'CmdOrCtrl'].join('+');
    tracked(cwd, 'packages/events/src/menu-accelerators.ts', `const report = { key: '${modifier}+/' };\nconst redo = { key: '${modifier}+Z' };\n`);
    tracked(cwd, 'apps/studio/src/main/starter/runner.pty.ts', 'const handshake = "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\n";\n');
    tracked(cwd, 'apps/studio/src/main/telemetry/index.ts', `const PROD_POSTHOG_KEY = '${'phc_' + randomBytes(22).toString('hex')}';\n`);
    git(cwd, 'commit', '-m', 'Classified fixtures');
    expect(scanSecrets(binary, cwd)).toEqual([]);
    tracked(cwd, 'apps/studio/src/main/artifacts/privacy.test.ts', `const api_key = '${planted()}';\n`);
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('does not allow a fixture value in an unrelated path', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${['sk', '123456789012345678901234'].join('-')}';\n`);
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('detects a key deleted from Git history', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Plant synthetic key');
    git(cwd, 'rm', 'credentials.ts');
    git(cwd, 'commit', '-m', 'Delete synthetic key');
    const findings = scanSecrets(binary, cwd);
    expect(findings.some((finding) => finding.file === 'credentials.ts' && finding.commit.length === 40)).toBe(true);
  }, SCANNER_TIMEOUT);

  it('detects a key introduced only in a merge commit', () => {
    const cwd = repository();
    git(cwd, 'checkout', '-b', 'side');
    tracked(cwd, 'side.txt', 'side\n');
    git(cwd, 'commit', '-m', 'Side branch');
    git(cwd, 'checkout', 'main');
    tracked(cwd, 'main.txt', 'main\n');
    git(cwd, 'commit', '-m', 'Main branch');
    git(cwd, 'merge', '--no-commit', '--no-ff', 'side');
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Merge fixture');
    git(cwd, 'rm', 'credentials.ts');
    git(cwd, 'commit', '-m', 'Delete merge fixture key');
    expect(scanSecrets(binary, cwd).some((finding) => finding.file === 'credentials.ts')).toBe(true);
  }, SCANNER_TIMEOUT);

  it('detects keys in commit messages and annotated tags', () => {
    const cwd = repository();
    git(cwd, 'commit', '--allow-empty', '-m', `api_key = '${planted()}'`);
    git(cwd, 'tag', '-a', 'fixture-tag', '-m', `api_key = '${planted()}'`);
    const findings = scanSecrets(binary, cwd);
    expect(findings.some((finding) => finding.file === 'commits.txt')).toBe(true);
    expect(findings.some((finding) => finding.file === 'tags.txt')).toBe(true);
  }, SCANNER_TIMEOUT);

  it('ignores inline suppressions', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}'; // gitleaks:allow\n`);
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('ignores repository scanner overrides', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    tracked(cwd, '.gitleaks.toml', '[allowlist]\nregexes = [".*"]\n');
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('ignores repository fingerprint suppressions', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    tracked(cwd, '.gitleaksignore', 'credentials.ts:generic-api-key:1\n');
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('ignores repository fingerprint suppressions for deleted keys', () => {
    const cwd = repository();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Add a synthetic credential');
    const commit = git(cwd, 'rev-parse', 'HEAD');
    git(cwd, 'rm', 'credentials.ts');
    git(cwd, 'commit', '-m', 'Remove the synthetic credential');
    tracked(cwd, '.gitleaksignore', `${commit}:credentials.ts:generic-api-key:1\n`);
    expect(scanSecrets(binary, cwd).length > 0).toBe(true);
  }, SCANNER_TIMEOUT);

  it('does not scan ignored audit files', () => {
    const cwd = repository();
    tracked(cwd, '.gitignore', '.scratch/\n');
    mkdirSync(join(cwd, '.scratch'));
    writeFileSync(join(cwd, '.scratch/private.txt'), `const api_key = '${planted()}';\n`);
    expect(scanSecrets(binary, cwd)).toEqual([]);
  }, SCANNER_TIMEOUT);

  it.skipIf(process.platform === 'win32')('reads tracked symlink text without following it', () => {
    const cwd = repository();
    tracked(cwd, '.gitignore', '.scratch/\n');
    mkdirSync(join(cwd, '.scratch'));
    writeFileSync(join(cwd, '.scratch/private.txt'), `const api_key = '${planted()}';\n`);
    symlinkSync('.scratch/private.txt', join(cwd, 'link'));
    symlinkSync('missing-file', join(cwd, 'dangling'));
    git(cwd, 'add', 'link', 'dangling');
    expect(scanSecrets(binary, cwd)).toEqual([]);
  }, SCANNER_TIMEOUT);

  it('rejects an unavailable scanner instead of passing', () => {
    expect(() => scanSecrets(join(tmpdir(), 'nonexistent-secret-scanner'), repository())).toThrow('could not finish');
  }, SCANNER_TIMEOUT);

  it('rejects a shallow history instead of claiming complete coverage', () => {
    const source = repository();
    const clone = mkdtempSync(join(tmpdir(), 'secret-shallow-'));
    temporary.push(clone);
    git(source, 'clone', '--depth=1', `file://${source}`, clone);
    expect(() => scanSecrets(binary, clone)).toThrow('complete Git history');
  }, SCANNER_TIMEOUT);

  it('pins the boundary as a full commit SHA and refuses anything else', () => {
    expect(PREVIOUS_PRODUCT_LAST_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    const cwd = repository();
    expect(() => historyScope(cwd, 'v1-final')).toThrow('full commit SHA');
    expect(() => historyScope(cwd, git(cwd, 'rev-parse', 'HEAD').slice(0, 12))).toThrow('full commit SHA');
  });

  it('passes inherited history before the boundary and scans every commit after it', () => {
    const { cwd, boundary } = inherited();
    const scope = historyScope(cwd, boundary);
    expect(scope).toEqual({ revisions: [`${boundary}..${git(cwd, 'rev-parse', 'HEAD')}`], commits: 1, after: boundary });
    expect(scanSecrets(binary, cwd, scope)).toEqual([]);
  }, SCANNER_TIMEOUT);

  it('passes inherited side branches that the boundary does not contain', () => {
    const { cwd, boundary } = inherited();
    git(cwd, 'checkout', '-b', 'old-side', `${boundary}~1`);
    tracked(cwd, 'side.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Previous product side branch');
    git(cwd, 'checkout', 'main');
    expect(scanSecrets(binary, cwd, historyScope(cwd, boundary))).toEqual([]);
    expect(scanSecrets(binary, cwd).some((finding) => finding.file === 'side.ts')).toBe(true);
  }, SCANNER_TIMEOUT);

  it('rejects a key committed after the boundary, even when deleted again', () => {
    const { cwd, boundary } = inherited();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Plant synthetic key');
    git(cwd, 'rm', 'credentials.ts');
    git(cwd, 'commit', '-m', 'Delete synthetic key');
    const findings = scanSecrets(binary, cwd, historyScope(cwd, boundary));
    expect(findings.some((finding) => finding.file === 'credentials.ts' && finding.commit.length === 40)).toBe(true);
    expect(findings.some((finding) => finding.file === 'old.ts')).toBe(false);
  }, SCANNER_TIMEOUT);

  it('rejects a key in a commit message after the boundary', () => {
    const { cwd, boundary } = inherited();
    git(cwd, 'commit', '--allow-empty', '-m', `api_key = '${planted()}'`);
    const findings = scanSecrets(binary, cwd, historyScope(cwd, boundary));
    expect(findings.map((finding) => finding.file)).toEqual(['commits.txt']);
  }, SCANNER_TIMEOUT);

  it('rejects inherited history that a later commit merges in', () => {
    const { cwd, boundary } = inherited();
    git(cwd, 'checkout', '-b', 'old-side', `${boundary}~1`);
    tracked(cwd, 'side.ts', `const api_key = '${planted()}';\n`);
    git(cwd, 'commit', '-m', 'Previous product side branch');
    git(cwd, 'rm', 'side.ts');
    git(cwd, 'commit', '-m', 'Delete side key');
    git(cwd, 'checkout', 'main');
    git(cwd, 'merge', '--no-ff', '-m', 'Merge the side branch', 'old-side');
    expect(scanSecrets(binary, cwd, historyScope(cwd, boundary)).some((finding) => finding.file === 'side.ts')).toBe(true);
  }, SCANNER_TIMEOUT);

  it('rejects a key in the working tree whatever the boundary', () => {
    const { cwd, boundary } = inherited();
    tracked(cwd, 'credentials.ts', `const api_key = '${planted()}';\n`);
    const findings = scanSecrets(binary, cwd, historyScope(cwd, boundary));
    expect(findings.some((finding) => finding.file.endsWith('credentials.ts') && !finding.commit)).toBe(true);
  }, SCANNER_TIMEOUT);

  it('scans all history when the boundary is not in the repository', () => {
    const { cwd } = inherited();
    const other = repository();
    git(other, 'commit', '--allow-empty', '-m', 'A commit only another repository has');
    const absent = git(other, 'rev-parse', 'HEAD');
    expect(() => git(cwd, 'cat-file', '-e', absent)).toThrow();
    for (const scope of [historyScope(cwd), historyScope(cwd, absent)]) {
      expect(scope).toEqual({ revisions: ['--all'], commits: 4, after: null });
      const files = scanSecrets(binary, cwd, scope).map((finding) => finding.file);
      expect(files.includes('old.ts') && files.includes('commits.txt')).toBe(true);
    }
  }, SCANNER_TIMEOUT);

  it('scans all history when the boundary is present but not an ancestor', () => {
    const { cwd } = inherited();
    git(cwd, 'checkout', '-b', 'elsewhere', 'HEAD~1');
    git(cwd, 'commit', '--allow-empty', '-m', 'Not an ancestor of main');
    const boundary = git(cwd, 'rev-parse', 'HEAD');
    git(cwd, 'checkout', 'main');
    const scope = historyScope(cwd, boundary);
    expect(scope).toEqual({ revisions: ['--all'], commits: 5, after: null });
    expect(scanSecrets(binary, cwd, scope).some((finding) => finding.file === 'old.ts')).toBe(true);
  }, SCANNER_TIMEOUT);

  it('accepts a shallow clone that holds every commit after the boundary', () => {
    const { cwd, boundary } = inherited();
    const clone = shallowClone(cwd, 2);
    expect(git(clone, 'rev-parse', '--is-shallow-repository')).toBe('true');
    const scope = historyScope(clone, boundary);
    expect(scope.commits).toBe(1);
    expect(scanSecrets(binary, clone, scope)).toEqual([]);
  }, SCANNER_TIMEOUT);

  it('rejects a shallow clone that lacks the boundary or cuts the history after it', () => {
    const { cwd, boundary } = inherited();
    expect(() => historyScope(shallowClone(cwd, 1), boundary)).toThrow('complete Git history');
    git(cwd, 'checkout', '-b', 'side', `${boundary}~2`);
    for (const name of ['one', 'two', 'three']) {
      tracked(cwd, `${name}.txt`, `${name}\n`);
      git(cwd, 'commit', '-m', `Side ${name}`);
    }
    git(cwd, 'checkout', '--detach', boundary);
    git(cwd, 'merge', '--no-ff', '-m', 'Merge side', 'side');
    git(cwd, 'branch', '-f', 'main', 'HEAD');
    git(cwd, 'checkout', 'main');
    const clone = shallowClone(cwd, 2);
    expect(git(clone, 'cat-file', '-t', boundary)).toBe('commit');
    expect(() => historyScope(clone, boundary)).toThrow('complete Git history');
    expect(() => scanSecrets(binary, clone)).toThrow('complete Git history');
  }, SCANNER_TIMEOUT);

  it('rejects a changed scanner archive before extraction', () => {
    const bytes = new TextEncoder().encode('scanner archive fixture');
    expect(() => verifyArchive(bytes, createHash('sha256').update(bytes).digest('hex'))).not.toThrow();
    expect(() => verifyArchive(bytes, '0'.repeat(64))).toThrow('checksum');
  });

  it('runs the same pinned guard in local verification and complete-history CI', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const workflow = Bun.YAML.parse(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')) as {
      jobs: { verify: { steps: { uses?: string; with?: Record<string, unknown>; run?: string }[] } };
    };
    const steps = workflow.jobs.verify.steps;
    expect(manifest.scripts['check:secrets']).toBe('bun scripts/secrets.ts');
    expect(manifest.scripts.verify.includes('bun run check:secrets')).toBe(true);
    expect(steps.find((step) => step.uses?.startsWith('actions/checkout@'))?.with?.['fetch-depth']).toBe(0);
    expect(steps.some((step) => step.run === 'bun run check:secrets')).toBe(true);
  });
});
