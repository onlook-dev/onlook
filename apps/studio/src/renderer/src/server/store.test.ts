import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import {
  frameServerCover,
  frameServerFacts,
  frameUnderQuote,
  matchServerPort,
  originForPort,
  type ServerBookState,
  type ServerEntryState,
  type ServerPortState,
} from '@studio/events';
import {
  deriveRunControl,
  hasLiveEntry,
  startPromptEntryIds,
  useServerStore,
} from './store.js';

function claimed(port: number, over: Partial<ServerPortState> = {}): ServerPortState {
  return { port, origin: originForPort(port), measured: 'unverified', everLive: false, ...over };
}

function entry(over: Partial<ServerEntryState> = {}): ServerEntryState {
  return {
    entryId: 'entry-web',
    folderName: 'shop',
    ownership: 'agent-started',
    status: 'stopped',
    ports: [],
    everMeasuredLive: false,
    ...over,
  };
}

function book(entries: ServerEntryState[], pending = false): ServerBookState {
  return { entries, pending };
}

beforeEach(() => {
  useServerStore.getState().clearStopPressed();
  useServerStore.setState({ entries: [], pending: false, stopPressed: false });
});

afterEach(() => {
  useServerStore.getState().clearStopPressed();
});

describe('the mirror holds the book as broadcast', () => {
  it('applies a broadcast verbatim and replaces it wholesale on the next', () => {
    const live = entry({ status: 'running', ports: [claimed(3000, { measured: 'live', everLive: true })] });
    useServerStore.getState().apply(book([live], false));
    expect(useServerStore.getState().entries).toEqual([live]);
    expect(useServerStore.getState().pending).toBe(false);

    useServerStore.getState().apply(book([], true));
    expect(useServerStore.getState().entries).toEqual([]);
    expect(useServerStore.getState().pending).toBe(true);
  });
});

describe('the frame↔server join — per origin, per port', () => {
  it('an external site never matches, and an unclaimed localhost matches nothing', () => {
    const entries = [entry({ ports: [claimed(3000)] })];
    expect(matchServerPort(entries, 'https://example.com:3000/')).toBeUndefined();
    expect(matchServerPort(entries, 'http://localhost:5173/')).toBeUndefined();
  });

  it('matches the exact claimed port, not the entry — a two-port app splits per frame', () => {
    const two = entry({
      ports: [claimed(3000, { measured: 'live', everLive: true }), claimed(3001, { measured: 'dead' })],
    });
    expect(matchServerPort([two], 'http://localhost:3000/app')?.port.port).toBe(3000);
    expect(matchServerPort([two], 'http://localhost:3001/')?.port.measured).toBe('dead');
  });

  it('when two entries claim one port, the one measured live wins even listed second', () => {
    const dead = entry({ entryId: 'entry-dead', ports: [claimed(3000, { measured: 'dead', everLive: true })] });
    const live = entry({ entryId: 'entry-live', ports: [claimed(3000, { measured: 'live', everLive: true })] });
    expect(matchServerPort([dead, live], 'http://localhost:3000/')?.entry.entryId).toBe('entry-live');
    expect(matchServerPort([dead], 'http://localhost:3000/')?.entry.entryId).toBe('entry-dead');
  });
});

