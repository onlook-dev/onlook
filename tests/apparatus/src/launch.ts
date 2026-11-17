// The e2e apparatus and `launchStudio` both take roots, identity, shim, env and switches from `prepareLaunch`.

import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord, type DebugState, type HarnessId } from '@studio/events';
import { readStateFile, writeStateFile } from '../../../apps/studio/src/main/state/file.js';
import { waitForGate } from './cdp.js';
import { writeClaudeShim, type ClaudeShim, type ClaudeShimOptions } from './claude-shim/index.js';
import { answerFolderPicks } from './folder-picks.js';

export const FIXTURE_EMAIL = 'fixture@onlook.test';

// The probe pin greens a build that cannot spawn Claude (ONL-1802), and answers for every view, so a second tab's agent chooser needs a launch without it (ONL-2206).
export const FIRST_RUN_ENV = {
  STUDIO_FIRST_RUN: '1',
  STUDIO_AGENT_PROBE: 'ok',
} as const;

export interface SeededPerson {
  name?: string;
  /** `https:` only: main's picture resolver refuses every other scheme (ONL-2701). */
  pictureUrl?: string;
}

/** The one seed with no product write to call: the login gate reads `identity.json` before any bridge is reachable. */
export function seedIdentity(stateRoot: string, email: string, person: SeededPerson = {}): string {
  mkdirSync(stateRoot, { recursive: true });
  const path = join(stateRoot, 'identity.json');
  // Field by field, as the product's own write: a widened `SeededPerson` must not replace the email or the source.
  const identity = {
    email,
    ...(person.name === undefined ? {} : { name: person.name }),
    ...(person.pictureUrl === undefined ? {} : { pictureUrl: person.pictureUrl }),
    source: 'manual',
  };
  // 0600, as the app's own write.
  writeFileSync(path, `${JSON.stringify(identity, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  return path;
}

export interface LaunchPlanOptions {
  stateRoot: string;
  userDataDir: string;
  workspaceRoot?: string;
  /** `null` writes no `identity.json`: the app opens on sign-in. */
  email?: string | null;
  person?: SeededPerson;
  claudeShim?: ClaudeShimOptions;
  tourSeen?: boolean;
  telemetryConsent?: 'unanswered' | 'declined';
  /** `true` puts a window on the owner's screen. */
  headed?: boolean;
  /** Spread last. The launch is signed out of Claude unless this spreads `machineClaudeLogin()`, and of Codex unless it spreads `machineCodexHome()`. A `STUDIO_CLAUDE_BIN` here means no shim is written; a `CLAUDE_CONFIG_DIR` naming the machine's own Claude store is refused. */
  env?: Record<string, string>;
}

export interface LaunchPlan {
  /** Excludes the inherited environment, which carries the operator's credentials. */
  env: Record<string, string>;
  processEnv: Record<string, string>;
  args: string[];
  shim: ClaudeShim | undefined;
}

/** `''` is the machine's default keychain login, not none: a runner that names no login still signs in. */
export function machineClaudeLogin(): { CLAUDE_SECURESTORAGE_CONFIG_DIR: string } {
  return { CLAUDE_SECURESTORAGE_CONFIG_DIR: process.env['CLAUDE_SECURESTORAGE_CONFIG_DIR'] ?? '' };
}

/** Codex keeps its login, config, sessions and history in one home, so this shares all of it with the launch, not just the login. */
export function machineCodexHome(): { CODEX_HOME: string } {
  return { CODEX_HOME: process.env['CODEX_HOME'] || join(homedir(), '.codex') };
}

function isMachineClaudeStore(dir: string): boolean {
  const own = process.env['CLAUDE_CONFIG_DIR'];
  return dir === '' || resolve(dir) === join(homedir(), '.claude') || (own !== undefined && own !== '' && resolve(dir) === resolve(own));
}

export function prepareLaunch(options: LaunchPlanOptions): LaunchPlan {
  const claudeConfigDir = join(options.stateRoot, 'claude-config');
  const codexHome = join(options.stateRoot, 'codex-home');
  const namedStore = options.env?.['CLAUDE_CONFIG_DIR'];
  if (namedStore !== undefined && isMachineClaudeStore(namedStore)) {
    throw new Error(
      `CLAUDE_CONFIG_DIR ${JSON.stringify(namedStore)} is the machine's own Claude store, where a real turn writes transcripts and memory. ` +
        `Drop it and spread machineClaudeLogin() into env: the launch's store at ${claudeConfigDir} then signs in with the machine's keychain login.`,
    );
  }
  const dirs = [options.stateRoot, options.userDataDir, claudeConfigDir, codexHome, ...(options.workspaceRoot ? [options.workspaceRoot] : [])];
  for (const dir of dirs) mkdirSync(dir, { recursive: true });

  if (options.tourSeen === true) {
    const path = join(options.stateRoot, 'settings.json');
    const settings = readStateFile(path, 1);
    const data = settings.kind === 'missing' ? {} : settings.data;
    if ((settings.kind !== 'missing' && settings.version !== 1) || !isRecord(data) || Array.isArray(data)) {
      throw new Error(`Cannot seed tourSeen in unsupported settings at ${path}`);
    }
    writeStateFile(path, 1, { ...data, tourSeen: true });
  }

  if (options.telemetryConsent === 'declined') {
    const path = join(options.stateRoot, 'settings.json');
    const settings = readStateFile(path, 1);
    const data = settings.kind === 'missing' ? {} : settings.data;
    if ((settings.kind !== 'missing' && settings.version !== 1) || !isRecord(data) || Array.isArray(data)) {
      throw new Error(`Cannot seed telemetry refusal in unsupported settings at ${path}`);
    }
    if (data.telemetryConsent === undefined) writeStateFile(path, 1, { ...data, telemetryConsent: 'declined' });
  }

  const email = options.email === undefined ? FIXTURE_EMAIL : options.email;
  if (email !== null) seedIdentity(options.stateRoot, email, options.person);
  const callerEnv = options.env ?? {};
  const shim =
    callerEnv['STUDIO_CLAUDE_BIN'] === undefined
      ? writeClaudeShim(options.stateRoot, {
          state: 'signed-in',
          login: 'loopback',
          email: email ?? FIXTURE_EMAIL,
          plan: 'max',
          ...options.claudeShim,
        })
      : undefined;

  const env: Record<string, string> = {
    NODE_ENV: 'production',
    ...(options.headed === true ? {} : { AGENT_HEADLESS: '1' }),
    STUDIO_TELEMETRY: '0',
    STUDIO_FIRST_RUN: '0',
    // node-pty SIGABRTs main at teardown (ONL-1860).
    STUDIO_NO_PTY: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    STUDIO_STATE_ROOT: options.stateRoot,
    ...(options.workspaceRoot ? { STUDIO_WORKSPACE_ROOT: options.workspaceRoot } : {}),
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    CLAUDE_SECURESTORAGE_CONFIG_DIR: join(options.stateRoot, 'claude-login'),
    CODEX_HOME: codexHome,
    ...shim?.env,
    // The connection check spawns the CLI, which a replayed stream otherwise never needs.
    ...(callerEnv['STUDIO_AGENT_REPLAY'] ? { STUDIO_AGENT_PROBE: 'ok' } : {}),
    ...callerEnv,
  };

  const inherited = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] != null),
  );
  const processEnv = { ...inherited, ...env };
  const args = [
    // Without it a P3 display captures saturated sRGB through the display profile.
    '--force-color-profile=srgb',
    // Main pins the real userData whenever this is absent (ONL-1926).
    `--user-data-dir=${options.userDataDir}`,
  ];
  return { env, processEnv, args, shim };
}

