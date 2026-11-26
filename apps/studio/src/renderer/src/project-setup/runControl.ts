import type { RunIntent, ServerEntryState, StudioBridge } from '@studio/events';
import { promptedEntries, startPromptEntryIds } from '../server/store.js';
import { runFeedback } from '../server/runFeedbackStore.js';
import { studio } from '../bridge.js';

export function projectRunIntent(
  isEngaged: boolean,
  hasSavedSetup: boolean,
  entries: readonly ServerEntryState[],
  frameUrls: readonly string[],
): RunIntent {
  if (!isEngaged) {
    const entryIds = hasSavedSetup ? [] : startPromptEntryIds(entries, frameUrls);
    return { press: 'start', ...(entryIds.length === 0 ? {} : { entryIds }) };
  }
  return { press: 'stop' };
}

export function reportProjectRunIntent(
  isEngaged: boolean,
  hasSavedSetup: boolean,
  entries: readonly ServerEntryState[],
  frameUrls: readonly string[],
  bridge: Pick<StudioBridge, 'serverIntent'> = studio(),
): void {
  const intent = projectRunIntent(isEngaged, hasSavedSetup, entries, frameUrls);
  reportRunIntent(intent, hasSavedSetup, entries, frameUrls, bridge);
}

export function reportRunIntent(
  intent: RunIntent,
  hasSavedSetup: boolean,
  entries: readonly ServerEntryState[],
  frameUrls: readonly string[],
  bridge: Pick<StudioBridge, 'serverIntent'> = studio(),
): void {
  const starterIds = !hasSavedSetup && intent.press === 'start' && intent.entryIds === undefined
    ? promptedEntries(entries, frameUrls).filter((entry) => entry.ownership === 'studio-started').map((entry) => entry.entryId)
    : [];
  runFeedback.begin(starterIds.length > 0 ? { ...intent, entryIds: starterIds } : intent, hasSavedSetup, entries);
  bridge.serverIntent(intent);
}
