import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const LINTER_VERSION = '1.7.12';
const FINDINGS_EXIT = 1;
const ASSETS: Record<string, { name: string; sha256: string }> = {
  'darwin-arm64': { name: 'darwin_arm64.tar.gz', sha256: 'aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f' },
  'darwin-x64': { name: 'darwin_amd64.tar.gz', sha256: '5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644' },
  'linux-arm64': { name: 'linux_arm64.tar.gz', sha256: '325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6' },
  'linux-x64': { name: 'linux_amd64.tar.gz', sha256: '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8' },
  'win32-x64': { name: 'windows_amd64.zip', sha256: '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9' },
};
// Off so a run gives the same result whether or not shellcheck or pyflakes is installed.
export const LINTER_ARGS = ['-shellcheck=', '-pyflakes='];

export function linterAsset(platform: string, arch: string): { name: string; url: string; sha256: string } | undefined {
  const asset = ASSETS[`${platform}-${arch}`];
  if (!asset) return undefined;
  const name = `actionlint_${LINTER_VERSION}_${asset.name}`;
  return { name, url: `https://github.com/rhysd/actionlint/releases/download/v${LINTER_VERSION}/${name}`, sha256: asset.sha256 };
}

async function installLinter(directory: string): Promise<string> {
  const asset = linterAsset(process.platform, process.arch);
  if (!asset) throw new Error('Workflow linter does not support this platform.');
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error('Workflow linter download failed.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
    throw new Error('Workflow linter download failed checksum verification.');
  }
  const archive = join(directory, asset.name);
  writeFileSync(archive, bytes, { mode: 0o600 });
  const executable = process.platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  const extracted = spawnSync('tar', ['-xf', archive, '-C', directory, executable], { stdio: 'pipe', timeout: 30_000 });
  if (extracted.status !== 0) throw new Error('Workflow linter extraction failed.');
  const binary = join(directory, executable);
  chmodSync(binary, 0o700);
  return binary;
}

async function main(): Promise<number> {
  const directory = mkdtempSync(join(tmpdir(), 'studio-workflow-linter-'));
  try {
    const binary = await installLinter(directory);
    const result = spawnSync(binary, LINTER_ARGS, { stdio: 'inherit', timeout: 60_000 });
    if (result.status === 0) {
      process.stdout.write('Workflow lint passed.\n');
      return 0;
    }
    if (result.status === FINDINGS_EXIT) {
      process.stdout.write('Workflow lint found problems in .github/workflows. Fix them before pushing.\n');
      return 1;
    }
    throw new Error('Workflow linter failed to run.');
  } catch {
    process.stdout.write('Workflow lint could not finish. Check platform support and network access, then run it again.\n');
    return 2;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = await main();
