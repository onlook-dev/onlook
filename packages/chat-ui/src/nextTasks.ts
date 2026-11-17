import {
  isUserSpokenItem,
  nextTasksOffered,
  SUGGEST_NEXT_TASKS_TOOL,
  type NextTask,
  type ToolCallView,
  type TranscriptItem,
} from '@studio/events';

export type NextTasksState = { kind: 'waiting' } | { kind: 'open' } | { kind: 'sent'; index: number };

export interface NextTasksCard {
  toolCallId: string;
  tasks: NextTask[];
  state: NextTasksState;
}

export interface NextTaskPick {
  toolCallId: string;
  index: number;
  task: NextTask;
}

export function isNextTasksCall(call: ToolCallView): boolean {
  return call.name === SUGGEST_NEXT_TASKS_TOOL;
}

export function nextTasksOf(call: ToolCallView): NextTask[] | undefined {
  return nextTasksOffered(call.input)?.tasks;
}

/** A boundary closes the turn too: its suggestions belong to a conversation the agent has forgotten (ONL-2925). */
function endsTurn(item: TranscriptItem): boolean {
  return isUserSpokenItem(item) || item.kind === 'boundary';
}

interface PlacedCard {
  anchorId: string;
  /** The suggestion row that sent it; set only once the card is sent. */
  promptId?: string;
  card: NextTasksCard;
  isRepeat?: true;
}

function placeCards(items: readonly TranscriptItem[], isStreaming: boolean): PlacedCard[] {
  const placed: PlacedCard[] = [];
  let lastSent: PlacedCard | undefined;
  let start = 0;
  while (start < items.length) {
    let end = start;
    while (end < items.length && !(end > start && endsTurn(items[end]!))) end++;
    const next = items[end];
    const offer = lastOffer(items, start, end);
    const state = offer === undefined ? undefined : stateAfter(next, offer.tasks, isStreaming);
    if (offer !== undefined && state !== undefined) {
      const card = { toolCallId: offer.call.toolCallId, tasks: offer.tasks, state };
      const placement = { anchorId: anchorIn(items, start, end, offer), ...(state.kind === 'sent' && next !== undefined ? { promptId: next.id } : {}), card };
      placed.push(placement);
      if (state.kind === 'sent') lastSent = placement;
    } else if (next !== undefined && lastSent !== undefined && repeats(next, lastSent.card)) {
      placed.push({ ...lastSent, promptId: next.id, isRepeat: true });
    }
    start = end;
  }
  return placed;
}

/** A Retry or Stop-and-resend of a tap opens a turn no card offered, so it draws the task it repeats (ONL-2901). */
function repeats(row: TranscriptItem, sent: NextTasksCard): boolean {
  return row.kind === 'user' && row.origin === 'suggestion' && sent.state.kind === 'sent' && sent.tasks[sent.state.index]?.title === row.text.trim();
}

/** Keyed by the transcript item the card renders inside: the turn's last reply, or the tool group when the turn wrote none (ONL-2899). */
export function placeNextTasks(items: readonly TranscriptItem[], isStreaming: boolean): Map<string, NextTasksCard> {
  return new Map(placeCards(items, isStreaming).flatMap(({ anchorId, card, isRepeat }) => (isRepeat === true ? [] : [[anchorId, card] as const])));
}

export interface SentTask {
  card: NextTasksCard;
  /** The reply that offered the card, whose footer then draws under the chosen task; absent when the turn wrote none. */
  reply?: Extract<TranscriptItem, { kind: 'assistant-text' }>;
}

/** A sent card keyed by the suggestion row it sent, which is where its chosen task pins while the agent works (ONL-2901). */
export function placeSentTasks(items: readonly TranscriptItem[], isStreaming: boolean): Map<string, SentTask> {
  return new Map(
    placeCards(items, isStreaming).flatMap(({ promptId, anchorId, card }) => {
      if (promptId === undefined) return [];
      const reply = items.find((item): item is Extract<TranscriptItem, { kind: 'assistant-text' }> => item.id === anchorId && item.kind === 'assistant-text');
      return [[promptId, reply === undefined ? { card } : { card, reply }] as const];
    }),
  );
}