describe('the honest cover — the state matrix, row by row', () => {
  it('shows startup rather than failure while an owned server is starting', () => {
    const starting = entry({ status: 'starting', ports: [claimed(3000, { measured: 'dead', everLive: true })] });
    const shown = (entries: readonly ServerEntryState[]) => frameUnderQuote({ ...frameServerFacts(entries, { pointedUrl: 'http://localhost:3000/', pendingHome: false }), health: 'loading', loadFailed: false });
    expect(shown([starting])).toEqual({ kind: 'starting' });
    expect(shown([{ ...starting, status: 'stopped' }])).toEqual({ kind: 'cover', cover: 'dead' });
    expect(shown([{ ...starting, ports: [claimed(3000, { measured: 'live' })] }])).toEqual({ kind: 'loading' });
    expect(shown([{ ...starting, ports: [claimed(3000, { measured: 'stranger' })] }])).toEqual({ kind: 'cover', cover: 'occupied' });
    expect(shown([{ ...starting, ownership: 'users-own' }])).toEqual({ kind: 'cover', cover: 'users-own' });
  });
  it('a live port wears no cover: the guest mounts', () => {
    const entries = [entry({ ports: [claimed(3000, { measured: 'live', everLive: true })] })];
    expect(frameServerCover(entries, 'http://localhost:3000/')).toBeUndefined();
  });

  it('claimed, quiet, never lived is the non-started placeholder', () => {
    expect(frameServerCover([entry({ ports: [claimed(3000)] })], 'http://localhost:3000/')).toBe(
      'non-started',
    );
    expect(
      frameServerCover(
        [entry({ ports: [claimed(3000, { measured: 'dead' })] })],
        'http://localhost:3000/',
      ),
    ).toBe('non-started');
  });

  it('was live and died is the dead cover — same family, died copy', () => {
    const entries = [entry({ ports: [claimed(3000, { measured: 'dead', everLive: true })], everMeasuredLive: true })];
    expect(frameServerCover(entries, 'http://localhost:3000/')).toBe('dead');
  });

  it('a stranger answering a claimed port is OCCUPIED, never non-started', () => {
    const entries = [entry({ ports: [claimed(3000, { measured: 'stranger' })] })];
    expect(frameServerCover(entries, 'http://localhost:3000/')).toBe('occupied');
  });

  it('a stranger that is a container runtime wears the container cover (ONL-2359)', () => {
    const entries = [entry({ ports: [claimed(3000, { measured: 'stranger', listener: 'container' })] })];
    expect(frameServerCover(entries, 'http://localhost:3000/')).toBe('container');
  });

  it('a container listener never overrides a live measure: the guest still mounts', () => {
    const live = [entry({ ports: [claimed(3000, { measured: 'live', everLive: true, listener: 'container' })] })];
    expect(frameServerCover(live, 'http://localhost:3000/')).toBeUndefined();
  });

  it("the user's own dead server wears restart-it-yourself copy", () => {
    const entries = [
      entry({ ownership: 'users-own', ports: [claimed(3000, { measured: 'dead', everLive: true })] }),
    ];
    expect(frameServerCover(entries, 'http://localhost:3000/')).toBe('users-own');
  });

  it('no book entry means no cover — webview health only', () => {
    const entries = [entry({ ports: [claimed(3000, { measured: 'dead' })] })];
    expect(frameServerCover(entries, 'http://localhost:5173/')).toBeUndefined();
    expect(frameServerCover(entries, 'https://staging.example.com/')).toBeUndefined();
    expect(frameServerCover([], 'http://localhost:3000/')).toBeUndefined();
  });
});

describe("hasLiveEntry — this project's server is up (ONL-2363)", () => {
  it('a live port on an agent-started entry reads true', () => {
    expect(hasLiveEntry([entry({ ports: [claimed(3000, { measured: 'live' })] })])).toBe(true);
  });

  it("the user's own server never counts, live or not — the agent cannot start it", () => {
    expect(hasLiveEntry([entry({ ownership: 'users-own', status: 'running', ports: [claimed(3000, { measured: 'live' })] })])).toBe(false);
  });

  it('stranger, dead and unverified ports read false, and so does an empty book', () => {
    expect(
      hasLiveEntry([
        entry({ entryId: 'a', ports: [claimed(3000, { measured: 'stranger' })] }),
        entry({ entryId: 'b', ports: [claimed(3001, { measured: 'dead', everLive: true })] }),
        entry({ entryId: 'c', ports: [claimed(3002)] }),
      ]),
    ).toBe(false);
    expect(hasLiveEntry([])).toBe(false);
  });

  it('a running status with no live port yet reads true — the re-verify seat', () => {
    expect(hasLiveEntry([entry({ status: 'running', ports: [claimed(3000)] })])).toBe(true);
  });
});

