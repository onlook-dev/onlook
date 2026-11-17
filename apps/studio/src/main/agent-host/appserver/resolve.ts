// Never the `bin/codex` JS shim: the real binary locates its helpers relative to itself, and a shim launch answers wrongly without crashing.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { executableName, isWindows } from '../../env/platform.js';

const CODE_MODE_HOST = 'codex-code-mode-host';

interface LayoutDescriptor {
  readonly layoutVersion: number;
  readonly version: string;
  readonly target: string;
  readonly variant: string;
  readonly entrypoint: string;
  readonly resourcesDir: string;
  readonly pathDir: string;
}

const KNOWN_LAYOUT_VERSION = 1;

export interface ResolvedCodex {
  readonly bin: string;
  readonly descriptor: LayoutDescriptor | null;
  readonly via: 'descriptor' | 'flat-directory' | 'explicit-binary';
}

export interface HealthReport {
  readonly ok: boolean;
  readonly bin?: string;
  readonly problems: string[];
  readonly checked: { path: string; exists: boolean; executable: boolean }[];
}

function isExecutableFile(path: string): boolean {
  try {
    const stat = statSync(path);
    // eslint-disable-next-line no-bitwise -- mode bits are the only way to ask this
    return stat.isFile() && (isWindows() ? path.toLowerCase().endsWith('.exe') : (stat.mode & 0o111) !== 0);
  } catch {
    return false;
  }
}

function contained(root: string, path: string): boolean {
  try {
    const tail = relative(realpathSync(root), realpathSync(path));
    return !isAbsolute(tail) && tail !== '..' && !tail.startsWith(`..${sep}`);
  } catch {
    return false;
  }
}

function readDescriptor(path: string, installRoot: string): LayoutDescriptor | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const descriptor = value as Record<string, unknown>;
    if (descriptor['layoutVersion'] !== KNOWN_LAYOUT_VERSION) return null;
    for (const field of ['version', 'target', 'variant', 'entrypoint', 'resourcesDir', 'pathDir']) {
      if (typeof descriptor[field] !== 'string' || descriptor[field] === '') return null;
    }
    const root = realpathSync(dirname(path));
    if (!contained(installRoot, root)) return null;
    for (const field of ['entrypoint', 'resourcesDir', 'pathDir']) {
      const part = descriptor[field] as string;
      if (isAbsolute(part) || part.includes('\0')) return null;
      if (!contained(root, join(root, part))) return null;
      if (field !== 'entrypoint' && !statSync(join(root, part)).isDirectory()) return null;
    }
    return value as LayoutDescriptor;
  } catch {
    return null;
  }
}

export function resolveCodex(root: string): ResolvedCodex | null {
  if (isExecutableFile(root)) return { bin: root, descriptor: null, via: 'explicit-binary' };

  const direct = join(root, 'codex-package.json');
  if (existsSync(direct)) {
    const descriptor = readDescriptor(direct, root);
    if (descriptor === null) return null;
    return { bin: join(root, descriptor.entrypoint), descriptor, via: 'descriptor' };
  }

  const vendor = join(root, 'vendor');
  if (existsSync(vendor)) {
    for (const entry of readdirSafe(vendor)) {
      const candidate = join(vendor, entry, 'codex-package.json');
      if (!existsSync(candidate)) continue;
      const descriptor = readDescriptor(candidate, root);
      if (descriptor === null) return null;
      return { bin: join(vendor, entry, descriptor.entrypoint), descriptor, via: 'descriptor' };
    }
  }

  const flat = join(root, executableName('codex'));
  if (contained(root, flat) && isExecutableFile(flat)) return { bin: flat, descriptor: null, via: 'flat-directory' };

  return null;
}

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Does not spawn: a process that starts is the signal that stays green through the missing-sibling failure. */
export function checkHealth(resolved: ResolvedCodex | null, root: string): HealthReport {
  const checked: HealthReport['checked'] = [];
  const problems: string[] = [];

  if (resolved === null) {
    return {
      ok: false,
      problems: [
        `no codex binary under ${root} — expected the platform executable, a codex-package.json descriptor, a vendor/<triple>/ tree, or a directory containing 'codex'`,
      ],
      checked,
    };
  }

  const record = (path: string): boolean => {
    const exists = existsSync(path);
    const executable = contained(dirname(resolved.bin), path) && isExecutableFile(path);
    checked.push({ path, exists, executable });
    return executable;
  };

  if (!record(resolved.bin)) {
    problems.push(`codex binary is missing or not executable: ${resolved.bin}`);
  }

  const sibling = join(dirname(resolved.bin), executableName(CODE_MODE_HOST));
  if (!record(sibling)) {
    problems.push(
      `${CODE_MODE_HOST} is missing beside the binary (${sibling}). This install spawns and handshakes normally and then answers wrongly during real work — refusing it here is the only place it is visible.`,
    );
  }

  if (resolved.descriptor !== null && resolved.descriptor.layoutVersion !== KNOWN_LAYOUT_VERSION) {
    problems.push(
      `codex-package.json layoutVersion is ${String(resolved.descriptor.layoutVersion)}, not the ${String(KNOWN_LAYOUT_VERSION)} this module was written against — re-read the vendor tree before trusting these paths`,
    );
  }

  return problems.length === 0
    ? { ok: true, bin: resolved.bin, problems, checked }
    : { ok: false, problems, checked };
}
