import { describe, expect, it } from 'bun:test';
import type { ToolCallView } from './events.js';
import { importSetupSteps } from './import-setup-steps.js';
import type { ProjectSetupFailure, ProjectSetupSnapshot } from './project-setup.js';
import { deriveSetupSteps } from './setup-steps.js';
import type { ProjectCreateState, WorkspaceCreated } from './workspace.js';

const workspace = { workspacePath: '/w/halde-site', sourceRepoName: 'halde-site', repoIdentity: 'r' } as WorkspaceCreated;
const saved = { revision: 'r1', definition: { prepare: '', install: { script: 'npm i', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 5173 }] } };

function snapshot(state: ProjectSetupSnapshot['state'], failure: ProjectSetupFailure | null = null): ProjectSetupSnapshot {
  return { saved, verified: null, state, failure };
}
function failure(stage: ProjectSetupFailure['stage'], outputTail = 'npm ERR! missing script: dev'): ProjectSetupFailure {
  return { revision: 'r1', stage, command: 'npm i', reason: 'The command exited with code 1.', outputTail, elapsedMs: 10 };
}

let seq = 0;
function call(name: string, result?: unknown): ToolCallView {
  seq += 1;
  return {
    toolCallId: `c${String(seq)}`,
    name: `mcp__studio__${name}`,
    kind: 'other',
    title: name,
    status: result === undefined ? 'in_progress' : 'completed',
    displayStatus: result === undefined ? 'in_progress' : 'completed',
    startedAt: 0,
    ...(result === undefined ? {} : { result: JSON.stringify(result) }),
  };
}
const found = (): ToolCallView => call('get_project_setup', snapshot('idle'));
const run = (result?: unknown): ToolCallView => call('run_project_setup', result);

const starting: ProjectCreateState = { kind: 'starting', workspace };
const failedStarting = (detail = 'The agent ended its turn without a server.'): ProjectCreateState => ({ kind: 'failed', sourceRepoName: 'halde-site', phase: 'starting', detail, workspace });

describe("the import's last step, where the tab can see its canvas", () => {
  const live: ProjectCreateState = { kind: 'live', workspace };

  it('stays on opening the app until a Frame on its port is live, though main reads the import live', () => {
    expect(importSetupSteps({ create: live, snapshot: snapshot('running'), canvas: { liveFramePorts: [] } })).toEqual({ state: 'running', at: 4 });
    expect(importSetupSteps({ create: live, snapshot: snapshot('running'), canvas: { liveFramePorts: [5173] } })).toEqual({ state: 'up', at: 4 });
  });

  it('agrees with the chat card on the same facts', () => {
    const calls = [found(), run()];
    const facts = { snapshot: snapshot('running'), livePorts: [5173] };
    for (const liveFramePorts of [[], [5173]]) {
      const canvas = { liveFramePorts };
      const turn = deriveSetupSteps(calls, true, facts, canvas);
      const cardDone = turn.steps[3]?.status === 'done';
      const bar = importSetupSteps({ create: live, turn, snapshot: facts.snapshot, canvas });
      expect(bar?.state === 'up').toBe(cardDone);
    }
  });
});

