import { describe, expect, it } from 'bun:test';
import type { CanvasDoc, FrameQuotes, StudioEvent, ToolKind } from '@studio/events';
import { FrameQuoteBook, quoteTargetOf, studioQuotePlacement } from './frame-quotes.js';

const base = { sessionId: 's', eventId: 'e', seq: 1, ts: 0, cwd: '/w' };
const turnStarted = (): StudioEvent => ({ ...base, type: 'turn.started', turnId: 't' });
const turnEnded = (filesChanged?: number): StudioEvent => ({
  ...base,
  type: 'turn.ended',
  turnId: 't',
  ...(filesChanged === undefined ? {} : { filesChanged }),
});
const TOOL_NAMES: Partial<Record<ToolKind, string>> = { edit: 'Write', read: 'Read' };
const toolStart = (toolCallId: string, kind: ToolKind, name = TOOL_NAMES[kind] ?? 'Read'): StudioEvent => ({
  ...base,
  type: 'tool.start',
  toolCallId,
  name,
  kind,
  title: '',
  status: 'in_progress',
});
const toolEnd = (toolCallId: string, status: 'completed' | 'failed' = 'completed'): StudioEvent => ({
  ...base,
  type: 'tool.end',
  toolCallId,
  status,
});
const edited = (book: FrameQuoteBook, id = 'w1'): void => {
  book.observe('/w', toolStart(id, 'edit'));
  book.observe('/w', toolEnd(id));
};

const HOME = { id: 'f1', kind: 'frame', homeUrl: 'http://localhost:4700/' } as const;
const CARD_ID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const CARD = { id: 'a1', kind: 'artifact', artifactId: CARD_ID } as const;

function docWith(nodes: Record<string, { homeUrl: string } | { artifactId: string } | 'text'>): CanvasDoc {
  return {
    nodes: Object.fromEntries(
      Object.entries(nodes).map(([id, node]) => [
        id,
        node === 'text'
          ? { id, kind: 'text' }
          : 'artifactId' in node
            ? { id, kind: 'artifact', content: { artifactId: node.artifactId, title: 'Card' } }
            : { id, kind: 'browser', content: { homeUrl: node.homeUrl } },
      ]),
    ),
  } as unknown as CanvasDoc;
}

function book({ liftsAtTurnEnd = true } = {}) {
  const emitted: FrameQuotes[] = [];
  const lifts: number[] = [];
  const liftedNodes: string[] = [];
  const triggers: string[] = [];
  const clock = { now: 1_000 };
  const notShowing = new Set<string>();
  const quotes = new FrameQuoteBook({
    emit: (_cwd, view) => emitted.push(view),
    lifted: (_cwd, ms, node, trigger) => {
      lifts.push(ms);
      liftedNodes.push(node);
      triggers.push(trigger);
    },
    now: () => clock.now,
    liftsAtTurnEnd: () => liftsAtTurnEnd,
    showsPage: (_cwd, frameId) => !notShowing.has(frameId),
  });
  return { quotes, emitted, lifts, liftedNodes, triggers, clock, notShowing, shown: () => quotes.view('/w').byFrame };
}

const toolCall = (book: FrameQuoteBook, id: string, name: string): void => {
  book.observe('/w', toolStart(id, 'other', name));
  book.observe('/w', toolEnd(id));
};
const questionAsked = (requestId: string): StudioEvent => ({
  ...base,
  type: 'permission.requested',
  requestId,
  toolCallId: requestId,
  toolName: 'AskUserQuestion',
  options: [],
  questions: [{ question: 'Which colour?', header: 'Colour', options: [{ label: 'Violet', description: '' }] }],
});
const questionAnswered = (requestId: string): StudioEvent => ({
  ...base,
  type: 'permission.resolved',
  requestId,
  toolCallId: requestId,
  outcome: 'allow_once',
  answers: { 'Which colour?': 'Violet' },
});

