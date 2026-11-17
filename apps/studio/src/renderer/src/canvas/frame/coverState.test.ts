import { describe, expect, it } from 'bun:test';
import { shownOverFrame, type FrameShownFacts } from '@studio/events';
import { frameCover, olderCover, type FrameCoverView } from './coverState.js';

const live: FrameShownFacts = {
  health: 'live',
  cover: undefined,
  serverLive: true,
  serverStarting: false,
  loadFailed: false,
  quote: undefined,
  turnRunning: false,
};
const view: FrameCoverView = { hasLoaded: true, canAsk: true, startedBy: 'agent' };

const broken = {
  'a page nothing answered': { health: 'unreachable', serverLive: false },
  'a page that failed on a server that answered': { health: 'unreachable', loadFailed: true },
} as const satisfies Record<string, Partial<FrameShownFacts>>;

function shows(facts: Partial<FrameShownFacts>, seen: Partial<FrameCoverView> = {}) {
  return frameCover(shownOverFrame({ ...live, ...facts }), { ...view, ...seen });
}

function cover(facts: Partial<FrameShownFacts>, seen?: Partial<FrameCoverView>): string | undefined {
  const shown = shows(facts, seen);
  return shown.kind === 'cover' ? shown.cover : undefined;
}

function actions(facts: Partial<FrameShownFacts>, seen?: Partial<FrameCoverView>): readonly string[] {
  const shown = shows(facts, seen);
  return shown.kind === 'cover' ? shown.actions : [];
}

describe('which cover a frame shows (ONL-2960)', () => {
  it('shows the page on a live frame', () => {
    expect(shows({})).toEqual({ kind: 'page' });
  });

  it.each([
    ['non-started', 'not-started'],
    ['dead', 'stopped'],
    ['users-own', 'own-server'],
    ['occupied', 'port-taken'],
    ['container', 'container'],
  ] as const)('names a %s server as %s', (serverCover, expected) => {
    expect(cover({ cover: serverCover })).toBe(expected);
  });

  it('tells a page nothing answered from one that failed while its server answered', () => {
    expect(cover(broken['a page nothing answered'])).toBe('nothing');
    expect(cover(broken['a page that failed on a server that answered'])).toBe('page-failed');
  });

  it('reads an unanswered page with no named failure as nothing answering, even when the server answered', () => {
    expect(cover({ health: 'unreachable', serverLive: true, loadFailed: false })).toBe('nothing');
  });
});

describe('a frame whose app is starting says so, with nothing to press', () => {
  it('names who is starting it, over a server not started and a stopped one alike', () => {
    expect(cover({ cover: 'non-started', serverStarting: true })).toBe('agent-starting');
    expect(cover({ cover: 'dead', serverStarting: true }, { startedBy: 'studio' })).toBe('studio-starting');
  });

  it('offers no Start and no ask while the start is under way, though the agent could take one', () => {
    expect(shows({ cover: 'non-started', serverStarting: true }, { canAsk: true })).toMatchObject({ kind: 'cover', actions: [] });
    expect(shows({ cover: 'dead', serverStarting: true }, { canAsk: true, startedBy: 'studio' })).toMatchObject({ kind: 'cover', actions: [] });
  });

  it('but a server Studio cannot start keeps its cover while it reads starting', () => {
    expect(cover({ cover: 'users-own', serverStarting: true })).toBe('own-server');
    expect(cover({ cover: 'occupied', serverStarting: true })).toBe('port-taken');
  });
});

describe('a loading frame keeps the plain ground (ONL-2960)', () => {
  it('while its page loads, the first load and a refresh alike', () => {
    expect(shows({ health: 'loading' }, { hasLoaded: false })).toEqual({ kind: 'page' });
    expect(shows({ health: 'loading' }, { hasLoaded: true })).toEqual({ kind: 'page' });
  });
});

describe('the buttons on a cover (ONL-2960)', () => {
  it('puts Studio’s own fix first, then the ask', () => {
    expect(actions({ cover: 'non-started' })).toEqual(['start', 'ask-agent']);
    expect(actions({ cover: 'dead' })).toEqual(['restart', 'ask-agent']);
    expect(actions(broken['a page nothing answered'])).toEqual(['try-again', 'ask-agent']);
  });

  it('offers only Back on a page that failed while the app runs', () => {
    expect(actions(broken['a page that failed on a server that answered'])).toEqual(['back']);
  });

  it('offers nothing where the fix is outside Studio', () => {
    expect(actions({ cover: 'users-own' })).toEqual([]);
    expect(actions({ cover: 'occupied' })).toEqual([]);
    expect(actions({ cover: 'container' })).toEqual([]);
  });

  it('leaves the ask out when no agent can take a prompt, and keeps Studio’s fix', () => {
    expect(actions({ cover: 'dead' }, { canAsk: false })).toEqual(['restart']);
    expect(actions(broken['a page nothing answered'], { canAsk: false })).toEqual(['try-again']);
  });

  it('keeps a stopped app’s Restart once a quote’s turn ends', () => {
    expect(actions({ quote: 'A bakery site', cover: 'dead', turnRunning: false })).toContain('restart');
  });

  it('draws the quote the rule chose, not a cover', () => {
    expect(shows({ quote: 'A bakery site', cover: 'dead', turnRunning: true })).toEqual({ kind: 'quote', quote: 'A bakery site' });
  });
});

describe('which covers wait before they show', () => {
  function waits(facts: Partial<FrameShownFacts>, seen?: Partial<FrameCoverView>): boolean | undefined {
    const shown = shows(facts, seen);
    return shown.kind === 'cover' ? shown.waits : undefined;
  }

  it('holds a server cover until the Frame has loaded once', () => {
    expect(waits({ cover: 'non-started' }, { hasLoaded: false })).toBe(true);
    expect(waits({ cover: 'occupied' }, { hasLoaded: false })).toBe(true);
  });

  it('shows a server cover at once over a Frame that has loaded', () => {
    expect(waits({ cover: 'dead' }, { hasLoaded: true })).toBe(false);
  });

  it('never holds a failure cover, which sits over the guest’s error page', () => {
    expect(waits(broken['a page nothing answered'], { hasLoaded: false })).toBe(false);
    expect(waits(broken['a page that failed on a server that answered'], { hasLoaded: false })).toBe(false);
  });
});

describe('main’s covers, with frame-covers off (ONL-2960)', () => {
  const facts = { serverCover: undefined, serverStarting: false, health: 'live', serverLive: true, loadFailure: undefined };
  it('reads a starting server as starting, with nothing to press', () => {
    expect(olderCover({ ...facts, serverCover: 'dead', serverStarting: true, serverLive: false })).toMatchObject({ isStarting: true, recoverable: false, isDead: false });
  });
  it('offers recovery for a stopped server and for a page that will not answer', () => {
    expect(olderCover({ ...facts, serverCover: 'dead', serverLive: false }).recoverable).toBe(true);
    expect(olderCover({ ...facts, health: 'unreachable', serverLive: false })).toMatchObject({ isDead: true, recoverable: true });
  });
  it('names a failed load only while the server is live', () => {
    const failure = { url: 'http://localhost:3000/x' };
    expect(olderCover({ ...facts, health: 'unreachable', loadFailure: failure })).toMatchObject({ namedFailure: failure, recoverable: false });
    expect(olderCover({ ...facts, health: 'unreachable', serverLive: false, loadFailure: failure }).namedFailure).toBeUndefined();
  });
});
