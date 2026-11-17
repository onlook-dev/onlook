import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { join } from 'node:path';

interface Step {
  name: string;
  command: string[];
}

interface StepResult {
  name: string;
  code: number;
  seconds: number;
  output: string;
}

interface Proc {
  pid: number;
  ppid: number;
  command: string;
}

const GIT_ENV = { GIT_CONFIG_GLOBAL: '/dev/null' };

const TIERS: Step[] = [
  { name: 'unit', command: ['bun', 'scripts/test-unit.ts'] },
  { name: 'node', command: ['node', '--import', './tests/apparatus/node-test-preload.ts', '--test', '--test-timeout=30000', 'apps/studio/src/main/**/*.pty.ts'] },
  { name: 'build', command: ['bun', 'run', '--cwd', 'apps/studio', 'build'] },
];

const SCENARIOS: Step = {
  name: 'scenarios',
  command: ['node_modules/.bin/playwright', 'test', 'tests/e2e/spine.e2e.ts', '--reporter=list'],
};

const TOOL_CACHES = /^(node-compile-cache|v8-compile-cache-\d+|playwright-transform-cache-\d+)$/;

const LINGER_MS = 3_000;

export function processTable(): Proc[] {
  return execFileSync('ps', ['-A', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ pid: Number(match[1]), ppid: Number(match[2]), command: match[3]!.trim() }));
}

export function descendants(table: readonly Proc[], root: number): Proc[] {
  const under = new Set([root]);
  const found: Proc[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    for (const proc of table) {
      if (under.has(proc.ppid) && !under.has(proc.pid)) {
        under.add(proc.pid);
        found.push(proc);
        grew = true;
      }
    }
  }
  return found;
}

// An orphan is reparented away once its spawner exits; only a sample taken before then names it by ancestry.
function watchSpawned(everyMs = 250): { before: Set<number>; seen: Map<number, string>; stop(): void } {
  const first = processTable();
  const before = new Set(first.map((proc) => proc.pid));
  const seen = new Map<number, string>();
  const sample = (table: readonly Proc[]): void => {
    for (const proc of descendants(table, process.pid)) if (!/^(ps|lsof) /.test(proc.command)) seen.set(proc.pid, proc.command);
  };
  sample(first);
  const timer = setInterval(() => sample(processTable()), everyMs);
  return { before, seen, stop: () => clearInterval(timer) };
}

function cwdsOf(pids: readonly number[]): Map<number, string> {
  const cwds = new Map<number, string>();
  if (pids.length === 0) return cwds;
  let out = '';
  try {
    out = execFileSync('lsof', ['-nP', '-a', '-d', 'cwd', '-p', pids.join(','), '-F', 'pn'], { encoding: 'utf8' });
  } catch (error) {
    out = String((error as { stdout?: string }).stdout ?? '');
  }
  let pid = 0;
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n')) cwds.set(pid, line.slice(1));
  }
  return cwds;
}

/** Sampled under the run, or born during it with its command or cwd in `places`; an orphan that is neither goes unseen. */
export function attribute(
  table: readonly Proc[],
  watch: { before: ReadonlySet<number>; seen: ReadonlyMap<number, string> },
  places: readonly string[],
  cwds: ReadonlyMap<number, string>,
  self: number = process.pid,
): Proc[] {
  const inPlace = (text: string | undefined): boolean => text !== undefined && places.some((place) => text.includes(place));
  return table.filter((proc) => {
    if (proc.pid === self || /^(ps|lsof) /.test(proc.command)) return false;
    if (watch.seen.get(proc.pid) === proc.command) return true;
    return !watch.before.has(proc.pid) && (inPlace(proc.command) || inPlace(cwds.get(proc.pid)));
  });
}

function run(step: Step, env: NodeJS.ProcessEnv): Promise<StepResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const child = spawn(step.command[0]!, step.command.slice(1), { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('close', (code, signal) => {
      resolve({ name: step.name, code: code ?? (signal ? 1 : 0), seconds: (performance.now() - started) / 1000, output });
    });
  });
}

export interface Leftovers {
  processes: { pid: number; command: string; ports: string[] }[];
  paths: string[];
}

function listening(pids: readonly number[]): Map<number, string[]> {
  const ports = new Map<number, string[]>();
  if (pids.length === 0) return ports;
  let out = '';
  try {
    out = execFileSync('lsof', ['-nP', '-a', '-iTCP', '-sTCP:LISTEN', '-p', pids.join(','), '-F', 'pn'], { encoding: 'utf8' });
  } catch {
    return ports;
  }
  let pid = 0;
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n')) ports.set(pid, [...(ports.get(pid) ?? []), line.slice(1)]);
  }
  return ports;
}