describe('a frame quote lifts when the turn showing it ends (ONL-2960)', () => {
  it('lifts at the end of a turn that wrote the page with Bash before placing the quote', () => {
    const { quotes, shown, lifts, clock } = book();
    const frame = { id: 'cc2780b3', kind: 'frame', homeUrl: 'http://localhost:4700/remix-hero.html' } as const;
    quotes.observe('/w', turnStarted());
    toolCall(quotes, 'b1', 'Bash');
    toolCall(quotes, 'b2', 'Bash');
    quotes.observe('/w', toolStart('c1', 'edit', 'mcp__studio__create_frame'));
    quotes.place('/w', frame, 'A hero for the remix landing page');
    quotes.observe('/w', toolEnd('c1'));
    for (const name of ['move_frame', 'capture_frame', 'frame_working', 'evaluate_in_frame', 'set_text', 'suggest_next_tasks']) {
      toolCall(quotes, name, `mcp__studio__${name}`);
    }
    expect(shown()).toEqual({ cc2780b3: 'A hero for the remix landing page' });
    clock.now = 9_000;
    quotes.observe('/w', turnEnded(2));
    expect(shown()).toEqual({});
    expect(lifts).toEqual([8_000]);
  });

  it('stays while the turn runs, through edits and page loads', () => {
    const { quotes, shown } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', HOME, 'A bakery site');
    edited(quotes);
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('lifts at the end of a turn that changed no files', () => {
    const { quotes, shown } = book();
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', turnEnded(0));
    expect(shown()).toEqual({});
  });

  it('stays when the turn ends on a question it announced, and lifts when the next turn ends', () => {
    const { quotes, shown } = book();
    quotes.place('/w', HOME, 'A bakery site');
    toolCall(quotes, 'q1', 'mcp__studio__waiting_on');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ f1: 'A bakery site' });
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    quotes.observe('/w', turnStarted());
    edited(quotes);
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({});
  });

  it('stays when the turn ends with a question still unanswered', () => {
    const { quotes, shown } = book();
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolStart('q1', 'other', 'AskUserQuestion'));
    quotes.observe('/w', questionAsked('q1'));
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('lifts when the question was answered inside the turn, or the agent went back to work after announcing it', () => {
    const answered = book();
    answered.quotes.place('/w', HOME, 'A bakery site');
    answered.quotes.observe('/w', toolStart('q1', 'other', 'AskUserQuestion'));
    answered.quotes.observe('/w', questionAsked('q1'));
    answered.quotes.observe('/w', questionAnswered('q1'));
    answered.quotes.observe('/w', turnEnded());
    expect(answered.shown()).toEqual({});

    const workedOn = book();
    workedOn.quotes.place('/w', HOME, 'A bakery site');
    toolCall(workedOn.quotes, 'q1', 'mcp__studio__waiting_on');
    edited(workedOn.quotes);
    workedOn.quotes.observe('/w', turnEnded(1));
    expect(workedOn.shown()).toEqual({});
  });

  it('waits for the page when the turn ends before it shows, then lifts on the frame’s next load', () => {
    const { quotes, shown, notShowing, lifts } = book();
    quotes.place('/w', HOME, 'A bakery site');
    notShowing.add('f1');
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({ f1: 'A bakery site' });
    quotes.guestLoaded('/w', 'f2');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({});
    expect(lifts).toHaveLength(1);
  });

  it('does not lift on a load while a later turn runs, and is judged again when that turn ends', () => {
    const { quotes, shown, notShowing } = book();
    quotes.place('/w', HOME, 'A bakery site');
    notShowing.add('f1');
    quotes.observe('/w', turnEnded());
    quotes.observe('/w', turnStarted());
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    notShowing.delete('f1');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
  });

  it('lifts only the frames whose page shows', () => {
    const { quotes, shown, notShowing } = book();
    quotes.place('/w', HOME, 'A bakery site');
    quotes.place('/w', { id: 'f2', kind: 'frame', homeUrl: 'http://localhost:4700/b' }, 'A pricing page');
    notShowing.add('f2');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ f2: 'A pricing page' });
  });
});

