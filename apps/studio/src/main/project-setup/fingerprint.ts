import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { ProjectSetupDefinition } from '@studio/events';
import { t } from '@studio/i18n';
import { containedPath } from './state.js';

export function installFingerprint(root: string, definition: ProjectSetupDefinition): string {
  const hash = createHash('sha256').update(JSON.stringify({ prepare: definition.prepare, install: definition.install.script, outputs: definition.install.outputs }));
  for (const input of [...new Set(definition.install.inputs)].sort()) {
    const path = containedPath(root, input);
    hash.update(JSON.stringify(input));
    if (!existsSync(path)) hash.update('missing');
    else {
      if (!statSync(path).isFile()) throw new Error(t('projectSetup.failure.invalidInstallInput'));
      hash.update('present').update(readFileSync(path));
    }
  }
  return hash.digest('hex');
}

export function installationReusable(root: string, definition: ProjectSetupDefinition, fingerprint: string | null): boolean {
  return fingerprint !== null && definition.install.outputs.length > 0 &&
    definition.install.outputs.every((output) => existsSync(containedPath(root, output))) &&
    installFingerprint(root, definition) === fingerprint;
}
