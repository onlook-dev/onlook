import { afterEach, describe, expect, it, jest } from 'bun:test';
import type { ProjectCreateState } from '@studio/events';

import { footGrowth, footHoldsPill, footSeat, footTipShown, holdTip, inspireTipPreempted, pickTip, promptWaitsOnPick, forgetHeldTips, setupHidesRunControl, TIP_MIN_SHOWN_MS, tipResolution, useHeldTipStore, type ResolutionInput } from './footSeat.js';
import { scrollTipFrameLanded } from './scrollTipStore.js';
import { OPEN_MOMENT } from '../tips/moment.js';
import { clearTipRecords } from '../tips/early.js';

const BLANK_OPEN = {
  isFootOn: true,
  setup: null,
  isTipOn: true,
  isBlankProject: true,
  tip: 'open',
  isAgentWorking: false,
  heldTip: null,
  isInviteTipOn: true,
  isInvitePending: false,
  needsYou: false,
  isOfferingNextTasks: false,
  isBeatOver: true,
  hasStatusLines: false,
  isScrollTipOn: true,
  isScrollFrameLanded: false,
  isPromptTipOn: true,
  isEarlyTipAudience: true,
  wasPromptShown: false,
  isPromptEnded: false,
  isPromptDue: false,
  isAppLive: false,
  moment: OPEN_MOMENT,
} as const;
const IMPORTED = { ...BLANK_OPEN, isBlankProject: false, tip: 'spent' } as const;
const STATUS = { kind: 'agent-status' } as const;
const INVITED = { ...IMPORTED, isInvitePending: true } as const;

