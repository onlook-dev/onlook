import type { FuseV1Config } from '@electron/fuses';

interface PackageContext {
  appOutDir: string;
  electronPlatformName: string;
  packager: { appInfo: { productFilename: string }; executableName: string };
}

export const securityFuses: FuseV1Config;
export function packagedElectronPath(context: PackageContext): string;
export function hardenElectron(binary: string): Promise<void>;
export default function afterPack(context: PackageContext): Promise<void>;