describe('a frame quote lifts the first time the agent looks at the frame (ONL-2960)', () => {
  it('lifts mid-turn on a look at a frame showing its page, timed from placement, and says a look lifted it', () => {
    const { quotes, shown, lifts, triggers, clock } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', HOME, 'A bakery site');
    clock.now = 4_000;
    quotes.looked('/w', 'f1');
    expect(shown()).toEqual({});
    expect(lifts).toEqual([3_000]);
    expect(triggers).toEqual(['look']);
    quotes.observe('/w', turnEnded());
    expect(lifts).toHaveLength(1);
  });

  it('keeps the quote on a look at a frame whose page is not showing, and lifts it when the turn ends on the page', () => {
    const { quotes, shown, triggers, notShowing } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', HOME, 'A bakery site');
    notShowing.add('f1');
    quotes.looked('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    notShowing.delete('f1');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
    expect(triggers).toEqual(['turn_end']);
  });

  it('lifts only the frame looked at', () => {
    const { quotes, shown } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', HOME, 'A bakery site');
    quotes.place('/w', { id: 'f2', kind: 'frame', homeUrl: 'http://localhost:4700/menu' }, 'A menu');
    quotes.looked('/w', 'f2');
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('lifts a quote on an artifact the agent looks at', () => {
    const { quotes, shown, liftedNodes } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', CARD, 'A loyalty card');
    quotes.looked('/w', 'a1');
    expect(shown()).toEqual({});
    expect(liftedNodes).toEqual(['artifact']);
  });

  it('lifts on a look while the turn waits on a question', () => {
    const { quotes, shown } = book();
    quotes.observe('/w', turnStarted());
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolStart('q1', 'other', 'mcp__studio__waiting_on'));
    quotes.looked('/w', 'f1');
    expect(shown()).toEqual({});
  });

  it('with quote-lift-at-turn-end off, a look lifts nothing', () => {
    const { quotes, shown, lifts } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.looked('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    expect(lifts).toEqual([]);
  });
});

describe('a frame quote with quote-lift-at-turn-end off: lifted by an edit made after it went up (ONL-2960)', () => {
  it('shows from the moment it is placed, with the turn counted as running', () => {
    const { quotes, emitted } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    expect(emitted).toEqual([{ byFrame: { f1: 'A bakery site' }, turnRunning: true }]);
  });

  it('stays through a turn that changed no files, and through the question it asked', () => {
    const { quotes, shown, lifts } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolStart('r1', 'read'));
    quotes.observe('/w', toolEnd('r1'));
    quotes.observe('/w', turnEnded(0));
    quotes.observe('/w', turnStarted());
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ f1: 'A bakery site' });
    expect(lifts).toEqual([]);
  });

  it('lifts on the frame’s next page load after an edit, timed from placement, and is wiped', () => {
    const { quotes, shown, lifts, clock, emitted } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
    edited(quotes);
    clock.now = 4_500;
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({});
    expect(lifts).toEqual([3_500]);
    expect(emitted.at(-1)).toEqual({ byFrame: {}, turnRunning: false });
  });

  it('does not lift on another frame’s load', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    edited(quotes);
    quotes.guestLoaded('/w', 'f2');
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('counts only an edit that completed', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolStart('w1', 'edit'));
    quotes.observe('/w', toolEnd('w1', 'failed'));
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('lifts at the end of a turn that edited, for a page that hot-reloads without a load', () => {
    const { quotes, shown, lifts } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    edited(quotes);
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
    expect(lifts).toHaveLength(1);
  });

  it('stays at the end of a turn whose only edits came before the quote went up', () => {
    const { quotes, shown, lifts } = book({ liftsAtTurnEnd: false });
    quotes.observe('/w', turnStarted());
    edited(quotes);
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({ f1: 'A bakery site' });
    expect(lifts).toEqual([]);
  });

  it('lifts at the end of the turn for an edit begun before the quote and completed after it', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.observe('/w', turnStarted());
    quotes.observe('/w', toolStart('w1', 'edit'));
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolEnd('w1'));
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({});
  });

  it('does not count the canvas call that placed it, nor any other canvas edit, as an edit', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.observe('/w', toolStart('c1', 'edit', 'mcp__studio__create_frame'));
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', toolEnd('c1'));
    quotes.observe('/w', toolStart('c2', 'edit', 'mcp__studio__rename_frame'));
    quotes.observe('/w', toolEnd('c2'));
    quotes.guestLoaded('/w', 'f1');
    quotes.observe('/w', turnEnded(2));
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('is replaced by a second quote on the same frame, which starts over', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    edited(quotes);
    quotes.place('/w', HOME, 'A pricing page');
    quotes.guestLoaded('/w', 'f1');
    expect(shown()).toEqual({ f1: 'A pricing page' });
  });
});