describe('an import on its way up', () => {
  it('shows nothing without an import, or for one refused or canceled', () => {
    expect(importSetupSteps({ create: null, snapshot: null })).toBeNull();
    expect(importSetupSteps({ create: { kind: 'refused', sourceRepoName: 'halde-site', reason: 'nothing-to-copy' }, snapshot: null })).toBeNull();
    expect(importSetupSteps({ create: { kind: 'canceled' }, snapshot: null })).toBeNull();
  });

  it('gets the project while it plans and copies', () => {
    expect(importSetupSteps({ create: { kind: 'planning', sourceRepoName: 'halde-site' }, snapshot: null })).toEqual({ state: 'running', at: 1 });
    expect(importSetupSteps({ create: { kind: 'copying', sourceRepoName: 'halde-site', workspaceName: 'halde-site' }, snapshot: null })).toEqual({ state: 'running', at: 1 });
  });

  it('is still getting an in-place import, which never copies, until the agent finds its setup', () => {
    expect(importSetupSteps({ create: starting, snapshot: snapshot('idle') })).toEqual({ state: 'running', at: 1 });
    expect(importSetupSteps({ create: starting, turn: deriveSetupSteps([], true), snapshot: snapshot('idle') })).toEqual({ state: 'running', at: 1 });
  });

  it('follows the setup turn through install, start and the canvas', () => {
    const turn = (calls: ToolCallView[], live: ProjectSetupSnapshot, ports: number[] = []) => deriveSetupSteps(calls, true, { snapshot: live, livePorts: ports });
    expect(importSetupSteps({ create: starting, turn: turn([found(), run()], snapshot('installing')), snapshot: snapshot('installing') })).toEqual({ state: 'running', at: 2 });
    expect(importSetupSteps({ create: starting, turn: turn([found(), run()], snapshot('starting')), snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
    expect(importSetupSteps({ create: starting, turn: turn([found(), run()], snapshot('starting'), [5173]), snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 4 });
  });

  it('ticks from the setup machine alone when a saved setup runs with no agent turn', () => {
    expect(importSetupSteps({ create: starting, snapshot: snapshot('installing') })).toEqual({ state: 'running', at: 2 });
    expect(importSetupSteps({ create: starting, snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
  });

  it("installs on Studio's own install branch", () => {
    expect(importSetupSteps({ create: { kind: 'installing', workspace }, snapshot: null })).toEqual({ state: 'running', at: 2 });
  });

  it('lands once the create state is live, whatever the machine last said', () => {
    expect(importSetupSteps({ create: { kind: 'live', workspace }, snapshot: snapshot('failed', failure('install')) })).toEqual({ state: 'up', at: 4 });
  });
});

describe('an import whose setup failed', () => {
  it('fails the first step when the copy fails', () => {
    expect(importSetupSteps({ create: { kind: 'failed', sourceRepoName: 'halde-site', phase: 'copying', detail: 'disk full' }, snapshot: null })).toEqual({
      state: 'failed',
      at: 1,
      failure: { step: 1, detail: 'disk full' },
    });
  });

  it("fails the install step when Studio's own install fails", () => {
    expect(importSetupSteps({ create: { kind: 'failed', sourceRepoName: 'halde-site', phase: 'installing', workspace }, snapshot: null })).toEqual({ state: 'failed', at: 2, failure: { step: 2 } });
  });

  it("names the setup machine's stage and its last output line, though the create state says starting", () => {
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('failed', failure('install', 'resolving…\nnpm ERR! 404 left-pad\n')) })).toEqual({
      state: 'failed',
      at: 2,
      failure: { step: 2, stage: 'install', detail: 'npm ERR! 404 left-pad' },
    });
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('failed', failure('start')) })).toMatchObject({ state: 'failed', at: 3, failure: { step: 3, stage: 'start' } });
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('failed', failure('ready')) })).toMatchObject({ state: 'failed', at: 3, failure: { step: 3, stage: 'ready' } });
  });

  it('fails the start step with no stage when only Studio saw it: no server reported, or the port never answered', () => {
    expect(importSetupSteps({ create: failedStarting('nothing answered'), snapshot: snapshot('idle') })).toStrictEqual({ state: 'failed', at: 3, failure: { step: 3, detail: 'nothing answered' } });
  });

  it('shows the failure as soon as the setup turn ends failed, before the create state catches up', () => {
    const turn = deriveSetupSteps([found(), run({ ok: false, reason: 'install failed', snapshot: snapshot('failed', failure('install')) })], false);
    expect(importSetupSteps({ create: starting, turn, snapshot: snapshot('failed', failure('install')) })).toMatchObject({ state: 'failed', at: 2, failure: { step: 2 } });
  });
});

describe("a Retry's saved re-run", () => {
  const before = deriveSetupSteps([found(), run({ ok: false, reason: 'start failed', snapshot: snapshot('failed', failure('start')) })], false);

  it('follows the machine through install and start, not the failed turn before it', () => {
    expect(importSetupSteps({ create: starting, turn: before, snapshot: snapshot('installing') })).toEqual({ state: 'running', at: 2 });
    expect(importSetupSteps({ create: starting, turn: before, snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
  });
});

describe('a repair after a failure', () => {
  it('reads as the failed step under way again while the setup machine runs', () => {
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('installing', failure('install')) })).toEqual({ state: 'running', at: 2 });
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('starting', failure('start')) })).toEqual({ state: 'running', at: 3 });
  });

  it('is up once the repaired setup runs, though the create state still holds the failure', () => {
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('running') })).toEqual({ state: 'up', at: 4 });
  });

  it('goes back to the failure when the repair fails again', () => {
    expect(importSetupSteps({ create: failedStarting(), snapshot: snapshot('failed', failure('start')) })).toMatchObject({ state: 'failed', at: 3 });
  });
});

describe('a project that landed with nothing after it', () => {
  it('shows no setup once the create state rests at ready, whatever the comfort answer', () => {
    for (const comfort of [undefined, 'design'] as const) {
      const landed = comfort === undefined ? workspace : { ...workspace, comfort };
      expect(importSetupSteps({ create: { kind: 'ready', workspace: landed }, snapshot: snapshot('idle') })).toBeNull();
    }
  });
});

