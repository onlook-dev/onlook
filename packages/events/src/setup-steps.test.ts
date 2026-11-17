import { describe, expect, it } from 'bun:test';
import type { StudioEvent, ToolCallView, TranscriptItem } from './events.js';
import type { ProjectSetupFailure, ProjectSetupSnapshot } from './project-setup.js';
import { LEGACY_SETUP_REPAIR_CONTEXT_OPENING, PROJECT_SETUP_REPAIR_PROMPT, SETUP_REPAIR_CONTEXT_OPENING } from './project-setup.js';
import { askedSetupFailure, deriveSetupSteps, latestSetupTurnSteps, latestTurnOpensSetupSteps, setupTurnCards, LEGACY_SERVER_RUNNING_PLACED, SERVER_RUNNING_PLACED, type SetupStepStatus } from './setup-steps.js';

let seq = 0;
function call(name: string, result?: unknown, extra: Partial<ToolCallView> = {}): ToolCallView {
  seq += 1;
  return {
    toolCallId: `c${String(seq)}`,
    name: `mcp__studio__${name}`,
    kind: 'other',
    title: name,
    status: result === undefined ? 'in_progress' : 'completed',
    displayStatus: result === undefined ? 'in_progress' : 'completed',
    startedAt: 0,
    ...(result === undefined ? {} : { result: typeof result === 'string' ? result : JSON.stringify(result) }),
    ...extra,
  };
}

const saved = { revision: 'r1', definition: { prepare: '', install: { script: 'npm i', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 5173 }] } };
function snapshot(state: ProjectSetupSnapshot['state'], failure: ProjectSetupFailure | null = null): ProjectSetupSnapshot {
  return { saved, verified: null, state, failure };
}
function failure(stage: ProjectSetupFailure['stage'], outputTail: string): ProjectSetupFailure {
  return { revision: 'r1', stage, command: 'npm i', reason: 'The install command exited with code 1.', outputTail, elapsedMs: 10 };
}

const read = (hasSaved: boolean): ToolCallView => call('get_project_setup', { ...snapshot('idle'), saved: hasSaved ? saved : null });
const save = (): ToolCallView => call('save_project_setup', { ok: true, snapshot: snapshot('idle') });
const run = (result?: unknown): ToolCallView => call('run_project_setup', result);

const statuses = (view: { steps: { status: SetupStepStatus }[] }): SetupStepStatus[] => view.steps.map((step) => step.status);

describe('the setup checklist while its turn streams', () => {
  it('runs the first step before the agent has called anything', () => {
    expect(statuses(deriveSetupSteps([], true))).toEqual(['running', 'pending', 'pending', 'pending']);
  });

  it('runs the first step until a setup is found', () => {
    expect(statuses(deriveSetupSteps([read(false)], true))).toEqual(['running', 'pending', 'pending', 'pending']);
  });

  it('ticks finding the setup on a save, or on a setup already saved', () => {
    expect(statuses(deriveSetupSteps([read(false), save()], true))[0]).toBe('done');
    expect(statuses(deriveSetupSteps([read(true)], true))[0]).toBe('done');
  });

  it('follows the live setup machine once this turn has started its run', () => {
    const calls = [read(false), save(), run()];
    const at = (state: ProjectSetupSnapshot['state'], livePorts: number[] = []) => statuses(deriveSetupSteps(calls, true, { snapshot: snapshot(state), livePorts }));
    expect(at('installing')).toEqual(['done', 'running', 'pending', 'pending']);
    expect(at('starting')).toEqual(['done', 'done', 'running', 'pending']);
    expect(at('starting', [5173])).toEqual(['done', 'done', 'done', 'running']);
    expect(at('running')).toEqual(['done', 'done', 'done', 'done']);
  });

  it('ticks nothing from a running machine an earlier run left, before this turn runs', () => {
    const view = deriveSetupSteps([read(true)], true, { snapshot: snapshot('running'), livePorts: [5173] });
    expect(statuses(view)).toEqual(['done', 'running', 'pending', 'pending']);
    expect(view.outcome).toBe('running');
  });

  it('reads a failure as the step still running while the agent can repair it', () => {
    const view = deriveSetupSteps([save(), run()], true, { snapshot: snapshot('failed', failure('install', 'npm ERR! x')), livePorts: [] });
    expect(statuses(view)).toEqual(['done', 'running', 'pending', 'pending']);
    expect(view.outcome).toBe('running');
  });
});