describe('a frame quote taken down without a lift (ONL-2960)', () => {
  it('is cleared by the agent, which reports whether there was one', () => {
    const { quotes, shown, lifts } = book();
    quotes.place('/w', HOME, 'A bakery site');
    expect(quotes.clear('/w', 'f1')).toBe(true);
    expect(quotes.clear('/w', 'f1')).toBe(false);
    expect(shown()).toEqual({});
    expect(lifts).toEqual([]);
  });

  it('goes with its frame when the frame is removed, turns into another kind, or is aimed elsewhere', () => {
    for (const doc of [docWith({}), docWith({ f1: 'text' }), docWith({ f1: { homeUrl: 'http://localhost:4700/pricing' } })]) {
      const { quotes, shown, lifts } = book();
      quotes.place('/w', HOME, 'A bakery site');
      quotes.documentChanged('/w', doc);
      expect(shown()).toEqual({});
      expect(lifts).toEqual([]);
    }
  });

  it('stays while its frame stays at the address it was placed on', () => {
    const { quotes, shown, emitted } = book();
    quotes.place('/w', HOME, 'A bakery site');
    quotes.documentChanged('/w', docWith({ f1: { homeUrl: HOME.homeUrl }, f2: { homeUrl: 'http://localhost:4700/b' } }));
    expect(shown()).toEqual({ f1: 'A bakery site' });
    expect(emitted).toHaveLength(1);
  });

  it('is forgotten with the project, and a forgotten project hears nothing more', () => {
    const { quotes, shown, emitted, lifts } = book();
    quotes.place('/w', HOME, 'A bakery site');
    quotes.forget('/w');
    edited(quotes);
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({});
    expect(emitted.at(-1)).toEqual({ byFrame: {}, turnRunning: false });
    expect(lifts).toEqual([]);
  });
});

describe('a quote on an artifact with quote-lift-at-turn-end off (ONL-2960)', () => {
  it('lifts on the artifact’s next page load after a write to that artifact, and says it was on an artifact', () => {
    const { quotes, shown, lifts, liftedNodes, clock } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', CARD, 'A pricing card');
    quotes.guestLoaded('/w', 'a1');
    expect(shown()).toEqual({ a1: 'A pricing card' });
    quotes.artifactWritten('/w', CARD_ID);
    expect(shown()).toEqual({ a1: 'A pricing card' });
    clock.now = 3_000;
    quotes.guestLoaded('/w', 'a1');
    expect(shown()).toEqual({});
    expect(lifts).toEqual([2_000]);
    expect(liftedNodes).toEqual(['artifact']);
  });

  it('lifts at the end of a turn that wrote it, when no load came', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', CARD, 'A pricing card');
    quotes.artifactWritten('/w', CARD_ID);
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
  });

  it('is not lifted by a file edit, which lifts only a frame’s quote', () => {
    const { quotes, shown, liftedNodes } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.place('/w', CARD, 'A pricing card');
    edited(quotes);
    quotes.guestLoaded('/w', 'a1');
    quotes.observe('/w', turnEnded(1));
    expect(shown()).toEqual({ a1: 'A pricing card' });
    expect(liftedNodes).toEqual(['frame']);
  });

  it('does not lift a frame’s quote when an artifact is written', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.place('/w', CARD, 'A pricing card');
    quotes.artifactWritten('/w', CARD_ID);
    quotes.guestLoaded('/w', 'f1');
    quotes.observe('/w', turnEnded(0));
    expect(shown()).toEqual({ f1: 'A bakery site' });
  });

  it('is not lifted by a write to another artifact', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', CARD, 'A pricing card');
    quotes.artifactWritten('/w', '99999999-4b5a-4968-8776-655443322110');
    quotes.guestLoaded('/w', 'a1');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ a1: 'A pricing card' });
  });

  it('stays while its node shows the artifact it was placed on', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', CARD, 'A pricing card');
    quotes.documentChanged('/w', docWith({ a1: { artifactId: CARD_ID } }));
    expect(shown()).toEqual({ a1: 'A pricing card' });
  });

  it('goes with its node when the node is removed, turns into another kind, or shows another artifact', () => {
    const other = { artifactId: '99999999-4b5a-4968-8776-655443322110' };
    for (const doc of [docWith({}), docWith({ a1: { homeUrl: 'http://localhost:4700/' } }), docWith({ a1: other })]) {
      const { quotes, shown, lifts } = book({ liftsAtTurnEnd: false });
      quotes.place('/w', CARD, 'A pricing card');
      quotes.documentChanged('/w', doc);
      expect(shown()).toEqual({});
      expect(lifts).toEqual([]);
    }
  });

  it('takes a frame’s quote away when that frame’s node becomes an artifact', () => {
    const { quotes, shown } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.documentChanged('/w', docWith({ f1: { artifactId: CARD_ID } }));
    expect(shown()).toEqual({});
  });
});

