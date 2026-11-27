import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import type {
  AgentCommandAcceptance,
  ClientCommand,
  GitPillDefaults,
  GitPillDefaultsPatch,
  GitSnapshotRow,
  GitStatusChange,
  GitStatusList,
  PenView,
  RendererLogLine,
  StudioEvent,
} from '@studio/events';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { MEASUREMENT_FIXTURES, measurement, row } from '@studio/git-ui/measurement-fixtures';
import type { GitPillState } from '@studio/git-ui/state';
import { useOnScreenStore } from '../tips/onScreen.js';
import {
  noteGitStatusAssignment,
  noteBrowserOpen,
  noteNoActionPress,
  noteOpenWorktree,
  pillStateOf,
  primeGitStatus,
  queuedActionFor,
  resetGitStatusPrimeForTests,
  takeBackFor,
  useGitStatusStore,
  watchOpenWorktree,
} from './store.js';

const logged: RendererLogLine[] = [];

const WT = '/ws/alpha';
const T0 = Date.parse('2026-08-28T10:00:00Z');
const at = (offsetMs: number): string => new Date(T0 + offsetMs).toISOString();

function fakeBridge(): {
  install: () => void;
  releaseReads: (list?: GitStatusList, defaults?: GitPillDefaults) => Promise<void>;
  refuseReads: () => Promise<void>;
  broadcast: (change: GitStatusChange) => void;
  agentEvent: (event: StudioEvent) => void;
  answerCommand: (acceptance: AgentCommandAcceptance | Error, index?: number) => void;
  answerDefault: (index: number, defaults: GitPillDefaults) => void;
  commands: ClientCommand[];
  patches: GitPillDefaultsPatch[];
  failSetDefault: boolean;
  deferSetDefault: boolean;
  failTelemetry: boolean;
  telemetry: { event: string; properties: Record<string, unknown> }[];
  counts: () => { listGitStatus: number; gitPillDefaults: number; subscriptions: number };
} {
  let listCalls = 0;
  let defaultsCalls = 0;
  let subscriptions = 0;
  let releaseList: ((list: GitStatusList) => void) | undefined;
  let releaseDefaults: ((defaults: GitPillDefaults) => void) | undefined;
  const refusals: ((reason: Error) => void)[] = [];
  let changedListener: ((change: GitStatusChange) => void) | undefined;
  let agentListener: ((event: StudioEvent) => void) | undefined;
  const answers: { resolve: (a: AgentCommandAcceptance) => void; reject: (e: Error) => void }[] = [];
  const defaultAnswers: ((defaults: GitPillDefaults) => void)[] = [];
  const commands: ClientCommand[] = [];
  const patches: GitPillDefaultsPatch[] = [];
  const pending: Promise<unknown>[] = [];

  const self = {
    commands,
    patches,
    failSetDefault: false,
    deferSetDefault: false,
    failTelemetry: false,
    telemetry: [] as { event: string; properties: Record<string, unknown> }[],
    install(): void {
      Object.defineProperty(globalThis, 'window', {
        value: {
          studio: {
            log(line: RendererLogLine): void {
              logged.push(line);
            },
            telemetryException(): void {},
            onAgentEvent(listener: (event: StudioEvent) => void): () => void { agentListener = listener; return () => {}; },
            listGitStatus(): Promise<GitStatusList> {
              listCalls += 1;
              const p = new Promise<GitStatusList>((resolve, reject) => {
                releaseList = resolve;
                refusals.push(reject);
              });
              pending.push(p);
              return p;
            },
            gitPillDefaults(): Promise<GitPillDefaults> {
              defaultsCalls += 1;
              const p = new Promise<GitPillDefaults>((resolve, reject) => {
                releaseDefaults = resolve;
                refusals.push(reject);
              });
              pending.push(p);
              return p;
            },
            onGitStatusChanged(listener: (change: GitStatusChange) => void): () => void {
              subscriptions += 1;
              changedListener = listener;
              return () => {};
            },
            agentCommand(command: ClientCommand): Promise<AgentCommandAcceptance> {
              commands.push(command);
              return new Promise<AgentCommandAcceptance>((resolve, reject) => {
                answers.push({ resolve, reject });
              });
            },
            setGitPillDefault(patch: GitPillDefaultsPatch): Promise<GitPillDefaults> {
              patches.push(patch);
              if (self.failSetDefault) return Promise.reject(new Error('ipc down'));
              if (self.deferSetDefault) {
                return new Promise<GitPillDefaults>((resolve) => {
                  defaultAnswers.push(resolve);
                });
              }
              return Promise.resolve({ ...GIT_PILL_SHIPPED_DEFAULTS, ...patch });
            },
            telemetryEvent(event: { event: string; properties: Record<string, unknown> }): void {
              if (self.failTelemetry) throw new Error('bridge down');
              self.telemetry.push(event);
            },
          },
        },
        configurable: true,
        writable: true,
      });
    },
    async releaseReads(list: GitStatusList = {}, defaults: GitPillDefaults = GIT_PILL_SHIPPED_DEFAULTS): Promise<void> {
      releaseList?.(list);
      releaseDefaults?.(defaults);
      await Promise.all(pending);
      await Promise.resolve();
      await Promise.resolve();
    },
    async refuseReads(): Promise<void> {
      for (const refuse of refusals) refuse(new Error('read refused'));
      await Promise.allSettled(pending);
      await Promise.resolve();
      await Promise.resolve();
    },
    broadcast(change: GitStatusChange): void {
      changedListener?.(change);
    },
    agentEvent(event: StudioEvent): void { agentListener?.(event); },
    answerCommand(acceptance: AgentCommandAcceptance | Error, index = answers.length - 1): void {
      const answer = answers[index];
      if (acceptance instanceof Error) answer?.reject(acceptance);
      else answer?.resolve(acceptance);
    },
    answerDefault(index: number, defaults: GitPillDefaults): void {
      defaultAnswers[index]?.(defaults);
    },
    counts: () => ({ listGitStatus: listCalls, gitPillDefaults: defaultsCalls, subscriptions }),
  };
  return self;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

let bridge: ReturnType<typeof fakeBridge>;

beforeEach(() => {
  logged.length = 0;
  resetGitStatusPrimeForTests();
  useOnScreenStore.setState({ isOnScreen: true });
  bridge = fakeBridge();
  bridge.install();
});

afterEach(() => {
  resetGitStatusPrimeForTests();
  useOnScreenStore.setState({ isOnScreen: false });
  Reflect.deleteProperty(globalThis, 'window');
});

it('the inert-press producer records the state without sending an agent prompt', () => {
  noteNoActionPress(WT, 'passive-state');
  expect(bridge.telemetry).toEqual([{
    event: 'git_pill_no_action', properties: { worktreePath: WT, state: 'first-paint', reason: 'passive-state' },
  }]);
  expect(bridge.commands).toEqual([]);
});

const change = (r: GitSnapshotRow, worktreePath = WT): GitStatusChange => ({ worktreePath, row: r });
const pill = (): GitPillState => {
  const { rows, defaults, working } = useGitStatusStore.getState();
  return pillStateOf(rows[WT], defaults, working[WT]);
};

describe('primeGitStatus', () => {
  it('records selected tab state changes in an unfocused window', async () => {
    useOnScreenStore.setState({ isOnScreen: false });
    watchOpenWorktree(() => () => {}, WT);
    const primed = primeGitStatus();
    await bridge.releaseReads({ [WT]: row(MEASUREMENT_FIXTURES['create-pr']) });
    await primed;
    bridge.broadcast(change(row(MEASUREMENT_FIXTURES['checks-running'], { measuredAt: at(1_000) })));
    expect(bridge.telemetry.filter((event) => event.event === 'git_pill_shown')
      .map((event) => event.properties['state'])).toEqual(['create-pr', 'checks-running']);
  });

  it('does not report a prepared background tab until selected, then reports its current state once', async () => {
    useOnScreenStore.setState({ isOnScreen: false });
    const assignment = { tabId: 'tab-a', purpose: 'project', workspacePath: WT, repoIdentity: 'repo-a' } as const;
    noteGitStatusAssignment({ ...assignment, restoring: true });
    watchOpenWorktree(() => () => {}, WT);
    const primed = primeGitStatus();
    await bridge.releaseReads(
      { [WT]: row(MEASUREMENT_FIXTURES['create-pr'], { measuredAt: at(0), trigger: 'open' }) },
      { noPr: 'push', ready: 'merge' },
    );
    await primed;
    const shown = (): string[] => bridge.telemetry
      .filter((event) => event.event === 'git_pill_shown')
      .map((event) => String(event.properties['state']));
    expect(pill().id).toBe('push');
    expect(shown()).toEqual([]);

    bridge.broadcast(change(row(MEASUREMENT_FIXTURES['checks-running'], { measuredAt: at(1_000) })));
    useOnScreenStore.setState({ isOnScreen: true });
    expect(shown()).toEqual([]);
    useOnScreenStore.setState({ isOnScreen: false });
    noteGitStatusAssignment(assignment);
    expect(shown()).toEqual(['checks-running']);
    noteGitStatusAssignment(assignment);
    bridge.broadcast(change(row(MEASUREMENT_FIXTURES['checks-running'], { measuredAt: at(2_000) })));
    useOnScreenStore.setState({ isOnScreen: true });
    expect(shown()).toEqual(['checks-running']);
    useOnScreenStore.setState({ isOnScreen: false });
    bridge.broadcast(change(row(MEASUREMENT_FIXTURES['ready-to-merge'], { measuredAt: at(3_000) })));
    expect(shown()).toEqual(['checks-running', 'ready-to-merge']);
  });

  it.each([1, 3])('matches main Git pill event counts with %i tabs in an unfocused window', async (tabCount) => {
    useOnScreenStore.setState({ isOnScreen: false });
    const countShown = async (prepareBackground: boolean): Promise<number> => {
      let total = 0;
      for (let tabIndex = 0; tabIndex < tabCount; tabIndex += 1) {
        resetGitStatusPrimeForTests();
        bridge = fakeBridge();
        bridge.install();
        const assignment = { tabId: `tab-${tabIndex}`, purpose: 'project', workspacePath: WT, repoIdentity: 'repo-a' } as const;
        const isPrepared = prepareBackground && tabIndex === 1;
        noteGitStatusAssignment(isPrepared ? { ...assignment, restoring: true } : assignment);
        watchOpenWorktree(() => () => {}, WT);
        const primed = primeGitStatus();
        const initial = tabIndex === 1 && !isPrepared ? 'checks-running' : 'create-pr';
        await bridge.releaseReads({ [WT]: row(MEASUREMENT_FIXTURES[initial]) });
        await primed;
        if (tabIndex !== 1 || isPrepared) {
          bridge.broadcast(change(row(MEASUREMENT_FIXTURES['checks-running'], { measuredAt: at(1_000) })));
        }
        if (isPrepared) {
          expect(bridge.telemetry.filter((event) => event.event === 'git_pill_shown')).toHaveLength(0);
          noteGitStatusAssignment(assignment);
        }
        total += bridge.telemetry.filter((event) => event.event === 'git_pill_shown').length;
      }
      return total;
    };
    const mainCount = await countShown(false);
    expect(mainCount).toBe(tabCount === 1 ? 2 : 5);
    expect(await countShown(true)).toBe(mainCount);
  });

  it('reads and subscribes once however many times it is called', async () => {
    const first = primeGitStatus();
    const second = primeGitStatus();
    expect(bridge.counts()).toEqual({ listGitStatus: 1, gitPillDefaults: 1, subscriptions: 1 });

    await bridge.releaseReads();
    await Promise.all([first, second]);
    expect(bridge.counts()).toEqual({ listGitStatus: 1, gitPillDefaults: 1, subscriptions: 1 });
  });

  it('keeps a change emitted between subscribe and the list answer', async () => {
    const primed = primeGitStatus();
    const fresh = row(MEASUREMENT_FIXTURES['ready-to-merge'], { measuredAt: at(5_000) });
    bridge.broadcast(change(fresh));

    await bridge.releaseReads({ [WT]: row(MEASUREMENT_FIXTURES['create-pr'], { measuredAt: at(0) }) });
    await primed;

    expect(useGitStatusStore.getState().rows[WT]).toBe(fresh);
    expect(pill().id).toBe('ready-to-merge');
  });

  it('once primed, derives the listed row under the stored defaults', async () => {
    const primed = primeGitStatus();
    await bridge.releaseReads({ [WT]: row(MEASUREMENT_FIXTURES['create-pr']) }, { noPr: 'push', ready: 'merge' });
    await primed;

    expect(useGitStatusStore.getState().defaults).toEqual({ noPr: 'push', ready: 'merge' });
    expect(pill().id).toBe('push');
  });

  it('leaves a default chosen during the read where the person put it', async () => {
    const primed = primeGitStatus();
    await useGitStatusStore.getState().setDefault({ noPr: 'push' });

    await bridge.releaseReads({}, GIT_PILL_SHIPPED_DEFAULTS);
    await primed;

    expect(useGitStatusStore.getState().defaults.noPr).toBe('push');
  });

  it('leaves a default whose write is still out where the person put it', async () => {
    bridge.deferSetDefault = true;
    const primed = primeGitStatus();
    const chosen = useGitStatusStore.getState().setDefault({ noPr: 'push' });

    await bridge.releaseReads({}, GIT_PILL_SHIPPED_DEFAULTS);
    await primed;
    expect(useGitStatusStore.getState().defaults.noPr).toBe('push');

    bridge.answerDefault(0, { noPr: 'push', ready: 'merge' });
    await chosen;
    expect(useGitStatusStore.getState().defaults).toEqual({ noPr: 'push', ready: 'merge' });
  });

  it('logs refused reads, and writes no default over the one the person chose', async () => {
    const kept = row(MEASUREMENT_FIXTURES['create-pr']);
    const primed = primeGitStatus();
    bridge.broadcast(change(kept));
    await useGitStatusStore.getState().setDefault({ noPr: 'push' });

    await bridge.refuseReads();
    await primed;

    expect(useGitStatusStore.getState().defaults.noPr).toBe('push');
    expect(useGitStatusStore.getState().rows[WT]).toBe(kept);
    expect(logged.map((line) => `${line.subsystem}: ${line.msg}`).sort()).toEqual([
      'git-status: defaults read refused',
      'git-status: list read refused',
    ]);
  });
});

describe('click', () => {
  beforeEach(() => {
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'], { measuredAt: at(-60_000) })));
  });

  it('sets the working form synchronously and sends the prompt', () => {
    void useGitStatusStore.getState().click(WT, 'create-pr', 'open a pull request');

    expect(pill()).toMatchObject({ id: 'create-pr', mode: 'working' });
    expect(useGitStatusStore.getState().working[WT]?.action).toBe('create-pr');
    expect(bridge.commands).toEqual([{ type: 'prompt', text: 'open a pull request' }]);
  });

  it('clears the form when the command is not accepted', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', 'open a pull request');
    bridge.answerCommand({ accepted: false });
    await clicked;

    expect(useGitStatusStore.getState().working).toEqual({});
    expect(pill()).toEqual({ id: 'create-pr', dirty: true });
  });

  it('clears the form when the command rejects', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', 'open a pull request');
    bridge.answerCommand(new Error('bridge down'));
    await clicked;

    expect(useGitStatusStore.getState().working).toEqual({});
  });

  it('keeps the form when the command is accepted', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', 'open a pull request');
    bridge.answerCommand({ accepted: true });
    await clicked;
    await settle();

    expect(pill()).toMatchObject({ mode: 'working' });
  });

  it('a late refusal does not clear a newer click', async () => {
    const first = useGitStatusStore.getState().click(WT, 'create-pr', 'first');
    void useGitStatusStore.getState().click(WT, 'push', 'second');
    bridge.answerCommand({ accepted: false }, 0);
    await first;

    expect(useGitStatusStore.getState().working[WT]?.action).toBe('push');
  });
});

