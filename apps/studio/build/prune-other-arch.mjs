import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const builderRequire = createRequire(createRequire(import.meta.url).resolve('electron-builder/package.json'));
const { Arch } = builderRequire('builder-util');

export default async function pruneOtherArch({ appOutDir, arch, packager, electronPlatformName }) {
  if (electronPlatformName !== 'darwin' || Arch[arch] === process.arch) return;
  const app = join(appOutDir, `${packager.appInfo.productFilename}.app`);
  rmSync(join(app, 'Contents/Resources/app.asar.unpacked/node_modules/node-pty/build'), { recursive: true, force: true });
}
