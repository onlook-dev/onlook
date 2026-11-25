import { beforeEach, describe, expect, it } from 'bun:test';
import type { ImportSetupProgress, ProjectSetupAskResult, ProjectSetupFailure, ProjectSetupSnapshot } from '@studio/events';

import {
  askFromSetupFailureCard,
  canvasCentre,
  isSetupFailureCardShown,
  setupFailureCard,
  useSetupFailureCardStore,
  type CanvasCentreFacts,
} from './failureCentre.js';

const saved = { revision: 'r1' } as NonNullable<ProjectSetupSnapshot['saved']>;
const failedAt = (stage: ProjectSetupFailure['stage']): ProjectSetupSnapshot =>
  ({ state: 'failed', saved, failure: { stage, revision: 'r1' } }) as unknown as ProjectSetupSnapshot;
const progressAt = (step: 2 | 3, stage?: ProjectSetupFailure['stage']): ImportSetupProgress => ({
  state: 'failed',
  at: step,
  failure: { step, ...(stage === undefined ? {} : { stage }) },
});

const facts = (over: Partial<CanvasCentreFacts> = {}): CanvasCentreFacts => ({
  progress: progressAt(2, 'install'),
  snapshot: failedAt('install'),
  agentFailed: false,
  hasNodes: false,
  isCreateFailed: true,
  isFootOn: true,
  ...over,
});

describe('the canvas centre after an import’s setup fails (ONL-2961)', () => {
  it('holds the install card for a failed install or prepare', () => {
    expect(canvasCentre(facts())).toEqual({ kind: 'card', card: { step: 'install', cause: 'install' } });
    expect(canvasCentre(facts({ progress: progressAt(2, 'prepare'), snapshot: failedAt('prepare') }))).toEqual({ kind: 'card', card: { step: 'install', cause: 'install' } });
  });

  it('holds the start card for a failed start, with readiness named apart', () => {
    expect(canvasCentre(facts({ progress: progressAt(3, 'start'), snapshot: failedAt('start') }))).toEqual({ kind: 'card', card: { step: 'start', cause: 'start' } });
    expect(canvasCentre(facts({ progress: progressAt(3, 'ready'), snapshot: failedAt('ready') }))).toEqual({ kind: 'card', card: { step: 'start', cause: 'ready' } });
  });

  it('leaves frame controls clear after saved setup fails in any project', () => {
    expect(canvasCentre(facts({ hasNodes: true })).kind).toBe('illustration');
  });

  it('offers repair in chat after saved setup fails with frames already on the canvas', () => {
    const reopened = facts({ hasNodes: true, progress: progressAt(3, 'ready'), snapshot: failedAt('ready') });
    expect(setupFailureCard(reopened, 'chat')).toEqual({ step: 'start', cause: 'ready' });
    expect(setupFailureCard(reopened)).toBeNull();
    expect(setupFailureCard({ ...reopened, snapshot: { ...failedAt('ready'), state: 'running', failure: null } }, 'chat')).toBeNull();
  });

  it('shows no card when the agent itself failed', () => {
    expect(canvasCentre(facts({ agentFailed: true })).kind).toBe('illustration');
  });

  it('shows no card for a failure the setup machine did not name, since there is no repair to ask for', () => {
    expect(canvasCentre(facts({ progress: progressAt(3) })).kind).toBe('illustration');
    expect(canvasCentre(facts({ snapshot: { ...failedAt('install'), saved: null } as ProjectSetupSnapshot })).kind).toBe('illustration');
    expect(canvasCentre(facts({ snapshot: { ...failedAt('install'), state: 'installing' } as ProjectSetupSnapshot })).kind).toBe('illustration');
  });

  it('leaves the centre clear while a failed import’s setup runs again', () => {
    expect(canvasCentre(facts({ progress: { state: 'running', at: 2 }, snapshot: { ...failedAt('install'), state: 'installing' } as ProjectSetupSnapshot }))).toEqual({ kind: 'clear' });
  });

  it('keeps the illustration while setup runs again with rail-foot off, as nothing else says where it stands', () => {
    expect(canvasCentre(facts({ isFootOn: false, progress: { state: 'running', at: 2 }, snapshot: { ...failedAt('install'), state: 'installing' } as ProjectSetupSnapshot })).kind).toBe('illustration');
  });
});

