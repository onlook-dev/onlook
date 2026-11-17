export type PenVerdict = 'send' | 'hold';

export type PenLabel = 'question' | 'working' | 'not-sent';

/** What the chat reads the live session as while a prompt waits (ONL-2294). */
export interface PenLive {
  isLive: boolean;
  needsAttention: boolean;
  verdict?: PenVerdict;
}

export function penLabel(live: PenLive): PenLabel {
  if (live.verdict === 'hold') return 'not-sent';
  if (live.needsAttention) return 'question';
  return live.isLive ? 'working' : 'not-sent';
}

/** Two prompts the designer typed separately, read as one (ONL-2294). */
export function joinParagraphs(first: string, second: string): string {
  return [first, second]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('\n\n');
}
