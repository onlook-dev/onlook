import { describe, expect, it, spyOn } from 'bun:test';
import { TabBook } from './book.js';
import { composeTabs } from './compose.js';
import { logger } from './log.js';
import {
  awaitsFirstPaint, isWatched, PresentationMachine,
  type CoverPhase, type DeadlinePhase, type FirstPaintPhase, type PresentationEvent, type PresentationRefusal, type Verdict, type WarmPhase,
} from './presentation-machine.js';
import type { Tab } from './tab.js';
import { seatedTabs } from './test-support.js';
import { TabWindow } from './window.js';

/** The run in force in every seated phase, and one that is not. */
const RUN = 7;
const LATE = 3;

/** What a cell of a table says: the phase the event moves to, or why it moves nowhere. */
type Outcome<Name extends string> = Name | 'stayed' | 'stale' | 'refused';

function machineUnderTest() {
  const refusals: PresentationRefusal[] = [];
  return { machine: new PresentationMachine((refusal) => { refusals.push(refusal); }), refusals };
}

function expectCell(verdict: Verdict, refusals: PresentationRefusal[], outcome: string, event: string): void {
  const moved = outcome !== 'stayed' && outcome !== 'stale' && outcome !== 'refused';
  expect(verdict).toBe(moved ? 'moved' : outcome as Verdict);
  expect(refusals.map((refusal): string => refusal.event)).toEqual(outcome === 'refused' ? [event] : []);
}