describe('the run control aggregate', () => {
  const frames = ['http://localhost:3000/'];

  it('reads idle over an empty book, and starting the moment a press is pending', () => {
    expect(deriveRunControl([], false, frames).runState).toBe('idle');
    expect(deriveRunControl([], true, frames).runState).toBe('starting');
  });

  it('reads starting while any prompted entry is unresolved, and running once every one measures live', () => {
    const starting = entry({ status: 'starting', ports: [claimed(3000)] });
    expect(deriveRunControl([starting], false, frames).runState).toBe('starting');

    const live = entry({ status: 'running', ports: [claimed(3000, { measured: 'live', everLive: true })] });
    const secondLive = entry({
      entryId: 'entry-api',
      folderName: 'api',
      status: 'running',
      ports: [claimed(4000, { measured: 'live', everLive: true })],
    });
    const urls = ['http://localhost:3000/', 'http://localhost:4000/'];
    expect(deriveRunControl([live, secondLive], false, urls).runState).toBe('running');
    expect(
      deriveRunControl([live, entry({ entryId: 'entry-api', folderName: 'api', status: 'starting', ports: [claimed(4000)] })], false, urls).runState,
    ).toBe('starting');
  });

  it('a re-verified live claim reads running while its fresh monitor is still starting', () => {
    const reattaching = entry({ status: 'starting', ports: [claimed(3000, { measured: 'live', everLive: true })] });
    expect(deriveRunControl([reattaching], false, frames).runState).toBe('running');
  });

  it('a given-up entry releases the control from starting while its frames stay non-started', () => {
    const givenUp = entry({ status: 'stopped', ports: [claimed(3000, { measured: 'dead' })] });
    expect(deriveRunControl([givenUp], false, frames).runState).toBe('idle');
    expect(frameServerCover([givenUp], 'http://localhost:3000/')).toBe('non-started');
    const live = entry({
      entryId: 'entry-api',
      folderName: 'api',
      status: 'running',
      ports: [claimed(4000, { measured: 'live', everLive: true })],
    });
    expect(deriveRunControl([givenUp, live], false, ['http://localhost:3000/', 'http://localhost:4000/']).runState).toBe('idle');
  });

  it("a dead users-own entry never enters the aggregate", () => {
    const usersOwn = entry({
      entryId: 'entry-user',
      folderName: 'checkout',
      ownership: 'users-own',
      status: 'stopped',
      ports: [claimed(4000, { measured: 'dead', everLive: true })],
    });
    expect(deriveRunControl([usersOwn], false, ['http://localhost:4000/']).runState).toBe('idle');
    const live = entry({ status: 'running', ports: [claimed(3000, { measured: 'live', everLive: true })] });
    expect(
      deriveRunControl([usersOwn, live], false, ['http://localhost:3000/', 'http://localhost:4000/']).runState,
    ).toBe('running');
  });

  it("an entry no frame matches is not this control's business", () => {
    const unmatched = entry({ status: 'starting', ports: [claimed(9000)] });
    expect(deriveRunControl([unmatched], false, frames).runState).toBe('idle');
  });

  it('carries the one-server honesty to N: stop-failed reads running, stopping reads stopping', () => {
    const stopFailed = entry({ status: 'stop-failed', port: 3000, ports: [claimed(3000)] });
    expect(deriveRunControl([stopFailed], false, frames).runState).toBe('running');
    const stopping = entry({ status: 'stopping', port: 3000, ports: [claimed(3000, { measured: 'live', everLive: true })] });
    expect(deriveRunControl([stopping], false, frames).runState).toBe('stopping');
  });
});

