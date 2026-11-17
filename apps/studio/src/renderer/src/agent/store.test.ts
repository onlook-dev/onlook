import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { AgentConnection, AgentProbeRequest, AgentSnapshot, PenView, RendererLogLine } from '@studio/events';
import { deferred, type Deferred } from '../testing/bridge.js';
import {
  canSubmitPrompt,
  primeAgentConnection,
  resetAgentPrimeForTests,
  useAgentStore,
  subscribeToAgent,
} from './store.js';

const logged: RendererLogLine[] = [];

function fakeBridge(): {
  install: () => void;
  session: (sessionId: string | undefined) => void;
  state: (isStreaming: boolean, needsAttention?: boolean, pen?: PenView, otherTabAgentBusy?: boolean) => void;
  parked: (questionParkedSince: number | undefined) => void;
  resolveSnapshot: (snapshot: Partial<AgentSnapshot>) => Promise<void>;
  refuseSnapshot: () => Promise<void>;
  connection: (connection: AgentConnection) => void;
  holdProbe: () => Deferred<AgentConnection>;
  subscribed: () => number;
  snapshotAskedAfterSubscribes: number;
  probeRequests: AgentProbeRequest[];
} {
  let listeners = 0;
  let askedAfter = -1;
  let sessionListener: ((info: { sessionId?: string }) => void) | undefined;
  let stateListener:
    | ((state: { isStreaming: boolean; needsAttention?: boolean; questionParkedSince?: number; pen?: PenView; otherTabAgentBusy?: boolean }) => void)
    | undefined;
  let settle: ((snapshot: AgentSnapshot) => void) | undefined;
  let refuse: ((reason: Error) => void) | undefined;
  let connectionListener: ((connection: AgentConnection) => void) | undefined;
  let heldProbe: Deferred<AgentConnection> | undefined;
  let pending: Promise<AgentSnapshot> | undefined;
  const probeRequests: AgentProbeRequest[] = [];

  const bridge = {
    log(line: RendererLogLine): void {
      logged.push(line);
    },
    telemetryException(): void {},
    onAgentSession(listener: (info: { sessionId?: string }) => void): () => void {
      listeners += 1;
      sessionListener = listener;
      return () => {};
    },
    onAgentState(
      listener: (state: { isStreaming: boolean; needsAttention?: boolean; questionParkedSince?: number; pen?: PenView; otherTabAgentBusy?: boolean }) => void,
    ): () => void {
      listeners += 1;
      stateListener = listener;
      return () => {};
    },
    onAgentConnection(listener: (connection: AgentConnection) => void): () => void {
      listeners += 1;
      connectionListener = listener;
      return () => {};
    },
    agentProbe(req: AgentProbeRequest = {}): Promise<AgentConnection> {
      probeRequests.push(req);
      return heldProbe?.promise ?? Promise.resolve({ status: 'ok' });
    },
    agentSnapshot(): Promise<AgentSnapshot> {
      // The first ask; recording the latest let an early ask hide behind the real one.
      if (askedAfter === -1) askedAfter = listeners;
      pending = new Promise<AgentSnapshot>((resolve, reject) => {
        settle = resolve;
        refuse = reject;
      });
      return pending;
    },
  };

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', {
        value: { studio: bridge },
        configurable: true,
        writable: true,
      });
    },
    session(sessionId): void {
      sessionListener?.({ sessionId });
    },
    state(isStreaming, needsAttention, pen, otherTabAgentBusy): void {
      stateListener?.({
        isStreaming,
        ...(otherTabAgentBusy === undefined ? {} : { otherTabAgentBusy }),
        ...(needsAttention === undefined ? {} : { needsAttention }),
        ...(pen === undefined ? {} : { pen }),
      });
    },
    parked(questionParkedSince): void {
      stateListener?.({
        isStreaming: true,
        needsAttention: true,
        ...(questionParkedSince === undefined ? {} : { questionParkedSince }),
      });
    },
    async resolveSnapshot(snapshot): Promise<void> {
      settle?.({
        events: [],
        isStreaming: false,
        midTurn: 'steer',
        lastSeq: 0,
        connection: { status: 'ok' },
        ...snapshot,
      });
      await pending;
      await Promise.resolve();
    },
    async refuseSnapshot(): Promise<void> {
      refuse?.(new Error('snapshot refused'));
      await pending?.catch(() => undefined);
      await Promise.resolve();
    },
    connection(connection): void {
      connectionListener?.(connection);
    },
    holdProbe(): Deferred<AgentConnection> {
      heldProbe = deferred<AgentConnection>();
      return heldProbe;
    },
    subscribed(): number {
      return listeners;
    },
    get snapshotAskedAfterSubscribes(): number {
      return askedAfter;
    },
    probeRequests,
  };
}

