import { useCallback, useState } from 'react';
import type { ToolCallView } from '@studio/events';
import type { SheetPhase } from './QuestionSheetView.js';

export type SheetEnding = 'answered' | 'dismissed' | 'other';

export interface SheetPresence {
  call: ToolCallView | undefined;
  phase: SheetPhase | undefined;
  /** How the call the sheet is closing on ended, once it is closing. */
  ending: SheetEnding | undefined;
  answered: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
  onOpened: () => void;
  onClosed: () => void;
}

interface Held {
  call: ToolCallView | undefined;
  phase: SheetPhase | undefined;
  ending: SheetEnding | undefined;
  answered: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
}

const NONE: ReadonlySet<string> = new Set();

/** Keeps the sheet drawn after its question resolves, for as long as it takes to fold out of the stream. */
export function useSheetPresence(asking: ToolCallView | undefined, ended: (toolCallId: string) => SheetEnding): SheetPresence {
  const [held, setHeld] = useState<Held>({ call: undefined, phase: undefined, ending: undefined, answered: NONE, dismissed: NONE });
  let current = held;
  if (asking !== undefined && asking.permission?.requestId !== held.call?.permission?.requestId) {
    current = { ...held, call: asking, ending: undefined, phase: held.call === undefined || held.phase === 'closing' || held.phase === 'opening' ? 'opening' : 'open' };
  } else if (asking !== undefined && asking !== held.call) {
    current = { ...held, call: asking };
  } else if (asking === undefined && held.call !== undefined && held.phase !== 'closing') {
    const id = held.call.toolCallId;
    const ending = ended(id);
    current = {
      ...held,
      phase: 'closing',
      ending,
      answered: ending === 'answered' ? new Set([...held.answered, id]) : held.answered,
      dismissed: ending === 'dismissed' ? new Set([...held.dismissed, id]) : held.dismissed,
    };
  }
  if (current !== held) setHeld(current);

  const onOpened = useCallback(() => setHeld((now) => (now.phase === 'opening' ? { ...now, phase: 'open' } : now)), []);
  const onClosed = useCallback(() => setHeld((now) => (now.phase === 'closing' ? { ...now, call: undefined, phase: undefined, ending: undefined } : now)), []);
  return { call: current.call, phase: current.phase, ending: current.ending, answered: current.answered, dismissed: current.dismissed, onOpened, onClosed };
}
