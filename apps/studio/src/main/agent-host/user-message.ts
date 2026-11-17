import type { StudioEvent } from '@studio/events';

export function hasUserMessage(events: readonly StudioEvent[]): boolean {
  return events.some((event) => event.type === 'message.user' && event.origin !== 'studio');
}