interface Offer {
  call: ToolCallView;
  tasks: NextTask[];
  groupId: string;
  groupIndex: number;
}

function lastOffer(items: readonly TranscriptItem[], start: number, end: number): Offer | undefined {
  for (let i = end - 1; i >= start; i--) {
    const item = items[i]!;
    if (item.kind !== 'tools') continue;
    for (const call of [...item.calls].reverse()) {
      if (!isNextTasksCall(call) || call.parentToolUseId !== undefined) continue;
      if (call.status !== 'completed') return undefined;
      const offer = nextTasksOffered(call.input, call.result);
      return offer === undefined ? undefined : { call, ...offer, groupId: item.id, groupIndex: i };
    }
  }
  return undefined;
}

/** A prompt Studio sent opens a turn of its own, though the card stays open past it. */
function opensTurn(item: TranscriptItem): boolean {
  return item.kind === 'user' && item.joinsTurn !== true;
}

/** A reply with other tool lines after it sits above them, so the card goes to the offer's own group instead. */
function anchorIn(items: readonly TranscriptItem[], start: number, end: number, offer: Offer): string {
  let turnEnd = offer.groupIndex + 1;
  while (turnEnd < end && !opensTurn(items[turnEnd]!)) turnEnd++;
  for (let i = turnEnd - 1; i >= start; i--) {
    const item = items[i]!;
    if (item.kind === 'assistant-text') return item.id;
    if (item.kind === 'tools' && item.calls.some((call) => !isNextTasksCall(call))) return offer.groupId;
    if (i < offer.groupIndex && opensTurn(item)) return offer.groupId;
  }
  return offer.groupId;
}

function stateAfter(next: TranscriptItem | undefined, tasks: readonly NextTask[], isStreaming: boolean): NextTasksState | undefined {
  if (next === undefined) return isStreaming ? { kind: 'waiting' } : { kind: 'open' };
  if (next.kind !== 'user' || next.origin !== 'suggestion') return undefined;
  const sent = next.text.trim();
  const index = tasks.findIndex((task) => task.title === sent);
  return index === -1 ? undefined : { kind: 'sent', index };
}

/** A card waits to show until every clip it pictures has loaded or been given up, so no picture lands after it (ONL-2977). */
export function isAwaitingPictures(card: Pick<NextTasksCard, 'tasks'>, isSettled: (clip: string) => boolean): boolean {
  return card.tasks.some((task) => task.picture !== undefined && 'clip' in task.picture && !isSettled(task.picture.clip));
}

/** While true, the transcript's other end-of-turn invitations wait for a later turn (ONL-2899). */
export function isOfferingNextTasks(cards: ReadonlyMap<string, NextTasksCard>): boolean {
  return [...cards.values()].some((card) => card.state.kind !== 'sent');
}

type NextTaskRowState = 'open' | 'picked' | 'dimmed' | 'chosen';

export interface NextTaskRow {
  index: number;
  task: NextTask;
  state: NextTaskRowState;
}

/** Nothing is picked until a tap; once sent, only the chosen task stays (ONL-2977). */
export function nextTaskRows(card: Pick<NextTasksCard, 'tasks' | 'state'>, picked: number | null): NextTaskRow[] {
  const { state, tasks } = card;
  if (state.kind === 'waiting') return [];
  if (state.kind === 'sent') {
    const task = tasks[state.index];
    return task === undefined ? [] : [{ index: state.index, task, state: 'chosen' }];
  }
  const pick = picked !== null && picked >= 0 && picked < tasks.length ? picked : null;
  return tasks.map((task, index) => ({ index, task, state: pick === null ? 'open' : pick === index ? 'picked' : 'dimmed' }));
}
