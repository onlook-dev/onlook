import type { TranscriptItem } from '@studio/events';

/** One footer per prompt the user sees, on its last reply once the agent stops; a hidden prompt or a joined message does not split it (ONL-2960). */
export function placeTurnFooters(items: readonly TranscriptItem[], isStreaming: boolean): ReadonlySet<string> {
  const footers = new Set<string>();
  let lastReply: string | undefined;
  for (const item of items) {
    if (item.kind === 'user' && item.hidden !== true && item.joinsTurn !== true) {
      if (lastReply !== undefined) footers.add(lastReply);
      lastReply = undefined;
    } else if (item.kind === 'assistant-text') {
      lastReply = item.id;
    }
  }
  if (lastReply !== undefined && !isStreaming) footers.add(lastReply);
  return footers;
}
