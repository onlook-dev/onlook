import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

export interface DirSnapshot {
  entries: string[];
  packageManagerField?: string;
}

export interface InstallPlan {
  manager: PackageManager;
  command: string;
  args: string[];
}

const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
];

const MANAGERS = new Set<string>(['bun', 'npm', 'pnpm', 'yarn']);

export function detectInstall(snapshot: DirSnapshot): InstallPlan | undefined {
  const entries = new Set(snapshot.entries);
  if (!entries.has('package.json')) return undefined;

  const declared = managerFromField(snapshot.packageManagerField);
  if (declared) return planFor(declared);

  const found = new Set(LOCKFILES.filter(([file]) => entries.has(file)).map(([, m]) => m));
  // Two lockfile families is no plan, not a tie-break: picking one fills node_modules with a tree the user's own commands disagree with.
  if (found.size !== 1) return undefined;

  const [only] = found;
  return only ? planFor(only) : undefined;
}

// An unknown manager is ignored, not refused: the lockfile beside it still answers.
function managerFromField(field: string | undefined): PackageManager | undefined {
  if (!field) return undefined;
  const trimmed = field.trim();
  const at = trimmed.indexOf('@');
  const name = at > 0 ? trimmed.slice(0, at) : trimmed;
  return MANAGERS.has(name) ? (name as PackageManager) : undefined;
}

export function planFor(manager: PackageManager): InstallPlan {
  return { manager, command: manager, args: ['install'] };
}

export async function snapshotDir(dir: string): Promise<DirSnapshot> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { entries: [] };
  }

  const field = entries.includes('package.json')
    ? await packageManagerField(join(dir, 'package.json'))
    : undefined;

  return { entries, ...(field !== undefined ? { packageManagerField: field } : {}) };
}

// A malformed package.json (mid-save, a merge conflict) degrades to no field; the lockfile beside it still answers.
async function packageManagerField(path: string): Promise<string | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const field = (parsed as Record<string, unknown>)['packageManager'];
    return typeof field === 'string' ? field : undefined;
  } catch {
    return undefined;
  }
}