const RESET = {
  hasSession: false,
  connection: { status: 'unknown' as const },
  isStreaming: false,
  otherTabAgentBusy: false,
  needsAttention: false,
  needsAnswer: false,
  pen: undefined,
};

const WAITING: PenView = { penId: 1, text: 'make the hero narrower' };

describe('the other-tab busy fact (ONL-2407)', () => {
  it('keeps the live background flag independent of local streaming and a stale snapshot', async () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();
    bridge.state(false, false, undefined, true);
    await bridge.resolveSnapshot({ isStreaming: true, otherTabAgentBusy: false });
    expect(useAgentStore.getState()).toMatchObject({ isStreaming: false, otherTabAgentBusy: true });
    bridge.state(true, false, undefined, false);
    expect(useAgentStore.getState()).toMatchObject({ isStreaming: true, otherTabAgentBusy: false });
  });

  it('takes the background flag from a snapshot and treats an absent producer field as idle', async () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();
    await bridge.resolveSnapshot({ otherTabAgentBusy: true });
    expect(useAgentStore.getState().otherTabAgentBusy).toBe(true);
    bridge.state(false);
    expect(useAgentStore.getState().otherTabAgentBusy).toBe(false);
  });
});

beforeEach(() => {
  logged.length = 0;
  resetAgentPrimeForTests();
  useAgentStore.setState(RESET);
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('the snapshot-stale race', () => {
  it('lets a live announcement stand when the snapshot contradicts it', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    expect(bridge.subscribed()).toBe(3);
    expect(bridge.snapshotAskedAfterSubscribes).toBe(3);

    bridge.session('sess-1');
    expect(useAgentStore.getState().hasSession).toBe(true);

    return bridge.resolveSnapshot({ sessionId: undefined }).then(() => {
      expect(useAgentStore.getState().hasSession).toBe(true);
    });
  });

  it('still catches up a renderer that missed the announcement', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    return bridge.resolveSnapshot({ sessionId: 'sess-2', isStreaming: true }).then(() => {
      expect(useAgentStore.getState().hasSession).toBe(true);
      expect(useAgentStore.getState().isStreaming).toBe(true);
    });
  });

  it('guards each fact on its own, not all three together', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true);

    return bridge
      .resolveSnapshot({ sessionId: 'sess-3', isStreaming: false, connection: { status: 'ok' } })
      .then(() => {
        expect(useAgentStore.getState().isStreaming).toBe(true);
        expect(useAgentStore.getState().hasSession).toBe(true);
        expect(useAgentStore.getState().connection.status).toBe('ok');
      });
  });
});

describe('the probe against a newer connection', () => {
  const REFUSED: AgentConnection = { status: 'unauthenticated', harness: 'codex' };

  it('lets a connection event stand when the probe answers after it', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const probe = bridge.holdProbe();
    const primed = primeAgentConnection();
    subscribeToAgent();

    bridge.connection(REFUSED);
    probe.settle({ status: 'ok' });
    await primed;

    expect(useAgentStore.getState().connection).toEqual(REFUSED);
  });

  it("lets the snapshot's verdict stand when the probe answers after it", async () => {
    const bridge = fakeBridge();
    bridge.install();
    const probe = bridge.holdProbe();
    const primed = primeAgentConnection();
    subscribeToAgent();

    await bridge.resolveSnapshot({ connection: REFUSED });
    probe.settle({ status: 'ok' });
    await primed;

    expect(useAgentStore.getState().connection).toEqual(REFUSED);
  });

  it('takes the probe when nothing newer was heard, and asks once', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const probe = bridge.holdProbe();
    const primed = primeAgentConnection();
    void primeAgentConnection();
    subscribeToAgent();

    probe.settle({ status: 'cli_missing' });
    await primed;

    expect(bridge.probeRequests).toHaveLength(1);
    expect(useAgentStore.getState().connection.status).toBe('cli_missing');
  });

  it('logs a refused probe and leaves the launch state', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const probe = bridge.holdProbe();
    const primed = primeAgentConnection();

    probe.refuse(new Error('probe refused'));
    await primed;

    expect(useAgentStore.getState().connection.status).toBe('unknown');
    expect(logged.map((line) => `${line.subsystem}: ${line.msg}`)).toEqual(['agent: probe refused']);
  });
});

