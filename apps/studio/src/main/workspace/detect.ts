import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { DEFAULT_DEV_PORT, type HarnessId } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import {
  identifyListener as identifyWithLsof,
  isContainedIn,
  verifiesFor,
  type IdentifyListener,
  type ListenerIdentity,
} from '../server/owner.js';
import { probePort as probeWithSocket } from '../server/probe.js';
import {
  detectionAsks,
  detectionContext,
  type BriefedApp,
  type DetectionBriefing,
  type SetupQuestionKind,
  type UnusualStart,
  unusualStarts,
} from '../../instructions/detection.js';
import { frameworkDefaultPort, frameworkFromManifest, isElectronManifest } from './framework.js';
import { appChoiceFor, forgetAppChoice, rememberAppChoice, workspaceRoot } from './store.js';

export interface DetectedApp {
  name: string;
  path: string;
  framework?: string;
  port: number;
  portSource?: 'project' | 'framework';
  electron?: true;
}

interface BusyPort {
  port: number;
  cwd: string;
  path: string;
}

interface PortConflict {
  port: number;
}

export interface Detection {
  apps: DetectedApp[];
  /** The root declares workspaces, or is a Turborepo. */
  monorepo: boolean;
  busy: BusyPort[];
  conflicts: PortConflict[];
}

export interface DetectDeps {
  probePort: (port: number) => Promise<boolean>;
  identifyListener: IdentifyListener;
  workspaceRoot: () => string;
}

const appDetectDeps: DetectDeps = {
  probePort: (port) => probeWithSocket(port),
  identifyListener: identifyWithLsof,
  workspaceRoot,
};

const ENV_FILES = ['.env.local', '.env.development', '.env'] as const;

type Manifest = Record<string, unknown>;

async function readManifest(dir: string): Promise<Manifest | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Manifest) : undefined;
  } catch {
    // No `package.json` here, or it is not JSON; the directory reads as unmanifested.
    return undefined;
  }
}

function devScript(manifest: Manifest | undefined): string | undefined {
  const scripts = manifest?.['scripts'];
  if (typeof scripts !== 'object' || scripts === null) return undefined;
  const dev = (scripts as Record<string, unknown>)['dev'];
  return typeof dev === 'string' && dev.trim() !== '' ? dev : undefined;
}

export function portFromScript(script: string): number | undefined {
  const flag = /(?:^|\s)(?:-p|--port)(?:\s+|=)(\d{1,5})(?=\s|$)/.exec(script);
  const prefix = /(?:^|\s)PORT=(\d{1,5})(?=\s|$)/.exec(script);
  return validPort(flag?.[1]) ?? validPort(prefix?.[1]);
}

