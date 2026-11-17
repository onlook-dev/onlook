import { useEffect, useState } from 'react';
import type { AnchorRect } from '@studio/events';
import type { InlineChatRecord } from './inlinePlacement.js';

export type InlineChatExit = 'sent' | 'dismissed';

export const INLINE_CHAT_EXIT_MS: Record<InlineChatExit, number> = {
  sent: 170,
  dismissed: 120,
};

export interface InlineChatPresence {
  record: InlineChatRecord;
  rect: AnchorRect;
  /** Set while the surface plays its way out; it takes no input then. */
  exit: InlineChatExit | null;
}

/** Only an accepted send clears the record while it is still `sending`, so the record alone tells a send from a dismissal. */
export function nextInlineChatPresence(
  held: InlineChatPresence | null,
  record: InlineChatRecord | null,
  rect: AnchorRect | undefined,
): InlineChatPresence | null {
  if (record !== null) {
    if (rect === undefined) return null;
    return held !== null && held.exit === null && held.record === record && held.rect === rect
      ? held
      : { record, rect, exit: null };
  }
  if (held === null || held.exit !== null) return held;
  return { ...held, exit: held.record.send === 'sending' ? 'sent' : 'dismissed' };
}

export function useInlineChatPresence(
  record: InlineChatRecord | null,
  rect: AnchorRect | undefined,
): InlineChatPresence | null {
  const [held, setHeld] = useState<InlineChatPresence | null>(null);
  const next = nextInlineChatPresence(held, record, rect);
  if (next !== held) setHeld(next);

  const exit = next?.exit ?? null;
  useEffect(() => {
    if (exit === null) return;
    const timer = setTimeout(() => {
      setHeld(null);
    }, INLINE_CHAT_EXIT_MS[exit]);
    return () => {
      clearTimeout(timer);
    };
  }, [exit]);

  return next;
}
