import { foldSessionState } from '@studio/events';
import type { StudioEvent } from '@studio/events';

export interface TurnFacts {
  events: readonly StudioEvent[];
  handlers: readonly string[];
}

function untilEnd(events: readonly StudioEvent[]): readonly StudioEvent[] {
  const end = events.findIndex((e) => e.type === 'turn.ended' || e.type === 'session.error');
  return end === -1 ? events : events.slice(0, end + 1);
}

// Tool and permission events are compared per call, not in order: live, a hook or a permission request can beat the stream. `session.settings` answers query controls replay stubs.
function flow(events: readonly StudioEvent[]): string[] {
  const steps: string[] = [];
  for (const e of untilEnd(events)) {
    if (e.type.startsWith('tool.') || e.type.startsWith('permission.') || e.type === 'session.settings') continue;
    const step = e.type === 'session.error' ? `session.error (${e.message})` : e.type;
    if (steps.at(-1) !== step) steps.push(step);
  }
  return steps;
}

function calls(events: readonly StudioEvent[]): Map<string, string> {
  const seen = new Map<string, { name?: string; permission?: string; end?: string }>();
  const at = (id: string) => seen.get(id) ?? seen.set(id, {}).get(id)!;
  for (const e of untilEnd(events)) {
    if (e.type === 'tool.start') at(e.toolCallId).name = e.name;
    if (e.type === 'permission.resolved') at(e.toolCallId).permission = e.outcome;
    if (e.type === 'tool.end') at(e.toolCallId).end = `${e.status}: ${e.result ?? e.errorMessage ?? ''}`;
  }
  return new Map(
    [...seen].map(([id, c]) => [id, `${c.name ?? '?'}${c.permission === undefined ? '' : ` after ${c.permission}`} ${c.end ?? 'never ended'}`]),
  );
}

function spoken(events: readonly StudioEvent[]): string {
  return foldSessionState(untilEnd(events))
    .items.flatMap((item) => (item.kind === 'assistant-text' ? [item.text] : []))
    .join('');
}

function tally(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function divergence(live: TurnFacts, replayed: TurnFacts): string[] {
  const found: string[] = [];

  const [liveFlow, replayFlow] = [flow(live.events), flow(replayed.events)];
  const parted = liveFlow.findIndex((step, i) => step !== replayFlow[i]);
  const step = parted === -1 && replayFlow.length > liveFlow.length ? liveFlow.length : parted;
  if (step !== -1) found.push(`event log, step ${String(step + 1)}: live ${liveFlow[step] ?? '(ended)'}; replay ${replayFlow[step] ?? '(ended)'}`);

  const [liveCalls, replayCalls] = [calls(live.events), calls(replayed.events)];
  for (const id of new Set([...liveCalls.keys(), ...replayCalls.keys()])) {
    const [l, r] = [liveCalls.get(id), replayCalls.get(id)];
    if (l !== r) found.push(`tool call ${id}: live ${l ?? '(none)'}; replay ${r ?? '(none)'}`);
  }

  const [liveHandlers, replayHandlers] = [tally(live.handlers), tally(replayed.handlers)];
  for (const handler of new Set([...liveHandlers.keys(), ...replayHandlers.keys()])) {
    const [l, r] = [liveHandlers.get(handler) ?? 0, replayHandlers.get(handler) ?? 0];
    if (l !== r) found.push(`handler ${handler}: reached ${String(l)}× live, ${String(r)}× on replay`);
  }

  const [liveText, replayText] = [spoken(live.events), spoken(replayed.events)];
  if (liveText !== replayText) found.push(`chat text: live ${JSON.stringify(liveText)}; replay ${JSON.stringify(replayText)}`);

  return found;
}
