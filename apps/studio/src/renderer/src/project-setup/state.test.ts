import { describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot } from '@studio/events';
import { setupFailure, setupHeader, setupRunAction, setupSteps } from './state.js';
import { setupSnapshot, twoServerSetup } from './fixtures.test-support.js';

describe('the setup header', () => {
  it('gives every execution state one tone, and invents no fourth ink', () => {
    const tones: Record<ProjectSetupSnapshot['state'], unknown> = {
      idle: null, preparing: 'working', installing: 'working', starting: 'working',
      running: 'done', stopping: 'working', failed: 'waiting',
    };
    for (const [state, tone] of Object.entries(tones)) {
      const snapshot = setupSnapshot(state as ProjectSetupSnapshot['state']);
      expect(setupHeader(snapshot, false).tone).toBe(tone as never);
    }
  });

  it('drops the verified sentence once the state already says the project is running', () => {
    const snapshot = setupSnapshot('running');
    snapshot.verified = snapshot.saved;
    const header = setupHeader(snapshot, false);
    expect(header.headline).toBe('projectSetup.state.running');
    expect(header.detail).toBeNull();
  });

  it('separates a never-verified script from one whose previous revision was verified', () => {
    const never = setupSnapshot();
    expect(setupHeader(never, false).headline).toBe('projectSetup.state.unverified');
    expect(setupHeader(never, false).detail).toBe('projectSetup.unverified');

    const superseded = setupSnapshot();
    superseded.verified = { ...superseded.saved!, revision: 'older' };
    expect(setupHeader(superseded, false).detail).toBe('projectSetup.previousVerified');

    const current = setupSnapshot();
    current.verified = current.saved;
    expect(setupHeader(current, false).headline).toBe('projectSetup.state.idle');
    expect(setupHeader(current, false).detail).toBeNull();
  });

  it('reports the empty, loading and unreadable cases without a dot', () => {
    const empty = setupHeader({ saved: null, verified: null, state: 'idle', failure: null }, false);
    expect(empty).toEqual({ state: 'empty', tone: null, headline: 'projectSetup.noScript', detail: 'projectSetup.empty' });
    expect(setupHeader(null, false)).toEqual({ state: 'loading', tone: null, headline: 'projectSetup.loading', detail: null });
    expect(setupHeader(null, true)).toEqual({ state: 'unavailable', tone: null, headline: 'projectSetup.unavailable', detail: null });
  });

  it('publishes the snapshot state itself, so a walk never reads a sentence', () => {
    for (const state of ['idle', 'preparing', 'installing', 'starting', 'running', 'stopping', 'failed'] as const) {
      expect(setupHeader(setupSnapshot(state), false).state).toBe(state);
    }
  });
});

describe('the footer run action', () => {
  it('stops a running project and starts a settled one', () => {
    expect(setupRunAction(setupSnapshot('running'), false)).toEqual({ label: 'projectSetup.stop', press: 'stop', isDisabled: false });
    expect(setupRunAction(setupSnapshot(), false)).toEqual({ label: 'projectSetup.run', press: 'start', isDisabled: false });
    expect(setupRunAction(setupSnapshot('failed'), false)).toEqual({ label: 'projectSetup.run', press: 'start', isDisabled: false });
  });

  it('holds the press while a run is already in flight', () => {
    for (const state of ['preparing', 'installing', 'starting', 'stopping'] as const) {
      expect(setupRunAction(setupSnapshot(state), false)?.isDisabled).toBe(true);
    }
    expect(setupRunAction(setupSnapshot('stopping'), false)?.press).toBe('stop');
  });

  it('offers Stop beside a live server the saved setup did not start, as the canvas control does', () => {
    expect(setupRunAction(setupSnapshot(), true)).toEqual({ label: 'projectSetup.stop', press: 'stop', isDisabled: false });
    expect(setupRunAction(setupSnapshot('failed'), true)?.press).toBe('stop');
    expect(setupRunAction(setupSnapshot('installing'), true)?.press).toBe('start');
  });

  it('offers nothing to press without a saved script', () => {
    expect(setupRunAction({ saved: null, verified: null, state: 'idle', failure: null }, false)).toBeNull();
    expect(setupRunAction(null, true)).toBeNull();
  });
});