const PROMPT = 'open a pull request';
const penOf = (over: Partial<PenView> = {}): PenView => ({ penId: 7, text: PROMPT, ...over });

describe('a press the pen holds (ONL-2379)', () => {
  beforeEach(() => {
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'], { measuredAt: at(-60_000) })));
  });

  it('holds the press instead of working it, and reads as queued while the pen is the press alone', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();

    const { held, working } = useGitStatusStore.getState();
    expect(working).toEqual({});
    expect(held[WT]?.action).toBe('create-pr');
    expect(queuedActionFor(held[WT], penOf())).toBe('create-pr');
    expect(pill()).toMatchObject({ id: 'create-pr' });
    expect(pill().mode).toBeUndefined();
  });

  it('an ordinary accepted press holds nothing', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true });
    await clicked;
    await settle();

    expect(useGitStatusStore.getState().held).toEqual({});
    expect(useGitStatusStore.getState().working[WT]?.action).toBe('create-pr');
  });

  it('a refused press holds nothing', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: false });
    await clicked;

    expect(useGitStatusStore.getState().held).toEqual({});
    expect(useGitStatusStore.getState().working).toEqual({});
  });

  it('a second press of the same action takes it back and sends nothing more', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();

    const back = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT, penOf());
    bridge.answerCommand({ accepted: true });
    await back;
    await settle();

    expect(bridge.commands).toEqual([
      { type: 'prompt', text: PROMPT },
      { type: 'pen.discard', penId: 7 },
    ]);
    expect(useGitStatusStore.getState().held).toEqual({});
    expect(useGitStatusStore.getState().working).toEqual({});
  });

  it('a take-back the pen refuses sends nothing and cancels nothing', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();
    const before = bridge.telemetry.length;

    const back = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT, penOf());
    bridge.answerCommand({ accepted: false });
    await back;
    await settle();

    expect(bridge.commands).toEqual([
      { type: 'prompt', text: PROMPT },
      { type: 'pen.discard', penId: 7 },
    ]);
    expect(useGitStatusStore.getState().held[WT]?.action).toBe('create-pr');
    expect(bridge.telemetry.slice(before)).toEqual([]);
  });

  it('the same words from the body and from the dropdown are one press, so either takes the other back', async () => {
    const merge = 'merge this pull request';
    const clicked = useGitStatusStore.getState().click(WT, 'merge', merge);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();

    const back = useGitStatusStore.getState().click(WT, 'ready-to-merge', merge, penOf({ text: merge }));
    bridge.answerCommand({ accepted: true });
    await back;
    await settle();

    expect(bridge.commands).toEqual([
      { type: 'prompt', text: merge },
      { type: 'pen.discard', penId: 7 },
    ]);
    expect(useGitStatusStore.getState().held).toEqual({});
  });

  it('counts the press that waits and the press that takes it back', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();

    expect(bridge.telemetry.at(-1)).toEqual({
      event: 'git_pill_queued',
      properties: { worktreePath: WT, state: 'create-pr', action: 'create-pr' },
    });

    const back = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT, penOf());
    bridge.answerCommand({ accepted: true });
    await back;
    await settle();

    expect(bridge.telemetry.at(-1)).toMatchObject({
      event: 'git_pill_outcome',
      properties: { worktreePath: WT, from_state: 'create-pr', to_state: 'create-pr', outcome: 'cancelled' },
    });
  });

  it('a held answer that a newer press superseded records nothing', async () => {
    const first = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    void useGitStatusStore.getState().click(WT, 'push', 'push this branch');
    bridge.answerCommand({ accepted: true, held: true }, 0);
    await first;
    await settle();

    expect(useGitStatusStore.getState().held).toEqual({});
    expect(useGitStatusStore.getState().working[WT]?.action).toBe('push');
  });

  it('drops the record once a turn-end row lands after it, so a long session keeps no stale holds', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();
    const heldAt = useGitStatusStore.getState().held[WT]?.heldAt ?? Number.NaN;

    useGitStatusStore.getState().apply(
      change(row(MEASUREMENT_FIXTURES['create-pr'], { trigger: 'turn-end', measuredAt: new Date(heldAt + 1_000).toISOString() })),
    );

    expect(useGitStatusStore.getState().held).toEqual({});
  });

  it('a press of a different action takes the first back and queues the second in its place', async () => {
    const clicked = useGitStatusStore.getState().click(WT, 'create-pr', PROMPT);
    bridge.answerCommand({ accepted: true, held: true });
    await clicked;
    await settle();

    const second = useGitStatusStore.getState().click(WT, 'push', 'push this branch', penOf());
    bridge.answerCommand({ accepted: true }, 1);
    await settle();
    bridge.answerCommand({ accepted: true, held: true }, 2);
    await second;
    await settle();

    expect(bridge.commands).toEqual([
      { type: 'prompt', text: PROMPT },
      { type: 'pen.discard', penId: 7 },
      { type: 'prompt', text: 'push this branch' },
    ]);
    expect(useGitStatusStore.getState().held[WT]?.action).toBe('push');
  });
});

