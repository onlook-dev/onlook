import { describe, expect, it } from 'bun:test';
import { frameServerFacts, shownOverArtifact, shownOverFrame, type FrameShownFacts } from './frame-shown.js';
import { originForPort, type ServerEntryState } from './server.js';

const healthy: FrameShownFacts = { health: 'live', cover: undefined, serverLive: true, serverStarting: false, loadFailed: false, quote: undefined, turnRunning: false };
const quoted: FrameShownFacts = { ...healthy, quote: 'A bakery site' };

describe('what Studio shows in a frame (ONL-2960)', () => {
  it.each([
    ['the page', healthy, { kind: 'page' }],
    ['the loading label before the first paint', { ...healthy, health: 'loading' }, { kind: 'loading' }],
    ['the server cover by its kind', { ...healthy, cover: 'occupied' }, { kind: 'cover', cover: 'occupied' }],
    ['the app starting while a server Studio can start is starting', { ...healthy, cover: 'dead', serverStarting: true }, { kind: 'starting' }],
    ['the server cover of one Studio cannot start, starting or not', { ...healthy, cover: 'users-own', serverStarting: true }, { kind: 'cover', cover: 'users-own' }],
    ['a named load failure when the server answered', { ...healthy, health: 'unreachable', loadFailed: true }, { kind: 'load-failed' }],
    ['the recovery card when the server is not answering either', { ...healthy, health: 'unreachable', loadFailed: true, serverLive: false }, { kind: 'unreachable' }],
    ['the recovery card when nothing named the failure', { ...healthy, health: 'unreachable' }, { kind: 'unreachable' }],
  ] as const)('shows %s', (_case, facts, shown) => {
    expect(shownOverFrame(facts)).toEqual(shown);
  });

  it('shows the quote over a healthy or loading frame whether or not its turn runs', () => {
    for (const turnRunning of [true, false]) {
      expect(shownOverFrame({ ...quoted, turnRunning })).toEqual({ kind: 'quote', quote: 'A bakery site' });
      expect(shownOverFrame({ ...quoted, health: 'loading', turnRunning })).toEqual({ kind: 'quote', quote: 'A bakery site' });
    }
  });

  it('keeps the quote over a frame whose server is starting once its turn ends, since nothing is broken yet', () => {
    expect(shownOverFrame({ ...quoted, cover: 'non-started', serverStarting: true })).toEqual({ kind: 'quote', quote: 'A bakery site' });
  });

  it.each([
    ['a server that never started', { cover: 'non-started' }],
    ['a stopped server Studio can restart', { cover: 'dead' }],
    ['a port a stranger holds', { cover: 'occupied' }],
    ['the user’s own server', { cover: 'users-own' }],
    ['a page that is not answering', { health: 'unreachable' }],
    ['a page that failed to load', { health: 'unreachable', loadFailed: true }],
  ] as const)('puts the quote over %s while its turn runs, and yields to it after', (_case, broken) => {
    expect(shownOverFrame({ ...quoted, ...broken, turnRunning: true }).kind).toBe('quote');
    expect(shownOverFrame({ ...quoted, ...broken, turnRunning: false }).kind).not.toBe('quote');
  });
});

describe('a frame’s server facts (ONL-2960)', () => {
  const entry = (measured: 'live' | 'dead'): ServerEntryState => ({
    entryId: 'web',
    folderName: 'shop',
    ownership: 'agent-started',
    status: 'running',
    ports: [{ port: 3000, origin: originForPort(3000), measured, everLive: true }],
    everMeasuredLive: true,
  });

  it('reads the server at the address the frame points to', () => {
    expect(frameServerFacts([entry('dead')], { pointedUrl: 'http://localhost:3000/', pendingHome: false })).toEqual({ cover: 'dead', serverLive: false, serverStarting: false });
    expect(frameServerFacts([entry('live')], { pointedUrl: 'http://localhost:3000/', pendingHome: false })).toEqual({ cover: undefined, serverLive: true, serverStarting: false });
  });

  it('covers a frame waiting on its home as a server not yet started, even with a live server at its address', () => {
    expect(frameServerFacts([entry('live')], { pointedUrl: 'http://localhost:3000/', pendingHome: true }).cover).toBe('non-started');
  });

  it('reads a server whose entry is starting as starting', () => {
    expect(frameServerFacts([{ ...entry('dead'), status: 'starting' }], { pointedUrl: 'http://localhost:3000/', pendingHome: false }).serverStarting).toBe(true);
  });
});

describe('the quote against an artifact’s read (ONL-2960)', () => {
  const quoted = { quote: 'A pricing card for my plans', turnRunning: false } as const;

  it('shows the artifact when it has no quote, whatever its read', () => {
    for (const state of ['reading', 'missing', 'resolved'] as const) {
      expect(shownOverArtifact({ quote: undefined, turnRunning: true, state })).toEqual({ kind: 'artifact' });
    }
  });

  it('outranks a read in flight and a missing artifact while its turn runs', () => {
    for (const state of ['reading', 'missing', 'resolved'] as const) {
      expect(shownOverArtifact({ ...quoted, turnRunning: true, state })).toEqual({ kind: 'quote', quote: quoted.quote });
    }
  });

  it('yields to a missing artifact once the turn ends, and stays over one still reading or resolved', () => {
    expect(shownOverArtifact({ ...quoted, state: 'missing' })).toEqual({ kind: 'artifact' });
    expect(shownOverArtifact({ ...quoted, state: 'reading' })).toEqual({ kind: 'quote', quote: quoted.quote });
    expect(shownOverArtifact({ ...quoted, state: 'resolved' })).toEqual({ kind: 'quote', quote: quoted.quote });
  });
});
