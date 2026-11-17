// The env doors are not gated on `is.dev`: the packaged e2e drives the signed `.app` through them (ONL-1849).

import { join } from 'node:path';
import { HARNESS_IDS, type HarnessId, type OnboardingCompletion, type OnboardingState } from '@studio/events';
import { canWriteStateFile, eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { clearSettingsHarness, setSettingsHarness } from '../settings/state.js';
import { stateRoot } from '../state/root.js';
import { forced } from './forced.js';
import { devSwitches } from '../env/dev-switches.js';

function statePath(): string {
  return join(stateRoot(), 'onboarding.json');
}

interface PersistedState {
  completedAt?: string;
  harness?: HarnessId;
}

export function pinnedHarness(): HarnessId | undefined {
  const value = devSwitches.harness;
  if (value === undefined || value === '') return undefined;
  const match = HARNESS_IDS.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(
      `STUDIO_HARNESS="${value}" is not a HarnessId. Expected one of: ${HARNESS_IDS.join(', ')}.`,
    );
  }
  return match;
}

let cache: PersistedState | undefined;
let sealed = false;

function load(): PersistedState {
  if (cache) return cache;
  try {
    const file = readStateFile(statePath(), 1);
    const parsed = file.kind === 'data' ? file.data : undefined;
    cache = typeof parsed === 'object' && parsed !== null ? (parsed as PersistedState) : {};
  } catch {
    // Absent or unreadable both mean no record; the flow shows again.
    cache = {};
  }
  return cache;
}

export function readOnboardingState(): OnboardingState {
  const pinned = pinnedHarness();
  const override = forced();
  // A forced run reports no choice from disk in either direction; reading that
  // absence as "codex" moved every earlier user onto a runtime they never chose (ONL-2120).
  if (override !== undefined) {
    return { hasOnboarded: override, ...(pinned ? { harness: pinned } : {}) };
  }
  const state = load();
  const harness = pinned ?? state.harness;
  return {
    hasOnboarded: state.completedAt !== undefined,
    ...(harness ? { harness } : {}),
  };
}

export function chosenHarness(): HarnessId | undefined {
  const pinned = pinnedHarness();
  if (pinned !== undefined) return pinned;
  return forced() !== undefined ? undefined : load().harness;
}

// A forced run writes nothing, or an e2e run would change what the next `bun dev` shows.
export function completeOnboarding(completion: OnboardingCompletion = {}): void {
  if (forced() !== undefined) return;
  if (sealed) return;
  if (!canWriteStateFile(statePath(), 1)) return;

  // Stamped last: the settings write can throw and the gate is one-shot.
  // `clearSettingsHarness` on a harness-less completion, or a reset-then-onboard keeps what the wipe left.
  if (completion.harness) setSettingsHarness(completion.harness);
  else clearSettingsHarness();

  const next: PersistedState = {
    completedAt: new Date().toISOString(),
    ...(completion.harness ? { harness: completion.harness } : {}),
  };
  if (!writeStateFile(statePath(), 1, next)) return;
  cache = next;
}

export function resetOnboardingCache(): void {
  cache = undefined;
  sealed = false;
}

// Seals as well as deletes: the renderer outlives the quit teardown, and a late
// `onboarding:complete` would write the file straight back.
export function clearOnboarded(): void {
  sealed = true;
  cache = {};
  eraseStateFile(statePath(), 1);
}