describe('the first-paint watch of a Tab', () => {
  const PHASES = {
    none: undefined,
    held: { kind: 'held' },
    waiting: { kind: 'waiting', run: RUN, ready: false },
    loading: { kind: 'loading', run: RUN, ready: false },
    'waiting, ready': { kind: 'waiting', run: RUN, ready: true },
    'loading, ready': { kind: 'loading', run: RUN, ready: true },
  } satisfies Record<string, FirstPaintPhase | undefined>;
  type Name = keyof typeof PHASES;
  const COLUMNS = ['none', 'held', 'waiting', 'loading'] as const satisfies readonly Name[];

  const event = (type: string, run?: number) => (tab: Tab): PresentationEvent => ({ type, tab, ...(run === undefined ? {} : { run }) }) as PresentationEvent;

  /** One row per event, one cell per phase in `COLUMNS` order. */
  const TABLE: [string, (tab: Tab) => PresentationEvent, readonly Outcome<Name>[]][] = [
    ['held-back', event('held-back'), ['held', 'refused', 'refused', 'refused']],
    ['watch-started', event('watch-started', RUN), ['refused', 'waiting', 'refused', 'refused']],
    ['ui-ready', event('ui-ready', RUN), ['stale', 'stale', 'waiting, ready', 'loading, ready']],
    ['ui-ready from another run', event('ui-ready', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['navigated', event('navigated', RUN), ['stale', 'stale', 'stayed', 'stayed']],
    ['navigated from another run', event('navigated', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['handed-over', event('handed-over'), ['stayed', 'none', 'loading', 'stayed']],
    ['overdue', event('overdue', RUN), ['stale', 'stale', 'stayed', 'stayed']],
    ['overdue from another run', event('overdue', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['placed', event('placed', RUN), ['stale', 'stale', 'loading', 'refused']],
    ['placed from another run', event('placed', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['given-up', event('given-up', RUN), ['stale', 'stale', 'none', 'none']],
    ['given-up from another run', event('given-up', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['first-painted', event('first-painted', RUN), ['stale', 'stale', 'none', 'none']],
    ['first-painted from another run', event('first-painted', LATE), ['stale', 'stale', 'stale', 'stale']],
    ['view-gone', event('view-gone', RUN), ['stale', 'stale', 'none', 'none']],
    // A view's `destroyed` ends the watch on that view and no other: one from an earlier view changes nothing.
    ['view-gone from another run', event('view-gone', LATE), ['stale', 'stale', 'stale', 'stale']],
    // A discarded view takes its watch with it.
    ['view-discarded', event('view-discarded'), ['stayed', 'none', 'none', 'none']],
  ];

  for (const [name, make, row] of TABLE) {
    for (const [index, outcome] of row.entries()) {
      const from = COLUMNS[index]!;
      it(`${name}, ${from}: ${outcome}`, () => {
        const { machine, refusals } = machineUnderTest();
        const seated = PHASES[from];
        const tab: Tab = { id: 'a', isWorking: false, ...(seated === undefined ? {} : { firstPaint: seated }) };
        const made = make(tab);
        const verdict = machine.dispatch(made);
        expectCell(verdict, refusals, outcome, made.type);
        const moved = outcome !== 'stayed' && outcome !== 'stale' && outcome !== 'refused';
        expect(tab.firstPaint).toEqual(moved ? PHASES[outcome] : seated);
      });
    }
  }

  it('a navigation takes back a renderer\'s report, and only that', () => {
    for (const kind of ['waiting', 'loading'] as const) {
      const { machine } = machineUnderTest();
      const tab: Tab = { id: 'a', isWorking: false, firstPaint: { kind, run: RUN, ready: true } };
      expect(machine.dispatch({ type: 'navigated', tab, run: RUN })).toBe('moved');
      expect(tab.firstPaint).toEqual({ kind, run: RUN, ready: false });
    }
  });

  it('a second report from the same renderer changes nothing', () => {
    const { machine } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false, firstPaint: { kind: 'waiting', run: RUN, ready: true } };
    expect(machine.dispatch({ type: 'ui-ready', tab, run: RUN })).toBe('stayed');
  });

  it('a hand-over and a placement keep what the renderer reported', () => {
    const { machine } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false, firstPaint: { kind: 'waiting', run: RUN, ready: true } };
    machine.dispatch({ type: 'handed-over', tab });
    expect(tab.firstPaint).toEqual({ kind: 'loading', run: RUN, ready: true });
    const waiting: Tab = { id: 'b', isWorking: false, firstPaint: { kind: 'waiting', run: RUN, ready: true } };
    machine.dispatch({ type: 'placed', tab: waiting, run: RUN });
    expect(waiting.firstPaint).toEqual({ kind: 'loading', run: RUN, ready: true });
  });

  it('holds a Tab back while it is held or waiting, and can ask it for its frame while it is waiting or loading', () => {
    const read = (name: Name) => {
      const seated = PHASES[name];
      const tab: Tab = { id: 'a', isWorking: false, ...(seated === undefined ? {} : { firstPaint: seated }) };
      return { awaits: awaitsFirstPaint(tab), watched: isWatched(tab) };
    };
    expect(read('none')).toEqual({ awaits: false, watched: false });
    expect(read('held')).toEqual({ awaits: true, watched: false });
    expect(read('waiting')).toEqual({ awaits: true, watched: true });
    expect(read('loading')).toEqual({ awaits: false, watched: true });
  });
});

describe('the cover over a revealed Tab', () => {
  const PHASES = {
    none: { kind: 'none' },
    covering: { kind: 'covering', tabId: 'a', run: RUN },
    settling: { kind: 'settling', tabId: 'a', run: RUN },
  } satisfies Record<string, CoverPhase>;
  type Name = keyof typeof PHASES;
  const COLUMNS = ['none', 'covering', 'settling'] as const satisfies readonly Name[];

  /** How to bring a fresh machine to each phase, through its own door. */
  const reach: Record<Name, PresentationEvent[]> = {
    none: [],
    covering: [{ type: 'cover-raised', tabId: 'a', run: RUN }],
    settling: [{ type: 'cover-raised', tabId: 'a', run: RUN }, { type: 'cover-lifted', run: RUN }],
  };

  const TABLE: [string, PresentationEvent, readonly Outcome<Name>[]][] = [
    ['cover-raised', { type: 'cover-raised', tabId: 'a', run: RUN }, ['covering', 'refused', 'refused']],
    ['cover-handed-over', { type: 'cover-handed-over' }, ['refused', 'settling', 'stayed']],
    ['cover-lifted', { type: 'cover-lifted', run: RUN }, ['stale', 'settling', 'stayed']],
    ['cover-lifted from another run', { type: 'cover-lifted', run: LATE }, ['stale', 'stale', 'stale']],
    ['cover-frame-due', { type: 'cover-frame-due', run: RUN }, ['stale', 'stayed', 'stayed']],
    ['cover-frame-due from another run', { type: 'cover-frame-due', run: LATE }, ['stale', 'stale', 'stale']],
    ['cover-painted', { type: 'cover-painted', run: RUN }, ['stale', 'none', 'none']],
    ['cover-painted from another run', { type: 'cover-painted', run: LATE }, ['stale', 'stale', 'stale']],
    ['cover-dropped', { type: 'cover-dropped' }, ['stayed', 'none', 'none']],
  ];

  for (const [name, event, row] of TABLE) {
    for (const [index, outcome] of row.entries()) {
      const from = COLUMNS[index]!;
      it(`${name}, ${from}: ${outcome}`, () => {
        const { machine, refusals } = machineUnderTest();
        for (const step of reach[from]) machine.dispatch(step);
        expect(machine.cover).toEqual(PHASES[from]);
        const verdict = machine.dispatch(event);
        expectCell(verdict, refusals, outcome, event.type);
        const moved = outcome !== 'stayed' && outcome !== 'stale' && outcome !== 'refused';
        expect(machine.cover).toEqual(moved ? PHASES[outcome] : PHASES[from]);
      });
    }
  }
});

describe('the deadline for the selected Tab to reach the screen', () => {
  const PHASES = {
    idle: { kind: 'idle' },
    armed: { kind: 'armed', tabId: 'a', run: RUN },
  } satisfies Record<string, DeadlinePhase>;
  type Name = keyof typeof PHASES;
  const COLUMNS = ['idle', 'armed'] as const satisfies readonly Name[];
  const reach: Record<Name, PresentationEvent[]> = { idle: [], armed: [{ type: 'deadline-armed', tabId: 'a', run: RUN }] };

  const TABLE: [string, PresentationEvent, readonly Outcome<Name>[]][] = [
    ['deadline-armed', { type: 'deadline-armed', tabId: 'a', run: RUN }, ['armed', 'refused']],
    ['deadline-cleared', { type: 'deadline-cleared' }, ['stayed', 'idle']],
    ['deadline-elapsed', { type: 'deadline-elapsed', run: RUN }, ['stale', 'idle']],
    ['deadline-elapsed from another run', { type: 'deadline-elapsed', run: LATE }, ['stale', 'stale']],
  ];

  for (const [name, event, row] of TABLE) {
    for (const [index, outcome] of row.entries()) {
      const from = COLUMNS[index]!;
      it(`${name}, ${from}: ${outcome}`, () => {
        const { machine, refusals } = machineUnderTest();
        for (const step of reach[from]) machine.dispatch(step);
        const verdict = machine.dispatch(event);
        expectCell(verdict, refusals, outcome, event.type);
        const moved = outcome !== 'stayed' && outcome !== 'stale' && outcome !== 'refused';
        expect(machine.deadline).toEqual(moved ? PHASES[outcome] : PHASES[from]);
      });
    }
  }
});

describe('the background warm of a restored Tab', () => {
  const PHASES = {
    none: undefined,
    loading: { phase: 'loading', run: RUN, turn: 'held' },
    'loading, turn passed': { phase: 'loading', run: RUN, turn: 'passed' },
    ready: { phase: 'ready', run: RUN, turn: 'held' },
    'ready, turn passed': { phase: 'ready', run: RUN, turn: 'passed' },
    primed: { phase: 'primed', run: RUN, turn: 'passed' },
  } satisfies Record<string, WarmPhase | undefined>;
  type Name = keyof typeof PHASES;
  const COLUMNS = ['none', 'loading', 'loading, turn passed', 'ready', 'ready, turn passed', 'primed'] as const satisfies readonly Name[];

  const event = (type: string, run?: number) => (tab: Tab): PresentationEvent => ({ type, tab, ...(run === undefined ? {} : { run }) }) as PresentationEvent;

  const TABLE: [string, (tab: Tab) => PresentationEvent, readonly Outcome<Name>[]][] = [
    ['warm-started', event('warm-started', RUN), ['loading', 'refused', 'refused', 'refused', 'refused', 'refused']],
    ['warm-ready', event('warm-ready', RUN), ['stale', 'ready', 'ready, turn passed', 'refused', 'refused', 'refused']],
    ['warm-ready from another run', event('warm-ready', LATE), ['stale', 'stale', 'stale', 'stale', 'stale', 'stale']],
    ['warm-primed', event('warm-primed', RUN), ['stale', 'refused', 'refused', 'primed', 'primed', 'refused']],
    ['warm-primed from another run', event('warm-primed', LATE), ['stale', 'stale', 'stale', 'stale', 'stale', 'stale']],
    ['warm-overdue', event('warm-overdue', RUN), ['stale', 'loading, turn passed', 'refused', 'ready, turn passed', 'refused', 'refused']],
    ['warm-overdue from another run', event('warm-overdue', LATE), ['stale', 'stale', 'stale', 'stale', 'stale', 'stale']],
    ['warm-view-gone', event('warm-view-gone', RUN), ['stale', 'none', 'none', 'none', 'none', 'none']],
    ['warm-view-gone from another run', event('warm-view-gone', LATE), ['stale', 'stale', 'stale', 'stale', 'stale', 'stale']],
    ['warm-ended', event('warm-ended'), ['stayed', 'none', 'none', 'none', 'none', 'none']],
  ];

  for (const [name, make, row] of TABLE) {
    for (const [index, outcome] of row.entries()) {
      const from = COLUMNS[index]!;
      it(`${name}, ${from}: ${outcome}`, () => {
        const { machine, refusals } = machineUnderTest();
        const seated = PHASES[from];
        const tab: Tab = { id: 'a', isWorking: false, ...(seated === undefined ? {} : { warming: seated }) };
        const made = make(tab);
        const verdict = machine.dispatch(made);
        expectCell(verdict, refusals, outcome, made.type);
        const moved = outcome !== 'stayed' && outcome !== 'stale' && outcome !== 'refused';
        expect(tab.warming).toEqual(moved ? PHASES[outcome] : seated);
      });
    }
  }
});

describe('which Tab is on screen, and the paint-failure mark', () => {
  it('shows one Tab at a time and forgets only the one it shows', () => {
    const { machine } = machineUnderTest();
    expect(machine.shown).toBeUndefined();
    expect(machine.dispatch({ type: 'shown', tabId: 'a' })).toBe('moved');
    expect(machine.dispatch({ type: 'shown', tabId: 'a' })).toBe('stayed');
    expect(machine.dispatch({ type: 'forgotten', tabId: 'b' })).toBe('stayed');
    expect(machine.shown).toBe('a');
    expect(machine.dispatch({ type: 'shown', tabId: 'b' })).toBe('moved');
    expect(machine.shown).toBe('b');
    expect(machine.dispatch({ type: 'forgotten', tabId: 'b' })).toBe('moved');
    expect(machine.shown).toBeUndefined();
  });

  it('marks a Tab whose paint never came and clears the mark, each once', () => {
    const { machine } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false };
    expect(machine.dispatch({ type: 'paint-recovered', tab })).toBe('stayed');
    expect(machine.dispatch({ type: 'paint-failed', tab })).toBe('moved');
    expect(tab.paintFailed).toBe(true);
    expect(machine.dispatch({ type: 'paint-failed', tab })).toBe('stayed');
    expect(machine.dispatch({ type: 'paint-recovered', tab })).toBe('moved');
    expect(tab.paintFailed).toBeUndefined();
  });
});

describe('runs and refusals', () => {
  it('hands out a new run number every time', () => {
    const { machine } = machineUnderTest();
    const runs = [machine.nextRun(), machine.nextRun(), machine.nextRun()];
    expect(new Set(runs).size).toBe(3);
    expect(runs[0]! < runs[1]! && runs[1]! < runs[2]!).toBe(true);
  });

  it('drops the answers of a watch that is over, whichever they are', () => {
    const { machine, refusals } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false };
    machine.dispatch({ type: 'held-back', tab });
    const run = machine.nextRun();
    machine.dispatch({ type: 'watch-started', tab, run });
    machine.dispatch({ type: 'first-painted', tab, run });
    for (const type of ['ui-ready', 'navigated', 'overdue', 'placed', 'given-up', 'first-painted', 'view-gone'] as const) {
      expect(machine.dispatch({ type, tab, run })).toBe('stale');
    }
    expect(tab.firstPaint).toBeUndefined();
    expect(refusals).toEqual([]);
  });

  it('a discarded view\'s late answers, its `destroyed` included, never reach the watch on the view that replaced it', () => {
    const { machine, refusals } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false };
    machine.dispatch({ type: 'held-back', tab });
    const first = machine.nextRun();
    machine.dispatch({ type: 'watch-started', tab, run: first });
    machine.dispatch({ type: 'view-discarded', tab });
    expect(tab.firstPaint).toBeUndefined();
    machine.dispatch({ type: 'held-back', tab });
    const second = machine.nextRun();
    machine.dispatch({ type: 'watch-started', tab, run: second });
    for (const type of ['ui-ready', 'navigated', 'overdue', 'placed', 'given-up', 'first-painted', 'view-gone'] as const) {
      expect(machine.dispatch({ type, tab, run: first })).toBe('stale');
    }
    expect(tab.firstPaint).toEqual({ kind: 'waiting', run: second, ready: false });
    expect(refusals).toEqual([]);
  });

  it('drops the answers of a cover that was replaced', () => {
    const { machine, refusals } = machineUnderTest();
    const first = machine.nextRun();
    machine.dispatch({ type: 'cover-raised', tabId: 'a', run: first });
    machine.dispatch({ type: 'cover-dropped' });
    const second = machine.nextRun();
    machine.dispatch({ type: 'cover-raised', tabId: 'b', run: second });
    for (const type of ['cover-lifted', 'cover-frame-due', 'cover-painted'] as const) {
      expect(machine.dispatch({ type, run: first })).toBe('stale');
    }
    expect(machine.cover).toEqual({ kind: 'covering', tabId: 'b', run: second });
    expect(refusals).toEqual([]);
  });

  it('drops a renderer\'s report that arrives after the press ended its warm', () => {
    const { machine, refusals } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false };
    const run = machine.nextRun();
    machine.dispatch({ type: 'warm-started', tab, run });
    machine.dispatch({ type: 'warm-ended', tab });
    expect(machine.dispatch({ type: 'warm-ready', tab, run })).toBe('stale');
    expect(tab.warming).toBeUndefined();
    expect(refusals).toEqual([]);
  });

  it('reports a refused step once, with the event, the phase and the Tab, and changes nothing', () => {
    const { machine, refusals } = machineUnderTest();
    const tab: Tab = { id: 'a', isWorking: false, firstPaint: { kind: 'held' } };
    expect(machine.dispatch({ type: 'held-back', tab })).toBe('refused');
    expect(refusals).toEqual([{ event: 'held-back', phase: 'held', tabId: 'a' }]);
    expect(tab.firstPaint).toEqual({ kind: 'held' });
  });

  it('never mutates a phase: a re-keyed record carries it over, and an answer moves only the record it was given', () => {
    const { machine } = machineUnderTest();
    const book = new TabBook(undefined);
    const tab: Tab = { id: 'a', isWorking: false };
    book.enter(tab);
    machine.dispatch({ type: 'held-back', tab });
    const run = machine.nextRun();
    machine.dispatch({ type: 'watch-started', tab, run });
    const moved = book.rekey(tab, 'b');
    expect(moved.firstPaint).toBe(tab.firstPaint);
    machine.dispatch({ type: 'ui-ready', tab, run });
    expect(tab.firstPaint).toEqual({ kind: 'waiting', run, ready: true });
    expect(moved.firstPaint).toEqual({ kind: 'waiting', run, ready: false });
  });
});

describe('a refused step in the tab host', () => {
  it('is logged and never thrown in the app', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      const pieces = composeTabs({
        window: (events) => Object.assign(Object.create(TabWindow.prototype) as TabWindow, { events }),
        saved: undefined,
        confirmClose: async () => true,
        retire: () => undefined,
      });
      const tab: Tab = { id: 'a', isWorking: false };
      pieces.presentation.holdBack(tab);
      expect(() => pieces.presentation.holdBack(tab)).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('refused a tab presentation event', { tab_id: 'a', event: 'held-back', phase: 'held' });
      expect(tab.firstPaint).toEqual({ kind: 'held' });
    } finally {
      warn.mockRestore();
    }
  });

  it('fails a suite seated through `seatedTabs`', () => {
    const host = seatedTabs();
    const tab: Tab = { id: 'a', isWorking: false };
    host.holdBack(tab);
    expect(() => host.holdBack(tab)).toThrow('the presentation machine refused `held-back` in phase `held`');
  });
});