describe('the Left Rail foot, a tip above its seat (ONL-2995)', () => {
  it('draws the inspiration tip above the status list on a blank project', () => {
    expect(footSeat(BLANK_OPEN)).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('keeps the inspiration tip while the agent works', () => {
    expect(footSeat({ ...BLANK_OPEN, isAgentWorking: true })).toEqual({ seat: STATUS, tip: 'inspire' });
    expect(footSeat({ ...BLANK_OPEN, isAgentWorking: true, heldTip: 'inspire' })).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('draws no tip on a project that did not start blank', () => {
    expect(footSeat({ ...BLANK_OPEN, isBlankProject: false })).toEqual({ seat: STATUS, tip: null });
  });

  it('drops the tip once it is spent, and it never returns', () => {
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent', heldTip: 'inspire' })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent' })).toEqual({ seat: STATUS, tip: null });
  });

  it('keeps the tip while it folds away after a press', () => {
    expect(footSeat({ ...BLANK_OPEN, tip: 'leaving', heldTip: 'inspire', isAgentWorking: true })).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('never draws the tip with its kill switch off, even mid-fold', () => {
    expect(footSeat({ ...BLANK_OPEN, isTipOn: false })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, isTipOn: false, tip: 'leaving', heldTip: 'inspire' })).toEqual({ seat: STATUS, tip: null });
  });

  it('draws the tip alone with rail-foot off', () => {
    expect(footSeat({ ...BLANK_OPEN, isFootOn: false })).toEqual({ seat: null, tip: 'inspire' });
    expect(footSeat({ ...BLANK_OPEN, isFootOn: false, tip: 'spent' })).toEqual({ seat: null, tip: null });
  });

  it('draws the tip above setup', () => {
    const running = { state: 'running', at: 2 } as const;
    expect(footSeat({ ...BLANK_OPEN, setup: running })).toEqual({ seat: { kind: 'setup', progress: running }, tip: 'inspire' });
  });
});

describe('one tip at a time, and the one up keeps its place (ONL-2995)', () => {
  const ORDER = ['earlier', 'later'] as const;
  const DUE = { due: true, staying: true };
  const GONE = { due: false, staying: false };
  const STAYING = { due: false, staying: true };

  it('shows the first due tip in order when none is up', () => {
    expect(pickTip(null, ORDER, { earlier: DUE, later: DUE })).toBe('earlier');
    expect(pickTip(null, ORDER, { earlier: GONE, later: DUE })).toBe('later');
  });

  it('keeps the tip that is up when one earlier in order becomes due', () => {
    expect(pickTip('later', ORDER, { earlier: DUE, later: STAYING })).toBe('later');
  });

  it('hands the place on once the tip that was up stops staying', () => {
    expect(pickTip('later', ORDER, { earlier: DUE, later: GONE })).toBe('earlier');
    expect(pickTip('later', ORDER, { earlier: GONE, later: GONE })).toBeNull();
  });

  it('does not bring up a tip that may only stay', () => {
    expect(pickTip(null, ORDER, { earlier: STAYING, later: GONE })).toBeNull();
  });
});

describe('the notification invite as a tip at the foot (ONL-2995)', () => {
  it('draws the invite above the status list when it is pending and the agent is idle', () => {
    expect(footSeat(INVITED)).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('draws no invite with invite-tip off', () => {
    expect(footSeat({ ...INVITED, isInviteTipOn: false })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, isInviteTipOn: false, heldTip: 'invite' })).toEqual({ seat: STATUS, tip: null });
  });

  it('draws no invite unless main has it pending, and drops it once acted on', () => {
    expect(footSeat({ ...INVITED, isInvitePending: false })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, isInvitePending: false, heldTip: 'invite' })).toEqual({ seat: STATUS, tip: null });
  });

  it('does not first appear while the agent works, and stays through a turn once up', () => {
    expect(footSeat({ ...INVITED, isAgentWorking: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, isAgentWorking: true, heldTip: 'invite' })).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('does not first appear while a question or approval waits on the person, and one already up stays until it resolves', () => {
    expect(footSeat({ ...INVITED, needsYou: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, needsYou: true, heldTip: 'invite' })).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('gives way to setup', () => {
    const running = { state: 'running', at: 2 } as const;
    expect(footSeat({ ...INVITED, setup: running })).toEqual({ seat: { kind: 'setup', progress: running }, tip: null });
    expect(footSeat({ ...INVITED, setup: running, heldTip: 'invite' })).toEqual({ seat: { kind: 'setup', progress: running }, tip: null });
  });

  it('draws alone with rail-foot off', () => {
    expect(footSeat({ ...INVITED, isFootOn: false })).toEqual({ seat: null, tip: 'invite' });
  });

  it('waits behind the inspiration tip when both are due', () => {
    expect(footSeat({ ...BLANK_OPEN, isInvitePending: true })).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('keeps its place when the inspiration tip becomes due after it', () => {
    expect(footSeat({ ...BLANK_OPEN, isInvitePending: true, heldTip: 'invite' })).toEqual({ seat: STATUS, tip: 'invite' });
  });
});

describe('setup at the Left Rail foot (ONL-2961)', () => {
  it('is setup while an import runs, with the step under way, as the agent works', () => {
    expect(footSeat({ ...IMPORTED, isAgentWorking: true, setup: { state: 'running', at: 3 } })).toEqual({ seat: { kind: 'setup', progress: { state: 'running', at: 3 } }, tip: null });
  });

  it('is setup when install or start failed, naming the step', () => {
    const failed = { state: 'failed', at: 2, failure: { step: 2, stage: 'install' } } as const;
    expect(footSeat({ ...IMPORTED, setup: failed })).toEqual({ seat: { kind: 'setup', progress: failed }, tip: null });
  });

  it('yields once the app is up, before any import, and for a copy that failed before the project existed', () => {
    expect(footSeat({ ...IMPORTED, setup: { state: 'up', at: 4 } })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...IMPORTED, setup: null })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...IMPORTED, setup: { state: 'failed', at: 1, failure: { step: 1 } } })).toEqual({ seat: STATUS, tip: null });
  });

  it('has no seat with rail-foot off, even while an import sets up', () => {
    expect(footSeat({ ...IMPORTED, isFootOn: false, setup: { state: 'running', at: 2 } })).toEqual({ seat: null, tip: null });
  });
});

describe('the toolbar’s Start during setup (ONL-2961)', () => {
  const workspace = {} as Extract<ProjectCreateState, { kind: 'starting' }>['workspace'];
  const starting: ProjectCreateState = { kind: 'starting', workspace };
  const failed: ProjectCreateState = { kind: 'failed', sourceRepoName: 'site', phase: 'installing' };

  it('leaves while the import’s own setup runs', () => {
    expect(setupHidesRunControl({ state: 'running', at: 2 }, starting)).toBe(true);
  });

  it('stays for a run after the setup failed, since it is that run’s Stop', () => {
    expect(setupHidesRunControl({ state: 'running', at: 2 }, failed)).toBe(false);
  });

  it('stays for a reopened or restarted project’s run, since it is that run’s Stop', () => {
    expect(setupHidesRunControl({ state: 'running', at: 3 }, null)).toBe(false);
    expect(setupHidesRunControl({ state: 'running', at: 2 }, { kind: 'ready', workspace })).toBe(false);
  });

  it('comes back when setup fails or the app is up', () => {
    expect(setupHidesRunControl({ state: 'failed', at: 3, failure: { step: 3 } }, failed)).toBe(false);
    expect(setupHidesRunControl({ state: 'up', at: 4 }, starting)).toBe(false);
    expect(setupHidesRunControl(null, null)).toBe(false);
  });
});

describe('whether the notification invite is on screen', () => {
  it('shows only while it holds the foot of a visible Designs panel', () => {
    const SEATED = { tip: 'invite', isLeftPanelHidden: false, leftPanelView: 'designs' } as const;
    expect(footTipShown('invite', SEATED)).toBe(true);
    expect(footTipShown('invite', { ...SEATED, isLeftPanelHidden: true })).toBe(false);
    expect(footTipShown('invite', { ...SEATED, leftPanelView: 'code' })).toBe(false);
    expect(footTipShown('inspire', SEATED)).toBe(false);
  });
});

describe('the scroll tip at the foot (ONL-2960)', () => {
  const LANDED = { ...BLANK_OPEN, tip: 'spent', isScrollFrameLanded: true } as const;

  it('shows once the inspiration Frame from the tip has landed, and holds through a turn', () => {
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent' })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat(LANDED)).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...LANDED, isAgentWorking: true, heldTip: 'scroll' })).toEqual({ seat: STATUS, tip: 'scroll' });
  });

  it('never shows with its kill switch off, or above setup', () => {
    expect(footSeat({ ...LANDED, isScrollTipOn: false })).toEqual({ seat: STATUS, tip: null });
    const running = { state: 'running', at: 2 } as const;
    expect(footSeat({ ...LANDED, setup: running })).toEqual({ seat: { kind: 'setup', progress: running }, tip: null });
  });

  it('counts the Frame as landed only once its flight is over and while it is on the canvas', () => {
    const nodes = [{ id: 'f1' }];
    expect(scrollTipFrameLanded('f1', { nodes, inspiration: { frameId: 'f1' } })).toBe(false);
    expect(scrollTipFrameLanded('f1', { nodes, inspiration: null })).toBe(true);
    expect(scrollTipFrameLanded('f1', { nodes: [], inspiration: null })).toBe(false);
    expect(scrollTipFrameLanded(null, { nodes, inspiration: null })).toBe(false);
  });
});

describe('no tip first appears while the agent waits on the person (ONL-2960)', () => {
  const SCROLL_DUE = { ...IMPORTED, isScrollFrameLanded: true } as const;

  it('keeps every tip from first appearing while a question or approval is parked', () => {
    expect(footSeat({ ...SCROLL_DUE, needsYou: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, needsYou: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, needsYou: true })).toEqual({ seat: STATUS, tip: null });
  });

  it('leaves a tip already up in place when the ask arrives, for its resolution to end', () => {
    expect(footSeat({ ...SCROLL_DUE, heldTip: 'scroll', needsYou: true })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...BLANK_OPEN, heldTip: 'inspire', needsYou: true })).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('keeps a tip from first appearing while next-task cards are open', () => {
    expect(footSeat({ ...SCROLL_DUE, isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: null });
  });

  it('leaves a tip already up beside next-task cards, through the turn that offers them and the one a tap starts', () => {
    const scrollUp = { ...SCROLL_DUE, heldTip: 'scroll' } as const;
    expect(footSeat({ ...scrollUp, isAgentWorking: true, isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...scrollUp, isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...scrollUp, isAgentWorking: true })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...INVITED, heldTip: 'invite', isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('lets a due tip show once the ask closes', () => {
    expect(footSeat(SCROLL_DUE)).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat(INVITED)).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('lets the inspiration tip finish folding away after a press', () => {
    expect(footSeat({ ...BLANK_OPEN, tip: 'leaving', heldTip: 'inspire', isOfferingNextTasks: true })).toEqual({ seat: STATUS, tip: 'inspire' });
  });
});

describe('a tip up resolves when its moment ends without the person acting on it (ONL-2960)', () => {
  const UP: ResolutionInput = { heldTip: 'scroll', tipUp: 'scroll', isHeldSettled: true, needsYou: false, needsAnswer: false, isBlankProject: false, tip: 'spent', hasCanvasObjects: true, isPromptStaying: true, isPromptEnded: false };
  const INSPIRE_UP: ResolutionInput = { ...UP, heldTip: 'inspire', tipUp: 'inspire', isBlankProject: true, tip: 'open', hasCanvasObjects: false };
  const PROMPT_UP: ResolutionInput = { ...UP, heldTip: 'prompt', tipUp: 'prompt' };

  it('resolves any tip up but the inspiration tip once a question or an approval arrives, naming which', () => {
    for (const heldTip of ['scroll', 'prompt', 'invite'] as const) {
      expect(tipResolution({ ...UP, heldTip, needsYou: true, needsAnswer: true })).toEqual({ tip: heldTip, reason: 'question' });
      expect(tipResolution({ ...UP, heldTip, needsYou: true })).toEqual({ tip: heldTip, reason: 'approval' });
    }
  });

  it('resolves the inspiration tip once the canvas gets an object some other way', () => {
    expect(tipResolution({ ...INSPIRE_UP, hasCanvasObjects: true })).toEqual({ tip: 'inspire', reason: 'other_path' });
  });

  it('leaves a tip up through the agent working and through next-task cards, which it never sees', () => {
    expect(tipResolution(UP)).toBeNull();
    expect(tipResolution(INSPIRE_UP)).toBeNull();
  });

  it('waits until the tip has been up for its minimum before an ask or another path ends it', () => {
    expect(tipResolution({ ...UP, isHeldSettled: false, needsYou: true })).toBeNull();
    expect(tipResolution({ ...INSPIRE_UP, isHeldSettled: false, hasCanvasObjects: true })).toBeNull();
  });

  it('resolves nothing when no tip is up, or for an inspiration tip already folding away', () => {
    expect(tipResolution({ ...UP, heldTip: null, needsYou: true })).toBeNull();
    expect(tipResolution({ ...INSPIRE_UP, tip: 'leaving', hasCanvasObjects: true })).toBeNull();
  });

  it('keeps the inspiration tip up through a question or an approval, which it stays above until used or dismissed', () => {
    expect(tipResolution({ ...INSPIRE_UP, needsYou: true, needsAnswer: true })).toBeNull();
    expect(tipResolution({ ...INSPIRE_UP, needsYou: true })).toBeNull();
  });

  it('resolves the prompt tip the moment its cards go, as a pick or anything else takes them, without waiting its minimum', () => {
    const left = { ...PROMPT_UP, tipUp: null, isPromptStaying: false } as const;
    expect(tipResolution(left)).toEqual({ tip: 'prompt', reason: 'other_path' });
    expect(tipResolution({ ...left, isHeldSettled: false })).toEqual({ tip: 'prompt', reason: 'other_path' });
  });

  it('sends nothing more for a prompt tip that went because it was used, dismissed or ran out', () => {
    expect(tipResolution({ ...PROMPT_UP, tipUp: null, isPromptStaying: false, isPromptEnded: true })).toBeNull();
    expect(tipResolution(PROMPT_UP)).toBeNull();
  });

  it('spends an inspiration tip that never came up once the canvas gets an object, and resolves nothing for it', () => {
    const unseen = { ...INSPIRE_UP, heldTip: null, tipUp: null, hasCanvasObjects: true } as const;
    expect(tipResolution(unseen)).toBeNull();
    expect(tipResolution({ ...unseen, heldTip: 'invite', tipUp: 'invite', isHeldSettled: false })).toBeNull();
    expect(inspireTipPreempted(unseen)).toBe(true);
    expect(inspireTipPreempted({ ...unseen, tipUp: 'invite' })).toBe(true);
    expect(inspireTipPreempted({ ...unseen, hasCanvasObjects: false })).toBe(false);
    expect(inspireTipPreempted({ ...unseen, tip: 'spent' })).toBe(false);
    expect(inspireTipPreempted({ ...unseen, isBlankProject: false })).toBe(false);
    expect(inspireTipPreempted({ ...INSPIRE_UP, hasCanvasObjects: true })).toBe(false);
  });
});

describe('a tip up settles after its minimum time on screen (ONL-2960)', () => {
  afterEach(() => {
    forgetHeldTips();
    jest.useRealTimers();
  });
  const settled = (path: string) => useHeldTipStore.getState().held[path]?.isSettled ?? null;

  it('is forgotten by Reset tips, timer and all', () => {
    jest.useFakeTimers();
    holdTip('/a', 'invite');
    clearTipRecords();
    expect(useHeldTipStore.getState().held).toStrictEqual({});
    jest.advanceTimersByTime(TIP_MIN_SHOWN_MS);
    expect(settled('/a')).toBeNull();
  });

  it('settles the tip up once it has held the foot for the minimum, and starts over for the next tip', () => {
    jest.useFakeTimers();
    holdTip('/p', 'scroll');
    jest.advanceTimersByTime(TIP_MIN_SHOWN_MS - 1);
    expect(settled('/p')).toBe(false);
    jest.advanceTimersByTime(1);
    expect(settled('/p')).toBe(true);
    holdTip('/p', 'invite');
    expect(settled('/p')).toBe(false);
    jest.advanceTimersByTime(TIP_MIN_SHOWN_MS);
    expect(settled('/p')).toBe(true);
  });

  it('never settles a tip that left before its minimum', () => {
    jest.useFakeTimers();
    holdTip('/p', 'scroll');
    expect(holdTip('/p', null)).toBe(true);
    jest.advanceTimersByTime(TIP_MIN_SHOWN_MS);
    expect(settled('/p')).toBeNull();
  });
});

describe('a tip grows out of the Tips pill after the opening beat (ONL-2960)', () => {
  const GROWING = { ...IMPORTED, isBeatOver: false, isInvitePending: true } as const;
  const PLACE = { isFootOn: true, isPillShown: true } as const;

  it('shows no tip while the project has not yet sat open for the beat', () => {
    expect(footSeat(GROWING)).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, isBeatOver: false })).toEqual({ seat: STATUS, tip: null });
  });

  it('lets the due tip show once the beat is over', () => {
    expect(footSeat({ ...GROWING, isBeatOver: true })).toEqual({ seat: STATUS, tip: 'invite' });
    expect(footSeat(BLANK_OPEN)).toEqual({ seat: STATUS, tip: 'inspire' });
  });

  it('shows no next tip on the render the last one goes, though it is due', () => {
    const landed = { ...BLANK_OPEN, tip: 'spent', isScrollFrameLanded: true } as const;
    expect(footSeat({ ...landed, heldTip: 'inspire' })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat(landed)).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...landed, heldTip: 'scroll' })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(footSeat({ ...landed, isFootOn: false, heldTip: 'inspire' })).toEqual({ seat: null, tip: 'scroll' });
  });

  it('still holds back for the agent after the beat', () => {
    expect(footSeat({ ...GROWING, isBeatOver: true, needsYou: true })).toEqual({ seat: STATUS, tip: null });
  });

  it('draws the pill until a tip is up, then the tip grown from it, and the pill again once the tip goes', () => {
    expect(footGrowth({ seat: STATUS, tip: null }, PLACE)).toEqual({ kind: 'pill' });
    expect(footGrowth({ seat: STATUS, tip: 'invite' }, PLACE)).toEqual({ kind: 'tip', tip: 'invite' });
    expect(footGrowth({ seat: STATUS, tip: null }, { ...PLACE, isPillShown: false })).toBeNull();
  });

  it('draws a tip ungrown, with no beat, with rail-foot off', () => {
    expect(footGrowth({ seat: null, tip: 'invite' }, { ...PLACE, isFootOn: false })).toBeNull();
    expect(footSeat({ ...GROWING, isFootOn: false })).toEqual({ seat: null, tip: 'invite' });
  });

  it('puts the pill in the foot only where the foot is on screen', () => {
    const shown = { isFootOn: true, isLeftPanelHidden: false, leftPanelView: 'designs' } as const;
    expect(footHoldsPill(shown)).toBe(true);
    expect(footHoldsPill({ ...shown, isLeftPanelHidden: true })).toBe(false);
    expect(footHoldsPill({ ...shown, leftPanelView: 'code' })).toBe(false);
    expect(footHoldsPill({ ...shown, isFootOn: false })).toBe(false);
  });
});

describe('one run of tips per sitting at a project (ONL-2960)', () => {
  const ONBOARDING = { ...OPEN_MOMENT, claim: 'onboarding' } as const;
  const FEATURE = { ...OPEN_MOMENT, claim: 'feature' } as const;
  const OVER = { ...OPEN_MOMENT, isOver: true } as const;
  const IN_FLIGHT = { ...BLANK_OPEN, tip: 'spent', isInvitePending: true, moment: ONBOARDING } as const;

  it('keeps the invite out of the gap between the inspiration tip and the scroll tip', () => {
    expect(footSeat(IN_FLIGHT)).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...IN_FLIGHT, isScrollFrameLanded: true })).toEqual({ seat: STATUS, tip: 'scroll' });
  });

  it('shows the invite in a sitting no tip has claimed yet', () => {
    expect(footSeat({ ...INVITED, moment: OPEN_MOMENT })).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('holds every onboarding tip back in a sitting the invite claimed', () => {
    expect(footSeat({ ...BLANK_OPEN, moment: FEATURE })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent', isScrollFrameLanded: true, moment: FEATURE })).toEqual({ seat: STATUS, tip: null });
  });

  it('holds every tip back once a Not now has ended the sitting', () => {
    expect(footSeat({ ...BLANK_OPEN, moment: OVER })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...INVITED, moment: OVER })).toEqual({ seat: STATUS, tip: null });
  });

  it('keeps a tip already up in its place', () => {
    expect(footSeat({ ...INVITED, heldTip: 'invite', moment: FEATURE })).toEqual({ seat: STATUS, tip: 'invite' });
  });

  it('never shows the invite under the dev override', () => {
    expect(footSeat({ ...INVITED, moment: { ...OPEN_MOMENT, isOnboardingOnly: true } })).toEqual({ seat: STATUS, tip: null });
  });

  it('picks as before with an open sitting', () => {
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent', isInvitePending: true })).toEqual({ seat: STATUS, tip: 'invite' });
    expect(footSeat({ ...BLANK_OPEN, tip: 'spent', isInvitePending: true, heldTip: 'invite', isScrollFrameLanded: true })).toEqual({ seat: STATUS, tip: 'invite' });
  });
});

