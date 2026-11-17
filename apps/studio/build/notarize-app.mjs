import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function afterSign({ electronPlatformName, appOutDir, packager }) {
  if (electronPlatformName !== 'darwin' || process.env.ONLOOK_NOTARIZE_APP !== '1') return;
  const script = fileURLToPath(new URL('../../../scripts/notarize-app.ts', import.meta.url));
  const app = join(appOutDir, `${packager.appInfo.productFilename}.app`);
  const result = spawnSync('bun', [script, app], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('App notarization or ticket stapling failed');
}
