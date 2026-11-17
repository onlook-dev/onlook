import type { TabStatus } from '@studio/events';

/** `done` is dropped for the forward tab: the user watched it land, and it would raise the dot as they switch away (ONL-2364). */
export function statusToRecord(next: TabStatus | undefined, isActive: boolean): TabStatus | undefined {
  return next === 'done' && isActive ? undefined : next;
}

export interface AgentActivity {
  isStreaming: boolean;
  needsAttention: boolean;
  turnEnding: boolean;
}

/** Every ending is `done`: this seam cannot see an outcome, and a failed turn still needs the user's eyes. */
export function agentTabStatus(previous: TabStatus | undefined, activity: AgentActivity): TabStatus | undefined {
  if (activity.needsAttention) return 'waiting';
  if (activity.isStreaming && !activity.turnEnding) return 'working';
  if (previous === 'working' || previous === 'waiting') return 'done';
  return previous;
}