export const OWN_TREE = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function studioPaths(tree: string) {
  const appDir = join(tree, 'apps/studio');
  return {
    appDir,
    mainEntry: join(appDir, 'out/main/index.js'),
    electronDir: join(appDir, 'node_modules/electron'),
    turboBin: join(tree, 'node_modules/.bin/turbo'),
  };
}

export async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === 'object' && address !== null) done(address.port);
        else fail(new Error('The OS answered a listen on port 0 with no port.'));
      });
    });
  });
}

const INSTALL_MARKERS = [
  'node_modules',
  'node_modules/.bin/turbo',
  'apps/studio/node_modules/electron/path.txt',
] as const;

export function missingInstall(root: string, exists: (path: string) => boolean = existsSync): string[] {
  return INSTALL_MARKERS.filter((marker) => !exists(join(root, marker)));
}

export function installComplaint(root: string, missing: readonly string[]): string | null {
  if (missing.length === 0) return null;
  return (
    `This worktree is not installed — run \`bun install\` in ${root}. ` +
    `Missing: ${missing.join(', ')}. ` +
    'A worktree needs its own install; one nested under the repo root half-resolves into the root\'s node_modules and fails confusingly.'
  );
}

function requireInstall(tree: string): void {
  if (!existsSync(join(tree, 'apps/studio/package.json'))) throw new Error(`${tree} is not a Studio checkout: it has no apps/studio.`);
  const complaint = installComplaint(tree, missingInstall(tree));
  if (complaint !== null) throw new Error(complaint);
}

function electronBinary(electronDir: string): string {
  const marker = join(electronDir, 'path.txt');
  // Not `node_modules/.bin/electron`: that Node wrapper's pid is not the one that has to be killed.
  return join(electronDir, 'dist', readFileSync(marker, 'utf8').trim());
}

