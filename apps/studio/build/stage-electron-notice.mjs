import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { inventoryPath } from './third-party.mjs';

export function electronNoticeDirectory(context) {
  const require = createRequire(import.meta.url);
  const builderRequire = createRequire(require.resolve('electron-builder'));
  const { Arch } = builderRequire('builder-util');
  const target = context.packager.expandMacro('${os}-${arch}', Arch[context.arch]);
  return join(context.packager.projectDir, 'out/third-party-notices', target);
}

export function readElectronNotice(context) {
  const require = createRequire(import.meta.url);
  const builderRequire = createRequire(require.resolve('electron-builder'));
  const { Arch } = builderRequire('builder-util');
  if (context.arch === Arch.universal) {
    const x64 = readElectronNotice({ ...context, arch: Arch.x64 });
    const arm64 = readElectronNotice({ ...context, arch: Arch.arm64 });
    if (!x64.equals(arm64)) throw new Error('Universal Electron component notices differ');
    return x64;
  }
  return readFileSync(join(electronNoticeDirectory(context), 'LICENSES.chromium.html'));
}

export default function stageElectronNotice(context) {
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  if (inventory.find((entry) => entry.name === 'electron')?.version !== context.packager.info.framework.version) {
    throw new Error('Target Electron version differs from the reviewed inventory');
  }
  const directory = electronNoticeDirectory(context);
  mkdirSync(directory, { recursive: true });
  copyFileSync(join(context.appOutDir, 'LICENSES.chromium.html'), join(directory, 'LICENSES.chromium.html'));
}
