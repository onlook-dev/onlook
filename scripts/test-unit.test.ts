import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { collectTestFiles, runUnitTier } from './test-unit.js';
import manifest from '../package.json';

afterAll(() => {
  cleanupTempFixtures();
});

const PASSING = "import { expect, it } from 'bun:test';\nit('holds', () => { expect(1).toBe(1); });\n";
const FAILING = "import { expect, it } from 'bun:test';\nit('the broken case', () => { expect(1).toBe(2); });\n";

describe('the unit tier', () => {
  it.each(['1.3.7', '1.3.11', '99.0.0'])('warns about Bun %s before running tests and names the exact install command', async (runtimeVersion) => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING } });
    let output = '';
    const code = await runUnitTier({ cwd: dir, roots: ['src'], runtimeVersion, write: (text) => (output += text) });

    const pinned = manifest.packageManager.replace('bun@', '');
    expect(code).toBe(0);
    expect(output).toStartWith(`Bun version mismatch: running ${runtimeVersion}, repository pin ${pinned}. Tests will still run.`);
    expect(output).toContain(`curl -fsSL https://bun.sh/install | bash -s "bun-v${pinned}"`);
    expect(output).toContain('Run this from the repository root');
    expect(output).not.toContain('No test files matched');
    expect(output).not.toContain('files failed');
    expect(output).toContain('1 pass, 0 fail across 1 files');
  });

  it('does not warn when Bun matches the packageManager pin', async () => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING } });
    let output = '';
    expect(await runUnitTier({ cwd: dir, roots: ['src'], runtimeVersion: manifest.packageManager.replace('bun@', ''), write: text => (output += text) })).toBe(0);
    expect(output).not.toContain('Bun version mismatch');
  });

  it('separates a Bun teardown exit 133 from assertion failures without hiding either output', async () => {
    const crashing = `${PASSING}\nimport { afterAll } from 'bun:test';\nafterAll(() => { process.exitCode = 133; });\n`;
    const dir = makeDirWithFiles({ files: { 'src/crashed.test.ts': crashing, 'src/broken.test.ts': FAILING } });
    let output = '';
    expect(await runUnitTier({ cwd: dir, roots: ['src'], runtimeVersion: '1.3.7', write: text => (output += text) })).toBe(1);
    expect(output).toContain('1 Bun process failure(s), exit 133 / SIGTRAP, with no failing assertions:');
    expect(output).toContain('Runtime: Bun 1.3.7');
    expect(output).toContain('bun.report link');
    const summary = output.slice(output.indexOf('1 file failed:'));
    expect(summary).toContain('src/broken.test.ts\n    (fail) the broken case');
    expect(summary).not.toContain('  src/crashed.test.ts\n');
  });

  it('keeps the named assertion failure when the same child exits 133 before printing its summary', async () => {
    const abruptFailure = `${FAILING}\nimport { afterAll } from 'bun:test';\nafterAll(() => { process.exit(133); });\n`;
    const dir = makeDirWithFiles({ files: { 'src/failed-then-crashed.test.ts': abruptFailure } });
    let output = '';
    expect(await runUnitTier({ cwd: dir, roots: ['src'], write: text => (output += text) })).toBe(1);
    expect(output).not.toContain('with no failing assertions');
    expect(output).not.toContain('Bun process failure, exit 133');
    expect(output).toContain('0 pass, 1 fail across 1 files');
    const summary = output.slice(output.indexOf('1 file failed:'));
    expect(summary).toContain('src/failed-then-crashed.test.ts\n    (fail) the broken case');
  });

  it('collects every test file under its roots, and none inside node_modules', () => {
    const dir = makeDirWithFiles({
      files: {
        'src/a.test.ts': PASSING,
        'src/deep/b.test.tsx': PASSING,
        'src/helper.ts': 'export {};\n',
        'src/node_modules/dep/c.test.ts': FAILING,
      },
    });
    expect(collectTestFiles(dir, ['src']).sort()).toEqual(['src/a.test.ts', 'src/deep/b.test.tsx']);
  });

  it('fails when any file fails, naming the file and the test', async () => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING, 'src/broken.test.ts': FAILING } });
    let output = '';
    const code = await runUnitTier({ cwd: dir, roots: ['src'], args: ['--jobs', '2'], write: (text) => (output += text) });

    expect(code).toBe(1);
    expect(output).toContain('1 pass, 1 fail across 2 files');
    expect(output).toContain('  src/broken.test.ts\n    (fail) the broken case');
  });

  it('prints each file’s cost and marks the slow ones, listing every file only on a filtered run', async () => {
    const dir = makeDirWithFiles({ files: { 'src/a.test.ts': PASSING, 'src/b.test.ts': PASSING } });
    let filtered = '';
    await runUnitTier({ cwd: dir, roots: ['src'], args: ['src/'], slowFileSeconds: 0, write: (text) => (filtered += text) });
    let whole = '';
    await runUnitTier({ cwd: dir, roots: ['src'], slowFileSeconds: Infinity, write: (text) => (whole += text) });

    expect(filtered).toMatch(/^ {2}\d+\.\d{2}s SLOW src\/a\.test\.ts$/m);
    expect(filtered).toMatch(/^ {2}\d+\.\d{2}s SLOW src\/b\.test\.ts$/m);
    expect(whole).not.toContain('src/a.test.ts');
    expect(whole).toContain('  2 more under ');
  });

  it('names a test the harness stopped as timed out, and an assertion failure without that note', async () => {
    const STUCK = "import { it } from 'bun:test';\nit('the stuck case', () => new Promise(() => {}), 50);\n";
    const dir = makeDirWithFiles({ files: { 'src/stuck.test.ts': STUCK, 'src/broken.test.ts': FAILING } });
    let output = '';
    await runUnitTier({ cwd: dir, roots: ['src'], args: ['--jobs', '2'], write: (text) => (output += text) });

    const summary = output.slice(output.indexOf('files failed:'));
    expect(summary).toContain('    (fail) the stuck case — this test timed out after 50ms\n');
    expect(summary).toContain('    (fail) the broken case\n');
  });
});

describe("the unit tier's JUnit report (--junit)", () => {
  it('merges every file\'s results into one report, failures included', async () => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING, 'src/broken.test.ts': FAILING } });
    const junitPath = `${dir}/out/junit.xml`;
    expect(await runUnitTier({ cwd: dir, roots: ['src'], junitPath, write: () => {} })).toBe(1);
    const xml = readFileSync(junitPath, 'utf8');
    expect(xml.match(/<testsuites\b/g)).toHaveLength(1);
    expect(xml).toContain('name="holds"');
    expect(xml).toContain('name="the broken case"');
    expect(xml).toMatch(/<failure\b/);
  });

  it('--junit on the command line asks for the report', async () => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING } });
    const junitPath = `${dir}/flag/junit.xml`;
    expect(await runUnitTier({ cwd: dir, roots: ['src'], args: ['--junit', junitPath], write: () => {} })).toBe(0);
    expect(readFileSync(junitPath, 'utf8')).toContain('name="holds"');
  });

  it('writes no report unless asked', async () => {
    const dir = makeDirWithFiles({ files: { 'src/fine.test.ts': PASSING } });
    expect(await runUnitTier({ cwd: dir, roots: ['src'], write: () => {} })).toBe(0);
    expect(existsSync(`${dir}/out/junit.xml`)).toBe(false);
  });
});