export interface BuildReport {
  ms: number;
  cached: boolean;
}

const BUILD_LIMIT_MS = 600_000;

export async function buildStudio(tree: string = OWN_TREE): Promise<BuildReport> {
  requireInstall(tree);
  const started = Date.now();
  const child = spawn(studioPaths(tree).turboBin, ['run', 'build', '--filter=@studio/app'], {
    cwd: tree,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const timer = setTimeout(() => child.kill('SIGKILL'), BUILD_LIMIT_MS);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  }).finally(() => {
    clearTimeout(timer);
  });
  if (code !== 0) {
    throw new Error(`\`turbo run build --filter=@studio/app\` in ${tree} exited ${String(code)}:\n${output.split('\n').slice(-30).join('\n')}`);
  }
  return { ms: Date.now() - started, cached: output.includes('FULL TURBO') };
}

export interface StudioLaunchOptions {
  root: string;
  telemetryConsent?: LaunchPlanOptions['telemetryConsent'];
  port?: string | number;
  /** The readers stay this library's, whatever tree runs. */
  tree?: string;
  email?: string;
  harness?: HarnessId;
  claudeShim?: ClaudeShimOptions;
  env?: Record<string, string>;
  /** `true` puts a window on the owner's screen. */
  headed?: boolean;
  readyLimitMs?: number;
  /** `false` runs whatever build the tree last made. */
  build?: boolean;
  /** Answers for the folder picker, in order; `answerFolderPicks` queues more. */
  folderPicks?: readonly string[];
}

export interface StudioProcess {
  pid: number;
  port: string;
  /** Main's Node inspector, which `answerFolderPicks` reaches. */
  inspectPort: string;
  root: string;
  tree: string;
  stateRoot: string;
  workspaceRoot: string;
  userDataDir: string;
  /** The app's structured log, one JSON object a line — the file `debugState().log` tails. */
  logPath: string;
  /** Electron's own stdout and stderr: crashes and anything printed before the logger opens. */
  outputPath: string;
  shim: ClaudeShim | undefined;
  /** Only what this launch set: the record is written to disk, and the inherited environment carries credentials. */
  env: Record<string, string>;
  kill(): Promise<void>;
}

export const HANDLE_FILE = 'studio.json';

const KILL_LIMIT_MS = 10_000;

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function logTail(path: string, lines = 20): string {
  try {
    return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '(no output)';
  }
}

// By pid: a `pkill -f electron` from one walk killed a sibling's app and its dev server (ONL-2425).
export async function stopPid(pid: number): Promise<void> {
  if (!isAlive(pid)) return;
  process.kill(pid, 'SIGTERM');
  const deadline = Date.now() + KILL_LIMIT_MS;
  while (isAlive(pid) && Date.now() < deadline) await sleep(100);
  if (isAlive(pid)) process.kill(pid, 'SIGKILL');
}

export interface ProcessRow {
  pid: number;
  ppid: number;
  pgid: number;
  args: string;
}

export function listProcesses(): ProcessRow[] {
  const out = execFileSync('ps', ['-Ao', 'pid=,ppid=,pgid=,args='], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const rows: ProcessRow[] = [];
  for (const line of out.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (match) rows.push({ pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), args: match[4]! });
  }
  return rows;
}

/** Arguments only this launch's processes carry; crashpad runs outside main's tree and group, and names only the crash folder. */
export function launchMarks(launch: { userDataDir: string; stateRoot: string }): string[] {
  return [`--user-data-dir=${launch.userDataDir}`, `--database=${join(launch.stateRoot, 'crashes')}`];
}

/** Main, its descendants, its process group, and anything carrying one of its marks; never the caller. */
export function launchProcesses(rows: readonly ProcessRow[], mainPid: number, marks: readonly string[], self: number = process.pid): ProcessRow[] {
  const tree = new Set<number>([mainPid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const row of rows) {
      if (tree.has(row.ppid) && !tree.has(row.pid)) {
        tree.add(row.pid);
        grew = true;
      }
    }
  }
  return rows.filter(
    (row) => row.pid !== self && (tree.has(row.pid) || row.pgid === mainPid || marks.some((mark) => row.args.includes(mark))),
  );
}

export interface StopLaunchOptions {
  graceMs?: number;
  list?: () => ProcessRow[];
}

