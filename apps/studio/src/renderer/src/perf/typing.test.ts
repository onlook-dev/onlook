import { describe, expect, it } from 'bun:test';
import { createTypingWindow, type EventTimingEntry, type TypingCell } from './typing.js';

const CONTEXT = {
  replayRecording: true,
  loafCount: 3,
  loafBlockingMs: 90.4,
  interactionCount: 12,
  framesOnPage: 2,
  jsHeapMb: 64.4,
  windowMs: 1000.4,
  instrumentMs: 0.6,
};

const panelIdle: TypingCell = { surface: 'chat_panel', agentBusy: false, otherTabAgentBusy: false };
const panelBusy: TypingCell = { surface: 'chat_panel', agentBusy: true, otherTabAgentBusy: false };
const inlineIdle: TypingCell = { surface: 'inline_chat', agentBusy: false, otherTabAgentBusy: false };

function entry(interactionId: number, duration: number): EventTimingEntry {
  return { interactionId, startTime: 100, duration, processingStart: 110, processingEnd: 120 };
}

describe('the typing window', () => {
  it('splits background work independently of local busy and keeps the original interaction attribution', () => {
    const window = createTypingWindow();
    const backgroundBusy = { ...panelIdle, otherTabAgentBusy: true };
    const bothBusy = { ...panelBusy, otherTabAgentBusy: true };
    for (const cell of [panelIdle, panelBusy, backgroundBusy, bothBusy]) window.noteKeystroke(cell);
    window.noteInteraction(backgroundBusy, entry(1, 120));
    window.noteInteraction(panelBusy, entry(1, 300));
    window.noteInteraction(bothBusy, entry(2, 100));
    window.noteInteraction(panelBusy, entry(3, 150));

    expect(window.summarize(CONTEXT)).toMatchObject({
      busy_keystrokes: 2,
      idle_keystrokes: 2,
      busy_over_100: 2,
      idle_over_100: 1,
      other_tab_busy_keystrokes: 2,
      other_tab_busy_over_100: 2,
    });
  });

  it('counts keystrokes with no entry as fast, so only measured ones fill the buckets and the p95', () => {
    const window = createTypingWindow();
    for (let i = 0; i < 20; i += 1) window.noteKeystroke(panelIdle);
    window.noteInteraction(panelIdle, entry(1, 24));
    window.noteInteraction(panelIdle, entry(2, 120));
    window.noteInteraction(panelIdle, entry(3, 600));

    const summary = window.summarize(CONTEXT);
    expect(summary).toMatchObject({
      chat_panel_keystrokes: 20,
      chat_panel_from_50_to_100: 0,
      chat_panel_from_100_to_200: 1,
      chat_panel_gte_500: 1,
      chat_panel_p95_ms: 120,
      chat_panel_max_ms: 600,
      inline_chat_keystrokes: 0,
      other_tab_busy_keystrokes: 0,
      other_tab_busy_over_100: 0,
    });
  });

  it('keeps one duration per interaction, the longest of its entries', () => {
    const window = createTypingWindow();
    window.noteKeystroke(inlineIdle);
    window.noteInteraction(inlineIdle, entry(7, 40));
    window.noteInteraction(inlineIdle, entry(7, 72));

    expect(window.summarize(CONTEXT)).toMatchObject({ inline_chat_max_ms: 72, inline_chat_from_50_to_100: 1 });
  });

  it('splits slow keystrokes by whether the agent was working when they were typed', () => {
    const window = createTypingWindow();
    window.noteKeystroke(panelIdle);
    window.noteKeystroke(panelBusy);
    window.noteInteraction(panelBusy, entry(1, 300));
    window.noteInteraction(panelIdle, entry(2, 30));

    expect(window.summarize(CONTEXT)).toMatchObject({
      busy_keystrokes: 1,
      busy_over_100: 1,
      idle_keystrokes: 1,
      idle_over_100: 0,
    });
  });
});
