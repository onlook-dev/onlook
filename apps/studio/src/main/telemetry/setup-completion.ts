import { join } from 'node:path';
import { isHarnessId, type HarnessId } from '@studio/events';
import { readStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';

type Provider = HarnessId;

let cache: { path: string; providers: Set<Provider> } | undefined;

function load(): NonNullable<typeof cache> {
  const path = join(stateRoot(), 'setup-completed-providers.json');
  if (cache?.path === path) return cache;
  let providers: Provider[] = [];
  try {
    const file = readStateFile(path, 1);
    if (file.kind === 'data' && Array.isArray(file.data)) {
      providers = file.data.filter(isHarnessId);
    }
  } catch {}
  cache = { path, providers: new Set(providers) };
  return cache;
}

export function hasCompletedAgentSetup(provider: Provider): boolean {
  return load().providers.has(provider);
}

export function markAgentSetupCompleted(provider: Provider): void {
  const state = load();
  if (state.providers.has(provider)) return;
  state.providers.add(provider);
  try {
    writeStateFile(state.path, 1, [...state.providers]);
  } catch {}
}

export function resetSetupCompletionCacheForTesting(): void {
  cache = undefined;
}