function validPort(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const port = Number.parseInt(raw, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

// Only the port leaves this function; the rest of an env file is secrets.
async function portFromEnvFiles(dir: string): Promise<number | undefined> {
  for (const file of ENV_FILES) {
    let text: string;
    try {
      text = await readFile(join(dir, file), 'utf8');
    } catch {
      continue;
    }
    const port = validPort(/^\s*(?:export\s+)?PORT\s*=\s*["']?(\d{1,5})/m.exec(text)?.[1]);
    if (port !== undefined) return port;
  }
  return undefined;
}

function frameworkPortFor(framework: string | undefined, script: string): number | undefined {
  if (framework === 'Remix' && /\bvite\b/.test(script)) return frameworkDefaultPort('Vite');
  return frameworkDefaultPort(framework);
}

async function portOf(
  dir: string,
  script: string,
  framework: string | undefined,
): Promise<Pick<DetectedApp, 'port' | 'portSource'>> {
  const declared = portFromScript(script) ?? (await portFromEnvFiles(dir));
  if (declared !== undefined) return { port: declared, portSource: 'project' };
  const standard = frameworkPortFor(framework, script);
  return standard === undefined ? { port: DEFAULT_DEV_PORT } : { port: standard, portSource: 'framework' };
}

async function appAt(worktree: string, dir: string): Promise<DetectedApp | undefined> {
  const manifest = await readManifest(dir);
  const script = devScript(manifest);
  if (script === undefined) return undefined;
  const path = relative(worktree, dir) || '.';
  const declared = manifest?.['name'];
  const name = typeof declared === 'string' && declared.trim() !== '' ? declared : basename(dir);
  const framework = frameworkFromManifest(manifest);
  return {
    name,
    path,
    ...(framework === undefined ? {} : { framework }),
    ...(isElectronManifest(manifest) ? { electron: true as const } : {}),
    ...(await portOf(dir, script, framework)),
  };
}

function globsFromManifest(manifest: Manifest | undefined): string[] | undefined {
  const field = manifest?.['workspaces'];
  if (Array.isArray(field)) return field.filter((entry): entry is string => typeof entry === 'string');
  if (typeof field === 'object' && field !== null) {
    const packages = (field as Record<string, unknown>)['packages'];
    if (Array.isArray(packages)) return packages.filter((entry): entry is string => typeof entry === 'string');
  }
  return undefined;
}

async function globsFromPnpm(worktree: string): Promise<string[] | undefined> {
  let text: string;
  try {
    text = await readFile(join(worktree, 'pnpm-workspace.yaml'), 'utf8');
  } catch {
    // Not a pnpm workspace; `undefined` is "declared nothing", not "declared none".
    return undefined;
  }
  const globs: string[] = [];
  let inPackages = false;
  for (const line of text.split('\n')) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) break;
    if (!inPackages) continue;
    const entry = /^\s*-\s*["']?([^"'#]+?)["']?\s*(?:#.*)?$/.exec(line)?.[1];
    if (entry !== undefined && entry !== '') globs.push(entry);
  }
  return globs;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    // Absent or unreadable; either way the caller cannot use it.
    return false;
  }
}

async function workspaceGlobs(worktree: string, manifest: Manifest | undefined): Promise<string[] | undefined> {
  const declared = globsFromManifest(manifest) ?? (await globsFromPnpm(worktree));
  if (declared !== undefined) return declared;
  return (await exists(join(worktree, 'turbo.json'))) ? ['apps/*', 'packages/*'] : undefined;
}

async function expandGlobs(worktree: string, globs: readonly string[]): Promise<string[]> {
  const dirs = new Set<string>();
  for (const raw of globs) {
    const glob = raw.replace(/^\.\//, '').replace(/\/$/, '');
    if (glob.startsWith('!') || glob === '') continue;
    const star = glob.endsWith('/*') || glob.endsWith('/**');
    const parent = star ? glob.slice(0, glob.lastIndexOf('/')) : glob;
    if (parent.includes('*')) continue;
    if (!star) {
      dirs.add(resolve(worktree, parent));
      continue;
    }
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(resolve(worktree, parent), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      dirs.add(resolve(worktree, parent, entry.name));
    }
  }
  return [...dirs].sort();
}

// From the worktree alone, no sockets and no lsof: `rememberReportedApp` runs this on every report.
export async function enumerateApps(worktree: string): Promise<DetectedApp[]> {
  return (await enumerateWorkspace(worktree)).apps;
}

async function enumerateWorkspace(worktree: string): Promise<Pick<Detection, 'apps' | 'monorepo'>> {
  const manifest = await readManifest(worktree);
  const globs = await workspaceGlobs(worktree, manifest);
  if (globs === undefined) {
    const app = await appAt(worktree, worktree);
    return { apps: app === undefined ? [] : [app], monorepo: false };
  }
  const dirs = await expandGlobs(worktree, globs);
  const apps = await Promise.all(dirs.map((dir) => appAt(worktree, dir)));
  return { apps: apps.filter((app): app is DetectedApp => app !== undefined), monorepo: true };
}

// Anything unreadable, elsewhere, or inside any Studio project is a conflict: never a server the agent may adopt.
export function classifyListener(
  identity: ListenerIdentity | undefined,
  roots: { sourcePath: string; workspaceRoot: string },
): 'busy' | 'conflict' {
  if (identity?.cwd === undefined) return 'conflict';
  if (isContainedIn(canonicalPath(identity.cwd), canonicalPath(roots.workspaceRoot))) return 'conflict';
  return verifiesFor(identity, roots.sourcePath) === 'ours' ? 'busy' : 'conflict';
}

export async function detectApps(
  worktree: string,
  sourcePath: string,
  deps: DetectDeps = appDetectDeps,
): Promise<Detection> {
  const { apps, monorepo } = await enumerateWorkspace(worktree);
  const busy: BusyPort[] = [];
  const conflicts: PortConflict[] = [];
  const roots = { sourcePath, workspaceRoot: deps.workspaceRoot() };
  await Promise.all(
    [...new Set(apps.map((app) => app.port))].map(async (port) => {
      if (!(await deps.probePort(port))) return;
      const identity = await deps.identifyListener(port);
      if (classifyListener(identity, roots) === 'busy' && identity?.cwd !== undefined) {
        const path = apps.find((app) => app.port === port)?.path ?? '.';
        busy.push({ port, cwd: identity.cwd, path });
      } else {
        conflicts.push({ port });
      }
    }),
  );
  busy.sort((a, b) => a.port - b.port);
  conflicts.sort((a, b) => a.port - b.port);
  return { apps, monorepo, busy, conflicts };
}

export function briefedApp({ name, path, framework, electron, port, portSource }: DetectedApp): BriefedApp {
  return {
    name,
    path,
    ...(framework === undefined ? {} : { framework }),
    ...(electron === undefined ? {} : { electron }),
    ...(portSource === 'project' ? { port } : portSource === 'framework' ? { frameworkPort: port } : {}),
  };
}

export interface DetectionTarget {
  worktree: string;
  sourcePath: string;
  repoIdentity: string;
  harness: HarnessId;
}

export interface DetectionOutcome {
  context?: string;
  asks: SetupQuestionKind[];
  unusual?: UnusualStart[];
}

export async function detectionContextFor(
  target: DetectionTarget,
  deps: DetectDeps = appDetectDeps,
): Promise<DetectionOutcome> {
  const detection = await detectApps(target.worktree, target.sourcePath, deps);
  let remembered = appChoiceFor(target.repoIdentity);
  if (remembered !== undefined && !detection.apps.some((app) => app.path === remembered)) {
    forgetAppChoice(target.repoIdentity);
    remembered = undefined;
  }
  const briefing: DetectionBriefing = {
    apps: detection.apps.map(briefedApp),
    monorepo: detection.monorepo,
    busy: detection.busy.map(({ port, path }) => ({ port, path })),
    conflicts: detection.conflicts,
    ...(remembered === undefined ? {} : { remembered }),
    harness: target.harness,
  };
  const asks = detectionAsks(briefing);
  const context = detectionContext(briefing, asks);
  const unusual = unusualStarts(briefing);
  return { ...(context === undefined ? {} : { context }), asks, ...(unusual.length === 0 ? {} : { unusual }) };
}

export function appForReport(
  apps: readonly DetectedApp[],
  worktree: string,
  folder: string,
  port: number | undefined,
): DetectedApp | undefined {
  const root = canonicalPath(worktree);
  const where = canonicalPath(folder);
  const containing = apps
    .filter((app) => isContainedIn(where, resolve(root, app.path)))
    .sort((a, b) => b.path.length - a.path.length);
  if (containing[0] !== undefined) return containing[0];
  if (!isContainedIn(where, root) || relative(root, where) !== '' || apps.length < 2 || port === undefined) {
    return undefined;
  }
  const onPort = apps.filter((app) => app.port === port);
  return onPort.length === 1 ? onPort[0] : undefined;
}

export async function rememberReportedApp(target: {
  worktree: string;
  repoIdentity: string;
  folder: string;
  port: number | undefined;
}): Promise<void> {
  const apps = await enumerateApps(target.worktree);
  const app = appForReport(apps, target.worktree, target.folder, target.port);
  if (app !== undefined) rememberAppChoice(target.repoIdentity, app.path);
}
