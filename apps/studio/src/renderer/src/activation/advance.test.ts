import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import {
  applyCreateScreen,
  commitFirstScreen,
  screenForCreate,
  type Screen,
} from './advance.js';

describe('screenForCreate', () => {
  const workspace = { workspacePath: '/w/one', workspaceName: 'amber-heron' } as WorkspaceCreated;

  it('lands a terminal ready on the editor as a RESTORED project, whichever route delivered it', () => {
    expect(screenForCreate({ kind: 'ready', workspace })).toEqual({
      kind: 'editor',
      restored: workspace,
    });
  });

  for (const state of [
    { kind: 'planning', sourceRepoName: 'silt' },
    { kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' },
  ] as ProjectCreateState[]) {
    it(`keeps the editor showing the ${state.kind} phase`, () => {
      expect(screenForCreate(state)).toEqual({ kind: 'editor', creating: state });
    });
  }

  for (const state of [
    { kind: 'refused', sourceRepoName: 'silt', reason: 'no-base-ref' },
    { kind: 'failed', sourceRepoName: 'silt', phase: 'copying' },
  ] as ProjectCreateState[]) {
    it(`keeps the tab on the editor when the creation is ${state.kind} — never back to the list`, () => {
      expect(screenForCreate(state)).toEqual({ kind: 'editor', creating: state });
    });
  }

  for (const state of [
    { kind: 'installing', workspace },
    { kind: 'starting', workspace },
    { kind: 'live', workspace },
    { kind: 'failed', sourceRepoName: 'silt', phase: 'installing', workspace },
  ] as ProjectCreateState[]) {
    it(`treats ${state.kind}${state.kind === 'failed' ? ` at ${state.phase}` : ''} as landed on its workspace`, () => {
      expect(screenForCreate(state)).toEqual({ kind: 'editor', restored: workspace });
    });
  }

  it('puts a cancelled creation nowhere — its tab is going away', () => {
    expect(screenForCreate({ kind: 'canceled' })).toBeNull();
  });
});

describe('applyCreateScreen (ONL-2179)', () => {
  const workspace = { workspacePath: '/w/one', workspaceName: 'amber-heron' } as WorkspaceCreated;
  const other = { workspacePath: '/w/two', workspaceName: 'silt-crane' } as WorkspaceCreated;

  it('returns the SAME editor when a later phase lands the project it already shows — no re-mount', () => {
    const current: Screen = { kind: 'editor', restored: workspace };
    expect(applyCreateScreen(current, { kind: 'editor', restored: workspace })).toBe(current);
  });

  it('lands a different project — the switcher’s tab moves on', () => {
    const current: Screen = { kind: 'editor', restored: workspace };
    expect(applyCreateScreen(current, { kind: 'editor', restored: other })).toEqual({ kind: 'editor', restored: other });
  });

  it('transitions from the projects list, and updates an editor mid-create', () => {
    const creating: Screen = { kind: 'editor', creating: { kind: 'planning', sourceRepoName: 'silt' } };
    expect(applyCreateScreen({ kind: 'projects' }, creating)).toEqual(creating);
    const next: Screen = { kind: 'editor', restored: workspace };
    expect(applyCreateScreen(creating, next)).toEqual(next);
  });

  it('never moves onboarding or a screen still pending', () => {
    const next: Screen = { kind: 'editor', restored: workspace };
    for (const current of [
      { kind: 'onboarding' },
      { kind: 'pending' },
    ] as Screen[]) {
      expect(applyCreateScreen(current, next)).toBe(current);
    }
  });
});

describe('commitFirstScreen', () => {
  const workspace = { workspacePath: '/w/one', workspaceName: 'amber-heron' } as WorkspaceCreated;

  it('commits when nothing has moved off pending', () => {
    expect(commitFirstScreen({ kind: 'pending' }, { kind: 'projects' })).toEqual({ kind: 'projects' });
  });

  it('NEVER commits the launch read over parked — that beat is the ticket (ONL-2318)', () => {
    const parked: Screen = { kind: 'parked' };
    expect(commitFirstScreen(parked, { kind: 'projects' })).toBe(parked);
  });

  it('refuses the gates over parked too, or a held spare is poisoned before it is promoted', () => {
    const parked: Screen = { kind: 'parked' };
    expect(commitFirstScreen(parked, { kind: 'onboarding' })).toBe(parked);
    expect(commitFirstScreen(parked, { kind: 'projects' })).toBe(parked);
  });

  it('YIELDS to a landing the creation already pushed — the read is the slower of the two', () => {
    const landed: Screen = { kind: 'editor', restored: workspace };
    const stale: Screen = { kind: 'editor', creating: { kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' } };
    expect(commitFirstScreen(landed, stale)).toBe(landed);
  });

  it('yields whatever the advanced screen is, not just an editor', () => {
    const current: Screen = { kind: 'projects' };
    expect(commitFirstScreen(current, { kind: 'onboarding' })).toBe(current);
  });
});

describe('a promoted spare adopts its cut, never the launch screen (ONL-2318)', () => {
  const parked: Screen = { kind: 'parked' };

  it('adopts the cut: a create push lands ON the scaffold', () => {
    const planning: Screen = { kind: 'editor', creating: { kind: 'planning', sourceRepoName: 'silt' } };

    expect(applyCreateScreen(parked, planning)).toEqual(planning);
  });

  it('adopts its cut through the mount READ, not only the push', () => {
    const refused = screenForCreate({ kind: 'refused', sourceRepoName: 'silt', reason: 'no-base-ref' });
    if (refused === null) throw new Error('a refusal always puts its tab somewhere');

    expect(commitFirstScreen(parked, refused)).toEqual(refused);
  });
});
