import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { MacArch } from './release-targets.js';

const CPU_TYPES: Record<number, MacArch> = { 0x01000007: 'x64', 0x0100000c: 'arm64' };

export function machOArchs(header: Uint8Array): string[] {
  if (header.byteLength < 8) return [];
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const cpuName = (type: number): string => CPU_TYPES[type] ?? `cpu 0x${type.toString(16)}`;
  if (view.getUint32(0, true) === 0xfeedfacf) return [cpuName(view.getUint32(4, true))];
  const magic = view.getUint32(0, false);
  if (magic !== 0xcafebabe && magic !== 0xcafebabf) return [];
  const stride = magic === 0xcafebabf ? 32 : 20;
  const count = view.getUint32(4, false);
  if (count === 0 || 8 + count * stride > header.byteLength) return [];
  return Array.from({ length: count }, (_, index) => cpuName(view.getUint32(8 + index * stride, false)));
}

function fileArchs(path: string): string[] {
  const descriptor = openSync(path, 'r');
  try {
    const header = new Uint8Array(4096);
    const read = readSync(descriptor, header, 0, header.byteLength, 0);
    return machOArchs(header.subarray(0, read));
  } finally {
    closeSync(descriptor);
  }
}

export function packagedArchProblems(app: string, arch: MacArch): string[] {
  const problems: string[] = [];
  const expectArch = (path: string, label: string): void => {
    if (!existsSync(path)) {
      problems.push(`${label} is missing: ${path}`);
      return;
    }
    const found = fileArchs(path);
    if (!found.includes(arch)) problems.push(`${label} is ${found.join('+') || 'not Mach-O'}, not ${arch}: ${path}`);
  };
  const macos = join(app, 'Contents/MacOS');
  const executables = existsSync(macos) ? readdirSync(macos).filter((name) => statSync(join(macos, name)).isFile()) : [];
  if (executables.length === 0) problems.push(`no executable in ${macos}`);
  for (const name of executables) expectArch(join(macos, name), 'app executable');
  const modules = join(app, 'Contents/Resources/app.asar.unpacked/node_modules');
  const sdkScope = join(modules, '@anthropic-ai');
  const own = `claude-agent-sdk-darwin-${arch}`;
  expectArch(join(sdkScope, own, 'claude'), 'Claude');
  for (const entry of existsSync(sdkScope) ? readdirSync(sdkScope) : []) {
    if (entry.startsWith('claude-agent-sdk-') && entry !== own) problems.push(`foreign Claude package: ${entry}`);
  }
  const pty = join(modules, 'node-pty');
  const loads = ['build/Release', 'build/Debug', `prebuilds/darwin-${arch}`].find((directory) => existsSync(join(pty, directory, 'pty.node')));
  if (!loads) problems.push(`no terminal module under ${pty}`);
  else {
    expectArch(join(pty, loads, 'pty.node'), 'terminal module');
    expectArch(join(pty, loads, 'spawn-helper'), 'terminal spawn-helper');
  }
  return problems;
}
