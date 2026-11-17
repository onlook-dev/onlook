import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import manifest from '../package.json';

const ROOTS = ['apps', 'packages', 'scripts', 'tests/apparatus', 'tests/e2e'];
const TEST_FILE = new Bun.Glob('**/*{.test,_test,.spec,_spec}.{ts,tsx,js,jsx,mjs,cjs,mts,cts}');
const VALUED_FLAGS = new Set(['-t', '--test-name-pattern', '--timeout', '--rerun-each', '--seed']);
const SLOW_FILE_SECONDS = 1;

export interface UnitTierOptions {
  cwd: string;
  roots?: string[];
  args?: string[];
  write?: (text: string) => void;
  slowFileSeconds?: number;
  runtimeVersion?: string;
  /** Where to write one JUnit report merged from every file's run; `--junit <path>` sets it from the command line. */
  junitPath?: string;
}

interface FileResult {
  file: string;
  code: number;
  seconds: number;
  output: string;
  counts: Record<'pass' | 'fail' | 'skip' | 'todo', number>;
  /** The file's own JUnit `<testsuite>` elements, when a report was asked for. */
  suites?: string;
}

/** The `<testsuite>` elements of one Bun JUnit report, without its `<testsuites>` wrapper. */
function junitSuites(xml: string): string {
  const open = /<testsuites\b[^>]*>/.exec(xml);
  const close = xml.lastIndexOf('</testsuites>');
  return open && close > open.index ? xml.slice(open.index + open[0].length, close).trim() : '';
}

function isBunProcessFailure(result: FileResult): boolean {
  return result.code === 133 && result.counts.fail === 0;
}

export function parseArgs(args: string[]): { jobs: number | undefined; filters: string[]; forward: string[]; junit?: string } {
  let jobs: number | undefined;
  let junit: string | undefined;
  const filters: string[] = [];
  const forward: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--jobs' || arg.startsWith('--jobs=')) {
      const value = arg === '--jobs' ? args[++i] : arg.slice('--jobs='.length);
      jobs = Number(value);
      if (!Number.isInteger(jobs) || jobs < 1) throw new Error(`--jobs takes a whole number above zero, got ${value}`);
    } else if (arg === '--junit' || arg.startsWith('--junit=')) {
      junit = arg === '--junit' ? args[++i] : arg.slice('--junit='.length);
      if (!junit) throw new Error('--junit takes the path to write the JUnit report to');
    } else if (VALUED_FLAGS.has(arg)) {
      forward.push(arg, args[++i] ?? '');
    } else if (arg.startsWith('-')) {
      forward.push(arg);
    } else {
      filters.push(arg);
    }
  }
  return { jobs, filters, forward, ...(junit ? { junit } : {}) };
}

export function defaultJobs(cores = availableParallelism()): number {
  return Math.max(1, Math.min(cores, 4));
}

