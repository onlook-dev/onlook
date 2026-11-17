import type { AgentCommandAcceptance, NextTask, SuggestionSend } from '@studio/events';
import type { NextTaskPick } from '@studio/chat-ui';
import { create } from 'zustand';
import { ignoreRefusal } from '../refusal.js';

export interface NextTaskPickState {
  index: number | null;
  taps: number;
}

const NOTHING_PICKED: NextTaskPickState = { index: null, taps: 0 };

export const useNextTaskPicks = create<{ picks: Readonly<Record<string, NextTaskPickState>> }>()(() => ({ picks: {} }));

export function nextTaskPickOf(picks: Readonly<Record<string, NextTaskPickState>>, toolCallId: string): NextTaskPickState {
  return picks[toolCallId] ?? NOTHING_PICKED;
}

export function pickNextTask(toolCallId: string, index: number): void {
  const { picks } = useNextTaskPicks.getState();
  const current = nextTaskPickOf(picks, toolCallId);
  useNextTaskPicks.setState({ picks: { ...picks, [toolCallId]: { index, taps: current.taps + 1 } } });
}

export function releaseNextTask(toolCallId: string): void {
  const { picks } = useNextTaskPicks.getState();
  const current = nextTaskPickOf(picks, toolCallId);
  if (current.index === null) return;
  useNextTaskPicks.setState({ picks: { ...picks, [toolCallId]: { ...current, index: null } } });
}

/** False when main took nothing; the pick is let go, so no task stays ringed for a send that never went. */
export async function sendTappedTask(
  pick: NextTaskPick,
  send: (prompt: { text: string; context?: string }, suggestion: SuggestionSend) => Promise<AgentCommandAcceptance>,
): Promise<boolean> {
  const taps = Math.max(1, nextTaskPickOf(useNextTaskPicks.getState().picks, pick.toolCallId).taps);
  const accepted = await send(nextTaskPrompt(pick.task), { index: pick.index, taps }).then(
    (acceptance) => acceptance.accepted,
    (error: unknown) => {
      ignoreRefusal('chat', 'next task')(error);
      return false;
    },
  );
  if (!accepted) releaseNextTask(pick.toolCallId);
  return accepted;
}

/** The bubble shows the title; the line the agent wrote rides `context`, which only the model reads (ONL-2977). */
export function nextTaskPrompt(task: NextTask): { text: string; context?: string } {
  return task.line === undefined
    ? { text: task.title }
    : { text: task.title, context: `This is one of the tasks you suggested, which you described as: ${task.line}` };
}