describe('the queued reading (ONL-2379)', () => {
  const entry = { heldAt: T0, action: 'create-pr' as const, fromState: 'create-pr' as const, text: PROMPT };

  it('names the action only while the pen holds that press alone', () => {
    expect(queuedActionFor(entry, penOf())).toBe('create-pr');
  });

  it('says nothing once a typed prompt has joined it', () => {
    expect(queuedActionFor(entry, penOf({ penId: 8, text: `${PROMPT}\n\nalso make it blue` }))).toBeUndefined();
    expect(queuedActionFor(entry, penOf({ penId: 8, text: `also make it blue\n\n${PROMPT}` }))).toBeUndefined();
  });

  it('says nothing once the pen has latched a hold, because then it waits on the designer', () => {
    expect(queuedActionFor(entry, penOf({ verdict: 'hold' }))).toBeUndefined();
  });

  it('says nothing when the pen carries an attachment, which a press never does', () => {
    expect(queuedActionFor(entry, penOf({ attachments: [{ id: 'img-1', mediaType: 'image/png' }] }))).toBeUndefined();
  });

  it('says nothing with no pen at all, and nothing without a press of its own', () => {
    expect(queuedActionFor(entry, undefined)).toBeUndefined();
    expect(queuedActionFor(undefined, penOf())).toBeUndefined();
  });

  it('hands a take-back the held press itself, so the words sent are the words waiting', () => {
    // The pill's own state may compose something else entirely: a dropdown pick that sets no
    // default leaves the state on its own action, and rebuilding from it would queue that instead.
    const picked = { ...entry, action: 'upload-changes' as const, fromState: 'fix-checks' as const };
    expect(takeBackFor(picked, penOf())).toEqual(picked);
  });

  it('offers no take-back once the claim has died, so a stale press sends nothing', () => {
    expect(takeBackFor(entry, penOf({ verdict: 'hold' }))).toBeUndefined();
    expect(takeBackFor(entry, penOf({ penId: 8, text: `${PROMPT}\n\nalso make it blue` }))).toBeUndefined();
    expect(takeBackFor(entry, undefined)).toBeUndefined();
  });
});

