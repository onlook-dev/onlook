// Spends tokens: a resumed session remembering needs a real turn (ONL-1913).

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { foldSessionState } from '@studio/events';
import type { StudioEvent } from '@studio/events';
import type { AgentSessionOptions } from '../../apps/studio/src/main/agent-host/session.js';
import { liveClaudeEnv } from '../apparatus/src/live-claude-env.js';

const MODEL = 'haiku';
const CODEWORD = 'ZEPHYR-7742';

const made: string[] = [];
function tempRoot(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `studio-live-${tag}-`));
  made.push(dir);
  return dir;
}

let AgentSession: typeof import('../../apps/studio/src/main/agent-host/session.js').AgentSession;
let sessions: typeof import('../../apps/studio/src/main/agent-host/sessions.js');
let liveQuery: NonNullable<AgentSessionOptions['query']>;

let skipReason: string | undefined;

before(async () => {
  process.env['STUDIO_STATE_ROOT'] = tempRoot('state');
  const configDir = tempRoot('claude-config');
  const { userEnv } = await import('../../apps/studio/src/main/env/shell-env.js');
  const loginEnv = await userEnv();
  process.env['CLAUDE_CONFIG_DIR'] = configDir;
  ({ AgentSession } = await import('../../apps/studio/src/main/agent-host/session.js'));
  sessions = await import('../../apps/studio/src/main/agent-host/sessions.js');
  const { recordingQuery } = await import('../../apps/studio/src/main/agent-host/recorded-stream.js');
  const sdkQuery = recordingQuery(() => undefined);
  liveQuery = (params) => sdkQuery({
    ...params,
    options: { ...params.options, env: liveClaudeEnv(configDir, loginEnv, params.options?.env) },
  });

  const { probeConnection } = await import('../../apps/studio/src/main/agent-host/connection.js');
  const probe = await probeConnection();
  if (probe.status !== 'ok') {
    skipReason = `the Claude CLI is not usable on this machine (probe said "${probe.status}"). NOTHING RAN.`;
    console.error(`\n⚠️  tests/live/resume.live.ts SKIPPED — ${skipReason}\n`);
  }
});

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

interface Driven {
  events: StudioEvent[];
  lastAssistantText: string;
  sdkSessionId: string | undefined;
  model: string | undefined;
}

async function drive(options: {
  cwd: string;
  prompt: string;
  sessionId?: string;
  resume?: string;
  model?: string;
  initialEvents?: readonly StudioEvent[];
}): Promise<Driven> {
  const events: StudioEvent[] = [];
  let settle!: () => void;
  const ended = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const session = new AgentSession({
    cwd: options.cwd,
    query: liveQuery,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.resume === undefined ? {} : { resume: options.resume }),
    onEvent: (event) => {
      events.push(event);
      if (event.type === 'turn.ended' || event.type === 'session.error') settle();
    },
    onState: () => undefined,
    onConnection: () => undefined,
  });

  if (options.initialEvents !== undefined) session.restoreTranscript(options.initialEvents);
  session.prompt(options.prompt);
  await Promise.race([
    ended,
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('the turn never ended')), 120_000),
    ),
  ]);
  await session.close();

  const failure = events.find((event) => event.type === 'session.error');
  assert.equal(failure, undefined, failure?.type === 'session.error' ? failure.message : undefined);

  const started = events.find((e) => e.type === 'session.started');
  const state = foldSessionState(events);
  const texts = state.items.filter((i) => i.kind === 'assistant-text');
  return {
    events,
    lastAssistantText: texts.at(-1)?.kind === 'assistant-text' ? (texts.at(-1) as { text: string }).text : '',
    sdkSessionId: started?.type === 'session.started' ? started.sdkSessionId : undefined,
    model: started?.type === 'session.started' ? started.model : undefined,
  };
}

const ourId = (): string => crypto.randomUUID();