describe('which failure the surface believes', () => {
  it('drops a failure the current saved revision never produced', () => {
    const snapshot = setupSnapshot('failed');
    snapshot.failure!.revision = 'saved-0';
    expect(setupFailure(snapshot)).toBeNull();
    expect(setupSteps(snapshot).map((step) => step.tone)).toEqual([null, null, null]);
  });

  it('drops the previous run\'s failure while the next run is in flight', () => {
    for (const state of ['preparing', 'installing', 'starting', 'stopping'] as const) {
      const snapshot = setupSnapshot(state);
      snapshot.failure = setupSnapshot('failed').failure;
      expect(setupFailure(snapshot), state).toBeNull();
    }
    expect(setupFailure(setupSnapshot('failed'))).not.toBeNull();
  });
});

describe('the step sequence', () => {
  it('walks preparation, installation and every server in saved order', () => {
    expect(setupSteps(twoServerSetup()).map((step) => step.id)).toEqual(['prepare', 'install', 'web', 'api']);
  });

  it('marks what has passed, what is running and what has not been reached', () => {
    expect(setupSteps(twoServerSetup('installing')).map((step) => step.tone)).toEqual(['done', 'working', null, null]);
    expect(setupSteps(twoServerSetup('preparing')).map((step) => step.tone)).toEqual(['working', null, null, null]);
    expect(setupSteps(twoServerSetup('starting')).map((step) => step.tone)).toEqual(['done', 'done', 'working', 'working']);
    expect(setupSteps(twoServerSetup('running')).map((step) => step.tone)).toEqual(['done', 'done', 'done', 'done']);
    expect(setupSteps(twoServerSetup()).map((step) => step.tone)).toEqual([null, null, null, null]);
  });

  it('points a failure at the one server that failed, leaving its peer unreached', () => {
    const snapshot = twoServerSetup('failed');
    snapshot.failure = { revision: 'saved-1', stage: 'start', serverId: 'api', command: 'bun start', reason: 'port busy', outputTail: '', elapsedMs: 10 };
    expect(setupSteps(snapshot).map((step) => step.tone)).toEqual(['done', 'done', null, 'waiting']);
  });

  it('marks an install failure on installation, with preparation already passed', () => {
    expect(setupSteps(twoServerSetup('failed')).map((step) => step.tone)).toEqual(['done', 'waiting', null, null]);
  });

  it('marks a preparation failure on the first step, reaching nothing after it', () => {
    const snapshot = twoServerSetup('failed');
    snapshot.failure = { ...snapshot.failure!, stage: 'prepare', command: 'corepack enable' };
    expect(setupSteps(snapshot).map((step) => step.tone)).toEqual(['waiting', null, null, null]);
  });

  it('marks every server when the failure names none of them', () => {
    const snapshot = twoServerSetup('failed');
    snapshot.failure = { ...snapshot.failure!, stage: 'ready', serverId: 'renamed-since' };
    expect(setupSteps(snapshot).map((step) => step.tone)).toEqual(['done', 'done', 'waiting', 'waiting']);
  });

  it('keeps a partial start honest: the server that failed stays flagged while the project runs', () => {
    const snapshot = twoServerSetup('running');
    snapshot.failure = { revision: 'saved-1', stage: 'start', serverId: 'api', command: 'bun start', reason: 'port busy', outputTail: '', elapsedMs: 10 };
    expect(setupSteps(snapshot).map((step) => step.tone)).toEqual(['done', 'done', 'done', 'waiting']);
  });

  it('walks the same steps while stopping as while starting', () => {
    expect(setupSteps(twoServerSetup('stopping')).map((step) => step.tone)).toEqual(['done', 'done', 'working', 'working']);
  });

  it('carries each step its command and its own label', () => {
    const steps = setupSteps(twoServerSetup('running'));
    expect(steps[0]).toMatchObject({ id: 'prepare', script: 'corepack enable' });
    expect(steps[3]).toMatchObject({ id: 'api', script: 'bun start', server: { cwd: 'apps/api', port: 3001 } });
  });

  it('has no steps to walk when nothing is saved', () => {
    expect(setupSteps({ saved: null, verified: null, state: 'idle', failure: null })).toEqual([]);
  });
});
