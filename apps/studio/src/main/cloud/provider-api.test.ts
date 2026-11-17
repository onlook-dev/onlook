import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'bun:test';
import * as api from './provider-api.js';

const entry = join(import.meta.dirname, 'provider-api.ts');
const repoRoot = join(import.meta.dirname, '../../../../..');

/** Every name the module exports, types included, read from its source: a type leaves no trace at runtime. */
function exportedNames(source: string): { values: string[]; types: string[] } {
  const values: string[] = [];
  const types: string[] = [];
  for (const [, kind, list] of source.matchAll(/^export (type )?\{([^}]*)\}/gm)) {
    // `A as B` exports B: the name a provider imports is the one pinned.
    for (const name of list!.split(',').map((part) => part.trim().split(' as ').at(-1)!).filter(Boolean)) (kind ? types : values).push(name);
  }
  for (const [, name] of source.matchAll(/^export const (\w+)/gm)) values.push(name!);
  return { values: values.sort(), types: types.sort() };
}

describe('provider API', () => {
  // A name removed or renamed here breaks a provider built against it: change the list and PROVIDER_API_VERSION together.
  it('exports exactly the names a provider is built against', () => {
    const names = exportedNames(readFileSync(entry, 'utf8'));
    expect(names.values).toEqual([
      'AUTH_SIGN_IN_ERROR_CODES',
      'PROVIDER_API_VERSION',
      'ReportSubmissionError',
      'readStateFile',
      'removeAtomicFile',
      'statePublisher',
      'stateRoot',
      'stateRootOverridden',
      'writeAtomicFile',
      'writeIdentity',
    ]);
    expect(names.types).toEqual([
      'AccountIdentity',
      'AccountMe',
      'AccountState',
      'AuthSignInErrorCode',
      'CloudIdentity',
      'OnlookClient',
      'OnlookClientOptions',
      'OnlookMe',
      'OnlookSignInMethod',
      'OnlookState',
      'OnlookTeams',
      'ProviderCapabilities',
      'ReportFiled',
      'StudioIdentity',
      'TeamCommand',
      'TeamError',
      'TeamResult',
    ]);
    // The source reading above and the module itself agree, so no export form slips past the pattern.
    expect(Object.keys(api).sort()).toEqual(names.values);
    expect(api.PROVIDER_API_VERSION).toBe(1);
  });

  // A provider bundles every file this module reaches, as its own copy. A new import that widens the set fails here first.
  it('bundles only the files a provider already carries', async () => {
    const build = await Bun.build({ entrypoints: [entry], target: 'node', external: ['electron'], metafile: true });
    expect(build.success).toBe(true);
    const files = Object.keys(build.metafile!.inputs).map((input) => relative(repoRoot, join(process.cwd(), input)).replaceAll('\\', '/'));
    expect(files.sort()).toEqual([
      'apps/studio/src/main/cloud/client.ts',
      'apps/studio/src/main/cloud/provider-api.ts',
      'apps/studio/src/main/env/platform.ts',
      'apps/studio/src/main/env/switch.ts',
      'apps/studio/src/main/fs-atomic.ts',
      'apps/studio/src/main/identity/store.ts',
      'apps/studio/src/main/state/build.ts',
      'apps/studio/src/main/state/file.ts',
      'apps/studio/src/main/state/root.ts',
      'packages/events/src/identity.ts',
    ]);
  });
});