describe('apply against a working form', () => {
  const armed = (): void => {
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'], { measuredAt: at(-60_000) })));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'open a pull request');
  };
  const clickedAt = (): number => useGitStatusStore.getState().working[WT]?.clickedAt ?? Number.NaN;

  it('survives an open-triggered row measured after the click', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['upload-changes'], { trigger: 'open', measuredAt: new Date(clickedAt() + 1_000).toISOString() })));

    expect(pill()).toMatchObject({ id: 'upload-changes', mode: 'working' });
  });

  it('survives a turn-end row measured before the click', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['upload-changes'], { trigger: 'turn-end', measuredAt: new Date(clickedAt() - 1_000).toISOString() })));

    expect(pill()).toMatchObject({ id: 'upload-changes', mode: 'working' });
  });

  it('clears on a turn-end row measured after the click', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['ready-to-merge'], { trigger: 'turn-end', measuredAt: new Date(clickedAt() + 1_000).toISOString() })));

    expect(useGitStatusStore.getState().working).toEqual({});
    expect(pill()).toMatchObject({ id: 'ready-to-merge' });
    expect(pill()).not.toHaveProperty('mode');
  });

  it('clears on a stale turn-end row measured after the click, deriving stale', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'], { trigger: 'turn-end', stale: true, measuredAt: new Date(clickedAt() + 1_000).toISOString() })));

    expect(useGitStatusStore.getState().working).toEqual({});
    expect(pill()).toMatchObject({ id: 'create-pr', mode: 'stale' });
  });

  it('leaves another worktree\'s form alone', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['ready-to-merge'], { trigger: 'turn-end', measuredAt: new Date(clickedAt() + 1_000).toISOString() }), '/ws/beta'));

    expect(pill()).toMatchObject({ mode: 'working' });
  });

  it('does not mark a readout state as working', () => {
    armed();
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['local-only'], { trigger: 'open', measuredAt: new Date(clickedAt() + 1_000).toISOString() })));

    expect(pill()).toEqual({ id: 'local-only' });
  });
});