describe('the prompt tip beside an imported project’s next-task cards (ONL-2960)', () => {
  const WAITING = { ...IMPORTED, isAppLive: true, isOfferingNextTasks: true } as const;
  const DUE = { ...WAITING, isPromptDue: true } as const;
  const UP = { ...WAITING, wasPromptShown: true, heldTip: 'prompt' } as const;

  it('comes in once the cards have sat unpicked for its delay, and not before', () => {
    expect(footSeat(WAITING)).toEqual({ seat: STATUS, tip: null });
    expect(footSeat(DUE)).toEqual({ seat: STATUS, tip: 'prompt' });
  });

  it('starts its delay only while the cards wait on a pick with the app live', () => {
    expect(promptWaitsOnPick(WAITING)).toBe(true);
    expect(promptWaitsOnPick({ ...WAITING, isOfferingNextTasks: false })).toBe(false);
    expect(promptWaitsOnPick({ ...WAITING, isAppLive: false })).toBe(false);
    expect(promptWaitsOnPick({ ...WAITING, isAgentWorking: true })).toBe(false);
    expect(promptWaitsOnPick({ ...WAITING, needsYou: true })).toBe(false);
    expect(promptWaitsOnPick({ ...WAITING, wasPromptShown: true })).toBe(false);
  });

  it('never shows on a blank draft', () => {
    expect(footSeat({ ...DUE, isBlankProject: true, tip: 'spent' }).tip).toBeNull();
    expect(promptWaitsOnPick({ ...WAITING, isBlankProject: true, tip: 'spent' })).toBe(false);
  });

  it('does not come in during a question or an approval, and one already up stays for its resolution to end', () => {
    expect(footSeat({ ...DUE, needsYou: true })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...UP, needsYou: true })).toEqual({ seat: STATUS, tip: 'prompt' });
  });

  it('leaves once a card is picked', () => {
    expect(footSeat({ ...UP, isOfferingNextTasks: false })).toEqual({ seat: STATUS, tip: null });
  });

  it('waits while setup holds the foot, and for an app not yet live', () => {
    expect(footSeat({ ...DUE, setup: { state: 'running', at: 4 } }).tip).toBeNull();
    expect(footSeat({ ...DUE, isAppLive: false }).tip).toBeNull();
  });

  it('shows once per project, and leaves for good when used or run out', () => {
    expect(footSeat({ ...DUE, wasPromptShown: true }).tip).toBeNull();
    expect(footSeat({ ...UP, isPromptEnded: true }).tip).toBeNull();
  });

  it('waits out the opening beat and a sitting that is over', () => {
    expect(footSeat({ ...DUE, isBeatOver: false }).tip).toBeNull();
    expect(footSeat({ ...DUE, moment: { ...OPEN_MOMENT, isOver: true } }).tip).toBeNull();
  });

  it('is the only tip that comes in beside the cards', () => {
    expect(footSeat({ ...DUE, isScrollFrameLanded: true })).toEqual({ seat: STATUS, tip: 'prompt' });
  });

  it('leaves a tip already up beside the cards in its place, and does not take over from it', () => {
    expect(footSeat({ ...DUE, isScrollFrameLanded: true, heldTip: 'scroll' })).toEqual({ seat: STATUS, tip: 'scroll' });
    expect(promptWaitsOnPick({ ...WAITING, heldTip: 'scroll' })).toBe(false);
  });

  it('stays off with its flag off', () => {
    expect(footSeat({ ...DUE, isPromptTipOn: false }).tip).toBeNull();
  });

  it('never comes in for someone who already had projects, and one up leaves once that is known', () => {
    expect(footSeat({ ...DUE, isEarlyTipAudience: false })).toEqual({ seat: STATUS, tip: null });
    expect(footSeat({ ...UP, isEarlyTipAudience: false })).toEqual({ seat: STATUS, tip: null });
    expect(promptWaitsOnPick({ ...WAITING, isEarlyTipAudience: false })).toBe(false);
  });
});