describe('the setup checklist once its turn has ended, from its own results', () => {
  it('folds to done when the run succeeded', () => {
    const view = deriveSetupSteps([save(), run({ ok: true, snapshot: snapshot('running') })], false);
    expect(view.outcome).toBe('done');
  });

  it('fails the step the run failed at, with the output last line, and dims the rest', () => {
    const tail = 'npm WARN old\nnpm ERR! ERESOLVE unable to resolve dependency tree\n\n';
    const view = deriveSetupSteps([save(), run({ ok: false, reason: 'failed', snapshot: snapshot('failed', failure('install', tail)) })], false);
    expect(statuses(view)).toEqual(['done', 'failed', 'skipped', 'skipped']);
    expect(view.steps[1]?.detail).toBe('npm ERR! ERESOLVE unable to resolve dependency tree');
    expect(view.outcome).toBe('failed');
    expect(view.failedStep).toBe(2);
  });

  it('falls back to the reason when the failure printed nothing', () => {
    const view = deriveSetupSteps([save(), run({ ok: false, reason: 'failed', snapshot: snapshot('failed', failure('start', '')) })], false);
    expect(view.steps[2]).toEqual({ id: 'start', status: 'failed', detail: 'The install command exited with code 1.' });
  });

  it('names a readiness failure by its reason, never by the server output that was not an error', () => {
    const ready = { ...failure('ready', 'Listening on http://localhost:5173\n'), reason: 'Listener does not belong to the setup server folder' };
    const view = deriveSetupSteps([save(), run({ ok: false, reason: 'failed', snapshot: snapshot('failed', ready) })], false);
    expect(view.steps[2]).toEqual({ id: 'start', status: 'failed', detail: 'Listener does not belong to the setup server folder' });
  });

  it('reads the last run, so a repaired failure ends done', () => {
    const failed = run({ ok: false, reason: 'failed', snapshot: snapshot('failed', failure('install', 'x')) });
    const view = deriveSetupSteps([save(), failed, save(), run({ ok: true, snapshot: snapshot('running') })], false);
    expect(view.outcome).toBe('done');
  });

  it('is incomplete, not failed, when the turn ended with nothing broken', () => {
    const view = deriveSetupSteps([save(), run()], false);
    expect(statuses(view)).toEqual(['done', 'skipped', 'skipped', 'skipped']);
    expect(view.outcome).toBe('incomplete');
    expect(view.failedStep).toBeUndefined();
  });

  it('ignores the live machine once the turn has ended', () => {
    const view = deriveSetupSteps([save(), run()], false, { snapshot: snapshot('running'), livePorts: [5173] });
    expect(view.outcome).toBe('incomplete');
  });

  it('ticks every step when the agent put its own server on the canvas', () => {
    const placed = call('server_running', `Onlook noted the report and is checking port 3000. ${SERVER_RUNNING_PLACED} in a new frame "Home" (id f1) at http://localhost:3000.`);
    const view = deriveSetupSteps([read(false), placed], false);
    expect(statuses(view)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('ticks every step on a placed frame an earlier build reported in its own words (ONL-3169)', () => {
    const placed = call('server_running', `Studio noted the report and is checking port 3000. ${LEGACY_SERVER_RUNNING_PLACED} in a new frame "Home" (id f1) at http://localhost:3000.`);
    expect(statuses(deriveSetupSteps([read(false), placed], false))).toEqual(['done', 'done', 'done', 'done']);
  });

  it('does not tick on a server_running report that placed nothing', () => {
    const notPlaced = call('server_running', 'Onlook noted the report and is checking port 3000. Onlook did not put the app on the canvas: no canvas.');
    expect(deriveSetupSteps([notPlaced], false).outcome).toBe('incomplete');
  });
});

describe('the last step, where the tab can see its canvas', () => {
  const calls = [read(false), save(), run()];
  const live = { snapshot: snapshot('running'), livePorts: [5173] };

  it('keeps opening the app until a Frame on the app\'s port is live, while the machine already runs', () => {
    expect(statuses(deriveSetupSteps(calls, true, live, { liveFramePorts: [] }))).toEqual(['done', 'done', 'done', 'running']);
    expect(statuses(deriveSetupSteps(calls, true, live, { liveFramePorts: [3000] }))).toEqual(['done', 'done', 'done', 'running']);
    expect(statuses(deriveSetupSteps(calls, true, live, { liveFramePorts: [5173] }))).toEqual(['done', 'done', 'done', 'done']);
  });

  it('does not fold a run that succeeded while its app is not on the canvas', () => {
    const ended = [save(), run({ ok: true, snapshot: snapshot('running') })];
    const without = deriveSetupSteps(ended, false, undefined, { liveFramePorts: [] });
    expect(statuses(without)).toEqual(['done', 'done', 'done', 'skipped']);
    expect(without.outcome).toBe('incomplete');
    expect(deriveSetupSteps(ended, false, undefined, { liveFramePorts: [5173] }).outcome).toBe('done');
  });

  it('ticks the agent\'s own server only once its Frame is live', () => {
    const placed = call('server_running', `${SERVER_RUNNING_PLACED} in a new frame "Home" (id f1) at http://localhost:3000.`, { input: { port: 3000 } });
    expect(statuses(deriveSetupSteps([read(false), placed], false, undefined, { liveFramePorts: [] }))[3]).toBe('skipped');
    expect(deriveSetupSteps([read(false), placed], false, undefined, { liveFramePorts: [3000] }).outcome).toBe('done');
  });
});

describe('which turns carry a setup checklist', () => {
  const user = (id: string, text: string, origin?: 'studio'): TranscriptItem => ({ kind: 'user', id, text, ...(origin ? { origin } : {}) });
  const tools = (id: string, calls: ToolCallView[]): TranscriptItem => ({ kind: 'tools', id, calls });

  it('draws the card under a Studio setup prompt before the agent has called anything', () => {
    const cards = setupTurnCards([user('u1', 'First call get_project_setup…', 'studio')]);
    expect(cards).toEqual([{ promptId: 'u1', calls: [], toolItemIds: [], isLast: true }]);
  });

  it('collects every top-level call of the turn', () => {
    const items = [user('u1', 'First call get_project_setup…', 'studio'), tools('t1', [read(false)]), tools('t2', [save()])];
    const [card] = setupTurnCards(items);
    expect(card?.calls).toHaveLength(2);
    expect(card?.toolItemIds).toEqual(['t1', 't2']);
  });

  it('draws none in a turn the person opened, in a resume, or in the repair ask', () => {
    expect(setupTurnCards([user('u1', 'make it teal'), tools('t1', [read(false)])])).toEqual([]);
    expect(setupTurnCards([user('u1', 'continue', 'studio')])).toEqual([]);
    expect(setupTurnCards([user('u1', PROJECT_SETUP_REPAIR_PROMPT, 'studio')])).toEqual([]);
  });

  it('draws none for the repair ask in the person’s words, known by its hidden context, not its text (ONL-2961)', () => {
    const words = 'My app didn’t start. Can you help?';
    expect(setupTurnCards([{ kind: 'user', id: 'u1', origin: 'studio', text: words, context: `${SETUP_REPAIR_CONTEXT_OPENING} It did not start.\n\n{}` }])).toEqual([]);
    expect(setupTurnCards([{ kind: 'user', id: 'u1', origin: 'studio', text: words, context: 'Detected apps: web on 3000.' }])).toHaveLength(1);
  });

  it('draws none for a repair ask an earlier build opened in its own words (ONL-3169)', () => {
    const words = 'My app didn’t start. Can you help?';
    expect(setupTurnCards([{ kind: 'user', id: 'u1', origin: 'studio', text: words, context: `${LEGACY_SETUP_REPAIR_CONTEXT_OPENING} It did not start.\n\n{}` }])).toEqual([]);
  });

  it('ends the turn at the next user row, so the earlier card is no longer the last', () => {
    const items = [user('u1', 'set up', 'studio'), tools('t1', [read(false)]), user('u2', 'make it teal'), tools('t2', [save()])];
    const [card] = setupTurnCards(items);
    expect(card?.isLast).toBe(false);
    expect(card?.calls).toHaveLength(1);
  });

  it('keeps one card through a message the person sent into the running setup turn (ONL-2961)', () => {
    const items: TranscriptItem[] = [
      user('u1', 'set up', 'studio'),
      tools('t1', [read(false)]),
      { kind: 'user', id: 'u2', text: 'make it teal', joinsTurn: true },
      tools('t2', [save()]),
    ];
    const cards = setupTurnCards(items);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.isLast).toBe(true);
    expect(cards[0]?.toolItemIds).toEqual(['t1', 't2']);
  });

  it('draws none in the turn Studio opens hidden, such as an inspiration Frame’s opening', () => {
    const opening: TranscriptItem = { kind: 'user', id: 'u1', origin: 'studio', hidden: true, text: 'A Frame of inspiration was added…' };
    expect(setupTurnCards([opening])).toEqual([]);
    expect(latestSetupTurnSteps([opening], true)).toBeUndefined();
  });

  it('leaves out a subagent call', () => {
    const items = [user('u1', 'set up', 'studio'), tools('t1', [read(false), call('run_project_setup', undefined, { parentToolUseId: 'p' })])];
    expect(setupTurnCards(items)[0]?.calls).toHaveLength(1);
  });
});

describe('whether the latest turn was opened by a setup prompt (ONL-2961)', () => {
  const said = (turnId: string, text: string, origin?: 'studio' | 'user'): StudioEvent =>
    ({ type: 'message.user', seq: 0, turnId, text, ...(origin === undefined ? {} : { origin }) }) as StudioEvent;

  it('is true for a turn a Studio setup prompt opened, a message joined or not', () => {
    expect(latestTurnOpensSetupSteps([said('t1', 'start the app', 'studio')])).toBe(true);
    expect(latestTurnOpensSetupSteps([said('t1', 'start the app', 'studio'), said('t1', 'make it blue')])).toBe(true);
  });

  it('is false for a turn the person opened, even one a Studio prompt later joined', () => {
    expect(latestTurnOpensSetupSteps([said('t1', 'start the app', 'studio'), said('t2', 'make it blue')])).toBe(false);
    expect(latestTurnOpensSetupSteps([said('t1', 'make it blue'), said('t1', 'start the app', 'studio')])).toBe(false);
  });

  it('is false for a turn Studio opened hidden', () => {
    expect(latestTurnOpensSetupSteps([{ ...said('t1', 'A Frame of inspiration was added…', 'studio'), hidden: true } as StudioEvent])).toBe(false);
  });

  it('is false for the repair ask and the resume nudge, and for no turn at all', () => {
    expect(latestTurnOpensSetupSteps([said('t1', PROJECT_SETUP_REPAIR_PROMPT, 'studio')])).toBe(false);
    expect(latestTurnOpensSetupSteps([{ ...said('t1', 'My app didn’t start. Can you help?', 'studio'), context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}` } as StudioEvent])).toBe(false);
    expect(latestTurnOpensSetupSteps([said('t1', 'continue', 'studio')])).toBe(false);
    expect(latestTurnOpensSetupSteps([])).toBe(false);
  });
});

describe('the latest setup turn’s checklist, for the Left Rail (ONL-2961)', () => {
  const user = (id: string, text: string, origin?: 'studio'): TranscriptItem => ({ kind: 'user', id, text, ...(origin ? { origin } : {}) });
  const tools = (id: string, calls: ToolCallView[]): TranscriptItem => ({ kind: 'tools', id, calls });
  const live = { snapshot: snapshot('installing'), livePorts: [] };

  it('reads the setup machine while that turn is the one streaming', () => {
    const items = [user('u1', 'set up', 'studio'), tools('t1', [read(true), run()])];
    expect(latestSetupTurnSteps(items, true, live)?.outcome).toBe('running');
    expect(statuses(latestSetupTurnSteps(items, true, live)!)).toEqual(['done', 'running', 'pending', 'pending']);
  });

  it('stops reading it once a turn the person opened follows', () => {
    const items = [user('u1', 'set up', 'studio'), tools('t1', [read(true), run()]), user('u2', 'make it teal')];
    expect(latestSetupTurnSteps(items, true, live)?.outcome).toBe('incomplete');
  });

  it('has none when no setup turn ran', () => {
    expect(latestSetupTurnSteps([user('u1', 'make it teal')], true, live)).toBeUndefined();
  });
});

describe('the failure the person last asked the agent about (ONL-2961)', () => {
  const failure = { revision: 'r1', stage: 'install', command: 'bun install', exitCode: 1, reason: 'exited', outputTail: 'boom', elapsedMs: 900 } as ProjectSetupFailure;
  const snapshot = { saved: null, verified: null, state: 'failed', failure } as ProjectSetupSnapshot;
  const ask = (id: string, context: string): TranscriptItem => ({ kind: 'user', id, text: 'My app’s packages didn’t install.', origin: 'studio', context });

  it('reads the failure from the snapshot the ask’s hidden context carries, past a Stop note after it', () => {
    const items = [ask('u1', `${SETUP_REPAIR_CONTEXT_OPENING} What failed.\n\n${JSON.stringify(snapshot)}\n\nThe user pressed Stop for all project servers.`)];
    expect(askedSetupFailure(items)).toEqual(failure);
  });

  it('reads the legacy repair prompt, whose whole context is the snapshot', () => {
    const items: TranscriptItem[] = [{ kind: 'user', id: 'u1', text: PROJECT_SETUP_REPAIR_PROMPT, origin: 'studio', context: JSON.stringify(snapshot) }];
    expect(askedSetupFailure(items)).toEqual(failure);
  });

  it('takes the latest ask, and nothing from a typed message that quotes the same words', () => {
    const later = { ...failure, elapsedMs: 1200 };
    const items: TranscriptItem[] = [
      ask('u1', `${SETUP_REPAIR_CONTEXT_OPENING}\n\n${JSON.stringify(snapshot)}`),
      ask('u2', `${SETUP_REPAIR_CONTEXT_OPENING}\n\n${JSON.stringify({ ...snapshot, failure: later })}`),
      { kind: 'user', id: 'u3', text: 'hi', context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n${JSON.stringify(snapshot)}` },
    ];
    expect(askedSetupFailure(items)).toEqual(later);
  });

  it('is nothing with no ask in the transcript', () => {
    expect(askedSetupFailure([{ kind: 'user', id: 'u1', text: 'hi' }])).toBeNull();
  });
});