describe('a refused snapshot', () => {
  it('is logged, and leaves every fact where it was', async () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();
    bridge.session('sess-1');

    await bridge.refuseSnapshot();

    expect(useAgentStore.getState().hasSession).toBe(true);
    expect(logged.map((line) => `${line.subsystem}: ${line.msg}`)).toEqual(['agent: agentSnapshot refused']);
  });
});

describe('the attention fact the store folds (ONL-2455)', () => {
  it('takes it from the live event', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true, true);
    expect(useAgentStore.getState().needsAttention).toBe(true);

    bridge.state(true, false);
    expect(useAgentStore.getState().needsAttention).toBe(false);
  });

  it('takes it from the snapshot when no event arrived first', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    return bridge.resolveSnapshot({ isStreaming: true, needsAttention: true }).then(() => {
      expect(useAgentStore.getState().needsAttention).toBe(true);
    });
  });

  it('lets the live event stand over a stale snapshot, with streaming', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true, true);

    return bridge.resolveSnapshot({ isStreaming: false, needsAttention: false }).then(() => {
      expect(useAgentStore.getState().needsAttention).toBe(true);
      expect(useAgentStore.getState().isStreaming).toBe(true);
    });
  });

  it('reads a producer that says nothing as no attention', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    useAgentStore.setState({ needsAttention: true });
    bridge.state(false);
    expect(useAgentStore.getState().needsAttention).toBe(false);
  });
});

describe('the question fact the store folds (ONL-2295)', () => {
  it('reads a parked question as needing an answer, and an approval alone as not', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.parked(1_000);
    expect(useAgentStore.getState().needsAnswer).toBe(true);

    bridge.parked(undefined);
    expect(useAgentStore.getState().needsAttention).toBe(true);
    expect(useAgentStore.getState().needsAnswer).toBe(false);
  });

  it('takes it from the snapshot when no event arrived first', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    return bridge.resolveSnapshot({ isStreaming: true, needsAttention: true, questionParkedSince: 1_000 }).then(() => {
      expect(useAgentStore.getState().needsAnswer).toBe(true);
    });
  });
});

describe('the waiting prompt this store carries (ONL-2294)', () => {
  it('takes it from the live event', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true, false, WAITING);
    expect(useAgentStore.getState().pen).toEqual(WAITING);
  });

  it('takes it from the snapshot when no event arrived first', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    return bridge.resolveSnapshot({ isStreaming: true, pen: WAITING }).then(() => {
      expect(useAgentStore.getState().pen).toEqual(WAITING);
    });
  });

  it('lets the live event stand over a stale snapshot', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true, false, WAITING);

    return bridge.resolveSnapshot({ isStreaming: false }).then(() => {
      expect(useAgentStore.getState().pen).toEqual(WAITING);
    });
  });

  it('empties it when the next event carries none', () => {
    const bridge = fakeBridge();
    bridge.install();
    subscribeToAgent();

    bridge.state(true, false, WAITING);
    bridge.state(true, false);
    expect(useAgentStore.getState().pen).toBeUndefined();
  });
});

describe('canSubmitPrompt', () => {
  it('treats an unanswered probe as usable, and a failed one as not', () => {
    expect(canSubmitPrompt({ hasSession: true, connection: { status: 'unknown' } })).toBe(true);
    expect(canSubmitPrompt({ hasSession: true, connection: { status: 'ok' } })).toBe(true);

    expect(canSubmitPrompt({ hasSession: true, connection: { status: 'cli_missing' } })).toBe(false);
    expect(canSubmitPrompt({ hasSession: true, connection: { status: 'unauthenticated' } })).toBe(false);
    expect(canSubmitPrompt({ hasSession: true, connection: { status: 'error' } })).toBe(false);
  });

  it('is false without a session, however healthy the connection', () => {
    expect(canSubmitPrompt({ hasSession: false, connection: { status: 'ok' } })).toBe(false);
    expect(canSubmitPrompt({ hasSession: false, connection: { status: 'unknown' } })).toBe(false);
  });
});
