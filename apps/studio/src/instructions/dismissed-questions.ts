import type { StudioEvent } from '@studio/events';
import { isUserSpoken } from '@studio/events';

export const DISMISSED_QUESTIONS_CONTEXT =
  'Before this message you asked the person questions, and they dismissed them without answering. ' +
  'Take this message as it comes; don’t ask those questions again unless they bring them up.';

/** Read before the prompt is pushed: the latest question was dismissed and the person has not spoken since (ONL-2901). */
export function dismissedQuestionsContext(events: readonly StudioEvent[]): string | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (isUserSpoken(event)) return undefined;
    if (event.type === 'permission.resolved' && event.dismissed === true) return DISMISSED_QUESTIONS_CONTEXT;
    if (event.type === 'permission.requested' && event.questions !== undefined) return undefined;
  }
  return undefined;
}