describe('setDefault', () => {
  it('applies optimistically and keeps the answer', async () => {
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'])));
    const done = useGitStatusStore.getState().setDefault({ noPr: 'push' });
    expect(pill().id).toBe('push');
    await done;

    expect(useGitStatusStore.getState().defaults).toEqual({ noPr: 'push', ready: 'open-in-browser' });
    expect(bridge.patches).toEqual([{ noPr: 'push' }]);
  });

  it('rolls back when the write fails', async () => {
    bridge.failSetDefault = true;
    await useGitStatusStore.getState().setDefault({ ready: 'merge' });

    expect(useGitStatusStore.getState().defaults).toEqual(GIT_PILL_SHIPPED_DEFAULTS);
  });

  it('two overlapping writes answered out of order: the newer wins and shown fires once for the final state', async () => {
    bridge.deferSetDefault = true;
    useGitStatusStore.getState().apply(change(row(MEASUREMENT_FIXTURES['create-pr'])));
    noteOpenWorktree(WT);
    const shown = (): string[] =>
      bridge.telemetry.filter((e) => e.event === 'git_pill_shown').map((e) => String(e.properties['state']));
    expect(shown()).toEqual(['create-pr']);

    const first = useGitStatusStore.getState().setDefault({ noPr: 'push' });
    const second = useGitStatusStore.getState().setDefault({ noPr: 'create-pr' });
    expect(shown()).toEqual(['create-pr', 'push', 'create-pr']);

    bridge.answerDefault(1, { noPr: 'create-pr', ready: 'open-in-browser' });
    await second;
    bridge.answerDefault(0, { noPr: 'push', ready: 'open-in-browser' });
    await first;

    expect(useGitStatusStore.getState().defaults.noPr).toBe('create-pr');
    expect(pill().id).toBe('create-pr');
    expect(shown()).toEqual(['create-pr', 'push', 'create-pr']);
  });
});