describe('the card’s ask (ONL-2961)', () => {
  const answering = (result: ProjectSetupAskResult) => {
    let resolve!: (value: ProjectSetupAskResult) => void;
    const asked = new Promise<ProjectSetupAskResult>((r) => (resolve = r));
    return { bridge: { projectSetupAsk: () => asked }, answer: () => resolve(result) };
  };
  const failure = (elapsedMs: number): ProjectSetupFailure =>
    ({ revision: 'r1', stage: 'install', command: 'bun install', exitCode: 1, reason: 'exited', outputTail: 'boom', elapsedMs });
  const first = failure(900);
  const shown = (on: { failure?: ProjectSetupFailure; asked?: ProjectSetupFailure | null; streaming?: boolean; workspacePath?: string } = {}) =>
    isSetupFailureCardShown({
      ask: useSetupFailureCardStore.getState().ask,
      workspacePath: on.workspacePath ?? '/p',
      isStreaming: on.streaming ?? false,
      asked: on.asked ?? null,
      failure: on.failure ?? first,
    });

  beforeEach(() => useSetupFailureCardStore.setState({ ask: { state: 'idle' } }));

  it('stays away after the tap, through the repair turn and after it ends, while the failure stands', async () => {
    const { bridge, answer } = answering({ ok: true });
    const asked = askFromSetupFailureCard('/p', first, bridge);
    expect(shown()).toBe(false);
    answer();
    await asked;
    expect(shown({ streaming: true })).toBe(false);
    expect(shown({ failure: { ...first } })).toBe(false);
  });

  it('comes back once the failure changes, such as a rerun failing again', async () => {
    const { bridge, answer } = answering({ ok: true });
    const asked = askFromSetupFailureCard('/p', first, bridge);
    answer();
    await asked;
    expect(shown({ failure: failure(1200) })).toBe(true);
  });

  it('stays away after a relaunch when the transcript asked about this failure, and not about another', () => {
    expect(shown({ asked: { ...first } })).toBe(false);
    expect(shown({ asked: failure(1200) })).toBe(true);
  });

  it('comes back at once when the agent refuses the ask', async () => {
    for (const reason of ['busy', 'unavailable', 'not-applicable'] as const) {
      const { bridge, answer } = answering({ ok: false, reason });
      const asked = askFromSetupFailureCard('/p', first, bridge);
      answer();
      await asked;
      expect(shown()).toBe(true);
    }
  });

  it('comes back when the bridge throws', async () => {
    await askFromSetupFailureCard('/p', first, { projectSetupAsk: () => Promise.reject(new Error('gone')) });
    expect(shown()).toBe(true);
  });

  it('sends one ask for a second tap while the first is in flight', async () => {
    let calls = 0;
    const { answer } = answering({ ok: true });
    const bridge = { projectSetupAsk: () => { calls += 1; return new Promise<ProjectSetupAskResult>(() => answer()); } };
    void askFromSetupFailureCard('/p', first, bridge);
    expect(await askFromSetupFailureCard('/p', first, bridge)).toEqual({ ok: false, reason: 'busy' });
    expect(calls).toBe(1);
  });

  it('shows in another project whatever this one asked', () => {
    void askFromSetupFailureCard('/p', first, { projectSetupAsk: () => new Promise(() => undefined) });
    expect(shown({ workspacePath: '/other' })).toBe(true);
  });

  it('stays away while any turn runs', () => {
    expect(shown({ streaming: true })).toBe(false);
  });
});
