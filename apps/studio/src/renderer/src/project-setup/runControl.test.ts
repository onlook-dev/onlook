import { afterEach, describe, expect, it, jest } from 'bun:test';
import { runFeedback, useRunFeedbackStore } from '../server/runFeedbackStore.js';
import { useServerStore } from '../server/store.js';
import type { RunIntent, ServerEntryState } from '@studio/events';
import { projectRunIntent, reportProjectRunIntent } from './runControl.js';

function entry(entryId: string, ownership: ServerEntryState['ownership'], port: number): ServerEntryState {
  return { entryId, ownership, folderName: entryId, status: 'running', everMeasuredLive: true,
    ports: [{ port, origin: `http://localhost:${String(port)}`, measured: 'live', everLive: true }] };
}

afterEach(() => { runFeedback.reset(); jest.useRealTimers(); });

describe('direct Canvas project control', () => {
  it('clears an agent-free starter restart without changing the main intent', () => {
    jest.useFakeTimers();
    const starter = { ...entry('starter', 'studio-started', 3000), status: 'stopped' as const,
      ports: [{ port: 3000, origin: 'http://localhost:3000', measured: 'dead' as const, everLive: true }] };
    const intents: RunIntent[] = [];
    reportProjectRunIntent(false, false, [starter], ['http://localhost:3000'], { serverIntent: (intent) => {
      intents.push(intent);
      useServerStore.getState().apply({ entries: [{ ...starter, status: 'starting' }], pending: false });
      useServerStore.getState().apply({ entries: [entry('starter', 'studio-started', 3000)], pending: false });
    } });
    expect(intents).toEqual([{ press: 'start' }]);
    jest.advanceTimersByTime(15_000);
    expect(useRunFeedbackStore.getState().notice).toBeUndefined();
  });
  it('tracks a real press and reports a silent failure from the server subscription', () => {
    reportProjectRunIntent(false, false, [], [], { serverIntent: () => {
      runFeedback.observeAgent(true);
      useServerStore.getState().apply({ entries: [], pending: true });
      useServerStore.getState().apply({ entries: [], pending: false });
      runFeedback.observeAgent(false);
    } });
    expect(useRunFeedbackStore.getState().notice).toBe('start-failed');
    reportProjectRunIntent(true, false, [], [], { serverIntent: () => {
      useServerStore.getState().apply({ entries: [], pending: false });
    } });
    expect(useRunFeedbackStore.getState().notice).toBeUndefined();
  });
  it('starts the full saved definition without an agent session or existing inventory', () => {
    expect(projectRunIntent(false, true, [], [])).toEqual({ press: 'start' });
  });

  it('stops the whole saved definition in one intent, including servers not yet in inventory', () => {
    const entries = [entry('web', 'agent-started', 3000), entry('api', 'agent-started', 4000),
      entry('starter', 'studio-started', 5000), entry('external', 'users-own', 6000), entry('unattributed', 'unknown', 7000)];
    expect(projectRunIntent(true, true, entries, ['http://localhost:3000'])).toEqual({ press: 'stop' });
  });

  it('cancels a pending saved start even before the first server has been reported', () => {
    expect(projectRunIntent(true, true, [], [])).toEqual({ press: 'stop' });
  });

  it('keeps the legacy frame-scoped start selection', () => {
    const web = { ...entry('web', 'agent-started', 3000), status: 'stopped' as const,
      ports: [{ port: 3000, origin: 'http://localhost:3000', measured: 'dead' as const, everLive: true }] };
    expect(projectRunIntent(false, false, [web, entry('api', 'agent-started', 4000)], ['http://localhost:3000'])).toEqual({ press: 'start', entryIds: ['web'] });
  });

  it('sends one main-owned legacy Stop and never requests a provider turn', () => {
    for (const entries of [[], [entry('web', 'agent-started', 3000)], [entry('starter', 'studio-started', 5000)],
      [entry('web', 'agent-started', 3000), entry('external', 'users-own', 6000), entry('unattributed', 'unknown', 7000)]]) {
      const intents: RunIntent[] = [];
      let providerTurns = 0;
      const bridge = {
        serverIntent: (intent: RunIntent) => { intents.push(intent); },
        agentCommand: () => { providerTurns += 1; },
      };
      reportProjectRunIntent(true, false, entries, ['http://localhost:3000'], bridge);
      expect(intents).toEqual([{ press: 'stop' }]);
      expect(providerTurns).toBe(0);
    }
  });

  it('keeps unsaved unknown Start on the main discovery path without a renderer provider turn', () => {
    const intents: RunIntent[] = [];
    let providerTurns = 0;
    const bridge = {
      serverIntent: (intent: RunIntent) => { intents.push(intent); },
      agentCommand: () => { providerTurns += 1; },
    };
    reportProjectRunIntent(false, false, [], [], bridge);
    const unknown = { ...entry('unattributed', 'unknown', 7000), status: 'stopped' as const,
      ports: [{ port: 7000, origin: 'http://localhost:7000', measured: 'dead' as const, everLive: true }] };
    reportProjectRunIntent(false, false, [unknown], ['http://localhost:7000'], bridge);
    expect(intents).toEqual([{ press: 'start' }, { press: 'start', entryIds: ['unattributed'] }]);
    expect(providerTurns).toBe(0);
  });
});