describe('a setup run after the import', () => {
  const ready: ProjectCreateState = { kind: 'ready', workspace };
  const afterImport = [null, ready] as const;
  const ended = deriveSetupSteps([found(), run({ ok: true, snapshot: snapshot('running') })], false);

  it("follows a reopened project's saved setup from install to start, its earlier setup turn long over", () => {
    for (const create of afterImport) {
      expect(importSetupSteps({ create, turn: ended, snapshot: snapshot('preparing') })).toEqual({ state: 'running', at: 2 });
      expect(importSetupSteps({ create, turn: ended, snapshot: snapshot('installing') })).toEqual({ state: 'running', at: 2 });
      expect(importSetupSteps({ create, turn: ended, snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
    }
  });

  it('shows nothing once the app is up again, or while nothing runs', () => {
    for (const create of afterImport) {
      expect(importSetupSteps({ create, turn: ended, snapshot: snapshot('running') })).toBeNull();
      expect(importSetupSteps({ create, snapshot: snapshot('idle') })).toBeNull();
      expect(importSetupSteps({ create, snapshot: snapshot('stopping') })).toBeNull();
      expect(importSetupSteps({ create, snapshot: null })).toBeNull();
    }
  });

  it('follows a restart of a running app back through start', () => {
    expect(importSetupSteps({ create: null, turn: ended, snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
  });

  it('fails the step the saved setup failed at, with its last output line', () => {
    expect(importSetupSteps({ create: null, turn: ended, snapshot: snapshot('failed', failure('start', 'Error: port 5173 in use\n')) })).toEqual({
      state: 'failed',
      at: 3,
      failure: { step: 3, stage: 'start', detail: 'Error: port 5173 in use' },
    });
  });

  it('runs the failed step again when a re-run follows the failure', () => {
    expect(importSetupSteps({ create: null, snapshot: snapshot('installing', failure('install')) })).toEqual({ state: 'running', at: 2 });
  });

  it('ignores a failure of an older saved revision, and a failed stop', () => {
    expect(importSetupSteps({ create: null, snapshot: { ...snapshot('failed'), failure: { ...failure('start'), revision: 'r0' } } })).toBeNull();
    expect(importSetupSteps({ create: null, snapshot: snapshot('failed', failure('stop')) })).toBeNull();
  });

  it("follows a setup turn the chat is drawing live, such as a Start press on a project with no saved setup", () => {
    const live = (calls: ToolCallView[], machine: ProjectSetupSnapshot) => deriveSetupSteps(calls, true, { snapshot: machine, livePorts: [] });
    expect(importSetupSteps({ create: null, turn: live([], snapshot('idle')), snapshot: snapshot('idle') })).toEqual({ state: 'running', at: 1 });
    expect(importSetupSteps({ create: ready, turn: live([found(), run()], snapshot('starting')), snapshot: snapshot('starting') })).toEqual({ state: 'running', at: 3 });
  });
});

describe('an import that has landed', () => {
  const live: ProjectCreateState = { kind: 'live', workspace };
  const landing = { failure: null };
  const noFrame = { liveFramePorts: [] };

  it('stays landed while its Frame reloads or is gone', () => {
    expect(importSetupSteps({ create: live, landing, snapshot: snapshot('running'), canvas: noFrame })).toBeNull();
  });

  it('shows nothing once its app stops, and follows a restart back through start', () => {
    expect(importSetupSteps({ create: live, landing, snapshot: snapshot('stopping'), canvas: noFrame })).toBeNull();
    expect(importSetupSteps({ create: live, landing, snapshot: snapshot('idle'), canvas: noFrame })).toBeNull();
    expect(importSetupSteps({ create: live, landing, snapshot: snapshot('starting'), canvas: noFrame })).toEqual({ state: 'running', at: 3 });
  });

  it('shows a setup failure that came after it landed', () => {
    expect(importSetupSteps({ create: live, landing, snapshot: snapshot('failed', failure('start')), canvas: noFrame })).toMatchObject({
      state: 'failed',
      at: 3,
      failure: { step: 3, stage: 'start' },
    });
  });

  it('ignores the failure that was standing when it landed, and shows a new one', () => {
    const standing = failure('install');
    expect(importSetupSteps({ create: live, landing: { failure: standing }, snapshot: snapshot('failed', standing), canvas: noFrame })).toBeNull();
    expect(importSetupSteps({ create: live, landing: { failure: standing }, snapshot: snapshot('failed', { ...standing, elapsedMs: 20 }), canvas: noFrame })).toMatchObject({ state: 'failed', at: 2 });
  });

  it('stays landed after a repair landed it, though the create state still holds the failure', () => {
    expect(importSetupSteps({ create: failedStarting(), landing, snapshot: snapshot('idle'), canvas: noFrame })).toBeNull();
    expect(importSetupSteps({ create: failedStarting(), landing, snapshot: snapshot('failed', failure('start')), canvas: noFrame })).toMatchObject({ state: 'failed', at: 3 });
  });
});
