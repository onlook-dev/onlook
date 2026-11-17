import type { HarnessId, StudioEvent } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { pinnedHarness } from '../onboarding/state.js';
import { knownProject, setProjectHarness } from '../workspace/store.js';
import { selectedHarness } from './appserver/index.js';
import { readArchivedChats } from './chat-history.js';
import { STORED_HARNESSES } from './harness.js';
import { harnessIdOf, sessionUpdatedAt, type SessionHarness } from './sessions.js';
import { readTranscript } from './transcript.js';

const neverAnswered = new Set<string>();

/** `text.start`, not `text.end`: a Claude turn can end with its last block never closed. */
export function hasAgentAnswer(events: readonly StudioEvent[]): boolean {
  return events.some((event) => event.type === 'text.start' || event.type === 'tool.start');
}

/** A Project that never got an answer follows the Settings default (ONL-2914). */
export function projectHarness(cwd: string): HarnessId {
  return pinnedHarness() ?? boundHarness(cwd) ?? selectedHarness();
}

export function bindProjectHarness(cwd: string, harness: SessionHarness): void {
  const record = knownProject(cwd);
  if (record === undefined || record.harness !== undefined) return;
  setProjectHarness(cwd, harnessIdOf(harness));
}

function boundHarness(cwd: string): HarnessId | undefined {
  const record = knownProject(cwd);
  if (record === undefined) return undefined;
  if (record.harness !== undefined) return record.harness;
  const key = canonicalPath(cwd);
  if (neverAnswered.has(key)) return undefined;
  const ran = historyHarness(cwd);
  if (ran === undefined) {
    neverAnswered.add(key);
    return undefined;
  }
  setProjectHarness(cwd, ran);
  return ran;
}

/** For Projects from before the field: the runtime that answered here, the later-opened one when both did. */
function historyHarness(cwd: string): HarnessId | undefined {
  const answered = STORED_HARNESSES.filter(
    (harness) =>
      hasAgentAnswer(readTranscript(cwd, harness)) ||
      readArchivedChats(cwd, harness).some((chat) => hasAgentAnswer(chat.events)),
  );
  const opened = (harness: SessionHarness): string => sessionUpdatedAt(cwd, harness) ?? '';
  const [latest] = answered.sort((a, b) => opened(b).localeCompare(opened(a)));
  return latest === undefined ? undefined : harnessIdOf(latest);
}

export function resetProjectHarnessCache(): void {
  neverAnswered.clear();
}
