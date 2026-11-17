import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { resetImagesStore } from '../../images/store.js';
import { SESSION_CLOSED, type SessionEndSummary, type TurnSummary } from '../event-log.js';
import { resetSessionsCache } from '../sessions.js';
import { resetTranscriptCache } from '../transcript.js';
import { AppServerSession, type SessionTransport } from './session.js';
import type { TransportHandlers } from './transport.js';

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
let scratch: string;
let codexRoot: string;

beforeAll(() => {
  const temporaryRoot = join(process.cwd(), '.scratch/tmp');
  mkdirSync(temporaryRoot, { recursive: true });
  scratch = mkdtempSync(join(temporaryRoot, 'appserver-retry-'));
  process.env['STUDIO_STATE_ROOT'] = join(scratch, 'state');
  resetSessionsCache();
  resetTranscriptCache();
  codexRoot = join(scratch, 'codex');
  mkdirSync(codexRoot);
  for (const name of ['codex', 'codex-code-mode-host']) {
    writeFileSync(join(codexRoot, name), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  }
});

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  resetSessionsCache();
  resetTranscriptCache();
  resetImagesStore();
  rmSync(scratch, { recursive: true, force: true });
});

const sessions: AppServerSession[] = [];

afterEach(async () => {
  for (const session of sessions.splice(0)) await session.close();
});

function fakeWire() {
  let handlers: TransportHandlers | undefined;
  let starts = 0;
  let ready = false;
  const transport: SessionTransport = {
    request: (method) => Promise.resolve().then(() => {
      if (method === 'model/list') return { data: [] };
      if (method === 'thread/start') {
        ready = true;
        return { thread: { id: 'thread-1' }, model: 'gpt-5.5' };
      }
      if (method === 'turn/start') {
        starts++;
        return { turn: { id: `turn-${starts}` } };
      }
      return {};
    }),
    notify: () => undefined,
    respond: () => undefined,
    respondError: () => undefined,
    close: () => Promise.resolve(),
  };
  return {
    connect: (given: TransportHandlers): SessionTransport => {
      handlers = given;
      return transport;
    },
    get ready() { return ready; },
    get starts() { return starts; },
    frame(method: string, params: unknown): void {
      if (handlers === undefined) throw new Error('session transport is not connected');
      const frame = { method, params };
      handlers.onFrame?.(JSON.stringify(frame), frame, 'notification');
    },
  };
}

async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50 && !check(); attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  if (!check()) throw new Error('condition never held');
}

async function openedSession() {
  const wire = fakeWire();
  const emitted: StudioEvent[] = [];
  const summaries: TurnSummary[] = [];
  const ended: SessionEndSummary[] = [];
  const session = new AppServerSession({
    cwd: mkdtempSync(join(scratch, 'cwd-')),
    codexRoot,
    captureRoot: mkdtempSync(join(scratch, 'capture-')),
    connect: wire.connect,
    onEvent: (event) => emitted.push(event),
    onState: () => undefined,
    onConnection: () => undefined,
    onTurnEnded: (summary) => summaries.push(summary),
    onEnded: (summary) => ended.push(summary),
  });
  sessions.push(session);
  session.open();
  await until(() => wire.ready);
  return { wire, session, emitted, summaries, ended };
}

async function startTurn(session: AppServerSession, wire: ReturnType<typeof fakeWire>): Promise<string> {
  const ordinal = wire.starts + 1;
  expect(session.prompt('make the button blue')).toBe(true);
  await until(() => wire.starts === ordinal);
  const turnId = `turn-${ordinal}`;
  wire.frame('turn/started', { threadId: 'thread-1', turn: { id: turnId } });
  expect(session.isStreaming).toBe(true);
  return turnId;
}

function retry(wire: ReturnType<typeof fakeWire>, turnId: string, status: number, ordinal: number): void {
  wire.frame('error', {
    threadId: 'thread-1',
    turnId,
    willRetry: true,
    error: {
      message: `Reconnecting... ${ordinal}/5`,
      codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: status } },
    },
  });
}

describe('Codex retry lifecycle summaries (ONL-2524)', () => {
  it('closing mid-retry reports the latest status and observed count exactly once as interrupted', async () => {
    const { wire, session, emitted, summaries, ended } = await openedSession();
    const turnId = await startTurn(session, wire);
    retry(wire, turnId, 429, 3);
    retry(wire, turnId, 503, 4);

    expect(session.isStreaming).toBe(true);
    expect(summaries).toHaveLength(0);
    expect(ended).toHaveLength(0);

    await session.close();
    wire.frame('turn/completed', { turn: { id: turnId, status: 'interrupted' } });
    await session.close();

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      stopReason: SESSION_CLOSED,
      retryAttempts: null,
      retryObservedCount: 2,
      retryLastStatus: 503,
    });
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ reason: 'interrupted', turnCount: 1 });
    const retries = emitted.filter((event) => event.type === 'session.retrying');
    expect(retries.map((event) => event.status)).toEqual([429, 503]);
    expect(retries.map((event) => event.attempt ?? null)).toEqual([null, null]);
  });

  it('the next clean turn resets observed retries and status without inventing attempt ordinals', async () => {
    const { wire, session, emitted, summaries } = await openedSession();
    const firstTurnId = await startTurn(session, wire);
    retry(wire, firstTurnId, 503, 4);
    wire.frame('turn/completed', { turn: { id: firstTurnId, status: 'completed' } });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      retryAttempts: null,
      retryObservedCount: 1,
      retryLastStatus: 503,
    });
    expect(summaries[0]?.stopReason).toBe('completed');

    const secondTurnId = await startTurn(session, wire);
    wire.frame('turn/completed', { turn: { id: secondTurnId, status: 'completed' } });
    await session.close();

    expect(summaries).toHaveLength(2);
    expect(summaries[1]).toMatchObject({
      retryAttempts: null,
      retryObservedCount: 0,
      retryLastStatus: null,
    });
    expect(summaries[1]?.stopReason).toBe('completed');
    const retries = emitted.filter((event) => event.type === 'session.retrying');
    expect(retries.map((event) => event.attempt ?? null)).toEqual([null]);
  });
});