export function leftoverPaths(runRoot: string): string[] {
  return readdirSync(runRoot)
    .filter((name) => !TOOL_CACHES.test(name))
    .map((name) => join(runRoot, name));
}

function leftoverProcesses(watch: { before: ReadonlySet<number>; seen: ReadonlyMap<number, string> }, places: readonly string[]): Proc[] {
  const table = processTable();
  const born = table.filter((proc) => !watch.before.has(proc.pid)).map((proc) => proc.pid);
  return attribute(table, watch, places, cwdsOf(born));
}

async function teardownCheck(runRoot: string, places: readonly string[], watch: { before: ReadonlySet<number>; seen: ReadonlyMap<number, string> }): Promise<Leftovers> {
  // A served stand-in exits up to about a second after the app that owns it.
  const deadline = Date.now() + LINGER_MS;
  let alive = leftoverProcesses(watch, places);
  while (alive.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    alive = leftoverProcesses(watch, places);
  }
  const ports = listening(alive.map((proc) => proc.pid));
  return {
    processes: alive.map((proc) => ({ pid: proc.pid, command: proc.command, ports: ports.get(proc.pid) ?? [] })),
    paths: leftoverPaths(runRoot),
  };
}

function tail(output: string, lines = 40): string {
  return output.trimEnd().split('\n').slice(-lines).join('\n');
}

function summaryOf(result: StepResult): string {
  const lines = result.output.trimEnd().split('\n').filter((line) => line.trim().length > 0);
  if (result.name === 'unit') return lines.find((line) => / pass, \d+ fail/.test(line))?.trim() ?? '';
  if (result.name === 'node') return lines.filter((line) => /^ℹ (pass|fail) \d+/.test(line)).map((line) => line.slice(2)).join(', ');
  if (result.name === 'scenarios') return lines.filter((line) => /^\s+\d+ (passed|failed|skipped|did not run|flaky)/.test(line)).map((line) => line.trim()).join(', ');
  return '';
}

function load(): string {
  return loadavg()[0]!.toFixed(1);
}

export async function runWide(cwd: string, write: (text: string) => void = (text) => process.stdout.write(text)): Promise<number> {
  const runRoot = mkdtempSync(join(tmpdir(), 'studio-wide-'));
  const env = { ...process.env, ...GIT_ENV, TMPDIR: runRoot };
  const loadAtStart = load();
  const started = performance.now();
  const watch = watchSpawned();
  write(`wide run: unit, node and build, then the core-flow scenarios (load ${loadAtStart})\n`);

  const results: StepResult[] = [];
  const report = (result: StepResult): void => {
    results.push(result);
    const verdict = result.code === 0 ? 'ok  ' : 'FAIL';
    write(`  ${verdict} ${result.name.padEnd(9)} ${result.seconds.toFixed(1).padStart(5)}s  ${summaryOf(result)}\n`);
  };

  process.chdir(cwd);
  const tiers = await Promise.all(TIERS.map((step) => run(step, env).then((result) => (report(result), result))));
  const built = tiers.find((result) => result.name === 'build')!;
  if (built.code === 0) report(await run(SCENARIOS, env));
  else write('  skip scenarios: the build failed\n');

  watch.stop();
  const leftovers = await teardownCheck(runRoot, [runRoot, realpathSync(runRoot), cwd], watch);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  for (const result of results.filter((r) => r.code !== 0)) write(`\n✗ ${result.name} (exit ${result.code})\n${tail(result.output)}\n`);

  const clean = leftovers.processes.length === 0 && leftovers.paths.length === 0;
  if (!clean) {
    write('\n✗ teardown: the run left these behind\n');
    for (const proc of leftovers.processes) {
      write(`  process ${proc.pid}${proc.ports.length > 0 ? ` listening on ${proc.ports.join(', ')}` : ''}: ${proc.command.slice(0, 200)}\n`);
    }
    for (const path of leftovers.paths) write(`  path ${path}\n`);
    for (const proc of leftovers.processes) {
      try {
        process.kill(proc.pid, 'SIGKILL');
      } catch {
        // Gone between the check and the kill.
      }
    }
  }
  rmSync(runRoot, { recursive: true, force: true });

  const failed = results.some((r) => r.code !== 0) || built.code !== 0 || !clean;
  write(`\n${failed ? 'FAILED' : 'passed'} in ${seconds}s; load ${loadAtStart} → ${load()}; teardown ${clean ? 'clean' : 'left processes or paths behind'}\n`);
  return failed ? 1 : 0;
}

if (import.meta.main) {
  process.exit(await runWide(process.cwd()));
}