describe('telemetry emitters', () => {
  const openRow = (measuredAt: string, fixture: keyof typeof MEASUREMENT_FIXTURES = 'create-pr'): GitSnapshotRow =>
    row(MEASUREMENT_FIXTURES[fixture], { measuredAt, trigger: 'open' });
  const turnEndRow = (measuredAt: string, fixture: keyof typeof MEASUREMENT_FIXTURES = 'create-pr'): GitSnapshotRow =>
    row(MEASUREMENT_FIXTURES[fixture], { measuredAt, trigger: 'turn-end' });
  const afterClick = (deltaMs: number): string =>
    new Date((useGitStatusStore.getState().working[WT]?.clickedAt ?? Date.now()) + deltaMs).toISOString();
  const shownEvents = (): string[] =>
    bridge.telemetry.filter((e) => e.event === 'git_pill_shown').map((e) => String(e.properties['state']));
  const outcomes = (): Record<string, unknown>[] =>
    bridge.telemetry.filter((e) => e.event === 'git_pill_outcome').map((e) => e.properties);
  const toolResult = (result: string, command = 'gh pr create', cwd = WT, ts = Date.now() + 1, status: 'completed' | 'failed' = 'failed'): void => {
    const base = { cwd, ts, seq: 1, eventId: 'tool-result', sessionId: 'session', toolCallId: 'create-pr' };
    bridge.agentEvent({ ...base, type: 'tool.start', name: 'Bash', kind: 'execute', title: command, input: { command }, status: 'in_progress' });
    bridge.agentEvent({ ...base, type: 'tool.end', status, result });
  };

  beforeEach(async () => {
    void primeGitStatus();
    await bridge.releaseReads();
    noteOpenWorktree(WT);
  });

  it('shown fires once per derived state change of the open worktree only', () => {
    bridge.broadcast(change(openRow(at(0))));
    bridge.broadcast(change(openRow(at(1_000))));
    expect(shownEvents()).toEqual(['create-pr']);
    bridge.broadcast(change(openRow(at(2_000), 'checks-running')));
    expect(shownEvents()).toEqual(['create-pr', 'checks-running']);
    bridge.broadcast(change(openRow(at(3_000), 'ready-to-merge'), '/ws/other'));
    expect(shownEvents()).toEqual(['create-pr', 'checks-running']);
  });

  it('an open-worktree change resets the dedupe and re-emits', () => {
    bridge.broadcast(change(openRow(at(0))));
    bridge.broadcast(change(openRow(at(500), 'checks-running'), '/ws/other'));
    noteOpenWorktree('/ws/other');
    expect(shownEvents()).toEqual(['create-pr', 'checks-running']);
  });

  it('clicked carries the rest state and the action id', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'prompt text');
    const clicked = bridge.telemetry.filter((e) => e.event === 'git_pill_clicked');
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.properties['state']).toBe('create-pr');
    expect(clicked[0]?.properties['action']).toBe('create-pr');
    expect(clicked[0]?.properties['worktreePath']).toBe(WT);
  });

  it('a mid-turn open row emits no outcome; the clearing turn-end row emits advanced', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'prompt text');
    bridge.broadcast(change(openRow(afterClick(1_000))));
    expect(outcomes()).toHaveLength(0);
    bridge.broadcast(change(turnEndRow(afterClick(2_000), 'checks-running')));
    const all = outcomes();
    expect(all).toHaveLength(1);
    expect(all[0]?.['outcome']).toBe('advanced');
    expect(all[0]?.['from_state']).toBe('create-pr');
    expect(all[0]?.['to_state']).toBe('checks-running');
    expect(all[0]?.['duration_ms']).toBeGreaterThanOrEqual(0);
  });

  it('a turn-end row deriving the same state is unchanged', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'prompt text');
    bridge.broadcast(change(turnEndRow(afterClick(1_000))));
    expect(outcomes().map((o) => o['outcome'])).toEqual(['unchanged']);
  });

  for (const [result, failure] of [
    ['No commits between main and feature', 'no-changes'],
    ['! [rejected] feature -> feature (non-fast-forward)', 'push-refused'],
    ['Organization requires SAML SSO authorization', 'org-approval'],
    ['To get started, run gh auth login', 'sign-in'],
    ['Connection timed out', 'unknown'],
  ] as const) {
    it(`keeps ${failure} on the button and the existing outcome event`, () => {
      bridge.broadcast(change(openRow(at(0))));
      void useGitStatusStore.getState().click(WT, 'create-pr', 'Create a pull request');
      const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
      toolResult(result, 'gh pr create', WT, clickedAt + 1);
      bridge.broadcast(change(turnEndRow(afterClick(1_000))));
      expect(useGitStatusStore.getState().failures[WT]).toBe(failure);
      expect(outcomes()).toMatchObject([{ outcome: 'unchanged', failure_class: failure }]);
      expect(JSON.stringify(outcomes())).not.toContain(result);
      void useGitStatusStore.getState().click(WT, 'create-pr', 'Try again');
      expect(useGitStatusStore.getState().failures[WT]).toBeUndefined();
    });
  }

  it('takes a reason off the button once the work it asked for arrives', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create a pull request');
    const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
    toolResult('No commits between main and feature', 'gh pr create', WT, clickedAt + 1);
    const settledAt = new Date(clickedAt + 1_000).toISOString();
    bridge.broadcast(change(row(measurement({ ahead: 0, dirty: false }), { measuredAt: settledAt, trigger: 'turn-end' })));
    expect(useGitStatusStore.getState().failures[WT]).toBe('no-changes');

    const unchanged = new Date(clickedAt + 2_000).toISOString();
    bridge.broadcast(change(row(measurement({ ahead: 0, dirty: false }), { measuredAt: unchanged, trigger: 'interval' })));
    expect(useGitStatusStore.getState().failures[WT]).toBe('no-changes');

    const committed = new Date(clickedAt + 3_000).toISOString();
    bridge.broadcast(change(row(measurement({ ahead: 1, dirty: false }), { measuredAt: committed, trigger: 'interval' })));
    expect(useGitStatusStore.getState().failures[WT]).toBeUndefined();
    expect(outcomes()).toHaveLength(1);
  });

  it('keeps a reason a later comparison cannot disprove', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create a pull request');
    const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
    toolResult('! [rejected] feature -> feature (non-fast-forward)', 'gh pr create', WT, clickedAt + 1);
    bridge.broadcast(change(turnEndRow(afterClick(1_000))));
    expect(useGitStatusStore.getState().failures[WT]).toBe('push-refused');
    const later = new Date(clickedAt + 2_000).toISOString();
    bridge.broadcast(change(row(measurement({ ahead: 4, dirty: true }), { measuredAt: later, trigger: 'interval' })));
    expect(useGitStatusStore.getState().failures[WT]).toBe('push-refused');
  });

  it('does not turn a recovered tool error into a failed PR', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create a pull request');
    toolResult('gh auth login');
    bridge.broadcast(change(turnEndRow(afterClick(1_000), 'checks-running')));
    expect(useGitStatusStore.getState().failures[WT]).toBeUndefined();
    expect(outcomes()).toMatchObject([{ outcome: 'advanced' }]);
    expect(outcomes()[0]).not.toHaveProperty('failure_class');
  });

  it('ignores old results and results from another project', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create a pull request');
    const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
    for (const [cwd, ts] of [[WT, clickedAt - 1], ['/ws/other', clickedAt + 1]] as const) {
      toolResult('gh auth login', 'gh pr create', cwd, ts);
    }
    bridge.broadcast(change(turnEndRow(afterClick(1_000))));
    expect(useGitStatusStore.getState().failures[WT]).toBe('unknown');
  });

  it('tracks a held press only after its own prompt is dispatched', async () => {
    bridge.broadcast(change(openRow(at(0))));
    const text = 'Create a pull request';
    void useGitStatusStore.getState().click(WT, 'create-pr', text);
    const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
    bridge.answerCommand({ accepted: true, held: true });
    await settle();
    toolResult('gh auth login');
    bridge.broadcast(change(turnEndRow(new Date(clickedAt + 10).toISOString())));
    expect(outcomes()).toHaveLength(0);
    bridge.agentEvent({ type: 'message.user', cwd: WT, ts: clickedAt + 20, seq: 2, eventId: 'queued-prompt', sessionId: 'session', turnId: 'queued-turn', text });
    toolResult('Organization requires SAML SSO', 'gh pr create', WT, clickedAt + 30);
    bridge.broadcast(change(turnEndRow(new Date(clickedAt + 40).toISOString())));
    expect(useGitStatusStore.getState().failures[WT]).toBe('org-approval');
    expect(outcomes()).toMatchObject([{ failure_class: 'org-approval' }]);
  });

  it('waits for a complete late measurement before emitting an outcome', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    const measuredAt = afterClick(1000);
    bridge.broadcast(change({ ...turnEndRow(measuredAt), stale: true }));
    expect(outcomes()).toHaveLength(0);
    expect(useGitStatusStore.getState().working[WT]).toBeUndefined();
    bridge.broadcast(change(turnEndRow(measuredAt, 'checks-running')));
    expect(outcomes()).toMatchObject([{ outcome: 'advanced' }]);
    expect(useGitStatusStore.getState().failures[WT]).toBeUndefined();
  });

  it('does not keep a recovered sign-in failure after a later unknown PR error', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    toolResult('gh auth login');
    toolResult('Logged in', 'gh auth login', WT, Date.now() + 2, 'completed');
    toolResult('Connection timed out', 'gh pr create', WT, Date.now() + 3);
    bridge.broadcast(change(turnEndRow(afterClick(1000))));
    expect(outcomes()).toMatchObject([{ failure_class: 'unknown' }]);
  });

  it('bounds an inconclusive PR lookup and emits its outcome exactly once', () => {
    jest.useFakeTimers();
    try {
      bridge.broadcast(change(openRow(at(0))));
      void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
      bridge.broadcast(change({ ...turnEndRow(afterClick(1_000)), stale: true }));
      jest.advanceTimersByTime(15_000);
      expect(outcomes()).toMatchObject([{ failure_class: 'unknown' }]);
      expect(useGitStatusStore.getState().failures[WT]).toBe('unknown');
      jest.advanceTimersByTime(15_000);
      expect(outcomes()).toHaveLength(1);
    } finally { jest.useRealTimers(); }
  });

  it('reports an inconclusive attempt before a retry retires it', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    bridge.broadcast(change({ ...turnEndRow(afterClick(1_000)), stale: true }));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Try again');
    expect(outcomes()).toMatchObject([{ failure_class: 'unknown' }]);
    expect(useGitStatusStore.getState().failures[WT]).toBeUndefined();
  });

  it('clears a recovered push failure with Git global options', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    toolResult('! [rejected] feature -> feature', 'git -C /worktree push');
    toolResult('Everything up-to-date', 'git -C /worktree push', WT, Date.now() + 2, 'completed');
    bridge.broadcast(change(turnEndRow(afterClick(1000))));
    expect(outcomes()).toMatchObject([{ failure_class: 'unknown' }]);
  });

  it('ignores unrelated failures and successful output containing error phrases', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    toolResult('gh auth login', 'cat notes.txt');
    toolResult('gh auth login', 'git status', WT, Date.now() + 2, 'completed');
    bridge.broadcast(change(turnEndRow(afterClick(1000))));
    expect(outcomes()).toMatchObject([{ failure_class: 'unknown' }]);
  });

  it('keeps an SSO PR failure when a later git diagnostic exits nonzero', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    toolResult('Organization requires SAML SSO');
    toolResult('Files differ', 'git diff --exit-code');
    bridge.broadcast(change(turnEndRow(afterClick(1000))));
    expect(outcomes()).toMatchObject([{ failure_class: 'org-approval' }]);
  });

  it('reads command input that arrives after the tool starts', () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    const base = { cwd: WT, ts: Date.now() + 1, seq: 1, eventId: 'tool', sessionId: 'session', toolCallId: 'command' };
    bridge.agentEvent({ ...base, type: 'tool.start', name: 'Bash', kind: 'execute', title: 'Bash', status: 'in_progress' });
    bridge.agentEvent({ ...base, type: 'tool.update', input: { command: 'gh pr create' } });
    bridge.agentEvent({ ...base, type: 'tool.end', status: 'completed', isError: true, errorMessage: 'gh auth login' });
    bridge.broadcast(change(turnEndRow(afterClick(1000))));
    expect(outcomes()).toMatchObject([{ failure_class: 'sign-in' }]);
  });

  it('does not leave a dispatched queued prompt held when acceptance arrives late', async () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'Create PR');
    const clickedAt = useGitStatusStore.getState().working[WT]!.clickedAt;
    bridge.agentEvent({ type: 'message.user', cwd: WT, ts: clickedAt + 1, seq: 1, eventId: 'prompt', sessionId: 'session', turnId: 'turn', text: 'Create PR' });
    bridge.answerCommand({ accepted: true, held: true });
    await settle();
    expect(useGitStatusStore.getState().held[WT]).toBeUndefined();
    toolResult('gh auth login', 'gh pr create', WT, clickedAt + 2);
    bridge.broadcast(change(turnEndRow(new Date(clickedAt + 10).toISOString())));
    expect(outcomes()).toMatchObject([{ failure_class: 'sign-in' }]);
  });

  it('a refused command is a refused outcome, not a duplicate click', async () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'prompt text');
    bridge.answerCommand({ accepted: false });
    await settle();
    const all = outcomes();
    expect(all.map((o) => o['outcome'])).toEqual(['refused']);
    expect(all[0]?.['to_state']).toBe('create-pr');
    expect(bridge.telemetry.filter((e) => e.event === 'git_pill_clicked')).toHaveLength(1);
  });

  it('a superseded click emits no outcome; the newest click owns the eventual one', async () => {
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'first');
    void useGitStatusStore.getState().click(WT, 'push', 'second');
    bridge.answerCommand(new Error('boom'), 0);
    await settle();
    expect(outcomes()).toHaveLength(0);
    bridge.broadcast(change(turnEndRow(afterClick(1_000), 'checks-running')));
    expect(outcomes()).toHaveLength(1);
  });

  it('a defaults flip that changes the derived id emits a fresh shown', () => {
    bridge.broadcast(change(openRow(at(0))));
    expect(shownEvents()).toEqual(['create-pr']);
    useGitStatusStore.getState().applyDefaults({ noPr: 'push', ready: 'open-in-browser' });
    expect(shownEvents()).toEqual(['create-pr', 'push']);
    useGitStatusStore.getState().applyDefaults({ noPr: 'push', ready: 'merge' });
    expect(shownEvents()).toEqual(['create-pr', 'push']); // id unchanged: no duplicate
  });

  it('noteBrowserOpen emits clicked with the open-in-browser action', () => {
    bridge.broadcast(change(openRow(at(0), 'ready-to-merge')));
    noteBrowserOpen(WT);
    const clicked = bridge.telemetry.filter((e) => e.event === 'git_pill_clicked');
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.properties['action']).toBe('open-in-browser');
    expect(clicked[0]?.properties['state']).toBe('ready-to-merge');
  });

  it('a throwing telemetry bridge never breaks the store transition', () => {
    bridge.failTelemetry = true;
    bridge.broadcast(change(openRow(at(0))));
    void useGitStatusStore.getState().click(WT, 'create-pr', 'prompt text');
    bridge.broadcast(change(turnEndRow(afterClick(1_000), 'checks-running')));
    expect(useGitStatusStore.getState().rows[WT]?.trigger).toBe('turn-end');
    expect(pill().id).toBe('checks-running');
    expect(bridge.telemetry).toHaveLength(0);
  });
});
