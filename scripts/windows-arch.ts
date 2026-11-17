import { closeSync, existsSync, openSync, readdirSync, readSync } from 'node:fs';
import { join } from 'node:path';

export function peArch(header: Uint8Array): string | undefined {
  if (header.byteLength < 64 || header[0] !== 0x4d || header[1] !== 0x5a) return undefined;
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const offset = view.getUint32(0x3c, true);
  if (offset > header.byteLength - 6 || view.getUint32(offset, true) !== 0x00004550) return undefined;
  const machine = view.getUint16(offset + 4, true);
  return machine === 0x8664 ? 'x64' : machine === 0xaa64 ? 'arm64' : machine === 0x014c ? 'ia32' : undefined;
}

export function packagedWindowsProblems(app: string, product: string): string[] {
  const modules = join(app, 'resources/app.asar.unpacked/node_modules');
  const sdk = join(modules, '@anthropic-ai');
  const pty = join(modules, 'node-pty');
  const loads = ['build/Release', 'build/Debug', 'prebuilds/win32-x64'].find((directory) => existsSync(join(pty, directory, 'conpty.node')));
  const problems: string[] = [];
  const paths = [join(app, `${product}.exe`), join(sdk, 'claude-agent-sdk-win32-x64/claude.exe')];
  if (!loads) problems.push('No Windows terminal module found');
  else for (const name of ['conpty.node', 'conpty_console_list.node']) paths.push(join(pty, loads, name));
  for (const path of paths) {
    if (!existsSync(path)) { problems.push(`Missing Windows executable: ${path}`); continue; }
    const descriptor = openSync(path, 'r');
    try {
      const header = new Uint8Array(4096);
      const count = readSync(descriptor, header, 0, header.byteLength, 0);
      if (peArch(header.subarray(0, count)) !== 'x64') problems.push(`Not an x64 PE executable: ${path}`);
    } finally { closeSync(descriptor); }
  }
  for (const entry of existsSync(sdk) ? readdirSync(sdk) : []) {
    if (entry.startsWith('claude-agent-sdk-') && entry !== 'claude-agent-sdk-win32-x64') problems.push(`Foreign Claude package: ${entry}`);
  }
  return problems;
}
