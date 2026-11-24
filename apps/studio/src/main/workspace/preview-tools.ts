import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectInstall } from '../install/detect.js';
import { frameworkFromManifest } from './framework.js';
import type { PreviewDiagnostics } from '../telemetry/preview-diagnostics.js';

export function previewProjectTools(folder: string): Pick<PreviewDiagnostics, 'framework' | 'package_manager'> {
  try {
    const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')) as Record<string, unknown>;
    return {
      framework: frameworkFromManifest(manifest) ?? 'unknown',
      package_manager: detectInstall({ entries: readdirSync(folder), ...(typeof manifest['packageManager'] === 'string' ? { packageManagerField: manifest['packageManager'] } : {}) })?.manager ?? 'unknown',
    };
  } catch {
    return { framework: 'unknown', package_manager: 'unknown' };
  }
}
