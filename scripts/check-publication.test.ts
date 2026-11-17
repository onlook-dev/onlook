import { afterEach, describe, expect, it } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { checkPublication, VENDOR_ALLOWANCE, VENDOR_NAMES } from './check-publication.js';

const roots: string[] = [];
const personalPath = '/' + 'Users/casey/private-project';
const privateLink = 'https://workspace.' + ['slack', 'com'].join('.') + '/archives/EXAMPLE';
const figmaHost = ['mcp', 'figma', 'com'].join('.');
const fixtureFile = 'apps/studio/src/main/artifacts/privacy.test.ts';

function fixture(file = 'notes.md', source: string | Buffer = '') {
  const root = mkdtempSync(join(tmpdir(), 'publication-'));
  roots.push(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source);
  execFileSync('git', ['add', '--', file], { cwd: root });
  return { root, path };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('publication guard', () => {
  it.each([
    ['mac', personalPath],
    ['linux', '/' + 'home/casey/private-project'],
    ['windows', 'C:' + '\\Users\\casey\\private-project'],
    ['json-windows', JSON.stringify('C:' + '\\Users\\casey\\private-project')],
    ['percent-encoded', encodeURIComponent(personalPath)],
    ['json-slashes', personalPath.replaceAll('/', '\\/')],
    ['unicode-json', personalPath.replaceAll('/', '\\u002f')],
  ])('rejects personal %s paths', (_name, source) => {
    const { root } = fixture('notes.md', source);
    expect(checkPublication({ root }).violations).toEqual([expect.objectContaining({ kind: 'personal-path', file: 'notes.md' })]);
  });

  it.each([['workspace', 'slack', 'com'], ['linear', 'app'], ['workspace', 'notion', 'site'], ['notion', 'so'], ['grain', 'com'], ['grain', 'video'], ['www', 'figma', 'com']].map((parts) => parts.join('.')))('rejects private links on %s', (host) => {
    const { root } = fixture('.claude/example.md', `https://${host}/private-document`);
    expect(checkPublication({ root }).violations).toEqual([expect.objectContaining({ kind: 'internal-link' })]);
  });

  it('scans tracked edits, hidden files and arbitrary extensions but not untracked files', () => {
    const { root, path } = fixture('.github/context.data', 'public');
    writeFileSync(path, privateLink);
    writeFileSync(join(root, 'untracked.md'), personalPath);
    expect(checkPublication({ root })).toMatchObject({ scanned: 1, violations: [{ kind: 'internal-link', file: '.github/context.data', line: 1 }] });
  });

  it.each([
    ['utf8', 3], ['utf8', 4], ['utf16le', 3], ['utf16le', 4], ['utf16be', 3], ['utf16be', 4],
  ] as const)('scans %s asset metadata at offset %i', (encoding, offset) => {
    const bytes = Buffer.from(personalPath, encoding === 'utf16be' ? 'utf16le' : encoding);
    if (encoding === 'utf16be') bytes.swap16();
    const { root } = fixture('assets/example.bin', Buffer.concat([Buffer.alloc(offset, 1), bytes]));
    expect(checkPublication({ root }).violations.some((item) => item.kind === 'personal-path')).toBe(true);
  });

  it('allows only reviewed fictional identities at their reviewed fixture path', () => {
    const { root, path } = fixture(fixtureFile, '/' + 'Users/designer/project');
    expect(checkPublication({ root }).violations).toEqual([]);
    writeFileSync(path, personalPath);
    expect(checkPublication({ root }).violations).toHaveLength(1);
    const recording = fixture('tests/apparatus/src/recording-scrub.test.ts', '/' + 'Users/avery/project');
    expect(checkPublication({ root: recording.root }).violations).toEqual([]);
    writeFileSync(recording.path, '/' + 'Users/avery-real/project');
    expect(checkPublication({ root: recording.root }).violations).toHaveLength(1);
    const sibling = fixture('tests/apparatus/src/other.test.ts', '/' + 'Users/avery/project');
    expect(checkPublication({ root: sibling.root }).violations).toHaveLength(1);
  });

  it('does not extend a fixture allowance to a sibling file or path prefix', () => {
    for (const file of [fixtureFile.replace('privacy.test', 'other.test'), fixtureFile + '.md']) {
      const { root } = fixture(file, '/' + 'Users/designer/project');
      expect(checkPublication({ root }).violations).toHaveLength(1);
    }
    const { root } = fixture(fixtureFile, '/' + 'Users/designer-real/project');
    expect(checkPublication({ root }).violations).toHaveLength(1);
  });

  it('keeps literal placeholders and public Figma connector endpoints', () => {
    const { root } = fixture('public.md', ['/' + 'Users/<name>/project', `https://${figmaHost}/mcp`, `https://${figmaHost}`].join('\n'));
    expect(checkPublication({ root }).violations).toEqual([]);
  });

  it('does not allow private Figma documents through the public connector exception', () => {
    const { root } = fixture('public.md', `https://${figmaHost}/design/private-document`);
    expect(checkPublication({ root }).violations).toHaveLength(1);
  });

  it('distinguishes host-name lookalikes from internal subdomains', () => {
    const { root, path } = fixture('public.md', 'https://' + ['notfigma', 'com'].join('.') + '/public');
    expect(checkPublication({ root }).violations).toEqual([]);
    writeFileSync(path, 'https://' + ['workspace', 'figma', 'com'].join('.') + '/private');
    expect(checkPublication({ root }).violations).toHaveLength(1);
  });

  it('scans symlink targets without reading files outside the tracked tree', () => {
    const { root, path } = fixture();
    unlinkSync(path);
    symlinkSync(personalPath, path);
    expect(checkPublication({ root }).violations).toEqual([expect.objectContaining({ kind: 'personal-path' })]);
  });

  it('fails closed on a missing tracked file and a non-repository root', () => {
    const { root, path } = fixture();
    unlinkSync(path);
    expect(checkPublication({ root }).violations).toEqual([expect.objectContaining({ kind: 'unreadable' })]);
    expect(() => checkPublication({ root: join(root, 'absent') })).toThrow();
  });

  it('the CLI rejects disclosures without printing their values', () => {
    const { root } = fixture('notes.md', `${personalPath}\n${privateLink}`);
    const result = spawnSync(process.execPath, [resolve('scripts/check-publication.ts')], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('notes.md');
    expect(output).toContain('personal-path');
    expect(output).not.toContain(personalPath);
    expect(output).not.toContain(privateLink);
  });

  it('the CLI distinguishes a checked tree from an unreadable repository', () => {
    const { root } = fixture('public.md', 'Fictional public example');
    const script = resolve('scripts/check-publication.ts');
    const checked = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    expect(checked.status).toBe(0);
    expect(checked.stdout).toContain('1 tracked file.');
    const absent = mkdtempSync(join(tmpdir(), 'publication-unreadable-'));
    roots.push(absent);
    const unreadable = spawnSync(process.execPath, [script], { cwd: absent, encoding: 'utf8' });
    expect(unreadable.status).toBe(1);
    expect(unreadable.stderr).toContain('could not read the tracked tree');
    expect(unreadable.stderr).not.toContain(absent);
    expect(unreadable.stderr).not.toContain('fatal:');
  });

  it.each([...VENDOR_NAMES])('rejects a new use of the vendor name %s in any letter case', (name) => {
    const { root } = fixture('docs/notes.md', `Sign-in goes through ${name}.\nThe ${name.toUpperCase()}_URL variable.`);
    expect(checkPublication({ root }).violations).toEqual([{ kind: 'vendor-name', file: 'docs/notes.md', line: 0, detail: `${name} 2, allowed 0` }]);
  });

  it('counts a vendor name in a tracked path', () => {
    const [name = ''] = VENDOR_NAMES;
    const file = `src/${name}-client.ts`;
    const { root } = fixture(file, 'export {};');
    expect(checkPublication({ root }).violations).toEqual([expect.objectContaining({ kind: 'vendor-name', file, detail: `${name} 1, allowed 0` })]);
  });

  it('allows exactly the listed uses, and the list only shrinks', () => {
    const [name = '', other = ''] = VENDOR_NAMES;
    const { root, path } = fixture('legacy.ts', `${name} ${name}`);
    const vendorAllowance = [`legacy.ts → ${name} 2`];
    expect(checkPublication({ root, vendorAllowance })).toMatchObject({ violations: [], vendorUses: vendorAllowance });
    writeFileSync(path, `${name} ${name} ${name}`);
    expect(checkPublication({ root, vendorAllowance }).violations).toEqual([expect.objectContaining({ kind: 'vendor-name', detail: `${name} 3, allowed 2` })]);
    writeFileSync(path, `${name} ${name} ${other}`);
    expect(checkPublication({ root, vendorAllowance }).violations).toEqual([expect.objectContaining({ kind: 'vendor-name', detail: `${other} 1, allowed 0` })]);
    writeFileSync(path, name);
    expect(checkPublication({ root, vendorAllowance }).violations).toEqual([expect.objectContaining({ kind: 'stale-allowance', file: 'legacy.ts', detail: `${name} 1, allowed 2` })]);
    writeFileSync(path, 'neutral');
    expect(checkPublication({ root, vendorAllowance }).violations).toEqual([expect.objectContaining({ kind: 'stale-allowance', detail: `${name} 0, allowed 2` })]);
  });

  it('does not extend a vendor allowance to another file', () => {
    const [name = ''] = VENDOR_NAMES;
    const { root } = fixture('other.ts', name);
    const kinds = checkPublication({ root, vendorAllowance: [`legacy.ts → ${name} 1`] }).violations.map((item) => `${item.file}: ${item.kind}`);
    expect(kinds).toEqual(['other.ts: vendor-name', 'legacy.ts: stale-allowance']);
  });

  it('reads the allowance from the tree and counts neither it nor the generated dependency records', () => {
    const [name = ''] = VENDOR_NAMES;
    const { root } = fixture('legacy.ts', name);
    for (const [file, source] of [[VENDOR_ALLOWANCE, `legacy.ts → ${name} 1\n`], ['bun.lock', name], ['NOTICE', name], ['compliance/dependencies.json', name]] as const) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), source);
      execFileSync('git', ['add', '--', file], { cwd: root });
    }
    expect(checkPublication({ root })).toMatchObject({ scanned: 5, violations: [], vendorUses: [`legacy.ts → ${name} 1`] });
  });

  it('fails closed on an allowance line it cannot read', () => {
    const { root } = fixture('public.md', 'neutral');
    expect(() => checkPublication({ root, vendorAllowance: ['legacy.ts'] })).toThrow();
    expect(() => checkPublication({ root, vendorAllowance: ['legacy.ts → name 0'] })).toThrow();
  });

  it('the CLI names a new vendor use, and pruning lowers the list without ever adding to it', () => {
    const [name = ''] = VENDOR_NAMES;
    const { root, path } = fixture('legacy.ts', `${name} ${name}`);
    const script = resolve('scripts/check-publication.ts');
    const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
    const unlisted = run('--prune-vendors');
    expect(unlisted.status).toBe(1);
    expect(unlisted.stderr).toContain(`"legacy.ts":0: vendor-name (${name} 2, allowed 0)`);
    expect(unlisted.stderr).toContain('only shrinks');
    expect(existsSync(join(root, VENDOR_ALLOWANCE))).toBe(false);
    mkdirSync(dirname(join(root, VENDOR_ALLOWANCE)), { recursive: true });
    writeFileSync(join(root, VENDOR_ALLOWANCE), `gone.ts → ${name} 4\nlegacy.ts → ${name} 2\n`);
    writeFileSync(path, name);
    const stale = run();
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('stale-allowance');
    expect(stale.stderr).toContain('--prune-vendors');
    expect(run('--prune-vendors').status).toBe(0);
    expect(readFileSync(join(root, VENDOR_ALLOWANCE), 'utf8')).toBe(`legacy.ts → ${name} 1\n`);
  });

  it('keeps the allowance sorted, positive and free of files that are gone', () => {
    const lines = readFileSync(new URL('../' + VENDOR_ALLOWANCE, import.meta.url), 'utf8').split('\n').filter(Boolean);
    expect(lines).toEqual([...lines].sort((a, b) => a.slice(0, a.lastIndexOf(' ')).localeCompare(b.slice(0, b.lastIndexOf(' ')))));
    const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: new URL('..', import.meta.url), maxBuffer: 32 * 1024 * 1024 }).toString().split('\0'));
    for (const line of lines) {
      expect(line).toMatch(new RegExp(`^.+ → (?:${VENDOR_NAMES.join('|')}) [1-9]\\d*$`));
      expect(tracked.has(line.slice(0, line.indexOf(' → ')))).toBe(true);
    }
  });

  it('runs the same publication command locally and in CI', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
    expect(manifest.scripts['verify']).toContain('bun run check:publication');
    expect(manifest.scripts['check:publication']).toBe('bun scripts/check-publication.ts');
    expect(workflow).toContain('run: bun run check:publication');
  });
});
