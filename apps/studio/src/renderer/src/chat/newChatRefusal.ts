import { isUserSpokenItem, type TranscriptItem } from '@studio/events';

export type NewChatRefusal = 'busy' | 'empty' | undefined;

function hasConversation(items: readonly TranscriptItem[]): boolean {
  return items.some(isUserSpokenItem);
}

export function newChatRefusalFor(state: {
  isStreaming: boolean;
  items: readonly TranscriptItem[];
}): NewChatRefusal {
  if (state.isStreaming) return 'busy';
  if (!hasConversation(state.items)) return 'empty';
  return undefined;
}