describe('a quote on an artifact lifts when the turn showing it ends (ONL-2960)', () => {
  it('lifts at the end of the turn, written or not, and says it was on an artifact', () => {
    const { quotes, shown, liftedNodes, notShowing } = book();
    quotes.place('/w', CARD, 'A pricing card');
    notShowing.add('a1');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
    expect(liftedNodes).toEqual(['artifact']);
  });

  it('stays when the turn ends on a question, and lifts when the next turn ends', () => {
    const { quotes, shown } = book();
    quotes.place('/w', CARD, 'A pricing card');
    toolCall(quotes, 'q1', 'mcp__studio__waiting_on');
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({ a1: 'A pricing card' });
    quotes.observe('/w', turnStarted());
    quotes.observe('/w', turnEnded());
    expect(shown()).toEqual({});
  });
});

describe('whether the quote’s turn is running (ONL-2960)', () => {
  it('ends with the turn and starts again with the next one', () => {
    const { quotes, emitted } = book({ liftsAtTurnEnd: false });
    quotes.place('/w', HOME, 'A bakery site');
    quotes.observe('/w', turnEnded(0));
    quotes.observe('/w', turnStarted());
    expect(emitted.map((view) => view.turnRunning)).toEqual([true, false, true]);
  });

  it('is never reported for a project with no quote', () => {
    const { quotes, emitted } = book();
    quotes.observe('/w', turnStarted());
    expect(quotes.view('/w')).toEqual({ byFrame: {}, turnRunning: false });
    expect(emitted).toEqual([]);
  });
});

describe('when Studio places a quoted frame for its own prompt (ONL-2960)', () => {
  const placing = { isOn: true, isBlank: true, starterPort: 4700, quote: '  A bakery site  ' };

  it('frames the starter with the trimmed quote', () => {
    expect(studioQuotePlacement(placing)).toEqual({ port: 4700, quote: 'A bakery site' });
  });

  it.each([
    ['the flag is off', { isOn: false }],
    ['the project is not blank', { isBlank: false }],
    ['the starter is not running', { starterPort: undefined }],
    ['the prompt carries no quote', { quote: undefined }],
    ['the quote is blank', { quote: '   ' }],
    ['the quote is past the limit', { quote: 'x'.repeat(161) }],
  ] as const)('places none when %s', (_reason, over) => {
    expect(studioQuotePlacement({ ...placing, ...over })).toBeUndefined();
  });
});

describe('what a quote can stand over (ONL-2960)', () => {
  it('is a frame by its address and an artifact by its id, and nothing else on the canvas', () => {
    const base = { pageId: 'page-1', name: 'Home', x: 0, y: 0, width: 100, height: 100, order: 0 };
    expect(quoteTargetOf({ ...base, id: 'f', kind: 'browser', content: { homeUrl: 'http://localhost:4700' } })).toEqual({ id: 'f', kind: 'frame', homeUrl: 'http://localhost:4700' });
    expect(quoteTargetOf({ ...base, id: 'a', kind: 'artifact', content: { artifactId: 'art-1', title: 'Board' } })).toEqual({ id: 'a', kind: 'artifact', artifactId: 'art-1' });
    expect(quoteTargetOf({ ...base, id: 's', kind: 'section', content: {} })).toBeUndefined();
  });
});
