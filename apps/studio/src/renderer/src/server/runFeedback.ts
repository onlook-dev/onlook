import type { ProjectSetupSnapshot, RunIntent, ServerBookState, ServerEntryState } from '@studio/events';

export type RunNotice = 'start-waiting' | 'start-failed' | 'stop-waiting' | 'stop-failed';
export const RUN_FEEDBACK_DELAY_MS = 15_000;

/** A failed Start that the setup failure card already tells is not told twice (ONL-2961). */
export function shownRunNotice(notice: RunNotice | undefined, { isFailureCardHeld }: { isFailureCardHeld: boolean }): RunNotice | undefined {
  return notice === 'start-failed' && isFailureCardHeld ? undefined : notice;
}

export function createRunFeedback(deps: {
  publish: (notice: RunNotice | undefined) => void;
  schedule: (callback: () => void) => () => void;
}) {
  let attempt: RunIntent | undefined;
  let sawBusy = false;
  let dismissed = false;
  let savedAttempt = false;
  let agentStreaming = false;
  let agentActive: boolean | undefined;
  let initialEntries = new Map<string, ServerEntryState['status']>();
  let discovered = new Set<string>();
  let setupState: ProjectSetupSnapshot['state'] | undefined;
  let lastBook: ServerBookState | undefined;
  let cancel: (() => void) | undefined;
  const publish = (notice: RunNotice): void => {
    if (!dismissed) deps.publish(notice);
  };
  const reset = (): void => {
    cancel?.();
    cancel = undefined;
    attempt = undefined;
    agentActive = undefined;
    initialEntries.clear();
    discovered.clear();
    setupState = undefined;
    lastBook = undefined;
    deps.publish(undefined);
  };
  const fail = (): void => {
    if (attempt === undefined) return;
    cancel?.();
    cancel = undefined;
    publish(attempt.press === 'start' ? 'start-failed' : 'stop-failed');
  };
  const observe = (book: ServerBookState): void => {
    if (attempt === undefined) return;
    lastBook = book;
    if (savedAttempt && (attempt.press === 'start' || (setupState !== 'idle' && setupState !== 'failed'))) return;
    const ids = attempt.entryIds ?? (attempt.entryId === undefined ? undefined : [attempt.entryId]);
    const discovering = attempt.press === 'start' && ids === undefined;
    if (discovering) {
      for (const entry of book.entries) {
        if (entry.ownership === 'users-own') continue;
        if (!initialEntries.has(entry.entryId) || (entry.status === 'starting' && initialEntries.get(entry.entryId) !== 'starting')) discovered.add(entry.entryId);
      }
    }
    const requested = ids === undefined ? (discovering ? discovered : undefined) : new Set(ids);
    const entries = book.entries.filter((entry) => entry.ownership !== 'users-own' && (requested === undefined || requested.has(entry.entryId)));
    const busy = book.pending || entries.some((entry) => entry.status === 'starting' || entry.status === 'stopping');
    const live = (entry: typeof entries[number]): boolean => entry.status === 'running' || entry.status === 'stop-failed' || entry.ports.some((port) => port.measured === 'live');
    const succeeded = attempt.press === 'start'
      ? !busy && (!discovering || agentActive === false) && entries.length > 0 && (requested === undefined || entries.length === requested.size) && entries.every(live)
      : !busy && entries.every((entry) => !live(entry));
    if (succeeded) { reset(); return; }
    if (attempt.press === 'start' ? agentActive === false && !busy : (sawBusy && !busy) || entries.some((entry) => entry.status === 'stop-failed')) fail();
    sawBusy ||= busy;
  };
  return {
    begin(intent: RunIntent, hasSavedSetup = false, entries: readonly ServerEntryState[] = []): void {
      reset();
      attempt = intent;
      agentActive = agentStreaming ? true : undefined;
      savedAttempt = hasSavedSetup;
      initialEntries = new Map(entries.map((entry) => [entry.entryId, entry.status]));
      discovered = new Set();
      sawBusy = false;
      dismissed = false;
      cancel = deps.schedule(() => publish(intent.press === 'start' ? 'start-waiting' : 'stop-waiting'));
    },
    observe,
    observeAgent(isStreaming: boolean): void {
      agentStreaming = isStreaming;
      if (attempt?.press !== 'start' || savedAttempt || (!isStreaming && agentActive === undefined)) return;
      agentActive = isStreaming;
      if (lastBook !== undefined) observe(lastBook);
    },
    observeSetup(state: ProjectSetupSnapshot['state']): void {
      if (attempt === undefined || !savedAttempt) return;
      setupState = state;
      if (state === 'failed') fail();
      else if (attempt.press === 'start' && state === 'running') reset();
      else if (attempt.press === 'stop' && state === 'running') fail();
      else if (attempt.press === 'stop' && state === 'idle' && lastBook !== undefined) observe(lastBook);
    },
    cancelAgentStart(): void {
      if (attempt?.press === 'start' && !savedAttempt) reset();
    },
    dismiss(): void {
      dismissed = true;
      cancel?.();
      cancel = undefined;
      deps.publish(undefined);
    },
    reset(): void {
      reset();
      agentStreaming = false;
    },
  };
}