export function collectTestFiles(cwd: string, roots: string[], filters: string[] = []): string[] {
  const files: string[] = [];
  for (const root of roots) {
    let entries: Iterable<string>;
    try {
      entries = TEST_FILE.scanSync({ cwd: join(cwd, root), onlyFiles: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.split('/').includes('node_modules')) continue;
      const file = root === '.' ? entry : `${root}/${entry}`;
      if (filters.length === 0 || filters.some((filter) => file.includes(filter))) files.push(file);
    }
  }
  const size = new Map(files.map((file) => [file, statSync(join(cwd, file)).size]));
  return files.sort((a, b) => size.get(b)! - size.get(a)! || a.localeCompare(b));
}

function countsOf(output: string): FileResult['counts'] {
  const count = (word: string): number => Number(new RegExp(`^\\s*(\\d+) ${word}$`, 'm').exec(output)?.[1] ?? 0);
  return { pass: count('pass'), fail: count('fail') || failingTests(output).length, skip: count('skip'), todo: count('todo') };
}

function failingTests(output: string): string[] {
  const lines = output.split('\n');
  return lines.flatMap((line, i) => {
    if (!line.startsWith('(fail) ')) return [];
    const name = line.replace(/ \[[\d.]+m?s\]$/, '');
    const harnessReason = /^\s+\^ (.+?)\.?$/.exec(lines[i + 1] ?? '')?.[1];
    return [harnessReason === undefined ? name : `${name} — ${harnessReason}`];
  });
}

function costLines(results: FileResult[], listAll: boolean, slowSeconds: number): string {
  const slowestFirst = [...results].sort((a, b) => b.seconds - a.seconds);
  const shown = listAll ? slowestFirst : slowestFirst.filter((r) => r.seconds >= slowSeconds);
  const lines = shown.map((r) => `  ${r.seconds.toFixed(2)}s ${r.seconds >= slowSeconds ? 'SLOW' : '    '} ${r.file}\n`);
  const hidden = slowestFirst.length - shown.length;
  if (hidden > 0) lines.push(`  ${hidden} more under ${slowSeconds}s; a path filter lists every file it matches\n`);
  return `\ncost per file, slowest first (SLOW: ${slowSeconds}s or more, which a second agent agrees to):\n${lines.join('')}`;
}

export async function runUnitTier(options: UnitTierOptions): Promise<number> {
  const write = options.write ?? ((text: string) => process.stdout.write(text));
  const pinnedVersion = manifest.packageManager.replace('bun@', '');
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const installHint = `Install the pinned version: curl -fsSL https://bun.sh/install | bash -s "bun-v${pinnedVersion}"\n`;
  if (runtimeVersion !== pinnedVersion) {
    write(`Bun version mismatch: running ${runtimeVersion}, repository pin ${pinnedVersion}. Tests will still run.\n`);
    write(installHint);
    write('Run this from the repository root, then retry bun run verify.\n');
  }
  const { jobs = defaultJobs(), filters, forward, junit } = parseArgs(options.args ?? []);
  const junitPath = options.junitPath ?? junit;
  const files = collectTestFiles(options.cwd, options.roots ?? ROOTS, filters);
  if (files.length === 0) {
    write('No test files matched.\n');
    return 0;
  }

  // Covers a killed child, whose preload never removes its own root.
  const runRoot = mkdtempSync(join(tmpdir(), 'studio-unit-run-'));
  const live = new Set<Bun.Subprocess>();
  const stop = (signal: NodeJS.Signals): void => {
    for (const child of live) child.kill(signal);
    rmSync(runRoot, { recursive: true, force: true });
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const started = performance.now();
  const results: FileResult[] = [];
  const queue = [...files];

  const runFile = async (file: string, index: number): Promise<FileResult> => {
    const logPath = join(runRoot, `${index}.log`);
    const fd = openSync(logPath, 'w');
    const fileStarted = performance.now();
    const reportPath = join(runRoot, `${index}.xml`);
    const report = junitPath ? ['--reporter=junit', `--reporter-outfile=${reportPath}`] : [];
    const child = Bun.spawn([process.execPath, 'test', `./${file}`, '--pass-with-no-tests', ...report, ...forward], {
      cwd: options.cwd,
      env: { ...process.env, TMPDIR: runRoot },
      stdin: 'ignore',
      stdout: fd,
      stderr: fd,
    });
    live.add(child);
    const code = await child.exited;
    live.delete(child);
    closeSync(fd);
    const output = readFileSync(logPath, 'utf8');
    const suites = junitPath && existsSync(reportPath) ? junitSuites(readFileSync(reportPath, 'utf8')) : undefined;
    return { file, code, seconds: (performance.now() - fileStarted) / 1000, output, counts: countsOf(output), ...(suites === undefined ? {} : { suites }) };
  };

  const worker = async (): Promise<void> => {
    for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
      const result = await runFile(file, files.length - queue.length);
      results.push(result);
      if (result.code !== 0) write(`\n✗ ${file} (${isBunProcessFailure(result) ? 'Bun process failure, ' : ''}exit ${result.code})\n${result.output.trimEnd()}\n`);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker));
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    rmSync(runRoot, { recursive: true, force: true });
  }

  if (junitPath) {
    // One report for the whole tier, in file order; a file whose run wrote none contributes nothing, and its exit code still fails the tier.
    const suites = [...results].sort((a, b) => a.file.localeCompare(b.file)).map((result) => result.suites ?? '').filter(Boolean);
    mkdirSync(dirname(junitPath), { recursive: true });
    writeFileSync(junitPath, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="studio unit tier">\n${suites.join('\n')}\n</testsuites>\n`);
  }

  const total = { pass: 0, fail: 0, skip: 0, todo: 0 };
  for (const { counts } of results) for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += counts[key];
  const failed = results.filter((result) => result.code !== 0);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const extras = (['skip', 'todo'] as const).filter((key) => total[key] > 0).map((key) => `, ${total[key]} ${key}`).join('');

  write(costLines(results, filters.length > 0, options.slowFileSeconds ?? SLOW_FILE_SECONDS));
  write(`\n${total.pass} pass, ${total.fail} fail${extras} across ${files.length} files in ${seconds}s (${jobs} jobs)\n`);
  if (failed.length === 0) return 0;

  const crashes = failed.filter(isBunProcessFailure);
  if (crashes.length > 0) {
    write(`\n${crashes.length} Bun process failure(s), exit 133 / SIGTRAP, with no failing assertions:\n`);
    for (const { file } of crashes) write(`  ${file}\n`);
    write(`Runtime: Bun ${runtimeVersion}, ${process.platform} ${process.arch}; repository pin: ${pinnedVersion}.\n`);
    write(installHint);
    write('If the pinned version also crashes, share the crash banner and bun.report link.\n');
  }
  const testFailures = failed.filter(result => !isBunProcessFailure(result));
  if (testFailures.length > 0) write(`\n${testFailures.length} file${testFailures.length === 1 ? '' : 's'} failed:\n`);
  for (const { file, output, code } of testFailures) {
    const tests = failingTests(output);
    write(`  ${file}${tests.length === 0 ? ` (exit ${code}, no failing test named: an error outside a test)` : ''}\n`);
    for (const test of tests) write(`    ${test}\n`);
  }
  write(`Rerun one alone: bun test ./${failed[0]!.file}\n`);
  return 1;
}

if (import.meta.main) {
  process.exit(await runUnitTier({ cwd: process.cwd(), args: process.argv.slice(2) }));
}