describe('the two prompts', () => {
  it('Start enumerates matched agent-startable folders only — not users-own, not live, not unmatched', () => {
    const urls = ['http://localhost:3000/', 'http://localhost:4000/', 'http://localhost:5000/'];
    const entries = [
      entry({ folderName: 'web', ports: [claimed(3000, { measured: 'dead', everLive: true })] }),
      entry({
        entryId: 'entry-user',
        folderName: 'checkout',
        ownership: 'users-own',
        ports: [claimed(4000, { measured: 'dead', everLive: true })],
      }),
      entry({
        entryId: 'entry-live',
        folderName: 'docs',
        status: 'running',
        ports: [claimed(5000, { measured: 'live', everLive: true })],
      }),
      entry({ entryId: 'entry-far', folderName: 'admin', ports: [claimed(9000, { measured: 'dead' })] }),
    ];
    const unknownHistory = entry({
      entryId: 'entry-unknown',
      folderName: 'api',
      ownership: 'unknown',
      ports: [claimed(6000, { measured: 'dead' })],
    });
    expect(startPromptEntryIds([...entries, unknownHistory], [...urls, 'http://localhost:6000/'])).toEqual([
      'entry-web',
      'entry-unknown',
    ]);
  });

  it("Start never names Studio's own starter, live or not — main re-spawns it without a prompt (ONL-2152)", () => {
    const urls = ['http://localhost:4700/', 'http://localhost:3000/'];
    const starter = entry({
      entryId: 'entry-starter',
      folderName: 'draft',
      ownership: 'studio-started',
      ports: [claimed(4700, { measured: 'dead', everLive: true })],
    });
    const agents = entry({ folderName: 'web', ports: [claimed(3000, { measured: 'dead', everLive: true })] });
    expect(startPromptEntryIds([starter, agents], urls)).toEqual(['entry-web']);
  });

  it('hasStarter reads true only for a matched studio-started entry, and it still drives runState', () => {
    const starter = entry({
      entryId: 'entry-starter',
      folderName: 'draft',
      ownership: 'studio-started',
      status: 'running',
      ports: [claimed(4700, { measured: 'live', everLive: true })],
    });
    const urls = ['http://localhost:4700/'];
    expect(deriveRunControl([starter], false, urls)).toEqual({ runState: 'running', hasStarter: true });
    expect(deriveRunControl([starter], false, ['http://localhost:9000/']).hasStarter).toBe(false);
    const own = entry({ ownership: 'users-own', ports: [claimed(4700, { measured: 'live', everLive: true })] });
    expect(deriveRunControl([own], false, urls).hasStarter).toBe(false);
    const dead = entry({
      entryId: 'entry-starter',
      folderName: 'draft',
      ownership: 'studio-started',
      ports: [claimed(4700, { measured: 'dead', everLive: true })],
    });
    expect(deriveRunControl([dead], false, urls)).toEqual({ runState: 'idle', hasStarter: true });
  });

});

describe('a stop pressed while the start is still coming up', () => {
  const frames = ['http://localhost:3000/'];
  const starting = entry({ status: 'starting', ports: [claimed(3000)] });
  const live = entry({ status: 'running', ports: [claimed(3000, { measured: 'live', everLive: true })] });

  it('reads as stopping the moment the press lands, with no entry to mark', () => {
    expect(deriveRunControl([], true, [], false).runState).toBe('starting');
    expect(deriveRunControl([], true, [], true).runState).toBe('stopping');
  });

  it('outranks starting', () => {
    expect(deriveRunControl([starting], false, frames, true).runState).toBe('stopping');
  });

  it('expires on its own when main never broadcasts, so the control cannot brick', async () => {
    useServerStore.getState().markStopPressed(5);
    expect(useServerStore.getState().stopPressed).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(useServerStore.getState().stopPressed).toBe(false);
  });

  it('is held while the book is unsettled and released once it settles', () => {
    useServerStore.setState({ stopPressed: true });
    useServerStore.getState().apply(book([starting]));
    expect(useServerStore.getState().stopPressed).toBe(true);

    useServerStore.getState().apply(book([live]));
    expect(useServerStore.getState().stopPressed).toBe(false);
  });

  it('explicit settlement clears the optimistic latch and its deadline without changing the book', () => {
    useServerStore.getState().apply(book([starting], true));
    useServerStore.getState().markStopPressed();
    const cancelDeadline = spyOn(globalThis, 'clearTimeout');
    try {
      useServerStore.getState().clearStopPressed();
      expect(cancelDeadline).toHaveBeenCalledTimes(1);
      const state = useServerStore.getState();
      expect(state.stopPressed).toBe(false);
      expect(state.entries).toEqual([starting]);
      expect(state.pending).toBe(true);
      expect(deriveRunControl(state.entries, state.pending, frames, state.stopPressed).runState).toBe('starting');
      useServerStore.getState().clearStopPressed();
      expect(cancelDeadline).toHaveBeenCalledTimes(1);
    } finally {
      cancelDeadline.mockRestore();
    }
  });

  it('explicit settlement does not override a measured stopping server', () => {
    const stopping = { ...live, status: 'stopping' as const };
    useServerStore.getState().apply(book([stopping]));
    useServerStore.getState().markStopPressed();
    useServerStore.getState().clearStopPressed();
    const state = useServerStore.getState();
    expect(deriveRunControl(state.entries, state.pending, frames, state.stopPressed).runState).toBe('stopping');
    expect(state.entries).toEqual([stopping]);
  });
});
