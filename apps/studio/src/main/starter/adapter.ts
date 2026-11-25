import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { userEnv } from '../env/shell-env.js';
import type { PackageManager } from '../install/detect.js';
import { REACT_ADAPTER, REACT_MARKERS } from './adapters/react.js';
import { STATIC_ADAPTER } from './adapters/static.js';
import { STARTER_SERVER_FILE } from './scaffold.js';
import { runChildOutput } from '../env/child.js';
import { devSwitches } from '../env/dev-switches.js';
import { writeAtomicFile } from '../fs-atomic.js';

type StarterAdapterId = 'static' | 'react';

export interface ManagerChoice {
  name: PackageManager;
  version?: string;
}

export interface StarterAdapter {
  readonly id: StarterAdapterId;
  readonly install: boolean;
  /** Must include `server.mjs`. */
  files(manager?: ManagerChoice): Readonly<Record<string, string>>;
  briefing(port: number): string;
}

export interface AdapterChoice {
  adapter: StarterAdapter;
  manager?: ManagerChoice;
}

const ADAPTERS: Readonly<Record<StarterAdapterId, StarterAdapter>> = {
  static: STATIC_ADAPTER,
  react: REACT_ADAPTER,
};

// No yarn: Berry defaults to Plug'n'Play, leaving no `node_modules` for `server.mjs` to resolve `vite` from.
const MANAGER_PREFERENCE: readonly PackageManager[] = ['bun', 'pnpm', 'npm'];

function overrideFromEnv(): StarterAdapterId | undefined {
  const value = devSwitches.starterAdapter;
  return value !== undefined && value in ADAPTERS ? (value as StarterAdapterId) : undefined;
}

export interface ChooseAdapterDeps {
  env?: () => Promise<Record<string, string | undefined>>;
  isExecutable?: (path: string) => boolean;
  version?: (command: string, env: Record<string, string | undefined>) => Promise<string | undefined>;
  override?: StarterAdapterId | undefined;
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function versionOf(command: string, env: Record<string, string | undefined>): Promise<string | undefined> {
  try {
    const { stdout } = await runChildOutput(command, ['--version'], { env: env as NodeJS.ProcessEnv, timeout: 5_000, windowsHide: true });
    const match = /\d+\.\d+\.\d+/.exec(stdout);
    return match?.[0];
  } catch {
    return undefined;
  }
}

export function managerOnPath(
  env: Record<string, string | undefined>,
  isExecutable: (path: string) => boolean = isExecutableFile,
): PackageManager | undefined {
  const dirs = (env['PATH'] ?? '').split(delimiter).filter((dir) => dir.length > 0);
  return MANAGER_PREFERENCE.find((name) => dirs.some((dir) => isExecutable(join(dir, name))));
}

// `static` ships regardless of PATH; `react` is reached only through the override.
export async function chooseAdapter(deps: ChooseAdapterDeps = {}): Promise<AdapterChoice> {
  const override = deps.override ?? overrideFromEnv();
  if (override !== 'react') return { adapter: STATIC_ADAPTER };
  const env = await (deps.env ?? userEnv)();
  const name = managerOnPath(env, deps.isExecutable);
  if (name === undefined) return { adapter: REACT_ADAPTER };
  const version = await (deps.version ?? versionOf)(name, env);
  return { adapter: REACT_ADAPTER, manager: version === undefined ? { name } : { name, version } };
}

// Every static `server.mjs` a released build scaffolded; a project keeps its copy after the template moves on.
export const RETIRED_STATIC_SERVER_SHA256: ReadonlySet<string> = new Set([
  '34fbb7a25868cf27a143d01a9315d7b9322750f618dc42a335406d59620a60f4',
  'a549b39309d0f49aab38b737a72d131e714917dc93e16d4d2cb82ecba83fbed6',
  '361df85d703824d3095765c3de754a59222343fbcbd42b871c5f35c4b9862399',
]);

const RETIRED_REACT_SERVER_SHA256: ReadonlySet<string> = new Set([
  '0190e2c4d9af0e264cb54e311fae015b8684ed0eba92c6097e34218991032636',
]);

// Byte-identical or not Studio's: the host starts a starter unattended, outside any agent-turn approval.
export function isStudioServerFile(content: string): boolean {
  if (Object.values(ADAPTERS).some((adapter) => adapter.files()[STARTER_SERVER_FILE] === content)) return true;
  const hash = createHash('sha256').update(content).digest('hex');
  return RETIRED_STATIC_SERVER_SHA256.has(hash) || RETIRED_REACT_SERVER_SHA256.has(hash);
}

export function adapterForWorktree(worktree: string): StarterAdapter | undefined {
  if (!existsSync(join(worktree, STARTER_SERVER_FILE))) return undefined;
  // Not `vite.config.ts`: a static project mid-conversion has one before `server_running` retires the starter.
  return REACT_MARKERS.every((marker) => existsSync(join(worktree, marker))) ? REACT_ADAPTER : STATIC_ADAPTER;
}

// The react server resolves `vite` from its own location, so it runs from the worktree.
export function starterModulePath(worktree: string, staticServer: () => string): string {
  const adapter = adapterForWorktree(worktree);
  if (adapter === STATIC_ADAPTER) return staticServer();
  const modulePath = join(worktree, STARTER_SERVER_FILE);
  if (adapter === REACT_ADAPTER) {
    const hash = createHash('sha256').update(readFileSync(modulePath, 'utf8')).digest('hex');
    if (RETIRED_REACT_SERVER_SHA256.has(hash)) writeAtomicFile(modulePath, REACT_ADAPTER.files()[STARTER_SERVER_FILE]!);
  }
  return modulePath;
}

export function starterBriefingFor(worktree: string, port: number): string {
  return (adapterForWorktree(worktree) ?? STATIC_ADAPTER).briefing(port);
}