/** Resolves once every process of the launch is gone; one still alive past the SIGKILL throws naming it. */
export async function stopLaunch(mainPid: number, marks: readonly string[], options: StopLaunchOptions = {}): Promise<void> {
  const list = options.list ?? listProcesses;
  const graceMs = options.graceMs ?? KILL_LIMIT_MS;
  const watched = new Map(launchProcesses(list(), mainPid, marks).map((row) => [row.pid, row.args]));
  const survivors = (): ProcessRow[] =>
    list().filter((row) => row.pid !== process.pid && (watched.get(row.pid) === row.args || marks.some((mark) => row.args.includes(mark))));

  if (isAlive(mainPid)) process.kill(mainPid, 'SIGTERM');
  const deadline = Date.now() + graceMs;
  let alive = survivors();
  while (alive.length > 0 && Date.now() < deadline) {
    await sleep(100);
    alive = survivors();
  }
  for (const row of alive) {
    try {
      process.kill(row.pid, 'SIGKILL');
    } catch {
      // Exited between the read and the signal.
    }
  }
  const killDeadline = Date.now() + 2_000;
  while (alive.length > 0 && Date.now() < killDeadline) {
    await sleep(50);
    alive = survivors();
  }
  if (alive.length > 0) {
    throw new Error(`These processes of the launch at pid ${String(mainPid)} outlived SIGKILL:\n${alive.map((row) => `${String(row.pid)} ${row.args}`).join('\n')}`);
  }
}

function handleFor(record: Omit<StudioProcess, 'kill'>): StudioProcess {
  return { ...record, kill: () => stopLaunch(record.pid, launchMarks(record)) };
}

export function attachStudio(root: string): StudioProcess {
  const path = join(root, HANDLE_FILE);
  if (!existsSync(path)) {
    throw new Error(`No ${HANDLE_FILE} under ${root}: nothing launched an app on that root, or it was launched elsewhere.`);
  }
  const record = JSON.parse(readFileSync(path, 'utf8')) as Omit<StudioProcess, 'kill'>;
  if (!isAlive(record.pid)) {
    throw new Error(`The app recorded in ${path} (pid ${String(record.pid)}) is gone. Launch one on this root again; its output is ${record.outputPath}.`);
  }
  return handleFor(record);
}

export async function launchStudio(options: StudioLaunchOptions): Promise<StudioProcess> {
  const tree = resolve(options.tree ?? OWN_TREE);
  const { appDir, mainEntry, electronDir } = studioPaths(tree);
  requireInstall(tree);
  if (options.build !== false) await buildStudio(tree);
  const binary = electronBinary(electronDir);
  if (!existsSync(mainEntry)) {
    throw new Error(`No build output at ${mainEntry} after a build of @studio/app. See the turbo output above.`);
  }

  const port = String(options.port ?? (await freePort()));
  const inspectPort = String(await freePort());
  const stateRoot = join(options.root, 'state');
  const workspaceRoot = join(options.root, 'workspaces');
  const userDataDir = join(options.root, 'user-data');
  const launch = prepareLaunch({
    stateRoot,
    userDataDir,
    workspaceRoot,
    telemetryConsent: options.telemetryConsent ?? 'declined',
    ...(options.email === undefined ? {} : { email: options.email }),
    ...(options.claudeShim === undefined ? {} : { claudeShim: options.claudeShim }),
    ...(options.headed === undefined ? {} : { headed: options.headed }),
    env: { STUDIO_HARNESS: options.harness ?? 'claude', AGENT_CDP_PORT: port, ...options.env },
  });

  const outputPath = join(options.root, 'studio.log');
  const sink = openSync(outputPath, 'a');
  // Detached and unref'd: a tool call returning would otherwise kill the app mid-walk, and a second scratch file could not reuse it (ONL-2425).
  const child = spawn(binary, [`--inspect=127.0.0.1:${inspectPort}`, mainEntry, ...launch.args], {
    cwd: appDir,
    env: launch.processEnv,
    stdio: ['ignore', sink, sink],
    detached: true,
  });
  child.unref();
  closeSync(sink);
  const pid = child.pid;
  if (pid === undefined) throw new Error(`Electron did not start from ${binary}; see ${outputPath}.`);

  let ready: DebugState;
  try {
    ready = await waitForGate(port, options.readyLimitMs);
    if (options.folderPicks?.length) await answerFolderPicks({ inspectPort }, options.folderPicks);
  } catch (error) {
    await stopLaunch(pid, launchMarks({ userDataDir, stateRoot }));
    throw new Error(`${String(error)}\nLast output from ${outputPath}:\n${logTail(outputPath)}`);
  }
  const record: Omit<StudioProcess, 'kill'> = {
    pid,
    port,
    inspectPort,
    root: options.root,
    tree,
    stateRoot,
    workspaceRoot,
    userDataDir,
    logPath: ready.log.path,
    outputPath,
    shim: launch.shim,
    env: launch.env,
  };
  writeFileSync(join(options.root, HANDLE_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return handleFor(record);
}
