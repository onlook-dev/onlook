import { join } from 'node:path';
import { FuseVersion, FuseV1Options, FuseState, flipFuses, getCurrentFuseWire } from '@electron/fuses';
import pruneOtherArch from './prune-other-arch.mjs';
import { readElectronNotice } from './stage-electron-notice.mjs';

export const securityFuses = {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
};

export function packagedElectronPath({ appOutDir, packager, electronPlatformName }) {
  const name = packager.appInfo.productFilename;
  if (electronPlatformName === 'darwin') return join(appOutDir, `${name}.app`);
  if (electronPlatformName === 'win32') return join(appOutDir, `${name}.exe`);
  return join(appOutDir, packager.executableName);
}

export async function hardenElectron(binary) {
  await flipFuses(binary, securityFuses);
  const wire = await getCurrentFuseWire(binary);
  for (const [option, enabled] of Object.entries(securityFuses)) {
    if (option === 'version') continue;
    if (wire[option] !== (enabled ? FuseState.ENABLE : FuseState.DISABLE)) {
      throw new Error(`Packaged Electron security fuse ${option} did not persist`);
    }
  }
}

export default async function afterPack(context) {
  const { verifyArchive, inventoryPath } = await import('./third-party.mjs');
  const { readFileSync } = await import('node:fs');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const builderRequire = createRequire(require.resolve('electron-builder'));
  const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
  const asar = libraryRequire('@electron/asar');
  const resources = context.electronPlatformName === 'darwin'
    ? join(packagedElectronPath(context), 'Contents/Resources')
    : join(context.appOutDir, 'resources');
  const chromiumNotice = readElectronNotice(context);
  // Collection mode skips the inventory gate at build time, so the archive carries no NOTICE to verify.
  if (process.env.STUDIO_COLLECT_NOTICES !== '1') verifyArchive(join(resources, 'app.asar'), asar, JSON.parse(readFileSync(inventoryPath, 'utf8')), { 'LICENSES.chromium.html': chromiumNotice });
  await pruneOtherArch(context);
  await hardenElectron(packagedElectronPath(context));
}
