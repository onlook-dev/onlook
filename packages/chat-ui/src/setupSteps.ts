import {
  deriveSetupSteps,
  isSetupMachineCall,
  isStudioSetupPrompt,
  opensTurn,
  setupCardCanvas,
  setupTurnCards,
  type SetupCanvas,
  type SetupStepsLive,
  type SetupStepsView,
  type ToolCallView,
  type TranscriptItem,
} from '@studio/events';

export interface SetupStepsPlacement {
  /** Keyed by the Studio prompt whose line the card sits under. */
  cards: Map<string, SetupStepsView>;
  /** The `tools` items of a turn that shows a card: their setup-machine rows are the card's to show. */
  setupTurnItems: Set<string>;
  /** The Studio prompt whose turn is still running, so its line says so. */
  runningPromptId: string | undefined;
}

/** Only the transcript's last turn, while the session streams, reads the live setup machine (ONL-2913). */
export function placeSetupSteps(items: readonly TranscriptItem[], isStreaming: boolean, live?: SetupStepsLive, canvas?: SetupCanvas): SetupStepsPlacement {
  const cards = new Map<string, SetupStepsView>();
  const setupTurnItems = new Set<string>();
  const turnCards = setupTurnCards(items);
  for (const card of turnCards) {
    const isLive = card.isLast && isStreaming;
    const isLatest = card === turnCards.at(-1);
    cards.set(card.promptId, deriveSetupSteps(card.calls, isLive, isLive ? live : undefined, setupCardCanvas(canvas, isLive, isLatest)));
    for (const id of card.toolItemIds) setupTurnItems.add(id);
  }
  const lastPrompt = [...items].reverse().find((item) => opensTurn(item));
  const runningPromptId = isStreaming && lastPrompt !== undefined && isStudioSetupPrompt(lastPrompt) ? lastPrompt.id : undefined;
  return { cards, setupTurnItems, runningPromptId };
}

function awaitsApproval(call: ToolCallView): boolean {
  return call.permission !== undefined && call.permission.stale !== true;
}

/** A call waiting on the person always shows. */
export function shownCalls(calls: readonly ToolCallView[], inSetupTurn: boolean): ToolCallView[] {
  if (!inSetupTurn) return [...calls];
  return calls.filter((call) => awaitsApproval(call) || call.parentToolUseId !== undefined || !isSetupMachineCall(call));
}
