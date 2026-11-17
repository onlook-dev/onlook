import type { ChatTypingSummary, TypingSurface } from '@studio/events';

export interface EventTimingEntry {
  startTime: number;
  duration: number;
  processingStart: number;
  processingEnd: number;
  interactionId: number;
}

export interface TypingCell {
  surface: TypingSurface;
  agentBusy: boolean;
  otherTabAgentBusy: boolean;
}

export interface Phases {
  duration: number;
  inputDelay: number;
  processing: number;
  presentation: number;
}

interface TypingContext {
  replayRecording: boolean;
  loafCount: number;
  loafBlockingMs: number;
  interactionCount: number;
  framesOnPage: number;
  jsHeapMb: number;
  windowMs: number;
  instrumentMs: number;
}

export interface TypingWindow {
  noteKeystroke(cell: TypingCell): void;
  noteInteraction(cell: TypingCell, entry: EventTimingEntry): void;
  cellOf(interactionId: number): TypingCell | undefined;
  hasKeystrokes(): boolean;
  summarize(context: TypingContext): ChatTypingSummary;
}

export function phasesOf(entry: EventTimingEntry): Phases {
  return {
    duration: entry.duration,
    inputDelay: Math.max(0, entry.processingStart - entry.startTime),
    processing: Math.max(0, entry.processingEnd - entry.processingStart),
    presentation: Math.max(0, entry.startTime + entry.duration - entry.processingEnd),
  };
}

/** Keystrokes with no entry ran under the 16 ms floor and rank as zero. */
function p95(slowDurations: readonly number[], keystrokes: number): number {
  const sorted = [...slowDurations].sort((a, b) => a - b);
  const fast = Math.max(0, keystrokes - sorted.length);
  const rank = Math.ceil(0.95 * Math.max(keystrokes, sorted.length));
  return rank <= fast ? 0 : (sorted[rank - fast - 1] ?? 0);
}

interface Interaction extends Phases {
  cell: TypingCell;
}

export function createTypingWindow(): TypingWindow {
  const keystrokes = { chat_panel: { busy: 0, idle: 0 }, inline_chat: { busy: 0, idle: 0 } };
  const interactions = new Map<number, Interaction>();
  let otherTabBusyKeystrokes = 0;

  return {
    noteKeystroke(cell) {
      keystrokes[cell.surface][cell.agentBusy ? 'busy' : 'idle'] += 1;
      if (cell.otherTabAgentBusy) otherTabBusyKeystrokes += 1;
    },
    noteInteraction(cell, entry) {
      const held = interactions.get(entry.interactionId);
      if (held !== undefined && held.duration >= entry.duration) return;
      interactions.set(entry.interactionId, { cell: held?.cell ?? cell, ...phasesOf(entry) });
    },
    cellOf: (interactionId) => interactions.get(interactionId)?.cell,
    hasKeystrokes: () =>
      keystrokes.chat_panel.busy + keystrokes.chat_panel.idle + keystrokes.inline_chat.busy + keystrokes.inline_chat.idle > 0,
    summarize(context) {
      const all = [...interactions.values()];
      const surface = (name: TypingSurface) => {
        const count = keystrokes[name].busy + keystrokes[name].idle;
        const durations = all.filter((held) => held.cell.surface === name).map((held) => held.duration);
        const atLeast = (ms: number): number => durations.filter((duration) => duration >= ms).length;
        return {
          keystrokes: count,
          from_50_to_100: atLeast(50) - atLeast(100),
          from_100_to_200: atLeast(100) - atLeast(200),
          from_200_to_500: atLeast(200) - atLeast(500),
          gte_500: atLeast(500),
          p95_ms: Math.round(p95(durations, count)),
          max_ms: Math.round(Math.max(0, ...durations)),
        };
      };
      const panel = surface('chat_panel');
      const inline = surface('inline_chat');
      const over100 = (busy: boolean): number =>
        all.filter((held) => held.cell.agentBusy === busy && held.duration >= 100).length;
      const max = (pick: (held: Interaction) => number): number => Math.round(Math.max(0, ...all.map(pick)));
      return {
        replay_recording: context.replayRecording,
        chat_panel_keystrokes: panel.keystrokes,
        chat_panel_from_50_to_100: panel.from_50_to_100,
        chat_panel_from_100_to_200: panel.from_100_to_200,
        chat_panel_from_200_to_500: panel.from_200_to_500,
        chat_panel_gte_500: panel.gte_500,
        chat_panel_p95_ms: panel.p95_ms,
        chat_panel_max_ms: panel.max_ms,
        inline_chat_keystrokes: inline.keystrokes,
        inline_chat_from_50_to_100: inline.from_50_to_100,
        inline_chat_from_100_to_200: inline.from_100_to_200,
        inline_chat_from_200_to_500: inline.from_200_to_500,
        inline_chat_gte_500: inline.gte_500,
        inline_chat_p95_ms: inline.p95_ms,
        inline_chat_max_ms: inline.max_ms,
        busy_keystrokes: keystrokes.chat_panel.busy + keystrokes.inline_chat.busy,
        busy_over_100: over100(true),
        idle_keystrokes: keystrokes.chat_panel.idle + keystrokes.inline_chat.idle,
        idle_over_100: over100(false),
        other_tab_busy_keystrokes: otherTabBusyKeystrokes,
        other_tab_busy_over_100: all.filter((held) => held.cell.otherTabAgentBusy && held.duration >= 100).length,
        input_delay_max_ms: max((held) => held.inputDelay),
        processing_max_ms: max((held) => held.processing),
        presentation_max_ms: max((held) => held.presentation),
        loaf_count: context.loafCount,
        loaf_blocking_ms: Math.round(context.loafBlockingMs),
        interaction_count: Math.max(0, Math.round(context.interactionCount)),
        frames_on_page: context.framesOnPage,
        js_heap_mb: Math.round(context.jsHeapMb),
        window_ms: Math.round(context.windowMs),
        instrument_ms: Math.round(context.instrumentMs),
      };
    },
  };
}
