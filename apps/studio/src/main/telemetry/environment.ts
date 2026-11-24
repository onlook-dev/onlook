import { isWindows, systemExecutable } from '../env/platform.js';

type Env = Record<string, string>;
interface EnvironmentProbe { ok: boolean; out: string }

export interface EnvironmentDiagnostics {
  git_present: boolean;
  git_version: string | null;
  git_source: 'system' | 'none';
  node_present: boolean;
  node_version: string | null;
  npm_present: boolean;
  path_entry_count: number;
  git_on_path: boolean;
  node_on_path: boolean;
  shell: 'powershell' | 'other';
  windows_build: number | null;
  arch: string;
  developer_mode: boolean | null;
  long_paths_enabled: boolean | null;
}

export interface EnvironmentReaders {
  platform: NodeJS.Platform;
  release: string;
  arch: string;
  env(): Promise<Env>;
  resolves(bin: string, env: Env): boolean;
  run(bin: string, args: string[], env: Env): Promise<EnvironmentProbe>;
}

function version(result: EnvironmentProbe): string | null {
  if (!result.ok) return null;
  const output = result.out.replace(/\r?\n$/, '');
  if (/[\r\n]/.test(output)) return null;
  return /^(?:git version |v)?(\d+\.\d+\.\d+(?:\.windows\.\d+)?)(?: \(Apple Git-\d+(?:\.\d+)*\))?$/.exec(output)?.[1] ?? null;
}

function registryFlag(result: EnvironmentProbe): boolean | null {
  if (!result.ok) return null;
  const value = /\bREG_DWORD\s+0x([0-9a-f]+)\b/i.exec(result.out)?.[1];
  return value === undefined ? null : Number.parseInt(value, 16) === 1;
}

export async function readEnvironment(readers: EnvironmentReaders): Promise<EnvironmentDiagnostics> {
  const env = await readers.env();
  const windows = isWindows(readers.platform);
  const run = async (bin: string, args: string[]): Promise<EnvironmentProbe> => {
    try { return await readers.run(bin, args, env); }
    catch { return { ok: false, out: '' }; }
  };
  const gitProbe = async (): Promise<EnvironmentProbe> => {
    if (readers.platform === 'darwin' && !(await run('xcode-select', ['-p'])).ok) return { ok: false, out: '' };
    return run('git', ['--version']);
  };
  const [git, node, npm, developer, longPaths] = await Promise.all([
    gitProbe(),
    run('node', ['--version']),
    run('npm', ['--version']),
    windows ? run(systemExecutable('reg.exe'), ['query', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock', '/v', 'AllowDevelopmentWithoutDevLicense']) : undefined,
    windows ? run(systemExecutable('reg.exe'), ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem', '/v', 'LongPathsEnabled']) : undefined,
  ]);
  return {
    git_present: git.ok,
    git_version: version(git),
    git_source: git.ok ? 'system' : 'none',
    node_present: node.ok,
    node_version: version(node),
    npm_present: npm.ok,
    path_entry_count: (env['PATH'] ?? env['Path'] ?? '').split(windows ? ';' : ':').filter(Boolean).length,
    git_on_path: readers.resolves('git', env),
    node_on_path: readers.resolves('node', env),
    shell: windows ? 'powershell' : 'other',
    windows_build: windows ? Number(/^(?:\d+\.){2}(\d+)/.exec(readers.release)?.[1]) || null : null,
    arch: readers.arch,
    developer_mode: developer === undefined ? null : registryFlag(developer),
    long_paths_enabled: longPaths === undefined ? null : registryFlag(longPaths),
  };
}
