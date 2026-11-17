import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, ProjectSetupSnapshot, SetupStepsView, VersionedProjectSetup, WorkspaceCreated } from '@studio/events';
import { startUnderWay, type StartFacts } from './startUnderWay.js';

const workspace = { workspacePath: '/w/teal', workspaceName: 'teal', branchName: 'b', baseBranch: 'main', sourceRepoName: 'site', sourcePath: '/s', sourceRepoRoot: '/s', repoIdentity: 'site' } as WorkspaceCreated;
const saved = { revision: 'r1', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [] } } as unknown as VersionedProjectSetup;

const setup = (state: ProjectSetupSnapshot['state'], isSaved = true): ProjectSetupSnapshot => ({ saved: isSaved ? saved : null, verified: null, state, failure: null });
const turn = (outcome: SetupStepsView['outcome']): SetupStepsView => ({ steps: [], outcome });
const starting: ProjectCreateState = { kind: 'starting', workspace };

const idle: StartFacts = { agentAsked: false, starterSpawning: false, setup: setup('idle'), turn: undefined, create: null };
const under = (facts: Partial<StartFacts>) => startUnderWay({ ...idle, ...facts });

describe('an import whose setup turn is starting the app reads as the agent starting it', () => {
  it('before the turn has saved a setup', () => {
    expect(under({ create: starting, setup: setup('idle', false) })).toBe('agent');
  });

  it('through the whole live turn, a failed run and the question after it included', () => {
    expect(under({ create: starting, setup: setup('installing'), turn: turn('running') })).toBe('agent');
    expect(under({ create: starting, setup: setup('failed'), turn: turn('running') })).toBe('agent');
  });
});

describe('a start Studio drives reads as Studio starting it', () => {
  it('a saved setup run, on reopen or from Start, at every stage until it runs', () => {
    expect(under({ setup: setup('preparing') })).toBe('studio');
    expect(under({ setup: setup('installing') })).toBe('studio');
    expect(under({ setup: setup('starting') })).toBe('studio');
  });

  it('an import that runs its saved setup, and one Studio is installing', () => {
    expect(under({ create: starting, setup: setup('idle') })).toBe('studio');
    expect(under({ create: { kind: 'installing', workspace } })).toBe('studio');
  });

  it('Studio’s own starter while it spawns', () => {
    expect(under({ starterSpawning: true, setup: null })).toBe('studio');
  });
});

describe('a Start with no saved setup asks the agent', () => {
  it('reads as the agent starting it until the agent reports or its turn ends', () => {
    expect(under({ agentAsked: true, setup: null })).toBe('agent');
  });
});

describe('nothing is starting', () => {
  it('when the setup is idle, running or failed with no setup turn live', () => {
    expect(under({})).toBeNull();
    expect(under({ setup: setup('running') })).toBeNull();
    expect(under({ setup: setup('failed') })).toBeNull();
    expect(under({ setup: null })).toBeNull();
  });

  it('once the import landed or failed and its turn ended', () => {
    expect(under({ create: { kind: 'live', workspace }, turn: turn('done') })).toBeNull();
    expect(under({ create: { kind: 'failed', sourceRepoName: 'site', phase: 'starting', workspace }, setup: setup('failed'), turn: turn('failed') })).toBeNull();
  });
});