describe('the real resume round trip', () => {
  it('reports back the session id we minted', async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('instrument');
    const id = ourId();
    const run = await drive({ cwd, sessionId: id, model: MODEL, prompt: 'Reply with just: OK' });

    assert.equal(run.sdkSessionId, id, 'the SDK ran under a different id than we handed it');
  });

  it('resumes and recalls what the first turn established', async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('recall');
    const id = ourId();
    await drive({
      cwd,
      sessionId: id,
      model: MODEL,
      prompt: `Remember this codeword: ${CODEWORD}. Reply with just: OK`,
    });

    const resumed = await drive({
      cwd,
      resume: id,
      prompt: 'What was the codeword I gave you? Reply with only the codeword.',
    });

    assert.match(
      resumed.lastAssistantText,
      new RegExp(CODEWORD, 'i'),
      `resumed session did not recall the codeword. Said: ${resumed.lastAssistantText}`,
    );
  });

  it("moves a resume with no choice onto the SDK's default, off the model it started on", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('model');
    const id = ourId();
    const first = await drive({ cwd, sessionId: id, model: MODEL, prompt: 'Reply with just: OK' });

    const resumed = await drive({ cwd, resume: id, prompt: 'Reply with just: OK' });

    const freshDefault = await drive({ cwd: tempRoot('default-model'), sessionId: ourId(), model: 'default', prompt: 'Reply with just: OK' });

    assert.ok(first.model, 'the first turn reported no model at all');
    assert.ok(freshDefault.model, 'the fresh default session reported no model');
    assert.notEqual(freshDefault.model, first.model, 'the chosen model must differ from the SDK default for this check');
    assert.equal(resumed.model, freshDefault.model, 'the resumed session did not use the current SDK default');
  });

  it("keeps the user's own choice across a resume", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('model-kept');
    const id = ourId();
    const first = await drive({ cwd, sessionId: id, model: MODEL, prompt: 'Reply with just: OK' });

    const resumed = await drive({ cwd, resume: id, model: MODEL, prompt: 'Reply with just: OK' });

    assert.equal(resumed.model, first.model, 'the resumed session dropped the model the user chose');
  });

  it('restores our transcript alongside the memory, continuing the seq', async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('transcript');
    const id = ourId();
    const first = await drive({
      cwd,
      sessionId: id,
      model: MODEL,
      prompt: `Remember this codeword: ${CODEWORD}. Reply with just: OK`,
    });
    const highWater = Math.max(...first.events.map((e) => e.seq));

    const resumed = await drive({
      cwd,
      resume: id,
      initialEvents: first.events,
      prompt: 'What was the codeword? Reply with only the codeword.',
    });

    assert.ok(
      resumed.events.length > 0 && highWater > 0,
      'no events to continue from — the first turn produced nothing',
    );
    const fresh = resumed.events.filter((e) => !first.events.some((f) => f.eventId === e.eventId));
    assert.ok(fresh.length > 0, 'the resumed turn produced no new events');
    assert.ok(
      fresh.every((e) => e.seq > highWater),
      `a new event reused a restored seq (high water ${String(highWater)}) — a renderer would drop it`,
    );
  });

  // The negative control: without it the recall cases pass equally against a model guessing a plausible codeword.
  it('a fresh session does NOT know the codeword', async (t) => {
    if (skipReason) return t.skip(skipReason);
    const cwd = tempRoot('control');
    const run = await drive({
      cwd,
      sessionId: ourId(),
      model: MODEL,
      prompt: 'What was the codeword I gave you? If you were not given one, reply with just: NONE',
    });

    assert.doesNotMatch(
      run.lastAssistantText,
      new RegExp(CODEWORD, 'i'),
      `a session with no history produced the codeword — the recall cases prove nothing. Said: ${run.lastAssistantText}`,
    );
  });

  it('refuses to resume a valid id against a different project', async (t) => {
    if (skipReason) return t.skip(skipReason);
    const owner = tempRoot('owner');
    const stranger = tempRoot('stranger');
    const id = ourId();
    await drive({ cwd: owner, sessionId: id, model: MODEL, prompt: 'Reply with just: OK' });

    sessions.rememberSession(owner, id, MODEL);
    sessions.resetSessionsCache();
    assert.deepEqual(await sessions.planSession(owner), { kind: 'resume', sessionId: id }, 'the owner could not look up its stored session');

    sessions.rememberSession(stranger, id, MODEL);
    sessions.resetSessionsCache();
    const plan = await sessions.planSession(stranger);

    assert.equal(plan.kind, 'fresh', 'a session from another workspace was accepted for resume');
    assert.notEqual(plan.sessionId, id, 'the refused id was handed back as the fresh one');
  });
});
